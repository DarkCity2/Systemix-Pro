const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('سرعة استجابة البوت'),
  async execute(i) { await i.reply(`🏓 ${i.client.ws.ping}ms`); }
};
