"use client";
// The code workspace: file explorer + editor + live phone preview, like a small VS Code.
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildPreview, downloadZip, cleanPath } from "../lib/builder";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="ws-loading">…</div>,
});

const P = {
  phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>,
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  zip: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  play: <path d="M7 4l13 8-13 8z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  files: <><path d="M8 3h7l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M15 3v5h5" /><path d="M3 7v12a2 2 0 0 0 2 2h1" /></>,
  down: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
};

// What each kind of project should have (shown in the Files tab; missing ones can be made with one tap).
const NEEDED = {
  website: [["index.html", /^index\.html$/], ["CSS", /\.css$/], ["JavaScript", /\.js$/], ["README.md", /^readme\.md$/i]],
  app: [["index.html", /^index\.html$/], ["CSS", /\.css$/], ["JavaScript", /\.js$/], ["manifest.json", /(^|\/)manifest\.(json|webmanifest)$/], ["sw.js", /(^|\/)(sw|service-worker)\.js$/], ["README.md", /^readme\.md$/i]],
  system: [["index.html", /^index\.html$/], ["CSS", /\.css$/], ["js/data.js", /(^|\/)data\.js$/], ["JavaScript", /\.js$/], ["README.md", /^readme\.md$/i]],
};
const kindOf = (f, v) => (String(v).startsWith("data:image") ? ["🖼️", "img"] : /\.html?$/i.test(f) ? ["📄", "page"] : /\.(css|scss)$/i.test(f) ? ["🎨", "style"] : /\.(js|mjs|ts|jsx|tsx)$/i.test(f) ? ["⚙️", "script"] : /\.json$/i.test(f) ? ["🧩", "data"] : /\.md$/i.test(f) ? ["📘", "doc"] : ["📃", "other"]);
function saveOne(name, content) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(content);
  const blob = m ? new Blob([Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))], { type: m[1] }) : new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name.split("/").pop();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

// Phone / computer preview of any page (used by the workspace and by "▶ Preview" on code in the chat).
export function DevicePreview({ html, t, page }) {
  const [device, setDevice] = useState("iphone");
  const [nonce, setNonce] = useState(0);
  const stageRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => { try { const d = localStorage.getItem("ahm-device"); if (d) setDevice(d); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("ahm-device", device); } catch {} }, [device]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div className="ws-sub">
        <div className="seg small">
          <button className={device === "iphone" ? "on" : ""} onClick={() => setDevice("iphone")}> iPhone</button>
          <button className={device === "android" ? "on" : ""} onClick={() => setDevice("android")}>🤖 Android</button>
          <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>💻 {t("computer")}</button>
        </div>
        <button className="icon-btn sm" aria-label={t("refresh")} title={t("refresh")} onClick={() => setNonce(nonce + 1)}><Svg d={P.refresh} /></button>
      </div>
      <div className="stage" ref={stageRef}>
        {device === "desktop" ? <Desktop html={html} nonce={nonce} box={box} page={page} /> : (
          <div className={"device " + device}>
            <div className="screen">
              {device === "iphone" ? <div className="island" aria-hidden="true" /> : <div className="punch" aria-hidden="true" />}
              <iframe key={nonce} title="app" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
const Svg = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

// Turn flat paths into a sorted folder tree.
function buildTree(paths) {
  const root = { dirs: {}, files: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    parts.slice(0, -1).forEach((d) => { node = node.dirs[d] ||= { dirs: {}, files: [] }; });
    node.files.push(p);
  }
  return root;
}

function Tree({ node, prefix, open, toggle, active, onOpen, depth = 0 }) {
  const dirs = Object.keys(node.dirs).sort();
  const files = [...node.files].sort((a, b) => a.localeCompare(b));
  return (
    <>
      {dirs.map((d) => {
        const key = prefix + d + "/";
        const isOpen = open[key] !== false;
        return (
          <div key={key}>
            <button className="tree-row dir" style={{ paddingLeft: 10 + depth * 14 }} onClick={() => toggle(key)} aria-expanded={isOpen}>
              <span className={"chev" + (isOpen ? " open" : "")}><Svg d={P.chevron} size={13} /></span>
              <Svg d={P.folder} size={15} /> <span>{d}</span>
            </button>
            {isOpen && <Tree node={node.dirs[d]} prefix={key} open={open} toggle={toggle} active={active} onOpen={onOpen} depth={depth + 1} />}
          </div>
        );
      })}
      {files.map((f) => (
        <button key={f} className={"tree-row" + (f === active ? " on" : "")} style={{ paddingLeft: 24 + depth * 14 }} onClick={() => onOpen(f)}>
          <Svg d={P.file} size={15} /> <span>{f.split("/").pop()}</span>
        </button>
      ))}
    </>
  );
}

// Computer preview: the page really renders at 1280×800 (desktop layout) and is scaled down to fit, inside a monitor frame.
const PC_W = 1280, PC_H = 800, BAR = 34;
function Desktop({ html, nonce, box, page }) {
  const scale = box.w ? Math.min(1, (box.w - 8) / PC_W, (box.h - 40) / (PC_H + BAR)) : 0.4;
  return (
    <div className="pc" style={{ width: PC_W * scale }}>
      <div className="pc-screen" style={{ height: (PC_H + BAR) * scale }}>
        <div className="pc-inner" style={{ width: PC_W, height: PC_H + BAR, transform: `scale(${scale})` }}>
          <div className="pc-bar" aria-hidden="true"><i /><i /><i /><span>{page || "index.html"}</span></div>
          <iframe key={nonce} title="app" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" style={{ width: PC_W, height: PC_H }} />
        </div>
      </div>
      <div className="pc-neck" aria-hidden="true" />
      <div className="pc-foot" aria-hidden="true" />
    </div>
  );
}

export default function Workspace({ files, setFiles, busy, t, onClose, onAsk, onPublish, publishing, kind = "website" }) {
  const names = Object.keys(files);
  const [tab, setTab] = useState("preview");
  const [device, setDevice] = useState("iphone");
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState({});
  const [showTree, setShowTree] = useState(true);
  const [nonce, setNonce] = useState(0);
  // the app's saved data in the preview, and which page is open (sent from inside the preview)
  const store = useRef({});
  const [page, setPage] = useState("index.html");
  const [entry, setEntry] = useState(null); // a page chosen in the Files tab
  useEffect(() => {
    const on = (e) => {
      if (e.data?.ahmStore && typeof e.data.ahmStore === "object") store.current = e.data.ahmStore;
      if (typeof e.data?.ahmPage === "string") setPage(e.data.ahmPage.slice(0, 80));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const html = useMemo(() => buildPreview(files, { store: store.current }), [files]);
  const stageRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, !!html]);
  const tree = useMemo(() => buildTree(names), [names.join("|")]);

  useEffect(() => { try { const d = localStorage.getItem("ahm-device"); if (d) setDevice(d); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("ahm-device", device); } catch {} }, [device]);
  useEffect(() => {
    if (active && files[active] != null) return;
    setActive(names.find((n) => n === "index.html") || names.find((n) => /readme\.md$/i.test(n)) || names[0] || null);
  }, [names.join("|")]);
  useEffect(() => { if (!html && names.length) setTab("code"); }, [!!html, names.length]);

  function openFile(p) {
    setActive(p);
    if (window.innerWidth < 900) setShowTree(false);
  }
  function newFile() {
    const raw = prompt(t("fileNamePrompt"), "new-file.js");
    const p = raw && cleanPath(raw);
    if (!p) return;
    if (files[p] == null) setFiles({ ...files, [p]: "" });
    openFile(p);
    setTab("code");
  }
  function renameFile() {
    if (!active) return;
    const raw = prompt(t("rename"), active);
    const p = raw && cleanPath(raw);
    if (!p || p === active) return;
    const next = { ...files, [p]: files[active] };
    delete next[active];
    setFiles(next);
    setActive(p);
  }
  function deleteFile() {
    if (!active || !confirm(t("confirmDeleteFile").replace("{f}", active))) return;
    const next = { ...files };
    delete next[active];
    setFiles(next);
    setActive(null);
  }
  const readme = names.find((n) => /^readme\.md$/i.test(n));

  return (
    <section className="ws" aria-label={t("workspace")}>
      <div className="ws-bar">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>
            <Svg d={P.phone} size={15} /> {t("preview")}
          </button>
          <button role="tab" aria-selected={tab === "files"} className={tab === "files" ? "on" : ""} onClick={() => setTab("files")}>
            <Svg d={P.files} size={15} /> {t("filesTab")} <em className="ws-count">{names.length}</em>
          </button>
          <button role="tab" aria-selected={tab === "code"} className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>
            <Svg d={P.code} size={15} /> {t("code")}
          </button>
        </div>
        <div className="ws-actions">
          {html && onPublish && (
            <button className="publish-btn" disabled={busy || publishing} onClick={onPublish} title={t("publishHint")}>
              <span aria-hidden="true">🌐</span> {publishing ? "…" : t("publish")}
            </button>
          )}
          <button className="icon-btn sm" aria-label={t("howToRun")} title={t("howToRun")} disabled={busy || !names.length} onClick={() => onAsk(t("howToRunAsk"))}>
            <Svg d={P.play} />
          </button>
          <button className="icon-btn sm gold" aria-label={t("zip")} title={t("zip")} disabled={!names.length} onClick={() => downloadZip(files)}>
            <Svg d={P.zip} />
          </button>
          <button className="icon-btn sm pv-close" aria-label={t("close")} onClick={onClose}><Svg d={P.close} /></button>
        </div>
      </div>

      {tab === "preview" ? (
        html ? (
          <DevicePreview key={entry || "index"} html={entry && files[entry] != null ? buildPreview(files, { entry, store: store.current }) : html} t={t} page={page} />
        ) : (
          <div className="stage">
            <div className="ws-empty">
              <Svg d={names.length ? P.code : P.phone} size={28} />
              <p>{busy ? t("building") : names.length ? t("notWebProject") : t("previewEmpty")}</p>
              {readme && <button className="ghost-btn" onClick={() => { setTab("code"); setActive(readme); }}>{t("openReadme")}</button>}
            </div>
          </div>
        )
      ) : tab === "files" ? (
        <div className="ws-files">
          <div className="wf-top">
            <div><b>{names.length} {t("fileCount")}</b><small>{t("filesAllHint")}</small></div>
            <button className="gold-btn small" disabled={!names.length} onClick={() => downloadZip(files)}><Svg d={P.down} size={16} /> {t("downloadAll")}</button>
          </div>
          {names.length > 0 && (
            <div className="wf-need">
              <div className="wf-need-title">{t("neededTitle")}</div>
              <div className="wf-need-list">
                {(NEEDED[kind] || NEEDED.website).map(([label, re]) => {
                  const ok = names.some((n) => re.test(n));
                  return (
                    <span key={label} className={"wf-chip" + (ok ? " ok" : " miss")}>
                      {ok ? "✓" : "✗"} {label}
                      {!ok && <button disabled={busy} onClick={() => onAsk(t("makeMissing").replace("{f}", label))}>{t("makeIt")}</button>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <ul className="wf-list" dir="ltr">
            {[...names].sort((a, b) => (a.split("/").length - b.split("/").length) || a.localeCompare(b)).map((f) => {
              const v = String(files[f] ?? "");
              const [ic] = kindOf(f, v);
              const img = v.startsWith("data:image");
              return (
                <li key={f}>
                  <span className="wf-ic" aria-hidden="true">{ic}</span>
                  <button className="wf-name" onClick={() => { setActive(f); setTab("code"); }}>
                    <b>{f.split("/").pop()}</b>
                    <small>{f.includes("/") ? f.slice(0, f.lastIndexOf("/") + 1) : "/"} · {img ? Math.round(v.length * 0.75 / 1024) + " KB" : v.split("\n").length + " " + t("lines")}</small>
                  </button>
                  {/\.html?$/i.test(f) && html && <button className="wf-btn" aria-label={t("preview")} title={t("preview")} onClick={() => { setTab("preview"); setEntry(f); setPage(f); }}><Svg d={P.eye} size={16} /></button>}
                  <button className="wf-btn" aria-label={t("fileDownload")} title={t("fileDownload")} onClick={() => saveOne(f, v)}><Svg d={P.down} size={16} /></button>
                </li>
              );
            })}
          </ul>
          {!names.length && <div className="ws-empty"><p>{busy ? t("building") : t("emptyProject")}</p></div>}
        </div>
      ) : (
        <div className={"ide" + (showTree ? " tree-open" : "")}>
          <div className="explorer">
            <div className="explorer-head">
              <button className="explorer-toggle" onClick={() => setShowTree(!showTree)} aria-expanded={showTree}>
                <span className={"chev" + (showTree ? " open" : "")}><Svg d={P.chevron} size={13} /></span>
                {t("explorer")} <em>{names.length}</em>
              </button>
              <button className="icon-btn sm" aria-label={t("newFile")} title={t("newFile")} disabled={busy} onClick={newFile}><Svg d={P.plus} /></button>
            </div>
            {showTree && (
              <div className="tree" dir="ltr">
                {names.length ? (
                  <Tree node={tree} prefix="" open={open} toggle={(k) => setOpen({ ...open, [k]: open[k] === false })} active={active} onOpen={openFile} />
                ) : (
                  <p className="tree-empty">{t("emptyProject")}</p>
                )}
              </div>
            )}
          </div>
          <div className="editor-pane">
            {active ? (
              <>
                <div className="editor-tab" dir="ltr">
                  <Svg d={P.file} size={14} /> <span>{active}</span>
                  <div className="editor-tools">
                    <button className="icon-btn sm" aria-label={t("rename")} title={t("rename")} disabled={busy} onClick={renameFile}><Svg d={P.pen} size={16} /></button>
                    <button className="icon-btn sm" aria-label={t("deleteFile")} title={t("deleteFile")} disabled={busy} onClick={deleteFile}><Svg d={P.trash} size={16} /></button>
                  </div>
                </div>
                <div className="editor-body">
                  {String(files[active] ?? "").startsWith("data:image")
                    ? <div className="ws-image"><img src={files[active]} alt={active} /></div>
                    : <CodeEditor path={active} value={files[active] ?? ""} readOnly={busy} onChange={(v) => setFiles({ ...files, [active]: v })} />}
                </div>
              </>
            ) : (
              <div className="ws-empty"><p>{t("emptyProject")}</p></div>
            )}
          </div>
        </div>
      )}
      <p className="pv-foot">{names.length ? `${names.length} ${t("files")}` : t("noFiles")}</p>
    </section>
  );
}
