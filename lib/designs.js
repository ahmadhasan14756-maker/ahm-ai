// Saved design projects (interior / exterior / redesign), kept in Supabase Storage — no new database table needed.
// Each user has a private folder: designs/<user id>/index.json + the pictures. Only the server touches it
// (with the secret key), and it always uses the signed-in user's own folder, so nobody can see another user's work.
import { adminDb } from "./server";

const BUCKET = "designs";
const MAX_PROJECTS = 40;
let bucketReady = false;

async function bucket() {
  const db = adminDb();
  if (!bucketReady) {
    const { error } = await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 8 * 1024 * 1024 });
    if (error && !/exist|duplicate/i.test(error.message)) console.error("designs bucket", error.message);
    bucketReady = true;
  }
  return db.storage.from(BUCKET);
}
const dir = (uid) => `${uid}`;
const okId = (id) => typeof id === "string" && /^[a-z0-9]{8,24}$/.test(id);
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function listProjects(uid) {
  const b = await bucket();
  const { data, error } = await b.download(`${dir(uid)}/index.json`);
  if (error || !data) return [];
  try { const j = JSON.parse(await data.text()); return Array.isArray(j) ? j : []; } catch { return []; }
}
async function writeIndex(uid, list) {
  const b = await bucket();
  const body = Buffer.from(JSON.stringify(list.slice(0, MAX_PROJECTS)));
  const { error } = await b.upload(`${dir(uid)}/index.json`, body, { contentType: "application/json", upsert: true });
  if (error) throw new Error("store");
}
async function put(uid, name, base64, type = "image/jpeg") {
  const b = await bucket();
  const path = `${dir(uid)}/${name}`;
  const { error } = await b.upload(path, Buffer.from(base64, "base64"), { contentType: type, upsert: true });
  if (error) throw new Error("store");
  return path;
}

// Adds a new result to a project (creating the project, with its original photo, the first time).
export async function saveResult(uid, { id, original, result, mime, meta }) {
  const list = await listProjects(uid);
  let p = okId(id) ? list.find((x) => x.id === id) : null;
  const now = new Date().toISOString();
  if (!p) {
    p = { id: newId(), name: String(meta.name || "").slice(0, 60), tool: meta.tool, style: meta.style, created: now, results: [] };
    p.original = original ? await put(uid, `${p.id}/original.jpg`, original) : null;
    list.unshift(p);
    // too many projects: forget the oldest (and its pictures)
    const extra = list.splice(MAX_PROJECTS);
    if (extra.length) removeFiles(uid, extra).catch(() => {});
  }
  const n = (p.results?.length || 0) + 1;
  const path = await put(uid, `${p.id}/result-${n}-${Date.now().toString(36)}.${mime === "image/png" ? "png" : "jpg"}`, result, mime);
  p.results = [...(p.results || []), { path, prompt: String(meta.prompt || "").slice(0, 600), style: meta.style, at: now }].slice(-12);
  p.updated = now;
  p.style = meta.style;
  // keep the newest project first
  const rest = list.filter((x) => x.id !== p.id);
  await writeIndex(uid, [p, ...rest]);
  return p.id;
}

async function removeFiles(uid, projects) {
  const b = await bucket();
  const paths = projects.flatMap((p) => [p.original, ...(p.results || []).map((r) => r.path)]).filter((x) => x && x.startsWith(`${dir(uid)}/`));
  if (paths.length) await b.remove(paths);
}

export async function renameProject(uid, id, name) {
  const list = await listProjects(uid);
  const p = list.find((x) => x.id === id);
  if (!p) return false;
  p.name = String(name || "").slice(0, 60);
  await writeIndex(uid, list);
  return true;
}
export async function deleteProject(uid, id) {
  const list = await listProjects(uid);
  const p = list.find((x) => x.id === id);
  if (!p) return false;
  await removeFiles(uid, [p]).catch(() => {});
  await writeIndex(uid, list.filter((x) => x.id !== id));
  return true;
}

// Short-lived private links to the pictures, only for this user's own files.
export async function withLinks(uid, projects) {
  const b = await bucket();
  const paths = [...new Set(projects.flatMap((p) => [p.original, ...(p.results || []).map((r) => r.path)]).filter((x) => x && x.startsWith(`${dir(uid)}/`)))];
  if (!paths.length) return projects;
  const { data } = await b.createSignedUrls(paths, 3600);
  const url = Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  return projects.map((p) => ({ ...p, originalUrl: url[p.original] || null, results: (p.results || []).map((r) => ({ ...r, url: url[r.path] || null })) }));
}
