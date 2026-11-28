const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(()=>{window.__dl=[];window.claude={use:async n=>n==='downloads'?{save:async o=>{const r=new FileReader();r.onload=()=>{window.__dl.push({f:o.filename,b64:String(r.result).split(',')[1]})};r.readAsDataURL(o.data);return {status:'saved'}}}:null}});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+__dirname+'/../simple_dbg.html');await pg.waitForTimeout(700);
 await pg.click('#btnPdf');await pg.waitForTimeout(3500);
 console.log('pvInfo:',await pg.innerText('#pvInfo'));
 await pg.screenshot({path:'d3_preview.png'});
 await pg.click('#pvDl');await pg.waitForTimeout(2000);
 const d=await pg.evaluate(()=>window.__dl);
 d.forEach(x=>{fs.writeFileSync('rep_'+x.f,Buffer.from(x.b64,'base64'));console.log(x.f,x.b64.length*0.75)});
 console.log('ERRS',JSON.stringify(errs));await b.close();
})();
