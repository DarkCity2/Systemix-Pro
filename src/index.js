const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// مسار التحقق من تسجيل الدخول (معدل لفتح اللوحة مباشرة وتجاوز التحقق المؤقت)
app.get('/api/me', (req, res) => {
    return res.json({
        user: { id: '123456789', username: 'SystemAdmin', avatar: null },
        guilds: [
            { id: '123456789012345678', name: 'سيرفر التجربة', icon: null, botIn: true }
        ]
    });
});

// مسار تسجيل الدخول عبر ديسكورد
app.get('/auth/login', (req, res) => {
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
