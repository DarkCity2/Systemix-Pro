const { Events } = require('discord.js');
const db = require('../../db');
const { fmt, brand, hexToInt } = require('../../util');
const antiraid = require('../modules/antiraid');
const stats = require('../modules/stats');

const add = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const { guild } = member;
    if (await antiraid.onJoin(member)) return;
    db.bump(guild.id, 'joins');
    const cfg = db.cfg(guild.id);

    const ar = cfg.autoroles;
    if (ar.enabled) {
      const ids = (member.user.bot ? ar.botRoles : ar.memberRoles).filter(id => guild.roles.cache.has(id));
      if (ids.length) {
        const give = () => member.roles.add(ids, 'Systemix AutoRole').catch(() => {});
        ar.delaySec > 0 ? setTimeout(give, Math.min(ar.delaySec, 3600) * 1000) : give();
      }
    }

    const w = cfg.welcome;
    if (w.enabled && w.channelId && !member.user.bot) {
      const ch = guild.channels.cache.get(w.channelId);
      if (ch?.isTextBased()) {
        const text = fmt(w.message, member);
        if (w.useEmbed) {
          const e = brand(guild.id).setColor(hexToInt(w.embedColor)).setTitle('👋 أهلاً وسهلاً').setDescription(text);
          if (w.showAvatar) e.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
          ch.send({ content: `<@${member.id}>`, embeds: [e] }).catch(() => {});
        } else ch.send({ content: text, allowedMentions: { users: [member.id] } }).catch(() => {});
      }
      if (w.dm && w.dmMessage) member.send(fmt(w.dmMessage, member)).catch(() => {});
    }
    stats.schedule(guild);
  }
};

const remove = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const { guild } = member;
    db.bump(guild.id, 'leaves');
    const w = db.cfg(guild.id).welcome;
    if (w.goodbyeEnabled && w.goodbyeChannelId && member.user && !member.user.bot) {
      const ch = guild.channels.cache.get(w.goodbyeChannelId);
      if (ch?.isTextBased()) ch.send({ embeds: [brand(guild.id).setColor(0xed4245).setDescription(fmt(w.goodbyeMessage, member))], allowedMentions: { parse: [] } }).catch(() => {});
    }
    stats.schedule(guild);
  }
};

module.exports = [add, remove];
