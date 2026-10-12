// Owner dashboard numbers: users, new sign-ups, Pro, income, questions, sites, recent users.
import { adminDb, getUser, isOwner, isPaidActive, getSettings } from "../../../../lib/server";
import { planById } from "../../../../lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const DAY = 24 * 3600 * 1000;
const dayKey = (d) => new Date(new Date(d).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10); // Iraq time (UTC+3)

export async function GET(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const db = adminDb();
  const [settings, { data: rows, error }, sites] = await Promise.all([
    getSettings(),
    db.from("profiles").select("email,plan,plan_until,total_count,created_at").order("created_at", { ascending: false }).limit(20000),
    db.from("sites").select("*", { count: "exact", head: true }),
  ]);
  if (error) return Response.json({ error: "db" }, { status: 500 });

  const now = Date.now();
  const today = dayKey(now);
  const days = Array.from({ length: 14 }, (_, i) => dayKey(now - (13 - i) * DAY));
  const perDay = Object.fromEntries(days.map((d) => [d, 0]));
  let pro = 0, income = 0, questions = 0, newToday = 0, new7 = 0;
  for (const r of rows) {
    questions += r.total_count || 0;
    const k = dayKey(r.created_at);
    if (k in perDay) perDay[k]++;
    if (k === today) newToday++;
    if (now - new Date(r.created_at).getTime() < 7 * DAY) new7++;
    if (isPaidActive(r)) { pro++; income += planById(settings, r.plan)?.price || 0; }
  }
  return Response.json({
    users: rows.length, newToday, new7, pro, income, questions,
    sites: sites.count ?? null,
    signups: days.map((d) => ({ day: d, n: perDay[d] })),
    recent: rows.slice(0, 12).map((r) => ({ email: r.email, created: r.created_at, pro: isPaidActive(r), plan: r.plan, q: r.total_count || 0 })),
  });
}
