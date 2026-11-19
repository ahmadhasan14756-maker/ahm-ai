"use client";
// 🎞️ AI presentation designer: a topic or an existing PowerPoint / PDF / Word file → AHM AI rewrites, fixes and
// designs every slide → preview, edit, ask for changes → download an editable PowerPoint and a PDF.
import { useEffect, useMemo, useRef, useState } from "react";
import { THEMES, brandTheme, layoutSlide, renderSlide, exportPptx, exportPdf, readSource, splitBook, pdfPageImages } from "../lib/deck";

const SCAN_PAGES = 6; // pages of a scanned book per part
// how a book is split: text parts (smaller when the words must stay as they are) or page pictures
function bookPlan(src, exact) {
  if (src.scan) { const n = Math.min(50, Math.ceil(src.pages / SCAN_PAGES)); const per = Math.ceil(src.pages / n); return { n, pages: per }; }
  const parts = splitBook(src.text, exact ? 15000 : 45000);
  return { n: parts.length, parts };
}

const TX = {
  title: { ckb: "دیزاینەری پێشکەشکردن", kmr: "دیزاینەرێ پێشکێشکرنێ", ar: "مصمم العروض التقديمية", en: "Presentation designer" },
  sub: { ckb: "بابەتێک بنووسە یان فایلی PowerPoint، PDF یان Word بار بکە. AHM AI ناوەڕۆکەکە دەخوێنێتەوە، هەڵەکان چاک دەکات، و هەموو سلایدەکان بە دیزاینێکی پڕۆفیشناڵ دروست دەکات.", kmr: "بابەتەکێ بنڤیسە یان فایلەکا PowerPoint، PDF یان Word بار بکە. AHM AI دێ ناڤەڕۆکێ خوینیت، خەلەتیان چاک کەت، و هەمی سلایدان ب دیزاینەکا پرۆفیشنال دروست کەت.", ar: "اكتب موضوعاً أو ارفع ملف PowerPoint أو PDF أو Word. يقرأ AHM AI المحتوى ويصحح الأخطاء ويصمم كل الشرائح بأسلوب احترافي.", en: "Type a topic or upload a PowerPoint, PDF or Word file. AHM AI reads it, fixes mistakes and designs every slide professionally." },
  back: { ckb: "گەڕانەوە", kmr: "زڤڕین", ar: "رجوع", en: "Back" },
  tabTopic: { ckb: "✍️ بابەت", kmr: "✍️ بابەت", ar: "✍️ موضوع", en: "✍️ Topic" },
  tabFile: { ckb: "📄 فایل", kmr: "📄 فایل", ar: "📄 ملف", en: "📄 File" },
  topicPh: { ckb: "بۆ نموونە: گرنگیی وزەی خۆر لە کوردستان، بۆ قوتابیانی زانکۆ…", kmr: "بۆ نموونە: گرنگیا وزەیا ڕۆژێ ل کوردستانێ، بۆ قوتابیێن زانکۆیێ…", ar: "مثلاً: أهمية الطاقة الشمسية في العراق، لطلاب الجامعة…", en: "e.g. Solar energy in Kurdistan, for university students…" },
  wishPh: { ckb: "ئارەزوومەندانە: چی زیاد بکەم یان بگۆڕم؟", kmr: "ب دلێ خۆ: ئەز چ زێدە بکەم یان بگوهۆڕم؟", ar: "اختياري: ماذا أضيف أو أغيّر؟", en: "Optional: anything to add or change?" },
  pick: { ckb: "📂 فایل هەڵبژێرە (PowerPoint، PDF، Word)", kmr: "📂 فایلەکێ هەلبژێرە (PowerPoint، PDF، Word)", ar: "📂 اختر ملفاً (PowerPoint، PDF، Word)", en: "📂 Choose a file (PowerPoint, PDF, Word)" },
  pickHint: { ckb: "PowerPoint، PDF (تا 30MB)، Word، Excel، TXT، یان وێنە (تا ٨ وێنە: لاپەڕە، تێبینی، تەختەڕەش)", kmr: "PowerPoint، PDF (هەتا 30MB)، Word، Excel، TXT، یان وێنە (هەتا ٨ وێنە: لاپەڕ، تێبینی، تەختە)", ar: "PowerPoint أو PDF (حتى 30MB) أو Word أو Excel أو TXT أو صور (حتى 8: صفحات، ملاحظات، سبورة)", en: "PowerPoint, PDF (up to 30 MB), Word, Excel, TXT, or photos (up to 8: pages, notes, a whiteboard)" },
  exact: { ckb: "ناوەڕۆکەکە وەک خۆی بێت (نووسینەکان ناگۆڕدرێن، تەنها دەکرێتە سلاید)", kmr: "ناڤەڕۆک وەک خۆ بیت (نڤیسین ناهێنە گوهۆڕین، تنێ دبیتە سلاید)", ar: "المحتوى كما هو (لا تُغيَّر الكلمات، يتحول إلى شرائح فقط)", en: "Keep the content exactly as it is (same words, just turned into slides)" },
  bookFound: { ckb: "📚 کتێب: {p} لاپەڕە — هەمووی دەکرێتە سلاید ({n} بەش)", kmr: "📚 پەرتووک: {p} لاپەڕ — هەمی دبیتە سلاید ({n} پشک)", ar: "📚 كتاب: {p} صفحة — يتحول كله إلى شرائح ({n} أجزاء)", en: "📚 Book: {p} pages — all of it becomes slides ({n} parts)" },
  bookFoundT: { ckb: "📚 نووسینێکی درێژ — هەمووی دەکرێتە سلاید ({n} بەش)", kmr: "📚 نڤیسینەکا درێژ — هەمی دبیتە سلاید ({n} پشک)", ar: "📚 نص طويل — يتحول كله إلى شرائح ({n} أجزاء)", en: "📚 Long document — all of it becomes slides ({n} parts)" },
  s_book: { ckb: "کتێبەکە دەکرێتە سلاید: {i} لە {n} بەش تەواو بوو…", kmr: "پەرتووک دبیتە سلاید: {i} ژ {n} پشکان ب دووماهی هات…", ar: "يتحول الكتاب إلى شرائح: اكتمل {i} من {n}…", en: "Turning the book into slides: {i} of {n} parts done…" },
  readingP: { ckb: "دەخوێنرێتەوە… لاپەڕە {i} لە {n}", kmr: "دهێتە خواندن… لاپەڕ {i} ژ {n}", ar: "جارٍ القراءة… صفحة {i} من {n}", en: "Reading… page {i} of {n}" },
  bookPartFail: { ckb: "هەندێک بەش دروست نەبوون ({n}). ئەوەی هەیە پیشان دراوە — دەتوانیت دووبارە هەوڵ بدەیتەوە.", kmr: "هندەک پشک چێ نەبوون ({n}). یا هەی هاتە نیشاندان — دشێی دووبارە هەول بدەی.", ar: "لم تُنشأ بعض الأجزاء ({n}). عُرض ما تم — يمكنك إعادة المحاولة.", en: "Some parts failed ({n}). What worked is shown — you can try again." },
  savingP: { ckb: "ئامادە دەکرێت {i}/{n}", kmr: "ئامادە دبیت {i}/{n}", ar: "جارٍ التجهيز {i}/{n}", en: "Preparing {i}/{n}" },
  e_ticket: { ckb: "کاتەکە تەواو بوو. دووبارە دروستی بکەرەوە.", kmr: "دەم ب دووماهی هات. دووبارە چێ بکە.", ar: "انتهت المهلة. أعد الإنشاء.", en: "The session expired. Make it again." },
  picsFound: { ckb: "{n} وێنە", kmr: "{n} وێنە", ar: "{n} صور", en: "{n} photos" },
  textFound: { ckb: "ناوەڕۆکەکە خوێندرایەوە ✅", kmr: "ناڤەڕۆک هاتە خواندن ✅", ar: "تمت قراءة المحتوى ✅", en: "Content read ✅" },
  reading: { ckb: "فایلەکە دەخوێنرێتەوە…", kmr: "فایل دهێتە خواندن…", ar: "جارٍ قراءة الملف…", en: "Reading the file…" },
  e_old_format: { ckb: "ئەمە فۆرماتی کۆنە (.ppt / .doc / .xls). لە Office وەک .pptx / .docx / .xlsx پاشەکەوتی بکە و دووبارە بینێرە.", kmr: "ئەڤە فۆرماتەکێ کەڤنە (.ppt / .doc / .xls). ل Office وەک .pptx / .docx / .xlsx پاشەکەفت بکە و دووبارە بهنێرە.", ar: "هذه صيغة قديمة (.ppt / .doc / .xls). احفظه بصيغة .pptx / .docx / .xlsx وأعد إرساله.", en: "This is an old format (.ppt / .doc / .xls). Save it as .pptx / .docx / .xlsx and send it again." },
  slidesFound: { ckb: "{n} سلاید دۆزرایەوە", kmr: "{n} سلاید هاتنە دیتن", ar: "وُجدت {n} شرائح", en: "{n} slides found" },
  lang: { ckb: "زمان", kmr: "زمان", ar: "اللغة", en: "Language" },
  langAuto: { ckb: "وەک سەرچاوەکە", kmr: "وەکی ژێدەری", ar: "مثل المصدر", en: "Same as source" },
  style: { ckb: "شێواز", kmr: "شێواز", ar: "الأسلوب", en: "Style" },
  count: { ckb: "ژمارەی سلاید", kmr: "ژمارا سلایدان", ar: "عدد الشرائح", en: "Number of slides" },
  auto: { ckb: "خۆکار", kmr: "خۆکار", ar: "تلقائي", en: "Automatic" },
  keep: { ckb: "هەمان ژمارەی سلایدی فایلەکە بهێڵەوە", kmr: "هەمان ژمارا سلایدێن فایلێ بهێلە", ar: "حافظ على عدد شرائح الملف", en: "Keep the file's number of slides" },
  images: { ckb: "🖼️ وێنەی AI زیاد بکە (تا ٣ وێنە)", kmr: "🖼️ وێنێن AI زێدە بکە (هەتا ٣ وێنەیان)", ar: "🖼️ أضف صور ذكاء اصطناعي (حتى 3)", en: "🖼️ Add AI pictures (up to 3)" },
  make: { ckb: "✨ پێشکەشکردنەکە دروست بکە", kmr: "✨ پێشکێشکرنێ دروست بکە", ar: "✨ أنشئ العرض", en: "✨ Create the presentation" },
  s_read: { ckb: "ناوەڕۆکەکە دەخوێنرێتەوە و دەنووسرێتەوە…", kmr: "ناڤەڕۆک دهێتە خواندن و نڤیسینەڤە…", ar: "جارٍ قراءة المحتوى وإعادة كتابته…", en: "Reading and rewriting the content…" },
  s_pics: { ckb: "وێنەکان دروست دەکرێن…", kmr: "وێنە دهێنە دروستکرن…", ar: "جارٍ إنشاء الصور…", en: "Making the pictures…" },
  s_draw: { ckb: "سلایدەکان دیزاین دەکرێن…", kmr: "سلاید دهێنە دیزاینکرن…", ar: "جارٍ تصميم الشرائح…", en: "Designing the slides…" },
  left: { ckb: "ماوەت: {n} پێشکەشکردنی بەخۆڕایی", kmr: "بۆ تە مایین: {n} پێشکێشکرنێن بێ بەرامبەر", ar: "المتبقي: {n} عروض مجانية", en: "{n} free presentations left" },
  leftPro: { ckb: "ماوەت ئەمڕۆ: {n} پێشکەشکردن", kmr: "ئەڤرۆ بۆ تە مایین: {n} پێشکێشکرن", ar: "المتبقي اليوم: {n} عروض", en: "Left today: {n} presentations" },
  getPro: { ckb: "⭐ Pro وەربگرە بۆ زیاتر", kmr: "⭐ Pro وەربگرە بۆ پتر", ar: "⭐ اشترك في Pro للمزيد", en: "⭐ Get Pro for more" },
  pptx: { ckb: "⬇️ PowerPoint (دەستکاریکراو)", kmr: "⬇️ PowerPoint (دەستکاریکرنێ قەبویل دکەت)", ar: "⬇️ PowerPoint (قابل للتعديل)", en: "⬇️ PowerPoint (editable)" },
  pdf: { ckb: "⬇️ PDF", ar: "⬇️ PDF", en: "⬇️ PDF" },
  saving: { ckb: "ئامادە دەکرێت…", kmr: "دهێتە ئامادەکرن…", ar: "جارٍ التحضير…", en: "Preparing…" },
  fixes: { ckb: "✅ ئەم چاککردنانە کران", kmr: "✅ ئەڤ چاککرنە هاتنە کرن", ar: "✅ التصحيحات التي تمت", en: "✅ Fixes made" },
  edit: { ckb: "✏️ دەستکاریی ئەم سلایدە", kmr: "✏️ دەستکاریا ڤی سلایدی", ar: "✏️ تعديل هذه الشريحة", en: "✏️ Edit this slide" },
  fTitle: { ckb: "ناونیشان", kmr: "ناڤونیشان", ar: "العنوان", en: "Title" },
  fSub: { ckb: "دەقی لاوەکی", kmr: "دەقێ لاوەکی", ar: "النص الفرعي", en: "Subtitle / text" },
  fBullets: { ckb: "خاڵەکان (هەر دێڕێک خاڵێک)", kmr: "خال (هەر دێڕەک خالەکە)", ar: "النقاط (كل سطر نقطة)", en: "Points (one per line)" },
  fNotes: { ckb: "تێبینیی قسەکەر", kmr: "تێبینیێن ئاخفتنڤانی", ar: "ملاحظات المتحدث", en: "Speaker notes" },
  apply: { ckb: "جێبەجێکردن", kmr: "جێبەجێکرن", ar: "تطبيق", en: "Apply" },
  ask: { ckb: "💬 داوای گۆڕانکاری لە AI بکە", kmr: "💬 داخوازا گوهۆڕینێ ژ AI بکە", ar: "💬 اطلب تعديلاً من الذكاء الاصطناعي", en: "💬 Ask the AI for changes" },
  askPh: { ckb: "بۆ نموونە: سلایدی ٣ کورتتر بکە، سلایدێک دەربارەی تێچوو زیاد بکە…", kmr: "بۆ نموونە: سلایدا ٣ کورتتر بکە، سلایدەکێ دەربارەی تێچوونێ زێدە بکە…", ar: "مثلاً: اختصر الشريحة 3، أضف شريحة عن التكلفة…", en: "e.g. make slide 3 shorter, add a slide about costs…" },
  askBtn: { ckb: "گۆڕین", kmr: "گوهۆڕین", ar: "تعديل", en: "Change" },
  asking: { ckb: "گۆڕانکاری دەکرێت…", kmr: "گوهۆڕین دهێتە کرن…", ar: "جارٍ التعديل…", en: "Changing…" },
  newDeck: { ckb: "➕ پێشکەشکردنی نوێ", kmr: "➕ پێشکێشکرنەکا نوو", ar: "➕ عرض جديد", en: "➕ New presentation" },
  slide: { ckb: "سلاید", kmr: "سلاید", ar: "شريحة", en: "Slide" },
  prev: { ckb: "پێشوو", kmr: "بەری", ar: "السابق", en: "Previous" },
  next: { ckb: "دواتر", kmr: "پاشان", ar: "التالي", en: "Next" },
  e_limit: { ckb: "پێشکەشکردنە بەخۆڕاییەکانت تەواو بوون. بۆ زیاتر Pro وەربگرە.", kmr: "پێشکێشکرنێن تە یێن بێ بەرامبەر ب دوماهی هاتن. بۆ پتر Pro وەربگرە.", ar: "انتهت عروضك المجانية. اشترك في Pro للمزيد.", en: "Your free presentations are used up. Get Pro for more." },
  e_pdf_big: { ckb: "PDFـەکە زۆر گەورەیە (زیاتر لە 3MB). فایلی PowerPoint یان PDFێکی بچووکتر بنێرە.", kmr: "PDF گەلەک مەزنە (پتر ژ 3MB). فایلەکا PowerPoint یان PDF یەکا بچووکتر بهنێرە.", ar: "ملف PDF كبير جداً (أكثر من 3MB).", en: "The PDF is too big (over 3 MB). Send the PowerPoint or a smaller PDF." },
  e_bad_type: { ckb: "ئەم جۆرە فایلە ناخوێنرێتەوە. PowerPoint، PDF، Word، Excel، TXT یان وێنە بنێرە.", kmr: "ئەڤ جۆرێ فایلێ ناهێتە خواندن. PowerPoint، PDF، Word، Excel، TXT یان وێنە بهنێرە.", ar: "لا يمكن قراءة هذا النوع. أرسل PowerPoint أو PDF أو Word أو Excel أو TXT أو صورة.", en: "This file type can't be read. Send PowerPoint, PDF, Word, Excel, TXT or a photo." },
  e_too_big: { ckb: "فایلەکە زۆر گەورەیە.", kmr: "فایل گەلەک مەزنە.", ar: "الملف كبير جداً.", en: "The file is too big." },
  e_empty: { ckb: "سەرەتا بابەتێک بنووسە یان فایلێک هەڵبژێرە.", kmr: "دەستپێکێ بابەتەکێ بنڤیسە یان فایلەکێ هەلبژێرە.", ar: "اكتب موضوعاً أو اختر ملفاً أولاً.", en: "Type a topic or choose a file first." },
  e_busy: { ckb: "ئێستا داواکاری زۆرە. چەند خولەکێکی تر هەوڵ بدەرەوە.", kmr: "نوکە داخوازی گەلەکن. پشتی چەند خولەکان هەول بدە.", ar: "الضغط كبير الآن. حاول بعد دقائق.", en: "Very busy right now. Try again in a few minutes." },
  e_slow_down: { ckb: "زۆر خێرایت 🙂 کەمێک چاوەڕێ بکە.", kmr: "تو گەلەک ب لەزی 🙂 کێمەکێ چاڤەڕێ بە.", ar: "أنت سريع جداً 🙂 انتظر قليلاً.", en: "Too fast 🙂 wait a moment." },
  e_unsafe: { ckb: "ئەم داواکارییە ڕێگەپێدراو نییە.", kmr: "ئەڤ داخوازیە ڕێپێدای نینە.", ar: "هذا الطلب غير مسموح.", en: "This request is not allowed." },
  e_net: { ckb: "کێشەیەک هەبوو. دووبارە هەوڵ بدەرەوە.", kmr: "ئاریشەیەک هەبوو. دووبارە هەول بدە.", ar: "حدث خطأ. أعد المحاولة.", en: "Something went wrong. Try again." },
  picsSkipped: { ckb: "هەندێک وێنە دروست نەبوون، بەبێ ئەوان بەردەوام بووین.", kmr: "هندەک وێنە دروست نەبوون، بێی وان بەردەوام بووین.", ar: "تعذر إنشاء بعض الصور، فتابعنا بدونها.", en: "Some pictures could not be made; continued without them." },
  brand: { ckb: "🏷️ لۆگۆ و ڕەنگی براندەکەت", kmr: "🏷️ لۆگۆ و ڕەنگێ براندێ تە", ar: "🏷️ شعارك ولون علامتك", en: "🏷️ Your logo and brand colour" },
  logoAdd: { ckb: "لۆگۆ زیاد بکە", kmr: "لۆگۆیەکێ زێدە بکە", ar: "أضف الشعار", en: "Add logo" },
  logoChange: { ckb: "گۆڕینی لۆگۆ", kmr: "گوهۆڕینا لۆگۆیێ", ar: "تغيير الشعار", en: "Change logo" },
  remove: { ckb: "لابردن", kmr: "لادان", ar: "إزالة", en: "Remove" },
  color: { ckb: "ڕەنگ", kmr: "ڕەنگ", ar: "اللون", en: "Colour" },
  colorReset: { ckb: "ڕەنگی شێواز", kmr: "ڕەنگێ شێوازی", ar: "لون النمط", en: "Style colour" },
  brandHint: { ckb: "لۆگۆکەت لە سەر هەموو سلایدەکان دەردەکەوێت.", kmr: "لۆگۆیێ تە ل سەر هەمی سلایدان دیار دبیت.", ar: "يظهر شعارك على كل الشرائح.", en: "Your logo appears on every slide." },
  proStyles: { ckb: "پڕۆفیشناڵ", kmr: "پرۆفیشنال", ar: "احترافي", en: "Professional" },
  fItems: { ckb: "بەشەکان (هەر دێڕێک بەشێک)", kmr: "پشک (هەر دێڕەک پشکەکە)", ar: "الأقسام (كل سطر قسم)", en: "Items (one per line)" },
  note: { ckb: "دەتوانیت فایلی PowerPoint لە PowerPoint، Keynote یان Google Slides بکەیتەوە و هەموو شتێکی دەستکاری بکەیت.", kmr: "تو دشێی فایلا PowerPoint د PowerPoint، Keynote یان Google Slides دا ڤەکەی و دەستکاریا هەمی تشتان بکەی.", ar: "يمكنك فتح ملف PowerPoint في PowerPoint أو Keynote أو Google Slides وتعديل كل شيء.", en: "Open the PowerPoint file in PowerPoint, Keynote or Google Slides and edit everything." },
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

export default function SlidesStudio({ lang, getToken, onBack, onUpgrade, initialFile }) {
  const tx = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const uiRtl = lang !== "en";
  const fileRef = useRef(null);
  const [tab, setTab] = useState(initialFile ? "file" : "topic");
  const [exact, setExact] = useState(false);
  const [reading, setReading] = useState(false);
  const [prog, setProg] = useState(null); // { i, n } progress for reading / book parts / saving
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
      for (const E of layouts) { if (stop) return; const c = await renderSlide(E, { px: layouts.length > 30 ? 960 : 1280 }); out.push(c.toDataURL("image/jpeg", 0.86)); c.width = c.height = 0; }
      if (!stop) setThumbs(out);
    })();
    return () => { stop = true; };
  }, [layouts]);
  useEffect(() => { if (deck && sel >= deck.slides.length) setSel(0); }, [deck]);
  useEffect(() => {
    const s = deck?.slides[sel];
    setForm(s ? { title: s.title || "", sub: s.subtitle || s.text || s.quote || "", bullets: (s.layout === "agenda" ? s.items || [] : s.bullets || []).join("\n"), notes: s.notes || "" } : null);
  }, [deck, sel]);

  async function takeFiles(list) {
    const [f, ...more] = list;
    if (!f) return;
    setError(""); setReading(true); setProg(null);
    try { const s = await readSource(f, more, (i, n) => setProg({ i, n })); setSrc(s); if (s.count) setKeep(false); } catch (er) { setError(errText(er.message)); }
    setReading(false); setProg(null);
  }
  async function onFile(e) {
    const list = [...(e.target.files || [])];
    e.target.value = "";
    takeFiles(list);
  }
  // a file sent here from the chat ("📊 make it a PowerPoint")
  useEffect(() => { if (initialFile) takeFiles(Array.isArray(initialFile) ? initialFile : [initialFile]); }, []);

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

  // a whole book: one ticket, then every part in parallel (3 at a time), then one deck
  async function makeBook() {
    const plan = bookPlan(src, exact);
    setBusy("s_book"); setProg({ i: 0, n: plan.n });
    try {
      const t = await api({ action: "book", parts: plan.n });
      if (t.left != null) setQuota((q) => ({ ...q, left: t.left }));
      const total = count ? Math.max(plan.n * 3, +count) : 0;
      const decks = new Array(plan.n).fill(null);
      let done = 0, next = 0, fatal = null;
      const one = async (i) => {
        const body = { action: "make", book: { i, n: plan.n, ticket: t.ticket }, topic: topic.trim(), exact, lang: deckLang === "auto" ? undefined : deckLang, perPart: total ? Math.ceil(total / plan.n) : undefined };
        if (plan.parts) body.text = plan.parts[i];
        else body.images = await pdfPageImages(src.scan, 1 + i * plan.pages, 1 + (i + 1) * plan.pages);
        for (let k = 0; k < 2; k++) {
          try { decks[i] = (await api(body)).deck; return; } catch (e) {
            if (["ticket", "limit", "unauthorized"].includes(e.message)) { fatal = e; return; }
            await new Promise((r) => setTimeout(r, 2500));
          }
        }
      };
      await Promise.all([0, 1, 2].map(async () => {
        while (next < plan.n && !fatal) { const i = next++; await one(i); setProg({ i: ++done, n: plan.n }); }
      }));
      if (fatal) throw fatal;
      const ok = decks.filter(Boolean);
      if (!ok.length) throw new Error("ai");
      const failed = plan.n - ok.length;
      // join the parts: one title slide at the start, one closing slide at the end, sections numbered in order
      let slides = [];
      decks.forEach((d, i) => d && d.slides.forEach((sl) => {
        if (sl.layout === "title" && slides.length) return;
        if (sl.layout === "closing" && i < plan.n - 1) return;
        if (sl.layout === "agenda") return;
        slides.push(sl);
      }));
      let sec = 0;
      slides = slides.map((sl) => (sl.layout === "section" ? { ...sl, number: String(++sec).padStart(2, "0") } : sl));
      const sections = slides.filter((sl) => sl.layout === "section").map((sl) => sl.title).filter(Boolean);
      if (sections.length >= 3 && sections.length <= 7 && slides[0]?.layout === "title") slides.splice(1, 0, { layout: "agenda", title: { ckb: "ناوەڕۆک", kmr: "ناڤەڕۆک", ar: "المحتويات", en: "Contents" }[ok[0].lang] || "Contents", items: sections });
      const first = ok[0];
      setPics({}); setSel(0);
      const deckAll = { title: first.title, subtitle: first.subtitle, lang: first.lang, corrections: [], slides };
      const images = withPics && quota?.images ? await makePics(deckAll) : {};
      setBusy("s_draw");
      setPics(images); setDeck(deckAll);
      if (failed) setError(tx("bookPartFail").replace("{n}", failed));
    } catch (e) {
      setError(errText(e.message));
      if (e.message === "limit") setQuota((q) => ({ ...q, left: 0 }));
    }
    setBusy(""); setProg(null);
  }

  async function make() {
    if (busy) return;
    setError("");
    const useFile = tab === "file" && src;
    if (!useFile && !topic.trim()) { setError(tx("e_empty")); return; }
    if (useFile && src.book) return makeBook();
    setBusy("s_read");
    try {
      const j = await api({ action: "make", topic: topic.trim(), text: useFile ? src.text : "", pdf: useFile ? src.pdf : undefined, images: useFile ? src.images : undefined, exact: useFile && exact,
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
      if (deck.slides.length > 28) {
        // a long (book) deck: change only the part around the selected slide
        const a = Math.max(0, Math.min(sel - 10, deck.slides.length - 24)), b = Math.min(deck.slides.length, a + 24);
        const j = await api({ action: "revise", deck: { ...deck, slides: deck.slides.slice(a, b) }, ask: ask.trim() + " (This is only slides " + (a + 1) + "-" + b + " of a longer deck; the user is looking at slide " + (sel + 1) + ".)" });
        setPics((p) => Object.fromEntries(Object.entries(p).filter(([i]) => +i < a)));
        setDeck({ ...deck, slides: [...deck.slides.slice(0, a), ...j.deck.slides, ...deck.slides.slice(b)] }); setAsk("");
      } else {
        const j = await api({ action: "revise", deck, ask: ask.trim() });
        // keep pictures for slides that still want one in the same place
        setPics((p) => Object.fromEntries(Object.entries(p).filter(([i]) => j.deck.slides[i]?.image)));
        setDeck(j.deck); setAsk("");
      }
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
        const f = await exportPdf(layouts, { fileName: name, onProgress: layouts.length > 20 ? (i, n) => setProg({ i, n }) : undefined }); save(f.blob, f.name);
      }
    } catch (e) { console.error(e); setError(tx("e_net")); }
    setSaving(""); setProg(null);
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
                <input ref={fileRef} type="file" hidden multiple onChange={onFile}
                  accept=".pptx,.pdf,.docx,.xlsx,.txt,.md,.csv,.ppt,.doc,.xls,image/*,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                <button className="house-drop" disabled={reading} onClick={() => fileRef.current?.click()}>
                  <b>{reading ? <><span className="mini-spin" /> {prog ? tx("readingP").replace("{i}", prog.i).replace("{n}", prog.n) : tx("reading")}</> : src ? (src.images ? "📷 " : "📄 ") + src.name : tx("pick")}</b>
                  <small>{src?.book ? (src.pages ? tx("bookFound").replace("{p}", src.pages) : tx("bookFoundT")).replace("{n}", bookPlan(src, exact).n) : src?.count ? tx("slidesFound").replace("{n}", src.count) : src?.images ? tx("picsFound").replace("{n}", src.images.length) : src ? tx("textFound") : tx("pickHint")}</small>
                </button>
                {src && <label className="house-check"><input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} /><span><b>{tx("exact")}</b></span></label>}
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
                <input type="number" min="3" max={src?.book && tab === "file" ? 300 : 25} placeholder={tx("auto")} value={count} disabled={keep} onChange={(e) => setCount(e.target.value)} />
              </label>
            </div>
            <StylePicker style={style} setStyle={setStyle} lang={lang} tx={tx} />
            <BrandPicker brand={brand} setBrand={saveBrand} theme={THEMES[style] || THEMES.corporate} tx={tx} onError={(c) => setError(errText(c))} />
            {quota?.images && (
              <label className="house-check"><input type="checkbox" checked={withPics} onChange={(e) => setWithPics(e.target.checked)} /><span><b>{tx("images")}</b></span></label>
            )}
            {out ? <button className="gold-btn" onClick={onUpgrade}>{tx("getPro")}</button> : (
              <button className="gold-btn" disabled={!!busy} onClick={make}>
                {busy ? <><span className="mini-spin" /> {busy === "s_book" && prog ? tx("s_book").replace("{i}", prog.i).replace("{n}", prog.n) : tx(busy)}</> : tx("make")}
              </button>
            )}
          </div>
        )}

        {deck && (
          <>
            <div className="sl-bar">
              <button className="gold-btn small" disabled={!!saving || !thumbs.length} onClick={() => download("pptx")}>{saving === "pptx" ? tx("saving") : tx("pptx")}</button>
              <button className="gold-btn small" disabled={!!saving || !thumbs.length} onClick={() => download("pdf")}>{saving === "pdf" ? (prog ? tx("savingP").replace("{i}", prog.i).replace("{n}", prog.n) : tx("saving")) : tx("pdf")}</button>
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
