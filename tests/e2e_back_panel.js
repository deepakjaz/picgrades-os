// Browser test (clean-up #1): closing an editor opened from the Control Panel goes back to the Control Panel (Hub layout), never straight to the Hub.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root=path.join(__dirname,'..'), FX=path.join(__dirname,'fixtures');
const files=fs.readdirSync(FX).filter(f=>f.endsWith('.jpg'));
const W='BACKTOPANELWEDDING0001';
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
}).listen(8907,async()=>{
  const {chromium}=require('playwright'), browser=await chromium.launch(), errors=[];
  let fails=0;
  const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
  const url='http://localhost:8907/c/'+pub.galleryId+'/'+ck;
  const L=JSON.parse(fs.readFileSync(path.join(root,'app/themes/layouts.json'))).layouts;
  const canvasId=(L.find(l=>l.id==='horizon')||L.find(l=>l.canvas)).id;
  const storyId=(L.find(l=>l.story&&l.group!=='progress')||{}).id;
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errors.push(e.message)); pg.on('dialog',d=>d.accept());
  await pg.goto(url); await pg.waitForSelector('#pgBoot.hide',{state:'attached',timeout:30000}); await pg.waitForTimeout(500);
  const editorOpen=()=>pg.evaluate(()=>/\b(pce-on|pgte-on|pged-on)\b/.test(document.body.className));
  const panelAtLayouts=()=>pg.evaluate(()=>!!document.querySelector('.pgcp-sheet .pgcp-layouts'));
  const closeEditor=async()=>{ await pg.locator('.pce-x:visible, .pgte-x:visible, .pged-x:visible').first().click(); await pg.waitForTimeout(700); };
  const viaPanel=async(label,pick)=>{
    await pg.evaluate(()=>PGControl.go('layout')); await pg.waitForSelector('.pgcp-sheet .pgcp-layouts',{timeout:15000}); await pg.waitForTimeout(300);
    await pick(); await pg.waitForTimeout(900);
    ok(await editorOpen(), label+': the editor opens');
    await closeEditor();
    ok(!(await editorOpen()) && await panelAtLayouts(), label+': ✕ goes back to the Control Panel → Hub layout (not the Hub)');
    await pg.evaluate(()=>{const x=document.querySelector('.pgcp-x'); if(x) x.click();}); await pg.waitForTimeout(400);
  };
  await viaPanel('free editor ('+canvasId+')', ()=>pg.evaluate(id=>PGControl.designLayout(id),canvasId));
  if(storyId) await viaPanel('story layout ('+storyId+')', ()=>pg.evaluate(id=>PGControl.designLayout(id),storyId));
  await viaPanel('"Design your own Hub"', ()=>pg.locator('.pgcp-canvas').first().click());
  await viaPanel('card editor', ()=>pg.locator('.pgcp-grided').first().click());
  // an editor opened from somewhere else closes to where it was (no Control Panel popping up)
  await pg.evaluate(()=>PGCanvasEditor.open('current')); await pg.waitForTimeout(900);
  await closeEditor();
  ok(!(await pg.evaluate(()=>!!document.querySelector('.pgcp-sheet'))), 'an editor not opened from the Control Panel does not open the Control Panel on close');
  console.log('page errors: '+JSON.stringify(errors)); ok(errors.length===0,'no page errors');
  await browser.close(); srv.close();
  console.log(fails?fails+' FAILED':'all passed'); process.exitCode=fails?1:0;
});
