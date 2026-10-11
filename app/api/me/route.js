import { getUser, getProfile, usageOf } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfile(user);
  return Response.json({ email: user.email, ...usageOf(profile) });
}
