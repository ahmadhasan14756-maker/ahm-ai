// Helpers for the app builder. Pure functions — safe to use in the browser and in tests.

const FILE_BLOCK = /```file:([^\n`]+)\n([\s\S]*?)\n```/g;

// Pull complete ```file:PATH blocks out of an AI answer → { "index.html": "...", ... }
export function parseFiles(answer) {
  const files = {};
  let m;
  FILE_BLOCK.lastIndex = 0;
  while ((m = FILE_BLOCK.exec(answer))) {
    const path = cleanPath(m[1]);
    if (path) files[path] = m[2];
  }
  return files;
}

const DELETE_BLOCK = /```delete:([^\n`]+)\n?```/g;

// Paths the AI asked to delete: ```delete:path```
export function parseDeletes(answer) {
  const out = [];
  let m;
  DELETE_BLOCK.lastIndex = 0;
  while ((m = DELETE_BLOCK.exec(answer))) {
    const path = cleanPath(m[1]);
    if (path) out.push(path);
  }
  return out;
}

// Apply an AI answer to the project: add/replace files, remove deleted ones.
export function applyChanges(base, answer) {
  const files = parseFiles(answer);
  const deletes = parseDeletes(answer);
  if (!Object.keys(files).length && !deletes.length) return { files: base, changed: false };
  const next = { ...base, ...files };
  for (const d of deletes) delete next[d];
  return { files: next, changed: true };
}

export function cleanPath(p) {
  const s = String(p).trim().replace(/^\.?\/+/, "").replace(/\\/g, "/");
  if (!s || s.includes("..") || s.length > 120) return null;
  return s;
}

const escAttr = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turn the project into one HTML page for the preview iframe (inline local CSS and JS).
export function buildPreview(files) {
  const htmlName = files["index.html"] != null ? "index.html" : Object.keys(files).find((f) => f.endsWith(".html"));
  if (!htmlName) return null;
  let html = files[htmlName];

  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith(".css")) {
      const re = new RegExp(`<link[^>]*href=["'](?:\\./)?${escAttr(name)}["'][^>]*>`, "gi");
      html = html.replace(re, () => `<style>\n${content}\n</style>`);
    }
    if (name.endsWith(".js")) {
      const re = new RegExp(`<script([^>]*)src=["'](?:\\./)?${escAttr(name)}["']([^>]*)>\\s*</script>`, "gi");
      const safe = content.replace(/<\/script/gi, "<\\/script");
      html = html.replace(re, (_m, a, b) => `<script${(a + b).replace(/\s+defer|\s+async/gi, "")}>\n${safe}\n</script>`);
    }
  }
  // Images kept from an uploaded ZIP are stored as data: URLs — point the page at them.
  for (const [name, content] of Object.entries(files)) {
    if (!String(content).startsWith("data:")) continue;
    const re = new RegExp(`(["'(])(?:\\./|/)?${escAttr(name)}(["')])`, "g");
    html = html.replace(re, (_m, a, b) => a + content + b);
  }
  if (!/<meta[^>]+viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (h) => `${h}<meta name="viewport" content="width=device-width, initial-scale=1">`);
  }
  return html;
}

export async function downloadZip(files, name = "ahm-app") {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const folder = zip.folder(name);
  for (const [path, content] of Object.entries(files)) {
    const m = /^data:[^;]+;base64,(.*)$/s.exec(content);
    if (m) folder.file(path, m[1], { base64: true }); // images go back into the ZIP as real files
    else folder.file(path, content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
