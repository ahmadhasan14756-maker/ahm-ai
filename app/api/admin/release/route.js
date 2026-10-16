// Owner only: the "Update" button. Shows the live version and new ready versions, and makes one live.
import { getUser, isOwner } from "../../../../lib/server";
import { hasVercelToken, releaseStatus, promote } from "../../../../lib/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "fra1";

const forbidden = () => Response.json({ error: "forbidden" }, { status: 403 });

export async function GET(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return forbidden();
  if (!hasVercelToken()) return Response.json({ configured: false });
  try {
    const s = await releaseStatus();
    const liveAt = s.live?.created || 0;
    const ready = s.versions.filter((v) => v.state === "READY");
    const newer = ready.filter((v) => v.created > liveAt && v.id !== s.live?.id);
    const building = s.versions.some((v) => ["BUILDING", "QUEUED", "INITIALIZING"].includes(v.state) && v.created > liveAt);
    const older = ready.filter((v) => v.created < liveAt).slice(0, 4);
    return Response.json({ configured: true, live: s.live || null, next: newer[0] || null, newerCount: newer.length, building, older });
  } catch (e) {
    return Response.json({ configured: true, error: e.message || "error" }, { status: 502 });
  }
}

export async function POST(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return forbidden();
  if (!hasVercelToken()) return Response.json({ error: "not_configured" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.deploymentId || "");
  if (!/^dpl_[A-Za-z0-9]+$/.test(id)) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const s = await releaseStatus();
    if (!s.versions.some((v) => v.id === id && v.state === "READY")) return Response.json({ error: "not_ready" }, { status: 400 });
    await promote(s.projectId, id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || "promote" }, { status: 502 });
  }
}
