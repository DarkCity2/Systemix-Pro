// ♻️ سلة الاستعادة: أي رتبة/روم ينحذف يتحفظ 30 يوم ويرجع بنقرة من اللوحة
const { ChannelType, AuditLogEvent: A } = require('discord.js');
const db = require('../../db');
const L = require('./logger');

const KEEP = 30 * 864e5;

function add(guild, item) {
  const g = db.guild(guild.id);
  const t = Date.now();
  g.trash = g.trash.filter(x => t - x.at < KEEP);
  g.trash.unshift({ id: Math.random().toString(36).slice(2, 10), at: t, ...item });
  if (g.trash.length > 100) g.trash.length = 100;
  db.save();
}

async function captureRole(role, client) {
  if (role.managed) return;
  const members = role.guild.members.cache.filter(m => m._roles?.includes(role.id)).map(m => m.id).slice(0, 3000);
  const data = {
    name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable,
    permissions: role.permissions.bitfield.toString(), position: role.position, members
  };
  const en = await L.who(role.guild, A.RoleDelete, role.id);
  if (en?.executor?.id === client.user.id) return;
  add(role.guild, { kind: 'role', name: role.name, by: en?.executor?.username || 'غير معروف', data });
}

async function captureChannel(ch, client) {
  if (ch.isThread?.() || ch.name?.startsWith('ticket-')) return;
  const children = ch.type === ChannelType.GuildCategory
    ? [...ch.guild.channels.cache.values()].filter(c => c.parentId === ch.id).map(c => c.id) : [];
  const data = {
    name: ch.name, type: ch.type, parentId: ch.parentId || '', parentName: ch.parent?.name || '', topic: ch.topic || '',
    nsfw: !!ch.nsfw, rateLimitPerUser: ch.rateLimitPerUser || 0, bitrate: ch.bitrate || 0, userLimit: ch.userLimit || 0,
    position: ch.rawPosition ?? 0, children,
    overwrites: [...(ch.permissionOverwrites?.cache.values() || [])].map(o => ({ id: o.id, type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() }))
  };
  const en = await L.who(ch.guild, A.ChannelDelete, ch.id);
  if (en?.executor?.id === client.user.id) return;
  add(ch.guild, { kind: 'channel', name: ch.name, by: en?.executor?.username || 'غير معروف', data });
}

async function restoreRole(guild, item) {
  const d = item.data;
  const orig = BigInt(d.permissions);
  const perms = orig & guild.members.me.permissions.bitfield; // ما نقدر نعطي صلاحيات ما نملكها
  const role = await guild.roles.create({
    name: d.name, color: d.color, hoist: d.hoist, mentionable: d.mentionable,
    permissions: perms, reason: 'Systemix: استعادة من سلة المحذوفات'
  });
  await role.setPosition(Math.max(1, Math.min(d.position, guild.members.me.roles.highest.position - 1))).catch(() => {});
  const ids = d.members.filter(id => guild.members.cache.has(id));
  (async () => { for (const id of ids) await guild.members.cache.get(id)?.roles.add(role, 'Systemix: استعادة رتبة').catch(() => {}); })();
  return { name: role.name, members: ids.length, trimmed: perms !== orig };
}

async function restoreChannel(guild, item) {
  const d = item.data;
  let parent = d.parentId && guild.channels.cache.get(d.parentId)?.type === ChannelType.GuildCategory ? d.parentId : undefined;
  if (!parent && d.parentName) parent = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === d.parentName)?.id;
  const ow = d.overwrites
    .filter(o => (o.type === 0 ? guild.roles.cache.has(o.id) : guild.members.cache.has(o.id)))
    .map(o => ({ id: o.id, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) }));
  const opts = { name: d.name, type: d.type, permissionOverwrites: ow, reason: 'Systemix: استعادة من سلة المحذوفات' };
  if (parent) opts.parent = parent;
  if (d.topic) opts.topic = d.topic;
  if ([0, 5, 15].includes(d.type)) { opts.nsfw = d.nsfw; opts.rateLimitPerUser = d.rateLimitPerUser; }
  if ([2, 13].includes(d.type)) { if (d.bitrate) opts.bitrate = Math.min(d.bitrate, guild.maximumBitrate); opts.userLimit = d.userLimit; }
  const ch = await guild.channels.create(opts);
  ch.setPosition(d.position).catch(() => {});
  let moved = 0;
  if (d.type === ChannelType.GuildCategory) {
    for (const id of d.children || []) { const c = guild.channels.cache.get(id); if (c && !c.parentId) { await c.setParent(ch.id, { lockPermissions: false }).catch(() => {}); moved++; } }
  }
  return { name: ch.name, moved };
}

async function restore(guild, tid) {
  const g = db.guild(guild.id);
  const item = g.trash.find(x => x.id === tid);
  if (!item) throw new Error('العنصر غير موجود (يمكن انتهت صلاحيته)');
  let r;
  try { r = item.kind === 'role' ? await restoreRole(guild, item) : await restoreChannel(guild, item); }
  catch (e) { throw new Error(`فشلت الاستعادة: ${e.message}. تأكد أن للبوت صلاحية Manage ${item.kind === 'role' ? 'Roles' : 'Channels'}.`); }
  g.trash = g.trash.filter(x => x.id !== tid);
  db.save();
  return { kind: item.kind, ...r };
}

function discard(guild, tid) {
  const g = db.guild(guild.id);
  g.trash = g.trash.filter(x => x.id !== tid);
  db.save();
}

module.exports = { captureRole, captureChannel, restore, discard, KEEP };
