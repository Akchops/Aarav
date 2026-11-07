/**
 * Signed form timestamps. The Contact page middleware injects `t = <ms>.<hmac>`
 * into the form; the contact function rejects tokens that are forged, older than
 * 24h, or used less than 3s after the page was served (a bot, not a person).
 */
const enc = new TextEncoder();

async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacHex(secret: string, data: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(data)));
}

export async function makeToken(secret: string, now = Date.now()): Promise<string> {
  return `${now}.${await hmacHex(secret, `form:${now}`)}`;
}

export type TokenCheck = 'ok' | 'invalid' | 'too-fast' | 'expired';

export async function checkToken(secret: string, token: string, now = Date.now()): Promise<TokenCheck> {
  const m = /^(\d{10,16})\.([0-9a-f]{64})$/.exec(token || '');
  if (!m) return 'invalid';
  const ts = Number(m[1]);
  const expected = await hmacHex(secret, `form:${ts}`);
  // Constant-time compare of equal-length hex strings.
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ m[2].charCodeAt(i);
  if (diff !== 0) return 'invalid';
  if (now - ts < 3000) return 'too-fast';
  if (now - ts > 24 * 60 * 60 * 1000) return 'expired';
  return 'ok';
}
