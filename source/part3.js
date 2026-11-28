
/* ---------- state ---------- */
const KEY='blvdw-simple-v5';
const EX_LESSON={id:'ex1',demo:true,aspect:'wait',problem:'الانتظار عند أكثر تجربة طلبًا تجاوز الحد المقبول في الأسبوع الأول (مثال توضيحي).',
 action:'حجز مواعيد دخول للتجربة وعرض وقت الانتظار على شاشة المدخل.',context:'مثال توضيحي تجريبي: فعالية موسمية، منطقة جديدة، تجربة واحدة بطابور طويل.',
 result:'لم تُسجَّل نتيجة بعد. هذا المثال يوضح شكل الدرس المحفوظ فقط.'};
const EV_KEYS=['settings','imported','importMeta','saved','ideas','lessons','reviewed','overrides','snaps','lastOk','ui','sources','builtin','searches','lastSearch','clips'];
const UI0=()=>({season:'كل الفترات',period:'all',area:'all',plat:'all',metric:'negAny',tab:'overview',status:'auto',prob:null,vs:null});
let S={settings:clone(DEF),builtin:true,batch:1,imported:[],importMeta:null,saved:[],ideas:[],lessons:[clone(EX_LESSON)],reviewed:{},overrides:{},sources:[],searches:{},lastSearch:null,clips:[],
 events:[{id:'blvd',name:'بوليفارد وورلد'}],eventId:'blvd',evStore:{},
 snaps:[],lastOk:null,lastErr:null,simFail:false,lastDiff:null,runLog:[],ui:UI0()};
try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&typeof j==='object'){for(const k in j){if(k in S&&j[k]!=null)S[k]=j[k]}}}catch(e){}
let storeOK=true;
function persist(){try{const o={};for(const k of EV_KEYS.concat(['batch','simFail','events','eventId','evStore']))o[k]=S[k];localStorage.setItem(KEY,JSON.stringify(o))}catch(e){storeOK=false}}
let toastT;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),4200)}
function addLog(type,msg){const d=new Date();S.runLog.unshift({t:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),type,msg});if(S.runLog.length>80)S.runLog.pop()}

/* ---------- seasons, period ---------- */
const ALLP='كل الفترات';
function seasonObj(id){return id===ALLP?{id:ALLP,open:'',note:'كل فترات الملف معًا'}:S.settings.seasons.find(s=>s.id===id)}
const nsd=id=>id===ALLP||!/\d/.test(id);
const sLbl=id=>nsd(id)?id:'الموسم '+id;
const sIn=id=>nsd(id)?id:'موسم '+id;
function allSeasonIds(){const ss=S.settings.seasons;return ss.filter(s=>s.open).sort((a,b)=>a.open<b.open?-1:1).concat(ss.filter(s=>!s.open).sort((a,b)=>a.id<b.id?-1:1)).map(s=>s.id)}
function seasonOrder(){const all=allSeasonIds(),have=new Set(activeRows().map(r=>r.season)),o=all.filter(id=>have.has(id));return o.length?o:all}
/* ---------- events (reusable for any event) + sources (adapters) ---------- */
const PLATS=['gmaps','tiktok','x','web','clip','other'];
const PLAT={gmaps:'قوقل ماب',tiktok:'تيك توك',x:'X (تويتر)',web:'صفحات الويب',clip:'مقاطع مفرّغة',other:'منصة أخرى'};
const PLAT_NOTE={gmaps:'تقييمات الزوار (نصوص ونجوم)',tiktok:'عناوين الفيديوهات وتعليقاتها',x:'نصوص المنشورات',web:'آراء زوار من صفحات عامة وجدها البحث',clip:'كلام مفرّغ بـ Whisper من مقاطع مسموح بمعالجتها',other:'ملف بلا منصة محددة'};
const FUTURE=[
 {id:'gmaps_live',label:'قوقل ماب المباشر',desc:'ربط مباشر لجمع التقييمات والنجوم تلقائيًا بدل رفع الملفات.'},
 {id:'cameras',label:'الكاميرات',desc:'استخدام بيانات الكاميرات الجاهزة (أعداد الزوار وحركة الحشود) لفهم الازدحام وربطه بآراء الزوار، بشرط الخصوصية والموافقات. لا تحكّم مباشر بالكاميرات.'},
 {id:'reports',label:'رفع تقاريركم',desc:'رفع تقارير ومستندات المنظّم لدمجها مع ما يعرفه الوكيل.'}];
const demoOn=()=>S.eventId==='blvd'&&!!S.builtin;
const curEvent=()=>S.events.find(e=>e.id===S.eventId)||S.events[0];
function saveEv(){const o={};for(const k of EV_KEYS)o[k]=clone(S[k]);S.evStore[S.eventId]=o}
function loadEv(id){const o=S.evStore[id];if(!o)return false;for(const k of EV_KEYS)if(o[k]!==undefined)S[k]=clone(o[k]);return true}
function blankEvent(name,kws){
 const nm=name.trim(),st=clone(DEF);st.event=nm;st.seasons=[];st.areas=[];st.dict={names:[nm].concat(kws),hashtags:[],directed:DEF.dict.directed.slice(),excl:[]};
 return {settings:st,imported:[],importMeta:null,saved:[],ideas:[],lessons:[clone(EX_LESSON)],reviewed:{},overrides:{},snaps:[],lastOk:null,ui:UI0(),sources:[],builtin:false,searches:{},lastSearch:null,clips:[]};
}
function srcCounts(){const c={};activeRows().forEach(r=>{const k=r.platform||(r.stars!=null?'gmaps':'other');c[k]=(c[k]||0)+1});return c}
function srcTxt(){const c=srcCounts(),l=PLATS.filter(k=>c[k]).map(k=>fmt(c[k])+' من '+PLAT[k]);return l.length?l.join(' · '):'لا بيانات بعد'}
function platRead(){
 const pl=V.plats,soc=pl.filter(x=>x.p==='tiktok'||x.p==='x'),gm=pl.find(x=>x.p==='gmaps'),L=[];
 if(gm&&gm.sent.n)L.push(PLAT.gmaps+': '+pc(gm.sent.pos/gm.sent.n)+' إيجابي'+(gm.negTop?'، وأكثر شكوى «'+ASPECTS[gm.negTop.a].label+'»':'')+'.');
 soc.forEach(x=>L.push(PLAT[x.p]+': '+mAd(x.n)+(x.official?'، منها '+x.official+' رسمية أو إعلامية':'')+(x.sent.n?'، والباقي '+pc(x.sent.pos/x.sent.n)+' إيجابي':'')+'.'));
 if(soc.length)L.push('منشورات المنصات عناوين فقط وليست تعليقات الزوار، فمقارنتها بقوقل ماب تقريبية.');
 return L.join(' ');
}
let SAMPLE_ROWS=null;
function sampleRows(){
 if(!SAMPLE_ROWS){
  const t=parseCSV(SAMPLE_CSV),hd=t[0];
  const objs=t.slice(1).map(r=>{const o={};hd.forEach((h,i)=>o[h]=r[i]);return o});
  const gm=rowsFromTable(objs).rows.map((r,i)=>{const id='smp:g'+i;return Object.assign(r,{id,clipId:id,url:'',collectedAt:'2026-11-20',noFilter:true,platform:'gmaps',review:true,builtin:true})});
  const so=SOC_SNAP.map((x,i)=>{const id='smp:s'+i;return {id,text:x.t,clipId:id,url:x.u,publishedAt:x.d,collectedAt:'2026-11-20',season:x.s,area:detectArea('',x.t),kind:'post',official:!!x.o,reposted:false,query:'general',likes:0,demo:true,stars:null,review:false,noFilter:true,platform:x.p,builtin:true}});
  SAMPLE_ROWS=gm.concat(so);
 }
 return SAMPLE_ROWS;
}
const activeRows=()=>(demoOn()?sampleRows():[]).concat(S.imported);
function nowStr(){if(demoOn())return '2026-11-20';return S.importMeta?S.importMeta.at.slice(0,10):new Date().toISOString().slice(0,10)}
function hasAllOpt(){const o=seasonOrder();return o.length>1&&o.every(id=>!(S.settings.seasons.find(s=>s.id===id)||{}).open)}
function currentSeason(){const o=seasonOrder();if(!o.length||hasAllOpt())return ALLP;const d=o.filter(id=>seasonObj(id).open);return d.length?d[d.length-1]:o[o.length-1]}
function curDays(){const s=seasonObj(currentSeason());if(!s||!s.open)return Infinity;return Math.max(1,Math.min(120,dnum(nowStr())-dnum(s.open)+1))}
function periodDays(p){return p==='eq'?curDays():p==='all'?Infinity:Number(p.slice(1))}
const areaName=id=>id==='gen'?'عام / غير محدد':((S.settings.areas.find(a=>a.id===id)||{}).name||id);
const opinion=i=>i.intent==='visited'&&!i.uncertain&&i.query==='general';
const vis=i=>i.intent==='visited'&&!i.uncertain;

/* ---------- pipeline: raw -> kept items with labels ---------- */
let P={items:[],byId:{},log:{}};
function sentOf(i){
 if(i.intent==='official'||i.intent==='planning')return null;
 if(i.stars!=null)return i.stars>=4?'pos':i.stars<=2?'neg':'neu';
 let pa=i.aspects.filter(x=>x.p==='pos').length,na=i.aspects.filter(x=>x.p==='neg').length;
 if(i.gen==='pos')pa++;if(i.gen==='neg')na++;
 return pa>na?'pos':na>pa?'neg':'neu';
}
function processAll(){
 const d=S.settings.dict;
 const names=d.names.concat(d.hashtags).filter(Boolean),ex=d.excl.filter(Boolean);
 const nameRe=names.length?re(names):/$^/,exclRe=ex.length?re(ex):null;
 const L={total:0,social:0,general:0,targeted:0,unrelated:0,excl:{},repost:0,dup:0,official:0,uncertain:0,kept:0,updated:0};
 const raw=activeRows();
 const ids=new Set(),keys=new Set(),items=[];
 for(const r of raw){
  L.total++;
  if(ids.has(r.id)){L.dup++;continue}ids.add(r.id);
  const t=norm(r.text),key=(r.clipId||'')+'|'+t;
  if(keys.has(key)){L.dup++;continue}keys.add(key);
  if(r.reposted){L.repost++;continue}
  const hasName=nameRe.test(t),m=exclRe?t.match(exclRe):null;
  if(m&&!hasName){L.excl[m[0]]=(L.excl[m[0]]||0)+1;continue}
  if(!hasName&&!r.noFilter){L.unrelated++;continue}
  const c=r.official?{aspects:[],intent:'official',uncertain:false,ret:false,noret:false,chance:false,topic:null,gen:null}:classify(r.text,r.stars);
  r.platform=r.platform||(r.stars!=null?'gmaps':'other');
  if(r.platform==='gmaps'&&!r.official)c.intent='visited';
  if(r.stars!=null&&!r.official)c.uncertain=false;
  if(m&&hasName)c.uncertain=true;
  if(S.overrides[r.id]){c.aspects=S.overrides[r.id];c.uncertain=false}
  const sc=seasonObj(r.season);let day=null,week=null;
  if(sc&&sc.open&&r.publishedAt){day=dnum(r.publishedAt)-dnum(sc.open)+1;if(day<1||day>120)day=null;else week=Math.ceil(day/7)}
  const it=Object.assign({},r,c,{day,week,area:r.area||'gen',query:r.query||'general',kind:r.kind||'comment',clipId:r.clipId||r.id,likes:r.likes||0});
  it.sent=sentOf(it);
  items.push(it);L.kept++;
  if(it.platform==='tiktok'||it.platform==='x')L.social++;else if(it.query==='general')L.general++;else L.targeted++;
  if(it.intent==='official')L.official++;
  if(it.uncertain)L.uncertain++;
 }
 P={items,byId:Object.fromEntries(items.map(i=>[i.id,i])),log:L};
}
function scopeItems(sid,ui){
 const sc=seasonObj(sid),per=(sc&&!sc.open)?'all':ui.period,pd=periodDays(per);
 return P.items.filter(i=>(sid===ALLP||i.season===sid)&&(ui.area==='all'||i.area===ui.area)&&(!ui.plat||ui.plat==='all'||i.platform===ui.plat)&&(pd===Infinity||(i.day!=null&&i.day<=pd)));
}
function stats(items){
 const op=items.filter(opinion);
 const s={all:items.length,N:op.length,posts:items.filter(i=>i.kind==='post').length,comments:items.filter(i=>i.kind!=='post').length,
  official:items.filter(i=>i.intent==='official').length,uncertain:items.filter(i=>i.uncertain).length,
  planning:items.filter(i=>i.intent==='planning'&&i.query==='general').length,A:{},ret:0,noret:0,negAny:0,posAny:0,clips:new Set(op.map(i=>i.clipId)).size,targeted:items.filter(i=>i.query==='targeted').length};
 s.sent={pos:items.filter(i=>i.sent==='pos').length,neu:items.filter(i=>i.sent==='neu').length,neg:items.filter(i=>i.sent==='neg').length};s.sent.n=s.sent.pos+s.sent.neu+s.sent.neg;
 for(const a of AKEYS)s.A[a]={neg:0,pos:0,neu:0,negClips:new Set(),posClips:new Set(),negIds:[],posIds:[]};
 for(const i of op){let na=false,pa=false;
  for(const x of i.aspects){const y=s.A[x.a];if(!y)continue;
   if(x.p==='neg'){y.neg++;y.negClips.add(i.clipId);y.negIds.push(i.id);na=true}
   else if(x.p==='pos'){y.pos++;y.posClips.add(i.clipId);y.posIds.push(i.id);pa=true}else y.neu++}
  if(!na&&!pa){if(i.gen==='neg')na=true;else if(i.gen==='pos')pa=true}
  if(na)s.negAny++;if(pa)s.posAny++;if(i.ret)s.ret++;if(i.noret)s.noret++}
 return s;
}
function platformStats(items){
 const out=[];
 for(const pl of PLATS){
  const it=items.filter(i=>i.platform===pl);if(!it.length)continue;
  const s=stats(it),st=starStats(it);
  const top=k=>{const l=AKEYS.map(a=>({a,n:s.A[a][k]})).filter(x=>x.n>0).sort((x,y)=>y.n-x.n);return l[0]||null};
  out.push({p:pl,n:it.length,official:s.official,planning:it.filter(i=>i.intent==='planning').length,s,st,sent:s.sent,negTop:top('neg'),posTop:top('pos')});
 }
 return out;
}
function topicStats(items){
 const t={};
 for(const i of items){if(i.intent==='official'||i.intent==='planning')continue;
  for(const x of i.aspects){const y=t[x.a]=t[x.a]||{a:x.a,n:0,pos:0,neg:0,neu:0,plats:new Set()};y.n++;y.plats.add(i.platform);if(x.p==='pos')y.pos++;else if(x.p==='neg')y.neg++;else y.neu++}}
 return Object.values(t).sort((p,q)=>q.n-p.n);
}
function starStats(items){
 const r=items.filter(i=>i.stars!=null&&i.intent!=='official');
 const dist=[0,0,0,0,0,0];r.forEach(i=>{dist[i.stars]++});
 const n=r.length,sum=r.reduce((t,i)=>t+i.stars,0);
 return {n,avg:n?sum/n:null,dist,low:dist[1]+dist[2],high:dist[4]+dist[5]};
}
const avgTxt=v=>LI+(Math.round(v*10)/10).toFixed(1)+PI;
function zt(a,n1,b,n2){if(!n1||!n2)return null;const p1=a/n1,p2=b/n2,p=(a+b)/(n1+n2),se=Math.sqrt(p*(1-p)*(1/n1+1/n2));return se?(p1-p2)/se:0}
const LI='\u2066',PI='\u2069';
const pc=v=>v==null?'—':LI+Math.round(v*100)+'%'+PI;
const pn=n=>LI+n+'%'+PI;
const sg=d=>LI+(d>0?'+':'')+Math.round(d*100)+PI+' نقطة';
const cell=(n,N)=>N?pc(n/N)+'<small>'+fmt(n)+' من '+fmt(N)+'</small>':'<span class="flat">—</span>';

/* ---------- derived view for current filters ---------- */
let V={};
let EV={};
function evKey(title,fn,note){const k='e'+Object.keys(EV).length;EV[k]={title,fn,note:note||''};return k}
function computeView(){
 EV={};
 const ui=S.ui,order=seasonOrder();
 if(!ui.plat)ui.plat='all';
 let isAll=ui.season===ALLP&&(hasAllOpt()||!order.length);
 if(!isAll&&!order.includes(ui.season)){ui.season=currentSeason();isAll=ui.season===ALLP}
 const idx=isAll?-1:order.indexOf(ui.season),dated=isAll?false:!!(seasonObj(ui.season)||{}).open;
 const all=order.map(id=>({id,dated:!!(seasonObj(id)||{}).open,s:stats(scopeItems(id,ui))}));
 const prevAll=isAll?[]:all.slice(0,idx).filter(x=>x.dated===dated);
 const items=scopeItems(ui.season,ui);
 V={ui,order,sel:isAll||hasAllOpt()?[ALLP].concat(order):order,idx,dated,all,cur:isAll?stats(items):all[idx].s,prevAll,items,isAll};
 V.plats=platformStats(scopeItems(ui.season,Object.assign({},ui,{plat:'all'})));V.topics=topicStats(items);
 V.signals=buildSignals();V.stages=buildStages();V.recs=buildRecs();V.opps=buildOpps();V.week=buildWeek();V.cover=buildCoverage();
}
function buildSignals(){
 const c=V.cur,base=V.prevAll.length?V.prevAll[V.prevAll.length-1]:null;
 return AKEYS.map(a=>{
  const x=c.A[a],share=c.N?x.neg/c.N:null;
  const cells=V.all.map(o=>({id:o.id,n:o.s.A[a].neg,N:o.s.N}));
  let delta=null,z=null,flag=base?'low':'nobase';
  if(base&&c.N>=15&&base.s.N>=15&&(x.neg+base.s.A[a].neg)>=5){delta=share-base.s.A[a].neg/base.s.N;z=zt(x.neg,c.N,base.s.A[a].neg,base.s.N);flag=Math.abs(z)>=1.96?(delta>0?'worse':'better'):'same'}
  return {a,x,share,cells,delta,z,flag,baseId:base?base.id:null,baseShare:base&&base.s.N?base.s.A[a].neg/base.s.N:null,baseN:base?base.s.N:0,baseNeg:base?base.s.A[a].neg:0};
 }).sort((p,q)=>Math.abs(q.z||0)-Math.abs(p.z||0));
}
function buildStages(){
 const items=V.items,op=items.filter(opinion),N=op.length;
 return STAGES.map(st=>{
  let pos=0,neg=0;const posIds=[],negIds=[];
  if(st.id==='leave'){for(const i of op){if(i.ret){pos++;posIds.push(i.id)}if(i.noret){neg++;negIds.push(i.id)}}}
  else for(const i of op){let p=false,n=false;for(const x of i.aspects){if(!st.asp.includes(x.a))continue;if(x.p==='pos')p=true;if(x.p==='neg')n=true}if(p){pos++;posIds.push(i.id)}if(n){neg++;negIds.push(i.id)}}
  const qs=items.filter(i=>i.intent==='planning'&&i.query==='general'&&TOPIC[i.topic]&&TOPIC[i.topic].stage===st.id);
  const qClips=new Set(qs.map(i=>i.clipId)).size;
  let status,cls;
  if(N<20){status='بيانات غير كافية';cls='mut'}
  else if(st.id==='leave'){status=pos>=5?'رغبة عودة معلنة':'إشارة ضعيفة';cls=pos>=5?'ok':'mut'}
  else if(pos+neg>=12&&neg/(pos+neg)>=.55){status='عائق';cls='bad'}
  else if(qClips>=6&&qs.length/N>=.04){status='حاجة لم تُلبَّ';cls='warn'}
  else if(pos+neg>=12&&pos/(pos+neg)>=.6){status='نقطة قوة';cls='ok'}
  else if(pos+neg<12){status='إشارة ضعيفة';cls='mut'}
  else{status='مختلط';cls=''}
  const pool=(neg>=pos?negIds:posIds).map(id=>P.byId[id]).sort((p,q)=>q.likes-p.likes);
  const fnNeg=i=>vis(i)&&(st.id==='leave'?i.noret:i.aspects.some(x=>st.asp.includes(x.a)&&x.p==='neg'));
  const fnPos=i=>vis(i)&&(st.id==='leave'?i.ret:i.aspects.some(x=>st.asp.includes(x.a)&&x.p==='pos'));
  const fnQ=i=>i.intent==='planning'&&TOPIC[i.topic]&&TOPIC[i.topic].stage===st.id;
  return {st,pos,neg,N,status,cls,qs:qs.length,qClips,top:pool[0]||null,kNeg:evKey(st.name+': آراء سلبية',fnNeg),kPos:evKey(st.name+': آراء إيجابية',fnPos),kQ:evKey(st.name+': أسئلة الزوار',fnQ)};
 });
}
function buildRecs(){
 const c=V.cur,items=V.items,out=[],pv=V.prevAll.length?V.prevAll[V.prevAll.length-1]:null;
 for(const a of AKEYS){
  const x=c.A[a];if(x.neg<5||x.negClips.size<3)continue;
  let area=V.ui.area!=='all'?V.ui.area:null;
  if(!area){const cn={};x.negIds.forEach(id=>{const ar=P.byId[id].area;cn[ar]=(cn[ar]||0)+1});
   const top=Object.entries(cn).filter(e=>e[0]!=='gen').sort((p,q)=>q[1]-p[1])[0];
   if(top&&top[1]/x.negIds.length>=.35){const cl=new Set(x.negIds.filter(id=>P.byId[id].area===top[0]).map(id=>P.byId[id].clipId));if(cl.size>=3)area=top[0]}}
  const focus=area&&V.ui.area==='all';
  const sa=focus?stats(items.filter(i=>i.area===area)):c,y=sa.A[a];
  if(y.neg<3)continue;
  const share=sa.N?y.neg/sa.N:0;
  let delta=null,flag='nobase',prevInfo=null,prevShare=null;
  if(pv){const ps=focus?stats(scopeItems(pv.id,V.ui).filter(i=>i.area===area)):pv.s;prevInfo={id:pv.id,n:ps.A[a].neg,N:ps.N};
   if(sa.N>=15&&ps.N>=15){prevShare=ps.A[a].neg/ps.N;delta=share-prevShare;const z=zt(y.neg,sa.N,ps.A[a].neg,ps.N);flag=Math.abs(z)>=1.96?(delta>0?'worse':'better'):'same'}else flag='low'}
  const clips=y.negClips.size,impact=share*100+Math.max(0,(delta||0)*100);
  const score=.5*Math.min(clips,20)/20+.35*Math.min(impact,40)/40+.15*ASPECTS[a].ease/3;
  const aN=area?areaName(area):'';
  const base=Math.round(share*100),target=Math.max(Math.round(share*100*2/3),3);
  const urgent=flag==='worse'&&share>=.15;
  out.push({key:a+'|'+(area||'all')+'|'+V.ui.season,a,area,season:V.ui.season,share,n:y.neg,N:sa.N,clips,delta,flag,prevInfo,prevShare,score,
   impact:share>=.25?'عالٍ':share>=.12?'متوسط':'منخفض',ease:ASPECTS[a].ease,easeL:['','صعب','متوسط','سهل'][ASPECTS[a].ease],
   prio:urgent?'عاجل':score>=.5?'مهم':'تحسين',title:ASPECTS[a].verb+(aN?' في '+aN:''),
   stage:STG[ASPECTS[a].stage].name,team:ASPECTS[a].team,
   note:pc(share)+' من آراء التجربة المباشرة'+(aN?' في '+aN:'')+' تشتكي من '+ASPECTS[a].label+' ('+y.neg+' من '+sa.N+')، عبر '+mq(clips)+'.',
   action:ASPECTS[a].act(aN?' عند '+aN:''),kpi:{label:'حصة الآراء التي تشتكي من '+ASPECTS[a].label+(aN?' في '+aN:''),base,target},
   due:addDays(nowStr(),14),ev:evKey(ASPECTS[a].verb+(aN?' في '+aN:'')+': آراء سلبية',i=>vis(i)&&(!area||i.area===area)&&i.aspects.some(z=>z.a===a&&z.p==='neg'))});
 }
 return out.sort((p,q)=>q.score-p.score).slice(0,5);
}
function changeText(r){
 if(!r.prevInfo)return 'لا يوجد موسم سابق للمقارنة';
 if(r.flag==='low')return 'عينة المقارنة صغيرة في '+r.prevInfo.id;
 const d=Math.abs(Math.round(r.delta*100));
 return r.flag==='worse'?'ارتفعت '+d+' نقطة عن نفس المرحلة من '+r.prevInfo.id+' (فرق ملحوظ)':r.flag==='better'?'انخفضت '+d+' نقطة عن '+r.prevInfo.id+' (فرق ملحوظ)':'لا فرق ملحوظ عن '+r.prevInfo.id+' ('+pc(r.prevShare)+')';
}
function buildOpps(){
 const items=V.items,op=items.filter(opinion),out=[];
 const dist=a=>new Set(a.map(i=>i.clipId)).size;
 for(const ar of S.settings.areas){
  const oa=op.filter(i=>i.area===ar.id);if(oa.length<8)continue;
  const posI=oa.filter(i=>i.aspects.some(x=>x.p==='pos')&&!i.aspects.some(x=>x.p==='neg')),negI=oa.filter(i=>i.aspects.some(x=>x.p==='neg'));
  const share=posI.length+negI.length?posI.length/(posI.length+negI.length):0,ch=oa.filter(i=>i.chance);
  if(share>=.7&&dist(ch)>=3){
   out.push({id:'gem|'+ar.id,kind:'improve',title:'إبراز '+ar.name+' للزوار',
    why:posI.length+' من '+(posI.length+negI.length)+' آراء إيجابية ('+pc(share)+') في '+ar.name+'، و'+mq(dist(ch))+' ذكرت أن أصحابها اكتشفوها بالصدفة.',
    note:'قلة ذكر التجربة وحدها لا تكفي للحكم على شعبيتها. هنا اجتمعت إشارتان: إشادة متكررة واكتشاف بالصدفة.',
    test:'لوحة توجيه عند أقرب بوابة ومقطع قصير عن '+ar.name+' لمدة أسبوع، ثم قياس نسبة من يذكرون أنهم اكتشفوها بالصدفة.',
    metric:'عدد المصادر المستقلة التي تذكر الاكتشاف بالصدفة لـ'+ar.name,strength:dist(ch),
    ev:evKey('إبراز '+ar.name,i=>vis(i)&&i.area===ar.id&&(i.chance||(i.aspects.some(x=>x.p==='pos')&&!i.aspects.some(x=>x.p==='neg'))))});
  }
  const fp=oa.filter(i=>i.aspects.some(x=>x.a==='food'&&x.p==='pos')),wn=oa.filter(i=>i.aspects.some(x=>x.a==='wayfinding'&&x.p==='neg'));
  const wq=items.filter(i=>i.intent==='planning'&&i.topic==='where'&&i.area===ar.id);
  if(dist(fp)>=3&&dist(wn)+dist(wq)>=3){
   out.push({id:'cross|'+ar.id,kind:'improve',title:'ربط إشادة الأكل بصعوبة الوصول في '+ar.name,
    why:'الأكل في '+ar.name+' حصل على إشادة في '+mq(dist(fp))+'، وتكرر في '+mq(dist(wn)+dist(wq))+' سؤال أو شكوى عن الوصول إليه.',
    note:'إشارتان مختلفتان تشيران إلى فرصة واحدة: الناس يريدون الوصول إلى التجربة ولا يعرفون الطريق.',
    test:'انشروا مسارًا مصوّرًا من أقرب بوابة إلى مطاعم '+ar.name+' بعد التحقق من الموقع، وقارنوا نسبة أسئلة الوصول قبل النشر وبعده.',
    metric:'عدد المصادر المستقلة التي تسأل عن الوصول إلى '+ar.name,strength:dist(fp)+dist(wn)+dist(wq),
    ev:evKey('الأكل والوصول في '+ar.name,i=>i.area===ar.id&&((vis(i)&&i.aspects.some(x=>(x.a==='food'&&x.p==='pos')||(x.a==='wayfinding'&&x.p==='neg')))||(i.intent==='planning'&&i.topic==='where')))});
  }
 }
 for(const t of Object.keys(TOPIC)){
  const qs=items.filter(i=>i.intent==='planning'&&i.query==='general'&&i.topic===t),cl=dist(qs);
  if(cl>=4)out.push({id:'q|'+t,kind:'new',title:TOPIC[t].idea,why:fmt(qs.length)+' سؤالًا من '+mq(cl)+' عن «'+TOPIC[t].label+'».',
   note:'حاجة متكررة يمكن تلبيتها بمحتوى مستمر أو بتجربة جديدة صغيرة.',test:TOPIC[t].test,metric:'عدد أسئلة «'+TOPIC[t].label+'»',strength:cl,
   ev:evKey('أسئلة: '+TOPIC[t].label,i=>i.intent==='planning'&&i.topic===t)});
 }
 return out.sort((p,q)=>(p.kind===q.kind?q.strength-p.strength:p.kind==='improve'?-1:1));
}
function buildWeek(){
 const ui=V.ui,sc=seasonObj(ui.season);if(!sc||!sc.open)return null;
 const its=P.items.filter(i=>i.season===ui.season&&(ui.area==='all'||i.area===ui.area)&&i.day!=null);
 const maxD=its.reduce((m,i)=>Math.max(m,i.day),0),pd=periodDays(ui.period),N=Math.min(isFinite(pd)?pd:maxD,maxD);
 if(N<14)return null;
 const a=stats(its.filter(i=>i.day>N-7&&i.day<=N)),b=stats(its.filter(i=>i.day>N-14&&i.day<=N-7));
 const rows=AKEYS.map(k=>({a:k,n1:a.A[k].neg,N1:a.N,n0:b.A[k].neg,N0:b.N,d:(a.N&&b.N)?a.A[k].neg/a.N-b.A[k].neg/b.N:null,z:zt(a.A[k].neg,a.N,b.A[k].neg,b.N)}))
  .filter(r=>r.d!=null&&a.N>=12&&b.N>=12).sort((p,q)=>Math.abs(q.z)-Math.abs(p.z));
 return {N,a,b,rows};
}
function buildCoverage(){
 const sid=V.ui.season,rank=id=>Math.max(0,V.order.indexOf(id)),its=scopeItems(sid,Object.assign({},V.ui,{area:'all'}));
 const list=S.settings.areas.filter(ar=>!V.dated||rank(ar.first)<=rank(sid)).concat([{id:'gen',name:'عام / غير محدد',first:''}]);
 return list.map(ar=>{const s=stats(its.filter(i=>i.area===ar.id));
  return {ar,posts:s.posts,comments:s.comments,N:s.N,clips:s.clips,st:s.N===0?'لا بيانات':s.N<10?'غير كافية':s.N<25?'محدودة':'كافية',isNew:ar.first===sid}});
}
