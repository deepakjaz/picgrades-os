/* PicGrades Story Hub — isolated guest-facing Hub surface.
   Plain JavaScript IIFE. Host owns navigation, persistence and data loading. */
(function (root) {
  'use strict';

  var STYLE = 'living-album';
  var ICONS = {
    findme: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-2 2.8-3 5-3s4 1 5 3"/>',
    reel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 4l3 5m3-5 3 5M10 12v5l5-2.5z"/>',
    post: '<rect x="4" y="3" width="13" height="18" rx="2"/><path d="M8 8h5M8 12h5M8 16h3M19 7v10m-2-8 2-2 2 2"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    notes: '<path d="M4 5h16v12H9l-5 4zM8 9h8M8 13h6"/>',
    loved: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/>',
    memory: '<path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11z"/><path d="M8 12h8"/>',
    skip: '<path d="m9 6 6 6-6 6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    play: '<path d="m9 6 10 6-10 6z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };

  var state = null;
  var globalCleanup = [];
  var MAX_ACTIVE = 12;
  var ACTIONS = [
    ['findme', 'Find me'], ['reel', 'Reel'], ['post', 'Post'],
    ['upload', 'Add a moment'], ['notes', 'Notes'], ['loved', 'Loved'], ['share', 'Share']
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function svg(name) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false'); s.innerHTML = ICONS[name] || '';
    return s;
  }
  function button(name, label, cls) {
    var b = el('button', cls || 'pse-icon'); b.type = 'button';
    b.setAttribute('aria-label', label); b.title = label; b.appendChild(svg(name)); return b;
  }
  function text(parent, tag, cls, value) { var n = el(tag, cls, value); parent.appendChild(n); return n; }
  function firstId(list) { return list && list.length ? list[0] : null; }
  function photoIds(ev) {
    var src = Array.isArray(ev && ev.photos) ? ev.photos : [];
    var ids = src.map(function (p) { return p && p.id; }).filter(Boolean);
    if (!ids.length) return [];
    var featured = Array.isArray(ev.featured) ? ev.featured.filter(Boolean) : [];
    if (featured.length) return featured.filter(function (id, i, a) { return ids.indexOf(id) > -1 && a.indexOf(id) === i; }).slice(0, 15);
    var n = Math.min(15, ids.length), out = [];
    if (n === ids.length) return ids;
    for (var i = 0; i < n; i++) out.push(ids[Math.round(i * (ids.length - 1) / Math.max(1, n - 1))]);
    return out.filter(function (id, i, a) { return a.indexOf(id) === i; });
  }
  function allPhotos(D) {
    var out = [], seen = Object.create(null);
    (D.events || []).forEach(function (ev) { photoIds(ev).forEach(function (id) { if (!seen[id]) { seen[id] = 1; out.push({ id: id, event: ev.name }); } }); });
    return out;
  }
  function coverIds(D) {
    var chosen = Array.isArray(D.cover) ? D.cover.filter(Boolean) : [];
    if (chosen.length) return chosen.slice(0, 5);
    return allPhotos(D).slice(0, 5).map(function (p) { return p.id; });
  }
  function imageUrl(id, width) {
    try { return typeof root.pgImg === 'function' ? root.pgImg(id, width) : ''; } catch (_) { return ''; }
  }
  function fallbackUrl(id, width) {
    try { return typeof root.pgImgFallback === 'function' ? root.pgImgFallback(id, width) : ''; } catch (_) { return ''; }
  }
  function setImage(img, id, width) {
    img.dataset.photoId = id || '';
    img.dataset.width = String(width);
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    if (!id) { img.removeAttribute('src'); return; }
    img.onerror = function () {
      this.onerror = null;
      var fb = fallbackUrl(id, width);
      if (fb) this.src = fb;
    };
    var src = imageUrl(id, width);
    if (src) img.src = src;
  }
  function imageButton(id, width, cls, aria) {
    var b = el('button', cls || 'pse-photo'); b.type = 'button'; b.setAttribute('aria-label', aria || 'Open photo');
    var im = el('img', ''); setImage(im, id, width); b.appendChild(im); return b;
  }
  function getGalleryId(D, opts) {
    return String((opts && (opts.galleryId || opts.id)) || D.galleryId || D.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  function askKey(D, opts) { return 'pg_storyq_' + getGalleryId(D, opts); }
  function wasAsked(D, opts) { try { return localStorage.getItem(askKey(D, opts)) === '1'; } catch (_) { return false; } }
  function markAsked(D, opts) { try { localStorage.setItem(askKey(D, opts), '1'); } catch (_) {} }
  function act(name, arg) { if (state && typeof state.act === 'function') state.act(name, arg); }
  function addListener(node, type, fn, options) {
    node.addEventListener(type, fn, options);
    if (state) state.cleanups.push(function () { node.removeEventListener(type, fn, options); });
  }
  function iconAction(name, label) {
    var b = button(name, label, 'pse-quick');
    addListener(b, 'click', function () { act(name); });
    return b;
  }
  function buildQuestion(D, opts, rootEl) {
    var back = el('div', 'pse-question'); back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-labelledby', 'pse-question-title');
    var content = el('div', 'pse-question-inner');
    text(content, 'span', 'pse-kicker', 'A little place in their story');
    text(content, 'h2', '', 'Where in the celebration would you like to leave a memory?').id = 'pse-question-title';
    text(content, 'p', '', 'Choose a chapter, or simply step into the photographs.');
    var choices = el('div', 'pse-question-events');
    (D.events || []).slice(0, 5).forEach(function (ev) {
      var b = el('button', 'pse-question-choice', ev.name); b.type = 'button';
      addListener(b, 'click', function () { markAsked(D, opts); back.remove(); act('memory', ev.name); });
      choices.appendChild(b);
    });
    content.appendChild(choices);
    var skip = el('button', 'pse-skip', 'Skip and explore'); skip.type = 'button'; skip.appendChild(svg('skip'));
    addListener(skip, 'click', function () { markAsked(D, opts); back.classList.add('pse-question-out'); window.setTimeout(function () { back.remove(); }, 240); });
    content.appendChild(skip); back.appendChild(content); rootEl.appendChild(back);
    var first = choices.querySelector('button') || skip; window.setTimeout(function () { if (first && first.focus) first.focus(); }, 30);
  }
  function makeHero(D, ids) {
    var hero = el('section', 'pse-hero'); hero.setAttribute('aria-label', 'Wedding story');
    var stage = el('div', 'pse-hero-stage');
    var main = el('img', 'pse-hero-img'); main.dataset.photoId = '';
    if (ids[0]) setImage(main, ids[0], 1280);
    stage.appendChild(main); stage.appendChild(el('div', 'pse-scrim'));
    var caption = el('div', 'pse-hero-caption');
    text(caption, 'span', 'pse-kicker', 'A day to keep close');
    text(caption, 'h1', '', D.names || 'A wedding story');
    text(caption, 'p', '', [D.date, D.place].filter(Boolean).join(' · '));
    stage.appendChild(caption); hero.appendChild(stage);
    var prompt = el('div', 'pse-hero-prompt'); text(prompt, 'span', '', 'Scroll to wander through the day'); prompt.appendChild(svg('down')); hero.appendChild(prompt);
    var change = function (id) { if (!id) return; setImage(main, id, 1280); };
    hero._changePhoto = change;
    return hero;
  }
  function buildTopTools(D) {
    var nav = el('nav', 'pse-quickbar'); nav.setAttribute('aria-label', 'Gallery tools');
    ACTIONS.forEach(function (item) { nav.appendChild(iconAction(item[0], item[1])); });
    return nav;
  }
  function buildIntro(D) {
    var section = el('section', 'pse-intro pse-reveal');
    text(section, 'span', 'pse-kicker', 'The wedding of');
    text(section, 'h2', '', D.names || 'Together, forever');
    text(section, 'p', '', [D.date, D.place, D.studio ? 'Photographed by ' + D.studio : ''].filter(Boolean).join(' · '));
    text(section, 'span', 'pse-intro-line', 'Some moments are too beautiful to leave behind.');
    return section;
  }
  function buildCoverStream(D, ids) {
    var section = el('section', 'pse-cover-stream pse-reveal');
    text(section, 'span', 'pse-kicker', 'A few moments, held close');
    var track = el('div', 'pse-cover-track');
    ids.slice(1, 5).forEach(function (id, i) {
      var b = imageButton(id, 500, 'pse-cover-shot pse-reveal', 'Open a wedding photograph');
      addListener(b, 'click', function () { act('photo', { event: findEventName(D, id), id: id }); });
      track.appendChild(b);
    });
    section.appendChild(track); return section;
  }
  function findEventName(D, id) {
    for (var i = 0; i < (D.events || []).length; i++) if (photoIds(D.events[i]).indexOf(id) > -1) return D.events[i].name;
    return '';
  }
  function buildEventChapters(D) {
    var section = el('section', 'pse-events');
    var heading = el('header', 'pse-section-head pse-reveal');
    text(heading, 'span', 'pse-kicker', 'The chapters');
    text(heading, 'h2', '', 'Every part of the day');
    text(heading, 'p', '', 'Follow the celebration, one memory at a time.'); section.appendChild(heading);
    var rail = el('div', 'pse-event-rail');
    (D.events || []).forEach(function (ev, i) {
      var ids = photoIds(ev), item = el('article', 'pse-event pse-reveal');
      var shot = imageButton(ids[0], 700, 'pse-event-photo', 'Open ' + ev.name);
      addListener(shot, 'click', function () { act('event', ev.name); });
      var copy = el('div', 'pse-event-copy');
      text(copy, 'span', 'pse-event-index', String(i + 1).padStart(2, '0'));
      text(copy, 'h3', '', ev.name || 'A moment');
      var actions = el('div', 'pse-event-actions');
      var open = el('button', 'pse-text-action', 'Enter this chapter'); open.type = 'button'; open.appendChild(svg('arrow'));
      addListener(open, 'click', function () { act('event', ev.name); });
      var memory = button('memory', 'Share a memory from ' + ev.name, 'pse-memory-action');
      addListener(memory, 'click', function () { act('memory', ev.name); });
      actions.append(open, memory); copy.appendChild(actions); item.append(shot, copy); rail.appendChild(item);
    });
    section.appendChild(rail); return section;
  }
  function buildVarmala(D) {
    var bride = D.couple && D.couple.bride, groom = D.couple && D.couple.groom;
    if (!bride || !groom) return null;
    var section = el('section', 'pse-vow pse-reveal');
    text(section, 'span', 'pse-kicker', 'And then, together');
    var stage = el('div', 'pse-vow-stage');
    var left = el('img', 'pse-vow-person pse-vow-bride'); setImage(left, bride, 500);
    var right = el('img', 'pse-vow-person pse-vow-groom'); setImage(right, groom, 500);
    var ring = el('div', 'pse-vow-ring', '∞'); stage.append(left, right, ring); section.appendChild(stage);
    text(section, 'p', 'pse-vow-caption', 'Two lives, one promise.'); return section;
  }
  function buildLoved(D) {
    var list = (D.loved || []).map(function (x) { return x && x.p && x.p.id; }).filter(Boolean).slice(0, 5);
    if (!list.length) return null;
    var section = el('section', 'pse-loved pse-reveal');
    text(section, 'span', 'pse-kicker', 'Held close by everyone');
    text(section, 'h2', '', 'The moments you loved');
    var row = el('div', 'pse-loved-row');
    list.forEach(function (id) { var b = imageButton(id, 360, 'pse-loved-shot', 'Open a loved photograph'); addListener(b, 'click', function () { act('photo', { event: findEventName(D, id), id: id }); }); row.appendChild(b); });
    section.appendChild(row); return section;
  }
  function buildNotes(D) {
    var notes = (D.notes || []).slice(0, 3); if (!notes.length) return null;
    var section = el('section', 'pse-notes pse-reveal');
    text(section, 'span', 'pse-kicker', 'Words from your people');
    text(section, 'h2', '', 'Little blessings to keep');
    var line = el('div', 'pse-note-line');
    notes.forEach(function (note) {
      var article = el('article', 'pse-note');
      if (note.photoId) { var im = el('img', 'pse-note-photo'); setImage(im, note.photoId, 200); article.appendChild(im); }
      text(article, 'blockquote', '', note.text || '');
      text(article, 'cite', '', note.name || ''); line.appendChild(article);
    });
    section.appendChild(line); var all = el('button', 'pse-text-action', 'Read all notes'); all.type = 'button'; all.appendChild(svg('arrow'));
    addListener(all, 'click', function () { act('notes'); }); section.appendChild(all); return section;
  }
  function buildDemo(D, opts, type) {
    var url = opts && opts.demoVideos && opts.demoVideos[type]; if (!url) return null;
    var section = el('section', 'pse-demo pse-reveal');
    text(section, 'span', 'pse-kicker', type === 'reel' ? 'Your day, moving' : 'A little more to create');
    text(section, 'h2', '', type === 'reel' ? 'See the story become a reel' : 'Make a post of your own');
    var video = el('video', 'pse-demo-video'); video.muted = true; video.playsInline = true; video.loop = true; video.preload = 'none'; video.controls = true;
    video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.setAttribute('loop', ''); video.setAttribute('preload', 'none');
    var source = el('source'); source.src = url; video.appendChild(source);
    video.setAttribute('aria-label', type === 'reel' ? 'Reel edit demonstration' : 'Post edit demonstration');
    section.appendChild(video);
    var cta = el('button', 'pse-text-action', type === 'reel' ? 'Explore Reel Edits' : 'Explore Post Edits'); cta.type = 'button'; cta.appendChild(svg('arrow'));
    addListener(cta, 'click', function () { act(type); }); section.appendChild(cta); return section;
  }
  function buildFooter(D) {
    var footer = el('footer', 'pse-footer pse-reveal');
    text(footer, 'span', 'pse-kicker', 'The story continues with you');
    text(footer, 'h2', '', 'Leave a little piece of your day.');
    var add = el('button', 'pse-footer-cta', 'Add a moment'); add.type = 'button'; add.appendChild(svg('upload'));
    addListener(add, 'click', function () { act('upload'); }); footer.appendChild(add);
    if (D.studio) text(footer, 'p', 'pse-credit', 'Photographed with care by ' + D.studio);
    return footer;
  }
  function setVideoPlayback(video, on) {
    if (!video) return;
    if (on) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    else { video.pause(); }
  }
  function updateLiveImages() {
    if (!state || state.destroyed) return;
    var nodes = state.box.querySelectorAll('img[data-photo-id]');
    var rects = [], vh = window.innerHeight || 800;
    Array.prototype.forEach.call(nodes, function (img) {
      var r = img.getBoundingClientRect();
      var near = r.bottom > -vh * 0.8 && r.top < vh * 1.8;
      rects.push({ img: img, near: near, distance: Math.abs((r.top + r.bottom) / 2 - vh / 2) });
    });
    rects.sort(function (a, b) {
      var ap = a.img.dataset.pshPriority === '1' ? -1 : 0, bp = b.img.dataset.pshPriority === '1' ? -1 : 0;
      return ap - bp || a.distance - b.distance;
    });
    var active = 0;
    rects.forEach(function (it) {
      var img = it.img, id = img.dataset.photoId, width = Number(img.dataset.width) || 360;
      if (it.near && active < MAX_ACTIVE) {
        active++;
        if (!img.getAttribute('src') && id) {
          img.onerror = function () { this.onerror = null; var fb = fallbackUrl(id, width); if (fb) this.src = fb; };
          var url = imageUrl(id, width); if (url) img.src = url;
        }
      } else if (img.getAttribute('src')) {
        img.removeAttribute('src');
      }
    });
    // The active image in the hero changes as the scroll reaches each chapter.
    if (state.hero && state.hero._changePhoto && !state.reduced) {
      var heroRect = state.hero.getBoundingClientRect();
      var chosen = state.cover[0];
      var best = Infinity;
      state.storyAnchors.forEach(function (a) {
        var r = a.node.getBoundingClientRect(), d = Math.abs(r.top - vh * 0.34);
        if (d < best) { best = d; if (a.id) chosen = a.id; }
      });
      if (chosen && chosen !== state.lastHeroId) { state.hero._changePhoto(chosen); state.lastHeroId = chosen; }
    }
    if (state.videoObserver) {
      // observer handles video visibility, this branch deliberately does no per-element scroll work
    }
  }
  function scheduleImages() {
    if (!state || state.frame) return;
    state.frame = requestAnimationFrame(function () { if (!state) return; state.frame = 0; updateLiveImages(); });
  }
  function observeReveals() {
    if (!state) return;
    var box = state.box;
    if ('IntersectionObserver' in window) {
      state.revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('pse-in'); state.revealObserver.unobserve(entry.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      Array.prototype.forEach.call(box.querySelectorAll('.pse-reveal'), function (n) { state.revealObserver.observe(n); });
      state.videoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { setVideoPlayback(entry.target, entry.isIntersecting && !document.hidden); });
      }, { rootMargin: '80px', threshold: 0.15 });
      Array.prototype.forEach.call(box.querySelectorAll('video.pse-demo-video'), function (v) { state.videoObserver.observe(v); });
    } else {
      Array.prototype.forEach.call(box.querySelectorAll('.pse-reveal'), function (n) { n.classList.add('pse-in'); });
    }
  }
  function destroy() {
    if (!state) return;
    state.destroyed = true;
    if (state.frame) cancelAnimationFrame(state.frame);
    if (state.revealObserver) state.revealObserver.disconnect();
    if (state.videoObserver) state.videoObserver.disconnect();
    state.cleanups.forEach(function (fn) { try { fn(); } catch (_) {} });
    state.box.querySelectorAll('video').forEach(function (v) { v.pause(); v.removeAttribute('src'); v.querySelectorAll('source').forEach(function (s) { s.removeAttribute('src'); }); });
    state.box.querySelectorAll('img[data-photo-id]').forEach(function (im) { im.removeAttribute('src'); im.onerror = null; });
    state.box.classList.remove('pse-root'); state.box.textContent = '';
    state = null;
  }
  function render(box, D, actFn, opts) {
    destroy();
    if (!box || !D) return;
    state = { box: box, act: typeof actFn === 'function' ? actFn : function () {}, cleanups: [], destroyed: false,
      frame: 0, revealObserver: null, videoObserver: null, cover: coverIds(D), reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      storyAnchors: [], lastHeroId: null, hero: null };
    box.textContent = ''; box.classList.add('pse-root');
    var hero = makeHero(D, state.cover); state.hero = hero; box.appendChild(hero);
    if (hero.querySelector('img')) hero.querySelector('img').dataset.pshPriority = '1';
    box.appendChild(buildTopTools(D));
    var body = el('div', 'pse-body'); box.appendChild(body);
    body.appendChild(buildIntro(D));
    var stream = buildCoverStream(D, state.cover); body.appendChild(stream);
    var events = buildEventChapters(D); body.appendChild(events);
    (D.events || []).forEach(function (ev) { var ids = photoIds(ev); if (ids[0]) state.storyAnchors.push({ node: body.querySelectorAll('.pse-event')[state.storyAnchors.length], id: ids[0] }); });
    var vow = buildVarmala(D); if (vow) body.appendChild(vow);
    var loved = buildLoved(D); if (loved) body.appendChild(loved);
    var notes = buildNotes(D); if (notes) body.appendChild(notes);
    var reel = buildDemo(D, opts, 'reel'); if (reel) body.appendChild(reel);
    var post = buildDemo(D, opts, 'post'); if (post) body.appendChild(post);
    body.appendChild(buildFooter(D));
    observeReveals();
    addListener(window, 'scroll', scheduleImages, { passive: true });
    addListener(window, 'resize', scheduleImages, { passive: true });
    addListener(document, 'visibilitychange', function () {
      if (document.hidden && state) state.box.querySelectorAll('video').forEach(function (v) { setVideoPlayback(v, false); });
      else scheduleImages();
    });
    if (state.reduced) {
      box.classList.add('pse-reduced');
      box.querySelectorAll('.pse-reveal').forEach(function (n) { n.classList.add('pse-in'); });
    }
    scheduleImages();
    if (opts && opts.first && !wasAsked(D, opts)) buildQuestion(D, opts, box);
    return { destroy: destroy, style: STYLE };
  }

  root.PGStoryEditorial = {
    render: render,
    destroy: destroy,
    styles: [{ id: STYLE, name: 'Living Album', note: 'A cinematic scroll through the wedding, with floating tools and event chapters.' }]
  };
})(window);
