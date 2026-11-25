// Browser test (clean-up #9): the Hub's function cards (Reel Edits, Post Edits, Add a moment) stay still —
// no looping previews — while the page's own scroll effects keep working.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root=path.join(__dirname,'..'), FX=path.join(__dirname,'fixtures');
const files=fs.readdirSync(FX).filter(f=>f.endsWith('.jpg'));
const W='STILLFUNCTIONSWEDDING1';
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
}).listen(8910,async()=>{
  const {chromium}=require('playwright'), browser=await chromium.launch({}), errors=[];
  let fails=0; const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  for(const lay of ['tpl-c5','tpl-c1','tpl-g1','magazine-cover']){
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errors.push(e.message));
    await pg.goto('http://localhost:8910/g/'+pub.galleryId+'?pgpreview=1&layout='+lay+'#hub'); await pg.waitForSelector('#pgBoot.hide',{state:'attached',timeout:20000}); await pg.waitForTimeout(1200);
    const r=await pg.evaluate(()=>{ const lp=[...document.querySelectorAll('.pss .lp')]; const run=lp.reduce((n,e)=>n+e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,0);
      const scrollFx=[...document.querySelectorAll('.pss .kb')].reduce((n,e)=>n+e.getAnimations().length,0); return {lp:lp.length,run,scrollFx,rm:!!document.querySelector('.pgl-reelcard .pgrm')}; });
    let still=true;
    if(r.rm){ const a=await pg.evaluate(()=>{ const c=document.querySelector('.pgl-reelcard'); c.scrollIntoView({block:'center'}); return [...c.querySelectorAll('.pgrm-scr img')].findIndex(i=>i.classList.contains('on')); }); await pg.waitForTimeout(4200);
      const b=await pg.evaluate(()=>[...document.querySelectorAll('.pgl-reelcard .pgrm-scr img')].findIndex(i=>i.classList.contains('on'))); still=a===b; }
    ok(r.run===0 && still, lay+': function cards are still ('+r.lp+' mini previews, '+r.run+' running animations'+(r.rm?', reel card stays on one photo':'')+')');
    if(lay==='tpl-c5') ok(r.scrollFx>0,'tpl-c5: the page\'s own effects still run (Ken Burns on the cover)');
    await pg.close();
  }
  console.log('page errors: '+JSON.stringify(errors)); ok(errors.length===0,'no page errors');
  await browser.close(); srv.close(); console.log(fails?fails+' FAILED':'all passed'); process.exitCode=fails?1:0;
});
