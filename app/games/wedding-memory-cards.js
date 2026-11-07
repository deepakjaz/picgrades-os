/* app/games/wedding-memory-cards.js */
PGGames.register({
 id:'wedding-memory-cards',title:'Wedding Memory Cards',
 description:'Find matching pairs and make a little wedding memory.',
 players:1,minutes:2,
 start:function(root,ctx){
  var running=true,first=null,locked=false,moves=0,pairs=0,timer=0,buttons=[];
  var symbols=['♡','✦','❀','◇','☼','♧'];var deck=symbols.concat(symbols).sort(function(){return Math.random()-.5;});
  var heading=document.createElement('div');heading.textContent='Find all 6 pairs';heading.style.cssText='text-align:center;padding:8px;font:700 18px system-ui';
  var info=document.createElement('div');info.textContent='Moves: 0 · Pairs: 0/6';info.style.cssText='text-align:center;padding:5px;font:600 14px system-ui';
  var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:8px';
  root.appendChild(heading);root.appendChild(info);root.appendChild(grid);
  function update(){info.textContent='Moves: '+moves+' · Pairs: '+pairs+'/6';}
  deck.forEach(function(symbol,index){
   var b=document.createElement('button');b.type='button';b.textContent='?';b.style.cssText='min-height:84px;border:2px solid '+(ctx.colours.accent||'#ad8548')+';border-radius:15px;background:'+(ctx.colours.paper||'#fff')+';color:'+(ctx.colours.ink||'#222')+';font:700 30px system-ui;touch-action:manipulation';
   var open=false,done=false;
   b.addEventListener('click',function(){
    if(!running||locked||open||done)return;open=true;b.textContent=symbol;b.style.background=ctx.colours.soft||'#eee';
    if(!first){first={symbol:symbol,button:b};return;}
    moves++;update();if(first.symbol===symbol){done=true;first.button.disabled=true;b.disabled=true;first.button.style.opacity='.5';b.style.opacity='.5';pairs++;first=null;update();if(pairs===6){heading.textContent='A perfect match!';ctx.score(Math.max(0,100-moves));}}
    else{locked=true;var old=first;first=null;timer=setTimeout(function(){if(!running)return;old.button.textContent='?';old.button.style.background=ctx.colours.paper||'#fff';b.textContent='?';b.style.background=ctx.colours.paper||'#fff';locked=false;},750);}
   });grid.appendChild(b);buttons.push(b);
  });
  return {stop:function(){running=false;clearTimeout(timer);buttons.forEach(function(b){b.disabled=true;});root.innerHTML='';}};
 }
});
