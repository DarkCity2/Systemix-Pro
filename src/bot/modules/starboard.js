const { EmbedBuilder } = require('discord.js');
const db = require('../../db');

async function update(reaction) {
  if (reaction.partial) reaction = await reaction.fetch().catch(() => null);
  if (!reaction) return;
  let msg = reaction.message;
  if (msg.partial) msg = await msg.fetch().catch(() => null);
  if (!msg?.guild) return;

  const guild = msg.guild;
  const c = db.cfg(guild.id).starboard;
  if (!c.enabled || !c.channelId || msg.channelId === c.channelId) return;
  const e = reaction.emoji;
  if (![e.name, e.toString(), e.id].includes(c.emoji)) return;

  const board = guild.channels.cache.get(c.channelId);
  if (!board?.isTextBased()) return;

  const users = await reaction.users.fetch().catch(() => null);
  if (!users) return;
  const count = users.filter(u => !u.bot && (c.allowSelf || u.id !== msg.author?.id)).size;

  const g = db.guild(guild.id);
  const existingId = g.starred[msg.id];
  const existing = existingId ? await board.messages.fetch(existingId).catch(() => null) : null;
  const header = `${c.emoji} **${count}** | <#${msg.channelId}>`;

  if (count >= Math.max(1, c.threshold)) {
    if (existing) return void existing.edit({ content: header }).catch(() => {});
    const embed = new EmbedBuilder().setColor(0xffac33).setTimestamp(msg.createdTimestamp)
      .setAuthor({ name: msg.author?.username || 'مجهول', iconURL: msg.author?.displayAvatarURL() })
      .addFields({ name: 'المصدر', value: `[الذهاب للرسالة](${msg.url})` });
    if (msg.content) embed.setDescription(msg.content.slice(0, 3500));
    const img = msg.attachments.find(a => a.contentType?.startsWith('image/'));
    if (img) embed.setImage(img.url);
    const sent = await board.send({ content: header, embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
    if (sent) { g.starred[msg.id] = sent.id; db.save(); }
  } else if (existing) {
    await existing.delete().catch(() => {});
    delete g.starred[msg.id];
    db.save();
  }
}

module.exports = { update };
