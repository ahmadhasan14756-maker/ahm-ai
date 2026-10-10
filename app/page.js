"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "";
const BOT_URL = BOT ? `https://t.me/${BOT.replace("@", "")}` : null;
const MAX_FILE_BYTES = 1_500_000;

/* ---------------- Login / Sign up ---------------- */
function Auth() {
  const [mode, setMode] = useState("login"); // login | signup | reset
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
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
      else if (m.includes("at least")) setMsg("وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت.");
      else setMsg("هەڵە: " + m);
    } finally {
      setLoading(false);
    }
  }

  const titles = { login: "چوونەژوورەوە", signup: "خۆتۆمارکردن", reset: "گۆڕینی وشەی نهێنی" };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src="/logo.png" alt="AHM AI" className="auth-logo" />
        <p className="sub">زیرەکی دەستکرد بە کوردی، عەرەبی و ئینگلیزی</p>
        <h2>{titles[mode]}</h2>
        <form onSubmit={submit}>
          <label className="sr" htmlFor="email">ئیمەیڵ</label>
          <input id="email" type="email" dir="ltr" placeholder="email@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {mode !== "reset" && (
            <>
              <label className="sr" htmlFor="pw">وشەی نهێنی</label>
              <input id="pw" type="password" dir="ltr" placeholder="وشەی نهێنی" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </>
          )}
          <button type="submit" disabled={loading}>{loading ? "..." : titles[mode]}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
        <div className="links">
          {mode !== "login" && <button onClick={() => { setMode("login"); setMsg(""); }}>چوونەژوورەوە</button>}
          {mode !== "signup" && <button onClick={() => { setMode("signup"); setMsg(""); }}>هەژمارت نییە؟ خۆت تۆمار بکە</button>}
          {mode === "login" && <button onClick={() => { setMode("reset"); setMsg(""); }}>وشەی نهێنیت لەبیرچووە؟</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Code block with copy button ---------------- */
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = (className || "").replace("language-", "");
  if (!className && !text.includes("\n")) return <code className="inline">{children}</code>;
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

const isRTL = (s) => /[؀-ۿ]/.test((s || "").slice(0, 200));

/* Apply SEARCH/REPLACE edit blocks from the AI to the original file. */
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
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fixedName(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) + "-fixed" + name.slice(i) : name + "-fixed";
}

/* ---------------- Upgrade sheet ---------------- */
function Upgrade({ reason, onClose }) {
  const text = {
    limit: "پرسیارە بەخۆڕاییەکانی ئەمڕۆت تەواو بوون. سبەی نوێ دەبنەوە، یان ئێستا ببە بە Pro.",
    pro_only: "ناردنی فایل تایبەتە بە بەکارهێنەرانی Pro.",
    info: "Pro پرسیاری زیاتر لە ڕۆژێکدا و ناردنی فایلی کۆدی گەورەت پێدەدات.",
  }[reason] || "";
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-badge">PRO</div>
        <h3>ببە بە AHM AI Pro</h3>
        <p>{text}</p>
        <ul>
          <li>پرسیاری زۆر زیاتر لە ڕۆژێکدا</li>
          <li>ناردنی فایلی کۆد و چاککردنی هەڵەکانی</li>
          <li>وەڵامی درێژتر بۆ پرۆژەی گەورە</li>
        </ul>
        {BOT_URL ? (
          <a className="gold-btn" href={BOT_URL} target="_blank" rel="noreferrer">کڕینی Pro لە تەلەگرام</a>
        ) : (
          <p className="muted">بۆتی تەلەگرام بەم زووانە ئامادە دەبێت.</p>
        )}
        <button className="ghost-btn" onClick={onClose}>داخستن</button>
      </div>
    </div>
  );
}

/* ---------------- Chat ---------------- */
function Chat({ session }) {
  const storeKey = "ahm-chat-" + session.user.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [file, setFile] = useState(null); // {name, content}
  const bottom = useRef(null);
  const ta = useRef(null);
  const fileInput = useRef(null);

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
    try { setMessages(JSON.parse(localStorage.getItem(storeKey) || "[]")); } catch {}
    loadMe();
  }, [storeKey]);

  useEffect(() => {
    try {
      const slim = messages.map(({ fixed, ...m }) => m);
      localStorage.setItem(storeKey, JSON.stringify(slim.slice(-100)));
    } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, storeKey]);

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

  async function send() {
    const text = input.trim() || (file ? "هەڵەکانی ئەم فایلە بدۆزەرەوە و چاکیان بکە." : "");
    if (!text || busy) return;
    const sentFile = file;
    const userMsg = { role: "user", content: text, fileName: sentFile?.name };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setFile(null);
    if (ta.current) ta.current.style.height = "auto";
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          file: sentFile || undefined,
        }),
      });
      if (res.status === 401) { await supabase.auth.signOut(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(next.slice(0, -1));
        setInput(text);
        if (sentFile) setFile(sentFile);
        if (err.error === "limit" || err.error === "pro_only") setUpgrade(err.error);
        else if (err.error === "file_too_big") alert("فایلەکە زۆر گەورەیە.");
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
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (sentFile) {
        const { out, applied, failed } = applyEdits(sentFile.content, acc);
        setMessages([...next, {
          role: "assistant", content: acc,
          fixed: applied ? { name: fixedName(sentFile.name), content: out } : null,
          fixInfo: { applied, failed },
        }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "⚠️ پەیوەندی نەکرا. تکایە دووبارە هەوڵ بدەرەوە." }]);
    } finally {
      setBusy(false);
      loadMe();
    }
  }

  const left = me ? Math.max(0, me.limit - me.used) : null;

  return (
    <div className="app">
      <header>
        <button className="icon-btn" aria-label="چاتی نوێ" title="چاتی نوێ" onClick={() => !busy && setMessages([])}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <div className="brand">
          <img src="/icon-192.png" alt="" aria-hidden="true" />
          <span className="brand-name">AHM <b>AI</b></span>
        </div>
        <button className="icon-btn" aria-label="چوونەدەرەوە" title="چوونەدەرەوە" onClick={() => supabase.auth.signOut()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        </button>
      </header>

      {me && (
        <button className={"plan-bar" + (me.pro ? " pro" : "")} onClick={() => setUpgrade("info")}>
          {me.pro
            ? <>⭐ Pro · {left} پرسیار ماوە ئەمڕۆ</>
            : <>بەخۆڕایی · {left} لە {me.limit} پرسیار ماوە ئەمڕۆ · <u>ببە بە Pro</u></>}
        </button>
      )}

      <main>
        {messages.length === 0 && (
          <div className="empty">
            <img src="/icon-192.png" alt="" aria-hidden="true" className="empty-logo" />
            <h2>چۆن دەتوانم یارمەتیت بدەم؟</h2>
            <div className="chips">
              {["ڕوونکردنەوەیەک بدە لەسەر زیرەکی دەستکرد", "Write a Python function to sort a list", "اكتب لي رسالة شكر قصيرة"].map((s) => (
                <button key={s} onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"row " + m.role}>
            <div className="bubble" dir={isRTL(m.content) ? "rtl" : "ltr"}>
              {m.fileName && <div className="file-tag" dir="ltr">📎 {m.fileName}</div>}
              {m.role === "assistant" ? (
                m.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock, pre: ({ children }) => <>{children}</> }}>
                    {m.content}
                  </ReactMarkdown>
                ) : <span className="typing"><i /><i /><i /></span>
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
        {file && (
          <div className="attached" dir="ltr">
            📎 {file.name} · {file.content.split("\n").length} lines
            <button aria-label="لابردنی فایل" onClick={() => setFile(null)}>✕</button>
          </div>
        )}
        <div className="composer">
          <input ref={fileInput} type="file" hidden onChange={pickFile}
            accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.html,.css,.scss,.json,.xml,.yml,.yaml,.sql,.sh,.md,.vue,.svelte,text/*" />
          <button className="attach" aria-label="ناردنی فایل" title="ناردنی فایل (Pro)" onClick={() => fileInput.current?.click()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>
          </button>
          <textarea ref={ta} rows={1} value={input} placeholder={file ? "چی بکەم بەم فایلە؟" : "پەیامێک بنووسە..."}
            aria-label="پەیام"
            dir={isRTL(input) || !input ? "rtl" : "ltr"}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); send(); } }} />
          <button className="send" aria-label="ناردن" onClick={send} disabled={busy || (!input.trim() && !file)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </footer>

      {upgrade && <Upgrade reason={upgrade} onClose={() => setUpgrade(null)} />}
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
  return session ? <Chat session={session} /> : <Auth />;
}
