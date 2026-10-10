// Plans shown in the app and used by the server. Limits are questions per month.
export const PLANS = {
  free: { id: "free", name: "بەخۆڕایی", price: 0, limit: 30 },
  p5: { id: "p5", name: "Pro 5", price: 5, limit: 400 },
  p10: { id: "p10", name: "Pro 10", price: 10, limit: 700 },
  p25: { id: "p25", name: "Pro 25", price: 25, limit: 2000 },
};

export const PAID_PLANS = [PLANS.p5, PLANS.p10, PLANS.p25];

// "/pro email 10" → plan p10
export const planByPrice = (n) => PAID_PLANS.find((p) => p.price === Number(n)) || null;
