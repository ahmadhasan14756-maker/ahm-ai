// "About the developer" (Settings). The owner can edit it in the app; kept in app_settings (key "about").
import { adminDb } from "./server";
import { cacheGet, cacheSet, cacheDel } from "./redis";

export const DEFAULT_ABOUT = {
  name: "Ahmed Hasan",
  nameLocal: { ckb: "ئەحمەد حەسەن", ar: "أحمد حسن", en: "Ahmed Hasan" },
  role: { ckb: "دامەزرێنەر و گەشەپێدەری AHM AI", ar: "مؤسس ومطوّر AHM AI", en: "Founder & developer of AHM AI" },
  phone: "07701475657",
  whatsapp: true,
  bio: {
    ckb: "سڵاو 👋 من ئەحمەد حەسەنم، دامەزرێنەر و گەشەپێدەری AHM AI.\n\nئەم ئەپەم بە تەنها و بە خۆشەویستییەوە دروست کردووە، بە یەک ئامانج: زیرەکی دەستکرد بە زمانی کوردی بگاتە دەستی هەمووان — بۆ خوێندکار، مامۆستا، بازرگان و هەر کەسێک کە دەیەوێت فێر بێت، شت دروست بکات و پێش بکەوێت.\n\nهەموو بەشێک، دیزاینێک و دێڕێکی کۆدی ئەم ئەپە بە وردی ئامادە کراوە، و بەردەوام نوێی دەکەمەوە و باشتری دەکەم.\n\nڕاوبۆچوون و پێشنیارەکانت بۆ من زۆر گرنگن. هەر کاتێک ویستت، لە ڕێگەی واتسئاپ یان تەلەفۆنەوە پەیوەندیم پێوە بکە.\n\nسوپاس کە AHM AI بەکاردەهێنیت 💚",
    ar: "مرحباً 👋 أنا أحمد حسن، مؤسس ومطوّر AHM AI.\n\nبنيت هذا التطبيق بنفسي وبكل حب، بهدف واحد: أن يصل الذكاء الاصطناعي بلغتنا إلى الجميع — للطلاب والمعلمين وأصحاب الأعمال وكل من يريد أن يتعلم ويبدع ويتقدم.\n\nكل قسم وكل تصميم وكل سطر برمجي في هذا التطبيق صُنع بعناية، وأعمل على تحديثه وتطويره باستمرار.\n\nآراؤكم واقتراحاتكم مهمة جداً بالنسبة لي. تواصلوا معي في أي وقت عبر واتساب أو الهاتف.\n\nشكراً لاستخدامكم AHM AI 💚",
    en: "Hi 👋 I'm Ahmed Hasan, the founder and developer of AHM AI.\n\nI built this app on my own, with a lot of love and one goal: to bring artificial intelligence in our own language to everyone — students, teachers, business owners and anyone who wants to learn, create and grow.\n\nEvery section, every design and every line of code in this app was made with care, and I keep updating and improving it.\n\nYour feedback and ideas mean a lot to me. Reach me any time on WhatsApp or by phone.\n\nThank you for using AHM AI 💚",
  },
};

const KEY = "about:v1";
let local = { at: 0, value: null };
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const tri = (o, n) => ({ ckb: clip(o?.ckb, n), ar: clip(o?.ar, n), en: clip(o?.en, n) });

export function normalizeAbout(src) {
  const s = src && typeof src === "object" ? src : {};
  const d = DEFAULT_ABOUT;
  const pick = (o, dflt, n) => { const t = tri(o, n); return { ckb: t.ckb || dflt.ckb, ar: t.ar || t.ckb || dflt.ar, en: t.en || t.ckb || dflt.en }; };
  return {
    name: clip(s.name, 60) || d.name,
    nameLocal: pick(s.nameLocal, d.nameLocal, 60),
    role: pick(s.role, d.role, 120),
    phone: clip(s.phone, 30).replace(/[^\d+ ]/g, "") || "",
    whatsapp: s.whatsapp === undefined ? d.whatsapp : !!s.whatsapp,
    bio: pick(s.bio, d.bio, 3000),
  };
}

export async function getAbout() {
  if (local.value && Date.now() - local.at < 30000) return local.value;
  let value = await cacheGet(KEY);
  if (!value) {
    value = DEFAULT_ABOUT;
    try {
      const { data } = await adminDb().from("app_settings").select("value").eq("key", "about").maybeSingle();
      if (data?.value && Object.keys(data.value).length) value = data.value;
    } catch {}
    value = normalizeAbout(value);
    await cacheSet(KEY, value, 300);
  }
  local = { at: Date.now(), value };
  return value;
}

export async function saveAbout(input) {
  const value = normalizeAbout(input);
  const { error } = await adminDb().from("app_settings").upsert({ key: "about", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  local = { at: Date.now(), value };
  await cacheDel(KEY);
  return value;
}
