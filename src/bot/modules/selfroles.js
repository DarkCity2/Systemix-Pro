const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db');
const { brand, EPH } = require('../../util');

async function publishPanel(guild) {
  const c = db.cfg(guild.id).selfroles;
  const ch = guild.channels.cache.get(c.channelId);
  if (!ch?.isTextBased()) throw new Error('اختر روم اللوحة أولاً واحفظ.');
  const roles = c.roles.filter(r => r.roleId && guild.roles.cache.has(r.roleId)).slice(0, 25);
  if (!roles.length) throw new Error('أضف رتبة واحدة على الأقل.');

  const rows = [];
  for (let k = 0; k < roles.length; k += 5) {
    rows.push(new ActionRowBuilder().addComponents(roles.slice(k, k + 5).map(r => {
      const b = new ButtonBuilder().setCustomId(`sr:${r.roleId}`).setLabel((r.label || guild.roles.cache.get(r.roleId).name).slice(0, 80)).setStyle(ButtonStyle.Secondary);
      if (r.emoji) { try { b.setEmoji(r.emoji); } catch {} }
      return b;
    })));
  }
  const payload = { embeds: [brand(guild.id).setTitle(c.title).setDescription(c.description)], components: rows };
  let msg = null;
  if (c.messageId) { const old = await ch.messages.fetch(c.messageId).catch(() => null); if (old) msg = await old.edit(payload).catch(() => null); }
  if (!msg) msg = await ch.send(payload);
  c.messageId = msg.id;
  db.save();
  return msg.url;
}

async function handle(i) {
  const c = db.cfg(i.guildId).selfroles;
  const roleId = i.customId.slice(3);
  if (!c.enabled || !c.roles.some(r => r.roleId === roleId)) return i.reply({ content: 'هذي الرتبة غير متاحة حالياً.', flags: EPH });
  const role = i.guild.roles.cache.get(roleId);
  if (!role?.editable) return i.reply({ content: '❌ ما أقدر أعطي هذي الرتبة (رتبتي أقل منها).', flags: EPH });

  if (i.member.roles.cache.has(roleId)) {
    await i.member.roles.remove(roleId, 'Systemix SelfRole');
    return i.reply({ content: `➖ تمت إزالة **${role.name}**`, flags: EPH });
  }
  if (c.unique) {
    const others = c.roles.map(r => r.roleId).filter(id => id !== roleId && i.member.roles.cache.has(id));
    if (others.length) await i.member.roles.remove(others, 'Systemix SelfRole (unique)').catch(() => {});
  }
  await i.member.roles.add(roleId, 'Systemix SelfRole');
  i.reply({ content: `➕ حصلت على **${role.name}**`, flags: EPH });
}

module.exports = { publishPanel, handle };
