// تتبع الدعوات: يعرف أي دعوة استخدمها العضو الجديد
const cache = new Map();

async function snapshot(guild) {
  try {
    const list = await guild.invites.fetch();
    const m = new Map();
    list.forEach(i => m.set(i.code, { uses: i.uses || 0, inviter: i.inviter ? { id: i.inviter.id, tag: i.inviter.username } : null }));
    cache.set(guild.id, m);
    return m;
  } catch { return null; }
}

async function init(client) { for (const g of client.guilds.cache.values()) await snapshot(g); }

async function used(guild) {
  const before = cache.get(guild.id);
  const now = await snapshot(guild);
  if (!before || !now) return null;
  for (const [code, i] of now) if (i.uses > (before.get(code)?.uses || 0)) return { code, ...i };
  for (const [code, i] of before) if (!now.has(code)) return { code, ...i, lastUse: true };
  return null;
}

function onCreate(inv) {
  if (!inv.guild?.id) return;
  const m = cache.get(inv.guild.id) || new Map();
  m.set(inv.code, { uses: inv.uses || 0, inviter: inv.inviter ? { id: inv.inviter.id, tag: inv.inviter.username } : null });
  cache.set(inv.guild.id, m);
}

module.exports = { init, used, onCreate, snapshot };
