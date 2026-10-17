"use client";
// 🏗️ AHM AI Construction & Design Studio — the hub for real-photo redesigns:
//   A. Interior design  B. Exterior design  C. Floor plan studio (the house planner)  D. AI redesign (anything)
// Photos are redesigned by a real image AI (server: /api/redesign). Projects are saved privately per user.
import { useEffect, useRef, useState } from "react";
import { Pano360 } from "./HouseStudio";

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
  furnish: L("🪄 خۆت کەلوپەل دابنێ", "🪄 ضع الأثاث بنفسك", "🪄 Furnish it yourself"),
  furnishHelp: L("کەلوپەلێک هەڵبژێرە یان بیگەڕێ ← لەسەر وێنەکە بیجوڵێنە بۆ شوێنی خۆی ← گۆشەکەی ڕابکێشە بۆ گەورە/بچووککردن ← «بیخە ناو ژوورەکە».", "اختر قطعة أو ابحث عنها ← حرّكها إلى مكانها ← اسحب الزاوية لتكبيرها ← «ضعها في الغرفة».", "Pick or search an item → drag it into place → drag its corner to resize → “Put it in the room”."),
  tab3d: L("🛋️ 3D", "🛋️ 3D", "🛋️ 3D"),
  tabAi: L("✨ AI", "✨ AI", "✨ AI"),
  aiHelp: L("ئەمانە مۆدێلی 3D یان نییە. شوێن و قەبارەیان دیاری بکە، AI لە کاتی دروستکردنی وێنەکەدا دەیانکێشێت.", "هذه بلا نموذج 3D. حدّد مكانها وحجمها، وسيرسمها الذكاء الاصطناعي.", "These have no 3D model. Set their place and size; the AI draws them."),
  loading3d: L("مۆدێلی 3D دێت…", "تحميل النموذج 3D…", "Loading 3D model…"),
  fu3dHelp: L("کرتە لە شتێک بکە بۆ زیادکردن ← بە پەنجەیەک لەسەر زەوی بیجوڵێنە ← بە دوو پەنجە گەورە/بچووکی بکە و بیسوڕێنە.", "اضغط على قطعة لإضافتها ← حرّكها بإصبع ← كبّر/صغّر وأدِر بإصبعين.", "Tap an item to add it → move it with one finger → pinch to resize and twist to turn."),
  size: L("قەبارە", "الحجم", "Size"),
  turn: L("سوڕاندن", "تدوير", "Turn"),
  lift: L("بەرزی لە زەوی", "الارتفاع", "Lift"),
  m: L("م", "م", "m"),
  fit: L("📐 ڕێکخستنی زەوی لەگەڵ وێنەکە", "📐 مطابقة الأرضية مع الصورة", "📐 Line up the floor with the photo"),
  fitHelp: L("هێڵە زەردەکان زەوی 3Dـن. بیانگۆڕە تا وەک زەوی ژوورەکەت دیار بن، ئینجا کەلوپەلەکان ڕاست دادەنیشن.", "الخطوط الصفراء هي الأرضية 3D. عدّلها لتطابق أرضية غرفتك.", "The yellow lines are the 3D floor. Adjust them to match your room's floor."),
  camH: L("بەرزی کامێرا", "ارتفاع الكاميرا", "Camera height"),
  tiltL: L("لاری زەوی", "ميل الأرضية", "Floor angle"),
  lens: L("لێنز", "العدسة", "Lens"),
  saveMock: L("📸 پاشەکەوتکردنی وێنەی 3D (بەخۆڕایی)", "📸 حفظ صورة 3D (مجاناً)", "📸 Save the 3D picture (free)"),
  res3d: L("🛋️ مۆدێلی 3D", "🛋️ نماذج 3D", "🛋️ 3D models"),
  resPics: L("📷 وێنەکان", "📷 صور", "📷 Pictures"),
  credit3d: L("مۆدێلە 3Dـەکان: Poly Haven (CC0، بەخۆڕایی)", "النماذج 3D: Poly Haven (CC0، مجانية)", "3D models: Poly Haven (CC0, free)"),
  e_model: L("ئەم مۆدێلە نەکرایەوە. یەکێکی تر تاقی بکەرەوە.", "تعذّر فتح النموذج. جرّب غيره.", "This model didn't open. Try another."),
  e_models_off: L("کتێبخانەی 3D ئێستا ناگات. «🔍 گەڕان» یان «✨ AI» بەکاربهێنە.", "مكتبة 3D غير متاحة الآن. استخدم البحث أو AI.", "The 3D library isn't reachable now. Use Search or AI."),
  e_3d: L("ئەم ئامێرە 3D پشتگیری ناکات.", "هذا الجهاز لا يدعم 3D.", "This device doesn't support 3D."),
  catalog: L("📦 کەلوپەل", "📦 الأثاث", "📦 Items"),
  search: L("🔍 گەڕان", "🔍 بحث", "🔍 Search"),
  searchPh: L("بۆ نموونە: قەنەفەی چەرمی قاوەیی، گڵۆپی زێڕین…", "مثلاً: كنبة جلد بني، ثريا ذهبية…", "e.g. brown leather sofa, gold chandelier…"),
  searchNone: L("هیچ نەدۆزرایەوە. وشەیەکی تر تاقی بکەرەوە.", "لا نتائج. جرّب كلمة أخرى.", "Nothing found. Try another word."),
  searchNote: L("بە کوردی، عەرەبی یان ئینگلیزی بنووسە. مۆدێلی 3D لە Poly Haven و وێنە لە Openverse و Wikimedia (بەخۆڕایی و یاسایی). ئەگەر وێنەکە پاشبنەمای سپی هەبێت، خۆکار لادەبرێت.", "اكتب بالكردية أو العربية أو الإنجليزية. نماذج 3D من Poly Haven وصور من Openverse وWikimedia (مجانية وقانونية). الخلفية البيضاء تُزال تلقائياً.", "Type in Kurdish, Arabic or English. 3D models from Poly Haven, pictures from Openverse and Wikimedia (free and legal). White backgrounds are removed automatically."),
  placed: L("لەسەر وێنەکە", "على الصورة", "On the photo"),
  noteF: L("ڕەنگ / کەرەستە (ئارەزوومەندانە)", "اللون / المادة (اختياري)", "Colour / material (optional)"),
  noteFPh: L("بۆ نموونە: بێژ، چەرم، دار", "مثلاً: بيج، جلد، خشب", "e.g. beige, leather, wood"),
  remove: L("لابردن", "إزالة", "Remove"),
  dup: L("دووبارەکردنەوە", "تكرار", "Duplicate"),
  put: L("✨ بیکە بە وێنەی ڕاستەقینە (AI)", "✨ حوّلها إلى صورة حقيقية (AI)", "✨ Make it a real photo (AI)"),
  closeEdit: L("داخستنی دانان", "إغلاق", "Close"),
  maxPics: L("زۆرترین ٣ وێنەی گەڕان لە یەک جاردا", "3 صور بحث كحد أقصى في المرة", "Max 3 search pictures at a time"),
  pano: L("🔄 360°", "🔄 360°", "🔄 360°"),
  panoMake: L("🔄 بیکە بە 360°", "🔄 حوّلها إلى 360°", "🔄 Make it 360°"),
  panoOpen: L("🔄 بینینی 360°", "🔄 عرض 360°", "🔄 View 360°"),
  panoNote: L("بە ٢ وێنە حیساب دەکرێت", "تُحسب صورتين", "Counts as 2 pictures"),
  drag360: L("بە پەنجە بیجوڵێنە بۆ سەیرکردنی هەموو لایەک", "اسحب لترى كل الجهات", "Drag to look around"),
  close: L("داخستن", "إغلاق", "Close"),
  simpleNote: L("ℹ️ ئەمڕۆ خزمەتگوزارییە سەرەکییەکە پڕ بووە، بۆیە ئەم وەشانە بە خزمەتگوزارییە یەدەگەکە دروست کرا. ئەو وێنەکەت ناخوێنێتەوە، تەنها وەسفەکەی بەکاردەهێنێت، بۆیە کەمتر لە ژوورەکەت دەچێت.", "ℹ️ الخدمة الرئيسية ممتلئة اليوم، فصُنعت هذه النسخة بالخدمة الاحتياطية التي تستخدم وصف الصورة فقط، لذا قد تشبه مكانك أقل.", "ℹ️ The main service is full today, so this version was made by the back-up service, which uses a description of your photo only — it may look less like your space."),
  e_limit: L("وێنە بەخۆڕاییەکانت تەواو بوون. بۆ زیاتر Pro وەربگرە.", "انتهت صورك المجانية. اشترك في Pro.", "Your free pictures are used up. Get Pro for more."),
  e_daily_full: L("ئەمڕۆ ژمارەی وێنەی بەخۆڕایی بۆ هەموو ئەپەکە تەواو بوو. بەیانی هەوڵ بدەرەوە 🌙", "انتهت الصور المجانية لكل التطبيق اليوم. حاول غداً 🌙", "Today's free pictures for the whole app are used up. Try tomorrow 🌙"),
  e_cf_off: L("دروستکردنی وێنە هێشتا ئامادە نییە.", "إنشاء الصور غير جاهز بعد.", "Picture making is not set up yet."),
  e_cf_key: L("کلیلی دروستکردنی وێنە هەڵەیە.", "مفتاح الصور غير صحيح.", "The picture key is wrong."),
  e_cf_failed: L("وێنەکە دروست نەبوو. دووبارە هەوڵ بدەرەوە.", "لم تُنشأ الصورة. أعد المحاولة.", "The picture was not made. Try again."),
  e_bad_image: L("ئەم وێنەیە نەکرایەوە. وێنەیەکی تر تاقی بکەرەوە.", "تعذر فتح الصورة. جرّب أخرى.", "This photo could not be opened. Try another."),
  e_unsafe: L("ئەم داواکارییە ڕێگەپێدراو نییە.", "هذا الطلب غير مسموح.", "This request is not allowed."),
  e_verify_email: L("بۆ وێنەی بەخۆڕایی، سەرەتا ئیمەیڵەکەت پشتڕاست بکەرەوە (کۆدەکەی ناو ئیمەیڵەکەت).", "لتحصل على الصور المجانية، أكّد بريدك الإلكتروني أولاً.", "Please confirm your e-mail first to get free pictures."),
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
// "AI draws it" things (no 3D model): [emoji, name, English for the AI, size in metres [w, h, d], hangs from the ceiling]
const AI_ITEMS = {
  living: { name: L("دانیشتن", "جلوس", "Seating"), items: [["🛋️", L("قەنەفەی L", "كنبة زاوية", "L sofa"), "large L-shaped sofa", [2.8, 0.85, 1.8]], ["🛋️", L("قەنەفەی ٣ کەسی", "كنبة 3 مقاعد", "3-seat sofa"), "three-seat sofa", [2.2, 0.85, 0.95]], ["🪑", L("کورسیی قەنەفە", "كرسي مريح", "Armchair"), "armchair", [0.85, 0.9, 0.85]], ["🟫", L("مێزی ناوەڕاست", "طاولة وسط", "Coffee table"), "coffee table", [1.2, 0.42, 0.65]], ["📺", L("مێزی تەلەفزیۆن", "وحدة تلفاز", "TV unit"), "TV wall unit with a large TV", [2.2, 1.6, 0.45]], ["🟥", L("فەرش", "سجادة", "Rug"), "large rug on the floor", [2.6, 0.02, 1.8]]] },
  bedroom: { name: L("نوستن", "نوم", "Bedroom"), items: [["🛏️", L("قەرەوێڵەی دوو کەسی", "سرير مزدوج", "Double bed"), "king size bed with headboard", [1.9, 1.1, 2.15]], ["🛏️", L("قەرەوێڵەی یەک کەسی", "سرير مفرد", "Single bed"), "single bed", [1, 0.9, 2.05]], ["🗄️", L("دۆڵاب", "خزانة ملابس", "Wardrobe"), "tall wardrobe", [2, 2.4, 0.6]], ["🟫", L("مێزی تەنیشت قەرەوێڵە", "طاولة جانبية", "Nightstand"), "bedside table with lamp", [0.5, 0.55, 0.4]], ["🪞", L("مێزی ئارایش", "تسريحة", "Dressing table"), "dressing table with mirror", [1.1, 1.5, 0.45]]] },
  dining: { name: L("چێشتخانە", "مطبخ وطعام", "Kitchen & dining"), items: [["🍽️", L("مێزی نانخواردن", "طاولة طعام", "Dining table"), "dining table with six chairs", [2, 0.76, 1]], ["🧊", L("سەلاجە", "ثلاجة", "Fridge"), "tall fridge", [0.9, 1.85, 0.7]], ["🍳", L("دوورگەی چێشتخانە", "جزيرة مطبخ", "Kitchen island"), "kitchen island with stools", [2.2, 0.92, 1]]] },
  bath: { name: L("حەمام", "حمام", "Bathroom"), items: [["🛁", L("بانیۆ", "بانيو", "Bathtub"), "freestanding bathtub", [1.7, 0.6, 0.8]], ["🚿", L("دووش", "دش", "Shower"), "glass walk-in shower", [1, 2.1, 1]], ["🚰", L("دەستشۆر", "مغسلة", "Vanity"), "vanity with sink and mirror", [1, 0.9, 0.5]], ["🚽", L("تەوالێت", "مرحاض", "Toilet"), "toilet", [0.4, 0.8, 0.65]]] },
  decor: { name: L("ڕووناکی و ڕازاندنەوە", "إضاءة وديكور", "Lights & decor"), items: [["💡", L("چرای سەقف", "ثريا", "Chandelier"), "elegant chandelier hanging from the ceiling", [0.8, 0.7, 0.8], 1], ["🪟", L("پەردە", "ستارة", "Curtains"), "floor-length curtains", [2.4, 2.6, 0.1]], ["🖼️", L("تابلۆ", "لوحة", "Wall art"), "framed wall painting", [1.2, 0.8, 0.05]], ["📚", L("ڕەفەی کتێب", "رف كتب", "Bookshelf"), "bookshelf with books", [1.2, 2, 0.35]]] },
  outdoor: { name: L("دەرەوە", "خارجي", "Outdoor"), items: [["🌳", L("درەخت", "شجرة", "Tree"), "tree", [3, 5, 3]], ["🌷", L("گوڵ", "زهور", "Flower bed"), "flower bed", [3, 0.4, 1]], ["🪑", L("قەنەفەی دەرەوە", "جلسة خارجية", "Outdoor sofa"), "outdoor lounge sofa set", [2.6, 0.8, 2]], ["⛱️", L("سێبەرە", "مظلة", "Parasol"), "garden parasol", [2.5, 2.5, 2.5]], ["🏛️", L("پێرگۆلا", "برجولا", "Pergola"), "wooden pergola", [4, 2.8, 3.5]], ["🚗", L("ئۆتۆمبێل", "سيارة", "Car"), "modern car", [1.9, 1.5, 4.7]], ["🏮", L("گڵۆپی باخچە", "إنارة حديقة", "Garden light"), "garden light post", [0.3, 1.2, 0.3]], ["🏊", L("حەوزی مەلە", "مسبح", "Pool"), "swimming pool", [4, 0.05, 8]]] },
};
// Groups for the real 3D models (matched by words in the model's name / tags / categories)
const GROUPS = [
  ["sofa", L("قەنەفە", "كنب", "Sofas"), ["sofa", "couch", "armchair", "loveseat", "ottoman", "pouf"]],
  ["chair", L("کورسی", "كراسي", "Chairs"), ["chair", "stool", "bench"]],
  ["table", L("مێز", "طاولات", "Tables"), ["table", "desk"]],
  ["storage", L("دۆڵاب و ڕەفە", "خزائن ورفوف", "Storage"), ["shelf", "shelves", "cabinet", "drawer", "wardrobe", "dresser", "bookcase", "sideboard", "cupboard", "nightstand", "console"]],
  ["bed", L("نوستن و حەمام", "نوم وحمام", "Bed & bath"), ["bed", "bathtub", "toilet", "sink", "basin"]],
  ["light", L("گڵۆپ", "إضاءة", "Lights"), ["lamp", "chandelier", "lantern", "light", "candle"]],
  ["plant", L("ڕووەک", "نباتات", "Plants"), ["plant", "potted", "flower", "fern", "cactus", "bonsai", "succulent"]],
  ["decor", L("ڕازاندنەوە", "ديكور", "Decor"), ["vase", "frame", "painting", "picture", "mirror", "rug", "carpet", "clock", "sculpture", "statue", "decor", "decorative", "bowl", "basket", "television", "tv", "speaker", "radio", "book"]],
  ["outdoor", L("دەرەوە", "خارجي", "Outdoor"), ["tree", "bush", "shrub", "outdoor", "garden", "planter", "fence", "barrel", "street"]],
];
const words = (m) => (m.id.replace(/_/g, " ") + " " + m.name + " " + m.tags.join(" ") + " " + m.cats.join(" ")).toLowerCase();
const groupOf = (m) => { const w = words(m); for (const [k, , keys] of GROUPS) if (keys.some((x) => new RegExp("(^|[^a-z])" + x + "(s|es)?([^a-z]|$)").test(w))) return k; return null; };
const hangs = (m) => /chandelier|ceiling|pendant|hanging/.test(words(m));
const onWall = (m) => /(^|[^a-z])(frame|painting|picture|mirror|clock|wall)([^a-z]|$)/.test(words(m)) && !/table|chair|sofa|cabinet/.test(words(m));
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
    if (body?.action === "grab") { if (!r.ok) throw new Error("bad_image"); return r.blob(); }
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
  const [results, setResults] = useState(() => (project?.results || []).filter((r) => r.url).map((r) => ({ src: r.url, remote: true, pano: r.prompt === "pano" })));
  const [sel, setSel] = useState(Math.max(0, (project?.results?.length || 1) - 1));
  const [projectId, setProjectId] = useState(project?.id || "");
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(null); // { src, ratio } while placing furniture
  const [pano, setPano] = useState(null); // picture shown in the 360° viewer
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

        <div className="ds-work">
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
            {photo && !results.length && (
              <div className="ds-actions ds-more">
                <button className="ghost-btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>{tx("change")}</button>
                <button className="ghost-btn" disabled={!!busy} onClick={openEditor}>{tx("furnish")}</button>
                <button className="ghost-btn" disabled={!!busy || (quota && quota.left != null && quota.left < 2)} onClick={() => makeFrom("pano")} title={tx("panoNote")}>{tx("panoMake")}</button>
              </div>
            )}
            {pano && <Pano360 src={pano} title="360°" hint={tx("drag360")} closeText={tx("close")} onClose={() => setPano(null)} />}
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
