
/* ================= simple version: renderers ================= */
const rAr=n=>n===0?'لا آراء':n===1?'رأي واحد':n===2?'رأيان':n>=3&&n<=10?n+' آراء':fmt(n)+' رأيًا';
const chip=(t,c)=>'<span class="chip'+(c?' '+c:'')+'">'+esc(t)+'</span>';
const evBtn=(k,l)=>'<button class="btn sm" type="button" data-act="ev" data-k="'+k+'">'+(l||'أمثلة من الزوار')+'</button>';
const emptyBox=t=>'<div class="empty">'+t+'</div>';
const isEn=t=>(t.match(/[A-Za-z]/g)||[]).length>(t.match(/[؀-ۿ]/g)||[]).length;
const hhmm=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const txC=(n,N)=>N?pc(n/N)+' ('+fmt(n)+' من '+fmt(N)+')':'—';
let D=null,PEND=[],UP={season:'auto',text:'',newId:'',newOpen:'',filter:null,platform:'auto',newEv:false};

/* live (event still running) or ended (planning next season) */
function mode(){
 const st=S.ui.status;if(st==='live'||st==='ended')return st;
 if(demoOn())return 'live'; /* بوليفارد وورلد شغّال الآن: موسم الرياض بدأ 21 أكتوبر 2026 */
 const sc=seasonObj(S.ui.season);
 return (sc&&sc.open&&S.ui.season===currentSeason())?'live':'ended';
}
const perLabel=()=>{
 const sc=seasonObj(V.ui.season);if(sc&&!sc.open)return 'كل الأيام (بلا تواريخ نشر دقيقة)';
 const pd=periodDays(V.ui.period);return isFinite(pd)?'أول '+pd+' يومًا من كل موسم':'كل الأيام المتاحة';
};
const STAT_AR={'بيانات غير كافية':'بيانات قليلة','إشارة ضعيفة':'بيانات قليلة','حاجة لم تُلبَّ':'أسئلة بلا إجابة','رغبة عودة معلنة':'يرغبون بالعودة','عائق':'مشكلة','نقطة قوة':'نقطة قوة','مختلط':'آراء مختلطة'};

/* ---------- what the practical plan says, per topic (suggestions to verify on the ground) ---------- */
const PLAN={
 wait:{now:'اعرضوا وقت الانتظار المتوقع عند مدخل أكثر التجارب طلبًا، وأضيفوا موظفًا ينظّم الطابور في ساعات الذروة.',
  next:'افتحوا حجز مواعيد دخول للتجارب الأكثر طلبًا قبل الموسم، وصمّموا مسار الطابور بحيث لا يعطّل الممر.',
  verify:'قيسوا وقت الانتظار الفعلي (بالدقائق) في أكثر ثلاث تجارب ازدحامًا وقت الذروة، وقارنوه بما يقوله الزوار.'},
 crowd:{now:'أعلنوا الأوقات الأهدأ في الحساب الرسمي، وحدّدوا اتجاه سير واضحًا في الممرات الضيقة.',
  next:'راجعوا مخطط الممرات والسعة القصوى قبل الموسم، وجهّزوا ممرات بديلة للمناطق الأكثر ازدحامًا.',
  verify:'عدّوا الزوار عند أضيق ممر وقت الذروة، وتأكدوا أن الذروة تتكرر في الأيام نفسها.'},
 entry:{now:'ضعوا لوحات إرشاد عند البوابات والمواقف، وانشروا أقرب بوابة لكل منطقة.',
  next:'انشروا خطة المواقف والبوابات قبل الافتتاح بأسبوعين على الأقل.',
  verify:'جرّبوا الوصول بأنفسكم من كل موقف إلى البوابة، وسجّلوا الوقت والمشاكل.'},
 booking:{now:'أضيفوا أسئلة شائعة عن الحجز ورسالة واضحة عند تعذّر الدفع.',
  next:'بسّطوا خطوات الحجز وجرّبوها مع زوار حقيقيين قبل الافتتاح.',
  verify:'راجعوا سجلات أخطاء الحجز والدفع، فالمنشورات لا تغطي كل الأعطال.'},
 wayfinding:{now:'انشروا مسارًا مصوّرًا من أقرب بوابة لكل منطقة، وأضيفوا لوحات توجيه عند التقاطعات.',
  next:'جهّزوا خريطة موحّدة تشمل المناطق الجديدة وانشروها قبل الافتتاح.',
  verify:'مرّوا بالمسار كزائر جديد وسجّلوا الأماكن التي تتوقفون عندها.'},
 price:{now:'اعرضوا الأسعار قبل الدخول وفي الإعلانات حتى لا يفاجأ الزائر. تغيير الأسعار نفسها يحتاج الشركاء.',
  next:'اتفقوا مع الشركاء على باقات أوضح وخيار اقتصادي قبل الموسم.',
  verify:'قارنوا أسعاركم بفعاليات مشابهة، وحدّدوا ما تملكون التحكم فيه وما يقرره الشركاء.'},
 food:{now:'أبرزوا الأطباق الأكثر مدحًا، وتابعوا مع الشركاء مشاكل الجودة التي تكررت.',
  next:'راجعوا تنوع المطاعم وجودتها مع الشركاء قبل الموسم.',
  verify:'زوروا المطاعم المشتكى منها وقت الذروة قبل أي قرار مع الشركاء.'},
 shows:{now:'حدّثوا جدول العروض وأعلنوه بوضوح، وراجعوا العروض التي تكررت الشكوى منها.',
  next:'نوّعوا العروض وأوقاتها بحسب ما أعجب الزوار فعلًا.',
  verify:'راجعوا الحضور الفعلي لكل عرض قبل تعديل الجدول.'},
 vendors:{now:'ضعوا إرشادات سلوك للبائعين (عدم الإلحاح) وتابعوا ميدانيًا كل أسبوع.',
  next:'أضيفوا بند السلوك إلى عقود البائعين للموسم القادم.',
  verify:'تأكدوا من الشكاوى بزيارة ميدانية قبل أي إجراء مع البائعين.'},
 clean:{now:'زيدوا جولات النظافة وقت الذروة وأضيفوا نقاط خدمة.',
  next:'أعيدوا توزيع المرافق ونقاط النظافة بحسب خريطة الازدحام.',
  verify:'نفّذوا جولة تفتيش وقت الذروة وسجّلوا الملاحظات.'}
};

/* ---------- derived lists ---------- */
function sigOf(a){return V.signals.find(s=>s.a===a)}
function issues(){const c=V.cur;return AKEYS.map(a=>({a,n:c.A[a].neg,clips:c.A[a].negClips.size,share:c.N?c.A[a].neg/c.N:0})).filter(o=>o.n>=3&&o.clips>=2).sort((p,q)=>q.n-p.n).slice(0,5)}
function goods(){const c=V.cur;return AKEYS.map(a=>({a,n:c.A[a].pos,clips:c.A[a].posClips.size,share:c.N?c.A[a].pos/c.N:0})).filter(o=>o.n>=5&&o.clips>=3).sort((p,q)=>q.n-p.n).slice(0,3)}
function questions(){const m={};V.items.filter(i=>i.intent==='planning'&&i.query==='general'&&TOPIC[i.topic]).forEach(i=>{(m[i.topic]=m[i.topic]||new Set()).add(i.clipId)});return Object.entries(m).map(e=>({t:e[0],clips:e[1].size})).filter(o=>o.clips>=3).sort((p,q)=>q.clips-p.clips).slice(0,3)}
function areaTable(){
 const its=scopeItems(V.ui.season,Object.assign({},V.ui,{area:'all'}));
 return S.settings.areas.concat([{id:'gen',name:'عام / غير محدد'}]).map(ar=>{
  const s=stats(its.filter(i=>i.area===ar.id));
  const top=AKEYS.map(a=>({a,n:s.A[a].neg})).sort((p,q)=>q.n-p.n)[0];
  return {ar,N:s.N,share:s.N?s.negAny/s.N:0,top:top&&top.n>=3?top.a:null};
 }).filter(r=>r.N>=10&&r.ar.id!=='gen').sort((p,q)=>q.share-p.share).slice(0,8);
}
function cmpPhrase(s){
 if(!s||s.flag==='nobase')return 'لا يوجد موسم سابق للمقارنة.';
 if(s.flag==='low')return 'عينة '+s.baseId+' صغيرة، فلا نقارن بثقة.';
 const ph=V.ui.period==='all'?'في '+s.baseId:'في نفس المرحلة من '+s.baseId,b=' ('+pc(s.baseShare)+')';
 return s.flag==='worse'?'وهي أعلى مما كانت '+ph+b+'.':s.flag==='better'?'وهي أقل مما كانت '+ph+b+'.':'ولا فرق ملحوظ عمّا كانت عليه '+ph+b+'.';
}
function chgChip(s){
 if(!s||s.flag==='nobase')return '';
 if(s.flag==='low')return chip('عينة المقارنة صغيرة','warn');
 const d=Math.abs(Math.round(s.delta*100));
 return s.flag==='worse'?chip('أعلى من '+s.baseId+' بـ '+LI+d+PI+' نقطة','bad'):s.flag==='better'?chip('أقل من '+s.baseId+' بـ '+LI+d+PI+' نقطة','ok'):chip('مثل '+s.baseId+' تقريبًا','mut');
}
const srcPh=n=>n===1?'مصدر واحد':n===2?'مصدرين مختلفين':n>=3&&n<=10?n+' مصادر مختلفة':fmt(n)+' مصدرًا مختلفًا';
function chgTxt(r){
 if(!r.prevInfo)return 'لا يوجد موسم سابق للمقارنة.';
 if(r.flag==='low')return 'عينة '+r.prevInfo.id+' صغيرة، فلا نقارن بثقة.';
 const ph=V.ui.period==='all'?'في '+r.prevInfo.id:'في نفس المرحلة من '+r.prevInfo.id,d=Math.abs(Math.round(r.delta*100));
 return r.flag==='worse'?'وهي أعلى بـ '+LI+d+PI+' نقطة مما كانت '+ph+'.':r.flag==='better'?'وهي أقل بـ '+LI+d+PI+' نقطة مما كانت '+ph+'.':'ولا فرق ملحوظ عمّا كانت عليه '+ph+' ('+pc(r.prevShare)+').';
}
function happenedTxt(r){
 return '«'+ASPECTS[r.a].label+'»'+(r.area?' في '+areaName(r.area):'')+': '+pc(r.share)+' من آراء الزوار اشتكت منها ('+r.n+' من '+r.N+')، وتكررت في '+srcPh(r.clips)+'. '+chgTxt(r);
}
function kpiTxt(r,m){
 return 'نسبة من يشتكون من «'+ASPECTS[r.a].label+'» تنزل من '+pn(r.kpi.base)+' إلى أقل من '+pn(r.kpi.target)+'. '+(m==='live'?'ارفعوا ملفًا جديدًا بعد '+(r.prio==='عاجل'?'7':'14')+' أيام من التنفيذ لنقيس الفرق.':'قارنوا بنفس المرحلة من الموسم القادم.');
}
function conf(r){
 if(r.clips>=8&&r.N>=60)return ['قوية','ok'];
 if(r.clips>=5&&r.N>=30)return ['متوسطة','warn'];
 return ['مبدئية','bad'];
}
function whenTxt(r,m){
 if(m==='live')return r.prio==='عاجل'?'خلال 7 أيام':'خلال 14 يومًا';
 return r.ease>=3?'قبل الافتتاح بشهر على الأقل':r.ease===2?'ابدؤوا قبل الافتتاح بشهرين':'ابدؤوا التفاوض مبكرًا، فهذا يحتاج الشركاء';
}
function prioTxt(r,m){return m==='live'?r.prio:(r.prio==='عاجل'?'أولوية عالية':r.prio==='مهم'?'أولوية متوسطة':'تحسين')}
function planOf(r,m){return (PLAN[r.a]||{})[m==='live'?'now':'next']||r.action}
function ranked(m){
 const recs=V.recs.slice();
 if(m==='live')recs.sort((p,q)=>((q.prio==='عاجل')-(p.prio==='عاجل'))||(q.ease-p.ease)||(q.score-p.score));
 return recs;
}
function followUp(r){
 if(!r.actionDate)return null;const ad=dnum(r.actionDate);
 const its=P.items.filter(i=>i.season===r.season&&(!r.area||i.area===r.area)&&opinion(i)&&i.publishedAt);
 const f=arr=>({n:arr.filter(i=>i.aspects.some(x=>x.a===r.a&&x.p==='neg')).length,N:arr.length});
 return {b:f(its.filter(i=>{const d=dnum(i.publishedAt);return d<=ad&&d>ad-14})),a:f(its.filter(i=>dnum(i.publishedAt)>ad))};
}

/* ---------- organizer improvements: how to make the next reading better ---------- */
function orgTips(m){
 const c=V.cur,tips=[];
 if(c.N<30)tips.push({t:'زيدوا حجم العينة',d:'عندنا '+rAr(c.N)+' فقط في هذا النطاق. ارفعوا تعليقات أكثر (أسبوع كامل على الأقل) قبل أي قرار كبير.'});
 const und=V.items.filter(i=>!i.publishedAt).length;
 if(V.items.length&&und/V.items.length>.2)tips.push({t:'أضيفوا تاريخ النشر في الملفات',d:'بدونه لا نقدر نقارن نفس المرحلة من المواسم ولا نقيس أثر التنفيذ. أضيفوا عمودًا اسمه published_at.'});
 const thin=V.cover.filter(r=>r.ar.id!=='gen'&&(r.st==='لا بيانات'||r.st==='غير كافية')).map(r=>r.ar.name);
 if(thin.length&&V.dated)tips.push({t:'مناطق بآراء قليلة',d:thin.slice(0,6).join('، ')+(thin.length>6?'…':'')+': لا نقدر نحكم عليها بعد. اجمعوا آراء أكثر أو اسألوا الزوار عند الخروج منها.'});
 if(c.all&&c.uncertain/c.all>.1)tips.push({t:'آراء غير محسومة',d:fmt(c.uncertain)+' مادة لم نستطع تحديد مقصدها. افتحوا الأمثلة وراجعوها يدويًا قبل الاعتماد على النسب.'});
 const top=issues()[0];
 tips.push({t:'قارنوا الآراء بأرقام التشغيل',d:top?'أهم نقطة الآن «'+ASPECTS[top.a].label+'». '+(PLAN[top.a]||{}).verify:'سجّلوا أرقام التشغيل الفعلية (الانتظار، الدخول، الازدحام) لنتأكد أن الآراء تعكس الواقع.',ok:true});
 tips.push({t:'استبيان قصير عند الخروج',d:'ثلاثة أسئلة برمز QR: كيف كان الانتظار؟ كيف كان الوصول؟ هل ترجع؟ هذا يعطيكم رأي من لا ينشر على السوشال.',ok:true});
 tips.push(m==='live'
  ?{t:'ارفعوا ملفًا جديدًا كل أسبوع',d:'بعد تنفيذ أي تحسين ارفعوا آراء جديدة، ونعرض لكم الفرق قبل التنفيذ وبعده.',ok:true}
  :{t:'احفظوا بيانات هذا الموسم كاملة',d:'ملفات هذا الموسم هي مرجع المقارنة في الموسم القادم، فاحفظوها مع تواريخ النشر.',ok:true});
 return tips;
}

/* ---------- status, tabs, filters ---------- */
function renderStatus(){
 const m=mode();
 $('status').innerHTML='<div class="evpick"><select id="evTop" aria-label="الفعالية الحالية">'+S.events.map(e=>'<option value="'+esc(e.id)+'"'+(e.id===S.eventId?' selected':'')+'>'+esc(e.name)+'</option>').join('')+'<option value="__new">+ فعالية جديدة…</option></select></div>'+
  (demoOn()?'<span class="demo-flag">بيانات ديمو</span>':'')+
  '<span>المصادر: <b>'+srcTxt()+'</b></span><span>'+chip(m==='live'?'قائمة الحين':'انتهت',m==='live'?'ok':'mut')+'</span>'+
  (S.lastOk&&P.items.length?'<span>آخر تحليل: <b>'+dAr(S.lastOk.slice(0,10))+'</b></span>':'');
 const bs=$('brandSub');if(bs)bs.textContent='لأي فعالية · فريق beyond limits';
}
const VIEWS=['overview','problem','voices','recs','happened','data'];
function renderTabs(){
 if(!VIEWS.includes(S.ui.tab))S.ui.tab='overview';
 document.querySelectorAll('#tabs .tab').forEach(b=>{const on=b.dataset.tab===S.ui.tab;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 VIEWS.forEach(t=>$('p-'+t).classList.toggle('on',t===S.ui.tab));
 $('filters').style.display=S.ui.tab==='data'||!P.items.length?'none':'';
}
function renderFilters(){
 if(!$('fSeason'))$('filters').innerHTML='<label class="fld">الموسم<select id="fSeason"></select></label><label class="fld">الفترة<select id="fPeriod"></select></label><label class="fld">المصدر<select id="fPlat"></select></label><label class="fld" id="fAreaL">المنطقة<select id="fArea"></select></label><span class="small" id="fNote"></span>';
 const o=V.sel,ui=V.ui,cd=curDays();
 $('fSeason').innerHTML=o.map(id=>'<option value="'+esc(id)+'"'+(id===ui.season?' selected':'')+'>'+esc(id)+((id===ALLP||(seasonObj(id)||{}).open)?'':' (بلا تواريخ)')+'</option>').join('');
 const per=[['eq',isFinite(cd)?'أول '+cd+' يومًا من كل موسم':'المرحلة الحالية'],['d7','أول 7 أيام'],['d14','أول 14 يومًا'],['d28','أول 28 يومًا'],['all','كل الأيام المتاحة']];
 $('fPeriod').innerHTML=per.map(p=>'<option value="'+p[0]+'"'+(p[0]===ui.period?' selected':'')+'>'+p[1]+'</option>').join('');
 $('fArea').innerHTML='<option value="all">كل المناطق</option>'+S.settings.areas.map(a=>'<option value="'+a.id+'"'+(a.id===ui.area?' selected':'')+'>'+esc(a.name)+'</option>').join('')+'<option value="gen"'+(ui.area==='gen'?' selected':'')+'>عام / غير محدد</option>';
 {const have=new Set(P.items.map(i=>i.platform));$('fPlat').innerHTML='<option value="all">كل المصادر</option>'+PLATS.filter(k=>have.has(k)).map(k=>'<option value="'+k+'"'+(k===ui.plat?' selected':'')+'>'+PLAT[k]+'</option>').join('');$('fAreaL').style.display=S.settings.areas.length?'':'none'}
 $('fNote').textContent=ui.period==='all'&&o.filter(id=>(seasonObj(id)||{}).open).length>1?'«كل الأيام» قد تقارن مواسم بأطوال مختلفة، فالمقارنة تقريبية.':'';
}
const nextBar=(prev,next)=>'<div class="nextbar">'+(prev?'<button class="btn" type="button" data-act="tab" data-v="'+prev[0]+'">→ '+prev[1]+'</button>':'<span></span>')+(next?'<button class="btn pri" type="button" data-act="'+(next[0]==='pdf'?'pdf':'tab')+'" data-v="'+next[0]+'">'+next[1]+(next[0]==='pdf'?'':' ←')+'</button>':'')+'</div>';

/* ---------- stars + social (extra) ---------- */
function starCard(){
 const cur=starStats(V.items);
 if(!cur.n)return '';
 const per=V.all.filter(o=>o.dated===V.dated||o.id===V.ui.season).map(o=>({id:o.id,s:starStats(scopeItems(o.id,V.ui))})).filter(x=>x.s.n);
 const mx=Math.max(1,...cur.dist.slice(1));
 const bars=[5,4,3,2,1].map(k=>'<div class="rw"><div class="l"><b>'+k+(k===1?' نجمة':' نجوم')+'</b></div><div class="bar'+(k>=4?' g':'')+'"><i style="width:'+Math.max(cur.dist[k]?4:0,Math.round(cur.dist[k]/mx*100))+'%'+(k===3?';background:var(--mut)':'')+'"></i></div><div class="v">'+pc(cur.dist[k]/cur.n)+'<small>'+cur.dist[k]+' من '+cur.n+'</small></div></div>').join('');
 const rows=per.length>1?'<div class="tw"><table><thead><tr><th>الفترة</th><th>تقييمات</th><th>المتوسط</th><th>نجمة أو نجمتان</th><th>أربع أو خمس</th></tr></thead><tbody>'+per.map(x=>'<tr'+(x.id===V.ui.season?' class="cur"':'')+'><td><b>'+esc(x.id)+'</b></td><td>'+fmt(x.s.n)+'</td><td>'+avgTxt(x.s.avg)+'</td><td>'+cell(x.s.low,x.s.n)+'</td><td>'+cell(x.s.high,x.s.n)+'</td></tr>').join('')+'</tbody></table></div>':'';
 const smallN=per.length>1&&per.some(x=>x.s.n<30);
 return '<div class="card stack" style="gap:10px"><h3>التقييم بالنجوم</h3><div class="row"><span style="font-size:34px;font-weight:700">'+avgTxt(cur.avg)+'</span><span class="small">من 5 · '+fmt(cur.n)+' تقييمًا</span>'+chip(pc(cur.low/cur.n)+' بنجمة أو نجمتين',cur.low/cur.n>=.3?'bad':'mut')+chip(pc(cur.high/cur.n)+' بأربع أو خمس','ok')+'</div>'+bars+rows+
  '<div class="small">المتوسط محسوب من التقييمات الموجودة في الملفات فقط، وقد لا يطابق تقييم المكان العام في قوقل ماب.'+(demoOn()?' بيانات الفريق عيّنة منتقاة وليست عشوائية.':'')+(smallN?' أعداد بعض الفترات صغيرة، فلا تعتبروا الفرق بين متوسطاتها اتجاهًا مؤكدًا.':'')+'</div></div>';
}
function platformCard(){
 const pl=V.plats;if(!pl.length)return '';
 const pct=(x,n)=>n?pc(x/n):'—';
 const rows=pl.map(x=>'<tr><td><b>'+PLAT[x.p]+'</b><small>'+PLAT_NOTE[x.p]+'</small></td><td>'+fmt(x.n)+(x.official?'<small>'+fmt(x.official)+' رسمي أو إعلامي</small>':'')+'</td>'+
  '<td>'+(x.sent.n?'<div class="sb" title="إيجابي / محايد / سلبي"><i class="p" style="width:'+Math.round(x.sent.pos/x.sent.n*100)+'%"></i><i class="u" style="width:'+Math.round(x.sent.neu/x.sent.n*100)+'%"></i><i class="g" style="width:'+Math.round(x.sent.neg/x.sent.n*100)+'%"></i></div><small>'+pct(x.sent.pos,x.sent.n)+' · '+pct(x.sent.neu,x.sent.n)+' · '+pct(x.sent.neg,x.sent.n)+'</small>':'<span class="small">لا مواد محسومة</span>')+'</td>'+
  '<td>'+(x.negTop?esc(ASPECTS[x.negTop.a].label)+'<small>'+x.negTop.n+' مرة</small>':'—')+'</td><td>'+(x.posTop?esc(ASPECTS[x.posTop.a].label)+'<small>'+x.posTop.n+' مرة</small>':'—')+'</td>'+
  '<td><button class="btn sm" type="button" data-act="platEv" data-p="'+x.p+'">اعرضوا المواد</button></td></tr>').join('');
 return '<div class="card stack" style="gap:8px"><h3>مقارنة بين المنصات</h3>'+platformChart(pl)+'<div class="tw"><table><thead><tr><th>المنصة</th><th>المواد</th><th>إيجابي · محايد · سلبي</th><th>أكثر شكوى</th><th>أكثر إشادة</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<div class="small">'+esc(platRead())+'</div><div class="small">الشعور العام: في قوقل ماب من نجوم التقييم حين تتوفر (4–5 إيجابي، 3 محايد، 1–2 سلبي)، وإلا ومع بقية المنصات بقواعد النص (كلمات المدح والذم والجوانب المذكورة). المواد الرسمية والأسئلة لا تدخل.</div></div>';
}
function topicsCard(){
 const t=V.topics.slice(0,8);if(!t.length)return '';
 const mx=Math.max(1,...t.map(x=>x.n));
 return '<div class="card"><h3>المواضيع الأكثر ذكرًا</h3><p class="small" style="margin-bottom:6px">كم مرة ذُكر كل موضوع في كل المصادر، ومنها كم مرة بإيجابية أو سلبية.</p>'+t.map(x=>
  '<div class="rw"><div class="l"><b>'+esc(ASPECTS[x.a].label)+'</b><small>'+esc(STG[ASPECTS[x.a].stage].name)+'</small></div><div class="bar"><i style="width:'+Math.max(4,Math.round(x.n/mx*100))+'%"></i></div><div class="v">'+x.n+' ذكر<small>إيجابي '+x.pos+' · سلبي '+x.neg+'</small></div>'+
  '<div class="x"><span class="small">'+[...x.plats].map(k=>PLAT[k]).join('، ')+'</span>'+evBtn(evKey(ASPECTS[x.a].label+': كل الذكر',i=>i.intent!=='official'&&i.aspects.some(z=>z.a===x.a)),'أمثلة')+'</div></div>').join('')+'</div>';
}
function emptyEvent(){
 return '<div class="stack"><div class="card stack"><h3>لا بيانات لفعالية «'+esc(S.settings.event)+'» بعد</h3><p class="small">ارفعوا بيانات هذه الفعالية من تيك توك أو X أو قوقل ماب (ملف CSV أو JSON أو TXT)، وبعدها يظهر التحليل والتوصيات. لا نضيف أي بيانات من عندنا.</p><div class="row"><button class="btn pri" type="button" data-act="tab" data-v="data">اذهبوا إلى البيانات</button></div></div></div>';
}

/* ---------- step 1: data ---------- */
function renderData(){
 const m=mode(),blvd=S.eventId==='blvd',cnt=srcCounts();
 const segBtn=(v,t)=>'<button type="button" data-act="status" data-v="'+v+'" class="'+(m===v?'on':'')+'" aria-pressed="'+(m===v)+'">'+t+'</button>';
 const seasons='<option value="auto"'+(UP.season==='auto'?' selected':'')+'>حسب تاريخ النشر في الملف (تلقائي)</option>'+
  allSeasonIds().map(id=>'<option value="'+esc(id)+'"'+(UP.season===id?' selected':'')+'>'+esc(id)+((seasonObj(id)||{}).open?'':' (بلا تواريخ)')+'</option>').join('')+
  '<option value="__new"'+(UP.season==='__new'?' selected':'')+'>موسم جديد…</option>';
 const pend=PEND.length?'<div class="stack" style="gap:6px">'+PEND.map((f,i)=>'<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:6px"><span><b>'+esc(f.name)+'</b> · '+fmt(f.rows.length)+' صفًا'+(f.empty?' <span class="small">(تجاهلنا '+f.empty+' فارغًا)</span>':'')+'</span><button class="btn sm" type="button" data-act="rmPend" data-i="'+i+'">إزالة</button></div>').join('')+'</div>':'';
 const all=PEND.flatMap(f=>f.rows),rate=all.length?all.filter(r=>nameHit(r.text)).length/all.length:1;
 const filterOn=UP.filter==null?rate>=.6:UP.filter;
 const srcs=S.sources.length?S.sources.map(s=>'<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:6px"><span><b>'+esc(s.name)+'</b> · '+fmt(s.n)+' صفًا · '+esc(s.season)+(s.plat?' '+chip(s.plat.split(',').map(k=>PLAT[k]||k).join('، '),'mut'):'')+' <span class="small">'+dAr(s.at.slice(0,10))+'</span></span><button class="btn sm" type="button" data-act="rmSrc" data-id="'+esc(s.id)+'">حذف</button></div>').join(''):'<div class="small">لا ملفات مرفوعة بعد.</div>';
 const d=S.settings.dict;
 $('p-data').innerHTML='<div class="stack">'+searchCard({name:S.settings.event})+
  '<div class="card stack"><h3>الفعالية</h3>'+
   '<div class="row"><select id="evSel" aria-label="اختيار الفعالية">'+S.events.map(e=>'<option value="'+esc(e.id)+'"'+(e.id===S.eventId?' selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select>'+
   '<button class="btn sm" type="button" data-act="showNewEv">+ فعالية جديدة</button></div>'+
   (UP.newEv?'<div class="stack" style="gap:8px;border-top:1px solid var(--line);padding-top:10px"><label class="fld">اسم الفعالية<input type="text" id="evName" placeholder="مثال: ونتر وندرلاند"></label>'+
    '<label class="fld">كلمات أو وسوم تدل عليها (اختياري، افصلوا بفاصلة)<textarea id="evKw" placeholder="مثال: winter wonderland, #وندرلاند"></textarea></label>'+
    '<div class="row"><button class="btn pri" type="button" data-act="newEv">إضافة الفعالية</button><button class="btn" type="button" data-act="cancelNewEv">إلغاء</button></div></div>':'')+
   '<p class="small">الوكيل غير مربوط بفعالية بعينها: اختاروا فعالية أو أضيفوا واحدة جديدة، فيحلل بياناتها بنفس الطريقة. بوليفارد وورلد هي التجربة الأولى.</p>'+
   '<div class="seg" role="group" aria-label="حالة الفعالية">'+segBtn('live','ما زالت قائمة')+segBtn('ended','انتهت')+'</div>'+
   '<p class="small">'+(m==='live'?'سنعرض «تحسينات تقدرون تسوونها الحين»، وبعد التنفيذ ترفعون ملفًا جديدًا ونقيس الفرق.':'سنعرض «توصيات للموسم القادم» مبنية على ما حصل فعلًا في الموسم.')+' '+(S.ui.status==='live'||S.ui.status==='ended'?'الحالة محددة يدويًا.':demoOn()?'بوليفارد وورلد شغّال الآن (موسم الرياض بدأ 21 أكتوبر 2026)، فالحالة الافتراضية «ما زالت قائمة». غيّروها يدويًا إذا تغيّر الوضع.':'لم تُحدَّد الحالة، فتُحسب من الموسم المختار.')+'</p></div>'+
  '<div class="card stack"><h3>مصادر البيانات المتاحة الآن</h3>'+
   ['gmaps','tiktok','x'].map(k=>'<div class="src"><span><b>'+PLAT[k]+'</b><span class="small"> · '+PLAT_NOTE[k]+'</span></span><span><span class="n">'+fmt(cnt[k]||0)+'</span> '+chip('بيانات مجمّعة','mut')+'</span></div>').join('')+
   '<div class="small">كلها بيانات جُمعت مسبقًا وتدخل برفع ملف. لا يوجد ربط مباشر بأي منصة في هذه النسخة.</div>'+
   (blvd?'<div class="note'+(S.builtin?'':' warn')+'">'+(S.builtin?'مضمّنة بيانات الفريق المجمّعة لبوليفارد وورلد ('+fmt(sampleRows().length)+' مادة: تقييمات قوقل ماب نسخها الفريق بلا أسماء، ومنشورات تيك توك وX جُمعت من بحث عام يوم 20 نوفمبر 2026 وهي عناوين فقط وليست تعليقات). عيّنة منتقاة وليست عشوائية.':'بيانات الفريق المجمّعة موقوفة. التحليل الآن على ما ترفعونه فقط.')+'</div>'+
    '<div class="row"><button class="btn sm'+(S.builtin?'':' on')+'" type="button" data-act="toggleBuiltin">'+(S.builtin?'إيقاف بيانات الفريق المجمّعة':'تشغيل بيانات الفريق المجمّعة')+'</button></div>':'')+'</div>'+
  '<div class="card stack"><h3>ارفعوا بيانات مجمّعة لهذه الفعالية</h3>'+
   '<label class="drop" id="drop" tabindex="-1"><input type="file" id="fFile" multiple accept=".csv,.json,.txt,text/csv,application/json,text/plain"><b>اضغطوا لاختيار الملفات</b><span class="small">أو اسحبوها هنا · CSV أو JSON أو TXT · تقدرون ترفعون أكثر من ملف</span></label>'+
   '<div class="small">العمود المطلوب في CSV هو <b>text</b> فقط. الأعمدة الاختيارية: <b>platform</b> (tiktok أو x أو gmaps)، <b>rating</b> (نجوم من 1 إلى 5)، season (اسم الفترة أو الموسم)، published_at، area، url. في TXT كل سطر رأي.</div>'+
   '<label class="fld">المنصة<select id="upPlat"><option value="auto"'+(UP.platform==='auto'?' selected':'')+'>حسب عمود «platform» في الملف (أو قوقل ماب إذا فيه نجوم)</option>'+['tiktok','x','gmaps'].map(k=>'<option value="'+k+'"'+(UP.platform===k?' selected':'')+'>'+PLAT[k]+'</option>').join('')+'</select></label>'+
   '<label class="fld">هذه الملفات لأي موسم؟<select id="upSeason">'+seasons+'</select></label>'+
   (UP.season==='__new'?'<div class="row"><label class="fld">اسم الموسم<input type="text" id="upNewId" value="'+esc(UP.newId)+'" placeholder="2027/28"></label><label class="fld">تاريخ الافتتاح (اختياري)<input type="date" id="upNewOpen" value="'+esc(UP.newOpen)+'"></label></div>':'')+
   '<label class="fld">أو الصقوا تعليقات هنا (سطر لكل رأي)<textarea id="upText" placeholder="مثال: الطابور كان طويل جدًا عند الألعاب">'+esc(UP.text)+'</textarea></label>'+
   (pend?'<div>'+pend+'</div>':'')+
   '<label class="chk"><input type="checkbox" id="upFilter"'+(filterOn?' checked':'')+'> اقبلوا فقط الآراء التي تذكر اسم الفعالية <span class="small">(أوقفوه إذا كان الملف أصلًا تقييمات للمكان)</span></label>'+
   '<div class="row"><button class="btn pri" type="button" id="btnAnalyze" data-act="analyze">حلّلوا الآراء</button><span class="small" id="upInfo">رفع الملف نفسه مرتين لا يضاعف الأعداد.</span></div></div>'+
  '<div class="card stack"><h3>الملفات التي حلّلناها</h3>'+srcs+
   (S.sources.length?'<div class="row"><button class="btn sm" type="button" data-act="clearImport">مسح كل الملفات</button></div>':'')+'</div>'+
  '<div class="card soon stack" style="gap:2px"><h3>قريبًا <span class="small">· غير مفعّل في هذه النسخة</span></h3>'+
   FUTURE.map(f=>'<div class="it"><span><b>'+esc(f.label)+'</b><div class="small">'+esc(f.desc)+'</div></span><span class="pillsoon">قريبًا</span></div>').join('')+'</div>'+
  '<details class="card"><summary>خيارات متقدمة: أسماء الفعالية والمواسم والمناطق</summary><div class="grid g2" style="margin-top:10px">'+
   '<label class="fld">أسماء الفعالية (سطر لكل اسم)<textarea id="sNames">'+esc(d.names.join('\n'))+'</textarea></label>'+
   '<label class="fld">الهاشتاقات<textarea id="sTags">'+esc(d.hashtags.join('\n'))+'</textarea></label>'+
   '<label class="fld">كلمات تستبعد فعاليات أخرى<textarea id="sExcl">'+esc(d.excl.join('\n'))+'</textarea></label>'+
   '<label class="fld">المواسم: الاسم|تاريخ الافتتاح YYYY-MM-DD<textarea id="sSeasons">'+esc(S.settings.seasons.filter(s=>s.open).map(s=>s.id+'|'+s.open).join('\n'))+'</textarea></label>'+
   '<label class="fld">المناطق: id|الاسم|English|أول موسم<textarea id="sAreas">'+esc(S.settings.areas.map(a=>[a.id,a.name,a.en,a.first].join('|')).join('\n'))+'</textarea></label></div>'+
   '<div class="row" style="margin-top:10px"><button class="btn pri" type="button" data-act="saveSettings">حفظ</button><button class="btn" type="button" data-act="resetSettings">الإعدادات الافتراضية</button><button class="btn" type="button" data-act="resetAll">إعادة ضبط كل شيء</button></div>'+
   '<div class="small" style="margin-top:8px">قائمة المناطق والمواسم جزئية: مبنية على مصادر عامة (Arab News وGulf News وWhat’s On Saudi Arabia) وقابلة للتعديل هنا.</div>'+
   '<h4 style="margin:12px 0 6px">سجل التشغيل</h4><div class="log">'+(S.runLog.length?S.runLog.map(l=>'<div><time>'+l.t+'</time><span class="'+l.type+'">'+esc(l.msg)+'</span></div>').join(''):'<div class="small">لا سجل بعد.</div>')+'</div></details>'+
  nextBar(null,['happened','الخطوة ٢: ماذا حصل؟'])+'</div>';
}
function nameHit(t){const d=S.settings.dict,names=d.names.concat(d.hashtags).filter(Boolean);return names.length?re(names).test(norm(t)):true}

/* ---------- step 2: what happened ---------- */
function issueRows(list,good){
 const c=V.cur,mx=Math.max(.3,...list.map(o=>o.share));
 return list.map(o=>{
  const k=evKey(ASPECTS[o.a].label+(good?': ما أعجب الزوار':': ما أزعج الزوار'),i=>vis(i)&&i.aspects.some(z=>z.a===o.a&&z.p===(good?'pos':'neg')));
  return '<div class="rw"><div class="l"><b>'+esc(ASPECTS[o.a].label)+'</b><small>'+esc(STG[ASPECTS[o.a].stage].name)+'</small></div>'+
   '<div class="bar'+(good?' g':'')+'"><i style="width:'+Math.max(4,Math.round(o.share/mx*100))+'%"></i></div>'+
   '<div class="v">'+pc(o.share)+'<small>'+o.n+' من '+c.N+'</small></div>'+
   '<div class="x">'+(good?'':chgChip(sigOf(o.a)))+evBtn(k)+'</div></div>';
 }).join('');
}
function weeklySeries(){
 const ui=V.ui,ids=V.order.filter(id=>(seasonObj(id)||{}).open);if(!ids.length)return null;
 const pd=periodDays(ui.period),maxItemW=P.items.reduce((m,i)=>Math.max(m,i.week||0),1);
 const maxW=isFinite(pd)?Math.max(1,Math.floor(pd/7)):maxItemW;if(maxW<2)return null;
 const series=ids.map(id=>{
  const its=P.items.filter(i=>i.season===id&&(ui.area==='all'||i.area===ui.area)),pts=[];
  for(let w=1;w<=maxW;w++){const wi=its.filter(i=>i.week===w),st=stats(wi);pts.push({w,v:st.N>=8?st.negAny/st.N*100:null,n:wi.length,N:st.N})}
  return {id,pts};
 });
 return {ids,series,maxW};
}
const CHART_COLS=['#F1C566','#86A9FF','#5CCBDD','#C79BFF'];
function chartSvg(ws){
 const W=720,H=260,pl=44,pr=16,pt=14,pb=44,pw=W-pl-pr,ph=H-pt-pb,maxW=ws.maxW;
 const vals=ws.series.flatMap(s=>s.pts.map(p=>p.v).filter(v=>v!=null));
 const mx=Math.max(...vals,8);const st=[1,2,5,10,20,25,50,100].find(s=>s*4>=mx)||100,ymax=st*4;
 const x=w=>pl+(w-1)*pw/(maxW-1),y=v=>pt+ph*(1-v/ymax);
 let g='';
 for(let k=0;k<=4;k++){const v=ymax*k/4,yy=y(v);g+='<line class="gx" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'"/><text class="gt" x="'+(pl-6)+'" y="'+(yy+4)+'" text-anchor="end">'+Math.round(v)+'%</text>'}
 for(let w=1;w<=maxW;w++)g+='<text class="gt" x="'+x(w)+'" y="'+(H-24)+'" text-anchor="middle">'+w+'</text>';
 g+='<text class="gt" x="'+(pl+pw/2)+'" y="'+(H-6)+'" text-anchor="middle">الأسبوع منذ افتتاح كل موسم</text>';
 ws.series.forEach((s,si)=>{
  const col=CHART_COLS[si%CHART_COLS.length],sel=s.id===V.ui.season;let path='',open=false;
  s.pts.forEach(p=>{if(p.v==null){open=false;return}path+=(open?'L':'M')+x(p.w).toFixed(1)+' '+y(p.v).toFixed(1)+' ';open=true});
  if(path)g+='<path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="'+(sel?3.2:2)+'" stroke-linejoin="round" stroke-linecap="round"/>';
  s.pts.forEach(p=>{if(p.v!=null)g+='<circle cx="'+x(p.w)+'" cy="'+y(p.v)+'" r="'+(sel?4:3)+'" fill="'+(p.n>=8?col:'var(--bg)')+'" stroke="'+col+'" stroke-width="2"><title>'+esc(s.id)+' · الأسبوع '+p.w+': '+Math.round(p.v)+'% ('+p.N+' رأيًا)</title></circle>'});
 });
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نسبة الشكاوى أسبوعًا بعد أسبوع لكل موسم">'+g+'</svg>';
}
function opn(n){return n===1?'رأي واحد':n===2?'رأيان':fmt(n)+(n<=10?' آراء':' رأيًا')}
function periodChart(rows){
 const pts=rows.filter(o=>o.s.N>0);if(pts.length<2)return '';
 const W=420,H=250,pl=40,pr=14,pt=28,pb=64,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph,gap=pw/pts.length;
 const vals=pts.map(o=>o.s.negAny/o.s.N*100),mx=Math.max(...vals,8);
 const st=[1,2,5,10,20,25,50,100].find(k=>k*4>=mx)||100,ymax=st*4,y=v=>pt+ph*(1-v/ymax),X=i=>pl+gap*(i+.5);
 let g='';
 for(let k=0;k<=4;k++){const v=ymax*k/4,yy=y(v);g+='<line class="gx" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'"/><text class="gt" x="'+(pl-6)+'" y="'+(yy+4)+'" text-anchor="end">'+Math.round(v)+'%</text>'}
 g+='<path d="'+pts.map((o,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+y(vals[i]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--bad)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
 pts.forEach((o,i)=>{
  const cx=X(i),v=vals[i],small=o.s.N<8,cy=y(v),sel=o.id===V.ui.season;
  const lbl=String(o.id).replace(/^\d+\s*·\s*/,''),m=lbl.match(/^(\S+)\s+(.+)$/),ln=m?[m[1],m[2]]:[lbl];
  g+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(sel?6:5)+'" fill="'+(small?'var(--bg)':'var(--bad)')+'" stroke="'+(sel?'var(--fg)':'var(--bad)')+'" stroke-width="2"><title>'+esc(lbl)+': '+Math.round(v)+'% ('+o.s.negAny+' من '+o.s.N+')'+(small?' · عدد قليل':'')+'</title></circle>'+
   '<text x="'+cx.toFixed(1)+'" y="'+(cy-11).toFixed(1)+'" text-anchor="middle" font-size="14" font-weight="700" fill="var(--fg)">'+Math.round(v)+'%</text>'+
   ln.map((t,j)=>'<text x="'+cx.toFixed(1)+'" y="'+(base+17+j*16)+'" text-anchor="middle" font-size="13" fill="var(--fg)">'+esc(t)+'</text>').join('')+
   '<text x="'+cx.toFixed(1)+'" y="'+(base+17+ln.length*16+2)+'" text-anchor="middle" font-size="12" fill="var(--mut)">'+esc(opn(o.s.N))+'</text>';
 });
 const aria='نسبة الزوار الذين اشتكوا من شيء: '+pts.map((o,i)=>String(o.id).replace(/^\d+\s*·\s*/,'')+' '+Math.round(vals[i])+'% من '+o.s.N).join('، ');
 return '<div class="chartbox pc"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(aria)+'">'+g+'</svg></div>';
}
function platformChart(pl){
 const rows=pl.filter(x=>x.sent&&x.sent.n>0);if(rows.length<2)return '';
 const seg=(cls,k,n)=>{const w=n/k*100;return '<i class="'+cls+'" style="width:'+w.toFixed(1)+'%">'+(w>=11?Math.round(w)+'%':'')+'</i>'};
 return '<div class="pbc">'+rows.map(x=>'<div class="pbr"><div class="l"><b>'+PLAT[x.p]+'</b><small>'+mAd(x.sent.n)+'</small></div>'+
  '<div class="sbx" role="img" aria-label="'+esc(PLAT[x.p]+': إيجابي '+Math.round(x.sent.pos/x.sent.n*100)+'% ومحايد '+Math.round(x.sent.neu/x.sent.n*100)+'% وسلبي '+Math.round(x.sent.neg/x.sent.n*100)+'%')+'">'+seg('p',x.sent.n,x.sent.pos)+seg('u',x.sent.n,x.sent.neu)+seg('g',x.sent.n,x.sent.neg)+'</div></div>').join('')+
  '<div class="legend" style="margin-top:4px"><span><i class="sq" style="background:var(--ok)"></i>إيجابي</span><span><i class="sq" style="background:var(--mut)"></i>محايد</span><span><i class="sq" style="background:var(--bad)"></i>سلبي</span></div></div>';
}

/* ---------- voice field hero: every dot is one item; lit dots back the selected complaint ---------- */
let VF={a:null,items:[]};
/* this session's corrections per event ({id,prev}), so undo never reaches another event's data */
const FIXES={};
const fixLog=()=>FIXES[S.eventId]||(FIXES[S.eventId]=[]);
function vfIssues(){return issues()}
function vfSel(){const iss=vfIssues();if(VF.a&&iss.some(o=>o.a===VF.a))return VF.a;return iss[0]?iss[0].a:null}
function vfLit(a){return i=>opinion(i)&&i.aspects.some(x=>x.a===a&&x.p==='neg')}
function vfCard(a){
 const c=V.cur,m=mode();
 if(!a)return '<div class="vf-card"><div class="vf-act">ما فيه شكوى تكررت بما يكفي بعد</div><div class="small">نعرض الشكوى هنا إذا تكررت 3 مرات على الأقل من مصدرين مستقلين.</div></div>';
 const x=c.A[a],rec=V.recs.find(r=>r.a===a),lab=ASPECTS[a].label;
 const ev=evKey(lab+': ما أزعج الزوار',i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p==='neg'));
 let h='<div class="vf-card"><div class="vf-n">'+fmt(x.neg)+' <small>'+(x.neg===1?'صوت':'أصوات')+' تشتكي من '+esc(lab)+'</small></div>';
 if(rec){const saved=S.saved.find(z=>z.key===rec.key);
  h+='<div class="vf-act">'+esc(planOf(rec,m))+'</div><div class="vf-facts"><span>'+esc(rec.team)+'</span><span>الهدف '+pn(rec.kpi.base)+' ← '+pn(rec.kpi.target)+'</span><span>'+esc(whenTxt(rec,m))+'</span></div>'+
   '<div class="vf-btns"><button class="btn coral" type="button" data-act="ev" data-k="'+ev+'">اسمع الأصوات</button><button class="btn'+(saved?' on':'')+'" type="button" data-act="saveRec" data-key="'+esc(rec.key)+'">'+(saved?'في الخطة ✓':'أضيفوها للخطة')+'</button></div>';
 }else{
  h+='<div class="vf-act" style="color:var(--warn)">ما فيه توصية بعد</div><div class="small">التوصية تحتاج 5 شكاوى على الأقل من 3 مصادر مستقلة. عندكم '+fmt(x.neg)+(x.neg===1?' شكوى':' شكاوى')+' من '+mq(x.negClips.size)+'. أضيفوا تعليقات أكثر.</div>'+
   '<div class="vf-btns"><button class="btn coral" type="button" data-act="ev" data-k="'+ev+'">اسمع الأصوات</button><button class="btn" type="button" data-act="tab" data-v="data">إضافة بيانات</button></div>';
 }
 return h+'</div>';
}
function vfHead(a){
 const c=V.cur,iss=vfIssues();
 if(!iss.length)return '<p class="vf-h">لا توجد شكوى تتكرر بوضوح</p><div class="vf-sub">'+rAr(c.N)+' في هذا النطاق.</div>';
 const me=iss.find(o=>o.a===a),topN=iss[0].n,isTop=me.n===topN,tie=isTop?iss.filter(o=>o.n===topN&&o.a!==a):[];
 return '<p class="vf-h">'+(isTop?'أكثر ما اشتكى منه الزوار: ':'شكوى الزوار من ')+'<em>'+esc(ASPECTS[a].label)+'</em></p>'+
  '<div class="vf-sub">'+fmt(me.n)+' من '+rAr(c.N)+(tie.length?' · متعادل مع '+tie.map(o=>ASPECTS[o.a].label).join(' و'):'')+(c.N<15?' · العينة صغيرة، فالأرقام اتجاه مبدئي':'')+'</div>';
}
function vfHero(){
 const c=V.cur,iss=vfIssues(),a=vfSel();VF.a=a;
 const srt=(p,q)=>hash(p.id)<hash(q.id)?-1:1;
 VF.items=V.items.slice().sort(srt);
 const lit=a?vfLit(a):()=>false;
 const dots=VF.items.map((i,k)=>'<button type="button" data-act="vfDot" data-id="'+esc(i.id)+'" class="'+(!opinion(i)?'h':lit(i)?'on':'')+'" aria-label="'+(opinion(i)?'رأي زائر':'مادة لا تُحسب')+'"></button>').join('');
 const q=c.N>=100?['عينة جيدة','ok']:c.N>=30?['عينة متوسطة','warn']:['عينة صغيرة','bad'];
 return '<div class="vf" id="vf"><div class="pill">'+chip(q[0]+' · '+rAr(c.N),q[1])+chip(sLbl(V.ui.season))+chip(perLabel())+(V.ui.area!=='all'?chip(areaName(V.ui.area)):'')+(demoOn()?'<span class="demo-flag">بيانات ديمو</span>':'')+'</div>'+
  '<div id="vfHead">'+vfHead(a)+'</div>'+
  (iss.length?'<div class="vf-chips" role="group" aria-label="اختاروا الشكوى">'+iss.map(o=>'<button type="button" data-act="vfAsp" data-a="'+o.a+'" aria-pressed="'+(o.a===a)+'">'+esc(ASPECTS[o.a].label)+' '+fmt(o.n)+'</button>').join('')+'</div>':'')+
  '<div class="vf-main"><div><div class="field" id="field">'+dots+'</div>'+
  '<div class="vf-leg"><span><i style="background:var(--coral)"></i>يشتكي من الشكوى المختارة</span><span><i style="background:var(--dot)"></i>رأي زائر محسوب</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--hollow)"></i>لا يُحسب (رسمي، سؤال، أو تصنيف غير مؤكد)</span></div></div>'+
  '<div id="vfCard">'+vfCard(a)+'</div></div></div>';
}
function vfSelect(a){
 if(!a||!vfIssues().some(o=>o.a===a))return;
 VF.a=a;const lit=vfLit(a),f=$('field');if(!f)return;
 [...f.children].forEach((b,k)=>{const i=VF.items[k];b.classList.remove('ask');b.classList.toggle('on',!!i&&lit(i))});
 $('vfHead').innerHTML=vfHead(a);$('vfCard').innerHTML=vfCard(a);
 document.querySelectorAll('.vf-chips button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.a===a?'true':'false'));
}
/* light the dots an answer used (mint), without changing the selected complaint */
function vfGlow(fn){const f=$('field');if(!f)return;[...f.children].forEach((b,k)=>{const i=VF.items[k];b.classList.toggle('ask',!!i&&fn(i))})}
function renderHappened(){
 if(!P.items.length){$('p-happened').innerHTML=emptyEvent();return}
 const c=V.cur,ui=V.ui,m=mode(),iss=issues(),gd=goods(),qs=questions(),top=iss[0];
 const q=c.N>=100?['عينة جيدة','ok']:c.N>=30?['عينة متوسطة','warn']:['عينة صغيرة','bad'];
 const ht=heroText(),head=ht.head,sub=ht.sub;
 const wk=V.week;
 const wkHtml=wk&&wk.rows.length?'<div class="card"><h3>هذا الأسبوع مقابل الأسبوع الذي قبله</h3>'+wk.rows.slice(0,3).map(r=>'<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0"><span>'+esc(ASPECTS[r.a].label)+'</span><span>'+pc(r.n1/r.N1)+' <span class="small">('+r.n1+' من '+r.N1+')</span> مقابل '+pc(r.n0/r.N0)+' '+(Math.abs(r.z)>=1.96?(r.d>0?chip('ارتفاع','bad'):chip('تحسّن','ok')):chip('بدون فرق ملحوظ','mut'))+'</span></div>').join('')+'<div class="small" style="margin-top:6px">الأيام '+(wk.N-6)+' إلى '+wk.N+' مقابل الأسبوع الذي قبله.</div></div>':'';
 const diff=S.lastDiff?'<div class="card"><h3>الجديد منذ آخر تحليل</h3><div class="small" style="margin-bottom:6px">من '+dAr(S.lastDiff.from)+' إلى '+dAr(S.lastDiff.to)+'</div><div class="stack" style="gap:4px">'+S.lastDiff.lines.map(l=>'<div>'+l+'</div>').join('')+'</div></div>':'';
 const stg=V.stages.map(s=>{const lab=STAT_AR[s.status]||s.status,t=s.pos+s.neg;
  return '<div class="stg"><b>'+esc(s.st.name)+'</b>'+chip(lab,s.cls)+'<span class="small">'+(s.st.id==='leave'?'يرغبون بالعودة: '+s.pos+' · لا يرغبون: '+s.neg:(t?'أعجبهم '+s.pos+' · أزعجهم '+s.neg:'لا آراء كافية'))+(s.qClips?' · أسئلة من '+s.qClips+' مصادر':'')+'</span></div>'}).join('');
 const dated=V.all.filter(o=>o.dated===V.dated||o.id===ui.season);
 const cmpRows=dated.map(o=>'<tr'+(o.id===ui.season?' class="cur"':'')+'><td><b>'+esc(o.id)+'</b>'+(o.id===ui.season?'<small>المحدد</small>':'')+'</td><td>'+fmt(o.s.N)+'</td><td>'+cell(o.s.negAny,o.s.N)+'</td>'+iss.slice(0,3).map(z=>'<td>'+cell(o.s.A[z.a].neg,o.s.N)+'</td>').join('')+'</tr>').join('');
 const ws=weeklySeries();
 const ar=areaTable();
 const qHtml=qs.length?qs.map(z=>'<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0"><span>«'+esc(TOPIC[z.t].label)+'»: '+esc(mq(z.clips))+' تسأل عنها</span>'+evBtn(evKey('أسئلة الزوار: '+TOPIC[z.t].label,i=>i.intent==='planning'&&i.topic===z.t),'أمثلة')+'</div>').join(''):'<div class="small">لا سؤال يتكرر بما يكفي.</div>';
 $('p-happened').innerHTML='<div class="stack">'+
  vfHero()+
  (sub?'<p class="small">'+esc(sub)+'</p>':'')+
  '<div class="grid g3">'+
   '<div class="card stat"><span class="lb">آراء الزوار في هذا النطاق</span><span class="big">'+fmt(c.N)+'</span><span class="small">من '+srcPh(c.clips)+(c.official?' · استبعدنا '+fmt(c.official)+' مادة رسمية أو إعلانية':'')+'</span></div>'+
   '<div class="card stat"><span class="lb">اشتكوا من شيء</span><span class="big">'+(c.N?pc(c.negAny/c.N):'—')+'</span><span class="small">'+fmt(c.negAny)+' من '+fmt(c.N)+'</span></div>'+
   '<div class="card stat"><span class="lb">قالوا إنهم سيعودون</span><span class="big">'+(c.N?pc(c.ret/c.N):'—')+'</span><span class="small">'+fmt(c.ret)+' من '+fmt(c.N)+'</span></div></div>'+
  wkHtml+diff+starCard()+platformCard()+topicsCard()+
  '<div class="card"><h3>أكثر ما أزعج الزوار</h3>'+(iss.length?issueRows(iss,false):emptyBox('لا جانب تكررت الشكوى منه في ثلاثة آراء ومصدرين مستقلين على الأقل.'))+'</div>'+
  '<div class="card"><h3>أكثر ما أعجبهم</h3>'+(gd.length?issueRows(gd,true):emptyBox('لا جانب إيجابي تكرر بما يكفي بعد.'))+'</div>'+
  '<div class="card"><h3>ماذا يسألون قبل الزيارة؟</h3>'+qHtml+'</div>'+
  '<div><h3 class="sec">أين تظهر المشاكل في رحلة الزائر؟</h3><div class="stages">'+stg+'</div></div>'+
  '<div><h3 class="sec">مقارنة بالمواسم السابقة</h3><p class="secp">المقارنة على: '+esc(perLabel())+'. كل رقم هو حصة الآراء التي ذكرت الجانب، مع العدد الذي بُنيت عليه.'+(V.dated?'':' هذه فترات بلا تواريخ افتتاح (مثل «قبل سنة» في قوقل ماب)، فهي تقريبية وأعداد كل فترة قد تكون صغيرة، والمقارنة بينها للاستئناس لا للجزم.')+'</p>'+
   '<div class="card" style="margin-bottom:12px"><h3>'+(V.dated?'الشكاوى في كل موسم':'الشكاوى بحسب الفترة (تقريبية)')+'</h3>'+periodChart(dated)+'<div class="small">النقطة = نسبة الزوار الذين اشتكوا من شيء، من الأقدم (يسار) إلى الأحدث (يمين). النقطة المفرغة: أقل من ٨ آراء فلا يُعتمد عليها. الفترات تقريبية، فلا تقرؤوا الخط كاتجاه مؤكد.</div></div>'+
   '<div class="tw"><table><thead><tr><th>الموسم</th><th>آراء الزوار</th><th>اشتكوا من شيء</th>'+iss.slice(0,3).map(z=>'<th>'+esc(ASPECTS[z.a].label)+'</th>').join('')+'</tr></thead><tbody>'+cmpRows+'</tbody></table></div></div>'+
  (ws?'<div class="card"><h3>الشكاوى أسبوعًا بعد أسبوع</h3><div class="legend" style="margin-bottom:6px">'+ws.ids.map((id,i)=>'<span><i style="background:'+CHART_COLS[i%CHART_COLS.length]+'"></i>'+esc(id)+(id===ui.season?' (المحدد)':'')+'</span>').join('')+'<span>○ أسبوع بآراء قليلة</span></div><div class="chartbox">'+chartSvg(ws)+'</div></div>':'')+
  (ar.length?'<div><h3 class="sec">المناطق</h3><p class="secp">المناطق التي فيها ١٠ آراء أو أكثر، مرتبة بحسب نسبة الشكاوى.</p><div class="tw"><table><thead><tr><th>المنطقة</th><th>آراء</th><th>اشتكوا من شيء</th><th>أكثر شكوى</th><th></th></tr></thead><tbody>'+
   ar.map(r=>'<tr><td><b>'+esc(r.ar.name)+'</b></td><td>'+fmt(r.N)+'</td><td>'+pc(r.share)+'</td><td>'+(r.top?esc(ASPECTS[r.top].label):'—')+'</td><td><button class="btn sm" type="button" data-act="area" data-id="'+r.ar.id+'">اعرضوها</button></td></tr>').join('')+'</tbody></table></div></div>':'')+
  '<p class="small">هذه آراء الزوار كما وردت في الملفات التي رفعتموها. هي لا تقيس عدد الحضور ولا المبيعات ولا زمن الانتظار الفعلي، وفئة كبيرة من الزوار لا تكتب تقييمًا. التصنيف يعتمد على قواعد لغوية تفهم اللهجة السعودية وليس نموذج لغة. عند تقييم ٤ أو ٥ نجوم لا نعدّ ذكر الزحام أو الانتظار أو البائعين شكوى إلا بكلمة ذمّ صريحة، وعند تقييم نجمة أو نجمتين لا نعدّ المديح إشادة. ويمكنكم دائمًا فتح «أمثلة من الزوار» لمراجعة ما بُنيت عليه الأرقام.</p>'+
  nextBar(['data','الخطوة ١: البيانات'],['recs','الخطوة ٣: التوصيات'])+'</div>';
}

/* ---------- step 3: recommendations ---------- */
function recCard(r,i,m){
 const saved=S.saved.find(x=>x.key===r.key),cf=conf(r),pl=planOf(r,m),pr=prioTxt(r,m);
 return '<div class="card rec"><div class="rh"><span class="rank">'+(i+1)+'</span><div><div class="pill">'+chip(pr,r.prio==='عاجل'?'bad':r.prio==='مهم'?'warn':'')+chip('الثقة: '+cf[0],cf[1])+'</div><h3>'+esc(r.title)+'</h3></div></div>'+
  '<dl class="kv"><dt>ماذا حصل</dt><dd>'+esc(happenedTxt(r))+'</dd>'+
  '<dt>ماذا نسوي</dt><dd>'+esc(pl)+'</dd>'+
  '<dt>متى ومن</dt><dd>'+esc(whenTxt(r,m))+' · '+esc(r.team)+'</dd>'+
  '<dt>كيف نعرف أنه نجح</dt><dd>'+esc(kpiTxt(r,m))+'</dd>'+
  '<dt>تأكدوا ميدانيًا</dt><dd>'+esc((PLAN[r.a]||{}).verify||'')+'</dd></dl>'+
  '<div class="row">'+evBtn(r.ev)+'<button class="btn sm'+(saved?' on':'')+'" type="button" data-act="saveRec" data-key="'+esc(r.key)+'">'+(saved?'في الخطة ✓':'أضيفوها إلى الخطة')+'</button></div></div>';
}
function renderRecs(){
 if(!P.items.length){$('p-recs').innerHTML=emptyEvent();return}
 const m=mode(),recs=ranked(m),c=V.cur,ui=V.ui;
 const savedHtml=S.saved.map(r=>{
  const f=followUp(r);let fu='';
  if(r.status==='done'&&f)fu='<div class="note">قبل التنفيذ (14 يومًا): '+(f.b.N?txC(f.b.n,f.b.N):'لا بيانات')+' · بعده: '+(f.a.N>=15?txC(f.a.n,f.a.N):'لا تكفي بعد ('+f.a.N+' رأيًا). ارفعوا ملفًا جديدًا لاحقًا')+'. هذا فرق في العينة وليس إثباتًا أن الإجراء هو السبب.</div>';
  return '<div class="card stack" style="gap:6px"><div class="row" style="justify-content:space-between"><b>'+esc(r.title)+'</b>'+chip(r.status==='done'?'نُفّذت '+dAr(r.actionDate):'مخطط لها',r.status==='done'?'ok':'')+'</div>'+
   '<div class="small">موسم '+esc(r.season)+' · '+esc(r.team)+'</div><div>'+esc(r.plan||r.action)+'</div>'+fu+
   '<div class="row">'+(r.status!=='done'?'<button class="btn sm" type="button" data-act="doneRec" data-key="'+esc(r.key)+'">نفّذناها</button>':'')+'<button class="btn sm" type="button" data-act="delRec" data-key="'+esc(r.key)+'">حذف</button></div></div>'}).join('');
 const gd=goods(),opps=V.opps.slice(0,3),tips=orgTips(m);
 const title=m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم';
 const intro=m==='live'?'الفعالية ما زالت قائمة، فنركز على ما ينفع خلال أيام. بعد التنفيذ ارفعوا ملفًا جديدًا (الخطوة ١) ونعرض لكم الفرق.':'الفعالية انتهت، فهذه توصيات للتخطيط للموسم القادم مبنية على ما حصل فعلًا في '+sIn(ui.season)+'.';
 const stale=m==='live'&&ui.season!==currentSeason()?'<div class="note warn">اخترتم موسمًا سابقًا مع حالة «ما زالت قائمة». غيّروا الموسم من الأعلى أو حالة الفعالية من الخطوة ١.</div>':'';
 $('p-recs').innerHTML='<div class="stack">'+
  '<div class="hero"><div class="seg" role="group" aria-label="حالة الفعالية"><button type="button" data-act="status" data-v="live" class="'+(m==='live'?'on':'')+'" aria-pressed="'+(m==='live')+'">ما زالت قائمة</button><button type="button" data-act="status" data-v="ended" class="'+(m==='ended'?'on':'')+'" aria-pressed="'+(m==='ended')+'">انتهت</button></div>'+
   '<h2>'+title+'</h2><p class="sub">'+esc(intro)+'</p></div>'+stale+
  (c.N<30?'<div class="note warn">العينة صغيرة ('+rAr(c.N)+'). اعتبروا التوصيات اتجاهًا مبدئيًا، وارفعوا ملفات أكثر قبل القرارات الكبيرة.</div>':'')+
  (recs.length?'<div class="stack">'+recs.map((r,i)=>recCard(r,i,m)).join('')+'</div>':emptyBox('لا توجد مشكلة تتكرر في ثلاثة مصادر مستقلة على الأقل في هذا النطاق. جرّبوا فترة أطول أو كل المناطق، أو ارفعوا ملفات أكثر.'))+
  '<p class="small">«الثقة» تعتمد على عدد الآراء وعدد المصادر المستقلة التي تذكر المشكلة. الإجراءات اقتراحات عامة للتجربة، وتأكدوا منها ميدانيًا قبل التنفيذ.</p>'+
  '<div><h3 class="sec">خطتكم</h3>'+(savedHtml?'<div class="grid g2" style="margin-top:8px">'+savedHtml+'</div>':emptyBox('أضيفوا توصية إلى الخطة لتتابعوها، وبعد التنفيذ نقيس الفرق عند رفع ملف جديد.'))+'</div>'+
  '<div><h3 class="sec">تحسينات للمنظّم نفسه</h3><p class="secp">خطوات تجعل القراءة القادمة أدق وتقلل التخمين.</p><div class="card stack">'+tips.map(t=>'<div class="tip'+(t.ok?' ok':'')+'"><i></i><div><b>'+esc(t.t)+'</b><div class="small" style="font-size:13.5px">'+esc(t.d)+'</div></div></div>').join('')+'</div></div>'+
  '<div class="grid g2"><div class="card"><h3>'+(m==='live'?'لا تغيّروه':'احتفظوا به')+'</h3>'+(gd.length?gd.map(o=>'<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0"><span>'+esc(ASPECTS[o.a].label)+'</span><span>'+pc(o.share)+' <span class="small">('+o.n+' رأيًا إيجابيًا)</span></span></div>').join(''):'<div class="small">لا نقطة قوة واضحة بعد.</div>')+'</div>'+
  '<div class="card"><h3>أفكار صغيرة تستحق التجربة</h3>'+(opps.length?opps.map(o=>'<div style="border-top:1px solid var(--line);padding:8px 0"><b>'+esc(o.title)+'</b><div class="small" style="font-size:13.5px">'+esc(o.why)+'</div><div class="small" style="font-size:13.5px">أصغر تجربة: '+esc(o.test)+'</div>'+evBtn(o.ev)+'</div>').join(''):'<div class="small">لا فرصة بأدلة كافية في هذا النطاق بعد.</div>')+'</div></div>'+
  nextBar(['happened','الخطوة ٢: ماذا حصل؟'],['pdf','عرض التقرير (PDF)'])+'</div>';
}

/* ---------- evidence drawer ---------- */
function itemCard(it){
 const asp=it.intent==='planning'?chip('سؤال: '+(TOPIC[it.topic]||{label:''}).label):it.intent==='official'?chip('رسمي / إعلاني','warn'):it.aspects.map(x=>chip((ASPECTS[x.a]?ASPECTS[x.a].label:x.a)+' · '+(x.p==='neg'?'سلبي':x.p==='pos'?'إيجابي':x.p==='mix'?'مختلط':'ذكر'),x.p==='neg'?'bad':x.p==='pos'?'ok':'mut')+(x.p==='neg'&&ASPECTS[x.a]?' <button class="fixb" type="button" data-act="fixCls" data-id="'+esc(it.id)+'" data-a="'+x.a+'" title="لا تحسبوا هذا الرأي شكوى من '+esc(ASPECTS[x.a].label)+'">التصنيف خطأ</button>':'')).join('');
 const link=/^https?:\/\//.test(it.url||'')?'<a href="'+esc(it.url)+'" target="_blank" rel="noopener noreferrer">فتح الرابط</a>':(it.demo?'<span>رابط تجريبي</span>':'');
 return '<div class="ev"><div class="row">'+chip(it.season)+(it.stars?chip(it.stars+' من 5','mut'):'')+(it.platform?chip(PLAT[it.platform]||'','mut'):'')+(it.day?chip('اليوم '+it.day,'mut'):chip(it.publishedAt?'خارج أيام الموسم':'بلا تاريخ نشر','mut'))+chip(areaName(it.area),'mut')+asp+(it.uncertain?chip('غير محسوم','warn'):'')+(it.demo?chip('تجريبي','warn'):'')+(it.access?chip(it.access,'warn'):'')+'</div>'+
  '<div class="tx'+(isEn(it.text)?' en':'')+'">'+esc(it.text)+'</div>'+
  '<div class="small row" style="gap:4px 14px">'+(it.publishedAt?'<span>نُشر '+dAr(it.publishedAt)+'</span>':'')+link+(it.likes?'<span>إعجابات: '+fmt(it.likes)+'</span>':'')+'</div></div>';
}
function renderDrawer(){
 const dr=$('drawer');
 if(!D){dr.classList.remove('on');$('scrim').classList.remove('on');return}
 if(D.html){dr.innerHTML='<div class="dh"><div><h3>'+esc(D.title)+'</h3></div><button class="btn sm" type="button" data-act="closeEv">إغلاق</button></div><div class="db">'+D.html+'</div>';dr.classList.add('on');$('scrim').classList.add('on');return}
 const src=D.all?P.items:V.items,srt=(p,q)=>(q.likes-p.likes)||(q.publishedAt||'').localeCompare(p.publishedAt||'');
 const g=src.filter(i=>i.query==='general'&&D.fn(i)).sort(srt),t=src.filter(i=>i.query==='targeted'&&D.fn(i)).sort(srt);
 dr.innerHTML='<div class="dh"><div><h3>'+esc(D.title)+'</h3><div class="small">'+fmt(g.length)+' مادة'+(t.length?' + '+fmt(t.length)+' أمثلة إضافية':'')+' · '+esc(D.all?'كل المواسم':V.ui.season)+'</div></div><button class="btn sm" type="button" data-act="closeEv">إغلاق</button></div>'+
  '<div class="db">'+(fixLog().length?'<div class="note warn">'+(fixLog().length===1?'صحّحتم تصنيفًا واحدًا':'صحّحتم '+fmt(fixLog().length)+' تصنيفات')+'، والأرقام والتوصيات أُعيد حسابها. <button class="btn sm" type="button" data-act="unfixCls">تراجع عن آخر تصحيح</button></div>':'')+(g.length?g.slice(0,D.g).map(itemCard).join('')+(g.length>D.g?'<button class="btn sm" type="button" data-act="moreEv" data-w="g">عرض المزيد</button>':''):'<div class="empty">لا مواد في هذا النطاق.</div>')+
  (t.length?'<h4>أمثلة إضافية (بحث موجّه)</h4><div class="note">هذه الأمثلة تشرح الأسباب ولا تدخل في حساب النسب، لأن البحث الموجّه يضخّم الموضوع الذي نبحث عنه.</div>'+t.slice(0,D.t).map(itemCard).join('')+(t.length>D.t?'<button class="btn sm" type="button" data-act="moreEv" data-w="t">عرض المزيد</button>':''):'')+'</div>';
 dr.classList.add('on');$('scrim').classList.add('on');
}

/* ================= redesigned screens: overview -> problem details -> visitor voices ================= */
const VS0=()=>({a:'all',stage:'all',sent:'all',plat:'all',q:'',n:20});
const hashSort=list=>list.slice().sort((p,q)=>hash(p.id)<hash(q.id)?-1:1);
const negOf=a=>i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p==='neg');
function startBox(){
 return '<div class="ptitle"><div><h2>'+esc(S.settings.event)+'</h2><p>فعالية بلا بيانات بعد</p></div></div>'+
  '<div class="startbox"><h3>أضف بيانات الفعالية</h3><p class="small">ما نعرض نتائج قبل ما ترفعون آراء الزوار، ولا نضيف أي بيانات من عندنا.</p><div class="steps3">'+
  '<div class="done"><i>✓</i><div><b>اخترتم الفعالية</b><div class="small">«'+esc(S.settings.event)+'»</div></div></div>'+
  '<div class="now"><i>٢</i><div><b>ابحثوا عنها في الويب، أو ارفعوا ملف التعليقات</b><div class="small">المستشار يبحث ويتحقق من المصادر بنفسه. الملفات (CSV أو JSON أو TXT) خيار إضافي</div></div></div>'+
  '<div><i>٣</i><div><b>نحلل ونعرض أولوية اليوم</b><div class="small">مع التعليقات اللي بُنيت عليها كل نتيجة</div></div></div></div>'+
  '</div>'+searchCard({name:S.settings.event})+'<div class="row2"><button class="btn" type="button" data-act="tab" data-v="data">أو ارفعوا ملف تعليقات</button></div>';
}
function tieInfo(a){
 const iss=issues(),me=iss.find(o=>o.a===a);if(!me)return '';
 const same=iss.filter(o=>o.a!==a&&o.n===me.n),more=iss.filter(o=>o.a!==a&&o.n>me.n);
 if(more.length)return 'أكثر شكوى عددًا: '+more.map(o=>ASPECTS[o.a].label+' ('+fmt(o.n)+')').join('، ');
 if(same.length)return 'متعادل مع '+same.map(o=>ASPECTS[o.a].label).join(' و');
 return '';
}
function miniField(a){
 const lit=a?negOf(a):()=>false;
 return '<div class="minifield" aria-hidden="true">'+hashSort(V.items).map(i=>'<i class="'+(!opinion(i)?'h':opinion(i)&&lit(i)?'on':'')+'"></i>').join('')+'</div>';
}
function overviewPick(){
 const m=mode(),rec=ranked(m)[0],iss=issues();
 return {rec,a:rec?rec.a:(iss[0]?iss[0].a:null)};
}
function renderOverview(){
 const el=$('p-overview');if(!el)return;
 if(!P.items.length){el.innerHTML=searchSummary()+startBox();return}
 const c=V.cur,m=mode(),iss=issues(),gd=goods(),pk=overviewPick(),a=pk.a,rec=pk.rec;
 const kp=(l,v,s)=>'<div class="kpi"><span>'+l+'</span><b>'+v+'</b><small>'+s+'</small></div>';
 let h='<div class="ptitle"><div><h2>نظرة عامة</h2><p>'+esc(scopeTxt())+'</p></div>'+(c.N<30?chip('عينة صغيرة · '+rAr(c.N),'warn'):chip('عينة '+(c.N>=100?'جيدة':'متوسطة')+' · '+rAr(c.N),c.N>=100?'ok':'warn'))+'</div>';
 h+='<div class="kpis">'+kp('آراء الزوار',fmt(c.N),'من '+fmt(V.items.length)+' مادة في النطاق')+kp('اشتكوا من شيء',c.N?pc(c.negAny/c.N):'—',fmt(c.negAny)+' من '+fmt(c.N))+
  kp('مشاعر إيجابية',c.sent.n?pc(c.sent.pos/c.sent.n):'—','من '+fmt(c.sent.n)+' مادة لها شعور')+kp('توصيات جاهزة',fmt(V.recs.length),'شكوى تكررت 5 مرات من 3 مصادر')+'</div>'+searchSummary();
 let pr;
 if(a){
  const x=c.A[a],lab=ASPECTS[a].label,tie=tieInfo(a);
  pr='<div class="prio"><span class="eyebrow">أولوية اليوم</span><h3>'+esc(lab)+'</h3>'+
   '<p class="lead"><b>'+fmt(x.neg)+'</b> '+(x.neg===1?'رأي':'آراء')+' من '+fmt(c.N)+' تشتكي من '+esc(lab)+'، من '+esc(mq(x.negClips.size))+(tie?' · '+esc(tie):'')+'</p>'+miniField(a);
  if(rec){pr+='<div class="firstact"><span class="lb">أول إجراء مقترح</span><b>'+esc(planOf(rec,m))+'</b><div class="facts"><span>'+esc(rec.team)+'</span><span>الهدف '+pn(rec.kpi.base)+' ← '+pn(rec.kpi.target)+'</span><span>'+esc(whenTxt(rec,m))+'</span></div></div>'+
   '<p class="small">'+(m==='live'?'اخترناها لأنها الأعلى أولوية ثم الأسهل تنفيذًا الآن بين الشكاوى المتكررة.':'اخترناها لأنها الأقوى دليلًا وأثرًا.')+'</p>'}
  else pr+='<div class="firstact" style="border-color:rgba(245,194,107,.4);background:rgba(245,194,107,.07)"><span class="lb" style="color:var(--warn)">ما فيه توصية بعد</span><span class="small">التوصية تحتاج 5 شكاوى على الأقل من 3 مصادر مستقلة. عندكم '+fmt(x.neg)+'.</span></div>';
  pr+='<div class="row2"><button class="btn coral" type="button" data-act="openProb" data-a="'+a+'">عرض التفاصيل</button><button class="btn" type="button" data-act="openVoices" data-a="'+a+'" data-sent="neg">التعليقات الداعمة</button></div></div>';
 }else pr='<div class="prio"><span class="eyebrow">أولوية اليوم</span><h3 style="font-size:24px">ما فيه شكوى تتكرر بوضوح</h3><p class="small">نعرض الأولوية إذا تكررت شكوى 3 مرات على الأقل من مصدرين مستقلين.</p><div class="row2"><button class="btn" type="button" data-act="tab" data-v="voices">صوت الزوار</button></div></div>';
 const top=iss[0];
 const brief='<div class="brief"><h3><svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8"><path d="M12 4l1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8z"/></svg>موجز المستشار</h3>'+
  '<p>قرأت '+fmt(V.items.length)+' مادة، منها '+rAr(c.N)+' من زوار «'+esc(S.settings.event)+'».</p>'+
  (top?'<p>أكثر شكوى: '+esc(ASPECTS[top.a].label)+' ('+fmt(top.n)+')'+(iss[1]&&iss[1].n===top.n?' بالتساوي مع '+esc(ASPECTS[iss[1].a].label):'')+'.</p>':'')+
  (gd[0]?'<p>أكثر ما أعجبهم: '+esc(ASPECTS[gd[0].a].label)+' ('+fmt(gd[0].n)+').</p>':'')+
  (c.N<30?'<p class="small" style="color:var(--warn)">العينة صغيرة، فالأرقام اتجاه مبدئي.</p>':'')+
  (demoOn()?'<p class="small">البيانات مجمّعة مسبقًا وليست اتصالًا مباشرًا.</p>':'')+
  '<div class="row2"><button class="btn" type="button" data-act="openChat">اسأل المستشار</button></div></div>';
 h+='<div class="ov">'+pr+'<div style="display:grid;gap:16px">'+brief+'</div></div>';
 const others=iss.filter(o=>o.a!==a);
 if(others.length)h+='<div class="decide"><h3>مشاكل أخرى تستحق القرار</h3>'+others.map(o=>{const r=V.recs.find(z=>z.a===o.a);
  return '<div class="dz"><div><b>'+esc(ASPECTS[o.a].label)+'</b> <span class="small">· '+fmt(o.n)+' من '+fmt(c.N)+' · '+esc(STG[ASPECTS[o.a].stage].name)+'</span> '+(r?chip('توصية جاهزة','ok'):chip('تحتاج بيانات أكثر','mut'))+'</div><button class="btn sm" type="button" data-act="openProb" data-a="'+o.a+'">عرض التفاصيل</button></div>'}).join('')+'</div>';
 h+='<div class="sec-h"><h3>رحلة الزائر</h3><span class="small">اضغطوا على مرحلة لعرض تعليقاتها</span></div><div class="journey">'+V.stages.map(s=>{
  const t=s.pos+s.neg,lab=STAT_AR[s.status]||s.status;
  return '<button class="stage" type="button" data-act="openStage" data-s="'+s.st.id+'"><span class="sn">'+esc(s.st.name)+'</span>'+chip(lab,s.cls)+
   '<span class="sb2" aria-hidden="true"><i style="width:'+(t?Math.round(s.pos/t*100):0)+'%;background:var(--mint)"></i><i style="width:'+(t?Math.round(s.neg/t*100):0)+'%;background:var(--coral)"></i></span>'+
   '<span class="cnt">'+(s.st.id==='leave'?'يرغبون بالعودة '+s.pos+' · لا يرغبون '+s.neg:(t?'أعجبهم '+s.pos+' · أزعجهم '+s.neg:'لا آراء كافية'))+(s.qClips?' · أسئلة '+s.qs:'')+'</span><span class="go">عرض النتائج ←</span></button>'}).join('')+'</div>';
 el.innerHTML=h;
}
function probSel(){
 const iss=issues();let a=S.ui.prob;
 if(!a||!iss.some(o=>o.a===a))a=overviewPick().a;
 return a;
}
function renderProblem(){
 const el=$('p-problem');if(!el)return;
 if(!P.items.length){el.innerHTML=startBox();return}
 const c=V.cur,m=mode(),iss=issues(),a=probSel();
 if(!a){el.innerHTML='<div class="ptitle"><div><h2>تفاصيل المشكلة</h2><p>'+esc(scopeTxt())+'</p></div></div><div class="startbox"><h3>ما فيه شكوى تتكرر بما يكفي</h3><p class="small">نعرض التفاصيل إذا تكررت شكوى 3 مرات على الأقل من مصدرين مستقلين. راجعوا صوت الزوار أو أضيفوا بيانات.</p><div class="row2"><button class="btn" type="button" data-act="tab" data-v="voices">صوت الزوار</button><button class="btn" type="button" data-act="tab" data-v="data">إضافة بيانات</button></div></div>';return}
 const x=c.A[a],lab=ASPECTS[a].label,rec=V.recs.find(r=>r.a===a),tie=tieInfo(a);
 let h='<div class="ptitle"><div><button class="btn sm" type="button" data-act="tab" data-v="overview">→ النظرة العامة</button><h2 style="margin-top:8px">'+esc(lab)+'</h2><p>'+esc(STG[ASPECTS[a].stage].name)+' · '+esc(scopeTxt())+'</p></div></div>';
 if(iss.length>1)h+='<div class="vf-chips" role="group" aria-label="مشاكل أخرى" style="margin-bottom:14px">'+iss.map(o=>'<button type="button" data-act="openProb" data-a="'+o.a+'" aria-pressed="'+(o.a===a)+'">'+esc(ASPECTS[o.a].label)+' '+fmt(o.n)+'</button>').join('')+'</div>';
 /* 1. what happened */
 const byP={};x.negIds.forEach(id=>{const it=P.byId[id];if(it){const k=it.platform||'other';byP[k]=(byP[k]||0)+1}});
 const mx=Math.max(1,...Object.values(byP));
 const ta=V.ui.area==='all'?topAreaFor(a):null;
 const what='<div class="pcard"><h3><span class="num">١</span>وش حصل؟</h3><div class="bignum">'+fmt(x.neg)+' <small>'+(x.neg===1?'رأي':'آراء')+' من '+fmt(c.N)+' تشتكي من '+esc(lab)+'</small></div>'+
  '<div class="facts"><span>'+pc(c.N?x.neg/c.N:0)+' من الآراء</span><span>'+esc(mq(x.negClips.size))+'</span>'+(x.pos?'<span>وأشاد به '+fmt(x.pos)+'</span>':'')+'</div>'+
  (tie?'<p class="small" style="color:var(--warn)">'+esc(tie)+'</p>':'')+
  '<div class="platsplit">'+PLATS.filter(k=>byP[k]).map(k=>'<div><span>'+esc(PLAT[k])+'</span><i style="width:'+Math.round(byP[k]/mx*100)+'%"></i><b>'+byP[k]+'</b></div>').join('')+'</div>'+
  (ta?'<p class="small">أكثر منطقة فيها شكوى: '+esc(areaName(ta.id))+' ('+ta.n+' من '+ta.t+').</p>':'')+
  '<p class="small">'+esc(cmpPhrase(sigOf(a)))+'</p></div>';
 /* 3. what to do */
 let act='<div class="pcard act"><h3><span class="num">٣</span>وش نسوي؟</h3>';
 if(rec){const saved=S.saved.find(z=>z.key===rec.key);
  act+='<div class="firstact"><span class="lb">'+(m==='live'?'تحسين تقدرون تسوونه الحين':'توصية للموسم القادم')+'</span><b>'+esc(planOf(rec,m))+'</b><div class="facts"><span>'+esc(rec.team)+'</span><span>'+esc(whenTxt(rec,m))+'</span><span>'+esc(prioTxt(rec,m))+'</span></div></div>'+
   '<div><span class="small">كيف نقيس الأثر</span><div class="kpiline">'+pn(rec.kpi.base)+' ← '+pn(rec.kpi.target)+'</div><p class="small">'+esc(kpiTxt(rec,m))+'</p></div>'+
   ((PLAN[a]||{}).verify?'<p class="small"><b>تأكدوا ميدانيًا:</b> '+esc(PLAN[a].verify)+'</p>':'')+
   '<div class="row2"><button class="btn'+(saved?' on':' pri')+'" type="button" data-act="saveRec" data-key="'+esc(rec.key)+'">'+(saved?'في الخطة ✓':'أضيفوها للخطة')+'</button><button class="btn" type="button" data-act="tab" data-v="recs">كل التوصيات</button></div>';
 }else act+='<p>ما فيه توصية بعد لهذه الشكوى.</p><p class="small">التوصية تظهر إذا تكررت الشكوى 5 مرات على الأقل من 3 مصادر مستقلة. عندكم '+fmt(x.neg)+(x.neg===1?' شكوى':' شكاوى')+' من '+esc(mq(x.negClips.size))+'.</p><div class="row2"><button class="btn" type="button" data-act="tab" data-v="data">إضافة بيانات</button></div>';
 act+='</div>';
 /* 2. how we know */
 const sup=V.items.filter(negOf(a)).sort((p,q)=>(q.likes-p.likes)||(q.publishedAt||'').localeCompare(p.publishedAt||''));
 const lit=negOf(a);
 const how='<div class="pcard how wide"><h3><span class="num">٢</span>كيف عرفنا؟</h3>'+
  '<p>صنّفنا '+rAr(c.N)+' بقواعد لغوية تفهم اللهجة السعودية والإنجليزية، وليس بنموذج لغة. '+fmt(x.neg)+' منها ذكرت '+esc(lab)+' بصيغة سلبية، وهي النقاط المضيئة. كل نقطة رأي زائر، واضغطوا أي نقطة لقراءته.</p>'+
  '<div class="pfield">'+hashSort(V.items).map(i=>'<button type="button" data-act="vfDot" data-id="'+esc(i.id)+'" class="'+(!opinion(i)?'h':lit(i)?'on':'')+'" aria-label="'+(opinion(i)?'رأي زائر':'مادة لا تُحسب')+'"></button>').join('')+'</div>'+
  '<h4 style="margin-top:4px">من التعليقات الداعمة</h4><div class="vlist" style="margin-top:0">'+sup.slice(0,4).map(itemCard).join('')+'</div>'+
  (sup.length?'<div class="row2"><button class="btn" type="button" data-act="openVoices" data-a="'+a+'" data-sent="neg">كل التعليقات الداعمة ('+fmt(sup.length)+')</button></div>':'')+
  '<div class="video"><b>رصد الفيديو:</b> لا توجد مؤشرات فيديو لهذه الفعالية. تحليل الفيديو المسجّل قيد التطوير في فرع منفصل ولم يُدمج بعد، لذلك لا نعرض أي أرقام منه هنا.</div></div>';
 el.innerHTML=h+'<div class="pd">'+what+act+how+'</div>';
}
function vsState(){if(!S.ui.vs||typeof S.ui.vs!=='object')S.ui.vs=VS0();return S.ui.vs}
function vsFn(){
 const v=vsState(),q=norm(v.q||''),st=v.stage!=='all'?STG[v.stage]:null;
 return i=>{
  if(v.plat!=='all'&&i.platform!==v.plat)return false;
  if(q&&!norm(i.text).includes(q))return false;
  if(v.a!=='all'&&!i.aspects.some(x=>x.a===v.a&&(v.sent==='all'||x.p===v.sent)))return false;
  if(v.a==='all'&&v.sent!=='all'&&i.sent!==v.sent)return false;
  if(st){if(st.id==='leave'){if(!(i.ret||i.noret))return false}else if(!i.aspects.some(x=>st.asp.includes(x.a)&&(v.sent==='all'||x.p===v.sent)))return false}
  return true;
 };
}
function renderVoiceList(){
 const box=$('vlist');if(!box)return;
 const v=vsState(),list=V.items.filter(vsFn()).sort((p,q)=>(q.likes-p.likes)||(q.publishedAt||'').localeCompare(p.publishedAt||''));
 const n=list.length;
 $('vcount').textContent=(n===1?'تعليق واحد':n===2?'تعليقان':n>=3&&n<=10?n+' تعليقات':fmt(n)+' تعليقًا')+' يطابق الفلاتر';
 box.innerHTML=list.length?list.slice(0,v.n).map(itemCard).join('')+(list.length>v.n?'<button class="btn" type="button" data-act="vsMore">عرض المزيد</button>':''):'<div class="empty">ما فيه تعليقات تطابق هذه الفلاتر.</div>';
}
function renderVoices(){
 const el=$('p-voices');if(!el)return;
 if(!P.items.length){el.innerHTML=startBox();return}
 const v=vsState(),cnt=srcCounts();
 const opt=(val,l,cur)=>'<option value="'+val+'"'+(val===cur?' selected':'')+'>'+esc(l)+'</option>';
 const stg=v.stage!=='all'?V.stages.find(s=>s.st.id===v.stage):null;
 el.innerHTML='<div class="ptitle"><div><h2>صوت الزوار</h2><p>كل تعليق كما كتبه الزائر، مع مصدره وتصنيفه. البيانات مجمّعة وليست اتصالًا مباشرًا.</p></div><button class="btn sm" type="button" data-act="vsReset">مسح الفلاتر</button></div>'+
  '<div class="srcs">'+PLATS.filter(k=>cnt[k]).map(k=>'<span><b>'+fmt(cnt[k])+'</b> '+esc(PLAT[k])+' <span class="small">· '+esc(PLAT_NOTE[k])+'</span></span>').join('')+'</div>'+
  (stg?'<div class="note">مرحلة «'+esc(stg.st.name)+'»: '+esc(STAT_AR[stg.status]||stg.status)+' · '+(stg.st.id==='leave'?'يرغبون بالعودة '+stg.pos+' · لا يرغبون '+stg.neg:'أعجبهم '+stg.pos+' · أزعجهم '+stg.neg)+'</div>':'')+
  '<div class="vfilters">'+
   '<label>الجانب<select id="vsA">'+opt('all','كل الجوانب',v.a)+AKEYS.map(k=>opt(k,ASPECTS[k].label,v.a)).join('')+'</select></label>'+
   '<label>مرحلة الرحلة<select id="vsStage">'+opt('all','كل المراحل',v.stage)+STAGES.map(s=>opt(s.id,s.name,v.stage)).join('')+'</select></label>'+
   '<label>الشعور<select id="vsSent">'+opt('all','الكل',v.sent)+opt('neg','سلبي',v.sent)+opt('pos','إيجابي',v.sent)+opt('neu','محايد',v.sent)+'</select></label>'+
   '<label>المصدر<select id="vsPlat">'+opt('all','كل المصادر',v.plat)+PLATS.filter(k=>cnt[k]).map(k=>opt(k,PLAT[k],v.plat)).join('')+'</select></label>'+
   '<label>بحث في النص<input id="vsQ" type="search" value="'+esc(v.q||'')+'" placeholder="مثل: الطابور"></label></div>'+
  '<div class="small" id="vcount" style="margin-top:10px"></div><div class="vlist" id="vlist"></div>';
 renderVoiceList();
}
function renderAll(){computeView();renderStatus();renderTabs();renderFilters();renderData();renderOverview();renderProblem();renderVoices();renderHappened();renderRecs();renderDrawer();renderChatScope()}
