// The Void bot as a Cloudflare Worker. Discord sends every button click and slash command here as a signed HTTPS request,
// so nothing has to stay running on a computer. Secret: DISCORD_TOKEN. Everything else is in wrangler.jsonc.
const API = 'https://discord.com/api/v10';
const FLAG_EPHEMERAL = 64;
import { signKey, KINDS } from './license.js';
import { handleStripeEvent, verifyStripeSignature, codeForSession, claimCode, lookupByEmail } from './purchase.js';
import { GW, handleGiveawayButton, handleGiveawayCommand, runDue } from './giveaway.js';
export const IDS = { agree: 'void:agree', payLink: 'void:paylink', key: 'void:key' };

const hex = (s) => Uint8Array.from(s.match(/../g).map((b) => parseInt(b, 16)));

export async function verifySignature(request, body, publicKey) {
  const sig = request.headers.get('x-signature-ed25519'), ts = request.headers.get('x-signature-timestamp');
  if (!sig || !ts || !publicKey) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hex(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, hex(sig), new TextEncoder().encode(ts + body));
  } catch { return false; }
}

const reply = (content) => ({ type: 4, data: { content, flags: FLAG_EPHEMERAL, allowed_mentions: { parse: [] } } });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

async function roleCall(env, method, userId, roleId, reason, fetchFn) {
  const res = await fetchFn(`${API}/guilds/${env.GUILD_ID}/members/${userId}/roles/${roleId}`, {
    method, headers: { authorization: `Bot ${env.DISCORD_TOKEN}`, 'x-audit-log-reason': encodeURIComponent(reason) },
  });
  if (!res.ok) throw new Error(`Discord said ${res.status}`);
}

async function keyReply(env, userId, kind, forOther = false) {
  if (!env.SIGNING_KEY) return reply('Keys are not set up yet. Tell the owner.');
  let key;
  try { key = await signKey(env.SIGNING_KEY, userId, kind); }
  catch (e) { return reply(e.message === 'bad-kind' ? `Kind must be one of: ${KINDS.join(', ')}.` : 'I could not make a key. Tell the owner.'); }
  return reply([forOther ? `Key for <@${userId}> (${kind}):` : 'Your key (private, tied to your account):', '```', key, '```',
    forOther ? 'Send it to them privately.' : 'Copy all of it. Paste it into The Void the first time you open it.'].join('\n'));
}

export function paymentUrl(base) { return new URL(base).toString(); }   // Stripe checkout; the buyer claims access with /claim

export async function handleInteraction(i, env, fetchFn = fetch, now = () => Date.now()) {
  if (i.type === 1) return { type: 1 };
  const userId = i.member?.user?.id || i.user?.id;
  const roles = i.member?.roles || [];
  const isAdmin = userId === env.ADMIN_USER_ID;

  if (i.type === 3) {   // button
    if (i.data.custom_id === IDS.agree) {
      if (!env.AGREED_ROLE_ID) return reply('The server is not set up yet. Tell the owner.');
      try { await roleCall(env, 'PUT', userId, env.AGREED_ROLE_ID, 'Accepted the agreement', fetchFn); }
      catch { return reply('I could not give you the role. Tell the owner: my role must sit above Agreed.'); }
      try { await env.AGREEMENTS?.put(`agree:${userId}`, JSON.stringify({ version: env.AGREEMENT_VERSION, ts: now() })); } catch { /* record is nice to have */ }
      return reply(`Thanks, that is recorded. You can now see <#${env.GET_IT_CHANNEL_ID}> and the rest of the server.`);
    }
    if (i.data.custom_id === IDS.payLink) {
      if (roles.includes(env.BUYER_ROLE_ID)) return reply('You already have the Buyer role.');
      if (!roles.includes(env.AGREED_ROLE_ID)) return reply('Read and accept the agreement first.');
      return reply([`Checkout (${env.PRICE_LABEL}, one time):`, paymentUrl(env.PAYMENT_LINK_URL), '',
        'After you pay you land on a page with your purchase code. Come back here and type `/claim` with that code. That gives you the Buyer role and unlocks the download. Stuck? Message the owner.'].join('\n'));
    }
    if (i.data.custom_id === IDS.key) {
      if (!roles.includes(env.BUYER_ROLE_ID)) return reply(`Keys are for Buyers. Get The Void in <#${env.GET_IT_CHANNEL_ID}>, then come back.`);
      return keyReply(env, userId, 'buyer');
    }
    if (i.data.custom_id.startsWith(GW.enter) || i.data.custom_id.startsWith(GW.leave)) return handleGiveawayButton(i, env, now);
    return reply('That button is not active any more.');
  }

  if (i.type === 2) {   // slash command
    const name = i.data.name;
    if (name === 'grant' || name === 'revoke') {
      if (!isAdmin) return reply('Only the owner can run this.');
      const target = i.data.options?.find((o) => o.name === 'user')?.value;
      if (!target || !env.BUYER_ROLE_ID) return reply('Missing user or Buyer role.');
      const add = name === 'grant';
      try { await roleCall(env, add ? 'PUT' : 'DELETE', target, env.BUYER_ROLE_ID, add ? 'Manual grant' : 'Manual revoke', fetchFn); }
      catch (e) { return reply(`Could not change the role: ${e.message}`); }
      return reply(`${add ? 'Gave' : 'Removed'} the Buyer role ${add ? 'to' : 'from'} <@${target}>.`);
    }
    if (name === 'key') {
      if (!isAdmin) return reply('Only the owner can run this.');
      const target = i.data.options?.find((o) => o.name === 'user')?.value;
      const kind = i.data.options?.find((o) => o.name === 'kind')?.value || 'gift';
      if (!target) return reply('Missing user.');
      return keyReply(env, target, kind, true);
    }
    if (name === 'claim') {
      if (!roles.includes(env.AGREED_ROLE_ID)) return reply('Read and accept the agreement first.');
      const claimCh = env.CLAIM_CHANNEL_ID || env.GET_IT_CHANNEL_ID;
      if (claimCh && i.channel_id !== claimCh) return reply(`Please use /claim in <#${claimCh}>.`);
      return reply(await claimCode(i.data.options?.find((o) => o.name === 'code')?.value, userId, env, fetchFn, now));
    }
    if (name === 'purchase') {
      if (!isAdmin) return reply('Only the owner can run this.');
      return reply(await lookupByEmail(i.data.options?.find((o) => o.name === 'email')?.value, env));
    }
    if (name === 'giveaway') {
      if (!isAdmin) return reply('Only the owner can run this.');
      return handleGiveawayCommand(i, env, fetchFn, now);
    }
    if (name === 'keypanel') {
      if (!isAdmin) return reply('Only the owner can run this.');
      return { type: 4, data: { content: ['**Get your key**', 'Buyers: press the button for your personal key. The Void asks for it the first time you open it. It is tied to your Discord account, so keep it private.'].join('\n'),
        components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Get my key', custom_id: IDS.key }] }], allowed_mentions: { parse: [] } } };
    }
    return reply('Unknown command.');
  }
  return reply('Unsupported action.');
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(runDue(env)); },   // cron: ends giveaways whose time is up
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'access-control-allow-origin': env.SITE_ORIGIN || 'https://gethevoid.com', 'access-control-allow-methods': 'GET', vary: 'origin' };
    if (url.pathname === '/purchase' && request.method === 'GET') {
      const r = await codeForSession(url.searchParams.get('session_id'), env);
      return new Response(JSON.stringify(r), { status: r.status === 'bad-request' ? 400 : 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors } });
    }
    if (url.pathname === '/stripe' && request.method === 'POST') {
      const body = await request.text();
      if (!(await verifyStripeSignature(request.headers.get('stripe-signature'), body, env.STRIPE_WEBHOOK_SECRET))) return new Response('Bad signature', { status: 400 });
      try { console.log('stripe', await handleStripeEvent(JSON.parse(body), env)); return new Response('ok'); }
      catch (e) { console.error('stripe error', e); return new Response('error', { status: 500 }); }   // 500 makes Stripe retry
    }
    if (request.method === 'GET') return new Response('The Void bot is running.');
    if (request.method !== 'POST' || url.pathname !== '/') return new Response('Not found', { status: 404 });
    const body = await request.text();
    if (!(await verifySignature(request, body, env.DISCORD_PUBLIC_KEY))) return new Response('Bad signature', { status: 401 });
    try { return json(await handleInteraction(JSON.parse(body), env)); }
    catch (e) { console.error('interaction error', e); return json(reply('Something went wrong. Tell the owner.')); }
  },
};
