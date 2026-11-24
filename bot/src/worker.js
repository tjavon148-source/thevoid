// The Void bot as a Cloudflare Worker. Discord sends every button click and slash command here as a signed HTTPS request,
// so nothing has to stay running on a computer. Secret: DISCORD_TOKEN. Everything else is in wrangler.jsonc.
const API = 'https://discord.com/api/v10';
const FLAG_EPHEMERAL = 64;
export const IDS = { agree: 'void:agree', payLink: 'void:paylink' };

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

export function paymentUrl(base) { return new URL(base).toString(); }   // Whop links the buyer's Discord account itself

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
        'After you pay, press **Claim Access** on the Whop page and pick your Discord account. That gives you the Buyer role and unlocks the download. Stuck? Message the owner.'].join('\n'));
    }
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
    return reply('Unknown command.');
  }
  return reply('Unsupported action.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET') return new Response('The Void bot is running.');
    if (request.method !== 'POST' || url.pathname !== '/') return new Response('Not found', { status: 404 });
    const body = await request.text();
    if (!(await verifySignature(request, body, env.DISCORD_PUBLIC_KEY))) return new Response('Bad signature', { status: 401 });
    try { return json(await handleInteraction(JSON.parse(body), env)); }
    catch (e) { console.error('interaction error', e); return json(reply('Something went wrong. Tell the owner.')); }
  },
};
