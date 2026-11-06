/* PicGrades Reel maker — makes a vertical 1080×1920 video from gallery photos, cut on the beat of the music.
   Runs on the guest's phone (canvas + Web Audio + MediaRecorder). Nothing is uploaded.
   Template now: South · Kasavu. Music: PicGrades' own instrumentals (/app/music/tracks.json). */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30;
  var TEMPLATES = {
    south: {
      name: 'South · Kasavu',
      paper: '#F3EAD9', ink: '#3B2A1A', gold: '#C9A24A', gold2: '#E7C873', deep: '#5B1F14', shade: 'rgba(20,12,6,0.55)',
      serif: '"Cormorant Garamond", Georgia, serif', mono: '"IBM Plex Mono", monospace'
    }
  };
  var S = null; // current session

  // ---------- small helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wedding'; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  var CSS = '' +
    '.rl-wrap{position:fixed;inset:0;z-index:300;background:#0b0908;color:#f3eee6;display:flex;flex-direction:column;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}' +
    '.rl-top{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px}' +
    '.rl-top h3{margin:0;font:400 1.5rem/1 "Cormorant Garamond",serif}' +
    '.rl-x{width:42px;height:42px;border-radius:21px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:22px;cursor:pointer}' +
    '.rl-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:4px 14px;position:relative}' +
    '.rl-stage canvas,.rl-stage video{height:100%;max-height:100%;max-width:100%;aspect-ratio:9/16;background:#000;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.6)}' +
    '.rl-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:70px;height:70px;border-radius:35px;border:0;background:rgba(0,0,0,.45);color:#fff;font-size:26px;cursor:pointer}' +
    '.rl-play.hide{display:none}' +
    '.rl-panel{flex:none;max-height:44vh;overflow-y:auto;padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 14px);background:#141110;border-top:1px solid rgba(255,255,255,.08)}' +
    '.rl-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px}.rl-row::-webkit-scrollbar{display:none}' +
    '.rl-lbl{font:500 .62rem/1 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:6px 0 8px}' +
    '.rl-chip{flex:none;min-height:40px;padding:0 14px;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:600 .78rem/1 inherit;cursor:pointer;white-space:nowrap}' +
    '.rl-chip.on{background:#E7C873;color:#1b140c;border-color:#E7C873}' +
    '.rl-th{flex:none;position:relative;width:58px;height:58px;border:0;padding:0;background:#222;cursor:pointer;border-radius:8px;overflow:hidden}' +
    '.rl-th img{width:100%;height:100%;object-fit:cover;display:block}.rl-th.off img{opacity:.3}' +
    '.rl-th span{position:absolute;right:3px;top:3px;width:18px;height:18px;border-radius:9px;background:#E7C873;color:#1b140c;font:700 11px/18px sans-serif;text-align:center}.rl-th.off span{background:rgba(0,0,0,.6);color:#fff}' +
    '.rl-in{width:100%;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0908;color:#fff;padding:0 12px;font:inherit;font-size:16px;margin-bottom:8px}' +
    '.rl-tog{display:flex;align-items:center;gap:10px;min-height:44px;font-size:.85rem;cursor:pointer}.rl-tog input{width:20px;height:20px;accent-color:#E7C873}' +
    '.rl-go{width:100%;min-height:50px;border:0;border-radius:12px;background:#E7C873;color:#1b140c;font:700 1rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.rl-go:disabled{opacity:.5}' +
    '.rl-sub{width:100%;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:600 .9rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.rl-msg{font-size:.82rem;color:rgba(255,255,255,.75);margin:8px 0 0;min-height:1.2em}' +
    '.rl-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:10px}.rl-bar i{display:block;height:100%;width:0;background:#E7C873}';

  // ---------- loading photos (direct from Drive, else through the gallery server) ----------
  function bitmapFromBlob(b) { return window.createImageBitmap ? createImageBitmap(b) : new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(b); }); }
  function imgFromSrc(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function loadPhotos(ids, onProgress) {
    var out = {}, done = 0, viaServer = false;
    function direct(id) {
      return fetch('https://lh3.googleusercontent.com/d/' + id + '=w1080').then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(bitmapFromBlob);
    }
    function server(batch) {
      return S.opt.api('photoData', { ids: batch }).then(function (r) {
        return Promise.all(batch.map(function (id) { return r.images[id] ? imgFromSrc(r.images[id]).then(function (im) { out[id] = im; }) : null; }));
      });
    }
    var queue = ids.slice();
    function next() {
      if (!queue.length) return Promise.resolve();
      var batch = queue.splice(0, 4);
      var p = viaServer ? server(batch) : Promise.all(batch.map(function (id) { return direct(id).then(function (b) { out[id] = b; }, function () { return 'fail'; }); }))
        .then(function (r) { var failed = batch.filter(function (id) { return !out[id]; }); if (failed.length && r.indexOf('fail') > -1) { viaServer = true; return server(failed); } });
      return p.then(function () { done += batch.length; onProgress(done, ids.length); return next(); });
    }
    return next().then(function () { return out; });
  }

  // ---------- timeline ----------
  function plan() {
    var tr = S.track, bpm = tr ? tr.bpm : 96, beat = 60 / bpm;
    var total = Math.round(S.length / beat), titleB = 4, endB = S.endCard ? 4 : 0;
    var photos = S.photos.filter(function (p) { return p.on && S.bitmaps[p.id]; });
    var body = Math.max(4, total - titleB - endB), n = Math.max(1, photos.length);
    var per = Math.max(2, Math.min(8, Math.floor(body / n))); if (per % 2 && per > 2) per--;
    var used = photos.slice(0, Math.max(1, Math.floor(body / per)));
    var segs = [], t = 0;
    segs.push({ type: 'title', start: 0, dur: titleB * beat }); t += titleB * beat;
    used.forEach(function (p, i) { segs.push({ type: 'photo', id: p.id, start: t, dur: per * beat, k: i }); t += per * beat; });
    if (endB) { segs.push({ type: 'end', start: t, dur: endB * beat }); t += endB * beat; }
    return { segs: segs, dur: t, beat: beat, used: used.length };
  }

  // ---------- drawing (South · Kasavu) ----------
  function blurOf(img) {
    var c = document.createElement('canvas'); c.width = 27; c.height = 48;
    var x = c.getContext('2d'), r = Math.max(27 / img.width, 48 / img.height);
    x.drawImage(img, (27 - img.width * r) / 2, (48 - img.height * r) / 2, img.width * r, img.height * r);
    return c;
  }
  function kolam(ctx, cx, cy, r, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) { if (Math.abs(i) + Math.abs(j) > 2) continue; ctx.beginPath(); ctx.arc(cx + i * r, cy + j * r, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath();
    for (var a = 0; a < 4; a++) { var ang = a * Math.PI / 2; ctx.moveTo(cx + Math.cos(ang) * r * 2.6, cy + Math.sin(ang) * r * 2.6); ctx.arc(cx, cy, r * 2.6, ang, ang + Math.PI / 2 * 0.8); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function frameBorder(ctx, T, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = T.gold; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 2; ctx.strokeRect(52, 52, W - 104, H - 104);
    // kasavu band at the bottom
    ctx.fillStyle = T.gold; ctx.fillRect(36, H - 150, W - 72, 26); ctx.fillStyle = T.gold2; ctx.fillRect(36, H - 118, W - 72, 8);
    ctx.restore();
  }
  function watermark(ctx, onPaper) {
    ctx.save(); ctx.font = '500 26px ' + TEMPLATES.south.mono; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    if (onPaper) ctx.fillStyle = 'rgba(59,42,26,0.35)'; else { ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6; }
    ctx.fillText('PicGrades', W - 70, H - 170); ctx.restore();
  }
  function card(ctx, T, lines, a) {
    ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
    frameBorder(ctx, T, 1);
    kolam(ctx, W / 2, H * 0.3, 34, T.gold);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = T.ink;
    lines.forEach(function (l) { ctx.font = l.f; ctx.fillStyle = l.c || T.ink; wrapText(ctx, l.t, W / 2, l.y, W - 220, l.lh || 110); });
    ctx.restore();
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = String(text || '').split(' '), line = '', lines = [];
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
  }
  function drawPhoto(ctx, T, seg, t, beat, alpha, slideY) {
    var img = S.bitmaps[seg.id]; if (!img) return;
    var u = (t - seg.start) / seg.dur;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, slideY || 0);
    // soft blurred same photo behind, so the photo itself is never cut
    if (!S.blurs[seg.id]) S.blurs[seg.id] = blurOf(img);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.blurs[seg.id], -40, -40, W + 80, H + 80);
    ctx.fillStyle = T.shade; ctx.fillRect(0, 0, W, H);
    var pulse = 1 + 0.012 * Math.exp(-((t - seg.start) % beat) / (beat * 0.25)); // small beat pulse
    var zoom = (1 + 0.06 * u) * pulse, pan = (seg.k % 2 ? -1 : 1) * 24 * (u - 0.5);
    var box = { x: 70, y: 90, w: W - 140, h: H - 300 };
    var r = Math.min(box.w / img.width, box.h / img.height) * zoom, w = img.width * r, h = img.height * r;
    var x = box.x + (box.w - w) / 2 + pan, y = box.y + (box.h - h) / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30;
    ctx.drawImage(img, x, y, w, h);
    ctx.shadowBlur = 0; frameBorder(ctx, T, 0.55);
    ctx.restore();
  }
  function draw(ctx, P, t) {
    var T = S.T, segs = P.segs, beat = P.beat;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var i = 0; while (i < segs.length - 1 && t >= segs[i + 1].start) i++;
    var seg = segs[i], prev = segs[i - 1], into = t - seg.start, trans = Math.min(0.45, beat * 0.6);
    function one(sg, tt, a, dy) {
      if (sg.type === 'photo') drawPhoto(ctx, T, sg, tt, beat, a, dy);
      else if (sg.type === 'title') { ctx.save(); ctx.globalAlpha = a; ctx.translate(0, dy || 0); card(ctx, T, [
        { t: S.names, f: '500 118px ' + T.serif, y: H * 0.47, lh: 124 },
        { t: S.date, f: '500 38px ' + T.mono, y: H * 0.47 + (S.names.length > 16 ? 300 : 170), c: T.deep }
      ], ease((tt - sg.start) / (beat * 1.5))); ctx.restore(); }
      else if (sg.type === 'end') { ctx.save(); ctx.globalAlpha = a; ctx.translate(0, dy || 0); card(ctx, T, [
        { t: S.names, f: '500 92px ' + T.serif, y: H * 0.46, lh: 100 },
        { t: S.studio ? 'Photos by ' + S.studio : '', f: '500 34px ' + T.mono, y: H * 0.46 + 190, c: T.deep },
        { t: 'made with PicGrades', f: '500 28px ' + T.mono, y: H * 0.46 + 250, c: T.ink }
      ], ease((tt - sg.start) / beat)); ctx.restore(); }
    }
    if (prev && into < trans) {
      var p = ease(into / trans), style = seg.k === undefined ? 'fade' : (seg.k % 3 === 2 ? 'fade' : 'slide');
      if (style === 'slide') { one(prev, t, 1, -H * p); one(seg, t, 1, H * (1 - p)); }
      else { one(prev, t, 1, 0); one(seg, t, p, 0); }
    } else one(seg, t, 1, 0);
    // a gentle gold flash on every 8th beat
    var b = Math.floor(t / beat);
    if (b > 0 && b % 8 === 0) { var f = 1 - ((t % beat) / (beat * 0.5)); if (f > 0) { ctx.fillStyle = 'rgba(231,200,115,' + (0.18 * f) + ')'; ctx.fillRect(0, 0, W, H); } }
    var showing = (prev && into < trans && into / trans < 0.5) ? prev : seg;
    watermark(ctx, showing.type !== 'photo');
  }

  // ---------- audio ----------
  function audioCtx() { if (!S.ac) S.ac = new (window.AudioContext || window.webkitAudioContext)(); return S.ac; }
  function loadTrack(tr) {
    if (!tr) return Promise.resolve(null);
    if (S.buffers[tr.id]) return Promise.resolve(S.buffers[tr.id]);
    return fetch(tr.file).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
      return new Promise(function (res, rej) { audioCtx().decodeAudioData(ab, res, rej); });
    }).then(function (buf) { S.buffers[tr.id] = buf; return buf; });
  }
  function startAudio(buf, dest, dur) {
    var ac = audioCtx(); if (!buf) return null;
    var src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g); g.connect(dest);
    var t0 = ac.currentTime + 0.05;
    g.gain.setValueAtTime(1, t0); g.gain.setValueAtTime(1, t0 + Math.max(0, dur - 1.5)); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.start(t0, 0, dur + 0.1);
    return { src: src, t0: t0 };
  }
  function clock(aud) { var ac = S.ac; var base = aud ? aud.t0 : null; var p0 = performance.now(); return function () { return aud && ac ? ac.currentTime - base : (performance.now() - p0) / 1000; }; }

  // ---------- preview ----------
  function stopPreview() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; if (S.aud) { try { S.aud.src.stop(); } catch (e) {} S.aud = null; } S.playBtn.classList.remove('hide'); }
  function play() {
    stopPreview(); var P = plan(); if (!P.used) { msg('Choose at least one photo.'); return; }
    S.playBtn.classList.add('hide'); msg('');
    var ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    loadTrack(S.track).then(function (buf) {
      S.aud = startAudio(buf, ac.destination, P.dur); var now = clock(S.aud), ctx = S.canvas.getContext('2d');
      (function loop() { var t = now(); if (t >= P.dur) { draw(ctx, P, P.dur - 0.001); stopPreview(); return; } draw(ctx, P, Math.max(0, t)); S.raf = requestAnimationFrame(loop); })();
    }).catch(function () { msg('The music could not load. Check the internet and try again.'); stopPreview(); });
  }

  // ---------- export ----------
  function pickType() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function exportReel() {
    stopPreview();
    var P = plan(); if (!P.used) { msg('Choose at least one photo.'); return; }
    if (!window.MediaRecorder || !S.canvas.captureStream) { msg('This phone cannot make videos in the browser. Please update the phone or try Chrome.'); return; }
    var type = pickType(), ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    S.goBtn.disabled = true; S.busy = true; msg('Making your reel… keep this screen open.'); S.bar.style.width = '0%'; S.barWrap.style.display = 'block';
    loadTrack(S.track).then(function (buf) {
      var vstream = S.canvas.captureStream(FPS), tracks = vstream.getVideoTracks();
      var dest = null; if (buf) { dest = ac.createMediaStreamDestination(); dest.stream.getAudioTracks().forEach(function (t) { tracks.push(t); }); }
      var stream = new MediaStream(tracks), chunks = [];
      var rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8000000 } : undefined);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var ctx = S.canvas.getContext('2d'); draw(ctx, P, 0);
      rec.onstop = function () {
        S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none';
        var mt = (rec.mimeType || type || 'video/webm').split(';')[0], blob = new Blob(chunks, { type: mt });
        var ext = mt.indexOf('mp4') > -1 ? 'mp4' : 'webm';
        S.result = new File([blob], slug(S.names) + '_reel.' + ext, { type: mt });
        showResult();
      };
      rec.start(500);
      var aud = buf ? startAudio(buf, dest, P.dur) : null, now = clock(aud);
      (function loop() {
        var t = now();
        if (t >= P.dur) { draw(ctx, P, P.dur - 0.001); setTimeout(function () { rec.stop(); }, 120); return; }
        draw(ctx, P, Math.max(0, t)); S.bar.style.width = Math.min(100, t / P.dur * 100).toFixed(1) + '%';
        msg('Making your reel… ' + Math.floor(t) + ' / ' + Math.round(P.dur) + ' s · keep this screen open');
        S.raf = requestAnimationFrame(loop);
      })();
    }).catch(function (e) { S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; msg('Could not make the reel: ' + (e && e.message || e)); });
  }
  function showResult() {
    var url = URL.createObjectURL(S.result);
    S.video = el('video', { src: url, controls: '', playsinline: '', loop: '' });
    S.canvas.style.display = 'none'; S.playBtn.classList.add('hide'); S.stage.appendChild(S.video);
    S.ctrls.style.display = 'none'; S.done.style.display = 'block';
    msg('Your reel is ready (' + Math.round(S.result.size / 1048576 * 10) / 10 + ' MB).' + (S.result.type.indexOf('mp4') < 0 ? ' This phone made a .webm video — Instagram may need it converted.' : ''));
  }
  function shareResult() {
    var f = S.result; if (!f) return;
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: S.names }).catch(function () {}); return; }
    downloadResult();
  }
  function downloadResult() {
    var f = S.result; if (!f) return;
    var a = el('a', { href: URL.createObjectURL(f), download: f.name }); document.body.appendChild(a); a.click(); a.remove();
  }

  function msg(t) { if (S && S.msg) S.msg.textContent = t || ''; }

  // ---------- UI ----------
  function chips(row, list, cur, onPick) {
    row.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'rl-chip' + (it.v === cur ? ' on' : ''), text: it.t, onclick: function () { row.querySelectorAll('.rl-chip').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); onPick(it.v); } });
      row.appendChild(b);
    });
  }
  function renderThumbs() {
    S.thumbs.innerHTML = '';
    var n = 0;
    S.photos.forEach(function (p) {
      var num = p.on ? ++n : 0;
      var b = el('button', { type: 'button', class: 'rl-th' + (p.on ? '' : ' off'), 'aria-label': p.on ? 'Remove photo' : 'Add photo', onclick: function () { p.on = !p.on; renderThumbs(); stopPreview(); } },
        [el('img', { src: 'https://lh3.googleusercontent.com/d/' + p.id + '=w160', alt: '', loading: 'lazy' }), el('span', { text: p.on ? String(num) : '+' })]);
      S.thumbs.appendChild(b);
    });
    var P = plan(); S.info.textContent = P.used + ' photos in this reel · ' + Math.round(P.dur) + ' s';
  }

  function open(opt) {
    if (S && S.wrap) close();
    if (!document.getElementById('rl-css')) document.head.appendChild(el('style', { id: 'rl-css', text: CSS }));
    S = { opt: opt, T: TEMPLATES.south, photos: opt.photos.slice(0, 40).map(function (p) { return { id: p.id, on: true }; }), bitmaps: {}, blurs: {}, buffers: {},
      names: opt.title || 'Our Wedding', date: opt.date || '', studio: opt.studio || '', length: 30, endCard: true, tracks: [], track: null };
    var wrap = el('div', { class: 'rl-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Make a reel' });
    S.wrap = wrap;
    var top = el('div', { class: 'rl-top' }, [el('h3', { text: 'Make a reel' }), el('button', { type: 'button', class: 'rl-x', 'aria-label': 'Close', text: '×', onclick: function () { if (S.busy && !confirm('Stop making the reel?')) return; close(); } })]);
    S.stage = el('div', { class: 'rl-stage' });
    S.canvas = el('canvas', { width: W, height: H, 'aria-label': 'Reel preview' });
    S.playBtn = el('button', { type: 'button', class: 'rl-play', 'aria-label': 'Play preview', text: '▶', onclick: play });
    S.canvas.addEventListener('click', function () { if (S.raf) stopPreview(); else play(); });
    S.stage.appendChild(S.canvas); S.stage.appendChild(S.playBtn);
    var panel = el('div', { class: 'rl-panel' });
    S.ctrls = el('div');
    var musicRow = el('div', { class: 'rl-row' }), lenRow = el('div', { class: 'rl-row' });
    S.thumbs = el('div', { class: 'rl-row' }); S.info = el('div', { class: 'rl-lbl', style: 'margin-top:0' });
    var names = el('input', { class: 'rl-in', value: S.names, 'aria-label': 'Names on the reel', maxlength: '40' });
    names.addEventListener('input', function () { S.names = names.value || ' '; });
    var date = el('input', { class: 'rl-in', value: S.date, 'aria-label': 'Date on the reel', maxlength: '30' });
    date.addEventListener('input', function () { S.date = date.value; });
    var endTog = el('input', { type: 'checkbox', checked: '' });
    endTog.addEventListener('change', function () { S.endCard = endTog.checked; renderThumbs(); stopPreview(); });
    S.goBtn = el('button', { type: 'button', class: 'rl-go', text: 'Make video', onclick: exportReel });
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Style · ' + S.T.name }));
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Music' })); S.ctrls.appendChild(musicRow);
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Length' })); S.ctrls.appendChild(lenRow);
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Photos · tap to remove or add' })); S.ctrls.appendChild(S.thumbs); S.ctrls.appendChild(S.info);
    S.ctrls.appendChild(el('button', { type: 'button', class: 'rl-chip', text: 'Shuffle photos', style: 'margin-bottom:10px', onclick: function () { S.photos = shuffle(S.photos); renderThumbs(); stopPreview(); } }));
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Text' })); S.ctrls.appendChild(names); S.ctrls.appendChild(date);
    S.ctrls.appendChild(el('label', { class: 'rl-tog' }, [endTog, el('span', { text: 'Ending card with the photographer’s name (the small watermark always stays)' })]));
    S.ctrls.appendChild(S.goBtn);
    S.barWrap = el('div', { class: 'rl-bar', style: 'display:none' }); S.bar = el('i'); S.barWrap.appendChild(S.bar);
    S.msg = el('p', { class: 'rl-msg', 'aria-live': 'polite' });
    S.done = el('div', { style: 'display:none' }, [
      el('button', { type: 'button', class: 'rl-go', text: 'Share (Instagram, WhatsApp…)', onclick: shareResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Download video', onclick: downloadResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Change and make again', onclick: function () { if (S.video) S.video.remove(); S.video = null; S.canvas.style.display = ''; S.ctrls.style.display = ''; S.done.style.display = 'none'; S.playBtn.classList.remove('hide'); msg(''); } })
    ]);
    panel.appendChild(S.ctrls); panel.appendChild(S.barWrap); panel.appendChild(S.msg); panel.appendChild(S.done);
    wrap.appendChild(top); wrap.appendChild(S.stage); wrap.appendChild(panel);
    document.body.appendChild(wrap);
    audioCtx(); // created on the tap that opened the reel maker (needed on iPhone)

    chips(lenRow, [{ t: '15 s', v: 15 }, { t: '30 s', v: 30 }, { t: '60 s', v: 60 }], 30, function (v) { S.length = v; renderThumbs(); stopPreview(); });
    msg('Getting your photos ready…');
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px "Cormorant Garamond"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(function () {}) : Promise.resolve();
    Promise.all([
      fetch('/app/music/tracks.json').then(function (r) { return r.json(); }).catch(function () { return { tracks: [] }; }),
      loadPhotos(S.photos.map(function (p) { return p.id; }), function (d, n) { msg('Getting your photos ready… ' + d + ' / ' + n); }),
      fontsReady
    ]).then(function (r) {
      if (!S || S.wrap !== wrap) return;
      S.tracks = (r[0].tracks || []).filter(function (t) { return t.region === 'south' || !t.region; });
      S.bitmaps = r[1]; S.track = S.tracks[0] || null;
      S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; });
      chips(musicRow, S.tracks.map(function (t) { return { t: t.title, v: t.id }; }).concat([{ t: 'No music', v: '' }]), S.track ? S.track.id : '', function (v) {
        S.track = S.tracks.filter(function (t) { return t.id === v; })[0] || null; renderThumbs(); stopPreview();
      });
      renderThumbs();
      if (!S.photos.length) { msg('The photos could not be loaded. Check the internet and try again.'); S.goBtn.disabled = true; return; }
      msg('Tap ▶ to preview, then “Make video”.');
      draw(S.canvas.getContext('2d'), plan(), 0.9);
    }).catch(function (e) { msg('Something went wrong: ' + (e && e.message || e)); });
  }
  function close() {
    if (!S) return; stopPreview();
    if (S.wrap) S.wrap.remove();
    if (S.ac && S.ac.close) S.ac.close().catch(function () {});
    S = null;
  }
  window.PGReel = { open: open, close: close };
})();
