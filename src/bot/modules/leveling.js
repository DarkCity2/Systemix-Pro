const db = require('../../db');
const { levelFromXp, rand, fmt } = require('../../util');

async function applyRewards(member, level, c) {
  const rewards = c.rewards.filter(r => r.roleId && Number(r.level) > 0 && member.guild.roles.cache.get(r.roleId)?.editable)
    .sort((a, b) => Number(a.level) - Number(b.level));
  const earned = rewards.filter(r => Number(r.level) <= level);
  if (!earned.length) return;
  if (c.stackRewards) {
    const add = earned.map(r => r.roleId).filter(id => !member.roles.cache.has(id));
    if (add.length) await member.roles.add(add, 'Systemix Leveling').catch(() => {});
  } else {
    const top = earned[earned.length - 1].roleId;
    const remove = rewards.map(r => r.roleId).filter(id => id !== top && member.roles.cache.has(id));
    if (!member.roles.cache.has(top)) await member.roles.add(top, 'Systemix Leveling').catch(() => {});
    if (remove.length) await member.roles.remove(remove, 'Systemix Leveling').catch(() => {});
  }
}

async function onMessage(message) {
  const c = db.cfg(message.guildId).leveling;
  if (!c.enabled || !message.member) return;
  if (c.noXpChannels.includes(message.channelId)) return;
  if (message.member.roles.cache.some(r => c.noXpRoles.includes(r.id))) return;

  const g = db.guild(message.guildId);
  const u = (g.xp[message.author.id] ??= { xp: 0, msgs: 0, last: 0 });
  u.msgs++;
  u.name = message.author.globalName || message.author.username;
  u.avatar = message.author.avatar || '';

  const now = Date.now();
  if (now - u.last < Math.max(0, c.cooldown) * 1000) return db.save();
  u.last = now;

  const before = levelFromXp(u.xp).level;
  u.xp += rand(c.xpMin, c.xpMax);
  const after = levelFromXp(u.xp).level;
  db.save();
  if (after <= before) return;

  applyRewards(message.member, after, c);
  if (c.announce === 'off') return;
  const text = c.message.replaceAll('{user}', `<@${message.author.id}>`).replaceAll('{username}', message.author.username)
    .replaceAll('{level}', String(after)).replaceAll('{server}', message.guild.name);
  if (c.announce === 'dm') return void message.author.send(text).catch(() => {});
  const ch = (c.announceChannelId && message.guild.channels.cache.get(c.announceChannelId)) || message.channel;
  ch.send({ content: text, allowedMentions: { users: [message.author.id] } }).catch(() => {});
}

function leaderboard(guildId) {
  return Object.entries(db.guild(guildId).xp)
    .map(([id, u]) => ({ id, ...u, level: levelFromXp(u.xp).level }))
    .sort((a, b) => b.xp - a.xp);
}

module.exports = { onMessage, leaderboard };
