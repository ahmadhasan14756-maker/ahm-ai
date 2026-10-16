"use client";
// 🏡 House design from your plan: upload a floor plan → AI reads the rooms → the user checks them →
// pictures in two styles (exterior, rooms, garden) → a presentation board to download.
// Pictures are concepts only; the plan the user confirmed is never changed silently.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { drawTopView } from "../lib/topview";

const TX = {
  title: { ckb: "دیزاینی خانوو لە نەخشەکەتەوە", ar: "تصميم المنزل من مخططك", en: "House design from your plan" },
  sub: { ckb: "نەخشەی خانووەکەت بار بکە، AHM AI دەیخوێنێتەوە و دیزاینی تەواوت بۆ دروست دەکات: ڕووکار، ژوورەکان، چێشتخانە، حەمام، گەراج و باخچە، بە دوو شێواز.", ar: "ارفع مخطط منزلك، يقرأه AHM AI ويصمم لك المنزل كاملاً: الواجهة والغرف والمطبخ والحمام والكراج والحديقة، بأسلوبين.", en: "Upload your house plan. AHM AI reads it and designs the whole house — facade, rooms, kitchen, bathroom, garage and garden — in two styles." },
  back: { ckb: "گەڕانەوە", ar: "رجوع", en: "Back" },
  pick: { ckb: "📐 وێنەی نەخشەکە هەڵبژێرە", ar: "📐 اختر صورة المخطط", en: "📐 Choose the plan picture" },
  pickHint: { ckb: "وێنە، سکرینشۆت یان وێنەی کاغەز. ئەگەر PDFـە، سکرینشۆتی لێ بگرە.", ar: "صورة أو لقطة شاشة أو صورة ورقة. إن كان PDF فخذ لقطة شاشة منه.", en: "A photo, screenshot or picture of a paper plan. For a PDF, take a screenshot." },
  change: { ckb: "گۆڕینی وێنە", ar: "تغيير الصورة", en: "Change picture" },
  wish: { ckb: "چیت دەوێت؟ (ئارەزوومەندانە)", ar: "ماذا تريد؟ (اختياري)", en: "What would you like? (optional)" },
  wishPh: { ckb: "بۆ نموونە: ڕەنگی سپی و قاوەیی، پەنجەرەی گەورە، باخچەی گەورە، ٢ ئۆتۆمبێل…", ar: "مثلاً: ألوان أبيض وبني، نوافذ كبيرة، حديقة واسعة، سيارتان…", en: "e.g. white and brown colours, big windows, large garden, 2 cars…" },
  read: { ckb: "📖 نەخشەکە بخوێنەوە", ar: "📖 اقرأ المخطط", en: "📖 Read the plan" },
  reading: { ckb: "نەخشەکە دەخوێنرێتەوە…", ar: "جارٍ قراءة المخطط…", en: "Reading the plan…" },
  check: { ckb: "✅ ژوورەکان بپشکنە", ar: "✅ راجع الغرف", en: "✅ Check the rooms" },
  checkSub: { ckb: "ئەمە ئەوەیە کە AI لە نەخشەکەدا خوێندییەوە. هەر شتێک هەڵەیە ڕاستی بکەرەوە. ئەندازەیەک کە نەنووسرابێت بەتاڵ دەمێنێتەوە، هیچی بە خەیاڵ دانانرێت.", ar: "هذا ما قرأه الذكاء الاصطناعي من المخطط. صحّح أي خطأ. المقاسات غير المكتوبة تبقى فارغة ولا تُخمَّن.", en: "This is what the AI read from your plan. Fix anything wrong. Sizes that are not written stay empty — nothing is guessed." },
  room: { ckb: "ناو", ar: "الاسم", en: "Name" },
  width: { ckb: "پانی (م)", ar: "العرض (م)", en: "Width (m)" },
  length: { ckb: "درێژی (م)", ar: "الطول (م)", en: "Length (m)" },
  addRoom: { ckb: "+ ژوور زیاد بکە", ar: "+ أضف غرفة", en: "+ Add room" },
  floors: { ckb: "ژمارەی نهۆم", ar: "عدد الطوابق", en: "Floors" },
  area: { ckb: "ڕووبەر (م²)", ar: "المساحة (م²)", en: "Area (m²)" },
  unclear: { ckb: "⚠️ ئەمانە ڕوون نەبوون، تکایە بیانپشکنە:", ar: "⚠️ هذه غير واضحة، تحقق منها:", en: "⚠️ These were not clear, please check:" },
  styles: { ckb: "🎨 شێواز", ar: "🎨 الأسلوب", en: "🎨 Style" },
  modern: { ckb: "مۆدێرنی لوکس", ar: "عصري فاخر", en: "Modern luxury" },
  classic: { ckb: "کلاسیکی لوکس", ar: "كلاسيكي فاخر", en: "Classic luxury" },
  views: { ckb: "🖼️ وێنەکان (تەنها ژوورەکانی نەخشەکەت)", ar: "🖼️ الصور (غرف مخططك فقط)", en: "🖼️ Pictures (only the rooms in your plan)" },
  pano: { ckb: "🔄 وێنەی 360° بۆ هەر ژوورێک", ar: "🔄 صورة 360° لكل غرفة", en: "🔄 360° picture for each room" },
  panoSub: { ckb: "بە پەنجە دەیجوڵێنیت و هەموو لایەکی ژوورەکە دەبینیت. هەر یەکێکیان بە ٢ وێنە حیساب دەکرێت.", ar: "تحرّكها بإصبعك وترى كل جهات الغرفة. كل واحدة تُحسب كصورتين.", en: "Drag with your finger to look all around the room. Each one counts as 2 pictures." },
  open360: { ckb: "🔄 بینینی 360°", ar: "🔄 عرض 360°", en: "🔄 View 360°" },
  drag: { ckb: "بە پەنجە بیجوڵێنە بۆ سەیرکردنی هەموو لایەک", ar: "اسحب بإصبعك لترى كل الجهات", en: "Drag to look around" },
  close: { ckb: "داخستن", ar: "إغلاق", en: "Close" },
  all: { ckb: "هەمووی", ar: "الكل", en: "All" },
  make: { ckb: "✨ دیزاینەکان دروست بکە", ar: "✨ أنشئ التصاميم", en: "✨ Create the designs" },
  pics: { ckb: "وێنە", ar: "صورة", en: "pictures" },
  left: { ckb: "ماوەت: {n} وێنەی بێبەرامبەر", ar: "المتبقي لك: {n} صور مجانية", en: "You have {n} free pictures left" },
  leftPro: { ckb: "ماوەت ئەمڕۆ: {n} وێنە", ar: "المتبقي اليوم: {n} صور", en: "Left today: {n} pictures" },
  tooMany: { ckb: "{n} وێنەت هەڵبژاردووە بەڵام {m}ـت ماوە. هەندێکیان لابەرە یان Pro وەربگرە.", ar: "اخترت {n} صور والمتبقي {m}. أزل بعضها أو اشترك في Pro.", en: "You chose {n} pictures but have {m} left. Remove some or get Pro." },
  getPro: { ckb: "⭐ Pro وەربگرە بۆ وێنەی زیاتر", ar: "⭐ اشترك في Pro لصور أكثر", en: "⭐ Get Pro for more pictures" },
  edit: { ckb: "✏️ گۆڕینی ژوورەکان", ar: "✏️ تعديل الغرف", en: "✏️ Edit rooms" },
  board: { ckb: "📋 تابلۆی پێشکەشکردن", ar: "📋 لوحة العرض", en: "📋 Presentation board" },
  boardMaking: { ckb: "تابلۆکە دروست دەکرێت…", ar: "جارٍ إنشاء اللوحة…", en: "Making the board…" },
  download: { ckb: "⬇️ داگرتن", ar: "⬇️ تنزيل", en: "⬇️ Download" },
  again: { ckb: "🔄 دووبارە", ar: "🔄 مجدداً", en: "🔄 Again" },
  retry: { ckb: "دووبارە هەوڵ بدەرەوە", ar: "أعد المحاولة", en: "Try again" },
  waitPic: { ckb: "دروست دەکرێت…", ar: "جارٍ الإنشاء…", en: "Creating…" },
  queued: { ckb: "چاوەڕێ…", ar: "في الانتظار…", en: "Waiting…" },
  original: { ckb: "نەخشەی ڕەسەن", ar: "المخطط الأصلي", en: "Original plan" },
  features: { ckb: "تایبەتمەندییەکان", ar: "المميزات", en: "Features" },
  houseArea: { ckb: "ڕووبەری خانوو", ar: "مساحة المنزل", en: "House area" },
  boardTitle: { ckb: "دیزاینی خانوو", ar: "تصميم المنزل", en: "House design" },
  slogan: { ckb: "دیزاینێکی بەهێز، ژیانێکی باشتر", ar: "تصميم قوي، حياة أفضل", en: "Strong design, better living" },
  disclaimer: { ckb: "⚠️ ئەمانە بیرۆکەی دیزاینی سەرەتایین، نەخشەی ئەندازیاریی پەسەندکراو یان حیسابی کۆنکرێت نین. پێش دروستکردن، ئەندازیارێکی شارەزا با پێداچوونەوەی بۆ بکات.", ar: "⚠️ هذه أفكار تصميم أولية، وليست مخططات هندسية معتمدة أو حسابات إنشائية. راجعها مع مهندس مختص قبل البناء.", en: "⚠️ These are early design ideas, not approved architectural plans or structural calculations. Have a qualified engineer review them before building." },
  approx: { ckb: "وێنەکان نزیکەیین: AI شێوەی گشتی نەخشەکە دەپارێزێت، بەڵام شوێنی هەموو دیوار و دەرگایەک ڕێک نییە.", ar: "الصور تقريبية: يحافظ الذكاء الاصطناعي على الشكل العام للمخطط، لكن مكان كل جدار وباب ليس دقيقاً.", en: "Pictures are approximate: the AI keeps the general shape of the plan, but not every wall and door exactly." },
  e_not_plan: { ckb: "ئەم وێنەیە نەخشەی خانوو نییە. تکایە وێنەی نەخشەکە بنێرە.", ar: "هذه الصورة ليست مخطط منزل. أرسل صورة المخطط.", en: "This picture is not a house plan. Please send the plan." },
  e_bad_image: { ckb: "وێنەکە نەکرایەوە. وێنەیەکی تر تاقی بکەرەوە.", ar: "تعذر فتح الصورة. جرّب صورة أخرى.", en: "The picture could not be opened. Try another one." },
  e_limit: { ckb: "وێنە بێبەرامبەرەکانت تەواو بوون. بۆ وێنەی زیاتر Pro وەربگرە.", ar: "انتهت صورك المجانية. اشترك في Pro لصور أكثر.", en: "Your free pictures are used up. Get Pro for more." },
  e_daily_full: { ckb: "ئەمڕۆ ژمارەی وێنەی بێبەرامبەری هەموو ئەپەکە تەواو بوو. بەیانی دووبارە هەوڵ بدەرەوە 🌙", ar: "انتهى عدد الصور المجانية لكل التطبيق اليوم. حاول غداً 🌙", en: "Today's free pictures for the whole app are used up. Please try again tomorrow 🌙" },
  e_cf_off: { ckb: "دروستکردنی وێنە هێشتا ئامادە نییە. خاوەنی ئەپ ئاگادار کراوەتەوە.", ar: "إنشاء الصور غير جاهز بعد.", en: "Picture making is not set up yet." },
  e_cf_key: { ckb: "کلیلی دروستکردنی وێنە هەڵەیە (خاوەنی ئەپ پێویستە CF_API_TOKEN بپشکنێت).", ar: "مفتاح إنشاء الصور غير صحيح.", en: "The picture key is wrong (owner: check CF_API_TOKEN)." },
  e_verify_email: { ckb: "بۆ وێنەی بێبەرامبەر، سەرەتا ئیمەیڵەکەت پشتڕاست بکەرەوە.", ar: "لتحصل على الصور المجانية، أكّد بريدك الإلكتروني أولاً.", en: "Please confirm your e-mail first to get free pictures." },
  e_unsafe: { ckb: "ئەم داواکارییە ڕێگەپێدراو نییە.", ar: "هذا الطلب غير مسموح.", en: "This request is not allowed." },
  e_slow_down: { ckb: "زۆر خێرایت 🙂 چەند چرکەیەک چاوەڕێ بکە.", ar: "أنت سريع جداً 🙂 انتظر ثوانٍ.", en: "Too fast 🙂 wait a few seconds." },
  e_net: { ckb: "پەیوەندی نییە یان کێشەیەک هەبوو. دووبارە هەوڵ بدەرەوە.", ar: "لا اتصال أو حدث خطأ. أعد المحاولة.", en: "No connection or something went wrong. Try again." },
  v_exterior: { ckb: "ڕووکاری دەرەوە", ar: "الواجهة الخارجية", en: "Exterior" },
  v_aerial: { ckb: "نەخشەی 3D", ar: "مخطط ثلاثي الأبعاد", en: "3D plan" },
  v_top: { ckb: "خانووەکەت لە سەرەوە", ar: "منزلك من الأعلى", en: "Your house from above" },
  topTitle: { ckb: "🗺️ نەخشەکەت وەک ئەپەکە خوێندییەوە", ar: "🗺️ مخططك كما قرأه التطبيق", en: "🗺️ Your plan as the app read it" },
  topSub: { ckb: "لای ڕاست نەخشەکەی خۆتە، لای چەپ هەمان نەخشەیە بە کەلوپەل و ناوەکان. ئەگەر شوێنی ژوورێک هەڵەیە، وێنەیەکی ڕوونتر بنێرە.", ar: "اليمين مخططك، واليسار نفس المخطط بالأثاث والأسماء. إن كان مكان غرفة خطأ فأرسل صورة أوضح.", en: "Right: your plan. Left: the same plan with furniture and names. If a room is in the wrong place, send a clearer picture." },
  topNone: { ckb: "شوێنی ژوورەکان لە وێنەکەدا نەدۆزرایەوە، بۆیە نەخشەی سەرەوە دروست نابێت. وێنەیەکی ڕوونتر تاقی بکەرەوە.", ar: "لم يُعثر على أماكن الغرف في الصورة. جرّب صورة أوضح.", en: "The room positions could not be found in the picture. Try a clearer one." },
  topFree: { ckb: "بێبەرامبەرە و ڕاست لەسەر نەخشەکەی خۆتە", ar: "مجاني ومطابق لمخططك", en: "Free and exactly your plan" },
  v_living: { ckb: "هۆڵی دانیشتن", ar: "غرفة المعيشة", en: "Living room" },
  v_guest: { ckb: "ژووری میوان", ar: "غرفة الضيوف", en: "Guest room" },
  v_bedroom: { ckb: "ژووری نوستن", ar: "غرفة النوم", en: "Bedroom" },
  v_kitchen: { ckb: "چێشتخانە و نانخواردن", ar: "المطبخ والطعام", en: "Kitchen & dining" },
  v_bath: { ckb: "حەمام و شاوەر", ar: "الحمام والدش", en: "Bathroom" },
  v_garage: { ckb: "گەراج", ar: "الكراج", en: "Garage" },
  v_garden: { ckb: "باخچە و گوڵ", ar: "الحديقة والزهور", en: "Garden" },
  t_living: { ckb: "هۆڵی دانیشتن", ar: "معيشة", en: "Living" }, t_guest: { ckb: "ژووری میوان", ar: "ضيوف", en: "Guest" },
  t_bedroom: { ckb: "ژووری نوستن", ar: "نوم", en: "Bedroom" }, t_kitchen: { ckb: "چێشتخانە", ar: "مطبخ", en: "Kitchen" },
  t_dining: { ckb: "نانخواردن", ar: "طعام", en: "Dining" }, t_bath: { ckb: "حەمام", ar: "حمام", en: "Bathroom" },
  t_garage: { ckb: "گەراج", ar: "كراج", en: "Garage" }, t_garden: { ckb: "باخچە", ar: "حديقة", en: "Garden" },
  t_yard: { ckb: "حەوشە", ar: "فناء", en: "Yard" }, t_hall: { ckb: "ڕاڕەو", ar: "ممر", en: "Hall" },
  t_stairs: { ckb: "پەیژە", ar: "درج", en: "Stairs" }, t_storage: { ckb: "کۆگا", ar: "مخزن", en: "Storage" },
  t_office: { ckb: "ئۆفیس", ar: "مكتب", en: "Office" }, t_laundry: { ckb: "جلشۆر", ar: "غسيل", en: "Laundry" },
  t_balcony: { ckb: "بالکۆن", ar: "شرفة", en: "Balcony" }, t_other: { ckb: "تر", ar: "أخرى", en: "Other" },
};
const TYPES = ["living", "guest", "bedroom", "kitchen", "dining", "bath", "garage", "garden", "yard", "hall", "stairs", "storage", "office", "laundry", "balcony", "other"];
// Pictures are made only for what is in the user's plan: the outside, a 3D view of the plan, and each room ("r0", "r1", …).
// "p0", "p1", … are 360° pictures of the same rooms.
const NO_PANO = new Set(["stairs", "storage"]);
const roomLabel = (r, tx) => (r?.name || tx("t_" + (r?.type || "other"))) + (r?.w && r?.l ? ` · ${r.w}×${r.l}` : "");
const ICON = { bedroom: "🛏️", living: "🛋️", guest: "🪑", kitchen: "🍳", dining: "🍽️", bath: "🚿", garage: "🚗", garden: "🌳", yard: "🌳" };

// Picture → base64 JPEG (no "data:" prefix), at most `max` pixels on the long side.
function shrink(file, max, q = 0.86) {
  return new Promise((ok, bad) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", q).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error("bad_image")); };
    img.src = url;
  });
}
const loadImg = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
function download(href, name) {
  const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export default function HouseStudio({ lang, getToken, onBack, onUpgrade, initialPlan }) {
  const tx = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const rtl = lang !== "en";
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [planImg, setPlanImg] = useState(null); // { full: base64 1400px, ref: base64 ≤512px, preview: dataURL }
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null); // { floors, area, plot, rooms: [...] }
  const [info, setInfo] = useState({ notes: [], unclear: [], entrance: "" });
  const [styles, setStyles] = useState(["modern", "classic"]);
  const [views, setViews] = useState([]); // "exterior", "aerial", "r0", "r1", …
  const [pano, setPano] = useState(false);
  const [viewer, setViewer] = useState(null); // src of a 360° picture being viewed
  const [tops, setTops] = useState({}); // style → top view of the user's own plan (drawn here, free)
  useEffect(() => {
    if (!plan || !planImg) return;
    const id = setTimeout(async () => {
      await Promise.all(["700 30px Vazirmatn", "800 30px Vazirmatn"].map((f) => document.fonts?.load?.(f).catch(() => {})));
      const out = {};
      for (const st of ["modern", "classic"]) {
        try { const c = drawTopView(plan, { style: st, img: { w: planImg.w, h: planImg.h }, lang }); out[st] = c ? c.toDataURL("image/jpeg", 0.9) : null; } catch (e) { console.error(e); out[st] = null; }
      }
      setTops(out);
    }, 350);
    return () => clearTimeout(id);
  }, [plan, planImg, lang]);
  const [quota, setQuota] = useState(null); // { left, max, pro, ready }
  const [pics, setPics] = useState({}); // "style:view" → { state: "wait"|"run"|"ok"|"err", src, err, seed }
  const [boards, setBoards] = useState({}); // style → dataURL | "making"

  const api = async (method, body) => {
    const r = await fetch("/api/house", {
      method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "net"); e.data = j; throw e; }
    return j;
  };
  const refreshQuota = () => api("GET").then(setQuota).catch(() => {});
  useEffect(() => { refreshQuota(); }, []);
  const errText = (code) => TX["e_" + code] ? tx("e_" + code) : tx("e_net");

  // A plan sent straight from a construction answer: use it right away.
  useEffect(() => { if (initialPlan) takeFile(initialPlan); }, [initialPlan]);
  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) takeFile(f);
  }
  async function takeFile(f) {
    setError("");
    try {
      const [full, ref] = await Promise.all([shrink(f, 1400), shrink(f, 500, 0.8)]);
      const preview = "data:image/jpeg;base64," + full;
      const im = await loadImg(preview);
      setPlanImg({ full, ref, preview, w: im.width, h: im.height });
    } catch { setError(tx("e_bad_image")); }
  }

  async function analyze() {
    if (!planImg || busy) return;
    setBusy(true); setError("");
    try {
      const j = await api("POST", { action: "analyze", image: planImg.full, note: wish, lang });
      setPlan(j.plan);
      setInfo({ notes: j.notes || [], unclear: j.unclear || [], entrance: j.entrance || "" });
      setViews(["exterior", ...j.plan.rooms.map((_, i) => "r" + i)]);
      setStep("rooms");
    } catch (e) { setError(errText(e.message)); }
    setBusy(false);
  }

  const setRoom = (i, k, v) => setPlan((p) => ({ ...p, rooms: p.rooms.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const delRoom = (i) => setPlan((p) => ({ ...p, rooms: p.rooms.filter((_, j) => j !== i) }));
  const addRoom = () => setPlan((p) => ({ ...p, rooms: [...p.rooms, { type: "other", name: "", w: null, l: null }] }));
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const roomIds = views.filter((v) => v[0] === "r" && plan?.rooms[+v.slice(1)]);
  const ids = [...views.filter((v) => v === "exterior"), ...roomIds,
    ...(pano ? roomIds.filter((v) => !NO_PANO.has(plan.rooms[+v.slice(1)].type)).map((v) => "p" + v.slice(1)) : [])];
  const jobs = styles.flatMap((s) => ids.map((v) => `${s}:${v}`));
  const cost = (k) => (k.split(":")[1][0] === "p" ? 2 : 1);
  const total = jobs.reduce((n, k) => n + cost(k), 0);
  const left = quota?.left; // null = no limit
  const over = left != null && total > left;
  const viewName = (id) => id === "exterior" || id === "aerial" ? tx("v_" + id) : (id[0] === "p" ? "360° · " : "") + roomLabel(plan?.rooms[+id.slice(1)], tx);

  async function renderOne(key, seed) {
    const [style, id] = key.split(":");
    const isRoom = id[0] === "r" || id[0] === "p";
    const view = isRoom ? "room" : id;
    setPics((p) => ({ ...p, [key]: { ...p[key], state: "run" } }));
    try {
      const r = await fetch("/api/house", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ action: "render", style, view, room: isRoom ? +id.slice(1) : undefined, pano: id[0] === "p", plan,
          ref: view === "exterior" || view === "aerial" ? planImg.ref : undefined, wish, seed, lang }),
      });
      if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) {
        const j = await r.json().catch(() => ({}));
        const e = new Error(j.error || "net"); e.data = j; throw e;
      }
      const blob = await r.blob();
      const src = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
      setPics((p) => ({ ...p, [key]: { state: "ok", src, seed: +r.headers.get("x-seed") || undefined } }));
      setBoards((b) => ({ ...b, [style]: undefined }));
      const l = r.headers.get("x-left");
      if (l) setQuota((q) => ({ ...q, left: +l }));
      return true;
    } catch (e) {
      setPics((p) => ({ ...p, [key]: { state: "err", err: e.message } }));
      if (e.message === "limit" && e.data) setQuota((q) => ({ ...q, ...e.data, left: 0 }));
      return !["daily_full", "limit", "cf_off", "cf_key", "verify_email"].includes(e.message); // stop the rest on these
    }
  }

  async function makeAll(list = jobs) {
    if (!list.length || busy) return;
    setBusy(true); setStep("results");
    setPics((p) => { const n = { ...p }; list.forEach((k) => { n[k] = { state: "wait" }; }); return n; });
    const queue = [...list];
    let stop = false;
    const worker = async () => {
      while (queue.length && !stop) {
        const k = queue.shift();
        if (!(await renderOne(k))) { stop = true; }
      }
    };
    await Promise.all([worker(), worker()]); // two at a time
    if (stop) setPics((p) => { const n = { ...p }; queue.forEach((k) => { if (n[k]?.state === "wait") n[k] = { state: "err", err: "stopped" }; }); return n; });
    setBusy(false);
    refreshQuota();
  }

  // ---- presentation board (drawn in the browser, so Kurdish text is always correct) ----
  async function makeBoard(style) {
    setBoards((b) => ({ ...b, [style]: "making" }));
    try {
      await Promise.all(["700 40px Vazirmatn", "800 40px Vazirmatn", "400 40px Michroma"].map((f) => document.fonts?.load?.(f).catch(() => {})));
      const get = (v) => pics[`${style}:${v}`]?.state === "ok" ? pics[`${style}:${v}`].src : null;
      const W = 2400, PAD = 28;
      const hero = get("exterior");
      const center = tops[style] || planImg.preview;
      const rooms = plan.rooms.map((_, i) => "r" + i).filter(get);
      const side = rooms.slice(0, 3), bottom = rooms.slice(3, 7);
      const nameOf = (id) => plan.rooms[+id.slice(1)]?.name || tx("t_" + plan.rooms[+id.slice(1)]?.type);
      const heroH = hero ? 1000 : 0, midH = 1180, botH = bottom.length ? 560 : 0, footH = 200;
      const H = heroH + midH + botH + footH + PAD;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d");
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0b1a24"); bg.addColorStop(1, "#08121a");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const font = (w, px) => `${w} ${px}px Vazirmatn, "Noto Kufi Arabic", sans-serif`;
      const cover = async (src, x, y, w, h, r = 18) => {
        const im = await loadImg(src);
        const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
        g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.clip();
        g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); g.restore();
      };
      const contain = async (src, x, y, w, h) => {
        const im = await loadImg(src);
        const s = Math.min(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s;
        g.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      };
      const label = (text, x, y, w, h) => {
        g.font = font(700, 30); g.direction = rtl ? "rtl" : "ltr";
        const tw = g.measureText(text).width + 40;
        const lx = rtl ? x + w - tw - 18 : x + 18, ly = y + h - 64;
        g.fillStyle = "rgba(8,18,26,.82)"; g.beginPath(); g.roundRect(lx, ly, tw, 48, 12); g.fill();
        g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, lx + tw / 2, ly + 25);
      };
      let y = 0;
      if (hero) {
        await cover(hero, 0, 0, W, heroH, 0);
        const sh = g.createLinearGradient(0, 0, 0, 260); sh.addColorStop(0, "rgba(0,0,0,.55)"); sh.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = sh; g.fillRect(0, 0, W, 260);
        y = heroH;
      }
      // brand (top-left) + title card (top-right)
      g.direction = "ltr"; g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.font = '400 64px Michroma, "Montserrat", sans-serif'; g.fillStyle = "#fff"; g.fillText("AHM", 60, 120);
      const aw = g.measureText("AHM ").width; g.fillStyle = "#f2b01e"; g.fillText("AI", 60 + aw, 120);
      g.font = font(500, 26); g.fillStyle = "rgba(255,255,255,.85)"; g.fillText("Build Your Dream", 64, 162);
      g.direction = rtl ? "rtl" : "ltr"; g.textAlign = "center";
      const title = tx("boardTitle"), sub = tx(style);
      g.font = font(800, 46); const tw = Math.max(g.measureText(title).width, 300) + 80;
      g.fillStyle = "rgba(8,18,26,.78)"; g.beginPath(); g.roundRect(W - tw - 50, 50, tw, 150, 26); g.fill();
      g.fillStyle = "#fff"; g.fillText(title, W - 50 - tw / 2, 115);
      g.font = font(600, 30); g.fillStyle = "#f6c855"; g.fillText(sub, W - 50 - tw / 2, 165);

      // middle: features | plan | three rooms
      const my = y + PAD, featW = 520, sideW = side.length ? 660 : 0;
      const planW = W - featW - sideW - PAD * (side.length ? 4 : 3);
      const fx = rtl ? W - PAD - featW : PAD;
      g.fillStyle = "rgba(255,255,255,.04)"; g.beginPath(); g.roundRect(fx, my, featW, midH - PAD, 22); g.fill();
      g.textAlign = rtl ? "right" : "left"; g.direction = rtl ? "rtl" : "ltr";
      const tx0 = rtl ? fx + featW - 40 : fx + 40;
      g.font = font(800, 40); g.fillStyle = "#fff"; g.fillText(tx("features"), tx0, my + 80);
      const counts = {};
      plan.rooms.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
      const feat = ["bedroom", "living", "guest", "kitchen", "dining", "bath", "garage", "garden", "yard"].filter((k) => counts[k]);
      g.font = font(600, 32);
      feat.slice(0, 8).forEach((k, i) => {
        const ly = my + 170 + i * 92;
        g.fillStyle = "#e9eef2";
        g.fillText(`${ICON[k] || "•"}  ${counts[k]} ${tx("t_" + k)}`, tx0, ly);
      });
      if (plan.area) {
        const by = my + midH - PAD - 200;
        g.fillStyle = "rgba(255,255,255,.06)"; g.beginPath(); g.roundRect(fx + 30, by, featW - 60, 150, 20); g.fill();
        g.textAlign = "center"; g.fillStyle = "#cfd8de"; g.font = font(600, 30); g.fillText(tx("houseArea"), fx + featW / 2, by + 58);
        g.direction = "ltr"; g.fillStyle = "#fff"; g.font = font(800, 52); g.fillText(`${plan.area} m²`, fx + featW / 2, by + 120);
        g.direction = rtl ? "rtl" : "ltr";
      }
      const px = rtl ? PAD + (side.length ? sideW + PAD : 0) : featW + PAD * 2;
      g.fillStyle = "#f4f1ea"; g.beginPath(); g.roundRect(px, my, planW, midH - PAD, 22); g.fill();
      await contain(center, px + 20, my + 20, planW - 40, midH - PAD - 40);
      if (tops[style] && planImg.preview) { // small original plan in the corner, so people can compare
        const iw = 300, ih = 220, ix = px + planW - iw - 24, iy = my + midH - PAD - ih - 24;
        g.fillStyle = "#fff"; g.beginPath(); g.roundRect(ix - 8, iy - 8, iw + 16, ih + 16, 14); g.fill();
        await contain(planImg.preview, ix, iy, iw, ih);
        label(tx("original"), ix - 8, iy - 8, iw + 16, ih + 16);
      }
      if (side.length) {
        const sx = rtl ? PAD : W - PAD - sideW, each = (midH - PAD - PAD * (side.length - 1)) / side.length;
        for (let i = 0; i < side.length; i++) {
          const sy = my + i * (each + PAD);
          await cover(get(side[i]), sx, sy, sideW, each);
          label(nameOf(side[i]), sx, sy, sideW, each);
        }
      }
      y += midH;
      if (bottom.length) {
        const bw = (W - PAD * (bottom.length + 1)) / bottom.length;
        for (let i = 0; i < bottom.length; i++) {
          const bx = rtl ? W - PAD - bw - i * (bw + PAD) : PAD + i * (bw + PAD);
          await cover(get(bottom[i]), bx, y, bw, botH - PAD);
          label(nameOf(bottom[i]), bx, y, bw, botH - PAD);
        }
        y += botH;
      }
      // footer
      g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, y, W, 2);
      g.direction = "ltr"; g.textAlign = "center"; g.font = font(500, 26); g.fillStyle = "rgba(255,255,255,.55)";
      g.fillText("S M A R T   D E S I G N   •   B E T T E R   L I V I N G", W / 2, y + 70);
      g.direction = rtl ? "rtl" : "ltr"; g.font = font(500, 24); g.fillStyle = "rgba(255,255,255,.6)";
      g.fillText(tx("disclaimer").replace("⚠️ ", ""), W / 2, y + 140, W - 120);
      g.textAlign = rtl ? "left" : "right"; g.font = font(600, 30); g.fillStyle = "#cfe9d6";
      g.fillText("🌿 " + tx("slogan"), rtl ? 60 : W - 60, y + 72);
      g.direction = "ltr"; g.textAlign = rtl ? "right" : "left"; g.font = '400 40px Michroma, "Montserrat", sans-serif'; g.fillStyle = "#fff";
      g.fillText("AHM AI", rtl ? W - 60 : 60, y + 80);
      setBoards((b) => ({ ...b, [style]: c.toDataURL("image/jpeg", 0.92) }));
    } catch (e) {
      console.error(e);
      setBoards((b) => ({ ...b, [style]: undefined }));
      setError(tx("e_net"));
    }
  }

  const quotaLine = quota && quota.left != null ? (quota.pro ? tx("leftPro") : tx("left")).replace("{n}", quota.left) : "";

  return (
    <div className="house" dir={rtl ? "rtl" : "ltr"}>
      <div className="house-inner">
        <button className="learn-back" onClick={step === "results" && !busy ? () => setStep("rooms") : step === "rooms" ? () => setStep("upload") : onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {tx("back")}
        </button>
        <h2 className="house-h">🏡 {tx("title")}</h2>
        {step === "upload" && <p className="muted house-sub">{tx("sub")}</p>}
        {quotaLine && <p className="house-quota">{quotaLine}</p>}
        {error && <p className="learn-err" role="alert">{error}</p>}

        {step === "upload" && (
          <div className="house-card">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            {planImg ? (
              <div className="house-plan">
                <img src={planImg.preview} alt={tx("original")} />
                <button className="ghost-btn" onClick={() => fileRef.current?.click()} disabled={busy}>{tx("change")}</button>
              </div>
            ) : (
              <button className="house-drop" onClick={() => fileRef.current?.click()}>
                <b>{tx("pick")}</b><small>{tx("pickHint")}</small>
              </button>
            )}
            <label className="house-label">{tx("wish")}
              <textarea value={wish} onChange={(e) => setWish(e.target.value.slice(0, 300))} placeholder={tx("wishPh")} rows={2} />
            </label>
            <button className="gold-btn" disabled={!planImg || busy} onClick={analyze}>
              {busy ? <><span className="mini-spin" /> {tx("reading")}</> : tx("read")}
            </button>
            <p className="cs-note">{tx("disclaimer")}</p>
          </div>
        )}

        {step === "rooms" && plan && (
          <div className="house-card">
            <h3>{tx("check")}</h3>
            <p className="muted small">{tx("checkSub")}</p>
            {(info.unclear.length > 0) && (
              <div className="house-warn"><b>{tx("unclear")}</b><ul>{info.unclear.map((u, i) => <li key={i}>{u}</li>)}</ul></div>
            )}
            {(info.entrance || info.notes.length > 0) && (
              <ul className="house-notes">{info.entrance && <li>🚪 {info.entrance}</li>}{info.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            )}
            <div className="house-top">
              <h3>{tx("topTitle")}</h3>
              {tops.modern ? (
                <>
                  <p className="muted small">{tx("topSub")}</p>
                  <div className="ht-pair">
                    <img src={planImg.preview} alt={tx("original")} />
                    <img src={tops[styles[0] || "modern"]} alt={tx("v_top")} />
                  </div>
                </>
              ) : <p className="house-warn">{tx("topNone")}</p>}
            </div>
            <div className="house-meta">
              <label>{tx("floors")}<input type="number" min="1" max="5" value={plan.floors || 1} onChange={(e) => setPlan({ ...plan, floors: e.target.value })} /></label>
              <label>{tx("area")}<input type="number" min="0" step="0.1" value={plan.area ?? ""} onChange={(e) => setPlan({ ...plan, area: e.target.value === "" ? null : e.target.value })} /></label>
            </div>
            <div className="house-rooms">
              <div className="hr-head"><span>{tx("room")}</span><span>{tx("width")}</span><span>{tx("length")}</span><span /></div>
              {plan.rooms.map((r, i) => (
                <div className="hr-row" key={i}>
                  <div className="hr-name">
                    <select value={TYPES.includes(r.type) ? r.type : "other"} onChange={(e) => setRoom(i, "type", e.target.value)} aria-label={tx("room")}>
                      {TYPES.map((k) => <option key={k} value={k}>{tx("t_" + k)}</option>)}
                    </select>
                    <input value={r.name} onChange={(e) => setRoom(i, "name", e.target.value.slice(0, 40))} aria-label={tx("room")} />
                  </div>
                  <input type="number" min="0" step="0.1" value={r.w ?? ""} placeholder="?" onChange={(e) => setRoom(i, "w", e.target.value === "" ? null : e.target.value)} aria-label={tx("width")} />
                  <input type="number" min="0" step="0.1" value={r.l ?? ""} placeholder="?" onChange={(e) => setRoom(i, "l", e.target.value === "" ? null : e.target.value)} aria-label={tx("length")} />
                  <button className="hr-del" onClick={() => delRoom(i)} aria-label="✕">✕</button>
                </div>
              ))}
              <button className="ghost-btn" onClick={addRoom}>{tx("addRoom")}</button>
            </div>

            <h3>{tx("styles")}</h3>
            <div className="house-chips">
              {["modern", "classic"].map((s) => (
                <button key={s} className={styles.includes(s) ? "on" : ""} aria-pressed={styles.includes(s)} onClick={() => toggle(styles, setStyles, s)}>{tx(s)}</button>
              ))}
            </div>
            <h3>{tx("views")}</h3>
            <div className="house-chips">
              {["exterior", ...plan.rooms.map((_, i) => "r" + i)].map((v) => (
                <button key={v} className={views.includes(v) ? "on" : ""} aria-pressed={views.includes(v)} onClick={() => toggle(views, setViews, v)}>{viewName(v)}</button>
              ))}
            </div>
            <label className="house-check">
              <input type="checkbox" checked={pano} onChange={(e) => setPano(e.target.checked)} />
              <span><b>{tx("pano")}</b><small>{tx("panoSub")}</small></span>
            </label>
            {over && (
              <div className="house-warn">
                {tx("tooMany").replace("{n}", total).replace("{m}", left)}
                <button className="ghost-btn" onClick={onUpgrade}>{tx("getPro")}</button>
              </div>
            )}
            <button className="gold-btn" disabled={!jobs.length || over || busy} onClick={() => makeAll()}>
              {tx("make")} · {total} {tx("pics")}
            </button>
            <p className="cs-note">{tx("approx")}</p>
          </div>
        )}

        {step === "results" && (
          <>
            {styles.map((s) => {
              const keys = ids.map((v) => `${s}:${v}`).filter((k) => pics[k]);
              if (!keys.length && !tops[s]) return null;
              const done = !!tops[s] || keys.some((k) => pics[k]?.state === "ok");
              const b = boards[s];
              return (
                <section className="house-style" key={s}>
                  <div className="hs-head">
                    <h3>{tx(s)}</h3>
                    <button className="gold-btn small" disabled={!done || busy || b === "making"} onClick={() => makeBoard(s)}>
                      {b === "making" ? tx("boardMaking") : tx("board")}
                    </button>
                  </div>
                  {tops[s] && (
                    <figure className="house-pic wide">
                      <img src={tops[s]} alt={tx("v_top")} />
                      <figcaption><span>🗺️ {tx("v_top")} · <small className="ht-free">{tx("topFree")}</small></span>
                        <span className="hp-tools"><button onClick={() => download(tops[s], `AHM-AI-${s}-top.jpg`)} aria-label={tx("download")}>⬇️</button></span>
                      </figcaption>
                    </figure>
                  )}
                  {b && b !== "making" && (
                    <figure className="house-board">
                      <img src={b} alt={tx("board")} />
                      <button className="gold-btn small" onClick={() => download(b, `AHM-AI-${s}-board.jpg`)}>{tx("download")}</button>
                    </figure>
                  )}
                  <div className="house-grid">
                    {keys.map((k) => {
                      const p = pics[k], v = k.split(":")[1], is360 = v[0] === "p";
                      return (
                        <figure key={k} className={"house-pic" + (v === "exterior" || v === "aerial" || is360 ? " wide" : "")}>
                          {p.state === "ok" ? (is360
                            ? <button className="pano-thumb" onClick={() => setViewer({ src: p.src, title: viewName(v) })}><img src={p.src} alt={viewName(v)} loading="lazy" /><span>{tx("open360")}</span></button>
                            : <img src={p.src} alt={viewName(v)} loading="lazy" />) : (
                            <div className={"hp-wait" + (p.state === "err" ? " err" : "")}>
                              {p.state === "err" ? (
                                <>
                                  <span>{p.err === "stopped" ? "—" : errText(p.err)}</span>
                                  {!busy && !["limit", "daily_full", "cf_off", "cf_key", "verify_email"].includes(p.err) && <button className="ghost-btn" onClick={() => makeAll([k])}>{tx("retry")}</button>}
                                  {p.err === "limit" && <button className="ghost-btn" onClick={onUpgrade}>{tx("getPro")}</button>}
                                </>
                              ) : <><span className="mini-spin" /> {p.state === "run" ? tx("waitPic") : tx("queued")}</>}
                            </div>
                          )}
                          <figcaption>
                            <span>{viewName(v)}</span>
                            {p.state === "ok" && (
                              <span className="hp-tools">
                                <button onClick={() => download(p.src, `AHM-AI-${s}-${is360 ? "360-" : ""}${v}.${p.src.startsWith("data:image/png") ? "png" : "jpg"}`)} aria-label={tx("download")}>⬇️</button>
                                <button disabled={busy || (left != null && left <= 0)} onClick={() => makeAll([k])} aria-label={tx("again")}>🔄</button>
                              </span>
                            )}
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            <button className="ghost-btn" disabled={busy} onClick={() => setStep("rooms")}>{tx("edit")}</button>
            {viewer && <Pano360 src={viewer.src} title={viewer.title} hint={tx("drag")} closeText={tx("close")} onClose={() => setViewer(null)} />}
            <p className="cs-note">{tx("disclaimer")}</p>
          </>
        )}
      </div>
    </div>
  );
}

// A small 360° viewer (WebGL, no extra library): drag to look around, pinch or wheel to zoom.
const VERT = "attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}";
const FRAG = `precision highp float;varying vec2 v;uniform sampler2D t;uniform float yaw,pitch,fov,aspect;
const float PI=3.14159265;
void main(){
  float f=tan(fov*.5);
  vec3 d=normalize(vec3(v.x*f*aspect,v.y*f,-1.));
  float cp=cos(pitch),sp=sin(pitch);
  d=vec3(d.x,d.y*cp-d.z*sp,d.y*sp+d.z*cp);
  float cy=cos(yaw),sy=sin(yaw);
  d=vec3(d.x*cy-d.z*sy,d.y,d.x*sy+d.z*cy);
  float lon=atan(d.x,-d.z),lat=asin(clamp(d.y,-1.,1.));
  gl_FragColor=texture2D(t,vec2(fract(lon/(2.*PI)+.5),.5-lat/PI));
}`;

function Pano360({ src, title, hint, closeText, onClose }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const cv = ref.current;
    const gl = cv?.getContext("webgl", { antialias: true });
    if (!gl) { setFailed(true); return; }
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setFailed(true); });
    const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(pr, n);
    const st = { yaw: 0, pitch: 0, fov: 1.35, ready: false, drag: null, pinch: null, raf: 0, auto: true };
    const tex = gl.createTexture();
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      st.ready = true;
    };
    img.onerror = () => setFailed(true);
    img.src = src;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth * dpr, h = cv.clientHeight * dpr;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (st.ready) {
        if (st.auto) st.yaw += 0.0015;
        gl.viewport(0, 0, w, h);
        gl.uniform1f(u("yaw"), st.yaw); gl.uniform1f(u("pitch"), st.pitch); gl.uniform1f(u("fov"), st.fov); gl.uniform1f(u("aspect"), w / h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      st.raf = requestAnimationFrame(draw);
    };
    draw();
    const pts = new Map();
    const down = (e) => { cv.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.auto = false; };
    const move = (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const before = Math.hypot(a[0] - b[0], a[1] - b[1]);
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const [c, d] = [...pts.values()];
        const after = Math.hypot(c[0] - d[0], c[1] - d[1]);
        st.fov = Math.min(1.9, Math.max(0.5, st.fov * (before / (after || before))));
        return;
      }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const k = st.fov / cv.clientHeight;
      st.yaw -= (e.clientX - px) * k;
      st.pitch = Math.max(-1.45, Math.min(1.45, st.pitch + (e.clientY - py) * k));
    };
    const up = (e) => pts.delete(e.pointerId);
    const wheel = (e) => { e.preventDefault(); st.auto = false; st.fov = Math.min(1.9, Math.max(0.5, st.fov * (1 + e.deltaY * 0.001))); };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { cancelAnimationFrame(st.raf); window.removeEventListener("keydown", key); };
  }, [src]);
  // Shown over the whole screen (a portal, so no parent can clip or move it).
  return createPortal(
    <div className="pano-bg" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pano-top"><b>{title}</b><button className="ghost-btn" onClick={onClose}>✕ {closeText}</button></div>
      {failed ? <div className="pano-flat"><img src={src} alt={title} /></div> : <canvas ref={ref} className="pano-cv" />}
      <p className="pano-hint">👆 {hint}</p>
    </div>,
    document.body
  );
}
