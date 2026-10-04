const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../../db');
const moderation = require('../modules/moderation');
const { EPH, brand } = require('../../util');

const withUser = (s, desc) => s.addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true));
const withReason = s => s.addStringOption(o => o.setName('reason').setDescription('السبب'));

module.exports = {
  data: new SlashCommandBuilder().setName('mod').setDescription('أوامر الإدارة')
    .setDefaultMemberPermissions(P.ModerateMembers)
    .addSubcommand(s => withReason(withUser(s)).setName('warn').setDescription('تحذير عضو'))
    .addSubcommand(s => withUser(s).setName('warnings').setDescription('عرض تحذيرات عضو'))
    .addSubcommand(s => withReason(withUser(s)).setName('kick').setDescription('طرد عضو'))
    .addSubcommand(s => withReason(withUser(s)).setName('ban').setDescription('حظر عضو'))
    .addSubcommand(s => withReason(s.addStringOption(o => o.setName('user_id').setDescription('ايدي المستخدم').setRequired(true))).setName('unban').setDescription('فك حظر'))
    .addSubcommand(s => withReason(withUser(s).addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق').setMinValue(1).setMaxValue(40320).setRequired(true))).setName('timeout').setDescription('كتم مؤقت'))
    .addSubcommand(s => withReason(withUser(s)).setName('untimeout').setDescription('فك الكتم'))
    .addSubcommand(s => s.setName('clear').setDescription('مسح رسائل').addIntegerOption(o => o.setName('amount').setDescription('العدد (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))),

  async execute(i) {
    const sub = i.options.getSubcommand();
    const need = { kick: P.KickMembers, ban: P.BanMembers, unban: P.BanMembers, clear: P.ManageMessages };
    if (!i.memberPermissions.has(need[sub] || P.ModerateMembers)) return i.reply({ content: '❌ ما عندك صلاحية لهذا الأمر.', flags: EPH });

    if (sub === 'clear') {
      const deleted = await i.channel.bulkDelete(i.options.getInteger('amount'), true);
      return i.reply({ content: `🧹 تم مسح ${deleted.size} رسالة.`, flags: EPH });
    }
    if (sub === 'warnings') {
      const u = i.options.getUser('user');
      const list = db.guild(i.guildId).warns[u.id] || [];
      const text = list.length ? list.map((w, n) => `**${n + 1}.** ${w.reason} — <t:${Math.floor(w.at / 1000)}:R>`).join('\n') : 'ما عليه تحذيرات ✅';
      return i.reply({ embeds: [brand(i.guildId).setTitle(`⚠️ تحذيرات ${u.username}`).setDescription(text.slice(0, 4000))], flags: EPH });
    }

    const target = sub === 'unban' ? { id: i.options.getString('user_id').trim(), username: i.options.getString('user_id').trim() } : i.options.getUser('user');
    if (sub !== 'unban' && target.id === i.user.id) return i.reply({ content: '❌ ما تقدر تطبق هذا على نفسك.', flags: EPH });
    const mod = { id: i.user.id, tag: i.user.username };
    const rec = await moderation.act(i.guild, sub, target, mod, i.options.getString('reason'), i.options.getInteger('minutes'));
    i.reply({ content: `✅ ${moderation.LABELS[sub]} — **${target.username || target.id}** (حالة #${rec.id})`, allowedMentions: { parse: [] } });
  }
};
