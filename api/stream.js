// Streams a guest video from Google Drive with byte ranges, so phones can play and seek it
// (same approach as TKG Moments). Usage: /api/stream?id=<driveFileId>
module.exports = async (req, res) => {
  const id = String((req.query || {}).id || '');
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) { res.statusCode = 400; return res.end('Missing or invalid file id'); }
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
