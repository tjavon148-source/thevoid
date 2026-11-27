// Anonymous click counters for the website: Buy and Discord button clicks, per day, with an optional campaign tag (?ref=name).
// No cookies, no IP addresses, no user agent and nothing about the person is stored: only daily totals.
// KV's free plan allows 1,000 writes a day and purchases need them too, so this keeps ONE small record per day and stops
// counting after DAILY_CAP clicks. Page views are left to Cloudflare Web Analytics.
const EVENTS = new Set(['buy', 'discord']);
const REF = /^[a-z0-9-]{1,24}$/;
export const DAILY_CAP = 400, MAX_REFS = 30;
const dayKey = (now) => 'stat:' + new Date(now).toISOString().slice(0, 10);

export async function recordClick(raw, origin, env, now = Date.now()) {
  const site = env.SITE_ORIGIN || 'https://gethevoid.com';
  if (origin !== site || !env.AGREEMENTS) return 'ignored';
  let body; try { body = JSON.parse(raw); } catch { return 'ignored'; }
  const e = body && body.e, ref = body && typeof body.r === 'string' && REF.test(body.r) ? body.r : null;
  if (!EVENTS.has(e)) return 'ignored';
  const key = dayKey(now);
  const day = JSON.parse((await env.AGREEMENTS.get(key)) || '{"n":0,"buy":0,"discord":0,"refs":{}}');
  if (day.n >= DAILY_CAP) return 'capped';
  day.n++; day[e]++;
  if (ref && (day.refs[ref] || Object.keys(day.refs).length < MAX_REFS)) { day.refs[ref] = day.refs[ref] || { buy: 0, discord: 0 }; day.refs[ref][e]++; }
  await env.AGREEMENTS.put(key, JSON.stringify(day), { expirationTtl: 400 * 86400 });
  return 'counted';
}
