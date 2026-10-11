// Plans. The owner edits these in the app (Settings → Manage plans); these are only the starting values.
export const DEFAULT_SETTINGS = {
  freeLimit: 30, // free questions per month
  paid: [
    { id: "p5", name: "Pro 5", price: 5, limit: 400, days: 30 },
    { id: "p10", name: "Pro 10", price: 10, limit: 700, days: 30 },
    { id: "p25", name: "Pro 25", price: 25, limit: 2000, days: 30 },
  ],
  payment: "", // e.g. "FIB: 0770 147 5657"
};

const num = (v, min, max, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

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
      };
    })
    .slice(0, 8);
  return {
    freeLimit: num(src.freeLimit, 0, 100000, DEFAULT_SETTINGS.freeLimit),
    paid: paid.length ? paid : DEFAULT_SETTINGS.paid,
    payment: String(src.payment ?? "").slice(0, 300),
  };
}

export const planById = (settings, id) => settings.paid.find((p) => p.id === id) || null;
export const planByPrice = (settings, n) => settings.paid.find((p) => p.price === Number(n)) || null;
