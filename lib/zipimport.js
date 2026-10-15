// Open a project ZIP in the browser and turn it into workspace files.
// Smart: skips junk folders (node_modules, .git, build output), lock files and huge files,
// removes the single top folder most ZIPs have, keeps small images, and puts the most
// important files first when the project is too big for the AI.
import { cleanPath } from "./builder";

const MAX_ZIP_BYTES = 25_000_000;
const MAX_TEXT_FILE = 250_000;      // characters per file
const MAX_TEXT_TOTAL = 520_000;     // what the AI can read at once (server limit is 600k)
const MAX_IMAGE = 160_000;          // bytes per image kept
const MAX_IMAGES_TOTAL = 1_500_000;

const JUNK_DIR = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|dist|build|out|coverage|__pycache__|\.venv|venv|env|vendor|\.idea|\.vscode|Pods|\.gradle|\.dart_tool|bin|obj|target|\.expo|\.cache|\.turbo|__MACOSX)(\/|$)/i;
const JUNK_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Podfile\.lock|poetry\.lock|\.env(\..*)?)$/i;
const TEXT_EXT = /\.(html?|css|scss|sass|less|js|jsx|mjs|cjs|ts|tsx|json|md|txt|py|php|java|kt|kts|swift|dart|c|h|cpp|hpp|cs|go|rs|rb|vue|svelte|xml|yml|yaml|toml|ini|cfg|conf|sql|sh|bat|ps1|gradle|properties|env\.example|gitignore|csv|svg|astro|njk|ejs|hbs|twig|lua|r|pl|scala|graphql|gql|prisma|dockerfile)$/i;
const TEXT_NAME = /(^|\/)(Dockerfile|Makefile|Procfile|README|LICENSE|\.gitignore|\.editorconfig|\.prettierrc|\.eslintrc)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|ico|bmp)$/i;
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon", bmp: "image/bmp" };

// Lower = more important (kept first when the project is big).
function rank(p) {
  if (/^(index\.html?|readme\.md|package\.json|requirements\.txt|pubspec\.yaml|main\.py|app\.py)$/i.test(p)) return 0;
  if (/^(src|app|lib|pages|components)\//i.test(p)) return 1;
  if (!p.includes("/")) return 1;
  if (/(test|spec|__tests__|docs?|examples?)\//i.test(p)) return 4;
  if (/\.min\.(js|css)$/i.test(p)) return 5;
  return 2;
}

// Returns { files, name, count, skipped: { junk, big, binary, cut }, stack }
export async function importZip(file) {
  if (file.size > MAX_ZIP_BYTES) throw new Error("too_big");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  const skipped = { junk: 0, big: 0, binary: 0, cut: 0 };

  // Remove one shared top folder ("my-app/index.html" → "index.html").
  const paths = entries.map((e) => e.name.replace(/\\/g, "/"));
  const firsts = new Set(paths.map((p) => (p.includes("/") ? p.split("/")[0] : "")));
  const strip = firsts.size === 1 && !firsts.has("") ? [...firsts][0].length + 1 : 0;

  const texts = [];
  const images = [];
  for (const e of entries) {
    const raw = e.name.replace(/\\/g, "/").slice(strip);
    const p = cleanPath(raw);
    if (!p || JUNK_DIR.test(p) || JUNK_FILE.test(p)) { skipped.junk++; continue; }
    if (IMAGE_EXT.test(p)) {
      const data = await e.async("base64");
      if (data.length * 0.75 > MAX_IMAGE) { skipped.big++; continue; }
      images.push({ p, data });
      continue;
    }
    if (!TEXT_EXT.test(p) && !TEXT_NAME.test(p)) { skipped.binary++; continue; }
    const text = await e.async("string");
    if (text.includes("\u0000")) { skipped.binary++; continue; }
    if (text.length > MAX_TEXT_FILE) { skipped.big++; continue; }
    texts.push({ p, text });
  }

  texts.sort((a, b) => rank(a.p) - rank(b.p) || a.text.length - b.text.length);
  const files = {};
  let total = 0;
  for (const { p, text } of texts) {
    if (total + text.length > MAX_TEXT_TOTAL) { skipped.cut++; continue; }
    files[p] = text;
    total += text.length;
  }
  let imgTotal = 0;
  for (const { p, data } of images) {
    if (imgTotal + data.length > MAX_IMAGES_TOTAL) { skipped.big++; continue; }
    files[p] = `data:${MIME[p.split(".").pop().toLowerCase()] || "image/png"};base64,${data}`;
    imgTotal += data.length;
  }
  if (!Object.keys(files).length) throw new Error("empty");

  const has = (re) => Object.keys(files).some((f) => re.test(f));
  const stack = has(/^pubspec\.yaml$/) ? "Flutter" : has(/^package\.json$/) ? (has(/next\.config|^app\/|^pages\//) ? "Next.js" : has(/\.(jsx|tsx)$/) ? "React" : "Node.js")
    : has(/(^|\/)(requirements\.txt|.*\.py)$/) ? "Python" : has(/\.php$/) ? "PHP" : has(/\.html?$/) ? "HTML/CSS/JS" : "";
  const name = file.name.replace(/\.zip$/i, "").slice(0, 60) || "project";
  return { files, name, count: Object.keys(files).length, skipped, stack };
}
