"use client";
// Modern cards inside chat answers:
//   • PlanView     — a website / app / system plan shown as a clean visual plan (not a wall of text)
//   • PredictCard  — a prediction (match, price, election…) with chances as bars
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EMOJI = /^\s*((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:️|‍(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}))*)\s*/u;

// "## 🎯 Title\nbody" sections → [{ icon, title, body }]
function splitPlan(text) {
  const lines = String(text || "").split("\n");
  const head = [], sections = [];
  let cur = null;
  for (const l of lines) {
    const m = /^#{1,3}\s+(.*)$/.exec(l);
    if (m) {
      const e = EMOJI.exec(m[1]);
      cur = { icon: e ? e[1] : "•", title: (e ? m[1].slice(e[0].length) : m[1]).replace(/\*\*/g, "").trim(), body: [] };
      sections.push(cur);
    } else (cur ? cur.body : head).push(l);
  }
  // the end of the last section: the "tap Build it" line and the suggestions block stay outside the cards
  let tail = "";
  if (sections.length) {
    const last = sections[sections.length - 1].body;
    const k = last.findIndex((l) => /^\s*```/.test(l));
    if (k >= 0) { tail = last.slice(k).join("\n"); last.length = k; }
    while (last.length && !last[last.length - 1].trim()) last.pop();
    const lastLine = last[last.length - 1] || "";
    if (/✅|Build it|دروستی بکە|ابنِه|أنشئه/.test(lastLine) && last.length > 1) { tail = lastLine + "\n\n" + tail; last.pop(); }
  }
  return { head: head.join("\n").trim(), sections: sections.map((s) => ({ ...s, body: s.body.join("\n").trim() })), tail: tail.trim() };
}

export const PlanView = memo(function PlanView({ text, MD, label }) {
  const { head, sections, tail } = splitPlan(text);
  if (sections.length < 2) return <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{text}</ReactMarkdown>;
  const [first, ...rest] = sections;
  return (
    <div className="pln">
      {head && <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{head}</ReactMarkdown>}
      <div className="pln-hero">
        <span className="pln-tag">{label}</span>
        <div className="pln-hero-t"><span className="pln-ico" aria-hidden="true">{first.icon}</span><b>{first.title}</b></div>
        {first.body && <div className="pln-hero-b"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{first.body}</ReactMarkdown></div>}
      </div>
      <div className="pln-grid">
        {rest.map((s, i) => (
          <section key={i} className="pln-card" style={{ "--i": i }}>
            <h4><span className="pln-ico" aria-hidden="true">{s.icon}</span>{s.title}</h4>
            {s.body && <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{s.body}</ReactMarkdown>}
          </section>
        ))}
      </div>
      {tail && <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{tail}</ReactMarkdown>}
    </div>
  );
});

const n = (x, lang) => (lang === "en" ? String(x) : String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));
const CONF = { low: 1, medium: 2, high: 3 };

export function PredictCard({ text, t, uiLang }) {
  let p = null;
  try { p = JSON.parse(text); } catch {}
  if (!p || !Array.isArray(p.outcomes) || !p.outcomes.length) return <div className="prd prd-wait"><span className="mini-spin" /></div>;
  const outs = p.outcomes.slice(0, 6).map((o) => ({ label: String(o.label || "").slice(0, 60), pct: Math.max(0, Math.min(100, Number(o.pct) || 0)) }));
  const top = outs.reduce((a, b) => (b.pct > a.pct ? b : a), outs[0]);
  const conf = CONF[p.confidence] || 0;
  return (
    <div className="prd" dir={uiLang === "en" ? "ltr" : "rtl"}>
      <div className="prd-head">
        <span className="prd-badge" aria-hidden="true">🔮</span>
        <div><small>{t("prdTitle")}</small><b dir="auto">{String(p.title || "").slice(0, 120)}</b></div>
      </div>
      {p.score && <div className="prd-score"><small>{t("prdScore")}</small><b dir="ltr">{String(p.score).slice(0, 20)}</b></div>}
      <div className="prd-bars">
        {outs.map((o, i) => (
          <div key={i} className={"prd-row" + (o === top ? " top" : "")}>
            <div className="prd-lbl"><span dir="auto">{o.label}</span><b>{n(Math.round(o.pct), uiLang)}%</b></div>
            <div className="prd-bar"><i style={{ width: o.pct + "%" }} /></div>
          </div>
        ))}
      </div>
      {Array.isArray(p.factors) && p.factors.length > 0 && (
        <ul className="prd-factors">{p.factors.slice(0, 5).map((f, i) => <li key={i} dir="auto">{String(f).slice(0, 160)}</li>)}</ul>
      )}
      <div className="prd-foot">
        {conf > 0 && <span className={"prd-conf c" + conf}>{t("prdConf")}: <i /><i /><i /> {t("prdConf" + conf)}</span>}
        <small>{t("prdNote")}</small>
      </div>
    </div>
  );
}
