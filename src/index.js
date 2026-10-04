const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// إعداد المصادقة الأساسية (Basic Auth)
const dashboardPassword = process.env.DASHBOARD_PASSWORD || 'admin';

app.use(basicAuth({
    users: { 'admin': dashboardPassword },
    challenge: true,
    realm: 'Systemix-Pro Dashboard'
}));

// معالجة توجيه صفحة تسجيل الدخول للتخلص من خطأ Cannot GET /auth/login
app.get('/auth/login', (req, res) => {
    res.redirect('/');
});

// تقديم الملفات الثابتة الخاصة باللوحة
const publicPath = path.join(__dirname, 'web', 'public');
app.use(express.static(publicPath));

// المسار الرئيسي للوحة
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// معالجة باقي طلبات الـ API غير الموجودة
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'غير موجود' });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🌐 اللوحة شغالة على المنفذ ${PORT}`);
});

module.exports = app;
