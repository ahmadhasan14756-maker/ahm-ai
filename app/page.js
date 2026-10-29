"use client";
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { TELEGRAM_BOT, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/env";
import { DEFAULT_SETTINGS } from "../lib/plans";
import { applyChanges, buildPreview, downloadZip, findMissing } from "../lib/builder";
import { DB_FILE, dbFile } from "../lib/appdb";
import { importZip } from "../lib/zipimport";
import { LANGS, dirOf, makeT, detectLang } from "../lib/i18n";
import Workspace, { DevicePreview } from "../components/Workspace";
import Learn from "../components/Learn";
import HouseStudio from "../components/HouseStudio";
import SlidesStudio from "../components/SlidesStudio";
import OfficeCard from "../components/OfficeCard";
import { checkProject } from "../lib/selfcheck";
import { templatesFor } from "../lib/templates";
import { BLUEPRINTS } from "../lib/blueprints";
import { PlanView, PredictCard } from "../components/ChatCards";
import DesignStudio from "../components/DesignStudio";
import VoiceMode from "../components/VoiceMode";
import Landing from "../components/Landing";
import { quickGuess } from "../lib/intent";
import { REFUSAL } from "../lib/safety";
import { useUpdateReady, refreshApp } from "../lib/update";

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
  thumbUp: <path d="M7 10v11H3V10zM7 10l4-8c1.7 0 3 1.3 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7" />,
  thumbDown: <path d="M17 14V3h4v11zM17 14l-4 8c-1.7 0-3-1.3-3-3v-4H4.5a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.9 3H17" />,
  panel: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>,
  play: <path d="M8 5.5l11 6.5-11 6.5z" />,
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
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>,
  house: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  wave: <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />,
  more: <><path d="M12 5v14M5 12h14" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  sparkChat: <><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.7A8.5 8.5 0 1 1 21 11.5z" /><path d="M12.5 7.5l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="currentColor" stroke="none" /></>,
  slides: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8" /><path d="M7 12.5l3-3 2.2 2.2L16.5 7.5" /></>,
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

// Language button in the app's top bar: کوردی / العربية / English, one tap away.
const LANG_SHORT = { ckb: "کوردی", ar: "عربي", en: "EN" };
function LangSwitch() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="lang-sw">
      <button className="lang-sw-btn" aria-label={t("langBtn")} title={t("langBtn")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Svg d={Icon.globe} size={17} /><span>{LANG_SHORT[lang]}</span>
      </button>
      {open && (
        <>
          <div className="lang-sw-bg" onClick={() => setOpen(false)} />
          <div className="lang-sw-menu" role="menu">
            {LANGS.map((l) => (
              <button key={l.id} role="menuitemradio" aria-checked={l.id === lang} className={l.id === lang ? "on" : ""} onClick={() => { setLang(l.id); setOpen(false); }}>
                <span>{l.name}</span>{l.id === lang && <b aria-hidden="true">✓</b>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- "Notify me when it's done" (Web Push) ---------------- */
const isIos = () => typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
const standalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone);
function b64ToBytes(b64) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function usePush(token) {
  const [state, setState] = useState("unknown"); // unsupported | ios-install | blocked | off | on | busy
  const check = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(isIos() && !standalone() ? "ios-install" : "unsupported"); return; }
      if (Notification.permission === "denied") { setState("blocked"); return; }
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) && Notification.permission === "granted" ? "on" : "off");
    } catch { setState("unsupported"); }
  };
  useEffect(() => { check(); }, []);
  async function enable() {
    try {
      setState("busy");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "blocked" : "off"); return false; }
      const { publicKey } = await (await fetch("/api/push")).json();
      if (!publicKey) { setState("unsupported"); return false; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      setState(r.ok ? "on" : "off");
      return r.ok;
    } catch { await check(); return false; }
  }
  async function disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
    } catch {}
    setState("off");
  }
  return { state, enable, disable };
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

// "We sent a code to your e-mail": proves the e-mail is real before the account works.
function CodeStep({ info, onBack, onRecovery, onAskOwner }) {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(60);
  useEffect(() => { const id = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000); return () => clearInterval(id); }, []);
  async function verify(e) {
    e?.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) { setMsg(t("codeShort")); return; }
    setBusy(true); setMsg("");
    if (info.type === "recovery") onRecovery?.(true); // after this the "new password" screen opens
    const { error } = await supabase.auth.verifyOtp({ email: info.email, token, type: info.type });
    setBusy(false);
    if (error) {
      if (info.type === "recovery") onRecovery?.(false);
      setMsg(/network|fetch/i.test(error.message) ? t("errNetwork") : t("codeWrong"));
    }
  }
  async function resend() {
    if (wait > 0) return;
    setWait(60); setMsg("");
    const { error } = info.type === "recovery"
      ? await supabase.auth.resetPasswordForEmail(info.email, { redirectTo: window.location.origin })
      : await supabase.auth.resend({ type: "signup", email: info.email });
    setMsg(error ? (/rate|seconds/i.test(error.message) ? t("codeWaitMore") : t("errGeneric")) : "✅ " + t("codeResent"));
  }
  return (
    <div className="auth-wrap">
      <div className="glow" aria-hidden="true" />
      <div className="auth-card">
        <button type="button" className="auth-back" onClick={onBack}>{t("back")}</button>
        <div className="code-ic" aria-hidden="true">✉️</div>
        <h2>{t("codeTitle")}</h2>
        <p className="sub">{t("codeSent")} <b dir="ltr">{info.email}</b></p>
        <form onSubmit={verify}>
          <input className="code-input" dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10}
            placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            aria-label={t("codeTitle")} />
          <button type="submit" className="gold-btn" disabled={busy}>{busy ? "..." : t("codeVerify")}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
        <p className="code-help">{t("codeSpam")}</p>
        <div className="links">
          <button onClick={resend} disabled={wait > 0}>{wait > 0 ? `${t("codeResend")} (${wait})` : t("codeResend")}</button>
          {info.type === "recovery" && <button onClick={onAskOwner}>{t("noEmailCame")}</button>}
        </div>
      </div>
    </div>
  );
}

function Auth({ initialMode = "login", onBack, onRecovery }) {
  const { t } = useLang();
  const [mode, setMode] = useState(initialMode);
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
  const [resetSent, setResetSent] = useState(false);
  const [codeFor, setCodeFor] = useState(null); // { email, type: "signup" | "recovery" } → show the "enter the code" step

  async function askOwnerReset(addr) {
    await fetch("/api/reset-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: addr }) }).catch(() => {});
  }

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
        if (!data?.session) { setCodeFor({ email, type: "signup" }); setMsg(""); } // e-mail confirmation on → enter the code
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error && /load failed|failed to fetch|network/i.test(error.message || "")) throw error;
        if (error) { await askOwnerReset(email); setMsg(t("resetRequested")); } // e-mail couldn't be sent → the owner makes a new password
        else { setResetSent(true); setCodeFor({ email, type: "recovery" }); setMsg(""); }
      }
    } catch (err) {
      const m = err.message || "";
      if (m.includes("Invalid login")) setMsg(t("errLogin"));
      else if (m.includes("Email not confirmed")) { // never entered the code: send a fresh one
        await supabase.auth.resend({ type: "signup", email }).catch(() => {});
        setCodeFor({ email, type: "signup" });
        setMsg("");
      }
      else if (m.includes("already registered")) { setMode("login"); setMsg(t("errExists")); }
      else if (m.includes("at least") || m.includes("weak")) setMsg(t("errWeak"));
      else if (/load failed|failed to fetch|network/i.test(m)) setMsg(t("errNetwork"));
      else setMsg(t("error") + ": " + m);
    } finally {
      setLoading(false);
    }
  }

  if (codeFor) {
    return <CodeStep info={codeFor} onBack={() => { setCodeFor(null); setMsg(""); }} onRecovery={onRecovery}
      onAskOwner={async () => { await askOwnerReset(codeFor.email); setCodeFor(null); setMode("reset"); setMsg(t("resetRequested")); }} />;
  }

  return (
    <div className="auth-wrap">
      <div className="glow" aria-hidden="true" />
      <div className="auth-card">
        {onBack && <button type="button" className="auth-back" onClick={onBack}>{t("back")}</button>}
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
        {mode === "signup" && <p className="agree">{t("agree")} <a href="/terms" target="_blank" rel="noreferrer">{t("terms")}</a> · <a href="/privacy" target="_blank" rel="noreferrer">{t("privacy")}</a></p>}
        {msg && <p className="msg">{msg}</p>}
        <div className="links">
          {mode !== "login" && <button onClick={() => { setMode("login"); setMsg(""); }}>{t("haveAccount")}</button>}
          {mode !== "signup" && <button onClick={() => { setMode("signup"); setMsg(""); }}>{t("noAccount")} <b>{t("signupLink")}</b></button>}
          {mode === "login" && <button onClick={() => { setMode("reset"); setMsg(""); setResetSent(false); }}>{t("forgot")}</button>}
          {mode === "reset" && resetSent && (
            <button onClick={async () => { setLoading(true); await askOwnerReset(email); setLoading(false); setResetSent(false); setMsg(t("resetRequested")); }}>
              {t("noEmailCame")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Markdown code blocks ---------------- */
function CodeBlock({ className, children }) {
  const { t, lang: uiLang } = useLang();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = (className || "").replace("language-", "");
  if (!className && !text.includes("\n")) return <code className="inline">{children}</code>;

  if (lang.startsWith("delete:")) {
    return <div className="file-chip del" dir="ltr"><div className="del-row">🗑 <span>{lang.slice(7)}</span></div></div>;
  }

  // Floor-plan sketches (construction studio) come as svg code: show the drawing itself.
  if (lang === "svg" && /<svg[\s>]/i.test(text)) {
    return <DesignTile d={{ name: t("planSketch"), svg: text }} kind="plan" />;
  }

  if (lang === "suggest") return <Suggestions text={text} />;
  if (lang === "ahm-file") return <OfficeCard text={text} t={t} uiLang={uiLang} />;
  if (lang === "predict") return <PredictCard text={text} t={t} uiLang={uiLang} />;

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
        {(/^html?$/i.test(lang) || (/^(xml|markup|)$/i.test(lang) && /^\s*(<!doctype html|<html)/i.test(text))) && (
          <button className="code-pv" onClick={() => window.dispatchEvent(new CustomEvent("ahm-preview", { detail: text }))}>{t("previewCode")}</button>
        )}
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "✓ " + t("copied") : t("copy")}
        </button>
      </div>
      <pre><code>{text}</code></pre>
    </div>
  );
}
// "💡 AI suggestions": copy one into your project, or let the AI do it straight away.
function Suggestions({ text }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(-1);
  const items = text.split("\n").map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean).slice(0, 5);
  if (!items.length) return null;
  return (
    <div className="sug">
      <div className="sug-title">{t("sugTitle")}</div>
      {items.map((x, k) => (
        <div key={k} className="sug-item">
          <span dir="auto">{x}</span>
          <div className="sug-btns">
            <button onClick={() => { navigator.clipboard?.writeText(x).catch(() => {}); setCopied(k); setTimeout(() => setCopied(-1), 1500); }}>{copied === k ? "✓ " + t("copied") : "📋 " + t("sugCopy")}</button>
            <button className="go" onClick={() => window.dispatchEvent(new CustomEvent("ahm-suggest", { detail: x }))}>▶ {t("sugDo")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
// English words, numbers and code names inside Kurdish/Arabic text keep their own order (e.g. "RAM 8GB", "iPhone 15 Pro")
// instead of jumping around the sentence: each Latin run is wrapped in <bdi>.
const LATIN_RUN = /([A-Za-z0-9][A-Za-z0-9 .,:;/_\-+#@%&'’()]*[A-Za-z0-9)%])/g;
function isolate(children) {
  const one = (c, k) => {
    if (typeof c !== "string" || !/[\u0600-\u06FF]/.test(c) || !/[A-Za-z]/.test(c)) return c;
    const parts = c.split(LATIN_RUN);
    return parts.map((t, i) => (i % 2 ? <bdi key={k + "-" + i} dir="ltr">{t}</bdi> : t));
  };
  return Array.isArray(children) ? children.map(one) : one(children, 0);
}
const iso = (Tag) => ({ node, children, ...rest }) => <Tag {...rest}>{isolate(children)}</Tag>;
const MD = {
  code: CodeBlock, pre: ({ children }) => <>{children}</>,
  table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
  p: iso("p"), li: iso("li"), td: iso("td"), th: iso("th"), strong: iso("strong"), h1: iso("h1"), h2: iso("h2"), h3: iso("h3"), h4: iso("h4"), blockquote: iso("blockquote"),
};

const isRTL = (s) => /[؀-ۿ]/.test((s || "").slice(0, 200));
// A message is drawn again only when ITS text changes (not every time another message streams in) — keeps long chats fast.
const MsgMD = memo(function MsgMD({ text }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{text}</ReactMarkdown>; });

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

/* ---------------- Kurdistan flag band ---------------- */
const SUN_RAYS = Array.from({ length: 21 }, (_, i) => {
  const a = (i / 21) * Math.PI * 2 - Math.PI / 2, w = Math.PI / 21;
  const p = (r, ang) => `${(12 + r * Math.cos(ang)).toFixed(2)},${(12 + r * Math.sin(ang)).toFixed(2)}`;
  return `${p(11.5, a)} ${p(6.2, a - w)} ${p(6.2, a + w)}`;
});
function KurdFlag() {
  return (
    <div className="kurd-flag" aria-hidden="true">
      <i className="kf-r" /><i className="kf-w" /><i className="kf-g" />
      <svg className="kf-sun" viewBox="0 0 24 24">
        {SUN_RAYS.map((pts, i) => <polygon key={i} points={pts} />)}
        <circle cx="12" cy="12" r="6.4" />
      </svg>
    </div>
  );
}

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
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&safe=true&enhance=true&model=flux`;
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

/* ---------------- Studio pictures (Google image model) ---------------- */
const newJobId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12));
const text0 = (msgs, i) => [...msgs.slice(0, i)].reverse().find((x) => x.role === "user")?.content || "";
// Saved chats keep only a small copy of each picture (phones have little storage).
const slimStudio = (m) => (m.studio?.pics ? { ...m, studio: { ...m.studio, pics: m.studio.pics.map((p) => ({ thumb: p.thumb })) } } : m);
function loadSrc(src) {
  return new Promise((ok, bad) => { const img = new Image(); img.onload = () => ok(img); img.onerror = bad; img.src = src; });
}
async function shrinkPic(src) {
  const img = await loadSrc(src);
  return { full: drawScaled(img, 1600, 0.9), thumb: drawScaled(img, 520, 0.8) };
}
async function openPic(src) {
  try { window.open(URL.createObjectURL(await (await fetch(src)).blob()), "_blank"); } catch { window.open(src, "_blank"); }
}
function StudioPic({ p, ratio }) {
  const { t } = useLang();
  const src = p.full || p.thumb;
  const [w, h] = RATIOS[ratio] || RATIOS.square;
  return (
    <figure className="gen ok" style={{ aspectRatio: `${w} / ${h}` }}>
      <img src={src} alt="" />
      <div className="gen-tools">
        <button aria-label={t("openImage")} title={t("openImage")} onClick={() => openPic(src)}><Svg d={Icon.open} size={16} /></button>
        <button aria-label={t("saveImage")} title={t("saveImage")} onClick={() => saveImage(src)}><Svg d={Icon.zip} size={16} /></button>
      </div>
    </figure>
  );
}
function StudioResult({ s, onMore, last }) {
  const { t } = useLang();
  return (
    <div className="studio-res">
      {s.designs && <div className={"design-grid " + s.task}>{s.designs.map((d, k) => <DesignTile key={k} d={d} kind={s.task} />)}</div>}
      {s.pics && <div className={"gen-grid " + (s.ratio || "square") + (s.pics.length === 1 ? " one" : "")}>{s.pics.map((p, k) => <StudioPic key={k} p={p} ratio={s.ratio} />)}</div>}
      {s.urls && <div className={"gen-grid " + (s.ratio || "square")}>{s.urls.map((u) => <GenImage key={u} url={u} ratio={s.ratio} />)}</div>}
      {s.approx && <p className="studio-note">💡 {t("studioApprox")}</p>}
      {last && (
        <div className="studio-next">
          <button onClick={onMore}>🔁 {t("studioMore")}</button>
          <span>✏️ {t("studioEditHint")}</span>
        </div>
      )}
    </div>
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
// Each design gets its own id prefix, so gradients of three designs on one page don't mix.
let designSeq = 0;
function scopeSvg(svg) {
  const p = "s" + (++designSeq).toString(36) + "_";
  return String(svg)
    .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "").replace(/<(image|iframe|embed|object)\b[\s\S]*?(\/>|<\/\1>)/gi, "")
    .replace(/<\/?a\b[^>]*>/gi, "").replace(/((?:xlink:)?href\s*=\s*["'])(?!#)[^"']*(["'])/gi, "$1#$2")
    .replace(/javascript:/gi, "").replace(/@import[^;]*;/gi, "")
    .replace(/\bid="([^"]+)"/g, (_m, id) => `id="${p}${id}"`)
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, (_m, id) => `url(#${p}${id})`)
    .replace(/(href\s*=\s*")#([^"]+)"/g, (_m, a, id) => `${a}#${p}${id}"`);
}
// The fonts a design uses are put inside the file, so the PNG/SVG looks exactly like on screen.
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800;900&family=Vazirmatn:wght@400;600;700;800;900&family=Montserrat:wght@400;600;700;800;900&family=Rubik:wght@400;600;700;800;900&display=swap";
let fontFaceCache = null;
async function embeddedFonts(svg) {
  try {
    if (!fontFaceCache) fontFaceCache = fetch(FONT_CSS).then((r) => r.text());
    const css = await fontFaceCache;
    const used = ["Noto Kufi Arabic", "Vazirmatn", "Montserrat", "Rubik"].filter((f) => svg.includes(f));
    const blocks = css.split("@font-face").slice(1).map((b) => "@font-face" + b.slice(0, b.indexOf("}") + 1))
      .filter((b) => used.some((f) => b.includes(`'${f}'`)) && /U\+0600|U\+0000-00FF/i.test(b)); // Arabic-script + basic Latin parts only
    const parts = await Promise.all(blocks.map(async (b) => {
      const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
      if (!url) return "";
      const buf = await (await fetch(url)).arrayBuffer();
      let bin = ""; const bytes = new Uint8Array(buf);
      for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
      return b.replace(url, "data:font/woff2;base64," + btoa(bin));
    }));
    return parts.join("\n");
  } catch { return ""; }
}
async function svgWithFonts(svg) {
  const css = await embeddedFonts(svg);
  return css ? svg.replace(/<svg([^>]*)>/, `<svg$1><style>${css}</style>`) : svg;
}
function DesignTile({ d, kind }) {
  const { t } = useLang();
  const html = useMemo(() => scopeSvg(d.svg), [d.svg]);
  const [saving, setSaving] = useState("");
  const save = async (type) => {
    setSaving(type);
    try {
      const full = await svgWithFonts(d.svg);
      if (type === "png") {
        await new Promise((r) => setTimeout(r, 60));
        downloadBlob(await svgToPng(full), "ahm-design.png");
      } else downloadBlob(new Blob([full], { type: "image/svg+xml" }), "ahm-design.svg");
    } finally { setSaving(""); }
  };
  return (
    <figure className={"design " + (kind || "logo")}>
      <div className="design-art" role="img" aria-label={d.name} dangerouslySetInnerHTML={{ __html: html }} />
      <figcaption>
        <span>{d.name}</span>
        <div className="gen-tools static">
          <button aria-label="PNG" title="PNG" disabled={!!saving} onClick={() => save("png")}>{saving === "png" ? <span className="mini-spin" /> : <Svg d={Icon.zip} size={16} />} PNG</button>
          <button aria-label="SVG" title="SVG" disabled={!!saving} onClick={() => save("svg")}>{saving === "svg" ? <span className="mini-spin" /> : null}SVG</button>
        </div>
        {kind === "plan" && (
          // Opens this exact plan in the house design studio (no download / upload needed).
          <button className="gold-btn small plan-to-house" disabled={!!saving} onClick={async () => {
            setSaving("house");
            try { window.dispatchEvent(new CustomEvent("ahm-house-plan", { detail: await svgToPng(await svgWithFonts(d.svg)) })); } finally { setSaving(""); }
          }}>{saving === "house" ? <span className="mini-spin" /> : "🏡"} {t("planToHouse")}</button>
        )}
      </figcaption>
    </figure>
  );
}

/* ---------------- Answer actions: copy + read aloud ---------------- */
let currentAudio = null;
// iPhone only lets sound play by itself if an audio element was started during a tap.
// We start a silent one when the user sends a voice message, then reuse it for the spoken answer.
let unlockedAudio = null;
const SILENT_WAV = "data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
function unlockAudio() {
  try { const a = new Audio(SILENT_WAV); a.play().catch(() => {}); unlockedAudio = a; } catch {}
}
// The AI's answer as a voice message (after the user spoke): play/pause + progress, plays by itself the first time.
function VoiceReply({ text, getToken, auto, onAutoDone, onVoiceLimit }) {
  const { t, lang } = useLang();
  const [state, setState] = useState("idle"); // idle | loading | playing | error | limit
  const [pos, setPos] = useState(0);
  const audioRef = useRef(null);
  const started = useRef(false);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  useEffect(() => { if (auto && !started.current) { started.current = true; onAutoDone?.(); toggle(); } }, [auto]);
  async function toggle() {
    const a = audioRef.current;
    if (state === "playing" && a) { a.pause(); setState("idle"); return; }
    if (state === "loading") return;
    try {
      if (!a) {
        setState("loading");
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
          body: JSON.stringify({ text, lang }),
        });
        if (res.status === 429 && (await res.clone().json().catch(() => ({}))).error === "voice_limit") { setState("limit"); if (!auto) onVoiceLimit?.(); return; }
        if (!res.ok) throw new Error();
        const audio = auto && unlockedAudio ? unlockedAudio : new Audio();
        if (audio === unlockedAudio) unlockedAudio = null;
        audio.src = URL.createObjectURL(await res.blob());
        audio.ontimeupdate = () => setPos(audio.duration ? audio.currentTime / audio.duration : 0);
        audio.onended = () => { setState("idle"); setPos(0); };
        audioRef.current = audio;
      }
      currentAudio?.pause();
      currentAudio = audioRef.current;
      await audioRef.current.play();
      setState("playing");
    } catch {
      setState("error");
    }
  }
  const bars = [6, 11, 16, 9, 14, 20, 12, 7, 15, 18, 10, 6, 13, 17, 9, 12, 19, 8, 14, 10, 6, 12, 16, 9];
  return (
    <div className={"voice-reply" + (state === "playing" ? " on" : "")}>
      <button className="vr-play" aria-label={state === "playing" ? t("stopListen") : t("listen")} onClick={toggle}>
        {state === "loading" ? <span className="mini-spin" aria-hidden="true" /> : <Svg d={state === "playing" ? Icon.stop : Icon.play} size={16} />}
      </button>
      <div className="vr-wave" aria-hidden="true">
        {bars.map((h, k) => <i key={k} style={{ height: h }} className={k / bars.length < pos ? "done" : ""} />)}
      </div>
      <span className="vr-label">{state === "error" ? "⚠️" : state === "limit" ? "⏱️" : "🔊"}</span>
      {state === "limit" && <button className="vr-limit" onClick={() => onVoiceLimit?.()}>{t("voiceLimit")}</button>}
    </div>
  );
}

function AnswerActions({ text, getToken, exportName, q, mode }) {
  const { t, lang } = useLang();
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState(""); // "up" | "down" — 👍 / 👎 help make the answers better
  async function rate(r) {
    if (rated) return;
    setRated(r);
    try { await fetch("/api/rate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ rating: r, q: String(q || "").slice(0, 400), a: String(text || "").slice(0, 700), mode }) }); } catch {}
  }
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
          body: JSON.stringify({ text, lang }),
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
      {(!rated || rated === "up") && <button aria-label={t("rateUp")} title={t("rateUp")} className={rated === "up" ? "on" : ""} disabled={!!rated} onClick={() => rate("up")}><Svg d={Icon.thumbUp} size={16} /></button>}
      {(!rated || rated === "down") && <button aria-label={t("rateDown")} title={t("rateDown")} className={rated === "down" ? "on" : ""} disabled={!!rated} onClick={() => rate("down")}><Svg d={Icon.thumbDown} size={16} /></button>}
      {rated && <span className="rate-thanks" role="status">{t("rateThanks")}</span>}
      {exportName && (
        <button aria-label={t("exportSummary")} title={t("exportSummary")} className="export-btn" onClick={() => downloadText(exportName, text)}>
          <Svg d={Icon.zip} size={16} /> <span>{t("exportSummary")}</span>
        </button>
      )}
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

// ☁️ Cloud database of a project: turn it on, see how many records it has, set the app's admin password.
function CloudSheet({ site, token, onEnable, onClose }) {
  const { t } = useLang();
  const [info, setInfo] = useState(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const api = async (body) => {
    const r = await fetch("/api/appdata", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "db");
    return j;
  };
  useEffect(() => { if (site) api({ a: "info", site }).then(setInfo).catch(() => {}); }, [site]);
  const savePw = async (value) => {
    setBusy("pw"); setMsg("");
    try { const j = await api({ a: "setpw", site, password: value }); setInfo((x) => ({ ...(x || {}), hasPassword: j.hasPassword })); setPw(""); setMsg(t("cloudSaved")); }
    catch { setMsg(t("errAi")); }
    setBusy("");
  };
  return (
    <Sheet label={t("cloudTitle")} onClose={onClose}>
      <h3>☁️ {t("cloudTitle")}</h3>
      {!site ? (
        <>
          <p className="muted">{t("cloudOff")}</p>
          <button className="gold-btn" disabled={!!busy} onClick={async () => { setBusy("on"); setMsg(""); const err = await onEnable(); if (err) setMsg(t(err === "no_table" ? "cloudErrTable" : err === "too_many" ? "cloudErrMany" : "errAi")); setBusy(""); }}>
            {busy === "on" ? <span className="mini-spin" /> : "☁️"} {t("cloudEnable")}
          </button>
        </>
      ) : (
        <>
          <p className="cloud-on">✅ {t("cloudOn")}</p>
          {info && <p className="muted">{t("cloudRows").replace("{n}", info.rows ?? 0)} · {info.hasPassword ? "🔒 " + t("cloudHasPw") : "🔓 " + t("cloudNoPw")}</p>}
          <label className="house-label">{t("cloudPw")}
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" autoComplete="new-password" />
          </label>
          <small className="muted">{t("cloudPwHint")}</small>
          <div className="cloud-row">
            <button className="gold-btn" disabled={!pw.trim() || !!busy} onClick={() => savePw(pw.trim())}>{busy === "pw" ? <span className="mini-spin" /> : "🔒"} {t("cloudPwSave")}</button>
            {info?.hasPassword && <button className="ghost-btn" disabled={!!busy} onClick={() => savePw("")}>{t("cloudPwRemove")}</button>}
          </div>
        </>
      )}
      {msg && <p className="cloud-msg" role="status">{msg}</p>}
    </Sheet>
  );
}

// "∞" for the owner, the time the wait ends, or the questions left.
// "Install on this computer": Chrome/Edge give us an install prompt; Safari/Firefox get instructions.
function useInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone) setInstalled(true);
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onDone = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onDone);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onDone); };
  }, []);
  const install = async () => {
    if (!prompt) return false;
    prompt.prompt();
    const r = await prompt.userChoice.catch(() => null);
    if (r?.outcome === "accepted") setInstalled(true);
    setPrompt(null);
    return true;
  };
  return { canPrompt: !!prompt, installed, install };
}

// "Put AHM AI on my screen": one tap where the browser allows it; otherwise clear steps for this device.
function browserKind() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return /CriOS/.test(ua) ? "ios-chrome" : /FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/.test(ua)) return "android";
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua) ? "mac-safari" : "pc";
}
function InstallGuide({ onClose }) {
  const { t } = useLang();
  const kind = browserKind();
  const steps = {
    "ios-safari": [t("a2Ios1"), t("a2Ios2"), t("a2Ios3")],
    "ios-chrome": [t("a2IosC1"), t("a2Ios2"), t("a2Ios3")],
    "ios-other": [t("a2IosO1"), t("a2Ios1"), t("a2Ios2"), t("a2Ios3")],
    android: [t("a2And1"), t("a2And2"), t("a2And3")],
    "mac-safari": [t("a2Mac1"), t("a2Mac2")],
    pc: [t("a2Pc1"), t("a2Pc2"), t("a2Pc3")],
  }[kind];
  return (
    <Sheet label={t("addToScreen")} onClose={onClose}>
      {kind === "ios-chrome" && <div className="a2-arrow up" aria-hidden="true">⬆️</div>}
      <div className="a2-hero">
        <div className="a2-phone">
          <div className="a2-grid">
            {["#7fb3ff", "#ffd36b", "#9be59b", "#ff9d9d", "#c7a6ff"].map((c, i) => <i key={i} style={{ background: c }} />)}
            <span className="a2-app"><img src="/apple-touch-icon.png" alt="" /><small>AHM AI</small></span>
          </div>
        </div>
      </div>
      <h3>📲 {t("addToScreen")}</h3>
      <p className="muted">{t("a2Why")}</p>
      <ol className="a2-steps">{steps.map((x, i) => <li key={i}><b>{i + 1}</b><span>{x}</span></li>)}</ol>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
      {kind === "ios-safari" && <div className="a2-arrow down" aria-hidden="true">⬇️</div>}
    </Sheet>
  );
}

function InstallHelp({ onClose }) {
  const { t } = useLang();
  return (
    <Sheet label={t("installPc")} onClose={onClose}>
      <h3>🖥️ {t("installPc")}</h3>
      <p className="muted">{t("installWhy")}</p>
      <ol className="install-steps">
        <li><b>Chrome / Edge (Windows, Mac):</b> {t("installChrome")}</li>
        <li><b>Safari (Mac):</b> {t("installSafari")}</li>
      </ol>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function usageText(me, t) {
  if (!me) return "";
  if (me.unlimited) return "∞";
  if (me.lockedUntil && new Date(me.lockedUntil) > new Date()) return "⏳ " + fmtWhen(me.lockedUntil);
  return `${me.left ?? Math.max(0, me.limit - me.used)} ${t("left")}`;
}
const fmtClock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
// Time today, or day + time when it is more than a day away (weekly limit).
const fmtWhen = (iso) => (new Date(iso) - Date.now() > 20 * 3600e3
  ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + fmtClock(iso)
  : fmtClock(iso));
const fmtLeft = (iso, t) => {
  const ms = Math.max(0, new Date(iso) - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 3600e3), m = Math.ceil((ms % 3600e3) / 60000);
  return d > 0 ? `${d} ${t("daysShort")} ${h} ${t("hours")}` : h > 0 ? `${h} ${t("hours")} ${m} ${t("minutes")}` : `${m} ${t("minutes")}`;
};

// Two bars like Claude: this window (5 hours) and this week.
function UsageBars({ me }) {
  const { t } = useLang();
  if (!me || me.unlimited) return null;
  const row = (label, used, limit, reset) => {
    const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
    return (
      <div className="ub-row">
        <div className="ub-head"><span>{label}</span><b dir="ltr">{Math.min(used, limit)} / {limit}</b></div>
        <div className="ub-bar"><i style={{ width: pct + "%" }} className={pct >= 100 ? "full" : pct >= 80 ? "high" : ""} /></div>
        {reset && used > 0 && <div className="ub-reset">🔄 {t("resetsIn").replace("{t}", fmtLeft(reset, t))}</div>}
      </div>
    );
  };
  return (
    <div className="usage-bars">
      {row(t("thisWindow").replace("{h}", me.windowHours || 5), me.used || 0, me.limit, me.resetAt)}
      {me.weekLimit && row(t("thisWeek"), me.weekUsed || 0, me.weekLimit, me.weekResetAt)}
      {me.bonus > 0 && <div className="ub-reset">🎁 {t("bonusLeft").replace("{n}", me.bonus)}</div>}
    </div>
  );
}

function WaitBox({ until }) {
  const { t } = useLang();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const ms = new Date(until) - now;
  if (ms <= 0) return null;
  return (
    <div className="wait-box" role="status">
      <div className="wait-time">⏳ {fmtLeft(until, t)}</div>
      <div className="muted">{t("waitUntil")} <b dir="ltr">{fmtWhen(until)}</b></div>
    </div>
  );
}

function Upgrade({ reason, me, onClose, onEdit, onNotice, onRelease }) {
  const { t } = useLang();
  const text = { limit: t("upLimit"), pro_only: t("upPro"), info: t("upInfo"), voice: t("upVoice") }[reason] || "";
  const plans = me?.plans || DEFAULT_SETTINGS;
  const [sel, setSel] = useState(() => (plans.paid.find((p) => p.id === me?.plan) || plans.paid.find((p) => p.best) || plans.paid[0])?.id);
  const chosen = plans.paid.find((p) => p.id === sel);
  const buyUrl = BOT_URL && chosen ? `${BOT_URL}?start=${encodeURIComponent(chosen.id)}` : BOT_URL;
  return (
    <Sheet label={t("plans")} onClose={onClose}>
      <h3>{t("plans")} <span className="gold brand-font">AHM AI</span></h3>
      {me?.owner && <OwnerTools onPlans={onEdit} onNotice={onNotice} onRelease={onRelease} />}
      {me?.lockedUntil ? <WaitBox until={me.lockedUntil} /> : null}
      <p>{me?.lockedUntil ? t(me.lockReason === "week" ? "upWaitWeek" : "upWait").replace("{h}", me.windowHours || 5) : text}</p>
      <UsageBars me={me} />
      <div className="plans">
        <div className={"plan" + (!me?.pro ? " current" : "")}>
          <div className="plan-price">{t("free")}</div>
          <div className="plan-limit"><b>{plans.freeLimit}</b> {t("perWindow").replace("{h}", plans.windowHours || 5)}</div>
          <div className="plan-week"><b>{plans.freeWeekly ?? plans.freeLimit * 4}</b> {t("perWeek")}</div>
          <div className="plan-voice">🎤 <b>{plans.freeVoice ?? 10}</b> {t("voiceMin")}</div>
          <div className="plan-model">⚡ {t("modelFast")}</div>
          {!me?.pro && <div className="plan-tag">{t("currentPlan")}</div>}
        </div>
        {plans.paid.map((p) => (
          <button key={p.id} type="button" aria-pressed={sel === p.id} onClick={() => setSel(p.id)}
            className={"plan pick" + (sel === p.id ? " sel" : "") + (me?.plan === p.id ? " current" : "")}>
            {p.best && <div className="plan-ribbon">{t("best")}</div>}
            <span className="plan-check" aria-hidden="true">{sel === p.id ? "✓" : ""}</span>
            <div className="plan-name">{p.name}</div>
            <div className="plan-price"><span dir="ltr">${p.price}</span><small> / {p.days} {t("days")}</small></div>
            <div className="plan-limit"><b>{p.limit}</b> {t("perWindow").replace("{h}", plans.windowHours || 5)}</div>
            <div className="plan-week"><b>{p.weekly ?? p.limit * 4}</b> {t("perWeek")}</div>
            <div className="plan-voice">🎤 <b>{p.voice ?? 60}</b> {t("voiceMin")}</div>
            <div className="plan-model">🧠 {t("modelSmart")}</div>
            {me?.plan === p.id && <div className="plan-tag">{t("currentPlan")}</div>}
          </button>
        ))}
      </div>
      {plans.payment && <p className="pay-info" dir="auto">💳 {plans.payment}</p>}
      {me?.voice?.limit != null && <p className="muted voice-today">🎤 {t("voiceToday").replace("{u}", Math.min(me.voice.used, me.voice.limit)).replace("{l}", me.voice.limit)}</p>}
      <Compare me={me} plans={plans} chosen={chosen} />
      <ul className="perks"><li>{t("windowInfo").replace("{h}", plans.windowHours || 5)}</li></ul>
      {buyUrl ? (
        <a className="gold-btn" href={buyUrl} target="_blank" rel="noreferrer">
          {chosen ? <>{t("buy")} {chosen.name} · <span dir="ltr">${chosen.price}</span></> : t("buyTelegram")}
        </a>
      ) : <p className="muted">{t("botSoon")}</p>}

      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

// Free vs Pro, side by side: questions, voice, model, pictures, presentations, files.
function Compare({ me, plans, chosen }) {
  const { t } = useLang();
  const x = me?.extras || { house: { free: 10, pro: 30 }, design: { free: 10, pro: 30 }, slides: { free: 10, pro: 30 } };
  const p = chosen || plans.paid.find((q) => q.best) || plans.paid[0];
  if (!p) return null;
  const h = plans.windowHours || 5;
  const total = (n) => t("cmpTotal").replace("{n}", n), daily = (n) => t("cmpDaily").replace("{n}", n);
  const rows = [
    [t("cmpQ").replace("{h}", h), plans.freeLimit, p.limit],
    [t("cmpWeek"), plans.freeWeekly ?? plans.freeLimit * 4, p.weekly ?? p.limit * 4],
    [t("cmpVoice"), plans.freeVoice ?? 10, p.voice ?? 60],
    [t("cmpModel"), t("cmpFast"), t("cmpSmart")],
    [t("cmpHouse"), total(x.house.free), daily(x.house.pro)],
    [t("cmpDesign"), total(x.design.free), daily(x.design.pro)],
    [t("cmpSlides"), total(x.slides.free), daily(x.slides.pro)],
    [t("cmpFiles"), "—", "✓"],
    [t("cmpLine"), "—", "✓"],
  ];
  return (
    <div className="cmp">
      <div className="cmp-title">{t("cmpTitle")}</div>
      <table>
        <thead><tr><th /><th>{t("cmpFree")}</th><th className="pro">{p.name}</th></tr></thead>
        <tbody>{rows.map(([label, a, b]) => <tr key={label}><td>{label}</td><td><bdi>{a}</bdi></td><td className="pro"><bdi>{b}</bdi></td></tr>)}</tbody>
      </table>
      <p className="cmp-note">{t("cmpNote")}</p>
    </div>
  );
}

const THEME_COLOR = { a: "#08080a", b: "#f7f9f6", c: "#070d1f", d: "#07080b" };
function currentTheme() {
  if (typeof document === "undefined") return "d";
  const t = document.documentElement.getAttribute("data-theme");
  return ["a", "b", "c"].includes(t) ? t : "d";
}
function ThemePicker() {
  const { t } = useLang();
  const [cur, setCur] = useState("d");
  useEffect(() => setCur(currentTheme()), []);
  function choose(k) {
    document.documentElement.setAttribute("data-theme", k);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[k]);
    try { localStorage.setItem("ahm-theme", k); } catch {}
    setCur(k);
  }
  return (
    <div className="theme-picks" role="radiogroup" aria-label={t("design")}>
      {["d", "b", "a", "c"].map((k) => (
        <button key={k} type="button" role="radio" aria-checked={cur === k} className={"theme-pick" + (cur === k ? " on" : "")} onClick={() => choose(k)}>
          <i className={"t-" + k} aria-hidden="true" /><span>{t("theme_" + k)}</span>
        </button>
      ))}
    </div>
  );
}

// Settings: a panel that slides out like the menu. A list of big buttons; each one opens its own part.
function Settings({ session, me, onClose, onPlans, onPassword, update, inst, onInstallGuide, onAbout, push }) {
  const { t, lang } = useLang();
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shut, setShut] = useState(false);
  const close = () => { setShut(true); setTimeout(onClose, 220); };
  const chev = "›"; // flips by itself in Kurdish / Arabic
  const theme = typeof document !== "undefined" ? currentTheme() : "d";
  const planName = me ? (me.unlimited ? (me.vip ? "♾️ VIP" : "👑 Owner") : me.pro ? `⭐ ${me.planName}` : t("free")) : "";
  const Row = ({ icon, label, value, onClick, cls = "", disabled }) => (
    <button className={"set-row set-btn " + cls} disabled={disabled} onClick={onClick}>
      <div className="set-label"><span className="set-ri" aria-hidden="true">{icon}</span> {label}</div>
      <div className="set-val">{value ?? chev}</div>
    </button>
  );
  const PARTS = [
    ["plan", "⭐", "g-gold", t("plans"), planName],
    ["account", "👤", "g-blue", t("setAccount").replace(/^\S+\s/, ""), ""],
    ["lang", "🌐", "g-teal", t("language"), LANGS.find((l) => l.id === lang)?.name],
    ["look", "🎨", "g-pink", t("design"), t("theme_" + theme)],
    ["notify", "🔔", "g-orange", t("notifyTitle").replace(/^\S+\s/, ""), push?.state === "on" ? t("notifyActive") : ""],
    ["app", "📲", "g-green", t("setAppSec").replace(/^\S+\s/, ""), update ? t("updateNew") : ""],
    ["about", "ℹ️", "g-violet", t("setAboutSec").replace(/^\S+\s/, ""), ""],
  ];
  const cur = PARTS.find((x) => x[0] === part);
  return (
    <div className={"set-drawer-bg" + (shut ? " shut" : "")} onClick={close}>
      <aside className={"set-drawer" + (shut ? " shut" : "")} dir={lang === "en" ? "ltr" : "rtl"} role="dialog" aria-label={t("settings")} onClick={(e) => e.stopPropagation()}>
        <div className="sd-head">
          {part ? (
            <button className="sd-back" onClick={() => setPart(null)} aria-label={t("back")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : <span className="sd-gear" aria-hidden="true"><Svg d={Icon.gear} size={20} /></span>}
          <b>{cur ? cur[3] : t("settings")}</b>
          <button className="sd-x" onClick={close} aria-label={t("close")}><Svg d={Icon.close} size={18} /></button>
        </div>

        {!part ? (
          <div className="sd-body">
            <div className="sd-user">
              <span className="sd-avatar" aria-hidden="true">{(session.user.email || "?")[0].toUpperCase()}</span>
              <div><b dir="ltr">{session.user.email}</b><small>{planName} · {usageText(me, t)}</small></div>
            </div>
            <nav className="sd-menu">
              {PARTS.map(([k, ic, g, label, val]) => (
                <button key={k} className="sd-item" onClick={() => setPart(k)}>
                  <span className={"tile3d " + g} aria-hidden="true">{ic}</span>
                  <span className="sd-label">{label}</span>
                  {val ? <em className="sd-val">{val}</em> : null}
                  <span className="sd-chev" aria-hidden="true">{chev}</span>
                </button>
              ))}
            </nav>
            <button className="ghost-btn danger sd-logout" onClick={() => supabase.auth.signOut()}>
              <Svg d={Icon.logout} size={18} /> {t("logout")}
            </button>
          </div>
        ) : (
          <div className="sd-body sd-part" key={part}>
            {part === "plan" && me && (
              <>
                <button className="set-plan" onClick={onPlans}>
                  <div className="set-plan-top">
                    <span className="set-plan-name">{planName}</span>
                    <span className="set-plan-go">{t("plans")} {chev}</span>
                  </div>
                  <UsageBars me={me} />
                </button>
                <button className="gold-btn" onClick={onPlans}>⭐ {t("plans")}</button>
              </>
            )}
            {part === "account" && (
              <section className="set-card">
                <div className="set-row"><div className="set-label"><span className="set-ri" aria-hidden="true">✉️</span> {t("account")}</div><div className="set-val" dir="ltr">{session.user.email}</div></div>
                <Row icon="🔐" label={t("changePw")} onClick={onPassword} />
                <button className="ghost-btn danger" onClick={() => supabase.auth.signOut()}><Svg d={Icon.logout} size={18} /> {t("logout")}</button>
              </section>
            )}
            {part === "lang" && <section className="set-card"><div className="set-sub"><Svg d={Icon.globe} size={16} /> {t("language")}</div><LangPicker /></section>}
            {part === "look" && <section className="set-card"><div className="set-sub">🎨 {t("design")}</div><ThemePicker /></section>}
            {part === "notify" && (
              <section className="set-card">
                <Row icon="🔔" label={t("notifyOn")} disabled={push?.state === "busy" || push?.state === "unsupported"}
                  value={push?.state === "on" ? <em className="new-badge">{t("notifyActive")}</em> : push?.state === "busy" ? <span className="mini-spin" /> : chev}
                  onClick={() => (push?.state === "on" ? push.disable() : push?.state === "off" ? push.enable() : null)} />
                <p className="set-hint">{push?.state === "ios-install" ? t("notifyIos") : push?.state === "blocked" ? t("notifyBlocked") : push?.state === "unsupported" ? t("notifyNo") : t("notifyOnSub")}</p>
              </section>
            )}
            {part === "app" && (
              <section className="set-card">
                <Row icon="🔄" label={t("refreshApp")} cls={"refresh-row" + (update ? " new" : "")} disabled={loading}
                  value={loading ? <span className="mini-spin" /> : update ? <em className="new-badge">{t("updateNew")}</em> : chev}
                  onClick={() => { setLoading(true); refreshApp(); }} />
                <Row icon="📲" label={t("addToScreen")} cls={"a2-row" + (inst?.installed ? " done" : "")} disabled={inst?.installed}
                  value={inst?.installed ? <em className="new-badge">✓ {t("installedYes")}</em> : <span className="a2-go">{t("a2Tap")}</span>}
                  onClick={async () => { if (inst?.installed) return; if (await inst?.install?.()) return; onInstallGuide?.(); }} />
              </section>
            )}
            {part === "about" && (
              <section className="set-card">
                <Row icon="👨‍💻" label={t("aboutDev")} cls="about-row" onClick={onAbout} />
                <div className="set-legal"><a href="/privacy" target="_blank" rel="noreferrer">{t("privacy")}</a><a href="/terms" target="_blank" rel="noreferrer">{t("terms")}</a></div>
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------------- About the developer ---------------- */
const intlPhone = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("964") ? d : d.startsWith("0") ? "964" + d.slice(1) : d; };
function AboutDev({ me, onClose, onEdit }) {
  const { t, lang } = useLang();
  const [a, setA] = useState(null);
  useEffect(() => { fetch("/api/about").then((r) => r.json()).then(setA).catch(() => setA({ error: true })); }, []);
  const L = (o) => o?.[lang] || o?.ckb || "";
  const num = intlPhone(a?.phone);
  return (
    <Sheet label={t("aboutDev")} onClose={onClose}>
      {!a ? <p className="muted">…</p> : a.error ? <p className="pe-msg">⚠️ {t("errNetwork")}</p> : (
        <div className="about">
          <div className="about-head">
            <div className="about-avatar" aria-hidden="true"><img src="/icon-192.png" alt="" /></div>
            <div>
              <div className="about-name">{L(a.nameLocal) || a.name}</div>
              <div className="about-role">{L(a.role)}</div>
            </div>
          </div>
          <div className="about-made">✨ {t("aboutMade")}</div>
          <p className="about-bio" dir={lang === "en" ? "ltr" : "rtl"}>{L(a.bio)}</p>
          {a.phone && (
            <div className="about-contact">
              {a.whatsapp && <a className="about-btn wa" href={`https://wa.me/${num}`} target="_blank" rel="noreferrer">💬 {t("whatsapp")}</a>}
              <a className="about-btn call" href={`tel:+${num}`}>📞 {t("callMe")}</a>
              <div className="about-num" dir="ltr">{a.phone}</div>
            </div>
          )}
        </div>
      )}
      {me?.owner && a && !a.error && <button className="gold-btn" onClick={() => onEdit(a)}>✏️ {t("aboutEdit")}</button>}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

// Owner only: change the name, title, phone and text (in 3 languages).
function AboutEditor({ data, token, onClose, onSaved }) {
  const { t } = useLang();
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(data)));
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const set3 = (k, l, v) => setF((x) => ({ ...x, [k]: { ...x[k], [l]: v } }));
  async function translate() {
    setBusy("tr"); setMsg("");
    try {
      const go = async (txt) => { const r = await fetch("/api/admin/notice", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ translate: txt }) }); if (!r.ok) throw new Error(); return r.json(); };
      const [bio, role, name] = await Promise.all([go(f.bio.ckb), go(f.role.ckb), go(f.nameLocal.ckb)]);
      setF((x) => ({ ...x, bio: { ...x.bio, ar: bio.ar, en: bio.en }, role: { ...x.role, ar: role.ar, en: role.en }, nameLocal: { ...x.nameLocal, ar: name.ar, en: name.en } }));
      setMsg("✅ " + t("aboutTranslated"));
    } catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy("");
  }
  async function save() {
    setBusy("save"); setMsg("");
    try {
      const r = await fetch("/api/admin/about", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify(f) });
      if (!r.ok) throw new Error();
      setF(await r.json()); setMsg("✅ " + t("saved")); onSaved?.();
    } catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy("");
  }
  const LANGS3 = [["ckb", "کوردی", "rtl"], ["ar", "العربية", "rtl"], ["en", "English", "ltr"]];
  return (
    <Sheet label={t("aboutEdit")} onClose={onClose}>
      <h3>✏️ {t("aboutEdit")}</h3>
      <p className="muted">{t("aboutEditHelp")}</p>
      <label className="notice-lang"><span>{t("aboutNameF")} (کوردی)</span><input className="notice-input" dir="rtl" value={f.nameLocal.ckb} onChange={(e) => set3("nameLocal", "ckb", e.target.value)} /></label>
      <label className="notice-lang"><span>{t("aboutRoleF")} (کوردی)</span><input className="notice-input" dir="rtl" value={f.role.ckb} onChange={(e) => set3("role", "ckb", e.target.value)} /></label>
      <label className="notice-lang"><span>📞 {t("aboutPhoneF")}</span><input className="notice-input" dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
      <label className="about-check"><input type="checkbox" checked={!!f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.checked })} /> 💬 {t("aboutWaF")}</label>
      {LANGS3.map(([k, name, dir]) => (
        <label key={k} className="notice-lang"><span>{t("aboutBioF")} — {name}</span><textarea rows={k === "ckb" ? 8 : 5} dir={dir} value={f.bio[k] || ""} onChange={(e) => set3("bio", k, e.target.value)} /></label>
      ))}
      <button className="ghost-btn" disabled={!!busy} onClick={translate}>{busy === "tr" ? <span className="mini-spin" /> : "🌐"} {t("aboutTranslate")}</button>
      {msg && <p className="pe-msg">{msg}</p>}
      <button className="gold-btn" disabled={!!busy} onClick={save}>{busy === "save" ? <span className="mini-spin" /> : "💾"} {t("save")}</button>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

/* ---------------- Owner only: release new versions (the "Update" button) ---------------- */
const fmtDT = (ms) => (ms ? new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "");
function ReleaseSheet({ token, onClose, onChanged }) {
  const { t } = useLang();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const load = async () => {
    try {
      const r = await fetch("/api/admin/release", { headers: { Authorization: "Bearer " + (await token()) }, cache: "no-store" });
      setD(await r.json());
    } catch { setD({ error: "net" }); }
  };
  useEffect(() => { load(); }, []);
  async function go(id, back) {
    if (!confirm(back ? t("relBackQ") : t("relGoQ"))) return;
    setBusy(id); setMsg("");
    try {
      const r = await fetch("/api/admin/release", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ deploymentId: id }) });
      if (!r.ok) throw new Error();
      setMsg("✅ " + t(back ? "relBackDone" : "relDone"));
      onChanged?.();
      setTimeout(load, 2500);
    } catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy("");
  }
  return (
    <Sheet label={t("releaseBtn")} onClose={onClose}>
      <h3>🚀 {t("releaseBtn")}</h3>
      <p className="muted">{t("relHelp")}</p>
      {!d ? <p className="muted"><span className="mini-spin" /> …</p>
        : d.configured === false ? (
          <div className="rel-setup">
            <b>⚙️ {t("relSetupTitle")}</b>
            <ol>{[t("relSetup1"), t("relSetup2"), t("relSetup3")].map((x, i) => <li key={i}>{x}</li>)}</ol>
          </div>
        ) : d.error ? <p className="pe-msg">⚠️ {d.error === "token" ? t("relTokenBad") : t("errGeneric")}</p> : (
          <>
            <div className="rel-card live">
              <div className="rel-tag">✅ {t("relLive")}</div>
              <div className="rel-msg" dir="ltr">{d.live?.message || "—"}</div>
              <div className="rel-meta" dir="ltr">{fmtDT(d.live?.created)}{d.live?.sha ? " · " + d.live.sha : ""}</div>
            </div>
            {d.next ? (
              <div className="rel-card next">
                <div className="rel-tag">🆕 {t("relNew")}{d.newerCount > 1 ? ` (+${d.newerCount - 1})` : ""}</div>
                <div className="rel-msg" dir="ltr">{d.next.message || "—"}</div>
                <div className="rel-meta" dir="ltr">{fmtDT(d.next.created)}{d.next.sha ? " · " + d.next.sha : ""}</div>
                {d.next.url && <a className="ghost-btn rel-preview" href={d.next.url} target="_blank" rel="noreferrer">👀 {t("relPreview")}</a>}
                <button className="rel-go" disabled={!!busy} onClick={() => go(d.next.id, false)}>
                  {busy === d.next.id ? <span className="mini-spin" /> : "🚀"} {t("releaseBtn")}
                </button>
              </div>
            ) : d.building ? <p className="rel-note">⏳ {t("relBuilding")}</p> : <p className="rel-note">✅ {t("relNone")}</p>}
            {d.older?.length > 0 && (
              <details className="rel-older">
                <summary>↩️ {t("relOlder")}</summary>
                {d.older.map((v) => (
                  <div key={v.id} className="rel-row">
                    <span dir="ltr">{fmtDT(v.created)} · {v.message || v.sha}</span>
                    <button className="ghost-btn" disabled={!!busy} onClick={() => go(v.id, true)}>{busy === v.id ? <span className="mini-spin" /> : t("relBack")}</button>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
      {msg && <p className="pe-msg">{msg}</p>}
      <button className="ghost-btn" onClick={() => { setD(null); load(); }}>🔍 {t("relCheck")}</button>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

/* ---------------- Owner only: tools, announcements ---------------- */
// Two big buttons the owner sees (never shown to other users).
function OwnerTools({ onPlans, onNotice, onRelease, releaseReady }) {
  const { t } = useLang();
  return (
    <div className="owner-tools">
      {onRelease && <button className={"rel-tool" + (releaseReady ? " ready" : "")} onClick={onRelease}>🚀 {t("releaseBtn")}{releaseReady && <em className="new-badge">{t("updateNew")}</em>}</button>}
      <button onClick={onPlans}>✏️ {t("editPlans")}</button>
      <button onClick={onNotice}>📢 {t("noticeBtn")}</button>
    </div>
  );
}

// The owner writes in Kurdish → it is translated → sent to everyone (each sees their app language).
function NoticeComposer({ token, onClose, onSent }) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [tr, setTr] = useState(null); // { ckb, ar, en }
  const [cur, setCur] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const call = async (body, method = "POST") => {
    const res = await fetch("/api/admin/notice", { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: method === "POST" ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "err");
    return j;
  };
  useEffect(() => { call(null, "GET").then((j) => setCur(j.notice)).catch(() => {}); }, []);
  async function translate() {
    setBusy("tr"); setMsg("");
    try { setTr(await call({ translate: text })); } catch (e) { setMsg("⚠️ " + (e.message === "busy" ? t("errBusy") : t("errGeneric"))); }
    setBusy("");
  }
  async function publish() {
    setBusy("send"); setMsg("");
    try { const j = await call({ publish: tr }); setCur(j.notice); setTr(null); setText(""); setMsg("✅ " + t("noticeSent")); onSent?.(); }
    catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy("");
  }
  async function clear() {
    if (!confirm(t("noticeClearQ"))) return;
    setBusy("clear");
    try { await call({ clear: true }); setCur(null); setMsg("✅ " + t("noticeCleared")); onSent?.(); } catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy("");
  }
  const L = [["ckb", "کوردی"], ["ar", "العربية"], ["en", "English"]];
  return (
    <Sheet label={t("noticeBtn")} onClose={onClose}>
      <h3>📢 {t("noticeBtn")}</h3>
      <p className="muted">{t("noticeHelp")}</p>
      {cur && (
        <div className="notice-cur">
          <div className="notice-cur-head">{t("noticeNow")}</div>
          <p dir="rtl">{cur.text?.ckb}</p>
          <button className="ghost-btn danger" disabled={!!busy} onClick={clear}>🗑️ {t("noticeClear")}</button>
        </div>
      )}
      {!tr ? (
        <>
          <textarea className="notice-input" rows={5} dir="rtl" placeholder={t("noticePh")} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="gold-btn" disabled={!text.trim() || !!busy} onClick={translate}>{busy === "tr" ? <span className="mini-spin" /> : "🌐"} {t("noticeTranslate")}</button>
        </>
      ) : (
        <>
          <p className="muted">{t("noticeCheck")}</p>
          {L.map(([k, name]) => (
            <label key={k} className="notice-lang">
              <span>{name}</span>
              <textarea rows={3} dir={k === "en" ? "ltr" : "rtl"} value={tr[k] || ""} onChange={(e) => setTr({ ...tr, [k]: e.target.value })} />
            </label>
          ))}
          <button className="gold-btn" disabled={!tr.ckb?.trim() || !!busy} onClick={publish}>{busy === "send" ? <span className="mini-spin" /> : "📢"} {t("noticeSend")}</button>
          <button className="ghost-btn" disabled={!!busy} onClick={() => setTr(null)}>✏️ {t("noticeBack")}</button>
        </>
      )}
      {msg && <p className="pe-msg">{msg}</p>}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

// What every user sees: the owner's announcement in their own app language, until they close it.
function NoticeBar({ notice }) {
  const { t, lang } = useLang();
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem("ahm-notice-seen") === notice?.id); } catch { setHidden(false); } }, [notice?.id]);
  if (!notice?.id || hidden) return null;
  const text = notice.text?.[lang] || notice.text?.ckb || "";
  if (!text) return null;
  const close = () => { try { localStorage.setItem("ahm-notice-seen", notice.id); } catch {} setHidden(true); };
  return (
    <div className="notice-bar" role="status">
      <span className="notice-ic" aria-hidden="true">📢</span>
      <div className="notice-body" dir={lang === "en" ? "ltr" : "rtl"}>
        <b>{t("noticeFrom")}</b>
        <p>{text}</p>
      </div>
      <button className="notice-x" aria-label={t("close")} onClick={close}>×</button>
    </div>
  );
}

function Dashboard({ token, onClose, onPlans, onNotice, onRelease }) {
  const { t, lang } = useLang();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [tip, setTip] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { headers: { Authorization: "Bearer " + (await token()) } });
        if (res.ok) setD(await res.json()); else setErr(t("errGeneric"));
      } catch { setErr(t("errNetwork")); }
    })();
  }, []);
  const max = d ? Math.max(1, ...d.signups.map((x) => x.n)) : 1;
  const fmtDay = (k) => new Date(k + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : lang === "ar" ? "ar-IQ" : "ckb-IQ", { day: "numeric", month: "short" });
  const tiles = d ? [
    [t("dUsers"), d.users], [t("dNewToday"), d.newToday], [t("dNew7"), d.new7],
    [t("dPro"), d.pro], [t("dIncome"), "$" + d.income], [t("dQuestions"), d.questions.toLocaleString("en")],
    [t("dLive"), d.line ? `${d.line.active}/${d.line.slots} · ⏳${d.line.waiting}` : d.redis ? "0" : "—"],
  ] : [];
  return (
    <Sheet label={t("dashboard")} onClose={onClose}>
      <h3>📊 {t("dashboard")}</h3>
      {err && <p className="pe-msg">⚠️ {err}</p>}
      {!d && !err && <p className="muted">…</p>}
      {d && (
        <>
          <div className="db-tiles">
            {tiles.map(([label, val]) => <div key={label} className="db-tile"><b><bdi>{val}</bdi></b><span>{label}</span></div>)}
          </div>
          <div className="db-chart">
            <div className="db-chart-title">{t("dSignups")}</div>
            <div className="db-bars" dir="ltr" role="img" aria-label={t("dSignups")} onMouseLeave={() => setTip(null)}>
              {d.signups.map((x, i) => (
                <button key={x.day} type="button" className="db-bar-hit" onMouseEnter={() => setTip(i)} onFocus={() => setTip(i)} onClick={() => setTip(i)}
                  aria-label={`${fmtDay(x.day)}: ${x.n}`}>
                  <i className={"db-bar" + (tip === i ? " on" : "")} style={{ height: `${(x.n / max) * 100}%` }} />
                </button>
              ))}
              {tip != null && (
                <div className="db-tip" style={{ left: `${Math.min(88, Math.max(12, ((tip + 0.5) / d.signups.length) * 100))}%` }}>
                  <b>{d.signups[tip].n}</b> · {fmtDay(d.signups[tip].day)}
                </div>
              )}
            </div>
            <div className="db-axis" dir="ltr"><span>{fmtDay(d.signups[0].day)}</span><span>{fmtDay(d.signups[d.signups.length - 1].day)}</span></div>
          </div>
          <div className="db-list-title">{t("dRecent")}</div>
          <ul className="db-list">
            {d.recent.map((u) => (
              <li key={u.email}>
                <span dir="ltr" className="db-email">{u.email}</span>
                <span className="db-meta">{u.pro ? "⭐ " : ""}{u.q} {t("questions")} · {fmtDay(dayOf(u.created))}</span>
              </li>
            ))}
          </ul>
          {d.sites != null && <p className="muted">🌐 {t("dSites")}: {d.sites}</p>}
        </>
      )}
      <OwnerTools onPlans={onPlans} onNotice={onNotice} onRelease={onRelease} />
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}
const dayOf = (iso) => new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);

// Which device is this? (decides which steps we show first)
function deviceKind() {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "pc";
}

function Steps({ items }) {
  return <ol className="guide-steps">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>;
}

// After "Download ZIP": how to open the files on a computer.
function ZipGuide({ onClose }) {
  const { t } = useLang();
  const phone = deviceKind() !== "pc";
  return (
    <Sheet label={t("zipBtn")} onClose={onClose}>
      <h3>✅ {t("zipDone")}</h3>
      <div className="guide-card">
        <div className="guide-title">💻 {t("onComputer")}</div>
        <Steps items={[t("zipStep1"), t("zipStep2"), t("zipStep3")]} />
      </div>
      {phone && <p className="guide-note">📱 {t("zipPhoneNote")}</p>}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

// After "Add to screen": the app has its own link; show the steps for this device (others one tap away).
function ScreenGuide({ info, onClose }) {
  const { t } = useLang();
  const [dev, setDev] = useState(deviceKind());
  const steps = {
    ios: [t("scrOpen"), t("scrIos2"), t("scrIos3")],
    android: [t("scrOpen"), t("scrAnd2")],
    pc: [t("scrOpen"), t("scrPc2"), t("scrPc3")],
  };
  const names = { ios: "iPhone", android: "Android", pc: t("computer") };
  return (
    <Sheet label={t("screenBtn")} onClose={onClose}>
      <h3>📲 {t("screenBtn")}</h3>
      {info.error ? <p className="pe-msg">⚠️ {info.error}</p> : (
        <>
          <p className="muted">{t("scrIntro")}</p>
          <div className="seg small guide-tabs" role="tablist">
            {["ios", "android", "pc"].map((k) => (
              <button key={k} role="tab" aria-selected={dev === k} className={dev === k ? "on" : ""} onClick={() => setDev(k)}>{names[k]}</button>
            ))}
          </div>
          <div className="guide-card">
            <Steps items={steps[dev]} />
          </div>
          <a className="green-btn" href={info.url} target="_blank" rel="noreferrer">🚀 {t("scrOpenBtn")}</a>
          <div className="inv-link" dir="ltr">{info.url}</div>
          <p className="guide-note">💡 {t("scrNote")}</p>
        </>
      )}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function Published({ info, onClose }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(info.url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const share = async () => { try { await navigator.share({ title: "AHM AI", url: info.url }); } catch {} };
  return (
    <Sheet label={t("publish")} onClose={onClose}>
      <h3>🌐 {info.error ? t("publish") : info.updated ? t("siteUpdated") : t("sitePublished")}</h3>
      {info.error ? <p className="pe-msg">⚠️ {info.error}</p> : (
        <>
          <p className="muted">{t("siteHow")}</p>
          <div className="inv-link" dir="ltr">{info.url}</div>
          <div className="inv-actions">
            <a className="gold-btn" href={info.url} target="_blank" rel="noreferrer">{t("siteOpen")}</a>
            <button className="ghost-btn" onClick={typeof navigator !== "undefined" && navigator.share ? share : copy}>{copied ? "✓ " + t("copied") : t("inviteSend")}</button>
          </div>
        </>
      )}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function Invite({ token, onClose }) {
  const { t } = useLang();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/invite", { headers: { Authorization: "Bearer " + (await token()) } });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setInfo(data); else setErr(data.error === "no_table" ? t("inviteSoon") : t("errGeneric"));
      } catch { setErr(t("errNetwork")); }
    })();
  }, []);
  const link = info ? `${window.location.origin}/?ref=${info.code}` : "";
  const text = info ? t("inviteShareText").replace("{n}", info.perInvite) : "";
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }
  async function share() {
    try { await navigator.share({ title: "AHM AI", text, url: link }); } catch {}
  }
  return (
    <Sheet label={t("invite")} onClose={onClose}>
      <h3>🎁 {t("invite")}</h3>
      {err && <p className="pe-msg">{err}</p>}
      {!info && !err && <p className="muted">…</p>}
      {info && (
        <>
          <p className="muted">{t("inviteHow").replace(/\{n\}/g, info.perInvite)}</p>
          <div className="inv-link" dir="ltr">{link}</div>
          <div className="inv-actions">
            <button className="gold-btn" onClick={typeof navigator !== "undefined" && navigator.share ? share : copy}>{t("inviteSend")}</button>
            <button className="ghost-btn" onClick={copy}>{copied ? "✓ " + t("copied") : t("copyLink")}</button>
          </div>
          <div className="inv-stats">
            <div><b>{info.invites}</b><span>{t("inviteJoined")}</span></div>
            <div><b>{info.bonus}</b><span>{t("inviteBonusLeft")}</span></div>
          </div>
        </>
      )}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function ChangePassword({ onClose }) {
  const { t } = useLang();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg("⚠️ " + (/weak|at least|characters/i.test(error.message) ? t("errWeak") : /same|different/i.test(error.message) ? t("pwSame") : t("errGeneric")));
    else { setMsg("✅ " + t("pwChanged")); setPw(""); }
  }
  return (
    <Sheet label={t("changePw")} onClose={onClose}>
      <h3>🔐 {t("changePw")}</h3>
      <form onSubmit={save}>
        <label className="field">
          <span>{t("newPw")}</span>
          <div className="pw-wrap">
            <input type={show ? "text" : "password"} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete="new-password" />
            <button type="button" className="pw-eye" onClick={() => setShow(!show)}>{show ? t("hidePw") : t("showPw")}</button>
          </div>
        </label>
        {msg && <p className="pe-msg">{msg}</p>}
        <button type="submit" className="gold-btn" disabled={busy}>{busy ? "…" : t("save")}</button>
      </form>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function Feedback({ token, onClose }) {
  const { t } = useLang();
  const [kind, setKind] = useState("idea");
  const [text, setText] = useState("");
  const [state, setState] = useState(""); // "", "sending", "sent", "error"
  async function send() {
    if (text.trim().length < 2) return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({ kind, text }),
      });
      setState(res.ok ? "sent" : "error");
      if (res.ok) setText("");
    } catch { setState("error"); }
  }
  const kinds = [["idea", "💡", t("fbIdea")], ["critique", "📝", t("fbCritique")], ["bug", "🐞", t("fbBug")]];
  return (
    <Sheet label={t("feedback")} onClose={onClose}>
      <h3>💬 {t("feedback")}</h3>
      <p className="muted">{t("fbIntro")}</p>
      {state === "sent" ? (
        <div className="fb-done"><div className="fb-done-ic">✅</div><b>{t("fbThanks")}</b></div>
      ) : (
        <>
          <div className="fb-kinds" role="radiogroup">
            {kinds.map(([k, ic, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={"fb-kind" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>
                <span aria-hidden="true">{ic}</span> {label}
              </button>
            ))}
          </div>
          <textarea className="fb-text" rows={5} dir="auto" maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("fbPlaceholder")} />
          {state === "error" && <p className="pe-msg">⚠️ {t("errGeneric")}</p>}
          <button className="gold-btn" disabled={state === "sending" || text.trim().length < 2} onClick={send}>{state === "sending" ? "…" : t("fbSend")}</button>
        </>
      )}
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

function PlanEditor({ me, token, onSaved, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(me?.plans || DEFAULT_SETTINGS)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const setPlan = (i, k, v) => setForm((f) => ({ ...f, paid: f.paid.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const addPlan = () => setForm((f) => ({ ...f, paid: [...f.paid, { id: "p" + Date.now().toString(36), name: "Pro", price: 5, limit: 100, weekly: 400, days: 30, voice: 60 }] }));
  const delPlan = (i) => setForm((f) => ({ ...f, paid: f.paid.filter((_, j) => j !== i) }));
  async function save() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setMsg("✅ " + t("saved")); if (data.paid) setForm(data); onSaved(); }
      else setMsg(data.error === "no_table" ? "⚠️ " + t("noTable") : "⚠️ " + t("errGeneric"));
    } catch { setMsg("⚠️ " + t("errGeneric")); }
    setBusy(false);
  }
  return (
    <Sheet label={t("managePlans")} onClose={onClose}>
      <h3>⚙️ {t("managePlans")}</h3>
      <label className="pe-row">
        <span>⏱️ {t("windowField")}</span>
        <input type="number" inputMode="decimal" dir="ltr" value={form.windowHours ?? 5} onChange={(e) => setForm({ ...form, windowHours: e.target.value })} />
      </label>
      <label className="pe-row">
        <span>{t("freePerMonth").replace("{h}", form.windowHours || 5)}</span>
        <input type="number" inputMode="numeric" dir="ltr" value={form.freeLimit} onChange={(e) => setForm({ ...form, freeLimit: e.target.value })} />
      </label>
      <label className="pe-row">
        <span>{t("freeWeeklyField")}</span>
        <input type="number" inputMode="numeric" dir="ltr" value={form.freeWeekly ?? 60} onChange={(e) => setForm({ ...form, freeWeekly: e.target.value })} />
      </label>
      <label className="pe-row">
        <span>🎤 {t("freeVoiceField")}</span>
        <input type="number" inputMode="numeric" dir="ltr" value={form.freeVoice ?? 10} onChange={(e) => setForm({ ...form, freeVoice: e.target.value })} />
      </label>
      {form.paid.map((p, i) => (
        <div key={p.id} className="pe-card">
          <div className="pe-head">
            <input className="pe-name" dir="auto" value={p.name} onChange={(e) => setPlan(i, "name", e.target.value)} aria-label={t("planName")} />
            <button type="button" className={"pe-star" + (p.best ? " on" : "")} aria-pressed={!!p.best} title={t("best")}
              onClick={() => setForm((f) => ({ ...f, paid: f.paid.map((q, j) => ({ ...q, best: j === i ? !q.best : false })) }))}>★</button>
            <button className="side-del" aria-label={t("delete")} onClick={() => delPlan(i)}><Svg d={Icon.trash} size={16} /></button>
          </div>
          <div className="pe-grid">
            <label><span>{t("price")} $</span><input type="number" inputMode="decimal" dir="ltr" value={p.price} onChange={(e) => setPlan(i, "price", e.target.value)} /></label>
            <label><span>{t("perWindowShort").replace("{h}", form.windowHours || 5)}</span><input type="number" inputMode="numeric" dir="ltr" value={p.limit} onChange={(e) => setPlan(i, "limit", e.target.value)} /></label>
            <label><span>{t("perWeekShort")}</span><input type="number" inputMode="numeric" dir="ltr" value={p.weekly ?? p.limit * 4} onChange={(e) => setPlan(i, "weekly", e.target.value)} /></label>
            <label><span>{t("days")}</span><input type="number" inputMode="numeric" dir="ltr" value={p.days} onChange={(e) => setPlan(i, "days", e.target.value)} /></label>
            <label><span>🎤 {t("voiceMinShort")}</span><input type="number" inputMode="numeric" dir="ltr" value={p.voice ?? 60} onChange={(e) => setPlan(i, "voice", e.target.value)} /></label>
          </div>
        </div>
      ))}
      {form.paid.length < 8 && <button className="ghost-btn" onClick={addPlan}><Svg d={Icon.plus} size={16} /> {t("addPlan")}</button>}
      <label className="pe-row">
        <span>{t("inviteBonusField")}</span>
        <input type="number" inputMode="numeric" dir="ltr" value={form.inviteBonus ?? 10} onChange={(e) => setForm({ ...form, inviteBonus: e.target.value })} />
      </label>
      <label className="pe-row col">
        <span>{t("payInfo")}</span>
        <textarea rows={2} dir="auto" placeholder="FIB: 0770 …" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} />
      </label>
      {msg && <p className="pe-msg">{msg}</p>}
      <button className="gold-btn" disabled={busy} onClick={save}>{busy ? "…" : t("save")}</button>
      <button className="ghost-btn" onClick={onClose}>{t("close")}</button>
    </Sheet>
  );
}

/* ---------------- Sidebar (chat history) ---------------- */
function Sidebar({ open, chats, activeId, onPick, onNew, onDelete, onSettings, onClose, me, onLearn, learnOn, onFeedback, onInvite, onDashboard, onOwnerPlans, onNotice, onRelease, releaseReady, onRename }) {
  const { t } = useLang();
  const iconOf = { chat: Icon.chat, auto: Icon.chat, build: Icon.build, image: Icon.image, studio: Icon.image, construct: Icon.house };
  return (
    <>
      <div className={"side-bg" + (open ? " open" : "")} onClick={onClose} aria-hidden="true" />
      <aside className={"sidebar" + (open ? " open" : "")} aria-label={t("menu")}>
        <div className="side-top">
          <div className="brand"><img src="/icon-192.png" alt="" aria-hidden="true" /><span className="brand-name">AHM <b>AI</b></span></div>
          <button className="icon-btn sm side-x" aria-label={t("close")} onClick={onClose}><Svg d={Icon.close} size={18} /></button>
        </div>
        <button className="new-btn" onClick={() => onNew("auto")}><Svg d={Icon.plus} size={18} /> {t("newChat")}</button>
        <button className={"new-btn alt" + (learnOn ? " on" : "")} onClick={onLearn}><span className="tile3d sm g-teal" aria-hidden="true"><Svg d={Icon.learn} size={16} /></span> {t("learnLang")}</button>
        <div className="side-list">
          <div className="side-title">{t("recent")}</div>
          {!chats.length && <div className="side-empty">{t("noHistory")}</div>}
          {chats.map((c) => (
            <div key={c.id} className={"side-item" + (c.id === activeId && !learnOn ? " on" : "")}>
              <button className="side-pick" onClick={() => onPick(c.id)}>
                <Svg d={iconOf[c.mode] || Icon.chat} size={15} /><span dir="auto">{c.title || "…"}</span>
              </button>
              <button className="side-del side-ren" aria-label={t("renameChat")} title={t("renameChat")} onClick={() => onRename(c.id, c.title)}><Svg d={Icon.pen} size={15} /></button>
              <button className="side-del" aria-label={t("delete")} onClick={() => onDelete(c.id)}><Svg d={Icon.trash} size={15} /></button>
            </div>
          ))}
        </div>
        {me?.owner && <button className={"side-fb gift rel-side" + (releaseReady ? " ready" : "")} onClick={onRelease}><span className="tile3d sm g-orange" aria-hidden="true">🚀</span> <span>{t("releaseBtn")}</span>{releaseReady && <em className="new-badge">{t("updateNew")}</em>}</button>}
        {me?.owner && <button className="side-fb gift" onClick={onDashboard}><span className="tile3d sm g-blue" aria-hidden="true">📊</span> <span>{t("dashboard")}</span></button>}
        {me?.owner && <button className="side-fb gift" onClick={onOwnerPlans}><span className="tile3d sm g-gold" aria-hidden="true">✏️</span> <span>{t("editPlans")}</span></button>}
        {me?.owner && <button className="side-fb gift" onClick={onNotice}><span className="tile3d sm g-pink" aria-hidden="true">📢</span> <span>{t("noticeBtn")}</span></button>}
        <button className="side-fb gift" onClick={onInvite}><span className="tile3d sm g-green" aria-hidden="true">🎁</span> <span>{t("invite")}</span></button>
        <button className="side-fb" onClick={onFeedback}><span className="tile3d sm g-violet" aria-hidden="true">💬</span> <span>{t("feedback")}</span></button>
        <button className="side-settings" onClick={onSettings}>
          <span className="tile3d sm g-slate" aria-hidden="true"><Svg d={Icon.gear} size={16} /></span> <span>{t("settings")}</span>
          {me && <em>{me.unlimited ? (me.vip ? "♾️ VIP" : "👑") : me.pro ? `⭐ ${me.planName}` : t("free")} · {usageText(me, t)}</em>}
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
// Website, phone app or management system? A first guess from the words; the user can change it.
const guessKind = (s) => /(سیستەم|سیستم|سيستم|نظام|system|داشبۆرد|dashboard|بەڕێوەبردن|إدارة|management|admin|کۆگا|مخزون|inventory|ژمێریاری|محاسب|accounting|pos\b|crm)/i.test(s || "") ? "system"
  : /(ئەپ|ئەپڵیکەیشن|ئاپ|تطبيق|\bapp\b|application|mobile app|مۆبایل)/i.test(s || "") ? "app" : "website";
const KINDS = [["website", "🌐"], ["app", "📱"], ["system", "🗂️"]];
const KIND_IC = { website: "🌐", app: "📱", system: "🗂️" };
const KindK = (k) => { const v = KIND_IC[k] ? k : "website"; return v[0].toUpperCase() + v.slice(1); };

// "📝 My plan": idea → plan → build, always visible at the top of a website / app / system page.
function PlanPanel({ step, planMsg, busy, onOwn, onBuild, onChange }) {
  const { t } = useLang();
  const [own, setOwn] = useState("");
  const [open, setOpen] = useState(step < 3);
  useEffect(() => { setOpen(step < 3); }, [step]);
  return (
    <section className={"plan-panel s" + step}>
      <button type="button" className="pp-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <b>{t("planTitle")}</b>
        <ol className="pp-steps">
          {["planStep1", "planStep2", "planStep3"].map((k, i) => <li key={k} className={i + 1 < step ? "done" : i + 1 === step ? "on" : ""}><em>{i + 1 < step ? "✓" : i + 1}</em>{t(k)}</li>)}
        </ol>
        <span className="pp-chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="pp-body">
          {step === 1 && (
            <>
              <p className="muted">{t("planOwnHelp")}</p>
              <textarea rows={4} value={own} dir="auto" onChange={(e) => setOwn(e.target.value.slice(0, 4000))} placeholder={t("planOwnPh")} />
              <button className="gold-btn" disabled={busy || !own.trim()} onClick={() => { onOwn(own.trim()); setOwn(""); }}>{t("planMake")}</button>
            </>
          )}
          {step >= 2 && planMsg && (
            <>
              <p className="pp-note">{step === 2 ? t("planReady") : t("planBuilt")}</p>
              {step === 2 && (
                <div className="plan-actions">
                  <button className="gold-btn" disabled={busy} onClick={onBuild}>{t("buildIt")}</button>
                  <button className="ghost-btn" disabled={busy} onClick={onChange}>{t("changePlan")}</button>
                </div>
              )}
              <details className="pp-view">
                <summary>{t("planView")}</summary>
                <div className="pp-md" dir="auto"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{planMsg.content}</ReactMarkdown></div>
              </details>
            </>
          )}
        </div>
      )}
    </section>
  );
}
const blank = (mode) => ({ id: newId(), mode, title: "", messages: [], project: {}, updated: Date.now() });

function Main({ session }) {
  const { t, lang, setLang } = useLang();
  const num = (x) => (lang === "en" ? String(x) : String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d])); // Kurdish / Arabic digits
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
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [housePlan, setHousePlan] = useState(null); // a plan picture sent from a construction answer
  useEffect(() => {
    const open = (e) => { setHousePlan(e.detail); setView("house"); setSideOpen(false); };
    window.addEventListener("ahm-house-plan", open);
    return () => window.removeEventListener("ahm-house-plan", open);
  }, []);
  const [sideOpen, setSideOpen] = useState(false);
  // desktop layout: hide the chat list, preview size (normal / max / min) and the preview width set by dragging
  const [sideHidden, setSideHidden] = useState(false);
  const [pvMode, setPvMode] = useState("normal");
  const [pvW, setPvW] = useState(0);
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef(null);
  useEffect(() => {
    try {
      setSideHidden(localStorage.getItem("ahm-side-hidden") === "1");
      const w = +localStorage.getItem("ahm-pv-w"); if (w > 0) setPvW(w);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("ahm-side-hidden", sideHidden ? "1" : "0"); } catch {} }, [sideHidden]);
  useEffect(() => { try { if (pvW) localStorage.setItem("ahm-pv-w", String(Math.round(pvW))); } catch {} }, [pvW]);
  function startDrag(e) {
    const body = bodyRef.current; if (!body) return;
    e.preventDefault();
    const rtl = getComputedStyle(body).direction === "rtl";
    setDragging(true);
    const move = (ev) => {
      const r = body.getBoundingClientRect();
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const w = rtl ? x - r.left : r.right - x;
      setPvW(Math.max(320, Math.min(r.width - 340, w)));
    };
    const up = () => { setDragging(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const inst = useInstall();
  const keys = useRef({});
  const [view, setView] = useState("chat"); // chat | learn
  const bottom = useRef(null);
  const ta = useRef(null);
  const fileInput = useRef(null);
  const zipInput = useRef(null);
  const docInput = useRef(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // { id, text } — sent once the new chat is ready
  const update = useUpdateReady();
  const push = usePush(token);
  const [askNotify, setAskNotify] = useState(() => { try { return localStorage.getItem("ahm-notify-ask") !== "no"; } catch { return true; } });
  const noAsk = () => { setAskNotify(false); try { localStorage.setItem("ahm-notify-ask", "no"); } catch {} };
  const liveJobs = useRef(new Set());  // answers this page is receiving right now
  const resuming = useRef(new Set());  // answers being fetched after the user came back
  const chatsRef = useRef([]);
  const [studioKind, setStudioKind] = useState("auto");
  const [studioRatio, setStudioRatio] = useState("square");
  const [hideUpdate, setHideUpdate] = useState(false);
  const [planEdit, setPlanEdit] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sendRef = useRef(null);
  const autoRef = useRef(null); // the automatic "make the missing files" step after a build
  const queueRef = useRef([]); // messages written while the AI was still working
  const [queued, setQueued] = useState([]);
  const busyRef = useRef(false);
  const designRef = useRef({}); // chat id → design pictures to copy (kept in memory only)
  const autoFixes = useRef(0); // automatic error fixes in a row (reset when the user writes)
  useEffect(() => { // "▶ Preview" on HTML code in an answer
    const show = (e) => { if (typeof e.detail === "string") setSheet({ type: "codePreview", html: buildPreview({ "index.html": e.detail }) }); };
    window.addEventListener("ahm-preview", show);
    return () => window.removeEventListener("ahm-preview", show);
  }, []);
  useEffect(() => { // "▶ Do it" on an AI suggestion
    const go = (e) => { if (typeof e.detail === "string" && e.detail.trim()) sendRef.current?.(e.detail.trim()); };
    window.addEventListener("ahm-suggest", go);
    return () => window.removeEventListener("ahm-suggest", go);
  }, []);
  const abortRef = useRef(null);

  const active = chats.find((c) => c.id === activeId) || draft;
  const mode = active.mode === "studio" || active.mode === "image" ? "chat" : active.mode; // old design chats open as normal chats
  const messages = active.messages;
  // Tell the server when the app goes to the background / comes back: a long build then goes on by itself
  // on the server, and a notification is sent when it is finished.
  useEffect(() => {
    const tell = () => {
      const away = document.visibilityState === "hidden";
      const ids = new Set(liveJobs.current);
      for (const c of chatsRef.current) for (const x of c.messages.slice(-2)) if (x.pending?.job) ids.add(x.pending.job);
      if (!ids.size) return;
      const data = JSON.stringify({ ids: [...ids].slice(0, 5), away });
      try { if (!(navigator.sendBeacon && navigator.sendBeacon("/api/job", new Blob([data], { type: "application/json" })))) fetch("/api/job", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {}); } catch {}
    };
    document.addEventListener("visibilitychange", tell);
    window.addEventListener("pagehide", tell);
    return () => { document.removeEventListener("visibilitychange", tell); window.removeEventListener("pagehide", tell); };
  }, []);
  // Errors in this app (not in the user's own projects) are reported to the owner, so they can be fixed quickly.
  useEffect(() => {
    let sent = 0;
    const report = (msg, where) => {
      msg = String(msg || "").slice(0, 300);
      if (!msg || sent >= 5 || /ResizeObserver|Script error|extension|chrome-extension|webkit-masked-url|NotAllowedError|AbortError|Load failed|Failed to fetch|NetworkError/i.test(msg + where)) return;
      sent++;
      try { fetch("/api/clienterr", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msg, where: String(where || "").slice(0, 200), ua: navigator.userAgent.slice(0, 120), ver: process.env.NEXT_PUBLIC_BUILD_ID || "" }) }).catch(() => {}); } catch {}
    };
    const onErr = (e) => { if (e.filename && !e.filename.startsWith(location.origin)) return; report(e.message, (e.filename || "").replace(location.origin, "") + ":" + (e.lineno || "")); };
    const onRej = (e) => { const r = e.reason; report(r?.message || r, (r?.stack || "").split("\n").slice(0, 2).join(" ").replace(location.origin, "")); };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);
  const [tplMore, setTplMore] = useState(false); // all fields in the template list
  const activeIdRef = useRef(null);
  activeIdRef.current = active.id;
  // an answer still being finished on the server (the connection broke, e.g. the app went to the background)
  const jobWait = messages.some((x) => x.role === "assistant" && x.pending?.job);
  const project = active.project || {};

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
  function showLimit(reason = "limit") {
    loadMe();
    setSheet({ type: "upgrade", reason });
  }
  const [gift, setGift] = useState(0);
  const [autoVoice, setAutoVoice] = useState(""); // "chatId:index" of a fresh voice reply that should start playing
  const [publishing, setPublishing] = useState(false);
  async function publishSite(next = "published") {
    if (typeof next !== "string") next = "published"; // called from a button click
    setPublishing(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({ files: project, id: active.siteId, title: active.title }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        if (data.id !== active.siteId) patch(active.id, (c) => ({ ...c, siteId: data.id }));
        pubRef.current[data.id] = JSON.stringify(project);
        setSheet({ type: next, url: `${window.location.origin}/s/${data.id}`, updated: !!data.updated });
      } else {
        setSheet({ type: "published", error: { no_table: t("inviteSoon"), too_big: t("siteTooBig"), too_many: t("siteTooMany") }[data.error] || t("errGeneric") });
      }
    } catch { setSheet({ type: "published", error: t("errNetwork") }); }
    setPublishing(false);
  }
  // A site that is already online follows the project: after the AI (or the user) changes it, the live link is updated quietly.
  const pubRef = useRef({});
  useEffect(() => {
    if (busy || jobWait || !active.siteId || !Object.keys(project).length) return;
    const key = active.siteId, sig = JSON.stringify(project);
    if (pubRef.current[key] === undefined) { pubRef.current[key] = sig; return; } // first look at this chat: nothing changed yet
    if (pubRef.current[key] === sig) return;
    const tm = setTimeout(async () => {
      try {
        const res = await fetch("/api/sites", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ files: project, id: key, title: active.title }) });
        if (res.ok) pubRef.current[key] = sig;
      } catch {}
    }, 2500);
    return () => clearTimeout(tm);
  }, [project, busy, jobWait, active.siteId]);
  async function claimInvite() {
    let ref = "";
    try { ref = localStorage.getItem("ahm-ref") || ""; } catch {}
    if (!ref) return;
    try {
      const res = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ code: ref }) });
      if (res.status >= 500 && res.status !== 501) return; // try again next time
      const data = await res.json().catch(() => ({}));
      try { localStorage.removeItem("ahm-ref"); } catch {}
      if (data.ok) { setGift(data.bonus); loadMe(); }
    } catch {}
  }
  useEffect(() => { claimInvite(); }, []);

  async function loadMe() {
    try {
      const res = await fetch("/api/me", { headers: { Authorization: "Bearer " + (await token()) } });
      if (res.ok) setMe(await res.json());
    } catch {}
  }

  // After a ZIP was opened: ask the AI to review and tidy the project (once the new chat is on screen).
  useEffect(() => {
    if (!pendingImport || busy || active.id !== pendingImport.id || !Object.keys(active.project || {}).length) return;
    const p = pendingImport;
    setPendingImport(null);
    send(p.text, [], [], "build");
  }, [pendingImport, active.id, busy]);

  // Fresh plan numbers and announcements when the app comes back to the screen (at most once a minute).
  const meAt = useRef(0);
  const [releaseReady, setReleaseReady] = useState(false);
  useEffect(() => {
    if (!me?.owner) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch("/api/admin/release", { headers: { Authorization: "Bearer " + (await token()) }, cache: "no-store" });
        const j = await r.json();
        if (!stop) setReleaseReady(!!j.next);
      } catch {}
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => { stop = true; clearInterval(id); };
  }, [me?.owner]);
  useEffect(() => {
    const onShow = () => { if (document.visibilityState === "visible" && Date.now() - meAt.current > 60000) { meAt.current = Date.now(); loadMe(); } };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

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

  // Saved on the phone a moment after the last change (not on every streamed word: writing all chats
  // many times a second made the app slow), and straight away when the app goes to the background.
  const chatsRef0 = useRef(chats);
  chatsRef0.current = chats;
  const saveLocal = () => {
    try {
      const slim = chatsRef0.current.slice(0, 60).map((c) => ({ ...c, messages: c.messages.map(({ fixed, ...m }, i, all) => slimStudio(i < all.length - 12 ? { ...m, thumbs: undefined } : m)).slice(-80) }));
      localStorage.setItem(storeKey, JSON.stringify(slim));
    } catch {}
  };
  useEffect(() => {
    if (!ready) return;
    const tm = setTimeout(saveLocal, 1200);
    return () => clearTimeout(tm);
  }, [chats, ready]);
  useEffect(() => {
    if (!ready) return;
    const flush = () => { if (document.visibilityState === "hidden") saveLocal(); };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", saveLocal);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", saveLocal); };
  }, [ready, storeKey]);

  // ---- chats saved on the account (same history on every device) ----
  const synced = useRef({});      // chat id → "updated" value the server already has
  const cloudOn = useRef(false);  // false until the first download worked (or if the table doesn't exist yet)
  const delKey = `ahm-deleted-${uid}`;
  const slimChat = (c) => ({ ...c, messages: c.messages.map(({ fixed, ...m }, i, all) => slimStudio(i < all.length - 12 ? { ...m, thumbs: undefined } : m)).slice(-80) });
  const readDeleted = () => { try { return JSON.parse(localStorage.getItem(delKey) || "[]"); } catch { return []; } };

  async function pullChats() {
    try {
      const res = await fetch("/api/chats", { headers: { Authorization: "Bearer " + (await token()) } });
      if (!res.ok) return;
      const { chats: remote } = await res.json();
      const gone = new Set(readDeleted().map((d) => d.id));
      setChats((local) => {
        const byId = new Map(local.map((c) => [c.id, c]));
        for (const r of remote || []) {
          synced.current[r.id] = r.updated;
          const mine = byId.get(r.id);
          if (r.deleted) { if (mine && mine.updated <= r.updated) byId.delete(r.id); continue; }
          if (gone.has(r.id) || !r.data?.messages) continue;
          if (!mine || r.updated > mine.updated) byId.set(r.id, { ...r.data, id: r.id, updated: r.updated });
        }
        return [...byId.values()].sort((a, b) => b.updated - a.updated);
      });
      cloudOn.current = true;
      setSyncTick((n) => n + 1);
    } catch {}
  }
  const [syncTick, setSyncTick] = useState(0);
  useEffect(() => { if (ready) pullChats(); }, [ready]);
  useEffect(() => { // check for changes from other devices when the app comes back to the front
    let last = Date.now();
    const onShow = () => { if (document.visibilityState === "visible" && Date.now() - last > 30000) { last = Date.now(); pullChats(); } };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);
  useEffect(() => { // upload changed chats a moment after the last change
    if (!ready || !cloudOn.current) return;
    const timer = setTimeout(async () => {
      const dirty = chats.filter((c) => c.messages.length && synced.current[c.id] !== c.updated).slice(0, 20);
      const deleted = readDeleted();
      if (!dirty.length && !deleted.length) return;
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
          body: JSON.stringify({ chats: dirty.map(slimChat), deleted }),
        });
        if (!res.ok) return;
        for (const c of dirty) synced.current[c.id] = c.updated;
        const sent = new Set(deleted.map((d) => d.id));
        try { localStorage.setItem(delKey, JSON.stringify(readDeleted().filter((d) => !sent.has(d.id)))); } catch {}
        if (chats.some((c) => c.messages.length && synced.current[c.id] !== c.updated)) setSyncTick((n) => n + 1); // more left
      } catch {}
    }, 2500);
    return () => clearTimeout(timer);
  }, [chats, ready, syncTick]);

  // follow the answer while it is written (instant while streaming — many smooth scrolls a second made phones stutter)
  const scrollRaf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: busy ? "auto" : "smooth", block: "end" }));
  }, [messages]);

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

  // Like patch, but only for a chat that still exists (answers arriving later must not create empty chats).
  // ---- the AI tests its own work (like a person would), then fixes what is broken — at most twice ----
  const reviewing = useRef(false);
  async function runReview(chatId, opts = {}) {
    reviewing.current = true;
    try {
      const c = chatsRef.current.find((x) => x.id === chatId);
      const files = c?.project || {};
      if (!Object.keys(files).some((f) => /\.html?$/i.test(f))) return;
      const mark = (check) => patchIf(chatId, (cc) => {
        const msgs = [...cc.messages];
        for (let k = msgs.length - 1; k >= 0; k--) if (msgs[k].role === "assistant") { msgs[k] = { ...msgs[k], check }; break; }
        return { ...cc, messages: msgs };
      });
      mark({ state: "run", i: 0, n: 0 });
      const res = await checkProject(files, { onPage: (i, n, p) => mark({ state: "run", i, n, p }) });
      // problems the code can't fix (no internet in the test, outside services) are left out
      const probs = res.problems.filter((p) => p.kind === "blank" || !/Failed to fetch|NetworkError|Load failed|net::|ERR_|CORS|fetch.*fail|googleapis|cdn|429|quota|login_needed|unauthori[sz]ed|\b40[13]\b|slow_down/i.test(p.text));
      if (!probs.length) { mark({ state: "ok", pages: res.pages, clicked: res.clicked, views: res.views || 0 }); return; }
      const canFix = (opts.checks || 0) < 2;
      mark({ state: canFix ? "fix" : "left", pages: res.pages, clicked: res.clicked, n: probs.length });
      if (!canFix || chatId !== activeIdRef.current) return;
      const list = probs.slice(0, 8).map((p) => `- ${p.page}: ${p.kind === "blank" ? t("chkBlank") : p.kind === "blankView" ? t("chkBlankView").replace("{v}", p.text) : p.kind === "login" ? t("chkLogin") : p.text}`).join("\n");
      setTimeout(() => autoRef.current?.(t("chkFixAsk").replace("{list}", list), 2, { checks: (opts.checks || 0) + 1 }), 400);
    } catch (e) { console.error("self-check", e); }
    finally { reviewing.current = false; }
  }
  function patchIf(id, fn) {
    setChats((list) => {
      const i = list.findIndex((c) => c.id === id);
      if (i === -1) return list;
      const next = [...list];
      next[i] = { ...fn(next[i]), updated: Date.now() };
      return next;
    });
  }
  chatsRef.current = chats;

  // When the app opens again (or comes back to the screen), collect answers that finished while away.
  useEffect(() => {
    if (!ready) return;
    const scan = () => {
      if (document.visibilityState === "hidden") return;
      for (const c of chatsRef.current) for (const x of c.messages) if (x.pending?.job && !liveJobs.current.has(x.pending.job)) resumeJob(c.id, x.pending.job);
    };
    const first = setTimeout(scan, 1200);
    document.addEventListener("visibilitychange", scan);
    return () => { clearTimeout(first); document.removeEventListener("visibilitychange", scan); };
  }, [ready]);

  // Edits made by hand in the code editor are saved into the current project.
  // a new cloud database for a project → { site } or { error }
  async function makeCloud() {
    try {
      const r = await fetch("/api/appdata", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify({ a: "create" }) });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.site ? { site: j.site } : { error: j.error || "db" };
    } catch { return { error: "db" }; }
  }
  // turn the cloud database on for the open project, then ask the AI to move the app's data to it
  async function enableCloud() {
    const made = await makeCloud();
    if (!made.site) return made.error;
    const files = { ...project, [DB_FILE]: dbFile(made.site, window.location.origin + "/api/appdata") };
    patch(active.id, (c) => ({ ...c, cloudSite: made.site, project: files }));
    setSheet(null);
    if (Object.keys(project).length) setTimeout(() => sendRef.current?.(t("cloudSwitch")), 400);
    return null;
  }
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
    try { localStorage.setItem(delKey, JSON.stringify([...readDeleted().filter((d) => d.id !== id), { id, updated: Date.now() }].slice(-100))); } catch {}
    setSyncTick((n) => n + 1);
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
    if (sendIt) unlockAudio(); // this tap lets the spoken answer play by itself on iPhone
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

  // Photos pasted into the message box are attached like gallery photos.
  function onPaste(e) {
    const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (imgs.length) { e.preventDefault(); addImages(imgs); }
  }

  // A project ZIP (from AHM AI or anywhere): open it, tidy the files, then let the AI review it and help finish.
  async function pickZip(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || busy || zipBusy) return;
    if (!/\.zip$/i.test(f.name) && f.type !== "application/zip" && f.type !== "application/x-zip-compressed") { alert(t("zipOnly")); return; }
    setZipBusy(true);
    try {
      const r = await importZip(f);
      const id = newId();
      setChats((l) => [{ ...blank("build"), id, title: "📦 " + r.name, project: r.files, updated: Date.now() }, ...l]);
      setView("chat");
      setActiveId(id);
      setShowPreview(false);
      const notes = [r.stack && `${t("zipStack")}: ${r.stack}`, r.skipped.junk && `${r.skipped.junk} ${t("zipSkippedJunk")}`, r.skipped.cut + r.skipped.big && `${r.skipped.cut + r.skipped.big} ${t("zipSkippedBig")}`].filter(Boolean).join(" · ");
      setPendingImport({ id, text: t("zipAnalyze").replace("{name}", r.name).replace("{n}", r.count) + (notes ? `\n(${notes})` : "") });
    } catch (err) {
      alert(err?.message === "too_big" ? t("zipTooBig") : err?.message === "empty" ? t("zipEmpty") : t("zipFail"));
    } finally {
      setZipBusy(false);
    }
  }

  // Gallery button: photos only, in every section.
  function pickPhotos(e) {
    const all = [...(e.target.files || [])];
    e.target.value = "";
    const imgs = all.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name));
    if (imgs.length) addImages(imgs);
    else if (all.length) alert(t("imageFail"));
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

  // ---- hands-free voice conversation ----
  const [voice, setVoice] = useState(null); // { chatId, tutor, greeting }
  function openVoice(opts = {}) {
    if (busy) return;
    const chatId = opts.chatId || active.id;
    setVoice({ chatId, tutor: opts.tutor || active.tutor || null, greeting: opts.greeting || null });
  }
  function voiceTurn(heardText, answer) {
    if (!voice) return;
    // the app follows the language the user speaks
    const dl = !voice.tutor && detectLang(heardText);
    if (dl && dl !== lang) setLang(dl);
    patch(voice.chatId, (c) => ({
      ...c,
      mode: c.mode === "auto" ? "chat" : c.mode,
      messages: [...c.messages, { role: "user", content: heardText || t("voiceMessage"), voice: true }, { role: "assistant", content: answer, voiceReply: true }],
      title: c.title || (heardText || t("voiceMessage")).slice(0, 60),
    }));
    setActiveId(voice.chatId);
  }

  async function send(preset, baseMessages, extra = [], forced, opts = {}) {
    // still building / answering: keep the message and send it by itself as soon as the work is done
    if ((busy || jobWait) && !opts.auto && !opts.cont) {
      const q = (preset ?? input).trim();
      if (q) { queueRef.current.push({ chat: active.id, text: q }); setQueued([...queueRef.current]); setInput(""); }
      return;
    }
    const typed = (preset ?? input).trim();
    const hasAttach = images.length || file || extra.length;
    // the whole app follows the language the user writes in (Kurdish, Arabic or English)
    const dl = preset === undefined && !opts.auto && !opts.cont && !active.tutor ? detectLang(typed) : null;
    if (dl && dl !== lang) setLang(dl);
    const reqLang = dl || lang;
    let target = forced || (mode === "image" || mode === "studio" ? "chat" : mode); // image/design section was removed

    // New chat with no tool chosen: work out what the user wants.
    if (target === "auto") {
      if (!typed && !hasAttach) return;
      if (busy) return;
      target = "chat";
      if (typed && !file && !extra.length) { // a photo + "build a site like this" still goes to build
        target = quickGuess(typed);
        // the extra AI check only when it could be a request to MAKE something (a site, app, game…);
        // a normal question goes straight to the chat — no waiting
        if (!target && !(typed.length < 400 && /(دروست|بکە|بکەم|بنووسە|ببنە|build|create|make|develop|program|code|کۆد|برنامج|اصنع|أنشئ|ابن|اعمل|صمم|طور|سیستەم|system|نظام|پرۆگرام|پڕۆگرام)/i.test(typed))) target = "chat";
        if (!target) {
          setDeciding(true);
          try {
            const r = await fetch("/api/intent", {
              method: "POST",
              signal: AbortSignal.timeout?.(1500), // never make the user wait long just to choose a section
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
              body: JSON.stringify({ text: typed }),
            });
            target = (await r.json().catch(() => ({}))).mode || "chat";
          } catch { target = "chat"; } finally { setDeciding(false); }
        }
      }
      if (target !== "build" && target !== "construct") target = "chat";
      setDraft((d) => ({ ...d, mode: target }));
    }
    const sentImages = [...images, ...extra]; // photos, PDFs and voice work in every section
    const isVoice = extra.some((x) => x.voice);
    const photoCount = sentImages.filter((im) => !im.voice && !im.docName).length;
    const text = (preset ?? input).trim() || (file ? t("fixFile") : sentImages.some((im) => im.docName) && !photoCount ? t("readDoc") : sentImages.length ? t("describeImage") : "");
    if (!text || busy) return;
    if (!opts.auto && !opts.cont) autoFixes.current = 0;
    const id = active.id;
    const m = target;
    const sentFile = m === "chat" ? file : null;
    let base = project;
    // 📸 a picture of a design sent in a website/app chat is used again for the build itself (screenshot → code)
    const photos = sentImages.filter((im) => !im.voice && !im.docName && /^image\//.test(im.mimeType || ""));
    if (m === "build" && photos.length) designRef.current[id] = photos.slice(0, 3);
    const designPics = m === "build" && !photos.length && !Object.keys(base).length && !opts.auto ? designRef.current[id] || [] : [];
    const next = [...(baseMessages || messages), { role: "user", content: text, voice: isVoice || undefined, fileName: sentFile?.name, thumbs: sentImages.filter((im) => im.thumb).map((im) => im.thumb), docs: sentImages.filter((im) => im.docName).map((im) => im.docName) }];
    // Website / app / system, and "plan first": a new project gets a plan to approve before anything is built.
    const kindNow = active.buildKind || guessKind(text);
    const planOnly = m === "build" && !Object.keys(base).length && !active.planned && !opts.fromPlan;
    // ☁️ a new SYSTEM gets a cloud database by itself: its data is shared by every phone and computer
    let cloudSite = active.cloudSite || null;
    if (m === "build" && opts.fromPlan && !Object.keys(base).length && kindNow === "system" && !cloudSite) {
      const made = await makeCloud();
      if (made.site) {
        cloudSite = made.site;
        base = { [DB_FILE]: dbFile(made.site, window.location.origin + "/api/appdata") };
        patch(id, (c) => ({ ...c, cloudSite: made.site, project: base }));
      }
    }
    const put = (msgs, extra = {}) => patch(id, (c) => ({ ...c, ...extra, mode: m, messages: msgs, title: c.title || text.slice(0, 60),
      ...(m === "build" ? { buildKind: c.buildKind || kindNow } : {}), ...(opts.fromPlan ? { planned: true } : {}) }));
    // Every answer has a job id: if the phone leaves the app, the server keeps working and saves it.
    const jobId = newJobId();
    const pending = { job: jobId, kind: m, voice: isVoice || undefined };
    liveJobs.current.add(jobId);
    put([...next, { role: "assistant", content: "", pending }]);
    setActiveId(id);
    setInput("");
    setPlanEdit(false);
    setFile(null);
    setImages([]);
    if (ta.current) ta.current.style.height = "auto";
    setBusy(true);
    if (m === "build") setShowPreview(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (m === "studio") return runStudio({ ctrl, next, put, sentImages, isVoice, text, typed: (preset ?? input).trim(), history: baseMessages || messages, jobId, pending, chatId: id });
    let keepPending = false;
    let acc = "";
    const ERR = /\u0000ERR:(busy|ai)\s*$/;
    // Voice message: the answer starts with ⟦what was said⟧ — that text goes into the user's bubble.
    const HEARD = /^\s*⟦([^⟧]*)⟧[ \t]*\n?/;
    const split = (txt) => {
      if (!isVoice) return { body: txt, msgs: next };
      const mm = txt.match(HEARD);
      if (mm) {
        const heard = mm[1].trim();
        const mine = { ...next[next.length - 1], content: heard || next[next.length - 1].content };
        return { body: txt.slice(mm[0].length).replace(/^\s+/, ""), msgs: [...next.slice(0, -1), mine] };
      }
      if (/^\s*⟦/.test(txt)) return { body: "", msgs: next }; // the words are still arriving
      return { body: txt, msgs: next };
    };
    const clean = (txt) => txt.replace(/\n*\u0000ERR:(busy|ai)\s*$/, (_m, k) => "\n\n" + (k === "busy" ? t("errBusy") : t("errAi")));

    // One request to the server. Returns "ok", "retry" (nothing arrived yet) or "stop".
    const attempt = async () => {
      acc = "";
      // The screen is updated a few times a second, not on every piece of text: re-reading a long answer full of
      // code on every word made phones slow and the writing looked stuck.
      let lastDraw = 0, drawTimer = null;
      const draw = () => {
        drawTimer = null; lastDraw = Date.now();
        const ch = m === "build" ? applyChanges(base, acc) : null;
        const sp = split(acc);
        put([...sp.msgs, { role: "assistant", content: clean(sp.body), pending, plan: planOnly || undefined, progress: prog || undefined }], ch?.changed ? { project: ch.files } : {});
      };
      const every = m === "build" ? 260 : 90;
      const schedule = () => { if (Date.now() - lastDraw >= every) draw(); else if (!drawTimer) drawTimer = setTimeout(draw, every - (Date.now() - lastDraw)); };
      try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({
          mode: m,
          lang: reqLang,
          messages: next.map(({ role, content }) => ({ role, content })),
          file: sentFile || undefined,
          images: (sentImages.length ? sentImages : designPics).length ? (sentImages.length ? sentImages : designPics).map(({ mimeType, data }) => ({ mimeType, data })) : undefined,
          project: m === "build" ? Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v).startsWith("data:") ? "data:" : v])) : undefined,
          tutor: active.tutor || undefined,
          voiceNote: isVoice || undefined,
          buildKind: m === "build" ? kindNow : undefined,
          planOnly: planOnly || undefined,
          cont: opts.cont || undefined,
          cloudDb: m === "build" && (!!cloudSite || (planOnly && kindNow === "system")) ? true : undefined,
          jobId,
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
          showLimit(err.error);
          return "stop";
        }
        if (err.error === "slow_down") { put([...next, { role: "assistant", content: t("slowDown"), failed: true }]); return "stop"; }
        if (err.error === "file_too_big") { put(next.slice(0, -1)); setInput(text); alert(t("fileBig")); return "stop"; }
        if (err.detail) console.error("server:", err.detail);
        return "retry";
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      // The server sends a small signal every 12 s. If nothing at all arrives for a while (the phone slept, the
      // network changed, iPhone kept a dead connection open), stop waiting here and fetch the saved work instead.
      let lastByte = Date.now();
      const dog = setInterval(() => {
        if (document.visibilityState === "visible" && Date.now() - lastByte > 40000) { stalled = true; clearInterval(dog); try { reader.cancel(); } catch {} }
      }, 3000);
      const onBack = () => { if (document.visibilityState === "visible" && Date.now() - lastByte > 20000) { stalled = true; try { reader.cancel(); } catch {} } };
      document.addEventListener("visibilitychange", onBack);
      try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lastByte = Date.now();
        acc += dec.decode(value, { stream: true });
        acc = acc.replace(/\u0000H\n/g, ""); // "still working" signal
        // The server started the answer again (a filter stopped the first try): drop what was shown.
        const ri = acc.lastIndexOf("\u0000RESET\n");
        if (ri >= 0) acc = acc.slice(ri + 7);
        if (/\u0000[A-Z]{1,5}$/.test(acc) && !ERR.test(acc)) continue; // half of a marker: wait for the rest
        // "\u0000UNDO:n" = the server takes back the last n characters (the AI started that file again)
        for (let um; (um = /\u0000UNDO:(\d+)\n/.exec(acc)); ) acc = acc.slice(0, Math.max(0, um.index - Number(um[1]))) + acc.slice(um.index + um[0].length);
        // Building file by file: "\u0000F:3/8:js/app.js" = which file is being written; "\u0000MORE:…" = continue later
        for (const fm of acc.matchAll(/\u0000F:(\d+)\/(\d+):([^\n]*)\n/g)) prog = { i: +fm[1], n: +fm[2], path: fm[3].slice(0, 120) };
        const mo = /\u0000MORE:([A-Za-z0-9_.-]+)\n/.exec(acc);
        if (mo) moreTok = mo[1];
        if (/\u0000CHAIN\n/.test(acc)) { chainWait = true; acc = acc.replace(/\u0000CHAIN\n/g, ""); } // the server goes on by itself: wait for the saved result
        acc = acc.replace(/\u0000F:\d+\/\d+:[^\n]*\n/g, "").replace(/\u0000MORE:[^\n]*\n/g, "");
        if (/\u0000(F|MO|MOR|MORE|U|UN|UND|UNDO)(:[^\n]*)?$/.test(acc)) continue; // half of a marker: wait for the rest
        // Place in the waiting line ("\u0000Q:3\n"): show it, keep it out of the answer.
        const places = acc.match(/\u0000Q:(\d+)\n/g);
        if (places) {
          acc = acc.replace(/\u0000Q:\d+\n/g, "");
          if (!acc) { put([...next, { role: "assistant", content: "", waiting: Number(places[places.length - 1].slice(3)) || true, pending }]); continue; }
        }
        if (/^\u0000(Q(:\d*)?)?$/.test(acc)) continue; // half of a place marker: wait for the rest
        if (ERR.test(acc) && !acc.replace(ERR, "").trim()) continue; // error with no text: handled below
        schedule();
      }
      } finally { clearInterval(dog); document.removeEventListener("visibilitychange", onBack); }
      if (stalled) throw new Error("stalled");
      } finally { if (drawTimer) clearTimeout(drawTimer); if (lastDraw && acc && !(ERR.test(acc) && !acc.replace(ERR, "").trim())) draw(); } // the last words
      return ERR.test(acc) && !acc.replace(ERR, "").trim() ? "retry" : "ok";
    };

    let autoNext = null, prog = null, moreTok = null, reviewMe = false, chainWait = false, stalled = false;
    try {
      // When the AI is busy (many people at once), wait in line instead of failing:
      // free AI limits refill every minute, so keep trying quietly for about a minute.
      let result = await attempt();
      const waits = [1500, 3000, 5000, 8000, 10000, 12000, 15000];
      for (let tries = 0; result === "retry" && tries < waits.length && !ctrl.signal.aborted; tries++) {
        const busyNow = /ERR:busy/.test(acc);
        if (!busyNow && tries >= 2) break; // a real error: don't keep the user waiting
        if (busyNow) put([...next, { role: "assistant", content: "", waiting: true, pending }]);
        await new Promise((r) => setTimeout(r, waits[tries]));
        if (ctrl.signal.aborted) break;
        result = await attempt();
      }
      if (chainWait && result === "ok") { keepPending = true; setTimeout(() => resumeJob(id, jobId), 2000); }
      else if (result === "retry") {
        const busyErr = /ERR:busy/.test(acc);
        put([...next, { role: "assistant", content: busyErr ? t("errBusy") : t("errAi"), failed: true }]);
      } else if (result === "ok") {
        if (planOnly) { // a refused or broken plan must not show the "Build it" button
          const sp = split(acc), body = clean(sp.body).trim();
          if (Object.values(REFUSAL).some((r) => body.endsWith(r)) || ERR.test(acc)) put([...sp.msgs, { role: "assistant", content: body, failed: ERR.test(acc) || undefined }]);
        }
        if (sentFile) {
          const { out, applied, failed } = applyEdits(sentFile.content, acc);
          put([...next, { role: "assistant", content: clean(acc), fixed: applied ? { name: fixedName(sentFile.name), content: out } : null, fixInfo: { applied, failed } }]);
        }
        if (m === "build" && applyChanges(base, acc).changed && window.innerWidth < 900) setShowPreview(true);
        // The AI checks its own work: files that are linked or needed but were not made are made right away,
        // without the user having to ask (at most twice in a row, so it can never loop).
        if (m === "build" && moreTok && (opts.rounds || 0) < 5) {
          // the server stopped near its time limit (or the AI was busy): carry on with the remaining files by itself
          autoNext = { text: t("autoContinue"), auto: opts.auto || 0, cont: moreTok, rounds: (opts.rounds || 0) + 1 };
        } else if (m === "build" && !planOnly && !ERR.test(acc) && (opts.auto || 0) < 2) {
          const after = applyChanges(base, acc);
          const miss = after.changed ? findMissing(after.files, kindNow) : [];
          if (miss.length) autoNext = { text: t("autoMissing").replace("{f}", miss.map((x) => x.path + (x.from ? ` (${t("autoFrom")} ${x.from})` : "")).join("، ")), auto: (opts.auto || 0) + 1 };
        }
        // nothing missing: the AI tests every page and button of what it made, and fixes what is broken
        if (m === "build" && !planOnly && !autoNext && !moreTok && !ERR.test(acc) && applyChanges(base, acc).changed) reviewMe = true;
        if (isVoice && !ERR.test(acc)) {
          const sp = split(acc);
          const replyIndex = sp.msgs.length;
          put([...sp.msgs, { role: "assistant", content: clean(sp.body), voiceReply: true }]);
          setAutoVoice(`${id}:${replyIndex}`);
        }
        if (ERR.test(acc)) { const sp = split(acc); put([...sp.msgs, { role: "assistant", content: clean(sp.body), failed: true }]); }
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        if (!acc) put(next.slice(0, -1));
      } else {
        // The connection broke (often: the user left the app). The server is still working — wait for it.
        keepPending = true;
        const sp = split(acc);
        put([...sp.msgs, { role: "assistant", content: clean(sp.body), pending }]);
        setTimeout(() => resumeJob(id, jobId), 1500);
      }
    } finally {
      liveJobs.current.delete(jobId);
      if (!keepPending) donePending(id, jobId);
      abortRef.current = null;
      setBusy(false);
      loadMe();
      if (autoNext && !ctrl.signal.aborted) setTimeout(() => autoRef.current?.(autoNext.text, autoNext.auto, { cont: autoNext.cont, rounds: autoNext.rounds, checks: opts.checks }), autoNext.cont ? 1200 : 600);
      else if (reviewMe && !ctrl.signal.aborted) { reviewing.current = true; setTimeout(() => runReview(id, opts), 700); }
    }
  }

  // Remove the "still working" mark from a finished answer.
  function donePending(chatId, jobId) {
    patchIf(chatId, (c) => ({ ...c, messages: c.messages.map((x) => (x.pending?.job === jobId ? (({ pending, ...rest }) => rest)(x) : x)) }));
  }

  // Turns a studio reply into what the chat shows.
  async function studioMessage(j, fallbackIdea) {
    const studio = { task: j.task, ratio: j.ratio || "square", idea: j.idea || fallbackIdea || j.heard || "" };
    if (j.designs) studio.designs = j.designs;
    if (j.images) studio.pics = await Promise.all(j.images.map((src) => shrinkPic(src).catch(() => ({ full: src, thumb: src }))));
    if (j.free) { const seed = Math.floor(Math.random() * 1e6); studio.urls = [0, 1].map((k) => imageUrl(j.prompt, studio.ratio, seed + k)); studio.approx = !!j.approx; }
    return { role: "assistant", content: j.caption || "✨", studio };
  }

  // An answer that was finished on the server while the user was away: fetch it and show it.
  async function resumeJob(chatId, jobId) {
    if (resuming.current.has(jobId) || liveJobs.current.has(jobId)) return;
    resuming.current.add(jobId);
    const fail = (txt) => patchIf(chatId, (c) => ({ ...c, messages: c.messages.map((x) => (x.pending?.job === jobId ? { role: "assistant", content: (x.content ? x.content + "\n\n" : "") + txt, failed: true } : x)) }));
    try {
      for (let i = 0; i < 400; i++) { // big builds can go on for many minutes on the server
        if (document.visibilityState === "hidden") { await new Promise((r) => setTimeout(r, 3000)); i--; continue; }
        let j = {};
        try {
          const r = await fetch("/api/job?id=" + jobId, { headers: { Authorization: "Bearer " + (await token()) }, cache: "no-store" });
          j = await r.json();
        } catch {}
        if (j.status === "done") {
          const chat = chatsRef.current.find((c) => c.id === chatId);
          const msg = chat?.messages.find((x) => x.pending?.job === jobId);
          if (!msg) return;
          const kind = msg.pending.kind;
          if (kind === "studio") {
            let out = {};
            try { out = JSON.parse(j.result || "{}"); } catch {}
            if (out.error) { fail(out.error === "unsafe" ? t("unsafe") : out.error === "busy" ? t("errBusy") : t("errAi")); return; }
            const done = await studioMessage(out);
            patchIf(chatId, (c) => {
              const k = c.messages.findIndex((x) => x.pending?.job === jobId);
              if (k < 0) return c;
              const msgs = [...c.messages];
              if (msg.pending.voice && out.heard && msgs[k - 1]?.role === "user") msgs[k - 1] = { ...msgs[k - 1], content: out.heard };
              msgs[k] = done;
              return { ...c, messages: msgs };
            });
            return;
          }
          let txt = String(j.result || "");
          const rs = txt.lastIndexOf("\u0000RESET\n");
          if (rs >= 0) txt = txt.slice(rs + 7);
          const more = /\u0000MORE:([A-Za-z0-9_.-]+)\n/.exec(txt);
          txt = txt.replace(/\u0000F:\d+\/\d+:[^\n]*\n/g, "").replace(/\u0000MORE:[^\n]*\n/g, "");
          if (more && kind === "build") setTimeout(() => autoRef.current?.(t("autoContinue"), 0, { cont: more[1], rounds: 1 }), 1500);
          // finished while away: still make the files that are linked but missing (same as a normal build)
          else if (kind === "build" && !/\u0000ERR:/.test(txt)) setTimeout(() => {
            const c = chatsRef.current.find((x) => x.id === chatId);
            const miss = c ? findMissing(c.project || {}, c.buildKind || "website") : [];
            if (miss.length && c.id === activeIdRef.current) autoRef.current?.(t("autoMissing").replace("{f}", miss.map((x) => x.path + (x.from ? ` (${t("autoFrom")} ${x.from})` : "")).join("، ")), 1);
            else if (c && !miss.length) runReview(chatId);
          }, 1500);
          const bad = /\u0000ERR:(busy|ai)\s*$/.exec(txt);
          txt = txt.replace(/\n*\u0000ERR:(busy|ai)\s*$/, "");
          const heard = msg.pending.voice ? /^\s*⟦([^⟧]*)⟧[ \t]*\n?/.exec(txt) : null;
          if (heard) txt = txt.slice(heard[0].length).replace(/^\s+/, "");
          patchIf(chatId, (c) => {
            const k = c.messages.findIndex((x) => x.pending?.job === jobId);
            if (k < 0) return c;
            const msgs = [...c.messages];
            if (heard && msgs[k - 1]?.role === "user") msgs[k - 1] = { ...msgs[k - 1], content: heard[1].trim() || msgs[k - 1].content };
            msgs[k] = bad && !txt.trim()
              ? { role: "assistant", content: bad[1] === "busy" ? t("errBusy") : t("errAi"), failed: true }
              : { role: "assistant", content: txt + (bad ? "\n\n" + (bad[1] === "busy" ? t("errBusy") : t("errAi")) : ""), voiceReply: msg.pending.voice || undefined };
            const ch = kind === "build" ? applyChanges(c.project || {}, txt) : null;
            return { ...c, messages: msgs, ...(ch?.changed ? { project: ch.files } : {}) };
          });
          return;
        }
        if (j.status === "unknown" && i >= 4) { fail(t("errConn")); return; } // nothing saved (e.g. update 3 not installed)
        // the server stopped without finishing (no news for 5 minutes): keep what was made and let the app make
        // the rest by itself (missing files), instead of waiting forever
        if (j.status === "running" && j.updated_at && Date.now() - Date.parse(j.updated_at) > 300000) {
          let part = String(j.result || "");
          const rs3 = part.lastIndexOf("\u0000RESET\n");
          if (rs3 >= 0) part = part.slice(rs3 + 7);
          part = part.replace(/\u0000(F:\d+\/\d+:[^\n]*|MORE:[^\n]*|CHAIN|H)\n/g, "").replace(/\u0000[^\n]*/g, "");
          const chat = chatsRef.current.find((c) => c.id === chatId);
          const msg = chat?.messages.find((x) => x.pending?.job === jobId);
          if (!msg) return;
          patchIf(chatId, (c) => {
            const k = c.messages.findIndex((x) => x.pending?.job === jobId);
            if (k < 0) return c;
            const msgs = [...c.messages];
            const { pending: _p, progress: _g, ...rest } = msgs[k];
            msgs[k] = { ...rest, content: part || t("errConn") };
            const ch = msg.pending.kind === "build" && part ? applyChanges(c.project || {}, part) : null;
            return { ...c, messages: msgs, ...(ch?.changed ? { project: ch.files } : {}) };
          });
          if (msg.pending.kind === "build") setTimeout(() => {
            const c = chatsRef.current.find((x) => x.id === chatId);
            const miss = c ? findMissing(c.project || {}, c.buildKind || "website") : [];
            if (miss.length && c.id === activeIdRef.current) autoRef.current?.(t("autoMissing").replace("{f}", miss.map((x) => x.path).join("، ")), 1);
            else if (c) runReview(chatId);
          }, 1500);
          return;
        }
        // still working on the server: show what is already made (files appear one by one, like when you watch it)
        if (j.status === "running" && j.result) {
          let part = String(j.result);
          const rs2 = part.lastIndexOf("\u0000RESET\n");
          if (rs2 >= 0) part = part.slice(rs2 + 7);
          let pg = null;
          for (const fm of part.matchAll(/\u0000F:(\d+)\/(\d+):([^\n]*)\n/g)) pg = { i: +fm[1], n: +fm[2], path: fm[3].slice(0, 120) };
          part = part.replace(/\u0000(F:\d+\/\d+:[^\n]*|MORE:[^\n]*|CHAIN|H)\n/g, "");
          patchIf(chatId, (c) => {
            const k = c.messages.findIndex((x) => x.pending?.job === jobId);
            if (k < 0 || c.messages[k].content === part) return c;
            const msgs = [...c.messages];
            msgs[k] = { ...msgs[k], content: part, progress: pg || msgs[k].progress };
            const ch = msgs[k].pending.kind === "build" ? applyChanges(c.project || {}, part) : null;
            return { ...c, messages: msgs, ...(ch?.changed ? { project: ch.files } : {}) };
          });
        }
        await new Promise((r) => setTimeout(r, i < 12 ? 2500 : 5000));
      }
      fail(t("errConn"));
    } finally {
      resuming.current.delete(jobId);
    }
  }

  // ---- design studio: logos, posters, pictures, photo edits and merges ----
  async function runStudio({ ctrl, next, put, sentImages, isVoice, text, typed, history, jobId, pending, chatId }) {
    put([...next, { role: "assistant", content: "", studioWait: true, pending }]);
    let keepPending = false;
    try {
      const previous = history.filter((x) => x.role === "user").map((x) => x.content).slice(-5);
      const lastPic = [...history].reverse().find((x) => x.studio?.pics?.length)?.studio.pics[0];
      const lastSrc = lastPic ? lastPic.full || lastPic.thumb : null;
      const res = await fetch("/api/studio", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({
          lang, kind: studioKind, ratio: studioRatio, prompt: isVoice ? "" : typed || text, previous,
          images: sentImages.map(({ mimeType, data }) => ({ mimeType, data })),
          lastImage: lastSrc ? { mimeType: "image/jpeg", data: lastSrc.split(",")[1] } : undefined,
          jobId,
        }),
      });
      if (res.status === 401) { await supabase.auth.signOut(); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.error === "limit") { put(next.slice(0, -1)); setInput(typed); showLimit(); return; }
        const msg = j.error === "unsafe" ? t("unsafe") : j.error === "slow_down" ? t("slowDown") : j.error === "busy" ? t("errBusy") : t("errAi");
        put([...next, { role: "assistant", content: msg, failed: j.error !== "unsafe" }]);
        return;
      }
      const mine = isVoice && j.heard ? [...next.slice(0, -1), { ...next[next.length - 1], content: j.heard }] : next;
      put([...mine, await studioMessage(j, typed || text)]);
    } catch (e) {
      if (e?.name === "AbortError") put(next.slice(0, -1));
      else { keepPending = true; setTimeout(() => resumeJob(chatId, jobId), 1500); } // left the app: the server keeps designing
    } finally {
      liveJobs.current.delete(jobId);
      if (!keepPending) donePending(chatId, jobId);
      abortRef.current = null;
      setBusy(false);
      loadMe();
    }
  }

  sendRef.current = (txt) => { if (!busy) { setPlanEdit(false); send(txt); } };
  busyRef.current = busy || jobWait;
  // send the waiting messages when the AI is free again (after any automatic follow-up steps)
  useEffect(() => {
    if (busy || jobWait || !queueRef.current.length) return;
    const tm = setTimeout(() => {
      if (busyRef.current || !queueRef.current.length) return;
      const q = queueRef.current.shift(); setQueued([...queueRef.current]);
      if (q.chat === active.id) send(q.text);
    }, 2200);
    return () => clearTimeout(tm);
  }, [busy, jobWait, active.id]);
  autoRef.current = (txt, auto, extra = {}) => { if (!busy) send(txt, undefined, [], "build", { auto, ...extra }); };
  function setKind(k) {
    if (chats.some((c) => c.id === active.id)) patchIf(active.id, (c) => ({ ...c, buildKind: k || undefined }));
    else setDraft((d) => ({ ...d, buildKind: k || undefined }));
    if (k) setTimeout(() => ta.current?.focus(), 60);
  }

  function retry() {
    const idx = messages.map((x) => x.role).lastIndexOf("user");
    if (idx < 0 || busy) return;
    send(messages[idx].content, messages.slice(0, idx));
  }

  const name = (session.user.email || "").split("@")[0].replace(/[._\d]+/g, " ").trim().split(" ")[0].replace(/^./, (c) => c.toUpperCase());
  const hasFiles = Object.keys(project).length > 0;
  const canPreview = useMemo(() => hasFiles && !!buildPreview(project), [project]);
  const suggestions = t(mode === "build" ? (active.buildKind ? "kind" + KindK(active.buildKind) + "Sugg" : "buildSugg") : mode === "construct" ? "constructSugg" : "chatSugg");
  // Builder: first pick website / app / system (a page for each), then plan, then build.
  const pickingKind = mode === "build" && !active.buildKind && !hasFiles && !messages.length;
  const planMsg = mode === "build" ? [...messages].reverse().find((x) => x.plan && x.content && !x.failed) : null;
  const chatLike = mode === "chat" || mode === "auto";
  const toolName = { chat: t("capChat"), build: t("capBuild"), construct: t("capConstruct") }[mode];

  // Computer keyboard shortcuts: Ctrl/⌘+K new chat, "/" type, Esc close.
  keys.current = { startNew, closeSheet: () => setSheet(null), focus: () => ta.current?.focus() };
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); keys.current.startNew("auto"); }
      else if (e.key === "Escape") keys.current.closeSheet();
      else if (e.key === "/" && !typing) { e.preventDefault(); keys.current.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={"app mode-" + mode + (sideHidden ? " side-hidden" : "") + " pv-" + (mode === "build" && (hasFiles || busy) ? pvMode : "normal") + (dragging ? " dragging" : "")}>
      <Sidebar open={sideOpen} chats={chats} activeId={activeId} me={me} onLearn={openLearn} learnOn={view === "learn"}
        onPick={pick} onNew={startNew} onDelete={remove} onClose={() => setSideOpen(false)}
        onSettings={() => { setSideOpen(false); setSettingsOpen(true); }}
        onFeedback={() => { setSideOpen(false); setSheet({ type: "feedback" }); }}
        onInvite={() => { setSideOpen(false); setSheet({ type: "invite" }); }}
        onDashboard={() => { setSideOpen(false); setSheet({ type: "dashboard" }); }}
        onOwnerPlans={() => { setSideOpen(false); setSheet({ type: "admin" }); }}
        onNotice={() => { setSideOpen(false); setSheet({ type: "notice" }); }}
        onRelease={() => { setSideOpen(false); setSheet({ type: "release" }); }} releaseReady={releaseReady}
        onRename={(id, title) => { const v = prompt(t("renameChat"), title || ""); if (v != null && v.trim()) patchIf(id, (c) => ({ ...c, title: v.trim().slice(0, 80) })); }} />

      <div className="main-col">
        <header>
          <button className="icon-btn menu-btn" aria-label={t("menu")} title={t("menu")} onClick={() => setSideOpen(true)}><Svg d={Icon.menu} /></button>
          <button className={"icon-btn side-toggle" + (sideHidden ? " on" : "")} aria-label={t(sideHidden ? "sideShow" : "sideHide")} title={t(sideHidden ? "sideShow" : "sideHide")} onClick={() => setSideHidden(!sideHidden)}><Svg d={Icon.panel} /></button>
          <div className="brand">
            <img src="/icon-192.png" alt="" aria-hidden="true" />
            <span className="brand-name">AHM <b>AI</b></span>
          </div>
          <div className="head-title" dir="auto">{view === "learn" ? t("learnLang") : view === "house" ? t("houseCta") : view === "slides" ? t("capSlides") : view === "studio" ? t("capConstruct") : active.title || toolName || t("newChat")}</div>
          <div className="head-tools">
            {me && (
              <button className={"quota-pill" + (me.unlimited || me.pro ? " pro" : "") + (me.lockedUntil ? " wait" : "")} onClick={() => setSheet({ type: "upgrade", reason: "info" })}>
                {me.unlimited ? (me.vip ? "♾️ VIP" : "👑") : me.pro ? "⭐" : ""} {usageText(me, t)}
              </button>
            )}
            {!inst.installed && (
              <button className="head-btn" onClick={async () => { if (!(await inst.install())) setSheet({ type: "install" }); }}>
                <span aria-hidden="true">🖥️</span> {t("installPc")}
              </button>
            )}
            {me?.owner && <button className="head-btn" onClick={() => setSheet({ type: "dashboard" })}><span aria-hidden="true">📊</span> {t("dashboard")}</button>}
            {me?.owner && <button className="head-btn" onClick={() => setSheet({ type: "notice" })}><span aria-hidden="true">📢</span> {t("noticeBtn")}</button>}
            {me?.owner && <button className={"head-btn rel-head" + (releaseReady ? " ready" : "")} onClick={() => setSheet({ type: "release" })}><span aria-hidden="true">🚀</span> {t("releaseBtn")}</button>}
            <button className="head-btn" onClick={() => setSheet({ type: "feedback" })}><span aria-hidden="true">💬</span> {t("feedback")}</button>
          </div>
          <LangSwitch />
          <button className="icon-btn new-chat-btn" aria-label={t("newChat")} title={t("newChat") + " (Ctrl+K)"} onClick={() => startNew("auto")}>
            <Svg d={Icon.plus} /><span className="new-chat-label">{t("newChat")}</span>
          </button>
        </header>
        <KurdFlag />
        {me?.notice && <NoticeBar notice={me.notice} />}
        {update && !hideUpdate && (
          <div className="update-bar" role="status">
            <span>🎉 {t("updateReady")}</span>
            <button className="update-go" onClick={() => refreshApp()}>🔄 {t("refreshNow")}</button>
            <button className="update-x" aria-label={t("close")} onClick={() => setHideUpdate(true)}>×</button>
          </div>
        )}
        {gift > 0 && (
          <div className="gift-bar" role="status">
            🎁 {t("giftGot").replace("{n}", gift)}
            <button aria-label={t("close")} onClick={() => setGift(0)}>×</button>
          </div>
        )}

        {view === "learn" ? (
          <Learn lang={lang} uid={uid} getToken={token} onTutor={startTutor} onVoiceTutor={startVoiceTutor}
            onLimit={() => showLimit()} />
        ) : view === "studio" ? (
          <DesignStudio lang={lang} getToken={token} onBack={() => setView("chat")} onUpgrade={() => setSheet({ type: "upgrade", reason: "info" })}
            onOpenPlan={() => { setHousePlan(null); setView("house"); }} onChat={() => { setView("chat"); chooseTool("construct"); }} />
        ) : view === "slides" ? (
          <SlidesStudio lang={lang} getToken={token} onBack={() => setView("chat")} onUpgrade={() => setSheet({ type: "upgrade", reason: "info" })} />
        ) : view === "house" ? (
          <HouseStudio key={housePlan ? housePlan.size : 0} lang={lang} getToken={token} initialPlan={housePlan} onBack={() => setView("studio")} onUpgrade={() => setSheet({ type: "upgrade", reason: "info" })} />
        ) : (
        <div className="body" ref={bodyRef}>
          <div className="chat-col">
            <main>
              {mode === "build" && active.buildKind && (
                <div className={"kind-bar k-" + active.buildKind}>
                  <span className="kb-ic" aria-hidden="true">{KIND_IC[active.buildKind]}</span>
                  <b>{t("kind" + KindK(active.buildKind))}</b>
                  {!messages.length && !hasFiles && !busy && <button onClick={() => setKind(null)}>{t("kindChange")}</button>}
                </div>
              )}
              {mode === "build" && active.buildKind && askNotify && (push.state === "off" || push.state === "ios-install") && (
                <div className="notify-bar" role="status">
                  <span>{push.state === "ios-install" ? t("notifyIos") : t("notifyOnSub")}</span>
                  {push.state === "off" && <button className="go" onClick={async () => { if (await push.enable()) noAsk(); }}>{t("notifyOn")}</button>}
                  <button className="x" aria-label={t("close")} onClick={noAsk}>✕</button>
                </div>
              )}
              {mode === "build" && active.buildKind && (
                <PlanPanel step={hasFiles ? 3 : planMsg ? 2 : 1} planMsg={planMsg} busy={busy}
                  onOwn={(txt) => send(t("planOwnPrefix") + "\n" + txt)}
                  onBuild={() => send(t("buildFromPlan"), undefined, [], "build", { fromPlan: true })}
                  onChange={() => { setPlanEdit(true); setTimeout(() => ta.current?.focus(), 30); }} />
              )}
              {messages.length === 0 && (
                <div className="empty">
                  <img src="/icon-192.png" alt="" aria-hidden="true" className="empty-logo" />
                  {mode === "auto" ? (
                    <>
                      <h2 className="greet">{greeting(t)}{name ? (lang === "en" ? ", " : "، ") + name : ""}</h2>
                      <p className="muted">{t("helpQ")}</p>
                      <div className="caps">
                        <button className="cap c-chat" onClick={() => chooseTool("chat")}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.sparkChat} size={22} /></span><b>{t("capChat")}</b><span>{t("capChatSub")}</span></button>
                        <button className="cap c-build" onClick={() => chooseTool("build")}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.build} size={22} /></span><b>{t("capBuild")}</b><span>{t("capBuildSub")}</span></button>
                        <button className="cap c-voice" onClick={() => openVoice()}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.wave} size={22} /></span><b>{t("capVoice")}</b><span>{t("capVoiceSub")}</span></button>
                        <button className="cap construct-cap" onClick={() => { if (!busy) { setView("studio"); setSideOpen(false); } }}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.house} size={22} /></span><b>{t("capConstruct")} <em className="new-badge">{t("updateNew")}</em></b><span>{t("capConstructSub")}</span></button>
                        <button className="cap slides-cap" onClick={() => { if (!busy) { setView("slides"); setSideOpen(false); } }}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.slides} size={22} /></span><b>{t("capSlides")} <em className="new-badge">{t("updateNew")}</em></b><span>{t("capSlidesSub")}</span></button>
                        <button className="cap learn-cap" onClick={openLearn}><span className="cap-ic" aria-hidden="true"><Svg d={Icon.learn} size={22} /></span><b>{t("learnLang")}</b><span>{t("learnLangSub")}</span></button>
                      </div>
                      <p className="auto-hint">{t("autoHint")}</p>
                    </>
                  ) : pickingKind ? (
                    <>
                      <h2 className="greet">{t("kindQ")}</h2>
                      <p className="muted">{t("kindPickSub")}</p>
                      <div className="kind-cards">
                        {KINDS.map(([k, ic]) => {
                          const K = k[0].toUpperCase() + k.slice(1);
                          return (
                            <button key={k} type="button" className={"kind-card k-" + k} onClick={() => setKind(k)}>
                              <span className="kc-ic" aria-hidden="true">{ic}</span>
                              <b>{t("kind" + K)}</b>
                              <small>{t("kind" + K + "Sub")}</small>
                              <ul>{t("kind" + K + "Ex").map((x) => <li key={x}>{x}</li>)}</ul>
                              <i>{t("kindOpen")} {lang === "en" ? "→" : "←"}</i>
                            </button>
                          );
                        })}
                      </div>
                      <button className="zip-import-card" disabled={zipBusy} onClick={() => zipInput.current?.click()}>
                        <span className="zic-ic">{zipBusy ? <span className="mini-spin" /> : "📦"}</span>
                        <span><b>{t("zipImport")}</b><small>{t("zipImportSub")}</small></span>
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="greet">{mode === "build" ? (KIND_IC[active.buildKind] || "") + " " + t("kind" + KindK(active.buildKind)) : mode === "construct" ? t("constructQ") : t("helpQ")}</h2>
                      <p className="muted">{mode === "build" ? t("kind" + KindK(active.buildKind) + "Intro") : mode === "construct" ? t("constructSub") : t("helpSub")}</p>
                      {mode === "construct" && (
                        <button className="house-cta" onClick={() => { setView("house"); setSideOpen(false); }}>
                          <span className="hc-ic" aria-hidden="true">🏡</span>
                          <span><b>{t("houseCta")} <em className="new-badge">{t("updateNew")}</em></b><small>{t("houseCtaSub")}</small></span>
                        </button>
                      )}
                      {mode === "construct" && (
                        <div className="cs-tools">
                          {[["🏠", "csIdeas"], ["📐", "csPlan"], ["🧱", "csCost"], ["📖", "csTerms"]].map(([ic, k]) => (
                            <button key={k} onClick={() => { setInput(t(k + "Tpl")); setTimeout(() => { ta.current?.focus(); if (ta.current) { ta.current.style.height = "auto"; ta.current.style.height = Math.min(ta.current.scrollHeight, 160) + "px"; } }, 30); }}>
                              <span className="cs-ic">{ic}</span><b>{t(k)}</b><small>{t(k + "Sub")}</small>
                            </button>
                          ))}
                        </div>
                      )}
                      {mode === "construct" && <p className="cs-note">⚠️ {t("csDisclaimer")}</p>}
                      <div className="chips">
                        {suggestions.map((sg) => <button key={sg} onClick={() => send(sg)}>{sg}</button>)}
                      </div>
                      {mode === "build" && templatesFor(active.buildKind).length > 0 && (
                        <div className="tpl-box">
                          <div className="tpl-head"><b>⚡ {t("tplTitle")}</b><small>{t("tplSub")}</small></div>
                          <div className="tpl-grid">
                            {templatesFor(active.buildKind).map((tp) => (
                              <button key={tp.name.en} type="button" disabled={busy} onClick={() => send(tp.prompt[lang] || tp.prompt.ckb)}>
                                <span aria-hidden="true">{tp.ic}</span><b>{tp.name[lang] || tp.name.ckb}</b>
                              </button>
                            ))}
                            {/* every other field: a short request — the plan step fills it in like a full template */}
                            {tplMore && BLUEPRINTS.filter((b) => !templatesFor(active.buildKind).some((tp) => tp.name.en === b.name.en)).map((b) => (
                              <button key={b.id} type="button" disabled={busy} onClick={() => send(t("tplAsk_" + (active.buildKind || "website")).replace("{f}", b.name[lang] || b.name.ckb))}>
                                <span aria-hidden="true">{b.ic}</span><b>{b.name[lang] || b.name.ckb}</b>
                              </button>
                            ))}
                          </div>
                          <button type="button" className="tpl-more" onClick={() => setTplMore(!tplMore)}>{tplMore ? t("tplLess") : t("tplMore").replace("{n}", num(BLUEPRINTS.filter((b) => !templatesFor(active.buildKind).some((tp) => tp.name.en === b.name.en)).length))}</button>
                        </div>
                      )}
                      {mode === "build" && (
                        <button className="zip-import-card" disabled={zipBusy} onClick={() => zipInput.current?.click()}>
                          <span className="zic-ic">{zipBusy ? <span className="mini-spin" /> : "📦"}</span>
                          <span><b>{t("zipImport")}</b><small>{t("zipImportSub")}</small></span>
                        </button>
                      )}
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
                    {m.role === "assistant" && m.progress && (busy || m.pending) && i === messages.length - 1 && (
                      <div className="build-prog" role="status">
                        <div className="bp-top"><span className="mini-spin" /> {t("buildFile").replace("{i}", num(m.progress.i)).replace("{n}", num(m.progress.n))} <code dir="ltr">{m.progress.path}</code></div>
                        <div className="bp-bar" aria-hidden="true"><i style={{ width: Math.round(((m.progress.i - 0.5) / Math.max(1, m.progress.n)) * 100) + "%" }} /></div>
                      </div>
                    )}
                    {m.role === "assistant" ? (
                      m.content ? <>
                        {m.plan ? <PlanView text={m.content} MD={MD} label={t("planTitle")} /> : <MsgMD text={m.content} />}
                        {m.check && (
                          <div className={"chk chk-" + m.check.state} role="status">
                            {m.check.state === "run" && <span className="mini-spin" />}
                            <span>{m.check.state === "run" ? t("chkRun").replace("{i}", num(m.check.i || 1)).replace("{n}", m.check.n ? num(m.check.n) : "…")
                              : m.check.state === "ok" ? t(m.check.views ? "chkOk" : "chkOkSimple").replace("{p}", num(m.check.pages)).replace("{v}", num(m.check.views || 0)).replace("{c}", num(m.check.clicked))
                              : m.check.state === "fix" ? t("chkFix").replace("{n}", num(m.check.n)) : t("chkLeft").replace("{n}", num(m.check.n))}</span>
                          </div>
                        )}
                        {m.pending && !(busy && i === messages.length - 1) && <div className="away-note" role="status"><span className="mini-spin" /> {t("awayWorking")}</div>}
                      </>
                        : <span className="typing" role="status"><i /><i /><i /><small>{typeof m.waiting === "number" ? t("queuePlace").replace("{n}", m.waiting) : m.waiting ? t("queueWait") : m.studioWait ? t("studioWorking") : m.pending && !busy ? t("awayWorking") : t("thinking")}</small></span>
                    ) : m.voice ? <span className="voice-tag"><Svg d={Icon.mic} size={16} /> {m.content}</span> : m.content}
                    {m.voiceReply && m.content && !(busy && i === messages.length - 1) && (
                      <VoiceReply text={m.content} getToken={token} auto={autoVoice === `${active.id}:${i}`} onAutoDone={() => setAutoVoice("")} onVoiceLimit={() => showLimit("voice")} />
                    )}
                    {m.role === "assistant" && m.content && !m.failed && !m.designs && !m.gen && !m.studio && !(busy && i === messages.length - 1) && (
                      <AnswerActions text={m.content.replace(/```(ahm-file|predict)\s*\n[\s\S]*?(\n```|$)/g, "")} q={text0(messages, i)} mode={mode} getToken={token} exportName={mode === "construct" ? `ahm-construction-${new Date().toISOString().slice(0, 10)}.md` : undefined} />
                    )}
                    {mode === "build" && m.plan && !hasFiles && !busy && i === messages.length - 1 && !m.failed && (
                      <div className="plan-actions">
                        <button className="gold-btn" onClick={() => send(t("buildFromPlan"), undefined, [], "build", { fromPlan: true })}>{t("buildIt")}</button>
                        <button className="ghost-btn" onClick={() => { setPlanEdit(true); setTimeout(() => ta.current?.focus(), 30); }}>{t("changePlan")}</button>
                      </div>
                    )}
                    {mode === "build" && hasFiles && !busy && i === messages.length - 1 && m.role === "assistant" && !m.failed && (
                      <div className="app-actions">
                        <button className="green-btn" onClick={() => { downloadZip(project, (active.title || "AHM-AI").replace(/[\\/:*?"<>|#%]+/g, " ").replace(/\s+/g, "-").slice(0, 40)); setSheet({ type: "zipGuide" }); }}>⬇️ {t("zipBtn")}</button>
                        {canPreview && (
                          <button className="green-btn" disabled={publishing} onClick={() => publishSite("screen")}>
                            {publishing ? <span className="mini-spin" /> : "📲"} {t("screenBtn")}
                          </button>
                        )}
                      </div>
                    )}
                    {m.studio && <StudioResult s={m.studio} last={i === messages.length - 1 && !busy} onMore={() => send(m.studio.idea || text0(messages, i))} />}
                    {m.gen && (
                      <>
                        <div className={"gen-grid " + (m.ratio || "square")}>{m.gen.map((u) => <GenImage key={u} url={u} ratio={m.ratio} />)}</div>
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

            <footer className={pickingKind ? "picking" : ""}>
              {queued.filter((q) => q.chat === active.id).length > 0 && (
                <div className="queued" role="status">
                  {queued.filter((q) => q.chat === active.id).map((q, i) => (
                    <span key={i} className="queued-item"><span className="mini-spin" /> {t("queuedNote")}: <b dir="auto">{q.text.slice(0, 60)}</b>
                      <button aria-label={t("cancel")} onClick={() => { queueRef.current = queueRef.current.filter((x) => x !== q); setQueued([...queueRef.current]); }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {mode === "build" && hasFiles && (
                <button className="open-preview" onClick={() => { setShowPreview(true); setPvMode("normal"); }}>
                  <Svg d={Icon.phone} size={18} /> {t("preview")}
                </button>
              )}
              {messages.length === 0 && mode !== "auto" && (
                <div className="tool-chip-row">
                  <span className="tool-chip">
                    <Svg d={mode === "build" ? Icon.build : mode === "construct" ? Icon.house : Icon.chat} size={15} /> {toolName}
                    <button aria-label={t("close")} onClick={() => chooseTool("auto")}><Svg d={Icon.close} size={13} w={2.6} /></button>
                  </span>
                </div>
              )}
              {deciding && <div className="deciding" role="status"><span className="mini-spin" /> {t("deciding")}</div>}
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
                <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={pickPhotos} />
                <input ref={zipInput} type="file" accept=".zip,application/zip,application/x-zip-compressed" hidden onChange={pickZip} />
                <input ref={docInput} type="file" hidden onChange={pickFile}
                  accept=".pdf,application/pdf,.txt,.md,.csv,.json,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.php,.java,.kt,.swift,.dart,.c,.h,.cpp,.cs,.go,.rs,.rb,.vue,.svelte,.xml,.yml,.yaml,.sql,.sh,text/*" />
                {(mode === "build" || mode === "auto") && (
                  <button className="attach gallery zip-btn" aria-label={t("zipImport")} title={t("zipImport")} disabled={busy || zipBusy}
                    onClick={() => zipInput.current?.click()}>{zipBusy ? <span className="mini-spin" /> : "📦"}</button>
                )}
                <button className="attach gallery" aria-label={t("gallery")} title={t("gallery")} disabled={busy || images.length >= 4}
                  onClick={() => fileInput.current?.click()}><Svg d={Icon.image} size={19} /></button>
                {chatLike && (
                  <button className="attach gallery" aria-label={t("attachFile")} title={t("attachFile")} disabled={busy || !!file || images.length >= 4}
                    onClick={() => docInput.current?.click()}><Svg d={Icon.clip} size={19} /></button>
                )}
                <textarea ref={ta} rows={1} value={input} aria-label={t("placeholder")}
                  placeholder={mode === "build" ? (hasFiles ? t("placeholderEdit") : planEdit ? t("changePlanPh") : t("placeholderBuild")) : mode === "construct" ? t("placeholderConstruct") : file ? t("placeholderFile") : t("placeholder")}
                  dir={input ? (isRTL(input) ? "rtl" : "ltr") : undefined}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                  onPaste={onPaste}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } }} />
                {!busy && !deciding && !input.trim() && !images.length && !file ? (
                  <span className="send-pair">
                    <button className="send mic" aria-label={t("record")} title={t("record")} onClick={startRec}><Svg d={Icon.mic} size={18} /></button>
                    {chatLike && <button className="send live" aria-label={t("liveVoice")} title={t("liveVoice")} onClick={() => openVoice()}><Svg d={Icon.wave} size={18} /></button>}
                  </span>
                ) : busy ? (
                  <span className="send-pair">
                    {input.trim() && <button className="send queue" aria-label={t("sendLater")} title={t("sendLater")} onClick={() => send()}><Svg d={Icon.up} size={18} w={2.4} /></button>}
                    <button className="send stop" aria-label={t("stop")} onClick={() => abortRef.current?.abort()}><Svg d={Icon.stop} size={18} /></button>
                  </span>
                ) : (
                  <button className="send" aria-label={t("send")} onClick={() => send()} disabled={!input.trim() && !file && !images.length}><Svg d={Icon.up} size={18} w={2.4} /></button>
                )}
              </div>
              )}
              <p className="foot-note">{t("footNote")}</p>
            </footer>
          </div>

          {mode === "build" && (hasFiles || busy) && (
            <div className="pv-drag" role="separator" aria-orientation="vertical" aria-label={t("pvResize")} title={t("pvResize")}
              onPointerDown={startDrag} onDoubleClick={() => { setPvW(0); try { localStorage.removeItem("ahm-pv-w"); } catch {} }} />
          )}
          {mode === "build" && (hasFiles || busy) && (
            <div className={"preview-col" + (showPreview ? " open" : "") + (pvW ? " sized" : "")} style={pvW && pvMode === "normal" ? { width: pvW } : undefined}>
              <Workspace files={project} setFiles={setProjectFiles} busy={busy || jobWait} t={t} onPublish={publishSite} publishing={publishing} kind={active.buildKind || "website"} name={active.title}
                onClose={() => setShowPreview(false)} onAsk={(q) => { setShowPreview(false); setPvMode("normal"); send(q); }}
                cloud={!!active.cloudSite} onCloud={() => setSheet({ type: "cloud" })}
                progress={busy || jobWait ? messages[messages.length - 1]?.progress || null : null}
                onAutoFix={(err) => { if (busy || reviewing.current || autoFixes.current >= 2) return false; autoFixes.current++; autoRef.current?.(t("autoFix").replace("{e}", err), 2); return true; }}
                maxed={pvMode === "max"} onMax={() => setPvMode(pvMode === "max" ? "normal" : "max")} onMin={() => setPvMode("min")} />
            </div>
          )}
        </div>
        )}
      </div>

      {voice && (
        <VoiceMode lang={lang} getToken={token} tutor={voice.tutor} greeting={voice.greeting}
          history={(chats.find((c) => c.id === voice.chatId) || (draft.id === voice.chatId ? draft : null))?.messages || []}
          onTurn={voiceTurn} onClose={() => { setVoice(null); loadMe(); }}
          onLimit={(why) => showLimit(why === "voice" ? "voice" : "limit")} />
      )}
      {sheet?.type === "dashboard" && <Dashboard token={token} onClose={() => setSheet(null)} onPlans={() => setSheet({ type: "admin" })} onNotice={() => setSheet({ type: "notice" })} onRelease={() => setSheet({ type: "release" })} />}
      {sheet?.type === "release" && me?.owner && <ReleaseSheet token={token} onClose={() => setSheet(null)} onChanged={() => setReleaseReady(false)} />}
      {sheet?.type === "notice" && me?.owner && <NoticeComposer token={token} onClose={() => setSheet(null)} onSent={loadMe} />}
      {settingsOpen && (
        <Settings push={push} session={session} me={me} onClose={() => setSettingsOpen(false)} onPlans={() => setSheet({ type: "upgrade", reason: "info" })} onPassword={() => setSheet({ type: "password" })} update={update}
          inst={inst} onInstallGuide={() => setSheet({ type: "a2hs" })} onAbout={() => setSheet({ type: "about" })} />
      )}
      {sheet?.type === "screen" && <ScreenGuide info={sheet} onClose={() => setSheet(null)} />}
      {sheet?.type === "cloud" && <CloudSheet site={active.cloudSite} token={token} onEnable={enableCloud} onClose={() => setSheet(null)} />}
      {sheet?.type === "codePreview" && sheet.html && (
        <Sheet label={t("preview")} onClose={() => setSheet(null)}>
          <div className="pv-sheet"><DevicePreview html={sheet.html} t={t} /></div>
          <button className="ghost-btn" onClick={() => setSheet(null)}>{t("close")}</button>
        </Sheet>
      )}
      {sheet?.type === "zipGuide" && <ZipGuide onClose={() => setSheet(null)} />}
      {sheet?.type === "published" && <Published info={sheet} onClose={() => setSheet(null)} />}
      {sheet?.type === "invite" && <Invite token={token} onClose={() => setSheet(null)} />}
      {sheet?.type === "password" && <ChangePassword onClose={() => setSheet(null)} />}
      {sheet?.type === "install" && <InstallHelp onClose={() => setSheet(null)} />}
      {sheet?.type === "a2hs" && <InstallGuide onClose={() => setSheet(null)} />}
      {sheet?.type === "about" && <AboutDev me={me} onClose={() => setSheet(null)} onEdit={(data) => setSheet({ type: "aboutEdit", data })} />}
      {sheet?.type === "aboutEdit" && me?.owner && <AboutEditor data={sheet.data} token={token} onClose={() => setSheet({ type: "about" })} onSaved={() => {}} />}
      {sheet?.type === "feedback" && <Feedback token={token} onClose={() => setSheet(null)} />}
      {sheet?.type === "admin" && <PlanEditor me={me} token={token} onSaved={loadMe} onClose={() => setSheet({ type: "upgrade", reason: "info" })} />}
      {sheet?.type === "upgrade" && <Upgrade reason={sheet.reason} me={me} onClose={() => setSheet(null)} onEdit={() => setSheet({ type: "admin" })} onNotice={() => setSheet({ type: "notice" })} onRelease={() => setSheet({ type: "release" })} />}

    </div>
  );
}

/* ---------------- Root ---------------- */
// Opened from the "reset password" e-mail? (read before the login library clears the address)
const OPENED_FOR_RECOVERY = typeof window !== "undefined" && /type=recovery/.test(window.location.hash + window.location.search);

function NewPassword({ onDone }) {
  const { t } = useLang();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg(/weak|at least|characters/i.test(error.message) ? t("errWeak") : t("errGeneric"));
    else { setMsg("✅ " + t("pwChanged")); setTimeout(onDone, 900); }
  }
  return (
    <div className="auth-wrap">
      <div className="glow" aria-hidden="true" />
      <div className="auth-card">
        <img src="/logo.png" alt="AHM AI" className="auth-logo" />
        <h2>{t("newPw")}</h2>
        <form onSubmit={save}>
          <label className="field">
            <span>{t("password")}</span>
            <div className="pw-wrap">
              <input type={show ? "text" : "password"} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete="new-password" autoFocus />
              <button type="button" className="pw-eye" onClick={() => setShow(!show)}>{show ? t("hidePw") : t("showPw")}</button>
            </div>
          </label>
          <button type="submit" className="gold-btn" disabled={busy}>{busy ? "..." : t("save")}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
      </div>
    </div>
  );
}

function Root() {
  const [session, setSession] = useState(undefined);
  useEffect(() => { // invite link: remember the code until the new account is ready
    try {
      const u = new URL(window.location.href);
      const ref = (u.searchParams.get("ref") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
      if (ref) { localStorage.setItem("ahm-ref", ref); u.searchParams.delete("ref"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    } catch {}
  }, []);
  const [recovery, setRecovery] = useState(OPENED_FOR_RECOVERY);
  const [authMode, setAuthMode] = useState(null); // null = landing page, "login" / "signup" = form
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="splash"><img src="/icon-192.png" alt="AHM AI" /></div>;
  if (session && recovery) return <NewPassword onDone={() => { setRecovery(false); history.replaceState(null, "", "/"); }} />;
  if (session) return <Main session={session} />;
  return authMode ? <Auth key={authMode} initialMode={authMode} onBack={() => setAuthMode(null)} onRecovery={(on) => setRecovery(on !== false)} /> : <Visitor onStart={setAuthMode} />;
}

function Visitor({ onStart }) {
  const { lang } = useLang();
  return <Landing lang={lang} picker={<LangPicker />} onStart={onStart} Svg={Svg} Icon={Icon} botUrl={BOT_URL} />;
}

function SyncThemeColor() { // keep the phone's status-bar color in step with the chosen design
  useEffect(() => { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[currentTheme()]); }, []);
  return null;
}

export default function Home() {
  return <LangProvider><SyncThemeColor /><Root /></LangProvider>;
}
