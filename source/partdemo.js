/* ---------- built-in demo event: Winter at Tantora (AlUla) ----------
   SIMULATED DATA FOR THE DEMO. These comments were written by the team to exercise the analysis.
   They are not from Google Maps, social media or real visitors. No permitted public visitor reviews
   specific to Winter at Tantora were found (searches only returned news and promotional pages).
   The rows go through the same parsing and classification as any uploaded file; nothing is pre-scored. */
const TANT_SIM=[
 'الحجز من التطبيق كان صعب والدفع علّق أكثر من مرة',
 'حجزنا من التطبيق وكان بطيء مرة ويطلع لنا خطأ',
 'تجربة الحجز سيئة، اخترت موعد وطلع لي غير متاح بعد الدفع',
 'The booking app was slow and confusing',
 'موقع الحجز فشل معي مرتين وما وصلتني رسالة التأكيد',
 'الحجز سهل وسريع من التطبيق',
 'مشكلة الحجز إن الأوقات تخلص بسرعة',
 'The booking app was bad, it kept crashing',
 'الباص بين البلدة القديمة ومرايا تأخر والانتظار طويل',
 'النقل بين المواقع مرهق، كل موقع يبي له باص لحاله',
 'المواقف بعيدة عن مرايا والمشي صعب في الليل',
 'Shuttle buses to Hegra were slow and packed',
 'المواصلات للحجر سيئة وما فيه تنظيم',
 'الدخول لمرايا سهل والباصات منظمة',
 'البوابة زحمة والتفتيش بطيء',
 'ضعنا بين البلدة القديمة وموقع الحفل، واللافتات قليلة',
 'ما عرفنا وين مدخل مسرح مرايا، الخريطة مو واضحة',
 'The signs at AlUla Old Town were confusing, we got lost twice',
 'التوجيه داخل الموقع ممتاز والمنظمين يساعدون',
 'حفل مرايا كان رهيب والصوت خيالي',
 'الحفل في مرايا روعة والتنظيم ممتاز',
 'عرض الإضاءة في البلدة القديمة ممتع',
 'Amazing concert at Maraya, the acoustics were perfect',
 'الحفل تأخر ساعة عن موعده وكان الانتظار مزعج',
 'الصوت في الحفل الخارجي مو واضح من الخلف',
 'العروض ممتعة للعائلة والأطفال انبسطوا',
 'The heritage experiences were great and well organized',
 'العرض في الحجر ممل وطويل',
 'الأكل في البلدة القديمة لذيذ والقهوة ممتازة',
 'مطاعم مرايا أسعارها مبالغ فيها',
 'القهوة الشعبية عند الخيام رهيبة',
 'خيارات الأكل قليلة قرب الحجر',
 'Food trucks near the Old Town were delicious',
 'التذاكر غالية مرة مقارنة بمدة الحفل',
 'تذكرة اليوم الواحد سعرها مبالغ فيه',
 'Tickets were expensive but worth it',
 'الأسعار معقولة في السوق الشعبي',
 'زحمة شديدة عند بوابة مرايا قبل الحفل',
 'الممرات في البلدة القديمة زحمة وقت الذروة',
 'ما فيه زحمة أبد في الصباح والجو حلو',
 'دورات المياه نظيفة ومرتبة',
 'دورات المياه قرب موقف الباصات وسخة',
 'انتظرنا طويل عند منطقة الشتل',
 'أجواء العلا في الشتاء روعة وتجربة ما تنتسى',
 'شتاء طنطورة يستاهل الزيارة',
 'التنظيم العام ممتاز والموظفين محترمين',
 'Beautiful festival, loved the atmosphere',
 'تجربة رائعة مع العائلة',
 'المكان جميل والطقس لطيف',
 'إن شاء الله برجع السنة الجاية',
 'We will come back next winter',
 'ما برجع إلا إذا رتبوا المواصلات',
 'الفعالية حلوة بس المواصلات بين المواقع متعبة',
 'Getting from Maraya back to the hotel by bus was a nightmare',
 'تطبيق الفعالية سهل ويوضح الجدول',
 'حجزت ورشة النجوم وكانت ممتعة',
 'السوق الشعبي في البلدة القديمة حلو',
 'ركوب المنطاد تجربة رهيبة'
];
const TANT_AREAS=[{id:'old',name:'البلدة القديمة',en:'Old Town',first:''},{id:'maraya',name:'مرايا',en:'Maraya',first:''},{id:'hegra',name:'الحجر',en:'Hegra',first:''}];
const TANT_SEASON='شتاء طنطورة (محاكاة)';
function tantDef(){
 const st=clone(DEF);st.event='شتاء طنطورة — العلا';st.seasons=[];st.areas=clone(TANT_AREAS);
 st.dict={names:['شتاء طنطورة','طنطورة','Winter at Tantora','Tantora'],hashtags:['#شتاء_طنطورة','#WinterAtTantora'],directed:DEF.dict.directed.slice(),excl:[]};
 return st;
}
let TANT_ROWS=null;
function tantoraRows(){
 if(!TANT_ROWS){
  const area=t=>{const n=norm(t);for(const a of TANT_AREAS){if(n.includes(norm(a.name))||n.includes(norm(a.en)))return a.id}return 'gen'};
  TANT_ROWS=rowsFromTable(TANT_SIM.map(text=>({text}))).rows.map((r,i)=>{const id='sim:t'+i;
   return Object.assign(r,{id,clipId:id,url:'',publishedAt:'',collectedAt:'2026-11-28',season:TANT_SEASON,area:area(r.text),platform:'sim',stars:null,review:false,noFilter:true,builtin:true,sim:true,demo:false})});
 }
 return TANT_ROWS;
}
