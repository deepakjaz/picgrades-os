// Free-canvas Hub layouts (step 77, phase 1): one layout format for every Hub design, drawn on a phone and on a laptop.
// A layout is a list of sections; inside a section every element sits exactly where it was placed — its own spot on a phone
// (a 390-wide design) and on a laptop (a 1200-wide design). No laptop spot yet = made from the phone spot automatically.
// Elements are the app's own things: photo, names, date, text, events, photo strip, buttons (Find me, Reel, Post, Add a moment,
// Root Moment, Notes), blessings, photographer credit, shapes. Photos come from the wedding (cover, highlights, an event, one photo).
// Phase 2 adds the editor (drag, resize, rotate, layers, styles), phase 3 more motion; this file only draws.
//
// Layout format (version 1) — also cleaned by Code.gs canvasDoc_():
// { v: 1, name, colors: { bg, ink, acc, acc2, card }, fonts: { head, body },
//   sections: [ { id, h: { p: 844, l: 760 }, bg: { c: '#fff', src: {…photo} , dim: 0.3 }, els: [
//     { id, t: 'photo'|'names'|'date'|'text'|'events'|'strip'|'action'|'blessings'|'credit'|'shape'|'card' (one of the app's own Hub cards: block, variant, set),
//       p: { x, y, w, h, r, z, hide }, l: { … } | null,                       // phone / laptop spot (design units)
//       s: { font, size, weight, italic, color, bg, align, ls, lh, radius, border, bcolor, shadow, opacity, fx, fy, upper, shape: 'arch'|'circle', pad },
//       sl: { …the laptop's own style changes }, per: { p, l } (event cards showing at once),
//       m: motion — comes in once: fade|rise|drop|left|right|grow|blur|wipe|iris|unfold|shine
//                    (step 97) + spin|flip-x|flip-y|turn|bounce|zoom-out|glide|arc|reveal|shutters
//          keeps moving: zoom|float (step 97) + pulse|swing|wobble|spin-slow|breathe
//          follows the scroll (step 97): fade-on-scroll|grow-on-scroll
//       mo: { d: delay ms, t: speed ms, p: scroll depth -0.6…0.6, str: strength 0–100 (50 = normal), dir: 'bottom'|'top'|'left'|'right' (bounce, glide, arc) },
//       section.stay: how long it holds still while scrolling; section.grid: { r, c, g } rows, columns, gap for the editor's Simple mode
//     t: 'art' (step 97) — a ready-made picture from the elements library: src: { k: 'art', id: 'bs-teddy-brown', o: 'babyshower' }
//     t: 'video' (step 97b) — a YouTube video or Short, or a Google Drive video: src: { k: 'yt', id, sh: 1 for a Short } | { k: 'drive', id };
//        v: 'loop' (plays by itself, muted, again and again — like the TKG TV) | 'player' (tap to play, with sound). Drive's own player always needs a tap.
//       text, src: { k: 'cover'|'hl'|'ev'|'id'|'auto', n, i, id }, act: 'findme'|'reel'|'post'|'memory'|'moments'|'notes', v: variant } ] } ] }
(function pgCanvas() {
  'use strict';
  const PW = 390, LW = 1200, LAPTOP_AT = 700, AUTO = 1.2;   // design widths; screens ≥ 700 px use the laptop spots
  const FONTS = ['Cormorant Garamond', 'Pinyon Script', 'Marcellus', 'Jost', 'Instrument Serif', 'Parisienne', 'Bodoni Moda', 'Playfair Display', 'Great Vibes', 'Montserrat'];
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Great+Vibes&family=Instrument+Serif:ital@0;1&family=Jost:wght@300;400;500;600;700&family=Marcellus&family=Montserrat:wght@400;500;600;700&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap';
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
  const ICON = { findme: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>', reel: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8.5v7l6-3.5z"/></svg>',
    post: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5-9 10"/></svg>', memory: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    moments: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>', notes: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>' };
  const LABEL = { findme: 'Find me', reel: 'Make a reel', post: 'Make a post', memory: 'Add a moment', moments: 'Root Moment', notes: 'Leave a blessing' };
  // motion (step 78): one per element. Comes in once (when it scrolls into view) or keeps moving gently; plus a delay, a speed and a scroll depth
  const ENTER = ['fade', 'rise', 'drop', 'left', 'right', 'grow', 'blur', 'wipe', 'iris', 'unfold', 'shine',
    'spin', 'flip-x', 'flip-y', 'turn', 'bounce', 'zoom-out', 'glide', 'arc', 'reveal', 'shutters'];   // step 97: the motion library (transform and opacity only)
  const LOOP = ['zoom', 'float', 'pulse', 'swing', 'wobble', 'spin-slow', 'breathe'], SCROLLM = ['fade-on-scroll', 'grow-on-scroll'];
  const DIRS = { bottom: [0, 1], top: [0, -1], left: [-1, 0], right: [1, 0] };   // where bounce / glide / arc come in from
  // step 97b: videos play in YouTube's or Google Drive's own player (no PicGrades relay). The page shows a poster until the video is on screen.
  const vidOk = src => !!src && ((src.k === 'yt' && /^[A-Za-z0-9_-]{6,20}$/.test(src.id || '')) || (src.k === 'drive' && /^[A-Za-z0-9_-]{20,80}$/.test(src.id || '')));
  const vidPoster = src => src.k === 'yt' ? 'https://i.ytimg.com/vi/' + src.id + '/hqdefault.jpg' : 'https://drive.google.com/thumbnail?id=' + src.id + '&sz=w800';
  function vidFrame(src, loop) {
    const u = src.k === 'yt' ? 'https://www.youtube-nocookie.com/embed/' + src.id + '?playsinline=1&rel=0&modestbranding=1' + (loop ? '&autoplay=1&mute=1&loop=1&controls=0&playlist=' + src.id : '&autoplay=1&controls=1')
      : 'https://drive.google.com/file/d/' + src.id + '/preview';
    return '<iframe src="' + u + '" title="Video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }
  const artUrl = (src) => { const id = String((src && src.id) || ''), o = String((src && src.o) || ''); return /^[a-z0-9-]{1,40}$/.test(id) && /^[a-z0-9-]{1,30}$/.test(o) ? '/app/elements/' + o + '/' + id + '.webp' : ''; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const col = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? v : d);

  function ensure() {
    if (!document.getElementById('pgcFonts')) { const l = document.createElement('link'); l.id = 'pgcFonts'; l.rel = 'stylesheet'; l.href = FONT_URL; document.head.appendChild(l); }
    if (document.getElementById('pgcCss')) return;
    const s = document.createElement('style'); s.id = 'pgcCss'; s.textContent = CSS; document.head.appendChild(s);
  }
  const CSS = `
.pgc{position:relative;width:100%;background:var(--c-bg);color:var(--c-ink);overflow-x:clip;-webkit-tap-highlight-color:transparent}
.pgc-sec{position:relative;width:100%}
.pgc-stick>.pgc-bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pgc-stick>.pgc-dim{position:absolute;inset:0;pointer-events:none}
.pgc-in{position:absolute;top:0;bottom:0}
.pgc-el{position:absolute;box-sizing:border-box;transform-origin:50% 50%}
.pgc-el>.pgc-body{position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box}
.pgc-ph img{width:100%;height:100%;object-fit:cover;display:block}
.pgc-txt{display:flex;flex-direction:column;justify-content:center;overflow:visible!important;white-space:pre-line;word-break:break-word}
.pgc-ev{display:flex;gap:4%;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.pgc-ev::-webkit-scrollbar{display:none}
.pgc-ev>button{flex:none;scroll-snap-align:start;border:0;padding:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px}
.pgc-ev.row>button{width:44%;height:100%}.pgc-ev.row i{flex:1;min-height:0;border-radius:inherit;background:#0002 center/cover;display:block}
.pgc-ev.circles>button{width:28%;align-items:center;text-align:center}.pgc-ev.circles i{width:100%;aspect-ratio:1;border-radius:50%;background:#0002 center/cover;display:block}
.pgc-ev.list{flex-direction:column;gap:0;overflow-y:auto;overflow-x:hidden}.pgc-ev.list>button{width:100%;flex-direction:row;align-items:center;justify-content:space-between;padding:.55em 0;border-bottom:1px solid currentColor;border-bottom-color:color-mix(in srgb,currentColor 25%,transparent)}
.pgc-ev.list i{display:none}.pgc-ev.list>button:after{content:'→';opacity:.6}
.pgc-ev b{font-weight:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgc-strip{display:flex;height:100%;width:max-content;gap:var(--gap,8px);animation:pgc-marquee var(--dur,40s) linear infinite}
.pgc-strip img{height:100%;aspect-ratio:3/4;object-fit:cover;border-radius:inherit;display:block}
@keyframes pgc-marquee{to{transform:translateX(-50%)}}
.pgc-act{width:100%;height:100%;border:0;display:flex;align-items:center;justify-content:center;gap:.5em;cursor:pointer;font:inherit;color:inherit;background:transparent}
.pgc-act svg{width:1.25em;height:1.25em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.pgc-act.circle span{display:none}
.pgc-bl{display:flex;flex-direction:column;justify-content:center;gap:.6em}.pgc-bl q{quotes:'“' '”'}.pgc-bl small{opacity:.75;font-size:.72em;letter-spacing:.06em}
.pgc-stick{position:relative;width:100%;overflow:hidden}
.pgc-sec.stay>.pgc-stick{position:sticky;top:0}
.pgc-e,.pgc-e>.pgc-body{transition-property:opacity,translate,scale,filter,clip-path,transform;transition-duration:var(--t,900ms);transition-delay:var(--d,0ms);transition-timing-function:cubic-bezier(.2,.8,.2,1)}
.pgc-m-fade{opacity:0}.pgc-m-rise{opacity:0;translate:0 40px}.pgc-m-drop{opacity:0;translate:0 -40px}.pgc-m-left{opacity:0;translate:-60px 0}.pgc-m-right{opacity:0;translate:60px 0}
.pgc-m-grow{opacity:0;scale:.86}.pgc-m-blur{opacity:0;filter:blur(14px)}/* step 93: wipe / iris / unfold clip the part's inside, not the part itself — a fully clipped part never counted as "on screen", so it never appeared (and its photo never loaded) */
.pgc-m-wipe>.pgc-body{clip-path:inset(0 100% 0 0)}.pgc-m-iris>.pgc-body{clip-path:circle(0% at 50% 50%)}.pgc-m-unfold>.pgc-body{clip-path:inset(50% 0 50% 0)}
.pgc-e.in{opacity:1;translate:0 0;scale:1;filter:none;transform:none}.pgc-e.in>.pgc-body{clip-path:inset(0 0 0 0)}.pgc-m-iris.in>.pgc-body{clip-path:circle(150% at 50% 50%)}
.pgc-m-shine>.pgc-body::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);transform:translateX(-130%)}
.pgc-m-shine.in>.pgc-body::after{animation:pgc-shine var(--t,1400ms) var(--d,0ms) ease-out 1 forwards}@keyframes pgc-shine{to{transform:translateX(130%)}}
.pgc-stg .pgc-ev>button{opacity:0;translate:0 24px;transition:opacity var(--t,700ms) ease,translate var(--t,700ms) cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--d,0ms) + var(--i,0) * 140ms)}
.pgc-stg.in .pgc-ev>button{opacity:1;translate:0 0}
.pgc-m-zoom img{animation:pgc-kb 14s ease-in-out infinite alternate}@keyframes pgc-kb{to{transform:scale(1.12)}}
.pgc-m-float{animation:pgc-float 5s ease-in-out infinite}@keyframes pgc-float{50%{translate:0 -8px}}
/* step 97: the motion library. Strength (--str, 1 = normal) and direction (--mx, --my) come from the part's settings. Only transform and opacity move. */
.pgc-m-spin{opacity:0;transform:rotate(calc(-180deg * var(--str,1))) scale(.85)}
.pgc-m-flip-x{opacity:0;transform:perspective(700px) rotateX(calc(75deg * var(--str,1)))}
.pgc-m-flip-y{opacity:0;transform:perspective(700px) rotateY(calc(75deg * var(--str,1)))}
.pgc-m-turn{opacity:0;transform:rotate(calc(24deg * var(--str,1))) scale(.92)}
.pgc-m-bounce{opacity:0;transform:translate(calc(var(--mx,0) * 40px * var(--str,1)),calc(var(--my,1) * 40px * var(--str,1)))}
.pgc-e.pgc-m-bounce{transition-timing-function:cubic-bezier(.34,1.56,.64,1)}
.pgc-m-zoom-out{opacity:0;transform:scale(calc(1 + .2 * var(--str,1)))}
.pgc-m-glide{opacity:0;transform:translate(calc(var(--mx,-1) * 70px * var(--str,1)),calc(var(--my,0) * 70px * var(--str,1)))}
.pgc-e.pgc-m-glide{transition-timing-function:cubic-bezier(.16,1,.3,1)}
.pgc-m-arc{opacity:0;transform:translate(calc(var(--mx,0) * 36px * var(--str,1)),calc(var(--my,1) * 36px * var(--str,1))) rotate(calc(-10deg * var(--str,1)))}
.pgc-m-reveal{opacity:0;transform:translateY(calc(16px * var(--str,1))) scale(.97)}
.pgc-m-shutters{opacity:0;transform:scaleY(.08);transform-origin:50% 0}
.pgc-m-pulse{animation:pgc-pulse 2.4s ease-in-out infinite}@keyframes pgc-pulse{50%{transform:scale(calc(1 + .05 * var(--str,1)))}}
.pgc-m-swing{transform-origin:50% 0;animation:pgc-swing 3s ease-in-out infinite}@keyframes pgc-swing{0%,100%{transform:rotate(calc(-4deg * var(--str,1)))}50%{transform:rotate(calc(4deg * var(--str,1)))}}
.pgc-m-wobble{animation:pgc-wobble 2.6s ease-in-out infinite}@keyframes pgc-wobble{0%,100%{transform:none}25%{transform:translateX(calc(-4px * var(--str,1))) rotate(calc(-1.5deg * var(--str,1)))}75%{transform:translateX(calc(4px * var(--str,1))) rotate(calc(1.5deg * var(--str,1)))}}
.pgc-m-spin-slow{animation:pgc-spin 14s linear infinite}@keyframes pgc-spin{to{transform:rotate(360deg)}}
.pgc-m-breathe{animation:pgc-breathe 4s ease-in-out infinite}@keyframes pgc-breathe{0%,100%{transform:scale(calc(1 - .03 * var(--str,1)));opacity:.92}50%{transform:scale(calc(1 + .03 * var(--str,1)));opacity:1}}
.pgc-art img{width:100%;height:100%;object-fit:contain;display:block}
.pgc-vid{background:#000}.pgc-vid>img{width:100%;height:100%;object-fit:cover;display:block}
.pgc-vid iframe{position:absolute;border:0;left:50%;top:50%;translate:-50% -50%;width:100%;height:100%}
.pgc-vid.loop iframe{pointer-events:none}
.pgc-vid .pgc-vplay{position:absolute;left:50%;top:50%;translate:-50% -50%;width:56px;height:56px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:grid;place-items:center;cursor:pointer}
.pgc-vid .pgc-vplay svg{width:24px;height:24px;fill:currentColor;margin-left:3px}
.pgc-vid .pgc-vnone{position:absolute;inset:0;display:grid;place-items:center;padding:10px;text-align:center;color:#fff;font:600 13px var(--font-sans,system-ui);background:repeating-linear-gradient(45deg,#2a2623 0 12px,#332e2a 12px 24px)}
html.pg-lite .pgc-m-zoom img,html.pg-lite .pgc-m-float,html.pg-lite .pgc-m-pulse,html.pg-lite .pgc-m-swing,html.pg-lite .pgc-m-wobble,html.pg-lite .pgc-m-spin-slow,html.pg-lite .pgc-m-breathe,html.pg-lite .pgc-strip{animation:none!important}
.pgc .pgc-cardhost.pgl-grid{display:block;padding:0;margin:0;max-width:none;grid-template-columns:none;gap:0;--u:86px;overflow:visible}
.pgc .pgc-cardhost>.pgl-b{width:100%;height:100%}
.pgc-staynote{display:grid;place-items:center;font:600 12px var(--font-sans,system-ui);color:#3d8bff;background:repeating-linear-gradient(45deg,rgba(61,139,255,.07) 0 10px,transparent 10px 20px);border-top:1px dashed rgba(61,139,255,.5)}
.pgc-cardnone{width:100%;height:100%;display:grid;place-items:center;border:1.5px dashed rgba(127,127,127,.5);border-radius:14px;font:600 12px var(--font-sans,system-ui);opacity:.7;text-align:center;padding:6px}
.pgc-still *,.pgc-still{animation:none!important;transition:none!important}.pgc-still .pgc-e,.pgc-still .pgc-stg .pgc-ev>button{opacity:1;translate:0 0;scale:1;filter:none;clip-path:none;transform:none}
@media (prefers-reduced-motion:reduce){.pgc *{animation:none!important;transition:none!important}.pgc .pgc-e,.pgc .pgc-stg .pgc-ev>button{opacity:1;translate:0 0;scale:1;filter:none;clip-path:none;transform:none}}`;

  // ---- photos: the element's own choice, else cover → couple → highlights → event highlights → event photos ----
  function photos(data) {
    const seen = {}, pool = [], add = id => { if (id && !seen[id]) { seen[id] = 1; pool.push(id); } };
    const evs = data.events || [], hlOnly = !!data.demo && evs.some(e => (e.featured || []).length);
    (data.cover || []).forEach(add); if (data.couple) { add(data.couple.bride); add(data.couple.groom); }
    (data.pool || []).forEach(add); evs.forEach(e => (e.featured || []).slice(0, hlOnly ? 40 : 6).forEach(add));
    if (!hlOnly) for (let k = 0; k < 8; k++) evs.forEach(e => { const p = (e.photos || [])[k] || (e.teaser || [])[k]; if (p) add(p.id || p); });
    let next = 0;
    const evPhoto = (i, n) => { const e = evs[i]; if (!e) return ''; const f = e.featured || [], ph = hlOnly ? [] : (e.photos || e.teaser || []).map(p => p.id || p); const all = f.concat(ph.filter(x => f.indexOf(x) < 0)); return all.length ? all[(n || 0) % all.length] : ''; };
    return {
      pool, evPhoto,
      of(src) {
        src = src || {}; const n = num(src.n, 0);
        if (src.k === 'id' && src.id) return src.id;
        if (src.k === 'cover' && (data.cover || []).length) return data.cover[n % data.cover.length];
        if (src.k === 'hl' && (data.pool || []).length) return data.pool[n % data.pool.length];
        if (src.k === 'ev') { const id = evPhoto(num(src.i, 0), n); if (id) return id; }
        return pool.length ? pool[next++ % pool.length] : '';
      }
    };
  }
  const url = (id, w) => (id ? (window.pgImg ? pgImg(id, w) : 'https://lh3.googleusercontent.com/d/' + id + '=w' + w) : BLANK);

  // ---- where an element sits on this screen ----
  function spotOf(el, mode) {
    const p = el.p || {};
    if (mode === 'p') return p;
    if (el.l) return el.l;
    return { x: (LW - PW * AUTO) / 2 + num(p.x, 0) * AUTO, y: num(p.y, 0) * AUTO, w: num(p.w, 100) * AUTO, h: num(p.h, 40) * AUTO, r: p.r, z: p.z, hide: p.hide };
  }
  const secH = (s, mode) => { const h = s.h || {}; return mode === 'p' ? num(h.p, 600) : num(h.l, num(h.p, 600) * AUTO); };

  function styleOf(s, k, doc, sp) {
    s = s || {}; const out = [];
    const font = FONTS.indexOf(s.font) > -1 ? s.font : null;
    if (font) out.push("font-family:'" + font + "',serif");
    if (s.size) out.push('font-size:' + (num(s.size, 16) * k).toFixed(2) + 'px');
    if (s.weight) out.push('font-weight:' + num(s.weight, 400));
    if (s.italic) out.push('font-style:italic');
    if (s.upper) out.push('text-transform:uppercase');
    if (s.color) out.push('color:' + col(s.color, 'inherit'));
    if (s.bg) out.push('background:' + col(s.bg, 'transparent'));
    if (s.align) out.push('text-align:' + (['left', 'center', 'right'].indexOf(s.align) > -1 ? s.align : 'left') + ';align-items:' + ({ left: 'flex-start', center: 'center', right: 'flex-end' })[s.align]);
    if (s.ls != null) out.push('letter-spacing:' + num(s.ls, 0) + 'em');
    if (s.lh) out.push('line-height:' + num(s.lh, 1.3));
    if (s.shape === 'arch' && sp) out.push('border-radius:50% 50% ' + (num(s.radius, 6) * k).toFixed(1) + 'px ' + (num(s.radius, 6) * k).toFixed(1) + 'px / ' + Math.min(50, num(sp.w, 100) / 2 / num(sp.h, 100) * 100).toFixed(1) + '% ' + Math.min(50, num(sp.w, 100) / 2 / num(sp.h, 100) * 100).toFixed(1) + '% ' + (num(s.radius, 6) * k).toFixed(1) + 'px ' + (num(s.radius, 6) * k).toFixed(1) + 'px');
    else if (s.shape === 'circle') out.push('border-radius:50%');
    else if (s.radius) out.push('border-radius:' + (num(s.radius, 0) * k).toFixed(1) + 'px');
    if (s.border) out.push('border:' + Math.max(1, num(s.border, 1) * k).toFixed(1) + 'px solid ' + col(s.bcolor, 'currentColor'));
    if (s.shadow) out.push('box-shadow:0 ' + (10 * k).toFixed(1) + 'px ' + (30 * k).toFixed(1) + 'px rgba(0,0,0,' + Math.min(.6, .12 * num(s.shadow, 1)) + ')');
    if (s.opacity != null) out.push('opacity:' + Math.max(0, Math.min(1, num(s.opacity, 1))));
    if (s.pad) out.push('padding:' + (num(s.pad, 0) * k).toFixed(1) + 'px');
    return out.join(';');
  }

  // ---- what each kind of element shows ----
  function body(el, k, doc, data, P, ctx, sp) {
    const s = ctx.mode === 'l' && el.sl ? Object.assign({}, el.s, el.sl) : el.s || {}, t = el.t, st = styleOf(s, k, doc, sp);   // sl: the laptop's own style changes
    const zm = Math.max(1, Math.min(4, num(s.zm, 1)));   // step 79: how close the photo sits in its frame (1 = fills it)
    const imgPos = 'object-position:' + num(s.fx, 50) + '% ' + num(s.fy, 30) + '%' + (zm > 1 ? ';scale:' + zm + ';transform-origin:' + num(s.fx, 50) + '% ' + num(s.fy, 30) + '%' : '');   // default keeps faces (top third) in frame
    if (t === 'photo') { const id = P.of(el.src); ctx.used.push(id); return '<div class="pgc-body pgc-ph" style="' + st + '"><img alt="" loading="lazy" decoding="async" draggable="false" src="' + url(id, el.p && el.p.w > 250 ? 1400 : 800) + '" style="' + imgPos + '" data-photo="' + esc(id) + '"></div>'; }
    if (t === 'names') return '<div class="pgc-body pgc-txt" style="' + st + '">' + esc(el.text || data.names || '') + '</div>';
    if (t === 'date') return '<div class="pgc-body pgc-txt" style="' + st + '">' + esc(el.text || [data.date, data.place].filter(Boolean).join(' · ')) + '</div>';
    if (t === 'text') return '<div class="pgc-body pgc-txt" style="' + st + '">' + esc(el.text || '') + '</div>';
    if (t === 'credit') { const stu = data.studio && data.studio !== 'Your photographer' && !(window.GALLERY && GALLERY.credit === false) ? data.studio : ''; return stu ? '<div class="pgc-body pgc-txt" style="' + st + '">' + esc((el.text || 'Photographed by') + ' ' + stu) + '</div>' : null; }
    if (t === 'shape') return '<div class="pgc-body" style="' + (st || 'background:currentColor') + '"></div>';
    if (t === 'video') {   // step 97b: poster first; the player comes in when it is on screen (or on a tap)
      if (!vidOk(el.src)) return ctx.editing ? '<div class="pgc-body pgc-vid" style="' + st + '"><div class="pgc-vnone">Video · paste a YouTube or Drive link</div></div>' : null;
      const loop = el.v !== 'player' && el.src.k === 'yt', box = sp ? (num(sp.w, 100) / num(sp.h, 56)) : 16 / 9, vr = el.src.sh ? 9 / 16 : 16 / 9;
      const cover = loop ? (box > vr ? 'width:100%;height:' + (box / vr * 100).toFixed(1) + '%' : 'height:100%;width:' + (vr / box * 100).toFixed(1) + '%') : '';   // a looping video fills its box (like a photo); a player shows all of it
      return '<div class="pgc-body pgc-vid' + (loop ? ' loop' : '') + '" style="' + st + '" data-vid="' + esc(el.src.k + ':' + el.src.id) + '" data-loop="' + (loop ? 1 : 0) + '" data-fit="' + cover + '"><img alt="" loading="lazy" draggable="false" src="' + vidPoster(el.src) + '">' + (loop ? '' : '<button type="button" class="pgc-vplay" aria-label="Play the video"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>') + '</div>';
    }
    if (t === 'art') { const u = artUrl(el.src); return u ? '<div class="pgc-body pgc-art" style="' + st + '"><img alt="" loading="lazy" decoding="async" draggable="false" src="' + u + '"></div>' : null; }   // step 97: a picture from the elements library
    if (t === 'card') { ctx.cards.push({ el, i: ctx.cards.length }); return '<div class="pgc-body pgl-grid pgc-cardhost" data-card="' + (ctx.cards.length - 1) + '" style="' + st + '"></div>'; }   // step 77d: one of the app's own Hub cards
    if (t === 'events') {
      const v = ['row', 'circles', 'list'].indexOf(el.v) > -1 ? el.v : 'row', r = s.radius ? (num(s.radius, 0) * k).toFixed(1) + 'px' : '0';
      const pv = el.per && typeof el.per === 'object' ? el.per[ctx.mode] : el.per, per = Math.max(1, Math.min(8, num(pv, ctx.mode === 'l' ? (v === 'circles' ? 6 : 3.5) : (v === 'circles' ? 3.3 : 2.2)))), wd = v === 'list' ? '' : 'width:' + ((100 - 4 * (Math.ceil(per) - 1)) / per).toFixed(2) + '%;';   // how many cards show at once
      return '<div class="pgc-body" style="' + st.replace(/border-radius:[^;]*;?/, '') + '"><div class="pgc-ev ' + v + '">' + (data.events || []).map((e, i) => { const id = P.evPhoto(i, 0); ctx.used.push(id);
        return '<button type="button" data-ev="' + i + '" style="' + wd + '"><i style="background-image:url(\'' + url(id, 600) + '\');border-radius:' + (v === 'circles' ? '50%' : r) + '"></i><b>' + esc(e.name) + '</b></button>'; }).join('') + '</div></div>';
    }
    if (t === 'strip') {
      const ids = (el.src && el.src.k === 'ev' ? (data.events[num(el.src.i, 0)] || {}).featured || [] : []).concat(P.pool).slice(0, 14);
      ids.forEach(id => ctx.used.push(id));
      const imgs = ids.map(id => '<img alt="" loading="lazy" src="' + url(id, 500) + '" style="' + imgPos + '">').join('');
      return '<div class="pgc-body" style="' + st + '"><div class="pgc-strip" style="--gap:' + (8 * k).toFixed(1) + 'px;--dur:' + (ids.length * 4) + 's">' + imgs + imgs + '</div></div>';
    }
    if (t === 'action') {
      const a = LABEL[el.act] ? el.act : 'findme', v = el.v === 'circle' ? 'circle' : el.v === 'text' ? 'text' : 'pill';
      if (data.can && data.can[a] === false) return null;   // the function is off for this person (Find me after they were found)
      return '<div class="pgc-body" style="' + st + '"><button type="button" class="pgc-act ' + v + '" data-act="' + a + '">' + (v === 'text' ? '' : ICON[a]) + '<span>' + esc(el.text || LABEL[a]) + '</span></button></div>';
    }
    if (t === 'blessings') {
      const n = (data.notes || []).filter(x => x && x.text)[num(el.n, 0)];
      return '<div class="pgc-body pgc-txt pgc-bl" style="' + st + '" data-act="notes">' + (n ? '<q>' + esc(String(n.text).slice(0, 160)) + '</q>' + (n.name ? '<small>— ' + esc(n.name) + '</small>' : '') : '<q>Write the first blessing for the couple.</q>') + '</div>';
    }
    return null;
  }

  // ---- draw a whole layout ----
  function render(box, doc, data, act, opts) {
    ensure(); opts = opts || {};
    const root = document.createElement('div'); root.className = 'pgc';
    box.appendChild(root);
    let io = null, vio = null, lastW = 0, pars = [], sraf = 0;
    function startVid(b) { if (!b || b.querySelector('iframe')) return; const [k, id] = b.dataset.vid.split(':'), f = document.createElement('div'); f.innerHTML = vidFrame({ k, id }, b.dataset.loop === '1'); const fr = f.firstChild; if (b.dataset.fit) fr.style.cssText = b.dataset.fit; const pl = b.querySelector('.pgc-vplay'); if (pl) pl.remove(); b.appendChild(fr); }
    // scroll depth (parallax): an element drifts a little slower or faster than the page
    const sc = opts.scroller || window;
    function onScroll() {
      if (sraf || !pars.length || opts.still || document.documentElement.classList.contains('pg-lite')) return;   // step 97: light mode keeps the page still
      sraf = requestAnimationFrame(() => { sraf = 0; const vh = opts.scroller ? opts.scroller.clientHeight : window.innerHeight, top0 = opts.scroller ? opts.scroller.getBoundingClientRect().top : 0;
        pars.forEach(x => { const r = x.getBoundingClientRect(), c = r.top - top0 + r.height / 2 - vh / 2, b = x.firstElementChild; if (!b) return;
          const sm = x.dataset.sm, prog = Math.max(0, Math.min(1, (vh - (r.top - top0)) / (vh * 0.75)));   // step 97: 0 when it comes in at the bottom, 1 once it is well on screen
          if (sm === 'fade-on-scroll') { b.style.opacity = (0.1 + 0.9 * prog).toFixed(2); return; }
          if (sm === 'grow-on-scroll') { b.style.scale = (0.82 + 0.18 * prog).toFixed(3); return; }
          b.style.translate = '0 ' + Math.max(-240, Math.min(240, -c * (+x.dataset.par || 0))).toFixed(1) + 'px'; }); });
    }
    sc.addEventListener('scroll', onScroll, { passive: true });
    const C = doc.colors || {};
    function draw() {
      const W = (opts.width && opts.width()) || box.clientWidth || window.innerWidth, mode = opts.mode || (W >= LAPTOP_AT ? 'l' : 'p');
      const D = mode === 'p' ? PW : LW, k = mode === 'p' ? W / PW : Math.min(W, 1680) / LW, inW = D * k, off = (W - inW) / 2;
      lastW = W;
      const P = photos(data), ctx = { used: [], mode, cards: [], editing: !!opts.editing };
      root.style.setProperty('--c-bg', col(C.bg, '#faf7f2')); root.style.setProperty('--c-ink', col(C.ink, '#2a2420')); root.style.setProperty('--c-acc', col(C.acc, '#b08d57'));
      root.style.setProperty('--c-card', col(C.card, '#ffffff')); root.style.setProperty('--c-acc2', col(C.acc2, col(C.acc, '#b08d57')));
      root.style.fontFamily = "'" + (FONTS.indexOf((doc.fonts || {}).body) > -1 ? doc.fonts.body : 'Jost') + "',system-ui,sans-serif";
      root.dataset.mode = mode;
      root.innerHTML = (doc.sections || []).map(sec => {
        const h = secH(sec, mode) * k, bg = sec.bg || {};
        let bgHtml = '';
        if (bg.src) { const id = P.of(bg.src); ctx.used.push(id); bgHtml = '<img class="pgc-bgimg" alt="" data-photo="' + esc(id) + '" src="' + url(id, 1600) + '" style="object-position:' + num(bg.fx, 50) + '% ' + num(bg.fy, 35) + '%' + (num(bg.z, 1) > 1 ? ';scale:' + Math.min(4, num(bg.z, 1)) + ';transform-origin:' + num(bg.fx, 50) + '% ' + num(bg.fy, 35) + '%' : '') + '">'; }
        if (bg.dim) bgHtml += '<div class="pgc-dim" style="background:rgba(0,0,0,' + Math.max(0, Math.min(.8, num(bg.dim, 0))) + ')"></div>';
        const els = (sec.els || []).map(el => {
          const sp = spotOf(el, mode); if (!sp || sp.hide) return '';
          const inner = body(el, k, doc, data, P, ctx, sp); if (inner == null) return '';
          const mo = el.mo || {}, enter = ENTER.indexOf(el.m) > -1, stag = enter && el.t === 'events' && el.v !== 'list' && el.m !== 'shine';
          const m = stag ? ' pgc-stg' : enter ? ' pgc-e pgc-m-' + el.m : LOOP.indexOf(el.m) > -1 ? ' pgc-m-' + el.m : '';
          const dir = DIRS[mo.dir], sm = SCROLLM.indexOf(el.m) > -1;
          const tim = (mo.d ? ';--d:' + num(mo.d, 0) + 'ms' : '') + (mo.t ? ';--t:' + num(mo.t, 900) + 'ms' : '') + (mo.str != null ? ';--str:' + (Math.max(0, Math.min(100, num(mo.str, 50))) / 50).toFixed(2) : '') + (dir ? ';--mx:' + dir[0] + ';--my:' + dir[1] : '');
          return '<div class="pgc-el pgc-t-' + el.t + m + '" data-el="' + esc(el.id || '') + '"' + (mo.p || sm ? ' data-par="' + num(mo.p, 0) + '"' : '') + (sm ? ' data-sm="' + el.m + '"' : '') + ' style="left:' + (num(sp.x, 0) * k).toFixed(1) + 'px;top:' + (num(sp.y, 0) * k).toFixed(1) + 'px;width:' + (num(sp.w, 100) * k).toFixed(1) + 'px;height:' + (num(sp.h, 40) * k).toFixed(1) + 'px;z-index:' + num(sp.z, 1) + (sp.r ? ';rotate:' + num(sp.r, 0) + 'deg' : '') + tim + '">' + inner + '</div>';
        }).join('');
        const stay = Math.max(0, num(sec.stay, 0)) * k;   // "stays while scrolling": the section holds still for this much scrolling
        return '<section class="pgc-sec' + (stay && !opts.editing ? ' stay' : '') + '" data-sec="' + esc(sec.id || '') + '" style="height:' + (h + stay).toFixed(1) + 'px;background:' + col(bg.c, 'transparent') + '"><div class="pgc-stick" style="height:' + h.toFixed(1) + 'px">' + bgHtml + '<div class="pgc-in" style="left:' + off.toFixed(1) + 'px;width:' + inW.toFixed(1) + 'px">' + els + '</div></div>' + (stay && opts.editing ? '<div class="pgc-staynote" style="height:' + stay.toFixed(1) + 'px">stays here while guests scroll</div>' : '') + '</section>';
      }).join('');
      // the app's own cards draw themselves into their boxes (a card with nothing to show for this person leaves its box empty)
      const hiddenCards = [];
      root.querySelectorAll('[data-card]').forEach(host => { const c = ctx.cards[+host.dataset.card]; if (!c || !window.PGLayout || !PGLayout.card) return;
        const ok = PGLayout.card(host, { block: c.el.block, variant: c.el.variant, set: c.el.set || undefined }, host.clientWidth, host.clientHeight, mode === 'p' ? 'phone' : 'wide');
        if (!ok) { if (opts.editing) host.innerHTML = '<div class="pgc-cardnone">' + esc(c.el.block) + ' · nothing to show yet</div>'; else {
          const el = host.parentElement, top = parseFloat(el.style.top) || 0, height = parseFloat(el.style.height) || el.offsetHeight;   // its set size, not the box an entrance motion may be shrinking
          el.style.display = 'none';
          if (height > 0) hiddenCards.push({ section: el.parentElement, top, height });
        } }
      });
      // A guest can have cards that are unavailable until Find me (or another feature is enabled).
      // Collapse only the space below those cards, and only among elements in the same section.
      if (hiddenCards.length) {
        const sections = new Map();
        hiddenCards.forEach(card => { if (!sections.has(card.section)) sections.set(card.section, []); sections.get(card.section).push(card); });
        sections.forEach((cards, section) => {
          const siblings = [...section.children].filter(el => el.classList.contains('pgc-el') && el.style.display !== 'none');
          const bottom = () => siblings.reduce((m, el) => Math.max(m, (parseFloat(el.style.top) || 0) + (parseFloat(el.style.height) || el.offsetHeight)), 0);
          const before = bottom();
          siblings.forEach(el => {
            const top = parseFloat(el.style.top) || 0;
            const lift = cards.reduce((sum, card) => sum + (top >= card.top + card.height ? card.height : 0), 0);
            if (lift) el.style.top = Math.max(0, top - lift).toFixed(1) + 'px';
          });
          // the section gets shorter by as much as its lowest part moved up, so the gap doesn't just move to the bottom
          const shrink = siblings.length ? before - bottom() : 0, sec = section.closest('.pgc-sec'), stick = section.closest('.pgc-stick');
          if (shrink > 0 && sec && stick) {
            stick.style.height = Math.max(40, parseFloat(stick.style.height) - shrink).toFixed(1) + 'px';
            sec.style.height = Math.max(40, parseFloat(sec.style.height) - shrink).toFixed(1) + 'px';
          }
        });
      }
      if (opts.still) root.classList.add('pgc-still');
      if (io) io.disconnect();
      io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: opts.scroller || null, threshold: .15 }) : null;
      root.querySelectorAll('.pgc-stg .pgc-ev>button').forEach((b, i) => b.style.setProperty('--i', i % 12));
      root.querySelectorAll('.pgc-e,.pgc-stg').forEach(x => (io ? io.observe(x) : x.classList.add('in')));
      pars = [...root.querySelectorAll('[data-par]')]; onScroll();
      // step 97b: a looping video starts when it comes on screen (never in the editor or in light mode)
      if (vio) vio.disconnect(); vio = null;
      const lite = document.documentElement.classList.contains('pg-lite');
      if (!opts.editing && !opts.still && !lite && 'IntersectionObserver' in window) {
        vio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { startVid(e.target); vio.unobserve(e.target); } }), { root: opts.scroller || null, rootMargin: '200px 0px' });
        root.querySelectorAll('.pgc-vid[data-loop="1"]').forEach(x => vio.observe(x));
      }
      inst.used = ctx.used.filter(Boolean);
    }
    const onClick = e => {
      if (opts.onTap && opts.onTap(e)) return;
      const vb = e.target.closest('.pgc-vid[data-vid]'); if (vb && !opts.editing) { startVid(vb); return; }   // step 97b: tap to play (and light mode)
      const ev = e.target.closest('[data-ev]'); if (ev) { const x = (data.events || [])[+ev.dataset.ev]; if (x) act('event', x.name); return; }
      const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act);
    };
    root.addEventListener('click', onClick);
    let rz = 0; const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { const W = (opts.width && opts.width()) || box.clientWidth || window.innerWidth; if (Math.abs(W - lastW) > 2) draw(); }); };
    window.addEventListener('resize', onResize);
    const inst = { root, used: [], redraw: draw, destroy() { window.removeEventListener('resize', onResize); sc.removeEventListener('scroll', onScroll); if (io) io.disconnect(); if (vio) vio.disconnect(); root.removeEventListener('click', onClick); root.remove(); } };
    draw();
    return inst;
  }

  // the Hub's story registry (15-layout.js): the layout doc arrives as opts.tune
  let live = null;
  const mod = {
    render(box, data, act, opts) { if (live) live.destroy(); const doc = (opts && opts.tune && (opts.tune.doc || opts.tune)) || { sections: [] }; live = render(box, doc, data, act || (() => {}), opts); return live; },
    destroy() { if (live) live.destroy(); live = null; }
  };
  // step 97b: read a pasted link (the same patterns as the TKG TV): YouTube watch / youtu.be / Shorts / embed, or a Drive file link
  function videoFromLink(url) {
    url = String(url || '').trim(); let m;
    if ((m = /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/.exec(url))) return { k: 'yt', id: m[1], sh: 1 };
    if ((m = /youtube\.com\/watch\?[^#]*\bv=([A-Za-z0-9_-]{6,20})/.exec(url) || /youtu\.be\/([A-Za-z0-9_-]{6,20})/.exec(url) || /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,20})/.exec(url))) return { k: 'yt', id: m[1] };
    if (/drive\.google\.com/.test(url) && (m = /\/file\/d\/([A-Za-z0-9_-]{20,80})/.exec(url) || /[?&]id=([A-Za-z0-9_-]{20,80})/.exec(url))) return { k: 'drive', id: m[1] };
    return null;
  }
  window.PGCanvas = { render, mod, FONTS, PW, LW, LAPTOP_AT, spotOf, secH, LABEL, ENTER, LOOP, SCROLLM, artUrl, videoFromLink };
})();
