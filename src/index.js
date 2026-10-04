const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();

// إعدادات المصادقة للوحة التحكم
const dashboardPassword = process.env.DASHBOARD_PASSWORD || 'admin';
app.use(basicAuth({
    users: { 'admin': dashboardPassword },
    challenge: true,
    realm: 'Dashboard Protection'
}));

// تقديم الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// تحديد المنفذ ديناميكياً لتجنب تعارض المنفذ على Render
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
