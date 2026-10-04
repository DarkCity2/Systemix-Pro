// تعريف صفحات اللوحة. اللوحة تبني النماذج تلقائياً من هذي التعريفات.
const VARS = 'المتغيرات: {user} {username} {server} {count} {accountAge}';
const H = l => ({ t: 'header', l });

const LOG_GROUPS = [
  { t: 'الرسائل', i: '💬', items: [['messageDelete', 'رسالة محذوفة', '🗑️'], ['messageEdit', 'رسالة معدّلة', '✏️'], ['messageBulk', 'حذف رسائل جماعي', '🧹']] },
  { t: 'الأعضاء', i: '👥', items: [['memberJoin', 'دخول عضو (مع الدعوة المستخدمة)', '📥'], ['memberLeave', 'خروج عضو', '📤'], ['memberKick', 'طرد عضو', '👢'], ['memberBan', 'حظر عضو', '🔨'], ['memberUnban', 'فك حظر', '♻️'], ['memberNickname', 'تغيير لقب', '🏷️'], ['memberRoles', 'تغيير رتب عضو', '🎭'], ['memberTimeout', 'كتم مؤقت', '🔇']] },
  { t: 'الرومات', i: '📁', items: [['channelCreate', 'إنشاء روم', '📁'], ['channelDelete', 'حذف روم', '🗑️'], ['channelUpdate', 'تعديل روم (اسم، وصف، صلاحيات...)', '🛠️']] },
  { t: 'الرتب', i: '🎭', items: [['roleCreate', 'إنشاء رتبة', '🎭'], ['roleDelete', 'حذف رتبة', '🗑️'], ['roleUpdate', 'تعديل رتبة (اسم، لون، صلاحيات...)', '🛠️']] },
  { t: 'الصوت', i: '🔊', items: [['voiceJoin', 'دخول روم صوتي', '🔊'], ['voiceLeave', 'خروج من روم صوتي', '🔇'], ['voiceMove', 'انتقال بين الرومات', '🔀']] },
  { t: 'السيرفر', i: '⚙️', items: [['guildUpdate', 'تعديل إعدادات السيرفر', '⚙️'], ['emojiCreate', 'إضافة إيموجي', '😀'], ['emojiDelete', 'حذف إيموجي', '🗑️'], ['inviteCreate', 'إنشاء دعوة', '🔗'], ['inviteDelete', 'حذف دعوة', '🔗']] },
  { t: 'الأنظمة', i: '🧩', items: [['automod', 'الحماية التلقائية', '🛡️'], ['ticketOpen', 'فتح تذكرة', '🎫'], ['ticketClose', 'إغلاق تذكرة', '🔒']] }
];

const MODULES = {
  overview:  { icon: '📊', title: 'نظرة عامة', desc: 'ملخص سريع عن السيرفر والبوت', special: true },
  settings:  { icon: '⚙️', title: 'إعدادات السيرفر', desc: 'الألوان والهوية العامة للبوت', fields: [
    { k: 'embedColor', t: 'color', l: 'اللون الأساسي للإيمبدات' },
    { k: 'footer', t: 'text', l: 'نص الفوتر في إيمبدات البوت' },
    { k: 'staffRoleId', t: 'role', l: 'رتبة الإدارة / الدعم', hint: 'تُستثنى من الحماية التلقائية وتشوف التذاكر (لو ما حددت رتبة دعم)' }
  ]},
  embed:     { icon: '🧩', title: 'رسائل الإيمبد', desc: 'صمم إيمبد وأرسله لأي روم مع معاينة مباشرة', special: true },

  welcome:   { icon: '👋', title: 'الترحيب والوداع', desc: 'رسائل ترحيب ووداع للأعضاء', fields: [
    H('الترحيب'),
    { k: 'enabled', t: 'toggle', l: 'تفعيل الترحيب' },
    { k: 'channelId', t: 'channel', l: 'روم الترحيب' },
    { k: 'useEmbed', t: 'toggle', l: 'إرسال كإيمبد' },
    { k: 'embedColor', t: 'color', l: 'لون الإيمبد' },
    { k: 'showAvatar', t: 'toggle', l: 'عرض صورة العضو' },
    { k: 'message', t: 'textarea', l: 'رسالة الترحيب', hint: VARS, preview: true },
    { k: 'dm', t: 'toggle', l: 'إرسال رسالة خاصة للعضو' },
    { k: 'dmMessage', t: 'textarea', l: 'نص الرسالة الخاصة', hint: VARS },
    H('الوداع'),
    { k: 'goodbyeEnabled', t: 'toggle', l: 'تفعيل الوداع' },
    { k: 'goodbyeChannelId', t: 'channel', l: 'روم الوداع' },
    { k: 'goodbyeMessage', t: 'textarea', l: 'رسالة الوداع', hint: VARS, preview: true }
  ]},
  autoresponder: { icon: '💬', title: 'الردود التلقائية', desc: 'البوت يرد تلقائياً على كلمات معينة', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل الردود التلقائية' },
    { k: 'replies', t: 'list', l: 'الردود', item: { trigger: '', response: '', match: 'exact', reply: true }, fields: [
      { k: 'trigger', t: 'text', l: 'الكلمة / الجملة' },
      { k: 'response', t: 'textarea', l: 'الرد', hint: 'تقدر تستخدم {user} و {server}' },
      { k: 'match', t: 'select', l: 'نوع المطابقة', options: [['exact', 'مطابقة تامة'], ['contains', 'تحتوي على'], ['starts', 'تبدأ بـ']] },
      { k: 'reply', t: 'toggle', l: 'الرد بالـ Reply على الرسالة' }
    ]}
  ]},
  leveling:  { icon: '🏆', title: 'نظام المستويات', desc: 'خبرة ومستويات ومكافآت رتب + ترتيب عام', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل المستويات' },
    { k: 'xpMin', t: 'number', l: 'أقل خبرة لكل رسالة' },
    { k: 'xpMax', t: 'number', l: 'أعلى خبرة لكل رسالة' },
    { k: 'cooldown', t: 'number', l: 'الانتظار بين كل خبرة (ثواني)' },
    { k: 'announce', t: 'select', l: 'إعلان رفع المستوى', options: [['channel', 'في الروم'], ['dm', 'خاص'], ['off', 'بدون']] },
    { k: 'announceChannelId', t: 'channel', l: 'روم الإعلان (فاضي = نفس الروم)' },
    { k: 'message', t: 'text', l: 'رسالة رفع المستوى', hint: '{user} {username} {level} {server}' },
    { k: 'publicLeaderboard', t: 'toggle', l: 'صفحة الترتيب العامة (يشوفها أي أحد بالرابط)' },
    { k: 'stackRewards', t: 'toggle', l: 'تجميع مكافآت الرتب (بدل استبدالها)' },
    H('مكافآت الرتب'),
    { k: 'rewards', t: 'list', l: 'المكافآت', item: { level: 5, roleId: '' }, fields: [
      { k: 'level', t: 'number', l: 'المستوى' }, { k: 'roleId', t: 'role', l: 'الرتبة' }
    ]},
    H('استثناءات'),
    { k: 'noXpChannels', t: 'channels', l: 'رومات بدون خبرة' },
    { k: 'noXpRoles', t: 'roles', l: 'رتب بدون خبرة' }
  ]},
  autoroles: { icon: '🏅', title: 'الرتب التلقائية', desc: 'رتب تُعطى للأعضاء والبوتات عند الدخول', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل الرتب التلقائية' },
    { k: 'memberRoles', t: 'roles', l: 'رتب الأعضاء' },
    { k: 'botRoles', t: 'roles', l: 'رتب البوتات' },
    { k: 'delaySec', t: 'number', l: 'تأخير الإعطاء (ثواني)', hint: 'مفيد مع أنظمة التحقق' }
  ]},
  selfroles: { icon: '😀', title: 'رتب ذاتية', desc: 'لوحة أزرار يختار منها الأعضاء رتبهم', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل الرتب الذاتية' },
    { k: 'channelId', t: 'channel', l: 'روم اللوحة' },
    { k: 'title', t: 'text', l: 'عنوان اللوحة' },
    { k: 'description', t: 'textarea', l: 'وصف اللوحة' },
    { k: 'unique', t: 'toggle', l: 'رتبة واحدة فقط (اختيار جديد يشيل القديم)' },
    { k: 'roles', t: 'list', l: 'الرتب (حد أقصى 25)', item: { roleId: '', label: '', emoji: '' }, fields: [
      { k: 'roleId', t: 'role', l: 'الرتبة' }, { k: 'label', t: 'text', l: 'اسم الزر (اختياري)' }, { k: 'emoji', t: 'text', l: 'إيموجي (اختياري)' }
    ]}
  ], publish: { url: 'selfroles/publish', label: '📤 حفظ ونشر اللوحة' }},
  starboard: { icon: '⭐', title: 'لوحة النجوم', desc: 'أفضل الرسائل تنتقل لروم خاص', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل لوحة النجوم' },
    { k: 'channelId', t: 'channel', l: 'روم النجوم' },
    { k: 'emoji', t: 'text', l: 'الإيموجي', hint: 'مثال: ⭐' },
    { k: 'threshold', t: 'number', l: 'عدد التفاعلات المطلوبة' },
    { k: 'allowSelf', t: 'toggle', l: 'احتساب تفاعل صاحب الرسالة' }
  ]},
  tempchannels: { icon: '➕', title: 'رومات مؤقتة', desc: 'ادخل روم الإنشاء → يتسوى لك روم صوتي خاص', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل الرومات المؤقتة' },
    { k: 'hubChannelId', t: 'vchannel', l: 'روم "اضغط لإنشاء روم"' },
    { k: 'categoryId', t: 'category', l: 'الكاتيجوري (فاضي = نفس كاتيجوري الروم)' },
    { k: 'nameTemplate', t: 'text', l: 'اسم الروم', hint: '{username} {count}' },
    { k: 'userLimit', t: 'number', l: 'حد الأعضاء (0 = بدون حد)' }
  ]},
  stats:     { icon: '📈', title: 'الإحصائيات', desc: 'رسوم بيانية + رومات عدّادات تتحدث تلقائياً', stat: true, fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل رومات العدّادات' },
    { k: 'channels', t: 'list', l: 'العدّادات', item: { type: 'members', channelId: '', template: '👥 الأعضاء: {count}' }, fields: [
      { k: 'type', t: 'select', l: 'النوع', options: [['members', 'كل الأعضاء'], ['humans', 'الأعضاء (بدون بوتات)'], ['bots', 'البوتات'], ['boosts', 'البوستات'], ['channels', 'الرومات'], ['roles', 'الرتب']] },
      { k: 'channelId', t: 'vchannel', l: 'الروم الصوتي' },
      { k: 'template', t: 'text', l: 'الاسم', hint: 'استخدم {count} مكان الرقم' }
    ]}
  ]},
  tickets:   { icon: '🎫', title: 'التذاكر', desc: 'نظام دعم فني بتذاكر خاصة وسجل محادثات', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل التذاكر' },
    { k: 'categoryId', t: 'category', l: 'كاتيجوري التذاكر' },
    { k: 'supportRoleId', t: 'role', l: 'رتبة الدعم' },
    { k: 'logChannelId', t: 'channel', l: 'روم سجل التذاكر' },
    { k: 'transcript', t: 'toggle', l: 'حفظ نسخة المحادثة عند الإغلاق' },
    { k: 'maxPerUser', t: 'number', l: 'أقصى عدد تذاكر مفتوحة للعضو' },
    H('لوحة فتح التذاكر'),
    { k: 'panelChannelId', t: 'channel', l: 'روم اللوحة' },
    { k: 'panelTitle', t: 'text', l: 'العنوان' },
    { k: 'panelDescription', t: 'textarea', l: 'الوصف' },
    { k: 'buttonLabel', t: 'text', l: 'نص الزر' },
    { k: 'welcomeMessage', t: 'textarea', l: 'رسالة داخل التذكرة', hint: VARS }
  ], publish: { url: 'tickets/publish', label: '📤 حفظ ونشر اللوحة' }},

  moderation: { icon: '🔨', title: 'الإدارة', desc: 'إعدادات الإجراءات الإدارية والتحذيرات', fields: [
    { k: 'dmOnAction', t: 'toggle', l: 'إرسال خاص للعضو عند أي إجراء' },
    { k: 'logChannelId', t: 'channel', l: 'روم سجل الإجراءات' },
    H('عقوبات تلقائية حسب عدد التحذيرات'),
    { k: 'thresholds', t: 'list', l: 'العقوبات', item: { warns: 3, action: 'timeout', minutes: 60 }, fields: [
      { k: 'warns', t: 'number', l: 'عند الوصول إلى (تحذيرات)' },
      { k: 'action', t: 'select', l: 'الإجراء', options: [['timeout', 'كتم'], ['kick', 'طرد'], ['ban', 'حظر']] },
      { k: 'minutes', t: 'number', l: 'مدة الكتم (دقائق)' }
    ]}
  ]},
  logs:      { icon: '📜', title: 'اللوقات', desc: 'كل حدث له تفعيل وروم خاص — مع معرفة من نفّذ العملية', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل نظام اللوقات' },
    { k: 'defaultChannelId', t: 'channel', l: 'الروم الافتراضي', hint: 'يُستخدم لأي حدث ما حددت له روم خاص' },
    { k: 'ignoredChannels', t: 'channels', l: 'رومات مستثناة من لوق الرسائل' },
    { k: 'events', t: 'logevents', groups: LOG_GROUPS }
  ]},
  automod:   { icon: '🛡️', title: 'الحماية التلقائية', desc: 'يحذف المخالفات تلقائياً ويعاقب', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل Automod' },
    H('الفلاتر'),
    { k: 'blockInvites', t: 'toggle', l: 'منع روابط دعوات ديسكورد' },
    { k: 'blockLinks', t: 'toggle', l: 'منع كل الروابط' },
    { k: 'linkWhitelist', t: 'tags', l: 'مواقع مسموحة', hint: 'مثال: youtube.com (اكتب واضغط Enter)' },
    { k: 'badWords', t: 'tags', l: 'كلمات ممنوعة', hint: 'اكتب الكلمة واضغط Enter' },
    { k: 'maxMentions', t: 'number', l: 'أقصى منشنات بالرسالة (0 = إيقاف)' },
    { k: 'maxCapsPercent', t: 'number', l: 'أقصى نسبة حروف كبيرة % (0 = إيقاف)' },
    { k: 'maxEmojis', t: 'number', l: 'أقصى عدد إيموجي (0 = إيقاف)' },
    { k: 'spamEnabled', t: 'toggle', l: 'منع السبام' },
    { k: 'spamMessages', t: 'number', l: 'عدد الرسائل المعتبر سبام' },
    { k: 'spamSeconds', t: 'number', l: 'خلال كم ثانية' },
    H('العقوبة'),
    { k: 'action', t: 'select', l: 'الإجراء بعد الحذف', options: [['delete', 'حذف الرسالة فقط'], ['warn', 'حذف + تحذير'], ['timeout', 'حذف + كتم']] },
    { k: 'timeoutMinutes', t: 'number', l: 'مدة الكتم (دقائق)' },
    H('استثناءات'),
    { k: 'ignoredRoles', t: 'roles', l: 'رتب مستثناة' },
    { k: 'ignoredChannels', t: 'channels', l: 'رومات مستثناة' }
  ]},
  antiraid:  { icon: '🚨', title: 'مكافحة الهجمات', desc: 'حماية من دخول الأعضاء بشكل جماعي والحسابات الجديدة', fields: [
    { k: 'enabled', t: 'toggle', l: 'تفعيل Anti-Raid' },
    { k: 'joinThreshold', t: 'number', l: 'عدد الداخلين المعتبر هجوم' },
    { k: 'joinWindowSec', t: 'number', l: 'خلال كم ثانية' },
    { k: 'action', t: 'select', l: 'الإجراء عند الهجوم', options: [['kick', 'طرد'], ['ban', 'حظر'], ['timeout', 'كتم ساعة'], ['alert', 'تنبيه فقط']] },
    H('الحسابات الجديدة'),
    { k: 'minAccountAgeDays', t: 'number', l: 'أقل عمر للحساب بالأيام (0 = إيقاف)' },
    { k: 'accountAgeAction', t: 'select', l: 'الإجراء للحسابات الجديدة', options: [['kick', 'طرد'], ['ban', 'حظر'], ['timeout', 'كتم ساعة']] },
    { k: 'alertChannelId', t: 'channel', l: 'روم التنبيهات' }
  ]},

  trash:       { icon: '♻️', title: 'سلة الاستعادة', desc: 'استرجع أي رتبة أو روم انحذف بنقرة — حتى أعضاء الرتبة', special: true },
  leaderboard: { icon: '🥇', title: 'لوحة المتصدرين', desc: 'ترتيب الأعضاء حسب الخبرة', special: true },
  modactions:  { icon: '🗂️', title: 'سجل الإجراءات', desc: 'نفّذ إجراء من اللوحة وراجع كل الحالات', special: true },
  panellogs:   { icon: '🧾', title: 'سجل لوحة التحكم', desc: 'من غيّر ايش في اللوحة', special: true }
};

const NAV = [
  { g: 'عام', items: ['overview', 'settings', 'embed'] },
  { g: 'الأنظمة', items: ['welcome', 'autoresponder', 'leveling', 'autoroles', 'selfroles', 'starboard', 'tempchannels', 'stats', 'tickets'] },
  { g: 'الإدارة والحماية', items: ['moderation', 'logs', 'automod', 'antiraid', 'trash'] },
  { g: 'أخرى', items: ['leaderboard', 'modactions', 'panellogs'] }
];
