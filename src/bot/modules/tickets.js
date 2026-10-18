const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { checkSub } = require('./subscription');
const db = require('../../db');

const ticketModule = {
  // ---------- 1. نشر لوحة التذاكر بلمسة فخمة وتنسيق عالي الجودة ----------
  async publishPanel(guild) {
    const ticketConfig = db.cfg(guild.id)?.tickets || {};
    
    let channelId = ticketConfig.channelId || ticketConfig.panelChannelId || ticketConfig.room;
    let channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      channel = guild.channels.cache.find(c => c.isTextBased() && c.type === ChannelType.GuildText);
    }
    if (!channel) throw new Error('لم يتم العثور على روم نصي مناسب لنشر اللوحة');

    const title = ticketConfig.title || ' SYSTEMIX | SUPPORT CENTER';
    
    // تنسيق محتوى فخم مع استخدام الرموز والمحاذاة النظيفة
    const description = 
      `# ─── 🛠️ مركز الخدمة والدعم الفني ───\n\n` +
      `> **أهلاً بك في نظام التذاكر المطور المخصص لسيرفر ${guild.name}**\n` +
      `> يسعدنا خدمتك وطاقم الإدارة متواجد دائماً لمساعدتك.\n\n` +
      `### 📌 الأقسام المتاحة للفتح:\n` +
      `**[ 🎫 ] الدعم الفني العام**\n` +
      `┗ *خصص للاستفسارات، بلاغات المشاكل، والمساعدة العامة.*\n\n` +
      `**[ 📋 ] التقديم على طاقم الإدارة**\n` +
      `┗ *خصص للراغبين بالانضمام إلى الفريق الإداري للسيرفر.*\n\n` +
      `─── ⚠️ **تنبيه هام** ───\n` +
      `• *يرجى عدم فتح التذكرة لغير الحاجة.*\n` +
      `• *تجهز بجميع تفاصيل استفسارك أو طلبك فور الفتح.*`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#2b2d31') // اللون الفحمي المريح
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || null)
      .setFooter({ text: `${guild.name} • VIP System`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
      .setTimestamp();

    // أزرار تفاعلية بإيموجيات مرتبة
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

  // ---------- 2. فتح التذكرة بتنسيق إمبد داخلي فاخر للغاية ----------
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;

    if (!checkSub(interaction.guildId).valid) return;

    if (interaction.customId === 'ticket_support' || interaction.customId === 'ticket_apply') {
      const isApply = interaction.customId === 'ticket_apply';
      const ticketType = isApply ? 'تقديم-إدارة' : 'دعم-فني';
      const ticketTitle = isApply ? '📋 قسم التقديم الإداري' : '🎫 قسم الدعم الفني';
      
      const ticketConfig = db.cfg(interaction.guild.id)?.tickets || {};
      
      const defaultMsg = isApply 
        ? 'يرجى كتابة اسمك، عمرك، خبراتك السابقة، ولماذا ترغب بالانضمام لطاقمنا.' 
        : 'يرجى كتابة مشكلتك أو استفسارك بالتفصيل مع إرفاق أي صور أو أدلة إن وجدت.';
        
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

      const openTimestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;

      // إمبد داخلي ينطق فخامة
      const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: `${interaction.user.tag} • Systemix Tickets`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setColor(isApply ? '#2ecc71' : '#5865F2')
        .setDescription(
          `# ─── ${ticketTitle} ───\n\n` +
          `> **أهلاً بك <@${interaction.user.id}> في تذكرتك الخاصة!**\n\n` +
          `### 📝 المطلوب منك:\n` +
          `*${formattedWelcome}*\n\n` +
          `─── 📊 **معلومات التذكرة** ───\n` +
          `• **صاحب التذكرة:** <@${interaction.user.id}>\n` +
          `• **تاريخ الفتح:** ${openTimestamp}\n` +
          `• **المسؤولين:** ${staffRole ? `<@&${staffRole.id}>` : '`طاقم الإدارة`'}\n`
        )
        .setFooter({ text: `${interaction.guild.name} • Ticket System`, iconURL: interaction.guild.iconURL() || undefined })
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
        .setDescription('`جاري أرشفة وحذف القناة خلال 5 ثوانٍ...`')
        .setColor('#ed4245');

      await interaction.reply({ embeds: [confirmEmbed] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
