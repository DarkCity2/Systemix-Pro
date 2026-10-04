const db = require('../../db');
const { EmbedBuilder } = require('discord.js');

const joins = new Map();
const raidUntil = new Map();

function punish(member, action, reason) {
  if (action === 'kick') return member.kick(reason).catch(() => {});
  if (action === 'ban') return member.ban({ reason }).catch(() => {});
  if (action === 'timeout') return member.timeout(3600000, reason).catch(() => {});
}

function alert(guild, c, text) {
  const ch = c.alertChannelId && guild.channels.cache.get(c.alertChannelId);
  if (ch?.isTextBased()) ch.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('🚨 Anti-Raid').setDescription(text).setTimestamp()] }).catch(() => {});
}

// يرجع true إذا تم طرد/حظر العضو (فيتخطى الترحيب)
async function onJoin(member) {
  const c = db.cfg(member.guild.id).antiraid;
  if (!c.enabled || member.user.bot) return false;
  const gid = member.guild.id;
  const now = Date.now();

  const ageDays = (now - member.user.createdTimestamp) / 864e5;
  if (c.minAccountAgeDays > 0 && ageDays < c.minAccountAgeDays) {
    alert(member.guild, c, `<@${member.id}> حسابه جديد (${ageDays.toFixed(1)} يوم) — الإجراء: **${c.accountAgeAction}**`);
    await punish(member, c.accountAgeAction, `Anti-Raid: حساب جديد (${ageDays.toFixed(1)} يوم)`);
    return true;
  }

  const win = Math.max(2, c.joinWindowSec) * 1000;
  const arr = (joins.get(gid) || []).filter(j => now - j.t < win);
  arr.push({ id: member.id, t: now });
  joins.set(gid, arr);

  const removes = c.action !== 'alert';
  if ((raidUntil.get(gid) || 0) > now) {
    await punish(member, c.action, 'Anti-Raid');
    return removes;
  }
  if (arr.length >= Math.max(2, c.joinThreshold)) {
    raidUntil.set(gid, now + 60000);
    alert(member.guild, c, `تم اكتشاف هجوم محتمل: **${arr.length}** عضو دخلوا خلال ${c.joinWindowSec} ثانية. الإجراء: **${c.action}**`);
    for (const j of arr) {
      const m = member.guild.members.cache.get(j.id);
      if (m && m.id !== member.id) await punish(m, c.action, 'Anti-Raid');
    }
    await punish(member, c.action, 'Anti-Raid');
    return removes;
  }
  return false;
}

module.exports = { onJoin };
