/**
 * Shared Cryptographic, Session Cookie & Google ID Token Verification Utilities
 * Runs natively on Cloudflare Pages Functions (Web Crypto API, zero npm dependencies).
 */

export const GUEST_WEEKLY_LIMIT = 2;
export const FREE_WEEKLY_LIMIT = 3;
export const SESSION_COOKIE_NAME = 'tm_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cachedJwks = null;
let cachedJwksExpiry = 0;

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      ...extraHeaders,
    },
  });
}

export function getTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns ISO-8601 UTC week identifier (e.g. '2026-W46') so weekly free quotas reset Monday 00:00 UTC.
 */
export function getWeekKeyUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getRequestCountry(request) {
  const cfCountry =
    request?.cf?.country && typeof request.cf.country === 'string'
      ? request.cf.country.trim().toUpperCase()
      : '';
  const hasEdgeRay = Boolean(request?.headers?.get('CF-Ray'));
  if (!hasEdgeRay) {
    try {
      const host = new URL(request.url).hostname;
      if (host === '127.0.0.1' || host === 'localhost') {
        const devCountry = request?.headers?.get('CF-IPCountry');
        if (devCountry && typeof devCountry === 'string' && devCountry.trim()) {
          return devCountry.trim().toUpperCase();
        }
      }
    } catch {}
  }
  if (cfCountry) return cfCountry;
  const headerCountry = request?.headers?.get('CF-IPCountry');
  if (headerCountry && typeof headerCountry === 'string' && headerCountry.trim()) {
    return headerCountry.trim().toUpperCase();
  }
  return 'XX';
}

export function getClientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  const xff = request.headers.get('X-Forwarded-For');
  if (xff && xff.trim()) return xff.split(',')[0].trim();
  return '127.0.0.1';
}

export function base64UrlEncode(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str) {
  let b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function importHmacKey(secretStr, usage = ['sign']) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

export async function hmacSha256Bytes(secretStr, message) {
  const key = await importHmacKey(secretStr, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export async function hashGuestSubject(ip, secret) {
  const salt = secret || 'tubemetrix-guest-fallback';
  const digest = await hmacSha256Bytes(salt, `guest:${ip}`);
  const hex = Array.from(digest.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `guest:${hex}`;
}

export async function signSessionToken({ uid, email }, secret) {
  if (!secret) throw new Error('SESSION_SECRET is not configured on server.');
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    uid,
    email,
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBytes = await hmacSha256Bytes(secret, payloadB64);
  return `${payloadB64}.${base64UrlEncode(sigBytes)}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  try {
    const [payloadB64, sigB64] = parts;
    const expectedSig = await hmacSha256Bytes(secret, payloadB64);
    const actualSig = base64UrlDecode(sigB64);
    if (!timingSafeEqualBytes(expectedSig, actualSig)) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.uid || !payload.exp || payload.exp <= nowSec) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookieValue(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const pairs = header.split(';');
  for (const part of pairs) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function buildSessionCookie(token, requestUrl, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const isHttps = new URL(requestUrl).protocol === 'https:';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) attrs.push('Secure');
  return attrs.join('; ');
}

export function buildClearSessionCookie(requestUrl) {
  return buildSessionCookie('', requestUrl, 0);
}

async function fetchGoogleJwks(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedJwks && now < cachedJwksExpiry) {
    return cachedJwks;
  }

  const resp = await fetch(GOOGLE_JWKS_URL);
  if (!resp.ok) {
    throw new Error(`Unable to fetch Google public keys (HTTP ${resp.status})`);
  }

  const jwks = await resp.json();
  const cc = resp.headers.get('cache-control') || '';
  const match = cc.match(/max-age=(\d+)/i);
  const ttlSec = match ? parseInt(match[1], 10) : 3600;

  cachedJwks = jwks;
  cachedJwksExpiry = now + Math.max(60, ttlSec) * 1000;
  return jwks;
}

/**
 * Cryptographically verifies a Google Identity Services ID token (RS256).
 */
export async function verifyGoogleIdToken(idToken, expectedClientId) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Google credential token.');
  }
  if (!expectedClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured on server.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google JWT.');
  }

  let header;
  let payload;
  try {
    const dec = new TextDecoder();
    header = JSON.parse(dec.decode(base64UrlDecode(parts[0])));
    payload = JSON.parse(dec.decode(base64UrlDecode(parts[1])));
  } catch {
    throw new Error('Failed to decode Google JWT.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Google sign-in token expired. Please try again.');
  }
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Untrusted token issuer.');
  }
  if (payload.aud !== expectedClientId) {
    throw new Error('Token audience mismatch.');
  }
  if (!payload.sub || !payload.email) {
    throw new Error('Incomplete Google account profile.');
  }
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Google email address must be verified.');
  }

  let jwks = await fetchGoogleJwks(false);
  let jwk = Array.isArray(jwks.keys) ? jwks.keys.find((k) => k.kid === header.kid) : null;
  if (!jwk) {
    jwks = await fetchGoogleJwks(true);
    jwk = Array.isArray(jwks.keys) ? jwks.keys.find((k) => k.kid === header.kid) : null;
  }
  if (!jwk) {
    throw new Error('Matching Google signing key not found.');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signatureBytes = base64UrlDecode(parts[2]);
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signingInput
  );

  if (!verified) {
    throw new Error('Invalid Google ID token signature.');
  }

  return payload;
}

