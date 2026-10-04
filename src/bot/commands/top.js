const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db');
const cfg = require('../../config');
const leveling = require('../modules/leveling');
const { brand, EPH } = require('../../util');

module.exports = {
  data: new SlashCommandBuilder().setName('top').setDescription('أعلى 10 أعضاء في المستويات'),
  async execute(i) {
    const c = db.cfg(i.guildId).leveling;
    if (!c.enabled) return i.reply({ content: 'نظام المستويات غير مفعّل.', flags: EPH });
    const top = leveling.leaderboard(i.guildId).slice(0, 10);
    if (!top.length) return i.reply({ content: 'ما فيه أحد عنده خبرة للحين.', flags: EPH });
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((u, n) => `${medals[n] || `**${n + 1}.**`} <@${u.id}> — المستوى **${u.level}** • ${u.xp} XP`);
    if (c.publicLeaderboard) lines.push(`\n🔗 [الترتيب الكامل](${cfg.baseUrl}/leaderboard/${i.guildId})`);
    i.reply({ embeds: [brand(i.guildId).setTitle('🏆 المتصدرين').setDescription(lines.join('\n'))], allowedMentions: { parse: [] } });
  }
};
