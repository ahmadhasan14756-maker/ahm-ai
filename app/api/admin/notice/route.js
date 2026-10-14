// Owner only: write an announcement in Kurdish → translated to Arabic and English → shown to every user in their app language.
import { getUser, isOwner } from "../../../../lib/server";
import { jsonCall } from "../../../../lib/gemini";
import { getNotice, setNotice } from "../../../../lib/notice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "fra1";

const forbidden = () => Response.json({ error: "forbidden" }, { status: 403 });
const clip = (s, n = 1200) => String(s || "").trim().slice(0, n);

export async function GET(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return forbidden();
  return Response.json({ notice: await getNotice() });
}

export async function POST(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

  // 1) Translate: the owner writes in Kurdish (or any language), we make all three.
  if (body.translate) {
    const text = clip(body.translate);
    if (!text) return Response.json({ error: "empty" }, { status: 400 });
    try {
      const out = await jsonCall(
        `You translate short app announcements for AHM AI. Keep the meaning, tone, emojis, line breaks, numbers and links exactly. Kurdish must be Sorani in Arabic script (fix small spelling mistakes in the owner's Kurdish, but keep their words). Return JSON {"ckb": "...", "ar": "...", "en": "..."}.`,
        [{ text }], { maxTokens: 3000 });
      return Response.json({ ckb: clip(out.ckb) || text, ar: clip(out.ar), en: clip(out.en) });
    } catch (e) {
      return Response.json({ error: e?.message === "busy" ? "busy" : "ai" }, { status: 502 });
    }
  }

  // 2) Send to everyone.
  if (body.publish) {
    const t = body.publish;
    const text = { ckb: clip(t.ckb), ar: clip(t.ar) || clip(t.ckb), en: clip(t.en) || clip(t.ckb) };
    if (!text.ckb) return Response.json({ error: "empty" }, { status: 400 });
    try {
      const notice = { id: Date.now().toString(36), text, at: new Date().toISOString() };
      await setNotice(notice);
      return Response.json({ notice });
    } catch {
      return Response.json({ error: "save" }, { status: 500 });
    }
  }

  // 3) Remove the current announcement.
  if (body.clear) {
    await setNotice(null);
    return Response.json({ notice: null });
  }
  return Response.json({ error: "bad_request" }, { status: 400 });
}
