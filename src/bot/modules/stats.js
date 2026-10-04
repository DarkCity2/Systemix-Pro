const db = require('../../db');

function value(guild, type) {
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  switch (type) {
    case 'members': return guild.memberCount;
    case 'bots': return bots;
    case 'humans': return Math.max(0, guild.memberCount - bots);
    case 'boosts': return guild.premiumSubscriptionCount || 0;
    case 'channels': return guild.channels.cache.size;
    case 'roles': return guild.roles.cache.size;
    default: return 0;
  }
}

async function update(guild) {
  const c = db.cfg(guild.id).stats;
  if (!c.enabled) return;
  for (const s of c.channels) {
    const ch = guild.channels.cache.get(s.channelId);
    if (!ch) continue;
    const name = (s.template || '{count}').replaceAll('{count}', String(value(guild, s.type))).slice(0, 100);
    if (ch.name !== name) await ch.setName(name, 'Systemix stats').catch(() => {});
  }
}

const pending = new Map();
function schedule(guild) {
  if (pending.has(guild.id)) return;
  pending.set(guild.id, setTimeout(() => { pending.delete(guild.id); update(guild); }, 30000));
}

function start(client) {
  const run = () => client.guilds.cache.forEach(g => update(g));
  setTimeout(run, 15000);
  setInterval(run, 10 * 60 * 1000);
}

module.exports = { update, schedule, start, value };
