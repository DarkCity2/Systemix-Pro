const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;

// مسار تسجيل الدخول الذي يوجه المستخدم مباشرة لصفحة تفويض ديسكورد
app.get('/auth/login', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = encodeURIComponent(`https://${req.get('host')}/auth/discord/callback`);
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordAuthUrl);
});

// مسار الـ Callback بعد الموافقة
app.get('/auth/discord/callback', (req, res) => {
    // بعد نجاح التحقق، تحويل المستخدم إلى لوحة التحكم أو الصفحة الرئيسية
    res.redirect('/dashboard');
});

// الملفات الثابتة
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.get('/dashboard', (req, res) => {
    const dashboardPath = path.join(publicPath, 'dashboard.html');
    if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
    } else {
        res.sendFile(path.join(publicPath, 'index.html'));
    }
});

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
