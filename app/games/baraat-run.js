// Baraat Run — Tap to jump over dhols and marigold pots on the way to the mandap!
// Built for 390px portrait iPhone screens, 60fps canvas, zero external assets.
PGGames.register({
  id: 'baraat-run',
  title: 'Baraat Run',
  description: 'Tap to jump over dhols and marigold pots and reach the mandap.',
  players: 1,
  minutes: 2,
  start: function (root, ctx) {
    var running = true;
    var raf = 0;
    var C = ctx.colours || { paper: '#F6EFEA', ink: '#1E1916', accent: '#C9A24A' };
    var coupleTitle = String((ctx.couple && ctx.couple.title) || 'The Wedding').replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });   // names are shown as text, never as code
    var best = Number((ctx.store && ctx.store.get('best')) || 0);

    root.innerHTML = '';
    root.style.cssText = 'position:relative;width:100%;height:100%;background:' + C.paper + ';color:' + C.ink + ';font-family:-apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;';

    // Top bar with 44px exit button
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;border-bottom:1px solid rgba(0,0,0,0.08);';
    var titleEl = document.createElement('div');
    titleEl.innerHTML = '<b style="font-size:16px;">Baraat Run</b><div style="font-size:11px;opacity:0.65;">' + coupleTitle + ' · Best: <span id="brBest">' + best + '</span></div>';
    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit';
    exitBtn.style.cssText = 'min-width:56px;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid rgba(0,0,0,0.18);background:transparent;color:inherit;font-weight:600;font-size:13px;cursor:pointer;';
    exitBtn.addEventListener('click', function () { if (ctx.exit) ctx.exit(); });
    top.appendChild(titleEl);
    top.appendChild(exitBtn);
    root.appendChild(top);

    // Canvas stage
    var stage = document.createElement('div');
    stage.style.cssText = 'flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding:10px;';
    var canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 480;
    canvas.style.cssText = 'width:100%;max-width:390px;height:auto;max-height:100%;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,0.12);touch-action:manipulation;cursor:pointer;';
    stage.appendChild(canvas);
    root.appendChild(stage);

    // Big bottom Jump button (48px+ touch target)
    var bottom = document.createElement('div');
    bottom.style.cssText = 'padding:8px 16px calc(env(safe-area-inset-bottom,0px) + 14px);display:flex;gap:10px;';
    var jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.textContent = 'TAP TO JUMP';
    jumpBtn.style.cssText = 'width:100%;min-height:52px;border-radius:14px;border:none;background:' + C.ink + ';color:' + C.paper + ';font-size:15px;font-weight:700;letter-spacing:0.04em;cursor:pointer;';
    bottom.appendChild(jumpBtn);
    root.appendChild(bottom);

    var g = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height, GROUND = 380;

    // Sound effects using Web Audio (only if ctx.sound is true)
    var ac = null;
    function beep(freq, dur) {
      if (!ctx.sound) return;
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
        var o = ac.createOscillator(), gn = ac.createGain();
        o.frequency.value = freq;
        gn.gain.setValueAtTime(0.08, ac.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        o.connect(gn); gn.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + dur);
      } catch (e) {}
    }

    var state = 'playing'; // 'playing' | 'over'
    var score = 0;
    var speed = 220;
    var player = { x: 68, y: GROUND, vy: 0, jumps: 0 };
    var obstacles = [];
    var petals = [];
    var spawnTimer = 1.1;
    var lastTime = performance.now();

    for (var i = 0; i < 14; i++) {
      petals.push({ x: Math.random() * W, y: Math.random() * GROUND, r: 3 + Math.random() * 3, s: 25 + Math.random() * 30 });
    }

    function resetGame() {
      score = 0;
      speed = 225;
      player.y = GROUND;
      player.vy = 0;
      player.jumps = 0;
      obstacles = [];
      spawnTimer = 0.9;
      state = 'playing';
      jumpBtn.textContent = 'TAP TO JUMP';
    }

    function doJump(e) {
      if (e) e.preventDefault();
      if (state === 'over') {
        resetGame();
        return;
      }
      if (player.jumps < 2) {
        player.vy = -460;
        player.jumps++;
        beep(520, 0.09);
      }
    }

    canvas.addEventListener('pointerdown', doJump);
    jumpBtn.addEventListener('pointerdown', doJump);

    function step(now) {
      if (!running) return;
      raf = requestAnimationFrame(step);
      if (document.hidden) { lastTime = now; return; }
      var dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (state === 'playing') {
        score += dt * 12;
        speed = Math.min(390, 225 + score * 0.65);

        // Physics
        player.vy += 1250 * dt;
        player.y += player.vy * dt;
        if (player.y >= GROUND) {
          player.y = GROUND;
          player.vy = 0;
          player.jumps = 0;
        }

        // Obstacles (Dhol drum, Marigold pot, Brass Kalash)
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          var kind = Math.floor(Math.random() * 3);
          obstacles.push({ x: W + 30, w: kind === 0 ? 34 : 28, h: kind === 1 ? 42 : 32, kind: kind, passed: false });
          spawnTimer = 0.95 + Math.random() * 0.85 - Math.min(0.35, score * 0.002);
        }

        for (var i = obstacles.length - 1; i >= 0; i--) {
          var ob = obstacles[i];
          ob.x -= speed * dt;
          if (!ob.passed && ob.x + ob.w < player.x - 14) {
            ob.passed = true;
            score += 5;
            beep(680, 0.06);
          }
          // Hitbox check (forgiving padding)
          if (ob.x < player.x + 12 && ob.x + ob.w > player.x - 12 && player.y > GROUND - ob.h + 6) {
            state = 'over';
            var finalScore = Math.floor(score);
            if (finalScore > best) {
              best = finalScore;
              if (ctx.store) ctx.store.set('best', best);
              var bEl = root.querySelector('#brBest');
              if (bEl) bEl.textContent = String(best);
            }
            if (ctx.score) ctx.score(finalScore);
            jumpBtn.textContent = 'PLAY AGAIN';
            beep(220, 0.22);
          }
          if (ob.x < -60) obstacles.splice(i, 1);
        }
      }

      // Draw background
      g.fillStyle = C.paper;
      g.fillRect(0, 0, W, H);

      // Decorative palace arch silhouette in background
      g.strokeStyle = C.accent;
      g.globalAlpha = 0.22;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(30, GROUND);
      g.lineTo(30, 140);
      g.quadraticCurveTo(30, 50, W / 2, 28);
      g.quadraticCurveTo(W - 30, 50, W - 30, 140);
      g.lineTo(W - 30, GROUND);
      g.stroke();
      g.globalAlpha = 1;

      // Floating marigold petals
      g.fillStyle = C.accent;
      petals.forEach(function (pt) {
        pt.y += pt.s * dt;
        if (pt.y > GROUND) { pt.y = 20; pt.x = Math.random() * W; }
        g.beginPath();
        g.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        g.fill();
      });

      // Ground line
      g.strokeStyle = C.ink;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, GROUND);
      g.lineTo(W, GROUND);
      g.stroke();

      // Draw obstacles
      obstacles.forEach(function (ob) {
        var oy = GROUND - ob.h;
        g.fillStyle = ob.kind === 0 ? '#B8431D' : C.accent;
        g.beginPath();
        g.roundRect ? g.roundRect(ob.x, oy, ob.w, ob.h, 6) : g.rect(ob.x, oy, ob.w, ob.h);
        g.fill();
        g.strokeStyle = C.ink;
        g.lineWidth = 1.5;
        g.stroke();
      });

      // Draw player (Groom/Bride character with festive turban/crown)
      var py = player.y;
      g.fillStyle = C.ink;
      g.beginPath();
      g.arc(player.x, py - 34, 11, 0, Math.PI * 2);
      g.fill();
      // Festive Safa / Crown
      g.fillStyle = '#C8281E';
      g.beginPath();
      g.arc(player.x, py - 38, 12, Math.PI, 0);
      g.fill();
      // Body
      g.fillStyle = C.accent;
      g.fillRect(player.x - 10, py - 22, 20, 22);

      // Score HUD
      g.fillStyle = C.ink;
      g.font = '700 22px -apple-system, sans-serif';
      g.textAlign = 'right';
      g.fillText(String(Math.floor(score)), W - 20, 42);

      if (state === 'over') {
        g.fillStyle = 'rgba(20,16,14,0.72)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#FFFFFF';
        g.textAlign = 'center';
        g.font = '600 26px Georgia, serif';
        g.fillText('Baraat Reached!', W / 2, H / 2 - 24);
        g.font = '700 18px -apple-system, sans-serif';
        g.fillStyle = C.accent;
        g.fillText('Score: ' + Math.floor(score) + '  ·  Best: ' + best, W / 2, H / 2 + 12);
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.font = '500 13px -apple-system, sans-serif';
        g.fillText('Tap anywhere to run again', W / 2, H / 2 + 44);
      }
    }

    raf = requestAnimationFrame(step);

    return {
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', doJump);
        jumpBtn.removeEventListener('pointerdown', doJump);
        if (ac && ac.close) ac.close().catch(function () {});
      }
    };
  }
});