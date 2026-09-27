const DEFAULT_SETTINGS = {
 oldPrice:"۷,۵۰۰,۰۰۰ تومان", newPrice:"۵,۳۰۰,۰۰۰ تومان",
 card:"6037 0000 0000 0000", email:"amirhosseinabdolvand2005@gmail.com",
 deadline:"۱۷ شهریور", instagram:"asrenoai", telegram:"asrenoai", support:"asreno_ai", registrationOn:true
};
let settings = {...DEFAULT_SETTINGS};
let topics = [...DEFAULT_TOPICS];
let receiptFile = null;
let currentStudent = {};
let adminAuthenticated = false;
function $(id){return document.getElementById(id)}
function toast(msg){let t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
async function loadPublic(){
  try{
    const r=await fetch('/api/public');
    if(!r.ok) throw new Error('load');
    const d=await r.json(); settings={...DEFAULT_SETTINGS,...d.settings}; topics=Array.isArray(d.topics)?d.topics:topics; applySettings();
  }catch(e){applySettings();toast('بارگذاری تنظیمات آنلاین انجام نشد.');}
}
async function checkAdmin(){try{const r=await fetch('/api/admin/me');adminAuthenticated=r.ok;return r.ok}catch{return false}}
function applySettings(){
  ["oldPriceHero","oldPriceSmall"].forEach(id=>{if($(id)) $(id).textContent=settings.oldPrice});
  ["newPriceHero","newPriceSmall"].forEach(id=>{if($(id)) $(id).textContent=settings.newPrice});
  if($("cardNumber")) $("cardNumber").textContent=settings.card;
  document.querySelectorAll('[data-admin-instagram]').forEach(a=>a.href='https://instagram.com/'+settings.instagram);
  document.querySelectorAll('[data-admin-telegram]').forEach(a=>a.href='https://t.me/'+settings.telegram);
  document.querySelectorAll('[data-admin-support]').forEach(a=>a.href='https://t.me/'+settings.support);
  renderTopics(); renderAdminSettings();
}
function renderTopics(){
  if($("syllabusGrid")) $("syllabusGrid").innerHTML=topics.map((t,i)=>`<div class="topic glass"><div class="ico">✦</div><h3>${t}</h3><div class="num">${i+1}</div></div>`).join("");
  if($("miniTopics")) $("miniTopics").innerHTML=topics.map((t,i)=>`<div style="padding:10px 11px;border-radius:11px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);font-size:12px"><span style="color:var(--gold2);margin-left:7px">${i+1}.</span>${t}</div>`).join("");
}
function scrollToRegistration(){document.querySelector("#registration").scrollIntoView({behavior:"smooth",block:"center"})}
function showStep(n){[1,2,3].forEach(i=>{$("step"+i).classList.toggle("active",i===n);$("p"+i).classList.toggle("on",i<=n)});$("stepBadge").textContent=`مرحله ${n} از ۳`}
function validMobile(v){return /^09\d{9}$/.test((v||"").replace(/\s/g,""))}
function goStep2(){if(!settings.registrationOn){toast("ثبت‌نام فعلاً غیرفعال است.");return}const first=$("firstName").value.trim(),last=$("lastName").value.trim(),mob=$("mobile").value.trim(),level=$("level").value;if(!first||!last){toast("نام و نام خانوادگی را وارد کنید.");return}if(!validMobile(mob)){toast("شماره موبایل معتبر وارد کنید.");return}if(!level){toast("سطح آشنایی با AI را انتخاب کنید.");return}currentStudent={first,last,mobile:mob,email:$("studentEmail").value.trim(),level};$("helloName").textContent=`${first}، آماده‌ای وارد دنیای AI بشی؟`;showStep(2)}
function goStep3(){showStep(3)}
function copyCard(){navigator.clipboard?.writeText(settings.card.replace(/\s/g,""));toast("شماره کارت کپی شد.")}
function previewReceipt(inp){if(!inp.files||!inp.files[0])return;receiptFile=inp.files[0];const r=new FileReader();r.onload=e=>{$("receiptPreview").src=e.target.result;$("receiptPreview").classList.remove("hidden")};r.readAsDataURL(receiptFile)}
function compressReceipt(file){return new Promise(resolve=>{if(!file){resolve("");return}const img=new Image(),reader=new FileReader();reader.onload=e=>img.src=e.target.result;img.onload=()=>{const max=950,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};reader.readAsDataURL(file)})}
async function finalSubmit(){
 if(!receiptFile){toast("لطفاً تصویر رسید پرداخت را انتخاب کنید.");return}if(!$("payerName").value.trim())$("payerName").value=currentStudent.first+" "+currentStudent.last;$("submitBtn").disabled=true;$("submitBtn").textContent="در حال ثبت...";
 const compressed=await compressReceipt(receiptFile);const reg={id:Date.now(),name:currentStudent.first+" "+currentStudent.last,first:currentStudent.first,last:currentStudent.last,mobile:currentStudent.mobile,email:currentStudent.email,level:currentStudent.level,payer:$("payerName").value.trim(),tracking:$("tracking").value.trim(),receipt:compressed,status:"pending",date:new Date().toLocaleString("fa-IR"),price:settings.newPrice};
 try{const r=await fetch('/api/registrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reg)});if(!r.ok)throw new Error('registration');}catch(e){toast('ثبت‌نام ذخیره نشد؛ دوباره تلاش کنید.');$("submitBtn").disabled=false;$("submitBtn").textContent="ثبت نهایی ثبت‌نام ✓";return}
 try{const fd=new FormData();fd.append("_subject","ثبت‌نام جدید دوره هوش مصنوعی عصر نو");fd.append("_template","table");fd.append("_captcha","false");fd.append("نام و نام خانوادگی",reg.name);fd.append("موبایل",reg.mobile);fd.append("سطح آشنایی",reg.level);fd.append("ایمیل هنرجو",reg.email||"-");fd.append("کد پیگیری",reg.tracking||"-");fd.append("مبلغ",reg.price);if(receiptFile)fd.append("attachment",receiptFile,receiptFile.name);fetch("https://formsubmit.co/ajax/"+encodeURIComponent(settings.email),{method:"POST",body:fd}).catch(()=>{});}catch(e){}
 $("successName").textContent=currentStudent.first;$("successSection").classList.remove("hidden");$("registration").classList.add("hidden");$("successSection").scrollIntoView({behavior:"smooth"});$("submitBtn").disabled=false;$("submitBtn").textContent="ثبت نهایی ثبت‌نام ✓";toast("ثبت‌نام با موفقیت ثبت شد.");
}
function openAdminLogin(){$("adminModal").classList.add("show");$("adminPassword").focus()}
function closeAdminLogin(){$("adminModal").classList.remove("show");if(AUTO_ADMIN_PAGE&&!adminAuthenticated)viewSite()}
async function adminLogin(){
 const password=$("adminPassword").value;try{const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});if(!r.ok){toast('رمز عبور اشتباه است.');return}adminAuthenticated=true;$("adminPassword").value='';closeAdminLogin();showAdmin();}catch(e){toast('ارتباط با سرور برقرار نشد.')}}
function showAdmin(){$("site").classList.add("hide");$("admin").classList.add("show");renderAdmin();window.scrollTo(0,0)}
function viewSite(){$("admin").classList.remove("show");$("site").classList.remove("hide");window.scrollTo(0,0)}
async function logoutAdmin(){await fetch('/api/admin/logout',{method:'POST'}).catch(()=>{});adminAuthenticated=false;if(AUTO_ADMIN_PAGE){openAdminLogin();$("admin").classList.remove("show");$("site").classList.add("hide")}else viewSite()}
function adminTab(tab,btn){document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));$("tab-"+tab).classList.add("active");document.querySelectorAll(".sidebtn[data-tab]").forEach(x=>x.classList.remove("active"));if(btn)btn.classList.add("active")}
async function getRegs(){try{const r=await fetch('/api/admin/registrations');if(r.status===401){adminAuthenticated=false;openAdminLogin();return []}const d=await r.json();return d.registrations||[]}catch{return []}}
function statusLabel(s){return s==="approved"?"تأیید شده":s==="rejected"?"رد شده":"در انتظار"}
async function renderAdmin(){const regs=await getRegs();$("statAll").textContent=regs.length;$("statPending").textContent=regs.filter(x=>x.status==="pending").length;$("statApproved").textContent=regs.filter(x=>x.status==="approved").length;$("statRejected").textContent=regs.filter(x=>x.status==="rejected").length;$("recentRegs").innerHTML=regs.slice(0,5).map(r=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)"><b>${r.name}</b><span>${r.mobile}</span><span class="pill ${r.status}">${statusLabel(r.status)}</span></div>`).join("")||"<div style='color:var(--muted)'>هنوز ثبت‌نامی وجود ندارد.</div>";$("regsBody").innerHTML=regs.map(r=>`<tr><td>${r.name}</td><td>${r.mobile}</td><td>${r.level}</td><td>${r.date}</td><td><span class="pill ${r.status}">${statusLabel(r.status)}</span></td><td>${r.receipt?`<a href="${r.receipt}" target="_blank"><img src="${r.receipt}" class="receipt-thumb"></a>`:"-"}</td><td><button class="btn btn-dark" style="padding:7px" onclick="setStatus(${r.id},'approved')">تأیید</button> <button class="btn btn-dark" style="padding:7px" onclick="setStatus(${r.id},'rejected')">رد</button></td></tr>`).join("")||"<tr><td colspan='7' style='color:var(--muted)'>موردی ثبت نشده.</td></tr>";renderAdminSettings();renderSyllabusAdmin()}
async function setStatus(id,status){const r=await fetch('/api/admin/registrations/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(!r.ok){toast('ذخیره وضعیت انجام نشد.');return}renderAdmin();toast('وضعیت ثبت‌نام به‌روزرسانی شد.')}
function renderAdminSettings(){if(!$("setOldPrice"))return;$("setOldPrice").value=settings.oldPrice;$("setNewPrice").value=settings.newPrice;$("setCard").value=settings.card;$("setEmail").value=settings.email;$("setDeadline").value=settings.deadline;$("setInstagram").value=settings.instagram;$("setTelegram").value=settings.support;$("setAdminPass").value="";$("setRegistrationOn").checked=settings.registrationOn}
async function saveSettings(){const body={oldPrice:$("setOldPrice").value,newPrice:$("setNewPrice").value,card:$("setCard").value,email:$("setEmail").value,deadline:$("setDeadline").value,instagram:$("setInstagram").value,telegram:settings.telegram,support:$("setTelegram").value,registrationOn:$("setRegistrationOn").checked};if($("setAdminPass").value.trim())body.adminPass=$("setAdminPass").value.trim();const r=await fetch('/api/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status===401){toast('دسترسی مدیر منقضی شده؛ دوباره وارد شوید.');openAdminLogin();return}if(!r.ok){toast('ذخیره تنظیمات انجام نشد.');return}const d=await r.json();settings={...settings,...d.settings};applySettings();$("setAdminPass").value="";toast('تنظیمات برای همه کاربران ذخیره شد.')}
function renderSyllabusAdmin(){if(!$("syllabusAdminList"))return;$("syllabusAdminList").innerHTML=topics.map((t,i)=>`<div class="field"><label>سرفصل ${i+1}</label><input class="input syllabus-edit" data-i="${i}" value="${t.replace(/"/g,'&quot;')}"></div>`).join("")}
async function saveSyllabus(){const next=[...document.querySelectorAll('.syllabus-edit')].map(x=>x.value.trim()).filter(Boolean);const r=await fetch('/api/admin/topics',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({topics:next})});if(!r.ok){toast('ذخیره سرفصل‌ها انجام نشد.');return}const d=await r.json();topics=d.topics;renderTopics();renderSyllabusAdmin();toast('سرفصل‌ها برای همه کاربران ذخیره شدند.')}
async function exportCSV(){const regs=await getRegs();const rows=[["نام","موبایل","ایمیل","سطح","تاریخ","وضعیت","کد پیگیری","مبلغ"],...regs.map(r=>[r.name,r.mobile,r.email,r.level,r.date,statusLabel(r.status),r.tracking,r.price])];const csv="\ufeff"+rows.map(row=>row.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="asreno-registrations.csv";a.click();URL.revokeObjectURL(a.href)}

(async()=>{await loadPublic();if(AUTO_ADMIN_PAGE){if(await checkAdmin())showAdmin();else openAdminLogin();}})();
