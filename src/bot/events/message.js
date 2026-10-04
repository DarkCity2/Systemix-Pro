const { Events } = require('discord.js');
const db = require('../../db');
const automod = require('../modules/automod');
const leveling = require('../modules/leveling');

function autoresponder(message) {
  const c = db.cfg(message.guildId).autoresponder;
  if (!c.enabled || !message.content) return;
  const text = message.content.trim().toLowerCase();
  const hit = c.replies.find(r => {
    const t = String(r.trigger || '').trim().toLowerCase();
    if (!t) return false;
    return r.match === 'contains' ? text.includes(t) : r.match === 'starts' ? text.startsWith(t) : text === t;
  });
  if (!hit || !hit.response) return;
  const out = String(hit.response).replaceAll('{user}', `<@${message.author.id}>`).replaceAll('{server}', message.guild.name);
  const opts = { content: out, allowedMentions: { users: [message.author.id], repliedUser: false } };
  (hit.reply === false ? message.channel.send(opts) : message.reply(opts)).catch(() => {});
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot || message.webhookId || message.partial) return;
    db.bump(message.guild.id, 'msgs');
    if (await automod.check(message)) return;
    leveling.onMessage(message);
    autoresponder(message);
  }
};
