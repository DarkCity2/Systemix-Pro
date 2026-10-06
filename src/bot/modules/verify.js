const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkSub } = require('./subscription');

const verifyModule = {
  // التعامل مع زر التوثيق
  async handleButton(interaction, verifiedRoleId) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verify_user') return;

    // فحص هل اشتراك السيرفر شغال
    if (!checkSub(interaction.guildId).valid) return;

    const member = interaction.member;

    // إذا العضو عنده الرتبة من قبل
    if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
      return interaction.reply({ content: 'حسابك موثق بالفعل! ✅', ephemeral: true });
    }

    // إعطاء الرتبة للعضو
    if (verifiedRoleId) {
      await member.roles.add(verifiedRoleId).catch(() => {});
    }

    await interaction.reply({ content: 'تم توثيق حسابك بنجاح! 🎉', ephemeral: true });
  }
};

module.exports = verifyModule;
