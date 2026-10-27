"use client";
// A file made in the chat (Excel / PowerPoint / Word / PDF): a small preview and the download buttons.
// The file itself is made on the phone from the JSON the AI wrote (lib/office.js).
import { useEffect, useMemo, useRef, useState } from "react";
import { FORMATS, makeFormat, deliver, sheetGrid, calcSheet, showValue, deckThumbs, docThumb } from "../lib/office";

const KIND = {
  xlsx: { badge: "X", color: "#1D6F42", label: "Excel" },
  pptx: { badge: "P", color: "#C43E1C", label: "PowerPoint" },
  docx: { badge: "W", color: "#2B579A", label: "Word" },
  pdf: { badge: "PDF", color: "#D93025", label: "PDF" },
};
const LABEL = { xlsx: "Excel", pptx: "PowerPoint", docx: "Word", pdf: "PDF" };
const n = (x, lang) => (lang === "en" ? String(x) : String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));

export default function OfficeCard({ text, t, uiLang = "ckb" }) {
  const f = useMemo(() => { try { const j = JSON.parse(text); return j && KIND[j.type] ? j : null; } catch { return null; } }, [text]);
  const [ready, setReady] = useState({});
  const [work, setWork] = useState("");
  const [err, setErr] = useState("");
  const [pv, setPv] = useState(null); // { imgs: [...], pages }
  const [sheet, setSheet] = useState(0);
  const box = useRef(null);
  const jobs = useRef({});

  const prepare = (fmt) => {
    if (!jobs.current[fmt]) jobs.current[fmt] = makeFormat(f, fmt).then((out) => { setReady((r) => ({ ...r, [fmt]: out })); return out; }).catch((e) => { delete jobs.current[fmt]; throw e; });
    return jobs.current[fmt];
  };

  // When the card is on screen: draw the preview and get the main file ready (so one tap opens the share sheet).
  useEffect(() => {
    if (!f || !box.current) return;
    let done = false;
    const go = async () => {
      if (done) return; done = true;
      try {
        if (f.type === "pptx") setPv({ imgs: await deckThumbs(f, 4) });
        else if (f.type === "docx" || f.type === "pdf") { const d = await docThumb(f); setPv({ imgs: [d.src], pages: d.pages }); }
      } catch (e) { console.error("preview", e); }
      prepare(FORMATS[f.type][0]).catch((e) => console.error("file", e));
    };
    if (typeof IntersectionObserver === "undefined") { go(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "200px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [f]);

  async function tap(fmt) {
    setErr("");
    if (ready[fmt]) { await deliver(ready[fmt]).catch(() => setErr(t("ofcErr"))); return; }
    setWork(fmt);
    try { const out = await prepare(fmt); await deliver(out).catch(() => {}); }
    catch (e) { console.error(e); setErr(t("ofcErr")); }
    setWork("");
  }

  if (!f) return <div className="ofc ofc-wait" role="status"><span className="mini-spin" /> {t("ofcMaking")}</div>;
  const K = KIND[f.type], rtl = f.lang !== "en";
  const sub = f.type === "xlsx"
    ? t("ofcSheets").replace("{s}", n(f.sheets.length, uiLang)).replace("{r}", n(f.sheets.reduce((a, s) => a + s.rows.length, 0), uiLang))
    : f.type === "pptx" ? t("ofcSlides").replace("{n}", n(f.slides.length, uiLang))
    : pv?.pages ? t("ofcPages").replace("{n}", n(pv.pages, uiLang)) : "";

  let table = null;
  if (f.type === "xlsx") {
    const sh = f.sheets[Math.min(sheet, f.sheets.length - 1)];
    const g = sheetGrid(sh, f.lang), val = calcSheet(g.grid), types = sh.columns.map((c) => c.type);
    const shown = [...g.rows.slice(0, 8).map((r, i) => ({ r, i: i + 1 })), ...(g.total ? [{ r: g.total, i: g.grid.length - 1, total: true }] : [])];
    table = (
      <>
        {f.sheets.length > 1 && (
          <div className="ofc-tabs" dir={rtl ? "rtl" : "ltr"}>{f.sheets.map((s, i) => <button key={i} className={i === sheet ? "on" : ""} onClick={() => setSheet(i)}>{s.name}</button>)}</div>
        )}
        <div className="ofc-sheet" dir={rtl ? "rtl" : "ltr"}>
          <table>
            <thead><tr>{g.header.map((h, c) => <th key={c}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map(({ r, i, total }) => (
                <tr key={i} className={total ? "tot" : ""}>{r.map((v, c) => <td key={c} className={types[c] && types[c] !== "text" ? "num" : ""}>{showValue(typeof v === "string" && v.startsWith("=") ? val(i, c) : v, types[c], f.lang)}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {g.rows.length > 8 && <div className="ofc-more">+ {n(g.rows.length - 8, uiLang)} {t("ofcMoreRows")}</div>}
        </div>
      </>
    );
  }

  return (
    <div className="ofc" ref={box} dir={uiLang === "en" ? "ltr" : "rtl"}>
      <div className="ofc-head">
        <span className="ofc-badge" style={{ background: K.color }} aria-hidden="true">{K.badge}</span>
        <div className="ofc-name">
          <b><bdi>{f.name}</bdi></b>
          <small><bdi>{K.label}</bdi>{sub && <> · <bdi>{sub}</bdi></>}</small>
        </div>
      </div>
      {table}
      {pv?.imgs?.length > 0 && (
        <div className={"ofc-pv k-" + f.type}>{pv.imgs.map((src, i) => <img key={i} src={src} alt="" />)}</div>
      )}
      {!table && !pv && <div className={"ofc-pv k-" + f.type + " ofc-ph"} aria-hidden="true"><span className="mini-spin" /></div>}
      <div className="ofc-btns">
        {FORMATS[f.type].map((fmt, i) => (
          <button key={fmt} className={i ? "ghost-btn" : "gold-btn"} disabled={!!work} onClick={() => tap(fmt)}>
            {work === fmt ? <><span className="mini-spin" /> {t("ofcPreparing")}</> : <>⬇️ {LABEL[fmt]}</>}
          </button>
        ))}
      </div>
      {err && <p className="ofc-err" role="alert">{err}</p>}
    </div>
  );
}
