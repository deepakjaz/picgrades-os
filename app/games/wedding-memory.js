// Wedding Memory Cards — Match pairs of real photos from the wedding in as few moves as possible!
PGGames.register({
  id: 'wedding-memory',
  title: 'Memory Match',
  description: 'Flip cards to match pairs of photos from this wedding.',
  players: 1,
  minutes: 2,
  start: function (root, ctx) {
    var C = ctx.colours || { paper: '#F6EFEA', ink: '#1E1916', accent: '#C9A24A' };
    var photos = (ctx.photos || []).slice(0, 6);
    var lockTimer = null;

    root.innerHTML = '';
    root.style.cssText = 'position:relative;width:100%;height:100%;background:' + C.paper + ';color:' + C.ink + ';font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;overflow-y:auto;user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px calc(env(safe-area-inset-bottom,0px) + 20px);';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    var statusEl = document.createElement('div');
    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit';
    exitBtn.style.cssText = 'min-width:56px;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid rgba(0,0,0,0.18);background:transparent;color:inherit;font-weight:600;font-size:13px;cursor:pointer;';
    exitBtn.addEventListener('click', function () { if (ctx.exit) ctx.exit(); });
    top.appendChild(statusEl);
    top.appendChild(exitBtn);
    root.appendChild(top);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:390px;width:100%;margin:0 auto;flex:1;align-content:center;';
    root.appendChild(grid);

    var restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.textContent = 'Shuffle & Play Again';
    restartBtn.style.cssText = 'max-width:390px;width:100%;margin:14px auto 0;min-height:50px;border-radius:14px;border:none;background:' + C.ink + ';color:' + C.paper + ';font-size:15px;font-weight:700;cursor:pointer;';
    root.appendChild(restartBtn);

    // Fallback symbols if wedding has fewer than 6 photos loaded
    var symbols = ['🪷', '🥁', '💍', '🪔', '🐘', '💐'];
    var deck = [];
    var flipped = [];
    var matched = 0;
    var moves = 0;
    var busy = false;

    function buildDeck() {
      clearTimeout(lockTimer);
      flipped = [];
      matched = 0;
      moves = 0;
      busy = false;
      var items = [];
      for (var i = 0; i < 6; i++) {
        var ph = photos[i];
        items.push({ key: i, url: ph && ph.url ? ph.url(300) : null, sym: symbols[i] });
        items.push({ key: i, url: ph && ph.url ? ph.url(300) : null, sym: symbols[i] });
      }
      for (var j = items.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = items[j]; items[j] = items[k]; items[k] = tmp;
      }
      deck = items;
      render();
    }

    function updateHeader() {
      statusEl.innerHTML = '<b style="font-size:16px;">Wedding Memory Match</b><div style="font-size:12px;opacity:0.7;">Moves: ' + moves + ' · Pairs: ' + matched + '/6</div>';
    }

    function render() {
      updateHeader();
      grid.innerHTML = '';
      deck.forEach(function (card) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'position:relative;aspect-ratio:3/4;border-radius:14px;border:2px solid ' + C.accent + ';background:' + C.ink + ';color:' + C.paper + ';overflow:hidden;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;font-size:28px;';

        var face = document.createElement('div');
        face.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#fff;color:#1E1916;';
        if (card.url) {
          var im = document.createElement('img');
          im.src = card.url;
          im.alt = '';
          im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          face.appendChild(im);
        } else {
          face.textContent = card.sym;
        }

        var back = document.createElement('span');
        back.textContent = '✦';
        back.style.cssText = 'color:' + C.accent + ';font-size:24px;';

        btn.appendChild(back);
        btn.appendChild(face);

        btn.addEventListener('click', function () {
          if (busy || card.open || card.done) return;
          card.open = true;
          face.style.display = 'flex';
          back.style.display = 'none';
          flipped.push({ card: card, face: face, back: back });

          if (flipped.length === 2) {
            moves++;
            updateHeader();
            var a = flipped[0], b = flipped[1];
            if (a.card.key === b.card.key) {
              a.card.done = b.card.done = true;
              flipped = [];
              matched++;
              updateHeader();
              if (matched === 6) {
                var points = Math.max(10, 120 - (moves - 6) * 8);
                if (ctx.score) ctx.score(points);
                statusEl.innerHTML = '<b style="font-size:16px;">All 6 Pairs Matched! 🎉</b><div style="font-size:12px;">Completed in ' + moves + ' moves (' + points + ' pts)</div>';
              }
            } else {
              busy = true;
              lockTimer = setTimeout(function () {
                a.card.open = b.card.open = false;
                a.face.style.display = b.face.style.display = 'none';
                a.back.style.display = b.back.style.display = '';
                flipped = [];
                busy = false;
              }, 650);
            }
          }
        });

        grid.appendChild(btn);
      });
    }

    restartBtn.addEventListener('click', buildDeck);
    buildDeck();

    return {
      stop: function () {
        clearTimeout(lockTimer);
        restartBtn.removeEventListener('click', buildDeck);
      }
    };
  }
});