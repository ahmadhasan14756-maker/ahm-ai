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
- This is the style and quality to match (examples of good Sorani):
${EXAMPLES.map((e) => "  • " + e).join("\n")}`;
