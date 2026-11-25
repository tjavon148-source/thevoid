// Giveaways for The Void. The owner runs /giveaway start in a channel; the bot posts it with an Enter button. Entries live in the
// same KV store as the agreements. A Cloudflare cron (every 5 minutes) ends giveaways whose time is up, picks winners at random from
// members who are still in the server and still have the Agreed role, announces them, and (if asked) gives them the Buyer role.
const API = 'https://discord.com/api/v10';
export const GW = { enter: 'void:gw:', leave: 'void:gwl:' };
const KEEP = 60 * 60 * 24 * 120;   // keep records 120 days so a reroll still works
const UNITS = { m: 60e3, h: 3600e3, d: 86400e3, w: 604800e3 };
const reply = (content, components) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] }, ...(components ? { components } : {}) } });
const hdr = (env) => ({ authorization: `Bot ${env.DISCORD_TOKEN}`, 'content-type': 'application/json' });

export const secureRand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
export function shuffle(list, rand) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function parseDuration(s) {
  const m = /^(\d{1,3})\s*([mhdw])$/i.exec(String(s || '').trim());
  if (!m) return null;
  const ms = Number(m[1]) * UNITS[m[2].toLowerCase()];
  return ms >= 60e3 && ms <= 30 * 86400e3 ? ms : null;
}
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
const newId = (rand) => Array.from({ length: 6 }, () => ALPHA[Math.floor(rand() * ALPHA.length)]).join('');

const getGw = async (env, id) => { const v = await env.AGREEMENTS?.get(`gw:${id}`); return v ? JSON.parse(v) : null; };
const putGw = (env, gw) => env.AGREEMENTS.put(`gw:${gw.id}`, JSON.stringify(gw), { expirationTtl: KEEP });
async function listKeys(env, prefix) {
  const out = []; let cursor;
  do { const r = await env.AGREEMENTS.list({ prefix, cursor }); out.push(...r.keys.map((k) => k.name)); cursor = r.list_complete ? undefined : r.cursor; } while (cursor);
  return out;
}
const entriesOf = async (env, id) => (await listKeys(env, `gwe:${id}:`)).map((k) => k.slice(`gwe:${id}:`.length));

function card(gw, state) {
  const ends = Math.floor(gw.endsAt / 1000), s = (n) => (n === 1 ? '' : 's');
  let desc;
  if (!state) desc = ['Press **Enter** to join. You need to have accepted the server rules.', `Winners: **${gw.winners}**`, `Ends <t:${ends}:R> (<t:${ends}:f>)`,
    'No purchase needed. Winners are picked at random from members who are still in the server when it ends.'].join('\n');
  else if (state.cancelled) desc = 'This giveaway was cancelled.';
  else desc = [`Ended with ${state.entries} entr${state.entries === 1 ? 'y' : 'ies'}.`,
    state.winners.length ? `Winner${s(state.winners.length)}: ${state.winners.map((w) => `<@${w}>`).join(', ')}` : 'No eligible entries, so there is no winner.'].join('\n');
  return { embeds: [{ title: `Giveaway: ${gw.prize}`, description: desc, color: state ? 0x5c000f : 0xe0102a, footer: { text: `ID ${gw.id}` } }],
    components: state ? [] : [{ type: 1, components: [{ type: 2, style: 1, label: 'Enter', custom_id: GW.enter + gw.id }] }], allowed_mentions: { parse: [] } };
}

async function stillEligible(env, id, fetchFn) {
  try { const r = await fetchFn(`${API}/guilds/${env.GUILD_ID}/members/${id}`, { headers: hdr(env) }); if (!r.ok) return false; const m = await r.json(); return (m.roles || []).includes(env.AGREED_ROLE_ID); }
  catch { return false; }
}
async function pick(env, gw, pool, count, fetchFn, rand) {
  const winners = [];
  for (const id of shuffle(pool, rand)) { if (winners.length >= count) break; if (await stillEligible(env, id, fetchFn)) winners.push(id); }
  return winners;
}
async function giveAccess(env, gw, winners, fetchFn) {
  if (!gw.grantAccess) return [];
  const failed = [];
  for (const id of winners) {
    try { const r = await fetchFn(`${API}/guilds/${env.GUILD_ID}/members/${id}/roles/${env.BUYER_ROLE_ID}`, { method: 'PUT', headers: { authorization: `Bot ${env.DISCORD_TOKEN}`, 'x-audit-log-reason': encodeURIComponent(`Won giveaway ${gw.id}`) } }); if (!r.ok) failed.push(id); }
    catch { failed.push(id); }
  }
  return failed;
}
async function announce(env, gw, winners, failed, fetchFn, again = false) {
  const keyWhere = env.KEY_CHANNEL_ID ? `<#${env.KEY_CHANNEL_ID}>` : 'the get-your-key channel';
  const lines = [`${again ? 'New winner' : 'Congratulations'} ${winners.map((w) => `<@${w}>`).join(' ')}! You won **${gw.prize}**.`];
  if (gw.grantAccess) lines.push(`You now have the Buyer role. Press **Get my key** in ${keyWhere}, then download The Void.`);
  else lines.push('The owner will message you about your prize.');
  if (failed.length) lines.push(`(I could not give the Buyer role to ${failed.map((w) => `<@${w}>`).join(' ')}, so the owner will do it by hand.)`);
  await fetchFn(`${API}/channels/${gw.channelId}/messages`, { method: 'POST', headers: hdr(env),
    body: JSON.stringify({ content: lines.join('\n'), allowed_mentions: { users: winners }, message_reference: { message_id: gw.messageId, fail_if_not_exists: false } }) });
}

/** Ends one giveaway now: picks winners, edits the post, announces. Returns a one-line summary for the owner. */
export async function endGiveaway(env, gw, fetchFn = fetch, rand = secureRand) {
  gw.status = 'ended'; await putGw(env, gw);                       // mark first so an overlapping cron run cannot do it twice
  const entries = await entriesOf(env, gw.id);
  const winners = await pick(env, gw, entries, gw.winners, fetchFn, rand);
  gw.winnerIds = winners; await putGw(env, gw);
  const failed = await giveAccess(env, gw, winners, fetchFn);
  await fetchFn(`${API}/channels/${gw.channelId}/messages/${gw.messageId}`, { method: 'PATCH', headers: hdr(env), body: JSON.stringify(card(gw, { entries: entries.length, winners })) });
  if (winners.length) await announce(env, gw, winners, failed, fetchFn);
  return `Giveaway ${gw.id} ended: ${entries.length} entries, ${winners.length} winner${winners.length === 1 ? '' : 's'}${failed.length ? ` (${failed.length} role grant failed)` : ''}.`;
}

/** Called by the cron: ends everything that is due. */
export async function runDue(env, fetchFn = fetch, now = () => Date.now(), rand = secureRand) {
  if (!env.AGREEMENTS) return 0;
  let n = 0;
  for (const k of await listKeys(env, 'gw:')) {
    const gw = await getGw(env, k.slice(3));
    if (gw && gw.status === 'open' && gw.endsAt <= now()) { try { await endGiveaway(env, gw, fetchFn, rand); n++; } catch (e) { console.error('giveaway end failed', gw.id, e); } }
  }
  return n;
}

export async function handleGiveawayButton(i, env, now = () => Date.now()) {
  const cid = i.data.custom_id, userId = i.member?.user?.id || i.user?.id, roles = i.member?.roles || [];
  const leaving = cid.startsWith(GW.leave), id = cid.slice((leaving ? GW.leave : GW.enter).length);
  const gw = await getGw(env, id);
  if (!gw || gw.status !== 'open' || now() >= gw.endsAt) return reply('This giveaway has ended.');
  const key = `gwe:${id}:${userId}`;
  if (leaving) { await env.AGREEMENTS.delete(key); return reply('You left the giveaway. Press Enter again if you change your mind.'); }
  if (!roles.includes(env.AGREED_ROLE_ID)) return reply('Read and accept the server rules first, then press Enter again.');
  if (await env.AGREEMENTS.get(key)) return reply("You're already in. Good luck!", [{ type: 1, components: [{ type: 2, style: 4, label: 'Leave giveaway', custom_id: GW.leave + id }] }]);
  await env.AGREEMENTS.put(key, '1', { expirationTtl: KEEP });
  return reply(`You're in. Winners are picked <t:${Math.floor(gw.endsAt / 1000)}:R>. Good luck!`);
}

export async function handleGiveawayCommand(i, env, fetchFn = fetch, now = () => Date.now(), rand = secureRand) {
  const sub = i.data.options?.[0];
  if (!sub) return reply('Use /giveaway start, end, reroll or cancel.');
  const o = Object.fromEntries((sub.options || []).map((x) => [x.name, x.value]));
  if (!env.AGREEMENTS) return reply('Giveaways need the storage binding. Tell Claude.');
  if (sub.name === 'start') {
    const prize = String(o.prize || '').trim().slice(0, 100), winners = o.winners ?? 1, ms = parseDuration(o.duration);
    if (!prize) return reply('Give the giveaway a prize.');
    if (!Number.isInteger(winners) || winners < 1 || winners > 10) return reply('Winners must be a whole number from 1 to 10.');
    if (!ms) return reply('Duration looks like 30m, 6h, 3d or 1w (1 minute to 30 days).');
    const gw = { id: newId(rand), prize, winners, endsAt: now() + ms, status: 'open', channelId: i.channel_id, grantAccess: !!o.grant_access, createdBy: i.member?.user?.id };
    const res = await fetchFn(`${API}/channels/${i.channel_id}/messages`, { method: 'POST', headers: hdr(env), body: JSON.stringify(card(gw)) });
    if (!res.ok) return reply('I could not post in this channel. Give the bot permission to send messages and embed links here.');
    gw.messageId = (await res.json()).id; await putGw(env, gw);
    return reply(`Giveaway **${gw.id}** is live. It ends <t:${Math.floor(gw.endsAt / 1000)}:R>${gw.grantAccess ? ' and winners get the Buyer role automatically' : ''}. End it early with /giveaway end ${gw.id}.`);
  }
  const gw = await getGw(env, String(o.id || '').trim().toLowerCase());
  if (!gw) return reply('I do not know that giveaway ID.');
  if (sub.name === 'end') {
    if (gw.status !== 'open') return reply('That giveaway is already finished.');
    return reply(await endGiveaway(env, gw, fetchFn, rand));
  }
  if (sub.name === 'cancel') {
    if (gw.status !== 'open') return reply('That giveaway is already finished.');
    gw.status = 'cancelled'; await putGw(env, gw);
    await fetchFn(`${API}/channels/${gw.channelId}/messages/${gw.messageId}`, { method: 'PATCH', headers: hdr(env), body: JSON.stringify(card(gw, { cancelled: true })) });
    return reply(`Giveaway ${gw.id} cancelled.`);
  }
  if (sub.name === 'reroll') {
    if (gw.status !== 'ended') return reply('Only a finished giveaway can be rerolled.');
    const taken = new Set(gw.winnerIds || []);
    const pool = (await entriesOf(env, gw.id)).filter((id) => !taken.has(id));
    const [w] = await pick(env, gw, pool, 1, fetchFn, rand);
    if (!w) return reply('No other eligible entries to pick from.');
    gw.winnerIds = [...(gw.winnerIds || []), w]; await putGw(env, gw);
    const failed = await giveAccess(env, gw, [w], fetchFn);
    await announce(env, gw, [w], failed, fetchFn, true);
    return reply(`Rerolled giveaway ${gw.id}: new winner <@${w}>.`);
  }
  return reply('Unknown giveaway command.');
}
