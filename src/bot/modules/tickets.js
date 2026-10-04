const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder
} = require('discord.js');
const db = require('../../db');
const { brand, fmt, EPH } = require('../../util');
const logger = require('./logger');

const supportRole = guildId => {
  const c = db.cfg(guildId);
  return c.tickets.supportRoleId || c.settings.staffRoleId || '';
};

async function publishPanel(guild) {
  const c = db.cfg(guild.id).tickets;
  const ch = guild.channels.cache.get(c.panelChannelId);
  if (!ch?.isTextBased()) throw new Error('اختر روم اللوحة أولاً واحفظ.');
  const payload = {
    embeds: [brand(guild.id).setTitle(c.panelTitle).setDescription(c.panelDescription)],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk:open').setLabel(c.buttonLabel || 'فتح تذكرة').setEmoji('🎫').setStyle(ButtonStyle.Primary))]
  };
  let msg = null;
  if (c.panelMessageId) { const old = await ch.messages.fetch(c.panelMessageId).catch(() => null); if (old) msg = await old.edit(payload).catch(() => null); }
  if (!msg) msg = await ch.send(payload);
  c.panelMessageId = msg.id;
  db.save();
  return msg.url;
}

async function open(i) {
  const c = db.cfg(i.guildId).tickets;
  const g = db.guild(i.guildId);
  if (!c.enabled) return i.reply({ content: 'نظام التذاكر غير مفعّل.', flags: EPH });
  const mine = Object.entries(g.tickets).filter(([id, t]) => t.userId === i.user.id && i.guild.channels.cache.has(id));
  if (mine.length >= Math.max(1, c.maxPerUser)) return i.reply({ content: `عندك تذكرة مفتوحة: <#${mine[0][0]}>`, flags: EPH });

  await i.deferReply({ flags: EPH });
  const n = ++g.ticketCounter;
  const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles];
  const overwrites = [
    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: i.user.id, allow },
    { id: i.client.user.id, allow: [...allow, PermissionFlagsBits.ManageChannels] }
  ];
  const sr = supportRole(i.guildId);
  if (sr && i.guild.roles.cache.has(sr)) overwrites.push({ id: sr, allow });

  const ch = await i.guild.channels.create({
    name: `ticket-${String(n).padStart(4, '0')}`, type: ChannelType.GuildText,
    parent: c.categoryId || null, topic: `ticket:${i.user.id}`, permissionOverwrites: overwrites
  }).catch(() => null);
  if (!ch) return i.editReply('❌ ما قدرت أنشئ التذكرة، تأكد من صلاحيات البوت (Manage Channels).');

  g.tickets[ch.id] = { userId: i.user.id, n, openedAt: Date.now(), claimedBy: null };
  db.save();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk:claim').setLabel('استلام').setEmoji('✋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tk:close').setLabel('إغلاق').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  await ch.send({
    content: `<@${i.user.id}>${sr ? ` <@&${sr}>` : ''}`,
    embeds: [brand(i.guildId).setTitle(`🎫 تذكرة #${String(n).padStart(4, '0')}`).setDescription(fmt(c.welcomeMessage, i.member))],
    components: [row]
  });
  logger.send(i.guild, 'ticketOpen', {
    user: logger.user(i.user), thumb: i.user.displayAvatarURL({ size: 256 }),
    desc: `<@${i.user.id}> فتح تذكرة ${ch}`, fields: [{ name: '🎫 رقم التذكرة', value: `#${String(n).padStart(4, '0')}`, inline: true }], id: ch.id
  });
  i.editReply(`✅ تم فتح تذكرتك: ${ch}`);
}

async function transcript(channel) {
  const all = [];
  let before;
  for (let k = 0; k < 10; k++) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch?.size) break;
    all.push(...batch.values());
    before = batch.last().id;
  }
  all.reverse();
  return all.map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}${m.attachments.size ? ' ' + [...m.attachments.values()].map(a => a.url).join(' ') : ''}`).join('\n');
}

const isStaff = (i) => {
  const sr = supportRole(i.guildId);
  return i.memberPermissions.has(PermissionFlagsBits.ManageChannels) || (sr && i.member.roles.cache.has(sr));
};

async function handle(i) {
  const id = i.customId;
  if (id === 'tk:open') return open(i);
  const g = db.guild(i.guildId);
  const t = g.tickets[i.channelId];
  if (!t) return i.reply({ content: 'هذي مو تذكرة مسجلة.', flags: EPH });

  if (id === 'tk:claim') {
    if (!isStaff(i)) return i.reply({ content: '❌ للدعم الفني فقط.', flags: EPH });
    if (t.claimedBy) return i.reply({ content: `التذكرة مستلمة من <@${t.claimedBy}>`, flags: EPH });
    t.claimedBy = i.user.id; db.save();
    return i.reply({ embeds: [brand(i.guildId).setDescription(`✋ تم استلام التذكرة بواسطة <@${i.user.id}>`)] });
  }

  if (id === 'tk:close') {
    if (!isStaff(i) && i.user.id !== t.userId) return i.reply({ content: '❌ ما عندك صلاحية.', flags: EPH });
    await i.reply('🔒 جاري حفظ المحادثة وإغلاق التذكرة بعد 5 ثواني...');
    const c = db.cfg(i.guildId).tickets;
    if (c.transcript && c.logChannelId) {
      const log = i.guild.channels.cache.get(c.logChannelId);
      if (log?.isTextBased()) {
        const text = await transcript(i.channel);
        await log.send({
          embeds: [brand(i.guildId).setTitle(`📁 تذكرة #${String(t.n).padStart(4, '0')} أُغلقت`).addFields(
            { name: 'صاحب التذكرة', value: `<@${t.userId}>`, inline: true },
            { name: 'أغلقها', value: `<@${i.user.id}>`, inline: true },
            { name: 'استلمها', value: t.claimedBy ? `<@${t.claimedBy}>` : '—', inline: true })],
          files: [new AttachmentBuilder(Buffer.from(text || 'لا توجد رسائل', 'utf8'), { name: `ticket-${t.n}.txt` })],
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }
    }
    logger.send(i.guild, 'ticketClose', {
      user: logger.user(i.user), desc: `تم إغلاق تذكرة **#${String(t.n).padStart(4, '0')}**`,
      fields: [
        { name: '👤 صاحب التذكرة', value: `<@${t.userId}>`, inline: true }, { name: '🔒 أغلقها', value: `<@${i.user.id}>`, inline: true },
        { name: '✋ استلمها', value: t.claimedBy ? `<@${t.claimedBy}>` : '—', inline: true }, { name: '⏳ المدة', value: logger.dur(Date.now() - t.openedAt), inline: true }
      ],
      id: i.channelId
    });
    delete g.tickets[i.channelId]; db.save();
    setTimeout(() => i.channel.delete('Systemix: إغلاق تذكرة').catch(() => {}), 5000);
  }
}

module.exports = { publishPanel, handle };
