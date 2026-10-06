const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const { checkSub } = require('./subscription');

const ticketModule = {
  // التعامل مع ضغط الأزرار والنماذج
  async handleInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // فحص هل اشتراك السيرفر شغال
    if (!checkSub(interaction.guildId).valid) return;

    // عند الضغط على زر فتح تذكرة
    if (interaction.customId === 'open_ticket_modal') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_submit')
        .setTitle('نموذج فتح تذكرة');

      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('سبب التذكرة / الموضوع')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('ticket_desc')
        .setLabel('تفاصيل المشكلة أو الطلب')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(subjectInput),
        new ActionRowBuilder().addComponents(descInput)
      );

      await interaction.showModal(modal);
    }

    // عند تعبئة النموذج وإرساله
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_submit') {
      const subject = interaction.fields.getTextInputValue('ticket_subject');
      const desc = interaction.fields.getTextInputValue('ticket_desc');

      // إنشاء روم التذكرة
      const ch = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`مرحباً بك ${interaction.user.username}`)
        .addFields(
          { name: '📌 الموضوع', value: subject },
          { name: '📝 التفاصيل', value: desc }
        )
        .setColor('#57f287');

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('إغلاق التذكرة')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ch.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeBtn] });
      await interaction.reply({ content: `تم فتح تذكرتك بنجاح: ${ch}`, ephemeral: true });
    }

    // عند إغلاق التذكرة
    if (interaction.customId === 'close_ticket') {
      await interaction.reply('سيتم إغلاق التذكرة خلال 5 ثوانٍ...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};

module.exports = ticketModule;
