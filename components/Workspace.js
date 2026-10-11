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
};
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
function Desktop({ html, nonce, box }) {
  const scale = box.w ? Math.min(1, (box.w - 8) / PC_W, (box.h - 40) / (PC_H + BAR)) : 0.4;
  return (
    <div className="pc" style={{ width: PC_W * scale }}>
      <div className="pc-screen" style={{ height: (PC_H + BAR) * scale }}>
        <div className="pc-inner" style={{ width: PC_W, height: PC_H + BAR, transform: `scale(${scale})` }}>
          <div className="pc-bar" aria-hidden="true"><i /><i /><i /><span>index.html</span></div>
          <iframe key={nonce} title="app" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" style={{ width: PC_W, height: PC_H }} />
        </div>
      </div>
      <div className="pc-neck" aria-hidden="true" />
      <div className="pc-foot" aria-hidden="true" />
    </div>
  );
}

export default function Workspace({ files, setFiles, busy, t, onClose, onAsk }) {
  const names = Object.keys(files);
  const [tab, setTab] = useState("preview");
  const [device, setDevice] = useState("iphone");
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState({});
  const [showTree, setShowTree] = useState(true);
  const [nonce, setNonce] = useState(0);
  const html = useMemo(() => buildPreview(files), [files]);
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
          <button role="tab" aria-selected={tab === "code"} className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>
            <Svg d={P.code} size={15} /> {t("code")}
          </button>
        </div>
        <div className="ws-actions">
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
        <>
          {html && (
            <div className="ws-sub">
              <div className="seg small">
                <button className={device === "iphone" ? "on" : ""} onClick={() => setDevice("iphone")}>iPhone</button>
                <button className={device === "android" ? "on" : ""} onClick={() => setDevice("android")}>Android</button>
                <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>💻 {t("computer")}</button>
              </div>
              <button className="icon-btn sm" aria-label={t("refresh")} title={t("refresh")} onClick={() => setNonce(nonce + 1)}><Svg d={P.refresh} /></button>
            </div>
          )}
          <div className="stage" ref={stageRef}>
            {html && device === "desktop" ? (
              <Desktop html={html} nonce={nonce} box={box} />
            ) : html ? (
              <div className={"device " + device}>
                <div className="screen">
                  {device === "iphone" ? <div className="island" aria-hidden="true" /> : <div className="punch" aria-hidden="true" />}
                  <iframe key={nonce} title="app" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" />
                </div>
              </div>
            ) : (
              <div className="ws-empty">
                <Svg d={names.length ? P.code : P.phone} size={28} />
                <p>{busy ? t("building") : names.length ? t("notWebProject") : t("previewEmpty")}</p>
                {readme && <button className="ghost-btn" onClick={() => { setTab("code"); setActive(readme); }}>{t("openReadme")}</button>}
              </div>
            )}
          </div>
        </>
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
                  <CodeEditor path={active} value={files[active] ?? ""} readOnly={busy} onChange={(v) => setFiles({ ...files, [active]: v })} />
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
