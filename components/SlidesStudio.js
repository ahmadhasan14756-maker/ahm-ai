"use client";
// 🎞️ AI presentation designer: a topic or an existing PowerPoint / PDF / Word file → AHM AI rewrites, fixes and
// designs every slide → preview, edit, ask for changes → download an editable PowerPoint and a PDF.
import { useEffect, useMemo, useRef, useState } from "react";
import { THEMES, brandTheme, layoutSlide, renderSlide, exportPptx, exportPdf, readSource } from "../lib/deck";

const TX = {
  title: { ckb: "دیزاینەری پێشکەشکردن", ar: "مصمم العروض التقديمية", en: "Presentation designer" },
  sub: { ckb: "بابەتێک بنووسە یان فایلی PowerPoint، PDF یان Word بار بکە. AHM AI ناوەڕۆکەکە دەخوێنێتەوە، هەڵەکان چاک دەکات، و هەموو سلایدەکان بە دیزاینێکی پڕۆفیشناڵ دروست دەکات.", ar: "اكتب موضوعاً أو ارفع ملف PowerPoint أو PDF أو Word. يقرأ AHM AI المحتوى ويصحح الأخطاء ويصمم كل الشرائح بأسلوب احترافي.", en: "Type a topic or upload a PowerPoint, PDF or Word file. AHM AI reads it, fixes mistakes and designs every slide professionally." },
  back: { ckb: "گەڕانەوە", ar: "رجوع", en: "Back" },
  tabTopic: { ckb: "✍️ بابەت", ar: "✍️ موضوع", en: "✍️ Topic" },
  tabFile: { ckb: "📄 فایل", ar: "📄 ملف", en: "📄 File" },
  topicPh: { ckb: "بۆ نموونە: گرنگیی وزەی خۆر لە کوردستان، بۆ قوتابیانی زانکۆ…", ar: "مثلاً: أهمية الطاقة الشمسية في العراق، لطلاب الجامعة…", en: "e.g. Solar energy in Kurdistan, for university students…" },
  wishPh: { ckb: "ئارەزوومەندانە: چی زیاد بکەم یان بگۆڕم؟", ar: "اختياري: ماذا أضيف أو أغيّر؟", en: "Optional: anything to add or change?" },
  pick: { ckb: "📂 فایل هەڵبژێرە (PowerPoint، PDF، Word)", ar: "📂 اختر ملفاً (PowerPoint، PDF، Word)", en: "📂 Choose a file (PowerPoint, PDF, Word)" },
  pickHint: { ckb: "PPTX، PDF (تا 3MB)، DOCX یان TXT", ar: "PPTX أو PDF (حتى 3MB) أو DOCX أو TXT", en: "PPTX, PDF (up to 3 MB), DOCX or TXT" },
  slidesFound: { ckb: "{n} سلاید دۆزرایەوە", ar: "وُجدت {n} شرائح", en: "{n} slides found" },
  lang: { ckb: "زمان", ar: "اللغة", en: "Language" },
  langAuto: { ckb: "وەک سەرچاوەکە", ar: "مثل المصدر", en: "Same as source" },
  style: { ckb: "شێواز", ar: "الأسلوب", en: "Style" },
  count: { ckb: "ژمارەی سلاید", ar: "عدد الشرائح", en: "Number of slides" },
  auto: { ckb: "خۆکار", ar: "تلقائي", en: "Automatic" },
  keep: { ckb: "هەمان ژمارەی سلایدی فایلەکە بهێڵەوە", ar: "حافظ على عدد شرائح الملف", en: "Keep the file's number of slides" },
  images: { ckb: "🖼️ وێنەی AI زیاد بکە (تا ٣ وێنە)", ar: "🖼️ أضف صور ذكاء اصطناعي (حتى 3)", en: "🖼️ Add AI pictures (up to 3)" },
  make: { ckb: "✨ پێشکەشکردنەکە دروست بکە", ar: "✨ أنشئ العرض", en: "✨ Create the presentation" },
  s_read: { ckb: "ناوەڕۆکەکە دەخوێنرێتەوە و دەنووسرێتەوە…", ar: "جارٍ قراءة المحتوى وإعادة كتابته…", en: "Reading and rewriting the content…" },
  s_pics: { ckb: "وێنەکان دروست دەکرێن…", ar: "جارٍ إنشاء الصور…", en: "Making the pictures…" },
  s_draw: { ckb: "سلایدەکان دیزاین دەکرێن…", ar: "جارٍ تصميم الشرائح…", en: "Designing the slides…" },
  left: { ckb: "ماوەت: {n} پێشکەشکردنی بەخۆڕایی", ar: "المتبقي: {n} عروض مجانية", en: "{n} free presentations left" },
  leftPro: { ckb: "ماوەت ئەمڕۆ: {n} پێشکەشکردن", ar: "المتبقي اليوم: {n} عروض", en: "Left today: {n} presentations" },
  getPro: { ckb: "⭐ Pro وەربگرە بۆ زیاتر", ar: "⭐ اشترك في Pro للمزيد", en: "⭐ Get Pro for more" },
  pptx: { ckb: "⬇️ PowerPoint (دەستکاریکراو)", ar: "⬇️ PowerPoint (قابل للتعديل)", en: "⬇️ PowerPoint (editable)" },
  pdf: { ckb: "⬇️ PDF", ar: "⬇️ PDF", en: "⬇️ PDF" },
  saving: { ckb: "ئامادە دەکرێت…", ar: "جارٍ التحضير…", en: "Preparing…" },
  fixes: { ckb: "✅ ئەم چاککردنانە کران", ar: "✅ التصحيحات التي تمت", en: "✅ Fixes made" },
  edit: { ckb: "✏️ دەستکاریی ئەم سلایدە", ar: "✏️ تعديل هذه الشريحة", en: "✏️ Edit this slide" },
  fTitle: { ckb: "ناونیشان", ar: "العنوان", en: "Title" },
  fSub: { ckb: "دەقی لاوەکی", ar: "النص الفرعي", en: "Subtitle / text" },
  fBullets: { ckb: "خاڵەکان (هەر دێڕێک خاڵێک)", ar: "النقاط (كل سطر نقطة)", en: "Points (one per line)" },
  fNotes: { ckb: "تێبینیی قسەکەر", ar: "ملاحظات المتحدث", en: "Speaker notes" },
  apply: { ckb: "جێبەجێکردن", ar: "تطبيق", en: "Apply" },
  ask: { ckb: "💬 داوای گۆڕانکاری لە AI بکە", ar: "💬 اطلب تعديلاً من الذكاء الاصطناعي", en: "💬 Ask the AI for changes" },
  askPh: { ckb: "بۆ نموونە: سلایدی ٣ کورتتر بکە، سلایدێک دەربارەی تێچوو زیاد بکە…", ar: "مثلاً: اختصر الشريحة 3، أضف شريحة عن التكلفة…", en: "e.g. make slide 3 shorter, add a slide about costs…" },
  askBtn: { ckb: "گۆڕین", ar: "تعديل", en: "Change" },
  asking: { ckb: "گۆڕانکاری دەکرێت…", ar: "جارٍ التعديل…", en: "Changing…" },
  newDeck: { ckb: "➕ پێشکەشکردنی نوێ", ar: "➕ عرض جديد", en: "➕ New presentation" },
  slide: { ckb: "سلاید", ar: "شريحة", en: "Slide" },
  prev: { ckb: "پێشوو", ar: "السابق", en: "Previous" },
  next: { ckb: "دواتر", ar: "التالي", en: "Next" },
  e_limit: { ckb: "پێشکەشکردنە بەخۆڕاییەکانت تەواو بوون. بۆ زیاتر Pro وەربگرە.", ar: "انتهت عروضك المجانية. اشترك في Pro للمزيد.", en: "Your free presentations are used up. Get Pro for more." },
  e_pdf_big: { ckb: "PDFـەکە زۆر گەورەیە (زیاتر لە 3MB). فایلی PowerPoint یان PDFێکی بچووکتر بنێرە.", ar: "ملف PDF كبير جداً (أكثر من 3MB).", en: "The PDF is too big (over 3 MB). Send the PowerPoint or a smaller PDF." },
  e_bad_type: { ckb: "ئەم جۆرە فایلە ناخوێنرێتەوە. PPTX، PDF، DOCX یان TXT بنێرە.", ar: "لا يمكن قراءة هذا النوع. أرسل PPTX أو PDF أو DOCX أو TXT.", en: "This file type can't be read. Send PPTX, PDF, DOCX or TXT." },
  e_too_big: { ckb: "فایلەکە زۆر گەورەیە.", ar: "الملف كبير جداً.", en: "The file is too big." },
  e_empty: { ckb: "سەرەتا بابەتێک بنووسە یان فایلێک هەڵبژێرە.", ar: "اكتب موضوعاً أو اختر ملفاً أولاً.", en: "Type a topic or choose a file first." },
  e_busy: { ckb: "ئێستا داواکاری زۆرە. چەند خولەکێکی تر هەوڵ بدەرەوە.", ar: "الضغط كبير الآن. حاول بعد دقائق.", en: "Very busy right now. Try again in a few minutes." },
  e_slow_down: { ckb: "زۆر خێرایت 🙂 کەمێک چاوەڕێ بکە.", ar: "أنت سريع جداً 🙂 انتظر قليلاً.", en: "Too fast 🙂 wait a moment." },
  e_unsafe: { ckb: "ئەم داواکارییە ڕێگەپێدراو نییە.", ar: "هذا الطلب غير مسموح.", en: "This request is not allowed." },
  e_net: { ckb: "کێشەیەک هەبوو. دووبارە هەوڵ بدەرەوە.", ar: "حدث خطأ. أعد المحاولة.", en: "Something went wrong. Try again." },
  picsSkipped: { ckb: "هەندێک وێنە دروست نەبوون، بەبێ ئەوان بەردەوام بووین.", ar: "تعذر إنشاء بعض الصور، فتابعنا بدونها.", en: "Some pictures could not be made; continued without them." },
  brand: { ckb: "🏷️ لۆگۆ و ڕەنگی براندەکەت", ar: "🏷️ شعارك ولون علامتك", en: "🏷️ Your logo and brand colour" },
  logoAdd: { ckb: "لۆگۆ زیاد بکە", ar: "أضف الشعار", en: "Add logo" },
  logoChange: { ckb: "گۆڕینی لۆگۆ", ar: "تغيير الشعار", en: "Change logo" },
  remove: { ckb: "لابردن", ar: "إزالة", en: "Remove" },
  color: { ckb: "ڕەنگ", ar: "اللون", en: "Colour" },
  colorReset: { ckb: "ڕەنگی شێواز", ar: "لون النمط", en: "Style colour" },
  brandHint: { ckb: "لۆگۆکەت لە سەر هەموو سلایدەکان دەردەکەوێت.", ar: "يظهر شعارك على كل الشرائح.", en: "Your logo appears on every slide." },
  proStyles: { ckb: "پڕۆفیشناڵ", ar: "احترافي", en: "Professional" },
  fItems: { ckb: "بەشەکان (هەر دێڕێک بەشێک)", ar: "الأقسام (كل سطر قسم)", en: "Items (one per line)" },
  note: { ckb: "دەتوانیت فایلی PowerPoint لە PowerPoint، Keynote یان Google Slides بکەیتەوە و هەموو شتێکی دەستکاری بکەیت.", ar: "يمكنك فتح ملف PowerPoint في PowerPoint أو Keynote أو Google Slides وتعديل كل شيء.", en: "Open the PowerPoint file in PowerPoint, Keynote or Google Slides and edit everything." },
};
const STORE = "ahm-deck-v1";
const BRAND = "ahm-brand-v1";
// a picked logo → a small PNG (keeps the saved data and the PowerPoint file light)
const shrinkLogo = (file) => new Promise((ok, bad) => {
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => {
    const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL("image/png"));
  };
  im.onerror = () => { URL.revokeObjectURL(url); bad(new Error("bad_type")); };
  im.src = url;
});

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const toDataUrl = (blob) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });

export default function SlidesStudio({ lang, getToken, onBack, onUpgrade }) {
  const tx = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const uiRtl = lang !== "en";
  const fileRef = useRef(null);
  const [tab, setTab] = useState("topic");
  const [topic, setTopic] = useState("");
  const [src, setSrc] = useState(null); // { text | pdf, name, count }
  const [deckLang, setDeckLang] = useState("auto");
  const [style, setStyle] = useState("corporate");
  const [brand, setBrand] = useState({ logo: "", color: "" });
  const [count, setCount] = useState("");
  const [keep, setKeep] = useState(false);
  const [withPics, setWithPics] = useState(true);
  const [quota, setQuota] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [deck, setDeck] = useState(null);
  const [pics, setPics] = useState({}); // slide index → dataURL
  const [thumbs, setThumbs] = useState([]);
  const [sel, setSel] = useState(0);
  const [ask, setAsk] = useState("");
  const [saving, setSaving] = useState("");
  const [form, setForm] = useState(null);

  const api = async (body) => {
    const r = await fetch("/api/slides", {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (body?.action === "image") { if (!r.ok) throw new Error("img"); return toDataUrl(await r.blob()); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "net"); e.data = j; throw e; }
    return j;
  };
  const errText = (code) => (TX["e_" + code] ? tx("e_" + code) : tx("e_net"));
  useEffect(() => { api().then(setQuota).catch(() => {}); }, []);
  // bring back the last presentation (text only; pictures are not kept)
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(STORE) || "null"); if (d?.deck?.slides?.length) { setDeck(d.deck); setStyle(d.style || "noir"); } } catch {} }, []);
  useEffect(() => { try { if (deck) localStorage.setItem(STORE, JSON.stringify({ deck, style })); } catch {} }, [deck, style]);
  useEffect(() => { try { const b = JSON.parse(localStorage.getItem(BRAND) || "null"); if (b) setBrand({ logo: b.logo || "", color: b.color || "" }); } catch {} }, []);
  const saveBrand = (b) => { setBrand(b); try { localStorage.setItem(BRAND, JSON.stringify(b)); } catch {} };

  const rtl = deck ? deck.lang !== "en" : uiRtl;
  const theme = useMemo(() => brandTheme(THEMES[style] || THEMES.corporate, brand.color), [style, brand.color]);
  const date = useMemo(() => { try { return new Date().toLocaleDateString(deck?.lang === "en" ? "en-GB" : "ar-IQ", { year: "numeric", month: "long", day: "numeric" }); } catch { return ""; } }, [deck?.lang]);
  const layouts = useMemo(() => {
    if (!deck) return [];
    return deck.slides.map((sl, i) => layoutSlide(sl, theme, { rtl, index: i, total: deck.slides.length, deckTitle: deck.title, image: pics[i], logo: brand.logo, date }));
  }, [deck, theme, rtl, pics, brand.logo, date]);

  // draw the previews whenever the deck, style or pictures change
  useEffect(() => {
    if (!layouts.length) { setThumbs([]); return; }
    let stop = false;
    (async () => {
      await Promise.all(["500 30px Vazirmatn", "800 30px Vazirmatn"].map((f) => document.fonts?.load?.(f).catch(() => {})));
      const out = [];
      for (const E of layouts) { if (stop) return; out.push((await renderSlide(E, { px: 1280 })).toDataURL("image/jpeg", 0.88)); }
      if (!stop) setThumbs(out);
    })();
    return () => { stop = true; };
  }, [layouts]);
  useEffect(() => { if (deck && sel >= deck.slides.length) setSel(0); }, [deck]);
  useEffect(() => {
    const s = deck?.slides[sel];
    setForm(s ? { title: s.title || "", sub: s.subtitle || s.text || s.quote || "", bullets: (s.layout === "agenda" ? s.items || [] : s.bullets || []).join("\n"), notes: s.notes || "" } : null);
  }, [deck, sel]);

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    try { const s = await readSource(f); setSrc(s); if (s.count) setKeep(false); } catch (er) { setError(errText(er.message)); }
  }

  async function makePics(d) {
    const want = d.slides.map((s, i) => [i, s.image]).filter(([, p]) => p && p.trim()).slice(0, 3);
    if (!want.length) return {};
    setBusy("s_pics");
    const got = {};
    let missed = false;
    await Promise.all(want.map(async ([i, p]) => { try { got[i] = await api({ action: "image", prompt: p }); } catch { missed = true; } }));
    if (missed) setError(tx("picsSkipped"));
    return got;
  }

  async function make() {
    if (busy) return;
    setError("");
    const useFile = tab === "file" && src;
    if (!useFile && !topic.trim()) { setError(tx("e_empty")); return; }
    setBusy("s_read");
    try {
      const j = await api({ action: "make", topic: topic.trim(), text: useFile ? src.text : "", pdf: useFile ? src.pdf : undefined,
        lang: deckLang === "auto" ? undefined : deckLang, slides: !keep && count ? +count : undefined, keep: useFile && keep, count: src?.count });
      if (j.left != null) setQuota((q) => ({ ...q, left: j.left }));
      setPics({}); setSel(0);
      const images = withPics && quota?.images ? await makePics(j.deck) : {};
      setBusy("s_draw");
      setPics(images); setDeck(j.deck);
    } catch (e) {
      setError(errText(e.message));
      if (e.message === "limit") setQuota((q) => ({ ...q, left: 0 }));
    }
    setBusy("");
  }

  async function revise() {
    if (!deck || !ask.trim() || busy) return;
    setBusy("asking"); setError("");
    try {
      const j = await api({ action: "revise", deck, ask: ask.trim() });
      // keep pictures for slides that still want one in the same place
      setPics((p) => Object.fromEntries(Object.entries(p).filter(([i]) => j.deck.slides[i]?.image)));
      setDeck(j.deck); setAsk("");
    } catch (e) { setError(errText(e.message)); }
    setBusy("");
  }

  function applyEdit() {
    if (!form) return;
    setDeck((d) => {
      const slides = d.slides.map((s, i) => {
        if (i !== sel) return s;
        const n = { ...s, title: form.title, notes: form.notes };
        if (s.layout === "quote") n.quote = form.sub; else if ("subtitle" in s && ["title", "section", "closing"].includes(s.layout)) n.subtitle = form.sub; else n.text = form.sub;
        const lines = form.bullets.split("\n").map((b) => b.trim()).filter(Boolean);
        if (s.layout === "agenda") n.items = lines.slice(0, 7); else n.bullets = lines.slice(0, 6);
        return n;
      });
      return { ...d, slides };
    });
  }

  async function download(kind) {
    if (!deck || saving) return;
    setSaving(kind);
    try {
      const name = (deck.title || "AHM-AI").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "AHM-AI";
      if (kind === "pptx") { const f = await exportPptx(deck, layouts, { rtl, theme, fileName: name }); save(f.blob, f.name); }
      else {
        const canvases = [];
        for (const E of layouts) canvases.push(await renderSlide(E, { px: 1920 }));
        const f = await exportPdf(canvases, { fileName: name }); save(f.blob, f.name);
      }
    } catch (e) { console.error(e); setError(tx("e_net")); }
    setSaving("");
  }

  const quotaLine = quota && quota.left != null ? (quota.pro ? tx("leftPro") : tx("left")).replace("{n}", quota.left) : "";
  const out = quota && quota.left === 0;

  return (
    <div className="house slides" dir={uiRtl ? "rtl" : "ltr"}>
      <div className="house-inner">
        <button className="learn-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {tx("back")}
        </button>
        <h2 className="house-h">🎞️ {tx("title")}</h2>
        {!deck && <p className="muted house-sub">{tx("sub")}</p>}
        {quotaLine && <p className="house-quota">{quotaLine}</p>}
        {error && <p className="learn-err" role="alert">{error}</p>}

        {!deck && (
          <div className="house-card">
            <div className="seg lang-seg" role="tablist">
              <button role="tab" aria-selected={tab === "topic"} className={tab === "topic" ? "on" : ""} onClick={() => setTab("topic")}>{tx("tabTopic")}</button>
              <button role="tab" aria-selected={tab === "file"} className={tab === "file" ? "on" : ""} onClick={() => setTab("file")}>{tx("tabFile")}</button>
            </div>
            {tab === "file" && (
              <>
                <input ref={fileRef} type="file" hidden accept=".pptx,.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFile} />
                <button className="house-drop" onClick={() => fileRef.current?.click()}>
                  <b>{src ? "📄 " + src.name : tx("pick")}</b>
                  <small>{src?.count ? tx("slidesFound").replace("{n}", src.count) : tx("pickHint")}</small>
                </button>
                {src?.count > 0 && (
                  <label className="house-check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /><span><b>{tx("keep")}</b></span></label>
                )}
              </>
            )}
            <label className="house-label">{tab === "topic" ? tx("tabTopic").replace(/^\S+\s/, "") : tx("wishPh")}
              <textarea value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 3000))} placeholder={tab === "topic" ? tx("topicPh") : tx("wishPh")} rows={tab === "topic" ? 3 : 2} />
            </label>
            <div className="house-meta">
              <label>{tx("lang")}
                <select value={deckLang} onChange={(e) => setDeckLang(e.target.value)}>
                  <option value="auto">{tx("langAuto")}</option><option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option>
                </select>
              </label>
              <label>{tx("count")}
                <input type="number" min="3" max="25" placeholder={tx("auto")} value={count} disabled={keep} onChange={(e) => setCount(e.target.value)} />
              </label>
            </div>
            <StylePicker style={style} setStyle={setStyle} lang={lang} tx={tx} />
            <BrandPicker brand={brand} setBrand={saveBrand} theme={THEMES[style] || THEMES.corporate} tx={tx} onError={(c) => setError(errText(c))} />
            {quota?.images && (
              <label className="house-check"><input type="checkbox" checked={withPics} onChange={(e) => setWithPics(e.target.checked)} /><span><b>{tx("images")}</b></span></label>
            )}
            {out ? <button className="gold-btn" onClick={onUpgrade}>{tx("getPro")}</button> : (
              <button className="gold-btn" disabled={!!busy} onClick={make}>
                {busy ? <><span className="mini-spin" /> {tx(busy)}</> : tx("make")}
              </button>
            )}
          </div>
        )}

        {deck && (
          <>
            <div className="sl-bar">
              <button className="gold-btn small" disabled={!!saving || !thumbs.length} onClick={() => download("pptx")}>{saving === "pptx" ? tx("saving") : tx("pptx")}</button>
              <button className="gold-btn small" disabled={!!saving || !thumbs.length} onClick={() => download("pdf")}>{saving === "pdf" ? tx("saving") : tx("pdf")}</button>
              <button className="ghost-btn" disabled={!!busy} onClick={() => { setDeck(null); setPics({}); setThumbs([]); try { localStorage.removeItem(STORE); } catch {} }}>{tx("newDeck")}</button>
            </div>
            <StylePicker style={style} setStyle={setStyle} lang={lang} tx={tx} />
            <BrandPicker brand={brand} setBrand={saveBrand} theme={THEMES[style] || THEMES.corporate} tx={tx} onError={(c) => setError(errText(c))} />
            <figure className="sl-main" dir="ltr">
              {thumbs[sel] ? <img src={thumbs[sel]} alt={`${tx("slide")} ${sel + 1}`} /> : <div className="sl-wait"><span className="mini-spin" /></div>}
              <figcaption dir={uiRtl ? "rtl" : "ltr"}>
                <button className="ghost-btn" disabled={sel === 0} onClick={() => setSel(sel - 1)}>{uiRtl ? "→" : "←"} {tx("prev")}</button>
                <span>{tx("slide")} {sel + 1} / {deck.slides.length}</span>
                <button className="ghost-btn" disabled={sel >= deck.slides.length - 1} onClick={() => setSel(sel + 1)}>{tx("next")} {uiRtl ? "←" : "→"}</button>
              </figcaption>
            </figure>
            <div className="sl-thumbs" dir={rtl ? "rtl" : "ltr"}>
              {deck.slides.map((_, i) => (
                <button key={i} className={i === sel ? "on" : ""} onClick={() => setSel(i)} aria-label={`${tx("slide")} ${i + 1}`}>
                  {thumbs[i] ? <img src={thumbs[i]} alt="" /> : <span className="mini-spin" />}<em>{i + 1}</em>
                </button>
              ))}
            </div>

            <div className="house-card">
              <h3>{tx("ask")}</h3>
              <textarea className="sl-ask" value={ask} onChange={(e) => setAsk(e.target.value.slice(0, 1200))} placeholder={tx("askPh")} rows={2} />
              <button className="gold-btn" disabled={!ask.trim() || !!busy} onClick={revise}>{busy === "asking" ? <><span className="mini-spin" /> {tx("asking")}</> : tx("askBtn")}</button>
            </div>

            {form && (
              <details className="house-card sl-edit">
                <summary><h3>{tx("edit")} ({sel + 1})</h3></summary>
                <label className="house-label">{tx("fTitle")}<textarea rows={1} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label className="house-label">{tx("fSub")}<textarea rows={2} value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} /></label>
                {["bullets", "image", "chart", "agenda"].includes(deck.slides[sel]?.layout) && (
                  <label className="house-label">{deck.slides[sel]?.layout === "agenda" ? tx("fItems") : tx("fBullets")}<textarea rows={5} value={form.bullets} onChange={(e) => setForm({ ...form, bullets: e.target.value })} /></label>
                )}
                <label className="house-label">{tx("fNotes")}<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                <button className="gold-btn" onClick={applyEdit}>{tx("apply")}</button>
              </details>
            )}

            {deck.corrections?.length > 0 && (
              <details className="house-card">
                <summary><h3>{tx("fixes")} ({deck.corrections.length})</h3></summary>
                <ul className="house-notes">{deck.corrections.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </details>
            )}
            <p className="cs-note">{tx("note")}</p>
          </>
        )}
      </div>
    </div>
  );
}

function BrandPicker({ brand, setBrand, theme, tx, onError }) {
  const ref = useRef(null);
  async function pick(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 8_000_000) { onError("too_big"); return; }
    try { setBrand({ ...brand, logo: await shrinkLogo(f) }); } catch { onError("bad_type"); }
  }
  return (
    <div className="sl-brand">
      <p className="sl-label">{tx("brand")}</p>
      <div className="sl-brand-row">
        <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} />
        <button type="button" className="sl-logo" onClick={() => ref.current?.click()}>
          {brand.logo ? <img src={brand.logo} alt="" /> : <span aria-hidden="true">＋</span>}
          <b>{brand.logo ? tx("logoChange") : tx("logoAdd")}</b>
        </button>
        {brand.logo && <button type="button" className="ghost-btn sl-mini" onClick={() => setBrand({ ...brand, logo: "" })}>{tx("remove")}</button>}
        <label className="sl-color">
          <input type="color" value={"#" + (brand.color || theme.accent)} onChange={(e) => setBrand({ ...brand, color: e.target.value.replace("#", "").toUpperCase() })} />
          <span>{tx("color")}</span>
        </label>
        {brand.color && <button type="button" className="ghost-btn sl-mini" onClick={() => setBrand({ ...brand, color: "" })}>{tx("colorReset")}</button>}
      </div>
      <small className="muted">{tx("brandHint")}</small>
    </div>
  );
}

function StylePicker({ style, setStyle, lang, tx }) {
  const all = Object.entries(THEMES).sort((a, b) => (b[1].pro ? 1 : 0) - (a[1].pro ? 1 : 0));
  return (
    <div>
      <p className="sl-label">{tx("style")}</p>
      <div className="sl-styles">
        {all.map(([k, t]) => (
          <button key={k} className={style === k ? "on" : ""} aria-pressed={style === k} onClick={() => setStyle(k)}>
            <i style={{ background: `linear-gradient(135deg, #${t.bg}, #${t.bg2})` }}><b style={{ background: `#${t.accent}` }} /><b style={{ background: `#${t.text}`, width: "60%" }} /></i>
            <span>{t.name[lang] || t.name.ckb}</span>
            {t.pro && <em className="sl-pro">{tx("proStyles")}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}
