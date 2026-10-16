// House design studio: turns the user's confirmed floor plan into picture prompts, and keeps the picture limits.
// Free accounts: HOUSE_FREE_IMAGES pictures in total (default 5). Pro: HOUSE_PRO_DAILY a day (default 30). Owner: no limit.
import { redis } from "./redis";
import { serverEnv } from "./env";

// Views: "exterior", "aerial" (3D plan from above), or one room of the user's plan ("room", with its index).
// Every room picture is made from the user's own room list: nothing is added and nothing is left out.
export const VIEWS = ["exterior", "aerial", "room"];
export const STYLES = ["modern", "classic"];
export const usesPlan = (view) => view === "exterior" || view === "aerial"; // these look at the plan picture

const STYLE_TEXT = {
  modern: "modern luxury: clean horizontal lines, large floor-to-ceiling glass, warm wood slats, natural stone, beige and white plaster, hidden warm LED lighting, large-format porcelain floors, minimalist designer furniture",
  classic: "classic luxury: symmetrical forms, stone columns and cornices, arched windows with mouldings, cream and warm gold palette, crystal chandeliers, coffered ceilings, herringbone oak and marble floors, tufted velvet furniture, elegant drapery",
};

// What each kind of room looks like inside (the furniture is always sized to the real room).
const ROOM_TEXT = {
  living: "the living room with a sectional sofa, coffee table, TV wall, rug, curtains and plants",
  guest: "the formal guest reception room (diwan) with elegant sofas and armchairs arranged for guests, side tables and wall art",
  bedroom: "the bedroom with a bed and upholstered headboard, bedside tables with lamps, wardrobe and a soft rug",
  kitchen: "the kitchen with cabinets, built-in appliances, stone countertops and pendant lights",
  dining: "the dining room with a dining table, chairs and a chandelier",
  bath: "the bathroom with a glass shower, vanity with sink, toilet, mirror with backlight and stone tiles",
  garage: "the garage with one car parked, epoxy floor, storage cabinets and a sectional garage door",
  garden: "the garden with lawn, flower beds, small trees, a stone pathway and an outdoor seating area",
  yard: "the courtyard (hosh) with paving, planters, flowers, a small seating corner and wall lights",
  hall: "the entrance hall / corridor with a console table, mirror, wall lights and a runner rug",
  stairs: "the staircase with a handrail and wall lights",
  storage: "the storage room with tidy shelves",
  office: "the home office with a desk, chair, bookshelves",
  laundry: "the laundry room with washing machine, dryer, sink and cabinets",
  balcony: "the balcony with outdoor chairs, a small table and plants",
  other: "the room",
};

const QUALITY = "photorealistic architectural visualization, high-end 3D render, sharp details, realistic materials and lighting, professional photography. No text, no letters, no labels, no watermark, no logo, no people.";
const STRICT = "Use ONLY the rooms listed — do not add extra rooms, floors, wings, pools or buildings, and do not remove any.";

export const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 500 ? Math.round(Number(v) * 10) / 10 : null);
const clean = (s, n = 80) => String(s || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n);

// Keeps only safe, sensible fields from what the app sends back (the user may have edited it).
export function cleanPlan(p) {
  const rooms = (Array.isArray(p?.rooms) ? p.rooms : []).slice(0, 40).map((r) => ({
    type: ROOM_TEXT[clean(r.type, 20)] ? clean(r.type, 20) : "other", name: clean(r.name, 40), w: num(r.w), l: num(r.l),
  }));
  return { floors: Math.min(5, Math.max(1, Number(p?.floors) || 1)), area: num(p?.area) ?? null, plot: { w: num(p?.plot?.w), l: num(p?.plot?.l) }, rooms };
}

const size = (r) => (r.w && r.l ? `${r.w}×${r.l} m` : "");
function roomList(plan) {
  return plan.rooms.map((r) => r.type + (size(r) ? " " + size(r) : "")).join(", ");
}

// pano = a 360° picture (equirectangular), made from the middle of the room.
export function housePrompt({ view, style, plan, wish, room, pano }) {
  const extra = clean(wish, 300);
  const wishLine = extra ? `Owner wishes (translate if needed): ${extra}.` : "";
  const style_ = `Style: ${STYLE_TEXT[style]}.`;
  if (view === "room") {
    const r = plan.rooms[room];
    if (!r) return null;
    const outside = r.type === "garden" || r.type === "yard" || r.type === "balcony";
    const what = ROOM_TEXT[r.type] + (r.type === "garage" && /حەوش|حوش|yard|ساحة|فناء/i.test(r.name) ? ", together with the paved front yard" : "");
    const dims = size(r) ? ` It measures ${size(r)}${outside ? "" : ", ceiling height about 3 m"}; all furniture is sized to fit exactly this space, nothing extra.` : "";
    const shot = pano
      ? `360-degree equirectangular panorama photo taken from the centre of ${what}, showing the whole space all around, seamless where the left and right edges meet, level horizon.`
      : `${outside ? "Wide view of" : "Interior view of"} ${what}, wide-angle eye-level shot.`;
    return [shot, dims, style_, wishLine, QUALITY].filter(Boolean).join(" ");
  }
  const plot = (plan.area ? ` Built area about ${plan.area} m².` : "") + (plan.plot?.w && plan.plot?.l ? ` Plot ${plan.plot.w}×${plan.plot.l} m.` : "");
  const floors = ` ${plan.floors} floor${plan.floors > 1 ? "s" : ""}.`;
  const shot = view === "aerial"
    ? "Top-down 3D cutaway of the attached floor plan with the roof removed (dollhouse view from straight above). Keep every wall, room position and proportion exactly as in the attached plan; each room furnished for its use."
    : "Front exterior view of the house in the attached floor plan at golden hour, eye-level architectural photo; footprint, width and number of floors follow the plan; main entrance, warm facade lights.";
  return [shot, `House with${floors}${plot} Rooms: ${roomList(plan)}.`, STRICT, style_, wishLine, QUALITY].join(" ");
}

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
export async function houseSpend(uid, usage, n = 1) {
  if (usage.unlimited) return;
  const k = keyFor(uid, usage);
  const r = await redis("INCRBY", k, n);
  if (r !== undefined) { if (usage.pro) redis("EXPIRE", k, 2 * 86400); return; }
  local.set(k, (local.get(k) || 0) + n);
}
