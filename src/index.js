const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits: I, Partials: P, Collection } = require('discord.js');
const webServer = require('./web/server');

// إعداد وتجهيز بوت الديسكورد
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

// تشغيل السيرفر والموقع (اللوحة والحماية) مرة واحدة فقط
if (!global.serverStarted) {
    global.serverStarted = true;
    try {
        webServer.start(client);
    } catch (e) {
        console.error('خطأ في تشغيل السيرفر:', e);
    }
}

client.login(process.env.TOKEN);

module.exports = client;
