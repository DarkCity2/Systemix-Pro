const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../../db');

async function onVoice(oldS, newS) {
  const guild = newS.guild || oldS.guild;
  const c = db.cfg(guild.id).tempchannels;
  const g = db.guild(guild.id);

  if (c.enabled && c.hubChannelId && newS.channelId === c.hubChannelId && newS.member) {
    const name = (c.nameTemplate || '🔊 {username}').replaceAll('{username}', newS.member.user.username).replaceAll('{count}', String(Object.keys(g.temp).length + 1)).slice(0, 100);
    const ch = await guild.channels.create({
      name, type: ChannelType.GuildVoice,
      parent: c.categoryId || newS.channel?.parentId || null,
      userLimit: Math.min(Math.max(0, Number(c.userLimit) || 0), 99),
      permissionOverwrites: [{ id: newS.member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect] }]
    }).catch(() => null);
    if (ch) {
      g.temp[ch.id] = newS.member.id;
      db.save();
      await newS.member.voice.setChannel(ch).catch(() => {});
    }
  }

  if (oldS.channelId && g.temp[oldS.channelId] && oldS.channel && oldS.channel.members.size === 0) {
    delete g.temp[oldS.channelId];
    db.save();
    oldS.channel.delete('Systemix: قناة مؤقتة فاضية').catch(() => {});
  }
}

module.exports = { onVoice };
