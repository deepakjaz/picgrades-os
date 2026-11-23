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
