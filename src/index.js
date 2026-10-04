const express = require('express');
const path = require('path');
const cfg = require('./config');

if (!cfg.token || !cfg.clientId || !cfg.clientSecret) {
    console.error('❌ لازم تعبي TOKEN و CLIENT_ID و CLIENT_SECRET في ملف .env');
    process.exit(1);
}

// 1. تشغيل البوت
const client = require('./bot');

// 2. تشغيل السيرفر ومنع أي تعارض منافذ
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'web', 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/api/stats', (req, res) => {
    res.json({
        guilds: client.guilds ? client.guilds.cache.size : 0,
        users: client.users ? client.users.cache.size : 0,
        ping: client.ws ? client.ws.ping : 0,
        uptime: client.uptime || 0
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// 3. تسديل دخول البوت
client.login(cfg.token);
