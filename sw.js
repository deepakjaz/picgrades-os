// PicGrades gallery app: keeps the gallery page available when the network is weak.
const CACHE = 'pg-shell-v1';
const SHELL = ['/app/gallery.html', '/app/config.js', '/app/icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;               // photos, fonts, backend: browser as normal
  if (r.mode === 'navigate' && /^\/g\/[a-z0-9]+\/?$/i.test(u.pathname)) {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put('/app/gallery.html', c)); return res; })
      .catch(() => caches.match('/app/gallery.html')));
  }
});
