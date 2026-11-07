/* app/games/shagun-catch.js */
PGGames.register({
 id:'shagun-catch',title:'Shagun Catch',
 description:'Move the tray and catch the falling wedding envelopes.',
 players:1,minutes:2,
 start:function(root,ctx){
  var running=true,raf=0,last=0,score=0,miss=0,items=[],spawn=0,x=180,held=false,pointer=null;
  var W=360,H=460,dpr=Math.min(window.devicePixelRatio||1,2);
  var canvas=document.createElement('canvas');canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.cssText='width:100%;height:auto;display:block;touch-action:pan-y;border-radius:16px';
  var status=document.createElement('div');status.textContent='Catch 10 envelopes!';status.style.cssText='text-align:center;padding:8px;font:700 15px system-ui';
  root.appendChild(status);root.appendChild(canvas);var c=canvas.getContext('2d');
  function pos(e){var r=canvas.getBoundingClientRect();x=Math.max(32,Math.min(W-32,(e.clientX-r.left)/r.width*W));}
  function down(e){held=true;pointer=e.pointerId;pos(e);canvas.setPointerCapture(pointer);}
  function move(e){if(held&&e.pointerId===pointer)pos(e);}
  function up(){held=false;pointer=null;}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  function draw(){c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=ctx.colours.paper||'#fff8eb';c.fillRect(0,0,W,H);c.fillStyle=ctx.colours.soft||'#ead9b8';c.fillRect(0,H-38,W,38);
   items.forEach(function(o){c.save();c.translate(o.x,o.y);c.rotate(o.r);c.fillStyle=o.gold?'#d6aa4e':'#b85c52';c.fillRect(-10,-13,20,26);c.strokeStyle='#fff1d2';c.lineWidth=2;c.strokeRect(-7,-10,14,20);c.restore();});
   c.fillStyle=ctx.colours.accent||'#ad8548';c.beginPath();c.roundRect(x-34,H-62,68,15,7);c.fill();
   c.fillStyle=ctx.colours.ink||'#222';c.font='bold 15px system-ui';c.fillText('Caught '+score+'/10',12,24);c.fillText('Missed '+miss,250,24);
  }
  function frame(ts){if(!running)return;if(document.hidden){last=0;raf=requestAnimationFrame(frame);return;}
   var dt=last?Math.min((ts-last)/1000,.04):0;last=ts;spawn-=dt;
   if(spawn<=0){items.push({x:24+Math.random()*(W-48),y:-20,r:(Math.random()-.5)*.5,gold:Math.random()>.5});spawn=.55+Math.random()*.35;}
   items.forEach(function(o){o.y+=170*dt;if(o.y>H-70&&o.y<H-35&&Math.abs(o.x-x)<38&&!o.caught){o.caught=true;score++;}if(o.y>H&&!o.caught&&!o.missed){o.missed=true;miss++;}});
   items=items.filter(function(o){return o.y<H+25;});
   if(score>=10||miss>=8){status.textContent=score>=10?'Shagun collected! You win!':'Round over — try again!';ctx.score(score*10);running=false;}
   draw();if(running)raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {stop:function(){running=false;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);root.innerHTML='';}};
 }
});
