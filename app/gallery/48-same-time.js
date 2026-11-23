// T2 (step 81): show guests a small set of photos taken around this time of day.
// It appears once per visit, closes after 10 seconds, and follows the wedding's photo visibility rules.
(function pgSameTime() {
  const WINDOW_MIN = 20;
  const AUTO_HIDE_MS = 10000;
  let shownThisVisit = false;
  let hideTimer = null;
  let popEl = null;

  function isHindi() {
    const lang = String((typeof GALLERY !== 'undefined' && GALLERY && (GALLERY.lang || GALLERY.language)) || '').toLowerCase();
    return lang === 'hi' || lang.indexOf('hi-') === 0 || lang === 'hindi';
  }

  function strings() {
    return isHindi()
      ? { heading: 'शादी के दिन इस समय…', action: 'पल देखें', close: 'बंद करें' }
      : { heading: 'Right now, on the wedding day…', action: 'See moment', close: 'Close' };
  }

  function nowDate() {
    if (typeof window.PG_NOW !== 'undefined') {
      const d = new Date(window.PG_NOW);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  function featureEnabled() {
    return window.pgFeatureOn ? pgFeatureOn('sameTime') : true;
  }

  // A guest behind Find me sees nothing until the app says they have been found.
  function guestAllowed() {
    if (typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return false;
    const role = window.PGControl ? PGControl.role() : 'guest';
    const privileged = role === 'couple' || role === 'photographer' || role === 'picgrades' ||
      (typeof pgIsCouple === 'function' && pgIsCouple());
    if (privileged) return true;
    if (GALLERY.gated && !GALLERY.found) return false;
    return true;
  }

  // Collect unique photos with a real capture time. T1 will add these timestamps to live gallery data.
  function visibleTimedPhotos() {
    if (typeof GALLERY === 'undefined' || !GALLERY) return [];
    const seen = new Set(), out = [], pools = [];
    if (Array.isArray(GALLERY.events)) {
      GALLERY.events.forEach(ev => {
        if (ev && !ev.teaserOnly && Array.isArray(ev.photos)) pools.push({ evName: ev.name || '', list: ev.photos });
      });
    }
    if (Array.isArray(GALLERY.pool)) pools.push({ evName: '', list: GALLERY.pool });
    if (Array.isArray(GALLERY.root)) pools.push({ evName: 'Root Moment', list: GALLERY.root });
    if (Array.isArray(GALLERY.personal)) {
      GALLERY.personal.forEach(ev => {
        if (ev && Array.isArray(ev.photos)) pools.push({ evName: ev.name || '', list: ev.photos });
      });
    }
    pools.forEach(({ evName, list }) => list.forEach(p => {
      if (!p || !p.id || seen.has(p.id) || !p.t) return;
      const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(String(p.t).trim());
      if (!m) return;
      const hh = Number(m[2]), mm = Number(m[3]), mins = hh * 60 + mm;
      if (hh > 23 || mm > 59) return;
      seen.add(p.id);
      out.push({ id: p.id, day: m[1], hh, mm, mins, evName });
    }));
    return out;
  }

  function formatPillTime(hh, mm) {
    const d = new Date(2000, 0, 1, hh, mm, 0);
    try {
      return d.toLocaleTimeString(isHindi() ? 'hi-IN' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    } catch (e) {
      return (hh % 12 || 12) + ':' + String(mm).padStart(2, '0') + (hh >= 12 ? ' pm' : ' am');
    }
  }

  function findMatches(photos, clock) {
    const curMins = clock.getHours() * 60 + clock.getMinutes();
    return photos.map(ph => {
      const raw = Math.abs(ph.mins - curMins);
      return { ph, diff: Math.min(raw, 1440 - raw) };
    }).filter(x => x.diff <= WINDOW_MIN).sort((a, b) => a.diff - b.diff).slice(0, 3).map(x => x.ph);
  }

  function removePop(markClosed) {
    clearTimeout(hideTimer);
    hideTimer = null;
    if (popEl) { popEl.remove(); popEl = null; }
    if (markClosed) shownThisVisit = true;
  }

  function openMatchedPhotos(matches) {
    if (!matches.length) return;
    removePop(true);
    const photos = matches.map(m => ({ id: m.id }));
    const name = matches[0].evName || 'Right now';
    if (window.pgOpenEvent) pgOpenEvent(name, photos);
    else if (typeof openCollection === 'function') openCollection(name, 0);
  }

  function renderPop(matches) {
    if (shownThisVisit || popEl || !matches.length) return;
    const txt = strings(), wrap = document.createElement('aside');
    wrap.className = 'pgst-pop';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', txt.heading);

    const top = document.createElement('div');
    top.className = 'pgst-top';
    const title = document.createElement('b');
    title.className = 'pgst-title';
    title.textContent = txt.heading;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pgst-x';
    closeBtn.setAttribute('aria-label', txt.close);
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', e => { e.stopPropagation(); removePop(true); });
    top.append(title, closeBtn);

    const strip = document.createElement('div');
    strip.className = 'pgst-photos';
    matches.forEach(ph => {
      const frame = document.createElement('span');
      frame.className = 'pgst-thumb';
      const im = document.createElement('img');
      im.alt = '';
      im.loading = 'eager';
      im.src = pgImg(ph.id, 300);
      im.onerror = function () { this.onerror = null; this.src = pgImgFallback(ph.id, 300); };
      const pill = document.createElement('em');
      pill.className = 'pgst-time';
      pill.textContent = formatPillTime(ph.hh, ph.mm);
      frame.append(im, pill);
      strip.appendChild(frame);
    });
    const cta = document.createElement('span');
    cta.className = 'pgst-cta';
    cta.textContent = txt.action + ' →';
    wrap.append(top, strip, cta);
    wrap.addEventListener('click', () => openMatchedPhotos(matches));
    document.body.appendChild(wrap);
    popEl = wrap;
    shownThisVisit = true;
    requestAnimationFrame(() => { if (popEl === wrap) wrap.classList.add('is-in'); });
    hideTimer = setTimeout(() => removePop(true), AUTO_HIDE_MS);
  }

  function check() {
    if (shownThisVisit || popEl || !featureEnabled() || !guestAllowed()) return;
    const timed = visibleTimedPhotos();
    if (!timed.length) return;
    const matches = findMatches(timed, nowDate());
    if (matches.length) renderPop(matches);
  }

  if (typeof pgAfter === 'function') {
    pgAfter('pgRenderHub', () => setTimeout(check, 120));
    pgAfter('switchView', v => { if (v === 'gallery' || v === 'hub') setTimeout(check, 120); });
  }

  window.PGSameTime = {
    check,
    dismiss: () => removePop(true),
    resetVisit: () => { shownThisVisit = false; removePop(false); }
  };
})();
