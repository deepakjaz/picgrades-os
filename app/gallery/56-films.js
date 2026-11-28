// Step 111: the films card — the couple's videos (YouTube, Shorts, Google Drive) playing one after another, like the TKG TV:
// it starts quietly when it comes into view, goes on to the next video by itself (YouTube tells us when one ends), and keeps going round.
// Sound: one tap. The list is the wedding's own (GALLERY.films, set by the couple / photographer). Uses YouTube's and Drive's own
// players only — nothing is stored or passed through us.
(function pgFilms() {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const url = (f, sound) => f.k === 'yt' ? 'https://www.youtube-nocookie.com/embed/' + f.id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1' + (sound ? '' : '&mute=1') + '&origin=' + encodeURIComponent(location.origin)
    : 'https://drive.google.com/file/d/' + f.id + '/preview';
  const thumb = f => f.k === 'yt' ? 'https://i.ytimg.com/vi/' + f.id + '/hqdefault.jpg' : '';
  function mount(node, films, opts) {
    films = (films || []).filter(f => f && /^(yt|drive)$/.test(f.k) && /^[A-Za-z0-9_-]{6,80}$/.test(f.id)); opts = opts || {};
    if (!films.length) { node.innerHTML = opts.owner ? '<div class="pgf-empty"><b>Your films play here</b><span>Add YouTube, Shorts or Drive links in Try your photos › More › Your videos.</span></div>' : ''; return { destroy() {} }; }
    let i = 0, sound = false, started = false, fr = null, alive = true;
    node.innerHTML = '<div class="pgf"><div class="pgf-stage"></div><div class="pgf-bar">' +
      (films.length > 1 ? '<button type="button" class="pgf-prev" aria-label="Previous video">‹</button>' : '') +
      '<button type="button" class="pgf-sound" aria-label="Sound on">Sound on</button>' +
      (films.length > 1 ? '<button type="button" class="pgf-next" aria-label="Next video">›</button>' : '') + '</div></div>';
    const stage = node.querySelector('.pgf-stage');
    function show() {
      const f = films[i]; stage.classList.toggle('short', !!f.sh);
      if (!started) { stage.innerHTML = (thumb(f) ? '<img alt="" src="' + esc(thumb(f)) + '">' : '') + '<button type="button" class="pgf-play" aria-label="Play">▶</button>'; return; }
      stage.innerHTML = '<iframe title="Wedding film" src="' + esc(url(f, sound)) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      fr = stage.querySelector('iframe');
      fr.addEventListener('load', () => { try { fr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'pgf', channel: 'widget' }), '*'); } catch (e) {} });
    }
    const go = d => { i = (i + d + films.length) % films.length; show(); };
    const onMsg = e => {   // YouTube says when a video ends → the next one (round and round)
      if (!fr || e.source !== fr.contentWindow) return; let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
      const st = d && (d.event === 'onStateChange' ? d.info : d.event === 'infoDelivery' && d.info ? d.info.playerState : null);
      if (st === 0 && alive) go(1);
    };
    window.addEventListener('message', onMsg);
    node.addEventListener('click', ev => {
      if (ev.target.closest('.pgf-play')) { started = true; show(); }
      else if (ev.target.closest('.pgf-next')) { started = true; go(1); }
      else if (ev.target.closest('.pgf-prev')) { started = true; go(-1); }
      else if (ev.target.closest('.pgf-sound')) { sound = !sound; started = true; const b = node.querySelector('.pgf-sound'); b.textContent = sound ? 'Sound off' : 'Sound on'; b.setAttribute('aria-label', b.textContent);
        if (fr && films[i].k === 'yt') { try { fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: sound ? 'unMute' : 'mute', args: [] }), '*'); } catch (e) { show(); } } else show(); }
    });
    // starts quietly the first time it comes into view (light mode / reduced motion: waits for a tap)
    const still = document.documentElement.classList.contains('pg-lite') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || opts.still;
    let io = null;
    if (!still && 'IntersectionObserver' in window) { io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting) && !started) { started = true; show(); io.disconnect(); } }, { root: opts.scroller || null, threshold: 0.4 }); io.observe(node); }
    show();
    return { destroy() { alive = false; window.removeEventListener('message', onMsg); if (io) io.disconnect(); }, next: () => go(1), index: () => i };
  }
  window.PGFilms = { mount };
})();
