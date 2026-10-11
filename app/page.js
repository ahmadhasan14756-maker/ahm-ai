"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { TELEGRAM_BOT } from "../lib/env";
import { PAID_PLANS } from "../lib/plans";
import { parseFiles, buildPreview, downloadZip } from "../lib/builder";
import { LANGS, dirOf, makeT } from "../lib/i18n";

const BOT_URL = TELEGRAM_BOT ? `https://t.me/${TELEGRAM_BOT}` : null;
const MAX_FILE_BYTES = 1_500_000;

/* ---------------- language ---------------- */
const LangCtx = createContext({ lang: "ckb", t: makeT("ckb"), setLang: () => {} });
const useLang = () => useContext(LangCtx);

function LangProvider({ children }) {
  const [lang, setLangState] = useState("ckb");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ahm-lang");
      if (saved && LANGS.some((l) => l.id === saved)) setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem("ahm-lang", l); } catch {}
  };
  const t = useMemo(() => makeT(lang), [lang]);
  return <LangCtx.Provider value={{ lang, t, setLang }}>{children}</LangCtx.Provider>;
}

/* ---------------- icons ---------------- */
const Icon = {
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  clip: <path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  build: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M9 9l-2 2 2 2M15 9l2 2-2 2" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>,
  zip: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
};
const Svg = ({ d, size = 20, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

/* ---------------- language picker (used in auth + settings) ---------------- */
function LangPicker() {
  const { lang, setLang } = useLang();
  return (
    <div className="seg lang-seg" role="radiogroup" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.id} role="radio" aria-checked={lang === l.id} className={lang === l.id ? "on" : ""} onClick={() => setLang(l.id)}>
          {l.name}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Login / Sign up ---------------- */
function Auth() {
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setMsg(t("checkEmail"));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg(t("resetSent"));
      }
    } catch (err) {
      const m = err.message || "";
      if (m.includes("Invalid login")) setMsg(t("errLogin"));
      else if (m.includes("Email not confirmed")) setMsg(t("errConfirm"));
      else if (m.includes("already registered")) setMsg(t("errExists"));
      else if (m.includes("at least") || m.includes("weak")) setMsg(t("errWeak"));
      else if (/load failed|failed to fetch|network/i.test(m)) setMsg(t("errNetwork"));
      else setMsg(t("error") + ": " + m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="glow" aria-hidden="true" />
      <div className="auth-card">
        <LangPicker />
        <img src="/logo.png" alt="AHM AI" className="auth-logo" />
        <p className="sub">{t("tagline")}</p>
        <h2>{t(mode)}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>{t("email")}</span>
            <input type="email" dir="ltr" placeholder="email@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {mode !== "reset" && (
            <label className="field">
              <span>{t("password")}</span>
              <input type="password" dir="ltr" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
          )}
          <button type="submit" className="gold-btn" disabled={loading}>{loading ? "..." : t(mode)}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
        <div className="links">
          {mode !== "login" && <button onClick={() => { setMode("login"); setMsg(""); }}>{t("haveAccount")}</button>}
          {mode !== "signup" && <button onClick={() => { setMode("signup"); setMsg(""); }}>{t("noAccount")} <b>{t("signupLink")}</b></button>}
          {mode === "login" && <button onClick={() => { setMode("reset"); setMsg(""); }}>{t("forgot")}</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Markdown code blocks ---------------- */
function CodeBlock({ className, children }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = (className || "").replace("language-", "");
  if (!className && !text.includes("\n")) return <code className="inline">{children}</code>;

  if (lang.startsWith("file:")) {
    return (
      <div className="file-chip" dir="ltr">
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          <Svg d={Icon.code} size={16} /> <span>{lang.slice(5)}</span>
          <em>{text.split("\n").length} {t("lines")}</em>
        </button>
        {open && <pre><code>{text}</code></pre>}
      </div>
    );
  }

  return (
    <div className="code" dir="ltr">
      <div className="code-head">
        <span>{lang || "code"}</span>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "✓ " + t("copied") : t("copy")}
        </button>
      </div>
      <pre><code>{text}</code></pre>
    </div>
  );
}
const MD = { code: CodeBlock, pre: ({ children }) => <>{children}</> };

const isRTL = (s) => /[؀-ۿ]/.test((s || "").slice(0, 200));

/* ---------------- File fixing (Pro) ---------------- */
function applyEdits(original, answer) {
  const re = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;
  let out = original, applied = 0, failed = 0, m;
  while ((m = re.exec(answer))) {
    if (m[1] && out.includes(m[1])) { out = out.replace(m[1], () => m[2]); applied++; }
    else failed++;
  }
  return { out, applied, failed };
}
function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fixedName = (n) => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(0, i) + "-fixed" + n.slice(i) : n + "-fixed"; };

/* ---------------- Images ---------------- */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
function drawScaled(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
// Shrinks a photo on the phone before sending: fast to upload, still sharp enough to read text.
async function prepareImage(file) {
  const img = await loadImage(file);
  const full = drawScaled(img, 1600, 0.85);
  return { mimeType: "image/jpeg", data: full.split(",")[1], thumb: drawScaled(img, 240, 0.7) };
}

/* ---------------- Sheets ---------------- */
function Sheet({ label, onClose, children }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Upgrade({ reason, me, onClose }) {
  const { t } = useLang();
  const text = { limit: t("upLimit"), pro_only: t("upPro"), info: t("upInfo") }[reason] || "";
  return (
    <Sheet label={t("plans")} onClose={onClose}>
      <h3>{t("plans")} <span className="gold brand-font">AHM AI</span></h3>
      <p>{text}</p>
      <div className="plans">
        <div className={"plan" + (!me?.pro ? " current" : "")}>
          <div className="plan-price">{t("free")}</div>
          <div className="plan-limit"><b>30</b> {t("questions")} {t("perMonth")}</div>
          {!me?.pro && <div className="plan-tag">{t("currentPlan")}</div>}
        </div>
        {PAID_PLANS.map((p) => (
          <div key={p.id} className={"plan" + (me?.plan === p.id ? " current" : "") + (p.price === 10 ? " best" : "")}>
            {p.price === 10 && <div className="plan-ribbon">{t("best")}</div>}
            <div className="plan-price"><span dir="ltr">${p.price}</span><small> {t("perMonth")}</small></div>
            <div className="plan-limit"><b>{p.limit}</b> {t("questions")}</div>
            {me?.plan === p.id && <div className="plan-tag">{t("currentPlan")}</div>}
          </div>
        ))}
      </div>
      <ul className="perks"><li>{t("perk1")}</li><li>{t("perk2")}</li></ul>
      {BOT_URL ? <a className="gold-btn" href={BOT_URL} target="_blank" rel="noreferrer">{t("buyTelegram")}</a>
        : <p className="muted">{t("botSoon")}</p>}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function Settings({ session, me, onClose, onPlans }) {
  const { t } = useLang();
  const left = me ? Math.max(0, me.limit - me.used) : null;
  return (
    <Sheet label={t("settings")} onClose={onClose}>
      <h3>{t("settings")}</h3>
      <div className="set-row col">
        <div className="set-label"><Svg d={Icon.globe} size={18} /> {t("language")}</div>
        <LangPicker />
      </div>
      <div className="set-row">
        <div className="set-label">{t("account")}</div>
        <div className="set-val" dir="ltr">{session.user.email}</div>
      </div>
      {me && (
        <button className="set-row set-btn" onClick={onPlans}>
          <div className="set-label">{t("plans")}</div>
          <div className="set-val gold">{me.pro ? `⭐ ${me.planName}` : t("free")} · {left} {t("left")}</div>
        </button>
      )}
      <button className="ghost-btn danger" onClick={() => supabase.auth.signOut()}>
        <Svg d={Icon.logout} size={18} /> {t("logout")}
      </button>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

/* ---------------- Live phone preview ---------------- */
function Preview({ files, busy, onClose }) {
  const { t } = useLang();
  const [device, setDevice] = useState("iphone");
  const [view, setView] = useState("app");
  const [openFile, setOpenFile] = useState(null);
  const [nonce, setNonce] = useState(0);
  const names = Object.keys(files);
  const html = useMemo(() => buildPreview(files), [files]);

  useEffect(() => { try { const d = localStorage.getItem("ahm-device"); if (d) setDevice(d); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("ahm-device", device); } catch {} }, [device]);
  useEffect(() => { if (!openFile || !files[openFile]) setOpenFile(names[0] || null); }, [files]);

  return (
    <section className="preview" aria-label={t("preview")}>
      <div className="pv-bar">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={device === "iphone"} className={device === "iphone" ? "on" : ""} onClick={() => setDevice("iphone")}>iPhone</button>
          <button role="tab" aria-selected={device === "android"} className={device === "android" ? "on" : ""} onClick={() => setDevice("android")}>Android</button>
        </div>
        <div className="pv-actions">
          <button className="icon-btn sm" aria-label={t("code")} title={t("code")} onClick={() => setView(view === "app" ? "code" : "app")}>
            <Svg d={view === "app" ? Icon.code : Icon.phone} size={18} />
          </button>
          <button className="icon-btn sm" aria-label={t("refresh")} title={t("refresh")} onClick={() => setNonce(nonce + 1)}><Svg d={Icon.refresh} size={18} /></button>
          <button className="icon-btn sm gold" aria-label={t("zip")} title={t("zip")} disabled={!names.length} onClick={() => downloadZip(files)}><Svg d={Icon.zip} size={18} /></button>
          <button className="icon-btn sm pv-close" aria-label={t("close")} onClick={onClose}><Svg d={Icon.close} size={18} /></button>
        </div>
      </div>

      {view === "app" ? (
        <div className="stage">
          <div className={"device " + device}>
            <div className="screen">
              {device === "iphone" ? <div className="island" aria-hidden="true" /> : <div className="punch" aria-hidden="true" />}
              {html ? (
                <iframe key={nonce} title="app" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" />
              ) : (
                <div className="screen-empty">
                  <img src="/icon-192.png" alt="" aria-hidden="true" />
                  <p>{busy ? t("building") : t("previewEmpty")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="codeview" dir="ltr">
          <div className="tabs">
            {names.map((n) => <button key={n} className={openFile === n ? "on" : ""} onClick={() => setOpenFile(n)}>{n}</button>)}
          </div>
          <pre><code>{openFile ? files[openFile] : ""}</code></pre>
        </div>
      )}
      <p className="pv-foot">{names.length ? `${names.length} ${t("files")}` : t("noFiles")}</p>
    </section>
  );
}

/* ---------------- Sidebar (chat history) ---------------- */
function Sidebar({ open, chats, activeId, onPick, onNew, onDelete, onSettings, onClose, me }) {
  const { t } = useLang();
  const groups = [
    { mode: "chat", title: t("history"), icon: Icon.chat },
    { mode: "build", title: t("projects"), icon: Icon.build },
  ];
  return (
    <>
      <div className={"side-bg" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <aside className={"sidebar" + (open ? " open" : "")} aria-label={t("menu")}>
        <div className="side-top">
          <div className="brand"><img src="/icon-192.png" alt="" aria-hidden="true" /><span className="brand-name">AHM <b>AI</b></span></div>
          <button className="icon-btn sm side-x" aria-label={t("close")} onClick={onClose}><Svg d={Icon.close} size={18} /></button>
        </div>
        <button className="new-btn" onClick={() => onNew("chat")}><Svg d={Icon.plus} size={18} /> {t("newChat")}</button>
        <button className="new-btn alt" onClick={() => onNew("build")}><Svg d={Icon.build} size={18} /> {t("newProject")}</button>
        <div className="side-list">
          {groups.map((g) => {
            const items = chats.filter((c) => c.mode === g.mode);
            return (
              <div key={g.mode} className="side-group">
                <div className="side-title">{g.title}</div>
                {!items.length && <div className="side-empty">{t("noHistory")}</div>}
                {items.map((c) => (
                  <div key={c.id} className={"side-item" + (c.id === activeId ? " on" : "")}>
                    <button className="side-pick" onClick={() => onPick(c.id)}>
                      <Svg d={g.icon} size={15} /><span dir="auto">{c.title || "…"}</span>
                    </button>
                    <button className="side-del" aria-label={t("delete")} onClick={() => onDelete(c.id)}><Svg d={Icon.trash} size={15} /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <button className="side-settings" onClick={onSettings}>
          <Svg d={Icon.gear} size={18} /> <span>{t("settings")}</span>
          {me && <em>{me.pro ? `⭐ ${me.planName}` : t("free")}</em>}
        </button>
      </aside>
    </>
  );
}

/* ---------------- Main app ---------------- */
function greeting(t) {
  const h = new Date().getHours();
  return h < 12 ? t("greetMorning") : h < 18 ? t("greetDay") : t("greetEvening");
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const blank = (mode) => ({ id: newId(), mode, title: "", messages: [], project: {}, updated: Date.now() });

function Main({ session }) {
  const { t, lang } = useLang();
  const uid = session.user.id;
  const storeKey = `ahm-chats-${uid}`;
  const [chats, setChats] = useState([]);
  const [draft, setDraft] = useState(() => blank("chat")); // saved only after the first message
  const [activeId, setActiveId] = useState(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const bottom = useRef(null);
  const ta = useRef(null);
  const fileInput = useRef(null);
  const abortRef = useRef(null);

  const active = chats.find((c) => c.id === activeId) || draft;
  const mode = active.mode;
  const messages = active.messages;
  const project = active.project || {};

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
  async function loadMe() {
    try {
      const res = await fetch("/api/me", { headers: { Authorization: "Bearer " + (await token()) } });
      if (res.ok) setMe(await res.json());
    } catch {}
  }

  // load saved chats (and bring over chats saved by the older version)
  useEffect(() => {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(storeKey) || "[]");
      if (!list.length) {
        const oldChat = JSON.parse(localStorage.getItem(`ahm-chat-${uid}`) || "[]");
        const oldBuild = JSON.parse(localStorage.getItem(`ahm-build-${uid}`) || "[]");
        const oldProj = JSON.parse(localStorage.getItem(`ahm-project-${uid}`) || "{}");
        const title = (m) => (m.find((x) => x.role === "user")?.content || "").slice(0, 60);
        if (oldBuild.length) list.push({ ...blank("build"), messages: oldBuild, project: oldProj, title: title(oldBuild) });
        if (oldChat.length) list.push({ ...blank("chat"), messages: oldChat, title: title(oldChat) });
      }
    } catch {}
    setChats(list);
    setReady(true);
    loadMe();
  }, [uid]);

  useEffect(() => {
    if (!ready) return;
    try {
      const slim = chats.slice(0, 60).map((c) => ({ ...c, messages: c.messages.map(({ fixed, ...m }, i, all) => (i < all.length - 12 ? { ...m, thumbs: undefined } : m)).slice(-80) }));
      localStorage.setItem(storeKey, JSON.stringify(slim));
    } catch {}
  }, [chats, ready]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // update one chat; the draft becomes a saved chat on its first change
  function patch(id, fn) {
    setChats((list) => {
      const i = list.findIndex((c) => c.id === id);
      if (i === -1) return [{ ...fn(id === draft.id ? draft : blank("chat")), updated: Date.now() }, ...list];
      const next = [...list];
      next[i] = { ...fn(next[i]), updated: Date.now() };
      next.sort((a, b) => b.updated - a.updated);
      return next;
    });
  }

  function startNew(m) {
    if (busy) return;
    setDraft(blank(m));
    setActiveId(null);
    setInput("");
    setFile(null);
    setShowPreview(false);
    setSideOpen(false);
  }
  function switchMode(m) {
    if (busy || m === mode) return;
    const recent = chats.find((c) => c.mode === m);
    if (recent) { setActiveId(recent.id); setShowPreview(false); }
    else startNew(m);
  }
  function pick(id) {
    if (busy) return;
    setActiveId(id);
    setSideOpen(false);
    setShowPreview(false);
  }
  function remove(id) {
    if (!confirm(t("confirmDelete"))) return;
    setChats((l) => l.filter((c) => c.id !== id));
    if (id === activeId) startNew(mode);
  }

  async function addImages(list) {
    const room = 4 - images.length;
    if (list.length > room) alert(t("tooManyImages"));
    for (const f of list.slice(0, Math.max(0, room))) {
      try {
        const im = await prepareImage(f);
        setImages((cur) => (cur.length < 4 ? [...cur, im] : cur));
      } catch {
        alert(t("imageFail"));
      }
    }
  }

  function onPaste(e) {
    const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (imgs.length) { e.preventDefault(); addImages(imgs); }
  }

  function pickFile(e) {
    const all = [...(e.target.files || [])];
    e.target.value = "";
    if (!all.length) return;
    const imgs = all.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (imgs.length) { addImages(imgs); return; }
    const f = all[0];
    if (!me?.pro) { setSheet({ type: "upgrade", reason: "pro_only" }); return; }
    if (f.size > MAX_FILE_BYTES) { alert(t("fileBig")); return; }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, content: String(r.result || "") });
    r.readAsText(f);
  }

  async function send(preset, baseMessages) {
    const sentImages = mode === "chat" ? images : [];
    const text = (preset ?? input).trim() || (file ? t("fixFile") : sentImages.length ? t("describeImage") : "");
    if (!text || busy) return;
    const id = active.id;
    const m = mode;
    const sentFile = m === "chat" ? file : null;
    const base = project;
    const next = [...(baseMessages || messages), { role: "user", content: text, fileName: sentFile?.name, thumbs: sentImages.map((im) => im.thumb) }];
    const put = (msgs, extra = {}) => patch(id, (c) => ({ ...c, ...extra, messages: msgs, title: c.title || text.slice(0, 60) }));
    put([...next, { role: "assistant", content: "" }]);
    setActiveId(id);
    setInput("");
    setFile(null);
    setImages([]);
    if (ta.current) ta.current.style.height = "auto";
    setBusy(true);
    if (m === "build") setShowPreview(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({
          mode: m,
          lang,
          messages: next.map(({ role, content }) => ({ role, content })),
          file: sentFile || undefined,
          images: sentImages.length ? sentImages.map(({ mimeType, data }) => ({ mimeType, data })) : undefined,
          project: m === "build" && Object.keys(base).length ? base : undefined,
        }),
      });
      if (res.status === 401) { await supabase.auth.signOut(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "limit" || err.error === "pro_only") {
          put(next.slice(0, -1));
          setInput(text);
          if (sentFile) setFile(sentFile);
          if (sentImages.length) setImages(sentImages);
          setSheet({ type: "upgrade", reason: err.error });
          return;
        }
        if (err.error === "file_too_big") { put(next.slice(0, -1)); setInput(text); alert(t("fileBig")); return; }
        const msg = err.error === "busy" ? t("errBusy") : err.error === "ai" ? t("errAi") : t("errConn");
        put([...next, { role: "assistant", content: msg, failed: true }]);
        if (err.detail) console.error("server:", err.detail);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const shown = acc.replace(/\n\n⚠️ busy$/, "\n\n" + t("errBusy")).replace(/\n\n⚠️ error$/, "\n\n" + t("errAi"));
        const got = m === "build" ? parseFiles(acc) : null;
        put([...next, { role: "assistant", content: shown }], got && Object.keys(got).length ? { project: { ...base, ...got } } : {});
      }
      if (sentFile) {
        const { out, applied, failed } = applyEdits(sentFile.content, acc);
        put([...next, { role: "assistant", content: acc, fixed: applied ? { name: fixedName(sentFile.name), content: out } : null, fixInfo: { applied, failed } }]);
      }
      if (m === "build" && Object.keys(parseFiles(acc)).length && window.innerWidth < 900) setShowPreview(true);
    } catch (e) {
      if (e?.name === "AbortError") {
        if (!acc) put(next.slice(0, -1));
      } else {
        put([...next, { role: "assistant", content: (acc ? acc + "\n\n" : "") + t("errConn"), failed: true }]);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      loadMe();
    }
  }

  function retry() {
    const idx = messages.map((x) => x.role).lastIndexOf("user");
    if (idx < 0 || busy) return;
    send(messages[idx].content, messages.slice(0, idx));
  }

  const name = (session.user.email || "").split("@")[0].replace(/[._\d]+/g, " ").trim().split(" ")[0].replace(/^./, (c) => c.toUpperCase());
  const left = me ? Math.max(0, me.limit - me.used) : null;
  const pct = me ? Math.min(100, (me.used / me.limit) * 100) : 0;
  const hasFiles = Object.keys(project).length > 0;
  const suggestions = t(mode === "build" ? "buildSugg" : "chatSugg");

  return (
    <div className={"app mode-" + mode}>
      <Sidebar open={sideOpen} chats={chats} activeId={activeId} me={me}
        onPick={pick} onNew={startNew} onDelete={remove} onClose={() => setSideOpen(false)}
        onSettings={() => { setSideOpen(false); setSheet({ type: "settings" }); }} />

      <div className="main-col">
        <header>
          <button className="icon-btn menu-btn" aria-label={t("menu")} title={t("menu")} onClick={() => setSideOpen(true)}><Svg d={Icon.menu} /></button>
          <div className="brand">
            <img src="/icon-192.png" alt="" aria-hidden="true" />
            <span className="brand-name">AHM <b>AI</b></span>
          </div>
          <button className="icon-btn" aria-label={mode === "build" ? t("newProject") : t("newChat")} title={mode === "build" ? t("newProject") : t("newChat")} onClick={() => startNew(mode)}><Svg d={Icon.plus} /></button>
        </header>

        <div className="subbar">
          <div className="seg big" role="tablist">
            <button role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "on" : ""} onClick={() => switchMode("chat")}>
              <Svg d={Icon.chat} size={16} /> {t("chat")}
            </button>
            <button role="tab" aria-selected={mode === "build"} className={mode === "build" ? "on" : ""} onClick={() => switchMode("build")}>
              <Svg d={Icon.build} size={16} /> {t("build")}
            </button>
          </div>
          {me && (
            <button className={"quota" + (me.pro ? " pro" : "")} onClick={() => setSheet({ type: "upgrade", reason: "info" })} aria-label={t("plans")}>
              <span>{me.pro ? `⭐ ${me.planName}` : t("free")} · {left} {t("left")}</span>
              <i style={{ width: `${100 - pct}%` }} />
            </button>
          )}
        </div>

        <div className="body">
          <div className="chat-col">
            <main>
              {messages.length === 0 && (
                <div className="empty">
                  <img src="/icon-192.png" alt="" aria-hidden="true" className="empty-logo" />
                  {mode === "chat" ? (
                    <h2 className="greet">{greeting(t)}{name ? (lang === "en" ? ", " : "، ") + name : ""}</h2>
                  ) : (
                    <h2 className="greet">{t("buildQ")}</h2>
                  )}
                  <p className="muted">{mode === "build" ? t("buildSub") : t("helpQ")}</p>
                  <div className="chips">
                    {suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={"row " + m.role}>
                  <div className={"bubble" + (m.failed ? " failed" : "")} dir={isRTL(m.content) ? "rtl" : "ltr"}>
                    {m.thumbs?.length > 0 && (
                      <div className="msg-imgs">{m.thumbs.map((src, k) => <img key={k} src={src} alt="" />)}</div>
                    )}
                    {m.fileName && <div className="file-tag" dir="ltr">📎 {m.fileName}</div>}
                    {m.role === "assistant" ? (
                      m.content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{m.content}</ReactMarkdown>
                        : <span className="typing" role="status"><i /><i /><i /><small>{t("thinking")}</small></span>
                    ) : m.content}
                    {m.fixed && (
                      <button className="gold-btn small" onClick={() => downloadText(m.fixed.name, m.fixed.content)}>
                        ⬇ {t("downloadFixed")} ({m.fixInfo.applied} {t("changes")})
                      </button>
                    )}
                    {m.fixInfo && !m.fixed && m.fixInfo.failed > 0 && <p className="muted">{t("fixFailed")}</p>}
                    {m.failed && i === messages.length - 1 && !busy && (
                      <button className="retry-btn" onClick={retry}><Svg d={Icon.refresh} size={15} /> {t("retry")}</button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </main>

            <footer>
              {mode === "build" && hasFiles && (
                <button className="open-preview" onClick={() => setShowPreview(true)}>
                  <Svg d={Icon.phone} size={18} /> {t("preview")}
                </button>
              )}
              {images.length > 0 && (
                <div className="img-tray">
                  {images.map((im, k) => (
                    <div key={k} className="img-chip">
                      <img src={im.thumb} alt="" />
                      <button aria-label={t("removeImage")} onClick={() => setImages((l) => l.filter((_, j) => j !== k))}><Svg d={Icon.close} size={13} w={2.6} /></button>
                    </div>
                  ))}
                </div>
              )}
              {file && (
                <div className="attached" dir="ltr">
                  📎 {file.name} · {file.content.split("\n").length} {t("lines")}
                  <button aria-label={t("delete")} onClick={() => setFile(null)}>✕</button>
                </div>
              )}
              <div className="composer">
                {mode === "chat" && (
                  <>
                    <input ref={fileInput} type="file" hidden multiple onChange={pickFile}
                      accept="image/*,.heic,.txt,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.html,.css,.scss,.json,.xml,.yml,.yaml,.sql,.sh,.md,.vue,.svelte,text/*" />
                    <button className="attach" aria-label={t("attachImage")} title={t("attachImage")} onClick={() => fileInput.current?.click()}><Svg d={Icon.clip} /></button>
                  </>
                )}
                <textarea ref={ta} rows={1} value={input} aria-label={t("placeholder")}
                  placeholder={mode === "build" ? (hasFiles ? t("placeholderEdit") : t("placeholderBuild")) : file ? t("placeholderFile") : t("placeholder")}
                  dir={input ? (isRTL(input) ? "rtl" : "ltr") : undefined}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                  onPaste={onPaste}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } }} />
                {busy ? (
                  <button className="send stop" aria-label={t("stop")} onClick={() => abortRef.current?.abort()}><Svg d={Icon.stop} size={18} /></button>
                ) : (
                  <button className="send" aria-label={t("send")} onClick={() => send()} disabled={!input.trim() && !file && !images.length}><Svg d={Icon.up} size={18} w={2.4} /></button>
                )}
              </div>
              <p className="foot-note">{t("footNote")}</p>
            </footer>
          </div>

          {mode === "build" && (
            <div className={"preview-col" + (showPreview ? " open" : "")}>
              <Preview files={project} busy={busy} onClose={() => setShowPreview(false)} />
            </div>
          )}
        </div>
      </div>

      {sheet?.type === "upgrade" && <Upgrade reason={sheet.reason} me={me} onClose={() => setSheet(null)} />}
      {sheet?.type === "settings" && (
        <Settings session={session} me={me} onClose={() => setSheet(null)} onPlans={() => setSheet({ type: "upgrade", reason: "info" })} />
      )}
    </div>
  );
}

/* ---------------- Root ---------------- */
function Root() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="splash"><img src="/icon-192.png" alt="AHM AI" /></div>;
  return session ? <Main session={session} /> : <Auth />;
}

export default function Home() {
  return <LangProvider><Root /></LangProvider>;
}
