// Varmala Toss — Time the garland toss as the bride & groom sway and friends lift them up!
PGGames.register({
  id: 'varmala-toss',
  title: 'Varmala Toss',
  description: 'Tap at the right moment to land the flower garland around your partner.',
  players: 1,
  minutes: 2,
  start: function (root, ctx) {
    var running = true;
    var raf = 0;
    var C = ctx.colours || { paper: '#F6EFEA', ink: '#1E1916', accent: '#C9A24A' };
    var best = Number((ctx.store && ctx.store.get('best')) || 0);

    root.innerHTML = '';
    root.style.cssText = 'position:relative;width:100%;height:100%;background:' + C.paper + ';color:' + C.ink + ';font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;border-bottom:1px solid rgba(0,0,0,0.08);';
    top.innerHTML = '<div><b style="font-size:16px;">Varmala Toss</b><div style="font-size:11px;opacity:0.65;">5 Tosses per Round · Best: <span id="vtBest">' + best + '</span></div></div>';
    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit';
    exitBtn.style.cssText = 'min-width:56px;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid rgba(0,0,0,0.18);background:transparent;color:inherit;font-weight:600;font-size:13px;cursor:pointer;';
    exitBtn.addEventListener('click', function () { if (ctx.exit) ctx.exit(); });
    top.appendChild(exitBtn);
    root.appendChild(top);

    var stage = document.createElement('div');
    stage.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;padding:10px;';
    var canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 460;
    canvas.style.cssText = 'width:100%;max-width:390px;height:auto;max-height:100%;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,0.12);touch-action:manipulation;cursor:pointer;';
    stage.appendChild(canvas);
    root.appendChild(stage);

    var bottom = document.createElement('div');
    bottom.style.cssText = 'padding:8px 16px calc(env(safe-area-inset-bottom,0px) + 14px);';
    var tossBtn = document.createElement('button');
    tossBtn.type = 'button';
    tossBtn.textContent = 'TOSS GARLAND';
    tossBtn.style.cssText = 'width:100%;min-height:52px;border-radius:14px;border:none;background:' + C.ink + ';color:' + C.paper + ';font-size:15px;font-weight:700;cursor:pointer;';
    bottom.appendChild(tossBtn);
    root.appendChild(bottom);

    var g = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var round = 1, maxRounds = 5, score = 0;
    var t = 0, lastTime = performance.now();
    var garland = { active: false, x: W / 2, y: 390, vy: 0 };
    var feedback = '';
    var done = false;

    function resetRound() {
      round = 1;
      score = 0;
      done = false;
      garland.active = false;
      garland.y = 390;
      feedback = 'Align & Tap to Toss!';
      tossBtn.textContent = 'TOSS GARLAND';
    }
    resetRound();

    function targetPos(time, lvl) {
      var speed = 1.6 + lvl * 0.45;
      return {
        x: W / 2 + Math.sin(time * speed) * 105,
        y: 135 + Math.cos(time * speed * 1.3) * 28
      };
    }

    function toss(e) {
      if (e) e.preventDefault();
      if (done) { resetRound(); return; }
      if (garland.active) return;
      garland.active = true;
      garland.x = W / 2 + Math.sin(t * 1.1) * 35;
      garland.y = 385;
      garland.vy = -540;
    }

    canvas.addEventListener('pointerdown', toss);
    tossBtn.addEventListener('pointerdown', toss);

    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) { lastTime = now; return; }
      var dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      t += dt;

      var tgt = targetPos(t, round);
      var handX = garland.active ? garland.x : (W / 2 + Math.sin(t * 1.1) * 35);

      if (garland.active) {
        garland.y += garland.vy * dt;
        if (garland.y <= tgt.y) {
          garland.active = false;
          var dist = Math.abs(garland.x - tgt.x);
          if (dist < 22) {
            score += 30;
            feedback = 'Perfect Varmala! +30';
          } else if (dist < 52) {
            score += 15;
            feedback = 'Close Catch! +15';
          } else {
            feedback = 'Missed — Uncle lifted too high!';
          }
          if (round >= maxRounds) {
            done = true;
            if (score > best) {
              best = score;
              if (ctx.store) ctx.store.set('best', best);
              var bEl = root.querySelector('#vtBest');
              if (bEl) bEl.textContent = String(best);
            }
            if (ctx.score) ctx.score(score);
            tossBtn.textContent = 'PLAY AGAIN';
          } else {
            round++;
          }
        }
      }

      g.fillStyle = C.paper;
      g.fillRect(0, 0, W, H);

      // Mandap pillars
      g.strokeStyle = C.accent;
      g.lineWidth = 2;
      g.strokeRect(18, 18, W - 36, H - 36);

      // Partner target (lifted on friends' shoulders)
      g.save();
      g.translate(tgt.x, tgt.y);
      g.strokeStyle = C.accent;
      g.lineWidth = 2;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.arc(0, 0, 32, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.ink;
      g.beginPath();
      g.arc(0, -4, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#C8281E';
      g.fillRect(-16, 12, 32, 24);
      g.restore();

      // Flower Garland
      var gy = garland.active ? garland.y : 385;
      var gx = garland.active ? garland.x : handX;
      g.save();
      g.translate(gx, gy);
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        g.fillStyle = i % 2 === 0 ? '#E8871E' : '#C8281E';
        g.beginPath();
        g.arc(Math.cos(a) * 26, Math.sin(a) * 18, 6, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();

      // HUD
      g.fillStyle = C.ink;
      g.font = '600 14px -apple-system, sans-serif';
      g.textAlign = 'left';
      g.fillText('Toss ' + round + '/' + maxRounds, 32, 46);
      g.textAlign = 'right';
      g.fillText('Score: ' + score, W - 32, 46);

      g.textAlign = 'center';
      g.font = '600 15px Georgia, serif';
      g.fillText(feedback, W / 2, H - 34);

      if (done) {
        g.fillStyle = 'rgba(20,16,14,0.74)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#FFFFFF';
        g.font = '600 26px Georgia, serif';
        g.fillText('Varmala Complete!', W / 2, H / 2 - 20);
        g.fillStyle = C.accent;
        g.font = '700 20px -apple-system, sans-serif';
        g.fillText('Final Score: ' + score + ' / 150', W / 2, H / 2 + 16);
      }
    }

    raf = requestAnimationFrame(loop);

    return {
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', toss);
        tossBtn.removeEventListener('pointerdown', toss);
      }
    };
  }
});