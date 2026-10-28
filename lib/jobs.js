// Work that keeps going when the user leaves the app (iPhone stops the connection in the background).
// The finished answer is saved in the "jobs" table; the app picks it up when the user comes back.
import { adminDb } from "./server";

export const validJobId = (id) => typeof id === "string" && /^[a-z0-9-]{8,48}$/i.test(id) ? id : null;

export async function saveJob(userId, id, status, result) {
  if (!id) return;
  try {
    const db = adminDb();
    const row = { id, user_id: userId, status, updated_at: new Date().toISOString() };
    if (result !== undefined) row.result = result;
    const { error } = await db.from("jobs").upsert(row);
    if (error && !/does not exist|schema cache/i.test(error.message)) console.error("job save", error.message);
    // Now and then, remove old jobs (older than 2 days).
    if (status === "done" && Math.random() < 0.05) {
      await db.from("jobs").delete().lt("created_at", new Date(Date.now() - 2 * 864e5).toISOString());
    }
  } catch (e) {
    console.error("job save", e?.message);
  }
}

export async function readJob(userId, id) {
  try {
    const { data, error } = await adminDb().from("jobs").select("status,result,updated_at").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) return { status: "unknown" };
    return data || { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}
