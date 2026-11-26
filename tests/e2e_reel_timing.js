// Step 82: Reel overlay timing, Undo, and Post Edits sticker deletion.
const http = require('http'), fs = require('fs'), path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const RE = require('./reel_helper');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'T3TIMINGWEDDING000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['t3s','Sangeet'],['t3w','Wedding'],['t3r','Reception']].forEach(([id,n],k)=>{DRIVE.folders[id]={name:n,parent:W};for(let i=0;i<5;i++)DRIVE.files['T3P'+k+i]={name:'p'+i+'.jpg',parent:id,mime:'image/jpeg'};});
function login(email){call('requestCode',{email});const code=/code: (\d{6})/.exec(mail[mail.length-1].subject)[1];return call('verifyCode',{email,code}).token;}
const admin=login('adcmediaa@gmail.com');
const pub=call('setGallery',{token:admin,orderId:call('queue',{token:admin}).recentDone[0].orderId,folderUrl:W,title:'Anika & Rohan',eventDate:'2026-12-14'});
const ck=call('facesStatus',{token:admin,g:pub.galleryId}).gallery.coupleKey;
const bytesOf=id=>{const f=DRIVE.files[id];if(f&&f.bytes)return Buffer.from(f.bytes);const n=parseInt(String(id).replace(/\D/g,''),10)||0;return fs.readFileSync(path.join(FX,files[n%files.length]));};
global.__fetchBytes=bytesOf;
const server=http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/api'){let b='';req.on('data',d=>b+=d);req.on('end',()=>{const p=JSON.parse(b);res.end(JSON.stringify(call(p.action,p)));});return;}
 if(req.url==='/app/config.js'){res.end("window.PG_CONFIG={apiUrl:'/api'}");return;}
 let u=req.url.split('?')[0];if(/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u))u='/app/gallery.html';
 fs.readFile(path.join(root,u),(e,d)=>{if(e){res.statusCode=404;res.end();}else{res.setHeader('Content-Type',u.endsWith('.html')?'text/html':u.endsWith('.css')?'text/css':u.endsWith('.json')?'application/json':'text/javascript');res.end(d);}});
}).listen(8916,async()=>{
 const {chromium}=require('playwright'),browser=await chromium.launch(),errors=[];let fails=0;
 const ok=(v,m)=>{console.log((v?'ok   ':'FAIL ')+m);if(!v)fails++;};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://lh3.googleusercontent.com/**',r=>{const id=(r.request().url().match(/\/d\/([^=?]+)/)||[])[1];r.fulfill({contentType:'image/jpeg',body:bytesOf(id)});});
  await page.goto('http://localhost:8916/g/'+pub.galleryId+'?couple='+ck);await page.waitForSelector('#pgBoot.hide',{state:'attached'});await page.waitForTimeout(500);
  await page.click('#pghReel');await RE.toEditor(page,'dynamic');
  await page.click('.re-tool[data-tool=text]');await page.fill('.re-ta','Visible from one to three');
  let initial=await page.evaluate(()=>PGReel.state());
  ok(initial.textItems.length===1&&Math.abs(initial.textItems[0].start+initial.textItems[0].dur-initial.dur)<0.2,'new text defaults to the full remaining clip');
  const from=page.locator('.re-sheet input[aria-label="Show from"]');
  const to=page.locator('.re-sheet input[aria-label="Show to"]');
  await from.evaluate(e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await to.evaluate(e=>{e.value='3';e.dispatchEvent(new Event('input',{bubbles:true}));});
  ok(Number(await to.getAttribute('max'))>=initial.dur,'Show to reaches the real end of the clip');
  await page.click('.re-sh-done');await page.waitForTimeout(200);
  let state=await page.evaluate(()=>PGReel.state());
  ok(state.textItems.length===1&&Math.round(state.textItems[0].start)===1&&Math.round(state.textItems[0].dur)===2,'text timing saves as 1–3 seconds');
  ok(state.undo>0,'timing change is in Undo history');
  await page.click('.re-ib[aria-label="Undo"]');await page.waitForTimeout(150);
  state=await page.evaluate(()=>PGReel.state());
  ok(state.textItems.length===0,'Undo removes the newly timed text');
  await page.click('.re-ib[aria-label="Redo"]');await page.waitForTimeout(150);
  state=await page.evaluate(()=>PGReel.state());
  ok(state.textItems.length===1&&Math.round(state.textItems[0].start)===1&&Math.round(state.textItems[0].dur)===2,'Redo restores the 1–3 second timing');
  // the same moments drawn with and without the text: it must show at 1.2 s and be gone at 4 s
  const grab=()=>page.evaluate(()=>{const c=document.querySelector('.re-v-edit .re-stage canvas');PGReel.frame(1.2);const a=c.toDataURL();PGReel.frame(4);const b=c.toDataURL();return [a,b];});
  const withText=await grab();
  await page.click('.re-ib[aria-label="Undo"]');await page.waitForTimeout(150);
  const without=await grab();
  await page.click('.re-ib[aria-label="Redo"]');await page.waitForTimeout(150);
  ok(withText[0]!==without[0],'text is drawn at 1.2 s (inside 1–3 s)');
  ok(withText[1]===without[1],'text is not drawn at 4 s (after its end)');
  ok(await page.evaluate(()=>PGReel.state().dur)>0,'reel still has its length after timing edits');
  await page.evaluate(()=>PGReel.close());
  await page.click('#pgcPost');await page.waitForSelector('.pe-wrap[data-view=pick]',{timeout:30000});await page.waitForTimeout(400);
  await page.click('.pe-v-pick .pe-next');await page.waitForSelector('.pe-wrap[data-view=edit]');await page.waitForTimeout(500);
  await page.evaluate(()=>PGPost.addSticker(window.PG_STICKERS[0].k));
  await page.waitForTimeout(150);
  ok(await page.isVisible('.pe-pop'),'Post Edits opens the sticker edit pop-up');
  ok(await page.isVisible('.pe-pop button:has-text("Delete")'),'Delete is visible for a selected sticker');
  await page.click('.pe-pop button:has-text("Delete")');
  ok((await page.evaluate(()=>PGPost.state().stickers.length))===0,'Delete removes the selected sticker');
  ok(errors.length===0,'page errors: '+JSON.stringify(errors));
 }catch(e){console.error(e);fails++;}
 await browser.close();server.close();process.exit(fails?1:0);
});
