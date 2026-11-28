const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(()=>{window.__dl=[];window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__dl.push({f:o.filename,size:o.data.size});return {status:'saved'}}}:null}});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/net::/.test(m.text()))errs.push('CONSOLE '+m.text())});
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(700);
 const st=()=>pg.evaluate(()=>{const a=window.__adv();return {ev:a.S.eventId,name:a.S.settings.event,events:a.S.events.map(e=>e.name),src:a.srcTxt(),demo:a.demoOn(),items:a.P.items.length,N:a.V.cur.N,tab:a.S.ui.tab,plats:a.V.plats.map(x=>x.p+':'+x.n),status:document.getElementById('status').innerText.replace(/\s+/g,' ').slice(0,200)}});
 console.log('START',JSON.stringify(await st()));
 await pg.click('#tabs .tab[data-tab=data]');await pg.click('[data-act=showNewEv]');await pg.fill('#evName','معرض الرياض للكتاب');await pg.fill('#evKw','معرض الكتاب, الكتاب');await pg.click('[data-act=newEv]');await pg.waitForTimeout(500);
 console.log('NEWEV',JSON.stringify(await st()));
 await pg.screenshot({path:'u3_new_data.png',fullPage:true});
 for(const t of ['happened','recs']){await pg.click('#tabs .tab[data-tab='+t+']');await pg.waitForTimeout(300);console.log(t,(await pg.evaluate(()=>document.querySelector('#view,main,#app').innerText.replace(/\s+/g,' ').slice(0,400))));await pg.screenshot({path:'u3_new_'+t+'.png',fullPage:true})}
 await pg.evaluate(async()=>{await window.__adv().chatSend('قارن بين المنصات')});
 console.log('CHAT empty:',await pg.evaluate(()=>[...document.querySelectorAll('#chatLog .m.a')].pop().querySelector('.body').innerText));
 await pg.click('#btnPdf');await pg.waitForTimeout(600);
 console.log('PDF on empty ->', await pg.evaluate(()=>({pvOpen:document.getElementById('pv').classList.contains('on')||getComputedStyle(document.getElementById('pv')).display!=='none',toast:document.getElementById('toast').innerText})));
 await pg.evaluate(()=>{try{window.__adv().closePreview()}catch(e){}});
 // upload
 await pg.click('#tabs .tab[data-tab=data]');await pg.waitForTimeout(300);
 await pg.setInputFiles('#fFile',__dirname+'/fixtures/new_event.csv');await pg.waitForTimeout(300);
 await pg.click('#btnAnalyze');await pg.waitForTimeout(800);
 console.log('AFTER UPLOAD',JSON.stringify(await st()));
 const info=await pg.evaluate(()=>{const a=window.__adv();return {plats:a.V.plats.map(x=>({p:x.p,n:x.n,sent:x.sent})),topics:a.V.topics.map(t=>[t.a,t.n,t.pos,t.neg]),sources:a.S.sources,sel:a.V.sel,stars:a.starStats(a.V.items),recs:a.V.recs.length}});
 console.log(JSON.stringify(info));
 await pg.screenshot({path:'u3_up_data.png',fullPage:true});
 await pg.click('#tabs .tab[data-tab=happened]');await pg.waitForTimeout(400);await pg.screenshot({path:'u3_up_happened.png',fullPage:true});
 for(const q of ['قارن بين المنصات','وش أكثر ما أزعج الزوار؟','كيف مشاعر الزوار؟']){await pg.evaluate(async q=>{await window.__adv().chatSend(q)},q);console.log('\n##',q,'\n'+await pg.evaluate(()=>[...document.querySelectorAll('#chatLog .m.a')].pop().querySelector('.body').innerText.slice(0,600)))}
 // switch back to blvd
 await pg.click('#tabs .tab[data-tab=data]');await pg.selectOption('#evSel','blvd');await pg.waitForTimeout(500);
 console.log('\nBACK',JSON.stringify(await st()));
 await pg.reload();await pg.waitForTimeout(700);console.log('RELOAD',JSON.stringify(await st()));
 await pg.click('#tabs .tab[data-tab=data]');await pg.selectOption('#evSel',await pg.evaluate(()=>window.__adv().S.events[1].id));await pg.waitForTimeout(500);console.log('RELOAD→new',JSON.stringify(await st()));
 console.log('ERRS',JSON.stringify(errs));await b.close();
})();
