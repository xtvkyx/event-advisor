(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const mAd=n=>n===0?'لا مواد':n===1?'مادة واحدة':n===2?'مادتان':(n>=3&&n<=10)?n+' مواد':fmt(n)+' مادة';
const mq=n=>n===1?'مصدر واحد مستقل':n===2?'مصدران مستقلان':(n>=3&&n<=10)?n+' مصادر مستقلة':fmt(n)+' مصدرًا مستقلًا';
const clone=o=>JSON.parse(JSON.stringify(o));
const dnum=s=>{const p=s.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2])/864e5};
const dstr=n=>new Date(n*864e5).toISOString().slice(0,10);
const MON=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const dAr=s=>{if(!s)return '—';const p=s.split('-').map(Number);return p[2]+' '+MON[p[1]-1]+' '+p[0]};
const addDays=(s,n)=>dstr(dnum(s)+n);

/* ---------- reference data ---------- */
const AREAS0=[
 {id:'tr',name:'تركيا',en:'Turkey',first:'2024/25'},{id:'ir',name:'إيران',en:'Iran',first:'2024/25'},
 {id:'af',name:'أفريقيا',en:'Africa',first:'2024/25'},{id:'cv',name:'كورشوفيل',en:'Courchevel',first:'2024/25'},
 {id:'sa',name:'السعودية',en:'Saudi Arabia',first:'2024/25'},
 {id:'cn',name:'الصين',en:'China',first:'2025/26'},{id:'id',name:'إندونيسيا',en:'Indonesia',first:'2025/26'},
 {id:'kr',name:'كوريا الجنوبية',en:'South Korea',first:'2025/26'},{id:'kw',name:'الكويت',en:'Kuwait',first:'2025/26'},
 {id:'nl',name:'هولندا',en:'Netherlands',first:'2026/27'},{id:'pt',name:'البرتغال',en:'Portugal',first:'2026/27'},{id:'ye',name:'اليمن',en:'Yemen',first:'2026/27'}
];
const DEF={
 event:'بوليفارد وورلد',
 seasons:[
  {id:'2024/25',open:'2024-10-13',note:'تاريخ الافتتاح من What\u2019s On Saudi Arabia'},
  {id:'2025/26',open:'2025-10-10',note:'افتتاح موسم الرياض 2025. تاريخ افتتاح المنطقة نفسها غير مؤكد'},
  {id:'2026/27',open:'2026-10-21',note:'افتتاح موسم الرياض 2026 بحسب Gulf News. تاريخ افتتاح المنطقة نفسها غير مؤكد'}],
 areas:AREAS0,
 dict:{
  names:['بوليفارد وورلد','بوليفارد ورلد','بوليفارد وورلد الرياض','Boulevard World Riyadh','Boulevard World','BLVD World'],
  hashtags:['#بوليفارد_وورلد','#بوليفارد_ورلد','#BoulevardWorld'],
  directed:['وش الجديد','أرجع له','ما عرفت وين','يستاهل','زحمة','غالي'],
  excl:['Boulevard City','Boulevard Runway','BLVD Runway','BLVD City','بوليفارد سيتي','بوليفارد رنوي','بوليفارد رانواي']}
};
const ASPECTS={
 wait:{label:'الانتظار والطوابير',verb:'خفّفوا الانتظار',stage:'exp',ease:2,team:'فريق التشغيل',defNeg:true,
  act:A=>'توزيع الدخول على فترات زمنية وعرض وقت الانتظار الحالي على شاشة المدخل'+A+'، مع فتح مسار حجز مسبق للتجارب الأكثر طلبًا.'},
 crowd:{label:'الزحام',verb:'خفّفوا الزحام',stage:'move',ease:2,team:'فريق العمليات والسلامة',defNeg:true,
  act:A=>'تحديد ساعات الذروة من المنشورات، وإعلان أوقات أهدأ، وتنظيم اتجاه السير'+A+'.'},
 entry:{label:'الوصول والدخول',verb:'سهّلوا الوصول والدخول',stage:'arrive',ease:2,team:'فريق البوابات والمواقف',
  act:A=>'إضافة لوحات إرشاد للبوابات والمواقف ونشر دليل وصول مصوّر لأقرب بوابة'+A+'.'},
 booking:{label:'الحجز والتذاكر',verb:'بسّطوا الحجز',stage:'plan',ease:2,team:'فريق التذاكر والتطبيق',
  act:()=>'تبسيط خطوات الحجز، وإظهار رسالة واضحة عند تعذّر الدفع، وقياس شكاوى الحجز أسبوعيًا.'},
 wayfinding:{label:'الإرشاد والتوجيه',verb:'وضّحوا الإرشاد',stage:'move',ease:3,team:'فريق المحتوى واللوحات الإرشادية',
  act:A=>'نشر مسار مصوّر من أقرب بوابة'+A+'، وإضافة لوحات توجيه عند التقاطعات.'},
 price:{label:'الأسعار',verb:'راجعوا الأسعار',stage:'exp',ease:1,team:'فريق الشراكات والتسعير',
  act:A=>'تقديم باقات اقتصادية بجانب القائمة الحالية'+A+'، وإظهار الأسعار قبل الدخول.'},
 food:{label:'الأكل والمطاعم',verb:'حسّنوا الأكل',stage:'exp',ease:2,team:'فريق المطاعم والشركاء',
  act:A=>'مراجعة جودة وتنوع المطاعم'+A+' مع الشركاء، وإبراز الأطباق الأكثر مدحًا.'},
 shows:{label:'العروض والفعاليات',verb:'حدّثوا العروض',stage:'exp',ease:2,team:'فريق البرامج والعروض',
  act:A=>'مراجعة جدول العروض'+A+' وتحديث التجارب التي تتكرر الشكوى منها.'},
 vendors:{label:'البائعون',verb:'اضبطوا سلوك البائعين',stage:'exp',ease:2,team:'فريق الشركاء والتشغيل',defNeg:true,
  act:A=>'وضع إرشادات سلوك للبائعين (عدم الإلحاح) ومراقبة ميدانية أسبوعية'+A+'.'},
 clean:{label:'النظافة والمرافق',verb:'ارفعوا النظافة',stage:'exp',ease:3,team:'فريق النظافة والمرافق',
  act:A=>'زيادة جولات النظافة في أوقات الذروة وإضافة نقاط خدمة'+A+'.'}
};
const AKEYS=Object.keys(ASPECTS);
const STAGES=[
 {id:'plan',name:'التخطيط والحجز',asp:['booking']},{id:'arrive',name:'الوصول والدخول',asp:['entry']},
 {id:'move',name:'التنقل',asp:['crowd','wayfinding']},{id:'exp',name:'خوض التجارب واستخدام الخدمات',asp:['wait','price','food','shows','vendors','clean']},
 {id:'leave',name:'المغادرة والرغبة في العودة',asp:[]}];
const STG=Object.fromEntries(STAGES.map(s=>[s.id,s]));
const TOPIC={
 where:{label:'الوصول والبوابات',idea:'دليل وصول مصوّر لكل منطقة (من أي بوابة؟)',stage:'move',test:'انشروا مسارًا مصوّرًا لمنطقة واحدة مدة أسبوع، وقارنوا نسبة أسئلة الوصول قبل النشر وبعده.'},
 price:{label:'الأسعار والتذاكر',idea:'صفحة أسعار وباقات مبسّطة',stage:'plan',test:'انشروا مقطعًا واحدًا يشرح الأسعار والباقات، وتابعوا عدد أسئلة السعر خلال أسبوع.'},
 new:{label:'الجديد هذا الموسم',idea:'ملخص «الجديد هذا الموسم» بصيغة مقطع قصير',stage:'plan',test:'انشروا ملخصًا أسبوعيًا قصيرًا، وقارنوا أسئلة «وش الجديد» قبله وبعده.'},
 food:{label:'المطاعم',idea:'دليل مطاعم لكل منطقة',stage:'exp',test:'انشروا دليلًا مصوّرًا لمطاعم منطقة واحدة، وتابعوا أسئلة «وين آكل» لأسبوع.'},
 worth:{label:'ماذا أزور أولًا؟',idea:'مسار زيارة مقترح لنصف يوم',stage:'plan',test:'انشروا مسارًا واحدًا لنصف يوم، وتابعوا أسئلة «يستاهل؟ وش فيه؟» لأسبوع.'}
};
const TRANSFER={
 wait:{ok:'تجربة عالية الطلب بنقطة دخول واحدة وطابور يتراكم في الذروة.',check:'طاقة التشغيل الفعلية وطول الطابور المقاس ميدانيًا، فالعينة تقيس الشكاوى لا مدة الانتظار.'},
 crowd:{ok:'منطقة ضيقة أو ممر مشترك بين تجارب كثيرة.',check:'مخطط الممرات والسعة القصوى، وما إذا كانت الذروة تتكرر في الأيام نفسها.'},
 entry:{ok:'فعالية بعدة بوابات ومواقف متفرقة.',check:'خريطة البوابات والمواقف الحالية وأقرب بوابة لكل منطقة.'},
 booking:{ok:'فعالية تعتمد على الحجز المسبق عبر تطبيق أو موقع.',check:'سجلات أخطاء الحجز، فالمنشورات قد لا تغطي كل الأعطال.'},
 wayfinding:{ok:'فعالية بمناطق متعددة ومناطق جديدة كل موسم.',check:'اللوحات الموجودة فعلًا ومواقع التقاطعات.'},
 price:{ok:'فعالية فيها مطاعم وبيع داخل الموقع.',check:'قوائم الأسعار الفعلية وهوامش الشركاء والتعاقدات.'},
 food:{ok:'فعالية فيها مطاعم متعددة.',check:'جودة التشغيل اليومية وعقود الشركاء.'},
 shows:{ok:'فعالية بجدول عروض متكرر.',check:'جدول العروض وتكرارها لكل منطقة.'},
 vendors:{ok:'فعالية بأجنحة بيع متجاورة.',check:'عقود البائعين وإمكانية فرض إرشادات سلوك.'},
 clean:{ok:'فعالية طويلة المدة بزوار كثيرين.',check:'جولات النظافة الحالية وتوزيع المرافق.'}
};
const CAN_TRANSFER=['معرض','مهرجان','منطقة ترفيهية','فعالية رياضية'];

/* ---------- Arabic/English text rules (editable dictionary lives in settings) ---------- */
const AB='\\u0621-\\u064A\\u0671-\\u06D3';
const norm=s=>String(s||'').toLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/(?<=[a-z])-(?=[a-z])/g,' ').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[#_]/g,' ').replace(/\s+/g,' ').trim();
const isLat=t=>/^[a-z0-9' ]+$/.test(t);
const rx=t=>{t=norm(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return isLat(t)?'(?<![a-z])'+t.replace(/ /g,'\\s+')+'(?![a-z])':t.replace(/ /g,'\\s+')};
const src=list=>list.map(rx).join('|');
const re=(list,f)=>new RegExp(src(list),f||'');
const word=t=>isLat(t)?'(?<![a-z\'])'+t+'(?![a-z])':'(?<!['+AB+'])'+t+'(?!['+AB+'])';
const AKW={
 wait:['انتظار','انتظرنا','ننتظر','طابور','طوابير','تأخير','تأخرنا','queue','queues','queueing','wait','waiting','waited','long line','lines'],
 crowd:['زحمة','زحام','مزدحم','ازدحام','crowd','crowded','packed','jammed','congested'],
 entry:['موقف','مواقف','بوابة','بوابات','المدخل','مدخل','دخول','باص','باصات','شتل','النقل','المواصلات','parking','entrance','gate','gates','entry','security check','shuttle','bus','buses','transport'],
 booking:['حجز','احجز','حجزنا','التطبيق','تطبيق','booking','book','booked','app','website','الموقع'],
 wayfinding:['ضيعنا','ضعنا','ما عرفنا وين','ما عرفت وين','وين المطعم','لافتة','لافتات','لوحات توجيه','خريطة','اتجاهات','توجيه','لقينا','lost','signs','signage','directions','find our way','where is'],
 price:['غالي','غالية','أسعار','الأسعار','سعر','رخيص','مبالغ','أغلى','تذكرة','تذاكر','التذكرة','التذاكر','expensive','price','prices','cost','overpriced','ripoff','rip off','cheap','pricey','ticket','tickets'],
 food:['أكل','الأكل','مطعم','مطاعم','وجبة','وجبات','قهوة','حلى','أكلات','food','restaurant','restaurants','eat','coffee','dessert','meal','cuisine','dishes'],
 shows:['عرض','عروض','فعالية','فعاليات','حفل','مسرح','show','shows','performance','performances','parade','activities','activity','experiences','attractions','games'],
 vendors:['بياع','بياعين','البياعين','بائع','بائعين','البائعين','إلحاح','يلحون','vendor','vendors','pushy','seller','sellers','salesman','aggressive'],
 clean:['نظافة','نظيف','نظيفة','وسخ','وسخة','أوساخ','حمامات','دورات مياه','clean','dirty','dusty','toilet','toilets','restroom','restrooms','cleanliness']
};
const AK={};for(const a in AKW)AK[a]=re(AKW[a]);
const NEG_L=['شديد','شديدة','غالي','غالية','مبالغ','طويل','سيء','سييء','سيئة','فشل','مزعج','وسخ','خايس','ممل','تعب','بطيء','بطي','خسرنا','ضيعنا','ضعنا','مشكلة','أسوأ','صعب','ضيق','خانق','مرهق','بارد','ما عرفنا','ما عرفت','ما عجب','expensive','overpriced','long','bad','worst','rude','pushy','aggressive','dirty','dusty','disappoint','poor','waste','terrible','slow','lost','boring','messy','annoying','rip off','ripoff','chaos','confusing','difficult','nightmare','exhausting','repetitive'];
const POS_L=['يستاهل','حلو','حلين','رهيب','روعة','رائع','ممتع','ممتاز','جميل','أحلى','لذيذ','نظيف','منظم','سلس','سريع','قصير','قليل','معقول','مريح','مرتب','مبدع','إبداع','أفضل','تحسن','واضح','سهل','محترم','great','amazing','love','loved','beautiful','enjoy','enjoyable','improved','excellent','good','nice','fun','worth','clean','smooth','best','wonderful','awesome','delicious','perfect','short','fast','quick','organized','reasonable','cheap','lovely','fantastic','impressive','easy','clear','friendly','respectful'];
const NEG_R=re(NEG_L,'g'),POS_R=re(POS_L,'g');
const NEGW=['ما','مو','غير','لا','not','no','never','without',"isn't","wasn't","don't","didn't","couldn't","won't","wouldn't"].map(word).join('|');
const NEGP=new RegExp('(?:'+NEGW+')\\s+(?:\\S+\\s+)?(?:'+src(POS_L)+')','g');
const NEGNEG=new RegExp('(?:'+NEGW+')\\s+(?:\\S+\\s+)?(?:(?:مره|جدا|كثير|ابدا)\\s+)?(?:'+src(NEG_L)+')','g');
const WAYCUE=re(['ضيعنا','ضعنا','لقينا','ما عرفنا','ما عرفت','got lost','lost'],'g');
const NEGASP={};
for(const a of AKEYS){if(!ASPECTS[a].defNeg)continue;
 NEGASP[a]=new RegExp('(?:(?<!['+AB+'])(?:ما فيه|ما كان فيه|مافيه|بدون|ما في|ما كان|مافي)(?!['+AB+'])|(?<![a-z])(?:no|not|never|without|zero|hardly|barely|less|wasn\'t|isn\'t|weren\'t|aren\'t|didn\'t|don\'t|doesn\'t|couldn\'t)(?![a-z]))\\s+(?:\\S+\\s+){0,2}(?:'+src(AKW[a])+')')}
const VIS=re(['رحنا','رحت','زرت','زرنا','جربنا','جربت','رجعت','رجعنا','كنا','كنت','دخلنا','أكلنا','went','visited','tried','been','we were','i was','just got back']);
const OFFR=re(['احجز تذكرتك','احجز الآن','رابط الحجز','link in bio','buy tickets','get your tickets','book now','الحساب الرسمي','official account','sponsored','إعلان']);
const RET=re(['ارجع','راجع','رجعنا','بنرجع','بارجع','برجع','come back','go back','will return','visit again','come again','return again','be back']);
const NORET=new RegExp('(?:(?<!['+AB+'])(?:ما|مو|لا)(?!['+AB+'])\\s+(?:'+src(['ارجع','بارجع','برجع','راجع'])+')|won\'t (?:be back|return|come back)|never (?:again|coming back|come back))');
const CHANCE=re(['بالصدفة','صدفة','ما كنا نعرف','ما كنت أعرف','اكتشفنا','اكتشفت','ما درينا','stumbled','by chance',"didn't know",'discovered','hidden gem']);
const CLSPLIT=new RegExp('[.!?؟،,؛;:\\n]+|(?<!['+AB+'])(?:بس|لكن)(?!['+AB+'])|(?<![a-z])(?:but|however|though|although)(?![a-z])');
const cnt=(r,t)=>{r.lastIndex=0;return (t.match(r)||[]).length};
const LOWR=new RegExp('(?<!['+AB+'])قليل(?:ه|ين|ات)?(?!['+AB+'])','g');
const LOWOK=new Set(['wait','crowd','price','vendors']);
function judge(c,a,stars){
 let neg=0,pos=0,t=c;
 if(a!=='wayfinding')t=t.replace(WAYCUE,' ');
 t=t.replace(NEGP,()=>{neg++;return ' '});
 t=t.replace(NEGNEG,()=>{pos++;return ' '});
 pos=cnt(POS_R,t);neg+=cnt(NEG_R,t);
 if(!LOWOK.has(a)){const lw=Math.min(pos,cnt(LOWR,t));pos-=lw;neg+=lw}
 if(ASPECTS[a].defNeg){const ng=NEGASP[a].test(c);if(ng&&!neg)return 'pos';if(!pos&&!neg)return (stars!=null&&stars>=4)?'neu':'neg'}
 if(pos>neg)return 'pos';if(neg>pos)return 'neg';if(pos&&neg)return 'mix';return 'neu';
}
function qTopic(t){
 if(/(بوابه|اوصل|entrance|which gate|how to get|parking|موقف)/.test(t))return 'where';
 if(/(اكل|مطعم|مطاعم|(?<![a-z])eat(?![a-z])|restaurant|food)/.test(t))return 'food';
 if(/(كم|سعر|تذكره|تذاكر|price|how much|ticket)/.test(t))return 'price';
 if(/(جديد|(?<![a-z])new(?![a-z]))/.test(t))return 'new';
 if(/(وين|where)/.test(t))return 'where';
 return 'worth';
}
function classify(text,stars){
 const t=norm(text).replace(/ضيعنا وقتنا/g,'خسرنا وقتنا').replace(/(?<![a-z])(?:it|this|which|that|also|and|he|she|really|clearly)\s+shows(?![a-z])/g,' ');
 const out={aspects:[],intent:'visited',uncertain:false,ret:false,noret:false,chance:false,topic:null,gen:null};
 if(OFFR.test(t)){out.intent='official';return out}
 const isQ=/[؟?]/.test(text)||new RegExp('^(?:وين|كيف|كم|متي|هل|ايش|وش|where|how|when|what|is there)(?![a-z'+AB+'])').test(t);
 if(isQ&&!VIS.test(t)){out.intent='planning';out.topic=qTopic(t);return out}
 const pairs={};
 for(const cl of t.split(CLSPLIT)){const c=cl.trim();if(!c)continue;
  for(const a of AKEYS){if(AK[a].test(c)){(pairs[a]=pairs[a]||[]).push(judge(c,a,stars))}}}
 for(const a in pairs){const ps=pairs[a],s=new Set(ps.filter(x=>x!=='neu'));let p;
  if(s.size>1||ps.includes('mix')){out.uncertain=true;p='mix'}else p=s.size?[...s][0]:'neu';
  if(stars!=null&&stars<=2&&p==='pos')p='neu';
  out.aspects.push({a,p})}
 out.noret=NORET.test(t);out.ret=!out.noret&&RET.test(t);out.chance=CHANCE.test(t);
 const np=(()=>{let n=0,pp=0,t2=t.replace(NEGP,()=>{n++;return ' '}).replace(NEGNEG,()=>{pp++;return ' '});return {pos:cnt(POS_R,t2)+pp,neg:n+cnt(NEG_R,t2)}})();
 out.gen=np.neg>np.pos?'neg':np.pos>np.neg?'pos':null;
 if(!out.aspects.length&&!np.pos&&!np.neg&&!out.ret&&!out.noret)out.uncertain=true;
 return out;
}
