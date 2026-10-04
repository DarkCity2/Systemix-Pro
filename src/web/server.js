const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

function start(client) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // مسار الملفات الثابتة للوحة
    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    // API البيانات الأساسية للبوت واللوحة
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

    // Socket.io للتحكم اللحظي
    io.on('connection', (socket) => {
        console.log('🔗 تم اتصال عميل جديد باللوحة');
    });

    const PORT = process.env.PORT || 10000;
    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}

module.exports = { start };
