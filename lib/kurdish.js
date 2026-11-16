// Makes the app's Kurdish richer and more correct — standard Central Kurdish (Sorani) of Sulaymaniyah & Erbil.
//  1) fixKurdishLetters: safe automatic letter fixes on every Kurdish answer (Arabic letters → Kurdish).
//  2) KURDISH_STYLE: a style guide + glossary of native words + good example sentences, put into the writing prompt
//     AND the proofreader, so the AI writes real, pure Sorani from the start.
// Written from general knowledge of the language — NOT copied from any book or website.

// Arabic letters that are wrong in Kurdish → the correct Kurdish letters. Always-safe orthographic fixes.
const LETTER = { "ي": "ی", "ى": "ی", "ك": "ک" }; // ي→ی, ى→ی, ك→ک
export function fixKurdishLetters(s) {
  return String(s).replace(/[يىك]/g, (c) => LETTER[c] || c);
}

// Instant spelling fixes on the AI's text, per dialect (whole words only, safe forms only — no meaning change).
const SORANI_FIX = { "بەلام": "بەڵام", "هەروها": "هەروەها", "ئیستا": "ئێستا", "لەگەل": "لەگەڵ", "زور": "زۆر", "گرینگ": "گرنگ" };
// Sorani words that slip into a Badini answer → their Badini word (only words that mean the same in every use).
const BADINI_FIX = { "ئێستا": "نوکە", "زۆر": "گەلەک", "لەگەڵ": "دگەل", "هەموو": "هەمی", "چۆن": "چاوا", "تکایە": "هیڤیە", "سوپاس": "سپاس",
  "سڵاو": "سلاڤ", "بەڵام": "بەلێ", "وەڵام": "بەرسڤ", "زیاتر": "پتر", "کەمتر": "کێمتر", "ئەمڕۆ": "ئەڤرۆ", "سبەی": "سوبەهی", "دوێنێ": "دوهی",
  "منداڵ": "زارۆک", "گەورە": "مەزن", "هەڵە": "خەلەتی", "کێشە": "ئاریشە", "ماڵ": "مال", "ساڵ": "سال", "گوڵ": "گول", "نوێ": "نوو", "کۆن": "کەڤن",
  "بۆیە": "ژبەر هندێ", "چونکە": "چونکی", "یارمەتی": "هاریکاری", "هەندێک": "هندەک", "نییە": "نینە" };
const KU_WORD = /[\u0620-\u06FF\u200c]+/g;
export function fixDialectWords(s, dialect) {
  const map = dialect === "kmr" ? BADINI_FIX : SORANI_FIX;
  return String(s).replace(KU_WORD, (w) => map[w] || w);
}

// Native Kurdish word  ⟵  loanword(s) it should replace. Guidance only (never forced), so meaning is safe.
export const GLOSSARY = [
  ["زانیاری", "معلومات / مەعلومات"], ["بەکارهێنەر", "مستخدم / یوزەر"], ["ئامێر", "جهاز / جیهاز"],
  ["ڕێکخستن", "ترتیب / تەنزیم"], ["نموونە", "مثال / میسال"], ["لاپەڕە", "صفحة / سەفحە"],
  ["دوگمە", "زر / زڕ"], ["کێشە", "مشکلة / موشکیلە"], ["چارەسەر", "حل / حەل"],
  ["پرسیار", "سؤال / سوئال"], ["وەڵام", "جواب / جەواب"], ["کات", "وقت / وەقت"],
  ["ئاسان", "سهل / سەهل"], ["قورس / دژوار", "صعب / سەعب"], ["گرنگ", "مهم / موهیم"],
  ["دەکرێت / دەشێت", "ممكن / مومکین"], ["ڕێگا / شێواز", "طريقة / تەریقە"], ["ئەنجام", "نتيجة / نەتیجە"],
  ["بۆ نموونە", "مثلا / مەسەلەن"], ["هەروەها", "أيضا / ئەیزەن"], ["بەڵام", "لكن / لاکن"],
  ["هەمیشە", "دائما / دائیمەن"], ["بەهۆی", "بسبب / بەسەبەب"], ["تایبەت", "خاص / خاس"],
  ["گشتی", "عام / عام"], ["تەواو", "كامل / کامیل"], ["باشتر", "أفضل / ئەفزەل"],
  ["زۆر", "كثير / کەسیر"], ["کەم", "قليل / قەلیل"], ["خێرا", "سريع / سەریع"],
  ["پێویست", "ضروري / زەروری"], ["بەردەست", "متاح / موتاح"], ["ڕاست", "صحيح / سەح"],
  ["هەڵە", "خطأ / خەتا"], ["دابەزاندن", "تنزيل / داونلۆد"], ["ناردن", "إرسال / ئیرسال"],
  ["هەژمار", "حساب / حیساب"], ["وشەی نهێنی", "باسوۆرد"], ["دڵنیایی", "تأكيد / تەئکید"],
  ["گەڕان", "بحث / بەحس"], ["هەڵبژاردن", "اختيار / ئیختیار"], ["زیادکردن", "إضافة / ئیزافە"],
  ["سڕینەوە", "حذف / حەزف"], ["دەستکاری", "تعديل / تەعدیل"], ["پاشەکەوتکردن", "حفظ / حەفز"],
  ["بەکارهێنان", "استخدام / ئیستیعمال"], ["پشتیوانی", "دعم / دەعم"], ["خزمەتگوزاری", "خدمة / خزمە"],
  ["بەرهەم", "منتج / مەنتەج"], ["بەها", "قيمة / قیمە"], ["نرخ", "سعر / سعر"],
  ["بڕ", "كمية / کەمیە"], ["ژمارە", "رقم / رەقەم"], ["بەروار", "تاريخ / تاریخ"],
  ["ناونیشان", "عنوان / عنوان"], ["پەیوەندی", "اتصال / ئیتیصال"], ["ڕاپۆرت", "تقرير / تەقریر"],
  ["مێژوو", "تاريخ (مێژوویی)"], ["بەشداری", "مشاركة / موشارەکە"], ["بەشدار", "مشترك / موشتەرەک"],
  ["ئەندام", "عضو / عوزو"], ["مامەڵە", "معاملة / مواصلات"], ["داهات", "دخل / إيراد"],
  ["خەرجی", "مصروف / مەسروف"], ["قازانج", "ربح / ریبح"], ["بودجە", "ميزانية / میزانیە"],
  ["بەڕێوەبردن", "إدارة / ئیدارە"], ["بەڕێوەبەر", "مدير / مودیر"], ["کارمەند", "موظف / موەزەف"],
  ["کڕیار", "زبون / عميل"], ["مامۆستا", "معلم / مودەریس"], ["قوتابی", "طالب / تالیب"],
  ["نەخۆش", "مريض / مەریز"], ["دەرمان", "دواء / دەوا"], ["تەندروستی", "صحة / سیححە"],
  ["پارێزگاری", "حماية / حیمایە"], ["مەترسی", "خطر / خەتەر"], ["سەلامەت", "آمن / ئامین"],
  ["یاسا", "قانون / قانوون"], ["ڕێسا", "قاعدة / قاعیدە"], ["مەرج", "شرط / شەرت"],
  ["هەنگاو", "خطوة / خەتوە"], ["ئاست", "مستوى / موستەوا"], ["توانا", "قدرة / قودرە"],
  ["هەوڵ", "محاولة / موحاوەلە"], ["ئامانج", "هدف / هەدەف"], ["پلان", "خطة / خیتتە"],
  ["گرێبەست", "عقد / عەقد"], ["پسوولە", "فاتورة / فاتورە"], ["وردەکاری", "تفاصيل / تەفاسیل"],
  ["نوێکردنەوە", "تحديث / تەحدیس"], ["گۆڕین", "تغيير / تەغیر"], ["بەرنامە", "برنامج / بەرنامەج"],
];

const glossaryLines = GLOSSARY.map(([good, bad]) => `  ${good}  (نەک: ${bad})`).join("\n");

// Clean, varied example sentences — the model copies this STYLE (spelling, native words, natural flow).
const EXAMPLES = [
  "سڵاو، بەخێربێیت! چۆن دەتوانم یارمەتیت بدەم؟",
  "بۆ چارەسەرکردنی کێشەکە، سەرەتا ئامێرەکە بکوژێنەوە و دووبارە دایبگرسێنەوە.",
  "ئەم بەرنامەیە زانیاری بەکارهێنەرەکان بە سەلامەتی لە داتابەیسدا هەڵدەگرێت.",
  "تکایە ناوی بەکارهێنەر و وشەی نهێنی بنووسە، پاشان دوگمەی چوونەژوورەوە دابگرە.",
  "کۆی گشتیی خەرجییەکانی ئەم مانگە لە ڕاپۆرتەکەدا بە ڕوونی دیارە.",
  "ئەگەر پرسیارێکت هەبوو، بە دڵنیاییەوە پێم بڵێ و وردەکارییەکەم بۆ ڕوون دەکەیتەوە.",
  "زمانی کوردی زمانێکی ڕەسەن و دەوڵەمەندە، و پاراستنی ئەرکی هەموومانە.",
  "دوای پاشەکەوتکردن، گۆڕانکارییەکان یەکسەر لەسەر هەموو ئامێرەکان دەردەکەون.",
];

export const KURDISH_STYLE = `
RICH, PURE KURDISH SORANI (write real Sorani — never a translated-sounding or mixed answer)
- Standard written Central Kurdish (Sorani) of Sulaymaniyah and Erbil: correct letters ک ی ە ه ڕ ڵ ێ ۆ ژ چ پ گ ڤ, Kurdish punctuation (، ؛ ؟) and Kurdish digits ٠١٢٣٤٥٦٧٨٩.
- ONE LANGUAGE ONLY: a Kurdish answer is 100% Kurdish. Never drop an English or Arabic word into a Kurdish sentence (no "the", "and", "so", "ok", "file", "button"…). The ONLY exception is a real technical name people truly use, placed in brackets after the Kurdish word, e.g. «بیرگە (RAM)». Re-read every sentence and remove any stray foreign word before you finish.
- Prefer a real Kurdish word over an Arabic/Persian/English loanword whenever a common one exists:
${glossaryLines}
- Keep the few loans that ARE the normal Kurdish word (ئینتەرنێت، ئیمەیڵ، ئەپ، فایل، مۆبایل) — don't force a strange replacement.
- Natural Kurdish word order and connectors (و، بەڵام، چونکە، بۆیە، کاتێک، لەبەر ئەوەی، هەروەها). Short, clear sentences; one idea each; never word-for-word from Arabic or English.
- Spelling: ئە/ئا at the start of a word, ە for the vowel and ه for the consonant, no Arabic vowel marks (َ ِ ُ ّ).
- CLEAR KURDISH (easy for everyone to read):
  • Use the everyday words people really say in Sulaymaniyah and Erbil, not bookish or invented words. If a hard term is needed, explain it in a few simple words the first time.
  • Short sentences (about 8–18 words), the verb at the end, one idea per sentence. Active voice («ئەپەکە فایلەکە دەکاتەوە»), not long chains of passives or «کە … کە … کە».
  • Never translate English or Arabic idioms word for word; say it the way a Kurd would say it.
  • Keep one form for a word through the whole answer (don't switch between «دەتوانیت» and «دەتوانی»), and address the user as «تۆ» naturally.
  • Common slips to avoid: بەڵام (not بەلام)، هەروەها (not هەروها)، ئێستا (not ئیستا)، لەگەڵ (not لەگەل)، زۆر (not زور)، گرنگ (not گرینگ)، تەنها (not تەنیا in writing).
- This is the style and quality to match (examples of good Sorani):
${EXAMPLES.map((e) => "  • " + e).join("\n")}`;

// ───────────────────────── BADINI ─────────────────────────
// Badini (Bahdini / Behdînî Kurmanji of Duhok, Zakho, Amedi), written in Arabic script. A separate dialect from
// Sorani: it must NEVER be mixed with it. Pairs below are «Badini ← Sorani» so the model can tell them apart.
const BADINI_PAIRS = [
  ["ئەز", "من (I)"], ["تو", "تۆ"], ["ئەم", "ئێمە (we)"], ["هوین", "ئێوە"], ["ئەڤ / ئەڤە", "ئەم / ئەمە"],
  ["نوکە", "ئێستا"], ["چاوا", "چۆن"], ["چ / چی", "چی"], ["کیژ / کیژان", "کام"], ["کیڤە / ل کیڤە", "کوێ"], ["کەنگی", "کەی"],
  ["گەلەک", "زۆر"], ["هەمی", "هەموو"], ["تشت", "شت"], ["پەیڤ", "وشە"], ["ناڤ", "ناو"], ["بێژە", "بڵێ"],
  ["ئەڤرۆ", "ئەمڕۆ"], ["سوبەهی", "سبەی"], ["دوهی", "دوێنێ"], ["دەم", "کات"], ["هەیڤ", "مانگ"], ["سال", "ساڵ"],
  ["مال", "ماڵ"], ["باژێڕ", "شار"], ["ئاڤ", "ئاو"], ["زارۆک", "منداڵ"], ["مەزن", "گەورە"], ["خراب", "خراپ"],
  ["نوو", "نوێ"], ["کەڤن", "کۆن"], ["پتر", "زیاتر"], ["کێمتر", "کەمتر"], ["پسیار", "پرسیار"], ["بەرسڤ", "وەڵام"],
  ["هاریکاری", "یارمەتی"], ["پێزانین", "زانیاری"], ["خەلەتی", "هەڵە"], ["ئاریشە", "کێشە"], ["هنارتن", "ناردن"],
  ["ڤەکرن", "کردنەوە"], ["گرتن", "داخستن"], ["ژێبرن", "سڕینەوە"], ["گوهۆڕین", "گۆڕین"], ["نڤیسین", "نووسین"],
  ["خواندن", "خوێندنەوە"], ["دیتن", "بینین"], ["دشێم / دشێی", "دەتوانم / دەتوانیت"], ["دڤێت", "پێویستە / دەبێت"],
  ["هیڤیە", "تکایە"], ["سپاس", "سوپاس"], ["سلاڤ", "سڵاو"], ["ئێک", "یەک"], ["چونکی", "چونکە"], ["بەلێ (but)", "بەڵام"],
  ["ژبەر هندێ", "بۆیە"], ["دەمێ", "کاتێک"], ["… ژی", "…یش"], ["پشتی", "دوای"], ["بەری", "پێش"], ["دگەل", "لەگەڵ"],
  ["ل", "لە (in/at)"], ["ژ", "لە (from)"], ["ب", "بە"], ["د … دا", "لە … دا"], ["نینە", "نییە"], ["هەیە", "هەیە"],
  ["کار", "کار"], ["ڕێک", "ڕێگا"], ["جه", "شوێن"], ["زانین", "زانین"], ["فێربوون", "فێربوون"], ["ئاخفتن", "قسەکردن"],
  ["دئاخڤیت", "قسە دەکات"], ["بزانە", "بزانە"], ["هندەک", "هەندێک"], ["هند", "ئەوەندە"], ["وەسا", "وا / بەم شێوەیە"],
  ["کو", "کە"], ["ئەگەر", "ئەگەر"], ["هێشتا", "هێشتا"], ["دیسا", "دیسان"], ["دبیت", "دەبێت"], ["نابیت", "نابێت"],
  ["هاتە", "هات"], ["چوو", "چوو"], ["وەرە", "وەرە"], ["بچە", "بڕۆ"], ["بێ بەرامبەر", "بەخۆڕایی"], ["بهایێ", "نرخی"],
  ["خوارن", "خواردن"], ["ڤەخوارن", "خواردنەوە"], ["نڤستن", "خەوتن / نووستن"], ["ڕابوون", "هەستان"], ["کچ", "کچ"], ["کوڕ", "کوڕ"],
];
const BADINI_EXAMPLES = [
  "سلاڤ، ب خێر بێی! ئەز چاوا دشێم هاریکاریا تە بکەم؟",
  "بۆ چارەسەرکرنا ڤێ ئاریشێ، دەستپێکێ ئامیری بکوژینە و پاشان دووبارە ڤەکە.",
  "ئەڤ بەرنامە پێزانینێن بکارئینەران ب پارێزراوی پاشکەفت دکەت.",
  "هیڤیە ناڤێ بکارئینەری و پەیڤا نهێنی بنڤیسە، پاشان ل سەر دوگمەیا چوونا ژوور کلیک بکە.",
  "ئەڤرۆ کەشوهەوا ل دهۆکێ گەلەک خۆشە، بەلێ سوبەهی دێ باران بارینیت.",
  "ئەگەر پسیارەکا تە هەبیت، ب دلخوازی ژ من بپسیارە و ئەز دێ بۆ تە ڕوون کەم.",
  "ئەڤ ئەپە دشێت ب کوردی، عەرەبی و ئینگلیزی بئاخڤیت و بەرسڤا پسیارێن تە بدەت.",
  "پشتی پاشکەفتکرنێ، گوهۆڕین دێ ل سەر هەمی ئامیران دیار بن.",
];

export const BADINI_STYLE = `
KURDISH BADINI — write real, natural Badini (Bahdini Kurmanji of Duhok, Zakho, Amedi) in Arabic script
- This user reads Kurdish BADINI. Every Kurdish sentence you write must be Badini — NEVER Sorani, and never a mix of the two dialects in one answer. Re-read each sentence before finishing and change any Sorani word or form into Badini.
- Grammar that makes it Badini:
  • Present tense = د + verb: دکەم، دچم، دبینم، دزانم، دنڤیسم، دخوینم (never Sorani دەکەم، دەچم، دەبینم). Negative: ناکەم، ناچم، نزانم. Future: دێ + verb (ئەز دێ چم، دێ کەم).
  • Prepositions: ل (in/at), ژ (from), ب (with/by), د … دا (inside), دگەل (with) — never Sorani لە / بە / لەگەڵ.
  • Ezafe by gender/number: -ێ (masculine), -ا (feminine), -ێن (plural): ناڤێ من، پەیڤا نهێنی، پسیارێن تە — not the Sorani -ی for everything.
  • "Also/too" is the separate word ژی (ئەز ژی), not the Sorani suffix -یش.
- Badini word ← Sorani word (always use the first):
${BADINI_PAIRS.map(([b, s]) => `  ${b}  (نەک: ${s})`).join("\n")}
- Letters: Badini rarely uses ڵ (گول، مال، سال — not گوڵ، ماڵ، ساڵ) and often uses ڤ (ئەڤ، نڤیسین، ڤەکرن). Correct ک ی ە ێ ۆ ڕ, Kurdish punctuation (، ؛ ؟) and Kurdish digits ٠١٢٣٤٥٦٧٨٩.
- CLEAR BADINI: the everyday words people say in Duhok and Zakho; short sentences, verb at the end, one idea each; never word-for-word from Arabic, English or Sorani. Keep one form for each word through the whole answer.
- ONE LANGUAGE ONLY: no English or Arabic words dropped into a Badini sentence; a real technical name may follow in brackets, e.g. «بیرگە (RAM)».
- Any Kurdish example written elsewhere in these instructions is in Sorani only to show the FORMAT — always write it in Badini.
- This is the style to match (examples of good Badini):
${BADINI_EXAMPLES.map((e) => "  • " + e).join("\n")}`;
