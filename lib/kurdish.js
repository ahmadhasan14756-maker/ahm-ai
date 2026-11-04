// Makes the app's Kurdish richer and more correct — standard Central Kurdish (Sorani) of Sulaymaniyah & Erbil.
// Two parts:
//  1) fixKurdishLetters: safe, automatic letter fixes applied to every Kurdish answer (Arabic letters → Kurdish).
//  2) KURDISH_STYLE: a short style guide + glossary of native Kurdish words to prefer over Arabic/Persian/English
//     loanwords. It goes into the writing prompt AND the proofreader, so the AI writes real Sorani from the start.
// Written from general knowledge of the language — NOT copied from any book or website.

// Arabic letters that are wrong in Kurdish → the correct Kurdish letters. Always-safe orthographic fixes.
const LETTER = { "ي": "ی", "ى": "ی", "ك": "ک" }; // ي→ی, ى→ی, ك→ک
export function fixKurdishLetters(s) {
  return String(s).replace(/[يىك]/g, (c) => LETTER[c] || c);
}

// Native Kurdish word  ⟵  loanword(s) it should replace. Used as guidance (not forced), so meaning is never broken.
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
  ["هەژمار", "حساب / حیساب"], ["وشەی نهێنی", "باسوۆرد"], ["دڵنیابوونەوە", "تأكيد / تەئکید"],
  ["گەڕان", "بحث / بەحس"], ["هەڵبژاردن", "اختيار / ئیختیار"], ["زیادکردن", "إضافة / ئیزافە"],
  ["سڕینەوە", "حذف / حەزف"], ["دەستکاری", "تعديل / تەعدیل"], ["پاشەکەوتکردن", "حفظ / حەفز"],
];

const glossaryLines = GLOSSARY.map(([good, bad]) => `  ${good}  (نەک: ${bad})`).join("\n");

export const KURDISH_STYLE = `
RICH, NATURAL KURDISH SORANI (write real Sorani, not translated-sounding Kurdish)
- Use the standard written Central Kurdish (Sorani) of Sulaymaniyah and Erbil: correct letters ک ی ە ه ڕ ڵ ێ ۆ ژ چ پ گ ڤ, Kurdish punctuation (، ؛ ؟) and Kurdish digits ٠١٢٣٤٥٦٧٨٩.
- Prefer a real Kurdish word over an Arabic, Persian or English loanword whenever a common one exists:
${glossaryLines}
- Natural Kurdish word order and connectors (و، بەڵام، چونکە، بۆیە، کاتێک، لەبەر ئەوەی). Short, clear sentences; never a word-for-word translation from Arabic or English.
- Keep technical names people truly use (ئینتەرنێت، ئیمەیڵ، ئەپ، فایل) — don't force an odd word where the loan is the normal one. Put an English term in brackets after the Kurdish only when it helps, e.g. «بیرگە (RAM)».
- Correct spelling only: ئە/ئا at word start, ە for the vowel and ه for the consonant, no Arabic vowel marks (َ ِ ُ ّ).`;
