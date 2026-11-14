// The guest welcome (step 63c).
// A guest opening the guest link of a wedding set to "only after Find me" is welcomed once on this phone:
//   1. the couple's full-length photo (Story › Welcome photo; else the first cover photo or Wedding Highlight)
//      and "Which side are you from?" — the bride's, the groom's, or both
//   2. "Did you attend any of the events?" — Yes → Find me (name + phone first; after 2 tries they can ask the couple)
//                                             No  → the Wedding Highlights
// The answers stay on the phone and go with the guest's name when they register (Guests › side, attended).
// Not shown to the couple, the photographer or PicGrades, or to a guest Find me already found.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgWelcome() {
  let shown = false;
  const seen = () => !!pgStore('welcome');
  const want = () => typeof GALLERY !== 'undefined' && GALLERY && GALLERY.gated && !GALLERY.found && PG_AS === 'guest' && !GALLERY.isStudio && !seen();
  function photoId() {
    const st = GALLERY.story || {};
    return st.welcome || (st.cover || [])[0] || ((GALLERY.highlights || [])[0] || {}).id || '';
  }
  const findmeOn = () => (GALLERY.features || {}).findme !== 'off' && GALLERY.faceSearch;

  function show() {
    if (shown || !want()) return; shown = true;
    const id = photoId(), date = typeof pgDate === 'function' ? pgDate(GALLERY.eventDate) : '';
    const w = document.createElement('div'); w.id = 'pgWelcome'; w.className = 'pgw'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'pgwQ');
    w.innerHTML = (id ? '<img class="pgw-photo" alt="" src="' + pgImg(id, 1600) + '">' : '') + '<div class="pgw-shade"></div>' +
      '<div class="pgw-in"><p class="pgw-eyebrow">Welcome to the wedding of</p><h1 class="pgw-names">' + pgEsc(GALLERY.title || '') + '</h1>' + (date ? '<p class="pgw-date">' + pgEsc(date) + '</p>' : '') +
      '<div class="pgw-step" data-step="1"><h2 id="pgwQ">Which side are you from?</h2><div class="pgw-acts">' +
        '<button type="button" data-side="bride">Bride’s side</button><button type="button" data-side="groom">Groom’s side</button><button type="button" data-side="both">Both</button></div></div>' +
      '<div class="pgw-step" data-step="2" hidden><h2>Did you attend any of the events?</h2><div class="pgw-acts">' +
        '<button type="button" data-att="yes">Yes, I was there</button><button type="button" data-att="no">No, I couldn’t make it</button></div>' +
        '<button type="button" class="pgw-back">Back</button></div></div>';
    const img = w.querySelector('.pgw-photo'); if (img) img.onerror = function () { this.onerror = null; this.src = pgImgFallback(id, 1600); };
    document.body.appendChild(w); document.body.classList.add('pgw-on');
    requestAnimationFrame(() => w.classList.add('in'));
    let side = '';
    const step = n => { w.querySelectorAll('.pgw-step').forEach(s => { s.hidden = s.dataset.step !== String(n); }); const b = w.querySelector('.pgw-step:not([hidden]) button'); if (b) b.focus(); };
    w.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.side) { side = b.dataset.side; step(2); }
      else if (b.classList.contains('pgw-back')) step(1);
      else if (b.dataset.att) done(side, b.dataset.att);
    });
    step(1);
    function done(side, att) {
      pgStore('welcome', { side, attended: att });
      w.classList.remove('in'); document.body.classList.remove('pgw-on');
      setTimeout(() => w.remove(), 350);
      if (att === 'yes' && findmeOn()) {
        switchView('gallery');
        const fb = document.querySelector('[data-findme]'); if (fb) fb.click();   // the same way as every Find me button (name + phone first)
      } else if ((GALLERY.highlights || []).length && window.pgOpenEvent) {
        pgOpenEvent('Wedding Highlights');
        if (att === 'yes') showToast('Find me is not ready yet · here are the Wedding Highlights');
      }
    }
  }
  pgAfter('pgRenderHub', () => setTimeout(show, 0));
  window.PGWelcome = { show, reset: () => { pgStore('welcome', null); shown = false; } };
})();
