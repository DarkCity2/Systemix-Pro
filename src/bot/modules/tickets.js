const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { checkSub } = require('./subscription');
const db = require('../../db');

// أسماء القواعد وألوانها
const baseNames = {
  silver: 'Silver Base',
  gold: 'Gold Base',
  crystal: 'Crystal Base',
  bloodmoon: 'BloodMoon Base',
  rainbow: 'Rainbow Base GoUp',
  candy: 'Candy Base GoUp',
  cyber: 'Cyber Base GoUp',
  party: 'Party Base GoUp',
  bw: 'Black & White Base GoUp',
  aqua: 'Aqua Base GoUp',
  lava: 'Lava Base GoUp',
  football: 'Football Base GoUp',
  summer: 'Summer Base GoUp',
  dreamy: 'Dreamy Base GoUp',
  galaxy: 'Galaxy Base',
  radioactive: 'Radioactive Base',
  halloween: 'Halloween Base'
};

const ticketModule = {
  // ---------- 1. دالة نشر لوحة التذاكر من الموقع (تحل مشكلة publishPanel) ----------
  async publishPanel(guild) {
    const ticketConfig = db.cfg(guild.id)?.tickets || {};
    const channelId = ticketConfig.channelId;
    if (!channelId) throw new Error('يرجى تحديد روم لوحة التذاكر في الإعدادات أولاً');

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) throw new Error('روم لوحة التذاكر غير صحيح أو غير موجود');

    const title = ticketConfig.title || '🎫 الدعم الفني وتذاكر الألوان';
    const description = ticketConfig.description || 'اضغط على الزر أدناه لفتح تذكرة جديدة مع الإدارة.';
    const buttonText = ticketConfig.buttonText || 'فتح تذكرة';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#2b2d31')
      .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_general')
        .setLabel(buttonText)
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    return msg.url;
  },

  // ---------- 2. التعامل مع الأزرار والتذاكر داخل السيرفر ----------
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;

    // فحص اشتراك السيرفر
    if (!checkSub(interaction.guildId).valid) return;

    // فتح تذكرة (سواءً عامة أو لون محدد)
    if (interaction.customId.startsWith('ticket_')) {
      const baseKey = interaction.customId.replace('ticket_', '');
      const baseName = baseNames[baseKey] || 'الدعم الفني';

      // جلب إعدادات التذاكر
      const ticketConfig = db.cfg(interaction.guild.id)?.tickets || {};
      const welcomeMsg = ticketConfig.welcomeMsg || 'أهلاً بك {user}! اشرح مشكلتك وسيرد عليك فريق الدعم قريباً.';
      const formattedWelcome = welcomeMsg
        .replace(/{user}/g, `<@${interaction.user.id}>`)
        .replace(/{username}/g, interaction.user.username)
        .replace(/{server}/g, interaction.guild.name);

      // البحث عن رتبة الدعم المخصصة إن وجدت
      const staffRoleId = ticketConfig.staffRoleId;
      const staffRole = staffRoleId ? interaction.guild.roles.cache.get(staffRoleId) : null;

      // إنشاء قناة التذكرة
      const ch = await interaction.guild.channels.create({
        name: `ticket-${baseKey}-${interaction.user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        parent: ticketConfig.categoryId || undefined,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
          ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }] : [])
        ]
      });

      const openTimestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

      // إمبد فخم ومرتب مريح للعين
      const embed = new EmbedBuilder()
        .setDescription(`**مشرفي التذاكر : [ 🛡️ ]**\n${staffRole ? `<@&${staffRole.id}>` : '@LS | Management'}\n\n**تاريخ التذكرة : [ 📅 ]**\n${openTimestamp}\n\n**قسم التذكرة : [ ❓ ]**\n${ch.name} | ${baseName}\n\n**الرسالة :**\n${formattedWelcome}`)
        .setColor('#2b2d31');

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('إغلاق التذكرة')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ch.send({
        content: `<@${interaction.user.id}> ${staffRole ? `<@&${staffRole.id}>` : ''}`,
        embeds: [embed],
        components: [closeBtn]
      });

      return interaction.reply({ content: `🎉 **تم إنشاء تذكرتك بنجاح:** ${ch}`, ephemeral: true });
    }

    // زر إغلاق التذكرة
    if (interaction.customId === 'close_ticket') {
      const confirmEmbed = new EmbedBuilder()
        .setDescription('🔒 **سيتم إغلاق وحذف التذكرة خلال 5 ثوانٍ...**')
        .setColor('#ef4444');

      await interaction.reply({ embeds: [confirmEmbed] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
