const express = require('express');
const router = express.Router();
const { setSub } = require('../bot/modules/subscription');
const db = require('../db');

// آيدي حسابك الشخصي في ديسكورد
const OWNER_ID = "1065107585981755423";

function isOwner(req, res, next) {
  if (req.user && req.user.id === OWNER_ID) return next();
  return res.status(403).json({ error: 'غير مصرح لك بدخول لوحة المالك.' });
}

// جلب قائمة السيرفرات والاشتراكات
router.get('/admin/subscriptions', isOwner, (req, res) => {
  const allGuilds = db.getAllGuilds ? db.getAllGuilds() : [];
  const list = allGuilds.map(g => ({
    id: g.id,
    name: g.name,
    subscription: g.subscription || { isActive: true, plan: 'lifetime' }
  }));
  res.json({ success: true, guilds: list });
});

// تفعيل أو إيقاف اشتراك سيرفر
router.post('/admin/subscriptions/toggle', isOwner, (req, res) => {
  const { guildId, isActive, plan, durationDays } = req.body;
  
  if (!guildId) return res.status(400).json({ error: 'guildId مطلوب' });

  setSub(guildId, { isActive, plan, durationDays });
  res.json({ success: true, message: `تم تحديث اشتراك السيرفر ${guildId} بنجاح` });
});

module.exports = router;
