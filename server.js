import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is missing');
const sql = neon(DATABASE_URL);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'asreno1405';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const DEFAULT_SETTINGS = {
  oldPrice:'۷,۵۰۰,۰۰۰ تومان', newPrice:'۵,۳۰۰,۰۰۰ تومان',
  card:'6037 0000 0000 0000', email:'amirhosseinabdolvand2005@gmail.com',
  deadline:'۱۷ شهریور', instagram:'asrenoai', telegram:'asrenoai',
  support:'asreno_ai', registrationOn:true
};
const DEFAULT_TOPICS = [
  'آشنایی با هوش مصنوعی و ابزارهای کاربردی','مهندسی پرامپت و گفتگو با AI','استفاده از AI در درس و یادگیری',
  'تولید متن، تصویر و ویدئو با AI','انیمیشن‌سازی با هوش مصنوعی','خلاقیت و ایده‌پردازی با AI',
  'AI و برنامه‌نویسی ساده','امنیت، حریم خصوصی و اخلاق دنیای دیجیتال','پروژه عملی با هوش مصنوعی'
];

async function initDb(){
  await sql`CREATE TABLE IF NOT EXISTS app_data (key text PRIMARY KEY, value jsonb NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS registrations (id bigint PRIMARY KEY, data jsonb NOT NULL)`;
  const rows = await sql`SELECT key FROM app_data WHERE key IN ('settings','topics')`;
  const keys = new Set(rows.map(r=>r.key));
  if(!keys.has('settings')) await sql`INSERT INTO app_data (key,value) VALUES ('settings', ${JSON.stringify({...DEFAULT_SETTINGS, adminPass: ADMIN_PASSWORD})}::jsonb)`;
  if(!keys.has('topics')) await sql`INSERT INTO app_data (key,value) VALUES ('topics', ${JSON.stringify(DEFAULT_TOPICS)}::jsonb)`;
}

function sign(payload){
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token){
  try{
    const [body,sig]=String(token||'').split('.');
    const expected=crypto.createHmac('sha256',SESSION_SECRET).update(body).digest('base64url');
    if(!body || !sig || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return false;
    const p=JSON.parse(Buffer.from(body,'base64url').toString());
    return p.exp>Date.now();
  }catch{return false;}
}
function requireAdmin(req,res,next){
  if(!verify(req.cookies.asreno_admin)) return res.status(401).json({error:'unauthorized'});
  next();
}
async function getData(key){
  const rows=await sql`SELECT value FROM app_data WHERE key=${key}`;
  return rows[0]?.value;
}
async function setData(key,value){
  await sql`INSERT INTO app_data(key,value) VALUES(${key},${JSON.stringify(value)}::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;
}

app.get('/api/public', async (req,res)=>{
  try{
    const settings=await getData('settings') || DEFAULT_SETTINGS;
    const topics=await getData('topics') || DEFAULT_TOPICS;
    const {adminPass,...publicSettings}=settings;
    res.json({settings:publicSettings,topics});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.post('/api/admin/login', async (req,res)=>{
  try{
    const settings=await getData('settings') || {...DEFAULT_SETTINGS,adminPass:ADMIN_PASSWORD};
    const pass=String(req.body?.password||'');
    if(pass!==String(settings.adminPass||ADMIN_PASSWORD)) return res.status(401).json({error:'wrong_password'});
    res.cookie('asreno_admin',sign({exp:Date.now()+1000*60*60*24*7}),{httpOnly:true,sameSite:'lax',secure:true,maxAge:1000*60*60*24*7});
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'server_error'});}
});
app.post('/api/admin/logout',(req,res)=>{res.clearCookie('asreno_admin');res.json({ok:true});});
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true}));

app.put('/api/admin/settings',requireAdmin,async(req,res)=>{
  try{
    const current=await getData('settings') || {...DEFAULT_SETTINGS,adminPass:ADMIN_PASSWORD};
    const allowed=['oldPrice','newPrice','card','email','deadline','instagram','telegram','support','registrationOn'];
    const next={...current};
    for(const k of allowed) if(Object.prototype.hasOwnProperty.call(req.body,k)) next[k]=req.body[k];
    if(req.body.adminPass) next.adminPass=String(req.body.adminPass);
    await setData('settings',next);
    const {adminPass,...publicSettings}=next;
    res.json({settings:publicSettings});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.put('/api/admin/topics',requireAdmin,async(req,res)=>{
  try{
    const topics=Array.isArray(req.body?.topics)?req.body.topics.map(String).map(x=>x.trim()).filter(Boolean):[];
    await setData('topics',topics);res.json({topics});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.get('/api/admin/registrations',requireAdmin,async(req,res)=>{
  try{const rows=await sql`SELECT data FROM registrations ORDER BY id DESC`;res.json({registrations:rows.map(r=>r.data)});}catch(e){res.status(500).json({error:'server_error'});}
});
app.post('/api/registrations',async(req,res)=>{
  try{
    const settings=await getData('settings') || DEFAULT_SETTINGS;
    if(!settings.registrationOn) return res.status(400).json({error:'registration_off'});
    const reg=req.body;
    if(!reg?.id || !reg?.name || !reg?.mobile) return res.status(400).json({error:'invalid_registration'});
    await sql`INSERT INTO registrations(id,data) VALUES(${Number(reg.id)},${JSON.stringify(reg)}::jsonb)`;
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'server_error'});}
});
app.patch('/api/admin/registrations/:id',requireAdmin,async(req,res)=>{
  try{
    const rows=await sql`SELECT data FROM registrations WHERE id=${Number(req.params.id)}`;
    if(!rows[0]) return res.status(404).json({error:'not_found'});
    const data={...rows[0].data,status:req.body?.status};
    await sql`UPDATE registrations SET data=${JSON.stringify(data)}::jsonb WHERE id=${Number(req.params.id)}`;
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.use(express.static(__dirname));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

const port=process.env.PORT||3000;
initDb().then(()=>app.listen(port,()=>console.log(`Asreno AI running on port ${port}`))).catch(err=>{console.error(err);process.exit(1)});
