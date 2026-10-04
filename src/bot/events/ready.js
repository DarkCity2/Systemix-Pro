const { Events, ActivityType } = require('discord.js');
const cfg = require('../../config');
const stats = require('../modules/stats');
const invites = require('../modules/invites');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Systemix شغال باسم ${client.user.tag} في ${client.guilds.cache.size} سيرفر`);
    client.user.setActivity('لوحة التحكم | Systemix', { type: ActivityType.Watching });

    const body = [...client.commands.values()].map(c => c.data.toJSON());
    try {
      if (cfg.devGuildId) await (await client.guilds.fetch(cfg.devGuildId)).commands.set(body);
      else await client.application.commands.set(body);
      console.log(`✅ تم تسجيل ${body.length} أمر`);
    } catch (e) { console.error('❌ فشل تسجيل الأوامر:', e.message); }

    for (const g of client.guilds.cache.values()) g.members.fetch().catch(() => {});
    invites.init(client).catch(() => {});
    stats.start(client);
    console.log(`🌐 لوحة التحكم: ${cfg.baseUrl}`);
  }
};
