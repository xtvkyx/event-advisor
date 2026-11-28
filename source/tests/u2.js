const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/net::/.test(m.text()))errs.push('CONSOLE '+m.text())});
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(800);
 const qs=process.argv.slice(2).length?process.argv.slice(2):['قارن بين المنصات','وش يقولون في تيك توك؟','كيف مشاعر الزوار؟','وش أكثر المواضيع ذكرًا؟','وش أكثر ما أزعج الزوار؟','وش أعجب الزوار؟','كيف الانتظار في قوقل ماب؟','الأسعار في تيك توك','وش مراحل رحلة الزائر؟','وش أهم توصية؟','هل البيانات مباشرة من تيك توك؟','وش الميزات القادمة؟','وش في الكاميرات؟','ابحث عن التلفريك','وش مصدر البيانات؟','أضيف فعالية جديدة','كم متوسط النجوم؟','وش الشكاوى المتكررة؟','وش يقولون في X؟','وش تقدر تسوي؟'];
 for(const q of qs){
  await pg.evaluate(async q=>{await window.__adv().chatSend(q)},q);
  const r=await pg.evaluate(()=>{const m=[...document.querySelectorAll('#chatLog .m.a')].pop();return {t:m.querySelector('.body').innerText.slice(0,700),acts:[...m.querySelectorAll('.acts button')].map(x=>x.textContent),scope:document.getElementById('chatScope').textContent}});
  console.log('\n### '+q+'\n'+r.t+'\n[acts] '+r.acts.join(' | ')+'\n[scope] '+r.scope);
 }
 console.log('ERRS',JSON.stringify(errs));await b.close();
})();
