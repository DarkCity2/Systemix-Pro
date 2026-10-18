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
  // ---------- 1. نشر لوحة التذاكر (صورة عريضة + كلام مرتب) ----------
  async publishPanel(guild) {
    const ticketConfig = db.cfg(guild.id)?.tickets || {};
    
    let channelId = ticketConfig.channelId || ticketConfig.panelChannelId || ticketConfig.room;
    let channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      channel = guild.channels.cache.find(c => c.isTextBased() && c.type === ChannelType.GuildText);
    }
    if (!channel) throw new Error('لم يتم العثور على روم نصي مناسب لنشر اللوحة');

    // جلب البانر العريضي الحقيقي للسيرفر أو الرابط الاحتياطي
    const wideBanner = guild.bannerURL({ size: 1024, extension: 'png' });
    const fallbackBanner = ticketConfig.bannerUrl || null;
    const finalBanner = wideBanner || fallbackBanner;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`✨ مركز التذاكر والخدمات الرسمية`)
      .setDescription(`> قم باختيار القسم المناسب لطلبك من القائمة أدناه ليتم فتح تذكرة خاصة بك فوراً.`);

    if (finalBanner) {
      embed.setImage(finalBanner);
    }

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

  // ---------- 2. معالجة تفاعلات القائمة والتذاكر بدون أخطاء ----------
  async handleInteraction(interaction) {
    if (!checkSub(interaction.guildId).valid) return;

    // التعامل مع القائمة المنسدلة
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
      // إيقاف خطأ المهلة من ديسكورد فوراً
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }

      const selectedValue = interaction.values[0];
      const isApply = selectedValue === 'ticket_apply';
      
      const ticketType = isApply ? 'تقديم-إدارة' : 'دعم-فني';
      const ticketTitle = isApply ? '📋 التقديم على الإدارة' : '🎫 الدعم الفني';

      const ticketConfig = db.cfg(interaction.guild.id)?.tickets || {};
      const staffRoleId = ticketConfig.staffRoleId || ticketConfig.supportRoleId;
      const staffRole = staffRoleId ? interaction.guild.roles.cache.get(staffRoleId) : null;

      // إنشاء قناة التذكرة
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

      return interaction.editReply({ 
        content: `✨ **تم فتح تذكرتك بنجاح:** ${ch}` 
      }).catch(() => {});
    }

    // التعامل مع زر إغلاق التذكرة
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }

      await interaction.editReply({ 
        embeds: [new EmbedBuilder().setDescription('🔒 **سيتم حذف التذكرة خلال 5 ثوانٍ...**').setColor('#ed4245')]
      }).catch(() => {});

      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
