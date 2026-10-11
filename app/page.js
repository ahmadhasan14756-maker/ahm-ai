"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { TELEGRAM_BOT, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/env";
import { PAID_PLANS } from "../lib/plans";
import { parseFiles, applyChanges, buildPreview, downloadZip } from "../lib/builder";
import { LANGS, dirOf, makeT } from "../lib/i18n";
import Workspace from "../components/Workspace";
import Learn from "../components/Learn";
import VoiceMode from "../components/VoiceMode";
import { quickGuess } from "../lib/intent";

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
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  speaker: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  open: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  learn: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></>,
  wave: <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />,
  more: <><path d="M12 5v14M5 12h14" /></>,
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
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

function Auth() {
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  const [googleOn, setGoogleOn] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Show the Google button only when Google sign-in is switched on in Supabase.
  useEffect(() => {
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then((r) => r.json())
      .then((j) => setGoogleOn(!!j?.external?.google))
      .catch(() => {});
  }, []);

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setMsg(t("googleFail"));
  }
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
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        // Email already registered (Supabase hides this): send them to log in instead.
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMode("login");
          setMsg(t("errExists"));
          return;
        }
        if (!data?.session) setMsg(t("checkEmail")); // with confirmation off they are signed in straight away
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg(t("resetSent"));
      }
    } catch (err) {
      const m = err.message || "";
      if (m.includes("Invalid login")) setMsg(t("errLogin"));
      else if (m.includes("Email not confirmed")) setMsg(t("errConfirm"));
      else if (m.includes("already registered")) { setMode("login"); setMsg(t("errExists")); }
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
        {googleOn && mode !== "reset" && (
          <>
            <button className="google-btn" onClick={google}><GoogleLogo /> {t("google")}</button>
            <div className="or"><span>{t("orEmail")}</span></div>
          </>
        )}
        {!googleOn && <h2>{t(mode)}</h2>}
        <form onSubmit={submit}>
          <label className="field">
            <span>{t("email")}</span>
            <input type="email" dir="ltr" placeholder="email@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {mode !== "reset" && (
            <label className="field">
              <span>{t("password")}</span>
              <div className="pw-wrap">
              <input type={showPw ? "text" : "password"} dir="ltr" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" className="pw-eye" aria-label={showPw ? t("hidePw") : t("showPw")} onClick={() => setShowPw(!showPw)}>
                {showPw ? t("hidePw") : t("showPw")}
              </button>
              </div>
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

  if (lang.startsWith("delete:")) {
    return <div className="file-chip del" dir="ltr"><div className="del-row">🗑 <span>{lang.slice(7)}</span></div></div>;
  }

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

/* ---------------- Generated images ---------------- */
const RATIOS = { square: [1024, 1024], portrait: [768, 1344], landscape: [1344, 768] };
function imageUrl(prompt, ratio, seed) {
  const [w, h] = RATIOS[ratio] || RATIOS.square;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
}
async function saveImage(url) {
  try {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ahm-ai-" + Date.now() + ".jpg";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch {
    window.open(url, "_blank");
  }
}
function GenImage({ url, ratio }) {
  const { t } = useLang();
  const [state, setState] = useState("loading");
  const [src, setSrc] = useState(url);
  const [w, h] = RATIOS[ratio] || RATIOS.square;
  return (
    <figure className={"gen " + state} style={{ aspectRatio: `${w} / ${h}` }}>
      {state === "loading" && <div className="gen-wait"><span className="mini-spin" /> {t("drawing")}</div>}
      {state === "error" ? (
        <button className="gen-retry" onClick={() => { setState("loading"); setSrc(url + "&r=" + Date.now()); }}>{t("retry")}</button>
      ) : (
        <img src={src} alt="" onLoad={() => setState("ok")} onError={() => setState("error")} />
      )}
      {state === "ok" && (
        <div className="gen-tools">
          <button aria-label={t("openImage")} title={t("openImage")} onClick={() => window.open(src, "_blank")}><Svg d={Icon.open} size={16} /></button>
          <button aria-label={t("saveImage")} title={t("saveImage")} onClick={() => saveImage(src)}><Svg d={Icon.zip} size={16} /></button>
        </div>
      )}
    </figure>
  );
}

/* ---------------- Vector designs (logos, posters) ---------------- */
const svgUrl = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
async function svgToPng(svg, width = 2048) {
  const img = new Image();
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = svgUrl(svg); });
  const vb = /viewBox="([\d.\s-]+)"/.exec(svg)?.[1]?.split(/\s+/).map(Number);
  const ratio = vb && vb[2] && vb[3] ? vb[3] / vb[2] : img.height / img.width || 1;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round(width * ratio);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
function DesignTile({ d, kind }) {
  const { t } = useLang();
  return (
    <figure className={"design " + (kind || "logo")}>
      <img src={svgUrl(d.svg)} alt={d.name} />
      <figcaption>
        <span>{d.name}</span>
        <div className="gen-tools static">
          <button aria-label="PNG" title="PNG" onClick={async () => downloadBlob(await svgToPng(d.svg), "ahm-design.png")}><Svg d={Icon.zip} size={16} /> PNG</button>
          <button aria-label="SVG" title="SVG" onClick={() => downloadBlob(new Blob([d.svg], { type: "image/svg+xml" }), "ahm-design.svg")}>SVG</button>
        </div>
      </figcaption>
    </figure>
  );
}

/* ---------------- Answer actions: copy + read aloud ---------------- */
let currentAudio = null;
function AnswerActions({ text, getToken }) {
  const { t } = useLang();
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function speak() {
    if (state === "playing") { audioRef.current?.pause(); setState("idle"); return; }
    if (state === "loading") return;
    try {
      currentAudio?.pause();
      setState("loading");
      if (!audioRef.current) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error();
        const url = URL.createObjectURL(await res.blob());
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setState("idle");
      }
      currentAudio = audioRef.current;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setState("playing");
    } catch {
      setState("idle");
      alert(t("ttsFail"));
    }
  }

  return (
    <div className="answer-actions">
      <button aria-label={t("copyAnswer")} title={t("copyAnswer")} onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        <Svg d={copied ? Icon.check : Icon.copy} size={16} />
      </button>
      <button aria-label={state === "playing" ? t("stopListen") : t("listen")} title={t("listen")} className={state !== "idle" ? "on" : ""} onClick={speak}>
        {state === "loading" ? <span className="mini-spin" aria-hidden="true" /> : <Svg d={state === "playing" ? Icon.stop : Icon.speaker} size={16} />}
      </button>
    </div>
  );
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

/* ---------------- Sidebar (chat history) ---------------- */
function Sidebar({ open, chats, activeId, onPick, onNew, onDelete, onSettings, onClose, me, onLearn, learnOn }) {
  const { t } = useLang();
  const iconOf = { chat: Icon.chat, auto: Icon.chat, build: Icon.build, image: Icon.image };
  return (
    <>
      <div className={"side-bg" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <aside className={"sidebar" + (open ? " open" : "")} aria-label={t("menu")}>
        <div className="side-top">
          <div className="brand"><img src="/icon-192.png" alt="" aria-hidden="true" /><span className="brand-name">AHM <b>AI</b></span></div>
          <button className="icon-btn sm side-x" aria-label={t("close")} onClick={onClose}><Svg d={Icon.close} size={18} /></button>
        </div>
        <button className="new-btn" onClick={() => onNew("auto")}><Svg d={Icon.plus} size={18} /> {t("newChat")}</button>
        <button className={"new-btn alt" + (learnOn ? " on" : "")} onClick={onLearn}><Svg d={Icon.learn} size={18} /> {t("learnLang")}</button>
        <div className="side-list">
          <div className="side-title">{t("recent")}</div>
          {!chats.length && <div className="side-empty">{t("noHistory")}</div>}
          {chats.map((c) => (
            <div key={c.id} className={"side-item" + (c.id === activeId && !learnOn ? " on" : "")}>
              <button className="side-pick" onClick={() => onPick(c.id)}>
                <Svg d={iconOf[c.mode] || Icon.chat} size={15} /><span dir="auto">{c.title || "…"}</span>
              </button>
              <button className="side-del" aria-label={t("delete")} onClick={() => onDelete(c.id)}><Svg d={Icon.trash} size={15} /></button>
            </div>
          ))}
        </div>
        <button className="side-settings" onClick={onSettings}>
          <Svg d={Icon.gear} size={18} /> <span>{t("settings")}</span>
          {me && <em>{me.pro ? `⭐ ${me.planName}` : t("free")} · {Math.max(0, me.limit - me.used)}</em>}
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
  const [draft, setDraft] = useState(() => blank("auto")); // saved only after the first message
  const [activeId, setActiveId] = useState(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [deciding, setDeciding] = useState(false);
  const [imgStyle, setImgStyle] = useState("photo");
  const [imgRatio, setImgRatio] = useState("square");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [view, setView] = useState("chat"); // chat | learn
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
      if (i === -1) return [{ ...fn(id === draft.id ? draft : blank("auto")), updated: Date.now() }, ...list];
      const next = [...list];
      next[i] = { ...fn(next[i]), updated: Date.now() };
      next.sort((a, b) => b.updated - a.updated);
      return next;
    });
  }

  // Edits made by hand in the code editor are saved into the current project.
  function setProjectFiles(files) {
    patch(active.id, (c) => ({ ...c, project: files, title: c.title || Object.keys(files)[0] || "project" }));
    setActiveId(active.id);
  }

  function startNew(m = "auto") {
    if (busy) return;
    setView("chat");
    setDraft(blank(m));
    setActiveId(null);
    setInput("");
    setFile(null);
    setShowPreview(false);
    setSideOpen(false);
  }
  // Start-screen cards pick a tool for the new chat (or "auto" lets the AI decide).
  function openLearn() {
    if (busy) return;
    setView("learn");
    setSideOpen(false);
    setShowPreview(false);
  }
  // A tutor chat: the teacher speaks first, then corrects the learner as they talk.
  function startTutor(target, level) {
    const hello = {
      en: "Hi! 👋 I'm your English teacher. Let's practise together. How are you today?",
      ar: "مرحباً! 👋 أنا معلمك للغة العربية. لنتدرب معاً. كيف حالك اليوم؟",
      ckb: "سڵاو! 👋 من مامۆستای زمانی کوردییەکەتم. با پێکەوە ڕاهێنان بکەین. ئەمڕۆ چۆنی؟",
    }[target];
    const names = { en: "English", ar: "العربية", ckb: "کوردی" };
    setDraft({ ...blank("chat"), title: "🎓 " + names[target] + " · " + level, tutor: { target, level }, messages: [{ role: "assistant", content: hello }] });
    setActiveId(null);
    setView("chat");
  }

  function startVoiceTutor(target, level) {
    const hello = {
      en: "Hi! I'm your English teacher. Let's talk together. How are you today?",
      ar: "مرحباً! أنا معلمك للغة العربية. لنتحدث معاً. كيف حالك اليوم؟",
      ckb: "سڵاو! من مامۆستای زمانی کوردییەکەتم. با پێکەوە قسە بکەین. ئەمڕۆ چۆنی؟",
    }[target];
    const names = { en: "English", ar: "العربية", ckb: "کوردی" };
    const d = { ...blank("chat"), title: "🎙️ " + names[target] + " · " + level, tutor: { target, level }, messages: [{ role: "assistant", content: hello }] };
    setDraft(d);
    setActiveId(null);
    setView("chat");
    setVoice({ chatId: d.id, tutor: d.tutor, greeting: hello });
  }

  function chooseTool(m) {
    setDraft((d) => ({ ...d, mode: m }));
    setActiveId(null);
    setTimeout(() => ta.current?.focus(), 50);
  }
  function pick(id) {
    if (busy) return;
    setView("chat");
    setActiveId(id);
    setSideOpen(false);
    setShowPreview(false);
  }
  function remove(id) {
    if (!confirm(t("confirmDelete"))) return;
    setChats((l) => l.filter((c) => c.id !== id));
    if (id === activeId) startNew(mode);
  }

  // ---- voice messages ----
  async function startRec() {
    if (recording || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((x) => window.MediaRecorder?.isTypeSupported?.(x)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const started = Date.now();
      const timer = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setRecSecs(s);
        if (s >= 120) stopRec(true);
      }, 250);
      recRef.current = { mr, stream, chunks, timer, send: true };
      mr.onstop = async () => {
        clearInterval(timer);
        stream.getTracks().forEach((tr) => tr.stop());
        const keep = recRef.current?.send;
        recRef.current = null;
        setRecording(false);
        setRecSecs(0);
        if (!keep || !chunks.length) return;
        const blob = new Blob(chunks, { type: mr.mimeType || type || "audio/webm" });
        const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
        const mimeType = (blob.type || "audio/webm").split(";")[0];
        send(t("voiceMessage"), undefined, [{ mimeType, data, voice: true }]);
      };
      mr.start(500);
      setRecording(true);
    } catch {
      alert(t("micDenied"));
    }
  }
  function stopRec(sendIt) {
    const r = recRef.current;
    if (!r) return;
    r.send = sendIt;
    if (r.mr.state !== "inactive") r.mr.stop();
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
    const pdfs = all.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    for (const f of pdfs) {
      if (f.size > 3_000_000) { alert(t("pdfBig")); continue; }
      const r = new FileReader();
      r.onload = () => setImages((cur) => (cur.length < 4 ? [...cur, { mimeType: "application/pdf", data: String(r.result).split(",")[1], docName: f.name }] : cur));
      r.readAsDataURL(f);
    }
    const imgs = all.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (imgs.length) { addImages(imgs); return; }
    if (pdfs.length) return;
    const f = all[0];
    if (!me?.pro) { setSheet({ type: "upgrade", reason: "pro_only" }); return; }
    if (f.size > MAX_FILE_BYTES) { alert(t("fileBig")); return; }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, content: String(r.result || "") });
    r.readAsText(f);
  }

  async function generateImage(text, baseMessages, keepMode = "image") {
    const id = active.id;
    const base = baseMessages || messages;
    // Logos and posters are drawn as vector designs (exact text, also Kurdish); everything else as pictures.
    const lastDesign = [...base].reverse().find((m) => m.designs || m.gen);
    const wanted = /(لۆگۆ|logo|شعار|لوگو)/i.test(text) ? "logo" : /(پۆستەر|poster|ملصق|بوستر|بانەر|banner|flyer)/i.test(text) ? "poster" : null;
    const kind = wanted || (lastDesign?.designs ? lastDesign.kind : null) || (["logo", "poster"].includes(imgStyle) ? imgStyle : null);
    const style = kind ? kind : imgStyle, ratio = imgRatio;
    // Earlier requests in this chat, so "make it blue" changes the last image instead of starting over.
    const previous = lastDesign ? base.filter((m) => m.role === "user").map((m) => m.content).slice(-4) : [];
    const next = [...base, { role: "user", content: text }];
    const put = (msgs) => patch(id, (c) => ({ ...c, mode: keepMode, messages: msgs, title: c.title || text.slice(0, 60) }));
    put([...next, { role: "assistant", content: "" }]);
    setActiveId(id);
    setInput("");
    if (ta.current) ta.current.style.height = "auto";
    setBusy(true);
    try {
      let res, data;
      for (let tries = 0; tries < 3; tries++) {
        res = await fetch(kind ? "/api/design" : "/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
          body: JSON.stringify({ prompt: text, style, kind, previous, lang }),
        });
        data = await res.json().catch(() => ({}));
        if (res.ok || data.error === "limit" || res.status === 401) break;
        await new Promise((r) => setTimeout(r, 1200 * (tries + 1)));
      }
      if (res.status === 401) { await supabase.auth.signOut(); return; }
      if (data.error === "limit") { put(next.slice(0, -1)); setInput(text); setSheet({ type: "upgrade", reason: "limit" }); return; }
      if (!res.ok) { put([...next, { role: "assistant", content: data.error === "busy" ? t("errBusy") : t("errAi"), failed: true }]); return; }
      if (kind) {
        put([...next, { role: "assistant", content: data.caption || "", designs: data.designs, kind: data.kind }]);
      } else {
        const seeds = [1, 2].map(() => Math.floor(Math.random() * 1e9));
        put([...next, { role: "assistant", content: data.caption || "", gen: seeds.map((sd) => imageUrl(data.prompt, ratio, sd)), ratio, prompt: data.prompt }]);
      }
    } catch {
      put([...next, { role: "assistant", content: t("errConn"), failed: true }]);
    } finally {
      setBusy(false);
      loadMe();
    }
  }

  // Two more versions of the same picture (free: same description, new random seed).
  function moreImages(index) {
    patch(active.id, (c) => ({
      ...c,
      messages: c.messages.map((m, i) => (i === index && m.prompt ? { ...m, gen: [...m.gen, ...[1, 2].map(() => imageUrl(m.prompt, m.ratio, Math.floor(Math.random() * 1e9)))].slice(-8) } : m)),
    }));
  }

  // ---- hands-free voice conversation ----
  const [voice, setVoice] = useState(null); // { chatId, tutor, greeting }
  function openVoice(opts = {}) {
    if (busy) return;
    const chatId = opts.chatId || active.id;
    setVoice({ chatId, tutor: opts.tutor || active.tutor || null, greeting: opts.greeting || null });
  }
  function voiceTurn(heardText, answer) {
    if (!voice) return;
    patch(voice.chatId, (c) => ({
      ...c,
      mode: c.mode === "auto" ? "chat" : c.mode,
      messages: [...c.messages, { role: "user", content: heardText || t("voiceMessage"), voice: true }, { role: "assistant", content: answer }],
      title: c.title || (heardText || t("voiceMessage")).slice(0, 60),
    }));
    setActiveId(voice.chatId);
  }

  async function send(preset, baseMessages, extra = [], forced) {
    const typed = (preset ?? input).trim();
    const hasAttach = images.length || file || extra.length;
    let target = forced || mode;

    // New chat with no tool chosen: work out what the user wants.
    if (target === "auto") {
      if (!typed && !hasAttach) return;
      if (busy) return;
      target = "chat";
      if (!hasAttach && typed) {
        target = quickGuess(typed);
        if (!target) {
          setDeciding(true);
          try {
            const r = await fetch("/api/intent", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
              body: JSON.stringify({ text: typed }),
            });
            target = (await r.json().catch(() => ({}))).mode || "chat";
          } catch { target = "chat"; } finally { setDeciding(false); }
        }
      }
      setDraft((d) => ({ ...d, mode: target }));
    }
    // In a normal chat, "draw me ..." makes a picture right inside the conversation.
    if (target === "chat" && !active.tutor && !hasAttach && typed && quickGuess(typed) === "image") {
      if (!busy) generateImage(typed, baseMessages, "chat");
      return;
    }
    if (target === "image") {
      if (typed && !busy) generateImage(typed, baseMessages, "image");
      return;
    }
    const sentImages = target === "chat" ? [...images, ...extra] : [];
    const isVoice = extra.some((x) => x.voice);
    const text = (preset ?? input).trim() || (file ? t("fixFile") : sentImages.length ? t("describeImage") : "");
    if (!text || busy) return;
    const id = active.id;
    const m = target;
    const sentFile = m === "chat" ? file : null;
    const base = project;
    const next = [...(baseMessages || messages), { role: "user", content: text, voice: isVoice || undefined, fileName: sentFile?.name, thumbs: sentImages.filter((im) => im.thumb).map((im) => im.thumb), docs: sentImages.filter((im) => im.docName).map((im) => im.docName) }];
    const put = (msgs, extra = {}) => patch(id, (c) => ({ ...c, ...extra, mode: m, messages: msgs, title: c.title || text.slice(0, 60) }));
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
    const ERR = /\u0000ERR:(busy|ai)\s*$/;
    const clean = (txt) => txt.replace(/\n*\u0000ERR:(busy|ai)\s*$/, (_m, k) => "\n\n" + (k === "busy" ? t("errBusy") : t("errAi")));

    // One request to the server. Returns "ok", "retry" (nothing arrived yet) or "stop".
    const attempt = async () => {
      acc = "";
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
          project: m === "build" ? base : undefined,
          tutor: active.tutor || undefined,
        }),
      });
      if (res.status === 401) { await supabase.auth.signOut(); return "stop"; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "limit" || err.error === "pro_only") {
          put(next.slice(0, -1));
          setInput(text);
          if (sentFile) setFile(sentFile);
          if (sentImages.length) setImages(sentImages.filter((x) => !x.voice));
          setSheet({ type: "upgrade", reason: err.error });
          return "stop";
        }
        if (err.error === "file_too_big") { put(next.slice(0, -1)); setInput(text); alert(t("fileBig")); return "stop"; }
        if (err.detail) console.error("server:", err.detail);
        return "retry";
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (ERR.test(acc) && !acc.replace(ERR, "").trim()) continue; // error with no text: handled below
        const ch = m === "build" ? applyChanges(base, acc) : null;
        put([...next, { role: "assistant", content: clean(acc) }], ch?.changed ? { project: ch.files } : {});
      }
      return ERR.test(acc) && !acc.replace(ERR, "").trim() ? "retry" : "ok";
    };

    try {
      let result = await attempt();
      for (let tries = 1; result === "retry" && tries <= 2; tries++) {
        await new Promise((r) => setTimeout(r, 1200 * tries)); // wait a moment, then quietly try again
        result = await attempt();
      }
      if (result === "retry") {
        const busyErr = /ERR:busy/.test(acc);
        put([...next, { role: "assistant", content: busyErr ? t("errBusy") : t("errAi"), failed: true }]);
      } else if (result === "ok") {
        if (sentFile) {
          const { out, applied, failed } = applyEdits(sentFile.content, acc);
          put([...next, { role: "assistant", content: clean(acc), fixed: applied ? { name: fixedName(sentFile.name), content: out } : null, fixInfo: { applied, failed } }]);
        }
        if (m === "build" && applyChanges(base, acc).changed && window.innerWidth < 900) setShowPreview(true);
        if (ERR.test(acc)) put([...next, { role: "assistant", content: clean(acc), failed: true }]);
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        if (!acc) put(next.slice(0, -1));
      } else {
        put([...next, { role: "assistant", content: (acc ? clean(acc) + "\n\n" : "") + t("errConn"), failed: true }]);
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
  const suggestions = t(mode === "build" ? "buildSugg" : mode === "image" ? "imageSugg" : "chatSugg");
  const chatLike = mode === "chat" || mode === "auto";
  const toolName = { chat: t("capChat"), build: t("capBuild"), image: t("capImage") }[mode];

  return (
    <div className={"app mode-" + mode}>
      <Sidebar open={sideOpen} chats={chats} activeId={activeId} me={me} onLearn={openLearn} learnOn={view === "learn"}
        onPick={pick} onNew={startNew} onDelete={remove} onClose={() => setSideOpen(false)}
        onSettings={() => { setSideOpen(false); setSheet({ type: "settings" }); }} />

      <div className="main-col">
        <header>
          <button className="icon-btn menu-btn" aria-label={t("menu")} title={t("menu")} onClick={() => setSideOpen(true)}><Svg d={Icon.menu} /></button>
          <div className="brand">
            <img src="/icon-192.png" alt="" aria-hidden="true" />
            <span className="brand-name">AHM <b>AI</b></span>
          </div>
          <button className="icon-btn" aria-label={t("newChat")} title={t("newChat")} onClick={() => startNew("auto")}><Svg d={Icon.plus} /></button>
        </header>

        {view === "learn" ? (
          <Learn lang={lang} uid={uid} getToken={token} onTutor={startTutor} onVoiceTutor={startVoiceTutor}
            onLimit={() => setSheet({ type: "upgrade", reason: "limit" })} />
        ) : (
        <div className="body">
          <div className="chat-col">
            <main>
              {messages.length === 0 && (
                <div className="empty">
                  <img src="/icon-192.png" alt="" aria-hidden="true" className="empty-logo" />
                  {mode === "auto" ? (
                    <>
                      <h2 className="greet">{greeting(t)}{name ? (lang === "en" ? ", " : "، ") + name : ""}</h2>
                      <p className="muted">{t("helpQ")}</p>
                      <div className="caps">
                        <button className="cap" onClick={() => chooseTool("chat")}><Svg d={Icon.chat} /><b>{t("capChat")}</b><span>{t("capChatSub")}</span></button>
                        <button className="cap" onClick={() => chooseTool("build")}><Svg d={Icon.build} /><b>{t("capBuild")}</b><span>{t("capBuildSub")}</span></button>
                        <button className="cap" onClick={() => chooseTool("image")}><Svg d={Icon.image} /><b>{t("capImage")}</b><span>{t("capImageSub")}</span></button>
                        <button className="cap" onClick={() => openVoice()}><Svg d={Icon.wave} /><b>{t("capVoice")}</b><span>{t("capVoiceSub")}</span></button>
                        <button className="cap" onClick={() => fileInput.current?.click()}><Svg d={Icon.clip} /><b>{t("capFiles")}</b><span>{t("capFilesSub")}</span></button>
                        <button className="cap learn-cap" onClick={openLearn}><Svg d={Icon.learn} /><b>{t("learnLang")}</b><span>{t("learnLangSub")}</span></button>
                      </div>
                      <p className="auto-hint">{t("autoHint")}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="greet">{mode === "image" ? t("imageQ") : mode === "build" ? t("buildQ") : t("helpQ")}</h2>
                      <p className="muted">{mode === "build" ? t("buildSub") : mode === "image" ? t("imageSub") : t("helpSub")}</p>
                      <div className="chips">
                        {suggestions.map((sg) => <button key={sg} onClick={() => send(sg)}>{sg}</button>)}
                      </div>
                    </>
                  )}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={"row " + m.role}>
                  <div className={"bubble" + (m.failed ? " failed" : "")} dir={isRTL(m.content) ? "rtl" : "ltr"}>
                    {m.thumbs?.length > 0 && (
                      <div className="msg-imgs">{m.thumbs.map((src, k) => <img key={k} src={src} alt="" />)}</div>
                    )}
                    {m.docs?.length > 0 && m.docs.map((d, k) => <div key={k} className="file-tag" dir="ltr">📄 {d}</div>)}
                    {m.fileName && <div className="file-tag" dir="ltr">📎 {m.fileName}</div>}
                    {m.role === "assistant" ? (
                      m.content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{m.content}</ReactMarkdown>
                        : <span className="typing" role="status"><i /><i /><i /><small>{t("thinking")}</small></span>
                    ) : m.voice ? <span className="voice-tag"><Svg d={Icon.mic} size={16} /> {m.content}</span> : m.content}
                    {m.role === "assistant" && m.content && !m.failed && !m.designs && !m.gen && !(busy && i === messages.length - 1) && (
                      <AnswerActions text={m.content} getToken={token} />
                    )}
                    {m.gen && (
                      <>
                        <div className={"gen-grid " + (m.ratio || "square")}>{m.gen.map((u) => <GenImage key={u} url={u} ratio={m.ratio} />)}</div>
                        {m.prompt && !busy && <button className="retry-btn" onClick={() => moreImages(i)}><Svg d={Icon.more} size={15} /> {t("moreImages")}</button>}
                      </>
                    )}
                    {m.designs && (
                      <div className={"design-grid " + (m.kind || "logo")}>{m.designs.map((d, k) => <DesignTile key={k} d={d} kind={m.kind} />)}</div>
                    )}
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
              {messages.length === 0 && mode !== "auto" && (
                <div className="tool-chip-row">
                  <span className="tool-chip">
                    <Svg d={mode === "build" ? Icon.build : mode === "image" ? Icon.image : Icon.chat} size={15} /> {toolName}
                    <button aria-label={t("close")} onClick={() => chooseTool("auto")}><Svg d={Icon.close} size={13} w={2.6} /></button>
                  </span>
                </div>
              )}
              {deciding && <div className="deciding" role="status"><span className="mini-spin" /> {t("deciding")}</div>}
              {mode === "image" && (
                <div className="img-opts">
                  <div className="opt-row" role="radiogroup" aria-label={t("style")}>
                    {["photo", "art", "logo", "3d", "poster"].map((k) => (
                      <button key={k} role="radio" aria-checked={imgStyle === k} className={imgStyle === k ? "on" : ""} onClick={() => setImgStyle(k)}>{t("style_" + k)}</button>
                    ))}
                  </div>
                  <div className="opt-row" role="radiogroup" aria-label={t("ratio")}>
                    {["square", "portrait", "landscape"].map((k) => (
                      <button key={k} role="radio" aria-checked={imgRatio === k} className={imgRatio === k ? "on" : ""} onClick={() => setImgRatio(k)}>
                        <i className={"ratio-ico " + k} aria-hidden="true" /> {t("ratio_" + k)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {images.length > 0 && (
                <div className="img-tray">
                  {images.map((im, k) => (
                    <div key={k} className={"img-chip" + (im.docName ? " doc" : "")}>
                      {im.docName ? <span dir="ltr">📄 {im.docName}</span> : <img src={im.thumb} alt="" />}
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
              {recording ? (
                <div className="composer rec">
                  <button className="attach" aria-label={t("cancel")} title={t("cancel")} onClick={() => stopRec(false)}><Svg d={Icon.close} /></button>
                  <div className="rec-info" role="status"><i className="rec-dot" /> {t("recording")} <b dir="ltr">{Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}</b></div>
                  <button className="send" aria-label={t("send")} onClick={() => stopRec(true)}><Svg d={Icon.up} size={18} w={2.4} /></button>
                </div>
              ) : (
              <div className="composer">
                {chatLike && (
                  <>
                    <input ref={fileInput} type="file" hidden multiple onChange={pickFile}
                      accept="image/*,.heic,.pdf,application/pdf,.txt,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.html,.css,.scss,.json,.xml,.yml,.yaml,.sql,.sh,.md,.vue,.svelte,text/*" />
                    <button className="attach" aria-label={t("attachImage")} title={t("attachImage")} onClick={() => fileInput.current?.click()}><Svg d={Icon.clip} /></button>
                  </>
                )}
                <textarea ref={ta} rows={1} value={input} aria-label={t("placeholder")}
                  placeholder={mode === "build" ? (hasFiles ? t("placeholderEdit") : t("placeholderBuild")) : mode === "image" ? t("placeholderImage") : file ? t("placeholderFile") : t("placeholder")}
                  dir={input ? (isRTL(input) ? "rtl" : "ltr") : undefined}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                  onPaste={onPaste}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } }} />
                {chatLike && !busy && !deciding && !input.trim() && !images.length && !file ? (
                  <span className="send-pair">
                    <button className="send mic" aria-label={t("record")} title={t("record")} onClick={startRec}><Svg d={Icon.mic} size={18} /></button>
                    <button className="send live" aria-label={t("liveVoice")} title={t("liveVoice")} onClick={() => openVoice()}><Svg d={Icon.wave} size={18} /></button>
                  </span>
                ) : busy ? (
                  <button className="send stop" aria-label={t("stop")} onClick={() => abortRef.current?.abort()}><Svg d={Icon.stop} size={18} /></button>
                ) : (
                  <button className="send" aria-label={t("send")} onClick={() => send()} disabled={!input.trim() && !file && !images.length}><Svg d={Icon.up} size={18} w={2.4} /></button>
                )}
              </div>
              )}
              <p className="foot-note">{t("footNote")}</p>
            </footer>
          </div>

          {mode === "build" && (
            <div className={"preview-col" + (showPreview ? " open" : "")}>
              <Workspace files={project} setFiles={setProjectFiles} busy={busy} t={t}
                onClose={() => setShowPreview(false)} onAsk={(q) => { setShowPreview(false); send(q); }} />
            </div>
          )}
        </div>
        )}
      </div>

      {voice && (
        <VoiceMode lang={lang} getToken={token} tutor={voice.tutor} greeting={voice.greeting}
          history={(chats.find((c) => c.id === voice.chatId) || (draft.id === voice.chatId ? draft : null))?.messages || []}
          onTurn={voiceTurn} onClose={() => { setVoice(null); loadMe(); }}
          onLimit={() => setSheet({ type: "upgrade", reason: "limit" })} />
      )}
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
