const { Events } = require('discord.js');
const db = require('../../db');

module.exports = { name: Events.GuildCreate, execute: g => { db.guild(g.id); } };
