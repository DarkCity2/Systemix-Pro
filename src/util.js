const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('./db');

const EPH = MessageFlags.Ephemeral;

function rand(a, b) {
  a = Number(a) || 0; b = Number(b) || 0;
  if (a > b) [a, b] = [b, a];
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// نفس معادلة MEE6
function levelFromXp(total) {
  let level = 0, need = 100, xp = total;
  while (xp >= need) { xp -= need; level++; need = 5 * level * level + 50 * level + 100; }
  return { level, current: xp, need };
}

function hexToInt(h, fb = 0x8b3dff) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
  return m ? parseInt(m[1], 16) : fb;
}

function fmt(text, member) {
  const age = Math.floor((Date.now() - member.user.createdTimestamp) / 864e5);
  return String(text || '')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{count}', String(member.guild.memberCount))
    .replaceAll('{accountAge}', String(age));
}

function brand(guildId) {
  const s = db.cfg(guildId).settings;
  const e = new EmbedBuilder().setColor(hexToInt(s.embedColor));
  if (s.footer) e.setFooter({ text: s.footer });
  return e;
}

const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const bar = (cur, max, len = 12) => {
  const f = Math.max(0, Math.min(len, Math.round((cur / max) * len)));
  return '█'.repeat(f) + '░'.repeat(len - f);
};

module.exports = { EPH, rand, levelFromXp, hexToInt, fmt, brand, trunc, bar };
