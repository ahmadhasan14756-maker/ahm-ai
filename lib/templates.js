// Ready-made starting points for the build section: a clear, well-sized request (5–6 parts) that is known to
// come out complete and working. One tap → the plan; the user can still change anything before building.
// The English name matches the field in lib/blueprints.js when there is one (so "show more" doesn't repeat it).
const T = (ic, name, prompt) => ({ ic, name, prompt });

export const TEMPLATES = {
  system: [
    T("☕", { ckb: "کافێ و چێشتخانە", ar: "مقهى ومطعم", en: "Café & restaurant" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کافێ دروست بکە: داشبۆرد (فرۆشی ئەمڕۆ، باشترین خواردنەوەکان، چارت)، فرۆشتن (POS) بە سەبەتە و پسوولەی چاپکراو، مینیو (زیادکردن و دەستکاریکردنی خواردن و نرخ)، مێزەکان (بەتاڵ / پڕ)، کۆگا (کەرەستەی خاو و ئاگاداری کەمبوونەوە)، ڕاپۆرتی ڕۆژانە و مانگانە. چوونەژوورەوە: بەڕێوەبەر admin / admin123 و کاشێر cashier / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة مقهى: لوحة تحكم (مبيعات اليوم، الأكثر طلباً، رسم بياني)، نقطة بيع بسلة وفاتورة للطباعة، القائمة (إضافة وتعديل الأصناف والأسعار)، الطاولات (فارغة/مشغولة)، المخزون مع تنبيه النقص، تقارير يومية وشهرية. الدخول: المدير admin / admin123 والكاشير cashier / 1234. الأسعار بالدينار.",
      en: "Build a café management system: dashboard (today's sales, best sellers, chart), point of sale with cart and printable receipt, menu (add/edit items and prices), tables (free/busy), stock with low-stock alerts, daily and monthly reports. Logins: manager admin / admin123 and cashier cashier / 1234. Prices in IQD.",
    }),
    T("🛒", { ckb: "دوکان و سوپەرمارکێت", ar: "متجر وسوبرماركت", en: "Shop & supermarket" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی دوکان دروست بکە: داشبۆرد، بەرهەمەکان (بارکۆد، نرخی کڕین و فرۆشتن، بڕ)، فرۆشتن بە سەبەتە و پسوولە، کڕیاران و قەرز، کۆگا و ئاگاداری کەمبوونەوە، ڕاپۆرتی قازانج. چوونەژوورەوە: admin / admin123 و کاشێر cashier / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة متجر: لوحة تحكم، المنتجات (باركود، سعر الشراء والبيع، الكمية)، البيع بسلة وفاتورة، العملاء والديون، المخزون مع تنبيه النقص، تقرير الأرباح. الدخول: admin / admin123 والكاشير cashier / 1234. الأسعار بالدينار.",
      en: "Build a shop management system: dashboard, products (barcode, cost and sale price, quantity), sales with cart and receipt, customers and debts, stock with low-stock alerts, profit report. Logins: admin / admin123 and cashier cashier / 1234. Prices in IQD.",
    }),
    T("💊", { ckb: "دەرمانخانە", ar: "صيدلية", en: "Pharmacy" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی دەرمانخانە دروست بکە: داشبۆرد، دەرمانەکان (ناو، بڕ، نرخ، بەرواری بەسەرچوون)، فرۆشتن بە پسوولە، ئاگاداری بەسەرچوون و کەمبوونەوە، دابینکەران و کڕین، ڕاپۆرتی ڕۆژانە و مانگانە. چوونەژوورەوە: دەرمانساز admin / admin123 و کاشێر cashier / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة صيدلية: لوحة تحكم، الأدوية (الاسم، الكمية، السعر، تاريخ الانتهاء)، البيع بفاتورة، تنبيهات الانتهاء والنقص، الموردون والمشتريات، تقارير يومية وشهرية. الدخول: الصيدلي admin / admin123 والكاشير cashier / 1234. الأسعار بالدينار.",
      en: "Build a pharmacy management system: dashboard, medicines (name, quantity, price, expiry date), sales with receipt, expiry and low-stock alerts, suppliers and purchases, daily and monthly reports. Logins: pharmacist admin / admin123 and cashier cashier / 1234. Prices in IQD.",
    }),
    T("🏥", { ckb: "کلینیک و نۆڕینگە", ar: "عيادة", en: "Clinic" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کلینیک دروست بکە: داشبۆرد (نۆرەکانی ئەمڕۆ)، نەخۆشەکان (زانیاری و مێژووی نەخۆشی)، نۆرەکان (کات و دکتۆر)، ڕەچەتە (دەرمان و ڕێنمایی، چاپکراو)، پارەدان و پسوولە، ڕاپۆرتی مانگانە. چوونەژوورەوە: دکتۆر admin / admin123 و سکرتێر reception / 1234.",
      ar: "أنشئ نظام إدارة عيادة: لوحة تحكم (مواعيد اليوم)، المرضى (البيانات والتاريخ المرضي)، المواعيد (الوقت والطبيب)، الوصفات (الأدوية والتعليمات، قابلة للطباعة)، الدفعات والفواتير، تقرير شهري. الدخول: الطبيب admin / admin123 والاستقبال reception / 1234.",
      en: "Build a clinic management system: dashboard (today's appointments), patients (details and history), appointments (time and doctor), prescriptions (medicines and instructions, printable), payments and receipts, monthly report. Logins: doctor admin / admin123 and reception reception / 1234.",
    }),
    T("🏫", { ckb: "قوتابخانە", ar: "مدرسة", en: "School" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی قوتابخانە دروست بکە: داشبۆرد، قوتابیان (پۆل و زانیاری)، مامۆستایان، ئامادەبوونی ڕۆژانە، نمرەکان و کارنامەی چاپکراو، پارەی خوێندن. چوونەژوورەوە: بەڕێوەبەر admin / admin123 و مامۆستا teacher / 1234.",
      ar: "أنشئ نظام إدارة مدرسة: لوحة تحكم، الطلاب (الصف والبيانات)، المعلمون، الحضور اليومي، الدرجات وكشف قابل للطباعة، الرسوم الدراسية. الدخول: المدير admin / admin123 والمعلم teacher / 1234.",
      en: "Build a school management system: dashboard, students (class and details), teachers, daily attendance, grades and a printable report card, tuition fees. Logins: principal admin / admin123 and teacher teacher / 1234.",
    }),
    T("🏋️", { ckb: "جیم و وەرزش", ar: "نادي رياضي", en: "Gym & fitness" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی جیم دروست بکە: داشبۆرد (ئەندامە چالاکەکان، بەشدارییە بەسەرچووەکان)، ئەندامەکان (وێنە، تەلەفۆن، جۆری بەشداری)، بەشدارییەکان و نوێکردنەوە بە پسوولە، ئامادەبوونی ڕۆژانە، ڕاهێنەران و پلانی ڕاهێنان، ڕاپۆرتی داهات. چوونەژوورەوە: admin / admin123 و ڕاهێنەر coach / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة نادٍ رياضي: لوحة تحكم (الأعضاء النشطون، الاشتراكات المنتهية)، الأعضاء (صورة، هاتف، نوع الاشتراك)، الاشتراكات والتجديد بفاتورة، الحضور اليومي، المدربون وخطط التمارين، تقرير الإيرادات. الدخول: admin / admin123 والمدرب coach / 1234. الأسعار بالدينار.",
      en: "Build a gym management system: dashboard (active members, expired memberships), members (photo, phone, plan), memberships and renewals with receipt, daily check-ins, coaches and workout plans, income report. Logins: admin / admin123 and coach coach / 1234. Prices in IQD.",
    }),
    T("📦", { ckb: "کۆگا", ar: "مستودع", en: "Warehouse & inventory" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی کۆگا دروست بکە: داشبۆرد، کاڵاکان (کۆد، شوێن، بڕ)، هاتنە ژوورەوەی کاڵا، دەرچوونی کاڵا، دابینکەران، ڕاپۆرتی جووڵە و کەمبوونەوە. چوونەژوورەوە: admin / admin123 و کارمەند staff / 1234.",
      ar: "أنشئ نظام إدارة مستودع: لوحة تحكم، الأصناف (الرمز، الموقع، الكمية)، إدخال البضاعة، إخراج البضاعة، الموردون، تقرير الحركة والنقص. الدخول: admin / admin123 والموظف staff / 1234.",
      en: "Build a warehouse management system: dashboard, items (code, location, quantity), goods in, goods out, suppliers, movement and low-stock report. Logins: admin / admin123 and staff staff / 1234.",
    }),
    T("👥", { ckb: "کارمەندان و مووچە", ar: "الموظفون والرواتب", en: "HR & payroll" }, {
      ckb: "سیستەمێکی کارمەندان و مووچە دروست بکە: داشبۆرد، کارمەندان (پۆست، بەش، مووچەی بنەڕەت)، ئامادەبوون و مۆڵەت، مووچەی مانگانە (پاداشت و بڕین)، پسوولەی مووچەی چاپکراو، ڕاپۆرتی خەرجی مووچە. چوونەژوورەوە: admin / admin123 و ژمێریار accountant / 1234. بە دینار.",
      ar: "أنشئ نظام موظفين ورواتب: لوحة تحكم، الموظفون (المنصب، القسم، الراتب الأساسي)، الحضور والإجازات، الرواتب الشهرية (مكافآت وخصومات)، قسيمة راتب قابلة للطباعة، تقرير الرواتب. الدخول: admin / admin123 والمحاسب accountant / 1234. بالدينار.",
      en: "Build an HR and payroll system: dashboard, employees (position, department, base salary), attendance and leave, monthly payroll (bonuses and deductions), printable payslip, payroll report. Logins: admin / admin123 and accountant accountant / 1234. In IQD.",
    }),
    T("📒", { ckb: "ژمێریاری", ar: "المحاسبة", en: "Accounting" }, {
      ckb: "سیستەمێکی ژمێریاری بۆ کۆمپانیایەکی بچووک دروست بکە: داشبۆرد (داهات، خەرجی، قازانج، چارت)، داهاتەکان، خەرجییەکان بە جۆر، کڕیاران و قەرزەکان، پسوولەی فرۆشتن (چاپکراو)، ڕاپۆرتی مانگانە و ساڵانە. چوونەژوورەوە: admin / admin123. بە دینار.",
      ar: "أنشئ نظام محاسبة لشركة صغيرة: لوحة تحكم (الإيرادات، المصروفات، الربح، رسم بياني)، الإيرادات، المصروفات حسب النوع، العملاء والديون، فواتير البيع (للطباعة)، تقارير شهرية وسنوية. الدخول: admin / admin123. بالدينار.",
      en: "Build an accounting system for a small company: dashboard (income, expenses, profit, chart), income, expenses by category, customers and debts, printable sales invoices, monthly and yearly reports. Login: admin / admin123. In IQD.",
    }),
    T("🏠", { ckb: "خانووبەرە و عەقارات", ar: "عقارات", en: "Real estate" }, {
      ckb: "سیستەمێکی نووسینگەی خانووبەرە دروست بکە: داشبۆرد، موڵکەکان (خانوو، شوقە، زەوی، بە وێنە و نرخ و ڕووبەر)، فرۆشتن و بەکرێدان، کڕیار و خاوەن موڵک، گرێبەستی چاپکراو، ڕاپۆرتی کۆمیشن. چوونەژوورەوە: admin / admin123 و بریکار agent / 1234. نرخ بە دۆلار و دینار.",
      ar: "أنشئ نظام مكتب عقارات: لوحة تحكم، العقارات (بيت، شقة، أرض، بالصور والسعر والمساحة)، البيع والإيجار، المشترون والمالكون، عقد قابل للطباعة، تقرير العمولات. الدخول: admin / admin123 والوكيل agent / 1234. الأسعار بالدولار والدينار.",
      en: "Build a real estate office system: dashboard, properties (house, flat, land, with photos, price and area), sales and rentals, buyers and owners, printable contract, commission report. Logins: admin / admin123 and agent agent / 1234. Prices in USD and IQD.",
    }),
    T("💇", { ckb: "ساڵۆن و جوانکاری", ar: "صالون تجميل", en: "Salon & beauty" }, {
      ckb: "سیستەمێکی ساڵۆن دروست بکە: داشبۆرد (نۆرەکانی ئەمڕۆ)، نۆرەکان (کات، کارمەند، خزمەتگوزاری)، خزمەتگوزارییەکان و نرخ، کڕیاران و مێژوویان، فرۆشتن بە پسوولە، ڕاپۆرتی داهات بە کارمەند. چوونەژوورەوە: admin / admin123 و کارمەند staff / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام صالون: لوحة تحكم (مواعيد اليوم)، المواعيد (الوقت، الموظف، الخدمة)، الخدمات والأسعار، العملاء وسجلهم، البيع بفاتورة، تقرير الإيرادات حسب الموظف. الدخول: admin / admin123 والموظف staff / 1234. الأسعار بالدينار.",
      en: "Build a salon system: dashboard (today's bookings), appointments (time, staff, service), services and prices, customers and their history, sales with receipt, income report by staff. Logins: admin / admin123 and staff staff / 1234. Prices in IQD.",
    }),
    T("🏨", { ckb: "هۆتێل", ar: "فندق", en: "Hotel" }, {
      ckb: "سیستەمێکی بەڕێوەبردنی هۆتێل دروست بکە: داشبۆرد (ژووری بەتاڵ و پڕ)، ژوورەکان (جۆر، نرخی شەو، دۆخ)، حجزکردن (هاتن و ڕۆیشتن)، میوانەکان، پسوولەی کۆتایی چاپکراو، ڕاپۆرتی پڕبوون و داهات. چوونەژوورەوە: admin / admin123 و پێشوازی reception / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام إدارة فندق: لوحة تحكم (الغرف الفارغة والمشغولة)، الغرف (النوع، سعر الليلة، الحالة)، الحجوزات (الوصول والمغادرة)، النزلاء، فاتورة نهائية للطباعة، تقرير الإشغال والإيرادات. الدخول: admin / admin123 والاستقبال reception / 1234. الأسعار بالدينار.",
      en: "Build a hotel management system: dashboard (free and busy rooms), rooms (type, nightly price, status), bookings (check-in and check-out), guests, printable final bill, occupancy and income report. Logins: admin / admin123 and reception reception / 1234. Prices in IQD.",
    }),
    T("📱", { ckb: "دوکانی مۆبایل", ar: "محل موبايلات", en: "Mobile phone shop" }, {
      ckb: "سیستەمێکی دوکانی مۆبایل دروست بکە: داشبۆرد، مۆبایل و ئێکسسوارات (IMEI، نرخی کڕین و فرۆشتن)، فرۆشتن بە پسوولە و گەرەنتی، قیست و قەرزی کڕیاران، چاککردنەوەی مۆبایل (وەرگرتن، دۆخ، گەڕاندنەوە)، ڕاپۆرتی قازانج. چوونەژوورەوە: admin / admin123. نرخ بە دینار.",
      ar: "أنشئ نظام محل موبايلات: لوحة تحكم، الأجهزة والإكسسوارات (IMEI، سعر الشراء والبيع)، البيع بفاتورة وضمان، الأقساط وديون العملاء، صيانة الأجهزة (استلام، حالة، تسليم)، تقرير الأرباح. الدخول: admin / admin123. الأسعار بالدينار.",
      en: "Build a mobile phone shop system: dashboard, phones and accessories (IMEI, cost and sale price), sales with receipt and warranty, installments and customer debts, phone repairs (received, status, returned), profit report. Login: admin / admin123. Prices in IQD.",
    }),
    T("🔧", { ckb: "گەراج و چاککردنەوە", ar: "ورشة تصليح", en: "Repair workshop" }, {
      ckb: "سیستەمێکی گەراج دروست بکە: داشبۆرد (ئۆتۆمبێلی ناو گەراج)، کاری چاککردنەوە (ئۆتۆمبێل، کێشە، وەستا، دۆخ)، پارچەکان و کۆگا، کڕیاران و ئۆتۆمبێلەکانیان، پسوولەی کار و پارچە (چاپکراو)، ڕاپۆرتی داهات. چوونەژوورەوە: admin / admin123 و وەستا mechanic / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام ورشة سيارات: لوحة تحكم (السيارات في الورشة)، أوامر التصليح (السيارة، العطل، الفني، الحالة)، قطع الغيار والمخزون، العملاء وسياراتهم، فاتورة العمل والقطع (للطباعة)، تقرير الإيرادات. الدخول: admin / admin123 والفني mechanic / 1234. الأسعار بالدينار.",
      en: "Build a car repair workshop system: dashboard (cars in the workshop), repair jobs (car, problem, mechanic, status), spare parts and stock, customers and their cars, printable invoice for labour and parts, income report. Logins: admin / admin123 and mechanic mechanic / 1234. Prices in IQD.",
    }),
    T("📘", { ckb: "سەنتەری خول و کۆرس", ar: "مركز تدريب", en: "Training center" }, {
      ckb: "سیستەمێکی سەنتەری خول دروست بکە: داشبۆرد، خولەکان (مامۆستا، کات، نرخ، ژمارەی جێگا)، قوتابیان و تۆمارکردن، ئامادەبوون، پارەدان و پسوولە، بڕوانامەی چاپکراو. چوونەژوورەوە: admin / admin123 و مامۆستا teacher / 1234. نرخ بە دینار.",
      ar: "أنشئ نظام مركز تدريب: لوحة تحكم، الدورات (المدرب، الوقت، السعر، عدد المقاعد)، الطلاب والتسجيل، الحضور، الدفعات والفواتير، شهادة قابلة للطباعة. الدخول: admin / admin123 والمدرب teacher / 1234. الأسعار بالدينار.",
      en: "Build a training center system: dashboard, courses (teacher, time, price, seats), students and enrolment, attendance, payments and receipts, printable certificate. Logins: admin / admin123 and teacher teacher / 1234. Prices in IQD.",
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
    T("👤", { ckb: "پۆرتفۆلیۆ و سیڤی", ar: "ملف أعمال وسيرة ذاتية", en: "Portfolio & CV" }, {
      ckb: "وێبسایتێکی پۆرتفۆلیۆی کەسی دروست بکە: دەربارەی من، توانستەکان، کارەکانم (بە وێنە و لینک)، ئەزموون، سیڤی بۆ داگرتن، پەیوەندی.",
      ar: "أنشئ موقع ملف أعمال شخصي: نبذة عني، المهارات، أعمالي (بالصور والروابط)، الخبرات، سيرة ذاتية للتحميل، تواصل.",
      en: "Build a personal portfolio website: about me, skills, my work (with images and links), experience, downloadable CV, contact.",
    }),
    T("🛍️", { ckb: "دوکانی ئۆنلاین", ar: "متجر إلكتروني", en: "Online shop" }, {
      ckb: "وێبسایتێکی دوکانی ئۆنلاین دروست بکە: لاپەڕەی سەرەکی، بەرهەمەکان بە گەڕان و فلتەر، لاپەڕەی بەرهەم، سەبەتە، داواکردن لە ڕێگەی واتسئاپ، پەیوەندی. نرخ بە دینار.",
      ar: "أنشئ متجراً إلكترونياً: الرئيسية، المنتجات مع بحث وتصفية، صفحة المنتج، السلة، الطلب عبر واتساب، تواصل. الأسعار بالدينار.",
      en: "Build an online shop website: home, products with search and filters, product page, cart, order via WhatsApp, contact. Prices in IQD.",
    }),
    T("🏥", { ckb: "کلینیک و نۆڕینگە", ar: "عيادة", en: "Clinic" }, {
      ckb: "وێبسایتێک بۆ کلینیکێک دروست بکە: لاپەڕەی سەرەکی، دکتۆرەکان و پسپۆڕییەکانیان، خزمەتگوزارییەکان، فۆرمی وەرگرتنی نۆرە، ئامۆژگاری تەندروستی، پەیوەندی و نەخشە.",
      ar: "أنشئ موقعاً لعيادة: الرئيسية، الأطباء وتخصصاتهم، الخدمات، نموذج حجز موعد، نصائح صحية، تواصل وخريطة.",
      en: "Build a clinic website: home, doctors and their specialties, services, appointment booking form, health tips, contact and map.",
    }),
    T("🏫", { ckb: "قوتابخانە", ar: "مدرسة", en: "School" }, {
      ckb: "وێبسایتێک بۆ قوتابخانەیەک دروست بکە: لاپەڕەی سەرەکی، دەربارەی قوتابخانە، مامۆستایان، چالاکی و هەواڵەکان، فۆرمی ناونووسین، پەیوەندی.",
      ar: "أنشئ موقعاً لمدرسة: الرئيسية، عن المدرسة، المعلمون، الأنشطة والأخبار، نموذج التسجيل، تواصل.",
      en: "Build a school website: home, about the school, teachers, activities and news, registration form, contact.",
    }),
    T("🏋️", { ckb: "جیم و وەرزش", ar: "نادي رياضي", en: "Gym & fitness" }, {
      ckb: "وێبسایتێکی بەهێز بۆ جیمێک دروست بکە: لاپەڕەی سەرەکی، پلانەکانی بەشداری و نرخ (بە دینار)، ڕاهێنەران، خشتەی خولەکان، گەلەری، پەیوەندی و فۆرمی بەشداری.",
      ar: "أنشئ موقعاً قوياً لنادٍ رياضي: الرئيسية، خطط الاشتراك والأسعار (بالدينار)، المدربون، جدول الحصص، معرض الصور، تواصل ونموذج اشتراك.",
      en: "Build a bold gym website: home, membership plans and prices (IQD), coaches, class timetable, gallery, contact and sign-up form.",
    }),
    T("🏠", { ckb: "خانووبەرە و عەقارات", ar: "عقارات", en: "Real estate" }, {
      ckb: "وێبسایتێک بۆ نووسینگەی خانووبەرە دروست بکە: لاپەڕەی سەرەکی بە گەڕان، لیستی موڵکەکان (فلتەری شار، جۆر، نرخ)، لاپەڕەی موڵک بە وێنە، فرۆشتن یان بەکرێدان، دەربارەمان، پەیوەندی.",
      ar: "أنشئ موقعاً لمكتب عقارات: الرئيسية مع بحث، قائمة العقارات (تصفية بالمدينة والنوع والسعر)، صفحة العقار بالصور، بيع أو إيجار، من نحن، تواصل.",
      en: "Build a real estate website: home with search, property listings (filter by city, type, price), property page with photos, sale or rent, about us, contact.",
    }),
    T("🏨", { ckb: "هۆتێل", ar: "فندق", en: "Hotel" }, {
      ckb: "وێبسایتێکی شیک بۆ هۆتێلێک دروست بکە: لاپەڕەی سەرەکی، ژوورەکان و نرخ، خزمەتگوزارییەکان، گەلەری، فۆرمی حجزکردن، پەیوەندی و نەخشە.",
      ar: "أنشئ موقعاً أنيقاً لفندق: الرئيسية، الغرف والأسعار، الخدمات، معرض الصور، نموذج الحجز، تواصل وخريطة.",
      en: "Build an elegant hotel website: home, rooms and prices, amenities, gallery, booking form, contact and map.",
    }),
    T("💇", { ckb: "ساڵۆن و جوانکاری", ar: "صالون تجميل", en: "Salon & beauty" }, {
      ckb: "وێبسایتێکی جوان بۆ ساڵۆنێک دروست بکە: لاپەڕەی سەرەکی، خزمەتگوزارییەکان و نرخ، کارەکانمان (پێش و دوای)، تیمەکەمان، فۆرمی وەرگرتنی نۆرە، پەیوەندی.",
      ar: "أنشئ موقعاً جميلاً لصالون: الرئيسية، الخدمات والأسعار، أعمالنا (قبل وبعد)، فريقنا، نموذج حجز موعد، تواصل.",
      en: "Build a beautiful salon website: home, services and prices, our work (before and after), our team, booking form, contact.",
    }),
    T("✈️", { ckb: "کۆمپانیای گەشت", ar: "شركة سياحة", en: "Travel agency" }, {
      ckb: "وێبسایتێک بۆ کۆمپانیایەکی گەشت دروست بکە: لاپەڕەی سەرەکی، گەشتەکان (شوێن، ماوە، نرخ)، لاپەڕەی گەشت بە وێنە و بەرنامە، ڤیزا و خزمەتگوزارییەکان، فۆرمی حجزکردن، پەیوەندی.",
      ar: "أنشئ موقعاً لشركة سياحة: الرئيسية، الرحلات (الوجهة، المدة، السعر)، صفحة الرحلة بالصور والبرنامج، التأشيرات والخدمات، نموذج الحجز، تواصل.",
      en: "Build a travel agency website: home, trips (destination, length, price), trip page with photos and programme, visas and services, booking form, contact.",
    }),
    T("📰", { ckb: "هەواڵ و گۆڤار", ar: "أخبار ومجلة", en: "News & magazine" }, {
      ckb: "وێبسایتێکی هەواڵ دروست بکە: لاپەڕەی سەرەکی (هەواڵی گرنگ و تازە)، بەشەکان (سیاسەت، وەرزش، تەکنەلۆجیا…)، لاپەڕەی وتار، گەڕان، دەربارەمان، پەیوەندی.",
      ar: "أنشئ موقع أخبار: الرئيسية (العاجل والأحدث)، الأقسام (سياسة، رياضة، تقنية…)، صفحة المقال، بحث، من نحن، تواصل.",
      en: "Build a news website: home (top and latest stories), sections (politics, sport, tech…), article page, search, about us, contact.",
    }),
    T("🎉", { ckb: "ڕێکخستنی ئاهەنگ", ar: "تنظيم الحفلات", en: "Events & halls" }, {
      ckb: "وێبسایتێک بۆ هۆڵی ئاهەنگ دروست بکە: لاپەڕەی سەرەکی، هۆڵەکان و پاکێجەکان بە نرخ، گەلەری ئاهەنگەکان، ڕۆژە بەتاڵەکان، فۆرمی حجزکردن، پەیوەندی.",
      ar: "أنشئ موقعاً لقاعة حفلات: الرئيسية، القاعات والباقات بالأسعار، معرض الحفلات، الأيام المتاحة، نموذج الحجز، تواصل.",
      en: "Build a website for an event hall: home, halls and packages with prices, event gallery, free dates, booking form, contact.",
    }),
    T("🏗️", { ckb: "کۆمپانیای بیناسازی", ar: "شركة مقاولات", en: "Construction company" }, {
      ckb: "وێبسایتێک بۆ کۆمپانیایەکی بیناسازی دروست بکە: لاپەڕەی سەرەکی، خزمەتگوزارییەکان، پڕۆژە تەواوکراوەکان بە وێنە، تیم و ئامێرەکان، داواکردنی نرخ، پەیوەندی.",
      ar: "أنشئ موقعاً لشركة مقاولات: الرئيسية، الخدمات، المشاريع المنجزة بالصور، الفريق والمعدات، طلب عرض سعر، تواصل.",
      en: "Build a construction company website: home, services, finished projects with photos, team and equipment, request a quote, contact.",
    }),
  ],
  app: [
    T("💰", { ckb: "خەرجی و بودجە", ar: "المصاريف والميزانية", en: "Expenses & budget" }, {
      ckb: "ئەپێکی تۆمارکردنی خەرجی دروست بکە: زیادکردنی خەرجی (بڕ، جۆر، بەروار)، لیستی خەرجییەکان، چارتی مانگانە بە جۆر، بودجەی مانگانە بە ئاگاداری، پاشەکەوت لەسەر مۆبایل. بە دینار.",
      ar: "أنشئ تطبيق تسجيل المصاريف: إضافة مصروف (المبلغ، النوع، التاريخ)، قائمة المصاريف، رسم شهري حسب النوع، ميزانية شهرية مع تنبيه، الحفظ على الهاتف. بالدينار.",
      en: "Build an expense tracker app: add an expense (amount, category, date), expense list, monthly chart by category, monthly budget with alert, saved on the phone. In IQD.",
    }),
    T("✅", { ckb: "لیستی کار و پلان", ar: "المهام والتخطيط", en: "Tasks & planner" }, {
      ckb: "ئەپێکی لیستی کارەکان دروست بکە: زیادکردنی کار بە بەروار و گرنگی، تەواوکردن و سڕینەوە، فلتەر (ئەمڕۆ، داهاتوو، تەواوبوو)، ئامار، دۆخی تاریک.",
      ar: "أنشئ تطبيق قائمة مهام: إضافة مهمة بتاريخ وأولوية، إنجاز وحذف، تصفية (اليوم، القادم، المنجز)، إحصائيات، الوضع الليلي.",
      en: "Build a to-do list app: add tasks with date and priority, complete and delete, filters (today, upcoming, done), stats, dark mode.",
    }),
    T("🔤", { ckb: "فێربوونی وشە", ar: "تعلم الكلمات", en: "Learn words" }, {
      ckb: "ئەپێکی فێربوونی وشەی ئینگلیزی بۆ کورد دروست بکە: کارتی وشە (ئینگلیزی و کوردی)، تاقیکردنەوەی هەڵبژاردن، پێشکەوتن و خاڵ، وشەی ڕۆژ، زیادکردنی وشەی خۆت.",
      ar: "أنشئ تطبيقاً لتعلم الكلمات الإنجليزية: بطاقات كلمات (إنجليزي وعربي)، اختبار اختيار من متعدد، التقدم والنقاط، كلمة اليوم، إضافة كلماتك.",
      en: "Build an English vocabulary app: word cards (English and translation), multiple-choice quiz, progress and points, word of the day, add your own words.",
    }),
    T("🏃", { ckb: "ڕاهێنانی وەرزشی", ar: "التمارين الرياضية", en: "Workout" }, {
      ckb: "ئەپێکی وەرزش دروست بکە: پلانی ڕاهێنانی هەفتانە، کاتژمێری ڕاهێنان، تۆمارکردنی کێش، چارتی پێشکەوتن، ئامۆژگاری ڕۆژانە.",
      ar: "أنشئ تطبيق رياضة: خطة تمارين أسبوعية، مؤقت التمرين، تسجيل الوزن، رسم التقدم، نصيحة يومية.",
      en: "Build a workout app: weekly training plan, workout timer, weight log, progress chart, daily tip.",
    }),
    T("🔁", { ckb: "خووە باشەکان", ar: "العادات اليومية", en: "Habit tracker" }, {
      ckb: "ئەپێکی خووە ڕۆژانەکان دروست بکە: زیادکردنی خوو (وەک خوێندنەوە، ئاو خواردنەوە)، نیشانکردنی ڕۆژانە، زنجیرەی ڕۆژەکان 🔥، ڕۆژژمێری مانگانە، ئامار و چارت.",
      ar: "أنشئ تطبيق عادات يومية: إضافة عادة (مثل القراءة، شرب الماء)، تأشير يومي، سلسلة الأيام 🔥، تقويم شهري، إحصائيات ورسم بياني.",
      en: "Build a habit tracker app: add habits (reading, drinking water…), daily check-off, streaks 🔥, monthly calendar, stats and chart.",
    }),
    T("📝", { ckb: "تێبینی", ar: "الملاحظات", en: "Notes" }, {
      ckb: "ئەپێکی تێبینی دروست بکە: نووسینی تێبینی بە ناونیشان و ڕەنگ، بەشەکان (کار، ماڵ، خوێندن)، گەڕان، جێگیرکردنی گرنگەکان، سەبەتەی سڕاوەکان.",
      ar: "أنشئ تطبيق ملاحظات: كتابة ملاحظة بعنوان ولون، تصنيفات (عمل، منزل، دراسة)، بحث، تثبيت المهمة، سلة المحذوفات.",
      en: "Build a notes app: write notes with title and colour, folders (work, home, study), search, pin important notes, trash.",
    }),
    T("🕌", { ckb: "کاتی بانگ و زیکر", ar: "أوقات الصلاة والأذكار", en: "Prayer times & dhikr" }, {
      ckb: "ئەپێکی ئیسلامی دروست بکە: کاتەکانی بانگ بۆ شارەکانی کوردستان (هەولێر، سلێمانی، دهۆک، کەرکووک)، کاتی ماوە بۆ بانگی داهاتوو، تەسبیحی ژمێردار، زیکری بەیانی و ئێوارە، ئاراستەی قیبلە.",
      ar: "أنشئ تطبيقاً إسلامياً: أوقات الصلاة للمدن (أربيل، السليمانية، دهوك، كركوك)، الوقت المتبقي للأذان القادم، مسبحة إلكترونية، أذكار الصباح والمساء، اتجاه القبلة.",
      en: "Build an Islamic app: prayer times for Kurdistan cities (Erbil, Sulaymaniyah, Duhok, Kirkuk), countdown to the next prayer, tasbih counter, morning and evening dhikr, qibla direction.",
    }),
    T("🍳", { ckb: "ڕێچەتەی خواردن", ar: "وصفات الطبخ", en: "Recipes" }, {
      ckb: "ئەپێکی ڕێچەتەی خواردنی کوردی دروست بکە: لیستی خواردنەکان بە وێنە، بەشەکان (بەیانی، نیوەڕۆ، شیرینی)، لاپەڕەی ڕێچەتە (پێکهاتە و هەنگاو)، دڵخوازەکان، لیستی کڕین.",
      ar: "أنشئ تطبيق وصفات طبخ: قائمة الأطباق بالصور، أقسام (فطور، غداء، حلويات)، صفحة الوصفة (المكونات والخطوات)، المفضلة، قائمة التسوق.",
      en: "Build a recipes app: dishes with photos, categories (breakfast, lunch, sweets), recipe page (ingredients and steps), favourites, shopping list.",
    }),
    T("🧾", { ckb: "قەرز و حیساب", ar: "الديون والحسابات", en: "Debts" }, {
      ckb: "ئەپێکی تۆمارکردنی قەرز دروست بکە: کەسەکان، قەرزی وەرگیراو و دراو، پارەدانەوە بە بەشە، کۆی گشتی بۆ هەر کەسێک، ئاگاداری بەرواری دانەوە، ناردنی کورتە بە واتسئاپ. بە دینار.",
      ar: "أنشئ تطبيق تسجيل الديون: الأشخاص، الديون لك وعليك، السداد على دفعات، المجموع لكل شخص، تنبيه موعد السداد، إرسال ملخص عبر واتساب. بالدينار.",
      en: "Build a debts app: people, money owed to you and by you, partial payments, total per person, due-date reminders, share a summary on WhatsApp. In IQD.",
    }),
    T("🧠", { ckb: "یاری پرسیار و وەڵام", ar: "مسابقة أسئلة", en: "Quiz game" }, {
      ckb: "یارییەکی پرسیار و وەڵام بە کوردی دروست بکە: بەشەکان (مێژوو، زانست، وەرزش، کوردستان)، کاتژمێر بۆ هەر پرسیارێک، خاڵ و ئاست، باشترین ئەنجامەکان، دەنگ و جووڵەی جوان.",
      ar: "أنشئ لعبة أسئلة وأجوبة: أقسام (تاريخ، علوم، رياضة، جغرافيا)، مؤقت لكل سؤال، نقاط ومستويات، أفضل النتائج، أصوات وحركات جميلة.",
      en: "Build a quiz game app: categories (history, science, sport, geography), a timer per question, points and levels, best scores, nice sounds and animations.",
    }),
    T("🛍️", { ckb: "لیستی کڕین", ar: "قائمة التسوق", en: "Shopping list" }, {
      ckb: "ئەپێکی لیستی کڕین دروست بکە: چەند لیستێک (بازاڕ، دەرمانخانە)، زیادکردنی کاڵا بە بڕ و نرخ، نیشانکردنی کڕاوەکان، کۆی گشتی نرخ بە دینار، کاڵا دووبارەکان بە یەک دەست لێدان.",
      ar: "أنشئ تطبيق قائمة تسوق: عدة قوائم (سوق، صيدلية)، إضافة صنف بالكمية والسعر، تأشير المشتريات، المجموع بالدينار، إعادة الأصناف المتكررة بلمسة.",
      en: "Build a shopping list app: several lists (market, pharmacy), add items with quantity and price, tick bought items, total in IQD, re-add frequent items with one tap.",
    }),
    T("🍔", { ckb: "داواکردنی خواردن", ar: "طلب الطعام", en: "Food ordering" }, {
      ckb: "ئەپێکی داواکردنی خواردن بۆ چێشتخانەیەک دروست بکە: مینیو بە بەش و وێنە، وردەکاری خواردن، سەبەتە، ناردنی داواکاری بە واتسئاپ، مێژووی داواکارییەکان، دڵخوازەکان. نرخ بە دینار.",
      ar: "أنشئ تطبيق طلب طعام لمطعم: قائمة بأقسام وصور، تفاصيل الطبق، السلة، إرسال الطلب عبر واتساب، سجل الطلبات، المفضلة. الأسعار بالدينار.",
      en: "Build a food ordering app for a restaurant: menu with categories and photos, item details, cart, send the order on WhatsApp, order history, favourites. Prices in IQD.",
    }),
    T("💧", { ckb: "تەندروستی و ئاو", ar: "الصحة وشرب الماء", en: "Health & water" }, {
      ckb: "ئەپێکی تەندروستی دروست بکە: ژمارەی پەرداخی ئاوی ڕۆژانە، کاتی خەو، ژمارەی هەنگاو (تۆمارکردنی دەستی)، کاتی دەرمان، چارتی هەفتانە.",
      ar: "أنشئ تطبيق صحة: عدد أكواب الماء اليومية، ساعات النوم، عدد الخطوات (تسجيل يدوي)، مواعيد الدواء، رسم أسبوعي.",
      en: "Build a health app: daily glasses of water, sleep hours, steps (entered by hand), medicine times, weekly chart.",
    }),
    T("📖", { ckb: "خوێندنی قوتابی", ar: "الدراسة والطلاب", en: "Study planner" }, {
      ckb: "ئەپێکی خوێندن بۆ قوتابی دروست بکە: خشتەی وانەکان، ئەرکەکان بە بەرواری ڕادەست، کاتژمێری پۆمۆدۆرۆ، نمرەکان و تێکڕا، تێبینی هەر وانەیەک.",
      ar: "أنشئ تطبيق دراسة للطلاب: جدول الحصص، الواجبات بموعد التسليم، مؤقت بومودورو، الدرجات والمعدل، ملاحظات لكل مادة.",
      en: "Build a study app for students: class timetable, homework with due dates, pomodoro timer, grades and average, notes per subject.",
    }),
  ],
};

export const templatesFor = (kind) => TEMPLATES[kind] || [];
