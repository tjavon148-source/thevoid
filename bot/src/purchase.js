// Stripe purchases -> short purchase codes -> Discord Buyer role. Codes live in KV (binding AGREEMENTS, keys prefixed).
// Flow: Stripe webhook makes a code, the thank-you page shows it, the buyer runs /claim <code> in Discord.
const API = 'https://discord.com/api/v10';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L
const enc = new TextEncoder();

export function makeCode(rand = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const b = rand(8), ch = (i) => ALPHABET[b[i] % ALPHABET.length];
  return `VOID-${ch(0)}${ch(1)}${ch(2)}${ch(3)}-${ch(4)}${ch(5)}${ch(6)}${ch(7)}`;
}
export const normCode = (s) => {
  const c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 12 && c.startsWith('VOID') ? `VOID-${c.slice(4, 8)}-${c.slice(8)}` : null;
};

const toHex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
export async function verifyStripeSignature(header, body, secret, nowSec = Math.floor(Date.now() / 1000), tolerance = 300) {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const t = parts.find((p) => p[0] === 't')?.[1];
  const sigs = parts.filter((p) => p[0] === 'v1').map((p) => p[1]);
  if (!t || !sigs.length || Math.abs(nowSec - Number(t)) > tolerance) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)));
  return sigs.some((s) => s.length === expected.length && s.split('').reduce((d, c, i) => d | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

const getJson = async (kv, k) => { const v = await kv.get(k); return v ? JSON.parse(v) : null; };
const putJson = (kv, k, o) => kv.put(k, JSON.stringify(o));

async function roleCall(env, method, userId, reason, fetchFn) {
  const res = await fetchFn(`${API}/guilds/${env.GUILD_ID}/members/${userId}/roles/${env.BUYER_ROLE_ID}`, {
    method, headers: { authorization: `Bot ${env.DISCORD_TOKEN}`, 'x-audit-log-reason': encodeURIComponent(reason) } });
  if (!res.ok) throw new Error(`Discord said ${res.status}`);
}

async function newUniqueCode(kv) {
  for (let n = 0; n < 5; n++) { const c = makeCode(); if (!(await kv.get(`purchase:${c}`))) return c; }
  throw new Error('could not make a unique code');
}

// Stripe webhook events we act on. Returns a short string for logs/tests.
export async function handleStripeEvent(event, env, fetchFn = fetch, now = () => Date.now()) {
  const kv = env.AGREEMENTS, o = event.data?.object || {};
  if (event.type === 'checkout.session.completed') {
    if (o.payment_status !== 'paid') return 'ignored: not paid';
    if (await kv.get(`session:${o.id}`)) return 'duplicate';
    const code = await newUniqueCode(kv);
    const email = (o.customer_details?.email || o.customer_email || '').toLowerCase();
    await putJson(kv, `purchase:${code}`, { session: o.id, pi: o.payment_intent || null, email, status: 'unclaimed', claimedBy: null, ts: now() });
    await kv.put(`session:${o.id}`, code);
    if (o.payment_intent) await kv.put(`pi:${o.payment_intent}`, code);
    if (email) await kv.put(`email:${email}`, code);
    return `created ${code}`;
  }
  if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    const pi = o.payment_intent;
    const code = pi && await kv.get(`pi:${pi}`);
    if (!code) return 'ignored: unknown payment';
    if (event.type === 'charge.refunded' && !o.refunded) return 'ignored: partial refund';
    const rec = await getJson(kv, `purchase:${code}`);
    if (!rec || rec.status === 'revoked') return 'already revoked';
    const holder = rec.claimedBy;
    await putJson(kv, `purchase:${code}`, { ...rec, status: 'revoked', revokedBy: event.type, revokedTs: now() });
    if (holder) { try { await roleCall(env, 'DELETE', holder, 'Purchase refunded or disputed', fetchFn); } catch (e) { console.error('role removal failed', e.message); } }
    return `revoked ${code}`;
  }
  return 'ignored';
}

// The thank-you page asks for the code by Stripe session id. The id is long and random, and the code only exists after a verified paid webhook.
export async function codeForSession(sessionId, env) {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sessionId || '')) return { status: 'bad-request' };
  const code = await env.AGREEMENTS.get(`session:${sessionId}`);
  if (!code) return { status: 'pending' };
  const rec = await getJson(env.AGREEMENTS, `purchase:${code}`);
  if (rec?.status === 'revoked') return { status: 'revoked' };
  return { status: 'ready', code };
}

// /claim: one purchase gives one Discord account the Buyer role. The same account can run it again safely.
export async function claimCode(raw, userId, env, fetchFn = fetch, now = () => Date.now()) {
  const code = normCode(raw), kv = env.AGREEMENTS;
  if (!code) return 'That does not look like a purchase code. It looks like `VOID-ABCD-EFGH` and is shown on the page after you pay.';
  const rec = await getJson(kv, `purchase:${code}`);
  if (!rec) return 'I do not know that code. Check it against the page you were sent to after paying, or message the owner.';
  if (rec.status === 'revoked') return 'That purchase was refunded, so the code no longer works. Message the owner if this is a mistake.';
  if (rec.claimedBy && rec.claimedBy !== userId) return 'That code was already used on another Discord account. Message the owner if that was not you.';
  try { await roleCall(env, 'PUT', userId, 'Claimed purchase code', fetchFn); }
  catch { return 'I could not give you the role. Tell the owner: my role must sit above Buyer.'; }
  if (!rec.claimedBy) await putJson(kv, `purchase:${code}`, { ...rec, status: 'claimed', claimedBy: userId, claimedTs: now() });
  return `You are in. You now have the Buyer role. Open <#${env.GET_IT_CHANNEL_ID}> and press **Get my key**, or use the key channel.`;
}

// /purchase (owner): find a code by buyer email, for people who lost theirs.
export async function lookupByEmail(email, env) {
  const code = await env.AGREEMENTS.get(`email:${String(email || '').trim().toLowerCase()}`);
  if (!code) return 'No purchase found for that email.';
  const rec = await getJson(env.AGREEMENTS, `purchase:${code}`);
  return `Code \`${code}\` is **${rec?.status || 'unknown'}**${rec?.claimedBy ? ` (claimed by <@${rec.claimedBy}>)` : ''}. Send it to them privately.`;
}
