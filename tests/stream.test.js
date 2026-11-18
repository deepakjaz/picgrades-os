// The legacy unsigned stream route must never proxy private Drive media.
let fails = 0; const assert = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const handler = require('../api/stream.js');
function run(query) {
  return new Promise(res => {
    const out = { statusCode: 200, headers: {}, data: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.data += b || ''; res(this); } };
    handler({ query, headers: {} }, out);
  });
}
(async () => {
  const r = await run({ g: 'gal123', id: 'VIDEOOK000000000000000' });
  assert(r.statusCode === 410, 'unsigned video requests are retired');
  assert(r.headers['Cache-Control'] === 'no-store', 'retired endpoint is not cached');
  assert(/signed gallery media URL/.test(r.data), 'clients are directed to the signed relay URL');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
