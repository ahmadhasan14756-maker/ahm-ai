// Vercel API (owner's "Update" button): see which version is live, which new one is ready, and switch.
// Needs VERCEL_TOKEN in Vercel (Account Settings → Tokens). Optional: VERCEL_PROJECT (default "ahm-ai").
import { serverEnv } from "./env";

const API = "https://api.vercel.com";
let teamId; // resolved once

async function raw(path, opts = {}, team = teamId) {
  const sep = path.includes("?") ? "&" : "?";
  const url = API + path + (team ? (team.startsWith("slug:") ? `${sep}slug=${encodeURIComponent(team.slice(5))}` : `${sep}teamId=${team}`) : "");
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: "Bearer " + serverEnv("VERCEL_TOKEN"), "Content-Type": "application/json", ...(opts.headers || {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export const hasVercelToken = () => !!serverEnv("VERCEL_TOKEN");

// Calls the API; if the project lives in a team, finds the team the first time.
export async function vercel(path, opts) {
  let r = await raw(path, opts);
  if (!r.ok && (r.status === 404 || r.status === 403) && teamId === undefined) {
    const t = await raw("/v2/teams?limit=20", {}, null);
    const teams = [...(t.j?.teams || [])];
    // Also try the team named in settings, or "ahm-ai" (a token made only for that team may not list teams).
    const extra = serverEnv("VERCEL_TEAM_ID") || serverEnv("VERCEL_TEAM") || "ahm-ai";
    if (!teams.some((x) => x.id === extra || x.slug === extra)) {
      const one = await raw(`/v2/teams/${encodeURIComponent(extra)}`, {}, null);
      if (one.ok && one.j?.id) teams.push(one.j);
    }
    for (const team of teams) {
      const again = await raw(path, opts, team.id);
      if (again.ok) { teamId = team.id; return again; }
    }
    const bySlug = await raw(path, opts, "slug:" + extra);
    if (bySlug.ok) { teamId = "slug:" + extra; return bySlug; }
    teamId = null;
  }
  return r;
}

const projectName = () => serverEnv("VERCEL_PROJECT") || serverEnv("VERCEL_PROJECT_ID") || "ahm-ai";

const short = (d) => d && ({
  id: d.uid || d.id,
  url: d.url ? "https://" + d.url : null,
  created: d.createdAt || d.created,
  state: d.readyState || d.state,
  message: String(d.meta?.githubCommitMessage || "").split("\n")[0].slice(0, 160),
  sha: String(d.meta?.githubCommitSha || "").slice(0, 7),
});

// { live, versions: [...newest first], projectId }
export async function releaseStatus() {
  const p = await vercel(`/v9/projects/${encodeURIComponent(projectName())}`);
  if (!p.ok) throw new Error(p.status === 401 || p.status === 403 ? "token" : "project");
  const projectId = p.j.id;
  const liveId = p.j.targets?.production?.id;
  const d = await vercel(`/v6/deployments?projectId=${projectId}&target=production&limit=12`);
  if (!d.ok) throw new Error("list");
  const versions = (d.j.deployments || []).map(short).filter((x) => x.id);
  let live = versions.find((x) => x.id === liveId);
  if (!live && liveId) live = short({ ...p.j.targets.production, uid: liveId });
  return { projectId, live, versions };
}

// Makes the given (ready) version the live one for everyone.
export async function promote(projectId, deploymentId) {
  const r = await vercel(`/v10/projects/${projectId}/promote/${deploymentId}`, { method: "POST" });
  if (!r.ok) throw new Error(r.j?.error?.message || "promote");
  return true;
}
