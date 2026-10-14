// Announcements from the owner to every user, kept in app_settings (key "notice"), cached in Redis.
import { adminDb } from "./server";
import { cacheGet, cacheSet, cacheDel } from "./redis";

const KEY = "notice:v1";
let local = { at: 0, value: undefined };

export async function getNotice() {
  if (local.value !== undefined && Date.now() - local.at < 20000) return local.value;
  let value = await cacheGet(KEY);
  if (value === undefined) {
    value = null;
    try {
      const { data } = await adminDb().from("app_settings").select("value").eq("key", "notice").maybeSingle();
      if (data?.value?.id && data.value.text) value = data.value;
    } catch {}
    await cacheSet(KEY, value, 60);
  }
  local = { at: Date.now(), value };
  return value;
}

export async function setNotice(value) {
  const { error } = await adminDb().from("app_settings").upsert({ key: "notice", value: value || {}, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  local = { at: Date.now(), value: value || null };
  await cacheDel(KEY);
  return value;
}
