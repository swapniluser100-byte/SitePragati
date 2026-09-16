// Shared helpers for signing/verifying session tokens and hashing
// passwords. Used by both the admin console and the customer portal —
// they use separate cookie names so the two sessions never collide.

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
}

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}

// data: any small JSON-serializable object to embed in the token
// (e.g. { customerId: 5 }). Signed so it can't be tampered with client-side.
export async function createSessionToken(secret, data = {}, ttlMs = 24 * 60 * 60 * 1000) {
  const payload = JSON.stringify({ ...data, exp: Date.now() + ttlMs });
  const payloadB64 = btoa(payload);
  const signature = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

// Returns the embedded payload object if the token is valid and not
// expired, or null otherwise.
export async function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const valid = await hmacVerify(payloadB64, signature, secret);
  if (!valid) return null;

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export function sessionCookie(cookieName, token, maxAgeSeconds = 86400) {
  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(cookieName) {
  return `${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getCookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ===== Password hashing (PBKDF2 via Web Crypto — no external deps) =====

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const saltHex = toHex(salt);
  const hashHex = toHex(new Uint8Array(hashBuffer));
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = fromHex(saltHex);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return toHex(new Uint8Array(hashBuffer)) === hashHex;
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Generates a random alphanumeric ID of the given length (default 15) —
// used for customer-facing reference IDs. Not a security token, just a
// stable, hard-to-guess identifier.
export function generateRandomId(length = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

// Generates a short, human-readable random code — uppercase letters and
// digits only, with visually ambiguous characters (I, O, 0, 1) removed —
// for reference numbers a customer might read aloud, type back in, or
// quote over the phone (e.g. a support ticket/request number). At length
// 6 this has ~33^6 (~1.3 billion) possibilities, plenty to make guessing
// impractical without being unreadable.
export function generateReadableCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

// Generates a generateReadableCode() that isn't already used by another
// ticket. Collisions are astronomically unlikely at this scale (~1.3
// billion possibilities), but this guards against them rather than
// assuming they can't happen. Used wherever a ticket is created or
// backfilled with a reference_code.
export async function generateUniqueTicketCode(env) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReadableCode();
    const existing = await env.DB.prepare(
      'SELECT id FROM tickets WHERE reference_code = ?'
    ).bind(code).first();
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique reference code — please try again.');
}

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
