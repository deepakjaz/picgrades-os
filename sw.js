// PicGrades gallery app: keeps the gallery page available when the network is weak.
const CACHE = 'pg-shell-v2';
const SHELL = ['/app/gallery.html', '/app/config.js', '/app/icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('pg-shell-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;               // photos, fonts, backend: browser as normal
  if (r.mode === 'navigate' && /^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?\/?$/i.test(u.pathname)) {   // every wedding link (step 61)
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put('/app/gallery.html', c)); return res; })
      .catch(() => caches.match('/app/gallery.html')));
  }
});
