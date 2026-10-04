const { Events } = require('discord.js');
const tempvoice = require('../modules/tempvoice');

module.exports = {
  name: Events.VoiceStateUpdate,
  execute: (oldS, newS) => tempvoice.onVoice(oldS, newS)
};
