import { getUser, getProfile, usageOf, getSettings, isOwner, publicUsage } from "../../../lib/server";
import { voiceInfo } from "../../../lib/voice";
import { getNotice } from "../../../lib/notice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  const [voice, notice] = await Promise.all([voiceInfo(user.id, usage, settings), getNotice()]);
  return Response.json({ email: user.email, ...publicUsage(usage), voice, notice, plans: settings, owner: isOwner(user) });
}
