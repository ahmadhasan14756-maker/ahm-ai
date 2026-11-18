// AHM 3D Studio (preview: the owner only). The user types or says a change in Kurdish ("make the outside walls 30 cm",
// "add a 4×4 bedroom to the right of the living room") and the AI turns it into safe edits on the building model.
import { getUser, isOwner } from "../../../lib/server";
import { jsonCall } from "../../../lib/gemini";
import { allow, tooMany } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const err = (error, status = 400) => Response.json({ error }, { status });

const SYSTEM = `You edit a building model for an architecture app. Units: metres. Seen from above like a floor plan:
x grows to the RIGHT, z grows DOWN the page (towards the viewer / "front" / south), y is up. "left" = smaller x, "right" = bigger x,
"top/back/north" = smaller z, "bottom/front/south" = bigger z.
The model: walls {id,x1,z1,x2,z2,t,h}, openings {id,wall,at (centre, metres from the wall's start x1,z1),w,h,sill,kind}, rooms {id,name,type,x,z,w,d} (x,z = top-left corner, w along x, d along z).
Return JSON {"ops": [...], "say": "one short sentence in the user's language and dialect saying what you did (or what you need)"}.
Allowed ops (use ONLY these, ids must exist in the model):
- {"op":"setWall","id":"…","t":0.3,"h":3.2,"color":"#rrggbb"}  (any of t/h/color)
- {"op":"setAllWalls","t":…,"h":…,"color":"#rrggbb"}
- {"op":"addWall","x1":…,"z1":…,"x2":…,"z2":…,"t":0.2}
- {"op":"addRoom","name":"…","type":"living|guest|bedroom|kitchen|dining|bath|hall|stairs|garage|office|storage|balcony|other","x":…,"z":…,"w":…,"d":…}
- {"op":"setRoom","id":"…","name":"…","type":"…","floor":"#rrggbb"}
- {"op":"addOpening","wall":"<wall id>","kind":"door|window","at":…,"w":…,"h":…,"sill":…}  (door ≈ 0.9×2.1, window ≈ 1.2×1.2 with sill 1.0; put windows on OUTER walls)
- {"op":"setOpening","id":"…","w":…,"h":…,"sill":…,"at":…}
- {"op":"delete","id":"<wall, room or opening id>"}
- {"op":"clear"}  (only when the user clearly asks to start over)
Rules: think like an architect. A new room next to another shares its wall line exactly (e.g. to the right of a room at x=0,w=5 → new x=5). Use real sizes people need. Outer walls 0.25, inner 0.12–0.2 unless told. Never invent ids. If the request is unclear or impossible, return "ops": [] and ask one short question in "say". "say" must be in the same language as the user (Kurdish Sorani, Kurdish Badini, Arabic or English) — never mix Sorani and Badini.`;

export async function POST(req) {
  const user = await getUser(req);
  if (!user) return err("unauthorized", 401);
  if (!isOwner(user)) return err("forbidden", 403); // preview: only the owner, until it is released
  if (!(await allow("s3d:" + user.id, 30, 60000))) return tooMany();
  let body;
  try { body = await req.json(); } catch { return err("bad_request"); }
  if (body.action !== "command") return err("bad_request");
  const text = String(body.text || "").slice(0, 600).trim();
  if (!text) return err("empty");
  const m = body.model || {};
  const r = (v) => Math.round(Number(v) * 100) / 100;
  const model = {
    walls: (m.walls || []).slice(0, 400).map((w) => ({ id: String(w.id), x1: r(w.x1), z1: r(w.z1), x2: r(w.x2), z2: r(w.z2), t: r(w.t), h: r(w.h) })),
    openings: (m.openings || []).slice(0, 300).map((o) => ({ id: String(o.id), wall: String(o.wall), at: r(o.at), w: r(o.w), h: r(o.h), sill: r(o.sill), kind: o.kind })),
    rooms: (m.rooms || []).slice(0, 100).map((x) => ({ id: String(x.id), name: String(x.name || "").slice(0, 40), type: x.type, x: r(x.x), z: r(x.z), w: r(x.w), d: r(x.d) })),
    selected: body.selected ? String(body.selected) : undefined,
  };
  try {
    const out = await jsonCall(SYSTEM, [{ text: "MODEL:\n" + JSON.stringify(model) + "\n\nUSER (language: " + String(body.lang || "ckb") + "):\n" + text }],
      { maxTokens: 4000, think: "low", timeoutMs: 25000 });
    const ops = Array.isArray(out?.ops) ? out.ops.slice(0, 60) : [];
    return Response.json({ ops, say: String(out?.say || "").slice(0, 400) });
  } catch (e) {
    if (e.message === "unsafe") return err("unsafe");
    return err("ai", 502);
  }
}
