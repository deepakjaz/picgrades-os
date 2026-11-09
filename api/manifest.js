// Per-gallery web app manifest: /api/manifest?g=<galleryId>&n=<couple name>
// Lets guests install one wedding gallery as an app that opens on its Hub.
module.exports = (req, res) => {
  const q = req.query || {};
  const g = String(q.g || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  const n = String(q.n || 'Wedding Gallery').replace(/[<>]/g, '').slice(0, 60) || 'Wedding Gallery';
  const c = String(q.c || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64);   // couple key: the couple's installed app opens in couple mode
  const base = /^p-/.test(g) ? '/p/' + g.slice(2) : g ? '/g/' + g : '/';   // p-<name> = a photographer's page
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', c ? 'private, max-age=600' : 'public, max-age=600');
  res.end(JSON.stringify({
    id: base, name: n + ' · PicGrades', short_name: n.slice(0, 24), start_url: base + (c && /^\/g\//.test(base) ? '?couple=' + c : '') + '#hub', scope: base,
    display: 'standalone', orientation: 'any', background_color: '#0E0C0B', theme_color: '#0E0C0B',
    icons: [
      { src: '/app/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/app/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }));
};
