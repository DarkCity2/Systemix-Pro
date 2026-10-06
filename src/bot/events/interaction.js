const ticketModule = require('../modules/tickets');
const verifyModule = require('../modules/verify');
const economyModule = require('../modules/economy');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // 1. تشغيل نظام التذاكر (الأزرار والنماذج)
      await ticketModule.handleInteraction(interaction);

      // 2. تشغيل نظام التوثيق
      await verifyModule.handleButton(interaction, null);

      // 3. تشغيل نظام الشراء من المتجر
      await economyModule.handleBuy(interaction);
    } catch (error) {
      console.error('حدث خطأ في معالجة التفاعل:', error);
    }
  }
};
