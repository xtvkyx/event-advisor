const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const pg=await (await b.newContext()).newPage();
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(600);
 const tx=['الزحمة شديدة والمواقف قليلة','المعرض كبير ورائع والعروض حلوة','الطابور عند الدخول كان طويل جدا وما فيه تنظيم','زحمة كبيرة','المكان زحمة مرة','الدخول سهل والتنظيم ممتاز','الزحمة قاتلة','الزحام شديد'];
 for(const t of tx){const r=await pg.evaluate(t=>{const c=window.__adv().classify(t,null);return JSON.stringify({a:c.aspects,intent:c.intent,gen:c.gen,unc:c.uncertain})},t);console.log(t,'=>',r)}
 await b.close();})();
