// Invite friends: each person gets a link; when a NEW account signs up with it, both get bonus questions.
import { randomBytes } from "crypto";
import { adminDb, getUser, getProfile, getSettings } from "../../../lib/server";
import { notifyOwner, escHtml } from "../../../lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const MAX_INVITES = 100; // bonus stops after this many friends (protects against fake accounts)
const NEW_ACCOUNT_MS = 3 * 24 * 3600 * 1000;
const missingColumn = (e) => /column .* does not exist|Could not find the .* column|schema cache/i.test(e?.message || "");

async function ensureCode(db, profile) {
  if (profile.ref_code) return profile.ref_code;
  for (let i = 0; i < 4; i++) {
    const code = randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 7).toLowerCase();
    if (code.length < 6) continue;
    const { error } = await db.from("profiles").update({ ref_code: code }).eq("id", profile.id).is("ref_code", null);
    if (!error) {
      const { data } = await db.from("profiles").select("ref_code").eq("id", profile.id).maybeSingle();
      if (data?.ref_code) return data.ref_code;
    } else if (missingColumn(error)) throw error;
  }
  throw new Error("code");
}

// Your invite link + how many friends joined.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const db = adminDb();
    const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
    const code = await ensureCode(db, profile);
    return Response.json({ code, invites: profile.invites || 0, bonus: profile.bonus || 0, perInvite: settings.inviteBonus });
  } catch (e) {
    return Response.json({ error: missingColumn(e) ? "no_table" : "db" }, { status: missingColumn(e) ? 501 : 500 });
  }
}

// Called once by a new account that arrived through someone's link.
export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const code = String(body?.code || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  if (!code) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const db = adminDb();
    const [me, settings] = await Promise.all([getProfile(user), getSettings()]);
    const fresh = Date.now() - new Date(me.created_at || user.created_at || 0).getTime() < NEW_ACCOUNT_MS;
    if (me.referred_by || !fresh) return Response.json({ ok: false, reason: "not_new" });
    const { data: friend } = await db.from("profiles").select("id,email,bonus,invites").eq("ref_code", code).maybeSingle();
    if (!friend || friend.id === me.id) return Response.json({ ok: false, reason: "bad_code" });

    const gift = settings.inviteBonus;
    // mark first (only succeeds once), then give the bonuses
    const { data: marked, error } = await db.from("profiles")
      .update({ referred_by: friend.id, bonus: (me.bonus || 0) + gift }).eq("id", me.id).is("referred_by", null).select("id");
    if (error) throw error;
    if (!marked?.length) return Response.json({ ok: false, reason: "not_new" });
    const invites = (friend.invites || 0) + 1;
    await db.from("profiles").update({ invites, ...(invites <= MAX_INVITES ? { bonus: (friend.bonus || 0) + gift } : {}) }).eq("id", friend.id);
    await notifyOwner(`🎁 <b>بانگهێشت</b>\n${escHtml(friend.email)} ← ${escHtml(me.email)}\nهەردووکیان ${gift} پرسیاری زیادەیان وەرگرت. (${invites} بانگهێشت)`);
    return Response.json({ ok: true, bonus: gift });
  } catch (e) {
    console.error("invite", e?.message);
    return Response.json({ error: missingColumn(e) ? "no_table" : "db" }, { status: 500 });
  }
}
