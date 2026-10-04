const { EmbedBuilder } = require('discord.js');
const db = require('../../db');

const COLORS = { warn: 0xfee75c, kick: 0xf0883e, ban: 0xed4245, timeout: 0xeb459e, unban: 0x57f287, untimeout: 0x57f287 };
const LABELS = { warn: 'تحذير', kick: 'طرد', ban: 'حظر', timeout: 'كتم مؤقت', unban: 'فك حظر', untimeout: 'فك كتم' };

async function notify(target, guild, type, reason, minutes) {
  if (!db.cfg(guild.id).moderation.dmOnAction) return;
  const u = await guild.client.users.fetch(target.id).catch(() => null);
  if (!u) return;
  const e = new EmbedBuilder().setColor(COLORS[type]).setTitle(`${LABELS[type]} في ${guild.name}`)
    .addFields({ name: 'السبب', value: reason });
  if (type === 'timeout') e.addFields({ name: 'المدة', value: `${minutes} دقيقة` });
  await u.send({ embeds: [e] }).catch(() => {});
}

function addCase(guild, c) {
  const g = db.guild(guild.id);
  const rec = { id: ++g.caseCounter, at: Date.now(), ...c };
  g.cases.unshift(rec);
  if (g.cases.length > 1000) g.cases.length = 1000;
  db.save();

  const chId = db.cfg(guild.id).moderation.logChannelId;
  const ch = chId && guild.channels.cache.get(chId);
  if (ch?.isTextBased()) {
    const e = new EmbedBuilder().setColor(COLORS[c.type]).setTitle(`#${rec.id} • ${LABELS[c.type]}`)
      .addFields(
        { name: 'العضو', value: `<@${c.userId}> (${c.userTag || c.userId})`, inline: true },
        { name: 'المسؤول', value: c.modId && c.modId !== '0' ? `<@${c.modId}>` : (c.modTag || 'Systemix'), inline: true },
        { name: 'السبب', value: c.reason }
      ).setTimestamp();
    if (c.minutes) e.addFields({ name: 'المدة', value: `${c.minutes} دقيقة`, inline: true });
    ch.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
  }
  return rec;
}

/**
 * تنفيذ إجراء إداري.
 * target: { id, username } ، mod: { id, tag } أو null (تلقائي)
 */
async function act(guild, type, target, mod, reason, minutes) {
  reason = String(reason || 'بدون سبب').slice(0, 400);
  const member = await guild.members.fetch(target.id).catch(() => null);

  if (['warn', 'kick', 'timeout', 'untimeout'].includes(type) && !member) throw new Error('العضو مو موجود في السيرفر.');
  if (member) {
    if (member.id === guild.ownerId) throw new Error('ما أقدر أطبق إجراء على مالك السيرفر.');
    if (type === 'kick' && !member.kickable) throw new Error('ما أقدر أطرد هذا العضو (رتبته أعلى مني).');
    if (type === 'ban' && !member.bannable) throw new Error('ما أقدر أحظر هذا العضو (رتبته أعلى مني).');
    if ((type === 'timeout' || type === 'untimeout') && !member.moderatable) throw new Error('ما أقدر أكتم هذا العضو (رتبته أعلى مني).');
  }

  if (type === 'timeout') minutes = Math.min(Math.max(1, Number(minutes) || 10), 40320);
  if (['warn', 'kick', 'ban', 'timeout'].includes(type)) await notify(target, guild, type, reason, minutes);

  if (type === 'kick') await member.kick(reason);
  else if (type === 'ban') await guild.members.ban(target.id, { reason });
  else if (type === 'timeout') await member.timeout(minutes * 60000, reason);
  else if (type === 'untimeout') await member.timeout(null, reason);
  else if (type === 'unban') {
    try { await guild.bans.remove(target.id, reason); } catch { throw new Error('هذا المستخدم مو محظور.'); }
  }

  const rec = addCase(guild, {
    type, userId: target.id, userTag: target.username || target.tag || target.id,
    modId: mod?.id || '0', modTag: mod?.tag || 'Systemix (تلقائي)', reason, minutes: type === 'timeout' ? minutes : undefined
  });

  if (type === 'warn') {
    const g = db.guild(guild.id);
    const list = (g.warns[target.id] ??= []);
    list.push({ caseId: rec.id, reason, at: Date.now() });
    db.save();
    const th = db.cfg(guild.id).moderation.thresholds.find(t => Number(t.warns) === list.length);
    if (th && ['timeout', 'kick', 'ban'].includes(th.action)) {
      try { await act(guild, th.action, target, null, `الوصول إلى ${list.length} تحذيرات`, th.minutes); } catch {}
    }
  }
  return rec;
}

module.exports = { act, addCase, LABELS };
