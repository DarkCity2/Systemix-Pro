const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { checkSub } = require('./subscription');
const db = require('../../db');

const ticketModule = {
  // ---------- 1. نشر لوحة التذاكر الرئيسية بالخيارين ----------
  async publishPanel(guild) {
    const ticketConfig = db.cfg(guild.id)?.tickets || {};
    
    let channelId = ticketConfig.channelId || ticketConfig.panelChannelId || ticketConfig.room;
    let channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      channel = guild.channels.cache.find(c => c.isTextBased() && c.type === ChannelType.GuildText);
    }
    if (!channel) throw new Error('لم يتم العثور على روم نصي مناسب لنشر اللوحة');

    const title = ticketConfig.title || '✨ مركز التذاكر والخدمات الرسمية';
    const description = ticketConfig.description || 
      '# 🎯 أهلاً بك في نظام التذاكر\n' +
      '> يرجى اختيار القسم المناسب لطلبك من الأزرار أدناه:\n\n' +
      '```yaml\n' +
      '• الدعم الفني: للاستفسارات والمشاكل العامة\n' +
      '• التقديم على الإدارة: لطلب الانضمام لطاقم العمل\n' +
      '```';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#2b2d31')
      .setThumbnail(guild.iconURL({ dynamic: true }) || null)
      .setFooter({ text: `Systemix Management System • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
      .setTimestamp();

    // إنشاء زرين: الدعم الفني + التقديم على الإدارة
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_support')
        .setLabel('الدعم الفني')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_apply')
        .setLabel('التقديم على الإدارة')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Success)
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    return msg.url;
  },

  // ---------- 2. معالجة التفاعل وفتح التذاكر حسب الاختيار ----------
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;

    if (!checkSub(interaction.guildId).valid) return;

    if (interaction.customId === 'ticket_support' || interaction.customId === 'ticket_apply') {
      const isApply = interaction.customId === 'ticket_apply';
      const ticketType = isApply ? 'تقديم-إدارة' : 'دعم-فني';
      const ticketTitle = isApply ? '📋 التقديم على طاقم الإدارة' : '🎫 تذكرة الدعم الفني';
      
      const ticketConfig = db.cfg(interaction.guild.id)?.tickets || {};
      
      // رسالة الترحيب داخل التذكرة بناءً على النوع
      const defaultMsg = isApply 
        ? 'أهلاً بك يا بطل!\nيرجى كتابة عمرك، خبرتك، ولماذا تريد الانضمام للإدارة بالتفصيل.' 
        : 'أهلاً بك!\nاشرح مشكلتك أو استفسارك وسيرد عليك فريق الدعم في أقرب وقت.';
        
      const welcomeMsg = ticketConfig.welcomeMsg || defaultMsg;
      const formattedWelcome = welcomeMsg
        .replace(/{user}/g, `<@${interaction.user.id}>`)
        .replace(/{username}/g, interaction.user.username)
        .replace(/{server}/g, interaction.guild.name);

      const staffRoleId = ticketConfig.staffRoleId || ticketConfig.supportRoleId;
      const staffRole = staffRoleId ? interaction.guild.roles.cache.get(staffRoleId) : null;

      // إنشاء القناة
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
        .setAuthor({ name: `${ticketTitle} | ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setColor(isApply ? '#2ecc71' : '#3498db')
        .setDescription(
          `# 👑 مرحباً بك في تذكرتك\n\n` +
          `> ${formattedWelcome}\n\n` +
          ````yaml\n` +
          `• صاحب الطلب: ${interaction.user.username}\n` +
          `• نوع التذكرة: ${ticketTitle}\n` +
          `• وقت الفتح: ${openTimestamp}\n` +
          ````\n` +
          `**🛡️ الفريق المسؤول:** ${staffRole ? `<@&${staffRole.id}>` : '`طاقم الإدارة`'}`
        )
        .setFooter({ text: `Systemix Ticket System • ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() || undefined })
        .setTimestamp();

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
        content: `✨ **تم إنشاء تذكرتك بنجاح:** ${ch}`, 
        ephemeral: true 
      });
    }

    // زر إغلاق التذكرة
    if (interaction.customId === 'close_ticket') {
      const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 إغلاق التذكرة')
        .setDescription('`سيتم حذف التذكرة خلال 5 ثوانٍ تلقائياً...`')
        .setColor('#ed4245');

      await interaction.reply({ embeds: [confirmEmbed] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
