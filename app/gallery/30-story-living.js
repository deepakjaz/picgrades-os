// Story Hub (Work Package 02): The Hub as a living, scroll-driven wedding story (not cards).
// - First-visit memory prompt (once per gallery in localStorage pg_storyq_<galleryId>)
// - Full-screen cover with "Next" cycler that shrinks in motion as you scroll
// - Glancing photo stream (photos drift past as they appear and go)
// - Interactive Varmala scroll stage (couple portraits glide together and exchange garland)
// - One-by-one Event chapters (each with ceremony icon + 10-15 featured photos cycling)
// - Live Reel Edits & Post Edits visual showcase (demo videos + couple's own photos in templates)
// - Micro-icon floating rail (Find me & tools as tiny icons, never big cards)
// - Strict Android budget memory care: max ~12 loaded images at once, single rAF scroll loop.
(function pgStoryHub() {
  'use strict';

  const STYLES = [
    { id: 'mandap',  name: 'Living Story',    note: 'Full-screen shrinking cover, glancing photos, and varmala scroll' },
    { id: 'cinema',  name: 'Cinema Aperture', note: 'Deep theatre contrast with spotlight event chapters' },
    { id: 'patrika', name: 'Royal Patrika',   note: 'Heritage arches and centered ceremonial chapters' }
  ];

  const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
  const MAX_LIVE_IMGS = 12;

  // Clean 24x24 stroke icons for micro-buttons and ceremony chapters
  const ICONS = {
    findme:  '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="10" r="2.6"/><path d="M8 16.5c1.3-2 6.7-2 8 0"/>',
    upload:  '<path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/>',
    reel:    '<rect x="4" y="3" width="16" height="18" rx="3"/><polygon points="10 9 15 12 10 15 10 9"/>',
    post:    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9.5 4v16M15.5 4v16"/>',
    loved:   '<path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.5 5 5 0 1 1 7.5 6.5Z"/>',
    notes:   '<path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v9Z"/>',
    share:   '<path d="M12 3v12m-4-8 4-4 4 4"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>',
    install: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M12 7v7m-3-3 3 3 3-3"/>',
    next:    '<path d="m9 6 6 6-6 6"/>',
    haldi:   '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    mehendi: '<path d="M12 3c3.5 3.5 5 8 3 13-1 2.5-3 4-3 5 0-1-2-2.5-3-5-2-5-.5-9.5 3-13Z"/><circle cx="12" cy="12" r="2"/>',
    sangeet: '<circle cx="8" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M11 17V6l9-2v11"/>',
    baraat:  '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12l14-3"/>',
    pheras:  '<path d="M12 3c2.5 3.5 4 6.5 2 10-1 1.5-3 1.5-4 0-2-3.5-.5-6.5 2-10Z"/><path d="M5 19h14M7 16h10"/>',
    sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>'
  };

  function svgIcon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
  }

  function eventIconKey(name) {
    const s = String(name || '').toLowerCase();
    if (s.indexOf('haldi') > -1 || s.indexOf('pithi') > -1) return 'haldi';
    if (s.indexOf('mehendi') > -1 || s.indexOf('mehndi') > -1) return 'mehendi';
    if (s.indexOf('sangeet') > -1 || s.indexOf('garba') > -1 || s.indexOf('music') > -1) return 'sangeet';
    if (s.indexOf('baraat') > -1 || s.indexOf('entry') > -1) return 'baraat';
    if (s.indexOf('phera') > -1 || s.indexOf('wedding') > -1 || s.indexOf('muhurth') > -1 || s.indexOf('nikah') > -1) return 'pheras';
    return 'sparkle';
  }

  const h = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function imgUrl(id, w) {
    if (!id) return BLANK_GIF;
    return window.pgImg ? pgImg(id, w) : ('https://lh3.googleusercontent.com/d/' + id + '=w' + w);
  }
  function imgFallback(id, w) {
    if (!id) return BLANK_GIF;
    return window.pgImgFallback ? pgImgFallback(id, w) : ('https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w);
  }

  // Pick evenly spaced photos if featured array is missing
  function pickEvenly(photos, count) {
    const list = (photos || []).map(p => (typeof p === 'string' ? p : p && p.id)).filter(Boolean);
    if (!list.length) return [];
    if (list.length <= count) return list.slice();
    const out = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i * (list.length - 1)) / Math.max(1, count - 1));
      out.push(list[idx]);
    }
    return out;
  }

  function galleryKey() {
    const gid = (typeof GALLERY_ID !== 'undefined' && GALLERY_ID) || (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.galleryId) || 'default';
    return 'pg_storyq_' + gid;
  }

  function hasSeenQuestion() {
    try { return localStorage.getItem(galleryKey()) === '1'; } catch (e) { return false; }
  }

  function markQuestionSeen() {
    try { localStorage.setItem(galleryKey(), '1'); } catch (e) {}
  }

  // Active instance state for clean destroy() and re-render()
  let S = null;

  function destroy() {
    if (!S) return;
    if (S.raf) cancelAnimationFrame(S.raf);
    if (S.onScroll) window.removeEventListener('scroll', S.onScroll);
    if (S.onResize) window.removeEventListener('resize', S.onResize);
    if (S.memIo) S.memIo.disconnect();
    if (S.evIo) S.evIo.disconnect();
    if (S.vidIo) S.vidIo.disconnect();
    S.timers.forEach(t => clearInterval(t));
    if (S.box) S.box.innerHTML = '';
    S = null;
  }

  //Managed image element that participates in the 12-image Android memory budget
  function makeManagedImg(id, w, cls, eager) {
    const im = h('img', (cls ? cls + ' ' : '') + 'psh-mimg');
    im.alt = '';
    im.decoding = 'async';
    im.dataset.pid = id || '';
    im.dataset.w = String(w || 400);
    im.onerror = function () {
      if (this.src === BLANK_GIF) return;
      this.onerror = null;
      this.src = imgFallback(this.dataset.pid, Number(this.dataset.w) || 400);
    };
    if (eager && id) {
      im.src = imgUrl(id, w);
      im.dataset.live = '1';
    } else {
      im.src = BLANK_GIF;
      im.dataset.live = '0';
    }
    if (S) S.imgs.push(im);
    return im;
  }

  function setManagedPhoto(im, id, w) {
    if (!im || !id) return;
    im.dataset.pid = id;
    if (w) im.dataset.w = String(w);
    if (im.dataset.live === '1') {
      im.onerror = function () {
        this.onerror = null;
        this.src = imgFallback(id, Number(im.dataset.w) || 400);
      };
      im.src = imgUrl(id, Number(im.dataset.w) || 400);
    }
  }

  // Enforce strict <= 12 live images on screen at any time
  function enforceImageBudget() {
    if (!S || !S.imgs.length) return;
    const vh = window.innerHeight || 800;
    const scored = [];
    for (let i = 0; i < S.imgs.length; i++) {
      const im = S.imgs[i];
      if (!im.isConnected || !im.dataset.pid) continue;
      const r = im.getBoundingClientRect(), vw = window.innerWidth || 400;
      const center = (r.top + r.bottom) / 2;
      const dist = Math.abs(center - vh / 2);
      // PicGrades fix: a hidden picture (no size) or one parked far to the side must not take a place in the budget,
      // or a picture on screen is left blank
      const shown = r.width > 0 && r.height > 0 && r.right > -vw * 0.6 && r.left < vw * 1.6;
      scored.push({ im, dist: shown ? dist : dist + 1e6, near: shown && r.bottom > -vh * 0.9 && r.top < vh * 1.9 });
    }
    scored.sort((a, b) => a.dist - b.dist);
    scored.forEach((item, idx) => {
      const shouldLoad = item.near && idx < MAX_LIVE_IMGS;
      const im = item.im;
      if (shouldLoad && im.dataset.live !== '1') {
        im.dataset.live = '1';
        const pid = im.dataset.pid, w = Number(im.dataset.w) || 400;
        im.onerror = function () { this.onerror = null; this.src = imgFallback(pid, w); };
        im.src = imgUrl(pid, w);
      } else if (!shouldLoad && im.dataset.live === '1') {
        im.dataset.live = '0';
        im.onerror = null;
        im.src = BLANK_GIF;
      }
    });
  }

  // =========================================================================
  // Main render(box, D, act, opts)
  // =========================================================================
  function render(box, D, act, opts) {
    destroy();
    if (!box) return;
    D = D || {};
    opts = opts || {};
    const runAct = typeof act === 'function' ? act : () => {};
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowMem = (navigator.deviceMemory && navigator.deviceMemory <= 4) || false;

    // 1. Normalize events and their 10-15 featured photos
    const events = (D.events || []).map(ev => {
      const feat = (Array.isArray(ev.featured) && ev.featured.length)
        ? ev.featured.slice(0, 15)
        : pickEvenly(ev.photos || [], 12);
      return { name: ev.name || 'Event', featured: feat, icon: eventIconKey(ev.name) };
    }).filter(ev => ev.featured.length > 0);

    // 2. Normalize opening cover photos (10-15 chosen photos)
    let coverIds = Array.isArray(D.cover) && D.cover.length ? D.cover.slice(0, 15) : [];
    if (!coverIds.length) {
      events.forEach(ev => { if (ev.featured[0] && coverIds.length < 12) coverIds.push(ev.featured[0]); });
      events.forEach(ev => { if (ev.featured[1] && coverIds.length < 15) coverIds.push(ev.featured[1]); });
    }
    if (!coverIds.length && Array.isArray(D.loved) && D.loved.length) {
      coverIds = D.loved.map(x => (x.p && x.p.id) || x.id).filter(Boolean).slice(0, 12);
    }

    // 3. Couple portraits for Varmala interaction
    let brideId = D.couple && D.couple.bride;
    let groomId = D.couple && D.couple.groom;
    if (!brideId || !groomId) {
      brideId = coverIds[1] || coverIds[0] || '';
      groomId = coverIds[2] || coverIds[0] || '';
    }

    S = {
      box: box,
      D: D,
      act: runAct,
      opts: opts,
      imgs: [],
      timers: [],
      glances: [],
      raf: 0,
      scrollDirty: true,
      coverIdx: 0,
      coverIds: coverIds,
      activeEvIdx: 0,
      events: events,
      reduced: reducedMotion,
      lowMem: lowMem
    };

    const root = h('div', 'psh-root');
    const styleId = opts.style || 'mandap';
    root.dataset.style = styleId;

    // ---- A. Floating Micro-Icon Rail (Tiny icons, Find me everywhere, never big cards) ----
    const rail = h('nav', 'psh-rail');
    rail.setAttribute('aria-label', 'Quick wedding tools');

    const findBtn = h('button', 'psh-icbtn psh-icbtn-find');
    findBtn.type = 'button';
    findBtn.setAttribute('aria-label', 'Find me — face search');
    findBtn.title = 'Find me';
    findBtn.innerHTML = svgIcon('findme') + '<span>Find me</span>';
    findBtn.addEventListener('click', () => runAct('findme'));
    rail.appendChild(findBtn);

    const toolDefs = [
      ['upload', 'Add a moment', 'upload'],
      ['reel',   'Make a Reel',  'reel'],
      ['post',   'Make a Post',  'post'],
      ['loved',  'Most loved',   'loved'],
      ['notes',  'Family notes', 'notes'],
      ['share',  'Share',        'share']
    ];
    toolDefs.forEach(([actName, label, icKey]) => {
      const b = h('button', 'psh-icbtn');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      b.innerHTML = svgIcon(icKey);
      b.addEventListener('click', () => runAct(actName));
      rail.appendChild(b);
    });
    root.appendChild(rail);

    // ---- B. First-Visit Question Overlay (Only on very first open, skipped forever after) ----
    if (opts.first && !hasSeenQuestion() && events.length) {
      const qOverlay = h('div', 'psh-qveil');
      qOverlay.setAttribute('role', 'dialog');
      qOverlay.setAttribute('aria-modal', 'true');
      qOverlay.setAttribute('aria-label', 'Share a memory');

      const qCard = h('div', 'psh-qbox');
      const qEye = h('div', 'psh-eye');
      qEye.textContent = D.names || 'Welcome';
      const qTitle = h('h2', 'psh-qtitle');
      qTitle.textContent = 'Where in the event would you like to share a memory?';
      const qSub = h('p', 'psh-qsub');
      qSub.textContent = 'Choose a moment to add your photo or blessing, or skip straight to the gallery.';

      const qChips = h('div', 'psh-qchips');
      events.forEach(ev => {
        const chip = h('button', 'psh-qchip');
        chip.type = 'button';
        chip.innerHTML = svgIcon(ev.icon);
        const sp = h('span');
        sp.textContent = ev.name;
        chip.appendChild(sp);
        chip.addEventListener('click', () => {
          markQuestionSeen();
          qOverlay.classList.add('is-out');
          setTimeout(() => qOverlay.remove(), 280);
          runAct('memory', ev.name);
        });
        qChips.appendChild(chip);
      });

      const skipBtn = h('button', 'psh-qskip');
      skipBtn.type = 'button';
      skipBtn.textContent = 'Skip to photos →';
      skipBtn.addEventListener('click', () => {
        markQuestionSeen();
        qOverlay.classList.add('is-out');
        setTimeout(() => qOverlay.remove(), 280);
      });

      qCard.append(qEye, qTitle, qSub, qChips, skipBtn);
      qOverlay.appendChild(qCard);
      root.appendChild(qOverlay);
    }

    // ---- C. 0%–20% Opening Full-Screen Stage (Shrinks into Cover on Scroll + "Next" Cycler) ----
    const heroTrack = h('section', 'psh-hero-track');
    const heroSticky = h('div', 'psh-hero-sticky');
    const heroCard = h('div', 'psh-hero-card');
    S.heroCard = heroCard;

    const heroImg = makeManagedImg(coverIds[0] || '', 1280, 'psh-hero-img', true);
    S.heroImg = heroImg;
    heroImg.addEventListener('click', () => {
      const id = coverIds[S.coverIdx];
      if (id) runAct('photo', { event: (events[0] && events[0].name) || 'Highlights', id: id });
    });

    const heroScrim = h('div', 'psh-hero-scrim');
    const heroMeta = h('div', 'psh-hero-meta');

    const eyeText = [D.date, D.place].filter(Boolean).join(' · ');
    if (eyeText) {
      const eyeEl = h('div', 'psh-eye');
      eyeEl.textContent = eyeText;
      heroMeta.appendChild(eyeEl);
    }
    const titleEl = h('h1', 'psh-couple-names');
    titleEl.textContent = D.names || 'Our Wedding';
    heroMeta.appendChild(titleEl);

    const heroControls = h('div', 'psh-hero-ctrls');
    if (coverIds.length > 1) {
      const nextBtn = h('button', 'psh-next-pill');
      nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', 'Next cover photo');
      const nextTxt = h('span');
      nextTxt.textContent = 'Next moment';
      nextBtn.appendChild(nextTxt);
      nextBtn.insertAdjacentHTML('beforeend', svgIcon('next'));
      nextBtn.addEventListener('click', e => {
        e.stopPropagation();
        S.coverIdx = (S.coverIdx + 1) % coverIds.length;
        heroImg.classList.add('is-swapping');
        setTimeout(() => {
          if (!S) return;
          setManagedPhoto(heroImg, coverIds[S.coverIdx], 1280);
          heroImg.classList.remove('is-swapping');
        }, 160);
      });
      heroControls.appendChild(nextBtn);
    }

    const scrollHint = h('span', 'psh-scroll-cue');
    scrollHint.textContent = 'Scroll to enter ↓';
    heroControls.appendChild(scrollHint);
    heroMeta.appendChild(heroControls);

    heroCard.append(heroImg, heroScrim, heroMeta);
    heroSticky.appendChild(heroCard);
    heroTrack.appendChild(heroSticky);
    root.appendChild(heroTrack);

    // ---- D. 20%–40% Glancing Photo Stream (Images glance & drift as they appear and go) ----
    const glancePool = [];
    events.forEach(ev => {
      ev.featured.slice(0, 3).forEach(pid => {
        if (glancePool.length < 6 && coverIds.indexOf(pid) !== 0) {
          glancePool.push({ id: pid, event: ev.name });
        }
      });
    });

    if (glancePool.length >= 2) {
      const streamSec = h('section', 'psh-stream');
      streamSec.setAttribute('aria-label', 'Glancing moments');
      const streamIntro = h('p', 'psh-whisper');
      streamIntro.textContent = 'Every glance, every laugh, still unfolding…';
      streamSec.appendChild(streamIntro);

      glancePool.forEach((item, idx) => {
        const row = h('div', 'psh-glance-row ' + (idx % 2 === 0 ? 'is-left' : 'is-right'));
        const fig = h('button', 'psh-glance-fig');
        fig.type = 'button';
        fig.setAttribute('aria-label', 'Open photo from ' + item.event);
        const gim = makeManagedImg(item.id, 600, 'psh-glance-img', false);
        const gcap = h('span', 'psh-glance-cap');
        gcap.textContent = item.event;
        fig.append(gim, gcap);
        fig.addEventListener('click', () => runAct('photo', { event: item.event, id: item.id }));
        row.appendChild(fig);
        streamSec.appendChild(row);
        S.glances.push({ el: fig, dir: idx % 2 === 0 ? -1 : 1, speed: 0.14 + (idx % 3) * 0.05 });
      });
      root.appendChild(streamSec);
    }

    // ---- E. 40%–55% Interactive Varmala Convergence (Portraits come close & exchange garland) ----
    if (brideId && groomId) {
      const vmTrack = h('section', 'psh-varmala-track');
      vmTrack.setAttribute('aria-label', 'The Varmala');
      const vmSticky = h('div', 'psh-varmala-sticky');
      S.vmTrack = vmTrack;

      const vmHead = h('div', 'psh-vm-head');
      const vmEye = h('div', 'psh-eye');
      vmEye.textContent = 'Scroll to bring them together';
      const vmTitle = h('h2', 'psh-sec-title');
      vmTitle.textContent = 'Two Paths, One Promise';
      vmHead.append(vmEye, vmTitle);

      const vmStage = h('div', 'psh-vm-stage');
      const pLeft = h('button', 'psh-vm-card psh-vm-left');
      pLeft.type = 'button';
      pLeft.setAttribute('aria-label', 'View portrait');
      pLeft.appendChild(makeManagedImg(brideId, 600, '', false));
      pLeft.addEventListener('click', () => runAct('photo', { event: (events[0] && events[0].name) || '', id: brideId }));

      const pRight = h('button', 'psh-vm-card psh-vm-right');
      pRight.type = 'button';
      pRight.setAttribute('aria-label', 'View portrait');
      pRight.appendChild(makeManagedImg(groomId, 600, '', false));
      pRight.addEventListener('click', () => runAct('photo', { event: (events[0] && events[0].name) || '', id: groomId }));

      // PicGrades (step 54): the drawn garland was removed: it looked unreal next to real photos. The two portraits still come together.
      S.vmLeft = pLeft;
      S.vmRight = pRight;
      vmStage.append(pLeft, pRight);
      vmSticky.append(vmHead, vmStage);
      vmTrack.appendChild(vmSticky);
      root.appendChild(vmTrack);
    }

    // ---- F. 60%–75% Events as Animation (Names arrive one by one with icon & cycling featured frame) ----
    if (events.length) {
      const evSec = h('section', 'psh-events-sec');
      evSec.setAttribute('aria-label', 'Wedding Events');
      const evHeader = h('div', 'psh-sec-head');
      const evEye = h('div', 'psh-eye');
      evEye.textContent = 'The Celebrations';
      const evH2 = h('h2', 'psh-sec-title');
      evH2.textContent = 'Step Back Into Each Moment';
      evHeader.append(evEye, evH2);
      evSec.appendChild(evHeader);

      const evWrap = h('div', 'psh-events-flow');
      const evItems = [];

      events.forEach((ev, idx) => {
        const item = h('article', 'psh-ev-item' + (idx === 0 ? ' is-active' : ''));
        item.dataset.evIdx = String(idx);

        // Ceremony icon + Name row
        const bar = h('button', 'psh-ev-bar');
        bar.type = 'button';
        bar.addEventListener('click', () => runAct('event', ev.name));

        const icSpan = h('span', 'psh-ev-ic');
        icSpan.innerHTML = svgIcon(ev.icon);
        const nameH3 = h('h3', 'psh-ev-name');
        nameH3.textContent = ev.name;
        const enterSpan = h('span', 'psh-ev-enter');
        enterSpan.innerHTML = svgIcon('next');
        bar.append(icSpan, nameH3, enterSpan);

        // Animated Stage for this event's 10-15 featured photos (not a grid!)
        const stage = h('div', 'psh-ev-stage');
        const mainImg = makeManagedImg(ev.featured[0], 900, 'psh-ev-img', idx === 0);
        mainImg.addEventListener('click', () => {
          const curPid = ev.featured[item._fIdx || 0] || ev.featured[0];
          runAct('photo', { event: ev.name, id: curPid });
        });

        const stageBar = h('div', 'psh-ev-stagebar');
        const openEvBtn = h('button', 'psh-pill-btn');
        openEvBtn.type = 'button';
        openEvBtn.textContent = 'Enter ' + ev.name;
        openEvBtn.addEventListener('click', e => {
          e.stopPropagation();
          runAct('event', ev.name);
        });

        const nextPhotoBtn = h('button', 'psh-pill-btn psh-pill-ghost');
        nextPhotoBtn.type = 'button';
        nextPhotoBtn.textContent = 'Next highlight ↻';
        item._fIdx = 0;
        nextPhotoBtn.addEventListener('click', e => {
          e.stopPropagation();
          item._fIdx = ((item._fIdx || 0) + 1) % ev.featured.length;
          setManagedPhoto(mainImg, ev.featured[item._fIdx], 900);
        });

        stageBar.append(openEvBtn, nextPhotoBtn);
        stage.append(mainImg, stageBar);
        item.append(bar, stage);
        evWrap.appendChild(item);
        evItems.push({ el: item, img: mainImg, ev: ev });
      });

      evSec.appendChild(evWrap);
      root.appendChild(evSec);

      // Reveal & activate each event name one by one as the user scrolls
      if (window.IntersectionObserver) {
        S.evIo = new IntersectionObserver(entries => {
          entries.forEach(en => {
            if (en.isIntersecting) {
              evItems.forEach(x => x.el.classList.toggle('is-active', x.el === en.target));
              enforceImageBudget();
            }
          });
        }, { rootMargin: '-28% 0px -28% 0px', threshold: 0.15 });
        evItems.forEach(x => S.evIo.observe(x.el));
      }

      // Gently cycle the active event's featured photo every 3.8s while visible
      if (!reducedMotion) {
        const timer = setInterval(() => {
          if (document.hidden || !S) return;
          const active = evItems.find(x => x.el.classList.contains('is-active'));
          if (!active || active.ev.featured.length < 2) return;
          active.el._fIdx = ((active.el._fIdx || 0) + 1) % active.ev.featured.length;
          setManagedPhoto(active.img, active.ev.featured[active.el._fIdx], 900);
        }, 3800);
        S.timers.push(timer);
      }
    }

    // ---- G. 80%–90% Live Studio Showcase (Show how Reel Edits & Post Edits work with couple's photos) ----
    const labSec = h('section', 'psh-lab-sec');
    labSec.setAttribute('aria-label', 'Create with wedding photos');
    const labHead = h('div', 'psh-sec-head');
    const labEye = h('div', 'psh-eye');
    labEye.textContent = 'Interactive Studio';
    const labTitle = h('h2', 'psh-sec-title');
    labTitle.textContent = 'Your Photos, Ready for Reels & Albums';
    labHead.append(labEye, labTitle);
    labSec.appendChild(labHead);

    const labRow = h('div', 'psh-lab-row');
    const demoVids = opts.demoVideos || {};

    // 1. Reel Edits Live Showcase (Couple's own photos cutting on the beat + optional demo video)
    const reelBox = h('div', 'psh-showcase');
    const reelPhone = h('div', 'psh-phone-mock');
    if (demoVids.reel) {
      const v = h('video', 'psh-demo-vid');
      v.muted = true; v.playsInline = true; v.loop = true; v.preload = 'none';
      if (coverIds[0]) v.poster = imgUrl(coverIds[0], 600);
      v.src = demoVids.reel;
      reelPhone.appendChild(v);
    } else {
      const rImg = makeManagedImg(coverIds[0] || '', 600, 'psh-reel-liveimg', false);
      const rBadge = h('span', 'psh-mock-tag');
      rBadge.textContent = '♪ Beat-Synced Reel';
      reelPhone.append(rImg, rBadge);
      if (!reducedMotion && coverIds.length > 1) {
        let rIdx = 0;
        S.timers.push(setInterval(() => {
          if (document.hidden || !S) return;
          rIdx = (rIdx + 1) % coverIds.length;
          setManagedPhoto(rImg, coverIds[rIdx], 600);
        }, 1600));
      }
    }
    const reelCaption = h('div', 'psh-show-foot');
    const reelBtn = h('button', 'psh-icpill');
    reelBtn.type = 'button';
    reelBtn.innerHTML = svgIcon('reel');
    const reelBtnTxt = h('span');
    reelBtnTxt.textContent = 'Make a Reel Edit';
    reelBtn.appendChild(reelBtnTxt);
    reelBtn.addEventListener('click', () => runAct('reel'));
    reelCaption.appendChild(reelBtn);
    reelBox.append(reelPhone, reelCaption);

    // 2. Post Edits Live Showcase (Shows 2 live Post Edit templates with couple's own photos)
    const postBox = h('div', 'psh-showcase');
    const postPhone = h('div', 'psh-phone-mock psh-post-mock');
    if (demoVids.post) {
      const v2 = h('video', 'psh-demo-vid');
      v2.muted = true; v2.playsInline = true; v2.loop = true; v2.preload = 'none';
      if (coverIds[1] || coverIds[0]) v2.poster = imgUrl(coverIds[1] || coverIds[0], 600);
      v2.src = demoVids.post;
      postPhone.appendChild(v2);
    } else {
      // Template 1 (Editorial Arch) & Template 2 (Seamless Split Strip)
      const tplWrap = h('div', 'psh-tpl-stage');
      const tpl1 = h('div', 'psh-tpl psh-tpl-arch');
      const t1Img = makeManagedImg(coverIds[1] || coverIds[0] || '', 400, '', false);
      const t1Cap = h('small');
      t1Cap.textContent = D.names || 'The Wedding';
      tpl1.append(t1Img, t1Cap);

      const tpl2 = h('div', 'psh-tpl psh-tpl-strip');
      const t2ImgA = makeManagedImg(coverIds[2] || coverIds[0] || '', 400, '', false);
      const t2ImgB = makeManagedImg(coverIds[3] || coverIds[0] || '', 400, '', false);
      tpl2.append(t2ImgA, t2ImgB);

      tplWrap.append(tpl1, tpl2);
      const pBadge = h('span', 'psh-mock-tag');
      pBadge.textContent = '2 Album Templates';
      postPhone.append(tplWrap, pBadge);
    }
    const postCaption = h('div', 'psh-show-foot');
    const postBtn = h('button', 'psh-icpill');
    postBtn.type = 'button';
    postBtn.innerHTML = svgIcon('post');
    const postBtnTxt = h('span');
    postBtnTxt.textContent = 'Open Post Edits';
    postBtn.appendChild(postBtnTxt);
    postBtn.addEventListener('click', () => runAct('post'));
    postCaption.appendChild(postBtn);
    postBox.append(postPhone, postCaption);

    labRow.append(reelBox, postBox);
    labSec.appendChild(labRow);
    root.appendChild(labSec);

    // Play demo videos only when visible on screen
    if (window.IntersectionObserver) {
      const vids = root.querySelectorAll('video.psh-demo-vid');
      if (vids.length) {
        S.vidIo = new IntersectionObserver(entries => {
          entries.forEach(en => {
            const v = en.target;
            if (en.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
            else v.pause();
          });
        }, { threshold: 0.35 });
        vids.forEach(v => S.vidIo.observe(v));
      }
    }

    // ---- H. 90%–100% Voices (Notes), Most Loved Ribbon & Photographer Signature ----
    const notesList = (D.notes || []).slice(0, 4);
    if (notesList.length) {
      const notesSec = h('section', 'psh-notes-sec');
      const nHead = h('div', 'psh-sec-head');
      const nTitle = h('h2', 'psh-sec-title');
      nTitle.textContent = 'Voices & Blessings';
      nHead.appendChild(nTitle);
      notesSec.appendChild(nHead);

      const nStream = h('div', 'psh-notes-stream');
      notesList.forEach(n => {
        const nBtn = h('button', 'psh-note-line');
        nBtn.type = 'button';
        if (n.photoId) {
          nBtn.appendChild(makeManagedImg(n.photoId, 200, 'psh-note-thumb', false));
        }
        const qBox = h('div', 'psh-note-copy');
        const qP = h('p');
        qP.textContent = '“' + (n.text || '') + '”';
        const qWho = h('small');
        qWho.textContent = '— ' + (n.name || 'Guest');
        qBox.append(qP, qWho);
        nBtn.appendChild(qBox);
        nBtn.addEventListener('click', () => {
          if (n.photoId) runAct('photo', { event: '', id: n.photoId });
          else runAct('notes');
        });
        nStream.appendChild(nBtn);
      });
      notesSec.appendChild(nStream);
      root.appendChild(notesSec);
    }

    // Footer: Studio signature + tiny icon actions (Install / Share / Find me)
    const foot = h('footer', 'psh-foot');
    if (D.studio) {
      const stBtn = h('button', 'psh-studio-sig');
      stBtn.type = 'button';
      const stLbl = h('small');
      stLbl.textContent = 'Photographed by';
      const stName = h('strong');
      stName.textContent = D.studio;
      stBtn.append(stLbl, stName);
      stBtn.addEventListener('click', () => runAct('studio'));
      foot.appendChild(stBtn);
    }

    const footIcons = h('div', 'psh-foot-icons');
    [['findme', 'Find me'], ['upload', 'Add moment'], ['install', 'Install app'], ['share', 'Share']].forEach(([k, lbl]) => {
      const b = h('button', 'psh-icpill psh-icpill-sm');
      b.type = 'button';
      b.innerHTML = svgIcon(k);
      const sp = h('span');
      sp.textContent = lbl;
      b.appendChild(sp);
      b.addEventListener('click', () => runAct(k));
      footIcons.appendChild(b);
    });
    foot.appendChild(footIcons);
    root.appendChild(foot);

    box.innerHTML = '';
    box.appendChild(root);

    // ---- Single rAF Scroll Loop for Shrinking Cover, Glancing Stream & Varmala ----
    function updateScrollMotion() {
      if (!S) return;
      S.raf = 0;
      enforceImageBudget();
      if (S.reduced) return;

      const sy = window.scrollY || document.documentElement.scrollTop || 0;
      const vh = window.innerHeight || 800;

      // 1. Shrinking opening cover (0% -> 25% scroll)
      if (S.heroCard) {
        const p = clamp(sy / (vh * 0.65), 0, 1);
        const scale = 1 - p * 0.14;
        const radius = Math.round(p * 28);
        S.heroCard.style.transform = 'scale(' + scale.toFixed(3) + ')';
        S.heroCard.style.borderRadius = radius + 'px';
      }

      // 2. Glancing photos (subtle vertical + horizontal drift as they pass)
      if (!S.lowMem && S.glances.length) {
        for (let i = 0; i < S.glances.length; i++) {
          const g = S.glances[i];
          const r = g.el.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) continue;
          const norm = ((r.top + r.height / 2) - vh / 2) / (vh / 2); // -1 to 1
          const ty = norm * -28;
          const tx = norm * g.dir * 14;
          g.el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
        }
      }

      // 3. Varmala Convergence (portraits move toward each other & garland drops)
      if (S.vmTrack && S.vmLeft && S.vmRight) {
        const r = S.vmTrack.getBoundingClientRect();
        const total = Math.max(1, r.height - vh * 0.55);
        const prog = clamp((-r.top + vh * 0.25) / total, 0, 1);
        const sep = (1 - prog) * 42; // % separation
        const tilt = (1 - prog) * 7;
        S.vmLeft.style.transform = 'translate3d(' + (-sep).toFixed(1) + '%, 0, 0) rotate(' + (-tilt).toFixed(1) + 'deg)';
        S.vmRight.style.transform = 'translate3d(' + sep.toFixed(1) + '%, 0, 0) rotate(' + tilt.toFixed(1) + 'deg)';
        if (S.vmGarland) {
          const gProg = clamp((prog - 0.55) / 0.45, 0, 1);
          S.vmGarland.style.opacity = gProg.toFixed(2);
          S.vmGarland.style.transform = 'translate3d(-50%, ' + ((1 - gProg) * -28).toFixed(1) + 'px, 0) scale(' + (0.85 + gProg * 0.15).toFixed(2) + ')';
        }
      }
    }

    function requestTick() {
      if (!S || S.raf) return;
      S.raf = requestAnimationFrame(updateScrollMotion);
    }

    S.onScroll = requestTick;
    S.onResize = requestTick;
    window.addEventListener('scroll', S.onScroll, { passive: true });
    window.addEventListener('resize', S.onResize, { passive: true });
    requestTick();
  }

  window.PGStoryLiving = {
    render: render,
    destroy: destroy,
    styles: STYLES
  };
})();