/* PicGrades Post / Album maker — Instagram posts made from gallery photos.
   Main format: "Album strip" — one wide album page cut into 1080×1350 slides, so the Instagram swipe looks like one page.
   Also: carousel (each slide its own page) and single post. Everything is drawn on the phone (canvas). */
(function () {
  'use strict';
  var SW = 1080, SH = 1350;
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
    var per = T.singles ? 1 : 2, slides = [], cells = [];
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
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
    if (S.hit) S.hit.push({ id: id, x: x, y: y, w: w, h: h, dw: dw, dh: dh });
  }
  function archPath(ctx, x, y, w, h) { var r = w / 2; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  // little line drawings (our own, thin, like sketches)
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
      if (T.cell === 'caption' && opt.labels && opt.labels[c.id]) { ctx.fillStyle = '#8a8178'; ctx.font = '500 26px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(String(opt.labels[c.id]).toUpperCase(), c.x + c.w / 2, c.y + c.h + 52); }
    });
    // words + drawings on top
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var names = S.names, date = S.date;
    if (T.deco === 'overlay') {
      var gr = ctx.createLinearGradient(0, SH * 0.6, 0, SH); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = gr; ctx.fillRect(0, SH * 0.6, SW, SH * 0.4);
      ctx.fillStyle = '#fff'; ctx.font = 'italic 400 96px ' + SERIF; ctx.fillText(names, 70, SH - 130); ctx.font = '500 30px ' + MONO; ctx.fillText(date, 74, SH - 70);
    } else if (T.deco === 'masthead') {
      ctx.fillStyle = ink; ctx.font = '600 30px ' + MONO; ctx.fillText('THE WEDDING ISSUE', 70, 200);
      line(ctx, ink, 2); ctx.beginPath(); ctx.moveTo(70, 230); ctx.lineTo(SW * 0.75 - 30, 230); ctx.stroke();
      ctx.font = '500 150px ' + SERIF; var parts = String(names).split(/\s*&\s*/); parts.forEach(function (p, i) { ctx.fillText((i ? '& ' : '') + p, 64, 420 + i * 160); });
      ctx.fillStyle = acc; ctx.font = '500 34px ' + MONO; ctx.fillText(date, 70, 420 + parts.length * 160 + 20);
    } else if (T.deco !== 'none' || T.cell === 'caption') {
      ctx.fillStyle = ink; ctx.font = (T.dark ? '600 ' : 'italic 500 ') + '64px ' + (T.dark ? SANS : SERIF); ctx.fillText(names, T.pad || 70, T.top - (T.deco === 'film' ? 160 : 70));
      ctx.font = '500 26px ' + MONO; ctx.fillStyle = T.dark ? acc : P.accent; ctx.textAlign = 'right'; ctx.fillText(date, W - (T.pad || 70), SH - Math.max(60, T.bottom / 2 - 10)); ctx.textAlign = 'left';
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
      var box = S.sel.type === 'sticker' ? (S.hitStickers.filter(function (h) { return h.i === S.sel.i; })[0]) : (S.hit.filter(function (h) { return h.id === S.sel.id; })[0]);
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
    var L = build(); S.L = L;
    if (!L) { S.info.textContent = 'Choose at least one photo.'; return; }
    var sc = S.pscale = Math.min(0.42, 4000 / L.W);
    S.big.width = Math.round(L.W * sc); S.big.height = Math.round(SH * sc);
    var ctx = S.big.getContext('2d'); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    S.hit = []; S.hitStickers = [];
    render(ctx, L, { labels: S.opt.labels || {}, preview: true });
    S.lastHit = S.hit; S.lastHitStickers = S.hitStickers; S.hit = null; S.hitStickers = null;
    S.prev.style.aspectRatio = L.W + ' / ' + SH;
    S.seams.innerHTML = ''; for (var i = 1; i < L.n; i++) S.seams.appendChild(el('i', { style: 'left:' + (i / L.n * 100) + '%' }));
    S.info.textContent = L.n + (L.n === 1 ? ' slide' : ' slides') + ' · ' + L.cells.length + ' photos · swipe to see the whole page';
  }
  function slide(i) {   // one full-size slide (1080×1350)
    var c = document.createElement('canvas'); c.width = SW; c.height = SH;
    var ctx = c.getContext('2d'); ctx.translate(-i * SW, 0); render(ctx, S.L, { labels: S.opt.labels || {} });
    return c;
  }
  function slides() { var out = []; for (var i = 0; i < S.L.n; i++) out.push(slide(i)); return out; }
  function toBlob(c, q) { return new Promise(function (res) { c.toBlob(res, 'image/jpeg', q || 0.92); }); }
  function msg(t) { if (S) S.msg.textContent = t || ''; }

  function download() {
    var base = slug(S.names) + '_' + S.tid, n = S.L.n, blobs = [];
    var one = function (i) { return i >= n ? Promise.resolve() : toBlob(slide(i)).then(function (b) { blobs.push(b); return one(i + 1); }); };
    one(0).then(function () {
      var files = blobs.map(function (b, i) { return new File([b], base + '_' + (i + 1) + '.jpg', { type: 'image/jpeg' }); });
      var phone = /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (phone && navigator.canShare && navigator.canShare({ files: files })) return navigator.share({ files: files }).catch(function () {});
      files.forEach(function (f, i) { setTimeout(function () { var a = el('a', { href: URL.createObjectURL(f), download: f.name }); document.body.appendChild(a); a.click(); a.remove(); }, i * 350); });
      msg(files.length + (files.length === 1 ? ' image' : ' images') + ' saved — post them in this order on Instagram.');
    });
  }
  function postIt() {
    var b = S.postBtn; b.disabled = true; msg('Posting to Root Moment…');
    var data = []; for (var i = 0; i < S.L.n; i++) data.push(slide(i).toDataURL('image/jpeg', 0.86));
    S.opt.post({ slides: data, caption: S.caption.value || S.T_NAME() }).then(function (r) {
      msg(r.status === 'approved' ? 'Posted! It is in Root Moment and in “Posts & Albums”. Now download it for Instagram.' : 'Sent to the couple — it will appear once they approve it. You can download it for Instagram now.');
      b.textContent = r.status === 'approved' ? 'Posted ✓' : 'Sent for approval ✓';
    }).catch(function (e) { msg(e.message); b.disabled = false; });
  }

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

  function chips(row, list, cur, onPick, cls) {
    row.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', { type: 'button', 'data-v': String(it.v), class: (cls || 'ps-chip') + (it.v === cur ? ' on' : ''), text: it.t || '', 'aria-label': it.label || it.t, style: it.style || '', onclick: function () { row.querySelectorAll('button').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); onPick(it.v); } });
      row.appendChild(b);
    });
  }
  function renderThumbs() {
    S.thumbs.innerHTML = '';
    S.photos.forEach(function (p) {
      S.thumbs.appendChild(el('button', { type: 'button', class: 'ps-th' + (p.on ? '' : ' off'), 'aria-label': p.on ? 'Remove photo' : 'Add photo', onclick: function () { p.on = !p.on; renderThumbs(); draw(); } }, [el('img', { src: 'https://lh3.googleusercontent.com/d/' + p.id + '=w160', alt: '', loading: 'lazy' })]));
    });
    S.thumbs.appendChild(el('button', { type: 'button', class: 'ps-th ps-add', 'aria-label': 'Add more photos', text: '+', onclick: picker }));
  }
  function replaceWith(oldId, newId) {
    var p = S.photos.filter(function (x) { return x.id === oldId; })[0]; if (!p || oldId === newId) return;
    var other = S.photos.filter(function (x) { return x.id === newId; })[0];
    if (other) { other.id = oldId; p.id = newId; S.sel = { type: 'photo', id: newId }; renderThumbs(); select(S.sel); return; }   // already in the album: swap places
    p.id = newId; delete S.adj[oldId];
    var finish = function () { S.sel = { type: 'photo', id: newId }; renderThumbs(); select(S.sel); };
    if (S.bitmaps[newId]) return finish();
    msg('Getting the photo ready…');
    loadPhotos([newId], function () {}).then(function (got) { if (got[newId]) { S.bitmaps[newId] = got[newId]; msg(''); finish(); } else { p.id = oldId; msg('That photo could not be loaded.'); } });
  }
  function picker(replaceId) {
    if (typeof replaceId !== 'string') replaceId = null;
    var cols = S.opt.collections || [], cur = 0, chosen = {}, single = !!replaceId;
    if (!single) S.photos.forEach(function (p) { if (p.on) chosen[p.id] = true; }); else chosen[replaceId] = true;
    var grid = el('div', { class: 'ps-pgrid' }), tabs = el('div', { class: 'ps-row', style: 'padding:4px 14px 10px' }), count = el('span', { style: 'margin-left:auto;font:500 .75rem "IBM Plex Mono",monospace;color:rgba(255,255,255,.7)' });
    var box = el('div', { class: 'ps-picker', role: 'dialog', 'aria-label': 'Choose photos' }, [el('div', { class: 'ps-top' }, [el('h3', { text: 'Choose photos' }), count, el('button', { type: 'button', class: 'ps-go', style: 'width:auto;margin:0;min-height:40px;padding:0 18px', text: 'Done', onclick: done })]), tabs, grid]);
    function upd() { count.textContent = single ? 'Tap the new photo' : Object.keys(chosen).length + ' chosen'; }
    function show(i) {
      cur = i; tabs.querySelectorAll('.ps-chip').forEach(function (c, k) { c.classList.toggle('on', k === i); }); grid.innerHTML = '';
      cols[i].photos.forEach(function (p) {
        var t = el('button', { type: 'button', class: 'ps-pick' + (chosen[p.id] ? ' on' : ''), 'data-id': p.id }, [el('img', { src: 'https://lh3.googleusercontent.com/d/' + p.id + '=w240', alt: '', loading: 'lazy' }), el('i')]);
        t.addEventListener('click', function () {
          if (single) { box.remove(); replaceWith(replaceId, p.id); return; }
          if (chosen[p.id]) delete chosen[p.id]; else chosen[p.id] = true; t.classList.toggle('on', !!chosen[p.id]); upd();
        });
        grid.appendChild(t);
      });
    }
    cols.forEach(function (c, i) { tabs.appendChild(el('button', { type: 'button', class: 'ps-chip', text: c.name + ' · ' + c.photos.length, onclick: function () { show(i); } })); });
    function done() {
      var have = {}; S.photos = S.photos.filter(function (p) { if (chosen[p.id]) { p.on = true; have[p.id] = 1; return true; } return false; });
      Object.keys(chosen).forEach(function (id) { if (!have[id]) S.photos.push({ id: id, on: true }); });
      S.photos = S.photos.slice(0, 40); box.remove();
      var need = S.photos.filter(function (p) { return !S.bitmaps[p.id]; }).map(function (p) { return p.id; });
      renderThumbs();
      if (!need.length) { draw(); return; }
      msg('Getting the photos ready… 0 / ' + need.length);
      loadPhotos(need, function (d, n) { msg('Getting the photos ready… ' + d + ' / ' + n); }).then(function (got) { Object.keys(got).forEach(function (id) { S.bitmaps[id] = got[id]; }); S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; }); renderThumbs(); draw(); msg(''); });
    }
    S.wrap.appendChild(box); upd(); if (cols.length) show(0);
  }

  // ---------- editing on the page ----------
  function at(e) { var r = S.big.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * S.L.W, y: (e.clientY - r.top) / r.height * SH }; }
  function hitAt(pt) {
    var hs = (S.lastHitStickers || []).slice().reverse().filter(function (h) { return pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h; })[0];
    if (hs) return { type: 'sticker', i: hs.i };
    var hc = (S.lastHit || []).filter(function (h) { return pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h; }).pop();
    return hc ? { type: 'photo', id: hc.id } : null;
  }
  var rafPending = false;
  function redraw() { if (rafPending) return; rafPending = true; requestAnimationFrame(function () { rafPending = false; if (S) draw(); }); }
  function select(sel) {
    S.sel = sel; var bar = S.edit, on = !!sel;
    bar.style.display = on ? 'block' : 'none'; S.stage.style.overflowX = on ? 'hidden' : 'auto'; S.prev.style.touchAction = on ? 'none' : 'pan-x';
    if (on) {
      var isP = sel.type === 'photo';
      S.eTitle.textContent = isP ? 'Photo · drag on the page to move it, slide to zoom' : 'Drawing · drag to move, slide to resize or turn';
      S.eZoom.min = isP ? 1 : 40; S.eZoom.max = isP ? 3 : 520; S.eZoom.step = isP ? 0.01 : 1;
      S.eZoom.value = isP ? (focusOf(sel.id).z || 1) : S.stickers[sel.i].s;
      S.eRot.parentNode.style.display = isP ? 'none' : ''; S.eRot.value = isP ? 0 : (S.stickers[sel.i].r || 0);
      S.eReplace.style.display = isP ? '' : 'none'; S.eReset.style.display = isP ? '' : 'none'; S.eDel.style.display = isP ? 'none' : '';
      S.eCol.style.display = isP ? 'none' : 'flex';
    }
    draw();
  }
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
      } else { var st = S.stickers[S.sel.i]; st.x += dx; st.y += dy; }
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
    var cats = ['Flowers', 'Wedding', 'Love', 'Party'], cur = 'Flowers';
    var grid = el('div', { class: 'ps-sgrid' }), tabs = el('div', { class: 'ps-row', style: 'padding:4px 14px 10px' });
    var box = el('div', { class: 'ps-picker', role: 'dialog', 'aria-label': 'Flowers and wedding drawings' }, [
      el('div', { class: 'ps-top' }, [el('h3', { text: 'Flowers & drawings' }), el('button', { type: 'button', class: 'ps-x', 'aria-label': 'Close', text: '×', onclick: function () { box.remove(); } })]), tabs, grid]);
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
      dark: !!x.dark, white: !!x.white, palette: null, forWhat: x.for || [] };
    var P = x.palette || {}, hex = function (v) { return /^#[0-9a-f]{6}$/i.test(v || ''); };
    if (hex(P.paper) && hex(P.ink) && hex(P.accent)) { PALETTES[x.id] = { name: String(x.name).slice(0, 30), paper: P.paper, ink: P.ink, accent: P.accent, soft: hex(P.soft) ? P.soft : P.accent }; TEMPLATES[x.id].palette = x.id; }
    ORDER.push(x.id); return true;
  }
  var packsP = null;
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (l) { return Array.isArray(l) ? l : []; }).catch(function () { return []; }); }
  function loadPacks() {
    if (!packsP) packsP = Promise.race([getJSON('/app/packs/album-templates.json').then(function (l) { l.forEach(addTemplate); }), new Promise(function (res) { setTimeout(res, 2500); })]);
    return packsP;
  }
  function open(opt) { return loadPacks().then(function () { return openNow(opt); }); }
  function openNow(opt) {
    if (S && S.wrap) close();
    if (!document.getElementById('ps-css')) document.head.appendChild(el('style', { id: 'ps-css', text: CSS }));
    S = { opt: opt, tid: 'album', pid: opt.palette || 'ivory', format: 'strip', slides: 0, art: true, names: opt.title || 'Our Wedding', date: opt.date || '',
      photos: (opt.photos || []).slice(0, 12).map(function (p) { return { id: p.id, on: true }; }), bitmaps: {}, adj: {}, stickers: [], petals: false, sel: null };
    S.T_NAME = function () { return TEMPLATES[S.tid].name; };
    document.body.classList.add('ps-on');
    var wrap = S.wrap = el('div', { class: 'ps-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Make a post' });
    wrap.appendChild(el('div', { class: 'ps-top' }, [el('h3', { text: 'Post / Album' }), el('button', { type: 'button', class: 'ps-x', 'aria-label': 'Close', text: '×', onclick: close })]));
    S.big = el('canvas'); S.seams = el('div', { class: 'ps-seams' });
    S.prev = el('div', { class: 'ps-prev' }, [S.big, S.seams]);
    S.stage = el('div', { class: 'ps-stage' }, [S.prev]); wrap.appendChild(S.stage);
    wrap.appendChild(el('p', { class: 'ps-hint', text: 'Tip: tap a photo on the page to move it, zoom it or replace it.' }));
    var panel = el('div', { class: 'ps-panel' });
    var fmtRow = el('div', { class: 'ps-row' }), tplRow = el('div', { class: 'ps-row' }), palRow = el('div', { class: 'ps-row' }), slideRow = el('div', { class: 'ps-row' });
    S.thumbs = el('div', { class: 'ps-row' }); S.info = el('div', { class: 'ps-lbl', style: 'margin-top:0' });
    var names = el('input', { class: 'ps-in', value: S.names, maxlength: '40', 'aria-label': 'Names' }); names.addEventListener('input', function () { S.names = names.value; draw(); });
    var date = el('input', { class: 'ps-in', value: S.date, maxlength: '30', 'aria-label': 'Date' }); date.addEventListener('input', function () { S.date = date.value; draw(); });
    S.caption = el('input', { class: 'ps-in', maxlength: '200', placeholder: 'Caption for Root Moment (optional)', 'aria-label': 'Caption' });
    var art = el('input', { type: 'checkbox', checked: '' }); art.addEventListener('change', function () { S.art = art.checked; draw(); });
    var pet = el('input', { type: 'checkbox' }); pet.addEventListener('change', function () { S.petals = pet.checked; draw(); });
    // edit bar (shows when a photo or drawing on the page is tapped)
    S.eTitle = el('div', { class: 'ps-lbl', style: 'margin:0 0 6px' });
    S.eZoom = el('input', { type: 'range', class: 'ps-range', 'aria-label': 'Zoom or size' });
    S.eRot = el('input', { type: 'range', class: 'ps-range', min: '-3.14', max: '3.14', step: '0.01', 'aria-label': 'Turn' });
    S.eReplace = el('button', { type: 'button', class: 'ps-chip', text: 'Replace photo', onclick: function () { if (S.sel) picker(S.sel.id); } });
    S.eReset = el('button', { type: 'button', class: 'ps-chip', text: 'Reset', onclick: function () { if (S.sel) { delete S.adj[S.sel.id]; select(S.sel); } } });
    S.eDel = el('button', { type: 'button', class: 'ps-chip', text: 'Delete', onclick: function () { if (S.sel) { S.stickers.splice(S.sel.i, 1); select(null); } } });
    S.eCol = el('div', { class: 'ps-row', style: 'padding:4px 0 0' });
    [['Accent', ''], ['Ink', '#2E2620'], ['White', '#FFFFFF'], ['Gold', '#C9A24A'], ['Rose', '#C76B84']].forEach(function (c) {
      S.eCol.appendChild(el('button', { type: 'button', class: 'ps-chip', text: c[0], onclick: function () { if (S.sel && S.sel.type === 'sticker') { S.stickers[S.sel.i].col = c[1]; draw(); } } }));
    });
    S.edit = el('div', { class: 'ps-edit', style: 'display:none' }, [S.eTitle, S.eZoom, el('label', { class: 'ps-lbl', style: 'display:block;margin:6px 0 0' }, [el('span', { text: 'Turn' }), S.eRot]),
      S.eCol, el('div', { class: 'ps-row', style: 'padding:8px 0 0' }, [S.eReplace, S.eReset, S.eDel, el('button', { type: 'button', class: 'ps-chip on', text: 'Done', onclick: function () { select(null); } })])]);
    S.msg = el('p', { class: 'ps-msg', 'aria-live': 'polite' });
    S.postBtn = el('button', { type: 'button', class: 'ps-go', text: 'Post to Root Moment', onclick: postIt });
    [el('div', { class: 'ps-lbl', text: 'Format' }), fmtRow, el('div', { class: 'ps-lbl', text: 'Template' }), tplRow, el('div', { class: 'ps-lbl', text: 'Colours' }), palRow,
      el('div', { class: 'ps-lbl', text: 'Photos · tap to remove, + to add from any collection' }), S.thumbs, S.info,
      el('div', { class: 'ps-lbl', text: 'Slides (album strip)' }), slideRow,
      el('div', { class: 'ps-lbl', text: 'Text' }), names, date, S.caption,
      el('div', { class: 'ps-lbl', text: 'Flowers & drawings · tap one on the page to move, resize or turn it' }),
      el('button', { type: 'button', class: 'ps-sub', style: 'margin-top:0', text: '+ Add flowers & wedding drawings (60)', onclick: stickerSheet }),
      el('label', { class: 'ps-tog' }, [art, el('span', { text: 'Template drawings' })]),
      el('label', { class: 'ps-tog' }, [pet, el('span', { text: 'Rose petal shower' })]),
      S.postBtn, el('button', { type: 'button', class: 'ps-sub', text: 'Download for Instagram', onclick: download }), S.msg].forEach(function (x) { panel.appendChild(x); });
    panel.insertBefore(S.edit, panel.firstChild);
    wrap.appendChild(panel); document.body.appendChild(wrap); bindEditing();
    stickersReady().then(function () { if (S) redraw(); });
    chips(fmtRow, [{ t: 'Album strip', v: 'strip' }, { t: 'Carousel', v: 'carousel' }, { t: 'Single post', v: 'single' }], S.format, function (v) { S.format = v; draw(); });
    chips(tplRow, ORDER.map(function (k) { return { t: TEMPLATES[k].name, v: k }; }), S.tid, function (v) { S.tid = v; if (TEMPLATES[v].palette) { S.pid = TEMPLATES[v].palette; palRow.querySelectorAll('.on').forEach(function (b) { b.classList.remove('on'); }); var pb = palRow.querySelector('[data-v="' + S.pid + '"]'); if (pb) pb.classList.add('on'); } draw(); });
    chips(palRow, Object.keys(PALETTES).map(function (k) { var P = PALETTES[k]; return { v: k, label: P.name, style: 'background:linear-gradient(135deg,' + P.paper + ' 50%,' + P.accent + ' 50%)' }; }), S.pid, function (v) { S.pid = v; draw(); }, 'ps-dot');
    chips(slideRow, [{ t: 'Auto', v: 0 }, { t: '2', v: 2 }, { t: '3', v: 3 }, { t: '4', v: 4 }, { t: '5', v: 5 }, { t: '6', v: 6 }, { t: '8', v: 8 }, { t: '10', v: 10 }], 0, function (v) { S.slides = v; draw(); });
    renderThumbs(); msg('Getting the photos ready…');
    var fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px "Cormorant Garamond"'), document.fonts.load('italic 500 60px "Cormorant Garamond"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(function () {}) : Promise.resolve();
    Promise.all([loadPhotos(S.photos.map(function (p) { return p.id; }), function (d, n) { msg('Getting the photos ready… ' + d + ' / ' + n); }), fonts]).then(function (r) {
      if (!S || S.wrap !== wrap) return;
      S.bitmaps = r[0]; S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; }); renderThumbs(); draw(); msg('');
    });
  }
  function close() { if (!S) return; if (S.wrap) S.wrap.remove(); document.body.classList.remove('ps-on'); freeUrls(); S = null; }
  window.PGPost = { addTemplate: addTemplate, open: open, close: close, templates: ORDER, palettes: Object.keys(PALETTES),
    setFaces: function (f) { if (S) { S.opt.faces = f; draw(); } }, addSticker: function (k) { if (S) addSticker(k); },
    state: function () { return S ? { sel: S.sel, adj: S.adj, stickers: S.stickers, photos: S.photos.map(function (p) { return p.id; }) } : null; },
    set: function (k, v) { if (S) { S[k] = v; draw(); } }, info: function () { return S && S.L ? { slides: S.L.n, cells: S.L.cells.length, W: S.L.W } : null; } };
})();
