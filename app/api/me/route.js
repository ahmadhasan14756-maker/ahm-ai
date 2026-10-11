import { getUser, getProfile, usageOf, getSettings, isOwner } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  return Response.json({ email: user.email, ...usageOf(profile, settings), plans: settings, owner: isOwner(user) });
}
