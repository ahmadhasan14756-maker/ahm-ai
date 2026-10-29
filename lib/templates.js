// Ready-made starting points for the build section: a clear, well-sized request (5–7 parts) that is known to
// come out complete and working. One tap → the plan; the user can still change anything before building.
const T = (ic, name, prompt) => ({ ic, name, prompt });

export const TEMPLATES = {
  system: [
    T("☕", { ckb: "کافێ و چێشتخانە", ar: "مقهى ومطعم", en: "Café & restaurant" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کافێ دروست بکە: داشبۆرد (فرۆشی ئەمڕۆ، باشترین خواردنەوەکان، چارت)، فرۆشتن (POS) بە سەبەتە و پسوولەی چاپکراو، مینیو (زیادکردن و دەستکاریکردنی خواردن و نرخ)، مێزەکان (بەتاڵ / پڕ)، کۆگا (کەرەستەی خاو و ئاگاداری کەمبوونەوە)، ڕاپۆرتی ڕۆژانە و مانگانە. چوونەژوورەوە: بەڕێوەبەر admin / admin123 و کاشێر cashier / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة مقهى: لوحة تحكم (مبيعات اليوم، الأكثر طلباً، رسم بياني)، نقطة بيع بسلة وفاتورة للطباعة، القائمة (إضافة وتعديل الأصناف والأسعار)، الطاولات (فارغة/مشغولة)، المخزون مع تنبيه النقص، تقارير يومية وشهرية. الدخول: المدير admin / admin123 والكاشير cashier / 1234. الأسعار بالدينار.",
      en: "Build a café management system: dashboard (today's sales, best sellers, chart), point of sale with cart and printable receipt, menu (add/edit items and prices), tables (free/busy), stock with low-stock alerts, daily and monthly reports. Logins: manager admin / admin123 and cashier cashier / 1234. Prices in IQD.",
    }),
    T("🛒", { ckb: "دوکان و فرۆشگا", ar: "متجر ومحل", en: "Shop & store" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی دوکان دروست بکە: داشبۆرد، بەرهەمەکان (بارکۆد، نرخی کڕین و فرۆشتن، بڕ)، فرۆشتن بە سەبەتە و پسوولە، کڕیاران و قەرز، کۆگا و ئاگاداری کەمبوونەوە، ڕاپۆرتی قازانج. چوونەژوورەوە: admin / admin123. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة متجر: لوحة تحكم، المنتجات (باركود، سعر الشراء والبيع، الكمية)، البيع بسلة وفاتورة، العملاء والديون، المخزون مع تنبيه النقص، تقرير الأرباح. الدخول: admin / admin123. الأسعار بالدينار.",
      en: "Build a shop management system: dashboard, products (barcode, cost and sale price, quantity), sales with cart and receipt, customers and debts, stock with low-stock alerts, profit report. Login: admin / admin123. Prices in IQD.",
    }),
    T("🏥", { ckb: "کلینیک", ar: "عيادة", en: "Clinic" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کلینیک دروست بکە: داشبۆرد (نۆرەکانی ئەمڕۆ)، نەخۆشەکان (زانیاری و مێژووی نەخۆشی)، نۆرەکان (کات و دکتۆر)، ڕەچەتە (دەرمان و ڕێنمایی، چاپکراو)، پارەدان و پسوولە، ڕاپۆرتی مانگانە. چوونەژوورەوە: دکتۆر admin / admin123 و سکرتێر reception / 1234.",
      ar: "أنشئ نظام إدارة عيادة: لوحة تحكم (مواعيد اليوم)، المرضى (البيانات والتاريخ المرضي)، المواعيد (الوقت والطبيب)، الوصفات (الأدوية والتعليمات، قابلة للطباعة)، الدفعات والفواتير، تقرير شهري. الدخول: الطبيب admin / admin123 والاستقبال reception / 1234.",
      en: "Build a clinic management system: dashboard (today's appointments), patients (details and history), appointments (time and doctor), prescriptions (medicines and instructions, printable), payments and receipts, monthly report. Logins: doctor admin / admin123 and reception reception / 1234.",
    }),
    T("🏫", { ckb: "قوتابخانە", ar: "مدرسة", en: "School" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی قوتابخانە دروست بکە: داشبۆرد، قوتابیان (پۆل و زانیاری)، مامۆستایان، ئامادەبوون (ڕۆژانە)، نمرەکان و کارنامەی چاپکراو، پارەی خوێندن. چوونەژوورەوە: بەڕێوەبەر admin / admin123 و مامۆستا teacher / 1234.",
      ar: "أنشئ نظام إدارة مدرسة: لوحة تحكم، الطلاب (الصف والبيانات)، المعلمون، الحضور اليومي، الدرجات وكشف قابل للطباعة، الرسوم الدراسية. الدخول: المدير admin / admin123 والمعلم teacher / 1234.",
      en: "Build a school management system: dashboard, students (class and details), teachers, daily attendance, grades and a printable report card, tuition fees. Logins: principal admin / admin123 and teacher teacher / 1234.",
    }),
    T("📦", { ckb: "کۆگا", ar: "مستودع", en: "Warehouse" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کۆگا دروست بکە: داشبۆرد، کاڵاکان (کۆد، شوێن، بڕ)، هاتنە ژوورەوەی کاڵا، دەرچوونی کاڵا، دابینکەران، ڕاپۆرتی جووڵە و کەمبوونەوە. چوونەژوورەوە: admin / admin123.",
      ar: "أنشئ نظام إدارة مستودع: لوحة تحكم، الأصناف (الرمز، الموقع، الكمية)، إدخال البضاعة، إخراج البضاعة، الموردون، تقرير الحركة والنقص. الدخول: admin / admin123.",
      en: "Build a warehouse management system: dashboard, items (code, location, quantity), goods in, goods out, suppliers, movement and low-stock report. Login: admin / admin123.",
    }),
  ],
  website: [
    T("☕", { ckb: "کافێ و چێشتخانە", ar: "مقهى ومطعم", en: "Café & restaurant" }, {
      ckb: "وێبسایتێکی جوان بۆ کافێیەک دروست بکە: لاپەڕەی سەرەکی (وێنەی گەورە و خواردنە تایبەتەکان)، مینیو (بەش بەش بە نرخ و وێنە)، دەربارەمان، گەلەری، پەیوەندی (ژمارە، نەخشە، کاتی کار، فۆرم).",
      ar: "أنشئ موقعاً جميلاً لمقهى: الرئيسية (صورة كبيرة وأطباق مميزة)، القائمة (أقسام بالأسعار والصور)، من نحن، معرض الصور، تواصل معنا (هاتف، خريطة، أوقات العمل، نموذج).",
      en: "Build a beautiful café website: home (big hero and specials), menu (sections with prices and photos), about us, gallery, contact (phone, map, opening hours, form).",
    }),
    T("🏢", { ckb: "کۆمپانیا", ar: "شركة", en: "Company" }, {
      ckb: "وێبسایتێکی پڕۆفیشناڵ بۆ کۆمپانیایەک دروست بکە: لاپەڕەی سەرەکی، خزمەتگوزارییەکان، پڕۆژەکانمان، تیمەکەمان، ڕای کڕیاران، پەیوەندی.",
      ar: "أنشئ موقعاً احترافياً لشركة: الرئيسية، الخدمات، مشاريعنا، فريقنا، آراء العملاء، تواصل معنا.",
      en: "Build a professional company website: home, services, our projects, our team, testimonials, contact.",
    }),
    T("👤", { ckb: "پۆرتفۆلیۆی کەسی", ar: "ملف أعمال شخصي", en: "Personal portfolio" }, {
      ckb: "وێبسایتێکی پۆرتفۆلیۆی کەسی دروست بکە: دەربارەی من، توانستەکان، کارەکانم (بە وێنە و لینک)، ئەزموون، سیڤی بۆ داگرتن، پەیوەندی.",
      ar: "أنشئ موقع ملف أعمال شخصي: نبذة عني، المهارات، أعمالي (بالصور والروابط)، الخبرات، سيرة ذاتية للتحميل، تواصل.",
      en: "Build a personal portfolio website: about me, skills, my work (with images and links), experience, downloadable CV, contact.",
    }),
    T("🛍️", { ckb: "دوکانی ئۆنلاین", ar: "متجر إلكتروني", en: "Online shop" }, {
      ckb: "وێبسایتێکی دوکانی ئۆنلاین دروست بکە: لاپەڕەی سەرەکی، بەرهەمەکان بە گەڕان و فلتەر، لاپەڕەی بەرهەم، سەبەتە، داواکردن بە واتسئاپ، پەیوەندی. نرخ بە دینار.",
      ar: "أنشئ متجراً إلكترونياً: الرئيسية، المنتجات مع بحث وتصفية، صفحة المنتج، السلة، الطلب عبر واتساب، تواصل. الأسعار بالدينار.",
      en: "Build an online shop website: home, products with search and filters, product page, cart, order via WhatsApp, contact. Prices in IQD.",
    }),
  ],
  app: [
    T("💰", { ckb: "خەرجی ڕۆژانە", ar: "المصاريف اليومية", en: "Daily expenses" }, {
      ckb: "ئەپێکی تۆمارکردنی خەرجی دروست بکە: زیادکردنی خەرجی (بڕ، جۆر، بەروار)، لیستی خەرجییەکان، چارتی مانگانە بە جۆر، بودجەی مانگانە و ئاگاداری، پاشەکەوتکردن لە ناو مۆبایل. نرخ بە دینار.",
      ar: "أنشئ تطبيق تسجيل المصاريف: إضافة مصروف (المبلغ، النوع، التاريخ)، قائمة المصاريف، رسم شهري حسب النوع، ميزانية شهرية مع تنبيه، الحفظ على الهاتف. بالدينار.",
      en: "Build an expense tracker app: add an expense (amount, category, date), expense list, monthly chart by category, monthly budget with alert, saved on the phone. In IQD.",
    }),
    T("✅", { ckb: "لیستی کارەکان", ar: "قائمة المهام", en: "To-do list" }, {
      ckb: "ئەپێکی لیستی کارەکان دروست بکە: زیادکردنی کار بە بەروار و گرنگی، تەواوکردن و سڕینەوە، فلتەر (ئەمڕۆ، داهاتوو، تەواوبوو)، ئامار، دۆخی شەو.",
      ar: "أنشئ تطبيق قائمة مهام: إضافة مهمة بتاريخ وأولوية، إنجاز وحذف، تصفية (اليوم، القادم، المنجز)، إحصائيات، الوضع الليلي.",
      en: "Build a to-do list app: add tasks with date and priority, complete and delete, filters (today, upcoming, done), stats, dark mode.",
    }),
    T("📚", { ckb: "فێربوونی وشە", ar: "تعلم الكلمات", en: "Learn words" }, {
      ckb: "ئەپێکی فێربوونی وشەی ئینگلیزی بۆ کورد دروست بکە: کارتی وشە (ئینگلیزی و کوردی)، تاقیکردنەوەی هەڵبژاردن، پێشکەوتن و خاڵ، وشەی ڕۆژ، زیادکردنی وشەی خۆت.",
      ar: "أنشئ تطبيقاً لتعلم الكلمات الإنجليزية: بطاقات كلمات (إنجليزي وعربي)، اختبار اختيار من متعدد، التقدم والنقاط، كلمة اليوم، إضافة كلماتك.",
      en: "Build an English vocabulary app: word cards (English and translation), multiple-choice quiz, progress and points, word of the day, add your own words.",
    }),
    T("🏋️", { ckb: "وەرزش", ar: "رياضة", en: "Workout" }, {
      ckb: "ئەپێکی وەرزش دروست بکە: پلانی ڕاهێنانی هەفتانە، کاتژمێری ڕاهێنان، تۆمارکردنی کێش، چارتی پێشکەوتن، ئامۆژگاری ڕۆژانە.",
      ar: "أنشئ تطبيق رياضة: خطة تمارين أسبوعية، مؤقت التمرين، تسجيل الوزن، رسم التقدم، نصيحة يومية.",
      en: "Build a workout app: weekly training plan, workout timer, weight log, progress chart, daily tip.",
    }),
  ],
};

export const templatesFor = (kind) => TEMPLATES[kind] || [];
