const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
fs.mkdirSync(path.dirname(FILE), { recursive: true });

let data = { guilds: {} };
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  data.guilds ??= {};
} catch {}

let timer;
function flush() {
  const tmp = FILE + '.tmp';
  fs.writeFile(tmp, JSON.stringify(data), err => { if (!err) fs.rename(tmp, FILE, () => {}); });
}
function save() { clearTimeout(timer); timer = setTimeout(flush, 800); }
function flushSync() { try { fs.writeFileSync(FILE, JSON.stringify(data)); } catch {} }
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

// دمج الإعدادات المحفوظة مع الافتراضية (يضيف أي مفتاح جديد تلقائياً)
function merge(def, cur) {
  const out = {};
  for (const k of Object.keys(def)) {
    const d = def[k], c = cur?.[k];
    if (isObj(d)) out[k] = merge(d, isObj(c) ? c : {});
    else if (Array.isArray(d)) out[k] = Array.isArray(c) ? c : structuredClone(d);
    else out[k] = (c !== undefined && typeof c === typeof d) ? c : d;
  }
  return out;
}

const ensured = new Set();
function guild(id) {
  let g = data.guilds[id];
  if (!g) {
    g = data.guilds[id] = {
      cfg: {}, xp: {}, stats: {}, cases: [], warns: {}, starred: {}, tickets: {}, temp: {},
      logs: [], caseCounter: 0, ticketCounter: 0
    };
  }
  if (!ensured.has(id)) {
    g.cfg = merge(defaults, g.cfg);
    g.trash ??= [];
    g.heat ??= new Array(168).fill(0);
    g.logs ??= [];
    ensured.add(id);
  }
  return g;
}
const cfg = id => guild(id).cfg;

function bump(id, key, n = 1) {
  const g = guild(id);
  const d = new Date().toISOString().slice(0, 10);
  const s = (g.stats[d] ??= { joins: 0, leaves: 0, msgs: 0 });
  s[key] += n;
  if (key === 'msgs') { const t = new Date(); g.heat[t.getUTCDay() * 24 + t.getUTCHours()] += n; }
  const keys = Object.keys(g.stats);
  if (keys.length > 90) keys.sort().slice(0, keys.length - 90).forEach(k => delete g.stats[k]);
  save();
}

function panelLog(id, entry) {
  const g = guild(id);
  g.logs.unshift({ at: Date.now(), ...entry });
  if (g.logs.length > 300) g.logs.length = 300;
  save();
}

module.exports = { guild, cfg, save, bump, panelLog, defaults, merge, isObj };
