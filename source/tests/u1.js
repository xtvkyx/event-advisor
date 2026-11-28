const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(()=>{window.__dl=[];window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__dl.push({f:o.filename,size:o.data.size});return {status:'saved'}}}:null}});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/net::/.test(m.text()))errs.push('CONSOLE '+m.text())});
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(900);
 const info=await pg.evaluate(()=>{const a=window.__adv();const V=a.V;return {demo:a.demoOn(),src:a.srcTxt(),ev:a.S.eventId,season:V.ui.season,sel:V.sel,N:V.cur.N,items:V.items.length,sent:V.cur.sent,
  plats:V.plats.map(x=>({p:x.p,n:x.n,off:x.official,sent:x.sent,neg:x.negTop&&x.negTop.a+':'+x.negTop.n,pos:x.posTop&&x.posTop.a+':'+x.posTop.n})),
  topics:V.topics.slice(0,6).map(t=>[t.a,t.n,t.pos,t.neg,[...t.plats].join('+')]),recs:V.recs.length,log:a.P.log,tab:a.S.ui.tab}});
 console.log(JSON.stringify(info,null,1));
 await pg.screenshot({path:'u_data.png',fullPage:true});
 for(const t of ['happened','recs']){await pg.click('#tabs .tab[data-tab='+t+']');await pg.waitForTimeout(400);await pg.screenshot({path:'u_'+t+'.png',fullPage:true})}
 console.log('ERRS',JSON.stringify(errs));await b.close();
})();
