
/* ================= chat assistant: matches the request to the same analysis (rules, not a language model) ================= */
const DIG={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
const cn=s=>norm(String(s||'').replace(/[٠-٩]/g,d=>DIG[d]));
const PRE='(?:وال|بال|لل|كال|فال|ال|و|ب|ل|ك|ف)?';
const cw=t=>{t=norm(t);return isLat(t)?'(?<![a-z])'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+')+'(?![a-z])':'(?<!['+AB+'])'+PRE+t.replace(/ /g,'\\s+')+'(?:ه|ها|هم|ات|ين|ان|نا)?(?!['+AB+'])'};
const CEX={shows:['فعالية','فعاليات','عرض'],booking:['الموقع','website','app']};
const CAD={price:['تكلفة','تكاليف'],wayfinding:['ارشاد','لوحات','ضياع','ضايعين'],wait:['وقوف','يوقفون'],clean:['نظافة']};
const CAK={};
for(const a of AKEYS){const ex=(CEX[a]||[]).map(norm);CAK[a]=new RegExp(AKW[a].concat(CAD[a]||[]).filter(k=>!ex.includes(norm(k))).map(cw).join('|'))}
const detAspects=t=>AKEYS.map(a=>{const m=CAK[a].exec(t);return m?{a,i:m.index}:null}).filter(Boolean).sort((p,q)=>p.i-q.i).map(x=>x.a);
function detArea(t){for(const a of S.settings.areas)for(const n of [a.name,a.en]){if(n&&new RegExp(cw(n)).test(t))return a.id}return null}
const detPlat=t=>/تيك ?توك|tiktok/.test(t)?'tiktok':/تويتر|twitter|(?<![ء-ي])اكس(?![ء-ي])|(?<![a-z])x(?![a-z])/.test(t)?'x':/قوقل ?ماب|جوجل ?ماب|google ?maps?|gmaps|خرائط/.test(t)?'gmaps':null;
const CMPW=/قارن|مقارنه|مقابل|compare|vs/;
function detSeason(t){
 let m=t.match(/(20\d\d)\s*[\/\-]\s*(\d{2,4})/);
 if(m){const id=m[1]+'/'+m[2].slice(-2);if(V.order.includes(id))return id}
 m=t.match(/(?<!\d)(20\d\d)(?!\d)/);if(m){const id=V.order.find(x=>x.startsWith(m[1]+'/'));if(id)return id}
 if(/الماضي|السابق|الفايت|اللي قبل/.test(t)&&!CMPW.test(t)){const p=V.prevAll.length?V.prevAll[V.prevAll.length-1].id:null;return p}
 if(/موسم/.test(t)&&/(?:هذا|هذي|هالموسم|الحالي)/.test(t))return currentSeason();
 return null;
}
function detPeriod(t){
 if(/كل الايام|كل الفتره|من البدايه/.test(t))return 'all';
 if(/اسبوعين/.test(t))return 'd14';
 if(/(?:ثلاث|ثلاثه|3) اسابيع/.test(t))return 'd21';
 const m=t.match(/(?:اول\s+)?(\d{1,3})\s*(?:يوم|ايام)/);
 if(m){const n=Number(m[1]);return 'd'+[7,14,21,28].reduce((b,x)=>Math.abs(x-n)<Math.abs(b-n)?x:b,7)}
 if(/اول اسبوع/.test(t))return 'd7';
 if(/اول شهر|شهر كامل/.test(t))return 'd28';
 return null;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STEP_MS=260;
let chatBusy=false,CEV={},cevN=0,chatLast='';
const cev=(title,fn,all)=>{const id='c'+(++cevN);CEV[id]={title,fn,all:!!all};return id};
const csNow=()=>[S.ui.season,S.ui.period,S.ui.area,S.ui.plat||'all'].join('|');
const A=(l,d,o)=>Object.assign({l,d,cs:csNow()},o||{});
const actBtn=x=>'<button class="btn sm'+(x.pri?' pri':'')+'" type="button" data-act="cdo" data-do="'+x.d+'" data-cs="'+esc(x.cs)+'"'+(x.id?' data-id="'+esc(x.id)+'"':'')+(x.key?' data-key="'+esc(x.key)+'"':'')+(x.v?' data-v="'+esc(x.v)+'"':'')+(x.p?' data-p="'+esc(x.p)+'"':'')+'>'+esc(x.l)+'</button>';
const chatSet={season:null,period:null,area:null,plat:null};
function applyCs(s){const p=String(s||'').split('|');if(p.length<3)return;const pl=p[3]||'all';const ch=S.ui.season!==p[0]||S.ui.period!==p[1]||S.ui.area!==p[2]||(S.ui.plat||'all')!==pl;if(ch){chatSet.season=chatSet.period=chatSet.area=chatSet.plat=null;S.ui.season=p[0];S.ui.period=p[1];S.ui.area=p[2];S.ui.plat=pl;persist();renderAll()}}
function applyEnt(e){
 let ch=false;const ui=S.ui;
 const dim=(k,val,def)=>{
  if(val!=null){if(val!==ui[k]){ui[k]=val;ch=true}chatSet[k]=val}
  else if(chatSet[k]!==null&&ui[k]===chatSet[k]){ui[k]=def;chatSet[k]=null;ch=true}
 };
 dim('season',e.season&&V.order.includes(e.season)?e.season:null,currentSeason());
 dim('period',e.period&&(seasonObj(ui.season)||{}).open?e.period:null,'eq');
 dim('area',e.area||null,'all');
 dim('plat',e.plat&&srcCounts()[e.plat]?e.plat:null,'all');
 if(ch){persist();renderAll()}
 return ch;
}

/* ---------- small pieces ---------- */
const scopeTxt0=()=>sIn(V.ui.season)+' · '+perLabel()+' · '+(V.ui.area==='all'?'كل المناطق':areaName(V.ui.area));
const scopeTxt=()=>scopeTxt0()+(V.ui.plat&&V.ui.plat!=='all'&&PLAT[V.ui.plat]?' · '+PLAT[V.ui.plat]:'');
const stepsScope=()=>'حدّدت النطاق: '+scopeTxt();
const stepsData=()=>'راجعت '+rAr(V.cur.N)+' من '+srcPh(V.cur.clips);
const weakNote=()=>V.cur.N<15?'<div class="note warn">الآراء في هذا النطاق قليلة ('+rAr(V.cur.N)+')، فالأرقام اتجاه مبدئي فقط.</div>':V.cur.N<30?'<div class="note warn">العينة صغيرة نسبيًا ('+rAr(V.cur.N)+')، فالنسب للإرشاد فقط.</div>':'';
const demoNote=()=>demoOn()?'<div class="small">ملاحظة: بيانات بوليفارد وورلد هنا مجمّعة مسبقًا (تقييمات قوقل ماب ومنشورات عامة من تيك توك وX)، وهي عينة منتقاة وليست عشوائية ولا اتصالًا مباشرًا.</div>':'';
const cq=i=>'<blockquote class="cq"'+(isEn(i.text)?' dir="ltr" style="text-align:left"':'')+'>'+(i.platform&&PLAT[i.platform]?'<span class="small">'+esc(PLAT[i.platform])+' · </span>':'')+esc(clipT(i.text.replace(/\s+/g,' '),170))+(/^https?:\/\//.test(i.url||'')?' <a href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">المصدر ↗</a>':'')+'</blockquote>';
const tgtNote=qs=>qs.some(q=>q.query==='targeted')?'<div class="small">بعض هذه الأمثلة من بحث موجّه، ولا تدخل في النسب.</div>':'';
const flagShort=s=>!s?'':s.flag==='worse'?' (أعلى من '+s.baseId+')':s.flag==='better'?' (أقل من '+s.baseId+')':'';
function topAreaFor(a){
 const its=scopeItems(V.ui.season,Object.assign({},V.ui,{area:'all'}));let best=null;
 for(const ar of S.settings.areas){const s=stats(its.filter(i=>i.area===ar.id));if(s.N>=10&&s.A[a].neg>=3){const sh=s.A[a].neg/s.N;if(!best||sh>best.sh)best={id:ar.id,n:s.A[a].neg,t:s.N,sh}}}
 return best;
}
/* ---------- answers ---------- */
function aspectBlock(a){
 const s=sigOf(a),c=V.cur,x=c.A[a],lab=ASPECTS[a].label,m=mode();
 let h='<div><b>'+esc(lab)+'</b> <span class="small">· '+esc(STG[ASPECTS[a].stage].name)+'</span></div>';
 h+='<div>'+(c.N?txC(x.neg,c.N)+' من آراء الزوار اشتكت منه. '+esc(cmpPhrase(s))+(x.pos?' وأشاد به '+rAr(x.pos)+'.':''):'لا آراء كافية عنه في هذا النطاق.')+'</div>';
 const ta=V.ui.area==='all'?topAreaFor(a):null;
 if(ta)h+='<div>أكثر منطقة فيها شكاوى منه: '+esc(areaName(ta.id))+' ('+ta.n+' من '+ta.t+' رأيًا).</div>';
 const neg=x.neg>0||!x.pos,fn=i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p===(neg?'neg':'pos')),qs=repQuotes(fn,2);
 if(qs.length)h+='<div class="small" style="margin-top:6px">'+(neg?'من الشكاوى':'من الإشادات')+':</div>'+qs.map(cq).join('')+tgtNote(qs);
 const rec=V.recs.find(z=>z.a===a),acts=[];
 if(rec)h+='<div class="note"><b>'+(m==='live'?'تحسين تقدرون تسوونه الحين':'توصية للموسم القادم')+':</b> '+esc(planOf(rec,m))+' <span class="small">· '+esc(rec.team)+'</span></div>';
 else if(x.neg>0)h+='<div class="small">لا توصية بعد: نحتاج 5 آراء على الأقل من 3 مصادر مستقلة.</div>';
 acts.push(A('أمثلة من الزوار','ev',{id:cev(lab+(neg?': ما أزعج الزوار':': ما أعجب الزوار'),fn)}));
 if(rec){acts.push(A('أضيفوها إلى الخطة','save',{key:rec.key}));acts.push(A('كل التوصيات','go',{v:'recs'}))}
 if(ta)acts.push(A('اعرضوا '+areaName(ta.id),'area',{id:ta.id}));
 return {h,acts,steps:['حدّدت الجانب: '+lab,'قارنت بـ'+(s&&s.baseId?'نفس المرحلة من '+s.baseId:'الموسم السابق (غير موجود)'),'راجعت الأدلة: '+mq(x.negClips.size)+' ذكرته سلبيًا']};
}
function areaAnswer(aid){
 const c=V.cur,cov=V.cover.find(r=>r.ar.id===aid),nm=areaName(aid),acts=[],m=mode();
 let h='<div><b>'+esc(nm)+'</b>'+(cov&&cov.isNew?' <span class="chip ok">منطقة جديدة هذا الموسم</span>':'')+'</div>';
 const ar=S.settings.areas.find(a=>a.id===aid);
 if(ar&&V.dated&&V.order.indexOf(ar.first)>V.order.indexOf(V.ui.season))return {h:h+'<div>هذه المنطقة لم تفتح بعد في موسم '+esc(V.ui.season)+' بحسب إعدادات المواسم (أول موسم لها: '+esc(ar.first)+').</div>',acts,steps:[stepsScope()]};
 h+=weakNote()+'<div>'+rAr(c.N)+' من '+srcPh(c.clips)+'.</div>';
 const ng=AKEYS.map(a=>[a,c.A[a].neg]).filter(e=>e[1]>0).sort((p,q)=>q[1]-p[1]).slice(0,3),ps=AKEYS.map(a=>[a,c.A[a].pos]).filter(e=>e[1]>0).sort((p,q)=>q[1]-p[1]).slice(0,2);
 if(ng.length)h+='<div>أكثر ما اشتكوا منه: '+ng.map(e=>esc(ASPECTS[e[0]].label)+' '+txC(e[1],c.N)).join('، ')+'.</div>';
 if(ps.length)h+='<div>أكثر ما أعجبهم: '+ps.map(e=>esc(ASPECTS[e[0]].label)+' ('+fmt(e[1])+')').join('، ')+'.</div>';
 const rec=ranked(m)[0];
 if(rec)h+='<div class="note"><b>أهم إجراء:</b> '+esc(rec.title)+' — '+esc(planOf(rec,m))+'</div>';
 acts.push(A('أمثلة من الزوار','ev',{id:cev('آراء '+nm,i=>vis(i))}));
 if(rec)acts.push(A('أضيفوها إلى الخطة','save',{key:rec.key}));
 return {h,acts,steps:[stepsScope(),stepsData()]};
}
function arearank(){
 const rows=areaTable();
 if(!rows.length)return {h:'لا توجد منطقة فيها 10 آراء أو أكثر لنرتّب المناطق في هذا النطاق.',acts:[A('إضافة بيانات','go',{v:'data'})],steps:[stepsScope(),'لم تصل أي منطقة إلى 10 آراء']};
 const h='<div><b>المناطق الأعلى شكاوى</b> (التي فيها 10 آراء فأكثر):</div><ul>'+rows.slice(0,4).map(r=>'<li>'+esc(r.ar.name)+': '+pc(r.share)+' من '+fmt(r.N)+' رأيًا'+(r.top?' · أكثرها «'+esc(ASPECTS[r.top].label)+'»':'')+'</li>').join('')+'</ul><div class="small">المناطق الأقل من 10 آراء مستبعدة لأن النسبة فيها غير موثوقة.</div>';
 return {h,acts:[A('جدول المناطق','go',{v:'happened'})],steps:[stepsScope(),'حسبت حصة الشكاوى لكل منطقة','استبعدت المناطق بأقل من 10 آراء']};
}
function coverage(){
 const rows=V.cover.filter(r=>r.ar.id!=='gen');
 const h='<div>كم رأيًا عندنا لكل منطقة في '+esc(sIn(V.ui.season))+':</div><ul>'+rows.map(r=>'<li>'+esc(r.ar.name)+': '+(r.st==='لا بيانات'?'لا آراء':r.st==='غير كافية'?'قليلة':r.st==='محدودة'?'محدودة':'كافية')+' ('+rAr(r.N)+')</li>').join('')+'</ul><div class="small">«لا آراء» و«قليلة» تعني أننا لا نحكم على المنطقة بعد.</div>';
 return {h,acts:[A('أضيفوا بيانات','go',{v:'data'})],steps:[stepsScope(),'عددت الآراء لكل منطقة']};
}
function summaryAnswer(){
 const c=V.cur,ht=heroText(),iss=issues(),m=mode(),rec=ranked(m)[0],acts=[];
 let h='<div><b>'+esc(ht.head)+'</b></div>'+(ht.sub?'<div class="small">'+esc(ht.sub)+'</div>':'')+weakNote();
 if(iss.length)h+='<ul>'+iss.slice(0,3).map(o=>'<li>'+esc(ASPECTS[o.a].label)+': '+txC(o.n,c.N)+esc(flagShort(sigOf(o.a)))+'</li>').join('')+'</ul>';
 const wk=V.week;if(wk&&wk.rows.length){const r=wk.rows[0];h+='<div class="small">آخر أسبوع مقابل الذي قبله: '+esc(ASPECTS[r.a].label)+' '+txC(r.n1,r.N1)+' مقابل '+txC(r.n0,r.N0)+(Math.abs(r.z)>=1.96?'':' (ضمن التذبذب)')+'.</div>'}
 if(rec)h+='<div class="note"><b>أهم إجراء:</b> '+esc(rec.title)+'. '+esc(planOf(rec,m))+'</div>';
 if(iss[0]){const a=iss[0].a;acts.push(A('أمثلة من الزوار','ev',{id:cev(ASPECTS[a].label+': ما أزعج الزوار',i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p==='neg'))}))}
 if(rec)acts.push(A('أضيفوها إلى الخطة','save',{key:rec.key}));
 acts.push(A('عرض التقرير','report',{pri:true}));
 return {h,acts,steps:[stepsScope(),stepsData(),'قارنت بنفس المرحلة من الموسم السابق','رتّبت التوصيات حسب التكرار وسهولة التنفيذ']};
}
function recsAnswer(asp){
 const m=mode();let rs=ranked(m);if(asp.length)rs=rs.filter(r=>asp.includes(r.a));
 if(!rs.length)return {h:weakNote()+'<div>ما عندنا توصية بأدلة كافية '+(asp.length?'عن '+asp.map(a=>esc(ASPECTS[a].label)).join(' و'):'')+' في هذا النطاق. الشرط: 5 آراء سلبية على الأقل من 3 مصادر مستقلة.</div>',acts:[A('كل التوصيات','go',{v:'recs'})],steps:[stepsScope(),'فحصت شرط التوصية: لا جانب يتجاوزه']};
 const h=weakNote()+'<div><b>'+(m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم')+'</b></div>'+rs.slice(0,3).map((r,i)=>'<div style="margin-top:8px"><b>'+(i+1)+'. '+esc(r.title)+'</b> <span class="chip '+(r.prio==='عاجل'?'bad':'warn')+'">'+esc(prioTxt(r,m))+'</span></div><div>'+esc(happenedTxt(r))+'</div><div><b>ماذا نسوي:</b> '+esc(planOf(r,m))+'</div><div class="small">'+esc(whenTxt(r,m))+' · '+esc(r.team)+'</div>').join('');
 const acts=[A('أضيفوا أولها إلى الخطة','save',{key:rs[0].key,pri:true}),A('أمثلة من الزوار','ev',{id:cev(rs[0].title+': ما أزعج الزوار',i=>{const e=EV[rs[0].ev];return e?e.fn(i):false})}),A('كل التوصيات','go',{v:'recs'})];
 return {h,acts,steps:[stepsScope(),stepsData(),'طبّقت شرط التكرار: 5 آراء على الأقل من 3 مصادر مستقلة','رتّبت '+rs.length+' توصية وأعرض أعلى '+Math.min(3,rs.length)]};
}
function oppsAnswer(){
 const os=V.opps.slice(0,3);
 if(!os.length)return {h:'ما عندنا فكرة بأدلة كافية في هذا النطاق بعد.',acts:[A('كل التوصيات','go',{v:'recs'})],steps:[stepsScope(),'بحثت عن إشارتين متقاطعتين أو أسئلة متكررة: لا شيء كافٍ']};
 const h=os.map(o=>'<div style="margin-top:8px"><b>'+esc(o.title)+'</b></div><div>'+esc(o.why)+'</div><div class="small">أصغر تجربة: '+esc(o.test)+'</div>').join('');
 return {h,acts:[A('كل التوصيات','go',{v:'recs',pri:true})],steps:[stepsScope(),stepsData(),'ربطت بين الإشارات (إشادة + اكتشاف بالصدفة، إشادة + صعوبة وصول، أسئلة متكررة)']};
}
function compareAnswer(){
 const rows=V.all.filter(o=>o.dated===V.dated),iss=issues().slice(0,2);
 let h=weakNote()+'<div>المقارنة على: '+esc(perLabel())+'.</div><ul>'+rows.map(o=>'<li><b>'+esc(o.id)+'</b>'+(o.id===V.ui.season?' (المحدد)':'')+': '+rAr(o.s.N)+' · اشتكوا من شيء '+txC(o.s.negAny,o.s.N)+'</li>').join('')+'</ul>';
 const w=V.signals.filter(r=>r.flag==='worse'||r.flag==='better').slice(0,3);
 if(w.length)h+='<div>الفروق الملحوظة عن '+esc(w[0].baseId)+':</div><ul>'+w.map(r=>'<li>'+esc(ASPECTS[r.a].label)+': '+(r.flag==='worse'?'أعلى':'أقل')+' — '+txC(r.x.neg,V.cur.N)+' مقابل '+txC(r.baseNeg,r.baseN)+'</li>').join('')+'</ul>';
 else h+='<div>لا فروق ملحوظة عن الموسم السابق ضمن حدود العينة.</div>';
 return {h,acts:[A('جدول المقارنة','go',{v:'happened',pri:true})],steps:[stepsScope(),'اخترت فترات متكافئة منذ افتتاح كل موسم','حسبت الفروق واختبرت أنها ليست صدفة']};
}
function stagesAnswer(){
 const h=weakNote()+'<ul>'+V.stages.map(s=>'<li><b>'+esc(s.st.name)+'</b>: '+esc(STAT_AR[s.status]||s.status)+' <span class="small">(أعجبهم '+s.pos+' · أزعجهم '+s.neg+')</span></li>').join('')+'</ul><div class="small">«بيانات قليلة» تعني أن الآراء أقل من أن نحكم.</div>';
 return {h,acts:[A('ماذا حصل؟','go',{v:'happened',pri:true})],steps:[stepsScope(),stepsData(),'ربطت كل جانب بمرحلته من رحلة الزائر']};
}
function strengthsAnswer(){
 const c=V.cur,gd=goods();let h=weakNote();
 h+=gd.length?'<div><b>أكثر ما أعجب الزوار:</b> '+gd.map(o=>esc(ASPECTS[o.a].label)+' ('+pc(o.share)+')').join('، ')+'.</div>':'<div>ما فيه جانب إيجابي تكرر بما يكفي في هذا النطاق.</div>';
 h+='<div>قالوا إنهم سيعودون: '+txC(c.ret,c.N)+'.</div>';
 const a0=gd[0]&&gd[0].a,fn=i=>vis(i)&&i.aspects.some(z=>z.a===a0&&z.p==='pos'),q=a0?repQuotes(fn,2):[];
 if(q.length)h+=q.map(cq).join('')+tgtNote(q);
 const acts=[];if(a0)acts.push(A('أمثلة من الزوار','ev',{id:cev(ASPECTS[a0].label+': ما أعجب الزوار',fn)}));
 return {h,acts,steps:[stepsScope(),stepsData(),'رتّبت الجوانب حسب عدد الآراء الإيجابية']};
}
function worstAnswer(){
 const iss=issues(),c=V.cur;
 if(!iss.length)return {h:weakNote()+'<div>ما فيه جانب تكررت الشكوى منه بما يكفي في هذا النطاق.</div>',acts:[],steps:[stepsScope(),stepsData()]};
 const h=weakNote()+'<div><b>أكثر ما أزعج الزوار:</b></div><ul>'+iss.slice(0,3).map(o=>'<li>'+esc(ASPECTS[o.a].label)+': '+txC(o.n,c.N)+esc(flagShort(sigOf(o.a)))+'</li>').join('')+'</ul>';
 const a=iss[0].a;
 return {h,acts:[A('أمثلة من الزوار','ev',{id:cev(ASPECTS[a].label+': ما أزعج الزوار',i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p==='neg')),pri:true}),A('كل التوصيات','go',{v:'recs'})],steps:[stepsScope(),stepsData(),'رتّبت الجوانب حسب حصة الشكاوى']};
}
function evidenceAnswer(asp){
 const iss=issues(),a=asp[0]||(iss[0]&&iss[0].a);
 if(!a)return {h:weakNote()+'<div>ما عندنا مقتطفات كافية في هذا النطاق.</div>',acts:[],steps:[stepsScope()]};
 const lab=ASPECTS[a].label,neg=!/ايجابي|اشاد|حلو|اعجب/.test(chatLast),fn=i=>vis(i)&&i.aspects.some(z=>z.a===a&&z.p===(neg?'neg':'pos'));
 const qs=repQuotes(fn,3);
 const h=weakNote()+(qs.length?'<div>'+(neg?'من شكاوى الزوار عن ':'من إشادات الزوار بـ')+esc(lab)+' (من مصادر مستقلة):</div>'+qs.map(cq).join('')+tgtNote(qs):'<div>ما عندنا مقتطفات كافية عن '+esc(lab)+' في هذا النطاق.</div>')+demoNote();
 return {h,acts:[A('كل الأمثلة','ev',{id:cev(lab+(neg?': ما أزعج الزوار':': ما أعجب الزوار'),fn),pri:true})],steps:[stepsScope(),'اخترت '+lab,'استخرجت أعلى المقتطفات من مصادر مستقلة']};
}
function dataAnswer(){
 if(!activeRows().length)return emptyAnswer();
 const L=P.log;
 const h='<div>الفعالية الحالية: <b>'+esc(S.settings.event)+'</b>. البيانات المتاحة: <b>'+esc(srcTxt())+'</b>.</div>'+
  '<div>آخر تحليل: '+fmt(L.total)+' مادة، قُبل منها '+fmt(L.kept)+(L.social?' (منها '+fmt(L.social)+' من تيك توك وX)':'')+'، وتجاهلنا '+fmt(L.dup)+' مكررة و'+fmt(L.unrelated+Object.values(L.excl).reduce((s,x)=>s+x,0))+' لا تخص الفعالية. منها '+fmt(L.official)+' رسمية أو إعلامية أو إعلانية لا تُحسب كرأي زائر.</div>'+
  '<div><b>مجمّعة وليست مباشرة:</b> كل ما أحلله بيانات جُمعت مسبقًا أو رفعتموها كملفات. لا يوجد اتصال مباشر بقوقل ماب أو تيك توك أو X في هذه النسخة (هذا ضمن «قريبًا»).</div>'+
  '<div>التصنيف قواعد لغوية تفهم اللهجة السعودية وليس نموذج لغة، فقد يخطئ في العبارات الملتبسة. المشاعر من نجوم التقييم حين تتوفر في قوقل ماب (٤ و٥ إيجابي، ٣ محايد، ١ و٢ سلبي)، وإلا ومع تيك توك وX من كلمات المدح والذم. عند ٤ أو ٥ نجوم لا نعدّ ذكر الزحام أو الانتظار أو البائعين شكوى إلا بكلمة ذمّ صريحة، وعند نجمة أو نجمتين لا نعدّ المديح إشادة.</div>'+demoNote();
 return {h,acts:[A('مصادر البيانات','go',{v:'data',pri:true})],steps:['قرأت سجل آخر تحليل','قرأت مصادر الفعالية: '+srcTxt()]};
}
function emptyAnswer(){
 return {h:'<div>فعالية «'+esc(S.settings.event)+'» ما فيها بيانات بعد، فما أقدر أحلل شيئًا. أضيفوا ملف تقييمات أو منشورات من «البيانات» واختاروا منصته، وبعدها أجاوب من الأرقام الفعلية.</div>',acts:[A('إضافة بيانات','go',{v:'data',pri:true})],steps:[]};
}
function helpAnswer(){
 const h='<div>أجاوب من بيانات «'+esc(S.settings.event)+'» المجمّعة فقط، وبقواعد وليس بنموذج لغة حرّ. جرّبوا:</div><ul><li>«قارن بين المنصات» أو «وش يقولون في تيك توك؟»</li><li>«كيف مشاعر الزوار؟» و«وش أكثر المواضيع ذكرًا؟»</li><li>«وش أكثر ما أزعج الزوار؟» و«وش أعجبهم؟»</li><li>«كيف الانتظار؟» أو «الأسعار في قوقل ماب»</li><li>«وش مراحل رحلة الزائر؟»</li><li>«وش أهم توصية؟» و«أعطني تقرير»</li><li>«كم متوسط النجوم؟»</li><li>«وش الميزات القادمة؟» (قريبًا)</li></ul><div class="small">إذا ما فهمت سؤالكم أقول لكم.</div>';
 return {h,acts:[],steps:[]};
}
function futureAnswer(){
 const h='<div><b>الموجود الآن:</b> تحليل بيانات <b>مجمّعة مسبقًا</b> (قوقل ماب، تيك توك، X) وما ترفعونه كملفات. لا يوجد اتصال مباشر بأي منصة.</div><div style="margin-top:6px"><b>قريبًا (غير مفعّل في هذه النسخة):</b></div><ul>'+FUTURE.map(f=>'<li><b>'+esc(f.label)+'</b>: '+esc(f.desc)+'</li>').join('')+'</ul><div class="small">البنية تسمح بإضافة مصدر جديد بدون إعادة بناء: كل مصدر يتحول إلى الصيغة نفسها (النص، المنصة، التاريخ، النجوم إن وجدت) ثم يمر بالتحليل نفسه.</div>';
 return {h,acts:[A('قسم قريبًا','go',{v:'data',pri:true})],steps:[]};
}
function eventsAnswer(){
 const names=S.events.map(e=>e.id===S.eventId?'<b>'+esc(e.name)+'</b> (الحالية)':esc(e.name)).join('، ');
 const h='<div>الفعاليات المضافة: '+names+'.</div><div>الوكيل غير مربوط بفعالية معينة: بوليفارد وورلد أول حالة تجريبية فقط. لإضافة فعالية جديدة أو التبديل بينها افتحوا «البيانات» ثم «الفعالية». الفعالية الجديدة تبدأ فارغة وتحتاج بياناتها (ملف تقييمات أو منشورات).</div>';
 return {h,acts:[A('الفعالية','go',{v:'data',pri:true})],steps:[]};
}
function reportAnswer(){
 computeView();const c=V.cur,m=mode(),recs=ranked(m);
 const h=weakNote()+'<div>جهّزت <b>تقرير المنظّم</b> ('+esc(scopeTxt())+'): الخلاصة، ماذا حصل، '+(m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم')+'، وتحسينات للمنظّم نفسه'+(V.plats.length>1?'، ومقارنة بين المنصات (تيك توك وX وقوقل ماب)':'')+'.</div><div class="small">أعرضه لكم الحين وتنزّلونه من داخل المعاينة. التقرير يتبع الفلاتر الحالية، وهو صور وليس نصًا قابلًا للتحديد.</div>'+demoNote();
 return {h,acts:[A('عرض التقرير','report',{pri:true}),A('تنزيل مباشر','dl')],steps:[stepsScope(),'جمعت '+rAr(c.N)+' من الزوار','رتّبت '+recs.length+' توصية','رسمت صفحات التقرير'],after:()=>openPreview()};
}
function starsAnswer(){
 computeView();const s=starStats(V.items);
 if(!s.n)return {h:'<div>ما فيه نجوم في البيانات الحالية. أضيفوا عمودًا اسمه <b>rating</b> (من 1 إلى 5) في ملف التقييمات.</div>',acts:[A('البيانات','go',{v:'data',pri:true})],steps:[stepsScope()]};
 const per=V.all.filter(o=>o.dated===V.dated||o.id===V.ui.season).map(o=>({id:o.id,s:starStats(scopeItems(o.id,V.ui))})).filter(x=>x.s.n);
 let h=weakNote()+'<div>متوسط النجوم في '+esc(scopeTxt())+': <b>'+avgTxt(s.avg)+'</b> من 5 ('+fmt(s.n)+' تقييمًا). '+pc(s.low/s.n)+' منها بنجمة أو نجمتين، و'+pc(s.high/s.n)+' بأربع أو خمس نجوم.</div>';
 if(per.length>1)h+='<div>حسب الفترة: '+per.map(x=>esc(x.id)+' '+avgTxt(x.s.avg)+' ('+x.s.n+')').join(' · ')+'.</div>';
 h+='<div class="small">المتوسط محسوب من تقييمات الملفات فقط، وقد لا يطابق تقييم المكان العام في قوقل ماب.'+(per.some(x=>x.s.n<30)&&per.length>1?' أعداد بعض الفترات صغيرة، فلا تعتبروا الفرق بين متوسطاتها اتجاهًا مؤكدًا.':'')+'</div>'+demoNote();
 return {h,acts:[A('الخطوة ٢: ماذا حصل؟','go',{v:'happened',pri:true})],steps:[stepsScope(),'قرأت نجوم '+fmt(s.n)+' تقييمًا']};
}
const sentLine=x=>x.sent.n?'إيجابي '+pc(x.sent.pos/x.sent.n)+' · محايد '+pc(x.sent.neu/x.sent.n)+' · سلبي '+pc(x.sent.neg/x.sent.n)+' (من '+(x.sent.n===2?'مادتين':mAd(x.sent.n))+')':'لا آراء زوار كافية';
const asp1=o=>o?esc(ASPECTS[o.a].label)+' ('+fmt(o.n)+')':'—';
function platformsAnswer(pl){
 const pls=V.plats;
 if(pl){
  const x=pls.find(z=>z.p===pl);
  if(!x)return {h:'<div>ما عندنا مواد من '+PLAT[pl]+' في هذا النطاق. المتاح الآن: '+esc(srcTxt())+'.</div><div class="small">الربط المباشر مع المنصات ضمن «قريبًا»، وحاليًا تدخل البيانات المجمّعة أو الملفات المرفوعة فقط.</div>',acts:[A('مصادر البيانات','go',{v:'data',pri:true})],steps:[stepsScope(),'بحثت عن مواد من '+PLAT[pl]]};
  const soc=pl==='tiktok'||pl==='x';
  let h='<div><b>'+PLAT[pl]+'</b>: '+mAd(x.n)+(x.official?'، منها '+fmt(x.official)+' رسمية أو إعلامية أو إعلانية':'')+'.</div><div>'+sentLine(x)+'.</div>';
  if(x.negTop)h+='<div>أكثر ما اشتكوا منه: '+asp1(x.negTop)+'.</div>';
  if(x.posTop)h+='<div>أكثر ما أعجبهم: '+asp1(x.posTop)+'.</div>';
  if(!x.negTop&&!x.posTop)h+='<div>ما ظهر جانب واضح (انتظار، زحام، أسعار…) في مواد هذه المنصة ضمن النطاق.</div>';
  const qn=repQuotes(i=>i.platform===pl&&i.sent==='neg',2),qp=repQuotes(i=>i.platform===pl&&i.sent==='pos',1);
  if(qn.length)h+='<div class="small" style="margin-top:6px">أمثلة سلبية:</div>'+qn.map(cq).join('');
  if(qp.length)h+='<div class="small" style="margin-top:6px">أمثلة إيجابية:</div>'+qp.map(cq).join('');
  h+=soc?'<div class="note warn">مواد تيك توك وX غالبًا منشورات وعناوين من صنّاع محتوى وإعلام وليست تعليقات زوار، فهي إشارة مبدئية وليست قياسًا لرأي الزوار.</div>':'<div class="small">المشاعر هنا من النجوم حين تتوفر وإلا من نص التقييم، والعينة مراجعون اختاروا الكتابة فقد لا تمثّل كل الزوار.</div>';
  return {h,acts:[A('عرض المواد','platEv',{p:pl,pri:true}),A('جدول المنصات','go',{v:'happened'})],steps:[stepsScope(),'جمعت مواد '+PLAT[pl]+' ('+fmt(x.n)+')','حسبت المشاعر ثم الجوانب الأكثر ذكرًا']};
 }
 if(!pls.length)return {h:'<div>ما عندنا مواد من منصات في هذا النطاق بعد.</div>',acts:[A('مصادر البيانات','go',{v:'data',pri:true})],steps:[stepsScope()]};
 let h='<div><b>مقارنة المنصات</b> ('+esc(scopeTxt0())+'):</div><ul>'+pls.map(x=>'<li><b>'+PLAT[x.p]+'</b> ('+mAd(x.n)+(x.official?'، منها '+fmt(x.official)+' رسمية أو إعلامية':'')+'): '+sentLine(x)+(x.negTop?' · أكثر شكوى «'+ASPECTS[x.negTop.a].label+'»':'')+(x.posTop?' · أكثر إشادة «'+ASPECTS[x.posTop.a].label+'»':'')+'</li>').join('')+'</ul>';
 const negs=[...new Set(pls.filter(x=>x.negTop).map(x=>x.negTop.a))];
 if(pls.filter(x=>x.negTop).length>1)h+=negs.length===1?'<div>الشكوى الأبرز واحدة في المنصات: «'+ASPECTS[negs[0]].label+'».</div>':'<div>الشكوى الأبرز تختلف بين المنصات: '+pls.filter(x=>x.negTop).map(x=>PLAT[x.p]+' «'+ASPECTS[x.negTop.a].label+'»').join('، ')+'.</div>';
 const tp=topicStats(scopeItems(V.ui.season,Object.assign({},V.ui,{plat:'all'}))).filter(t=>t.plats.size>=2).slice(0,3);
 h+=tp.length?'<div>مواضيع ظهرت في أكثر من منصة: '+tp.map(t=>esc(ASPECTS[t.a].label)+' ('+[...t.plats].map(q=>PLAT[q]).join(' + ')+')').join('، ')+'.</div>':'<div>ما ظهر موضوع مشترك بين المنصات بما يكفي في هذا النطاق.</div>';
 if(pls.some(x=>x.p==='tiktok'||x.p==='x'))h+='<div class="note warn">منشورات تيك توك وX غالبًا عناوين ومنشورات صنّاع محتوى وإعلام وليست تعليقات زوار، فمقارنتها بقوقل ماب تقريبية.</div>';
 const acts=[A('جدول المنصات','go',{v:'happened',pri:true})];pls.filter(x=>x.p==='tiktok'||x.p==='x').slice(0,2).forEach(x=>acts.push(A('عرض '+PLAT[x.p],'platEv',{p:x.p})));
 return {h,acts,steps:[stepsScope(),'جمعت مواد '+pls.length+' منصات','حسبت المشاعر والجوانب لكل منصة','قارنت بين المنصات']};
}
function sentimentAnswer(){
 const c=V.cur,s=c.sent;
 if(!s||!s.n)return {h:'<div>ما فيه آراء زوار كافية في هذا النطاق لحساب المشاعر.</div>',acts:[A('البيانات','go',{v:'data'})],steps:[stepsScope()]};
 let h=(s.n<15?'<div class="note warn">الآراء في هذا النطاق قليلة ('+fmt(s.n)+')، فالأرقام اتجاه مبدئي فقط.</div>':'')+'<div><b>مشاعر الآراء</b> ('+esc(scopeTxt())+'):</div><div>إيجابي '+pc(s.pos/s.n)+' ('+fmt(s.pos)+') · محايد '+pc(s.neu/s.n)+' ('+fmt(s.neu)+') · سلبي '+pc(s.neg/s.n)+' ('+fmt(s.neg)+') من '+mAd(s.n)+'.</div>';
 if(V.plats.length>1)h+='<ul>'+V.plats.map(x=>'<li><b>'+PLAT[x.p]+'</b>: '+sentLine(x)+'</li>').join('')+'</ul>';
 h+='<div class="small">قوقل ماب: من النجوم حين تتوفر وإلا من النص. تيك توك وX: من كلمات المدح والذم والجوانب المذكورة، وما بلا رأي واضح يُحسب محايدًا.</div>'+demoNote();
 return {h,acts:[A('أمثلة سلبية','ev',{id:cev('آراء سلبية',i=>i.sent==='neg')}),A('أمثلة إيجابية','ev',{id:cev('آراء إيجابية',i=>i.sent==='pos')}),A('جدول المنصات','go',{v:'happened'})],steps:[stepsScope(),'صنّفت '+fmt(s.n)+' مادة: إيجابي ومحايد وسلبي','قسّمتها حسب المنصة']};
}
function topicsAnswer(){
 const ts=V.topics.slice(0,5);
 if(!ts.length)return {h:'<div>ما ظهرت مواضيع متكررة في هذا النطاق.</div>',acts:[A('البيانات','go',{v:'data'})],steps:[stepsScope()]};
 const h='<div><b>أكثر المواضيع ذكرًا</b> ('+esc(scopeTxt())+'):</div><ul>'+ts.map(t=>'<li><b>'+esc(ASPECTS[t.a].label)+'</b>: '+fmt(t.n)+' ذكرًا (اشتكوا '+fmt(t.neg)+' · أشادوا '+fmt(t.pos)+(t.neu?' · محايد '+fmt(t.neu):'')+') · '+[...t.plats].map(q=>PLAT[q]).join('، ')+'</li>').join('')+'</ul><div class="small">العدّ بالذكر في المادة، وقد تذكر المادة الواحدة أكثر من موضوع.</div>';
 const a0=ts[0].a;
 return {h,acts:[A('أمثلة: '+ASPECTS[a0].label,'ev',{id:cev(ASPECTS[a0].label+': آراء الزوار',i=>i.aspects.some(z=>z.a===a0)),pri:true}),A('المواضيع','go',{v:'happened'})],steps:[stepsScope(),'عددت الجوانب المذكورة في كل مادة','رتّبتها حسب عدد الذكر']};
}
function textSearch(q){
 const nq=cn(q).replace(/^ال/,'').trim(),fn=i=>norm(i.text).includes(nq);
 const hits=P.items.filter(i=>fn(i)&&i.intent!=='official');
 if(!hits.length)return {h:'ما لقيت في البيانات الحالية مواد تذكر «'+esc(q)+'».'+'',acts:[A('البيانات','go',{v:'data'})],steps:['بحثت في '+fmt(P.items.length)+' مادة','ما وجدت تطابقًا']};
 const web=hits.filter(i=>i.platform==='tiktok'||i.platform==='x').length,seasons=[...new Set(hits.map(i=>i.season))];
 const top=hits.slice().sort((p,q)=>(q.likes-p.likes)||(q.publishedAt||'').localeCompare(p.publishedAt||'')).slice(0,3);
 const h='<div>وجدت <b>'+fmt(hits.length)+'</b> مادة تذكر «'+esc(q)+'» في '+seasons.length+(seasons.length===1?' موسم':' مواسم')+(web?' (منها '+web+' من تيك توك وX)':'')+':</div>'+top.map(cq).join('')+'<div class="small">هذا بحث نصي في المواد المحمّلة، وليس إحصاءً.</div>';
 return {h,acts:[A('كل المواد','ev',{id:cev('مواد تذكر «'+q+'»',fn,true),pri:true})],steps:['بحثت عن «'+q+'» في '+fmt(P.items.length)+' مادة','استبعدت المواد الرسمية']};
}
function statusAnswer(v){
 ACT.status({dataset:{v}});
 const m=mode();
 return {h:'<div>تمام، حالة الفعالية الحين: <b>'+(m==='live'?'ما زالت قائمة':'انتهت')+'</b>. التوصيات صارت: «'+(m==='live'?'تحسينات تقدرون تسوونها الحين':'توصيات للموسم القادم')+'».</div>',acts:[A('التوصيات','go',{v:'recs',pri:true})],steps:['غيّرت حالة الفعالية','أعدت ترتيب التوصيات']};
}
function updateAnswer(){
 return {h:'<div>ما عندنا اتصال مباشر بأي منصة (هذا ضمن «قريبًا»)، فالتحديث يتم بإضافة بيانات جديدة: ارفعوا ملفًا جديدًا واختاروا منصته، أو ألصقوا تعليقات. ما يتكرر لا يُحسب مرتين، وبعدها نعرض لكم «الجديد منذ آخر تحليل».</div>',acts:[A('البيانات','go',{v:'data',pri:true})],steps:[]};
}

/* ---------- router ---------- */
function route(t,ent){
 chatLast=t;
 const has=r=>r.test(t);
 if(has(/^(?:مرحبا|اهلا|هلا|السلام|صباح|مساء|hi\b|hello)/)&&t.length<30)return {h:'أهلًا. اسألوني عن جانب في الفعالية أو منطقة، أو قولوا «أعطني تقرير» أو «كم متوسط النجوم؟».',acts:[],steps:[]};
 if(has(/شكرا|يعطيك العافيه|thanks/))return {h:'العفو. إذا بغيتم شيئًا ثانيًا أنا موجود.',acts:[],steps:[]};
 if(has(/تقرير|report|pdf|تنزيل|نزل|معاينه/)){if(!activeRows().length)return emptyAnswer();applyEnt(ent);return reportAnswer()}
 if(has(/كاميرا|كاميرات|camera|مباشر|(?<![a-z])live(?![a-z])|ربط|(?<![a-z])api(?![a-z])|اتصال|تقاريري|رفع تقارير|قريبا|الميزات القادمه|ميزات قادمه|وش الجاي/))return futureAnswer();
 if(has(/فعاليه جديده|فعاليه ثانيه|فعاليه اخري|غير الفعاليه|بدل الفعاليه|اضافه فعاليه|فعاليات|اي فعاليه/))return eventsAnswer();
 if(has(/(?:^|\s)(?:حدث|تحديث|update|refresh)/)||has(/اجمع.*جديد/))return updateAnswer();
 if(has(/(?:الفعاليه|الموسم|المهرجان)/)&&has(/(?:انتهت|خلصت|منتهيه|انتهي)/))return statusAnswer('ended');
 if(has(/(?:لسا|لسه|ما زالت|مازالت|للحين)/)&&has(/(?:قائمه|شغاله|مستمره|شغال)/))return statusAnswer('live');
 if(has(/وش تقدر|ايش تقدر|وش تسوي|ايش تسوي|مساعده|ساعدني|كيف استخدم|help|what can you/))return helpAnswer();
 if(has(/مصدر|من وين|كم عينه|كم راي|دقه|تصنيف|موثوق|وش البيانات|ايش البيانات|البيانات اللي عندك|البيانات الي عندك|source|accuracy|sample/)&&!ent.aspects.length)return dataAnswer();
 if(!activeRows().length)return emptyAnswer();
 if(has(/نجوم|نجمه|نجمات|stars|rating|متوسط التقييم|معدل التقييم|متوسط التقيم/))return starsAnswer();
 const sv=t.match(/(?:^|\s)(?:ابحث|بحث|دور|لاقي|لقي)\s*(?:لي\s*)?(?:عن|على|في|ب)?\s*(.+)$/);
 if(sv&&!ent.aspects.length&&!ent.area&&sv[1].trim().length>=2)return textSearch(sv[1].trim());
 applyEnt(ent);
 const asp=ent.aspects;
 const REC=/توصي|اقتراح|اقترح|وش اسوي|ايش اسوي|ايش نسوي|وش نسوي|وش القرار|قرار|اجراء|ماذا نفعل|recommend|what should/;
 if(!asp.length&&!has(REC)&&(ent.plat||has(/منصه|منصات|سوشال|سوشل|كلمات مفتاحيه|كي ?ورد|keyword/)))return platformsAnswer(ent.plat);
 if(!asp.length&&has(/مشاعر|sentiment|محايد|نسبه الايجابي|نسبه السلبي|ايجابي وسلبي|سلبي وايجابي|توزيع الاراء|كم.*(?:ايجابي|سلبي)/))return sentimentAnswer();
 if(!asp.length&&has(/مواضيع|موضوع|topics|اكثر ما يذكر|اكثر ذكرا|الاكثر ذكرا|الاكثر تكرارا|وش يتكلمون|ايش يتكلمون|يتكلمون عن/))return topicsAnswer();
 if(has(/تغطيه|ما عندنا بيانات|ناقصه/)||(has(/بيانات/)&&has(/(?:مناطق|منطقه)/)))return coverage();
 if(has(/(?:منطقه|مناطق)/)&&has(/(?:اكثر|اسوا|اعلي|اهم|افضل|احسن|ترتيب)/)&&!ent.area)return arearank();
 if(has(REC))return recsAnswer(asp);
 if(has(/فرص|فرصه|فكره|افكار|محتوي|opportunit|content idea/))return oppsAnswer();
 if(has(/دليل|ادله|اثبات|مقتطف|تعليقات|وش يقولون|ايش يقولون|شو يقولون|وش قالوا|امثله|evidence|quotes/))return evidenceAnswer(asp);
 if(has(/مراحل|مرحله|رحله|stage|journey/)&&!asp.length)return stagesAnswer();
 if(has(/نقاط القوه|احسن|افضل|ايجابي|مميز|يعجب|اعجب|strength|best/)&&!asp.length)return strengthsAnswer();
 if(has(/اسوا|اكبر مشكله|اهم مشكله|تحديات|شكاوي|مشاكل|مشكله|عوائق|ازعج|نقاط الالم|معاناه|pain|worst|problems|issues/)&&!asp.length)return worstAnswer();
 if(asp.length){const bs=asp.slice(0,2).map(aspectBlock);return {h:weakNote()+bs.map(b=>b.h).join('<hr class="cl">')+demoNote(),acts:bs.flatMap(b=>b.acts).slice(0,5),steps:[stepsScope(),stepsData()].concat(bs[0].steps)}}
 if(ent.area)return areaAnswer(ent.area);
 if(has(/قارن|مقارنه|مقابل|السابق|الماضي|compare|vs/))return compareAnswer();
 if(has(/وش تغير|ايش تغير|شو تغير|تغير|الجديد|هذا الاسبوع|هالاسبوع|ملخص|وضع|وش صار|what changed|summary|overview/))return summaryAnswer();
 if(has(/موسم|فتره|يوم|ايام/)&&(ent.season||ent.period))return summaryAnswer();
 return {h:'ما فهمت طلبكم بدقة. أقدر أجاوب عن جانب (الانتظار، الزحام، الأسعار، الأكل…) أو منطقة أو موسم، وأعطيكم تقريرًا أو توصيات، وأقول لكم متوسط النجوم. جرّبوا أحد الاقتراحات تحت.',acts:[],steps:[]};
}

/* ---------- chat window ---------- */
function addMsg(kind,html){const el=document.createElement('div');el.className='m '+kind;el.innerHTML=html;$('chatLog').appendChild(el);scrollLog();return el}
function scrollLog(){const l=$('chatLog');l.scrollTop=l.scrollHeight}
async function showReply(r){
 const el=addMsg('a',(r.steps&&r.steps.length?'<details class="tr" open><summary>أراجع البيانات…</summary><ul></ul></details>':'')+'<div class="body"></div><div class="acts"></div>');
 const ul=el.querySelector('ul');
 if(ul){for(const s of r.steps){await sleep(STEP_MS);const li=document.createElement('li');li.textContent=s;ul.appendChild(li);scrollLog()}await sleep(STEP_MS*.7);const d=el.querySelector('details');d.querySelector('summary').textContent='كيف وصلت للجواب ('+r.steps.length+')';d.open=false}
 el.querySelector('.body').innerHTML=r.h;el.querySelector('.acts').innerHTML=(r.acts||[]).map(actBtn).join('');scrollLog();
 if(r.after)r.after();
}
async function chatSend(text){
 text=String(text||'').trim();if(!text||chatBusy)return;
 chatBusy=true;$('chatIn').value='';addMsg('u',esc(text));
 try{
  const t=cn(text),ent={aspects:detAspects(t),area:detArea(t),season:detSeason(t),period:detPeriod(t),plat:detPlat(t)};
  let r;try{r=route(t,ent)}catch(e){r={h:'تعثّر تحليل هذا الطلب. جرّبوا صياغة أخرى.',acts:[],steps:[]}}
  await showReply(r);
 }finally{chatBusy=false}
}
function renderChatScope(){const e=$('chatScope');if(e&&V&&V.ui)e.textContent='يعمل على: '+scopeTxt()}
function setChat(on){document.body.classList.toggle('chat-open',on);$('chat').classList.toggle('on',on);if(on){setTimeout(()=>{try{$('chatIn').focus({preventScroll:true})}catch(e){}},50)}}
const narrow=()=>window.matchMedia&&window.matchMedia('(max-width:999px)').matches;
ACT.chatClose=()=>setChat(false);
ACT.chip=t=>{if(!$('chat').classList.contains('on'))setChat(true);chatSend(t.dataset.q)};
ACT.cdo=t=>{
 applyCs(t.dataset.cs);const w=t.dataset.do;
 if((w==='go'||w==='area')&&narrow())setChat(false);
 if(w==='ev'){const e=CEV[t.dataset.id];if(e){D={title:e.title,fn:e.fn,g:6,t:4,all:e.all};renderDrawer()}}
 else if(w==='save')ACT.saveRec({dataset:{key:t.dataset.key}});
 else if(w==='report')openPreview();
 else if(w==='dl')makeReport();
 else if(w==='go')ACT.tab({dataset:{v:t.dataset.v}});
 else if(w==='area')ACT.area({dataset:{id:t.dataset.id}});
 else if(w==='platEv'){if(narrow())setChat(false);ACT.platEv(t)}
};
const CHIPS=['قارن بين المنصات','كيف مشاعر الزوار؟','وش أكثر ما أزعج الزوار؟','وش أعجب الزوار؟','وش أهم توصية؟','أعطني تقرير'];
function initChat(){
 $('chatChips').innerHTML=CHIPS.map(q=>'<button class="chipb" type="button" data-act="chip" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('');
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();chatSend($('chatIn').value)});
 $('btnChat').addEventListener('click',()=>setChat(!$('chat').classList.contains('on')));
 $('chatFab').addEventListener('click',()=>setChat(true));
 addMsg('a','<div class="body"><div>أهلًا، أنا مستشار الفعالية. اسألوني عن آراء الزوار: المشاعر، الشكاوى المتكررة، ما أعجبهم، المقارنة بين المنصات، أو اطلبوا «تقرير». أجاوب من البيانات المجمّعة فقط.</div>'+(demoOn()?'<div class="small" style="margin-top:6px">بيانات بوليفارد وورلد مجمّعة مسبقًا، وليست اتصالًا مباشرًا بأي منصة.</div>':'')+'</div>');
 if(window.matchMedia&&window.matchMedia('(min-width:1200px)').matches)setChat(true);
}
