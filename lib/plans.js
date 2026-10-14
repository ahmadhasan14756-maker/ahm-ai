// Plans. The owner edits these in the app (Settings → Manage plans); these are only the starting values.
// Like Claude: every plan has questions per window (5 hours) and a weekly cap.
export const DEFAULT_SETTINGS = {
  v: 2,
  windowHours: 5, // questions come back this many hours after the first question of a window
  freeLimit: 15, // free questions per window
  freeWeekly: 60, // free questions per week
  freeVoice: 10, // minutes of spoken answers per day for free users
  paid: [
    { id: "p3", name: "Pro Mini", price: 3, limit: 40, weekly: 150, days: 30, voice: 30 },
    { id: "p6", name: "Pro", price: 6, limit: 100, weekly: 400, days: 30, voice: 60, best: true },
    { id: "p12", name: "Pro Max", price: 12, limit: 250, weekly: 900, days: 30, voice: 180 },
  ],
  payment: "", // e.g. "FIB: 0770 147 5657"
  inviteBonus: 10, // extra questions for both people when a friend joins with an invite link
  cooldowns: [5], // old setting (no longer used)
};

const num = (v, min, max, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

function cooldownList(v) {
  const arr = (Array.isArray(v) ? v : String(v ?? "").split(/[^0-9.]+/))
    .map((x) => Math.round(Number(x) * 10) / 10)
    .filter((x) => Number.isFinite(x) && x > 0 && x <= 720)
    .slice(0, 8);
  return arr.length ? arr : DEFAULT_SETTINGS.cooldowns;
}

// Cleans settings from the database or from the owner's form.
export function normalizeSettings(s) {
  let src = s && typeof s === "object" ? s : {};
  // Settings saved before the Claude-style limits (v2): move the three standard plans to the new numbers.
  if ((src.v || 1) < 2 && Object.keys(src).length) {
    const def = (id) => DEFAULT_SETTINGS.paid.find((d) => d.id === id);
    src = { ...src, freeLimit: DEFAULT_SETTINGS.freeLimit, freeWeekly: DEFAULT_SETTINGS.freeWeekly,
      paid: (Array.isArray(src.paid) ? src.paid : []).map((p) => (def(p?.id) ? { ...p, limit: def(p.id).limit, weekly: def(p.id).weekly } : p)) };
  }
  const seen = new Set();
  const paid = (Array.isArray(src.paid) ? src.paid : DEFAULT_SETTINGS.paid)
    .map((p, i) => {
      let id = String(p?.id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || "p" + Date.now().toString(36) + i;
      while (seen.has(id)) id += "x";
      seen.add(id);
      return {
        id,
        name: String(p?.name || "Pro").slice(0, 30),
        price: num(p?.price, 0, 100000, 5),
        limit: num(p?.limit, 1, 1000000, 100), // questions per window (5 hours)
        weekly: num(p?.weekly, 1, 10000000, DEFAULT_SETTINGS.paid.find((d) => d.id === p?.id)?.weekly ?? Math.round(num(p?.limit, 1, 1000000, 100) * 4)),
        days: num(p?.days, 1, 3650, 30),
        voice: num(p?.voice, 0, 1440, DEFAULT_SETTINGS.paid.find((d) => d.id === p?.id)?.voice ?? 60), // spoken minutes per day
        best: !!p?.best,
      };
    })
    .slice(0, 8)
    .sort((a, b) => a.price - b.price || a.limit - b.limit);
  let bestSeen = false; // only one plan can be "best"
  for (const p of paid) { if (p.best && bestSeen) p.best = false; if (p.best) bestSeen = true; }
  return {
    v: 2,
    windowHours: Math.min(168, Math.max(0.5, Math.round((Number(src.windowHours) || DEFAULT_SETTINGS.windowHours) * 2) / 2)),
    freeLimit: num(src.freeLimit, 0, 100000, DEFAULT_SETTINGS.freeLimit),
    freeWeekly: num(src.freeWeekly, 0, 1000000, DEFAULT_SETTINGS.freeWeekly),
    freeVoice: num(src.freeVoice, 0, 1440, DEFAULT_SETTINGS.freeVoice),
    paid: paid.length ? paid : DEFAULT_SETTINGS.paid,
    payment: String(src.payment ?? "").slice(0, 300),
    cooldowns: cooldownList(src.cooldowns),
    inviteBonus: num(src.inviteBonus, 0, 10000, DEFAULT_SETTINGS.inviteBonus),
  };
}

export const planById = (settings, id) => settings.paid.find((p) => p.id === id) || null;
export const planByPrice = (settings, n) => settings.paid.find((p) => p.price === Number(n)) || null;
