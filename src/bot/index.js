const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');
const express = require('express');
const basicAuth = require('express-basic-auth'); // استدعاء مكتبة الحماية

const app = express();
const PORT = process.env.PORT || 3000;

// نظام الحماية بكلمة السر للوحة التحكم
app.use(basicAuth({
    users: { 
        'admin': process.env.DASHBOARD_PASSWORD || '123456' // اسم المستخدم: admin | كلمة السر الافتراضية: 123456
    },
    challenge: true, // إظهار نافذة إدخال كلمة السر تلقائياً بالمتصفح
    unauthorizedResponse: 'عذراً، كلمة السر غير صحيحة!'
}));

// تشغيل لوحة التحكم أو صفحة الويب
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.send('Dashboard is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const client = new Client({
  intents: [
    I.Guilds, I.GuildMembers, I.GuildMessages, I.MessageContent,
    I.GuildMessageReactions, I.GuildVoiceStates, I.GuildModeration, I.GuildInvites,
    I.GuildExpressions ?? I.GuildEmojisAndStickers
  ],
  partials: [P.Message, P.Channel, P.Reaction, P.User, P.GuildMember]
});

client.commands = new Collection();

const files = dir => fs.readdirSync(path.join(__dirname, dir)).filter(f => f.endsWith('.js')).map(f => require(path.join(__dirname, dir, f)));

for (const c of files('commands')) client.commands.set(c.data.name, c);
for (const m of files('events')) {
  for (const ev of [].concat(m)) {
    client[ev.once ? 'once' : 'on'](ev.name, (...args) =>
      Promise.resolve(ev.execute(...args, client)).catch(e => console.error(`[${ev.name}]`, e)));
  }
}

// تسجيل الدخول بالتوكين من متغيرات البيئة
client.login(process.env.TOKEN);

module.exports = client;