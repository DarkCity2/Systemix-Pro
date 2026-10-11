const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { checkSub } = require('./subscription');

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
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;

    // فحص اشتراك السيرفر
    if (!checkSub(interaction.guildId).valid) return;

    // إذا ضغط المستخدم على زر تذكرة لون (يبدأ بـ ticket_)
    if (interaction.customId.startsWith('ticket_')) {
      const baseKey = interaction.customId.replace('ticket_', '');
      const baseName = baseNames[baseKey] || 'Custom Base';

      // إنشاء روم خاصة بالتذكرة للعضو
      const ch = await interaction.guild.channels.create({
        name: `ticket-${baseKey}-${interaction.user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎫 تذكرة لون: ${baseName}`)
        .setDescription(`مرحباً <@${interaction.user.id}>!\nلقد فتحت تذكرة للحصول على لون **${baseName}**.\nالرجاء إرسال إثباتك أو المتطلبات للإدارة هنا.`);

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('إغلاق التذكرة')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ch.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeBtn] });
      return interaction.reply({ content: `تم إنشاء تذكرتك بنجاح: ${ch}`, ephemeral: true });
    }

    // زر إغلاق التذكرة
    if (interaction.customId === 'close_ticket') {
      await interaction.reply('سيتم إغلاق التذكرة خلال 5 ثوانٍ...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
