const { SlashCommandBuilder } = require('discord.js');
const { brand } = require('../../util');
module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('معلومات السيرفر'),
  async execute(i) {
    const g = i.guild;
    const e = brand(g.id).setTitle(g.name).setThumbnail(g.iconURL()).addFields(
      { name: '👑 المالك', value: `<@${g.ownerId}>`, inline: true },
      { name: '👥 الأعضاء', value: String(g.memberCount), inline: true },
      { name: '📁 الرومات', value: String(g.channels.cache.size), inline: true },
      { name: '🎭 الرتب', value: String(g.roles.cache.size), inline: true },
      { name: '💎 البوستات', value: String(g.premiumSubscriptionCount || 0), inline: true },
      { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true }
    );
    i.reply({ embeds: [e] });
  }
};
