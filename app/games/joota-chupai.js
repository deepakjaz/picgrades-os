// Joota Chupai — 2-player pass-the-phone hide-and-seek game for the groom's mojari!
PGGames.register({
  id: 'joota-chupai',
  title: 'Joota Chupai',
  description: 'Pass the phone! Player 1 hides the groom’s shoes; Player 2 has 3 tries to find them.',
  players: 2,
  minutes: 2,
  start: function (root, ctx) {
    var C = ctx.colours || { paper: '#F6EFEA', ink: '#1E1916', accent: '#C9A24A' };
    var spots = [
      { name: 'Behind the Mandap Flowers', icon: '🌺' },
      { name: 'Under Dadi’s Shawl', icon: '🧣' },
      { name: 'Inside the Dholak Case', icon: '🥁' },
      { name: 'Behind the Mehendi Cushions', icon: '🛋️' },
      { name: 'In the Bridesmaids’ Car', icon: '🚗' },
      { name: 'Under the Mithai Counter', icon: '🍬' },
      { name: 'Behind the Palace Pillar', icon: '🏛️' },
      { name: 'Inside the Shagun Trunk', icon: '🧳' },
      { name: 'Under the Stage Carpet', icon: '✨' }
    ];

    var phase = 'hide'; // 'hide' | 'pass' | 'seek' | 'done'
    var hiddenIdx = -1;
    var decoyIdx = -1;
    var triesLeft = 3;
    var checked = {};

    root.innerHTML = '';
    root.style.cssText = 'position:relative;width:100%;height:100%;background:' + C.paper + ';color:' + C.ink + ';font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;overflow-y:auto;user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px calc(env(safe-area-inset-bottom,0px) + 20px);';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
    var headerText = document.createElement('div');
    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit';
    exitBtn.style.cssText = 'min-width:56px;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid rgba(0,0,0,0.18);background:transparent;color:inherit;font-weight:600;font-size:13px;cursor:pointer;';
    exitBtn.addEventListener('click', function () { if (ctx.exit) ctx.exit(); });
    top.appendChild(headerText);
    top.appendChild(exitBtn);
    root.appendChild(top);

    var body = document.createElement('div');
    body.style.cssText = 'max-width:390px;width:100%;margin:0 auto;flex:1;display:flex;flex-direction:column;justify-content:center;';
    root.appendChild(body);

    function render() {
      body.innerHTML = '';
      if (phase === 'hide') {
        headerText.innerHTML = '<b style="font-size:16px;">Bride’s Squad (Player 1)</b><div style="font-size:12px;opacity:0.75;">Tap a secret spot to hide the Groom’s Mojari!</div>';
      } else if (phase === 'pass') {
        headerText.innerHTML = '<b style="font-size:16px;">Shoes Hidden! 🤫</b><div style="font-size:12px;opacity:0.75;">Hand the phone to the Groom’s Squad (Player 2)</div>';
        var passCard = document.createElement('div');
        passCard.style.cssText = 'text-align:center;padding:28px 18px;border-radius:18px;border:1px solid rgba(0,0,0,0.12);background:rgba(255,255,255,0.5);';
        passCard.innerHTML = '<div style="font-size:48px;margin-bottom:10px;">👞✨</div><h3 style="font-size:20px;margin-bottom:8px;">Ready, Groom’s Squad?</h3><p style="font-size:13px;opacity:0.75;margin-bottom:18px;">You have 3 tries to find the hidden Mojari before paying the Shagun!</p>';
        var startSeekBtn = document.createElement('button');
        startSeekBtn.type = 'button';
        startSeekBtn.textContent = 'I HAVE THE PHONE · START SEARCH';
        startSeekBtn.style.cssText = 'width:100%;min-height:50px;border-radius:14px;border:none;background:' + C.ink + ';color:' + C.paper + ';font-weight:700;font-size:14px;cursor:pointer;';
        startSeekBtn.addEventListener('click', function () { phase = 'seek'; render(); });
        passCard.appendChild(startSeekBtn);
        body.appendChild(passCard);
        return;
      } else if (phase === 'seek') {
        headerText.innerHTML = '<b style="font-size:16px;">Groom’s Squad (Player 2)</b><div style="font-size:12px;opacity:0.75;">Tries left: ' + triesLeft + ' · Tap a spot to search!</div>';
      }

      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;';

      spots.forEach(function (sp, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        var wasChecked = !!checked[idx];
        var isShoe = phase === 'done' && idx === hiddenIdx;
        btn.style.cssText = 'min-height:96px;padding:10px 6px;border-radius:14px;border:2px solid ' + (isShoe ? '#1f6f43' : C.accent) + ';background:' + (wasChecked ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.65)') + ';color:' + C.ink + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;text-align:center;';

        var ic = isShoe ? '👞' : (wasChecked ? (Math.abs(idx - hiddenIdx) <= 1 ? '🔥' : '❌') : sp.icon);
        btn.innerHTML = '<span style="font-size:26px;">' + ic + '</span><span style="font-size:11px;font-weight:600;line-height:1.2;">' + sp.name + '</span>';

        btn.addEventListener('click', function () {
          if (phase === 'hide') {
            hiddenIdx = idx;
            decoyIdx = (idx + 4) % spots.length;
            checked = {};
            triesLeft = 3;
            phase = 'pass';
            render();
          } else if (phase === 'seek' && !checked[idx]) {
            checked[idx] = true;
            if (idx === hiddenIdx) {
              phase = 'done';
              var pts = triesLeft * 35;
              if (ctx.score) ctx.score(pts);
              headerText.innerHTML = '<b style="font-size:16px;">Groom’s Squad Wins! 👞🎉</b><div style="font-size:12px;">Found the Mojari with ' + triesLeft + ' tries left!</div>';
            } else {
              triesLeft--;
              if (triesLeft <= 0) {
                phase = 'done';
                if (ctx.score) ctx.score(50);
                headerText.innerHTML = '<b style="font-size:16px;">Bride’s Squad Wins the Shagun! 💸🎉</b><div style="font-size:12px;">The shoes were hidden ' + spots[hiddenIdx].name.toLowerCase() + '!</div>';
              }
            }
            render();
          }
        });
        grid.appendChild(btn);
      });
      body.appendChild(grid);

      if (phase === 'done') {
        var again = document.createElement('button');
        again.type = 'button';
        again.textContent = 'Play Another Round';
        again.style.cssText = 'width:100%;margin-top:16px;min-height:50px;border-radius:14px;border:none;background:' + C.ink + ';color:' + C.paper + ';font-weight:700;font-size:15px;cursor:pointer;';
        again.addEventListener('click', function () { phase = 'hide'; hiddenIdx = -1; checked = {}; render(); });
        body.appendChild(again);
      }
    }

    render();
    return { stop: function () { root.innerHTML = ''; } };
  }
});