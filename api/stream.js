// Streams a guest video from Google Drive with byte ranges, so phones can play and seek it
// (same approach as TKG Moments). Usage: /api/stream?g=<galleryId>&id=<driveFileId>
// Only videos of that gallery that are approved (or waiting for the couple's review) are streamed,
// so nobody can use PicGrades to stream other Drive files.
const fs = require('fs'), path = require('path');
const OK = new Map();   // galleryId:fileId → { allowed, until } kept for 10 minutes on this server

function apiUrl() {
  if (process.env.PG_API_URL) return process.env.PG_API_URL;
  try { const m = /apiUrl:\s*'([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'app', 'config.js'), 'utf8')); return m ? m[1] : ''; } catch (e) { return ''; }
}
async function allowed(g, id) {
  const k = g + ':' + id, hit = OK.get(k);
  if (hit && hit.until > Date.now()) return hit.allowed;
  let ok = false;
  try {
    const r = await fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'videoOk', g, id }), redirect: 'follow' });
    ok = !!(await r.json()).allowed;
  } catch (e) { ok = false; }
  OK.set(k, { allowed: ok, until: Date.now() + (ok ? 600000 : 60000) });
  if (OK.size > 2000) OK.clear();
  return ok;
}

module.exports = async (req, res) => {
  const q = req.query || {}, id = String(q.id || ''), g = String(q.g || '');
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id) || !/^[a-z0-9]{6,40}$/i.test(g)) { res.statusCode = 400; return res.end('Missing or invalid video'); }
  if (!(await allowed(g, id))) { res.statusCode = 403; return res.end('This video is not part of this gallery'); }
  try {
    const headers = {}; if (req.headers.range) headers.Range = req.headers.range;
    const r = await fetch('https://drive.google.com/uc?export=download&id=' + id, { headers, redirect: 'follow' });
    const type = r.headers.get('content-type') || 'video/mp4';
    if (!/^(video|image)\//.test(type) && !/octet-stream/.test(type)) { res.statusCode = 404; return res.end('Not a video'); }
    res.setHeader('Content-Type', /octet-stream/.test(type) ? 'video/mp4' : type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (r.headers.get('content-range')) { res.setHeader('Content-Range', r.headers.get('content-range')); res.statusCode = 206; } else res.statusCode = 200;
    if (r.headers.get('content-length')) res.setHeader('Content-Length', r.headers.get('content-length'));
    const reader = r.body.getReader();
    while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
    res.end();
  } catch (e) { res.statusCode = 500; res.end('Streaming error'); }
};
