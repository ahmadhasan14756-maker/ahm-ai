"use client";
// 🏗️ AHM AI Construction & Design Studio — the hub for real-photo redesigns:
//   A. Interior design  B. Exterior design  C. Floor plan studio (the house planner)  D. AI redesign (anything)
// Photos are redesigned by a real image AI (server: /api/redesign). Projects are saved privately per user.
import { useEffect, useRef, useState } from "react";

const L = (ckb, ar, en) => ({ ckb, ar, en });
const TX = {
  title: L("ستۆدیۆی بیناسازی و دیزاین", "استوديو البناء والتصميم", "Construction & Design Studio"),
  sub: L("وێنەی ژوورەکەت، خانووەکەت یان نەخشەکەت بنێرە — AHM AI بە دیزاینێکی نوێ و پڕۆفیشناڵ دروستی دەکاتەوە.", "أرسل صورة غرفتك أو منزلك أو مخططك — يعيد AHM AI تصميمه باحتراف.", "Send a photo of your room, house or plan — AHM AI redesigns it professionally."),
  back: L("گەڕانەوە", "رجوع", "Back"),
  t_interior: L("دیزاینی ناوەوە", "التصميم الداخلي", "Interior design"),
  t_interiorSub: L("وێنەی ژوورێک بنێرە: هۆڵ، ژووری نوستن، چێشتخانە، حەمام، ئۆفیس…", "أرسل صورة غرفة: صالة، نوم، مطبخ، حمام، مكتب…", "Send a room photo: living room, bedroom, kitchen, bath, office…"),
  t_exterior: L("دیزاینی دەرەوە", "التصميم الخارجي", "Exterior design"),
  t_exteriorSub: L("ڕووکاری خانوو، باخچە، گەراج، بالکۆن و ڕووناکیی دەرەوە", "واجهة المنزل، الحديقة، الكراج، الشرفات والإضاءة", "House facades, gardens, garages, balconies and outdoor lighting"),
  t_plan: L("نەخشە و ئەندازیاری", "المخططات والعمارة", "Floor plan & architecture"),
  t_planSub: L("نەخشە بنێرە ← ژوورەکان دەخوێنرێنەوە، خانووەکەت لە سەرەوە، وێنەی هەموو ژوورەکان", "أرسل مخططاً ← قراءة الغرف، منزلك من الأعلى، صور كل الغرف", "Upload a plan → rooms read, your house from above, every room pictured"),
  t_redesign: L("دیزاینی نوێی هەر وێنەیەک", "إعادة تصميم أي صورة", "AI redesign studio"),
  t_redesignSub: L("هەر وێنەیەک بنێرە و بڵێ چی بگۆڕێت — بەراوردی پێش و دوا", "أرسل أي صورة وقل ما تريد تغييره — مقارنة قبل وبعد", "Any photo, say what to change — compare before and after"),
  t_chat: L("ڕاوێژکاری بیناسازی", "مستشار البناء", "Construction assistant"),
  t_chatSub: L("پرسیار، تێچوو و کەرەستە، زاراوەکان", "أسئلة، التكلفة والمواد، المصطلحات", "Questions, costs & materials, terms"),
  recent: L("پرۆژەکانی دوایی", "المشاريع الأخيرة", "Recent projects"),
  noProjects: L("هێشتا هیچ پرۆژەیەک نییە. ئامرازێک هەڵبژێرە و یەکەم دیزاینەکەت دروست بکە ✨", "لا مشاريع بعد. اختر أداة وأنشئ أول تصميم ✨", "No projects yet. Pick a tool and make your first design ✨"),
  upload: L("📷 وێنەکە ڕابکێشە ئێرە یان دایبگرە بۆ هەڵبژاردن", "📷 اسحب الصورة هنا أو اضغط للاختيار", "📷 Drop a photo here or tap to choose"),
  uploadHint: L("JPG، PNG یان HEIC · وێنەیەکی ڕوون و پڕ ڕووناکی باشترین ئەنجام دەدات", "JPG أو PNG أو HEIC · الصورة الواضحة تعطي أفضل نتيجة", "JPG, PNG or HEIC · a clear, bright photo gives the best result"),
  change: L("گۆڕینی وێنە", "تغيير الصورة", "Change photo"),
  category: L("جۆر", "النوع", "Category"),
  style: L("شێواز", "الأسلوب", "Style"),
  customPh: L("شێوازەکەت وەسف بکە…", "صف أسلوبك…", "Describe your style…"),
  ask: L("چی بگۆڕێت؟", "ماذا تريد أن يتغير؟", "What should change?"),
  askPh: L("بۆ نموونە: قەنەفەی بێژ، ڕووناکیی نەرمی بنمیچ، زەوی مەڕمەڕ، ڕووەکی ناوماڵ، و شوێنی پەنجەرەکان وەک خۆی بمێنێت", "مثلاً: كنب بيج، إضاءة سقف ناعمة، أرضية رخام، نباتات داخلية، مع إبقاء النوافذ كما هي", "e.g. beige sofas, soft ceiling lights, marble floor, indoor plants, keep the windows where they are"),
  advanced: L("⚙️ ڕێکخستنی زیاتر", "⚙️ إعدادات متقدمة", "⚙️ Advanced settings"),
  colors: L("ڕەنگەکان", "الألوان", "Colours"),
  materials: L("کەرەستەکان", "المواد", "Materials"),
  light: L("ڕووناکی", "الإضاءة", "Lighting"),
  l_day: L("ڕۆژ", "نهار", "Day"), l_golden: L("ئاوابوون", "غروب", "Golden hour"), l_night: L("شەو", "ليل", "Night"),
  keep: L("شێوەی ژوورەکە/بیناکە وەک خۆی بهێڵەوە (دیوار، پەنجەرە، دەرگا)", "حافظ على شكل المكان (الجدران، النوافذ، الأبواب)", "Keep the structure (walls, windows, doors)"),
  hd: L("کوالیتیی بەرز (1920px) — بە ٢ وێنە حیساب دەکرێت", "جودة عالية (1920px) — تُحسب صورتين", "High quality (1920px) — counts as 2 pictures"),
  make: L("✨ دیزاینەکە دروست بکە", "✨ أنشئ التصميم", "✨ Create the design"),
  again: L("🔄 وەشانێکی تر", "🔄 نسخة أخرى", "🔄 Another version"),
  download: L("⬇️ داگرتن", "⬇️ تنزيل", "⬇️ Download"),
  newPhoto: L("➕ وێنەیەکی نوێ", "➕ صورة جديدة", "➕ New photo"),
  p_prep: L("ئامادەکردنی وێنەکە…", "تجهيز الصورة…", "Preparing the photo…"),
  p_make: L("AI دیزاینەکە دروست دەکات… (١٠–٤٠ چرکە)", "الذكاء الاصطناعي يصمم… (10–40 ثانية)", "The AI is designing… (10–40 s)"),
  before: L("پێش", "قبل", "Before"), after: L("دوا", "بعد", "After"),
  results: L("وەشانەکان", "النسخ", "Versions"),
  left: L("ماوەت: {n} وێنەی بەخۆڕایی", "المتبقي: {n} صور مجانية", "{n} free pictures left"),
  leftPro: L("ماوەت ئەمڕۆ: {n} وێنە", "المتبقي اليوم: {n} صور", "Left today: {n} pictures"),
  getPro: L("⭐ Pro وەربگرە بۆ وێنەی زیاتر", "⭐ اشترك في Pro لصور أكثر", "⭐ Get Pro for more pictures"),
  rename: L("گۆڕینی ناو", "إعادة التسمية", "Rename"),
  del: L("سڕینەوە", "حذف", "Delete"),
  delQ: L("ئەم پرۆژەیە بسڕدرێتەوە؟", "حذف هذا المشروع؟", "Delete this project?"),
  untitled: L("پرۆژەی بێ ناو", "مشروع بلا اسم", "Untitled project"),
  note: L("⚠️ ئەمانە بیرۆکەی دیزاینن. AI شێوەی شوێنەکە بە نزیکی دەپارێزێت، بەڵام ڕێک ١٠٠٪ نییە. بۆ کاری بیناسازی ڕاوێژ بە ئەندازیار بکە.", "⚠️ هذه أفكار تصميم. يحافظ الذكاء الاصطناعي على شكل المكان تقريباً لا بدقة 100٪. استشر مهندساً قبل البناء.", "⚠️ These are design ideas. The AI keeps the space's shape approximately, not 100% exactly. Consult an engineer before building."),
  simpleNote: L("ℹ️ ئەمڕۆ خزمەتگوزارییە سەرەکییەکە پڕ بووە، بۆیە ئەم وەشانە بە خزمەتگوزارییە یەدەگەکە دروست کرا. ئەو وێنەکەت ناخوێنێتەوە، تەنها وەسفەکەی بەکاردەهێنێت، بۆیە کەمتر لە ژوورەکەت دەچێت.", "ℹ️ الخدمة الرئيسية ممتلئة اليوم، فصُنعت هذه النسخة بالخدمة الاحتياطية التي تستخدم وصف الصورة فقط، لذا قد تشبه مكانك أقل.", "ℹ️ The main service is full today, so this version was made by the back-up service, which uses a description of your photo only — it may look less like your space."),
  e_limit: L("وێنە بەخۆڕاییەکانت تەواو بوون. بۆ زیاتر Pro وەربگرە.", "انتهت صورك المجانية. اشترك في Pro.", "Your free pictures are used up. Get Pro for more."),
  e_daily_full: L("ئەمڕۆ ژمارەی وێنەی بەخۆڕایی بۆ هەموو ئەپەکە تەواو بوو. بەیانی هەوڵ بدەرەوە 🌙", "انتهت الصور المجانية لكل التطبيق اليوم. حاول غداً 🌙", "Today's free pictures for the whole app are used up. Try tomorrow 🌙"),
  e_cf_off: L("دروستکردنی وێنە هێشتا ئامادە نییە.", "إنشاء الصور غير جاهز بعد.", "Picture making is not set up yet."),
  e_cf_key: L("کلیلی دروستکردنی وێنە هەڵەیە.", "مفتاح الصور غير صحيح.", "The picture key is wrong."),
  e_cf_failed: L("وێنەکە دروست نەبوو. دووبارە هەوڵ بدەرەوە.", "لم تُنشأ الصورة. أعد المحاولة.", "The picture was not made. Try again."),
  e_bad_image: L("ئەم وێنەیە نەکرایەوە. وێنەیەکی تر تاقی بکەرەوە.", "تعذر فتح الصورة. جرّب أخرى.", "This photo could not be opened. Try another."),
  e_unsafe: L("ئەم داواکارییە ڕێگەپێدراو نییە.", "هذا الطلب غير مسموح.", "This request is not allowed."),
  e_slow_down: L("زۆر خێرایت 🙂 کەمێک چاوەڕێ بکە.", "أنت سريع جداً 🙂 انتظر قليلاً.", "Too fast 🙂 wait a moment."),
  e_net: L("کێشەیەک هەبوو. دووبارە هەوڵ بدەرەوە.", "حدث خطأ. أعد المحاولة.", "Something went wrong. Try again."),
};

const STYLES = [
  ["modern", "🏙️", ["#d9c7ad", "#4b4f56", "#f3efe8"], L("مۆدێرن", "عصري", "Modern")],
  ["minimal", "◻️", ["#f4f2ee", "#d8d2c8", "#9a948a"], L("سادە", "بسيط", "Minimalist")],
  ["luxury", "💎", ["#1d1b1e", "#c9a14a", "#efe6d4"], L("لوکس", "فاخر", "Luxury")],
  ["classic", "🏛️", ["#efe4cf", "#b8925a", "#6e4b2c"], L("کلاسیک", "كلاسيكي", "Classic")],
  ["scandinavian", "🌿", ["#f5f3ee", "#cfb894", "#8aa38b"], L("سکەندیناڤی", "إسكندنافي", "Scandinavian")],
  ["industrial", "🏭", ["#3b3b3b", "#8b5a3c", "#b9b5ad"], L("پیشەسازی", "صناعي", "Industrial")],
  ["contemporary", "✨", ["#f0ebe3", "#2f5d62", "#d98c5f"], L("هاوچەرخ", "معاصر", "Contemporary")],
  ["kurdish", "🧶", ["#9b2226", "#e9a23b", "#2b4c7e"], L("کوردی", "كردي", "Kurdish-inspired")],
  ["mediterranean", "🌊", ["#ffffff", "#2e6fac", "#c8693e"], L("دەریای ناوەڕاست", "متوسطي", "Mediterranean")],
  ["custom", "🖌️", ["#6b7280", "#a78bfa", "#f472b6"], L("شێوازی خۆم", "أسلوبي الخاص", "Custom")],
];
const CATS = {
  interior: [L("هۆڵی دانیشتن", "صالة", "Living room"), L("ژووری میوان", "غرفة ضيوف", "Guest room"), L("ژووری نوستن", "غرفة نوم", "Bedroom"), L("ژووری منداڵ", "غرفة أطفال", "Kids room"), L("چێشتخانە", "مطبخ", "Kitchen"), L("ژووری نانخواردن", "غرفة طعام", "Dining room"), L("حەمام", "حمام", "Bathroom"), L("ئۆفیس", "مكتب", "Office"), L("دوکان / بازرگانی", "محل تجاري", "Shop / commercial")],
  exterior: [L("ڕووکاری خانوو", "واجهة منزل", "House facade"), L("بینا / تەلار", "مبنى", "Building"), L("باخچە و گوڵ", "حديقة", "Garden & landscaping"), L("گەراج و ڕێگا", "كراج وممر", "Garage & driveway"), L("بالکۆن و تەراس", "شرفة وتراس", "Balcony & terrace"), L("دەروازە و پەرژین", "مدخل وسور", "Entrance & fence"), L("بینای بازرگانی", "مبنى تجاري", "Commercial building")],
  redesign: [L("ژوور", "غرفة", "Room"), L("ڕووکار", "واجهة", "Facade"), L("باخچە", "حديقة", "Garden"), L("دوکان", "محل", "Shop"), L("هەر شتێک", "أي شيء", "Anything")],
};
const COLORS = [L("سپی", "أبيض", "white"), L("بێژ", "بيج", "beige"), L("خۆڵەمێشی", "رمادي", "grey"), L("ڕەش", "أسود", "black"), L("قاوەیی", "بني", "brown"), L("زێڕی", "ذهبي", "gold"), L("سەوز", "أخضر", "green"), L("شین", "أزرق", "blue"), L("سوور", "أحمر", "red"), L("پەمەیی", "وردي", "pink")];
const MATERIALS = [L("مەڕمەڕ", "رخام", "marble"), L("دار", "خشب", "wood"), L("بەرد", "حجر", "stone"), L("کۆنکرێت", "خرسانة", "concrete"), L("شووشە", "زجاج", "glass"), L("ئاسن / ستیل", "حديد", "steel"), L("قوماش", "قماش", "fabric"), L("چەرم", "جلد", "leather"), L("کاشی", "بلاط", "tiles")];
const IDEAS = {
  interior: [L("قەنەفەی بێژ، ڕووناکیی ناڕاستەوخۆی گەرم، زەوی مەڕمەڕ، ڕووەکی ناوماڵ", "كنب بيج، إضاءة غير مباشرة دافئة، رخام، نباتات", "beige sofas, warm indirect light, marble floor, plants"), L("ژووری نوستنی ئارام بە ڕەنگی سپی و دار", "غرفة نوم هادئة بالأبيض والخشب", "calm bedroom in white and wood"), L("چێشتخانەی مۆدێرن بە دوورگەی ناوەڕاست", "مطبخ عصري بجزيرة وسطية", "modern kitchen with an island")],
  exterior: [L("ڕووکاری مۆدێرن بە بەرد و دار و ڕووناکیی شەو", "واجهة عصرية بالحجر والخشب وإضاءة ليلية", "modern facade with stone, wood and night lights"), L("باخچەی جوان بە چیمەن، گوڵ و ڕێگای بەرد", "حديقة بعشب وزهور وممر حجري", "garden with lawn, flowers and stone path"), L("دەروازە و گەراجی نوێ", "مدخل وكراج جديد", "new entrance and garage")],
  redesign: [L("جوانتر و پڕۆفیشناڵتری بکە", "اجعله أجمل وأكثر احترافية", "make it more beautiful and professional"), L("هەمان شوێن بە شێوازی کوردی", "نفس المكان بطابع كردي", "same place in Kurdish style")],
};
const ICON = { interior: "🛋️", exterior: "🏡", plan: "📐", redesign: "✨", chat: "💬" };

function shrink(file, max, q = 0.86) {
  return new Promise((ok, bad) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok({ data: c.toDataURL("image/jpeg", q).split(",")[1], w: img.width, h: img.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error("bad_image")); };
    img.src = url;
  });
}
const toDataUrl = (blob) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
async function saveFile(src, name) {
  try {
    const blob = src.startsWith("data:") ? await (await fetch(src)).blob() : await (await fetch(src)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch { window.open(src, "_blank"); }
}

export default function DesignStudio({ lang, getToken, onBack, onUpgrade, onOpenPlan, onChat }) {
  const tx = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const T = (o) => o?.[lang] ?? o?.ckb;
  const rtl = lang !== "en";
  const [screen, setScreen] = useState("home");
  const [quota, setQuota] = useState(null);
  const [projects, setProjects] = useState(null);

  const api = async (body) => {
    const r = await fetch("/api/redesign", {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (body?.action === "make") {
      if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) {
        const j = await r.json().catch(() => ({})); const e = new Error(j.error || "net"); e.data = j; throw e;
      }
      return { src: await toDataUrl(await r.blob()), project: r.headers.get("x-project") || "", left: r.headers.get("x-left"), seed: +r.headers.get("x-seed"), provider: r.headers.get("x-provider") || "" };
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "net"); throw e; }
    return j;
  };
  const loadProjects = () => api({ action: "list" }).then((j) => setProjects(j.projects || [])).catch(() => setProjects([]));
  useEffect(() => { api().then(setQuota).catch(() => {}); loadProjects(); }, []);

  const [open, setOpen] = useState(null); // a saved project to reopen
  const tools = [["interior", "t_interior"], ["exterior", "t_exterior"], ["plan", "t_plan"], ["redesign", "t_redesign"]];

  if (screen !== "home") {
    return <ToolView key={screen + (open?.id || "")} tool={screen} lang={lang} tx={tx} T={T} rtl={rtl} api={api} quota={quota} setQuota={setQuota}
      project={open} onUpgrade={onUpgrade} onBack={() => { setScreen("home"); setOpen(null); loadProjects(); }} />;
  }

  return (
    <div className="house ds" dir={rtl ? "rtl" : "ltr"}>
      <div className="house-inner">
        <button className="learn-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {tx("back")}
        </button>
        <div className="ds-hero">
          <span className="ds-kicker">AHM AI</span>
          <h2>{tx("title")}</h2>
          <p>{tx("sub")}</p>
          {quota && quota.left != null && <em className="house-quota">{(quota.pro ? tx("leftPro") : tx("left")).replace("{n}", quota.left)}</em>}
        </div>
        <div className="ds-tools">
          {tools.map(([k, t]) => (
            <button key={k} className={"ds-tool ds-" + k} onClick={() => (k === "plan" ? onOpenPlan() : setScreen(k))}>
              <span className="ds-ic" aria-hidden="true">{ICON[k]}</span>
              <b>{tx(t)}</b><small>{tx(t + "Sub")}</small>
              <i aria-hidden="true">{rtl ? "←" : "→"}</i>
            </button>
          ))}
          <button className="ds-tool ds-chat" onClick={onChat}>
            <span className="ds-ic" aria-hidden="true">{ICON.chat}</span><b>{tx("t_chat")}</b><small>{tx("t_chatSub")}</small><i aria-hidden="true">{rtl ? "←" : "→"}</i>
          </button>
        </div>

        <section className="ds-recent">
          <h3>{tx("recent")}</h3>
          {projects === null ? <div className="ds-grid">{[0, 1, 2].map((i) => <div key={i} className="ds-card skeleton" />)}</div>
            : !projects.length ? <p className="muted">{tx("noProjects")}</p> : (
              <div className="ds-grid">
                {projects.map((p) => {
                  const last = p.results?.[p.results.length - 1];
                  return (
                    <figure key={p.id} className="ds-card">
                      <button className="ds-thumb" onClick={() => { setOpen(p); setScreen(p.tool || "redesign"); }}>
                        {last?.url ? <img src={last.url} alt="" loading="lazy" /> : <span>{ICON[p.tool] || "✨"}</span>}
                        <em>{p.results?.length || 0}</em>
                      </button>
                      <figcaption>
                        <span><b>{p.name || tx("untitled")}</b><small>{ICON[p.tool] || "✨"} {new Date(p.updated || p.created).toLocaleDateString(lang === "en" ? "en-GB" : "ar-IQ")}</small></span>
                        <span className="hp-tools">
                          <button aria-label={tx("rename")} onClick={async () => { const n = prompt(tx("rename"), p.name || ""); if (n != null) { await api({ action: "rename", id: p.id, name: n }).catch(() => {}); loadProjects(); } }}>✏️</button>
                          <button aria-label={tx("del")} onClick={async () => { if (confirm(tx("delQ"))) { await api({ action: "delete", id: p.id }).catch(() => {}); loadProjects(); } }}>🗑️</button>
                        </span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
        </section>
        <p className="cs-note">{tx("note")}</p>
      </div>
    </div>
  );
}

function ToolView({ tool, lang, tx, T, rtl, api, quota, setQuota, project, onUpgrade, onBack }) {
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null); // { ref, original, preview, ratio }
  const [cat, setCat] = useState(0);
  const [style, setStyle] = useState(project?.style || "modern");
  const [custom, setCustom] = useState("");
  const [ask, setAsk] = useState("");
  const [colors, setColors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [light, setLight] = useState(tool === "exterior" ? "golden" : "day");
  const [keep, setKeep] = useState(true);
  const [hd, setHd] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(() => (project?.results || []).filter((r) => r.url).map((r) => ({ src: r.url, remote: true })));
  const [sel, setSel] = useState(Math.max(0, (project?.results?.length || 1) - 1));
  const [projectId, setProjectId] = useState(project?.id || "");
  const [drag, setDrag] = useState(false);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const errText = (c) => (TX["e_" + c] ? tx("e_" + c) : tx("e_net"));

  async function takeFile(f) {
    if (!f) return;
    setError("");
    if (!/^image\//.test(f.type || "image/")) { setError(tx("e_bad_image")); return; }
    if (f.size > 25_000_000) { setError(tx("e_bad_image")); return; }
    try {
      const [small, big] = await Promise.all([shrink(f, 496, 0.82), shrink(f, 1280, 0.85)]);
      setPhoto({ ref: small.data, original: big.data, preview: "data:image/jpeg;base64," + big.data, ratio: big.w / big.h });
      if (!project) { setResults([]); setProjectId(""); }
    } catch { setError(tx("e_bad_image")); }
  }
  // reopening a saved project: bring back its original photo so new versions can be made
  useEffect(() => {
    if (!project?.originalUrl) return;
    fetch(project.originalUrl).then((r) => r.blob()).then((b) => takeFile(new File([b], "original.jpg", { type: "image/jpeg" }))).catch(() => {});
  }, []);

  const cost = hd ? 2 : 1;
  const out = quota && quota.left != null && quota.left < cost;

  async function make() {
    if (!photo || busy) return;
    setBusy("p_prep"); setError("");
    try {
      const t = setTimeout(() => setBusy("p_make"), 700);
      const r = await api({ action: "make", tool, category: CATS[tool][cat].en, style, custom, ask,
        colors: colors.map((i) => COLORS[i].en), materials: materials.map((i) => MATERIALS[i].en), light, keep, hd,
        ref: photo.ref, original: projectId ? undefined : photo.original, ratio: photo.ratio, project: projectId || undefined });
      clearTimeout(t);
      setResults((rs) => { setSel(rs.length); return [...rs, { src: r.src, simple: r.provider === "pollinations" }]; });
      if (r.project) setProjectId(r.project);
      if (r.left !== "" && r.left != null) setQuota((q) => ({ ...q, left: +r.left }));
    } catch (e) {
      setError(errText(e.message));
      if (e.message === "limit") setQuota((q) => ({ ...q, left: 0 }));
    }
    setBusy("");
  }

  const result = results[sel];
  return (
    <div className="house ds" dir={rtl ? "rtl" : "ltr"}>
      <div className="house-inner">
        <button className="learn-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {tx("back")}
        </button>
        <h2 className="house-h">{ICON[tool]} {tx("t_" + tool)}</h2>
        {quota && quota.left != null && <p className="house-quota">{(quota.pro ? tx("leftPro") : tx("left")).replace("{n}", quota.left)}</p>}
        {error && <p className="learn-err" role="alert">{error}</p>}

        <div className="ds-work">
          <div className="ds-stage">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; takeFile(f); }} />
            {result && photo ? (
              <Compare before={photo.preview} after={result.src} tx={tx} />
            ) : photo ? (
              <div className={"ds-photo" + (busy ? " working" : "")}>
                <img src={photo.preview} alt="" />
                {busy && <div className="ds-progress"><span className="mini-spin" /> {tx(busy)}<i /></div>}
              </div>
            ) : (
              <button className={"house-drop ds-drop" + (drag ? " drag" : "")} onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files?.[0]); }}>
                <b>{tx("upload")}</b><small>{tx("uploadHint")}</small>
              </button>
            )}
            {result && busy && <div className="ds-progress floating"><span className="mini-spin" /> {tx(busy)}<i /></div>}
            {result?.simple && <p className="house-warn">{tx("simpleNote")}</p>}
            {results.length > 0 && (
              <>
                <div className="ds-actions">
                  <button className="gold-btn small" disabled={!!busy || out} onClick={() => make()}>{tx("again")}</button>
                  <button className="ghost-btn" onClick={() => saveFile(result.src, `AHM-AI-design-${sel + 1}.jpg`)}>{tx("download")}</button>
                  <button className="ghost-btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>{tx("newPhoto")}</button>
                </div>
                {results.length > 1 && (
                  <div className="sl-thumbs" aria-label={tx("results")}>
                    {results.map((r, i) => <button key={i} className={i === sel ? "on" : ""} onClick={() => setSel(i)}><img src={r.src} alt="" /><em>{i + 1}</em></button>)}
                  </div>
                )}
              </>
            )}
            {photo && !results.length && <button className="ghost-btn ds-change" disabled={!!busy} onClick={() => fileRef.current?.click()}>{tx("change")}</button>}
          </div>

          <div className="ds-panel house-card">
            <p className="sl-label">{tx("category")}</p>
            <div className="house-chips">
              {CATS[tool].map((c, i) => <button key={i} className={cat === i ? "on" : ""} aria-pressed={cat === i} onClick={() => setCat(i)}>{T(c)}</button>)}
            </div>
            <p className="sl-label">{tx("style")}</p>
            <div className="ds-styles">
              {STYLES.map(([k, ic, pal, name]) => (
                <button key={k} className={style === k ? "on" : ""} aria-pressed={style === k} onClick={() => setStyle(k)}>
                  <i style={{ background: `linear-gradient(135deg, ${pal[0]} 0 45%, ${pal[1]} 45% 75%, ${pal[2]} 75%)` }}><span>{ic}</span></i>
                  <span>{T(name)}</span>
                </button>
              ))}
            </div>
            {style === "custom" && <textarea className="sl-ask" rows={2} value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 300))} placeholder={tx("customPh")} />}
            <label className="house-label">{tx("ask")}
              <textarea rows={3} value={ask} onChange={(e) => setAsk(e.target.value.slice(0, 800))} placeholder={tx("askPh")} />
            </label>
            <div className="chips ds-ideas">
              {IDEAS[tool].map((s, i) => <button key={i} onClick={() => setAsk(T(s))}>💡 {T(s)}</button>)}
            </div>
            <details className="ds-adv">
              <summary>{tx("advanced")}</summary>
              <p className="sl-label">{tx("colors")}</p>
              <div className="house-chips">{COLORS.map((c, i) => <button key={i} className={colors.includes(i) ? "on" : ""} onClick={() => toggle(colors, setColors, i)}>{T(c)}</button>)}</div>
              <p className="sl-label">{tx("materials")}</p>
              <div className="house-chips">{MATERIALS.map((c, i) => <button key={i} className={materials.includes(i) ? "on" : ""} onClick={() => toggle(materials, setMaterials, i)}>{T(c)}</button>)}</div>
              <p className="sl-label">{tx("light")}</p>
              <div className="seg lang-seg">
                {["day", "golden", "night"].map((k) => <button key={k} className={light === k ? "on" : ""} onClick={() => setLight(k)}>{tx("l_" + k)}</button>)}
              </div>
              <label className="house-check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /><span><b>{tx("keep")}</b></span></label>
              <label className="house-check"><input type="checkbox" checked={hd} onChange={(e) => setHd(e.target.checked)} /><span><b>{tx("hd")}</b></span></label>
            </details>
            {out ? <button className="gold-btn" onClick={onUpgrade}>{tx("getPro")}</button> : (
              <button className="gold-btn ds-make" disabled={!photo || !!busy} onClick={() => make()}>
                {busy ? <><span className="mini-spin" /> {tx(busy)}</> : tx("make")}
              </button>
            )}
            <p className="cs-note">{tx("note")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Before / after: drag the line to compare.
function Compare({ before, after, tx }) {
  const [pos, setPos] = useState(50);
  const box = useRef(null);
  const move = (x) => { const r = box.current?.getBoundingClientRect(); if (r) setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100))); };
  return (
    <div className="ds-compare" dir="ltr" ref={box}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}>
      <img src={after} alt={tx("after")} draggable={false} />
      <img src={before} alt={tx("before")} draggable={false} className="ds-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <span className="ds-line" style={{ left: pos + "%" }}><i>⇆</i></span>
      <em className="ds-tag l">{tx("before")}</em><em className="ds-tag r">{tx("after")}</em>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} aria-label={`${tx("before")} / ${tx("after")}`} />
    </div>
  );
}
