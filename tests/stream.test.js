// api/stream.js: only videos the backend says belong to the gallery are streamed.
let fails = 0; const assert = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
process.env.PG_API_URL = 'https://backend.example/exec';
const asked = [];
global.fetch = async (url, opt) => {
  if (url === process.env.PG_API_URL) { const b = JSON.parse(opt.body); asked.push(b); return { json: async () => ({ allowed: b.g === 'gal123' && b.id === 'VIDEOOK000000000000000' }) }; }
  const body = Buffer.from('fake video bytes');
  return { headers: { get: k => ({ 'content-type': 'video/mp4', 'content-length': String(body.length) })[k] || null }, body: { getReader: () => { let d = false; return { read: async () => d ? { done: true } : (d = true, { value: body }) }; } } };
};
const handler = require('../api/stream.js');
function run(query) {
  return new Promise(res => {
    const out = { statusCode: 200, headers: {}, data: '', setHeader(k, v) { this.headers[k] = v; }, write(b) { this.data += b; }, end(b) { if (b) this.data += b; res(this); } };
    handler({ query, headers: {} }, out);
  });
}
(async () => {
  let r = await run({ g: 'gal123', id: 'VIDEOOK000000000000000' });
  assert(r.statusCode === 200 && r.data === 'fake video bytes', 'approved video of the gallery streams');
  r = await run({ g: 'gal123', id: 'SOMEONEELSESFILE000000' });
  assert(r.statusCode === 403, 'any other Drive file is refused');
  r = await run({ id: 'VIDEOOK000000000000000' });
  assert(r.statusCode === 400, 'gallery id is required');
  const n = asked.length; await run({ g: 'gal123', id: 'VIDEOOK000000000000000' });
  assert(asked.length === n, 'answer is remembered (backend not asked again for every byte range)');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
