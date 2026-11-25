// Run once on your computer (needs Node 20+): registers /grant, /revoke, /key, /keypanel and /giveaway (replaces any older command set).
// Usage (Windows): set DISCORD_TOKEN=...  then  set APP_ID=...  then  set GUILD_ID=...  then  node scripts/register-commands.mjs
const { DISCORD_TOKEN, APP_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !APP_ID || !GUILD_ID) { console.error('Set DISCORD_TOKEN, APP_ID and GUILD_ID first.'); process.exit(1); }
const userOpt = [{ type: 6, name: 'user', description: 'Who', required: true }];
const commands = [
  { name: 'grant', description: 'Owner only: give someone the Buyer role', default_member_permissions: '8', options: userOpt },
  { name: 'revoke', description: "Owner only: remove someone's Buyer role", default_member_permissions: '8', options: userOpt },
  { name: 'key', description: 'Owner only: make a key for someone (gift or giveaway)', default_member_permissions: '8', options: [...userOpt,
    { type: 3, name: 'kind', description: 'Default: gift', required: false, choices: [{ name: 'gift', value: 'gift' }, { name: 'giveaway', value: 'giveaway' }, { name: 'buyer', value: 'buyer' }] }] },
  { name: 'keypanel', description: 'Owner only: post the Get my key button in this channel', default_member_permissions: '8' },
  { name: 'giveaway', description: 'Owner only: run giveaways in this channel', default_member_permissions: '8', options: [
    { type: 1, name: 'start', description: 'Start a giveaway here', options: [
      { type: 3, name: 'prize', description: 'What they win', required: true },
      { type: 3, name: 'duration', description: 'Like 30m, 6h, 3d or 1w', required: true },
      { type: 4, name: 'winners', description: 'How many winners (1 to 10, default 1)', required: false, min_value: 1, max_value: 10 },
      { type: 5, name: 'grant_access', description: 'Give winners the Buyer role automatically', required: false }] },
    { type: 1, name: 'end', description: 'End a giveaway now and pick winners', options: [{ type: 3, name: 'id', description: 'Giveaway ID', required: true }] },
    { type: 1, name: 'reroll', description: 'Pick one more winner for a finished giveaway', options: [{ type: 3, name: 'id', description: 'Giveaway ID', required: true }] },
    { type: 1, name: 'cancel', description: 'Cancel an open giveaway', options: [{ type: 3, name: 'id', description: 'Giveaway ID', required: true }] }] },
];
const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
  method: 'PUT', headers: { authorization: `Bot ${DISCORD_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(commands),
});
console.log(res.ok ? 'Commands registered: /grant, /revoke, /key, /keypanel and /giveaway.' : `Failed: ${res.status} ${await res.text()}`);
