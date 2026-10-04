const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تفعيل الجلسات الأساسية عشان نظام الدخول والحماية يشتغل صح
app.use(session({
    secret: process.env.SESSION_SECRET || 'systemix-secret-key-change-it',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // اضبطها لـ true لو على https بشكل كامل
}));

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ربط ملفات الـ Web أو مسارات المصادقة الأصلية الموجودة في مجلد web إن وجدت
const webPath = path.join(__dirname, 'web');
if (fs.existsSync(webPath)) {
    try {
        const webModule = require('./web');
        if (typeof webModule === 'function') {
            app.use('/api', webModule);
        }
    } catch (e) {
        console.log('ملاحظة حول مجلد web:', e.message);
    }
}

// مسار التحقق الحقيقي من الدخول (يرجع 401 إذا لم يتم تسجيل الدخول لحماية الموقع)
app.get('/api/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ user: req.session.user, guilds: req.session.guilds || [] });
    }
    // هنا يرجع 401 الحقيقي عشان تظهر شاشة تسجيل الدخول / الباسورد الأصلية للواجهة
    return res.status(401).json({ error: 'Unauthorized' });
});

// مسار تسجيل الدخول (يمكنك تعديله ليوجه لراوتر الديسكورد الأصلي إذا كان موجوداً في web)
app.get('/auth/login', (req, res) => {
    res.redirect('/');
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

// دعم مسارات الـ SPA الحقيقية للواجهة
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

// إعداد وتشغيل بوت الديسكورد الحقيقي
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
