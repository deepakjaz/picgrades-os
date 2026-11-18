/**
 * PicGrades restricted-Drive photo relay.
 *
 * Requests are authorized by short-lived HMAC tokens minted only by Apps Script
 * after the gallery's existing per-guest visibility checks. The Worker reads
 * private Drive files as a service account shared explicitly on the wedding
 * folder. Tokens are checked before the normalized edge-cache lookup.
 */
let googleToken = null;
let googleTokenUntil = 0;

const encoder = new TextEncoder();
const WIDTHS = new Set([200, 1280, 2048]);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  'Vary': 'Origin'
};

function b64urlBytes(value) {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').split('+').join('-').split('/').join('_');
}
function fromB64url(value) {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base + '='.repeat((4 - base.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...headers } });
}
async function verifyToken(token, galleryId, photoId, width, secret) {
  if (!secret || secret.length < 32 || typeof token !== 'string' || token.length > 4096) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const payloadBytes = fromB64url(parts[0]);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (payload.gid !== galleryId || payload.pid !== photoId || payload.w !== width) return false;
    if (!Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return false;
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, fromB64url(parts[1]), encoder.encode(parts[0]));
  } catch (_) {
    return false;
  }
}
function pemBytes(pem) {
  const body = String(pem || '').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '').split(/\s+/).join('');
  if (!body) throw new Error('Service account private key is missing');
  const binary = atob(body);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function googleAccessToken(env) {
  if (googleToken && googleTokenUntil > Date.now() + 60000) return googleToken;
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!sa.client_email || !sa.private_key) throw new Error('Service account JSON is incomplete');
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlBytes(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64urlBytes(encoder.encode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })));
  const unsigned = header + '.' + claim;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const assertion = unsigned + '.' + b64urlBytes(new Uint8Array(sig));
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!tokenResponse.ok) throw new Error('Google OAuth token exchange failed (' + tokenResponse.status + ')');
  const data = await tokenResponse.json();
  if (!data.access_token) throw new Error('Google OAuth response did not contain an access token');
  googleToken = data.access_token;
  googleTokenUntil = Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000;
  return googleToken;
}
function addCors(response) {
  const headers = new Headers(response.headers);
  Object.keys(cors).forEach(k => headers.set(k, cors[k]));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'picgrades-photo-relay' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const pathPhoto = url.pathname.match(/^\/d\/([A-Za-z0-9_-]{10,200})$/);
    if (url.pathname !== '/photo' && url.pathname !== '/stream' && !pathPhoto) return new Response('Not Found', { status: 404, headers: cors });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { ...cors, Allow: 'GET, HEAD, OPTIONS' } });

    const galleryId = url.searchParams.get('g') || '';
    const photoId = (pathPhoto && pathPhoto[1]) || url.searchParams.get('id') || '';
    const token = url.searchParams.get('token') || '';
    const width = Number(url.searchParams.get('w') || 1280);
    const isStream = url.pathname === '/stream';
    if (!/^[A-Za-z0-9_-]{6,40}$/.test(galleryId) || !/^[A-Za-z0-9_-]{10,200}$/.test(photoId) || !token || (!isStream && !WIDTHS.has(width))) {
      return new Response('Missing or invalid photo request', { status: 400, headers: cors });
    }
    if (!await verifyToken(token, galleryId, photoId, isStream ? 0 : width, env.HMAC_SECRET)) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

    const cacheKey = new Request(url.origin + '/__photo_cache/' + encodeURIComponent(galleryId) + '/' + encodeURIComponent(photoId) + '/' + (isStream ? 'stream' : width), { method: 'GET' });
    const cache = caches.default;
    if (!isStream) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('Cache-Control', 'private, max-age=300');
        return addCors(new Response(request.method === 'HEAD' ? null : cached.body, { status: cached.status, headers }));
      }
    }

    try {
      const accessToken = await googleAccessToken(env);
      const driveUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(photoId) + '?alt=media&supportsAllDrives=true';
      const headers = { Authorization: 'Bearer ' + accessToken };
      if (request.headers.has('Range')) headers.Range = request.headers.get('Range');
      const driveResponse = await fetch(driveUrl, {
        headers,
        cf: isStream ? undefined : { image: { width, fit: 'scale-down' } }
      });
      if (!driveResponse.ok) {
        return new Response(driveResponse.status === 404 ? 'Photo not found' : 'Drive could not serve this file', { status: driveResponse.status, headers: cors });
      }
      const contentType = driveResponse.headers.get('Content-Type') || 'application/octet-stream';
      const supportedType = isStream ? (contentType.indexOf('video/') === 0 || contentType.indexOf('audio/') === 0 || contentType.indexOf('application/octet-stream') === 0) : contentType.toLowerCase().indexOf('image/') === 0;
      if (!supportedType) {
        return new Response('Unsupported Drive file type', { status: 415, headers: cors });
      }
      const responseHeaders = new Headers(cors);
      responseHeaders.set('Content-Type', contentType);
      responseHeaders.set('Accept-Ranges', 'bytes');
      if (driveResponse.headers.has('Content-Length')) responseHeaders.set('Content-Length', driveResponse.headers.get('Content-Length'));
      if (driveResponse.headers.has('Content-Range')) responseHeaders.set('Content-Range', driveResponse.headers.get('Content-Range'));
      const status = driveResponse.status === 206 ? 206 : 200;
      if (isStream) {
        responseHeaders.set('Cache-Control', 'private, no-store');
        return new Response(request.method === 'HEAD' ? null : driveResponse.body, { status, headers: responseHeaders });
      }
      const cacheable = new Response(driveResponse.body, {
        status,
        headers: { ...Object.fromEntries(responseHeaders), 'Cache-Control': 'public, max-age=86400' }
      });
      ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));
      responseHeaders.set('Cache-Control', 'private, max-age=300');
      return new Response(request.method === 'HEAD' ? null : cacheable.body, { status, headers: responseHeaders });
    } catch (error) {
      return json({ ok: false, error: 'Photo relay unavailable' }, 502);
    }
  }
};
