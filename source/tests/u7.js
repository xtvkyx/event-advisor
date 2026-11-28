const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(()=>{window.__dl=[];window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__dl.push({f:o.filename})}}:null}});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(700);
 const txt=s=>pg.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').slice(0,300):'-'},s);
 await pg.click('#tabs .tab[data-tab=data]');console.log('status bar:',await txt('#status'));
 console.log('data seg on:',await pg.evaluate(()=>[...document.querySelectorAll('#p-data .seg button.on')].map(b=>b.textContent)),'|',await pg.evaluate(()=>[...document.querySelectorAll('#p-data .small')].map(e=>e.innerText).filter(t=>/الحالة/.test(t))));
 await pg.click('#tabs .tab[data-tab=happened]');await pg.waitForTimeout(300);console.log('happened seg:',await pg.evaluate(()=>[...document.querySelectorAll('#p-happened .seg button.on')].map(b=>b.textContent)));
 await pg.click('#tabs .tab[data-tab=recs]');await pg.waitForTimeout(400);console.log('recs:',await txt('#p-recs'));
 await pg.screenshot({path:'u7_recs.png',fullPage:true});
 await pg.evaluate(async()=>{await window.__adv().chatSend('وش أهم توصية؟')});console.log('chat:',await pg.evaluate(()=>[...document.querySelectorAll('#chatLog .m.a')].pop().querySelector('.body').innerText.slice(0,500)));
 // manual toggle to ended and back
 await pg.click('#p-recs .seg button[data-v=ended]');await pg.waitForTimeout(300);console.log('after ended:',await txt('#status'));
 await pg.click('#tabs .tab[data-tab=data]');console.log('data note:',await pg.evaluate(()=>[...document.querySelectorAll('#p-data .small')].map(e=>e.innerText).filter(t=>/الحالة/.test(t))));
 await pg.click('#p-data .seg button[data-v=live]');await pg.waitForTimeout(300);console.log('back live:',await txt('#status'));
 // new event -> auto (ended)
 await pg.click('[data-act=showNewEv]');await pg.fill('#evName','فعالية تجريبية');await pg.click('[data-act=newEv]');await pg.waitForTimeout(400);
 console.log('new event mode:',await pg.evaluate(()=>[...document.querySelectorAll('#p-data .seg button.on')].map(b=>b.textContent)),await pg.evaluate(()=>[...document.querySelectorAll('#p-data .small')].map(e=>e.innerText).filter(t=>/الحالة/.test(t))));
 console.log('ERRS',JSON.stringify(errs));await b.close();})();
