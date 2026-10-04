const cfg = require('./config');
if (!cfg.token || !cfg.clientId || !cfg.clientSecret) {
    console.error('❌ لازم تعبي TOKEN و CLIENT_ID و CLIENT_SECRET في ملف .env');
    process.exit(1);
}

const client = require('./bot');

// تشغيل السيرفر وربطه بالبوت مباشرة من هنا
const serverModule = require('./web/server');
if (typeof serverModule.start === 'function') {
    serverModule.start(client);
}

client.login(cfg.token);
