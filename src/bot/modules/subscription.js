const db = require('../../db');

// فحص هل اشتراك السيرفر شغال
function checkSub(guildId) {
  const cfg = db.cfg ? db.cfg(guildId) : {};
  const sub = cfg.subscription || { isActive: true, plan: 'lifetime' };

  if (!sub.isActive) {
    return { valid: false, reason: 'اشتراك البوت متوقف في هذا السيرفر.' };
  }

  if (sub.plan !== 'lifetime' && sub.expiresAt && Date.now() > sub.expiresAt) {
    return { valid: false, reason: 'انتهت مدة اشتراك البوت.' };
  }

  return { valid: true };
}

// تشغيل أو إيقاف الاشتراك للسيرفر
function setSub(guildId, { isActive, plan, durationDays }) {
  const cfg = db.cfg(guildId);
  const expiresAt = durationDays ? Date.now() + (durationDays * durationDays ? durationDays * 86400000 : 0) : null;
  
  cfg.subscription = {
    isActive: Boolean(isActive),
    plan: plan || 'monthly',
    expiresAt,
    updatedAt: Date.now()
  };
  
  if (db.saveCfg) db.saveCfg(guildId, cfg);
}

module.exports = { checkSub, setSub };
