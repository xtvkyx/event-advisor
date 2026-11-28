
/* ================= simple version: import, actions, PDF, boot ================= */

/* ---------- parsing: CSV / JSON / TXT ---------- */
function parseCSV(t){
 t=t.replace(/^﻿/,'');
 const first=t.split(/\r?\n/)[0]||'';const cnt=c=>first.split(c).length-1;
 const delim=cnt('\t')>cnt(',')&&cnt('\t')>cnt(';')?'\t':cnt(';')>cnt(',')?';':',';
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
  else if(ch==='"')q=true;else if(ch===delim){row.push(f);f=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(f);f='';if(row.some(x=>x!==''))rows.push(row);row=[]}
  else f+=ch}
 row.push(f);if(row.some(x=>x!==''))rows.push(row);
 return rows;
}
const hk=s=>String(s).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g,'');
const COLS={text:['text','content','comment','commenttext','review','reviewtext','body','caption','description','desc','message','نص','النص','التعليق','تعليق','المراجعة','الوصف'],
 id:['id','commentid','cid','rowid'],clip:['clipid','videoid','awemeid','postid','parentid','video'],url:['url','link','videourl','shareurl','الرابط'],
 pub:['publishedat','publishdate','createtime','createdat','date','time','timestamp','posteddate','التاريخ','تاريخالنشر'],coll:['collectedat','scrapedat','fetchedat','تاريخالجمع'],
 season:['season','الموسم'],area:['area','zone','region','المنطقة'],kind:['kind','type','النوع'],official:['official','isad','isofficial','ad','رسمي'],
 reposted:['reposted','isrepost','repost'],query:['query','searchtype'],likes:['likes','diggcount','likecount','إعجابات'],platform:['platform','source','network','channel','منصة','المنصة','مصدر','المصدر'],rating:['rating','stars','star','score','rate','التقييم','تقييم','النجوم','نجوم','عددالنجوم']};
function toDate(v){
 v=String(v==null?'':v).trim();if(!v)return '';
 if(/^\d{9,13}$/.test(v)){const n=Number(v);return new Date(v.length>=12?n:n*1000).toISOString().slice(0,10)}
 let m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
 m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
 const t=Date.parse(v);return isNaN(t)?'':new Date(t).toISOString().slice(0,10);
}
function normPlat(v){
 const t=norm(String(v==null?'':v));if(!t)return '';
 if(/tiktok|تيك|تك توك|تيكتوك/.test(t))return 'tiktok';
 if(/(?<![a-z])x(?![a-z])|twitter|تويتر|اكس|تغريد/.test(t))return 'x';
 if(/google|gmaps|maps|map|قوقل|جوجل|خرايط|خرائط|ماب|review|تقييم/.test(t))return 'gmaps';
 return '';
}
const truthy=v=>/^(1|true|yes|y|نعم)$/i.test(String(v==null?'':v).trim());
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function matchSeason(v){
 v=String(v||'').trim();if(!v)return '';
 if(S.settings.seasons.some(s=>s.id===v))return v;
 const m=v.match(/^(\d{4})\s*[\/\-]\s*(\d{2,4})$/);if(m)return m[1]+'/'+m[2].slice(-2);
 return '';
}
function seasonFromDate(d){
 if(!d)return '';let best='';
 for(const s of S.settings.seasons){if(!s.open)continue;const g=dnum(d)-dnum(s.open);if(g>=-14&&g<=230&&(!best||s.open>seasonObj(best).open))best=s.id}
 return best;
}
function detectArea(v,text){
 const nv=norm(String(v||'')),nt=norm(text);
 for(const a of S.settings.areas){if(nv&&(nv===norm(a.name)||nv===norm(a.en)||nv===a.id))return a.id}
 for(const a of S.settings.areas){if(nt.includes(norm(a.name))||nt.includes(norm(a.en)))return a.id}
 return 'gen';
}
function rowsFromTable(objs){
 const out=[];let empty=0;const today=new Date().toISOString().slice(0,10);
 for(const o of objs){
  const g={};for(const k in o){const nk=hk(k);for(const f in COLS){if(g[f]===undefined&&COLS[f].map(hk).includes(nk))g[f]=o[k]}}
  const text=String(g.text==null?'':g.text).trim();if(!text){empty++;continue}
  const pub=toDate(g.pub),url=String(g.url||'').trim();
  const rid=g.id?'imp:'+String(g.id).trim():'imp:'+hash(text+'|'+pub+'|'+url);
  const lbl=String(g.season==null?'':g.season).trim().slice(0,60);
  let season=matchSeason(g.season);if(!season)season=seasonFromDate(pub);if(!season)season=lbl||'بيانات الملف';
  const rt=parseFloat(String(g.rating==null?'':g.rating).replace(',','.')),stars=rt>=1&&rt<=5?Math.round(rt):null;
  const kind=/^(post|video|منشور|فيديو|مقطع)$/i.test(String(g.kind||'').trim())?'post':'comment';
  out.push({id:rid,text,clipId:String(g.clip||g.url||rid),url,publishedAt:pub,collectedAt:toDate(g.coll)||today,season,area:detectArea(g.area,text),kind,
   official:truthy(g.official),reposted:truthy(g.reposted),query:/target|موجه/i.test(String(g.query||''))?'targeted':'general',likes:Number(g.likes)||0,demo:false,stars,review:stars!=null,platform:normPlat(g.platform)||null});
 }
 return {rows:out,empty};
}
function parseFile(name,text){
 let objs;
 if(/\.txt$/i.test(name)){
  objs=text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>=3).map(l=>({text:l}));
 }else if(/\.json$/i.test(name)||/^\s*[\[{]/.test(text)){
  const j=JSON.parse(text);objs=Array.isArray(j)?j:(j.items||j.data||j.rows||j.comments||[]);
  objs=objs.map(o=>typeof o==='string'?{text:o}:o);
 }else{
  const t=parseCSV(text);if(t.length<2)throw new Error('الملف لا يحتوي صفوفًا');
  const hd=t[0].slice();
  if(!hd.some(h=>COLS.text.map(hk).includes(hk(h)))){
   /* no obvious text column: use the column with the longest average text */
   let bi=0,bl=-1;hd.forEach((h,i)=>{const l=t.slice(1,60).reduce((s,r)=>s+String(r[i]||'').length,0);if(l>bl){bl=l;bi=i}});
   hd[bi]='text';
  }
  objs=t.slice(1).map(r=>{const o={};hd.forEach((h,i)=>o[h]=r[i]);return o});
 }
 return rowsFromTable(objs);
}
async function addFiles(list){
 const bad=[];
 for(const f of list){
  if(f.size>15*1024*1024){bad.push(f.name+' (أكبر من 15 ميغابايت)');continue}
  try{
   const r=parseFile(f.name,await f.text());
   if(!r.rows.length)throw new Error('لا صفوف قابلة للقراءة');
   PEND.push({name:f.name,rows:r.rows,empty:r.empty});
  }catch(e){bad.push(f.name+' ('+((e&&e.message)||'تعذّرت القراءة')+')')}
 }
 renderData();
 if(bad.length)$('upInfo').textContent='لم نقرأ: '+bad.join('، ');
 else if(PEND.length)$('upInfo').textContent='جاهزة للتحليل: '+fmt(PEND.reduce((s,f)=>s+f.rows.length,0))+' صفًا من '+PEND.length+' ملف. اضغطوا «حلّلوا الآراء».';
}
function ensureSeasons(){
 const used=new Set(activeRows().map(r=>r.season));
 for(const id of used){if(!seasonObj(id))S.settings.seasons.push({id,open:'',note:'موسم بلا تاريخ افتتاح'})}
 S.settings.seasons=S.settings.seasons.filter(s=>s.open||used.has(s.id));
}
function initStamp(){S.lastOk=nowStr()+' '+hhmm();S.snaps=[snap()]}
function snap(){
 const sid=currentSeason(),s=stats(P.items.filter(i=>sid===ALLP||i.season===sid));
 return {at:nowStr(),season:sid,all:s.all,posts:s.posts,comments:s.comments,N:s.N,negAny:s.negAny,ret:s.ret,neg:Object.fromEntries(AKEYS.map(a=>[a,s.A[a].neg]))};
}
function buildDiff(b,a,rb){
 const L=[],dn=a.all-b.all;
 L.push(dn>0?'دخل <b>'+fmt(dn)+'</b> مادة جديدة. عدد آراء الزوار: '+fmt(b.N)+' ← '+fmt(a.N):'لا مواد جديدة منذ آخر تحليل.');
 if(dn>0&&b.N>=15&&a.N>0){
  const rows=AKEYS.map(k=>({k,d:a.neg[k]/a.N-b.neg[k]/b.N,b:b.neg[k],a:a.neg[k]})).sort((p,q)=>Math.abs(q.d)-Math.abs(p.d)).slice(0,3).filter(r=>Math.abs(r.d)>=.01);
  rows.forEach(r=>L.push(esc(ASPECTS[r.k].label)+': '+pc(r.b/b.N)+' ← '+pc(r.a/a.N)+' '+chip(sg(r.d),r.d>0?'bad':'ok')));
  if(!rows.length)L.push('لا تغيّر يُذكر في نسب الجوانب.');
 }
 V.recs.filter(r=>!rb.has(r.key)).forEach(r=>L.push('ظهرت توصية جديدة: '+esc(r.title)));
 rb.forEach(k=>{if(!V.recs.find(r=>r.key===k)){const a0=k.split('|')[0];L.push('غابت توصية لم تعد أدلتها كافية: '+esc(ASPECTS[a0]?ASPECTS[a0].verb:k))}});
 return {from:b.at,to:a.at,lines:L};
}

/* ---------- analyze uploaded files ---------- */
function doImport(){
 const files=PEND.map(f=>({name:f.name,rows:f.rows}));
 const txt=(UP.text||'').trim();
 if(txt){const r=rowsFromTable(txt.split(/\r?\n/).map(l=>({text:l.trim()})).filter(o=>o.text.length>=3));if(r.rows.length)files.push({name:'نص ملصوق',rows:r.rows})}
 if(!files.length){toast('اختاروا ملفًا أو الصقوا تعليقات أولًا.');return}
 let forced='';
 if(UP.season==='__new'){
  const id=UP.newId.trim(),open=UP.newOpen.trim();
  if(!id){toast('اكتبوا اسم الموسم الجديد، مثل 2027/28.');return}
  if(open&&!/^\d{4}-\d{2}-\d{2}$/.test(open)){toast('تاريخ الافتتاح غير صحيح.');return}
  forced=id;
  if(!seasonObj(id))S.settings.seasons.push({id,open:open||'',note:'موسم أضفتموه'});
  else if(open&&!seasonObj(id).open)seasonObj(id).open=open;
 }else if(UP.season!=='auto')forced=UP.season;
 const selP=UP.platform||'auto';
 const all=files.flatMap(f=>f.rows),rate=all.filter(r=>nameHit(r.text)).length/all.length;
 const nf=UP.filter==null?rate<.6:!UP.filter;
 const wasImport=S.imported.length>0;
 const before=snap(),rb=new Set(V.recs.map(r=>r.key));
 const ex=new Map(S.imported.map(r=>[r.id,r]));let added=0,same=0;const at=new Date().toISOString();
 for(const f of files){
  const sid='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);let n=0;const pc0={};
  for(const r of f.rows){
   const x=Object.assign({},r,{noFilter:nf});if(forced)x.season=forced;
   x.platform=selP!=='auto'?selP:(r.platform||(r.stars!=null?'gmaps':'other'));
   if(x.platform!=='gmaps'){x.review=false;x.stars=null}
   pc0[x.platform]=(pc0[x.platform]||0)+1;
   const old=ex.get(x.id);
   if(old){same++;ex.set(x.id,Object.assign({},old,{noFilter:nf,season:x.season,platform:x.platform}))}
   else{added++;n++;x.src=sid;ex.set(x.id,x)}
  }
  if(n>0)S.sources.push({id:sid,name:f.name,n,season:forced||'حسب التاريخ',at,plat:Object.keys(pc0).join(',')});
 }
 S.imported=[...ex.values()];S.importMeta={name:files.map(f=>f.name).join('، ').slice(0,80),at,n:S.imported.length};
 ensureSeasons();
 const cnt={};all.forEach(r=>{const s=forced||r.season;cnt[s]=(cnt[s]||0)+1});
 const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
 PEND=[];UP.text='';UP.filter=null;UP.newId='';UP.newOpen='';
 S.ui.season=(seasonObj(best)||{}).open?best:currentSeason();S.ui.area='all';S.ui.plat='all'
 processAll();
 const sc=seasonObj(best),its=P.items.filter(i=>i.season===best),dayOk=its.length?its.filter(i=>i.day!=null).length/its.length:0;
 S.ui.period=(sc&&sc.open&&dayOk>=.5)?(mode()==='live'?'eq':'all'):'all';
 addLog('q','تحليل '+files.map(f=>f.name).join('، ')+': '+added+' صفًا جديدًا، '+same+' موجودًا سابقًا (لم يُضاعَف)');
 S.lastOk=nowStr()+' '+hhmm();S.lastErr=null;
 const after=snap();S.snaps.push(after);if(S.snaps.length>12)S.snaps.shift();
 computeView();S.lastDiff=wasImport?buildDiff(before,after,rb):null;
 S.ui.tab='happened';persist();renderAll();window.scrollTo(0,0);
 toast('تم التحليل: '+added+' جديد، '+same+' موجود سابقًا. المقبول بعد الفلاتر '+fmt(P.log.kept)+' من '+fmt(P.log.total)+'.');
}

/* ---------- actions ---------- */
function stripRec(r){return JSON.parse(JSON.stringify(r))}
const ACT={
 tab:t=>{S.ui.tab=t.dataset.v;persist();renderTabs();window.scrollTo({top:0,behavior:'smooth'})},
 status:t=>{
  const v=t.dataset.v,sc=seasonObj(S.ui.season);
  S.ui.status=v;S.ui.period=(v==='live'&&sc&&sc.open)?'eq':'all';persist();renderAll();
  toast(v==='live'?'الفعالية قائمة: التوصيات الآن تحسينات للتنفيذ الحين.':'الفعالية انتهت: التوصيات الآن للموسم القادم.');
 },
 ev:t=>{const e=EV[t.dataset.k];if(!e)return;D={title:e.title,fn:e.fn,g:6,t:4};renderDrawer()},
 closeEv:()=>{D=null;renderDrawer()},
 moreEv:t=>{if(!D)return;if(t.dataset.w==='g')D.g+=10;else D.t+=10;renderDrawer()},
 area:t=>{S.ui.area=t.dataset.id;S.ui.tab='happened';persist();renderAll();window.scrollTo(0,0);toast('نعرض: '+areaName(t.dataset.id)+'. غيّروا «المنطقة» من الأعلى للرجوع.')},
 saveRec:t=>{
  const r=V.recs.find(x=>x.key===t.dataset.key);if(!r)return;
  if(S.saved.find(x=>x.key===r.key)){toast('هذه التوصية في الخطة من قبل.');return}
  const m=mode();
  S.saved.push(Object.assign(stripRec(r),{status:'saved',savedAt:nowStr(),mode:m,plan:planOf(r,m)}));
  addLog('q','أُضيفت إلى الخطة: '+r.title);persist();renderRecs();toast('أُضيفت إلى الخطة.');
 },
 doneRec:t=>{const r=S.saved.find(x=>x.key===t.dataset.key);if(!r)return;r.status='done';r.actionDate=nowStr();addLog('q','تم تنفيذ: '+r.title);persist();renderRecs();toast('سُجّل التنفيذ بتاريخ '+dAr(r.actionDate)+'. ارفعوا ملفًا جديدًا لاحقًا لنقيس الفرق.')},
 delRec:t=>{S.saved=S.saved.filter(x=>x.key!==t.dataset.key);persist();renderRecs()},
 toggleBuiltin:()=>{S.builtin=!S.builtin;S.lastDiff=null;ensureSeasons();S.ui.season=currentSeason();S.ui.period='all';S.ui.area='all';S.ui.plat='all';processAll();persist();renderAll();toast(S.builtin?'أُضيفت بيانات الفريق المجمّعة ('+fmt(sampleRows().length)+' مادة).':'أُوقفت بيانات الفريق المجمّعة. التحليل الآن على ما ترفعونه فقط.')},
 showNewEv:()=>{UP.newEv=true;renderData()},
 cancelNewEv:()=>{UP.newEv=false;renderData()},
 newEv:()=>{
  const nm=($('evName')||{}).value||'',kw=(($('evKw')||{}).value||'').split(/[\n,،]+/).map(x=>x.trim()).filter(Boolean);
  if(nm.trim().length<2){toast('اكتبوا اسم الفعالية.');return}
  if(S.events.some(e=>norm(e.name)===norm(nm))){toast('هذه الفعالية موجودة في القائمة.');return}
  saveEv();
  const id='e'+Date.now().toString(36),b=blankEvent(nm,kw);
  S.events.push({id,name:nm.trim()});S.evStore[id]=b;S.eventId=id;loadEv(id);S.ui.tab='data';
  D=null;PEND=[];UP.newEv=false;UP.season='auto';
  ensureSeasons();processAll();initStamp();persist();renderAll();window.scrollTo(0,0);
  toast('أُضيفت الفعالية «'+nm.trim()+'». ارفعوا بياناتها (تيك توك أو X أو قوقل ماب) لنحللها.');
 },
 platEv:t=>{const pl=t.dataset.p;D={title:PLAT[pl]+': المواد المجمّعة',fn:i=>i.platform===pl,g:8,t:8,all:true};renderDrawer()},
 analyze:()=>doImport(),
 rmPend:t=>{PEND.splice(Number(t.dataset.i),1);renderData()},
 rmSrc:t=>{
  S.imported=S.imported.filter(r=>r.src!==t.dataset.id);S.sources=S.sources.filter(s=>s.id!==t.dataset.id);
  if(!S.imported.length)S.importMeta=null;
  ensureSeasons();if(!seasonObj(S.ui.season))S.ui.season=currentSeason();
  S.lastDiff=null;processAll();persist();renderAll();toast('حُذف الملف من التحليل.');
 },
 clearImport:()=>{S.imported=[];S.sources=[];S.importMeta=null;S.lastDiff=null;ensureSeasons();S.ui.season=currentSeason();S.ui.period=mode()==='live'?'eq':'all';processAll();persist();renderAll();toast('مُسحت كل الملفات.')},
 saveSettings:()=>{
  const ln=id=>$(id).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const dict={names:ln('sNames'),hashtags:ln('sTags'),directed:S.settings.dict.directed,excl:ln('sExcl')};
  if(!dict.names.length){toast('أضيفوا اسمًا واحدًا على الأقل للفعالية.');return}
  const ss=[];for(const l of ln('sSeasons')){const p=l.split('|').map(x=>x.trim());if(p[0]&&/^\d{4}-\d{2}-\d{2}$/.test(p[1]||'')&&!ss.find(s=>s.id===p[0]))ss.push({id:p[0],open:p[1],note:''})}
  const aa=[];for(const l of ln('sAreas')){const p=l.split('|').map(x=>x.trim());if(p[0]&&p[1]&&!aa.find(a=>a.id===p[0]))aa.push({id:p[0],name:p[1],en:p[2]||p[1],first:p[3]||(ss[0]||{id:''}).id})}
  S.settings={event:S.settings.event,seasons:ss.map(s=>Object.assign(s,{note:(S.settings.seasons.find(o=>o.id===s.id)||{}).note||''})),areas:aa,dict};
  ensureSeasons();if(!seasonObj(S.ui.season))S.ui.season=currentSeason();
  processAll();persist();renderAll();toast('حُفظت الإعدادات وأُعيد التحليل.');
 },
 resetSettings:()=>{S.settings=S.eventId==='blvd'?clone(DEF):blankEvent(curEvent().name,[]).settings;ensureSeasons();S.ui.season=currentSeason();processAll();persist();renderAll();toast('أُعيدت الإعدادات الافتراضية.')},
 resetAll:t=>{
  if(!t.dataset.arm){t.dataset.arm='1';t.textContent='اضغطوا مرة ثانية للتأكيد';setTimeout(()=>{if(t.isConnected){delete t.dataset.arm;t.textContent='إعادة ضبط كل شيء'}},4000);return}
  Object.assign(S,{settings:clone(DEF),builtin:true,batch:1,imported:[],importMeta:null,saved:[],ideas:[],lessons:[clone(EX_LESSON)],reviewed:{},overrides:{},sources:[],snaps:[],lastOk:null,lastErr:null,simFail:false,lastDiff:null,runLog:[],ui:UI0(),events:[{id:'blvd',name:'بوليفارد وورلد'}],eventId:'blvd',evStore:{}});
  D=null;PEND=[];UP={season:'auto',text:'',newId:'',newOpen:'',filter:null,platform:'auto',newEv:false};
  ensureSeasons();S.ui.season=currentSeason();processAll();initStamp();persist();renderAll();window.scrollTo(0,0);toast('أُعيد كل شيء إلى البداية.');
 },
 pdf:()=>openPreview(),
 pvClose:()=>closePreview(),
 pvDl:()=>dlPreview()
};

/* ================= PDF report (drawn on canvas, written as a PDF by hand: no libraries) ================= */
const PW=794,PH=1123,SC=2,PM=46,CW=PW-2*PM;
const INK='#16233B',MUT='#52617C',ACC='#0E4B5A',LINEC='#DCE3EE',BADC='#C2503C',OKC='#1E8A5C',WARNC='#B7791F';
const FAM='"IBM Plex Sans Arabic","Noto Naskh Arabic","Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif';
const FNT=(w,s)=>w+' '+s+'px '+FAM;
const hasAr=t=>/[؀-ۿ]/.test(t);
const clipT=(t,n)=>t.length>n?t.slice(0,n)+'…':t;
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function Doc(demo){
 const d={pages:[],c:null,y:0};
 d.page=()=>{
  const cv=document.createElement('canvas');cv.width=PW*SC;cv.height=PH*SC;
  const c=cv.getContext('2d');c.scale(SC,SC);c.fillStyle='#fff';c.fillRect(0,0,PW,PH);c.textBaseline='alphabetic';
  d.pages.push(cv);d.c=c;d.y=PM;
  if(demo){c.fillStyle='#FFF1C9';c.fillRect(0,0,PW,24);d.line('بيانات تجريبية (محاكاة): الأرقام تعرض طريقة التحليل ولا تصف جمهور بوليفارد وورلد الحقيقي',0,PW,16,FNT(600,11),'#7A5600',true);d.y=PM+10}
 };
 d.wrap=(t,w,f)=>{
  const c=d.c;c.font=f;const out=[];
  for(const p of String(t).split('\n')){
   const ws=p.split(/\s+/).filter(Boolean);let ln='';
   for(const wd of ws){const tl=ln?ln+' '+wd:wd;if(!ln||c.measureText(tl).width<=w)ln=tl;else{out.push(ln);ln=wd}}
   out.push(ln);
  }
  return out;
 };
 d.fit=(t,w,f)=>{const c=d.c;c.font=f;t=String(t);if(c.measureText(t).width<=w)return t;while(t.length>1&&c.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'};
 d.line=(ln,x,w,y,f,col,center)=>{
  const c=d.c;c.font=f;c.fillStyle=col;
  if(center){c.direction='rtl';c.textAlign='center';c.fillText(ln,x+w/2,y);return}
  if(!hasAr(ln)&&/[A-Za-z]/.test(ln)){c.direction='ltr';c.textAlign='left';c.fillText(ln,x,y)}
  else{c.direction='rtl';c.textAlign='right';c.fillText(ln,x+w,y)}
 };
 d.need=h=>{if(d.y+h>PH-PM-16)d.page()};
 d.p=(t,o={})=>{
  const s=o.size||13,lh=o.lh||Math.round(s*1.85),w=o.w||CW,x=o.x==null?PM:o.x,f=FNT(o.b?600:400,s);
  for(const ln of d.wrap(t,w,f)){d.need(lh);d.line(ln,x,w,d.y+s,f,o.color||INK,o.center);d.y+=lh}
  d.y+=o.after||0;
 };
 d.h1=t=>{d.need(60);d.p(t,{size:26,b:1,color:ACC,after:2})};
 d.h2=t=>{d.need(130);d.y+=12;d.p(t,{size:18,b:1,color:ACC});d.c.fillStyle=ACC;d.c.fillRect(PM,d.y-3,CW,1.5);d.y+=8};
 d.h3=t=>{d.need(110);d.y+=4;d.p(t,{size:14,b:1,color:INK,after:2})};
 d.box=(items,o={})=>{
  const pad=o.pad||12,w=CW-2*pad,LW=124,m=[];let h=pad*2-4;
  for(const it of items){
   const s=it.size||12.5,lh=Math.round(s*1.8),f=FNT(it.b?600:400,s);
   const ls=d.wrap(it.t,it.l?w-LW-10:w,f);
   m.push({it,ls,s,lh,f,hh:ls.length*lh+(it.gap==null?3:it.gap)});
  }
  m.forEach(x=>h+=x.hh);
  d.need(Math.min(h,PH-2*PM));
  const c=d.c,x0=PM,y0=d.y;
  rr(c,x0,y0,CW,h,8);c.fillStyle=o.fill||'#F4F8FC';c.fill();c.strokeStyle=o.stroke||LINEC;c.lineWidth=1;c.stroke();
  let y=y0+pad-2;
  for(const x of m){
   if(x.it.l){
    d.line(x.it.l,x0+pad+w-LW,LW,y+x.s+1,FNT(600,x.s),x.it.lc||ACC);
    x.ls.forEach((ln,i)=>d.line(ln,x0+pad,w-LW-10,y+x.s+1+i*x.lh,x.f,x.it.c||INK));
   }else x.ls.forEach((ln,i)=>d.line(ln,x0+pad,w,y+x.s+i*x.lh,x.f,x.it.c||INK));
   y+=x.hh;
  }
  d.y=y0+h+(o.after==null?10:o.after);
 };
 d.stats=arr=>{
  const gap=10,bw=(CW-gap*(arr.length-1))/arr.length,h=78;d.need(h+8);const c=d.c,y0=d.y;
  arr.forEach((a,i)=>{
   const x=PM+CW-(i+1)*bw-i*gap;rr(c,x,y0,bw,h,8);c.fillStyle='#F4F8FC';c.fill();c.strokeStyle=LINEC;c.stroke();
   d.line(a.l,x+8,bw-16,y0+20,FNT(400,11.5),MUT);
   d.line(a.v,x+8,bw-16,y0+50,FNT(600,25),INK);
   d.line(a.s,x+8,bw-16,y0+68,FNT(400,10.5),MUT);
  });
  d.y=y0+h+10;
 };
 d.barRow=(label,sub,frac,val,vsub,col)=>{
  const h=38;d.need(h);const c=d.c,y=d.y,bx=PM+162,bw=CW-170-162-12;
  d.line(label,PM+CW-170,170,y+15,FNT(600,13),INK);
  if(sub)d.line(sub,PM+CW-170,170,y+30,FNT(400,10.5),MUT);
  rr(c,bx,y+9,bw,9,4.5);c.fillStyle='#E7EDF6';c.fill();
  const fw=Math.max(5,Math.min(1,frac)*bw);rr(c,bx+bw-fw,y+9,fw,9,4.5);c.fillStyle=col;c.fill();
  d.line(val,PM,150,y+15,FNT(600,13),INK);
  if(vsub)d.line(vsub,PM,150,y+30,FNT(400,10.5),MUT);
  c.fillStyle=LINEC;c.fillRect(PM,y+h-3,CW,1);
  d.y+=h;
 };
 d.table=(heads,rows,widths,o={})=>{
  const rh=27;
  const row=(cells,y,head,cur)=>{
   const c=d.c;
   if(head){c.fillStyle='#EEF3FA';c.fillRect(PM,y,CW,rh)}else if(cur){c.fillStyle='#EAF7FA';c.fillRect(PM,y,CW,rh)}
   let xr=PM+CW;
   cells.forEach((t,i)=>{const w=widths[i]*CW,f=head?FNT(600,11.5):FNT(i===0?600:400,12);d.line(d.fit(t,w-12,f),xr-w+6,w-12,y+rh-9,f,head?MUT:INK);xr-=w});
   c.fillStyle=LINEC;c.fillRect(PM,y+rh-1,CW,1);
  };
  d.need(rh*3);row(heads,d.y,true);d.y+=rh;
  rows.forEach(r=>{if(d.y+rh>PH-PM-16){d.page();row(heads,d.y,true);d.y+=rh}row(r.cells||r,d.y,false,r.cur);d.y+=rh});
  d.y+=8;
 };
 d.finish=()=>{
  const n=d.pages.length;
  d.pages.forEach((cv,i)=>{
   d.c=cv.getContext('2d');const c=d.c;c.fillStyle=LINEC;c.fillRect(PM,PH-40,CW,1);
   d.line('مستشار الفعالية · بوليفارد وورلد · فريق beyond limits',PM,CW,PH-22,FNT(400,10.5),MUT);
   c.direction='ltr';c.textAlign='left';c.font=FNT(400,10.5);c.fillStyle=MUT;c.fillText((i+1)+' / '+n,PM,PH-22);
  });
 };
 d.page();
 return d;
}
function repQuotes(fn,n){
 const seen=new Set(),out=[];
 const pool=V.items.filter(fn).sort((p,q)=>(p.query===q.query?0:p.query==='general'?-1:1)||q.likes-p.likes);
 for(const i of pool){if(seen.has(i.clipId))continue;seen.add(i.clipId);out.push(i);if(out.length>=n)break}
 return out;
}
function heroText(){
 const c=V.cur,m=mode(),top=issues()[0];
 if(c.N<15)return {head:'الآراء في هذا النطاق ما زالت قليلة ('+rAr(c.N)+'). الأرقام اتجاه مبدئي فقط.',sub:'ارفعوا ملفات أكثر، أو غيّروا الموسم والفترة والمنطقة.'};
 if(!top)return {head:'لا يوجد جانب تتكرر الشكوى منه بشكل واضح في هذا النطاق.',sub:'هذا خبر جيد، لكن راجعوا النقاط التي أعجبت الزوار.'};
 return {head:(V.isAll?'في كل الفترات':m==='live'?'حتى اليوم':'في هذا الموسم')+'، أكثر ما اشتكى منه الزوار هو «'+ASPECTS[top.a].label+'»: '+pc(top.share)+' من الآراء.',sub:cmpPhrase(sigOf(top.a))};
}
function buildReportDoc(){
 computeView();
 const ui=V.ui,c=V.cur,m=mode(),sample=demoOn(),iss=issues(),gd=goods(),recs=ranked(m),ht=heroText();
 const d=Doc(false);
 const areaTxt=ui.area==='all'?'كل المناطق':areaName(ui.area);
 d.p('تقرير المنظّم',{size:13,color:MUT});
 d.h1(S.settings.event+' — '+(m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم'));
 d.p(sLbl(ui.season)+' · '+perLabel()+' · '+areaTxt,{size:13});
 d.p('حالة الفعالية: '+(m==='live'?'ما زالت قائمة':'انتهت')+' · أُعدّ بتاريخ '+dAr(new Date().toISOString().slice(0,10)),{size:12,color:MUT});
 d.p('المصادر: '+srcTxt()+(S.sources.length&&!sample?' · '+clipT(S.sources.map(s=>s.name).join('، '),90):''),{size:12,color:MUT,after:8});
 d.box([{t:'ملاحظة: هذا التقرير مبني على بيانات مجمّعة سابقًا (ملفات وأمثلة)، وليس على ربط مباشر بأي منصة.'+(sample?' تقييمات قوقل ماب حقيقية نُسخت بلا أسماء. ومنشورات تيك توك وX عناوين فيديوهات ومنشورات جُمعت من بحث عام يوم 20 نوفمبر 2026، وليست تعليقات الزوار.':''),b:1,size:12,c:'#7A5A0C'}],{fill:'#FFF6DD',stroke:'#EAD28B'});
 const qn=c.N>=100?'جيدة':c.N>=30?'متوسطة':'صغيرة';
 d.box([{t:'حجم العينة: '+qn+' — '+rAr(c.N)+' من '+srcPh(c.clips)+'.'+(c.N<30?' العينة صغيرة، فالنسب للإرشاد فقط ولا تُبنى عليها قرارات كبيرة.':''),b:1}],{fill:c.N<30?'#FFF6DD':'#F4F8FC',stroke:c.N<30?'#EAD28B':LINEC});

 d.h2('١. الخلاصة');
 d.p(ht.head,{size:15,b:1});
 if(ht.sub)d.p(ht.sub,{size:13,color:MUT});
 if(recs[0])d.p('أهم إجراء: '+recs[0].title+'. '+planOf(recs[0],m),{size:13,after:4});

 d.h2('٢. ماذا حصل؟');
 d.stats([{l:'آراء الزوار',v:fmt(c.N),s:'من '+srcPh(c.clips)},{l:'اشتكوا من شيء',v:c.N?pc(c.negAny/c.N):'—',s:fmt(c.negAny)+' من '+fmt(c.N)},{l:'قالوا إنهم سيعودون',v:c.N?pc(c.ret/c.N):'—',s:fmt(c.ret)+' من '+fmt(c.N)}]);
 d.h3('أكثر ما أزعج الزوار');
 if(iss.length){const mx=Math.max(.3,...iss.map(o=>o.share));iss.forEach(o=>{
  const s=sigOf(o.a);let chg='';
  if(s&&s.flag==='worse')chg='أعلى من '+s.baseId;else if(s&&s.flag==='better')chg='أقل من '+s.baseId;else if(s&&s.flag==='same')chg='مثل '+s.baseId;
  d.barRow(ASPECTS[o.a].label,STG[ASPECTS[o.a].stage].name+(chg?' · '+chg:''),o.share/mx,pc(o.share),o.n+' من '+c.N,BADC)})}
 else d.p('لا جانب تكررت الشكوى منه بما يكفي.',{size:12.5,color:MUT});
 d.h3('أكثر ما أعجبهم');
 if(gd.length){const mx=Math.max(.3,...gd.map(o=>o.share));gd.forEach(o=>d.barRow(ASPECTS[o.a].label,STG[ASPECTS[o.a].stage].name,o.share/mx,pc(o.share),o.n+' من '+c.N,OKC))}
 else d.p('لا جانب إيجابي تكرر بما يكفي بعد.',{size:12.5,color:MUT});
 {const st=starStats(V.items);
  if(st.n){
   d.h3('التقييم بالنجوم');
   d.p('متوسط '+avgTxt(st.avg)+' من 5 في '+st.n+' تقييمًا: '+pc(st.low/st.n)+' بنجمة أو نجمتين، و'+pc(st.high/st.n)+' بأربع أو خمس نجوم.',{size:12.5});
   const per=V.all.filter(o=>o.dated===V.dated||o.id===ui.season).map(o=>({id:o.id,s:starStats(scopeItems(o.id,ui))})).filter(x=>x.s.n);
   if(per.length>1)d.table(['الفترة','تقييمات','المتوسط','نجمة أو نجمتان','أربع أو خمس'],per.map(x=>({cur:x.id===ui.season,cells:[x.id,String(x.s.n),avgTxt(x.s.avg),pc(x.s.low/x.s.n),pc(x.s.high/x.s.n)]})),[.34,.14,.14,.19,.19]);
   d.p('المتوسط محسوب من تقييمات الملفات فقط وقد لا يطابق تقييم المكان العام في قوقل ماب.'+(per.some(x=>x.s.n<30)?' أعداد بعض الفترات صغيرة، فلا تعتبروا الفرق بين متوسطاتها اتجاهًا مؤكدًا.':''),{size:11.5,color:MUT});
  }}
 if(V.plats.length){
  d.h3('مقارنة بين المنصات');
  d.table(['المنصة','المواد','إيجابي','محايد','سلبي','أكثر شكوى'],V.plats.map(x=>[PLAT[x.p],String(x.n)+(x.official?' ('+x.official+' رسمي)':''),x.sent.n?pc(x.sent.pos/x.sent.n):'—',x.sent.n?pc(x.sent.neu/x.sent.n):'—',x.sent.n?pc(x.sent.neg/x.sent.n):'—',x.negTop?ASPECTS[x.negTop.a].label+' ('+x.negTop.n+')':'—']),[.19,.2,.12,.12,.12,.25]);
  d.p(platRead(),{size:11.5,color:MUT});
 }
 if(V.topics.length){
  d.h3('المواضيع الأكثر ذكرًا');
  d.table(['الموضوع','مرات الذكر','إيجابي','سلبي','المنصات'],V.topics.slice(0,6).map(x=>[ASPECTS[x.a].label,String(x.n),String(x.pos),String(x.neg),[...x.plats].map(k=>PLAT[k]).join('، ')]),[.28,.15,.12,.12,.33]);
 }
 d.h3('رحلة الزائر');
 d.table(['المرحلة','الحالة','أعجبهم','أزعجهم','أسئلة'],V.stages.map(s=>[s.st.name,STAT_AR[s.status]||s.status,String(s.pos),String(s.neg),s.qClips?s.qs+' من '+s.qClips+' مصادر':'—']),[.36,.2,.12,.12,.2]);
 d.h3('مقارنة بالمواسم السابقة');
 d.p('المقارنة على: '+perLabel()+'. كل رقم هو حصة الآراء التي ذكرت الجانب.',{size:11.5,color:MUT});
 {const cols=iss.slice(0,3),rest=(1-.16-.1-.22)/Math.max(1,cols.length);
  const dt=V.all.filter(o=>o.dated===V.dated||o.id===ui.season);
  d.table(['الموسم','آراء','اشتكوا من شيء'].concat(cols.map(z=>ASPECTS[z.a].label)),dt.map(o=>({cur:o.id===ui.season,cells:[o.id,fmt(o.s.N),o.s.N?pc(o.s.negAny/o.s.N)+' ('+o.s.negAny+')':'—'].concat(cols.map(z=>o.s.A[z.a].neg&&o.s.N?pc(o.s.A[z.a].neg/o.s.N)+' ('+o.s.A[z.a].neg+')':'—'))})),[.16,.1,.22].concat(cols.map(()=>rest)))}

 d.h2('٣. '+(m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم'));
 d.p(m==='live'?'الفعالية ما زالت قائمة، فنركز على ما ينفع خلال أيام. بعد التنفيذ ارفعوا ملفًا جديدًا لنقيس الفرق.':'الفعالية انتهت، فهذه توصيات للتخطيط للموسم القادم مبنية على ما حصل فعلًا في '+sIn(ui.season)+'.',{size:12.5,color:MUT,after:6});
 if(!recs.length)d.p('لا توجد مشكلة تتكرر في ثلاثة مصادر مستقلة على الأقل في هذا النطاق.',{size:13});
 recs.forEach((r,i)=>{
  const cf=conf(r),ev=EV[r.ev],q=ev?repQuotes(ev.fn,1)[0]:null;
  const items=[{t:(i+1)+'. '+r.title+'  ·  '+prioTxt(r,m)+'  ·  الثقة: '+cf[0],b:1,size:14,gap:6},
   {l:'ماذا حصل',t:happenedTxt(r)},
   {l:'ماذا نسوي',t:planOf(r,m)},
   {l:'متى ومن',t:whenTxt(r,m)+' · '+r.team},
   {l:'كيف نعرف أنه نجح',t:kpiTxt(r,m)},
   {l:'تأكدوا ميدانيًا',t:(PLAN[r.a]||{}).verify||''}];
  if(q)items.push({l:'مثال من الزوار',t:'«'+clipT(q.text,170)+'»'+(q.demo?' (مادة تجريبية)':''),c:MUT,lc:MUT});
  d.box(items,{fill:'#fff'});
 });
 if(S.saved.length){
  d.h3('خطتكم');
  d.table(['التوصية','الحالة','قبل التنفيذ','بعده'],S.saved.map(r=>{const f=followUp(r);return [r.title,r.status==='done'?'نُفّذت '+dAr(r.actionDate):'مخطط لها',f&&f.b.N?txC(f.b.n,f.b.N):'—',f?(f.a.N>=15?txC(f.a.n,f.a.N):'لا تكفي بعد ('+f.a.N+')'):'—']}),[.34,.2,.23,.23]);
 }

 d.h2('٤. تحسينات للمنظّم نفسه');
 d.p('خطوات تجعل القراءة القادمة أدق وتقلل التخمين.',{size:12.5,color:MUT,after:4});
 orgTips(m).forEach(t=>d.box([{t:t.t,b:1,size:13,gap:2},{t:t.d,size:12,c:MUT}],{fill:'#fff',after:6}));
 if(gd.length){d.h3(m==='live'?'لا تغيّروه':'احتفظوا به');d.p(gd.map(o=>ASPECTS[o.a].label+' ('+pc(o.share)+')').join('، '),{size:12.5})}

 d.h2('٥. حدود هذا التقرير');
 ['يقيس آراء الزوار كما وردت في الملفات المرفوعة، ولا يقيس عدد الحضور ولا المبيعات ولا زمن الانتظار الفعلي. هذه تحتاج بيانات ميدانية.',
  'التصنيف يعتمد على قواعد لغوية تفهم اللهجة السعودية، وليس نموذج لغة، وقد يخطئ في عبارات ملتبسة. عند تقييم ٤ أو ٥ نجوم لا نعدّ ذكر الزحام أو الانتظار أو البائعين شكوى إلا بكلمة ذمّ صريحة، وعند تقييم نجمة أو نجمتين لا نعدّ المديح إشادة. الأمثلة المرفقة تساعد على المراجعة.',
  'جزء من الزوار لا يكتب تقييمًا، ومن يكتب يميل إلى من لديه رأي قوي، فالعيّنة قد لا تمثل كل الزوار.',
  'منشورات تيك توك وX هنا عناوين فيديوهات ومنشورات غالبًا من صنّاع محتوى وإعلام، فمشاعر الزوار فيها محدودة ولا تُقارن بتقييمات قوقل ماب مقارنة مباشرة.',
  'قائمة المناطق والمواسم جزئية وقابلة للتعديل، وتوصيات الإجراءات اقتراحات عامة تحتاج تأكيدًا ميدانيًا قبل التنفيذ.'
 ].forEach(t=>d.p('• '+t,{size:12.5,after:2}));
 d.finish();
 return d;
}
async function pdfBlob(canvases){
 const enc=new TextEncoder(),parts=[],offs=[];let off=0;
 const put=x=>{parts.push(x);off+=x.byteLength!==undefined?x.byteLength:x.length};
 const s8=s=>enc.encode(s);
 put(new Uint8Array([0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
 const n=canvases.length;
 const o=(id,body)=>{offs[id]=off;put(s8(id+' 0 obj\n'+body+'\nendobj\n'))};
 o(1,'<< /Type /Catalog /Pages 2 0 R >>');
 o(2,'<< /Type /Pages /Kids ['+canvases.map((_,i)=>(4+3*i)+' 0 R').join(' ')+'] /Count '+n+' >>');
 o(3,'<< /Title (Boulevard World organizer report) /Producer (Event Advisor) >>');
 for(let i=0;i<n;i++){
  const cv=canvases[i],blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.9));
  const jpg=new Uint8Array(await blob.arrayBuffer()),pid=4+3*i,cid=5+3*i,iid=6+3*i,wp=595,hp=842;
  o(pid,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+wp+' '+hp+'] /Resources << /XObject << /Im0 '+iid+' 0 R >> >> /Contents '+cid+' 0 R >>');
  const cs='q '+wp+' 0 0 '+hp+' 0 0 cm /Im0 Do Q';
  o(cid,'<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream');
  offs[iid]=off;
  put(s8(iid+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+cv.width+' /Height '+cv.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n'));
  put(jpg);put(s8('\nendstream\nendobj\n'));
 }
 const total=4+3*n,xo=off;
 let x='xref\n0 '+total+'\n0000000000 65535 f \n';
 for(let id=1;id<total;id++)x+=String(offs[id]).padStart(10,'0')+' 00000 n \n';
 x+='trailer\n<< /Size '+total+' /Root 1 0 R /Info 3 0 R >>\nstartxref\n'+xo+'\n%%EOF\n';
 put(s8(x));
 return new Blob(parts,{type:'application/pdf'});
}
async function savePdf(blob,name,n){
 let dl=null;try{dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){}
 if(dl){
  try{const r=await dl.save({filename:name,data:blob});toast(r&&r.status==='saved'?'حُفظ التقرير ('+n+' صفحات).':'أُرسل التقرير للتنزيل.')}
  catch(e){toast(e&&e.code==='declined'?'أُلغي التنزيل.':'تعذّر التنزيل ('+((e&&e.code)||'خطأ')+').')}
  return;
 }
 try{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('جُهّز التقرير ('+n+' صفحات).')}
 catch(e){toast('التنزيل غير متاح في هذا العرض.')}
}
const evSlug=()=>(S.eventId==='blvd'?'Boulevard-World':(S.settings.event.replace(/[^0-9A-Za-z]+/g,'-').replace(/^-+|-+$/g,'')||'event'));
const repName=()=>evSlug()+'-report-'+(V.ui.season===ALLP?'all-periods':V.ui.season.replace(/[^0-9A-Za-z]+/g,'-').replace(/^-+|-+$/g,'')||'periods')+'.pdf';
async function loadFonts(){try{await Promise.all([document.fonts.load('400 14px "IBM Plex Sans Arabic"'),document.fonts.load('600 14px "IBM Plex Sans Arabic"')])}catch(e){}}
/* direct download without preview (used by the chat) */
async function makeReport(btn){
 if(!activeRows().length){toast('الفعالية بلا بيانات بعد. أضيفوا بياناتها من «البيانات» ثم اطلبوا التقرير.');return}
 if(btn){if(btn.disabled)return;btn.disabled=true;btn.dataset.t=btn.textContent;btn.textContent='جارٍ تجهيز التقرير…'}
 try{
  await loadFonts();
  const doc=buildReportDoc(),blob=await pdfBlob(doc.pages);
  await savePdf(blob,repName(),doc.pages.length);
 }catch(e){toast('تعذّر تجهيز التقرير: '+((e&&e.message)||e))}
 finally{if(btn){btn.disabled=false;btn.textContent=btn.dataset.t}}
}

/* ---------- report preview: shows the pages first, download from inside ---------- */
let REP=null,pvBusy=false,pvFocus=null;
function freeRep(){if(REP&&REP.urls)REP.urls.forEach(u=>URL.revokeObjectURL(u));REP=null}
async function openPreview(){
 if(pvBusy)return;
 if(!activeRows().length){toast('الفعالية بلا بيانات بعد. أضيفوا بياناتها من «البيانات» ثم اطلبوا التقرير.');return}
 pvBusy=true;
 pvFocus=document.activeElement;
 const pv=$('pv'),body=$('pvBody');
 freeRep();
 body.innerHTML='<div class="ld">جارٍ تجهيز التقرير…</div>';$('pvInfo').textContent='';$('pvDl').disabled=true;
 pv.classList.add('on');document.body.classList.add('pv-open');
 try{
  await loadFonts();
  const doc=buildReportDoc(),n=doc.pages.length,urls=[];
  const blobs=await Promise.all(doc.pages.map(cv=>new Promise(r=>cv.toBlob(r,'image/jpeg',0.85))));
  blobs.forEach(b=>urls.push(URL.createObjectURL(b)));
  REP={doc,urls,name:repName(),blob:null};
  body.innerHTML=urls.map((u,i)=>'<img src="'+u+'" alt="صفحة '+(i+1)+' من '+n+' من تقرير المنظّم"><div class="pn">صفحة '+(i+1)+' من '+n+'</div>').join('');
  $('pvInfo').textContent=n+' صفحات · '+sLbl(V.ui.season)+' · '+(mode()==='live'?'الفعالية قائمة':'الفعالية انتهت')+(demoOn()?' · بيانات الفريق المجمّعة':'');
  $('pvDl').disabled=false;
  try{$('pvDl').focus({preventScroll:true})}catch(e){}
 }catch(e){
  body.innerHTML='<div class="ld">تعذّر تجهيز التقرير: '+esc((e&&e.message)||e)+'</div>';
 }finally{pvBusy=false}
}
function closePreview(){
 $('pv').classList.remove('on');document.body.classList.remove('pv-open');
 $('pvBody').innerHTML='';freeRep();
 try{if(pvFocus&&pvFocus.focus&&pvFocus.isConnected)pvFocus.focus({preventScroll:true})}catch(e){}
}
async function dlPreview(){
 const b=$('pvDl');if(!REP||b.disabled)return;
 b.disabled=true;const t=b.textContent;b.textContent='جارٍ التجهيز…';
 try{
  if(!REP.blob)REP.blob=await pdfBlob(REP.doc.pages);
  await savePdf(REP.blob,REP.name,REP.doc.pages.length);
 }catch(e){toast('تعذّر التنزيل: '+((e&&e.message)||e))}
 finally{b.disabled=false;b.textContent=t}
}

/* ---------- wiring + boot ---------- */
function wire(){
 document.addEventListener('click',e=>{
  const tb=e.target.closest('#tabs .tab');if(tb){ACT.tab({dataset:{v:tb.dataset.tab}});return}
  const t=e.target.closest('[data-act]');if(t&&ACT[t.dataset.act])ACT[t.dataset.act](t);
 });
 $('btnPdf').addEventListener('click',()=>openPreview());
 document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='fSeason'||t.id==='fPeriod'||t.id==='fArea'||t.id==='fPlat'){S.ui.season=$('fSeason').value;S.ui.period=$('fPeriod').value;S.ui.area=$('fArea').value;S.ui.plat=$('fPlat').value;persist();renderAll();return}
  if(t.id==='evSel'){const id=t.value;if(id&&id!==S.eventId){saveEv();S.eventId=id;loadEv(id);D=null;PEND=[];UP.newEv=false;ensureSeasons();processAll();persist();renderAll();window.scrollTo(0,0);toast('الفعالية الآن: '+S.settings.event+'.')}return}
  if(t.id==='fFile'){const fl=Array.from(t.files||[]);t.value='';addFiles(fl);return}
  if(t.id==='upSeason'){UP.season=t.value;renderData();return}
  if(t.id==='upFilter'){UP.filter=t.checked;return}
  if(t.id==='upPlat'){UP.platform=t.value;renderData();return}
 });
 document.addEventListener('input',e=>{const t=e.target;if(t.id==='upText')UP.text=t.value;else if(t.id==='upNewId')UP.newId=t.value;else if(t.id==='upNewOpen')UP.newOpen=t.value});
 document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('#drop'))e.preventDefault()});
 document.addEventListener('drop',e=>{if(e.target.closest&&e.target.closest('#drop')){e.preventDefault();addFiles(Array.from((e.dataTransfer&&e.dataTransfer.files)||[]))}});
 $('scrim').addEventListener('click',()=>{D=null;renderDrawer()});
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('pv').classList.contains('on')){closePreview();return}if(D){D=null;renderDrawer()}});
}

/* ---------- voice field + classification corrections ---------- */
ACT.vfAsp=t=>vfSelect(t.dataset.a);
ACT.vfDot=t=>{const id=t.dataset.id,it=P.byId[id];if(!it)return;D={title:opinion(it)?'رأي زائر':'مادة لا تُحسب رأيًا',fn:i=>i.id===id,g:1,t:0};renderDrawer()};
ACT.fixCls=t=>{
 const id=t.dataset.id,a=t.dataset.a,it=P.byId[id];if(!it)return;
 fixLog().push({id,prev:S.overrides[id]?clone(S.overrides[id]):null});
 S.overrides[id]=it.aspects.filter(x=>x.a!==a).map(x=>({a:x.a,p:x.p}));
 persist();processAll();renderAll();
 toast('صحّحنا التصنيف: هذا الرأي لم يعد يُحسب شكوى من «'+ASPECTS[a].label+'».');
};
ACT.unfixCls=()=>{
 const f=fixLog().pop();if(!f)return;
 if(f.prev)S.overrides[f.id]=f.prev;else delete S.overrides[f.id];
 persist();processAll();renderAll();toast('تراجعنا عن آخر تصحيح.');
};
