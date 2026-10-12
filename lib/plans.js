// Plans. The owner edits these in the app (Settings → Manage plans); these are only the starting values.
export const DEFAULT_SETTINGS = {
  freeLimit: 30, // free questions per month
  paid: [
    { id: "p5", name: "Pro 5", price: 5, limit: 400, days: 30 },
    { id: "p10", name: "Pro 10", price: 10, limit: 700, days: 30, best: true },
    { id: "p25", name: "Pro 25", price: 25, limit: 2000, days: 30 },
  ],
  payment: "", // e.g. "FIB: 0770 147 5657"
  inviteBonus: 10, // extra questions for both people when a friend joins with an invite link
  cooldowns: [5, 7, 10, 24], // hours to wait each time the questions run out (the last one repeats)
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
  const src = s && typeof s === "object" ? s : {};
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
        limit: num(p?.limit, 1, 1000000, 100),
        days: num(p?.days, 1, 3650, 30),
        best: !!p?.best,
      };
    })
    .slice(0, 8)
    .sort((a, b) => a.price - b.price || a.limit - b.limit);
  let bestSeen = false; // only one plan can be "best"
  for (const p of paid) { if (p.best && bestSeen) p.best = false; if (p.best) bestSeen = true; }
  return {
    freeLimit: num(src.freeLimit, 0, 100000, DEFAULT_SETTINGS.freeLimit),
    paid: paid.length ? paid : DEFAULT_SETTINGS.paid,
    payment: String(src.payment ?? "").slice(0, 300),
    cooldowns: cooldownList(src.cooldowns),
    inviteBonus: num(src.inviteBonus, 0, 10000, DEFAULT_SETTINGS.inviteBonus),
  };
}

export const planById = (settings, id) => settings.paid.find((p) => p.id === id) || null;
export const planByPrice = (settings, n) => settings.paid.find((p) => p.price === Number(n)) || null;
