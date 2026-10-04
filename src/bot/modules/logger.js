const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../db');

const C = { red: 0xed4245, green: 0x57f287, yellow: 0xfee75c, blue: 0x5865f2, orange: 0xf0883e, pink: 0xeb459e, purple: 0x8b3dff };

// [العنوان، الإيموجي، اللون] — الإيموجي بآخر العنوان مثل ProBot
const EVENTS = {
  messageDelete: ['رسالة محذوفة', '🗑️', C.red], messageEdit: ['رسالة معدّلة', '✏️', C.yellow], messageBulk: ['حذف رسائل جماعي', '🧹', C.red],
  memberJoin: ['عضو جديد', '📥', C.green], memberLeave: ['عضو غادر', '📤', C.red], memberKick: ['طرد عضو', '👢', C.orange],
  memberBan: ['حظر عضو', '🔨', C.red], memberUnban: ['فك حظر', '♻️', C.green], memberNickname: ['تغيير لقب', '🏷️', C.yellow],
  memberRoles: ['تحديث رتب عضو', '🎭', C.blue], memberTimeout: ['كتم مؤقت', '🔇', C.pink],
  channelCreate: ['روم جديد', '📁', C.green], channelDelete: ['روم محذوف', '🗑️', C.red], channelUpdate: ['تعديل روم', '🛠️', C.yellow],
  roleCreate: ['رتبة جديدة', '🎭', C.green], roleDelete: ['رتبة محذوفة', '🗑️', C.red], roleUpdate: ['تعديل رتبة', '🛠️', C.yellow],
  voiceJoin: ['دخول روم صوتي', '🔊', C.green], voiceLeave: ['خروج من روم صوتي', '🔇', C.red], voiceMove: ['انتقال صوتي', '🔀', C.blue],
  guildUpdate: ['تعديل السيرفر', '⚙️', C.yellow], emojiCreate: ['إيموجي جديد', '😀', C.green], emojiDelete: ['إيموجي محذوف', '🗑️', C.red],
  inviteCreate: ['دعوة جديدة', '🔗', C.green], inviteDelete: ['دعوة محذوفة', '🔗', C.red],
  automod: ['حماية تلقائية', '🛡️', C.red], ticketOpen: ['تذكرة جديدة', '🎫', C.green], ticketClose: ['تذكرة مغلقة', '🔒', C.red]
};

const PERM_AR = {
  Administrator: 'مدير (Administrator)', ManageGuild: 'إدارة السيرفر', ManageRoles: 'إدارة الرتب', ManageChannels: 'إدارة الرومات',
  KickMembers: 'طرد الأعضاء', BanMembers: 'حظر الأعضاء', ManageMessages: 'إدارة الرسائل', MentionEveryone: 'منشن الجميع',
  ModerateMembers: 'كتم الأعضاء', ViewAuditLog: 'عرض سجل التدقيق', ManageWebhooks: 'إدارة الويب هوك', ManageNicknames: 'إدارة الألقاب',
  SendMessages: 'إرسال رسائل', ViewChannel: 'رؤية الرومات', Connect: 'دخول الصوت', Speak: 'التحدث', ManageEmojisAndStickers: 'إدارة الإيموجي'
};

const ts = ms => `<t:${Math.floor(ms / 1000)}:F>\n<t:${Math.floor(ms / 1000)}:R>`;
const user = u => ({ name: u.username || u.tag || String(u.id), icon: u.displayAvatarURL?.({ size: 128 }) });

function dur(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const p = [];
  if (d) p.push(`${d} يوم`); if (h) p.push(`${h} ساعة`); if (m) p.push(`${m} دقيقة`);
  if (!p.length) p.push(`${s} ثانية`);
  return p.slice(0, 2).join(' و ');
}

function permNames(bits) {
  return new PermissionsBitField(BigInt(bits)).toArray().map(p => PERM_AR[p] || p.replace(/([a-z])([A-Z])/g, '$1 $2'));
}

// يجيب من نفّذ العملية من سجل التدقيق (Audit Log)
async function who(guild, type, targetId, wait = 900) {
  if (!guild.members.me?.permissions.has('ViewAuditLog')) return null;
  await new Promise(r => setTimeout(r, wait));
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const now = Date.now();
    return logs.entries.find(e => (!targetId || e.targetId === targetId) && now - e.createdTimestamp < 15000) || null;
  } catch { return null; }
}

// تصميم موحّد لكل اللوقات
function build(key, d) {
  const [title, emoji, color] = EVENTS[key];
  const e = new EmbedBuilder().setColor(d.color ?? color).setTitle(`${title} ${emoji}`).setTimestamp();
  if (d.user) e.setAuthor({ name: d.user.name, iconURL: d.user.icon });
  if (d.desc) e.setDescription(String(d.desc).slice(0, 4000));
  const fields = (d.fields || []).filter(f => f && f.value !== undefined && f.value !== '' && f.value !== null);
  if (fields.length) e.addFields(fields.slice(0, 25).map(f => ({ name: f.name, value: String(f.value).slice(0, 1024) || '—', inline: f.inline ?? false })));
  if (d.thumb) e.setThumbnail(d.thumb);
  if (d.image) e.setImage(d.image);
  e.setFooter({ text: d.id ? `Systemix • ID: ${d.id}` : 'Systemix • Logs' });
  return e;
}

async function send(guild, key, d) {
  const c = db.cfg(guild.id).logs;
  if (!c.enabled) return;
  const ev = c.events[key];
  if (!ev?.on) return;
  const chId = ev.channelId || c.defaultChannelId;
  const ch = chId && guild.channels.cache.get(chId);
  if (!ch?.isTextBased()) return;
  return ch.send({ embeds: [build(key, d)], allowedMentions: { parse: [] } }).catch(() => {});
}

async function test(guild, key, channelId) {
  if (!EVENTS[key]) throw new Error('حدث غير معروف');
  const c = db.cfg(guild.id).logs;
  const chId = channelId || c.events[key]?.channelId || c.defaultChannelId;
  const ch = chId && guild.channels.cache.get(chId);
  if (!ch?.isTextBased()) throw new Error('اختر روم للوق (أو روم افتراضي) أولاً');
  const me = guild.client.user;
  await ch.send({
    embeds: [build(key, {
      user: user(me), thumb: me.displayAvatarURL({ size: 256 }),
      desc: '🧪 هذا لوق تجريبي لمعاينة الشكل — الأحداث الحقيقية تظهر بنفس التصميم.',
      fields: [{ name: '👮 بواسطة', value: `<@${me.id}>`, inline: true }, { name: '🕒 الوقت', value: ts(Date.now()), inline: true }],
      id: me.id
    })],
    allowedMentions: { parse: [] }
  }).catch(() => { throw new Error('ما أقدر أرسل في هذا الروم (تحقق من صلاحيات البوت)'); });
}

module.exports = { EVENTS, C, ts, user, dur, permNames, who, build, send, test };
