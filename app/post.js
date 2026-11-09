/* PicGrades Post / Album maker — Instagram posts made from gallery photos.
   Main format: "Album strip" — one wide album page cut into 1080×1350 slides, so the Instagram swipe looks like one page.
   Also: carousel (each slide its own page) and single post. Everything is drawn on the phone (canvas). */
(function () {
  'use strict';
  var SW = 1080, SH = 1440;   // page height follows the chosen shape (3:4 · 4:5 · 1:1), see setShape
  var SERIF = '"Cormorant Garamond", Georgia, serif', MONO = '"IBM Plex Mono", monospace', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
  var PALETTES = {
    ivory: { name: 'Ivory & Gold', paper: '#F7F1E6', ink: '#2E2620', accent: '#B8913F', soft: '#E9DFC9' },
    kasavu: { name: 'Kasavu', paper: '#F3EAD9', ink: '#3B2A1A', accent: '#C9A24A', soft: '#E7C873' },
    marigold: { name: 'Marigold', paper: '#FFF4E0', ink: '#4A1F0E', accent: '#E8871E', soft: '#FFD08A' },
    rose: { name: 'Rose', paper: '#FBEFEF', ink: '#4A2530', accent: '#C76B84', soft: '#F2C9D2' },
    emerald: { name: 'Emerald', paper: '#EEF3EE', ink: '#16352A', accent: '#2F7D5B', soft: '#BFD9C9' },
    navy: { name: 'Royal Navy', paper: '#EEF0F6', ink: '#14213D', accent: '#B08D57', soft: '#C9D1E6' },
    midnight: { name: 'Midnight', paper: '#121016', ink: '#F4EEE6', accent: '#E7C873', soft: '#2A2530' }
  };
  // style: how the page looks. cells: how photos sit. deco: little line drawings.
  var TEMPLATES = {
    album:    { name: 'Album Classic', pad: 70, top: 170, bottom: 150, gap: 18, cell: 'plain', deco: 'rule', layout: 'mosaic' },
    seamless: { name: 'Seamless', pad: 0, top: 0, bottom: 0, gap: 8, cell: 'plain', deco: 'overlay', white: true, layout: 'hero' },
    film:     { name: 'Film Strip', pad: 40, top: 260, bottom: 260, gap: 34, cell: 'plain', deco: 'film', dark: true, layout: 'singles' },
    polaroid: { name: 'Polaroid String', pad: 80, top: 260, bottom: 200, gap: 60, cell: 'polaroid', deco: 'string', layout: 'stagger' },
    magazine: { name: 'Magazine', pad: 70, top: 120, bottom: 120, gap: 16, cell: 'plain', deco: 'masthead', layout: 'triple' },
    minimal:  { name: 'Minimal White', pad: 120, top: 200, bottom: 220, gap: 70, cell: 'caption', deco: 'none', white: true, layout: 'singles' },
    arch:     { name: 'Arch Windows', pad: 90, top: 210, bottom: 170, gap: 50, cell: 'arch', deco: 'arch', layout: 'singles' },
    kasavu:   { name: 'Kasavu Border', pad: 70, top: 210, bottom: 210, gap: 18, cell: 'plain', deco: 'kasavu', layout: 'pairs' },
    floral:   { name: 'Floral', pad: 90, top: 210, bottom: 170, gap: 22, cell: 'outline', deco: 'floral', layout: 'stagger' },
    cocktail: { name: 'Cocktail Night', pad: 80, top: 210, bottom: 190, gap: 26, cell: 'neon', deco: 'cocktail', dark: true, layout: 'mosaic' }
  };
  var ORDER = ['album', 'seamless', 'film', 'polaroid', 'magazine', 'minimal', 'arch', 'kasavu', 'floral', 'cocktail'];
  var S = null;

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

  // ---------- photos ----------
  // Photos are kept as small compressed files; the phone decodes them only while drawing (a big list of decoded
  // bitmaps made iPhones reload the page).
  var URLS = [];
  function bitmapFromBlob(b) { return new Promise(function (res, rej) { var i = new Image(), u = URL.createObjectURL(b); URLS.push(u); i.onload = function () { res(i); }; i.onerror = rej; i.src = u; }); }
  function freeUrls() { URLS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); URLS = []; }
  function imgFromSrc(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function loadPhotos(ids, onProgress) {
    var out = {}, done = 0, viaServer = false, queue = ids.slice();
    function direct(id) { return fetch('https://lh3.googleusercontent.com/d/' + id + '=w1600').then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(bitmapFromBlob); }
    function server(batch) { return S.opt.api('photoData', { ids: batch }).then(function (r) { return Promise.all(batch.map(function (id) { return r.images[id] ? imgFromSrc(r.images[id]).then(function (im) { out[id] = im; }) : null; })); }); }
    function next() {
      if (!queue.length) return Promise.resolve();
      var batch = queue.splice(0, 4);
      var p = viaServer ? server(batch) : Promise.all(batch.map(function (id) { return direct(id).then(function (b) { out[id] = b; }, function () { return 'fail'; }); }))
        .then(function (r) { var failed = batch.filter(function (id) { return !out[id]; }); if (failed.length && r.indexOf('fail') > -1) { viaServer = true; return server(failed); } });
      return p.then(function () { done += batch.length; onProgress(done, ids.length); return next(); });
    }
    return next().then(function () { return out; });
  }

  // ---------- layout: photos become columns (one tall photo, or two wide photos stacked) ----------
  function ratio(p) { return p.w / p.h; }
  function columns(list, h, T) {
    var cols = [], i = 0, k = 0, lay = T.layout || 'pairs', wide = function (p) { return p && ratio(p) > 1.15; };
    var one = function (p, f, off) { return { kind: 'one', ids: [p.id], w: Math.max(0.55, Math.min(1.6, ratio(p))) * h * (f || 1), f: f || 1, off: off || 0 }; };
    while (i < list.length) {
      var a = list[i], n1 = list[i + 1], n2 = list[i + 2];
      if (lay === 'singles') { cols.push(one(a)); i++; }
      else if (lay === 'stagger') { var f = k % 2 ? 0.78 : 0.9; cols.push(one(a, f, k % 2 ? 1 : 0)); i++; }
      else if (lay === 'hero' && k === 0) { cols.push({ kind: 'one', ids: [a.id], w: Math.max(1.2, ratio(a)) * h }); i++; }
      else if (lay === 'triple' && wide(a) && wide(n1) && wide(n2) && k % 2 === 0) { var ch3 = (h - 2 * T.gap) / 3; cols.push({ kind: 'triple', ids: [a.id, n1.id, n2.id], w: ch3 * (ratio(a) + ratio(n1) + ratio(n2)) / 3 }); i += 3; }
      else if (lay === 'mosaic' && k % 3 === 1 && n1 && n2) { var chm = (h - T.gap) / 2; cols.push({ kind: 'bigpair', ids: [a.id, n1.id, n2.id], w: chm * 2.1 }); i += 3; }
      else if (lay !== 'singles' && wide(a) && wide(n1)) { var ch = (h - T.gap) / 2; cols.push({ kind: 'pair', ids: [a.id, n1.id], w: ch * (ratio(a) + ratio(n1)) / 2 }); i += 2; }
      else { cols.push(one(a)); i++; }
      k++;
    }
    return cols;
  }
  function layoutStrip(list, T, slidesWanted) {
    if (T.slots) return layoutSlots(list, T, slidesWanted);
    var h = SH - T.top - T.bottom, cols = columns(list, h, T);
    var natural = cols.reduce(function (t, c) { return t + c.w; }, 0) + T.gap * Math.max(0, cols.length - 1) + 2 * T.pad + (T.deco === 'masthead' ? SW * 0.75 : 0);
    var n = slidesWanted || Math.max(1, Math.min(10, Math.round(natural / SW)));
    var W = n * SW, start = T.pad + (T.deco === 'masthead' ? SW * 0.75 : 0), avail = W - start - T.pad - T.gap * Math.max(0, cols.length - 1);
    var k = avail / cols.reduce(function (t, c) { return t + c.w; }, 0), x = start, cells = [];
    cols.forEach(function (c) {
      var w = c.w * k, g = T.gap;
      if (c.kind === 'pair') { var ch = (h - g) / 2; cells.push({ id: c.ids[0], x: x, y: T.top, w: w, h: ch }); cells.push({ id: c.ids[1], x: x, y: T.top + ch + g, w: w, h: ch }); }
      else if (c.kind === 'triple') { var c3 = (h - 2 * g) / 3; c.ids.forEach(function (id, j) { cells.push({ id: id, x: x, y: T.top + j * (c3 + g), w: w, h: c3 }); }); }
      else if (c.kind === 'bigpair') { var bh = h * 0.58, sh = h - bh - g, sw = (w - g) / 2; cells.push({ id: c.ids[0], x: x, y: T.top, w: w, h: bh }); cells.push({ id: c.ids[1], x: x, y: T.top + bh + g, w: sw, h: sh }); cells.push({ id: c.ids[2], x: x + sw + g, y: T.top + bh + g, w: sw, h: sh }); }
      else { var ch1 = h * (c.f || 1); cells.push({ id: c.ids[0], x: x, y: T.top + (c.off ? h - ch1 : 0), w: w, h: ch1 }); }
      x += w + g;
    });
    return { W: W, n: n, cells: cells };
  }
  // templates from the packs: 'slots' = page designs, each a list of photo boxes [x, y, w, h] as parts of the page (0–1)
  function layoutSlots(list, T, slidesWanted) {
    var designs = T.slots, cells = [], s = 0, i = 0, max = slidesWanted || 10;
    while (i < list.length && s < max) {
      var left = list.length - i, d = designs[s % designs.length];
      if (left < d.length) {   // last page: use the design that fits the photos left best
        var fit = designs.filter(function (x) { return x.length >= left; }).sort(function (a, b) { return a.length - b.length; })[0] || d;
        d = fit.slice(0, left);
      }
      d.forEach(function (b) { if (i < list.length) cells.push({ id: list[i++].id, x: s * SW + b[0] * SW, y: b[1] * SH, w: b[2] * SW, h: b[3] * SH }); });
      s++;
    }
    return { W: Math.max(1, s) * SW, n: Math.max(1, s), cells: cells };
  }
  function layoutCarousel(list, T) {   // each slide is its own page with 1–3 photos
    if (T.slots) return layoutSlots(list, T, 0);
    var per = S.per || (T.singles ? 1 : 2), slides = [], cells = [];
    for (var i = 0; i < list.length && slides.length < 10; i += per) slides.push(list.slice(i, i + per));
    slides.forEach(function (grp, s) {
      var L = layoutStrip(grp, Object.assign({}, T, { deco: T.deco === 'masthead' && s ? 'none' : T.deco }), 1);
      L.cells.forEach(function (c) { c.x += s * SW; cells.push(c); });
    });
    return { W: slides.length * SW, n: slides.length, cells: cells };
  }

  // ---------- drawing ----------
  function focusOf(id) {
    var a = S.adj[id]; if (a) return a;
    var f = (S.opt.faces || {})[id];
    if (f && f.length) { var tw = 0, fx = 0, fy = 0; f.forEach(function (b) { var wgt = b[2] * b[3]; tw += wgt; fx += (b[0] + b[2] / 2) * wgt; fy += (b[1] + b[3] / 2) * wgt; }); return { fx: fx / tw, fy: Math.max(0, fy / tw - 0.04), z: 1 }; }
    return { fx: 0.5, fy: 0.4, z: 1 };
  }
  function cover(ctx, img, x, y, w, h, id) {   // fills the box; keeps faces (or the chosen point) in view
    var a = focusOf(id), r = Math.max(w / img.width, h / img.height) * (a.z || 1), dw = img.width * r, dh = img.height * r;
    var dx = Math.min(x, Math.max(x + w - dw, x + w / 2 - a.fx * dw)), dy = Math.min(y, Math.max(y + h - dh, y + h / 2 - a.fy * dh));
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); if (S.fcss) ctx.filter = S.fcss; ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
    if (S.hit) S.hit.push({ id: id, x: x, y: y, w: w, h: h, dw: dw, dh: dh });
  }
  function archPath(ctx, x, y, w, h) { var r = w / 2; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  // little line drawings (our own, thin, like sketches)
  // template words (names, date, the event label under a photo, the magazine headline): your words, where you dragged them,
  // and remembered so a tap can find them. Only the post changes — never the real event or file names.
  function txOf(key, def) { var o = (S.tx || {})[key]; return o && o.text != null ? o.text : def; }
  function unionBox(l) { if (!l.length) return null; var x0 = Math.min.apply(0, l.map(function (h) { return h.x; })), y0 = Math.min.apply(0, l.map(function (h) { return h.y; })), x1 = Math.max.apply(0, l.map(function (h) { return h.x + h.w; })), y1 = Math.max.apply(0, l.map(function (h) { return h.y + h.h; })); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function tt(ctx, key, str, x, y) {
    if (str == null || str === '') return;
    var o = (S.tx || {})[key] || {}, X = x + (o.dx || 0), Y = y + (o.dy || 0);
    ctx.fillText(str, X, Y);
    if (S.hitTexts) {
      var w = ctx.measureText(str).width, a = ctx.textAlign, fs = +((/(\d+)px/.exec(ctx.font) || [0, 40])[1]), x0 = a === 'center' ? X - w / 2 : a === 'right' || a === 'end' ? X - w : X;
      S.hitTexts.push({ key: key, x: x0 - 10, y: Y - fs * 0.9, w: w + 20, h: fs * 1.25 });
    }
  }
  var ART = {
    flower: function (c, x, y, s) { for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5; c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.45, s * 0.25, a, 0, Math.PI * 2); c.stroke(); } c.beginPath(); c.arc(x, y, s * 0.18, 0, Math.PI * 2); c.stroke(); },
    marigold: function (c, x, y, s) { for (var r = s; r > 4; r -= s / 3) { c.beginPath(); for (var i = 0; i <= 16; i++) { var a = i * Math.PI * 2 / 16, rr = r * (i % 2 ? 0.82 : 1); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.stroke(); } },
    leaf: function (c, x, y, s, rot) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.5, -s * 0.35, s, 0); c.quadraticCurveTo(s * 0.5, s * 0.35, 0, 0); c.moveTo(0, 0); c.lineTo(s * 0.9, 0); c.stroke(); c.restore(); },
    sparkle: function (c, x, y, s) { c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.stroke(); },
    martini: function (c, x, y, s) { c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y - s); c.lineTo(x, y + s * 0.2); c.closePath(); c.moveTo(x, y + s * 0.2); c.lineTo(x, y + s * 1.2); c.moveTo(x - s * 0.5, y + s * 1.2); c.lineTo(x + s * 0.5, y + s * 1.2); c.moveTo(x + s * 0.3, y - s * 1.3); c.lineTo(x + s * 0.1, y - s * 0.6); c.stroke(); c.beginPath(); c.arc(x + s * 0.32, y - s * 1.35, s * 0.14, 0, Math.PI * 2); c.stroke(); },
    flute: function (c, x, y, s) { c.beginPath(); c.moveTo(x - s * 0.3, y - s * 1.2); c.lineTo(x + s * 0.3, y - s * 1.2); c.lineTo(x + s * 0.2, y + s * 0.1); c.lineTo(x - s * 0.2, y + s * 0.1); c.closePath(); c.moveTo(x, y + s * 0.1); c.lineTo(x, y + s * 1.1); c.moveTo(x - s * 0.4, y + s * 1.1); c.lineTo(x + s * 0.4, y + s * 1.1); c.stroke(); for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(x - s * 0.05 + i * s * 0.08, y - s * (0.4 + i * 0.25), s * 0.05, 0, Math.PI * 2); c.stroke(); } },
    rings: function (c, x, y, s) { c.beginPath(); c.arc(x - s * 0.35, y, s * 0.6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + s * 0.35, y, s * 0.6, 0, Math.PI * 2); c.stroke(); ART.sparkle(c, x - s * 0.35, y - s * 0.85, s * 0.18); },
    diya: function (c, x, y, s) { c.beginPath(); c.moveTo(x - s, y); c.quadraticCurveTo(x, y + s * 0.9, x + s, y); c.lineTo(x - s, y); c.stroke(); c.beginPath(); c.moveTo(x, y - s * 0.05); c.quadraticCurveTo(x + s * 0.3, y - s * 0.5, x, y - s * 1.1); c.quadraticCurveTo(x - s * 0.3, y - s * 0.5, x, y - s * 0.05); c.stroke(); }
  };
  function line(ctx, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }

  function render(ctx, L, opt) {
    var T = TEMPLATES[S.tid], P = PALETTES[S.pid], W = L.W;
    var bg = T.dark ? (S.pid === 'midnight' ? P.paper : '#121016') : T.white ? '#FFFFFF' : P.paper;
    var ink = T.dark ? '#F4EEE6' : P.ink, acc = P.accent;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, SH);
    // page decoration under the photos
    if (T.deco === 'kasavu') { ctx.fillStyle = P.soft; ctx.fillRect(0, 70, W, 34); ctx.fillStyle = acc; ctx.fillRect(0, 112, W, 10); ctx.fillStyle = acc; ctx.fillRect(0, SH - 122, W, 10); ctx.fillStyle = P.soft; ctx.fillRect(0, SH - 104, W, 34); }
    if (T.deco === 'film') { ctx.fillStyle = '#000'; ctx.fillRect(0, T.top - 120, W, SH - T.top - T.bottom + 240); ctx.fillStyle = '#EDE3CF'; for (var hx = 30; hx < W; hx += 90) { ctx.fillRect(hx, T.top - 90, 44, 34); ctx.fillRect(hx, SH - T.bottom + 56, 44, 34); } }
    if (T.deco === 'string') { line(ctx, acc, 3); ctx.beginPath(); for (var sx = 0; sx <= W; sx += 40) ctx.lineTo(sx, T.top - 70 + Math.sin(sx / W * Math.PI * L.n) * 40); ctx.stroke(); }
    // photos
    L.cells.forEach(function (c, i) {
      var img = S.bitmaps[c.id]; if (!img) return;
      if (T.cell === 'polaroid') {
        var rot = ((i * 37) % 9 - 4) * 0.012, yo = (i % 2 ? 50 : -10);
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + yo); ctx.rotate(rot);
        ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30; ctx.fillStyle = '#fff'; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.shadowBlur = 0;
        cover(ctx, img, -c.w / 2 + 24, -c.h / 2 + 24, c.w - 48, c.h - 150, c.id); if (S.hit) S.hit[S.hit.length - 1] = { id: c.id, x: c.x, y: c.y + yo, w: c.w, h: c.h, dw: S.hit[S.hit.length - 1].dw, dh: S.hit[S.hit.length - 1].dh };
        ctx.fillStyle = '#C9B48A'; ctx.fillRect(-14, -c.h / 2 - 26, 28, 52); ctx.restore(); return;
      }
      if (T.cell === 'arch') { ctx.save(); archPath(ctx, c.x, c.y, c.w, c.h); ctx.clip(); cover(ctx, img, c.x, c.y, c.w, c.h, c.id); ctx.restore(); line(ctx, acc, 4); archPath(ctx, c.x - 14, c.y - 14, c.w + 28, c.h + 28); ctx.stroke(); return; }
      cover(ctx, img, c.x, c.y, c.w, c.h, c.id);
      if (T.cell === 'outline') { line(ctx, acc, 3); ctx.strokeRect(c.x - 12, c.y - 12, c.w + 24, c.h + 24); }
      if (T.cell === 'neon') { ctx.save(); ctx.shadowColor = acc; ctx.shadowBlur = 30; line(ctx, acc, 5); ctx.strokeRect(c.x - 10, c.y - 10, c.w + 20, c.h + 20); ctx.restore(); }
      if (T.cell === 'caption' && opt.labels && opt.labels[c.id]) { ctx.fillStyle = '#8a8178'; ctx.font = '500 26px ' + MONO; ctx.textAlign = 'center'; tt(ctx, 'label:' + c.id, txOf('label:' + c.id, String(opt.labels[c.id]).toUpperCase()), c.x + c.w / 2, c.y + c.h + 52); }
    });
    // line decorations from the packs (one copy on every page)
    if (T.decoPaths && DECOPATHS[T.decoPaths] && window.Path2D) {
      var role = { ink: ink, accent: acc, soft: P.soft || acc };
      for (var pg = 0; pg < L.n; pg++) DECOPATHS[T.decoPaths].forEach(function (q) {
        ctx.save(); ctx.translate(pg * SW, 0); line(ctx, role[q.role] || acc, Math.max(0.5, Math.min(8, +q.stroke || 2))); try { ctx.stroke(new Path2D(q.d)); } catch (e) {} ctx.restore(); });
    }
    // words + drawings on top
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var names = S.names, date = S.date;
    if (T.deco === 'overlay') {
      var gr = ctx.createLinearGradient(0, SH * 0.6, 0, SH); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = gr; ctx.fillRect(0, SH * 0.6, SW, SH * 0.4);
      ctx.fillStyle = '#fff'; ctx.font = 'italic 400 96px ' + SERIF; tt(ctx, 'names', names, 70, SH - 130); ctx.font = '500 30px ' + MONO; tt(ctx, 'date', date, 74, SH - 70);
    } else if (T.deco === 'masthead') {
      ctx.fillStyle = ink; ctx.font = '600 30px ' + MONO; tt(ctx, 'issue', txOf('issue', 'THE WEDDING ISSUE'), 70, 200);
      line(ctx, ink, 2); ctx.beginPath(); ctx.moveTo(70, 230); ctx.lineTo(SW * 0.75 - 30, 230); ctx.stroke();
      ctx.font = '500 150px ' + SERIF; var parts = String(names).split(/\s*&\s*/); parts.forEach(function (p, i) { tt(ctx, 'names', (i ? '& ' : '') + p, 64, 420 + i * 160); });
      ctx.fillStyle = acc; ctx.font = '500 34px ' + MONO; tt(ctx, 'date', date, 70, 420 + parts.length * 160 + 20);
    } else if (T.deco !== 'none' || T.cell === 'caption') {
      ctx.fillStyle = ink; ctx.font = (T.dark ? '600 ' : 'italic 500 ') + '64px ' + (T.dark ? SANS : SERIF); tt(ctx, 'names', names, T.pad || 70, T.top - (T.deco === 'film' ? 160 : 70));
      ctx.font = '500 26px ' + MONO; ctx.fillStyle = T.dark ? acc : P.accent; ctx.textAlign = 'right'; tt(ctx, 'date', date, W - (T.pad || 70), SH - Math.max(60, T.bottom / 2 - 10)); ctx.textAlign = 'left';
      if (T.deco === 'rule') { line(ctx, acc, 2); ctx.beginPath(); ctx.moveTo(T.pad, T.top - 40); ctx.lineTo(W - T.pad, T.top - 40); ctx.stroke(); }
    }
    if (S.art) {
      line(ctx, T.dark ? acc : P.accent, 3);
      for (var s = 0; s < L.n; s++) {
        var ox = s * SW;
        if (T.deco === 'floral' || T.deco === 'rule' || T.deco === 'kasavu' || T.deco === 'string') { ART.flower(ctx, ox + SW - 120, 110, 30); ART.leaf(ctx, ox + SW - 170, 120, 46, 2.6); ART.leaf(ctx, ox + SW - 80, 150, 40, 1.1); if (s % 2) ART.marigold(ctx, ox + 120, SH - 90, 26); }
        if (T.deco === 'floral') { ART.flower(ctx, ox + 110, SH - 110, 36); ART.leaf(ctx, ox + 170, SH - 120, 50, -0.3); ART.leaf(ctx, ox + 60, SH - 170, 44, -1.9); }
        if (T.deco === 'cocktail') { ART.martini(ctx, ox + SW - 150, 120, 34); ART.flute(ctx, ox + 120, SH - 120, 40); ART.sparkle(ctx, ox + SW / 2, 90, 16); ART.sparkle(ctx, ox + SW - 260, SH - 90, 12); }
        if (T.deco === 'arch' && s % 2 === 0) ART.diya(ctx, ox + SW / 2, SH - 70, 30);
        if (T.deco === 'film' && s === 0) ART.rings(ctx, ox + SW - 140, 100, 40);
        if (T.deco === 'masthead' && s === L.n - 1) ART.sparkle(ctx, ox + SW - 100, SH - 70, 18);
      }
    }
    if (S.petals) {
      var cols2 = [P.accent, P.soft, '#E06B7A', '#F2A7B5'];
      for (var q = 0; q < Math.round(W / 26); q++) {
        var px = (q * 0.6180339 % 1) * W, py = Math.pow((q * 0.3819 + 0.13) % 1, 1.6) * SH * 0.55, pr = 9 + (q % 5) * 3, rot = q * 1.7;
        ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.globalAlpha = 0.75; ctx.fillStyle = cols2[q % cols2.length];
        ctx.beginPath(); ctx.moveTo(0, -pr); ctx.quadraticCurveTo(pr, -pr * 0.2, 0, pr); ctx.quadraticCurveTo(-pr, -pr * 0.2, 0, -pr); ctx.fill(); ctx.restore();
      }
    }
    (S.stickers || []).forEach(function (st, i) {
      var ic = (window.PG_STICKERS || []).filter(function (x) { return x.k === st.k; })[0]; if (!ic) return;
      if (!ic.path) ic.path = new Path2D(ic.d);
      ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.r || 0); var sc = st.s / 24; ctx.scale(sc, sc); ctx.translate(-12, -12);
      ctx.strokeStyle = st.col || (T.dark ? acc : P.accent); ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(ic.path); ctx.restore();
      if (S.hit) S.hitStickers.push({ i: i, x: st.x - st.s / 2, y: st.y - st.s / 2, w: st.s, h: st.s });
    });
    if (opt.preview && S.sel) {
      var box = S.sel.type === 'sticker' ? (S.hitStickers.filter(function (h) { return h.i === S.sel.i; })[0]) : S.sel.type === 'text' ? unionBox(S.hitTexts.filter(function (h) { return h.key === S.sel.key; })) : (S.hit.filter(function (h) { return h.id === S.sel.id; })[0]);
      if (box) { ctx.save(); ctx.strokeStyle = '#E7C873'; ctx.lineWidth = 10; ctx.setLineDash([30, 18]); ctx.strokeRect(box.x - 6, box.y - 6, box.w + 12, box.h + 12); ctx.restore(); }
    }
    // small, light watermark on the last slide
    ctx.font = '500 22px ' + MONO; ctx.textAlign = 'right'; ctx.fillStyle = T.dark ? 'rgba(255,255,255,.32)' : 'rgba(60,45,30,.32)'; ctx.fillText('PicGrades', W - 30, SH - 24);
  }

  function build() {
    var list = S.photos.filter(function (p) { return p.on && S.bitmaps[p.id]; }).map(function (p) { var b = S.bitmaps[p.id]; return { id: p.id, w: b.width, h: b.height }; });
    if (!list.length) return null;
    var T = TEMPLATES[S.tid];
    if (S.format === 'single') return layoutStrip(list.slice(0, T.singles ? 1 : 4), T, 1);
    if (S.format === 'carousel') return layoutCarousel(list, T);
    return layoutStrip(list, T, S.slides || 0);
  }
  function draw() {
    if (!S || !S.big) return;
    var L = build(); S.L = L; if (!L) return;
    var sw = S.stage.clientWidth || 360, sh = S.stage.clientHeight || 420, slideW = Math.max(120, Math.min(sw - 16, sh * SW / SH));
    var sc = S.pscale = Math.min(4000 / L.W, Math.max(0.3, Math.min(0.75, slideW * Math.min(2.5, window.devicePixelRatio || 1) / SW)));
    S.big.width = Math.round(L.W * sc); S.big.height = Math.round(SH * sc);
    var ctx = S.big.getContext('2d'); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    S.hit = []; S.hitStickers = []; S.hitTexts = [];
    render(ctx, L, { labels: S.opt.labels || {}, preview: true });
    S.lastHit = S.hit; S.lastHitStickers = S.hitStickers; S.lastHitTexts = S.hitTexts; S.hit = null; S.hitStickers = null; S.hitTexts = null;
    S.prev.style.width = (slideW * L.n) + 'px'; S.prev.style.height = (slideW * SH / SW) + 'px';
    S.stage.style.paddingLeft = S.stage.style.paddingRight = Math.max(8, (sw - slideW) / 2) + 'px';
    S.seams.innerHTML = '';
    for (var i = 0; i < L.n; i++) { S.seams.appendChild(el('b', { class: 'pe-snap', style: 'left:' + (i / L.n * 100) + '%' })); if (i && S.format === 'strip') S.seams.appendChild(el('i', { style: 'left:' + (i / L.n * 100) + '%' })); }
    dots(); commitSoon();
  }
  // ---------- undo / redo: every change is a step; a drag or a burst of typing counts as one ----------
  function snap() { return JSON.stringify({ tid: S.tid, pid: S.pid, format: S.format, per: S.per, slides: S.slides, art: S.art, petals: S.petals, names: S.names, date: S.date, tx: S.tx || {}, filter: S.filter, fcss: S.fcss, shape: S.shape, photos: S.photos, adj: S.adj, stickers: S.stickers }); }
  var commitT = null;
  function commitSoon() { clearTimeout(commitT); commitT = setTimeout(commit, 350); }
  function commit() { if (!S || S.view !== 'edit') return; var now = snap(); if (S.lastSnap == null) { S.lastSnap = now; return updUndo(); } if (now === S.lastSnap) return; S.undo.push(S.lastSnap); if (S.undo.length > 60) S.undo.shift(); S.redo = []; S.lastSnap = now; updUndo(); }
  function restore(js) { var o = JSON.parse(js); Object.keys(o).forEach(function (k) { S[k] = o[k]; }); setShape(o.shape); S.lastSnap = js; S.sel = null; if (S.edit) S.edit.style.display = 'none'; closeSheet(); clearTimeout(commitT); draw(); clearTimeout(commitT); updUndo(); }
  function undo() { clearTimeout(commitT); commit(); if (!S.undo.length) return; S.redo.push(S.lastSnap); restore(S.undo.pop()); }
  function redo() { if (!S.redo.length) return; S.undo.push(S.lastSnap); restore(S.redo.pop()); }
  function updUndo() { if (S.undoBtn) { S.undoBtn.disabled = !S.undo.length; S.redoBtn.disabled = !S.redo.length; } }
  function slide(i) {   // one full-size slide (1080×1350)
    var c = document.createElement('canvas'); c.width = SW; c.height = SH;
    var ctx = c.getContext('2d'); ctx.translate(-i * SW, 0); render(ctx, S.L, { labels: S.opt.labels || {} });
    return c;
  }
  function slides() { var out = []; for (var i = 0; i < S.L.n; i++) out.push(slide(i)); return out; }
  function toBlob(c, q) { return new Promise(function (res) { c.toBlob(res, 'image/jpeg', q || 0.92); }); }

  var CSS = '' +
    'body.ps-on .tkg-global-nav,body.ps-on .pgv-top,body.ps-on .pgv-bar{display:none!important}' +
    '.ps-wrap{position:fixed;inset:0;z-index:300;background:#0b0908;color:#f3eee6;display:flex;flex-direction:column;font-family:"Plus Jakarta Sans",system-ui,sans-serif}' +
    '.ps-top{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px}.ps-top h3{margin:0;font:400 1.5rem/1 "Cormorant Garamond",serif}' +
    '.ps-x{margin-left:auto;width:42px;height:42px;border-radius:21px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:22px;cursor:pointer}' +
    '.ps-stage{flex:1 1 auto;min-height:0;overflow-x:auto;overflow-y:hidden;display:flex;align-items:center;padding:6px 14px;scroll-snap-type:x mandatory}' +
    '.ps-prev{position:relative;height:100%;max-height:100%;flex:none;box-shadow:0 10px 40px rgba(0,0,0,.6)}.ps-prev canvas{width:100%;height:100%;display:block}' +
    '.ps-seams i{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed rgba(231,200,115,.75)}' +
    '.ps-panel{flex:none;max-height:46vh;overflow-y:auto;padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 14px);background:#141110;border-top:1px solid rgba(255,255,255,.08)}' +
    '.ps-lbl{font:500 .62rem/1 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:8px 0 8px}' +
    '.ps-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px}.ps-row::-webkit-scrollbar{display:none}' +
    '.ps-chip{flex:none;min-height:40px;padding:0 14px;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:600 .78rem/1 inherit;cursor:pointer;white-space:nowrap}.ps-chip.on{background:#E7C873;color:#1b140c;border-color:#E7C873}' +
    '.ps-dot{flex:none;width:40px;height:40px;border-radius:20px;border:2px solid rgba(255,255,255,.2);cursor:pointer;position:relative}.ps-dot.on{border-color:#fff;box-shadow:0 0 0 2px #E7C873}' +
    '.ps-th{flex:none;position:relative;width:58px;height:58px;border:0;padding:0;background:#222;border-radius:8px;overflow:hidden;cursor:pointer}.ps-th img{width:100%;height:100%;object-fit:cover}.ps-th.off img{opacity:.3}' +
    '.ps-add{display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(231,200,115,.15);border:1px dashed #E7C873;color:#E7C873;font:300 26px/1 sans-serif}' +
    '.ps-in{width:100%;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0908;color:#fff;padding:0 12px;font:16px inherit;margin-bottom:8px;box-sizing:border-box}' +
    '.ps-tog{display:flex;align-items:center;gap:10px;min-height:40px;font-size:.85rem}.ps-tog input{width:20px;height:20px;accent-color:#E7C873}' +
    '.ps-go{width:100%;min-height:50px;border:0;border-radius:12px;background:#E7C873;color:#1b140c;font:700 1rem/1 inherit;cursor:pointer;margin-top:8px}.ps-go:disabled{opacity:.6}' +
    '.ps-sub{width:100%;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:600 .9rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.ps-msg{font-size:.82rem;color:rgba(255,255,255,.78);margin:8px 0 0;min-height:1.2em}' +
    '.ps-edit{background:#1f1a16;border:1px solid rgba(231,200,115,.4);border-radius:14px;padding:12px;margin-bottom:10px}.ps-range{width:100%;accent-color:#E7C873;height:30px}' +
    '.ps-hint{margin:0;padding:0 14px 6px;font-size:.72rem;color:rgba(255,255,255,.55);text-align:center}' +
    '.ps-sgrid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 12px 24px;align-content:start}' +
    '.ps-stk{aspect-ratio:1;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:#f7f1e6;color:#8a6a2c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;padding:6px}' +
    '.ps-stk span{width:56%;display:block}.ps-stk svg{width:100%;height:auto;display:block}.ps-stk small{font:600 9px/1.1 sans-serif;color:#5a4a36;text-align:center}' +
    '.ps-picker{position:absolute;inset:0;z-index:5;background:#0b0908;display:flex;flex-direction:column}.ps-pgrid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:0 3px 20px;align-content:start}' +
    '.ps-pick{position:relative;aspect-ratio:1;border:0;padding:0;background:#222;cursor:pointer}.ps-pick img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.ps-pick i{position:absolute;right:6px;top:6px;width:22px;height:22px;border-radius:11px;border:2px solid #fff;background:rgba(0,0,0,.25)}.ps-pick.on i{background:#E7C873;border-color:#E7C873}.ps-pick.on i::after{content:"✓";display:block;text-align:center;font:700 13px/18px sans-serif;color:#1b140c}';


  var PE_CSS = '' +
    '.pe-wrap{background:#000}.pe-view{position:absolute;inset:0;display:none;flex-direction:column}' +
    '.pe-wrap[data-view=pick] .pe-v-pick,.pe-wrap[data-view=edit] .pe-v-edit,.pe-wrap[data-view=share] .pe-v-share{display:flex}' +
    '.pe-bar{flex:none;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px}' +
    '.pe-title{flex:1;text-align:center;font:700 16px/1 "Plus Jakarta Sans",system-ui,sans-serif}' +
    '.pe-ib{flex:none;width:40px;height:40px;border-radius:20px;border:0;background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;cursor:pointer}.pe-ib svg{width:22px;height:22px}' +
    '.pe-ur{width:36px;height:36px}.pe-ur svg{width:19px;height:19px}.pe-ur:disabled{opacity:.3}' +
    '.pe-next{flex:none;height:38px;padding:0 16px;border-radius:12px;border:0;background:#fff;color:#111;font:800 15px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}.pe-next:disabled{opacity:.4}' +
    '.pe-logo{flex:1;display:flex;align-items:center;gap:7px;font:700 15px/1 "Plus Jakarta Sans",system-ui,sans-serif}.pe-logo svg{width:26px;height:26px;color:#fff}' +
    '.pe-stage1{position:relative;flex:none;height:44vh;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '.pe-box1{height:100%;max-width:100%;background:#1b1b1b;overflow:hidden}.pe-big1{width:100%;height:100%;object-fit:cover;display:block}' +
    '.pe-over{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}' +
    '.pe-pill{pointer-events:auto;height:32px;padding:0 12px;border-radius:16px;border:0;background:rgba(0,0,0,.65);color:#fff;font:700 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}' +
    '.pe-count{padding:6px 10px;border-radius:14px;background:rgba(0,0,0,.65);font:600 12px/1 "Plus Jakarta Sans",system-ui,sans-serif}' +
    '.pe-row1{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px}' +
    '.pe-colsel{flex:1;min-width:0;height:36px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:#111;color:#fff;font:600 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;padding:0 12px}' +
    '.pe-phone{flex:none;display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 12px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:600 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}.pe-phone svg{width:16px;height:16px}' +
    '.pe-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;align-content:start}' +
    '.pe-pick{position:relative;aspect-ratio:3/4;border:0;padding:0;background:#222;cursor:pointer}.pe-pick img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.pe-pick i{position:absolute;right:5px;top:5px;width:22px;height:22px;border-radius:11px;border:1.5px solid #fff;background:rgba(0,0,0,.3);font:800 12px/19px "Plus Jakarta Sans",system-ui,sans-serif;font-style:normal;text-align:center;color:#111}' +
    '.pe-pick.on i{background:#FAC646;border-color:#FAC646}.pe-pick.cur:after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.35)}' +
    '.pe-tabs{flex:none;display:flex;justify-content:center;gap:22px;padding:10px 0 calc(env(safe-area-inset-bottom,0px) + 12px);background:#000}' +
    '.pe-tab{border:0;background:none;color:rgba(255,255,255,.6);font:800 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:.04em;padding:8px 14px;border-radius:16px;cursor:pointer}.pe-tab.on{background:#fff;color:#111}' +
    '.pe-stage{flex:1 1 auto;min-height:0;overflow-x:auto;overflow-y:hidden;display:flex;align-items:center;scroll-snap-type:x mandatory;scrollbar-width:none}.pe-stage::-webkit-scrollbar{display:none}' +
    '.pe-stage .ps-prev{flex:none;box-shadow:none}.pe-snap{position:absolute;top:0;width:1px;height:1px;scroll-snap-align:center}' +
    '.pe-dotrow{flex:none;position:relative;display:flex;justify-content:center;align-items:center;height:22px}.pe-dots{display:flex;gap:5px}.pe-dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.3)}.pe-dots i.on{background:#FAC646}' +
    '.pe-slideno{position:absolute;right:14px;font:600 11px/1 "Plus Jakarta Sans",system-ui,sans-serif;color:rgba(255,255,255,.6)}' +
    '.pe-tip{flex:none;margin:0;padding:0 14px 4px;font-size:11.5px;color:rgba(255,255,255,.5);text-align:center}' +
    '.pe-tools{flex:none;display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;padding:8px 6px calc(env(safe-area-inset-bottom,0px) + 10px)}.pe-tools::-webkit-scrollbar{display:none}' +
    '.pe-tool{flex:none;width:66px;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;color:#fff;font:600 11.5px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;padding:4px 0}.pe-tool svg{width:25px;height:25px}' +
    '.pe-sheet,.pe-pop{position:absolute;left:0;right:0;bottom:0;z-index:6;max-height:58%;display:flex;flex-direction:column;background:#17130f;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.6)}' +
    '.pe-pop{padding:14px 16px calc(env(safe-area-inset-bottom,0px) + 14px);overflow-y:auto;gap:6px}' +
    '.pe-sh-top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px}.pe-sh-top b{font-size:16px}.pe-sh-body{overflow-y:auto;padding:6px 16px calc(env(safe-area-inset-bottom,0px) + 16px)}' +
    '.pe-done{height:34px;padding:0 16px;border-radius:17px;border:0;background:#fff;color:#111;font:800 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}' +
    '.pe-thisone{display:flex;align-items:center;gap:12px}.pe-thisone b{flex:1;font-size:15px}.pe-ethumb{width:46px;height:60px;object-fit:cover;border-radius:6px;border:2px solid #FAC646}' +
    '.pe-repl{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:19px;border:0;background:#FAC646;color:#111;font:700 14px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}.pe-repl svg{width:16px;height:16px}' +
    '.pe-note{font-size:12px;color:rgba(255,255,255,.6);margin:8px 0}' +
    '.pe-frow{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.pe-filter{flex:none;border:0;background:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 11.5px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}' +
    '.pe-filter img{width:64px;height:84px;object-fit:cover;border-radius:8px;border:2px solid transparent}.pe-filter.on img{border-color:#FAC646}' +
    '.pe-orow{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.pe-ord{flex:none;position:relative;width:72px;text-align:center}.pe-ord img{width:72px;height:96px;object-fit:cover;border-radius:8px;display:block}' +
    '.pe-ord b{position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:10px;background:#FAC646;color:#111;font:800 11px/20px "Plus Jakarta Sans",system-ui,sans-serif}' +
    '.pe-ord div{display:flex;justify-content:center;gap:6px;margin-top:6px}.pe-ord button{width:30px;height:30px;border-radius:15px;border:0;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer}.pe-ord button svg{width:16px;height:16px}.pe-ord button:disabled{opacity:.3}' +
    '.pe-picker{position:absolute;inset:0;z-index:8;background:#000;display:flex;flex-direction:column}' +
    '.pe-shbody{flex:1;overflow-y:auto;padding:4px 14px calc(env(safe-area-inset-bottom,0px) + 20px)}' +
    '.pe-shstrip{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px}.pe-shth{flex:none;width:88px;height:auto;border-radius:6px}' +
    '.pe-cap{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#111;color:#fff;padding:10px 12px;font:15px/1.4 "Plus Jakarta Sans",system-ui,sans-serif;resize:none}' +
    '.pe-shbody .ps-lbl{display:flex;align-items:center;gap:6px;margin-top:14px}.pe-shbody .ps-lbl svg{width:14px;height:14px}' +
    '.pe-profile{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}.pe-tile{position:relative;aspect-ratio:3/4;background:#1c1c1c;overflow:hidden}.pe-tile img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.pe-tile.new{outline:2px solid #FAC646;outline-offset:-2px}.pe-tile b{position:absolute;left:5px;bottom:5px;padding:2px 6px;border-radius:6px;background:#FAC646;color:#111;font:800 10px/1.3 "Plus Jakarta Sans",system-ui,sans-serif}' +
    '.pe-tile i{position:absolute;right:5px;top:5px;color:#fff}.pe-tile i svg{width:16px;height:16px}.pe-tile.empty{background:#141414}' +
    '.pe-sheet.pe-tall{max-height:78%}.pe-cats{padding-top:0}' +
    '.pe-tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.pe-tpl{border:0;background:none;color:#fff;padding:0;display:flex;flex-direction:column;gap:5px;cursor:pointer;text-align:left}' +
    '.pe-tcan{width:100%;height:auto;border-radius:6px;background:#222;border:2px solid transparent;display:block}.pe-tpl.on .pe-tcan{border-color:#FAC646}.pe-tpl span{font:600 11px/1.25 "Plus Jakarta Sans",system-ui,sans-serif;color:rgba(255,255,255,.85)}' +
    '.pe-artrow{margin:0 14px 6px;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.06);flex-wrap:wrap}.pe-artrow small{flex-basis:100%;font-size:11px;color:rgba(255,255,255,.55);margin-left:30px}' +
    '.pe-share{background:#fff;color:#111;border:0;font-weight:800}' +
    '.pe-msg{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);z-index:9;margin:0;padding:10px 14px;border-radius:12px;background:rgba(20,17,14,.94);color:#fff;font-size:13px;display:none}.pe-msg.on{display:block}';
  function chips(row, list, cur, onPick, cls) {
    row.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', { type: 'button', 'data-v': String(it.v), class: (cls || 'ps-chip') + (it.v === cur ? ' on' : ''), text: it.t || '', 'aria-label': it.label || it.t, style: it.style || '', onclick: function () { row.querySelectorAll('button').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); onPick(it.v); } });
      row.appendChild(b);
    });
  }
  // ---------- editing on the page ----------
  function at(e) { var r = S.big.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * S.L.W, y: (e.clientY - r.top) / r.height * SH }; }
  function hitAt(pt) {
    var hs = (S.lastHitStickers || []).slice().reverse().filter(function (h) { return pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h; })[0];
    if (hs) return { type: 'sticker', i: hs.i };
    var ht = (S.lastHitTexts || []).slice().reverse().filter(function (h) { return pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h; })[0];
    if (ht) return { type: 'text', key: ht.key };
    var hc = (S.lastHit || []).filter(function (h) { return pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h; }).pop();
    return hc ? { type: 'photo', id: hc.id } : null;
  }
  var rafPending = false;
  function redraw() { if (rafPending) return; rafPending = true; requestAnimationFrame(function () { rafPending = false; if (S) draw(); }); }
  function bindEditing() {
    var down = null;
    S.prev.addEventListener('pointerdown', function (e) { if (!S.L) return; down = { x: e.clientX, y: e.clientY, pt: at(e), moved: false, last: at(e) }; if (S.sel) { S.prev.setPointerCapture(e.pointerId); e.preventDefault(); } });
    S.prev.addEventListener('pointermove', function (e) {
      if (!down || !S.sel) return;
      var pt = at(e), dx = pt.x - down.last.x, dy = pt.y - down.last.y; down.last = pt;
      if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4) down.moved = true;
      if (S.sel.type === 'photo') {
        var h = (S.lastHit || []).filter(function (x) { return x.id === S.sel.id; })[0]; if (!h) return;
        var a = Object.assign({}, focusOf(S.sel.id)); a.fx = Math.max(0, Math.min(1, a.fx - dx / h.dw)); a.fy = Math.max(0, Math.min(1, a.fy - dy / h.dh)); S.adj[S.sel.id] = a;
      } else if (S.sel.type === 'text') { S.tx = Object.assign({}, S.tx); var o = Object.assign({}, S.tx[S.sel.key]); o.dx = (o.dx || 0) + dx; o.dy = (o.dy || 0) + dy; S.tx[S.sel.key] = o; }
      else { var st = S.stickers[S.sel.i]; st.x += dx; st.y += dy; }
      redraw();
    });
    S.prev.addEventListener('pointercancel', function () { down = null; });
    S.prev.addEventListener('pointerup', function (e) {
      if (!down) return; var d = down; down = null;
      if (d.moved) return;
      var hit = hitAt(d.pt);
      if (!hit) { if (S.sel) select(null); return; }
      select(hit);
    });
    S.eZoom.addEventListener('input', function () {
      if (!S.sel) return;
      if (S.sel.type === 'photo') { var a = Object.assign({}, focusOf(S.sel.id)); a.z = Number(S.eZoom.value); S.adj[S.sel.id] = a; }
      else S.stickers[S.sel.i].s = Number(S.eZoom.value);
      redraw();
    });
    S.eRot.addEventListener('input', function () { if (S.sel && S.sel.type === 'sticker') { S.stickers[S.sel.i].r = Number(S.eRot.value); redraw(); } });
  }
  function addSticker(k) {
    var vis = Math.round(S.stage.scrollLeft / Math.max(1, S.big.getBoundingClientRect().width / S.L.n));
    S.stickers.push({ k: k, x: Math.min(S.L.n - 1, vis) * SW + SW * 0.78, y: SH * 0.16, s: 150, r: 0, col: '' });
    select({ type: 'sticker', i: S.stickers.length - 1 });
  }
  // the drawings file loads in the background; anything that needs it waits for it (opened quickly = no error)
  var stickersP = null;
  function addStickerPack() {   // extra drawings: /app/packs/stickers.json, same format as stickers.js
    return getJSON('/app/packs/stickers.json').then(function (l) {
      var have = {}; window.PG_STICKERS.forEach(function (x) { have[x.k] = 1; });
      l.forEach(function (x) { if (x && x.k && !have[x.k] && x.n && /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/.test(x.d || '') && String(x.d).length < 4000) { window.PG_STICKERS.push({ k: x.k, n: String(x.n).slice(0, 24), c: x.c || 'Wedding', d: x.d }); have[x.k] = 1; } });
    });
  }
  function stickersReady() {
    if (window.PG_STICKERS) return Promise.resolve();
    if (!stickersP) stickersP = new Promise(function (res, rej) { var ss = document.createElement('script'); ss.src = '/app/stickers.js'; ss.onload = function () { addStickerPack().then(res); }; ss.onerror = function () { stickersP = null; rej(new Error('The drawings could not load. Check the internet and try again.')); }; document.head.appendChild(ss); });
    return stickersP;
  }
  function stickerSheet() {
    if (!window.PG_STICKERS) { msg('Getting the drawings ready…'); stickersReady().then(function () { msg(''); stickerSheet(); }, function (e) { msg(e.message); }); return; }
    var cats = ['Flowers', 'Wedding', 'Ceremony', 'Love', 'Party', 'Lettering'].filter(function (c) { return window.PG_STICKERS.some(function (x) { return x.c === c; }); }), cur = 'Flowers';
    var grid = el('div', { class: 'ps-sgrid' }), tabs = el('div', { class: 'ps-row', style: 'padding:4px 14px 10px' });
    // the template's own flowers and leaves: on/off at the top of the collection
    var art = el('input', { type: 'checkbox' }); art.checked = S.art; art.addEventListener('change', function () { S.art = art.checked; draw(); });
    var artRow = el('label', { class: 'ps-tog pe-artrow' }, [art, el('span', { text: 'Template drawings' }), el('small', { text: 'the flowers and leaves that come with the template' })]);
    var box = el('div', { class: 'ps-picker', role: 'dialog', 'aria-label': 'Flowers and wedding drawings' }, [
      el('div', { class: 'ps-top' }, [el('h3', { text: 'Flowers & drawings' }), el('button', { type: 'button', class: 'ps-x', 'aria-label': 'Close', text: '×', onclick: function () { box.remove(); } })]), artRow, tabs, grid]);
    function show(c) {
      cur = c; tabs.querySelectorAll('.ps-chip').forEach(function (b) { b.classList.toggle('on', b.textContent === c); }); grid.innerHTML = '';
      window.PG_STICKERS.filter(function (x) { return x.c === c; }).forEach(function (x) {
        grid.appendChild(el('button', { type: 'button', class: 'ps-stk', 'aria-label': x.n, onclick: function () { box.remove(); addSticker(x.k); } },
          [el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="' + x.d + '"/></svg>' }), el('small', { text: x.n })]));
      });
    }
    cats.forEach(function (c) { tabs.appendChild(el('button', { type: 'button', class: 'ps-chip', text: c, onclick: function () { show(c); } })); });
    S.wrap.appendChild(box); show(cur);
  }

  // ---------- groups by event (styles and templates from the packs say which events they suit) ----------
  var GROUPS = [['all', 'All'], ['haldi', 'Haldi', ['haldi']], ['mehendi', 'Mehendi', ['mehendi']], ['sangeet', 'Sangeet', ['sangeet']], ['baraat', 'Baraat', ['baraat']],
    ['wedding', 'Wedding', ['wedding', 'pheras', 'ceremony', 'muhurtham', 'vidaai']], ['reception', 'Reception', ['reception', 'highlights']], ['cocktail', 'Cocktail', ['cocktail']]];
  function inGroup(x, g) { if (g === 'all') return true; var G = GROUPS.filter(function (r) { return r[0] === g; })[0]; return !!(G && (x.forWhat || []).some(function (f) { return G[2].indexOf(f) > -1; })); }
  // add ?packinfo to the gallery address to see who made each style (G = Gemini, C = ChatGPT) while testing
  var PACKINFO = /[?&]packinfo\b/.test(location.search);
  function label(x) { return x.name + (PACKINFO && x.by ? (x.by === 'gemini' ? ' · G' : x.by === 'chatgpt' ? ' · C' : '') : ''); }
  var DECOPATHS = {};   // page decorations drawn as lines (album-decos.json)
  // ---------- extra templates and drawings from /app/packs (format: see the helpers' brief) ----------
  var CELLS = { plain: 1, polaroid: 1, caption: 1, arch: 1, outline: 1, neon: 1 }, DECOS = { none: 1, rule: 1, overlay: 1, film: 1, string: 1, masthead: 1, arch: 1, kasavu: 1, floral: 1, cocktail: 1 };
  var LAYS = { mosaic: 1, hero: 1, singles: 1, stagger: 1, triple: 1, pairs: 1 };
  function addTemplate(x) {
    if (!x || !x.id || TEMPLATES[x.id] || !x.name) return false;
    var pg = x.page || {}, num = function (v, d, lo, hi) { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    var ok = function (b) { return Array.isArray(b) && b.length === 4 && b.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 1; }) && b[0] + b[2] <= 1.001 && b[1] + b[3] <= 1.001 && b[2] > 0.05 && b[3] > 0.05; };
    var slots = Array.isArray(x.slots) ? x.slots.map(function (d) { return (Array.isArray(d) ? d : []).filter(ok); }).filter(function (d) { return d.length; }) : null;
    if (!(slots && slots.length) && !LAYS[x.layout]) return false;
    TEMPLATES[x.id] = { name: String(x.name).slice(0, 30), pad: num(pg.pad, 70, 0, 300), top: num(pg.top, 180, 0, 500), bottom: num(pg.bottom, 160, 0, 500), gap: num(pg.gap, 20, 0, 120),
      cell: CELLS[x.cell] ? x.cell : 'plain', deco: DECOS[x.deco] ? x.deco : 'none', layout: LAYS[x.layout] ? x.layout : 'pairs', slots: slots && slots.length ? slots : null,
      dark: !!x.dark, white: !!x.white, palette: null, forWhat: x.for || [], by: x.by || '', decoPaths: typeof x.decoPaths === 'string' ? x.decoPaths : '' };
    var P = x.palette || {}, hex = function (v) { return /^#[0-9a-f]{6}$/i.test(v || ''); };
    if (hex(P.paper) && hex(P.ink) && hex(P.accent)) { PALETTES[x.id] = { name: String(x.name).slice(0, 30), paper: P.paper, ink: P.ink, accent: P.accent, soft: hex(P.soft) ? P.soft : P.accent }; TEMPLATES[x.id].palette = x.id; }
    ORDER.push(x.id); return true;
  }
  var packsP = null;
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (l) { return Array.isArray(l) ? l : []; }).catch(function () { return []; }); }
  function loadPacks() {
    if (!packsP) packsP = Promise.race([Promise.all([
      getJSON('/app/packs/album-templates.json').then(function (l) { l.forEach(addTemplate); }),
      getJSON('/app/packs/album-decos.json').then(function (l) { l.forEach(function (d) {
        if (d && d.id && Array.isArray(d.paths)) DECOPATHS[d.id] = d.paths.filter(function (q) { return q && /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/.test(q.d || '') && String(q.d).length < 6000; }); }); })
    ]), new Promise(function (res) { setTimeout(res, 2500); })]);
    return packsP;
  }
  // ================= Post Edits (step 25): Instagram-style new-post screens — choose → edit → share =================
  var SHAPES = { '34': [1440, '3:4'], '45': [1350, '4:5'], '11': [1080, '1:1'] };
  function setShape(k) { S.shape = SHAPES[k] ? k : '34'; SH = SHAPES[S.shape][0]; }
  var FILTERS = [['none', 'Original', ''], ['warm', 'Warm', 'sepia(.22) saturate(1.15) brightness(1.03)'], ['golden', 'Golden', 'sepia(.35) saturate(1.3) hue-rotate(-8deg)'],
    ['film', 'Film', 'contrast(1.08) saturate(.85) sepia(.15)'], ['vivid', 'Vivid', 'saturate(1.4) contrast(1.08)'], ['cool', 'Cool', 'hue-rotate(-12deg) saturate(.9) brightness(1.02)'],
    ['fade', 'Fade', 'contrast(.85) brightness(1.08) saturate(.8)'], ['bw', 'B&W', 'grayscale(1) contrast(1.12)'], ['noir', 'Noir', 'grayscale(1) contrast(1.35) brightness(.92)']];
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="16" y="18" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="13" fill="currentColor">PG</text><path d="M7.5 23.5h6M18.5 23.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 21.2l3 4.6M17.5 21.2l-3 4.6" stroke="#FAC646" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var ICON = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>', back: '<path d="M15 6l-6 6 6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    template: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8M13 17h8"/>',
    colours: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/>',
    text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    sticker: '<path d="M14 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8l7-7V6a3 3 0 0 0-3-3h-4z"/><path d="M14 21v-4a3 3 0 0 1 3-3h4"/><path d="M8.5 10h.01M14.5 10h.01M9 14c1.5 1 4.5 1 6 0"/>',
    filters: '<circle cx="9" cy="9" r="6"/><circle cx="15" cy="9" r="6"/><circle cx="12" cy="15" r="6"/>',
    slides: '<rect x="2" y="6" width="5" height="12" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="17" y="6" width="5" height="12" rx="1"/>',
    order: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
    shape: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 8h14M5 16h14"/>',
    replace: '<path d="M4 4h6v6H4zM14 14h6v6h-6z"/><path d="M14 7h3a3 3 0 0 1 3 3v1M10 17H7a3 3 0 0 1-3-3v-1"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    grid: '<rect x="3" y="3" width="5" height="7"/><rect x="9.5" y="3" width="5" height="7"/><rect x="16" y="3" width="5" height="7"/><rect x="3" y="14" width="5" height="7"/><rect x="9.5" y="14" width="5" height="7"/><rect x="16" y="14" width="5" height="7"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; }
  function isPhone(id) { return String(id).indexOf('ph:') === 0; }
  function thumbUrl(id, w) { return isPhone(id) ? ((S.thumbs || {})[id] || '') : 'https://lh3.googleusercontent.com/d/' + id + '=w' + w; }
  // photos from the phone: read here only, made smaller first, nothing uploaded unless the post itself is posted
  function loadPhoneFile(f) {
    var id = 'ph:' + (S.phoneN = (S.phoneN || 0) + 1), u = URL.createObjectURL(f); URLS.push(u);
    return imgFromSrc(u).then(function (im) {
      var r = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      var t = document.createElement('canvas'), tr = 240 / Math.max(c.width, c.height); t.width = Math.round(c.width * tr); t.height = Math.round(c.height * tr); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
      S.thumbs[id] = t.toDataURL('image/jpeg', 0.7);
      return new Promise(function (res) { c.toBlob(function (b) { c.width = c.height = 1; res(b); }, 'image/jpeg', 0.9); });
    }).then(bitmapFromBlob).then(function (im) { S.bitmaps[id] = im; return id; });
  }
  function msg(t) { if (S && S.msgEl) { S.msgEl.textContent = t || ''; S.msgEl.classList.toggle('on', !!t); } }
  function chosenIds() { return S.photos.map(function (p) { return p.id; }); }

  // ---------- one photo grid, used for choosing and for Replace ----------
  function photoGrid(o) {   // o: { single, cols, onChange, onTap }
    var cols = o.cols, grid = el('div', { class: 'pe-grid' }), sel = el('select', { class: 'pe-colsel', 'aria-label': 'Collection' });
    var pin = el('input', { type: 'file', accept: 'image/*', multiple: '', class: 'pe-pin', style: 'display:none' });
    var pbtn = el('button', { type: 'button', class: 'pe-phone', html: ic('phone') + '<span>Phone</span>', onclick: function () { pin.click(); } });
    cols.forEach(function (c, i) { sel.appendChild(el('option', { value: String(i), text: c.name + ' (' + c.photos.length + ')' })); });
    function show(i) {
      grid.innerHTML = ''; var c = cols[+i]; if (!c) return;
      c.photos.forEach(function (p) {
        var t = el('button', { type: 'button', class: 'pe-pick', 'data-id': p.id }, [el('img', { src: thumbUrl(p.id, 240), alt: '', loading: 'lazy' }), el('i')]);
        t.addEventListener('click', function () { o.onTap(p.id); paint(); });
        grid.appendChild(t);
      });
      paint();
    }
    function paint() {
      var ids = o.single ? [] : chosenIds();
      grid.querySelectorAll('.pe-pick').forEach(function (t) { var k = ids.indexOf(t.dataset.id); t.classList.toggle('on', k > -1); t.querySelector('i').textContent = k > -1 ? String(k + 1) : ''; t.classList.toggle('cur', t.dataset.id === S.cur); });
    }
    sel.addEventListener('change', function () { show(sel.value); });
    pin.addEventListener('change', function () {
      var files = Array.prototype.slice.call(pin.files || []).slice(0, 20); pin.value = ''; if (!files.length) return;
      var got = [], bad = 0, n = 0; pbtn.disabled = true;
      var step = function () {
        if (!files.length) {
          pbtn.disabled = false; pbtn.querySelector('span').textContent = 'Phone';
          if (!S.phoneCol) { S.phoneCol = { name: 'From your phone', photos: [] }; }
          if (cols.indexOf(S.phoneCol) < 0) { cols.push(S.phoneCol); sel.appendChild(el('option', { value: String(cols.length - 1) })); }
          got.forEach(function (id) { S.phoneCol.photos.push({ id: id }); });
          var ix = cols.indexOf(S.phoneCol); sel.options[ix].textContent = S.phoneCol.name + ' (' + S.phoneCol.photos.length + ')'; sel.value = String(ix); show(ix);
          if (o.onPhone) o.onPhone(got);
          if (bad) msg(bad + ' photo(s) could not be opened on this phone.');
          return;
        }
        pbtn.querySelector('span').textContent = 'Opening ' + (++n) + '…';
        loadPhoneFile(files.shift()).then(function (id) { got.push(id); }, function () { bad++; }).then(step);
      };
      step();
    });
    if (S.phoneCol && cols.indexOf(S.phoneCol) < 0) { cols.push(S.phoneCol); sel.appendChild(el('option', { value: String(cols.length - 1), text: S.phoneCol.name + ' (' + S.phoneCol.photos.length + ')' })); }
    show(0);
    return { grid: grid, sel: sel, pbtn: pbtn, pin: pin, paint: paint, show: show };
  }
  function allCols() {
    var cols = (S.opt.collections || []).slice();
    if (!cols.length) cols = [{ name: 'Your photos', photos: (S.opt.photos || []).map(function (p) { return { id: p.id }; }) }];
    return cols;
  }
  function ensureLoaded(ids) {
    var need = ids.filter(function (id) { return !S.bitmaps[id] && !isPhone(id); });
    if (!need.length) return Promise.resolve();
    msg('Getting the photos ready… 0 / ' + need.length);
    return loadPhotos(need, function (d, n) { msg('Getting the photos ready… ' + d + ' / ' + n); }).then(function (got) { Object.keys(got).forEach(function (id) { S.bitmaps[id] = got[id]; }); msg(''); });
  }

  // ---------- screen 1: New post ----------
  var MAXPICK = 20;
  function buildPick() {
    var v = S.vPick;
    S.big1 = el('img', { class: 'pe-big1', alt: '' });
    S.shapeBtn = el('button', { type: 'button', class: 'pe-pill', 'aria-label': 'Shape', onclick: function () { var ks = ['34', '45', '11']; setShape(ks[(ks.indexOf(S.shape) + 1) % 3]); paintPick(); } });
    S.box1 = el('div', { class: 'pe-box1' }, [S.big1]);
    var count = el('span', { class: 'pe-count' });
    S.next1 = el('button', { type: 'button', class: 'pe-next', text: 'Next', onclick: goEdit });
    var G = S.pg1 = photoGrid({ cols: allCols(), onTap: function (id) {
      var k = chosenIds().indexOf(id);
      if (k < 0) { if (S.photos.length >= MAXPICK) { msg('Up to ' + MAXPICK + ' photos in one post.'); return; } S.photos.push({ id: id, on: true }); S.cur = id; }
      else if (S.cur === id) { S.photos.splice(k, 1); S.cur = S.photos.length ? S.photos[S.photos.length - 1].id : null; }
      else S.cur = id;
      paintPick();
    }, onPhone: function (got) { got.forEach(function (id) { if (S.photos.length < MAXPICK && chosenIds().indexOf(id) < 0) S.photos.push({ id: id, on: true }); }); if (got.length) S.cur = got[got.length - 1]; paintPick(); } });
    var tabs = el('div', { class: 'pe-tabs', role: 'tablist' });
    [['post', 'POST'], ['album', 'ALBUM'], ['reel', 'REEL']].forEach(function (t) {
      tabs.appendChild(el('button', { type: 'button', role: 'tab', class: 'pe-tab', 'data-mode': t[0], text: t[1], onclick: function () {
        if (t[0] === 'reel') { var ids = chosenIds().filter(function (id) { return !isPhone(id); }), fn = S.opt.openReel; if (!fn) { msg('Reels open from the Hub.'); return; } close(); fn(ids.map(function (id) { return { id: id }; })); return; }
        S.mode = t[0]; paintPick(); } }));
    });
    S.tabs1 = tabs;
    v.append(
      el('div', { class: 'pe-bar' }, [el('button', { type: 'button', class: 'pe-ib', 'aria-label': 'Close', html: ic('close'), onclick: close }), el('b', { class: 'pe-title', text: 'New post' }), S.next1]),
      el('div', { class: 'pe-stage1' }, [S.box1, el('div', { class: 'pe-over' }, [S.shapeBtn, count])]),
      el('div', { class: 'pe-row1' }, [G.sel, G.pbtn, G.pin]), G.grid, tabs);
    S.count1 = count; paintPick();
  }
  function paintPick() {
    var n = S.photos.length; if (S.cur && chosenIds().indexOf(S.cur) < 0 && !S.cur) S.cur = null;
    if (!S.cur && n) S.cur = S.photos[0].id;
    S.big1.src = S.cur ? thumbUrl(S.cur, 1080) : ''; S.big1.style.visibility = S.cur ? '' : 'hidden';
    S.box1.style.aspectRatio = '1080 / ' + SHAPES[S.shape][0];
    S.shapeBtn.textContent = SHAPES[S.shape][1];
    S.count1.textContent = n ? n + ' chosen' : 'Tap photos to choose';
    S.next1.disabled = !n;
    S.tabs1.querySelectorAll('.pe-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === S.mode); });
    S.pg1.paint();
  }

  // ---------- screen 2: edit ----------
  function goEdit() {
    if (!S.photos.length) return;
    S.photos = S.photos.slice(0, MAXPICK);
    S.next1.disabled = true;
    ensureLoaded(chosenIds()).then(function () {
      S.next1.disabled = false; if (!S) return;
      S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; });
      if (!S.photos.length) { msg('Those photos could not be loaded. Check the internet.'); return; }
      S.format = S.mode === 'album' ? 'strip' : (S.photos.length === 1 ? 'single' : 'carousel');
      show('edit'); S.stage.scrollLeft = 0; draw(); renderTools();
    }, function (e) { S.next1.disabled = false; msg(e && e.message || 'Could not get the photos.'); });
  }
  function show(view) { S.view = view; S.wrap.dataset.view = view; select(null); closeSheet(); }
  function sheet(title, build) {
    closeSheet();
    var body = el('div', { class: 'pe-sh-body' });
    var box = el('div', { class: 'pe-sheet', role: 'dialog', 'aria-label': title }, [el('div', { class: 'pe-sh-top' }, [el('b', { text: title }), el('button', { type: 'button', class: 'pe-done', text: 'Done', onclick: closeSheet })]), body]);
    build(body); S.vEdit.appendChild(box); S.sheetEl = box; return body;
  }
  function closeSheet() { if (S && S.sheetEl) { S.sheetEl.remove(); S.sheetEl = null; } }
  function chipRow(list, cur, onPick, cls) { var r = el('div', { class: 'ps-row' }); chips(r, list, cur, onPick, cls); return r; }
  function lbl(t) { return el('div', { class: 'ps-lbl', text: t }); }
  function renderTools() {
    var tools = [['template', 'Template', toolTemplate], ['colours', 'Colours', toolColours], ['text', 'Text', toolText], ['sticker', 'Drawings', toolDrawings],
      ['filters', 'Filters', toolFilters], ['slides', S.format === 'strip' ? 'Slides' : 'Per slide', toolSlides], ['order', 'Order', toolOrder], ['shape', 'Shape', toolShape]];
    S.toolsEl.innerHTML = '';
    tools.forEach(function (t) { S.toolsEl.appendChild(el('button', { type: 'button', class: 'pe-tool', 'data-tool': t[0], html: ic(t[0]) + '<span>' + t[1] + '</span>', onclick: function () { select(null); t[2](); } })); });
  }
  // Template: small pictures of every template with your photos, category tabs on top, endless scrolling
  function toolTemplate() {
    var body = sheet('Template', function (b) {
      var tabs = el('div', { class: 'ps-row pe-cats' }), grid = el('div', { class: 'pe-tgrid' }), g = S.tplGroup || 'all';
      var groups = GROUPS.filter(function (x) { return ORDER.some(function (k) { return inGroup(TEMPLATES[k], x[0]); }); });
      var io = null, queue = [], busy = false;
      var paintNext = function () {   // one small picture per frame, so scrolling stays smooth
        if (busy || !queue.length || !S || !S.sheetEl) return; busy = true;
        requestAnimationFrame(function () { busy = false; var c = queue.shift(); if (c && S) thumbInto(c, c.dataset.t); paintNext(); });
      };
      var fill = function () {
        grid.innerHTML = ''; if (io) io.disconnect(); queue = [];
        io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = 1; queue.push(e.target); io.unobserve(e.target); } }); paintNext(); }, { root: S.sheetEl.querySelector('.pe-sh-body'), rootMargin: '200px' });
        ORDER.filter(function (k) { return inGroup(TEMPLATES[k], g); }).forEach(function (k) {
          var c = el('canvas', { class: 'pe-tcan', 'data-t': k, width: '120', height: String(Math.round(120 * SH / SW)) });
          var t = el('button', { type: 'button', class: 'pe-tpl' + (k === S.tid ? ' on' : ''), 'data-t': k, onclick: function () {
            S.tid = k; if (TEMPLATES[k].palette) S.pid = TEMPLATES[k].palette; grid.querySelectorAll('.pe-tpl').forEach(function (x) { x.classList.toggle('on', x === t); }); draw(); } }, [c, el('span', { text: label(TEMPLATES[k]) })]);
          grid.appendChild(t); io.observe(c);
        });
      };
      groups.forEach(function (x) { tabs.appendChild(el('button', { type: 'button', class: 'ps-chip' + (x[0] === g ? ' on' : ''), 'data-g': x[0], text: x[1], onclick: function () { g = S.tplGroup = x[0]; tabs.querySelectorAll('.ps-chip').forEach(function (b) { b.classList.toggle('on', b.dataset.g === g); }); fill(); } })); });
      b.append(tabs, grid); setTimeout(fill, 0);
    });
    S.sheetEl.classList.add('pe-tall');
    return body;
  }
  // draws the first slide of template k, with your photos, into a small canvas
  function thumbInto(c, k) {
    var keep = { tid: S.tid, pid: S.pid, sel: S.sel }, hit = S.hit, hs = S.hitStickers, htx = S.hitTexts;
    try {
      S.tid = k; if (TEMPLATES[k].palette) S.pid = TEMPLATES[k].palette; S.sel = null; S.hit = null; S.hitStickers = null; S.hitTexts = null;
      var L = build(); if (!L) return;
      var sc = c.width / SW, ctx = c.getContext('2d'); ctx.setTransform(sc, 0, 0, sc, 0, 0); render(ctx, L, { labels: S.opt.labels || {} });
    } catch (e) {} finally { S.tid = keep.tid; S.pid = keep.pid; S.sel = keep.sel; S.hit = hit; S.hitStickers = hs; S.hitTexts = htx; }
  }
  function toolColours() {
    sheet('Colours', function (b) { b.append(chipRow(Object.keys(PALETTES).map(function (k) { var P = PALETTES[k]; return { v: k, label: P.name, style: 'background:linear-gradient(135deg,' + P.paper + ' 50%,' + P.accent + ' 50%)' }; }), S.pid, function (v) { S.pid = v; draw(); }, 'ps-dot')); });
  }
  function toolText() {
    sheet('Text', function (b) {
      var names = el('input', { class: 'ps-in', value: S.names, maxlength: '40', 'aria-label': 'Names' }); names.addEventListener('input', function () { S.names = names.value; redraw(); });
      var date = el('input', { class: 'ps-in', value: S.date, maxlength: '30', 'aria-label': 'Date' }); date.addEventListener('input', function () { S.date = date.value; redraw(); });
      b.append(lbl('Names'), names, lbl('Date'), date);
    });
  }
  function toolDrawings() { closeSheet(); stickerSheet(); }   // straight into the drawings collection
  function toolFilters() {
    sheet('Filters', function (b) {
      var row = el('div', { class: 'pe-frow' });
      var sample = S.photos[0] && S.photos[0].id;
      FILTERS.forEach(function (f) {
        var t = el('button', { type: 'button', class: 'pe-filter' + (S.filter === f[0] ? ' on' : ''), 'data-f': f[0] }, [el('img', { src: thumbUrl(sample, 160), alt: '', style: 'filter:' + (f[2] || 'none') }), el('span', { text: f[1] })]);
        t.addEventListener('click', function () { S.filter = f[0]; S.fcss = f[2]; row.querySelectorAll('.pe-filter').forEach(function (x) { x.classList.toggle('on', x === t); }); draw(); });
        row.appendChild(t);
      });
      b.append(row);
    });
  }
  function toolSlides() {
    sheet(S.format === 'strip' ? 'Slides' : 'Photos per slide', function (b) {
      if (S.format === 'strip') b.append(lbl('How many slides the album page is cut into'), chipRow([{ t: 'Auto', v: 0 }, { t: '2', v: 2 }, { t: '3', v: 3 }, { t: '4', v: 4 }, { t: '5', v: 5 }, { t: '6', v: 6 }, { t: '8', v: 8 }, { t: '10', v: 10 }], S.slides, function (v) { S.slides = v; draw(); }));
      else b.append(lbl('Photos on each slide'), chipRow([{ t: '1', v: 1 }, { t: '2', v: 2 }, { t: '3', v: 3 }, { t: '4', v: 4 }], S.per, function (v) { S.per = v; S.format = 'carousel'; draw(); }),
        el('p', { class: 'pe-note', text: 'Up to 10 slides. Choose 4 per slide to make one collage post.' }));
    });
  }
  function toolOrder() {
    sheet('Order', function (b) {
      var row = el('div', { class: 'pe-orow' });
      var mv = function (i, d, t, k) { var bt = el('button', { type: 'button', 'aria-label': t, html: ic(k), onclick: function () { var x = S.photos[i]; S.photos[i] = S.photos[i + d]; S.photos[i + d] = x; paint(); draw(); } }); bt.disabled = !S.photos[i + d]; return bt; };
      var paint = function () {
        row.innerHTML = '';
        S.photos.forEach(function (p, i) {
          row.appendChild(el('div', { class: 'pe-ord' }, [el('img', { src: thumbUrl(p.id, 160), alt: '' }), el('b', { text: String(i + 1) }),
            el('div', {}, [mv(i, -1, 'Move earlier', 'left'), mv(i, 1, 'Move later', 'right')])]));
        });
      };
      paint(); b.append(row);
    });
  }
  function toolShape() {
    sheet('Shape', function (b) {
      b.append(chipRow([{ t: '3:4 · fills the profile grid', v: '34' }, { t: '4:5 · tall', v: '45' }, { t: '1:1 · square', v: '11' }], S.shape, function (v) { setShape(v); S.stickers = []; draw(); }),
        el('p', { class: 'pe-note', text: 'Instagram shows 3:4 posts whole, in the feed and on the profile.' }));
    });
  }
  // the pop-up for a tapped photo or drawing (same idea as Reel Edits)
  function select(sel) {
    if (!S || !S.edit) return;
    S.sel = sel; var on = !!sel;
    S.edit.style.display = on ? 'flex' : 'none'; S.stage.style.overflowX = on ? 'hidden' : 'auto'; S.prev.style.touchAction = on ? 'none' : 'pan-x';
    if (on) {
      closeSheet();
      var isP = sel.type === 'photo';
      S.eTitle.textContent = isP ? 'This photo' : 'This drawing';
      S.eThumb.style.display = isP ? '' : 'none'; if (isP) S.eThumb.src = thumbUrl(sel.id, 160);
      S.eHelp.textContent = isP ? 'Drag on the post to move it · slide to zoom' : 'Drag to move · slide to resize or turn';
      S.eZoom.min = isP ? 1 : 40; S.eZoom.max = isP ? 3 : 520; S.eZoom.step = isP ? 0.01 : 1;
      var stk = sel.type === 'sticker' ? S.stickers[sel.i] : null;
      S.eZoom.value = isP ? (focusOf(sel.id).z || 1) : stk ? stk.s : 1;
      S.eRot.parentNode.style.display = isP ? 'none' : ''; S.eRot.value = stk ? (stk.r || 0) : 0;
      S.eReplace.style.display = isP ? '' : 'none'; S.eReset.style.display = isP ? '' : 'none'; S.eDel.style.display = isP ? 'none' : '';
      S.eCol.style.display = isP ? 'none' : 'flex';
      S.eZoom.style.display = ''; S.eText.style.display = 'none'; S.eDel.textContent = 'Delete';
      if (sel.type === 'text') {   // template words: change them, drag them, put them back, or remove them
        S.eTitle.textContent = 'This text'; S.eHelp.textContent = 'Drag it on the post to place it anywhere · only the post changes, not the real names';
        S.eZoom.style.display = 'none'; S.eRot.parentNode.style.display = 'none'; S.eCol.style.display = 'none'; S.eReplace.style.display = 'none';
        S.eReset.style.display = ''; S.eDel.style.display = ''; S.eDel.textContent = 'Remove';
        S.eText.style.display = ''; S.eText.value = textValue(sel.key);
      }
    }
    if (S.view === 'edit') draw();
  }
  function textValue(key) {
    if (key === 'names') return S.names; if (key === 'date') return S.date;
    var o = (S.tx || {})[key]; if (o && o.text != null) return o.text;
    if (key === 'issue') return 'THE WEDDING ISSUE';
    var id = key.slice(6); return String((S.opt.labels || {})[id] || '').toUpperCase();
  }
  function setText(key, v) {
    if (key === 'names') S.names = v; else if (key === 'date') S.date = v;
    else { S.tx = Object.assign({}, S.tx); S.tx[key] = Object.assign({}, S.tx[key], { text: v }); }
  }
  function picker(replaceId) {   // Replace: one photo from any collection or the phone
    var box = el('div', { class: 'pe-picker', role: 'dialog', 'aria-label': 'Replace photo' });
    var G = photoGrid({ single: true, cols: allCols(), onTap: function (id) { box.remove(); replaceWith(replaceId, id); }, onPhone: function (got) { if (got.length === 1) { box.remove(); replaceWith(replaceId, got[0]); } } });
    box.append(el('div', { class: 'pe-bar' }, [el('button', { type: 'button', class: 'pe-ib', 'aria-label': 'Back', html: ic('back'), onclick: function () { box.remove(); } }), el('b', { class: 'pe-title', text: 'Replace photo' }), el('span', { style: 'width:40px' })]),
      el('div', { class: 'pe-row1' }, [G.sel, G.pbtn, G.pin]), G.grid);
    S.wrap.appendChild(box);
  }
  function replaceWith(oldId, newId) {
    var p = S.photos.filter(function (x) { return x.id === oldId; })[0]; if (!p || oldId === newId) return;
    var other = S.photos.filter(function (x) { return x.id === newId; })[0];
    if (other) { other.id = oldId; p.id = newId; select({ type: 'photo', id: newId }); return; }   // already in the post: swap places
    p.id = newId; delete S.adj[oldId];
    ensureLoaded([newId]).then(function () { if (S.bitmaps[newId]) select({ type: 'photo', id: newId }); else { p.id = oldId; msg('That photo could not be loaded.'); draw(); } });
  }
  function dots() {
    if (!S.dotsEl || !S.L) return; var n = S.L.n, w = S.big.getBoundingClientRect().width / n || 1, cur = Math.round(S.stage.scrollLeft / w);
    S.dotsEl.innerHTML = n > 1 ? Array.apply(null, Array(n)).map(function (x, i) { return '<i' + (i === cur ? ' class="on"' : '') + '></i>'; }).join('') : '';
    S.slideNo.textContent = n > 1 ? (Math.min(cur, n - 1) + 1) + ' / ' + n : '';
  }

  // ---------- screen 3: share ----------
  function hashtag() { var w = String(S.names || '').split(/\s*(?:&|and|weds|\+)\s*/i).map(function (x) { return x.replace(/[^A-Za-z0-9]/g, ''); }).filter(Boolean); return w.length >= 2 ? '#' + w[0] + 'Weds' + w[1] : (w[0] ? '#' + w[0] + 'Wedding' : '#OurWedding'); }
  function goShare() {
    show('share');
    var L = S.L, strip = S.shStrip; strip.innerHTML = '';
    for (var i = 0; i < L.n; i++) { var c = slide(i), t = document.createElement('canvas'), r = 200 / SW; t.width = 200; t.height = Math.round(SH * r); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); c.width = c.height = 1; t.className = 'pe-shth'; strip.appendChild(t); }
    if (!S.capTouched) S.cap.value = (S.names || 'Our wedding') + (S.date ? ' · ' + S.date : '') + '\n' + hashtag() + ' #PicGrades';
    // see on profile: Instagram's grid is 3 across, tall 3:4 tiles, newest first; a carousel shows its first slide
    var g = S.profile; g.innerHTML = '';
    var first = strip.firstChild ? strip.firstChild.toDataURL('image/jpeg', 0.8) : '';
    g.appendChild(el('div', { class: 'pe-tile new' }, [el('img', { src: first, alt: 'Your new post' }), el('b', { text: 'New' })].concat(L.n > 1 ? [el('i', { html: ic('slides') })] : [])));
    (S.opt.recent || []).slice(0, 8).forEach(function (id) { g.appendChild(el('div', { class: 'pe-tile' }, [el('img', { src: 'https://lh3.googleusercontent.com/d/' + id + '=w300', alt: '', loading: 'lazy' })])); });
    while (g.children.length < 9) g.appendChild(el('div', { class: 'pe-tile empty' }));
    S.postBtn.disabled = false; S.postBtn.textContent = 'Post to Root Moment';
  }
  function files() {
    var base = slug(S.names) + '_' + S.tid, n = S.L.n, blobs = [];
    var one = function (i) { return i >= n ? Promise.resolve() : toBlob(slide(i)).then(function (b) { blobs.push(b); return one(i + 1); }); };
    return one(0).then(function () { return blobs.map(function (b, i) { return new File([b], base + '_' + (i + 1) + '.jpg', { type: 'image/jpeg' }); }); });
  }
  function shareIt() {
    msg('Getting the images ready…');
    files().then(function (fs) {
      if (navigator.canShare && navigator.canShare({ files: fs })) {
        try { if (navigator.clipboard) navigator.clipboard.writeText(S.cap.value).catch(function () {}); } catch (e) {}
        msg('Choose Instagram. The caption is copied — paste it there.');
        return navigator.share({ files: fs }).catch(function () {});
      }
      msg('Sharing is not available here — use Download, then post the images in this order.');
    });
  }
  var IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function download() {
    files().then(function (fs) {
      // iPhone: only the share menu can put images in Photos ("Save Images"); a normal download goes to the Files app
      if (IOS && navigator.canShare && navigator.canShare({ files: fs })) { msg('Choose “Save Images” to put them in Photos.'); return navigator.share({ files: fs }).catch(function () {}); }
      fs.forEach(function (f, i) { setTimeout(function () { var a = el('a', { href: URL.createObjectURL(f), download: f.name }); document.body.appendChild(a); a.click(); a.remove(); }, i * 350); });
      msg(fs.length + (fs.length === 1 ? ' image' : ' images') + ' saved — post them in this order.');
    });
  }
  function postIt() {
    var b = S.postBtn; b.disabled = true; msg('Posting to Root Moment…');
    var data = []; for (var i = 0; i < S.L.n; i++) data.push(slide(i).toDataURL('image/jpeg', 0.86));
    S.opt.post({ slides: data, caption: (S.cap.value || S.T_NAME()).slice(0, 200) }).then(function (r) {
      msg(r.status === 'approved' ? 'Posted! It is in Root Moment and in “Posts & Albums”.' : 'Sent to the couple — it will appear once they approve it.');
      b.textContent = r.status === 'approved' ? 'Posted ✓' : 'Sent for approval ✓';
    }).catch(function (e) { msg(e.message); b.disabled = false; });
  }

  function open(opt) { return loadPacks().then(function () { return openNow(opt); }); }
  function openNow(opt) {
    if (S && S.wrap) close();
    if (!document.getElementById('ps-css')) document.head.appendChild(el('style', { id: 'ps-css', text: CSS + PE_CSS }));
    S = { opt: opt, tid: 'album', pid: opt.palette || 'ivory', format: 'carousel', mode: opt.mode === 'album' ? 'album' : 'post', per: 1, slides: 0, art: true, names: opt.title || 'Our Wedding', date: opt.date || '',
      photos: (opt.photos || []).slice(0, MAXPICK).map(function (p) { return { id: p.id, on: true }; }), bitmaps: {}, adj: {}, stickers: [], petals: false, sel: null, thumbs: {}, filter: 'none', fcss: '', view: 'pick', undo: [], redo: [], lastSnap: null };
    setShape(opt.shape || '34');
    S.T_NAME = function () { return TEMPLATES[S.tid].name; };
    document.body.classList.add('ps-on');
    var wrap = S.wrap = el('div', { class: 'ps-wrap pe-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Post Edits', 'data-view': 'pick' });
    S.vPick = el('div', { class: 'pe-view pe-v-pick' }); S.vEdit = el('div', { class: 'pe-view pe-v-edit' }); S.vShare = el('div', { class: 'pe-view pe-v-share' });
    // edit screen
    S.big = el('canvas', { 'aria-label': 'Your post' }); S.seams = el('div', { class: 'ps-seams' });
    S.prev = el('div', { class: 'ps-prev' }, [S.big, S.seams]);
    S.stage = el('div', { class: 'pe-stage' }, [S.prev]);
    S.stage.addEventListener('scroll', function () { dots(); }, { passive: true });
    S.dotsEl = el('div', { class: 'pe-dots' }); S.slideNo = el('span', { class: 'pe-slideno' });
    S.eThumb = el('img', { class: 'pe-ethumb', alt: '' }); S.eTitle = el('b'); S.eHelp = el('p', { class: 'pe-note', style: 'margin:0' });
    S.eZoom = el('input', { type: 'range', class: 'ps-range', 'aria-label': 'Zoom or size' });
    S.eRot = el('input', { type: 'range', class: 'ps-range', min: '-3.14', max: '3.14', step: '0.01', 'aria-label': 'Turn' });
    S.eReplace = el('button', { type: 'button', class: 'pe-repl', html: ic('replace') + '<span>Replace</span>', onclick: function () { if (S.sel) picker(S.sel.id); } });
    S.eReset = el('button', { type: 'button', class: 'ps-chip', text: 'Reset', onclick: function () {
      if (!S.sel) return;
      if (S.sel.type === 'text') { S.tx = Object.assign({}, S.tx); var o = Object.assign({}, S.tx[S.sel.key]); delete o.dx; delete o.dy; S.tx[S.sel.key] = o; }
      else delete S.adj[S.sel.id];
      select(S.sel); } });
    S.eDel = el('button', { type: 'button', class: 'ps-chip', text: 'Delete', onclick: function () {
      if (!S.sel) return;
      if (S.sel.type === 'text') setText(S.sel.key, ''); else S.stickers.splice(S.sel.i, 1);
      select(null); } });
    S.eText = el('input', { class: 'ps-in', maxlength: '60', 'aria-label': 'Text', style: 'display:none;margin:4px 0 0' });
    S.eText.addEventListener('input', function () { if (S.sel && S.sel.type === 'text') { setText(S.sel.key, S.eText.value); redraw(); } });
    S.eCol = el('div', { class: 'ps-row', style: 'padding:4px 0 0' });
    [['Accent', ''], ['Ink', '#2E2620'], ['White', '#FFFFFF'], ['Gold', '#C9A24A'], ['Rose', '#C76B84']].forEach(function (c) {
      S.eCol.appendChild(el('button', { type: 'button', class: 'ps-chip', text: c[0], onclick: function () { if (S.sel && S.sel.type === 'sticker') { S.stickers[S.sel.i].col = c[1]; draw(); } } }));
    });
    S.edit = el('div', { class: 'pe-pop', style: 'display:none' }, [
      el('div', { class: 'pe-thisone' }, [S.eThumb, S.eTitle, S.eReplace]), S.eText, S.eHelp, S.eZoom,
      el('label', { class: 'ps-lbl', style: 'display:block;margin:6px 0 0' }, [el('span', { text: 'Turn' }), S.eRot]), S.eCol,
      el('div', { class: 'ps-row', style: 'padding:8px 0 0' }, [S.eReset, S.eDel, el('button', { type: 'button', class: 'pe-done', style: 'margin-left:auto', text: 'Done', onclick: function () { select(null); } })])]);
    S.toolsEl = el('div', { class: 'pe-tools' });
    S.undoBtn = el('button', { type: 'button', class: 'pe-ib pe-ur', 'aria-label': 'Undo', html: ic('undo'), onclick: undo });
    S.redoBtn = el('button', { type: 'button', class: 'pe-ib pe-ur', 'aria-label': 'Redo', html: ic('redo'), onclick: redo });
    S.vEdit.append(
      el('div', { class: 'pe-bar' }, [el('button', { type: 'button', class: 'pe-ib', 'aria-label': 'Back', html: ic('back'), onclick: function () { show('pick'); paintPick(); } }),
        el('div', { class: 'pe-logo', html: LOGO + '<span>Post Edits</span>' }), S.undoBtn, S.redoBtn, el('button', { type: 'button', class: 'pe-next', text: 'Next', onclick: goShare })]),
      S.stage, el('div', { class: 'pe-dotrow' }, [S.dotsEl, S.slideNo]),
      el('p', { class: 'pe-tip', text: 'Tap a photo on the post to move it, zoom it or replace it.' }), S.edit, S.toolsEl);
    // share screen
    S.shStrip = el('div', { class: 'pe-shstrip' });
    S.cap = el('textarea', { class: 'pe-cap', rows: '3', maxlength: '200', 'aria-label': 'Caption', placeholder: 'Write a caption…' }); S.cap.addEventListener('input', function () { S.capTouched = true; });
    S.profile = el('div', { class: 'pe-profile' });
    S.postBtn = el('button', { type: 'button', class: 'ps-go', text: 'Post to Root Moment', onclick: postIt });
    S.vShare.append(
      el('div', { class: 'pe-bar' }, [el('button', { type: 'button', class: 'pe-ib', 'aria-label': 'Back', html: ic('back'), onclick: function () { show('edit'); draw(); } }), el('b', { class: 'pe-title', text: 'New post' }), el('span', { style: 'width:40px' })]),
      el('div', { class: 'pe-shbody' }, [S.shStrip, S.cap, el('div', { class: 'ps-lbl', html: ic('grid') + ' See on profile' }), S.profile,
        el('p', { class: 'pe-note', text: 'This is how it sits on an Instagram profile: tall 3:4 tiles, newest first. A carousel shows its first slide.' }),
        S.postBtn, el('button', { type: 'button', class: 'ps-sub pe-share', text: 'Share to Instagram', onclick: shareIt }), el('button', { type: 'button', class: 'ps-sub', text: 'Download', onclick: download })]));
    S.msgEl = el('p', { class: 'pe-msg', 'aria-live': 'polite' });
    wrap.append(S.vPick, S.vEdit, S.vShare, S.msgEl);
    document.body.appendChild(wrap); bindEditing(); buildPick();
    stickersReady().then(function () { if (S && S.view === 'edit') redraw(); }, function () {});
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('500 100px "Cormorant Garamond"'), document.fonts.load('italic 500 60px "Cormorant Garamond"'), document.fonts.load('500 30px "IBM Plex Mono"')]).then(function () { if (S && S.view === 'edit') draw(); }, function () {});
  }
  function close() { if (!S) return; if (S.wrap) S.wrap.remove(); document.body.classList.remove('ps-on'); freeUrls(); S = null; }
  // the phone's back gesture: one step back inside Post Edits; true = still open
  function back() {
    if (!S) return false;
    var top = S.wrap.querySelector('.ps-picker, .pe-picker'); if (top) { top.remove(); return true; }
    if (S.sheetEl) { closeSheet(); return true; }
    if (S.sel) { select(null); return true; }
    if (S.view === 'share') { show('edit'); draw(); return true; }
    if (S.view === 'edit') { show('pick'); paintPick(); return true; }
    close(); return false;
  }
  window.PGPost = { back: back, addTemplate: addTemplate, open: open, close: close, templates: ORDER, palettes: Object.keys(PALETTES),
    setFaces: function (f) { if (S) { S.opt.faces = f; if (S.view === 'edit') draw(); } }, addSticker: function (k) { if (S) addSticker(k); },
    state: function () { return S ? { tx: S.tx || {}, date: S.date, undo: S.undo.length, redo: S.redo.length, names: S.names, tid: S.tid, view: S.view, mode: S.mode, format: S.format, shape: S.shape, H: SH, filter: S.filter, per: S.per, sel: S.sel, adj: S.adj, stickers: S.stickers, photos: S.photos.map(function (p) { return p.id; }) } : null; },
    set: function (k, v) { if (!S) return; if (k === 'shape') setShape(v); else S[k] = v; if (S.view === 'edit') draw(); },
    info: function () { return S && S.L ? { texts: (S.lastHitTexts || []).map(function (h) { return { key: h.key, x: h.x, y: h.y, w: h.w, h: h.h }; }), slides: S.L.n, cells: S.L.cells.length, W: S.L.W, H: SH, hits: (S.lastHit || []).map(function (h) { return { id: h.id, x: h.x, y: h.y, w: h.w, h: h.h }; }) } : null; } };
})();
