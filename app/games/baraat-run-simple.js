/* app/games/baraat-run.js */
PGGames.register({
 id:'baraat-run-simple', title:'Baraat Run (simple)',
 description:'Tap to jump over the wedding drums and reach the mandap.',
 players:1, minutes:2,
 start:function(root,ctx){
  var running=true,raf=0,last=0,elapsed=0,score=0,jumpY=0,jumpV=0,spawn=0,obstacles=[],ended=false;
  var W=360,H=500,dpr=Math.min(window.devicePixelRatio||1,2);
  var canvas=document.createElement('canvas');canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.cssText='width:100%;height:auto;display:block;touch-action:manipulation;border-radius:16px';
  var status=document.createElement('div');status.textContent='Reach the mandap!';status.style.cssText='text-align:center;padding:8px;font:700 15px system-ui';
  var btn=document.createElement('button');btn.textContent='TAP TO JUMP';btn.style.cssText='width:100%;min-height:52px;border:0;border-radius:14px;font:700 16px system-ui;background:'+(ctx.colours.accent||'#ad8548')+';color:white';
  root.appendChild(status);root.appendChild(canvas);root.appendChild(btn);var c=canvas.getContext('2d');
  function jump(){if(running&&!ended&&jumpY===0)jumpV=610;}
  function key(e){if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}}
  function reset(){obstacles=[];elapsed=0;score=0;jumpY=0;jumpV=0;spawn=0;ended=false;last=0;status.textContent='Reach the mandap!';btn.textContent='TAP TO JUMP';}
  function end(win){ended=true;status.textContent=win?'You reached the mandap! Score: '+score:'Oops! Try one more run.';btn.textContent='PLAY AGAIN';ctx.score(score);}
  btn.addEventListener('click',function(){if(ended)reset();else jump();});
  canvas.addEventListener('pointerdown',jump);document.addEventListener('keydown',key);
  function draw(){
   c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=ctx.colours.paper||'#fff8eb';c.fillRect(0,0,W,H);
   c.fillStyle=ctx.colours.soft||'#ead9b8';c.fillRect(0,400,W,100);
   c.strokeStyle=ctx.colours.accent||'#ad8548';c.lineWidth=4;c.beginPath();c.moveTo(0,400);c.lineTo(W,400);c.stroke();
   c.strokeStyle=ctx.colours.ink||'#333';c.lineWidth=4;c.strokeRect(294,292,38,108);c.beginPath();c.moveTo(286,292);c.lineTo(313,264);c.lineTo(340,292);c.stroke();
   var py=380-jumpY;c.fillStyle=ctx.colours.ink||'#333';c.beginPath();c.arc(62,py-30,12,0,7);c.fill();
   c.strokeStyle=ctx.colours.accent||'#ad8548';c.lineWidth=7;c.beginPath();c.moveTo(62,py-17);c.lineTo(62,py+12);c.moveTo(62,py-5);c.lineTo(45,py+5);c.moveTo(62,py-5);c.lineTo(79,py+5);c.moveTo(62,py+12);c.lineTo(50,py+30);c.moveTo(62,py+12);c.lineTo(76,py+30);c.stroke();
   obstacles.forEach(function(o){c.fillStyle='#9b4a32';c.beginPath();c.ellipse(o.x,390,16,18,0,0,7);c.fill();c.strokeStyle='#f5d6a4';c.lineWidth=3;c.stroke();});
   c.fillStyle=ctx.colours.ink||'#333';c.font='bold 17px system-ui';c.fillText('Score '+score,12,24);
  }
  function frame(ts){if(!running)return;if(document.hidden){last=0;raf=requestAnimationFrame(frame);return;}
   var dt=last?Math.min((ts-last)/1000,.04):0;last=ts;
   if(!ended){elapsed+=dt;spawn-=dt;jumpY=Math.max(0,jumpY+jumpV*dt);jumpV-=1500*dt;if(jumpY===0&&jumpV<0)jumpV=0;
    if(spawn<=0){obstacles.push({x:W+20});spawn=1.25+Math.random()*.6;}
    obstacles.forEach(function(o){o.x-=260*dt;if(!o.counted&&o.x<45){o.counted=true;score+=10;}if(Math.abs(o.x-62)<24&&jumpY<26)end(false);});
    obstacles=obstacles.filter(function(o){return o.x>-30;});if(elapsed>35)end(true);
   }draw();raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {stop:function(){running=false;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',jump);document.removeEventListener('keydown',key);root.innerHTML='';}};
 }
});
