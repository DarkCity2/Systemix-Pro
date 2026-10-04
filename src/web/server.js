const express = require('express');
const path = require('path');

function start(client) {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    app.get('/api/stats', (req, res) => {
        if (!client) {
            return res.json({ error: 'البوت غير متصل' });
        }
        res.json({
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            ping: client.ws.ping,
            uptime: client.uptime
        });
    });

    const PORT = process.env.PORT || 10000;
    // التأكد من عدم تكرار فتح السيرفر إذا كان يعمل مسبقاً
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}

module.exports = { start };
