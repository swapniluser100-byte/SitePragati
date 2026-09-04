// Shared helpers for signing and verifying admin session tokens.
// Imported by login.js and _middleware.js — Cloudflare Pages Functions
// support relative imports between files in /functions.

async function sign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
}

async function verify(data, signature, secret) {
  const expected = await sign(data, secret);
  return expected === signature;
}

export async function createSessionToken(secret, ttlMs = 24 * 60 * 60 * 1000) {
  const expiry = String(Date.now() + ttlMs);
  const signature = await sign(expiry, secret);
  return `${expiry}.${signature}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;
  const valid = await verify(expiry, signature, secret);
  if (!valid) return false;
  return Number(expiry) > Date.now();
}

export function sessionCookie(token, maxAgeSeconds = 86400) {
  return `admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getCookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
