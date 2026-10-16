// Passes Poly Haven 3D model files (free CC0) through our own address, for browsers that block them directly.
// Only files from dl.polyhaven.org/file/ph-assets/Models/ are allowed. Cached by the CDN for a long time.
export const runtime = "edge";

const OK = /^https:\/\/dl\.polyhaven\.org\/file\/ph-assets\/Models\/[A-Za-z0-9_\-/.]+\.(gltf|bin|jpg|jpeg|png|webp)$/;
const TYPE = { gltf: "model/gltf+json", bin: "application/octet-stream", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(req) {
  const u = new URL(req.url).searchParams.get("u") || "";
  if (!OK.test(u) || u.includes("..")) return new Response("bad request", { status: 400 });
  const r = await fetch(u, { headers: { "User-Agent": "AHM-AI/1.0 (ahm-ai.vercel.app)" } });
  if (!r.ok || !r.body) return new Response("not found", { status: 404 });
  const ext = u.split(".").pop().toLowerCase();
  return new Response(r.body, {
    headers: {
      "Content-Type": TYPE[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=604800, s-maxage=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
