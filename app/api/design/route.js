// Logo & poster designer: Gemini draws real vector designs (SVG) — sharp, editable, and the text (also Kurdish/Arabic) is exact.
import { jsonCall } from "../../../lib/gemini";
import { adminDb, getUser, getProfile, usageOf } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const KIND = {
  logo: `LOGO. viewBox="0 0 1024 1024". A strong, simple, memorable mark (symbol or monogram) built from clean geometric shapes, plus the brand name as a wordmark, well balanced and centered with generous margins. Flat vector style, 2–4 harmonious colours, works on a plain background. Think like Pentagram / Paul Rand: one clear idea per design.`,
  poster: `POSTER / SOCIAL POST. viewBox="0 0 1080 1350". A bold, modern graphic-design layout: strong headline, clear hierarchy, supporting text, decorative shapes, gradients or patterns, and a clear call to action if relevant. Professional print quality with good margins (at least 80px).`,
};

const SYSTEM = (kind) => `You are a world-class graphic designer. Create 3 clearly DIFFERENT, professional designs as standalone SVG code.
${KIND[kind]}

Rules:
- Each design is one complete <svg xmlns="http://www.w3.org/2000/svg" ...> element with the viewBox above. No <image>, no <script>, no <foreignObject>, no external links, fonts or CSS imports.
- Use <text> for words. Write every word EXACTLY as the user wrote it (same spelling and language). For Kurdish or Arabic text add direction="rtl" and use font-family="'Noto Kufi Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif". For Latin text use font-family="'Montserrat','Helvetica Neue',Arial,sans-serif". Keep text inside the canvas (estimate its width; use smaller sizes for long text).
- Real design quality: deliberate palette, contrast, alignment, spacing, and visual hierarchy. Use <defs> with linearGradient/radialGradient, paths, circles and shapes. Avoid clip-art and generic templates.
- If the user didn't give a name or text, invent a fitting short one in their language.
- If earlier requests are given, the new request is a CHANGE to that design: keep what they liked and apply the change.
Return JSON: {"caption": one short sentence in the user's language describing the concepts, "designs": [{"name": 1–3 word concept name in the user's language, "svg": "<svg ...>...</svg>"}, … 3 items]}`;

function clean(svg) {
  let s = String(svg || "").trim();
  const start = s.indexOf("<svg");
  const end = s.lastIndexOf("</svg>");
  if (start < 0 || end < 0) return null;
  s = s.slice(start, end + 6)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<image[\s\S]*?(\/>|<\/image>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href\s*=\s*["'])(?!#)[^"']*(["'])/gi, "$1#$2")
    .replace(/@import[^;]*;/gi, "");
  if (!/xmlns=/.test(s)) s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return s.length < 120_000 ? s : null;
}

export async function POST(req) {
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const idea = String(body?.prompt || "").trim().slice(0, 1500);
    if (!idea) return Response.json({ error: "bad_request" }, { status: 400 });
    const kind = body?.kind === "poster" ? "poster" : "logo";
    const previous = (Array.isArray(body?.previous) ? body.previous : []).map((s) => String(s).slice(0, 400)).slice(-5);

    const profile = await getProfile(user);
    const usage = usageOf(profile);
    if (usage.used >= usage.limit) return Response.json({ error: "limit", ...usage }, { status: 429 });

    const ask = (previous.length ? `Earlier requests for this design:\n- ${previous.join("\n- ")}\n\nNew request: ` : "Request: ") + idea;
    const out = await jsonCall(SYSTEM(kind), [{ text: ask }], { maxTokens: 24000 });
    const designs = (out.designs || []).map((d) => ({ name: String(d.name || "").slice(0, 40), svg: clean(d.svg) })).filter((d) => d.svg).slice(0, 3);
    if (!designs.length) throw new Error("ai");

    await adminDb()
      .from("profiles")
      .update({ used: usage.used + 1, period_key: usage.periodKey, total_count: (profile.total_count || 0) + 1 })
      .eq("id", user.id);

    return Response.json({ caption: String(out.caption || "").slice(0, 300), designs, kind });
  } catch (e) {
    console.error("design", e?.message);
    const busy = e?.message === "busy";
    return Response.json({ error: busy ? "busy" : "ai" }, { status: busy ? 503 : 502 });
  }
}
