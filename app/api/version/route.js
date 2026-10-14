// The version of the app that is live right now. Phones compare it with the version
// they opened; when it changes (after a new deploy) they show "an update has come".
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { v: process.env.NEXT_PUBLIC_BUILD_ID || "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
