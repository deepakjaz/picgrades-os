// step 67: a wedding's own address — anika-rohan.picgrades.in, anikaandrohan.com or studio.com/anika-rohan.
// The address points to this app; here we ask the server which wedding it is and open it. Runs only on such an address
// (on the main app address nothing happens), or on /app/w.html?host=… for testing.
(function () {
  var q = new URLSearchParams(location.search), host = (q.get('host') || location.hostname).toLowerCase();
  var main = /(^|\.)vercel\.app$|^localhost$|^127\.0\.0\.1$|^(www\.)?picgrades\.com$/.test(host) && !q.get('host');
  if (main) return;
  var path = q.get('path') || (location.pathname === '/app/w.html' ? '' : location.pathname);
  var say = function (t) { var m = document.getElementById('wMsg'); if (m) m.textContent = t; };
  var paint = function () {
    if (document.getElementById('wMsg')) return;
    document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;text-align:center;background:#0E0E10;color:#F3F0EA;font-family:Georgia,serif"><div><p style="letter-spacing:.3em;font:600 11px Arial,sans-serif;color:#E9B44C">PICGRADES</p><h1 id="wMsg" style="font-weight:400;font-size:30px;margin:10px 20px">Opening the wedding…</h1></div></main>';
    document.documentElement.style.visibility = '';
  };
  if (document.body) paint(); else document.addEventListener('DOMContentLoaded', paint);
  var api = window.PG_CONFIG && window.PG_CONFIG.apiUrl;
  fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'resolveHost', host: host, path: path }) })
    .then(function (r) { return r.json(); })
    .then(function (r) {
      if (r.galleryId) return location.replace('/g/' + encodeURIComponent(r.galleryId) + location.hash);
      if (r.studio) return location.replace('/p/' + encodeURIComponent(r.studio));
      if (r.home) return location.replace('https://picgrades.com/');
      say(r.error || 'This address is not set up yet.');
    })
    .catch(function () { say('Could not open the wedding. Please check your internet and try again.'); });
})();
