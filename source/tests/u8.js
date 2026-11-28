const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const pg=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
 await pg.goto('file://'+__dirname+'/../advisor_simple.html');await pg.waitForTimeout(800);
 await pg.screenshot({path:'v_data.png'});
 for(const t of ['happened','recs']){await pg.click('#tabs .tab[data-tab='+t+']');await pg.waitForTimeout(400);await pg.screenshot({path:'v_'+t+'.png'});
  console.log(t,'height',await pg.evaluate(()=>document.documentElement.scrollHeight))}
 console.log('data height');await b.close();})();
