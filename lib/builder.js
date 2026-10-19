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

// JavaScript modules (import / export between the project's files) can't load other files inside the preview,
// so each module is turned into a self-contained data: address, with its imports pointing at the others.
const JS_EXT = /\.(m?js)$/i;
function joinPath(from, rel) {
  const parts = from.split("/").slice(0, -1);
  for (const seg of rel.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop(); else parts.push(seg);
  }
  return parts.join("/");
}
function moduleUrl(files, path, memo = {}, busy = new Set()) {
  if (memo[path]) return memo[path];
  if (busy.has(path)) return null; // circular import: leave it
  busy.add(path);
  const fix = (spec) => {
    if (!/^(\.{1,2}\/|\/)/.test(spec)) return spec;
    let target = spec.startsWith("/") ? spec.slice(1) : joinPath(path, spec);
    if (files[target] == null && files[target + ".js"] != null) target += ".js";
    if (files[target] == null || !JS_EXT.test(target)) return spec;
    return moduleUrl(files, target, memo, busy) || spec;
  };
  const code = String(files[path])
    .replace(/((?:import|export)\s[^'"]*?\sfrom\s*)(['"])([^'"]+)\2/g, (_m, a, q, sp) => a + q + fix(sp) + q)
    .replace(/(import\s*)(['"])([^'"]+)\2/g, (_m, a, q, sp) => a + q + fix(sp) + q)
    .replace(/(import\(\s*)(['"])([^'"]+)\2(\s*\))/g, (_m, a, q, sp, b) => a + q + fix(sp) + q + b);
  busy.delete(path);
  return (memo[path] = "data:text/javascript;charset=utf-8," + encodeURIComponent(code));
}

// One page of the project with its local CSS, JS and images put inside it.
function inlinePage(files, htmlName) {
  let html = files[htmlName];
  // module scripts first: <script type="module" src="js/app.js"> → the bundled module
  html = html.replace(/<script([^>]*\btype=["']module["'][^>]*)\bsrc=["'](?:\.\/|\/)?([^"']+)["']([^>]*)>\s*<\/script>/gi, (m, a, src, b) => {
    const target = files[src] != null ? src : files[joinPath(htmlName, src)] != null ? joinPath(htmlName, src) : null;
    return target && JS_EXT.test(target) ? `<script${a}src="${moduleUrl(files, target)}"${b}></script>` : m;
  });
  // inline module code that imports project files
  html = html.replace(/(<script[^>]*\btype=["']module["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (m, a, code, b) => {
    if (!/\bimport\b/.test(code)) return m;
    const fake = "__inline__.js";
    const url = moduleUrl({ ...files, [fake]: code }, fake);
    return `${a}import "${url}";${b}`;
  });
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
// Runs first in every page of the preview (and of published sites):
//  • saved data (localStorage) survives page changes and reloads,
//  • every way of going to another page works — links, ?page=…, #section, location.href = …, forms, window.open —
//    instead of the browser blocking the frame (the grey "sad page"),
//  • code errors and links to pages that don't exist are reported to the app, so it can offer a fix.
const RUNTIME = `(function(){var W=window;var T=W.__ahmTok=(W.__ahmTok||0)+1;var X=W.__ahmS;
function post(m){try{parent.postMessage(m,"*")}catch(_){}}
if(!X){X=W.__ahmS={S:W.__AHM_STORE||{},PG:W.__AHM_PAGES||null,open:W.open};var L=W.__AHM_LOC||{};X.cur={page:L.page||"index.html",search:L.search||"",hash:L.hash||""};X.LIST=L.pages||(X.PG?Object.keys(X.PG):[X.cur.page]);
var S=X.S;var sv=function(){post({ahmStore:S})};
var M=function(n){var d=S[n]||(S[n]={});return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v);sv()},removeItem:function(k){delete d[String(k)];sv()},clear:function(){for(var k in d)delete d[k];sv()},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}};
try{W.localStorage.getItem("_")}catch(e){try{Object.defineProperty(W,"localStorage",{value:M("l"),configurable:true});Object.defineProperty(W,"sessionStorage",{value:M("s"),configurable:true})}catch(_){}}
W.open=function(u){var s=String(u==null?"":u);if(s&&!/^([a-z][a-z0-9+.-]*:|\\/\\/)/i.test(s)){W.__ahmS.go(s);return W}return X.open.apply(W,arguments)};
W.addEventListener("error",function(e){var m=String(e.message||"");if(!m||/^Script error|ResizeObserver/i.test(m))return;post({ahmError:m.slice(0,300)})});
W.addEventListener("unhandledrejection",function(e){var r=e.reason;var m=String(r&&r.message||r||"");if(m)post({ahmError:m.slice(0,300)})});}
var LIST=X.LIST,PG=X.PG;
function norm(p){var c=X.cur.page;p=String(p||"").trim();var dir=c.indexOf("/")>=0?c.slice(0,c.lastIndexOf("/")+1):"";p=p.charAt(0)==="/"?p.slice(1):dir+p;var o=[];p.split("/").forEach(function(s){if(s==="..")o.pop();else if(s&&s!==".")o.push(s)});return o.join("/")}
function find(p){if(!p)return X.cur.page;var c=[p,p+".html",p.replace(/\\/$/,"")+"/index.html",p.replace(/\\/$/,"")+".html"];for(var i=0;i<c.length;i++)if(LIST.indexOf(c[i])>=0)return c[i];return null}
function setHash(h){h=String(h||"");if(h&&h.charAt(0)!=="#")h="#"+h;var old=X.cur.hash;X.cur.hash=h;if(old!==h){try{W.dispatchEvent(new HashChangeEvent("hashchange"))}catch(_){}}var el=null;try{el=h.length>1&&document.getElementById(decodeURIComponent(h.slice(1)))}catch(_){}if(el)el.scrollIntoView({behavior:"smooth",block:"start"})}
function go(url){url=String(url==null?"":url).trim();
if(/^https?:\\/\\/app\\.local\\//i.test(url))url=url.replace(/^https?:\\/\\/app\\.local\\//i,"/");
if(/^([a-z][a-z0-9+.-]*:|\\/\\/)/i.test(url)){if(!/^javascript:/i.test(url))try{X.open.call(W,url,"_blank")}catch(_){}return}
var h="",q="",i=url.indexOf("#");if(i>=0){h=url.slice(i);url=url.slice(0,i)}i=url.indexOf("?");if(i>=0){q=url.slice(i);url=url.slice(0,i)}
var page=url?find(norm(url)):X.cur.page;if(!page){post({ahmMissing:norm(url)});return}
if(page===X.cur.page&&q===X.cur.search&&h){setHash(h);return}
X.cur={page:page,search:q,hash:h};post({ahmPage:page});
if(W.__AHM_FRAME){post({ahmNav:{page:page,search:q,hash:h}});return}
if(PG&&PG[page]!=null){document.open();document.write(PG[page]);document.close();if(h)setTimeout(function(){setHash(h)},60);else W.scrollTo(0,0)}}
X.go=go;W.__ahmGo=function(p,h){go(p+(h?"#"+h:""));return true};
W.__ahmLoc={get href(){return"https://app.local/"+X.cur.page+X.cur.search+X.cur.hash},set href(v){go(v)},get search(){return X.cur.search},set search(v){v=String(v||"");go(X.cur.page+(v?(v.charAt(0)==="?"?v:"?"+v):""))},get hash(){return X.cur.hash},set hash(v){setHash(v)},get pathname(){return"/"+X.cur.page},set pathname(v){go(v)},origin:"https://app.local",host:"app.local",hostname:"app.local",protocol:"https:",port:"",assign:function(v){go(v)},replace:function(v){go(v)},reload:function(){var c=X.cur;if(W.__AHM_FRAME)post({ahmNav:{page:c.page,search:c.search,hash:c.hash}});else{X.cur={page:c.page,search:"",hash:""};go(c.page+c.search)}},toString:function(){return this.href}};
W.addEventListener("click",function(e){if(W.__ahmTok!==T||e.defaultPrevented||e.button)return;var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a||a.hasAttribute("download"))return;var h=a.getAttribute("href")||"";if(/^(mailto:|tel:|javascript:)/i.test(h))return;e.preventDefault();if(h.charAt(0)==="#"){if(h.length>1)setHash(h);return}go(h)});
W.addEventListener("submit",function(e){if(W.__ahmTok!==T||e.defaultPrevented)return;e.preventDefault();var f=e.target,act=f&&f.getAttribute&&f.getAttribute("action");if(!act)return;var q="";try{if(String(f.method||"get").toLowerCase()==="get")q="?"+new URLSearchParams(new FormData(f)).toString()}catch(_){}go(act+(q.length>1?q:""))});
if(X.cur.hash&&T===1)W.addEventListener("load",function(){setHash(X.cur.hash)});})();`;

// The project's code is changed a little for the preview: every use of location (location.href = …, location.search,
// location.reload() …) goes to the preview's own address, which knows the project's pages.
const LOC_PROPS = "href|search|hash|pathname|reload|assign|replace|origin|host|hostname|protocol|port";
const LOC_SET = /(^|[^\w$.])(?:(?:window|document|self|top|parent)\s*\.\s*)?location\s*=(?!=)/g;
const LOC_GET = new RegExp(`(^|[^\\w$.])(?:(?:window|document|self|top|parent)\\s*\\.\\s*)?location\\s*\\.\\s*(?=(?:${LOC_PROPS})\\b)`, "g");
const fixLoc = (code) => code.replace(LOC_SET, "$1__ahmLoc.href=").replace(LOC_GET, "$1__ahmLoc.");
const fixFiles = (files) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" && /\.(html?|m?js)$/i.test(k) && !v.startsWith("data:") ? fixLoc(v) : v]));
const inject = (html, code) => {
  const tag = `<script>${code}</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + tag) : tag + html;
};
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

// Turn the project into one HTML page (for the preview and for publishing).
// Every .html page of the project is included, so links between pages work. `store` = saved app data for the preview.
export function buildPreview(rawFiles, { entry, store, frame, loc } = {}) {
  const files = fixFiles(rawFiles);
  const pages = Object.keys(files).filter((f) => /\.html?$/i.test(f) && typeof files[f] === "string" && !String(files[f]).startsWith("data:"));
  const htmlName = entry && files[entry] != null ? entry : files["index.html"] != null ? "index.html" : [...pages].sort((a, b) => a.split("/").length - b.split("/").length)[0];
  if (!htmlName) return null;
  const st = store ? `window.__AHM_STORE=${json(store)};` : "";
  if (frame) {
    // the app's preview: only the open page is built; going to another page asks the app to show it
    const where = { page: htmlName, pages, search: loc?.search || "", hash: loc?.hash || "", t: loc?.t || 0 };
    return inject(inject(inlinePage(files, htmlName), RUNTIME), `window.__AHM_FRAME=1;window.__AHM_LOC=${json(where)};` + st);
  }
  // a published site: every page is inside, so links between pages work without a server
  const built = {};
  for (const p of pages) built[p] = inject(inlinePage(files, p), RUNTIME);
  return inject(built[htmlName], (pages.length > 1 ? `window.__AHM_PAGES=${json(built)};` : "") + `window.__AHM_LOC=${json({ page: htmlName, pages })};` + st);
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
  // every ZIP explains how to open it, even if the project has no README
  if (!Object.keys(files).some((f) => /^readme\.md$/i.test(f))) {
    folder.file("README.md", `# ${name}\n\nMade with AHM AI.\n\n## How to open\n1. Unzip this file.\n2. Open the folder and double-click index.html — it opens in your browser.\n3. To edit, open the folder in VS Code (code.visualstudio.com).\n\n## چۆن بیکەیتەوە\n١. ئەم ZIP ـە بکەرەوە.\n٢. فۆڵدەرەکە بکەرەوە و دوو کرتە لە index.html بکە.\n٣. بۆ دەستکاری، فۆڵدەرەکە لە VS Code بکەرەوە.\n`);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
