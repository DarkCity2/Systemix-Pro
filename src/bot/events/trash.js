const { Events } = require('discord.js');
const trash = require('../modules/trash');

// يشتغل دايماً (حتى لو اللوقات مطفية) عشان السلة تحفظ كل شي
module.exports = [
  { name: Events.GuildRoleDelete, execute: (r, client) => trash.captureRole(r, client) },
  { name: Events.ChannelDelete, execute: (c, client) => c.guild && trash.captureChannel(c, client) }
];
