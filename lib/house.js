// House design studio: turns the user's confirmed floor plan into picture prompts, and keeps the picture limits.
// Free accounts: HOUSE_FREE_IMAGES pictures in total (default 5). Pro: HOUSE_PRO_DAILY a day (default 30). Owner: no limit.
import { redis } from "./redis";
import { serverEnv } from "./env";

export const VIEWS = ["exterior", "aerial", "living", "guest", "bedroom", "kitchen", "bath", "garage", "garden"];
export const STYLES = ["modern", "classic"];
const PLAN_VIEWS = new Set(["exterior", "aerial"]); // these look at the user's plan picture

const STYLE_TEXT = {
  modern: "modern luxury architecture: clean horizontal lines, flat roof with slim overhangs, large floor-to-ceiling glass, warm wood slats, natural stone cladding, beige and white plaster, hidden warm LED lighting, polished large-format porcelain floors, minimalist designer furniture",
  classic: "classic luxury architecture: symmetrical facade, stone columns and cornices, arched windows with mouldings, cream and warm gold palette, crystal chandeliers, coffered ceilings, herringbone oak and marble floors, tufted velvet furniture, elegant drapery",
};

const VIEW_TEXT = {
  exterior: "front exterior view of this house at golden hour, eye-level architectural photo; the footprint, width and number of floors follow the attached floor plan; main entrance with steps, landscaped front yard with flowers and small trees, stone pathway, warm facade lights",
  aerial: "top-down 3D cutaway floor plan of the attached plan with the roof removed (dollhouse view from straight above), keep every wall, room position and proportion exactly as in the attached plan, each room fully furnished, realistic floor materials, soft shadows, garden and paths around the house",
  living: "interior of the living room with a large sectional sofa, coffee table, TV wall with wood and stone panels, rug, curtains, plants, layered ceiling lighting",
  guest: "interior of the formal guest reception room (diwan) with elegant sofas and armchairs arranged for guests, side tables, decorative wall art, chandelier",
  bedroom: "interior of the master bedroom with a king bed and upholstered headboard, side tables with lamps, wardrobe, soft rug, warm cove lighting",
  kitchen: "interior of the kitchen with an island, built-in appliances, stone countertops, pendant lights, and the dining table with chairs next to it",
  bath: "interior of the bathroom with a glass walk-in shower, floating vanity with vessel sink, large mirror with backlight, stone tiles",
  garage: "interior of the garage with one car parked, epoxy floor, organised storage cabinets, bright ceiling lights, sectional garage door",
  garden: "the private back garden with green lawn, flower beds, trees, stone pathway, outdoor seating area with a pergola, garden lights at dusk",
};

const QUALITY = "photorealistic architectural visualization, high-end 3D render, sharp details, natural light, realistic materials, professional interior/exterior photography, 8k quality. No text, no letters, no labels, no watermark, no logo, no people.";

export const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 500 ? Math.round(Number(v) * 10) / 10 : null);
const clean = (s, n = 80) => String(s || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n);

// Keeps only safe, sensible fields from what the app sends back (the user may have edited it).
export function cleanPlan(p) {
  const rooms = (Array.isArray(p?.rooms) ? p.rooms : []).slice(0, 40).map((r) => ({
    type: clean(r.type, 20), name: clean(r.name, 40), w: num(r.w), l: num(r.l),
  }));
  return { floors: Math.min(5, Math.max(1, Number(p?.floors) || 1)), area: num(p?.area) ?? null, plot: { w: num(p?.plot?.w), l: num(p?.plot?.l) }, rooms };
}

// English description of the rooms for the picture AI (names may be Kurdish, so types are used).
function roomList(plan) {
  return plan.rooms.map((r) => r.type + (r.w && r.l ? ` ${r.w}×${r.l} m` : "")).join(", ");
}

export function housePrompt(view, style, plan, wish) {
  const rooms = roomList(plan);
  const extra = clean(wish, 300);
  const plot = (plan.area ? ` Built area about ${plan.area} m².` : "") + (plan.plot?.w && plan.plot?.l ? ` Plot ${plan.plot.w}×${plan.plot.l} m.` : "");
  const floors = ` ${plan.floors} floor${plan.floors > 1 ? "s" : ""}.`;
  return [
    VIEW_TEXT[view],
    `Style: ${STYLE_TEXT[style]}.`,
    view === "exterior" || view === "aerial" ? `House with${floors}${plot} Rooms: ${rooms}.` : "",
    extra ? `Owner wishes (translate if needed): ${extra}.` : "",
    QUALITY,
  ].filter(Boolean).join(" ");
}
export const usesPlan = (view) => PLAN_VIEWS.has(view);

// ---- limits ----
const freeMax = () => Number(serverEnv("HOUSE_FREE_IMAGES")) || 5;
const proDaily = () => Number(serverEnv("HOUSE_PRO_DAILY")) || 30;
const dayKey = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
const local = new Map();

function keyFor(uid, usage) {
  return usage.pro ? `hp:${uid}:${dayKey()}` : `hf:${uid}`; // free: in total; Pro: per day
}
export async function houseLeft(uid, usage) {
  if (usage.unlimited) return { left: null, max: null, pro: true };
  const k = keyFor(uid, usage);
  const max = usage.pro ? proDaily() : freeMax();
  const v = await redis("GET", k);
  const used = v !== undefined ? Number(v) || 0 : local.get(k) || 0;
  return { left: Math.max(0, max - used), max, pro: !!usage.pro };
}
export async function houseSpend(uid, usage) {
  if (usage.unlimited) return;
  const k = keyFor(uid, usage);
  const r = await redis("INCR", k);
  if (r !== undefined) { if (usage.pro) redis("EXPIRE", k, 2 * 86400); return; }
  local.set(k, (local.get(k) || 0) + 1);
}
