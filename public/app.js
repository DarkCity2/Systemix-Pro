'use strict';
const app = document.getElementById('app');
const CDN = 'https://cdn.discordapp.com';
let ME = null, GID = null, META = null, CUR = 'overview', SIDE = null, MAIN = null;

/* ---------------- أدوات ---------------- */
const h = (tag, props, ...kids) => {
  props = props || {};
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false || k === 'value' || k === 'checked' || k === 'disabled') continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  if ('value' in props) e.value = props.value ?? '';
  if (props.checked) e.checked = true;
  if (props.disabled) e.disabled = true;
  return e;
};

async function api(url, opts = {}) {
  const method = opts.method || 'GET';
  const o = { credentials: 'same-origin', method, headers: { 'Content-Type': 'application/json' } };
  if (method !== 'GET') o.body = JSON.stringify(opts.body ?? {});
  const r = await fetch(url, o);
  let d = null; try { d = await r.json(); } catch {}
  if (r.status === 401 && !url.includes('/api/me') && !url.includes('/auth/login')) { ME = null; route(); }
  if (!r.ok) throw new Error(d?.error || `خطأ ${r.status}`);
  return d;
}

function toast(msg, err) {
  const t = h('div', { class: 'toast' + (err ? ' err' : '') }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3400);
}

const avatar = (id, hash, size = 64) => hash ? `${CDN}/avatars/${id}/${hash}.png?size=${size}` : `${CDN}/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
const iconEl = g => h('div', { class: 'gicon' }, g.icon ? h('img', { src: `${CDN}/icons/${g.id}/${g.icon}.png?size=128`, alt: '' }) : (g.name || '?').slice(0, 2));
const fmtDate = t => new Date(t).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
const isUrl = s => /^https?:\/\/\S+$/i.test(s || '');
const sample = t => String(t || '').replaceAll('{user}', '@أحمد').replaceAll('{username}', 'أحمد').replaceAll('{server}', META?.guild?.name || 'السيرفر').replaceAll('{count}', '1234').replaceAll('{accountAge}', '365').replaceAll('{level}', '5');

/* ---------------- التنقل / زر الرجوع ---------------- */
const NAVSTACK = [];
function goBack() {
  NAVSTACK.pop();
  const prev = NAVSTACK.pop();
  if (prev) location.hash = prev;
  else location.hash = CUR === 'overview' ? '#/' : `#/g/${GID}/overview`;
}

/* ---------------- الصفحات الرئيسية ---------------- */
async function route() {
  const [, sec, gid, mod] = (location.hash || '#/').split('/');
  if (NAVSTACK[NAVSTACK.length - 1] !== location.hash) NAVSTACK.push(location.hash || '#/');
  if (NAVSTACK.length > 40) NAVSTACK.shift();

  if (ME === null) {
    try {
      ME = await api('/api/me');
    } catch (e) {
      if (e.message.includes('Password Required') || e.message.includes('401')) {
        return passwordScreen();
      }
      ME = false;
    }
  }
  if (!ME) { GID = null; return passwordScreen(); }
  if (sec === 'g' && gid) return openGuild(gid, mod || 'overview');
  GID = null; META = null;
  picker();
}

function passwordScreen() {
  const passwordInput = h('input', { type: 'password', placeholder: 'أدخل كلمة المرور الحصرية...', style: 'padding:12px 16px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:#fff;font-size:1rem;width:100%;margin-bottom:16px;' });
  const submitBtn = h('button', { class: 'btn primary', style: 'width:100%;padding:12px;font-size:1rem;' }, '🔒 دخول');

  const doLogin = async () => {
    submitBtn.disabled = true;
    try {
      await api('/auth/login', { method: 'POST', body: { password: passwordInput.value } });
      toast('✅ كلمة المرور صحيحة، جاري التحويل...');
      window.location.href = '/auth/discord/login';
    } catch (err) {
      toast(err.message || 'كلمة المرور غير صحيحة', true);
      submitBtn.disabled = false;
    }
  };

  submitBtn.onclick = doLogin;
  passwordInput.onkeydown = e => { if (e.key === 'Enter') doLogin(); };

  app.replaceChildren(h('div', { class: 'landing', style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;' },
    h('div', { class: 'card', style: 'width:100%;max-width:400px;padding:32px;text-align:center;' },
      h('img', { class: 'logo', src: '/logo.png', alt: 'Systemix', style: 'width:64px;height:64px;margin-bottom:16px;' }),
      h('h2', { style: 'margin-bottom:8px;' }, 'لوحة تحكم Systemix'),
      h('p', { class: 'hint', style: 'margin-bottom:24px;' }, 'الرجاء إدخال كلمة المرور للوصول إلى النظام'),
      passwordInput,
      submitBtn
    )
  ));
}

function landing() {
  const err = new URLSearchParams(location.search).get('error');
  app.replaceChildren(h('div', { class: 'landing' },
    h('img', { class: 'logo', src: '/logo.png', alt: 'Systemix' }),
    h('h1', {}, 'Systemix'),
    h('p', {}, 'بوت ديسكورد متكامل بلوحة تحكم احترافية: ترحيب، حماية، مستويات، تذاكر، لوقات، وأكثر — كلها من مكان واحد.'),
    err && h('p', { style: 'color:var(--bad)' }, 'صار خطأ في تسجيل الدخول، حاول مرة ثانية.'),
    h('a', { class: 'btn primary', href: '/auth/discord/login', style: 'font-size:1.1rem;padding:14px 34px' }, '🔐 تسجيل الدخول عبر Discord'),
    h('div', { class: 'features' }, ['👋 ترحيب ووداع', '🛡️ Automod', '🚨 Anti-Raid', '🏆 مستويات', '🎫 تذاكر', '📜 لوقات', '⭐ Starboard', '📈 إحصائيات', '🧩 إيمبد', '🎭 رتب ذاتية'].map(t => h('span', {}, t)))
  ));
}

function picker() {
  app.replaceChildren(h('div', { class: 'picker' },
    h('div', { class: 'topbar' },
      h('img', { class: 'l', src: '/logo.png', alt: '' }), h('b', { style: 'font-size:1.4rem' }, 'Systemix'), h('div', { class: 'sp' }),
      h('div', { class: 'user' }, ME?.user ? [h('img', { src: avatar(ME.user.id, ME.user.avatar, 64), alt: '' }), h('span', {}, ME.user.username)] : null),
      h('button', { class: 'btn sm', onclick: () => { ME = null; route(); } }, '🔄 تحديث'),
      h('a', { class: 'btn sm', href: '/auth/logout' }, 'خروج')),
    h('h2', { style: 'margin-bottom:16px' }, 'اختر السيرفر'),
    ME?.guilds?.length ? h('div', { class: 'grid' }, ME.guilds.map(g => h('div', { class: 'gcard' },
      iconEl(g), h('b', {}, g.name),
      g.botIn ? h('a', { class: 'btn primary sm', href: `#/g/${g.id}/overview` }, '⚙️️ إدارة')
        : h('a', { class: 'btn sm', href: g.inviteUrl, target: '_blank', rel: 'noopener' }, '➕ إضافة البوت')
    ))) : h('div', { class: 'card' }, 'ما لقيت سيرفرات تملك فيها صلاحية «إدارة السيرفر».')
  ));
}

async function openGuild(gid, mod) {
  if (GID !== gid || !META) {
    try { META = await api(`/api/guilds/${gid}/meta`); GID = gid; }
    catch (e) { toast(e.message, true); location.hash = '#/'; return; }
    SIDE = null;
  }
  CUR = MODULES[mod] ? mod : 'overview';
  if (!SIDE || !document.body.contains(SIDE)) {
    SIDE = h('aside', { class: 'side' });
    MAIN = h('main', { class: 'main' });
    app.replaceChildren(h('div', { class: 'shell' },
      h('button', { class: 'burger', onclick: () => SIDE.classList.toggle('open') }, '☰'), SIDE, MAIN));
  }
  renderSide();
  SIDE.classList.remove('open');
  MAIN.replaceChildren();
  window.scrollTo(0, 0);
  await renderPage(MAIN, CUR);
}

function renderSide() {
  const top = SIDE.scrollTop;
  SIDE.replaceChildren(
    h('div', { class: 'brand' }, h('img', { src: '/logo.png', alt: '' }), h('b', {}, 'Systemix')),
    h('a', { class: 'gsw', href: '#/' }, iconEl({ ...META.guild, name: META.guild.name }), h('div', {}, h('b', {}, META.guild.name), h('small', {}, 'تغيير السيرفر ↩'))),
    ...NAV.map(sec => h('div', { class: 'grp' }, h('h6', {}, sec.g),
      ...sec.items.map(k => h('a', { class: 'nav' + (k === CUR ? ' act' : ''), href: `#/g/${GID}/${k}` },
        h('span', { class: 'ic' }, MODULES[k].icon), MODULES[k].title, META.enabled[k] ? h('span', { class: 'ck' }, '✓') : null)))),
    h('div', { class: 'foot' }, h('a', { class: 'btn sm', href: '/auth/logout' }, 'تسجيل الخروج'))
  );
  SIDE.scrollTop = top;
}

async function renderPage(main, k) {
  const def = MODULES[k];
  main.append(h('div', { class: 'ph' }, h('div', { class: 'big' }, def.icon), h('div', {}, h('h2', {}, def.title), h('p', {}, def.desc)),
    h('button', { class: 'btn sm back', onclick: goBack }, k === 'overview' ? '→ السيرفرات' : '→ رجوع')));
  try {
    if (PAGES[k]) await PAGES[k](main);
    else await pConfig(main, k, def);
  } catch (e) { main.append(h('div', { class: 'card' }, '❌ ' + e.message)); }
}

/* ---------------- محرك النماذج ---------------- */
const chOpts = kind => {
  const types = kind === 'vchannel' ? [2, 13] : kind === 'category' ? [4] : [0, 5];
  const pre = kind === 'vchannel' ? '🔊 ' : kind === 'category' ? '📁 ' : '# ';
  return META.channels.filter(c => types.includes(c.type)).map(c => [c.id, pre + c.name]);
};
const roleOpts = () => META.roles.map(r => [r.id, '@ ' + r.name]);

function selectEl(opts, val, onchange, empty = '— بدون —') {
  const s = h('select', { onchange: e => onchange(e.target.value) },
    empty !== null ? h('option', { value: '' }, empty) : null,
    opts.map(([v, t]) => h('option', { value: v }, t)));
  s.value = val ?? '';
  return s;
}

function multiEl(arr, opts) {
  const label = id => (opts.find(o => o[0] === id) || [id, `${id} (محذوف)`])[1];
  const box = h('div', { class: 'chips' });
  const draw = () => {
    const sel = h('select', { onchange: e => { const v = e.target.value; if (v && !arr.includes(v)) { arr.push(v); draw(); } } },
      h('option', { value: '' }, '+ إضافة'), opts.filter(o => !arr.includes(o[0])).map(([v, t]) => h('option', { value: v }, t)));
    box.replaceChildren(...arr.map((id, i) => h('span', { class: 'chip' }, label(id), h('i', { onclick: () => { arr.splice(i, 1); draw(); } }, '✕'))), sel);
  };
  draw();
  return box;
}

function tagsEl(arr) {
  const box = h('div', { class: 'chips' });
  const draw = () => {
    const inp = h('input', { type: 'text', placeholder: 'اكتب واضغط Enter', onkeydown: e => {
      if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v && !arr.includes(v)) { arr.push(v); draw(); box.querySelector('input').focus(); } }
    } });
    box.replaceChildren(...arr.map((t, i) => h('span', { class: 'chip' }, t, h('i', { onclick: () => { arr.splice(i, 1); draw(); } }, '✕'))), inp);
  };
  draw();
  return box;
}

const wrap = (f, control, inline) => h('div', { class: 'field' + (inline ? ' inline' : '') },
  inline ? [h('div', {}, h('div', { class: 'lab' }, f.l), f.hint ? h('div', { class: 'hint' }, f.hint) : null), control]
    : [h('label', { class: 'lab' }, f.l), control, f.hint ? h('div', { class: 'hint' }, f.hint) : null]);

function listEl(f, obj) {
  const arr = obj[f.k] = Array.isArray(obj[f.k]) ? obj[f.k] : [];
  const box = h('div', { class: 'list' });
  const draw = () => box.replaceChildren(
    ...arr.map((it, idx) => h('div', { class: 'item' },
      h('button', { class: 'btn danger sm rm', onclick: () => { arr.splice(idx, 1); draw(); } }, 'حذف'),
      f.fields.map(sf => fieldEl(sf, it)))),
    h('button', { class: 'btn sm', onclick: () => { arr.push(structuredClone(f.item)); draw(); } }, '+ إضافة'));
  draw();
  return h('div', { class: 'field' }, h('label', { class: 'lab' }, f.l), box);
}

function fieldEl(f, obj) {
  const set = v => { obj[f.k] = v; };
  const v = obj[f.k];
  switch (f.t) {
    case 'header': return h('h3', { class: 'sec' }, f.l);
    case 'toggle': return wrap(f, h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!v, onchange: e => set(e.target.checked) }), h('span', { class: 'slider' })), true);
    case 'text': return wrap(f, h('input', { type: 'text', value: v ?? '', oninput: e => set(e.target.value) }));
    case 'number': return wrap(f, h('input', { type: 'number', value: v ?? 0, oninput: e => set(e.target.value === '' ? 0 : Number(e.target.value)) }));
    case 'color': return wrap(f, h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(v) ? v : '#8b3dff', oninput: e => set(e.target.value) }), true);
    case 'textarea': {
      const pv = f.preview ? h('div', { class: 'preview' }) : null;
      const upd = () => { if (pv) pv.textContent = sample(ta.value); };
      const ta = h('textarea', { rows: 4, oninput: e => { set(e.target.value); upd(); } });
      ta.value = v ?? '';
      upd();
      return wrap(f, h('div', {}, ta, pv ? h('div', { class: 'hint', style: 'margin:8px 0 4px' }, 'معاينة:') : null, pv));
    }
    case 'select': return wrap(f, selectEl(f.options, v, set, null));
    case 'channel': case 'vchannel': case 'category': return wrap(f, selectEl(chOpts(f.t), v, set));
    case 'role': return wrap(f, selectEl(roleOpts(), v, set));
    case 'roles': { const a = obj[f.k] = Array.isArray(v) ? v : []; return wrap(f, multiEl(a, roleOpts())); }
    case 'channels': { const a = obj[f.k] = Array.isArray(v) ? v : []; return wrap(f, multiEl(a, chOpts('channel'))); }
    case 'tags': { const a = obj[f.k] = Array.isArray(v) ? v : []; return wrap(f, tagsEl(a)); }
    case 'logevents': return logEventsEl(f, obj);
    case 'list': return listEl(f, obj);
  }
  return h('div');
}

/* ---------------- صفحة إعدادات عامة ---------------- */
async function pConfig(main, k, def) {
  const url = `/api/guilds/${GID}/config/${k}`;
  const cfg = await api(url);
  if (def.stat) await statsCharts(main);
  main.append(h('div', { class: 'form' }, def.fields.map(f => fieldEl(f, cfg))));

  const doSave = async () => {
    const r = await api(url, { method: 'PUT', body: cfg });
    META.enabled = r.enabled;
    renderSide();
  };
  const run = btn => async fn => {
    btn.disabled = true;
    try { await fn(); } catch (e) { toast(e.message, true); }
    btn.disabled = false;
  };
  const save = h('button', { class: 'btn primary' }, '💾 حفظ التغييرات');
  save.onclick = () => run(save)(async () => { await doSave(); toast('✅ تم الحفظ'); });
  const bar = h('div', { class: 'savebar' }, save);
  if (def.publish) {
    const pub = h('button', { class: 'btn' }, def.publish.label);
    pub.onclick = () => run(pub)(async () => {
      await doSave();
      await api(`/api/guilds/${GID}/${def.publish.url}`, { method: 'POST' });
      Object.assign(cfg, await api(url));
      toast('✅ تم الحفظ والنشر');
    });
    bar.append(pub);
  }
  main.append(bar);
}

/* ---------------- اللوقات ---------------- */
const toggleEl = (val, onchange) => h('label', { class: 'switch' },
  h('input', { type: 'checkbox', checked: !!val, onchange: e => onchange(e.target.checked) }), h('span', { class: 'slider' }));

function logEventsEl(f, root) {
  const ev = root.events = root.events || {};
  f.groups.forEach(g => g.items.forEach(([k]) => { ev[k] = ev[k] || { on: false, channelId: '' }; }));
  const keys = f.groups.flatMap(g => g.items.map(i => i[0]));
  let allCh = '';
  const box = h('div', { class: 'lgroups' });

  const test = async k => {
    try {
      await api(`/api/guilds/${GID}/logs/test`, { method: 'POST', body: { event: k, channelId: ev[k].channelId || root.defaultChannelId } });
      toast('✅ أُرسل لوق تجريبي');
    } catch (e) { toast(e.message, true); }
  };

  const groupCard = g => {
    const all = g.items.every(([k]) => ev[k].on);
    return h('div', { class: 'card lg' },
      h('div', { class: 'lg-head' }, h('span', {}, g.i), h('b', {}, g.t), h('small', { class: 'hint' }, `${g.items.filter(([k]) => ev[k].on).length}/${g.items.length} مفعّل`), h('span', { class: 'sp' }),
        toggleEl(all, v => { g.items.forEach(([k]) => { ev[k].on = v; }); draw(); })),
      g.items.map(([k, label, icon]) => h('div', { class: 'lg-row' + (ev[k].on ? ' on' : '') },
        toggleEl(ev[k].on, v => { ev[k].on = v; draw(); }),
        h('span', { class: 'lg-l' }, `${icon} ${label}`),
        selectEl(chOpts('channel'), ev[k].channelId, v => { ev[k].channelId = v; }, '↩ الروم الافتراضي'),
        h('button', { class: 'btn sm', title: 'إرسال لوق تجريبي', onclick: () => test(k) }, '🧪'))));
  };
  const draw = () => box.replaceChildren(...f.groups.map(groupCard));
  draw();

  const quick = h('div', { class: 'card' }, h('h4', {}, '⚡ إجراءات سريعة'),
    h('div', { class: 'row' },
      selectEl(chOpts('channel'), '', v => { allCh = v; }, 'اختر روم لكل الأحداث'),
      h('button', { class: 'btn sm', onclick: () => { if (!allCh) return toast('اختر الروم أول', true); keys.forEach(k => { ev[k].channelId = allCh; }); draw(); toast('تم'); } }, '📍 تطبيق الروم على الكل'),
      h('button', { class: 'btn sm', onclick: () => { keys.forEach(k => { ev[k].on = true; }); draw(); } }, '✅ تفعيل الكل'),
      h('button', { class: 'btn sm danger', onclick: () => { keys.forEach(k => { ev[k].on = false; }); draw(); } }, '⛔ إيقاف الكل')));
  return h('div', {}, quick, box);
}

/* ---------------- ♻️ سلة الاستعادة ---------------- */
function timeAgo(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'قبل لحظات';
  if (s < 3600) return `قبل ${Math.floor(s / 60)} دقيقة`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} ساعة`;
  return `قبل ${Math.floor(s / 86400)} يوم`;
}
const CHTYPE = { 0: ['#', 'روم نصي'], 2: ['🔊', 'روم صوتي'], 4: ['📁', 'كاتيجوري'], 5: ['📢', 'إعلانات'], 13: ['🎙️', 'ستيج'], 15: ['💬', 'منتدى'] };

async function pTrash(main) {
  const box = h('div');
  main.append(
    h('div', { class: 'banner' }, h('b', {}, '♻️ كيف تشتغل؟'), h('p', {}, 'أي رتبة أو روم ينحذف يحفظه Systemix 30 يوم بكل تفاصيله.')),
    box);
  const draw = async () => {
    const list = await api(`/api/guilds/${GID}/trash`);
    box.replaceChildren(list.length ? h('div', { class: 'trash' }, list.map(it => {
      const role = it.kind === 'role';
      const col = role ? (it.info.color ? '#' + it.info.color.toString(16).padStart(6, '0') : '#99aab5') : null;
      const [ic, tn] = role ? ['🎭', 'رتبة'] : (CHTYPE[it.info.type] || ['#', 'روم']);
      const detail = role ? `${it.info.members} عضو` : [tn, it.info.parent && `📁 ${it.info.parent}`].filter(Boolean).join(' • ');
      const rb = h('button', { class: 'btn primary sm' }, '♻️ استعادة');
      rb.onclick = async () => {
        rb.disabled = true;
        try {
          await api(`/api/guilds/${GID}/trash/${it.id}/restore`, { method: 'POST' });
          toast('✅ تمت الاستعادة');
          draw();
        } catch (e) { toast(e.message, true); rb.disabled = false; }
      };
      const del = h('button', { class: 'btn danger sm', onclick: async () => {
        if (!confirm('حذف نهائي؟')) return;
        try { await api(`/api/guilds/${GID}/trash/${it.id}`, { method: 'DELETE' }); draw(); } catch (e) { toast(e.message, true); }
      } }, '🗑️');
      return h('div', { class: 'tcard', style: col ? `--c:${col}` : '' },
        h('div', { class: 'tic' }, ic),
        h('div', { class: 'tinfo' }, h('b', { style: col ? `color:${col}` : '' }, it.name), h('small', {}, detail), h('small', { class: 'hint' }, `حذفها ${it.by} • ${timeAgo(it.at)}`)),
        h('div', { class: 'tact' }, rb, del));
    })) : h('div', { class: 'card empty' }, '✨ السلة فاضية.'));
  };
  await draw();
}

/* ---------------- خريطة النشاط ---------------- */
async function heatmapEl() {
  const { heat } = await api(`/api/guilds/${GID}/heatmap`);
  const off = Math.round(-new Date().getTimezoneOffset() / 60);
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  heat.forEach((v, i) => { const t = (((i + off) % 168) + 168) % 168; grid[Math.floor(t / 24)][t % 24] += v; });
  const max = Math.max(1, ...grid.flat());
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const hr = x => `${x % 12 || 12}${x < 12 ? 'ص' : 'م'}`;
  return h('div', { class: 'card' }, h('h4', {}, '🔥 خريطة النشاط'),
    h('div', { class: 'tw' }, h('div', { class: 'heat' },
      h('span', {}), Array.from({ length: 24 }, (_, x) => h('span', { class: 'hh' }, x % 3 === 0 ? hr(x) : '')),
      grid.map((r, d) => [h('span', { class: 'hd' }, days[d]), ...r.map((v, x) => h('i', { title: `${days[d]} ${hr(x)}: ${v}`, style: `background:rgba(139,61,255,${(0.07 + 0.93 * v / max).toFixed(2)})` }))]))));
}

/* ---------------- رسوم بيانية ---------------- */
function barsEl(days, key, label, color) {
  const max = Math.max(1, ...days.map(d => d[key]));
  return h('div', { class: 'card' }, h('h4', {}, label),
    h('div', { class: 'bars' }, days.map(d => h('div', { class: 'bar', title: `${d.date}: ${d[key]}` },
      h('i', { style: `height:${Math.round(d[key] / max * 100)}%;background:${color}` }), h('span', {}, d.date.slice(8))))));
}
async function statsCharts(main) {
  const days = await api(`/api/guilds/${GID}/stats`);
  main.append(h('div', { class: 'two' }, barsEl(days, 'joins', '📥 الداخلين', 'linear-gradient(#3ddc97,#16a06a)'), barsEl(days, 'leaves', '📤 الخارجين', 'linear-gradient(#ff5470,#b91c3c)')),
    barsEl(days, 'msgs', '💬 الرسائل', 'linear-gradient(#c084fc,#8b3dff)'));
  try { main.append(await heatmapEl()); } catch {}
}

/* ---------------- الصفحات الخاصة ---------------- */
const stat = (l, v) => h('div', { class: 'stat' }, h('small', {}, l), h('b', {}, String(v)));
const caseTable = list => h('div', { class: 'tw' }, h('table', { class: 'tbl' },
  h('thead', {}, h('tr', {}, ['#', 'الإجراء', 'العضو', 'المسؤول', 'السبب', 'الوقت'].map(t => h('th', {}, t)))),
  h('tbody', {}, list.length ? list.map(c => h('tr', {},
    h('td', {}, '#' + c.id), h('td', {}, h('span', { class: 'tag t-' + c.type }, LABELS[c.type] || c.type)),
    h('td', {}, `${c.userTag} `, h('small', { class: 'hint' }, c.userId)), h('td', {}, c.modTag), h('td', {}, c.reason), h('td', {}, fmtDate(c.at)))) : h('tr', {}, h('td', { colspan: 6, style: 'text-align:center;color:var(--muted)' }, 'لا توجد حالات')))));
const LABELS = { warn: 'تحذير', kick: 'طرد', ban: 'حظر', timeout: 'كتم', unban: 'فك حظر', untimeout: 'فك كتم' };

async function pOverview(main) {
  const [o, days] = await Promise.all([api(`/api/guilds/${GID}/overview`), api(`/api/guilds/${GID}/stats`)]);
  const up = o.bot.uptime, upTxt = `${Math.floor(up / 3600)}س ${Math.floor(up % 3600 / 60)}د`;
  main.append(
    h('div', { class: 'stats' }, stat('👥 الأعضاء', o.guild.members), stat('📥 دخلوا اليوم', o.today.joins), stat('📤 خرجوا اليوم', o.today.leaves),
      stat('💬 رسائل اليوم', o.today.msgs), stat('🏓 سرعة البوت', o.bot.ping + 'ms'), stat('⏱️ التشغيل', upTxt), stat('💎 البوستات', o.guild.boosts)),
    barsEl(days, 'msgs', '💬 نشاط الرسائل', 'linear-gradient(#c084fc,#8b3dff)'),
    h('div', { class: 'card' }, h('h4', {}, '🧩 حالة الأنظمة'),
      h('div', { class: 'mods' }, Object.keys(o.enabled).map(k => MODULES[k] ? h('a', { class: 'mchip', href: `#/g/${GID}/${k}` }, MODULES[k].icon, MODULES[k].title, h('span', { class: 'dot' + (o.enabled[k] ? ' on' : '') })) : null))),
    h('div', { class: 'card' }, h('h4', {}, '🗂️ آخر الإجراءات'), caseTable(o.cases))
  );
}

async function pEmbed(main) {
  const e = { channelId: '', content: '', author: '', title: '', description: '', color: '#8b3dff', thumbnail: '', image: '', footer: '', fields: [] };
  const defs = [
    { k: 'channelId', t: 'channel', l: 'الروم' },
    { k: 'content', t: 'textarea', l: 'نص خارج الإيمبد' },
    { k: 'author', t: 'text', l: 'المؤلف' },
    { k: 'title', t: 'text', l: 'العنوان' },
    { k: 'description', t: 'textarea', l: 'الوصف' },
    { k: 'color', t: 'color', l: 'اللون' },
    { k: 'thumbnail', t: 'text', l: 'صورة مصغرة' },
    { k: 'image', t: 'text', l: 'صورة رئيسية' },
    { k: 'footer', t: 'text', l: 'الفوتر' },
    { k: 'fields', t: 'list', l: 'الحقول', item: { name: '', value: '', inline: false }, fields: [
      { k: 'name', t: 'text', l: 'العنوان' }, { k: 'value', t: 'textarea', l: 'القيمة' }, { k: 'inline', t: 'toggle', l: 'بجانب بعض' }] }
  ];
  const form = h('div', { class: 'form' }, defs.map(d => fieldEl(d, e)));
  const prev = h('div', { class: 'dc' });
  const draw = () => {
    const col = /^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#8b3dff';
    const fs = e.fields.filter(f => f.name || f.value);
    prev.replaceChildren(
      e.content ? h('div', { class: 'cnt' }, e.content) : null,
      h('div', { class: 'emb', style: `border-inline-start-color:${col}` },
        e.author ? h('div', { class: 'a' }, e.author) : null,
        e.title ? h('div', { class: 't' }, e.title) : null,
        e.description ? h('div', { class: 'd' }, e.description) : null,
        fs.length ? h('div', { class: 'fs' }, fs.map(f => h('div', { class: f.inline ? 'i' : '' }, h('b', {}, f.name), h('span', {}, f.value)))) : null,
        isUrl(e.thumbnail) ? h('img', { class: 'th', src: e.thumbnail, alt: '' }) : null,
        isUrl(e.image) ? h('img', { class: 'im', src: e.image, alt: '' }) : null,
        e.footer ? h('div', { class: 'f' }, e.footer) : null));
  };
  ['input', 'change'].forEach(ev => form.addEventListener(ev, draw));
  draw();
  const send = h('button', { class: 'btn primary' }, '📤 إرسال الإيمبد');
  send.onclick = async () => {
    send.disabled = true;
    try { await api(`/api/guilds/${GID}/embed`, { method: 'POST', body: e }); toast('✅ تم الإرسال'); }
    catch (er) { toast(er.message, true); }
    send.disabled = false;
  };
  main.append(h('div', { class: 'two' }, form, h('div', {}, h('div', { class: 'card', style: 'position:sticky;top:20px' }, h('h4', {}, '👁️ معاينة'), prev))), h('div', { class: 'savebar' }, send));
}

async function pLeaderboard(main) {
  const draw = async () => {
    const list = await api(`/api/guilds/${GID}/leaderboard`);
    const link = `${location.origin}/leaderboard/${GID}`;
    box.replaceChildren(
      h('div', { class: 'card' }, h('h4', {}, '🔗 رابط الترتيب العام'),
        h('div', { class: 'row' }, h('input', { type: 'text', value: link, readonly: true }),
          h('button', { class: 'btn sm', onclick: () => { navigator.clipboard?.writeText(link); toast('تم النسخ'); } }, 'نسخ'))),
      h('div', { class: 'card tw' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, ['#', 'العضو', 'المستوى', 'الخبرة', 'الرسائل', ''].map(t => h('th', {}, t)))),
        h('tbody', {}, list.length ? list.map(u => h('tr', {},
          h('td', {}, u.rank), h('td', {}, h('img', { class: 'av', src: avatar(u.id, u.avatar, 64), alt: '' }), u.name),
          h('td', {}, u.level), h('td', {}, u.xp), h('td', {}, u.msgs),
          h('td', {}, h('button', { class: 'btn sm', onclick: async () => {
            const v = prompt('الخبرة الجديدة:', u.xp);
            if (v === null) return;
            try { await api(`/api/guilds/${GID}/xp`, { method: 'POST', body: { userId: u.id, xp: Number(v) } }); toast('✅ تم'); draw(); } catch (e) { toast(e.message, true); }
          } }, '✏️ تعديل')))) : h('tr', {}, h('td', { colspan: 6, style: 'text-align:center;color:var(--muted)' }, 'لا يوجد بيانات')))))
    );
  };
  const box = h('div');
  main.append(box);
  await draw();
}

async function pActions(main) {
  const f = { type: 'warn', userId: '', minutes: 10, reason: '' };
  const defs = [
    { k: 'type', t: 'select', l: 'الإجراء', options: Object.entries(LABELS) },
    { k: 'userId', t: 'text', l: 'ايدي العضو' },
    { k: 'minutes', t: 'number', l: 'مدة الكتم' },
    { k: 'reason', t: 'text', l: 'السبب' }
  ];
  const go = h('button', { class: 'btn primary' }, 'تنفيذ');
  const tableBox = h('div');
  const q = { type: '', q: '' };
  const load = async () => {
    const list = await api(`/api/guilds/${GID}/cases?type=${encodeURIComponent(q.type)}&q=${encodeURIComponent(q.q)}`);
    tableBox.replaceChildren(caseTable(list));
  };
  go.onclick = async () => {
    go.disabled = true;
    try { await api(`/api/guilds/${GID}/action`, { method: 'POST', body: f }); toast('✅ تم التنفيذ'); await load(); }
    catch (e) { toast(e.message, true); }
    go.disabled = false;
  };
  main.append(
    h('div', { class: 'card' }, h('h4', {}, '⚡ تنفيذ إجراء'), h('div', { class: 'row' }, defs.map(d => fieldEl(d, f))), go),
    h('div', { class: 'card' }, h('h4', {}, '🗂️ الحالات'),
      h('div', { class: 'row', style: 'margin-bottom:12px' },
        selectEl(Object.entries(LABELS), '', v => { q.type = v; load(); }, 'كل الأنواع'),
        h('input', { type: 'text', placeholder: 'بحث', oninput: e => { q.q = e.target.value; clearTimeout(load.t); load.t = setTimeout(load, 300); } })),
      tableBox));
  await load();
}

async function pPanelLogs(main) {
  const list = await api(`/api/guilds/${GID}/panel-logs`);
  main.append(h('div', { class: 'card tw' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, ['المستخدم', 'الإجراء', 'التفاصيل', 'الوقت'].map(t => h('th', {}, t)))),
    h('tbody', {}, list.length ? list.map(l => h('tr', {}, h('td', {}, l.userTag), h('td', {}, l.action), h('td', {}, l.detail), h('td', {}, fmtDate(l.at))))
      : h('tr', {}, h('td', { colspan: 4, style: 'text-align:center;color:var(--muted)' }, 'ما فيه سجلات')))))); 
}

const PAGES = { trash: pTrash, overview: pOverview, embed: pEmbed, leaderboard: pLeaderboard, modactions: pActions, panellogs: pPanelLogs };

window.addEventListener('hashchange', route);
route();
