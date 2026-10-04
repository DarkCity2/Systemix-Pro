const { Events } = require('discord.js');
const { EPH } = require('../../util');
const tickets = require('../modules/tickets');
const selfroles = require('../modules/selfroles');

module.exports = {
  name: Events.InteractionCreate,
  async execute(i, client) {
    if (i.isChatInputCommand()) {
      const cmd = client.commands.get(i.commandName);
      if (!cmd) return;
      if (!i.guild) return i.reply({ content: 'الأوامر تشتغل داخل السيرفرات فقط.', flags: EPH });
      try { await cmd.execute(i); }
      catch (e) {
        console.error(`[/${i.commandName}]`, e);
        const msg = { content: `❌ ${e.message || 'صار خطأ أثناء تنفيذ الأمر.'}`, flags: EPH };
        (i.replied || i.deferred ? i.followUp(msg) : i.reply(msg)).catch(() => {});
      }
      return;
    }
    if (i.isButton() && i.guild) {
      if (i.customId.startsWith('tk:')) return tickets.handle(i);
      if (i.customId.startsWith('sr:')) return selfroles.handle(i);
    }
  }
};
