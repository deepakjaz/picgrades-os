// Browser test (step 86): quick F0 editor checks.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root=path.join(__dirname,'..'), FX=path.join(__dirname,'fixtures');
const files=fs.readdirSync(FX).filter(f=>f.endsWith('.jpg'));
const W='F0QUICKFIXWEDDING001';
DRIVE.folders[W]={name:W,access:'ANYONE_WITH_LINK'};
[['tH','Haldi'],['tS','Sangeet'],['tW','Wedding'],['tR','Reception']].forEach(([id,n],k)=>{
  DRIVE.folders[id]={name:n,parent:W};
  for(let i=0;i<6;i++) DRIVE.files['TP'+k+i]={name:'p'+i+'.jpg',parent:id,mime:'image/jpeg'};
});
function login(email){
  call('requestCode',{email});
  const code=/code: (\d{6})/.exec(mail[mail.length-1].subject)[1];
  return call('verifyCode',{email,code}).token;
}
const admin=login('adcmediaa@gmail.com');
const pub=call('setGallery',{token:admin,orderId:call('queue',{token:admin}).recentDone[0].orderId,folderUrl:W,title:'Anika & Rohan',eventDate:'2026-12-14'});
const ck=call('facesStatus',{token:admin,g:pub.galleryId}).gallery.coupleKey;
const bytesOf=id=>fs.readFileSync(path.join(FX,files[(parseInt(String(id).replace(/\D/g,''),10)||0)%files.length]));
global.__fetchBytes=bytesOf;

const srv=http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/api'){
    let body='';req.on('data',d=>body+=d);
    req.on('end',()=>{const p=JSON.parse(body);res.end(JSON.stringify(call(p.action,p)));});
    return;
  }
  if(req.url==='/app/config.js'){res.end("window.PG_CONFIG={apiUrl:'/api'}");return;}
  let u=req.url.split('?')[0];
  if(/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u))u='/app/gallery.html';
  fs.readFile(path.join(root,u),(e,d)=>{
    if(e){res.statusCode=404;res.end();return;}
    res.setHeader('Content-Type',u.endsWith('.html')?'text/html':u.endsWith('.css')?'text/css':u.endsWith('.json')?'application/json':'text/javascript');
    res.end(d);
  });
}).listen(8901,async()=>{

  const {chromium}=require('playwright'), browser=await chromium.launch(), errors=[];
  let fails=0;
  const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
  const url='http://localhost:8901/g/'+pub.galleryId;
  const hidden=pg=>pg.evaluate(()=>[...document.querySelectorAll('.tkg-global-nav,#globalNav,#pgRoleBadge')].every(n=>{
    const s=getComputedStyle(n),r=n.getBoundingClientRect();
    return s.display==='none'||s.visibility==='hidden'||+s.opacity===0||!r.width||!r.height;
  }));
  const bar=async(pg,sel,label)=>{
    const v=await pg.evaluate(s=>{
      const e=document.querySelector(s);if(!e)return null;
      const bs=[...e.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().height>0);
      const rs=bs.map(x=>x.getBoundingClientRect());
      return {ok:rs.length>0&&rs.every(r=>r.height>=44)&&Math.max(...rs.map(r=>r.top))-Math.min(...rs.map(r=>r.top))<=2,
        heights:rs.map(r=>Math.round(r.height))};
    },sel);
    ok(!!(v&&v.ok),label+' '+JSON.stringify(v));
  };

  for(const size of [{w:390,h:844,n:'phone'},{w:1280,h:800,n:'laptop'}]){
    const ctx=await browser.newContext({viewport:{width:size.w,height:size.h},hasTouch:size.w<700,isMobile:size.w<700});
    const pg=await ctx.newPage();
    pg.on('pageerror',e=>errors.push(e.message));
    pg.on('dialog',d=>d.accept('Our evening'));
    await pg.route('https://lh3.googleusercontent.com/**',r=>{
      const id=(r.request().url().match(/\/d\/([^=?]+)/)||[])[1];
      r.fulfill({contentType:'image/jpeg',body:bytesOf(id)});
    });
    await require('./fonts_local').install(pg);
    await pg.goto(url+'?couple='+ck);
    await pg.waitForSelector('#pgBoot.hide',{state:'attached'});
    await pg.waitForFunction(()=>window.PGControl&&PGControl.role()==='couple');

    await pg.evaluate(()=>PGFrame.open({id:GALLERY.events[0].photos[0].id,ratio:.8,onDone:()=>{}}));
    await pg.waitForSelector('.pgfr-reset');
    ok(await hidden(pg),size.n+' framing hides navigation and role badge');
    const hit=await pg.evaluate(()=>['.pgfr-reset','.pgfr-done'].map(s=>{
      const e=document.querySelector(s),r=e.getBoundingClientRect();
      return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===e;
    }));
    ok(hit.every(Boolean),size.n+' Reset and Done centre hit targets');
    await pg.evaluate(()=>PGFrame.close());

    await pg.click('#pgcPost');
    await pg.waitForSelector('.pe-wrap[data-view=pick]');
    await pg.click('.pe-v-pick .pe-next');
    await pg.waitForSelector('.pe-wrap[data-view=edit]');
    ok(await pg.locator('.pe-tool[data-tool=order]').count()===0,size.n+' single-photo Post Edits hides Order');
    ok(await hidden(pg),size.n+' Post Edits hides navigation and badge');
    await bar(pg,'.pe-v-edit .pe-bar',size.n+' Post Edits top bar');
    await pg.evaluate(()=>PGPost.close());

    await pg.click('#pghReel');
    await pg.waitForSelector('.rl-wrap[data-view=inspo]');
    await pg.locator('.re-ins .re-use').first().click();
    await pg.waitForSelector('.rl-picker');
    await pg.locator('.rl-pick').first().click();
    await pg.click('.rl-picker .re-next');
    await pg.waitForSelector('.rl-wrap[data-view=edit]');
    ok(await hidden(pg),size.n+' Reel Edits hides navigation and badge');
    await bar(pg,'.re-v-edit .re-bar',size.n+' Reel Edits top bar');
    await pg.evaluate(()=>PGReel.close());

    await pg.evaluate(()=>PGCanvasEditor.open('canvas-quiet'));
    await pg.waitForSelector('.pce');
    ok(await hidden(pg),size.n+' free editor hides navigation and badge');
    await bar(pg,'.pce-top',size.n+' free editor top bar');
    await pg.evaluate(()=>PGCanvasEditor.close(true));

    await pg.evaluate(()=>PGHubEditor.open());
    await pg.waitForSelector('.pged');
    ok(await hidden(pg),size.n+' card editor hides navigation and badge');
    await bar(pg,'.pged-top',size.n+' card editor top bar');
    await pg.evaluate(()=>PGHubEditor.close());

    await pg.evaluate(()=>PGControl.designLayout('tpl-c1'));
    await pg.waitForSelector('.pgte');
    ok(await hidden(pg),size.n+' template editor hides navigation and badge');
    await bar(pg,'.pgte-top',size.n+' template editor top bar');
    await pg.evaluate(()=>PGTemplateEditor.close(true));
    await ctx.close();
  }
  console.log('page errors:',JSON.stringify(errors));
  ok(errors.length===0,'no page errors');
  await browser.close();
  if(fails) throw new Error(fails+' F0 checks failed');
  srv.close();
});
