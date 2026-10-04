const cfg = require('./config');
if (!cfg.token || !cfg.clientId || !cfg.clientSecret) {
  console.error('❌ لازم تعبي TOKEN و CLIENT_ID و CLIENT_SECRET في ملف .env (شوف .env.example)');
  process.exit(1);
}
const client = require('./bot');
require('./web/server').start(client);
client.login(cfg.token);
