import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { recordClick, DAILY_CAP } from '../src/stats.js';

const kv = () => { const m = new Map(); return { m, put: async (k, v) => m.set(k, v), get: async (k) => m.get(k) ?? null }; };
const mk = () => ({ AGREEMENTS: kv() });
const T = Date.UTC(2026, 10, 27, 12);

test('counts a buy click with its campaign tag', async () => {
  const env = mk();
  assert.equal(await recordClick('{"e":"buy","r":"tiktok-ann"}', 'https://gethevoid.com', env, T), 'counted');
  const day = JSON.parse(env.AGREEMENTS.m.get('stat:2026-11-27'));
  assert.deepEqual(day, { n: 1, buy: 1, discord: 0, refs: { 'tiktok-ann': { buy: 1, discord: 0 } } });
});
test('ignores other origins, unknown events and junk', async () => {
  const env = mk();
  assert.equal(await recordClick('{"e":"buy"}', 'https://evil.example', env, T), 'ignored');
  assert.equal(await recordClick('{"e":"view"}', 'https://gethevoid.com', env, T), 'ignored');
  assert.equal(await recordClick('not json', 'https://gethevoid.com', env, T), 'ignored');
  assert.equal(env.AGREEMENTS.m.size, 0);
});
test('drops a malformed campaign tag but still counts the click', async () => {
  const env = mk();
  await recordClick('{"e":"discord","r":"Bad Tag!"}', 'https://gethevoid.com', env, T);
  const day = JSON.parse(env.AGREEMENTS.m.get('stat:2026-11-27'));
  assert.equal(day.discord, 1); assert.deepEqual(day.refs, {});
});
test('stops counting at the daily cap so purchases keep their write budget', async () => {
  const env = mk(); env.AGREEMENTS.m.set('stat:2026-11-27', JSON.stringify({ n: DAILY_CAP, buy: DAILY_CAP, discord: 0, refs: {} }));
  assert.equal(await recordClick('{"e":"buy"}', 'https://gethevoid.com', env, T), 'capped');
});
test('the /e route answers 204 and handles preflight', async () => {
  const env = mk();
  const post = await worker.fetch(new Request('https://bot.example/e', { method: 'POST', headers: { origin: 'https://gethevoid.com' }, body: '{"e":"buy"}' }), env);
  assert.equal(post.status, 204);
  const pre = await worker.fetch(new Request('https://bot.example/e', { method: 'OPTIONS', headers: { origin: 'https://gethevoid.com' } }), env);
  assert.equal(pre.status, 204); assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
});
