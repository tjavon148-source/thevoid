import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker, { handleInteraction } from '../src/worker.js';
import { makeCode, normCode, verifyStripeSignature, handleStripeEvent, codeForSession, claimCode, lookupByEmail } from '../src/purchase.js';

const kv = () => { const m = new Map(); return { m, put: async (k, v) => m.set(k, v), get: async (k) => m.get(k) ?? null }; };
const mkEnv = () => ({ GUILD_ID: 'g1', ADMIN_USER_ID: 'admin1', AGREED_ROLE_ID: 'r-a', BUYER_ROLE_ID: 'r-b', GET_IT_CHANNEL_ID: 'c1', DISCORD_TOKEN: 't', STRIPE_WEBHOOK_SECRET: 'whsec_x', AGREEMENTS: kv() });
const fetchLog = (log, ok = true) => async (u, i) => { log.push([i.method, u]); return { ok, status: ok ? 204 : 403 }; };
const paid = (id = 'cs_test_abcdefghij1', pi = 'pi_1') => ({ type: 'checkout.session.completed', data: { object: { id, payment_status: 'paid', payment_intent: pi, customer_details: { email: 'Buyer@Example.com' } } } });

test('code format and normalising', () => {
  assert.match(makeCode(), /^VOID-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(normCode(' void 7k3m q9xp '), 'VOID-7K3M-Q9XP'); assert.equal(normCode('hello'), null);
});
test('stripe signature: valid, tampered, stale', async () => {
  const body = '{"a":1}', t = 1700000000, sig = crypto.createHmac('sha256', 'whsec_x').update(`${t}.${body}`).digest('hex');
  assert.equal(await verifyStripeSignature(`t=${t},v1=${sig}`, body, 'whsec_x', t + 10), true);
  assert.equal(await verifyStripeSignature(`t=${t},v1=${sig}`, body + ' ', 'whsec_x', t + 10), false);
  assert.equal(await verifyStripeSignature(`t=${t},v1=${sig}`, body, 'whsec_x', t + 9999), false);
  assert.equal(await verifyStripeSignature(null, body, 'whsec_x', t), false);
});
test('paid checkout creates one code, duplicates ignored, unpaid ignored', async () => {
  const env = mkEnv();
  assert.match(await handleStripeEvent(paid(), env), /^created VOID-/);
  assert.equal(await handleStripeEvent(paid(), env), 'duplicate');
  assert.equal(await handleStripeEvent({ ...paid('cs_test_zzzzzzzzzz2'), data: { object: { id: 'cs_test_zzzzzzzzzz2', payment_status: 'unpaid' } } }, env), 'ignored: not paid');
  const r = await codeForSession('cs_test_abcdefghij1', env); assert.equal(r.status, 'ready'); assert.match(r.code, /^VOID-/);
  assert.equal((await codeForSession('cs_test_unknownunknown', env)).status, 'pending');
  assert.equal((await codeForSession('nope', env)).status, 'bad-request');
});
test('claim grants the role once, same user can retry, other user blocked, bad codes explained', async () => {
  const env = mkEnv(); await handleStripeEvent(paid(), env);
  const { code } = await codeForSession('cs_test_abcdefghij1', env), log = [];
  assert.match(await claimCode(code, 'u1', env, fetchLog(log)), /You are in/);
  assert.deepEqual(log[0], ['PUT', 'https://discord.com/api/v10/guilds/g1/members/u1/roles/r-b']);
  assert.match(await claimCode(code.toLowerCase(), 'u1', env, fetchLog(log)), /You are in/);
  assert.match(await claimCode(code, 'u2', env, fetchLog(log)), /already used/);
  assert.match(await claimCode('VOID-AAAA-AAAA', 'u1', env, fetchLog(log)), /do not know/);
  assert.match(await claimCode('x', 'u1', env, fetchLog(log)), /does not look like/);
});
test('failed role call leaves the code unclaimed', async () => {
  const env = mkEnv(); await handleStripeEvent(paid(), env);
  const { code } = await codeForSession('cs_test_abcdefghij1', env);
  assert.match(await claimCode(code, 'u1', env, fetchLog([], false)), /could not give/);
  assert.match(await claimCode(code, 'u2', env, fetchLog([])), /You are in/);
});
test('refund revokes the code and removes the role from whoever claimed it', async () => {
  const env = mkEnv(); await handleStripeEvent(paid(), env);
  const { code } = await codeForSession('cs_test_abcdefghij1', env), log = [];
  await claimCode(code, 'u1', env, fetchLog(log));
  assert.match(await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: true } } }, env, fetchLog(log)), /^revoked/);
  assert.equal(log.at(-1)[0], 'DELETE');
  assert.equal((await codeForSession('cs_test_abcdefghij1', env)).status, 'revoked');
  assert.match(await claimCode(code, 'u1', env, fetchLog(log)), /refunded/);
  assert.equal(await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: true } } }, env, fetchLog(log)), 'already revoked');
});
test('partial refund and unknown payment do nothing; dispute revokes', async () => {
  const env = mkEnv(); await handleStripeEvent(paid(), env);
  assert.match(await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: false } } }, env), /partial/);
  assert.match(await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_zzz', refunded: true } } }, env), /unknown/);
  assert.match(await handleStripeEvent({ type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_1' } } }, env), /^revoked/);
});
test('owner lookup by email', async () => {
  const env = mkEnv(); await handleStripeEvent(paid(), env);
  assert.match(await lookupByEmail('buyer@example.com', env), /VOID-.*unclaimed/);
  assert.match(await lookupByEmail('x@y.z', env), /No purchase/);
});
test('worker routes: webhook needs signature, purchase endpoint has CORS, /claim and /purchase commands', async () => {
  const env = mkEnv();
  assert.equal((await worker.fetch(new Request('https://w/stripe', { method: 'POST', body: '{}' }), env)).status, 400);
  const body = JSON.stringify(paid()), t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', 'whsec_x').update(`${t}.${body}`).digest('hex');
  assert.equal((await worker.fetch(new Request('https://w/stripe', { method: 'POST', body, headers: { 'stripe-signature': `t=${t},v1=${sig}` } }), env)).status, 200);
  const res = await worker.fetch(new Request('https://w/purchase?session_id=cs_test_abcdefghij1'), env);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://gethevoid.com');
  const { code } = await res.json();
  const cmd = (name, value, uid = 'u1', roles = ['r-a']) => ({ type: 2, member: { user: { id: uid }, roles }, data: { name, options: [{ name: name === 'claim' ? 'code' : 'email', value }] } });
  assert.match((await handleInteraction(cmd('claim', code), env, fetchLog([]))).data.content, /You are in/);
  assert.match((await handleInteraction(cmd('claim', code, 'u3', []), env, fetchLog([]))).data.content, /agreement/);
  assert.match((await handleInteraction(cmd('purchase', 'buyer@example.com', 'u1'), env)).data.content, /Only the owner/);
  assert.match((await handleInteraction(cmd('purchase', 'buyer@example.com', 'admin1'), env)).data.content, /claimed/);
});
