import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInteraction } from '../src/worker.js';
import worker from '../src/worker.js';
import { parseDuration, shuffle, runDue, GW } from '../src/giveaway.js';

const mkKv = () => { const m = new Map(); return { m,
  get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); },
  list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) }; };
const base = { GUILD_ID: 'g1', ADMIN_USER_ID: 'admin1', AGREED_ROLE_ID: 'r-agreed', BUYER_ROLE_ID: 'r-buyer', DISCORD_TOKEN: 'tok', KEY_CHANNEL_ID: 'c-key' };
const mkEnv = () => ({ ...base, AGREEMENTS: mkKv() });
// fake Discord: members map id -> roles (absent = left the server). Records every call.
const discord = (members = {}, { failRole = false, failPost = false } = {}) => { const calls = []; let n = 0;
  const f = async (url, init = {}) => { const method = init.method || 'GET'; calls.push({ method, url, body: init.body && JSON.parse(init.body) });
    const mm = /members\/(\w+)$/.exec(url);
    if (method === 'GET' && mm) return members[mm[1]] ? { ok: true, status: 200, json: async () => ({ roles: members[mm[1]] }) } : { ok: false, status: 404 };
    if (method === 'POST' && /\/messages$/.test(url)) return failPost ? { ok: false, status: 403 } : { ok: true, status: 200, json: async () => ({ id: `msg${++n}` }) };
    if (method === 'PUT' && /roles/.test(url)) return failRole ? { ok: false, status: 403 } : { ok: true, status: 204 };
    return { ok: true, status: 200, json: async () => ({}) }; };
  return { f, calls }; };
const cmd = (sub, opts, uid = 'admin1') => ({ type: 2, channel_id: 'c-gw', member: { user: { id: uid }, roles: [] }, data: { name: 'giveaway', options: [{ type: 1, name: sub, options: Object.entries(opts).map(([name, value]) => ({ name, value })) }] } });
const press = (cid, uid, roles = ['r-agreed']) => ({ type: 3, member: { user: { id: uid }, roles }, data: { custom_id: cid } });
const seq = (...v) => { let k = 0; return () => v[k++ % v.length]; };
const T0 = 1_000_000_000_000;

test('duration parsing', () => {
  assert.equal(parseDuration('30m'), 30 * 60e3); assert.equal(parseDuration('2h'), 2 * 3600e3); assert.equal(parseDuration('1w'), 7 * 86400e3);
  for (const bad of ['', '0m', '45s', '31d', 'soon', '-1h', '1 hour']) assert.equal(parseDuration(bad), null, bad);
});
test('only the owner can run /giveaway', async () => {
  const { f } = discord(); const r = await handleInteraction(cmd('start', { prize: 'x', duration: '1h' }, 'someone'), mkEnv(), f);
  assert.match(r.data.content, /Only the owner/);
});
test('start posts the Enter button message and stores the giveaway', async () => {
  const env = mkEnv(), { f, calls } = discord();
  const r = await handleInteraction(cmd('start', { prize: 'The Void', duration: '2h', winners: 2, grant_access: true }), env, f, () => T0);
  assert.match(r.data.content, /is live/); assert.match(r.data.content, /Buyer role automatically/);
  const post = calls.find((c) => c.method === 'POST'); assert.match(post.url, /channels\/c-gw\/messages$/);
  assert.equal(post.body.components[0].components[0].label, 'Enter'); assert.match(post.body.embeds[0].title, /The Void/);
  const key = [...env.AGREEMENTS.m.keys()].find((k) => k.startsWith('gw:')); const gw = JSON.parse(env.AGREEMENTS.m.get(key));
  assert.equal(gw.winners, 2); assert.equal(gw.endsAt, T0 + 2 * 3600e3); assert.equal(gw.messageId, 'msg1'); assert.equal(gw.grantAccess, true);
});
test('start validates input and explains a posting failure', async () => {
  const env = mkEnv(), { f } = discord();
  assert.match((await handleInteraction(cmd('start', { prize: 'x', duration: 'soon' }), env, f)).data.content, /Duration looks like/);
  assert.match((await handleInteraction(cmd('start', { prize: 'x', duration: '1h', winners: 99 }), env, f)).data.content, /1 to 10/);
  assert.match((await handleInteraction(cmd('start', { prize: ' ', duration: '1h' }), env, f)).data.content, /prize/);
  const bad = discord({}, { failPost: true });
  assert.match((await handleInteraction(cmd('start', { prize: 'x', duration: '1h' }), env, bad.f)).data.content, /could not post/);
  assert.equal([...env.AGREEMENTS.m.keys()].length, 0);
});

async function live(env, f, opts = {}) {
  await handleInteraction(cmd('start', { prize: 'The Void', duration: '1h', ...opts }), env, f, () => T0);
  const id = [...env.AGREEMENTS.m.keys()].find((k) => k.startsWith('gw:')).slice(3); return id;
}
test('entering: needs Agreed, counts once, leave button works, ended giveaways refuse', async () => {
  const env = mkEnv(), { f } = discord(); const id = await live(env, f);
  assert.match((await handleInteraction(press(GW.enter + id, 'u1', []), env, f, () => T0 + 1000)).data.content, /accept the server rules/);
  assert.match((await handleInteraction(press(GW.enter + id, 'u1'), env, f, () => T0 + 1000)).data.content, /You're in/);
  const again = (await handleInteraction(press(GW.enter + id, 'u1'), env, f, () => T0 + 2000)).data;
  assert.match(again.content, /already in/); assert.equal(again.components[0].components[0].custom_id, GW.leave + id);
  assert.equal([...env.AGREEMENTS.m.keys()].filter((k) => k.startsWith('gwe:')).length, 1);
  assert.match((await handleInteraction(press(GW.leave + id, 'u1'), env, f, () => T0 + 3000)).data.content, /You left/);
  assert.equal([...env.AGREEMENTS.m.keys()].filter((k) => k.startsWith('gwe:')).length, 0);
  assert.match((await handleInteraction(press(GW.enter + id, 'u1'), env, f, () => T0 + 7200e3)).data.content, /has ended/);
  assert.match((await handleInteraction(press(GW.enter + 'nope00', 'u1'), env, f, () => T0)).data.content, /has ended/);
});
test('cron ends only due giveaways, skips people who left or lost the Agreed role, grants the role, announces', async () => {
  const env = mkEnv(), d = discord({ u1: ['r-agreed'], u2: ['r-agreed'], u3: [] /* lost Agreed */ /* u4 left */ });
  const id = await live(env, d.f, { winners: 2, grant_access: true });
  for (const u of ['u1', 'u2', 'u3', 'u4']) await handleInteraction(press(GW.enter + id, u), env, d.f, () => T0 + 1000);
  assert.equal(await runDue(env, d.f, () => T0 + 1800e3, seq(0.1)), 0, 'not due yet');
  d.calls.length = 0;
  assert.equal(await runDue(env, d.f, () => T0 + 3600e3 + 1, seq(0.1)), 1);
  const gw = JSON.parse(env.AGREEMENTS.m.get(`gw:${id}`));
  assert.equal(gw.status, 'ended'); assert.deepEqual([...gw.winnerIds].sort(), ['u1', 'u2']);
  const grants = d.calls.filter((c) => c.method === 'PUT'); assert.deepEqual(grants.map((c) => c.url.split('/members/')[1]).sort(), ['u1/roles/r-buyer', 'u2/roles/r-buyer']);
  const edit = d.calls.find((c) => c.method === 'PATCH'); assert.equal(edit.body.components.length, 0); assert.match(edit.body.embeds[0].description, /4 entries/);
  const msg = d.calls.find((c) => c.method === 'POST'); assert.match(msg.body.content, /Congratulations/); assert.match(msg.body.content, /<#c-key>/); assert.deepEqual([...msg.body.allowed_mentions.users].sort(), ['u1', 'u2']);
  assert.equal(await runDue(env, d.f, () => T0 + 9e9, seq(0.1)), 0, 'does not end twice');
});
test('no eligible entries: ends cleanly with no winner and no announcement', async () => {
  const env = mkEnv(), d = discord({}); const id = await live(env, d.f);
  await handleInteraction(press(GW.enter + id, 'ghost'), env, d.f, () => T0 + 1);
  d.calls.length = 0; await runDue(env, d.f, () => T0 + 3600e3 + 1);
  assert.match(d.calls.find((c) => c.method === 'PATCH').body.embeds[0].description, /no winner/); assert.equal(d.calls.some((c) => c.method === 'POST'), false);
});
test('role grant failure is reported to the winner announcement, not hidden', async () => {
  const env = mkEnv(), d = discord({ u1: ['r-agreed'] }, { failRole: true }); const id = await live(env, d.f, { grant_access: true });
  await handleInteraction(press(GW.enter + id, 'u1'), env, d.f, () => T0 + 1); d.calls.length = 0; await runDue(env, d.f, () => T0 + 3600e3 + 1);
  assert.match(d.calls.find((c) => c.method === 'POST').body.content, /could not give the Buyer role/);
});
test('manual end, cancel and reroll', async () => {
  const env = mkEnv(), d = discord({ u1: ['r-agreed'], u2: ['r-agreed'] }); const id = await live(env, d.f);
  for (const u of ['u1', 'u2']) await handleInteraction(press(GW.enter + id, u), env, d.f, () => T0 + 1);
  assert.match((await handleInteraction(cmd('reroll', { id }), env, d.f)).data.content, /Only a finished/);
  const end = await handleInteraction(cmd('end', { id }), env, d.f, () => T0 + 5, seq(0.1)); assert.match(end.data.content, /2 entries, 1 winner/);
  const first = JSON.parse(env.AGREEMENTS.m.get(`gw:${id}`)).winnerIds[0];
  const re = await handleInteraction(cmd('reroll', { id }), env, d.f, () => T0 + 6, seq(0.1)); const second = JSON.parse(env.AGREEMENTS.m.get(`gw:${id}`)).winnerIds[1];
  assert.notEqual(second, first); assert.match(re.data.content, new RegExp(`<@${second}>`));
  assert.match((await handleInteraction(cmd('reroll', { id }), env, d.f, () => T0 + 7, seq(0.1))).data.content, /No other eligible/);
  assert.match((await handleInteraction(cmd('end', { id }), env, d.f)).data.content, /already finished/);
  assert.match((await handleInteraction(cmd('end', { id: 'zzzzzz' }), env, d.f)).data.content, /do not know/);
  const id2 = await (async () => { const e2 = mkEnv(); const id = await live(e2, d.f); const c = await handleInteraction(cmd('cancel', { id }), e2, d.f); assert.match(c.data.content, /cancelled/);
    assert.match((await handleInteraction(press(GW.enter + id, 'u1'), e2, d.f, () => T0 + 1)).data.content, /has ended/); return id; })();
  assert.ok(id2);
});
test('shuffle is fair-shaped and the worker wires the cron handler', async () => {
  const counts = {}; for (let i = 0; i < 3000; i++) { const w = shuffle(['a', 'b', 'c'], Math.random)[0]; counts[w] = (counts[w] || 0) + 1; }
  for (const k of 'abc') assert.ok(counts[k] > 800 && counts[k] < 1200, `${k} ${counts[k]}`);
  assert.equal(typeof worker.scheduled, 'function');
});
