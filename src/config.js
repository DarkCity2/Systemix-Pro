require('dotenv').config();
const e = process.env;
module.exports = {
  token: e.TOKEN,
  clientId: e.CLIENT_ID,
  clientSecret: e.CLIENT_SECRET,
  baseUrl: (e.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  port: Number(e.PORT) || 3000,
  sessionSecret: e.SESSION_SECRET || 'change-me-please',
  devGuildId: e.GUILD_ID || ''
};
