"use client";
import { TELEGRAM_BOT } from "../lib/env";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { PAID_PLANS } from "../lib/plans";
import { parseFiles, buildPreview, downloadZip } from "../lib/builder";

const BOT_URL = TELEGRAM_BOT ? `https://t.me/${TELEGRAM_BOT}` : null;
const MAX_FILE_BYTES = 1_500_000;

/* ---------------- small icons ---------------- */
const Icon = {
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  clip: <path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  build: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>,
  zip: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
};
const Svg = ({ d, size = 20, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

/* ---------------- Login / Sign up ---------------- */
function Auth() {
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
        setMsg("✅ ئیمەیڵێکی پشتڕاستکردنەوەمان بۆ ناردیت. بیکەرەوە و لەسەر لینکەکە دابگرە.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg("✅ لینکی گۆڕینی وشەی نهێنی بۆ ئیمەیڵەکەت نێردرا.");
      }
    } catch (err) {
      const m = err.message || "";
      if (m.includes("Invalid login")) setMsg("ئیمەیڵ یان وشەی نهێنی هەڵەیە.");
      else if (m.includes("Email not confirmed")) setMsg("سەرەتا ئیمەیڵەکەت پشتڕاست بکەرەوە.");
      else if (m.includes("already registered")) setMsg("ئەم ئیمەیڵە پێشتر تۆمار کراوە.");
      else if (m.includes("at least") || m.includes("weak")) setMsg("وشەی نهێنی بەهێزتر هەڵبژێرە (پیتی گەورە و بچووک و ژمارە).");
      else if (/load failed|failed to fetch|network/i.test(m)) setMsg("پەیوەندی نەکرا. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدەرەوە.");
      else setMsg("هەڵە: " + m);
    } finally {
      setLoading(false);
    }
  }

  const titles = { login: "چوونەژوورەوە", signup: "دروستکردنی هەژمار", reset: "گۆڕینی وشەی نهێنی" };

  return (
    <div className="auth-wrap">
      <div className="glow" aria-hidden="true" />
      <div className="auth-card">
        <img src="/logo.png" alt="AHM AI" className="auth-logo" />
        <p className="sub">پرسیار بکە، کۆد بنووسە، ئەپ دروست بکە</p>
        <h2>{titles[mode]}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>ئیمەیڵ</span>
            <input type="email" dir="ltr" placeholder="email@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {mode !== "reset" && (
            <label className="field">
              <span>وشەی نهێنی</span>
              <input type="password" dir="ltr" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
          )}
          <button type="submit" className="gold-btn" disabled={loading}>{loading ? "..." : titles[mode]}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
        <div className="links">
          {mode !== "login" && <button onClick={() => { setMode("login"); setMsg(""); }}>هەژمارم هەیە، چوونەژوورەوە</button>}
          {mode !== "signup" && <button onClick={() => { setMode("signup"); setMsg(""); }}>هەژمارت نییە؟ <b>خۆت تۆمار بکە</b></button>}
          {mode === "login" && <button onClick={() => { setMode("reset"); setMsg(""); }}>وشەی نهێنیت لەبیرچووە؟</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Markdown code blocks ---------------- */
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = (className || "").replace("language-", "");
  if (!className && !text.includes("\n")) return <code className="inline">{children}</code>;

  if (lang.startsWith("file:")) {
    const name = lang.slice(5);
    return (
      <div className="file-chip" dir="ltr">
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          <Svg d={Icon.code} size={16} /> <span>{name}</span>
          <em>{text.split("\n").length} lines</em>
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
          {copied ? "✓ Copied" : "Copy"}
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

/* ---------------- Upgrade sheet ---------------- */
function Upgrade({ reason, me, onClose }) {
  const text = {
    limit: "پرسیارەکانی ئەم ماوەیەت تەواو بوون. بۆ بەردەوامبوون پلانێک هەڵبژێرە.",
    pro_only: "ناردنی فایل تایبەتە بە بەکارهێنەرانی Pro.",
    info: "پلانێک هەڵبژێرە کە لەگەڵ کارەکەت بگونجێت.",
  }[reason] || "";
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="پلانەکان" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <h3>پلانەکانی <span className="gold">AHM AI</span></h3>
        <p>{text}</p>
        <div className="plans">
          <div className={"plan" + (!me?.pro ? " current" : "")}>
            <div className="plan-price">بەخۆڕایی</div>
            <div className="plan-limit"><b>30</b> پرسیار / مانگ</div>
            {!me?.pro && <div className="plan-tag">پلانی ئێستات</div>}
          </div>
          {PAID_PLANS.map((p) => (
            <div key={p.id} className={"plan" + (me?.plan === p.id ? " current" : "") + (p.price === 10 ? " best" : "")}>
              {p.price === 10 && <div className="plan-ribbon">باشترین</div>}
              <div className="plan-price">${p.price}<small> / مانگ</small></div>
              <div className="plan-limit"><b>{p.limit}</b> پرسیار</div>
              {me?.plan === p.id && <div className="plan-tag">پلانی ئێستات</div>}
            </div>
          ))}
        </div>
        <ul className="perks">
          <li>ناردنی فایلی کۆد و داگرتنی فایلی چاککراو</li>
          <li>دروستکردنی ئەپی گەورەتر لەگەڵ پێشبینینی زیندوو</li>
        </ul>
        {BOT_URL ? (
          <a className="gold-btn" href={BOT_URL} target="_blank" rel="noreferrer">کڕین لە تەلەگرام</a>
        ) : (
          <p className="muted">بۆتی تەلەگرام بەم زووانە ئامادە دەبێت.</p>
        )}
        <button className="ghost-btn" onClick={onClose}>داخستن</button>
      </div>
    </div>
  );
}

/* ---------------- Live phone preview ---------------- */
function Preview({ files, busy, onClose }) {
  const [device, setDevice] = useState(() => {
    try { return localStorage.getItem("ahm-device") || "iphone"; } catch { return "iphone"; }
  });
  const [view, setView] = useState("app"); // app | code
  const [openFile, setOpenFile] = useState(null);
  const [nonce, setNonce] = useState(0);
  const names = Object.keys(files);
  const html = useMemo(() => buildPreview(files), [files]);

  useEffect(() => { try { localStorage.setItem("ahm-device", device); } catch {} }, [device]);
  useEffect(() => { if (!openFile || !files[openFile]) setOpenFile(names[0] || null); }, [files]);

  return (
    <section className="preview" aria-label="پێشبینین">
      <div className="pv-bar">
        <div className="seg" role="tablist" aria-label="ئامێر">
          <button role="tab" aria-selected={device === "iphone"} className={device === "iphone" ? "on" : ""} onClick={() => setDevice("iphone")}>iPhone</button>
          <button role="tab" aria-selected={device === "android"} className={device === "android" ? "on" : ""} onClick={() => setDevice("android")}>Android</button>
        </div>
        <div className="pv-actions">
          <button className="icon-btn sm" aria-label="کۆد" title="کۆد" onClick={() => setView(view === "app" ? "code" : "app")}>
            <Svg d={view === "app" ? Icon.code : Icon.phone} size={18} />
          </button>
          <button className="icon-btn sm" aria-label="نوێکردنەوە" title="نوێکردنەوە" onClick={() => setNonce(nonce + 1)}>
            <Svg d={Icon.refresh} size={18} />
          </button>
          <button className="icon-btn sm gold" aria-label="داگرتن بە ZIP" title="داگرتن بە ZIP" disabled={!names.length} onClick={() => downloadZip(files)}>
            <Svg d={Icon.zip} size={18} />
          </button>
          {onClose && (
            <button className="icon-btn sm" aria-label="داخستن" onClick={onClose}><Svg d={Icon.close} size={18} /></button>
          )}
        </div>
      </div>

      {view === "app" ? (
        <div className="stage">
          <div className={"device " + device}>
            <div className="screen">
              {device === "iphone" ? <div className="island" aria-hidden="true" /> : <div className="punch" aria-hidden="true" />}
              {html ? (
                <iframe key={nonce} title="ئەپەکەت" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals allow-popups" />
              ) : (
                <div className="screen-empty">
                  <img src="/icon-192.png" alt="" aria-hidden="true" />
                  <p>{busy ? "ئەپەکەت دروست دەکرێت..." : "داوای ئەپێک بکە و لێرە دەیبینیت"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="codeview" dir="ltr">
          <div className="tabs">
            {names.map((n) => (
              <button key={n} className={openFile === n ? "on" : ""} onClick={() => setOpenFile(n)}>{n}</button>
            ))}
          </div>
          <pre><code>{openFile ? files[openFile] : "No files yet"}</code></pre>
        </div>
      )}
      <p className="pv-foot">{names.length ? `${names.length} فایل · خۆکارانە هەڵدەگیرێن` : "هیچ فایلێک نییە هێشتا"}</p>
    </section>
  );
}

/* ---------------- Main app ---------------- */
function Main({ session }) {
  const uid = session.user.id;
  const [mode, setMode] = useState("chat");
  const [chats, setChats] = useState({ chat: [], build: [] });
  const [project, setProject] = useState({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [file, setFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false); // phones only
  const bottom = useRef(null);
  const ta = useRef(null);
  const fileInput = useRef(null);
  const [ready, setReady] = useState(false);

  const messages = chats[mode];
  const setMessages = (list) => setChats((c) => ({ ...c, [mode]: list }));

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

  useEffect(() => {
    try {
      setChats({
        chat: JSON.parse(localStorage.getItem(`ahm-chat-${uid}`) || "[]"),
        build: JSON.parse(localStorage.getItem(`ahm-build-${uid}`) || "[]"),
      });
      setProject(JSON.parse(localStorage.getItem(`ahm-project-${uid}`) || "{}"));
      if (localStorage.getItem("ahm-mode") === "build") setMode("build");
    } catch {}
    setReady(true);
    loadMe();
  }, [uid]);

  useEffect(() => {
    if (!ready) return;
    try {
      const slim = (l) => l.map(({ fixed, ...m }) => m).slice(-80);
      localStorage.setItem(`ahm-chat-${uid}`, JSON.stringify(slim(chats.chat)));
      localStorage.setItem(`ahm-build-${uid}`, JSON.stringify(slim(chats.build)));
    } catch {}
  }, [chats, uid, ready]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(`ahm-project-${uid}`, JSON.stringify(project)); } catch {}
  }, [project, uid, ready]);

  useEffect(() => { if (ready) try { localStorage.setItem("ahm-mode", mode); } catch {} }, [mode, ready]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function newChat() {
    if (busy) return;
    if (mode === "build" && Object.keys(project).length && !confirm("پرۆژەی ئێستا دەسڕێتەوە. پێشتر بە ZIP دایبگرە ئەگەر پێویستتە. بەردەوام بیت؟")) return;
    setMessages([]);
    if (mode === "build") setProject({});
  }

  function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!me?.pro) { setUpgrade("pro_only"); return; }
    if (f.size > MAX_FILE_BYTES) { alert("فایلەکە زۆر گەورەیە (زیاتر لە 1.5MB)."); return; }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, content: String(r.result || "") });
    r.readAsText(f);
  }

  async function send(preset) {
    const text = (preset ?? input).trim() || (file ? "هەڵەکانی ئەم فایلە بدۆزەرەوە و چاکیان بکە." : "");
    if (!text || busy) return;
    const m = mode;
    const sentFile = m === "chat" ? file : null;
    const base = project;
    const next = [...chats[m], { role: "user", content: text, fileName: sentFile?.name }];
    const put = (list) => setChats((c) => ({ ...c, [m]: list }));
    put([...next, { role: "assistant", content: "" }]);
    setInput("");
    setFile(null);
    if (ta.current) ta.current.style.height = "auto";
    setBusy(true);
    if (m === "build") setShowPreview(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({
          mode: m,
          messages: next.map(({ role, content }) => ({ role, content })),
          file: sentFile || undefined,
          project: m === "build" && Object.keys(base).length ? base : undefined,
        }),
      });
      if (res.status === 401) { await supabase.auth.signOut(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        put(next.slice(0, -1));
        setInput(text);
        if (sentFile) setFile(sentFile);
        if (err.error === "limit" || err.error === "pro_only") setUpgrade(err.error);
        else if (err.error === "file_too_big") alert("فایل یان پرۆژەکە زۆر گەورەیە.");
        else throw new Error();
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        put([...next, { role: "assistant", content: acc }]);
        if (m === "build") {
          const got = parseFiles(acc);
          if (Object.keys(got).length) setProject({ ...base, ...got });
        }
      }
      if (sentFile) {
        const { out, applied, failed } = applyEdits(sentFile.content, acc);
        put([...next, { role: "assistant", content: acc, fixed: applied ? { name: fixedName(sentFile.name), content: out } : null, fixInfo: { applied, failed } }]);
      }
      if (m === "build" && Object.keys(parseFiles(acc)).length && window.innerWidth < 900) setShowPreview(true);
    } catch {
      put([...next, { role: "assistant", content: "⚠️ پەیوەندی نەکرا. تکایە دووبارە هەوڵ بدەرەوە." }]);
    } finally {
      setBusy(false);
      loadMe();
    }
  }

  const left = me ? Math.max(0, me.limit - me.used) : null;
  const pct = me ? Math.min(100, (me.used / me.limit) * 100) : 0;
  const hasFiles = Object.keys(project).length > 0;

  const suggestions = mode === "build"
    ? ["ئەپێکی لیستی کار (To-do) دروست بکە بە کوردی", "Make a calculator app with a modern design", "ئەپێکی ژمێرەری خەرجی ڕۆژانە"]
    : ["ڕوونکردنەوەیەک بدە لەسەر زیرەکی دەستکرد", "Write a Python function to sort a list", "اكتب لي رسالة شكر قصيرة"];

  return (
    <div className={"app mode-" + mode}>
      <header>
        <button className="icon-btn" aria-label="نوێ" title="نوێ" onClick={newChat}><Svg d={Icon.plus} /></button>
        <div className="brand">
          <img src="/icon-192.png" alt="" aria-hidden="true" />
          <span className="brand-name">AHM <b>AI</b></span>
        </div>
        <button className="icon-btn" aria-label="چوونەدەرەوە" title="چوونەدەرەوە" onClick={() => supabase.auth.signOut()}><Svg d={Icon.logout} /></button>
      </header>

      <div className="subbar">
        <div className="seg big" role="tablist" aria-label="بەش">
          <button role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "on" : ""} onClick={() => !busy && setMode("chat")}>
            <Svg d={Icon.chat} size={16} /> چات
          </button>
          <button role="tab" aria-selected={mode === "build"} className={mode === "build" ? "on" : ""} onClick={() => !busy && setMode("build")}>
            <Svg d={Icon.build} size={16} /> دروستکردنی ئەپ
          </button>
        </div>
        {me && (
          <button className={"quota" + (me.pro ? " pro" : "")} onClick={() => setUpgrade("info")} aria-label="پلانەکان">
            <span>{me.pro ? `⭐ ${me.planName}` : "بەخۆڕایی"} · {left} ماوە</span>
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
                <h2>{mode === "build" ? "چ ئەپێک دروست بکەین؟" : "چۆن دەتوانم یارمەتیت بدەم؟"}</h2>
                <p className="muted">{mode === "build" ? "ئەپەکەت بەشێوەی زیندوو لە شێوەی مۆبایلدا دەبینیت، و دەتوانیت بە ZIP دایبگریت." : "بە کوردی، عەرەبی یان ئینگلیزی بپرسە."}</p>
                <div className="chips">
                  {suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={"row " + m.role}>
                <div className="bubble" dir={isRTL(m.content) ? "rtl" : "ltr"}>
                  {m.fileName && <div className="file-tag" dir="ltr">📎 {m.fileName}</div>}
                  {m.role === "assistant" ? (
                    m.content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{m.content}</ReactMarkdown>
                      : <span className="typing" aria-label="چاوەڕێ بکە"><i /><i /><i /></span>
                  ) : m.content}
                  {m.fixed && (
                    <button className="gold-btn small" onClick={() => downloadText(m.fixed.name, m.fixed.content)}>
                      ⬇ داگرتنی فایلی چاککراو ({m.fixInfo.applied} گۆڕانکاری)
                    </button>
                  )}
                  {m.fixInfo && !m.fixed && m.fixInfo.failed > 0 && (
                    <p className="muted">نەتوانرا گۆڕانکارییەکان خۆکارانە بخرێنە ناو فایلەکە؛ دەتوانیت لە سەرەوە کۆپییان بکەیت.</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </main>

          <footer>
            {mode === "build" && hasFiles && (
              <button className="open-preview" onClick={() => setShowPreview(true)}>
                <Svg d={Icon.phone} size={18} /> بینینی ئەپەکە
              </button>
            )}
            {file && (
              <div className="attached" dir="ltr">
                📎 {file.name} · {file.content.split("\n").length} lines
                <button aria-label="لابردنی فایل" onClick={() => setFile(null)}>✕</button>
              </div>
            )}
            <div className="composer">
              {mode === "chat" && (
                <>
                  <input ref={fileInput} type="file" hidden onChange={pickFile}
                    accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.html,.css,.scss,.json,.xml,.yml,.yaml,.sql,.sh,.md,.vue,.svelte,text/*" />
                  <button className="attach" aria-label="ناردنی فایل" title="ناردنی فایل (Pro)" onClick={() => fileInput.current?.click()}><Svg d={Icon.clip} /></button>
                </>
              )}
              <textarea ref={ta} rows={1} value={input} aria-label="پەیام"
                placeholder={mode === "build" ? (hasFiles ? "چی بگۆڕم یان زیاد بکەم؟" : "ئەپەکەت وەسف بکە...") : file ? "چی بکەم بەم فایلە؟" : "پەیامێک بنووسە..."}
                dir={isRTL(input) || !input ? "rtl" : "ltr"}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } }} />
              <button className="send" aria-label="ناردن" onClick={() => send()} disabled={busy || (!input.trim() && !file)}><Svg d={Icon.up} size={18} w={2.4} /></button>
            </div>
          </footer>
        </div>

        {mode === "build" && (
          <div className={"preview-col" + (showPreview ? " open" : "")}>
            <Preview files={project} busy={busy} onClose={() => setShowPreview(false)} />
          </div>
        )}
      </div>

      {upgrade && <Upgrade reason={upgrade} me={me} onClose={() => setUpgrade(null)} />}
    </div>
  );
}

/* ---------------- Root ---------------- */
export default function Home() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="splash"><img src="/icon-192.png" alt="AHM AI" /></div>;
  return session ? <Main session={session} /> : <Auth />;
}
