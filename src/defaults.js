// الإعدادات الافتراضية لكل وحدة (تُدمج تلقائياً مع بيانات كل سيرفر)
const ev = keys => Object.fromEntries(keys.map(k => [k, { on: false, channelId: '' }]));

module.exports = {
  settings: { embedColor: '#8b3dff', footer: 'Systemix', staffRoleId: '' },
  welcome: {
    enabled: false, channelId: '', useEmbed: true, embedColor: '#8b3dff', showAvatar: true,
    message: 'أهلاً {user} في **{server}** 🎉\nأنت العضو رقم **{count}**',
    dm: false, dmMessage: 'أهلاً بك في {server}! اقرأ القوانين وتمتع 💜',
    goodbyeEnabled: false, goodbyeChannelId: '', goodbyeMessage: 'وداعاً **{username}** 👋 نتمنى نشوفك قريب'
  },
  autoresponder: { enabled: true, replies: [] },
  leveling: {
    enabled: false, xpMin: 15, xpMax: 25, cooldown: 60, announce: 'channel', announceChannelId: '',
    message: '🎉 مبروك {user}! وصلت **المستوى {level}**',
    stackRewards: true, publicLeaderboard: true, noXpChannels: [], noXpRoles: [], rewards: []
  },
  autoroles: { enabled: false, memberRoles: [], botRoles: [], delaySec: 0 },
  selfroles: {
    enabled: false, channelId: '', messageId: '', title: '🎭 اختر رتبك',
    description: 'اضغط على الأزرار لأخذ الرتبة أو إزالتها.', unique: false, roles: []
  },
  starboard: { enabled: false, channelId: '', emoji: '⭐', threshold: 3, allowSelf: false },
  tempchannels: { enabled: false, hubChannelId: '', categoryId: '', nameTemplate: '🔊 {username}', userLimit: 0 },
  stats: { enabled: false, channels: [] },
  tickets: {
    enabled: false, categoryId: '', supportRoleId: '', logChannelId: '', maxPerUser: 1, transcript: true,
    panelChannelId: '', panelMessageId: '', panelTitle: '🎫 الدعم الفني',
    panelDescription: 'اضغط الزر لفتح تذكرة خاصة مع الإدارة.', buttonLabel: 'فتح تذكرة',
    welcomeMessage: 'أهلاً {user}! اشرح مشكلتك وبيرد عليك فريق الدعم قريباً.'
  },
  moderation: { dmOnAction: true, logChannelId: '', thresholds: [] },
  logs: {
    enabled: false, defaultChannelId: '', ignoredChannels: [],
    events: ev([
      'messageDelete', 'messageEdit', 'messageBulk',
      'memberJoin', 'memberLeave', 'memberKick', 'memberBan', 'memberUnban', 'memberNickname', 'memberRoles', 'memberTimeout',
      'channelCreate', 'channelDelete', 'channelUpdate',
      'roleCreate', 'roleDelete', 'roleUpdate',
      'voiceJoin', 'voiceLeave', 'voiceMove',
      'guildUpdate', 'emojiCreate', 'emojiDelete', 'inviteCreate', 'inviteDelete',
      'automod', 'ticketOpen', 'ticketClose'
    ])
  },
  automod: {
    enabled: false, blockInvites: true, blockLinks: false, linkWhitelist: [], badWords: [],
    maxMentions: 5, maxCapsPercent: 0, maxEmojis: 0,
    spamEnabled: true, spamMessages: 5, spamSeconds: 6,
    action: 'delete', timeoutMinutes: 5, ignoredRoles: [], ignoredChannels: []
  },
  antiraid: {
    enabled: false, joinThreshold: 6, joinWindowSec: 10, action: 'kick',
    minAccountAgeDays: 0, accountAgeAction: 'kick', alertChannelId: ''
  }
};
