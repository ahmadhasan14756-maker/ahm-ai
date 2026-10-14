// The design & images section was removed from AHM AI (owner's decision). Kept so old app versions get a clear answer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json({ error: "removed" }, { status: 410 });
}
