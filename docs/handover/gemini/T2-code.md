# Gemini's code for T2 (step 81), 24 Nov 2026

Apply it with Claude's corrections in `../GEMINI-REVIEW.md` (section "T2 code"): they win.

Here is card **T2** ("At this time on the wedding day", small pop) in the exact format requested.

### Things Not Certain (Flagged Instead of Guessing)

1. **Wedding language field:** None of the code in packs 1–5 showed a language field on `GALLERY` (such as `GALLERY.lang`). `48-same-time.js` defaults to English and checks `GALLERY.lang` / `GALLERY.language` if present, using `पल देखें` for Hindi.
2. **`16-features.js` key list:** `16-features.js` hardcodes its own `KEYS` list, while `window.pgFeatureOn(k)` already returns `true` for any key unless `GALLERY.features[k]` is `'off'` or `'locked'`. To avoid editing `16-features.js` outside the card's listed files, `48-same-time.js` checks `GALLERY.features?.sameTime !== 'off' && GALLERY.features?.sameTime !== 'locked'`, and `17-control.js` adds the `At this time on the wedding day` switch (`on` by default).
3. **`tests/e2e_canvas_editor.js` setup helper:** That file is not in packs 1–5, so `tests/e2e_same_time.js` uses a self-contained Node HTTP server + Playwright on port `8902` with `window.PG_NOW`; ChatGPT can align the fixture boilerplate with `e2e_canvas_editor.js` if needed.

---

### New File: `app/gallery/48-same-time.js`

```javascript
// T2 — "At this time on the wedding day" (step 81): shows a small pop once per visit
// with 1–3 photos taken around the same time of day (±20 min) on any wedding day.
// Respects guest visibility rules and can be turned off in the Control Panel.
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
    if (isHindi()) {
      return {
        heading: 'शादी के दिन इस समय…',
        action: 'पल देखें',
        close: 'बंद करें'
      };
    }
    return {
      heading: 'Right now, on the wedding day…',
      action: 'See moment',
      close: 'Close'
    };
  }

  function nowDate() {
    if (typeof window.PG_NOW !== 'undefined') {
      const d = new Date(window.PG_NOW);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  function featureEnabled() {
    if (typeof GALLERY === 'undefined' || !GALLERY) return false;
    const st = (GALLERY.features && GALLERY.features.sameTime) || 'on';
    return st !== 'off' && st !== 'locked';
  }

  // Respect guest rules: if the wedding gates photos behind Find me, a guest who has not found themselves sees nothing.
  function guestAllowed() {
    if (typeof GALLERY === 'undefined' || !GALLERY) return false;
    if (GALLERY.isStudio) return false;
    const role = window.PGControl ? PGControl.role() : 'guest';
    const isPrivileged = role === 'couple' || role === 'photographer' || role === 'picgrades' || (typeof pgIsCouple === 'function' && pgIsCouple());
    if (isPrivileged) return true;
    if (GALLERY.gated || GALLERY.guestPhotos === 'findme') {
      const found = !!GALLERY.found || !!(window.PGRules && PGRules.found && PGRules.found()) || !!(typeof pgStore === 'function' && pgStore('found'));
      if (!found) return false;
    }
    return true;
  }

  // Collect only photos the viewer is allowed to see and that have a capture timestamp t = 'YYYY-MM-DD HH:MM'.
  function visibleTimedPhotos() {
    if (!GALLERY) return [];
    const seen = new Set();
    const out = [];
    const pools = [];
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

    pools.forEach(({ evName, list }) => {
      list.forEach(p => {
        if (!p || !p.id || seen.has(p.id) || !p.t) return;
        const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(String(p.t).trim());
        if (!m) return;
        const mins = Number(m[2]) * 60 + Number(m[3]);
        if (isNaN(mins)) return;
        seen.add(p.id);
        out.push({
          id: p.id,
          t: String(p.t).trim(),
          day: m[1],
          hh: Number(m[2]),
          mm: Number(m[3]),
          mins
        });
      });
    });
    return out;
  }

  function formatPillTime(hh, mm) {
    const d = new Date(2000, 0, 1, hh, mm, 0);
    try {
      return d.toLocaleTimeString(isHindi() ? 'hi-IN' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    } catch (e) {
      const ap = hh >= 12 ? 'pm' : 'am';
      const h12 = hh % 12 || 12;
      return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap;
    }
  }

  function findMatches(photos, clock) {
    if (!photos.length) return [];
    const curMins = clock.getHours() * 60 + clock.getMinutes();
    const scored = [];
    photos.forEach(ph => {
      const rawDiff = Math.abs(ph.mins - curMins);
      const diff = Math.min(rawDiff, 1440 - rawDiff);
      if (diff <= WINDOW_MIN) scored.push({ ph, diff });
    });
    scored.sort((a, b) => a.diff - b.diff);
    return scored.slice(0, 3).map(x => x.ph);
  }

  function removePop(markClosed) {
    clearTimeout(hideTimer);
    hideTimer = null;
    if (popEl) {
      popEl.remove();
      popEl = null;
    }
    if (markClosed) shownThisVisit = true;
  }

  function openMatchedPhotos(matches) {
    if (!matches.length) return;
    removePop(true);
    const ids = new Set(matches.map(m => m.id));
    // Prefer an existing event containing one of the matched photos so the viewer has full context.
    const ev = (GALLERY.events || []).find(e => Array.isArray(e.photos) && e.photos.some(p => ids.has(p.id)));
    if (ev) {
      const idx = Math.max(0, ev.photos.findIndex(p => ids.has(p.id)));
      if (window.pgOpenEvent) pgOpenEvent(ev.name);
      else if (typeof openCollection === 'function') openCollection(ev.name, idx);
      return;
    }
    const subset = matches.map(m => ({ id: m.id }));
    const tempName = 'At this time';
    GALLERY.personal = (GALLERY.personal || []).filter(x => x.name !== tempName).concat([{ name: tempName, photos: subset, personal: true }]);
    if (window.pgOpenEvent) pgOpenEvent(tempName, subset);
    else if (typeof openCollection === 'function') openCollection(tempName, 0);
  }

  function renderPop(matches) {
    if (shownThisVisit || popEl || !matches.length) return;
    const txt = strings();
    const wrap = document.createElement('aside');
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
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePop(true);
    });

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
      im.onerror = function () {
        this.onerror = null;
        this.src = pgImgFallback(ph.id, 300);
      };
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

    requestAnimationFrame(() => {
      if (popEl === wrap) wrap.classList.add('is-in');
    });

    hideTimer = setTimeout(() => {
      removePop(true);
    }, AUTO_HIDE_MS);
  }

  function check() {
    if (shownThisVisit || popEl) return;
    if (!featureEnabled() || !guestAllowed()) return;
    const timed = visibleTimedPhotos();
    if (!timed.length) return;
    const matches = findMatches(timed, nowDate());
    if (!matches.length) return;
    renderPop(matches);
  }

  if (typeof pgAfter === 'function') {
    pgAfter('pgRenderHub', () => setTimeout(check, 120));
    pgAfter('switchView', (v) => {
      if (v === 'gallery' || v === 'hub') setTimeout(check, 120);
    });
  }

  window.PGSameTime = {
    check,
    dismiss: () => removePop(true),
    resetVisit: () => {
      shownThisVisit = false;
      removePop(false);
    }
  };
})();

```

---

### Changes to Existing Files (`FIND/REPLACE`)

#### FILE: `app/gallery/gallery.css`

```css
FIND (copy the exact old lines, enough to be unique):
.pgte-slotw{position:relative}.pgte-slotw .pgte-frame{position:absolute;top:6px;right:6px;z-index:1}

===== END: app/gallery/gallery.css =====

```

```css
REPLACE WITH:
.pgte-slotw{position:relative}.pgte-slotw .pgte-frame{position:absolute;top:6px;right:6px;z-index:1}

/* ===== Step 81 (T2): At this time on the wedding day pop ===== */
.pgst-pop{position:fixed;right:14px;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:140;width:min(320px,calc(100vw - 28px));padding:12px 14px;border-radius:18px;background:var(--bg-box);color:var(--ink);border:1px solid var(--border-hairline);box-shadow:0 12px 32px rgba(0,0,0,.22);cursor:pointer;opacity:0;transform:translateY(10px);transition:opacity .35s ease,transform .35s ease}
.pgst-pop.is-in{opacity:1;transform:translateY(0)}
.pgst-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.pgst-title{font:600 .84rem/1.3 var(--font-sans);color:var(--ink)}
.pgst-x{flex:none;width:28px;height:28px;border-radius:14px;border:1px solid var(--border-hairline);background:var(--bg-cream);color:var(--ink);font-size:16px;line-height:1;display:inline-flex;align-items:center;justify-content:center}
.pgst-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.pgst-thumb{position:relative;display:block;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:var(--bg-cream)}
.pgst-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pgst-time{position:absolute;left:4px;bottom:4px;font-style:normal;font:600 10px/1.1 var(--font-sans);padding:2px 6px;border-radius:999px;background:rgba(18,16,14,.72);color:#fff;white-space:nowrap}
.pgst-cta{display:block;margin-top:8px;font:600 .74rem/1.2 var(--font-sans);color:var(--accent-terracotta)}
body.pgv-on .pgst-pop,body.pgm-on .pgst-pop,body.pged-on .pgst-pop,body.pgte-on .pgst-pop,body.pce-on .pgst-pop,body.pgcp-open .pgst-pop{display:none!important}
@media (min-width:900px){.pgst-pop{right:24px;bottom:24px}}
@media (prefers-reduced-motion:reduce){.pgst-pop{transition:none!important;transform:none!important}}

```

#### FILE: `app/gallery.html`

```html
FIND (copy the exact old lines, enough to be unique):
<script src="/app/gallery/46-reel-mock.js"></script>
<script src="/app/gallery/47-frame.js"></script>
</body>

```

```html
REPLACE WITH:
<script src="/app/gallery/46-reel-mock.js"></script>
<script src="/app/gallery/47-frame.js"></script>
<script src="/app/gallery/48-same-time.js"></script>
</body>

```

#### FILE: `app/gallery/17-control.js`

```javascript
FIND (copy the exact old lines, enough to be unique):
    (window.PGFeatures ? PGFeatures.list() : []).forEach(([k, name, line]) => {
      const st = (GALLERY.features || {})[k] || 'on', locked = st === 'locked';

```

```javascript
REPLACE WITH:
    const cpFeats = (window.PGFeatures ? PGFeatures.list() : []).concat([
      ['sameTime', 'At this time on the wedding day', 'Show guests 1–3 photos from around this time of day']
    ]);
    cpFeats.forEach(([k, name, line]) => {
      const st = (GALLERY.features || {})[k] || 'on', locked = st === 'locked';

```

---

### New Browser Test: `tests/e2e_same_time.js` (Port `8902`)

```javascript
// Browser test for card T2 ("At this time on the wedding day") on port 8902.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8902;
const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const FAKE_GALLERY = {
  galleryId: 'test8902',
  title: 'Aanya & Kabir',
  eventDate: '2026-11-20',
  studio: 'Studio Test',
  status: 'Published',
  faceSearch: true,
  guestPhotos: 'open',
  features: { sameTime: 'on' },
  root: [],
  events: [
    {
      name: 'Haldi',
      photos: [
        { id: 'p1', name: '1.jpg', t: '2026-11-20 10:30' },
        { id: 'p2', name: '2.jpg', t: '2026-11-20 10:45' },
        { id: 'p3', name: '3.jpg', t: '2026-11-20 16:00' }
      ]
    }
  ]
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/api') {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
          let body = {};
          try { body = JSON.parse(raw || '{}'); } catch (e) {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (body.action === 'getGallery') {
            res.end(JSON.stringify({ ok: true, gallery: Object.assign({}, FAKE_GALLERY) }));
          } else if (body.action === 'coupleFeatures') {
            res.end(JSON.stringify({ ok: true, features: Object.assign({ sameTime: 'on' }, JSON.parse(body.features || '{}')) }));
          } else {
            res.end(JSON.stringify({ ok: true }));
          }
        });
        return;
      }
      const rel = urlPath === '/app/gallery.html' || /^\/g\/[^/]+/.test(urlPath)
        ? '/app/gallery.html'
        : urlPath;
      const full = path.join(ROOT, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        const ext = path.extname(full);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(full).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const pageErrors = [];
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith('http://127.0.0.1:' + PORT) || u.startsWith('data:') || u.startsWith('blob:')) {
        return route.continue();
      }
      if (/lh3\.googleusercontent\.com|drive\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u)) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') });
      }
      return route.continue();
    });

    await page.addInitScript(() => {
      window.PG_CONFIG = { apiUrl: '/api' };
      window.PG_NOW = '2026-11-24T10:35:00';
    });

    await page.goto('http://127.0.0.1:' + PORT + '/g/test8902', { waitUntil: 'networkidle' });
    await page.waitForSelector('.pgst-pop');
    const popCount = await page.locator('.pgst-pop').count();
    if (popCount !== 1) throw new Error('Expected pop on matching time');

    // Reset visit and set clock to a time with no photos within ±20 min.
    await page.evaluate(() => {
      window.PG_NOW = '2026-11-24T22:15:00';
      window.PGSameTime.resetVisit();
      window.PGSameTime.check();
    });
    const noMatchCount = await page.locator('.pgst-pop').count();
    if (noMatchCount !== 0) throw new Error('Expected no pop when no photo matches');

    // Switch off in Control Panel.
    await page.evaluate(() => {
      window.PG_NOW = '2026-11-24T10:35:00';
      GALLERY.features.sameTime = 'off';
      window.PGSameTime.resetVisit();
      window.PGSameTime.check();
    });
    const offCount = await page.locator('.pgst-pop').count();
    if (offCount !== 0) throw new Error('Expected pop hidden when turned off');

    console.log('page errors:', JSON.stringify(pageErrors));
    if (pageErrors.length) process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
})();

```