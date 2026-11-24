// Browser test (clean-up #2): in the free editor a tap / click only selects; nothing moves by accident.
// Phone: touching a selected part lets the page scroll; the ✥ Move handle moves it. Laptop: click selects, then drag moves.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root=path.join(__dirname,'..'), FX=path.join(__dirname,'fixtures');
const files=fs.readdirSync(FX).filter(f=>f.endsWith('.jpg'));
const W='TAPSELECTWEDDING000001';
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
}).listen(8908,async()=>{
  const {chromium}=require('playwright'), browser=await chromium.launch(), errors=[];
  let fails=0;
  const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
  const url='http://localhost:8908/c/'+pub.galleryId+'/'+ck;
  const open=async(vp,touch)=>{ const ctx=await browser.newContext({viewport:vp,isMobile:!!touch,hasTouch:!!touch}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errors.push(e.message)); pg.on('dialog',d=>d.accept());
    await pg.goto(url); await pg.waitForSelector('#pgBoot.hide',{state:'attached',timeout:30000});
    await pg.evaluate(()=>PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pgc-sec'); await pg.waitForTimeout(600); return {ctx,pg}; };
  const pick=pg=>pg.evaluate(()=>{ const s=PGCanvasEditor.state(); const e=s.doc.sections[0].els.find(x=>x.t==='names')||s.doc.sections[0].els[0]; document.querySelector('.pce-page .pgc-el[data-el="'+e.id+'"]').scrollIntoView({block:'center'}); return e.id; });
  const spotOf=(pg,id)=>pg.evaluate(id=>{ const s=PGCanvasEditor.state(); for(const sec of s.doc.sections) for(const e of sec.els) if(e.id===id) return JSON.stringify(s.mode==='l'&&e.l?e.l:e.p); },id);
  const center=(pg,sel)=>pg.evaluate(sel=>{ const r=document.querySelector(sel).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}; },sel);
  // touch drag with real pointer events (pointerType touch)
  const touchDrag=(pg,sel,dx,dy)=>pg.evaluate(([sel,dx,dy])=>{ const n=document.querySelector(sel), r=n.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
    const ev=(t,cx,cy,tg)=>(tg||n).dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:cx,clientY:cy,button:0}));
    ev('pointerdown',x,y); for(let i=1;i<=8;i++) ev('pointermove',x+dx*i/8,y+dy*i/8,window); ev('pointerup',x+dx,y+dy,window); },[sel,dx,dy]);

  // ---- laptop: a press-and-drag on a part that is not selected only selects it ----
  { const {ctx,pg}=await open({width:1280,height:800});
    const id=await pick(pg); await pg.waitForTimeout(300); const before=await spotOf(pg,id); const c=await center(pg,'.pce-page .pgc-el[data-el="'+id+'"]');
    await pg.mouse.move(c.x,c.y); await pg.mouse.down(); await pg.mouse.move(c.x+80,c.y+60,{steps:8}); await pg.mouse.up(); await pg.waitForTimeout(300);
    ok((await pg.evaluate(()=>PGCanvasEditor.state().sel))===id && (await spotOf(pg,id))===before, 'laptop: dragging a part that is not selected only selects it — it does not move');
    const c2=await center(pg,'.pce-page .pgc-el[data-el="'+id+'"]');
    await pg.mouse.move(c2.x,c2.y); await pg.mouse.down(); await pg.mouse.move(c2.x+60,c2.y+40,{steps:8}); await pg.mouse.up(); await pg.waitForTimeout(300);
    ok((await spotOf(pg,id))!==before, 'laptop: once selected, dragging it moves it');
    await ctx.close(); }

  // ---- phone (touch) ----
  { const {ctx,pg}=await open({width:390,height:844},true);
    const id=await pick(pg); await pg.waitForTimeout(300); const sel='.pce-page .pgc-el[data-el="'+id+'"]'; const before=await spotOf(pg,id);
    await touchDrag(pg,sel,40,90); await pg.waitForTimeout(300);
    ok((await pg.evaluate(()=>PGCanvasEditor.state().sel))===id && (await spotOf(pg,id))===before, 'phone: touching a part selects it — it does not move');
    await touchDrag(pg,sel,40,90); await pg.waitForTimeout(300);
    ok((await spotOf(pg,id))===before, 'phone: dragging a finger over the selected part does not move it (the page can scroll)');
    ok(await pg.evaluate(sel=>getComputedStyle(document.querySelector(sel)).touchAction.indexOf('pan-y')>-1,sel), 'phone: the selected part still lets the page scroll (touch-action pan-y)');
    const mv=await center(pg,'.pce-sel .pce-mv');
    ok(mv.h>=44 && mv.w>=44, 'phone: the ✥ Move handle is a 44px tap target ('+Math.round(mv.w)+'×'+Math.round(mv.h)+')');
    await touchDrag(pg,'.pce-sel .pce-mv',30,60); await pg.waitForTimeout(400);
    ok((await spotOf(pg,id))!==before, 'phone: dragging ✥ Move moves the part');
    await pg.screenshot({path:'/tmp/tap_select_phone.png'});
    await ctx.close(); }

  console.log('page errors: '+JSON.stringify(errors)); ok(errors.length===0,'no page errors');
  await browser.close(); srv.close();
  console.log(fails?fails+' FAILED':'all passed'); process.exitCode=fails?1:0;
});
