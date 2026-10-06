const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db');
const { checkSub } = require('./subscription');

const economyModule = {
  // إضافة أو خصم نقاط
  addPoints(guildId, userId, amount) {
    const cfg = db.cfg ? db.cfg(guildId) : {};
    if (!cfg.economy) cfg.economy = {};
    if (!cfg.economy[userId]) cfg.economy[userId] = 0;
    
    cfg.economy[userId] += amount;
    if (db.saveCfg) db.saveCfg(guildId, cfg);
    return cfg.economy[userId];
  },

  // معرفة رصيد العضو
  getPoints(guildId, userId) {
    const cfg = db.cfg ? db.cfg(guildId) : {};
    return cfg.economy?.[userId] || 0;
  },

  // التعامل مع زر شراء الرتب من المتجر
  async handleBuy(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('buy_role_')) return;

    // فحص هل اشتراك السيرفر شغال
    if (!checkSub(interaction.guildId).valid) return;

    const [, , roleId, priceStr] = interaction.customId.split('_');
    const price = parseInt(priceStr, 10);
    const userPoints = this.getPoints(interaction.guildId, interaction.user.id);

    if (userPoints < price) {
      return interaction.reply({ 
        content: `رصيدك غير كافٍ! تحتاج إلى **${price}** نقطة (رصيدك الحالي: ${userPoints}).`, 
        ephemeral: true 
      });
    }

    // خصم النقاط وإعطاء الرتبة
    this.addPoints(interaction.guildId, interaction.user.id, -price);
    await interaction.member.roles.add(roleId).catch(() => {});
    
    await interaction.reply({ 
      content: `تم شراء الرتبة بنجاح! 🎉 تم خصم **${price}** نقطة من رصيدك.`, 
      ephemeral: true 
    });
  }
};

module.exports = economyModule;
