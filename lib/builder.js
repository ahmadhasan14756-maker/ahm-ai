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

// One page of the project with its local CSS, JS and images put inside it.
function inlinePage(files, htmlName) {
  let html = files[htmlName];
  const dir = htmlName.includes("/") ? htmlName.slice(0, htmlName.lastIndexOf("/") + 1) : "";
  const variants = (name) => [name, ...(dir && name.startsWith(dir) ? [name.slice(dir.length)] : [])];
  for (const [name, content] of Object.entries(files)) {
    for (const ref of variants(name)) {
      if (name.endsWith(".css")) {
        const re = new RegExp(`<link[^>]*href=["'](?:\\./|/)?${escAttr(ref)}["'][^>]*>`, "gi");
        html = html.replace(re, () => `<style>\n${content}\n</style>`);
      }
      if (name.endsWith(".js")) {
        const re = new RegExp(`<script([^>]*)src=["'](?:\\./|/)?${escAttr(ref)}["']([^>]*)>\\s*</script>`, "gi");
        const safe = content.replace(/<\/script/gi, "<\\/script");
        html = html.replace(re, (_m, a, b) => `<script${(a + b).replace(/\s+defer|\s+async/gi, "")}>\n${safe}\n</script>`);
      }
    }
  }
  // Images kept from an uploaded ZIP are stored as data: URLs — point the page at them.
  for (const [name, content] of Object.entries(files)) {
    if (!String(content).startsWith("data:")) continue;
    for (const ref of variants(name)) {
      const re = new RegExp(`(["'(])(?:\\./|/)?${escAttr(ref)}(["')])`, "g");
      html = html.replace(re, (_m, a, b) => a + content + b);
    }
  }
  if (!/<meta[^>]+viewport/i.test(html)) {
    html = /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, (h) => `${h}<meta name="viewport" content="width=device-width, initial-scale=1">`)
      : `<meta name="viewport" content="width=device-width, initial-scale=1">` + html;
  }
  return html;
}

// Runs inside every previewed / published page:
//  - storage: the sandbox blocks the browser's storage, so apps that save data would break; this keeps them working
//    (and tells the app's preview the data, so it survives a refresh of the preview)
//  - pages: links to the project's other .html pages open them (the whole site is in one file)
const RUNTIME = `(function(){var W=window;if(!W.__ahmRt){W.__ahmRt=1;var S=W.__AHM_STORE||{};
function sv(){try{parent.postMessage({ahmStore:S},"*")}catch(_){}}
function M(n){var d=S[n]||(S[n]={});return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v);sv()},removeItem:function(k){delete d[String(k)];sv()},clear:function(){for(var k in d)delete d[k];sv()},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
try{W.localStorage.getItem("_")}catch(e){try{Object.defineProperty(W,"localStorage",{value:M("l"),configurable:true});Object.defineProperty(W,"sessionStorage",{value:M("s"),configurable:true})}catch(_){}}
W.__ahmGo=function(p,hash){var P=W.__AHM_PAGES||{};if(P[p]==null)return false;try{parent.postMessage({ahmPage:p},"*")}catch(_){}document.open();document.write(P[p]);document.close();if(hash)setTimeout(function(){var el=document.getElementById(hash);if(el)el.scrollIntoView()},50);else W.scrollTo(0,0);return true}}
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";if(/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(h))return;var m=h.replace(/^\\.?\\//,"").split("?")[0].split("#");if(/\\.html?$/i.test(m[0])&&W.__ahmGo(m[0],m[1])){e.preventDefault()}},true);})();`;
const inject = (html, code) => {
  const tag = `<script>${code}</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + tag) : tag + html;
};
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

// Turn the project into one HTML page (for the preview and for publishing).
// Every .html page of the project is included, so links between pages work. `store` = saved app data for the preview.
export function buildPreview(files, { entry, store } = {}) {
  const pages = Object.keys(files).filter((f) => /\.html?$/i.test(f) && typeof files[f] === "string" && !String(files[f]).startsWith("data:"));
  const htmlName = entry && files[entry] != null ? entry : files["index.html"] != null ? "index.html" : pages.sort((a, b) => a.split("/").length - b.split("/").length)[0];
  if (!htmlName) return null;
  const built = {};
  for (const p of pages) built[p] = inject(inlinePage(files, p), RUNTIME);
  let first = built[htmlName];
  const setup = (pages.length > 1 ? `window.__AHM_PAGES=${json(built)};` : "") + (store ? `window.__AHM_STORE=${json(store)};` : "");
  if (setup) first = inject(first, setup);
  return first;
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
