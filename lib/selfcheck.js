// The AI tests its own work, like a person would: every page of the project is opened in a hidden phone-sized
// preview, every button / tab / menu is pressed once, and code errors, console errors and empty pages are collected.
// Browser only. The user's own saved app data is never touched (each test page starts with empty data).
import { buildPreview } from "./builder";

const pagesOf = (files) => Object.keys(files).filter((f) => /\.html?$/i.test(f) && typeof files[f] === "string" && !files[f].startsWith("data:"))
  .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));

function testPage(files, page, { timeout = 16000 } = {}) {
  return new Promise((resolve) => {
    const tok = "c" + Math.random().toString(36).slice(2);
    let html = buildPreview(files, { frame: true, entry: page, store: {} });
    if (!html) return resolve({ page, errors: [], blank: true, clicked: 0 });
    const flag = `<script>window.__AHM_CHECK=${JSON.stringify(tok)};</script>`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + flag) : flag + html;
    const errors = new Set();
    let finished = false;
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts allow-forms");
    f.setAttribute("aria-hidden", "true");
    f.tabIndex = -1;
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0;opacity:0;pointer-events:none";
    const done = (res) => {
      if (finished) return; finished = true;
      window.removeEventListener("message", on); clearTimeout(tm); f.remove();
      resolve({ page, errors: [...errors].slice(0, 6), ...res });
    };
    const on = (e) => {
      const d = e.data;
      if (!d || typeof d !== "object" || d.chk !== tok) return;
      if (typeof d.ahmError === "string") errors.add(d.ahmError.slice(0, 220));
      if (d.ahmLog?.l === "error" && d.ahmLog.m) errors.add(String(d.ahmLog.m).slice(0, 220));
      if (d.ahmChecked) { const c = d.ahmChecked; done({ blank: (c.text || 0) < 2 && (c.els || 0) < 6, clicked: c.clicked || 0, views: c.views || 0, blankViews: Array.isArray(c.blankViews) ? c.blankViews : [], deadViews: Array.isArray(c.deadViews) ? c.deadViews : [], loginFailed: !!(c.loginTried && !c.loggedIn && c.demoShown) }); }
    };
    window.addEventListener("message", on);
    const tm = setTimeout(() => done({ blank: false, clicked: 0, slow: true }), timeout);
    f.srcdoc = html;
    document.body.appendChild(f);
  });
}

// → { pages: n, clicked: n, problems: [{ page, kind: "error"|"blank", text }] }
export async function checkProject(files, { max = 12, onPage } = {}) {
  const pages = pagesOf(files).slice(0, max);
  const problems = [];
  let clicked = 0, views = 0;
  for (let i = 0; i < pages.length; i++) {
    onPage?.(i + 1, pages.length, pages[i]);
    const r = await testPage(files, pages[i]);
    clicked += r.clicked || 0;
    for (const e of r.errors) if (!problems.some((p) => p.text === e)) problems.push({ page: r.page, kind: "error", text: e });
    if (r.blank) problems.push({ page: r.page, kind: "blank", text: "" });
    for (const v of r.blankViews || []) problems.push({ page: r.page, kind: "blankView", text: v });
    for (const v of r.deadViews || []) problems.push({ page: r.page, kind: "deadNav", text: v });
    if (r.loginFailed) problems.push({ page: r.page, kind: "login", text: "" });
    views += r.views || 0;
  }
  return { pages: pages.length, clicked, views, problems };
}
