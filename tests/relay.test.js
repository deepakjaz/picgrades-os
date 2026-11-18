// Cloudflare photo relay: HMAC gate, service-account OAuth and private Drive fetch.
const assert = require('assert');
const nodeCrypto = require('crypto');
global.crypto = nodeCrypto.webcrypto;
global.caches = { default: { match: async () => null, put: async () => {} } };

const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const secret = 'relay-test-secret-at-least-32-characters-long';
const service = { client_email: 'relay@example.iam.gserviceaccount.com', private_key: privateKey };
let driveCalls = 0, oauthCalls = 0, rangeSeen = '';
global.fetch = async (url, options = {}) => {
  if (String(url) === 'https://oauth2.googleapis.com/token') {
    oauthCalls++;
    const form = new URLSearchParams(options.body);
    assert.strictEqual(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    const assertion = form.get('assertion'), parts = assertion.split('.');
    assert.strictEqual(parts.length, 3);
    assert(nodeCrypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), publicKey, Buffer.from(parts[2], 'base64url')), 'service-account JWT signature must verify');
    return new Response(JSON.stringify({ access_token: 'google-access-token', expires_in: 3600 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  driveCalls++;
  assert.strictEqual(options.headers.Authorization, 'Bearer google-access-token');
  rangeSeen = options.headers.Range || '';
  return new Response(Buffer.from('private-drive-image'), { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '19' } });
};

(async () => {
  const relay = (await import('../worker.mjs')).default;
  const env = { HMAC_SECRET: secret, GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(service) };
  const ctx = { waitUntil: p => p };
  const tokenFor = (payload, sigSecret = secret) => {
    const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = nodeCrypto.createHmac('sha256', sigSecret).update(p).digest('base64url');
    return p + '.' + sig;
  };
  const payload = { gid: 'gallery123', pid: 'FILEIDLONG000000000000', w: 200, exp: Math.floor(Date.now() / 1000) + 300 };
  const token = tokenFor(payload);
  let r = await relay.fetch(new Request('https://relay.example/health'), env, ctx);
  assert.strictEqual(r.status, 200); assert.deepStrictEqual(await r.json(), { ok: true, service: 'picgrades-photo-relay' });

  r = await relay.fetch(new Request('https://relay.example/d/' + payload.pid + '?g=' + payload.gid + '&w=200&token=bad'), env, ctx);
  assert.strictEqual(r.status, 403, 'invalid signature is rejected'); assert.strictEqual(driveCalls, 0, 'Drive must not be contacted for invalid signatures');

  const url = 'https://relay.example/d/' + payload.pid + '?g=' + payload.gid + '&w=200&token=' + encodeURIComponent(token);
  r = await relay.fetch(new Request(url), env, ctx);
  assert.strictEqual(r.status, 200); assert.strictEqual(await r.text(), 'private-drive-image');
  assert.strictEqual(r.headers.get('Content-Type'), 'image/jpeg');
  assert.strictEqual(r.headers.get('Cache-Control'), 'private, max-age=300');
  assert.strictEqual(oauthCalls, 1); assert.strictEqual(driveCalls, 1);

  const expired = tokenFor({ ...payload, exp: Math.floor(Date.now() / 1000) - 1 });
  r = await relay.fetch(new Request('https://relay.example/d/' + payload.pid + '?g=' + payload.gid + '&w=200&token=' + encodeURIComponent(expired)), env, ctx);
  assert.strictEqual(r.status, 403, 'expired signatures are rejected');

  const wrongWidth = tokenFor({ ...payload, w: 2048 });
  r = await relay.fetch(new Request('https://relay.example/d/' + payload.pid + '?g=' + payload.gid + '&w=200&token=' + encodeURIComponent(wrongWidth)), env, ctx);
  assert.strictEqual(r.status, 403, 'signature cannot be reused at a different width');

  console.log('PASS relay health');
  console.log('PASS HMAC authorization and expiry');
  console.log('PASS service-account RS256 OAuth exchange');
  console.log('PASS private Drive fetch and cache headers');
})().catch(e => { console.error(String(e.stack).replace(/\n/g, ' | ')); process.exit(1); });
})().catch(e => { console.error(String(e.stack).replace(/\n/g, ' | ')); process.exitCode = 1; });
