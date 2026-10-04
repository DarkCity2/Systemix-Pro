const { Events } = require('discord.js');
const starboard = require('../modules/starboard');

module.exports = [
  { name: Events.MessageReactionAdd, execute: r => starboard.update(r) },
  { name: Events.MessageReactionRemove, execute: r => starboard.update(r) }
];
