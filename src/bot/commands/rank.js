const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db');
const { levelFromXp, brand, bar, EPH } = require('../../util');

module.exports = {
  data: new SlashCommandBuilder().setName('rank').setDescription('عرض مستواك أو مستوى عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو')),
  async execute(i) {
    if (!db.cfg(i.guildId).leveling.enabled) return i.reply({ content: 'نظام المستويات غير مفعّل.', flags: EPH });
    const user = i.options.getUser('user') || i.user;
    const g = db.guild(i.guildId);
    const u = g.xp[user.id] || { xp: 0, msgs: 0 };
    const { level, current, need } = levelFromXp(u.xp);
    const rank = Object.entries(g.xp).sort((a, b) => b[1].xp - a[1].xp).findIndex(([id]) => id === user.id) + 1;
    const e = brand(i.guildId).setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setDescription(`🏅 **الترتيب:** ${rank || '—'}\n⭐ **المستوى:** ${level}\n✨ **الخبرة:** ${current}/${need} (الإجمالي ${u.xp})\n💬 **الرسائل:** ${u.msgs}\n\`${bar(current, need)}\``);
    i.reply({ embeds: [e] });
  }
};
