// Step 72: a small phone playing wedding photos like a reel. Wedding photos appear on function cards only this way
// (reel size, inside a phone), never as a photo card. Used by the Hub's Reel Edits card and the photographer page.
// pgReelMock(box, ids, { label, sub, hearts }) fills box; it plays only while visible, and stays still for reduced motion.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgReelMockModule() {
  const css = document.createElement('style');
  css.textContent = [
    '.pgrm{position:relative;height:100%;max-height:100%;aspect-ratio:9/16;margin:0 auto;border-radius:clamp(14px,8%,26px);background:#0b0b0b;padding:clamp(3px,1.6%,6px);box-sizing:border-box;box-shadow:0 14px 34px -14px rgba(0,0,0,.55)}',
    '.pgrm-scr{position:relative;width:100%;height:100%;border-radius:inherit;overflow:hidden;background:#1a1a1a}',
    '.pgrm-scr img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.04);transition:opacity .7s ease}',
    '.pgrm-scr img.on{opacity:1}',
    '@media (prefers-reduced-motion:no-preference){.pgrm-scr img.on{animation:pgrmKb 3.2s ease-out both}}',
    '@keyframes pgrmKb{from{transform:scale(1.04) translate(0,0)}to{transform:scale(1.14) translate(-2%,-2%)}}',
    '.pgrm-bars{position:absolute;left:7%;right:7%;top:5%;display:flex;gap:3px;z-index:2}',
    '.pgrm-bars i{flex:1;height:2px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}',
    '.pgrm-bars i b{display:block;height:100%;width:0;background:#fff}',
    '.pgrm-bars i.done b{width:100%}.pgrm-bars i.now b{animation:pgrmBar var(--pgrm-t,1.8s) linear forwards}',
    '@keyframes pgrmBar{to{width:100%}}',
    '.pgrm-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),transparent 22%,transparent 60%,rgba(0,0,0,.6));z-index:1}',
    '.pgrm-cap{position:absolute;left:8%;right:22%;bottom:6%;z-index:2;color:#fff;font:700 clamp(9px,7cqw,13px)/1.2 var(--font-sans);text-shadow:0 1px 3px rgba(0,0,0,.5)}',
    '.pgrm-cap small{display:block;margin-top:3px;font-weight:500;font-size:.82em;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.pgrm-side{position:absolute;right:6%;bottom:8%;z-index:2;display:flex;flex-direction:column;gap:10%;align-items:center;color:#fff;width:14%}',
    '.pgrm-side svg{width:100%;height:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}',
    '.pgrm-scr{container-type:inline-size}'
  ].join('');
  document.head.appendChild(css);
  const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  const NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = new Set();
  const onScreen = el => { if (!el.getClientRects().length) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  setInterval(() => live.forEach(m => { if (!m.root.isConnected) { live.delete(m); return; } if (!reduce() && !document.hidden && onScreen(m.root)) m.next(); }), 1800);   // plays only while on screen

  window.pgReelMock = function (box, ids, o) {
    o = o || {}; ids = (ids || []).filter(Boolean).slice(0, 8);
    const root = document.createElement('div'); root.className = 'pgrm'; root.setAttribute('aria-hidden', 'true');
    const scr = document.createElement('div'); scr.className = 'pgrm-scr'; root.appendChild(scr);
    const bars = document.createElement('div'); bars.className = 'pgrm-bars';
    const imgs = ids.map((id, i) => {
      const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.loading = i < 2 ? 'eager' : 'lazy'; im.src = pgImg(id, 540);
      im.onerror = function () { this.onerror = null; this.src = pgImgFallback(id, 540); };
      scr.appendChild(im); const b = document.createElement('i'); b.innerHTML = '<b></b>'; bars.appendChild(b); return im;
    });
    const shade = document.createElement('div'); shade.className = 'pgrm-shade';
    const cap = document.createElement('div'); cap.className = 'pgrm-cap'; cap.innerHTML = '<span></span><small></small>';
    cap.firstChild.textContent = o.label || ''; cap.lastChild.innerHTML = NOTE.replace('<svg', '<svg style="width:1em;height:1em;vertical-align:-.12em;margin-right:4px"') + pgEsc(o.sub || 'Original audio');
    const side = document.createElement('div'); side.className = 'pgrm-side'; side.innerHTML = o.hearts === false ? '' : HEART;
    scr.append(shade, bars, cap, side);
    box.appendChild(root);
    let i = -1;
    const m = { root, next() {
      if (!imgs.length) return;
      i = (i + 1) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('on', k === i));
      [...bars.children].forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'now' : ''; });
    } };
    root._pgrm = m; m.next(); live.add(m);
    return root;
  };
})();
