/* ================= search & analyse an event + picking the event a chat message is about ================= */
const API=location.protocol.startsWith('http')?'':null; /* the search needs server/app.py; a file:// page has none */
const sKey=q=>norm((q.name||'')+'|'+(q.city||'')+'|'+(q.season||''));
/* consonant skeleton so «سيكس فلاغز» and «Six Flags» match */
function skel(s){
 const AR={'ا':'','ء':'','ي':'','و':'','ى':'','ة':'','ه':'h','ب':'b','ت':'t','ث':'t','ج':'j','ح':'h','خ':'k','د':'d','ذ':'d','ر':'r','ز':'s','س':'s','ش':'s','ص':'s','ض':'d','ط':'t','ظ':'d','ع':'','غ':'g','ف':'f','ق':'k','ك':'k','ل':'l','م':'m','ن':'n'};
 const t=norm(s).replace(/^ال/,'').replace(/ ال/g,' ');
 let o='';for(const ch of t){if(/[a-z]/.test(ch)){o+=('aeiouy'.includes(ch)?'':ch==='x'?'ks':ch==='c'||ch==='q'?'k':ch==='z'?'s':ch==='p'?'b':ch==='v'?'f':ch)}else if(AR[ch]!==undefined)o+=AR[ch]}
 return o.replace(/(.)\1+/g,'$1');
}
function evNames(id){
 const st=id===S.eventId?S.settings:((S.evStore[id]||{}).settings||{});
 const e=S.events.find(x=>x.id===id)||{};
 return [e.name].concat(((st.dict||{}).names)||[]).filter(Boolean);
}
function matchEvents(name){
 const n=norm(name),k=skel(name);if(n.length<2)return [];
 return S.events.filter(e=>evNames(e.id).some(a=>{const na=norm(a),ka=skel(a);return na===n||(n.length>=4&&(na.includes(n)||n.includes(na)))||(k.length>=4&&ka.length>=4&&(ka===k||ka.includes(k)||k.includes(ka)))}));
}
function switchEvent(id){
 if(id===S.eventId)return;
 saveEv();S.eventId=id;loadEv(id);D=null;PEND=[];UP.newEv=false;ensureSeasons();processAll();persist();renderAll();
}
function ensureEvent(q){
 const hit=matchEvents(q.name);
 if(hit.length){switchEvent(hit[0].id);return hit[0].id}
 saveEv();
 const kws=[q.name_en,q.name].filter(Boolean),id='e'+Date.now().toString(36),b=blankEvent(q.name,kws);
 S.events.push({id,name:q.name.trim()});S.evStore[id]=b;S.eventId=id;loadEv(id);
 D=null;PEND=[];ensureSeasons();processAll();initStamp();persist();renderAll();
 return id;
}
async function postJSON(path,body){
 if(API===null)return {state:'offline'};
 let r;
 try{r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}catch(e){return {state:'offline'}}
 let j={};try{j=await r.json()}catch(e){}
 if(r.status===503&&j.error==='no_key')return {state:'no_key',message:j.message};
 if(!r.ok)return {state:'error',message:j.error||('HTTP '+r.status)};
 return {state:'ok',data:j};
}
/* the whole pipeline: search -> verify sources -> analyse with the existing engine. step(i,text) reports progress */
async function searchAnalyze(q,step){
 q={name:String(q.name||'').trim(),name_en:String(q.name_en||'').trim(),city:String(q.city||'').trim(),season:String(q.season||'').trim(),force:!!q.force};
 if(q.name.length<2)return {state:'error',message:'اكتبوا اسم الفعالية.'};
 ensureEvent(q);
 step(0,'جاري البحث عن «'+q.name+'»'+(q.city?' في '+q.city:'')+(q.season?' · '+q.season:''));
 const s=await postJSON('/api/search',q);
 if(s.state!=='ok')return s;
 const amb=s.data.ambiguity||{};
 if(amb.needs&&amb.needs.length&&!q.force)return {state:'ambiguous',amb,q};
 step(1,'جاري التحقق من المصادر ('+fmt(s.data.results.length)+' نتيجة)');
 const v=await postJSON('/api/verify',Object.assign({},q,{results:s.data.results}));
 if(v.state!=='ok')return v;
 const d=v.data,key=sKey(q),season=q.season||'بحث الويب';
 step(2,'جاري تفريغ المقاطع');
 const clips=await clipStage(q,d,key,season,step);
 step(3,'جاري التحليل');
 const objs=d.opinions.filter(o=>o.quote).map(o=>({text:o.quote,url:o.url,published_at:o.date||''}));
 const rows=rowsFromTable(objs).rows.map((r,i)=>{const o=d.opinions.filter(x=>x.quote)[i];return Object.assign(r,{season,platform:o.platform==='web'?'web':o.platform,noFilter:true,srch:key,query:'general',kind:'comment',access:o.access})});
 S.imported=S.imported.filter(r=>r.srch!==key||r.clipRef).concat(rows);
 S.searches=S.searches||{};
 S.searches[key]={at:new Date().toISOString(),q:{name:q.name,name_en:q.name_en,city:q.city,season:q.season},provider:s.data.provider,queries:s.data.queries,errors:s.data.errors||[],
  opinions:d.opinions,official:d.official,unverified:d.unverified,excluded:d.excluded,duplicates:d.duplicates,pages_read:d.pages_read,notes:d.notes,clips:clips.map(c=>c.id)};
 S.lastSearch=key;
 ensureSeasons();S.ui.season=currentSeason();S.ui.period='all';S.ui.area='all';S.ui.plat='all';
 processAll();S.lastOk=nowStr()+' '+hhmm();persist();renderAll();
 return {state:'done',key,clips,used:rows.length+clips.reduce((n,c)=>n+(c.segments||[]).filter(x=>x.kind==='opinion').length,0),official:d.official.length,unverified:d.unverified.length,excluded:d.excluded.length,notes:d.notes};
}
const STATE_MSG={
 offline:'البحث يحتاج تشغيل خادم المشروع (server/app.py). هذه الصفحة مفتوحة بدونه، فما بحثنا.',
 no_key:'البحث غير مفعّل: ما فيه مفتاح بحث على الخادم (BRAVE_API_KEY أو GOOGLE_CSE_KEY وGOOGLE_CSE_CX).'};
const stateText=r=>STATE_MSG[r.state]||r.message||'تعذّر البحث.';
/* ---------- search card (data screen and empty events) ---------- */
function searchCard(pre){
 pre=pre||{};
 const f=(k,l,ph,v)=>'<label>'+l+'<input data-sq="'+k+'" type="text" value="'+esc(v||'')+'" placeholder="'+esc(ph)+'"></label>';
 return '<div class="sqcard"><h3>ابحث وحلّل فعالية</h3><p class="small">اكتبوا اسم الفعالية، والمستشار يبحث في الويب ويتحقق من المصادر ثم يحلل آراء الزوار. رفع الملفات خيار إضافي.</p>'+
  '<div class="vfilters">'+f('name','اسم الفعالية','مثل: شتاء طنطورة',pre.name)+f('name_en','الاسم بالإنجليزي (اختياري)','Winter at Tantora',pre.name_en)+f('city','المدينة','العلا',pre.city)+f('season','الموسم','2025',pre.season)+
  '<button class="btn coral" type="button" data-act="sqGo">ابحث وحلّل</button></div><div class="sqprog" aria-live="polite"></div></div>';
}
const STEPS=['جاري البحث','جاري التحقق من المصادر','جاري تفريغ المقاطع','جاري التحليل'];
function progHtml(i,txt,end){
 return '<ol class="sqsteps">'+STEPS.map((s,k)=>'<li class="'+(k<i||end==='done'?'done':k===i&&!end?'now':'')+'">'+esc(k===i&&txt?txt:s)+'</li>').join('')+'</ol>';
}
ACT.sqGo=async t=>{
 const card=t.closest('.sqcard'),q={};card.querySelectorAll('[data-sq]').forEach(i=>q[i.dataset.sq]=i.value);
 if(t.dataset.force)q.force=true;
 const prog=card.querySelector('.sqprog');t.disabled=true;
 const r=await searchAnalyze(q,(i,txt)=>{prog.innerHTML=progHtml(i,txt)});
 t.disabled=false;
 const box=(document.querySelector('.panel.on .sqprog'))||prog;
 if(r.state==='done'){toast('اكتمل البحث والتحليل: '+fmt(r.used)+' رأي زائر مستخدم.');return}
 if(r.state==='ambiguous'){box.innerHTML='<div class="note warn">الاسم يحتمل أكثر من فعالية'+(r.amb.cities.length?' في: '+r.amb.cities.map(esc).join('، '):'')+(r.amb.needs.includes('season')?' وفي أكثر من موسم':'')+'. حدّدوا المدينة أو الموسم ثم ابحثوا مرة ثانية.</div>';return}
 box.innerHTML='<div class="note warn">'+esc(stateText(r))+'</div>';
};
ACT.sqRefresh=async t=>{
 const s=(S.searches||{})[t.dataset.k];if(!s)return;
 const card=document.querySelector('.panel.on .srchsum');if(card)card.insertAdjacentHTML('beforeend','<div class="sqprog"></div>');
 const prog=card?card.querySelector('.sqprog'):null;
 const r=await searchAnalyze(Object.assign({},s.q,{force:true}),(i,txt)=>{if(prog)prog.innerHTML=progHtml(i,txt)});
 if(r.state!=='done'&&prog)prog.innerHTML='<div class="note warn">'+esc(stateText(r))+'</div>';
};
/* ---------- search summary + evidence ---------- */
function curSearch(){const ss=S.searches||{};const k=S.lastSearch&&ss[S.lastSearch]?S.lastSearch:Object.keys(ss).pop();return k?{k,s:ss[k]}:null}
function searchSummary(){
 const cs=curSearch();if(!cs)return '';const s=cs.s,off=s.official.slice(0,2);
 return '<div class="srchsum"><div class="row2" style="justify-content:space-between;align-items:center"><h3>من البحث في الويب: «'+esc(s.q.name)+'»'+(s.q.city?' · '+esc(s.q.city):'')+(s.q.season?' · '+esc(s.q.season):'')+'</h3><span class="small">آخر بحث: '+dAr(s.at.slice(0,10))+'</span></div>'+
  (off.length?'<div class="small"><b>عن الفعالية (مصادر رسمية أو إعلامية):</b></div>'+off.map(o=>'<blockquote class="cq">'+esc(clipT(o.quote||o.title,220))+' <a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">'+esc(o.domain)+' ↗</a></blockquote>').join(''):'<div class="small">ما لقينا صفحة رسمية أو إعلامية تؤكد معلومات الفعالية.</div>')+
  '<div class="facts"><span>آراء زوار مستخدمة في التحليل: '+fmt(s.opinions.length)+'</span><span>رسمي أو إعلامي: '+fmt(s.official.length)+'</span><span>ما تحققنا من صلته: '+fmt(s.unverified.length)+'</span><span>مستبعد: '+fmt(s.excluded.length)+'</span></div>'+
  s.notes.map(n=>'<div class="note warn">'+esc(n)+'</div>').join('')+
  '<div class="row2"><button class="btn" type="button" data-act="srchEv" data-k="'+esc(cs.k)+'">عرض الأدلة</button><button class="btn" type="button" data-act="sqRefresh" data-k="'+esc(cs.k)+'">تحديث البحث</button></div></div>';
}
function evidenceHtml(s){
 const grp=(t,list,showReason)=>'<h4>'+t+' ('+fmt(list.length)+')</h4>'+(list.length?list.map(o=>'<div class="ev"><div class="row">'+chip(o.domain||'رابط','mut')+(o.date?chip(dAr(o.date.slice(0,10)),'mut'):'')+chip(o.access,'warn')+'</div><div class="tx">'+esc(o.quote||o.title||'')+'</div><div class="small row" style="gap:4px 14px"><a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">فتح الرابط ↗</a>'+(showReason?'<span>'+esc(o.reason)+'</span>':'')+'</div></div>').join(''):'<div class="small">لا شيء.</div>');
 return '<div class="note">الاستعلامات: '+s.queries.map(esc).join(' · ')+'</div>'+grp('آراء زوار مستخدمة في الحساب',s.opinions)+grp('مصادر رسمية أو إعلامية (للمعلومات فقط)',s.official)+grp('محتوى ما تحققنا من صلته',s.unverified,true)+grp('مستبعد',s.excluded,true);
}
ACT.srchEv=t=>{const s=(S.searches||{})[t.dataset.k];if(!s)return;D={title:'أدلة البحث: '+s.q.name,html:evidenceHtml(s)};renderDrawer()};

/* ---------- chat: which event is this message about? ---------- */
const NOT_EVENT=/^(?:البيانات|الشكاوي|الشكاوى|الزوار|المنصات|التوصيات|المشاعر|هذي الفعاليه|هذه الفعاليه|الفعاليه)$/;
function parseEventRef(text){
 const raw=String(text||'').trim().replace(/[؟?!.]+$/,'');
 let name='',city='',season='';
 const sm=raw.match(/(?:موسم\s+)?(20\d\d(?:\s*[\/\-]\s*\d{2,4})?)/);if(sm)season=sm[1];
 let m=raw.match(/(?:تقرير|حلّل|حلل|analy[sz]e|report)\s*(?:لي\s*)?(?:عن|على)?\s*(?:فعالية|فعاليه|مهرجان)?\s*(.+)$/i)||raw.match(/(?:ابحث|بحث)\s*(?:لي\s*)?(?:عن)?\s*(?:فعالية|فعاليه)\s+(.+)$/)||raw.match(/(?:فعالية|فعاليه)\s+(.+)$/);
 if(!m)m=raw.match(/(?:زوار|زوّار|جمهور)\s+(?!الفعاليه|الفعالية|هذي|هذه)(.+)$/);
 if(m)name=m[1];
 else{const lat=raw.match(/[A-Za-z][A-Za-z0-9'&]+(?:\s+[A-Za-z0-9'&]+)*/g)||[];name=(lat.find(x=>x.length>=4&&!/^(pdf|tiktok|google|maps|gmaps|report|twitter)$/i.test(x))||'')}
 if(!name)return null;
 const cm=name.match(/^(.+?)\s+(?:اللي|الي|التي|الّي)?\s*(?:في|ب|بـ|in|at)\s+(.+)$/i);
 if(cm){name=cm[1];city=cm[2]}
 name=name.replace(/\s+(?:اللي|الي|التي)$/,'').replace(season,'').trim();city=city.replace(season,'').replace(/^ال(?=ال)/,'').trim();
 const n=norm(name);
 if(n.length<2||NOT_EVENT.test(n)||/^(pdf|تقرير|تقرير pdf|ملخص|الان|الحين)$/.test(n))return null;
 if(detAspects(cn(name)).length&&name.split(/\s+/).length<=2)return null;
 return {name,city,season,name_en:/^[A-Za-z]/.test(name)?name:''};
}
/* known events named anywhere in the message, in Arabic or English spelling */
function mentionedEvents(text){
 const n=' '+norm(text)+' ',k=skel(text);
 return S.events.filter(e=>evNames(e.id).some(a=>{const na=norm(a),ka=skel(a);return (na.length>=4&&n.includes(na))||(ka.length>=5&&k.includes(ka))}));
}
let CHATQ=null; /* a clarifying question we are waiting on */
async function resolveChatEvent(text){
 if(CHATQ&&text.split(/\s+/).length<=3&&!parseEventRef(text)){
  const q=Object.assign({},CHATQ,{city:CHATQ.city||text.trim(),force:true});CHATQ=null;
  return chatSearch(q);
 }
 const named=mentionedEvents(text);
 if(named.length===1&&named[0].id!==S.eventId){switchEvent(named[0].id);addMsg('a','<div class="body small">انتقلت إلى فعالية «'+esc(S.settings.event)+'» وأجاوب من بياناتها فقط.</div>');return {go:true}}
 if(named.length===1)return {go:true};
 const ref=parseEventRef(text);
 if(!ref)return {go:true};
 const hit=matchEvents(ref.name);
 if(hit.length>1&&!hit.some(e=>e.id===S.eventId)){
  addMsg('a','<div class="body">قصدكم أي فعالية؟</div><div class="acts">'+hit.map(e=>actBtn({l:e.name,d:'evPick',v:e.id,cs:csNow()})).join('')+'</div>');return {go:false};
 }
 if(hit.length){
  if(hit[0].id!==S.eventId){switchEvent(hit[0].id);addMsg('a','<div class="body small">انتقلت إلى فعالية «'+esc(S.settings.event)+'» وأجاوب من بياناتها فقط.</div>')}
  if(!P.items.length&&!Object.keys(S.searches||{}).length)return chatSearch(ref);
  return {go:true};
 }
 return chatSearch(ref);
}
async function chatSearch(q){
 const el=addMsg('a','<div class="body"><div>أبحث عن فعالية «<b>'+esc(q.name)+'</b>»'+(q.city?' في '+esc(q.city):'')+(q.season?' · '+esc(q.season):'')+'.</div><div class="sqp">'+progHtml(0)+'</div></div><div class="acts"></div>');
 const pr=el.querySelector('.sqp');
 const r=await searchAnalyze(q,(i,txt)=>{pr.innerHTML=progHtml(i,txt);scrollLog()});
 const body=el.querySelector('.body');
 if(r.state==='ambiguous'){
  CHATQ=r.q;
  pr.innerHTML='';
  body.insertAdjacentHTML('beforeend','<div>الاسم يحتمل أكثر من فعالية. وين أو متى؟</div>');
  el.querySelector('.acts').innerHTML=(r.amb.cities||[]).map(c=>'<button class="btn sm" type="button" data-act="chip" data-q="'+esc(c)+'">'+esc(c)+'</button>').join('')+(r.amb.years||[]).slice(0,3).map(y=>'<button class="btn sm" type="button" data-act="chip" data-q="'+esc(y)+'">'+esc(y)+'</button>').join('');
  return {go:false};
 }
 if(r.state!=='done'){
  pr.innerHTML=progHtml(0,'',true);
  body.insertAdjacentHTML('beforeend','<div class="note warn">'+esc(stateText(r))+'</div><div class="small">ما عندي بيانات عن «'+esc(S.settings.event)+'»، فما راح أجاوب من فعالية ثانية. تقدرون ترفعون ملف تعليقات من «الفعاليات والبيانات».</div>');
  el.querySelector('.acts').innerHTML=actBtn({l:'إضافة بيانات',d:'go',v:'data',cs:csNow()});
  return {go:false};
 }
 pr.innerHTML=progHtml(3,'','done');
 const s=S.searches[r.key];
 body.insertAdjacentHTML('beforeend','<div>لقيت '+fmt(r.used)+' رأي زائر متحقق منه، و'+fmt(r.official)+' مصدر رسمي أو إعلامي، واستبعدت '+fmt(r.excluded)+'.'+(r.clips.length?' المقاطع: '+r.clips.map(c=>(CSTAT[c.status]||[c.status])[0]).join('، ')+'.':'')+'</div>'+r.notes.map(n=>'<div class="small">'+esc(n)+'</div>').join(''));
 el.querySelector('.acts').innerHTML='<button class="btn sm" type="button" data-act="srchEv" data-k="'+esc(r.key)+'">عرض الأدلة</button>';
 return {go:r.used>0,searched:true,s};
}
ACT.evPick=t=>{switchEvent(t.dataset.v);addMsg('a','<div class="body small">انتقلت إلى «'+esc(S.settings.event)+'».</div>')};

/* ================= clips: Whisper transcription after the search, plus one uploaded clip ================= */
const CLIPBLOB={}; /* clip id -> blob URL, this session only (we never keep a permanent copy) */
const KIND_LBL={opinion:['رأي يدخل في التحليل','bad'],info:['معلومة من إعلان أو تغطية','ok'],speech:['كلام','mut'],unrelated:['غير مرتبط بالفعالية','mut']};
const CSTAT={done:['مفرّغ','ok'],unavailable:['غير متاح للتفريغ','mut'],not_permitted:['غير مسموح بمعالجته','warn'],failed:['تعذّر التفريغ','warn'],allowed:['مسموح، لم يُفرّغ بعد','mut']};
function clipRows(rec,season,key){
 const segs=(rec.segments||[]).filter(s=>s.kind==='opinion'&&s.text);
 const base=rec.media_url||rec.source_url||'';
 return rowsFromTable(segs.map(s=>({text:s.text}))).rows.map((r,i)=>{const s=segs[i],id=rec.id+'@'+s.start;
  return Object.assign(r,{id,clipId:rec.id,url:/^https?:/.test(base)?base+'#t='+Math.floor(s.start):'',platform:'clip',clipRef:rec.id,clipT:s.start,clipTs:s.ts,season,noFilter:true,query:'general',kind:'comment',srch:key,test:!!rec.test})});
}
function addClip(rec,season,key){
 S.clips=(S.clips||[]).filter(c=>c.id!==rec.id).concat([rec]);
 S.imported=S.imported.filter(r=>r.clipRef!==rec.id).concat(rec.status==='done'?clipRows(rec,season,key):[]);
}
async function clipStage(q,d,key,season,step){
 const items=[].concat(d.opinions.map(o=>({url:o.url,title:o.title,date:o.date,kind:'opinion'})),d.official.map(o=>({url:o.url,title:o.title,date:o.date,kind:'official'})),d.unverified.map(o=>({url:o.url,title:o.title,date:o.date,kind:''})));
 if(!items.length)return [];
 const m=await postJSON('/api/media',Object.assign({},q,{items}));
 if(m.state!=='ok')return [];
 const recs=m.data.clips.map(c=>({id:'clip:'+hash(c.source_url),label:c.title||domainOf(c.source_url),source_url:c.source_url,media_url:c.media_url||'',status:c.status,reason:c.reason,license:c.license||'',kind:c.source_kind,date:c.date||'',segments:[],at:new Date().toISOString()}));
 let n=0;
 for(const r of recs){
  if(r.status!=='allowed')continue;
  if(!m.data.whisper){r.status='failed';r.reason='Whisper غير مثبّت على الخادم.';continue}
  if(n>=m.data.max_clips){r.reason='مسموح، لكن نبدأ بمقطع واحد لكل بحث.';continue}
  n++;step(2,'جاري تفريغ المقطع '+n+': '+clipT(r.label,40));
  const t=await postJSON('/api/transcribe',Object.assign({},q,{source_url:r.source_url,media_url:r.media_url,source_kind:r.kind==='official'?'official':'',page_names_event:true}));
  if(t.state==='ok'){Object.assign(r,{status:'done',segments:t.data.segments,language:t.data.language,duration:t.data.duration,model:t.data.model,related:t.data.related})}
  else{r.status='failed';r.reason=(t.data&&t.data.reason)||t.message||'تعذّر التفريغ.'}
 }
 recs.forEach(r=>addClip(r,season,key));
 return recs;
}
const segAr=n=>n===1?'مقتطف واحد':n===2?'مقتطفان':n>=3&&n<=10?n+' مقتطفات':fmt(n)+' مقتطفًا';
const domainOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}};
/* ---------- upload one clip ---------- */
function clipCard(){
 return '<div class="sqcard clipcard"><h3>فرّغ مقطعًا بـ Whisper</h3><p class="small">ارفعوا مقطع صوت أو فيديو عندكم حق معالجته. نفرّغ الكلام ونربط كل مقتطف بالفعالية وتوقيته، ولا نحتفظ بنسخة من المقطع بعد التفريغ.</p>'+
  '<div class="vfilters"><label>الملف<input type="file" data-clip="file" accept="audio/*,video/*"></label>'+
  '<label>نوع المقطع<select data-clip="kind"><option value="">مقطع من زائر (رأي)</option><option value="official">إعلان أو تغطية إعلامية (معلومة فقط)</option><option value="test">مقطع اختبار</option></select></label>'+
  '<label style="flex:2 1 260px"><span><input type="checkbox" data-clip="ok"> أؤكد إن عندنا حق معالجة هذا المقطع</span></label>'+
  '<button class="btn coral" type="button" data-act="clipGo">فرّغ وحلّل</button></div><div class="sqprog" aria-live="polite"></div></div>';
}
ACT.clipGo=async t=>{
 const card=t.closest('.clipcard'),f=card.querySelector('[data-clip=file]').files[0],kind=card.querySelector('[data-clip=kind]').value,ok=card.querySelector('[data-clip=ok]').checked,prog=card.querySelector('.sqprog');
 if(!f){prog.innerHTML='<div class="note warn">اختاروا ملف صوت أو فيديو.</div>';return}
 if(!ok){prog.innerHTML='<div class="note warn">ما نفرّغ مقطعًا قبل تأكيد إن عندكم حق معالجته.</div>';return}
 if(API===null){prog.innerHTML='<div class="note warn">'+esc(STATE_MSG.offline)+'</div>';return}
 t.disabled=true;prog.innerHTML='<ol class="sqsteps"><li class="now">جاري التفريغ بـ Whisper</li><li>جاري التحليل</li></ol>';
 const qs=new URLSearchParams({name:S.settings.event,name_en:((S.settings.dict||{}).names||[]).find(x=>/^[A-Za-z]/.test(x))||'',kind:kind==='official'?'official':''});
 let r,j={};
 try{r=await fetch('/api/transcribe-file?'+qs,{method:'POST',body:f});j=await r.json()}catch(e){r=null}
 t.disabled=false;
 if(!r){prog.innerHTML='<div class="note warn">'+esc(STATE_MSG.offline)+'</div>';return}
 if(r.status===503){prog.innerHTML='<div class="note warn">Whisper غير مثبّت على الخادم. ثبّتوه بـ pip install -r server/requirements-whisper.txt ثم أعيدوا تشغيل الخادم.</div>';return}
 if(!r.ok){prog.innerHTML='<div class="note warn">تعذّر تفريغ الملف ('+esc(j.error||r.status)+').</div>';return}
 const id='clip:up:'+hash(f.name+f.size+f.lastModified);
 const rec={id,label:f.name,source_url:'',media_url:'',status:'done',reason:'مقطع رفعه المنظّم مع تأكيد حق المعالجة',kind:kind==='official'?'official':'',test:kind==='test',upload:true,segments:j.segments,language:j.language,duration:j.duration,model:j.model,related:j.related,at:new Date().toISOString()};
 if(CLIPBLOB[id])URL.revokeObjectURL(CLIPBLOB[id]);CLIPBLOB[id]=URL.createObjectURL(f);
 addClip(rec,'رفع يدوي',id);
 ensureSeasons();S.ui.season=currentSeason();S.ui.period='all';processAll();persist();renderAll();
 const op=j.segments.filter(s=>s.kind==='opinion').length;
 toast(j.related?'فرّغنا '+segAr(j.segments.length)+'، منها '+rAr(op)+' دخلت التحليل.':'فرّغنا المقطع، لكنه ما يذكر الفعالية، فما دخل التحليل.');
};
ACT.clipDel=t=>{const id=t.dataset.c;S.clips=(S.clips||[]).filter(c=>c.id!==id);S.imported=S.imported.filter(r=>r.clipRef!==id);if(CLIPBLOB[id]){URL.revokeObjectURL(CLIPBLOB[id]);delete CLIPBLOB[id]}D=null;processAll();persist();renderAll()};
/* ---------- evidence: player at the moment + full transcript ---------- */
function clipEvidenceHtml(rec,at){
 const src=CLIPBLOB[rec.id]||(rec.status==='done'&&rec.media_url?rec.media_url:'');
 const segs=rec.segments||[];
 return '<div class="row">'+chip((CSTAT[rec.status]||[rec.status])[0],(CSTAT[rec.status]||['','mut'])[1])+(rec.test?chip('مقطع اختبار','warn'):'')+(rec.license?chip(rec.license,'mut'):'')+(rec.model?chip('Whisper '+rec.model+(rec.language?' · '+rec.language:''),'mut'):'')+'</div>'+
  '<p class="small">الفعالية: <b>'+esc(S.settings.event)+'</b>'+(rec.source_url?' · المصدر: <a href="'+esc(rec.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(domainOf(rec.source_url))+' ↗</a>':' · مقطع رفعه المنظّم')+'</p>'+
  (src?'<video class="clipplayer" controls preload="metadata" src="'+esc(src)+'"></video>':'<div class="note">'+(rec.status==='done'?'ما نحتفظ بنسخة من المقطع بعد التفريغ، فالتشغيل متاح فقط خلال الجلسة اللي رُفع فيها. هذا نص التفريغ بتوقيته.':esc(rec.reason||''))+'</div>')+
  (segs.length?'<div class="segs">'+segs.map(s=>'<div class="seg'+(Math.abs(s.start-at)<0.01?' on':'')+'" data-start="'+s.start+'"><button class="btn sm" type="button" data-act="clipSeek" data-t="'+s.start+'">'+esc(s.ts)+'</button><span dir="auto">'+esc(s.text)+'</span>'+chip(KIND_LBL[s.kind][0],KIND_LBL[s.kind][1])+'</div>').join('')+'</div>':'')+
  '<div class="row2"><button class="btn sm" type="button" data-act="clipDel" data-c="'+esc(rec.id)+'">حذف هذا المقطع من الفعالية</button></div>';
}
ACT.clipEv=t=>{
 const rec=(S.clips||[]).find(c=>c.id===t.dataset.c);if(!rec)return;
 const at=Number(t.dataset.t||0);
 D={title:'دليل من مقطع: '+rec.label,html:clipEvidenceHtml(rec,at)};renderDrawer();
 const v=document.querySelector('#drawer .clipplayer');
 if(v){const go=()=>{try{v.currentTime=at}catch(e){}};if(v.readyState>=1)go();else v.addEventListener('loadedmetadata',go,{once:true})}
 const on=document.querySelector('#drawer .seg.on');if(on)on.scrollIntoView({block:'center'});
};
ACT.clipSeek=t=>{const v=document.querySelector('#drawer .clipplayer'),at=Number(t.dataset.t);document.querySelectorAll('#drawer .seg').forEach(s=>s.classList.toggle('on',Number(s.dataset.start)===at));if(v){v.currentTime=at;v.play().catch(()=>{})}};
function clipsSummary(){
 const cs=S.clips||[];if(!cs.length)return '';
 return '<div class="srchsum"><h3>المقاطع</h3>'+cs.map(c=>{const op=(c.segments||[]).filter(s=>s.kind==='opinion');
  return '<div class="dz"><div><b>'+esc(clipT(c.label,60))+'</b> '+chip((CSTAT[c.status]||[c.status])[0],(CSTAT[c.status]||['','mut'])[1])+(c.test?chip('مقطع اختبار','warn'):'')+(c.kind==='official'?chip('إعلان أو تغطية: معلومة فقط','mut'):'')+
   '<div class="small">'+(c.status==='done'?segAr((c.segments||[]).length)+'، منها '+rAr(op.length)+' دخلت التحليل'+(c.related===false?' · لا يذكر الفعالية':''):esc(c.reason||''))+'</div></div>'+
   (c.status==='done'?'<button class="btn sm" type="button" data-act="clipEv" data-c="'+esc(c.id)+'" data-t="'+(op[0]?op[0].start:0)+'">افتح الدليل</button>':(c.source_url?'<a class="btn sm" href="'+esc(c.source_url)+'" target="_blank" rel="noopener noreferrer">المصدر ↗</a>':''))+'</div>'}).join('')+'</div>';
}
