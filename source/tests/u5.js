const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+__dirname+'/../advisor_simple.html');await pg.waitForTimeout(800);
 const ov=()=>pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,wide:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0&&!e.closest('.tw')&&getComputedStyle(e).position!=='fixed'}).slice(0,4).map(e=>e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().right))}));
 console.log('data',JSON.stringify(await ov()));await pg.screenshot({path:'m_data.png',fullPage:true});
 for(const t of ['happened','recs']){await pg.click('#tabs .tab[data-tab='+t+']');await pg.waitForTimeout(300);console.log(t,JSON.stringify(await ov()));await pg.screenshot({path:'m_'+t+'.png',fullPage:true})}
 // platform filter
 await pg.click('#tabs .tab[data-tab=happened]');await pg.selectOption('#fPlat','tiktok');await pg.waitForTimeout(400);
 console.log('plat filter',await pg.evaluate(()=>document.querySelector('.hero')?document.querySelector('.hero').innerText.replace(/\s+/g,' ').slice(0,200):'nohero'),JSON.stringify(await ov()));
 await pg.screenshot({path:'m_tiktok.png',fullPage:false});
 await pg.click('#btnChat');await pg.waitForTimeout(400);await pg.screenshot({path:'m_chat.png'});console.log('chat',JSON.stringify(await ov()));
 console.log('ERRS',JSON.stringify(errs));await b.close();
})();
