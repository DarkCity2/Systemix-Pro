const fs = require('fs');
const path = require('path');
const express = require('express');
const basicAuth = require('express-basic-auth');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');

// 1. إعداد السيرفر واللوحة
const app = express();
const PORT = process.env.PORT || 10000;

app.use(basicAuth({
    users: { 
        'admin': process.env.DASHBOARD_PASSWORD || '123456' 
    },
    challenge: true,
    unauthorizedResponse: 'عذراً، كلمة السر غير صحيحة!'
}));

// ربط مجلد الـ public الخاص باللوحة
const publicPath = path.join(__dirname, 'web', 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// 2. إعداد وتشغيل بوت الديسكورد
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
    const fullDir = path.join(__dirname, 'bot', dir);
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
