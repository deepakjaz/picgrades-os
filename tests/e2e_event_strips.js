// Browser test (clean-up #4): in Cinema Chapters (c5) every event's film strip shows that event's own highlights,
// and Cloud Pages (c3) peek photos too — not the same shared photos in every event.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root=path.join(__dirname,'..'), FX=path.join(__dirname,'fixtures');
const files=fs.readdirSync(FX).filter(f=>f.endsWith('.jpg'));
const W='EVENTSTRIPSWEDDING0001';
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
}).listen(8909,async()=>{
  const {chromium}=require('playwright'), browser=await chromium.launch(), errors=[];
  let fails=0;
  const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
  const pg=await (await browser.newContext({viewport:{width:390,height:844}})).newPage(); pg.on('pageerror',e=>errors.push(e.message));
  await pg.goto('http://localhost:8909/g/'+pub.galleryId); await pg.waitForSelector('#pgBoot.hide',{state:'attached',timeout:30000});
  const data=(demo)=>({names:'Anika &amp; Rohan',date:'14 Dec 2026',demo,cover:['COVER000000000000001'],pool:['POOL0000000000000001','POOL0000000000000002'],
    events:['Haldi','Sangeet','Wedding','Reception'].map((n,i)=>({name:n,featured:[0,1,2,3,4].map(k=>'HL'+i+'X'+k+'000000000000'),photos:[0,1,2,3,4,5].map(k=>({id:'PH'+i+'X'+k+'000000000000'}))}))});
  for(const demo of [false,true]){
    const r=await pg.evaluate(([d])=>{ const box=document.createElement('div'); document.body.appendChild(box);
      PGStoryStudio.mount('c5',box,d,()=>{},{}); const out=[...box.querySelectorAll('[data-l^="Event ·"]')].map(sec=>[...new Set([...sec.querySelectorAll('[data-l="Film strip (moving)"] img')].map(i=>(i.src.match(/(HL|PH|POOL|COVER)[0-9X]+/)||[i.src])[0]))]);
      box.remove(); return out; },[data(demo)]);
    const mine=r.every((ids,i)=>ids.length>=4&&ids.every(x=>x.indexOf('HL'+i+'X')===0));
    ok(r.length===4&&mine, (demo?'demo wedding':'wedding')+': Cinema Chapters — each event strip shows only that event\'s highlights '+JSON.stringify(r));
  }
  const c3=await pg.evaluate(([d])=>{ const box=document.createElement('div'); document.body.appendChild(box);
    PGStoryStudio.mount('c3',box,d,()=>{},{}); const out=[...box.querySelectorAll('[data-l="Peek photos"]')].map(p=>[...p.querySelectorAll('img')].map(i=>(i.src.match(/(HL|PH)\d+X/)||[''])[0])); box.remove(); return out; },[data(false)]);
  ok(c3.length>0 && c3.every((ids,i)=>ids.length&&ids.every(x=>x==='HL'+i+'X')), 'Cloud Pages — each event\'s peek photos are its own highlights '+JSON.stringify(c3));
  console.log('page errors: '+JSON.stringify(errors)); ok(errors.length===0,'no page errors');
  await browser.close(); srv.close();
  console.log(fails?fails+' FAILED':'all passed'); process.exitCode=fails?1:0;
});
