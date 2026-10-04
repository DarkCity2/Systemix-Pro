const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تفعيل الجلسات لنظام الحماية والباسورد
app.use(session({
    secret: process.env.SESSION_SECRET || 'systemix-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// كلمة المرور الامتحانية أو الحماية (يمكنك تغييرها أو ربطها بـ .env)
const SITE_PASSWORD = process.env.SITE_PASSWORD || '12345'; 

// صفحة التحقق من تسجيل الدخول (ترجع 401 إذا لم يكن مسجلاً، ليظهر نظام الحماية بالمتصفح)
app.get('/api/me', (req, res) => {
    if (req.session && req.session.authenticated) {
        return res.json({
            user: { id: '123456789', username: req.session.username || 'Admin', avatar: null },
            guilds: []
        });
    }
    return res.status(401).json({ error: 'Unauthorized - Password Required' });
});

// مسار إرسال الباسورد لتسجيل الدخول
app.post('/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === SITE_PASSWORD) {
        req.session.authenticated = true;
        req.session.username = 'Admin';
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: 'Wrong Password' });
});

app.get('/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

// حماية صفحات الـ SPA
app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not Found');
    }
});

// تشغيل السيرفر مرة واحدة فقط
if (!global.serverStarted) {
    global.serverStarted = true;
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}

// إعداد وتشغيل بوت الديسكورد
const client = new Client({
  intents: [
    I.Guilds, I.GuildMembers, I.GuildMessages, I.MessageContent,
    I.GuildMessageReactions, I.GuildVoiceStates, I.GuildModeration, I.GuildInvites,
    I.GuildExpressions ?? I.GuildEmojisAndStickers
  ],
  partials: [P.Message, P.Channel, P.Reaction, P.User, P.GuildMember]
});

client.commands = new Collection();

const loadFiles = dir => {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) {
        return fs.readdirSync(fullDir).filter(f => f.endsWith('.js')).map(f => require(path.join(fullDir, f)));
    }
    return [];
};

for (const c of loadFiles('commands')) client.commands.set(c.data.name, c);
for (const m of loadFiles('events')) {
  for (const ev of [].concat(m)) {
    client[ev.once ? 'once' : 'on'](ev.name, (...args) =>
      Promise.resolve(ev.execute(...args, client)).catch(e => console.error(`[${ev.name}]`, e)));
  }
}

client.login(process.env.TOKEN);

module.exports = client;
