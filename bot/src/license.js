// Signs personal keys for The Void. A key is  VOID1.<payload>.<signature>  (all base64url).
// The payload is {"u":"<discord user id>","k":"buyer|gift|giveaway"}. The extension holds only the PUBLIC key and checks
// the signature on the buyer's own computer, so nothing is sent anywhere. The private key is the Worker secret SIGNING_KEY
// (a base64 32-byte seed) and must never be committed or pasted into chat.
const PKCS8_ED25519_PREFIX = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
export const KINDS = ['buyer', 'gift', 'giveaway'];

const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function signKey(seedB64, userId, kind = 'buyer') {
  if (!seedB64) throw new Error('no-signing-key');
  if (!/^\d{5,25}$/.test(String(userId))) throw new Error('bad-user');
  if (!KINDS.includes(kind)) throw new Error('bad-kind');
  const seed = fromB64(seedB64.trim());
  if (seed.length !== 32) throw new Error('bad-signing-key');
  const pkcs8 = new Uint8Array(PKCS8_ED25519_PREFIX.length + 32);
  pkcs8.set(PKCS8_ED25519_PREFIX); pkcs8.set(seed, PKCS8_ED25519_PREFIX.length);
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);
  const payload = b64u(new TextEncoder().encode(JSON.stringify({ u: String(userId), k: kind })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(`VOID1.${payload}`)));
  return `VOID1.${payload}.${b64u(sig)}`;
}
