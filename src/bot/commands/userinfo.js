const { SlashCommandBuilder } = require('discord.js');
const { brand } = require('../../util');
module.exports = {
  data: new SlashCommandBuilder().setName('userinfo').setDescription('معلومات عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو')),
  async execute(i) {
    const user = i.options.getUser('user') || i.user;
    const m = await i.guild.members.fetch(user.id).catch(() => null);
    const e = brand(i.guildId).setTitle(user.tag).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
      { name: '🆔 الايدي', value: user.id, inline: true },
      { name: '📅 إنشاء الحساب', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      ...(m ? [{ name: '📥 دخول السيرفر', value: `<t:${Math.floor(m.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '🎭 أعلى رتبة', value: m.roles.highest.toString(), inline: true }] : [])
    );
    i.reply({ embeds: [e] });
  }
};
