import { getUser, getProfile, usageOf, getSettings, isOwner, publicUsage } from "../../../lib/server";
import { voiceInfo } from "../../../lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  return Response.json({ email: user.email, ...publicUsage(usage), voice: await voiceInfo(user.id, usage, settings), plans: settings, owner: isOwner(user) });
}
