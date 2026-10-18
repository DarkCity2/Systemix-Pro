const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits 
} = require('discord.js');
const { checkSub } = require('./subscription');
const db = require('../../db');

const ticketModule = {
  // ---------- 1. نشر لوحة التذاكر (بانر + قائمة منسدلة بدون شرح فرعي) ----------
  async publishPanel(guild) {
    const ticketConfig = db.cfg(guild.id)?.tickets || {};
    
    let channelId = ticketConfig.channelId || ticketConfig.panelChannelId || ticketConfig.room;
    let channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      channel = guild.channels.cache.find(c => c.isTextBased() && c.type === ChannelType.GuildText);
    }
    if (!channel) throw new Error('لم يتم العثور على روم نصي مناسب لنشر اللوحة');

    const bannerUrl = ticketConfig.bannerUrl || guild.bannerURL({ size: 1024, extension: 'png' }) || guild.iconURL({ size: 512, extension: 'png' });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31');

    if (bannerUrl) {
      embed.setImage(bannerUrl);
    } else {
      embed.setDescription(`**مركز التذاكر والخدمات الرسمية | ${guild.name}**`);
    }

    // القائمة المنسدلة بدون الشرح الفرعي
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_menu')
      .setPlaceholder('اختر خيار التذكرة...')
      .addOptions([
        {
          label: 'الدعم الفني | Technical Support',
          value: 'ticket_support',
          emoji: '🎫'
        },
        {
          label: 'التقديم على الإدارة | Management Application',
          value: 'ticket_apply',
          emoji: '📋'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const msg = await channel.send({ embeds: [embed], components: [row] });
    return msg.url;
  },

  // ---------- 2. معالجة فتح وإغلاق التذاكر ----------
  async handleInteraction(interaction) {
    if (!checkSub(interaction.guildId).valid) return;

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
      const selectedValue = interaction.values[0];
      const isApply = selectedValue === 'ticket_apply';
      
      const ticketType = isApply ? 'تقديم-إدارة' : 'دعم-فني';
      const ticketTitle = isApply ? '📋 التقديم على الإدارة' : '🎫 الدعم الفني';

      const ticketConfig = db.cfg(interaction.guild.id)?.tickets || {};
      const staffRoleId = ticketConfig.staffRoleId || ticketConfig.supportRoleId;
      const staffRole = staffRoleId ? interaction.guild.roles.cache.get(staffRoleId) : null;

      const ch = await interaction.guild.channels.create({
        name: `${ticketType}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, ''),
        type: ChannelType.GuildText,
        parent: ticketConfig.categoryId || ticketConfig.category || undefined,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
          ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] }] : [])
        ]
      });

      const openTimestamp = `<t:${Math.floor(Date.now() / 1000)}:R>`;

      const ticketEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setDescription(
          `### ${ticketTitle}\n` +
          `> أهلاً بك <@${interaction.user.id}>، يرجى كتابة تفاصيل طلبك هنا وسيرد عليك الإداري المختص قريباً.\n\n` +
          `• **الوقت:** ${openTimestamp}\n` +
          `• **المسؤول:** ${staffRole ? `<@&${staffRole.id}>` : '`طاقم الإدارة`'}`
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined });

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('إغلاق التذكرة')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ch.send({
        content: `|| <@${interaction.user.id}> ${staffRole ? `<@&${staffRole.id}>` : ''} ||`,
        embeds: [ticketEmbed],
        components: [closeBtn]
      });

      return interaction.reply({ 
        content: `✨ **تم فتح تذكرتك بنجاح:** ${ch}`, 
        ephemeral: true 
      });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      const confirmEmbed = new EmbedBuilder()
        .setDescription('🔒 **سيتم حذف التذكرة خلال 5 ثوانٍ...**')
        .setColor('#ed4245');

      await interaction.reply({ embeds: [confirmEmbed] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
