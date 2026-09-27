import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'asreno1405';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const DEFAULT_SETTINGS = {
  oldPrice:'۷,۵۰۰,۰۰۰ تومان', newPrice:'۵,۳۰۰,۰۰۰ تومان',
  card:'6037 9982 0433 9971', email:'amirhosseinabdolvand2005@gmail.com',
  deadline:'۲۱ مهر', instagram:'asrenoai', telegram:'asrenoai',
  support:'asreno_ai', registrationOn:true
};
const DEFAULT_TOPICS = [
  'آشنایی با هوش مصنوعی و ابزارهای کاربردی','مهندسی پرامپت و گفتگو با AI','استفاده از AI در درس و یادگیری',
  'تولید متن، تصویر و ویدئو با AI','انیمیشن‌سازی با هوش مصنوعی','خلاقیت و ایده‌پردازی با AI',
  'AI و برنامه‌نویسی ساده','امنیت، حریم خصوصی و اخلاق دنیای دیجیتال','پروژه عملی با هوش مصنوعی'
];

const DATA_FILE = path.join(__dirname, 'data.json');

function readStore(){
  try{
    if(!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
  }catch{return null;}
}
function writeStore(store){
  fs.writeFileSync(DATA_FILE, JSON.stringify(store,null,2), 'utf8');
}
function initStore(){
  let store=readStore();
  if(!store || typeof store!=='object') store={};
  if(!store.settings) store.settings={...DEFAULT_SETTINGS, adminPass:ADMIN_PASSWORD};
  if(!store.topics) store.topics=[...DEFAULT_TOPICS];
  if(!Array.isArray(store.registrations)) store.registrations=[];
  writeStore(store);
}
function getData(key){
  const store=readStore() || {};
  return store[key];
}
function setData(key,value){
  const store=readStore() || {};
  store[key]=value;
  writeStore(store);
}
function getRegistrations(){
  const store=readStore() || {};
  return Array.isArray(store.registrations)?store.registrations:[];
}
function saveRegistrations(registrations){
  const store=readStore() || {};
  store.registrations=registrations;
  writeStore(store);
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
app.get('/api/public', (req,res)=>{
  try{
    const settings=getData('settings') || DEFAULT_SETTINGS;
    const topics=getData('topics') || DEFAULT_TOPICS;
    const {adminPass,...publicSettings}=settings;
    res.json({settings:publicSettings,topics});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.post('/api/admin/login', (req,res)=>{
  try{
    const settings=getData('settings') || {...DEFAULT_SETTINGS,adminPass:ADMIN_PASSWORD};
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
    const current=getData('settings') || {...DEFAULT_SETTINGS,adminPass:ADMIN_PASSWORD};
    const allowed=['oldPrice','newPrice','card','email','deadline','instagram','telegram','support','registrationOn'];
    const next={...current};
    for(const k of allowed) if(Object.prototype.hasOwnProperty.call(req.body,k)) next[k]=req.body[k];
    if(req.body.adminPass) next.adminPass=String(req.body.adminPass);
    setData('settings',next);
    const {adminPass,...publicSettings}=next;
    res.json({settings:publicSettings});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.put('/api/admin/topics',requireAdmin,async(req,res)=>{
  try{
    const topics=Array.isArray(req.body?.topics)?req.body.topics.map(String).map(x=>x.trim()).filter(Boolean):[];
    setData('topics',topics);res.json({topics});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.get('/api/admin/registrations',requireAdmin,async(req,res)=>{
  try{const registrations=getRegistrations().sort((a,b)=>Number(b.id)-Number(a.id));res.json({registrations});}catch(e){res.status(500).json({error:'server_error'});}
});
app.post('/api/registrations',async(req,res)=>{
  try{
    const settings=getData('settings') || DEFAULT_SETTINGS;
    if(!settings.registrationOn) return res.status(400).json({error:'registration_off'});
    const reg=req.body;
    if(!reg?.id || !reg?.name || !reg?.mobile) return res.status(400).json({error:'invalid_registration'});
    const registrations=getRegistrations();
    registrations.push(reg);
    saveRegistrations(registrations);
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'server_error'});}
});
app.patch('/api/admin/registrations/:id',requireAdmin,async(req,res)=>{
  try{
    const registrations=getRegistrations();
    const idx=registrations.findIndex(r=>Number(r.id)===Number(req.params.id));
    if(idx<0) return res.status(404).json({error:'not_found'});
    registrations[idx]={...registrations[idx],status:req.body?.status};
    saveRegistrations(registrations);
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'server_error'});}
});

app.use(express.static(__dirname));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

const port=process.env.PORT||3000;
initStore();
app.listen(port,()=>console.log(`Asreno AI running on port ${port}`));;
