const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const { PermissionsBitField, PermissionFlagsBits: P, ChannelType } = require('discord.js');

const cfg = require('../config');
const db = require('../db');
const moderation = require('../bot/modules/moderation');
const tickets = require('../bot/modules/tickets');
const selfroles = require('../bot/modules/selfroles');
const stats = require('../bot/modules/stats');
const leveling = require('../bot/modules/leveling');
const trash = require('../bot/modules/trash');
const logger = require('../bot/modules/logger');
const { hexToInt, levelFromXp } = require('../util');
const { EmbedBuilder } = require('discord.js');

const DISCORD = 'https://discord.com/api/v10';
const ENABLE_KEYS = ['welcome', 'autoresponder', 'leveling', 'autoroles', 'selfroles', 'starboard', 'tempchannels', 'stats', 'tickets', 'logs', 'automod', 'antiraid'];
const PUBLIC = path.join(__dirname, '..', '..', 'public');

// ---------- تنظيف المدخلات حسب شكل الإعدادات الافتراضية ----------
const prim = x => (typeof x === 'number' || typeof x === 'boolean') ? x : String(x ?? '').slice(0, 2000);
function cleanItem(o) {
  const out = {};
  if (!db.isObj(o)) return out;
  for (const [k, v] of Object.entries(o).slice(0, 20)) {
    if (/^\w{1,30}$/.test(k) && ['string', 'number', 'boolean'].includes(typeof v)) out[k] = prim(v);
  }
  return out;
}
function clean(def, val) {
  if (db.isObj(def)) {
    const out = {};
    for (const k of Object.keys(def)) out[k] = clean(def[k], db.isObj(val) ? val[k] : undefined);
    return out;
  }
  if (Array.isArray(def)) {
    if (!Array.isArray(val)) return [];
    return val.slice(0, 100).map(x => db.isObj(x) ? cleanItem(x) : prim(x));
  }
  if (typeof def === 'boolean') return val === true || val === 'true';
  if (typeof def === 'number') { const n = Number(val); return Number.isFinite(n) ? n : def; }
  return String(val ?? def).slice(0, 2000);
}

const isUrl = s => /^https?:\/\/\S+$/i.test(s || '');
const canManage = g => g.owner || (BigInt(g.permissions) & (P.Administrator | P.ManageGuild)) !== 0n;

function start(client) {
  const app = express();
  const https = cfg.baseUrl.startsWith('https');
  if (https) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '300kb' }));
  app.use(session({
    name: 'sx.sid', secret: cfg.sessionSecret, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: https, maxAge: 7 * 864e5 }
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.method !== 'GET' && req.path.startsWith('/api/')) {
      const origin = req.get('origin');
      if (!req.is('json') || (origin && origin !== cfg.baseUrl)) return res.status(403).json({ error: 'طلب مرفوض' });
    }
    next();
  });

  const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => res.status(400).json({ error: e.message || 'خطأ' }));
  const redirectUri = `${cfg.baseUrl}/auth/callback`;

  // ---------- نظام الحماية بكلمة المرور (الباسورد) ----------
  const SITE_PASSWORD = process.env.DASHBOARD_PASSWORD || process.env.SITE_PASSWORD || '12345';

  app.post('/auth/login', (req, res) => {
    const { password } = req.body || {};
    if (password === SITE_PASSWORD) {
      req.session.passwordAuthenticated = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
  });

  const needPassword = (req, res, next) => {
    if (req.session && req.session.passwordAuthenticated) return next();
    return res.status(401).json({ error: 'Password Required' });
  };

  // ---------- تسجيل الدخول عبر ديسكورد ----------
  app.get('/auth/discord/login', needPassword, (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
    res.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({
      client_id: cfg.clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'identify guilds', state, prompt: 'none'
    }));
  });

  app.get('/auth/callback', needPassword, ah(async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.state) return res.redirect('/?error=state');
    const tok = await fetch(`${DISCORD}/oauth2/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    }).then(r => r.json());
    if (!tok.access_token) return res.redirect('/?error=token');
    const h = { Authorization: `Bearer ${tok.access_token}` };
    const [user, guilds] = await Promise.all([
      fetch(`${DISCORD}/users/@me`, { headers: h }).then(r => r.json()),
      fetch(`${DISCORD}/users/@me/guilds`, { headers: h }).then(r => r.json())
    ]);
    if (!user.id || !Array.isArray(guilds)) return res.redirect('/?error=user');
    req.session.user = { id: user.id, username: user.global_name || user.username, avatar: user.avatar };
    req.session.guilds = guilds.map(g => ({ id: g.id, name: g.name, icon: g.icon, owner: g.owner, permissions: g.permissions }));
    delete req.session.state;
    res.redirect('/#/');
  }));

  app.get('/auth/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

  const invite = (guildId) => 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
    client_id: cfg.clientId, scope: 'bot applications.commands',
    permissions: new PermissionsBitField([
      P.ViewChannel, P.SendMessages, P.ManageMessages, P.EmbedLinks, P.AttachFiles, P.ReadMessageHistory, P.AddReactions,
      P.UseExternalEmojis, P.ManageChannels, P.ManageRoles, P.KickMembers, P.BanMembers, P.ModerateMembers,
      P.MoveMembers, P.ViewAuditLog, P.ManageNicknames, P.Connect, P.ManageGuild
    ]).bitfield.toString(),
    ...(guildId ? { guild_id: guildId, disable_guild_select: 'true' } : {})
  });

  app.get('/invite', needPassword, (req, res) => res.redirect(invite(req.query.guild)));

  // ---------- واجهات عامة ----------
  app.get('/api/public/leaderboard/:id', ah(async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild || !db.cfg(guild.id).leveling.publicLeaderboard || !db.cfg(guild.id).leveling.enabled) return res.status(404).json({ error: 'الترتيب غير متاح' });
    const entries = leveling.leaderboard(guild.id).slice(0, 100).map((u, n) => ({ rank: n + 1, id: u.id, name: u.name || u.id, avatar: u.avatar || '', xp: u.xp, level: u.level, msgs: u.msgs }));
    res.json({ guild: { id: guild.id, name: guild.name, icon: guild.icon, members: guild.memberCount }, entries });
  }));

  app.get('/leaderboard/:id', (req, res) => res.sendFile(path.join(PUBLIC, 'leaderboard.html')));

  // ---------- يتطلب تسجيل دخول ----------
  const needLogin = (req, res, next) => {
    if (!req.session || !req.session.passwordAuthenticated) return res.status(401).json({ error: 'Password Required' });
    if (!req.session.user) return res.status(401).json({ error: 'سجل دخولك أول' });
    next();
  };

  app.get('/api/me', needPassword, (req, res) => {
    if (!req.session.user) {
      return res.json({ passwordAuthenticated: true, user: null });
    }
    res.json({
      passwordAuthenticated: true,
      user: req.session.user,
      guilds: req.session.guilds.filter(canManage).map(g => ({ id: g.id, name: g.name, icon: g.icon, botIn: client.guilds.cache.has(g.id), inviteUrl: invite(g.id) }))
    });
  });

  const gauth = (req, res, next) => {
    if (!req.session || !req.session.passwordAuthenticated) return res.status(401).json({ error: 'Password Required' });
    const sg = req.session.guilds?.find(g => g.id === req.params.id);
    if (!req.session.user || !sg || !canManage(sg)) return res.status(403).json({ error: 'ما عندك صلاحية على هذا السيرفر' });
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'البوت مو موجود في هذا السيرفر' });
    req.guild = guild;
    next();
  };
  const G = '/api/guilds/:id';
  const logPanel = (req, action, detail = '') => db.panelLog(req.guild.id, { userId: req.session.user.id, userTag: req.session.user.username, action, detail });
  const enabledMap = id => Object.fromEntries(ENABLE_KEYS.map(k => [k, !!db.cfg(id)[k].enabled]));

  app.get(`${G}/meta`, gauth, (req, res) => {
    const g = req.guild;
    res.json({
      guild: { id: g.id, name: g.name, icon: g.icon },
      channels: [...g.channels.cache.values()].filter(c => [0, 2, 4, 5, 13].includes(c.type))
        .sort((a, b) => a.rawPosition - b.rawPosition).map(c => ({ id: c.id, name: c.name, type: c.type })),
      roles: [...g.roles.cache.values()].filter(r => r.id !== g.id).sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, managed: r.managed })),
      enabled: enabledMap(g.id)
    });
  });

  app.get(`${G}/overview`, gauth, (req, res) => {
    const g = req.guild;
    const d = new Date().toISOString().slice(0, 10);
    res.json({
      guild: { name: g.name, icon: g.icon, members: g.memberCount, channels: g.channels.cache.size, roles: g.roles.cache.size, boosts: g.premiumSubscriptionCount || 0 },
      bot: { ping: client.ws.ping, uptime: Math.floor(process.uptime()), guilds: client.guilds.cache.size },
      today: db.guild(g.id).stats[d] || { joins: 0, leaves: 0, msgs: 0 },
      cases: db.guild(g.id).cases.slice(0, 5),
      enabled: enabledMap(g.id)
    });
  });

  app.get(`${G}/stats`, gauth, (req, res) => {
    const st = db.guild(req.guild.id).stats;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      days.push({ date, ...(st[date] || { joins: 0, leaves: 0, msgs: 0 }) });
    }
    res.json(days);
  });

  app.get(`${G}/config/:mod`, gauth, (req, res) => {
    if (!db.defaults[req.params.mod]) return res.status(404).json({ error: 'وحدة غير موجودة' });
    res.json(db.cfg(req.guild.id)[req.params.mod]);
  });

  app.put(`${G}/config/:mod`, gauth, ah(async (req, res) => {
    const mod = req.params.mod;
    if (!db.defaults[mod]) throw new Error('وحدة غير موجودة');
    db.cfg(req.guild.id)[mod] = clean(db.defaults[mod], req.body);
    db.save();
    logPanel(req, 'تعديل إعدادات', mod);
    if (mod === 'stats') stats.update(req.guild);
    res.json({ ok: true, enabled: enabledMap(req.guild.id) });
  }));

  app.post(`${G}/tickets/publish`, gauth, ah(async (req, res) => {
    const url = await tickets.publishPanel(req.guild);
    logPanel(req, 'نشر لوحة التذاكر');
    res.json({ ok: true, url });
  }));

  app.post(`${G}/selfroles/publish`, gauth, ah(async (req, res) => {
    const url = await selfroles.publishPanel(req.guild);
    logPanel(req, 'نشر لوحة الرتب');
    res.json({ ok: true, url });
  }));

  app.post(`${G}/embed`, gauth, ah(async (req, res) => {
    const b = req.body || {};
    const ch = req.guild.channels.cache.get(String(b.channelId));
    if (!ch?.isTextBased() || ch.isVoiceBased()) throw new Error('اختر روم نصي صحيح');
    const e = new EmbedBuilder().setColor(hexToInt(b.color));
    if (b.title) e.setTitle(String(b.title).slice(0, 256));
    if (b.description) e.setDescription(String(b.description).slice(0, 4000));
    if (b.author) e.setAuthor({ name: String(b.author).slice(0, 256) });
    if (b.footer) e.setFooter({ text: String(b.footer).slice(0, 2048) });
    if (isUrl(b.thumbnail)) e.setThumbnail(b.thumbnail);
    if (isUrl(b.image)) e.setImage(b.image);
    const fields = (Array.isArray(b.fields) ? b.fields : []).slice(0, 10).filter(f => f?.name && f?.value)
      .map(f => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline }));
    if (fields.length) e.addFields(fields);
    if (!b.title && !b.description && !fields.length && !b.content) throw new Error('الإيمبد فاضي');
    const msg = await ch.send({
      content: b.content ? String(b.content).slice(0, 2000) : undefined,
      embeds: (b.title || b.description || fields.length || b.image) ? [e] : [],
      allowedMentions: { parse: ['users', 'roles'] }
    });
    logPanel(req, 'إرسال إيمبد', `#${ch.name}`);
    res.json({ ok: true, url: msg.url });
  }));

  app.get(`${G}/leaderboard`, gauth, (req, res) => {
    res.json(leveling.leaderboard(req.guild.id).slice(0, 100).map((u, n) => ({ rank: n + 1, id: u.id, name: u.name || u.id, avatar: u.avatar || '', xp: u.xp, level: u.level, msgs: u.msgs })));
  });

  app.post(`${G}/xp`, gauth, ah(async (req, res) => {
    const { userId, xp } = req.body || {};
    if (!/^\d{5,25}$/.test(String(userId))) throw new Error('ايدي غير صحيح');
    const g = db.guild(req.guild.id);
    const n = Math.max(0, Math.floor(Number(xp) || 0));
    if (n === 0) delete g.xp[userId];
    else (g.xp[userId] ??= { xp: 0, msgs: 0, last: 0 }).xp = n;
    db.save();
    logPanel(req, 'تعديل خبرة', `${userId} → ${n}`);
    res.json({ ok: true });
  }));

  app.get(`${G}/cases`, gauth, (req, res) => {
    const { type, q } = req.query;
    let list = db.guild(req.guild.id).cases;
    if (type) list = list.filter(c => c.type === type);
    if (q) { const s = String(q).toLowerCase(); list = list.filter(c => c.userId.includes(s) || (c.userTag || '').toLowerCase().includes(s)); }
    res.json(list.slice(0, 100));
  });

  app.post(`${G}/action`, gauth, ah(async (req, res) => {
    const { type, userId, reason, minutes } = req.body || {};
    if (!['warn', 'kick', 'ban', 'timeout', 'unban', 'untimeout'].includes(type)) throw new Error('إجراء غير صحيح');
    if (!/^\d{5,25}$/.test(String(userId))) throw new Error('ايدي غير صحيح');
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) throw new Error('ما لقيت المستخدم');
    const rec = await moderation.act(req.guild, type, user, { id: req.session.user.id, tag: req.session.user.username + ' (لوحة)' }, reason, minutes);
    logPanel(req, `إجراء: ${moderation.LABELS[type]}`, user.username);
    res.json({ ok: true, case: rec });
  }));

  app.get(`${G}/panel-logs`, gauth, (req, res) => res.json(db.guild(req.guild.id).logs.slice(0, 100)));

  // ---------- اختبار اللوقات ----------
  app.post(`${G}/logs/test`, gauth, ah(async (req, res) => {
    await logger.test(req.guild, String(req.body?.event || ''), req.body?.channelId ? String(req.body.channelId) : '');
    res.json({ ok: true });
  }));

  // ---------- ♻️ سلة الاستعادة ----------
  app.get(`${G}/trash`, gauth, (req, res) => {
    const now = Date.now();
    res.json(db.guild(req.guild.id).trash.filter(x => now - x.at < trash.KEEP).map(x => ({
      id: x.id, kind: x.kind, name: x.name, at: x.at, by: x.by,
      info: x.kind === 'role'
        ? { color: x.data.color, members: x.data.members.length }
        : { type: x.data.type, parent: x.data.parentName, children: (x.data.children || []).length }
    })));
  });

  app.post(`${G}/trash/:tid/restore`, gauth, ah(async (req, res) => {
    const r = await trash.restore(req.guild, req.params.tid);
    logPanel(req, 'استعادة من السلة', `${r.kind === 'role' ? 'رتبة' : 'روم'}: ${r.name}`);
    res.json({ ok: true, ...r });
  }));

  app.delete(`${G}/trash/:tid`, gauth, ah(async (req, res) => {
    trash.discard(req.guild, req.params.tid);
    logPanel(req, 'حذف نهائي من السلة', req.params.tid);
    res.json({ ok: true });
  }));

  // ---------- خريطة النشاط ----------
  app.get(`${G}/heatmap`, gauth, (req, res) => res.json({ heat: db.guild(req.guild.id).heat }));

  // ---------- الملفات الثابتة ----------
  app.use(express.static(PUBLIC, { maxAge: '1h', index: 'index.html' }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'غير موجود' }));

  app.listen(cfg.port, () => console.log(`🌐 اللوحة شغالة على المنفذ ${cfg.port}`));
}

module.exports = { start };
