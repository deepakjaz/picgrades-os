// The wedding's photographer (step 42): the "Photographed by" page, the Hub's photographer line, and the PicGrades credit.
// Who photographed the wedding is set per wedding in the Control Panel (Photographer tab) by PicGrades or the photographer:
// name, Instagram, website, phone, email, city, about. Empty = the studio of the order.
// The page shows their details with buttons (Instagram, website, call, WhatsApp, email) and this wedding's events.
// "Gallery by PicGrades" shows at the end of the page and the Hub, unless PicGrades turned its credit off for this client.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgPhotographer() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => pgEsc(String(s == null ? '' : s));
  const IC = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z"/></svg>',
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1C10.7 20 4 13.3 4 5a1 1 0 0 1 1-1z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></svg>'
  };
  const who = () => (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.photographer) || {};
  function paint() {
    if (typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;   // the photographer's own page (/p/…) has its own layout
    const p = who(), name = GALLERY.studio || 'Your photographer', credit = GALLERY.credit !== false;
    // the Hub's photographer line: the Instagram handle under the name
    const hub = document.querySelector('.pgh-studio');
    if (hub) { let ig = hub.querySelector('.pgh-ig'); if (!ig) { ig = h('small', 'pgh-ig'); hub.querySelector('b').after(ig); } ig.textContent = p.instagram ? '@' + p.instagram : ''; ig.hidden = !p.instagram; }
    // the "Photographed by" page
    const wrap = document.querySelector('#view-studio .pg-module-wrap'); if (!wrap) return;
    let box = document.getElementById('pgPhot');
    if (!box) { box = h('div', 'pgp'); box.id = 'pgPhot'; wrap.querySelector('.pg-module-sub').after(box); }
    const acts = [];
    if (p.instagram) acts.push(['instagram', 'Instagram', '@' + p.instagram, 'https://www.instagram.com/' + encodeURIComponent(p.instagram) + '/']);
    if (p.website) acts.push(['web', 'Website', p.website.replace(/^https?:\/\//, '').replace(/\/$/, ''), p.website]);
    if (p.phone) { const tel = p.phone.replace(/[^0-9+]/g, ''); acts.push(['call', 'Call', p.phone, 'tel:' + tel]); acts.push(['chat', 'WhatsApp', 'Message', 'https://wa.me/' + tel.replace(/^\+/, '')]); }
    if (p.email) acts.push(['mail', 'Email', p.email, 'mailto:' + p.email]);
    box.innerHTML = (p.city ? '<p class="pgp-city">' + esc(p.city) + '</p>' : '') + (p.about ? '<p class="pgp-about">' + esc(p.about) + '</p>' : '') +
      (acts.length ? '<div class="pgp-acts">' + acts.map(([k, t, sub, href]) => '<a class="pgp-act" href="' + esc(href) + '" target="_blank" rel="noopener"><i>' + IC[k] + '</i><span><b>' + t + '</b><small>' + esc(sub) + '</small></span></a>').join('') + '</div>' : '');
    document.getElementById('pgStudioName').textContent = name;
    // the credit line (Hub and this page)
    document.querySelectorAll('.pgp-credit').forEach(e => e.remove());
    if (credit) {
      const line = () => h('p', 'pgp-credit', 'Gallery by <b>PicGrades</b>');
      wrap.appendChild(line());
      const hubView = document.getElementById('view-hub'); if (hubView) hubView.appendChild(line());
    }
  }
  pgAfter('pgRenderHub', paint);
  window.PGPhotographer = { paint, who };
})();
