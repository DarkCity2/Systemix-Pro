const { Events, AuditLogEvent: A, ChannelType } = require('discord.js');
const db = require('../../db');
const L = require('../modules/logger');
const invites = require('../modules/invites');

const { user: U, ts, dur } = L;

// تفعيل مباشر ومؤكد لجميع اللوقات للاختبار والعمل الفوري
const on = (g, k) => {
  const c = db.cfg(g.id).logs;
  if (!c) return true;
  if (c.enabled === false) return false;
  if (!c.events || !c.events[k]) return true;
  return c.events[k].on !== false;
};

const ignored = (g, id) => db.cfg(g.id).logs?.ignoredChannels?.includes(id);
const ex = (en, label = '👮 بواسطة') => en?.executor ? [{ name: label, value: `<@${en.executor.id}>`, inline: true }] : [];
const why = en => en?.reason ? [{ name: '📝 السبب', value: en.reason }] : [];
const q = t => (t ? '>>> ' + String(t).slice(0, 1000) : '*رسالة فارغة أو تحتوي على وسائط فقط*');
const chName = c => `${c.type === ChannelType.GuildCategory ? '📁' : c.isVoiceBased?.() ? '🔊' : '#'} **${c.name}**`;
const CT = { 0: 'نصي', 2: 'صوتي', 4: 'كاتيجوري', 5: 'إعلانات', 13: 'ستيج', 15: 'منتدى' };
const swatch = c => `\`#${c.toString(16).padStart(6, '0')}\``;

// ================= الرسائل =================
const msgDelete = {
  name: Events.MessageDelete,
  async execute(m) {
    if (!m.guild || !on(m.guild, 'messageDelete') || m.author?.bot || ignored(m.guild, m.channelId)) return;
    const en = await L.who(m.guild, A.MessageDelete, m.author?.id, 700).catch(() => null);
    L.send(m.guild, 'messageDelete', {
      user: m.author ? U(m.author) : undefined, thumb: m.author?.displayAvatarURL({ size: 256 }),
      desc: `🗑️ **رسالة محذوفة** في <#${m.channelId}> بواسطة ${m.author ? `<@${m.author.id}>` : 'عضو غير معروف'}\n${m.content ? q(m.content) : '*لا يوجد نص محفوظ*'}`,
      fields: [
        { name: 'حذفها', value: en?.executor ? `<@${en.executor.id}>` : 'الكاتب نفسه / غير معروف', inline: true },
        ...(m.attachments?.size ? [{ name: '📎 مرفقات', value: [...m.attachments.values()].map(a => a.url).join('\n') }] : [])
      ],
      id: m.id
    });
  }
};

const msgEdit = {
  name: Events.MessageUpdate,
  async execute(o, n) {
    if (!n.guild || n.author?.bot || o.partial || o.content === n.content || !on(n.guild, 'messageEdit') || ignored(n.guild, n.channelId)) return;
    L.send(n.guild, 'messageEdit', {
      user: n.author ? U(n.author) : undefined, thumb: n.author?.displayAvatarURL({ size: 256 }),
      desc: `✏️ **تعديل رسالة** لـ <@${n.author?.id}> في <#${n.channelId}> • [الذهاب للرسالة](${n.url})`,
      fields: [{ name: '📜 قبل', value: q(o.content) }, { name: '✨ بعد', value: q(n.content) }],
      id: n.id
    });
  }
};

const msgBulk = {
  name: Events.MessageBulkDelete,
  async execute(msgs, channel) {
    const g = channel.guild;
    if (!g || !on(g, 'messageBulk')) return;
    const en = await L.who(g, A.MessageBulkDelete, channel.id).catch(() => null);
    L.send(g, 'messageBulk', { desc: `🧹 تم حذف **${msgs.size}** رسالة دفعة واحدة في <#${channel.id}>`, fields: ex(en), id: channel.id });
  }
};

// ================= الأعضاء =================
const join = {
  name: Events.GuildMemberAdd,
  async execute(m) {
    const inv = await invites.used(m.guild);
    if (!on(m.guild, 'memberJoin')) return;
    const created = m.user.createdTimestamp;
    const fresh = Date.now() - created < 7 * 864e5;
    L.send(m.guild, 'memberJoin', {
      user: U(m.user), thumb: m.user.displayAvatarURL({ size: 256 }),
      desc: `📥 <@${m.id}> **انضم للسيرفر**\nأنت العضو رقم **${m.guild.memberCount}**${m.user.bot ? ' 🤖' : ''}`,
      fields: [
        { name: '📅 عمر الحساب', value: ts(created) + (fresh ? '\n⚠️ **حساب جديد!**' : ''), inline: true },
        { name: '🔗 الدعوة المستخدمة', value: inv ? `\`discord.gg/${inv.code}\`${inv.inviter ? `\nبواسطة <@${inv.inviter.id}>` : ''}` : 'غير معروفة', inline: true }
      ],
      id: m.id
    });
  }
};

const leave = {
  name: Events.GuildMemberRemove,
  async execute(m) {
    const g = m.guild;
    const wantLeave = on(g, 'memberLeave'), wantKick = on(g, 'memberKick');
    if (!wantLeave && !wantKick) return;
    const en = await L.who(g, A.MemberKick, m.id).catch(() => null);
    const roles = m.roles?.cache?.filter(r => r.id !== g.id).map(r => r.toString()).join(' ') || '';
    const base = {
      user: m.user ? U(m.user) : undefined, thumb: m.user?.displayAvatarURL({ size: 256 }), id: m.id,
      fields: [
        ...(m.joinedTimestamp ? [{ name: '⏳ مدة البقاء', value: dur(Date.now() - m.joinedTimestamp), inline: true }] : []),
        ...(roles ? [{ name: '🎭 كانت رتبه', value: roles.slice(0, 1000) }] : [])
      ]
    };
    if (en && wantKick) return L.send(g, 'memberKick', { ...base, desc: `👢 <@${m.id}> **تم طرده من السيرفر**`, fields: [...ex(en), ...why(en), ...base.fields] });
    if (wantLeave) L.send(g, 'memberLeave', { ...base, desc: `📤 <@${m.id}> **غادر السيرفر**` });
  }
};

const ban = {
  name: Events.GuildBanAdd,
  async execute(b) {
    const g = b.guild;
    if (!on(g, 'memberBan')) return;
    const en = await L.who(g, A.MemberBanAdd, b.user.id).catch(() => null);
    L.send(g, 'memberBan', { user: U(b.user), thumb: b.user.displayAvatarURL({ size: 256 }), desc: `🚫 <@${b.user.id}> **تم حظره من السيرفر (Ban)**`, fields: [...ex(en), { name: '📝 السبب', value: b.reason || en?.reason || 'بدون سبب' }], id: b.user.id });
  }
};

const unban = {
  name: Events.GuildBanRemove,
  async execute(b) {
    const g = b.guild;
    if (!on(g, 'memberUnban')) return;
    const en = await L.who(g, A.MemberBanRemove, b.user.id).catch(() => null);
    L.send(g, 'memberUnban', { user: U(b.user), thumb: b.user.displayAvatarURL({ size: 256 }), desc: `🔓 <@${b.user.id}> **تم فك الحظر عنه (Unban)**`, fields: ex(en), id: b.user.id });
  }
};

const memberUpdate = {
  name: Events.GuildMemberUpdate,
  async execute(o, n) {
    if (o.partial) return;
    const g = n.guild;
    const base = { user: U(n.user), thumb: n.user.displayAvatarURL({ size: 256 }), id: n.id };

    if (o.nickname !== n.nickname && on(g, 'memberNickname')) {
      const en = await L.who(g, A.MemberUpdate, n.id).catch(() => null);
      L.send(g, 'memberNickname', { ...base, desc: `🏷️ **تغيّر لقب** <@${n.id}>`, fields: [{ name: '📜 قبل', value: o.nickname || '*بدون لقب*', inline: true }, { name: '✨ بعد', value: n.nickname || '*بدون لقب*', inline: true }, ...ex(en)] });
    }

    const added = n.roles.cache.filter(r => !o.roles.cache.has(r.id));
    const removed = o.roles.cache.filter(r => !n.roles.cache.has(r.id));
    if ((added.size || removed.size) && on(g, 'memberRoles')) {
      // جلب من قام بالفعل من سجلات التدقيق (Audit Log)
      const en = await L.who(g, A.MemberRoleUpdate, n.id).catch(() => null);
      
      L.send(g, 'memberRoles', {
        ...base, desc: `🎭 **تم تحديث رتب** <@${n.id}>`,
        fields: [
          ...(added.size ? [{ name: '➕ أُضيفت', value: added.map(r => r.toString()).join(' ') }] : []),
          ...(removed.size ? [{ name: '➖ أُزيلت', value: removed.map(r => r.toString()).join(' ') }] : []),
          ...ex(en)
        ]
      });
    }

    const a = o.communicationDisabledUntilTimestamp, b = n.communicationDisabledUntilTimestamp;
    if (a !== b && on(g, 'memberTimeout')) {
      const en = await L.who(g, A.MemberUpdate, n.id).catch(() => null);
      const set = b && b > Date.now();
      L.send(g, 'memberTimeout', {
        ...base, color: set ? undefined : L.C?.green,
        desc: set ? `🔇 <@${n.id}> **تم كتمه مؤقتاً (Timeout)**` : `🔊 <@${n.id}> **تم فك الكتم عنه**`,
        fields: [...(set ? [{ name: '⏳ ينتهي', value: `<t:${Math.floor(b / 1000)}:R>`, inline: true }] : []), ...ex(en), ...why(en)]
      });
    }
  }
};

// ================= الرومات =================
const chCreate = {
  name: Events.ChannelCreate,
  async execute(c) {
    if (!c.guild || !on(c.guild, 'channelCreate')) return;
    const en = await L.who(c.guild, A.ChannelCreate, c.id).catch(() => null);
    L.send(c.guild, 'channelCreate', { desc: `🛠️ **تم إنشاء روم جديد:** ${c}${chName(c)}`, fields: [{ name: '📂 النوع', value: CT[c.type] || String(c.type), inline: true }, ...(c.parent ? [{ name: '📁 الكاتيجوري', value: c.parent.name, inline: true }] : []), ...ex(en)], id: c.id });
  }
};

const chDelete = {
  name: Events.ChannelDelete,
  async execute(c) {
    if (!c.guild || c.isThread?.() || !on(c.guild, 'channelDelete')) return;
    const en = await L.who(c.guild, A.ChannelDelete, c.id).catch(() => null);
    L.send(c.guild, 'channelDelete', {
      desc: `🗑️ **تم حذف روم:** ${chName(c)}`,
      fields: [{ name: '📂 النوع', value: CT[c.type] || String(c.type), inline: true }, ...(c.parent ? [{ name: '📁 الكاتيجوري', value: c.parent.name, inline: true }] : []), ...ex(en)],
      id: c.id
    });
  }
};

const chUpdate = {
  name: Events.ChannelUpdate,
  async execute(o, n) {
    if (!n.guild || n.isThread?.() || !on(n.guild, 'channelUpdate')) return;
    const f = [];
    if (o.name !== n.name) f.push({ name: '📛 الاسم', value: `\`${o.name}\` ➔ \`${n.name}\``, inline: true });
    if (o.topic !== n.topic && (o.topic || n.topic)) f.push({ name: '📝 الوصف', value: `${o.topic \vert{}\vert{} '—'} ➔${n.topic || '—'}`.slice(0, 900) });
    if (o.rateLimitPerUser !== n.rateLimitPerUser) f.push({ name: '🐌 الوضع البطيء', value: `${o.rateLimitPerUser \vert{}\vert{} 0}ث ➔ ${n.rateLimitPerUser || 0}ث`, inline: true });
    if (o.parentId !== n.parentId) f.push({ name: '📁 الكاتيجوري', value: `${o.parent?.name \vert{}\vert{} '—'} ➔ ${n.parent?.name || '—'}`, inline: true });
    if (!f.length) return;
    const en = await L.who(n.guild, A.ChannelUpdate, n.id).catch(() => null);
    L.send(n.guild, 'channelUpdate', { desc: `🛠️ **تعديل إعدادات روم:** ${n}${chName(n)}`, fields: [...f, ...ex(en)], id: n.id });
  }
};

// ================= الرتب =================
const roleCreate = {
  name: Events.GuildRoleCreate,
  async execute(r) {
    if (!on(r.guild, 'roleCreate')) return;
    const en = await L.who(r.guild, A.RoleCreate, r.id).catch(() => null);
    L.send(r.guild, 'roleCreate', { desc: `🛠️ **تم إنشاء رتبة جديدة:** ${r} **${r.name}**`, fields: [{ name: '🎨 اللون', value: swatch(r.color), inline: true }, ...ex(en)], id: r.id });
  }
};

const roleDelete = {
  name: Events.GuildRoleDelete,
  async execute(r) {
    if (!on(r.guild, 'roleDelete')) return;
    const en = await L.who(r.guild, A.RoleDelete, r.id).catch(() => null);
    const perms = L.permNames(r.permissions.bitfield);
    L.send(r.guild, 'roleDelete', {
      desc: `🗑️ **تم حذف رتبة:** ${r.unicodeEmoji || '🎭'} **${r.name}**`,
      fields: [
        { name: '🎨 اللون', value: swatch(r.color), inline: true },
        ...ex(en),
        ...(perms.length ? [{ name: '📋 أهم الصلاحيات', value: perms.slice(0, 8).join(' • ') }] : [])
      ],
      id: r.id
    });
  }
};

const roleUpdate = {
  name: Events.GuildRoleUpdate,
  async execute(o, n) {
    if (!on(n.guild, 'roleUpdate')) return;
    const f = [];
    if (o.name !== n.name) f.push({ name: '📛 الاسم', value: `\`${o.name}\` ➔ \`${n.name}\`` });
    if (o.color !== n.color) f.push({ name: '🎨 اللون', value: `${swatch(o.color)} ➔ ${swatch(n.color)}`, inline: true });
    if (o.hoist !== n.hoist) f.push({ name: '📌 عرض منفصل', value: n.hoist ? 'تفعيل' : 'إيقاف', inline: true });
    if (!f.length) return;
    const en = await L.who(n.guild, A.RoleUpdate, n.id).catch(() => null);
    L.send(n.guild, 'roleUpdate', { desc: `🛠️ **تعديل إعدادات رتبة:** ${n} **${n.name}**`, fields: [...f, ...ex(en)], id: n.id });
  }
};

// ================= الصوت =================
const voice = {
  name: Events.VoiceStateUpdate,
  async execute(o, n) {
    if (o.channelId === n.channelId || !n.member) return;
    const g = n.guild, m = n.member;
    const key = !o.channelId ? 'voiceJoin' : !n.channelId ? 'voiceLeave' : 'voiceMove';
    if (!on(g, key)) return;
    const desc = key === 'voiceJoin' ? `🎙️ <@${m.id}> **دخل الروم الصوتي** <#${n.channelId}>` : key === 'voiceLeave' ? `🚪 <@${m.id}> **خرج من الروم الصوتي** <#${o.channelId}>` : `🔀 <@${m.id}> **انتقل من** <#${o.channelId}> **إلى** <#${n.channelId}>`;
    L.send(g, key, { user: U(m.user), thumb: m.user.displayAvatarURL({ size: 256 }), desc, id: m.id });
  }
};

module.exports = [msgDelete, msgEdit, msgBulk, join, leave, ban, unban, memberUpdate, chCreate, chDelete, chUpdate, roleCreate, roleDelete, roleUpdate, voice];
