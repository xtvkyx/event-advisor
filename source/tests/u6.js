const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const pg=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(700);
 const st=()=>pg.evaluate(()=>{const a=window.__adv();return {demo:a.demoOn(),items:a.P.items.length,src:a.srcTxt(),season:a.V.ui.season}});
 console.log('0',JSON.stringify(await st()));
 await pg.click('#tabs .tab[data-tab=data]');await pg.click('[data-act=toggleBuiltin]');await pg.waitForTimeout(400);console.log('off',JSON.stringify(await st()));
 await pg.evaluate(async()=>{await window.__adv().chatSend('وش أكثر ما أزعج الزوار؟')});
 console.log(await pg.evaluate(()=>[...document.querySelectorAll('#chatLog .m.a')].pop().querySelector('.body').innerText));
 await pg.click('#tabs .tab[data-tab=recs]');await pg.waitForTimeout(300);console.log('recs empty:',await pg.evaluate(()=>document.querySelector('.card.empty,.empty')?document.querySelector('.card.empty,.empty').innerText.slice(0,120):'no .empty'));
 await pg.click('#tabs .tab[data-tab=data]');await pg.click('[data-act=toggleBuiltin]');await pg.waitForTimeout(400);console.log('on',JSON.stringify(await st()));
 console.log('ERRS',JSON.stringify(errs));await b.close();})();
