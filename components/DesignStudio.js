"use client";
// 🏗️ AHM AI Construction & Design Studio — the hub for real-photo redesigns:
//   A. Interior design  B. Exterior design  C. Floor plan studio (the house planner)  D. AI redesign (anything)
// Photos are redesigned by a real image AI (server: /api/redesign). Projects are saved privately per user.
import { useEffect, useRef, useState } from "react";
import { Pano360 } from "./HouseStudio";
import dynamic from "next/dynamic";
const Studio3DView = dynamic(() => import("./Studio3D"), { ssr: false }); // 3D studio: loaded only when opened

const L = (ckb, ar, en, kmr) => ({ ckb, ar, en, kmr });
const TX = {
  title: L("ستۆدیۆی بیناسازی و دیزاین", "استوديو البناء والتصميم", "Construction & Design Studio", "ستۆدیۆیا ئاڤاکرن و دیزاینێ"),
  sub: L("وێنەی ژوورەکەت، خانووەکەت یان نەخشەکەت بنێرە — AHM AI بە دیزاینێکی نوێ و پڕۆفیشناڵ دروستی دەکاتەوە.", "أرسل صورة غرفتك أو منزلك أو مخططك — يعيد AHM AI تصميمه باحتراف.", "Send a photo of your room, house or plan — AHM AI redesigns it professionally.", "وێنێ ژوورا خۆ، خانیێ خۆ یان نەخشا خۆ بهنێرە — AHM AI ب دیزاینەکا نوو و پرۆفیشنال دووبارە دروست دکەت."),
  back: L("گەڕانەوە", "رجوع", "Back", "زڤڕین"),
  t_interior: L("دیزاینی ناوەوە", "التصميم الداخلي", "Interior design", "دیزاینا ناڤخۆ"),
  t_interiorSub: L("وێنەی ژوورێک بنێرە: هۆڵ، ژووری نوستن، چێشتخانە، حەمام، ئۆفیس…", "أرسل صورة غرفة: صالة، نوم، مطبخ، حمام، مكتب…", "Send a room photo: living room, bedroom, kitchen, bath, office…", "وێنێ ژوورەکێ بهنێرە: هۆل، ژوورا نڤستنێ، خوارنگەه، حەمام، ئۆفیس…"),
  t_exterior: L("دیزاینی دەرەوە", "التصميم الخارجي", "Exterior design", "دیزاینا دەرڤە"),
  t_exteriorSub: L("ڕووکاری خانوو، باخچە، گەراج، بالکۆن و ڕووناکیی دەرەوە", "واجهة المنزل، الحديقة، الكراج، الشرفات والإضاءة", "House facades, gardens, garages, balconies and outdoor lighting", "ڕووکارێ خانیی، باخچە، گەراج، بالکۆن و ڕووناهیا دەرڤە"),
  t_plan: L("نەخشە و ئەندازیاری", "المخططات والعمارة", "Floor plan & architecture", "نەخشە و ئەندازیاری"),
  t_planSub: L("نەخشە بنێرە ← ژوورەکان دەخوێنرێنەوە، خانووەکەت لە سەرەوە، وێنەی هەموو ژوورەکان", "أرسل مخططاً ← قراءة الغرف، منزلك من الأعلى، صور كل الغرف", "Upload a plan → rooms read, your house from above, every room pictured", "نەخشێ بهنێرە ← ژوور دهێنە خواندن، خانیێ تە ژ سەری ڤە، وێنێن هەمی ژووران"),
  t_redesign: L("دیزاینی نوێی هەر وێنەیەک", "إعادة تصميم أي صورة", "AI redesign studio", "دیزاینا نوو یا هەر وێنەکی"),
  t_redesignSub: L("هەر وێنەیەک بنێرە و بڵێ چی بگۆڕێت — بەراوردی پێش و دوا", "أرسل أي صورة وقل ما تريد تغييره — مقارنة قبل وبعد", "Any photo, say what to change — compare before and after", "هەر وێنەکی بهنێرە و بێژە چ بێتە گوهۆڕین — بەراوردا بەری و پشتی"),
  t_chat: L("ڕاوێژکاری بیناسازی", "مستشار البناء", "Construction assistant", "ڕاوێژکاریا ئاڤاکرنێ"),
  t_chatSub: L("پرسیار، تێچوو و کەرەستە، زاراوەکان", "أسئلة، التكلفة والمواد، المصطلحات", "Questions, costs & materials, terms", "پسیار، تێچوون و کەرەستە، زاراڤ"),
  recent: L("پرۆژەکانی دوایی", "المشاريع الأخيرة", "Recent projects", "پرۆژێن دوماهیێ"),
  noProjects: L("هێشتا هیچ پرۆژەیەک نییە. ئامرازێک هەڵبژێرە و یەکەم دیزاینەکەت دروست بکە ✨", "لا مشاريع بعد. اختر أداة وأنشئ أول تصميم ✨", "No projects yet. Pick a tool and make your first design ✨", "هێشتا چو پرۆژە نینن. ئامرازەکێ هەلبژێرە و دیزاینا خۆ یا ئێکێ دروست بکە ✨"),
  upload: L("📷 وێنەکە ڕابکێشە ئێرە یان دایبگرە بۆ هەڵبژاردن", "📷 اسحب الصورة هنا أو اضغط للاختيار", "📷 Drop a photo here or tap to choose", "📷 وێنەی ڕاکێشە ڤێرە یان کلیک بکە بۆ هەلبژارتنێ"),
  uploadHint: L("JPG، PNG یان HEIC · وێنەیەکی ڕوون و پڕ ڕووناکی باشترین ئەنجام دەدات", "JPG أو PNG أو HEIC · الصورة الواضحة تعطي أفضل نتيجة", "JPG, PNG or HEIC · a clear, bright photo gives the best result", "JPG، PNG یان HEIC · وێنەکێ ڕوون و پڕ ڕووناهی باشترین ئەنجامی ددەت"),
  checking: L("وێنەکە دەپشکنرێت…", "جارٍ فحص الصورة…", "Checking the photo…", "وێنە دهێتە پشکنین…"),
  wayQ: L("دەتەوێت چۆن دیزاین بکرێت؟", "كيف تريد التصميم؟", "How would you like to design it?", "تە دڤێت چاوا دیزاین ببیت؟"),
  wayAi: L("✨ با AI خۆی دیزاینی بکات", "✨ دع الذكاء الاصطناعي يصممها", "✨ Let the AI design it", "✨ بلا AI ب خۆ دیزاین بکەت"),
  wayAiSub: L("AI شێواز، کەلوپەل و ڕەنگەکان بە گونجاوی لەگەڵ قەبارە و شێوەی ژوورەکە دادەنێت", "يضع الذكاء الاصطناعي الأسلوب والأثاث والألوان بما يناسب حجم الغرفة وشكلها", "The AI picks the style, furniture and colours to fit the room's real size and shape", "AI شێواز، کەلوپەل و ڕەنگان ب گونجاوی دگەل قەبارە و شێوێ ژوورێ دادنیت"),
  wayAiExtSub: L("AI ڕووکار، باخچە و ڕووناکی بە گونجاوی لەگەڵ شێوەی خانووەکە و زەوییەکە دیزاین دەکات", "يصمم الذكاء الاصطناعي الواجهة والحديقة والإضاءة بما يناسب شكل المنزل والأرض", "The AI designs the facade, garden and lights to fit the building and the plot", "AI ڕووکار، باخچە و ڕووناهیێ ب گونجاوی دگەل شێوێ خانیی و ئەردی دیزاین دکەت"),
  waySelf: L("🪄 خۆم دایدەنێم", "🪄 سأضعها بنفسي", "🪄 I'll place things myself", "🪄 ئەز ب خۆ دادنێم"),
  waySelfSub: L("خۆت کەلوپەل هەڵدەبژێریت و لە شوێنی دڵخوازت دایدەنێیت، پاشان AI دەیکاتە وێنەیەکی ڕاستەقینە", "تختار الأثاث وتضعه حيث تريد، ثم يحوله الذكاء الاصطناعي إلى صورة حقيقية", "Pick furniture and put it where you want, then the AI turns it into a real photo", "تو ب خۆ کەلوپەلان هەلدبژێری و ل جهێ دلێ خۆ دادنێی، پاشان AI دکەتە وێنەکێ ڕاستەقینە"),
  changeWay: L("↺ گۆڕینی ڕێگا", "↺ تغيير الطريقة", "↺ Change the way", "↺ گوهۆڕینا ڕێکێ"),
  wrong_interior_exterior: L("ئەمە وێنەی دەرەوەیە. ئەم بەشە تەنها وێنەی ناوەوەی ژوور وەردەگرێت.", "هذه صورة خارجية. هذا القسم يقبل صور داخل الغرف فقط.", "This is an outside photo. This section only takes photos of the inside of rooms.", "ئەڤە وێنێ دەرڤەیە. ئەڤ پشکە تنێ وێنێن ناڤخۆیا ژووران وەردگریت."),
  wrong_exterior_interior: L("ئەمە وێنەی ناوەوەی ژوورێکە. ئەم بەشە تەنها وێنەی دەرەوەی خانوو، باخچە یان زەوی وەردەگرێت.", "هذه صورة داخل غرفة. هذا القسم يقبل فقط صور الواجهات والحدائق والأراضي.", "This is a photo of a room. This section only takes the outside of a house, a garden or a plot.", "ئەڤە وێنێ ناڤخۆیا ژوورەکێیە. ئەڤ پشکە تنێ وێنێن دەرڤەیێ خانیی، باخچێ یان ئەردی وەردگریت."),
  wrong_plan: L("ئەمە نەخشەیە. نەخشە دەچێتە بەشی «نەخشە و ئەندازیاری».", "هذا مخطط. المخططات تذهب إلى قسم «المخططات والعمارة».", "This is a floor plan. Plans go to the «Floor plan & architecture» section.", "ئەڤە نەخشەیە. نەخشە دچیتە پشکا «نەخشە و ئەندازیاری»."),
  wrong_interior_other: L("ئەم وێنەیە ژوور نییە. تکایە وێنەی ناوەوەی ژوورێک بنێرە.", "هذه الصورة ليست غرفة. أرسل صورة من داخل غرفة.", "This photo is not a room. Please send a photo of the inside of a room.", "ئەڤ وێنە ژوور نینە. هیڤیە وێنێ ناڤخۆیا ژوورەکێ بهنێرە."),
  wrong_exterior_other: L("ئەم وێنەیە خانوو یان باخچە نییە. تکایە وێنەی دەرەوەی خانوو، باخچە یان زەوی بنێرە.", "هذه الصورة ليست منزلاً أو حديقة. أرسل صورة واجهة أو حديقة أو أرض.", "This photo is not a house or garden. Please send the outside of a house, a garden or a plot.", "ئەڤ وێنە خانی یان باخچە نینە. هیڤیە وێنێ دەرڤەیێ خانیی، باخچێ یان ئەردی بهنێرە."),
  goInterior: L("🛋️ بیبە بۆ بەشی دیزاینی ناوەوە", "🛋️ انقلها إلى التصميم الداخلي", "🛋️ Take it to Interior design", "🛋️ ببە بۆ پشکا دیزاینا ناڤخۆ"),
  goExterior: L("🏡 بیبە بۆ بەشی دیزاینی دەرەوە", "🏡 انقلها إلى التصميم الخارجي", "🏡 Take it to Exterior design", "🏡 ببە بۆ پشکا دیزاینا دەرڤە"),
  goPlan: L("📐 بیبە بۆ بەشی نەخشە و ئەندازیاری", "📐 انقلها إلى المخططات والعمارة", "📐 Take it to Floor plan & architecture", "📐 ببە بۆ پشکا نەخشە و ئەندازیاری"),
  change: L("گۆڕینی وێنە", "تغيير الصورة", "Change photo", "گوهۆڕینا وێنەی"),
  category: L("جۆر", "النوع", "Category", "جۆر"),
  style: L("شێواز", "الأسلوب", "Style", "شێواز"),
  customPh: L("شێوازەکەت وەسف بکە…", "صف أسلوبك…", "Describe your style…", "شێوازێ خۆ وەسف بکە…"),
  ask: L("چی بگۆڕێت؟", "ماذا تريد أن يتغير؟", "What should change?", "چ بێتە گوهۆڕین؟"),
  askPh: L("بۆ نموونە: قەنەفەی بێژ، ڕووناکیی نەرمی بنمیچ، زەوی مەڕمەڕ، ڕووەکی ناوماڵ، و شوێنی پەنجەرەکان وەک خۆی بمێنێت", "مثلاً: كنب بيج، إضاءة سقف ناعمة، أرضية رخام، نباتات داخلية، مع إبقاء النوافذ كما هي", "e.g. beige sofas, soft ceiling lights, marble floor, indoor plants, keep the windows where they are", "بۆ نموونە: قەنەفێ بێژ، ڕووناهیا نەرم یا بنمیچی، ئەردێ مەڕمەڕ، ڕووەکێن ناڤ مالێ، و جهێ پەنجەران وەکی خۆ بمینیت"),
  advanced: L("⚙️ ڕێکخستنی زیاتر", "⚙️ إعدادات متقدمة", "⚙️ Advanced settings", "⚙️ ڕێکخستنێن پتر"),
  colors: L("ڕەنگەکان", "الألوان", "Colours", "ڕەنگ"),
  materials: L("کەرەستەکان", "المواد", "Materials", "کەرەستە"),
  light: L("ڕووناکی", "الإضاءة", "Lighting", "ڕووناهی"),
  l_day: L("ڕۆژ", "نهار", "Day", "ڕۆژ"), l_golden: L("ئاوابوون", "غروب", "Golden hour", "ئاڤابوون"), l_night: L("شەو", "ليل", "Night", "شەڤ"),
  keep: L("شێوەی ژوورەکە/بیناکە وەک خۆی بهێڵەوە (دیوار، پەنجەرە، دەرگا)", "حافظ على شكل المكان (الجدران، النوافذ، الأبواب)", "Keep the structure (walls, windows, doors)", "شێوێ ژوورێ/ئاڤاهیی وەکی خۆ بهێلە (دیوار، پەنجەرە، دەرگەه)"),
  hd: L("کوالیتیی بەرز (1920px) — بە ٢ وێنە حیساب دەکرێت", "جودة عالية (1920px) — تُحسب صورتين", "High quality (1920px) — counts as 2 pictures", "کوالیتیا بلند (1920px) — ب ٢ وێنەیان دهێتە هژمارتن"),
  make: L("✨ دیزاینەکە دروست بکە", "✨ أنشئ التصميم", "✨ Create the design", "✨ دیزاینێ دروست بکە"),
  again: L("🔄 وەشانێکی تر", "🔄 نسخة أخرى", "🔄 Another version", "🔄 وەشانەکا دی"),
  download: L("⬇️ داگرتن", "⬇️ تنزيل", "⬇️ Download", "⬇️ داگرتن"),
  newPhoto: L("➕ وێنەیەکی نوێ", "➕ صورة جديدة", "➕ New photo", "➕ وێنەکێ نوو"),
  p_prep: L("ئامادەکردنی وێنەکە…", "تجهيز الصورة…", "Preparing the photo…", "ئامادەکرنا وێنەی…"),
  p_make: L("AI دیزاینەکە دروست دەکات… (١٠–٤٠ چرکە)", "الذكاء الاصطناعي يصمم… (10–40 ثانية)", "The AI is designing… (10–40 s)", "AI دیزاینێ دروست دکەت… (١٠–٤٠ چرکە)"),
  before: L("پێش", "قبل", "Before", "بەری"), after: L("دوا", "بعد", "After", "پشتی"),
  results: L("وەشانەکان", "النسخ", "Versions", "وەشان"),
  left: L("ماوەت: {n} وێنەی بەخۆڕایی", "المتبقي: {n} صور مجانية", "{n} free pictures left", "بۆ تە مایین: {n} وێنێن بێ بەرامبەر"),
  leftPro: L("ماوەت ئەمڕۆ: {n} وێنە", "المتبقي اليوم: {n} صور", "Left today: {n} pictures", "ئەڤرۆ بۆ تە مایین: {n} وێنە"),
  getPro: L("⭐ Pro وەربگرە بۆ وێنەی زیاتر", "⭐ اشترك في Pro لصور أكثر", "⭐ Get Pro for more pictures", "⭐ Pro وەربگرە بۆ وێنێن پتر"),
  rename: L("گۆڕینی ناو", "إعادة التسمية", "Rename", "گوهۆڕینا ناڤی"),
  del: L("سڕینەوە", "حذف", "Delete", "ژێبرن"),
  delQ: L("ئەم پرۆژەیە بسڕدرێتەوە؟", "حذف هذا المشروع؟", "Delete this project?", "ئەڤ پرۆژە بێتە ژێبرن؟"),
  untitled: L("پرۆژەی بێ ناو", "مشروع بلا اسم", "Untitled project", "پرۆژێ بێ ناڤ"),
  note: L("⚠️ ئەمانە بیرۆکەی دیزاینن. AI شێوەی شوێنەکە بە نزیکی دەپارێزێت، بەڵام ڕێک ١٠٠٪ نییە. بۆ کاری بیناسازی ڕاوێژ بە ئەندازیار بکە.", "⚠️ هذه أفكار تصميم. يحافظ الذكاء الاصطناعي على شكل المكان تقريباً لا بدقة 100٪. استشر مهندساً قبل البناء.", "⚠️ These are design ideas. The AI keeps the space's shape approximately, not 100% exactly. Consult an engineer before building.", "⚠️ ئەڤە بیرۆکێن دیزاینێنە. AI شێوێ جهی ب نێزیکی دپارێزیت، بەلێ ڕێک ١٠٠٪ نینە. بۆ کارێ ئاڤاکرنێ ڕاوێژێ ب ئەندازیاری بکە."),
  furnish: L("🪄 خۆت کەلوپەل دابنێ", "🪄 ضع الأثاث بنفسك", "🪄 Furnish it yourself", "🪄 ب خۆ کەلوپەلان دانە"),
  furnishHelp: L("کەلوپەلێک هەڵبژێرە یان بیگەڕێ ← لەسەر وێنەکە بیجوڵێنە بۆ شوێنی خۆی ← گۆشەکەی ڕابکێشە بۆ گەورە/بچووککردن ← «بیخە ناو ژوورەکە».", "اختر قطعة أو ابحث عنها ← حرّكها إلى مكانها ← اسحب الزاوية لتكبيرها ← «ضعها في الغرفة».", "Pick or search an item → drag it into place → drag its corner to resize → “Put it in the room”.", "کەلوپەلەکێ هەلبژێرە یان لێ بگەڕە ← ل سەر وێنەی بلڤینە بۆ جهێ وی ← گۆشێ وی ڕاکێشە بۆ مەزن/بچووککرنێ ← «بێخە د ناڤ ژوورێ دا»."),
  tab3d: L("🛋️ 3D", "🛋️ 3D", "🛋️ 3D"),
  tabAi: L("✨ AI", "✨ AI", "✨ AI"),
  aiHelp: L("ئەمانە مۆدێلی 3D یان نییە. شوێن و قەبارەیان دیاری بکە، AI لە کاتی دروستکردنی وێنەکەدا دەیانکێشێت.", "هذه بلا نموذج 3D. حدّد مكانها وحجمها، وسيرسمها الذكاء الاصطناعي.", "These have no 3D model. Set their place and size; the AI draws them.", "ئەڤە مۆدێلێن 3D نینن. جه و قەبارێ وان دیار بکە، AI د دەمێ دروستکرنا وێنەی دا دێ کێشیت."),
  loading3d: L("مۆدێلی 3D دێت…", "تحميل النموذج 3D…", "Loading 3D model…", "مۆدێلا 3D دهێت…"),
  fu3dHelp: L("کرتە لە شتێک بکە بۆ زیادکردن ← بە پەنجەیەک لەسەر زەوی بیجوڵێنە ← بە دوو پەنجە گەورە/بچووکی بکە و بیسوڕێنە.", "اضغط على قطعة لإضافتها ← حرّكها بإصبع ← كبّر/صغّر وأدِر بإصبعين.", "Tap an item to add it → move it with one finger → pinch to resize and twist to turn.", "کلیک ل سەر تشتەکی بکە بۆ زێدەکرنێ ← ب ئێک تبلێ ل سەر ئەردی بلڤینە ← ب دوو تبلان مەزن/بچووک بکە و بزڤڕینە."),
  size: L("قەبارە", "الحجم", "Size", "قەبارە"),
  turn: L("سوڕاندن", "تدوير", "Turn", "زڤڕاندن"),
  lift: L("بەرزی لە زەوی", "الارتفاع", "Lift", "بلندی ژ ئەردی"),
  m: L("م", "م", "m", "م"),
  fit: L("📐 ڕێکخستنی زەوی لەگەڵ وێنەکە", "📐 مطابقة الأرضية مع الصورة", "📐 Line up the floor with the photo", "📐 ڕێکخستنا ئەردی دگەل وێنەی"),
  fitHelp: L("هێڵە زەردەکان زەوی 3Dـن. بیانگۆڕە تا وەک زەوی ژوورەکەت دیار بن، ئینجا کەلوپەلەکان ڕاست دادەنیشن.", "الخطوط الصفراء هي الأرضية 3D. عدّلها لتطابق أرضية غرفتك.", "The yellow lines are the 3D floor. Adjust them to match your room's floor.", "هێلێن زەر ئەردێ 3D نە. بگوهۆڕە هەتا وەکی ئەردێ ژوورا تە دیار ببن، پاشان کەلوپەل ڕاست دڕوینن."),
  camH: L("بەرزی کامێرا", "ارتفاع الكاميرا", "Camera height", "بلندیا کامێرایێ"),
  tiltL: L("لاری زەوی", "ميل الأرضية", "Floor angle", "لاریا ئەردی"),
  lens: L("لێنز", "العدسة", "Lens", "لێنز"),
  saveMock: L("📸 پاشەکەوتکردنی وێنەی 3D (بەخۆڕایی)", "📸 حفظ صورة 3D (مجاناً)", "📸 Save the 3D picture (free)", "📸 پاشکەفتکرنا وێنێ 3D (بێ بەرامبەر)"),
  res3d: L("🛋️ مۆدێلی 3D", "🛋️ نماذج 3D", "🛋️ 3D models", "🛋️ مۆدێلا 3D"),
  resPics: L("📷 وێنەکان", "📷 صور", "📷 Pictures", "📷 وێنە"),
  credit3d: L("مۆدێلە 3Dـەکان: Poly Haven (CC0، بەخۆڕایی)", "النماذج 3D: Poly Haven (CC0، مجانية)", "3D models: Poly Haven (CC0, free)", "مۆدێلێن 3D: Poly Haven (CC0، بێ بەرامبەر)"),
  e_model: L("ئەم مۆدێلە نەکرایەوە. یەکێکی تر تاقی بکەرەوە.", "تعذّر فتح النموذج. جرّب غيره.", "This model didn't open. Try another.", "ئەڤ مۆدێلە ڤەنەبوو. ئێکا دی تاقی بکە."),
  e_models_off: L("کتێبخانەی 3D ئێستا ناگات. «🔍 گەڕان» یان «✨ AI» بەکاربهێنە.", "مكتبة 3D غير متاحة الآن. استخدم البحث أو AI.", "The 3D library isn't reachable now. Use Search or AI.", "پەرتووکخانەیا 3D نوکە ناگەهیت. «🔍 لێگەڕیان» یان «✨ AI» بکاربینە."),
  e_3d: L("ئەم ئامێرە 3D پشتگیری ناکات.", "هذا الجهاز لا يدعم 3D.", "This device doesn't support 3D.", "ئەڤ ئامیرە پشتەڤانیا 3D ناکەت."),
  catalog: L("📦 کەلوپەل", "📦 الأثاث", "📦 Items", "📦 کەلوپەل"),
  search: L("🔍 گەڕان", "🔍 بحث", "🔍 Search", "🔍 لێگەڕیان"),
  searchPh: L("بۆ نموونە: قەنەفەی چەرمی قاوەیی، گڵۆپی زێڕین…", "مثلاً: كنبة جلد بني، ثريا ذهبية…", "e.g. brown leather sofa, gold chandelier…", "بۆ نموونە: قەنەفێ چەرمێ قاوەیی، گلۆپا زێڕین…"),
  searchNone: L("هیچ نەدۆزرایەوە. وشەیەکی تر تاقی بکەرەوە.", "لا نتائج. جرّب كلمة أخرى.", "Nothing found. Try another word.", "چو نەهاتە دیتن. پەیڤەکا دی تاقی بکە."),
  searchNote: L("بە کوردی، عەرەبی یان ئینگلیزی بنووسە. مۆدێلی 3D لە Poly Haven و وێنە لە Openverse و Wikimedia (بەخۆڕایی و یاسایی). ئەگەر وێنەکە پاشبنەمای سپی هەبێت، خۆکار لادەبرێت.", "اكتب بالكردية أو العربية أو الإنجليزية. نماذج 3D من Poly Haven وصور من Openverse وWikimedia (مجانية وقانونية). الخلفية البيضاء تُزال تلقائياً.", "Type in Kurdish, Arabic or English. 3D models from Poly Haven, pictures from Openverse and Wikimedia (free and legal). White backgrounds are removed automatically.", "ب کوردی، عەرەبی یان ئینگلیزی بنڤیسە. مۆدێلێن 3D ژ Poly Haven و وێنە ژ Openverse و Wikimedia (بێ بەرامبەر و یاسایی). ئەگەر پاشبنگەها وێنەی سپی بیت، ب خۆکاری دهێتە لادان."),
  placed: L("لەسەر وێنەکە", "على الصورة", "On the photo", "ل سەر وێنەی"),
  noteF: L("ڕەنگ / کەرەستە (ئارەزوومەندانە)", "اللون / المادة (اختياري)", "Colour / material (optional)", "ڕەنگ / کەرەستە (ب دلێ خۆ)"),
  noteFPh: L("بۆ نموونە: بێژ، چەرم، دار", "مثلاً: بيج، جلد، خشب", "e.g. beige, leather, wood", "بۆ نموونە: بێژ، چەرم، دار"),
  remove: L("لابردن", "إزالة", "Remove", "لادان"),
  dup: L("دووبارەکردنەوە", "تكرار", "Duplicate", "دووبارەکرن"),
  put: L("✨ بیکە بە وێنەی ڕاستەقینە (AI)", "✨ حوّلها إلى صورة حقيقية (AI)", "✨ Make it a real photo (AI)", "✨ بکە وێنەکێ ڕاستەقینە (AI)"),
  closeEdit: L("داخستنی دانان", "إغلاق", "Close", "گرتنا دانانێ"),
  maxPics: L("زۆرترین ٣ وێنەی گەڕان لە یەک جاردا", "3 صور بحث كحد أقصى في المرة", "Max 3 search pictures at a time", "پترین ٣ وێنێن لێگەڕیانێ د ئێک جاردا"),
  pano: L("🔄 360°", "🔄 360°", "🔄 360°"),
  panoMake: L("🔄 بیکە بە 360°", "🔄 حوّلها إلى 360°", "🔄 Make it 360°", "🔄 بکە 360°"),
  panoOpen: L("🔄 بینینی 360°", "🔄 عرض 360°", "🔄 View 360°", "🔄 دیتنا 360°"),
  panoNote: L("بە ٢ وێنە حیساب دەکرێت", "تُحسب صورتين", "Counts as 2 pictures", "ب ٢ وێنەیان دهێتە هژمارتن"),
  drag360: L("بە پەنجە بیجوڵێنە بۆ سەیرکردنی هەموو لایەک", "اسحب لترى كل الجهات", "Drag to look around", "ب تبلێ بلڤینە بۆ دیتنا هەمی لایان"),
  close: L("داخستن", "إغلاق", "Close", "گرتن"),
  simpleNote: L("ℹ️ ئەمڕۆ خزمەتگوزارییە سەرەکییەکە پڕ بووە، بۆیە ئەم وەشانە بە خزمەتگوزارییە یەدەگەکە دروست کرا. ئەو وێنەکەت ناخوێنێتەوە، تەنها وەسفەکەی بەکاردەهێنێت، بۆیە کەمتر لە ژوورەکەت دەچێت.", "ℹ️ الخدمة الرئيسية ممتلئة اليوم، فصُنعت هذه النسخة بالخدمة الاحتياطية التي تستخدم وصف الصورة فقط، لذا قد تشبه مكانك أقل.", "ℹ️ The main service is full today, so this version was made by the back-up service, which uses a description of your photo only — it may look less like your space.", "ℹ️ ئەڤرۆ خزمەتگوزاریا سەرەکی پڕ بوویە، ژبەر هندێ ئەڤ وەشانە ب خزمەتگوزاریا یەدەگ هاتە دروستکرن. ئەو وێنێ تە ناخوینیت، تنێ وەسفا وی بکاردئینیت، ژبەر هندێ کێمتر وەکی ژوورا تە دیار دبیت."),
  e_limit: L("وێنە بەخۆڕاییەکانت تەواو بوون. بۆ زیاتر Pro وەربگرە.", "انتهت صورك المجانية. اشترك في Pro.", "Your free pictures are used up. Get Pro for more.", "وێنێن تە یێن بێ بەرامبەر ب دوماهی هاتن. بۆ پتر Pro وەربگرە."),
  e_daily_full: L("ئەمڕۆ ژمارەی وێنەی بەخۆڕایی بۆ هەموو ئەپەکە تەواو بوو. بەیانی هەوڵ بدەرەوە 🌙", "انتهت الصور المجانية لكل التطبيق اليوم. حاول غداً 🌙", "Today's free pictures for the whole app are used up. Try tomorrow 🌙", "ئەڤرۆ ژمارا وێنێن بێ بەرامبەر بۆ هەمی ئەپی ب دوماهی هات. سوبەهی هەول بدە 🌙"),
  e_cf_off: L("دروستکردنی وێنە هێشتا ئامادە نییە.", "إنشاء الصور غير جاهز بعد.", "Picture making is not set up yet.", "دروستکرنا وێنەیان هێشتا ئامادە نینە."),
  e_cf_key: L("کلیلی دروستکردنی وێنە هەڵەیە.", "مفتاح الصور غير صحيح.", "The picture key is wrong.", "کلیلێ دروستکرنا وێنەیان خەلەتە."),
  e_cf_failed: L("وێنەکە دروست نەبوو. دووبارە هەوڵ بدەرەوە.", "لم تُنشأ الصورة. أعد المحاولة.", "The picture was not made. Try again.", "وێنە دروست نەبوو. دووبارە هەول بدە."),
  e_bad_image: L("ئەم وێنەیە نەکرایەوە. وێنەیەکی تر تاقی بکەرەوە.", "تعذر فتح الصورة. جرّب أخرى.", "This photo could not be opened. Try another.", "ئەڤ وێنە ڤەنەبوو. وێنەکێ دی تاقی بکە."),
  e_unsafe: L("ئەم داواکارییە ڕێگەپێدراو نییە.", "هذا الطلب غير مسموح.", "This request is not allowed.", "ئەڤ داخوازیە ڕێپێدای نینە."),
  e_verify_email: L("بۆ وێنەی بەخۆڕایی، سەرەتا ئیمەیڵەکەت پشتڕاست بکەرەوە (کۆدەکەی ناو ئیمەیڵەکەت).", "لتحصل على الصور المجانية، أكّد بريدك الإلكتروني أولاً.", "Please confirm your e-mail first to get free pictures.", "بۆ وێنێن بێ بەرامبەر، دەستپێکێ ئیمەیلا خۆ پشتڕاست بکە (کۆدێ د ناڤ ئیمەیلا تە دا)."),
  e_slow_down: L("زۆر خێرایت 🙂 کەمێک چاوەڕێ بکە.", "أنت سريع جداً 🙂 انتظر قليلاً.", "Too fast 🙂 wait a moment.", "تو گەلەک ب لەزی 🙂 کێمەکێ چاڤەڕێ بە."),
  e_net: L("کێشەیەک هەبوو. دووبارە هەوڵ بدەرەوە.", "حدث خطأ. أعد المحاولة.", "Something went wrong. Try again.", "ئاریشەیەک هەبوو. دووبارە هەول بدە."),
};

const STYLES = [
  ["modern", "🏙️", ["#d9c7ad", "#4b4f56", "#f3efe8"], L("مۆدێرن", "عصري", "Modern", "مۆدێرن")],
  ["minimal", "◻️", ["#f4f2ee", "#d8d2c8", "#9a948a"], L("سادە", "بسيط", "Minimalist", "سادە")],
  ["luxury", "💎", ["#1d1b1e", "#c9a14a", "#efe6d4"], L("لوکس", "فاخر", "Luxury", "لوکس")],
  ["classic", "🏛️", ["#efe4cf", "#b8925a", "#6e4b2c"], L("کلاسیک", "كلاسيكي", "Classic", "کلاسیک")],
  ["scandinavian", "🌿", ["#f5f3ee", "#cfb894", "#8aa38b"], L("سکەندیناڤی", "إسكندنافي", "Scandinavian", "سکەندیناڤی")],
  ["industrial", "🏭", ["#3b3b3b", "#8b5a3c", "#b9b5ad"], L("پیشەسازی", "صناعي", "Industrial", "پیشەسازی")],
  ["contemporary", "✨", ["#f0ebe3", "#2f5d62", "#d98c5f"], L("هاوچەرخ", "معاصر", "Contemporary", "هەڤچەرخ")],
  ["kurdish", "🧶", ["#9b2226", "#e9a23b", "#2b4c7e"], L("کوردی", "كردي", "Kurdish-inspired", "کوردی")],
  ["mediterranean", "🌊", ["#ffffff", "#2e6fac", "#c8693e"], L("دەریای ناوەڕاست", "متوسطي", "Mediterranean", "دەریایا ناڤەڕاست")],
  ["custom", "🖌️", ["#6b7280", "#a78bfa", "#f472b6"], L("شێوازی خۆم", "أسلوبي الخاص", "Custom", "شێوازێ من")],
];
const CATS = {
  interior: [L("هۆڵی دانیشتن", "صالة", "Living room", "هۆلا ڕوینشتنێ"), L("ژووری میوان", "غرفة ضيوف", "Guest room", "ژوورا مێڤانان"), L("ژووری نوستن", "غرفة نوم", "Bedroom", "ژوورا نڤستنێ"), L("ژووری منداڵ", "غرفة أطفال", "Kids room", "ژوورا زارۆکان"), L("چێشتخانە", "مطبخ", "Kitchen", "خوارنگەه"), L("ژووری نانخواردن", "غرفة طعام", "Dining room", "ژوورا خوارنێ"), L("حەمام", "حمام", "Bathroom", "حەمام"), L("ئۆفیس", "مكتب", "Office", "ئۆفیس"), L("دوکان / بازرگانی", "محل تجاري", "Shop / commercial", "دووکان / بازرگانی")],
  exterior: [L("ڕووکاری خانوو", "واجهة منزل", "House facade", "ڕووکارێ خانیی"), L("بینا / تەلار", "مبنى", "Building", "ئاڤاهی / تەلار"), L("باخچە و گوڵ", "حديقة", "Garden & landscaping", "باخچە و گول"), L("گەراج و ڕێگا", "كراج وممر", "Garage & driveway", "گەراج و ڕێک"), L("بالکۆن و تەراس", "شرفة وتراس", "Balcony & terrace", "بالکۆن و تەراس"), L("دەروازە و پەرژین", "مدخل وسور", "Entrance & fence", "دەرگەه و پەرژین"), L("بینای بازرگانی", "مبنى تجاري", "Commercial building", "ئاڤاهیێ بازرگانی")],
  redesign: [L("ژوور", "غرفة", "Room", "ژوور"), L("ڕووکار", "واجهة", "Facade", "ڕووکار"), L("باخچە", "حديقة", "Garden", "باخچە"), L("دوکان", "محل", "Shop", "دووکان"), L("هەر شتێک", "أي شيء", "Anything", "هەر تشتەک")],
};
const COLORS = [L("سپی", "أبيض", "white", "سپی"), L("بێژ", "بيج", "beige", "بێژ"), L("خۆڵەمێشی", "رمادي", "grey", "خۆلەمێشی"), L("ڕەش", "أسود", "black", "ڕەش"), L("قاوەیی", "بني", "brown", "قاوەیی"), L("زێڕی", "ذهبي", "gold", "زێڕی"), L("سەوز", "أخضر", "green", "کەسک"), L("شین", "أزرق", "blue", "شین"), L("سوور", "أحمر", "red", "سۆر"), L("پەمەیی", "وردي", "pink", "پەمەیی")];
const MATERIALS = [L("مەڕمەڕ", "رخام", "marble", "مەڕمەڕ"), L("دار", "خشب", "wood", "دار"), L("بەرد", "حجر", "stone", "بەر"), L("کۆنکرێت", "خرسانة", "concrete", "کۆنکرێت"), L("شووشە", "زجاج", "glass", "شووشە"), L("ئاسن / ستیل", "حديد", "steel", "ئاسن / ستیل"), L("قوماش", "قماش", "fabric", "قوماش"), L("چەرم", "جلد", "leather", "چەرم"), L("کاشی", "بلاط", "tiles", "کاشی")];
const IDEAS = {
  interior: [L("قەنەفەی بێژ، ڕووناکیی ناڕاستەوخۆی گەرم، زەوی مەڕمەڕ، ڕووەکی ناوماڵ", "كنب بيج، إضاءة غير مباشرة دافئة، رخام، نباتات", "beige sofas, warm indirect light, marble floor, plants", "قەنەفێ بێژ، ڕووناهیا گەرم یا نەڕاستەوخۆ، ئەردێ مەڕمەڕ، ڕووەکێن ناڤ مالێ"), L("ژووری نوستنی ئارام بە ڕەنگی سپی و دار", "غرفة نوم هادئة بالأبيض والخشب", "calm bedroom in white and wood", "ژوورا نڤستنێ یا ئارام ب ڕەنگێ سپی و داری"), L("چێشتخانەی مۆدێرن بە دوورگەی ناوەڕاست", "مطبخ عصري بجزيرة وسطية", "modern kitchen with an island", "خوارنگەهەکا مۆدێرن ب دوورگەیەکا ناڤەڕاست")],
  exterior: [L("ڕووکاری مۆدێرن بە بەرد و دار و ڕووناکیی شەو", "واجهة عصرية بالحجر والخشب وإضاءة ليلية", "modern facade with stone, wood and night lights", "ڕووکارەکێ مۆدێرن ب بەر و دار و ڕووناهیا شەڤێ"), L("باخچەی جوان بە چیمەن، گوڵ و ڕێگای بەرد", "حديقة بعشب وزهور وممر حجري", "garden with lawn, flowers and stone path", "باخچەکێ جوان ب چیمەن، گول و ڕێکەکا بەری"), L("دەروازە و گەراجی نوێ", "مدخل وكراج جديد", "new entrance and garage", "دەرگەه و گەراجەکێ نوو")],
  redesign: [L("جوانتر و پڕۆفیشناڵتری بکە", "اجعله أجمل وأكثر احترافية", "make it more beautiful and professional", "جوانتر و پرۆفیشنالتر بکە"), L("هەمان شوێن بە شێوازی کوردی", "نفس المكان بطابع كردي", "same place in Kurdish style", "هەمان جه ب شێوازێ کوردی")],
};
// "AI draws it" things (no 3D model): [emoji, name, English for the AI, size in metres [w, h, d], hangs from the ceiling]
const AI_ITEMS = {
  living: { name: L("دانیشتن", "جلوس", "Seating", "ڕوینشتن"), items: [["🛋️", L("قەنەفەی L", "كنبة زاوية", "L sofa", "قەنەفێ L"), "large L-shaped sofa", [2.8, 0.85, 1.8]], ["🛋️", L("قەنەفەی ٣ کەسی", "كنبة 3 مقاعد", "3-seat sofa", "قەنەفێ ٣ کەسی"), "three-seat sofa", [2.2, 0.85, 0.95]], ["🪑", L("کورسیی قەنەفە", "كرسي مريح", "Armchair", "کورسیکا قەنەفێ"), "armchair", [0.85, 0.9, 0.85]], ["🟫", L("مێزی ناوەڕاست", "طاولة وسط", "Coffee table", "مێزا ناڤەڕاست"), "coffee table", [1.2, 0.42, 0.65]], ["📺", L("مێزی تەلەفزیۆن", "وحدة تلفاز", "TV unit", "مێزا تەلەفزیۆنێ"), "TV wall unit with a large TV", [2.2, 1.6, 0.45]], ["🟥", L("فەرش", "سجادة", "Rug", "فەرش"), "large rug on the floor", [2.6, 0.02, 1.8]]] },
  bedroom: { name: L("نوستن", "نوم", "Bedroom", "نڤستن"), items: [["🛏️", L("قەرەوێڵەی دوو کەسی", "سرير مزدوج", "Double bed", "تەختێ دوو کەسی"), "king size bed with headboard", [1.9, 1.1, 2.15]], ["🛏️", L("قەرەوێڵەی یەک کەسی", "سرير مفرد", "Single bed", "تەختێ ئێک کەسی"), "single bed", [1, 0.9, 2.05]], ["🗄️", L("دۆڵاب", "خزانة ملابس", "Wardrobe", "دۆلاب"), "tall wardrobe", [2, 2.4, 0.6]], ["🟫", L("مێزی تەنیشت قەرەوێڵە", "طاولة جانبية", "Nightstand", "مێزا تەنشت تەختی"), "bedside table with lamp", [0.5, 0.55, 0.4]], ["🪞", L("مێزی ئارایش", "تسريحة", "Dressing table", "مێزا ئارایشتێ"), "dressing table with mirror", [1.1, 1.5, 0.45]]] },
  dining: { name: L("چێشتخانە", "مطبخ وطعام", "Kitchen & dining", "خوارنگەه"), items: [["🍽️", L("مێزی نانخواردن", "طاولة طعام", "Dining table", "مێزا خوارنێ"), "dining table with six chairs", [2, 0.76, 1]], ["🧊", L("سەلاجە", "ثلاجة", "Fridge", "سەلاجە"), "tall fridge", [0.9, 1.85, 0.7]], ["🍳", L("دوورگەی چێشتخانە", "جزيرة مطبخ", "Kitchen island", "دوورگەیا خوارنگەهێ"), "kitchen island with stools", [2.2, 0.92, 1]]] },
  bath: { name: L("حەمام", "حمام", "Bathroom", "حەمام"), items: [["🛁", L("بانیۆ", "بانيو", "Bathtub", "بانیۆ"), "freestanding bathtub", [1.7, 0.6, 0.8]], ["🚿", L("دووش", "دش", "Shower", "دووش"), "glass walk-in shower", [1, 2.1, 1]], ["🚰", L("دەستشۆر", "مغسلة", "Vanity", "دەستشۆ"), "vanity with sink and mirror", [1, 0.9, 0.5]], ["🚽", L("تەوالێت", "مرحاض", "Toilet", "تەوالێت"), "toilet", [0.4, 0.8, 0.65]]] },
  decor: { name: L("ڕووناکی و ڕازاندنەوە", "إضاءة وديكور", "Lights & decor", "ڕووناهی و خەملاندن"), items: [["💡", L("چرای سەقف", "ثريا", "Chandelier", "چرایا بنمیچی"), "elegant chandelier hanging from the ceiling", [0.8, 0.7, 0.8], 1], ["🪟", L("پەردە", "ستارة", "Curtains", "پەردە"), "floor-length curtains", [2.4, 2.6, 0.1]], ["🖼️", L("تابلۆ", "لوحة", "Wall art", "تابلۆ"), "framed wall painting", [1.2, 0.8, 0.05]], ["📚", L("ڕەفەی کتێب", "رف كتب", "Bookshelf", "ڕەفکا پەرتووکان"), "bookshelf with books", [1.2, 2, 0.35]]] },
  outdoor: { name: L("دەرەوە", "خارجي", "Outdoor", "دەرڤە"), items: [["🌳", L("درەخت", "شجرة", "Tree", "دار"), "tree", [3, 5, 3]], ["🌷", L("گوڵ", "زهور", "Flower bed", "گول"), "flower bed", [3, 0.4, 1]], ["🪑", L("قەنەفەی دەرەوە", "جلسة خارجية", "Outdoor sofa", "قەنەفێ دەرڤە"), "outdoor lounge sofa set", [2.6, 0.8, 2]], ["⛱️", L("سێبەرە", "مظلة", "Parasol", "سیبەر"), "garden parasol", [2.5, 2.5, 2.5]], ["🏛️", L("پێرگۆلا", "برجولا", "Pergola", "پێرگۆلا"), "wooden pergola", [4, 2.8, 3.5]], ["🚗", L("ئۆتۆمبێل", "سيارة", "Car", "ترۆمبێل"), "modern car", [1.9, 1.5, 4.7]], ["🏮", L("گڵۆپی باخچە", "إنارة حديقة", "Garden light", "گلۆپا باخچەی"), "garden light post", [0.3, 1.2, 0.3]], ["🏊", L("حەوزی مەلە", "مسبح", "Pool", "حەوزا مەلەڤانیێ"), "swimming pool", [4, 0.05, 8]]] },
};
// Groups for the real 3D models (matched by words in the model's name / tags / categories)
const GROUPS = [
  ["sofa", L("قەنەفە", "كنب", "Sofas", "قەنەفە"), ["sofa", "couch", "armchair", "loveseat", "ottoman", "pouf"]],
  ["chair", L("کورسی", "كراسي", "Chairs", "کورسی"), ["chair", "stool", "bench"]],
  ["table", L("مێز", "طاولات", "Tables", "مێز"), ["table", "desk"]],
  ["storage", L("دۆڵاب و ڕەفە", "خزائن ورفوف", "Storage", "دۆلاب و ڕەف"), ["shelf", "shelves", "cabinet", "drawer", "wardrobe", "dresser", "bookcase", "sideboard", "cupboard", "nightstand", "console"]],
  ["bed", L("نوستن و حەمام", "نوم وحمام", "Bed & bath", "نڤستن و حەمام"), ["bed", "bathtub", "toilet", "sink", "basin"]],
  ["light", L("گڵۆپ", "إضاءة", "Lights", "گلۆپ"), ["lamp", "chandelier", "lantern", "light", "candle"]],
  ["plant", L("ڕووەک", "نباتات", "Plants", "ڕووەک"), ["plant", "potted", "flower", "fern", "cactus", "bonsai", "succulent"]],
  ["decor", L("ڕازاندنەوە", "ديكور", "Decor", "خەملاندن"), ["vase", "frame", "painting", "picture", "mirror", "rug", "carpet", "clock", "sculpture", "statue", "decor", "decorative", "bowl", "basket", "television", "tv", "speaker", "radio", "book"]],
  ["outdoor", L("دەرەوە", "خارجي", "Outdoor", "دەرڤە"), ["tree", "bush", "shrub", "outdoor", "garden", "planter", "fence", "barrel", "street"]],
];
const words = (m) => (m.id.replace(/_/g, " ") + " " + m.name + " " + m.tags.join(" ") + " " + m.cats.join(" ")).toLowerCase();
const groupOf = (m) => { const w = words(m); for (const [k, , keys] of GROUPS) if (keys.some((x) => new RegExp("(^|[^a-z])" + x + "(s|es)?([^a-z]|$)").test(w))) return k; return null; };
const hangs = (m) => /chandelier|ceiling|pendant|hanging/.test(words(m));
const onWall = (m) => /(^|[^a-z])(frame|painting|picture|mirror|clock|wall)([^a-z]|$)/.test(words(m)) && !/table|chair|sofa|cabinet/.test(words(m));
const ICON = { interior: "🛋️", exterior: "🏡", plan: "📐", redesign: "✨", chat: "💬" };
// Drawn icons for the studio tool cards (white on a coloured tile).
const GLYPH = {
  interior: <><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M5 19v2M19 19v2" /></>,
  exterior: <><path d="M2 12l7-6 7 6" /><path d="M4 10.5V20h10v-9.5" /><path d="M8 20v-5h2v5" /><circle cx="19.5" cy="9.5" r="2.5" /><path d="M19.5 12v8" /></>,
  plan: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 10h8v11M11 3v4M15 10h6M15 10v5" /></>,
  redesign: <><path d="M4 20L16 8" /><path d="M14 6l4 4" /><path d="M8.5 3.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7zM18.5 13.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" /></>,
  chat: <><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.7A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.5 11.5h7M8.5 8.5h4" /></>,
};
const Glyph = ({ k }) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPH[k]}</svg>;

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

export default function DesignStudio({ lang, getToken, onBack, onUpgrade, onOpenPlan, onChat, initialTool, initialFile, owner }) {
  const tx = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const T = (o) => o?.[lang] ?? o?.ckb;
  const rtl = lang !== "en";
  const [screen, setScreen] = useState(["interior", "exterior", "redesign"].includes(initialTool) ? initialTool : "home");
  const [jumpFile, setJumpFile] = useState(initialFile || null); // a photo moved here from another section
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
    if (body?.action === "grab") { if (!r.ok) throw new Error("bad_image"); return r.blob(); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "net"); throw e; }
    return j;
  };
  const loadProjects = () => api({ action: "list" }).then((j) => setProjects(j.projects || [])).catch(() => setProjects([]));
  useEffect(() => { api().then(setQuota).catch(() => {}); loadProjects(); }, []);

  const [open, setOpen] = useState(null); // a saved project to reopen
  const tools = [["interior", "t_interior"], ["exterior", "t_exterior"], ["plan", "t_plan"], ["redesign", "t_redesign"]];

  if (screen === "3d" && owner) return <Studio3DView lang={lang} getToken={getToken} onBack={() => setScreen("home")} />;
  if (screen !== "home") {
    return <ToolView key={screen + (open?.id || "") + (jumpFile ? jumpFile.size : "")} tool={screen} lang={lang} tx={tx} T={T} rtl={rtl} api={api} quota={quota} setQuota={setQuota}
      project={open} onUpgrade={onUpgrade} onBack={() => { setScreen("home"); setOpen(null); setJumpFile(null); loadProjects(); }}
      initialFile={jumpFile} onMove={(tool, file) => { if (tool === "plan") { onOpenPlan(file); return; } setOpen(null); setJumpFile(file); setScreen(tool); }} />;
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
              <span className="ds-ic" aria-hidden="true"><Glyph k={k} /></span>
              <b>{tx(t)}</b><small>{tx(t + "Sub")}</small>
              <i aria-hidden="true">{rtl ? "←" : "→"}</i>
            </button>
          ))}
          {owner && (
            <button className="ds-tool ds-3d" onClick={() => setScreen("3d")}>
              <span className="ds-ic" aria-hidden="true">🧊</span>
              <b>AHM 3D Studio <em className="new-badge">{{ en: "Preview", ar: "تجريبي", kmr: "تاقیکرن" }[lang] || "تاقیکردنەوە"}</em></b>
              <small>{{ en: "Build your house on a real plot block by block, furniture, any colour, walk inside, Google search. Only you can see this.",
                ar: "ابنِ منزلك على أرض حقيقية بلوكاً بلوكاً، أثاث، أي لون، تجوّل داخله، بحث Google. أنت فقط تراه.",
                kmr: "خانیێ خۆ ل سەر ئەردەکێ ڕاستەقینە بلۆک ب بلۆک ئاڤا بکە، کەلوپەل، هەر ڕەنگەک، بچە د ناڤدا، لێگەڕیانا Google. تنێ تو دبینی." }[lang]
                || "خانووەکەت لەسەر زەوییەکی ڕاستەقینە بلۆک بە بلۆک دروست بکە، کەلوپەل، هەر ڕەنگێک، بچۆ ناوی، گەڕان لە Google. تەنها تۆ دەیبینیت."}</small>
              <i aria-hidden="true">{rtl ? "←" : "→"}</i>
            </button>
          )}
          <button className="ds-tool ds-chat" onClick={onChat}>
            <span className="ds-ic" aria-hidden="true"><Glyph k="chat" /></span><b>{tx("t_chat")}</b><small>{tx("t_chatSub")}</small><i aria-hidden="true">{rtl ? "←" : "→"}</i>
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

function ToolView({ tool, lang, tx, T, rtl, api, quota, setQuota, project, onUpgrade, onBack, initialFile, onMove }) {
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
  const [results, setResults] = useState(() => (project?.results || []).filter((r) => r.url).map((r) => ({ src: r.url, remote: true, pano: r.prompt === "pano" })));
  const [sel, setSel] = useState(Math.max(0, (project?.results?.length || 1) - 1));
  const [projectId, setProjectId] = useState(project?.id || "");
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(null); // { src, ratio } while placing furniture
  const [pano, setPano] = useState(null); // picture shown in the 360° viewer
  const [way, setWay] = useState(project ? "ai" : null); // "ai" = the AI designs it, null = not chosen yet
  const [wrong, setWrong] = useState(null); // { kind, file, preview }: this photo belongs to another section
  const [checking, setChecking] = useState(false);
  const checked = tool === "interior" || tool === "exterior"; // these two only take their own kind of photo
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const errText = (c) => (TX["e_" + c] ? tx("e_" + c) : tx("e_net"));

  async function takeFile(f) {
    if (!f) return;
    setError("");
    if (!/^image\//.test(f.type || "image/")) { setError(tx("e_bad_image")); return; }
    if (f.size > 25_000_000) { setError(tx("e_bad_image")); return; }
    setWrong(null);
    try {
      const [small, big] = await Promise.all([shrink(f, 496, 0.82), shrink(f, 1280, 0.85)]);
      const preview = "data:image/jpeg;base64," + big.data;
      if (checked && !project) {
        // make sure the photo belongs to this section (a room for interior, the outside for exterior)
        setChecking(true);
        const j = await api({ action: "check", ref: small.data }).catch(() => ({ kind: "unknown" }));
        setChecking(false);
        const k = j?.kind;
        if (k === "plan" || k === "other" || (tool === "interior" && k === "exterior") || (tool === "exterior" && k === "interior")) {
          setPhoto(null); setWrong({ kind: k, file: f, preview }); return;
        }
      }
      setPhoto({ ref: small.data, original: big.data, preview, ratio: big.w / big.h });
      if (!project) { setResults([]); setProjectId(""); setWay(checked ? null : "ai"); }
    } catch { setChecking(false); setError(tx("e_bad_image")); }
  }
  useEffect(() => { if (initialFile) takeFile(initialFile); }, []);
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

  // the picture being worked on: the chosen result, or the user's photo
  const base = result0(results, sel) || (photo ? { src: photo.preview } : null);
  async function smallOf(src) {
    const b = await (await fetch(src)).blob();
    const s = await shrink(new File([b], "base.jpg", { type: b.type || "image/jpeg" }), 496, 0.82);
    return { ref: s.data, ratio: s.w / s.h };
  }
  async function openEditor() {
    if (!base || busy) return;
    setError("");
    try {
      // a local copy of the picture, so the 3D mock-up can be saved together with it
      const src = base.src.startsWith("data:") ? base.src : await toDataUrl(await (await fetch(base.src)).blob());
      const { ref, ratio } = await smallOf(src);
      setEditing({ src, ratio, ref });
    }
    catch { setError(tx("e_bad_image")); }
  }
  // furnish: the AI puts the placed objects into the picture. pano: the picture becomes a 360° view.
  async function makeFrom(mode, extra = {}) {
    if (!base || busy) return false;
    setBusy("p_prep"); setError("");
    let ok = false;
    try {
      const { ref, ratio } = editing ? editing : await smallOf(base.src);
      setBusy("p_make");
      const r = await api({ action: "make", mode, tool, style, ref, ratio, ...extra,
        original: projectId ? undefined : photo?.original, project: projectId || undefined });
      setResults((rs) => { setSel(rs.length); return [...rs, { src: r.src, simple: r.provider === "pollinations", pano: mode === "pano" }]; });
      if (r.project) setProjectId(r.project);
      if (r.left !== "" && r.left != null) setQuota((q) => ({ ...q, left: +r.left }));
      if (mode === "pano") setPano(r.src);
      ok = true;
    } catch (e) {
      setError(errText(e.message));
      if (e.message === "limit") setQuota((q) => ({ ...q, left: 0 }));
    }
    setBusy("");
    return ok;
  }
  async function view360(src) {
    if (src.startsWith("data:")) { setPano(src); return; }
    try { setPano(await toDataUrl(await (await fetch(src)).blob())); } catch { setPano(src); }
  }

  const result = results[sel];
  const panelShown = !checked || way === "ai" || results.length > 0 || (!photo && !wrong && !checking);
  if (editing) {
    return (
      <div className="house ds" dir={rtl ? "rtl" : "ltr"}>
        <div className="house-inner">
          <button className="learn-back" onClick={() => setEditing(null)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            {tx("closeEdit")}
          </button>
          <h2 className="house-h">{tx("furnish")}</h2>
          {quota && quota.left != null && <p className="house-quota">{(quota.pro ? tx("leftPro") : tx("left")).replace("{n}", quota.left)}</p>}
          {error && <p className="learn-err" role="alert">{error}</p>}
          <Furnish base={editing} tool={tool} tx={tx} T={T} api={api} busy={busy} out={quota && quota.left != null && quota.left < 1} onUpgrade={onUpgrade}
            out2={quota && quota.left != null && quota.left < 2}
            onMake={async (extra) => { if (await makeFrom("compose", extra)) setEditing(null); }}
            onPano={async (extra) => { if (await makeFrom("pano", extra)) setEditing(null); }} />
        </div>
      </div>
    );
  }
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

        <div className={"ds-work" + (panelShown ? "" : " solo")}>
          <div className="ds-stage">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; takeFile(f); }} />
            {result?.pano ? (
              <div className="ds-photo ds-panoimg"><img src={result.src} alt="" /><button className="gold-btn small" onClick={() => view360(result.src)}>{tx("panoOpen")}</button></div>
            ) : result && photo ? (
              <Compare before={photo.preview} after={result.src} tx={tx} />
            ) : photo ? (
              <div className={"ds-photo" + (busy ? " working" : "")}>
                <img src={photo.preview} alt="" />
                {busy && <div className="ds-progress"><span className="mini-spin" /> {tx(busy)}<i /></div>}
              </div>
            ) : wrong ? (
              <div className="house-wrong" role="alert">
                <img src={wrong.preview} alt="" />
                <div>
                  <b>{tx(wrong.kind === "plan" ? "wrong_plan" : `wrong_${tool}_${wrong.kind}`)}</b>
                  {wrong.kind !== "other" && (
                    <button className="gold-btn small" onClick={() => onMove(wrong.kind, wrong.file)}>
                      {tx(wrong.kind === "plan" ? "goPlan" : wrong.kind === "interior" ? "goInterior" : "goExterior")}
                    </button>
                  )}
                  <button className="ghost-btn" onClick={() => { setWrong(null); fileRef.current?.click(); }}>{tx("change")}</button>
                </div>
              </div>
            ) : checking ? (
              <div className="house-drop ds-drop"><b><span className="mini-spin" /> {tx("checking")}</b></div>
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
                {!result?.pano && (
                  <div className="ds-actions ds-more">
                    <button className="ghost-btn" disabled={!!busy} onClick={openEditor}>{tx("furnish")}</button>
                    <button className="ghost-btn" disabled={!!busy || (quota && quota.left != null && quota.left < 2)} onClick={() => makeFrom("pano")} title={tx("panoNote")}>{tx("panoMake")} <small>({tx("panoNote")})</small></button>
                  </div>
                )}
                {results.length > 1 && (
                  <div className="sl-thumbs" aria-label={tx("results")}>
                    {results.map((r, i) => <button key={i} className={i === sel ? "on" : ""} onClick={() => setSel(i)}><img src={r.src} alt="" /><em>{i + 1}</em></button>)}
                  </div>
                )}
              </>
            )}
            {photo && !results.length && checked && !way && !busy && (
              <div className="ds-ways">
                <p className="sl-label">{tx("wayQ")}</p>
                <button className="ds-way ai" onClick={() => setWay("ai")}>
                  <b>{tx("wayAi")}</b><small>{tx(tool === "exterior" ? "wayAiExtSub" : "wayAiSub")}</small>
                </button>
                <button className="ds-way self" onClick={openEditor}>
                  <b>{tx("waySelf")}</b><small>{tx("waySelfSub")}</small>
                </button>
              </div>
            )}
            {photo && !results.length && (!checked || way) && (
              <div className="ds-actions ds-more">
                <button className="ghost-btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>{tx("change")}</button>
                {checked && <button className="ghost-btn" disabled={!!busy} onClick={() => setWay(null)}>{tx("changeWay")}</button>}
                <button className="ghost-btn" disabled={!!busy} onClick={openEditor}>{tx("furnish")}</button>
                <button className="ghost-btn" disabled={!!busy || (quota && quota.left != null && quota.left < 2)} onClick={() => makeFrom("pano")} title={tx("panoNote")}>{tx("panoMake")}</button>
              </div>
            )}
            {pano && <Pano360 src={pano} title="360°" hint={tx("drag360")} closeText={tx("close")} onClose={() => setPano(null)} />}
          </div>

          {panelShown && <div className="ds-panel house-card">
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
          </div>}
        </div>
      </div>
    </div>
  );
}

const result0 = (rs, i) => (rs[i] && !rs[i].pano ? rs[i] : null);

// "Furnish it yourself" in 3D: real 3D furniture stands on the floor of the user's photo in true perspective.
// Move with one finger, pinch to resize, twist to turn. Then the AI turns the mock-up into a real photograph.
function Furnish({ base, tool, tx, T, api, busy, out, out2, onUpgrade, onMake, onPano }) {
  const cv = useRef(null), photoRef = useRef(null), boxRef = useRef(null), room = useRef(null);
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [loading, setLoading] = useState(0);
  const [tab, setTab] = useState("3d");
  const [lib, setLib] = useState(null); // 3D models list, or "off"
  const [grp, setGrp] = useState(tool === "exterior" ? "outdoor" : "sofa");
  const [aiCat, setAiCat] = useState(tool === "exterior" ? "outdoor" : "living");
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [grabbing, setGrabbing] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState({ height: 1.45, tilt: 14, fov: 55 });
  const [saving, setSaving] = useState(false);

  // start the 3D view
  useEffect(() => {
    let dead = false, ro;
    import("../lib/room3d").then(({ Room3D }) => {
      if (dead || !cv.current) return;
      try {
        const r = new Room3D(cv.current, { onSelect: setSel, onChange: setPlaced });
        room.current = r;
        const fit = () => { const b = boxRef.current?.getBoundingClientRect(); if (b) r.resize(Math.round(b.width), Math.round(b.height)); };
        fit();
        ro = new ResizeObserver(fit);
        ro.observe(boxRef.current);
        setReady(true);
      } catch { setMsg(tx("e_3d")); }
    }).catch(() => setMsg(tx("e_3d")));
    return () => { dead = true; ro?.disconnect(); room.current?.dispose(); room.current = null; };
  }, []);
  // the 3D library
  useEffect(() => {
    api({ action: "models" }).then((j) => setLib((j.models || []).map((m) => ({ ...m, g: groupOf(m) })))).catch(() => setLib("off"));
  }, []);

  const R = () => room.current;
  async function addModel(m) {
    if (!R() || placed.length >= 16) return;
    setLoading((n) => n + 1); setMsg("");
    try {
      const f = await api({ action: "model", id: m.id });
      await R().addModel({ ...f, name: m.name, label: m.name, hang: hangs(m), wall: onWall(m) });
    } catch { setMsg(tx("e_model")); }
    setLoading((n) => n - 1);
  }
  function addAi([emoji, label, en, size, hang]) {
    if (!R() || placed.length >= 16) return;
    R().addGhost({ name: en, label: emoji + " " + T(label), size, hang: !!hang });
  }
  async function search(e) {
    e?.preventDefault();
    if (!q.trim() || searching) return;
    setSearching(true); setMsg("");
    try { setFound(await api({ action: "search", q: q.trim() })); }
    catch { setFound({ results: [], models: [] }); }
    setSearching(false);
  }
  async function pickPicture(r) {
    if (!R() || placed.length >= 16) return;
    setGrabbing(r.thumb); setMsg("");
    try {
      const blob = await api({ action: "grab", url: r.thumb });
      const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = URL.createObjectURL(blob); });
      const { cutout } = await import("../lib/room3d");
      const c = cutout(img);
      URL.revokeObjectURL(img.src);
      await R().addPicture({ src: c.url, name: found?.q || r.title || q, label: r.title || found?.q || q });
    } catch { setMsg(tx("e_bad_image")); }
    setGrabbing("");
  }
  const changeView = (ch) => { const v = { ...view, ...ch }; setView(v); R()?.setView(v); };

  async function snapshot(longSide) {
    const img = photoRef.current;
    if (!img?.complete) throw new Error("bad_image");
    return R().snapshot(img, longSide);
  }
  async function saveMock() {
    if (!R() || saving) return;
    setSaving(true);
    try { const { canvas } = await snapshot(1600); await saveFile(canvas.toDataURL("image/jpeg", 0.92), "AHM-AI-3D-room.jpg"); }
    catch { setMsg(tx("e_bad_image")); }
    setSaving(false);
  }
  // the room as it looks now (photo + 3D furniture), small enough for the AI
  async function smallShot() {
    const { canvas, ghosts } = await snapshot(1024);
    const s = Math.min(1, 496 / Math.max(canvas.width, canvas.height));
    const c = document.createElement("canvas");
    c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return { ref: c.toDataURL("image/jpeg", 0.85).split(",")[1], ghosts };
  }
  async function make360() {
    if (!R() || busy) return;
    try { const { ref } = await smallShot(); onPano({ ref }); }
    catch { setMsg(tx("e_bad_image")); }
  }
  async function submit() {
    if (!R() || busy) return;
    try {
      const { canvas, ghosts } = await snapshot(1024);
      const s = Math.min(1, 496 / Math.max(canvas.width, canvas.height));
      const c = document.createElement("canvas");
      c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
      c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
      const ref = c.toDataURL("image/jpeg", 0.85).split(",")[1];
      const items = R().items.filter((i) => i.kind !== "ghost").map((i) => i.name);
      onMake({ ref, room: base.ref, items, ghosts });
    } catch { setMsg(tx("e_bad_image")); }
  }

  const shown = Array.isArray(lib) ? lib.filter((m) => m.g === grp) : [];
  const groups = Array.isArray(lib) ? GROUPS.filter(([k]) => lib.some((m) => m.g === k)) : [];
  const full = placed.length >= 16;
  const ModelCard = ({ m }) => (
    <button disabled={!ready || full} onClick={() => addModel(m)} title={m.name}>
      <img src={m.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <small>{m.name}</small><em>3D</em>
    </button>
  );

  return (
    <div className="ds-work fu">
      <div className="ds-stage">
        <div className={"fu-box" + (busy ? " working" : "")} dir="ltr" ref={boxRef}
          style={{ aspectRatio: String(base.ratio || 1.5), width: `min(100%, calc(70vh * ${base.ratio || 1.5}))` }}>
          <img ref={photoRef} src={base.src} alt="" draggable={false} />
          <canvas ref={cv} className="fu-cv" aria-label={tx("fu3dHelp")} />
          {!ready && !msg && <div className="fu-loading"><span className="mini-spin" /></div>}
          {loading > 0 && <div className="fu-loading chip"><span className="mini-spin" /> {tx("loading3d")}</div>}
          {busy && <div className="ds-progress"><span className="mini-spin" /> {tx(busy)}<i /></div>}
        </div>
        <div className="fu-quick">
          <button className="ghost-btn fu-360" disabled={!ready || !!busy || out2} onClick={make360}>{tx("panoMake")} <small>({tx("panoNote")})</small></button>
          <button className="ghost-btn" disabled={!placed.length || !ready || saving} onClick={saveMock}>{tx("saveMock")}</button>
        </div>
        <p className="cs-note">{tx("fu3dHelp")}</p>
        {sel && (
          <div className="fu-edit">
            <b>{sel.label} <small dir="ltr">≈ {sel.kind === "picture" ? `${sel.w} × ${sel.h}` : `${sel.w} × ${sel.d} × ${sel.h}`} {tx("m")}</small></b>
            <label className="fu-row"><span>{tx("size")}</span>
              <button className="fu-step" onClick={() => R()?.set(sel.id, { scale: sel.scale / 1.1 })} aria-label="−">−</button>
              <input type="range" min="0.2" max="4" step="0.01" value={sel.scale} onChange={(e) => R()?.set(sel.id, { scale: +e.target.value })} />
              <button className="fu-step" onClick={() => R()?.set(sel.id, { scale: sel.scale * 1.1 })} aria-label="+">+</button>
            </label>
            <label className="fu-row"><span>{tx("turn")}</span>
              <button className="fu-step" onClick={() => R()?.set(sel.id, { rot: sel.rot - 45 })} aria-label="⟲">⟲</button>
              <input type="range" min="0" max="359" step="1" value={sel.rot} onChange={(e) => R()?.set(sel.id, { rot: +e.target.value })} />
              <button className="fu-step" onClick={() => R()?.set(sel.id, { rot: sel.rot + 45 })} aria-label="⟳">⟳</button>
            </label>
            <label className="fu-row"><span>{tx("lift")}</span>
              <input type="range" min="0" max="3" step="0.01" value={sel.lift} onChange={(e) => R()?.set(sel.id, { lift: +e.target.value })} />
              <i dir="ltr">{sel.lift.toFixed(2)} {tx("m")}</i>
            </label>
            <div className="fu-btns">
              <button className="ghost-btn" disabled={full} onClick={() => R()?.duplicate(sel.id)}>{tx("dup")}</button>
              <button className="ghost-btn" onClick={() => R()?.remove(sel.id)}>{tx("remove")}</button>
            </div>
          </div>
        )}
        <details className="ds-adv fu-fit" onToggle={(e) => R()?.showGrid(e.currentTarget.open)}>
          <summary>{tx("fit")}</summary>
          <p className="cs-note">{tx("fitHelp")}</p>
          <label className="fu-row"><span>{tx("camH")}</span><input type="range" min="0.6" max="2.6" step="0.01" value={view.height} onChange={(e) => changeView({ height: +e.target.value })} /><i dir="ltr">{view.height.toFixed(2)} {tx("m")}</i></label>
          <label className="fu-row"><span>{tx("tiltL")}</span><input type="range" min="0" max="50" step="0.5" value={view.tilt} onChange={(e) => changeView({ tilt: +e.target.value })} /><i dir="ltr">{view.tilt}°</i></label>
          <label className="fu-row"><span>{tx("lens")}</span><input type="range" min="30" max="85" step="1" value={view.fov} onChange={(e) => changeView({ fov: +e.target.value })} /><i dir="ltr">{view.fov}°</i></label>
        </details>
      </div>

      <div className="ds-panel house-card">
        <div className="seg lang-seg fu-tabs">
          <button className={tab === "3d" ? "on" : ""} onClick={() => setTab("3d")}>{tx("tab3d")}</button>
          <button className={tab === "search" ? "on" : ""} onClick={() => setTab("search")}>{tx("search")}</button>
          <button className={tab === "ai" ? "on" : ""} onClick={() => setTab("ai")}>{tx("tabAi")}</button>
        </div>

        {tab === "3d" && (lib === null ? <div className="fu-models">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ds-card skeleton" />)}</div>
          : lib === "off" ? <p className="house-warn">{tx("e_models_off")}</p> : (
            <>
              <div className="house-chips">
                {groups.map(([k, name]) => <button key={k} className={grp === k ? "on" : ""} aria-pressed={grp === k} onClick={() => setGrp(k)}>{T(name)}</button>)}
              </div>
              <div className="fu-models">{shown.map((m) => <ModelCard key={m.id} m={m} />)}</div>
              {!shown.length && <p className="muted">{tx("searchNone")}</p>}
            </>
          ))}

        {tab === "search" && (
          <>
            <form className="fu-search" onSubmit={search}>
              <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))} placeholder={tx("searchPh")} enterKeyHint="search" />
              <button className="gold-btn small" disabled={!q.trim() || searching}>{searching ? <span className="mini-spin" /> : "🔍"}</button>
            </form>
            {found && !found.results?.length && !found.models?.length && <p className="muted">{tx("searchNone")}</p>}
            {found?.models?.length > 0 && <>
              <p className="sl-label">{tx("res3d")} ({found.models.length})</p>
              <div className="fu-models">{found.models.map((m) => <ModelCard key={m.id} m={m} />)}</div>
            </>}
            {found?.results?.length > 0 && <>
              <p className="sl-label">{tx("resPics")} ({found.results.length})</p>
              <div className="fu-found">
                {found.results.map((r, i) => (
                  <button key={i} disabled={!!grabbing || !ready || full} onClick={() => pickPicture(r)} title={[r.title, r.credit, r.license].filter(Boolean).join(" · ")}>
                    <img src={r.thumb} alt={r.title} loading="lazy" referrerPolicy="no-referrer" />
                    {grabbing === r.thumb && <span className="mini-spin" />}
                    <small>{r.credit ? "© " + r.credit : r.source}{r.license ? " · " + r.license.toUpperCase() : ""}</small>
                  </button>
                ))}
              </div>
            </>}
            <p className="cs-note">{tx("searchNote")}</p>
          </>
        )}

        {tab === "ai" && (
          <>
            <p className="cs-note">{tx("aiHelp")}</p>
            <div className="house-chips">
              {Object.entries(AI_ITEMS).map(([k, c]) => <button key={k} className={aiCat === k ? "on" : ""} aria-pressed={aiCat === k} onClick={() => setAiCat(k)}>{T(c.name)}</button>)}
            </div>
            <div className="fu-grid">
              {AI_ITEMS[aiCat].items.map((it, i) => (
                <button key={i} disabled={!ready || full} onClick={() => addAi(it)}><span>{it[0]}</span><small>{T(it[1])}</small></button>
              ))}
            </div>
          </>
        )}

        {msg && <p className="house-warn">{msg}</p>}
        {placed.length > 0 && <p className="sl-label">{tx("placed")}: {placed.length}/16</p>}
        {out ? <button className="gold-btn" onClick={onUpgrade}>{tx("getPro")}</button> : (
          <button className="gold-btn ds-make" disabled={!placed.length || !!busy || !ready} onClick={submit}>
            {busy ? <><span className="mini-spin" /> {tx(busy)}</> : tx("put")}
          </button>
        )}
        <p className="cs-note">{tx("credit3d")}</p>
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
