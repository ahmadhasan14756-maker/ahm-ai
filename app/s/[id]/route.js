// Serves a published website. It runs in a locked sandbox (its own blank origin), so it can never read AHM AI logins or data.
import { adminDb } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const BADGE = `<a href="/" target="_blank" rel="noopener" style="position:fixed;z-index:2147483647;bottom:12px;left:12px;display:flex;align-items:center;gap:6px;padding:6px 12px 6px 8px;border-radius:999px;background:rgba(16,17,20,.88);color:#ecc06a;font:600 12px/1.2 system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.3);direction:ltr"><img src="/icon-192.png" alt="" width="18" height="18" style="border-radius:5px">Made with AHM AI</a>`;

const page = (status, text) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AHM AI</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#101114;color:#ecedef;font-family:system-ui,sans-serif;text-align:center"><div><p style="font-size:18px">${text}</p><a href="/" style="color:#ecc06a">AHM AI</a></div>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

export async function GET(_req, { params }) {
  const id = String(params?.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 12);
  if (!id) return page(404, "ئەم ماڵپەڕە نەدۆزرایەوە.");
  const db = adminDb();
  const { data } = await db.from("sites").select("html,views").eq("id", id).maybeSingle();
  if (!data) return page(404, "ئەم ماڵپەڕە نەدۆزرایەوە یان لابراوە.");
  db.from("sites").update({ views: (data.views || 0) + 1 }).eq("id", id).then(() => {}, () => {});

  const html = /<\/body>/i.test(data.html) ? data.html.replace(/<\/body>(?![\s\S]*<\/body>)/i, BADGE + "</body>") : data.html + BADGE;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // no allow-same-origin → the page gets a unique blank origin (no access to AHM AI's storage or login)
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "public, max-age=30",
    },
  });
}
