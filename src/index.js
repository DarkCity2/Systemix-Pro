const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// مسار التحقق من تسجيل الدخول للواجهة الأمامية (app.js)
app.get('/api/me', (req, res) => {
    // مؤقتاً لتجاوز مشكلة تسجيل الدخول وتجربة الواجهة بشكل كامل، أو يمكنك ربطه بجلسة ديسكورد حقيقية
    if (req.session && req.session.user) {
        return res.json({ user: req.session.user, guilds: req.session.guilds || [] });
    }
    
    // وضع تجريبي مؤقت إذا أردت رؤية اللوحة وتجاوز صفحة الدخول فوراً:
    // (أزل التعليق عن السطر التالي لو تبغى تدخل اللوحة وتجربها مباشرة)
    /*
    return res.json({
        user: { id: '123456789', username: 'Admin', avatar: null },
        guilds: []
    });
    */
    
    res.status(401).json({ error: 'Unauthorized' });
});

// مسار تسجيل الدخول عبر ديسكورد (يتم توجيهه لاحقاً لمصادقة Discord OAuth2)
app.get('/auth/login', (req, res) => {
    // هنا يتم وضع رابط المصادقة الحقيقي لـ Discord OAuth2 أو توجيهه للوحة
    res.redirect('/');
});

app.get('/auth/logout', (req, res) => {
    if (req.session) req.session.destroy();
    res.redirect('/');
});

// دعم مسارات الـ SPA المعتمدة على hash routing في app.js
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
