const { PermissionFlagsBits } = require('discord.js');
const db = require('../../db');
const moderation = require('./moderation');
const logger = require('./logger');

const spam = new Map();
const INVITE = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)\/[\w-]+/i;
const LINK = /https?:\/\/([^\s/]+)[^\s]*/gi;
const EMOJI = /<a?:\w+:\d+>|\p{Extended_Pictographic}/gu;

function detect(message, c) {
  const text = message.content;
  if (c.blockInvites && INVITE.test(text)) return 'روابط دعوة ديسكورد';
  if (c.blockLinks) {
    for (const m of text.matchAll(LINK)) {
      const host = m[1].toLowerCase();
      if (!c.linkWhitelist.some(w => w && (host === w.toLowerCase() || host.endsWith('.' + w.toLowerCase())))) return 'روابط غير مسموحة';
    }
  }
  if (c.badWords.length) {
    const low = text.toLowerCase();
    if (c.badWords.some(w => w && low.includes(String(w).toLowerCase()))) return 'كلمة ممنوعة';
  }
  if (c.maxMentions > 0 && (message.mentions.users.size + message.mentions.roles.size) > c.maxMentions) return 'منشنات كثيرة';
  if (c.maxCapsPercent > 0) {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 10 && (letters.replace(/[^A-Z]/g, '').length / letters.length) * 100 > c.maxCapsPercent) return 'حروف كبيرة مبالغ فيها';
  }
  if (c.maxEmojis > 0 && (text.match(EMOJI) || []).length > c.maxEmojis) return 'إيموجي كثيرة';
  if (c.spamEnabled) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const arr = (spam.get(key) || []).filter(t => now - t < Math.max(1, c.spamSeconds) * 1000);
    arr.push(now);
    spam.set(key, arr);
    if (arr.length >= Math.max(2, c.spamMessages)) { spam.delete(key); return 'سبام'; }
  }
  return null;
}

// يرجع true إذا تم التعامل مع الرسالة (حُذفت)
async function check(message) {
  const guild = message.guild;
  const cfg = db.cfg(guild.id);
  const c = cfg.automod;
  if (!c.enabled || !message.content) return false;
  const member = message.member;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.Administrator)) return false;
  if (c.ignoredChannels.includes(message.channelId)) return false;
  const staff = cfg.settings.staffRoleId;
  if (member.roles.cache.some(r => c.ignoredRoles.includes(r.id) || r.id === staff)) return false;

  const reason = detect(message, c);
  if (!reason) return false;

  await message.delete().catch(() => {});
  const note = await message.channel.send({ content: `⚠️ <@${message.author.id}> ممنوع: **${reason}**`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
  if (note) setTimeout(() => note.delete().catch(() => {}), 5000);

  logger.send(guild, 'automod', {
    user: logger.user(message.author), thumb: message.author.displayAvatarURL({ size: 256 }),
    desc: `<@${message.author.id}> • **${reason}** في <#${message.channelId}>`,
    fields: [
      { name: '📄 المحتوى', value: message.content.slice(0, 900) },
      { name: '⚖️ الإجراء', value: c.action === 'warn' ? 'حذف + تحذير' : c.action === 'timeout' ? `حذف + كتم ${c.timeoutMinutes}د` : 'حذف الرسالة', inline: true }
    ],
    id: message.author.id
  });

  const target = { id: message.author.id, username: message.author.username };
  try {
    if (c.action === 'warn') await moderation.act(guild, 'warn', target, null, `Automod: ${reason}`);
    else if (c.action === 'timeout') await moderation.act(guild, 'timeout', target, null, `Automod: ${reason}`, c.timeoutMinutes);
  } catch {}
  return true;
}

module.exports = { check };
