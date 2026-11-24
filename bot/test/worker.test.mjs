import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker, { handleInteraction, verifySignature, IDS } from '../src/worker.js';

const env = { GUILD_ID: 'g1', ADMIN_USER_ID: 'admin1', AGREED_ROLE_ID: 'r-agreed', BUYER_ROLE_ID: 'r-buyer', GET_IT_CHANNEL_ID: 'c-getit',
  PAYMENT_LINK_URL: 'https://whop.com/the-void-619c/the-void-b1/', PRICE_LABEL: '$15', AGREEMENT_VERSION: 'v1', DISCORD_TOKEN: 'tok' };
const mkFetch = (log, ok = true) => async (url, init) => { log.push([init.method, url, init.headers.authorization]); return { ok, status: ok ? 204 : 403 }; };
const kv = () => { const m = new Map(); return { m, put: async (k, v) => m.set(k, v) }; };
const btn = (id, roles = [], uid = 'u1') => ({ type: 3, member: { user: { id: uid }, roles }, data: { custom_id: id } });

test('ping gets a pong', async () => assert.deepEqual(await handleInteraction({ type: 1 }, env), { type: 1 }));

test('agree gives the Agreed role and records it', async () => {
  const log = [], e = { ...env, AGREEMENTS: kv() };
  const r = await handleInteraction(btn(IDS.agree), e, mkFetch(log), () => 123);
  assert.equal(log[0][0], 'PUT'); assert.match(log[0][1], /guilds\/g1\/members\/u1\/roles\/r-agreed$/); assert.equal(log[0][2], 'Bot tok');
  assert.match(r.data.content, /<#c-getit>/); assert.equal(r.data.flags, 64);
  assert.deepEqual(JSON.parse(e.AGREEMENTS.m.get('agree:u1')), { version: 'v1', ts: 123 });
});
test('agree reports a failed role call without recording', async () => {
  const e = { ...env, AGREEMENTS: kv() };
  const r = await handleInteraction(btn(IDS.agree), e, mkFetch([], false));
  assert.match(r.data.content, /must sit above/); assert.equal(e.AGREEMENTS.m.size, 0);
});
test('pay link needs agreement, hides from buyers, otherwise returns the Whop link', async () => {
  assert.match((await handleInteraction(btn(IDS.payLink, []), env)).data.content, /accept the agreement/);
  assert.match((await handleInteraction(btn(IDS.payLink, ['r-agreed', 'r-buyer']), env)).data.content, /already have/);
  const ok = (await handleInteraction(btn(IDS.payLink, ['r-agreed']), env)).data.content;
  assert.match(ok, /whop\.com\/the-void-619c\/the-void-b1\//); assert.match(ok, /Claim Access/);
});
test('grant and revoke are owner only and call the right method', async () => {
  const cmd = (name, uid) => ({ type: 2, member: { user: { id: uid }, roles: [] }, data: { name, options: [{ name: 'user', value: 'target9' }] } });
  assert.match((await handleInteraction(cmd('grant', 'someone'), env, mkFetch([]))).data.content, /Only the owner/);
  const log = [];
  await handleInteraction(cmd('grant', 'admin1'), env, mkFetch(log)); await handleInteraction(cmd('revoke', 'admin1'), env, mkFetch(log));
  assert.deepEqual(log.map((l) => l[0]), ['PUT', 'DELETE']); assert.match(log[0][1], /members\/target9\/roles\/r-buyer$/);
});
test('signature check accepts a real signature and rejects tampering', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const ts = '1700000000', body = '{"type":1}', sig = crypto.sign(null, Buffer.from(ts + body), privateKey).toString('hex');
  const req = (s, t) => new Request('https://x/', { method: 'POST', headers: { 'x-signature-ed25519': s, 'x-signature-timestamp': t }, body });
  assert.equal(await verifySignature(req(sig, ts), body, pub), true);
  assert.equal(await verifySignature(req(sig, '1700000001'), body, pub), false);
  const res = await worker.fetch(req(sig, ts), { ...env, DISCORD_PUBLIC_KEY: pub });
  assert.deepEqual(await res.json(), { type: 1 });
  assert.equal((await worker.fetch(req('00'.repeat(64), ts), { ...env, DISCORD_PUBLIC_KEY: pub })).status, 401);
});
