// All app text in 3 languages. Add a key here, then use t("key") in the app.
export const LANGS = [
  { id: "ckb", name: "کوردی", dir: "rtl" },
  { id: "ar", name: "العربية", dir: "rtl" },
  { id: "en", name: "English", dir: "ltr" },
];

export const dirOf = (lang) => (LANGS.find((l) => l.id === lang) || LANGS[0]).dir;

const T = {
  tagline: { ckb: "پرسیار بکە، کۆد بنووسە، وێبسایت و ئەپ دروست بکە", ar: "اسأل، اكتب الكود، وأنشئ المواقع والتطبيقات", en: "Ask, write code, build websites and apps" },
  login: { ckb: "چوونەژوورەوە", ar: "تسجيل الدخول", en: "Log in" },
  signup: { ckb: "دروستکردنی هەژمار", ar: "إنشاء حساب", en: "Create account" },
  reset: { ckb: "گۆڕینی وشەی نهێنی", ar: "إعادة تعيين كلمة المرور", en: "Reset password" },
  email: { ckb: "ئیمەیڵ", ar: "البريد الإلكتروني", en: "Email" },
  password: { ckb: "وشەی نهێنی", ar: "كلمة المرور", en: "Password" },
  haveAccount: { ckb: "هەژمارم هەیە، چوونەژوورەوە", ar: "لدي حساب، تسجيل الدخول", en: "I have an account — log in" },
  noAccount: { ckb: "هەژمارت نییە؟", ar: "ليس لديك حساب؟", en: "No account?" },
  signupLink: { ckb: "خۆت تۆمار بکە", ar: "سجّل الآن", en: "Sign up" },
  forgot: { ckb: "وشەی نهێنیت لەبیرچووە؟", ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  checkEmail: { ckb: "✅ ئیمەیڵێکی پشتڕاستکردنەوەمان بۆ ناردیت. بیکەرەوە و لەسەر لینکەکە دابگرە.", ar: "✅ أرسلنا لك رسالة تأكيد. افتحها واضغط على الرابط.", en: "✅ We sent you a confirmation email. Open it and tap the link." },
  resetSent: { ckb: "✅ لینکی گۆڕینی وشەی نهێنی بۆ ئیمەیڵەکەت نێردرا.", ar: "✅ تم إرسال رابط إعادة التعيين إلى بريدك.", en: "✅ A reset link was sent to your email." },
  errLogin: { ckb: "ئیمەیڵ یان وشەی نهێنی هەڵەیە.", ar: "البريد أو كلمة المرور غير صحيحة.", en: "Wrong email or password." },
  errConfirm: { ckb: "سەرەتا ئیمەیڵەکەت پشتڕاست بکەرەوە.", ar: "يرجى تأكيد بريدك الإلكتروني أولاً.", en: "Please confirm your email first." },
  errExists: { ckb: "ئەم ئیمەیڵە پێشتر تۆمار کراوە.", ar: "هذا البريد مسجل مسبقاً.", en: "This email is already registered." },
  errWeak: { ckb: "وشەی نهێنی بەهێزتر هەڵبژێرە (پیتی گەورە و بچووک و ژمارە).", ar: "اختر كلمة مرور أقوى (أحرف كبيرة وصغيرة وأرقام).", en: "Choose a stronger password (upper, lower case and numbers)." },
  errNetwork: { ckb: "پەیوەندی نەکرا. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدەرەوە.", ar: "تعذّر الاتصال. تحقق من الإنترنت وحاول مجدداً.", en: "Connection failed. Check your internet and try again." },
  error: { ckb: "هەڵە", ar: "خطأ", en: "Error" },

  chat: { ckb: "چات", ar: "دردشة", en: "Chat" },
  build: { ckb: "وێبسایت و ئەپ", ar: "مواقع وتطبيقات", en: "Websites & apps" },
  newChat: { ckb: "چاتی نوێ", ar: "دردشة جديدة", en: "New chat" },
  newProject: { ckb: "پرۆژەی نوێ", ar: "مشروع جديد", en: "New project" },
  history: { ckb: "گفتوگۆکان", ar: "المحادثات", en: "Chats" },
  projects: { ckb: "پرۆژەکان", ar: "المشاريع", en: "Projects" },
  noHistory: { ckb: "هێشتا هیچ نییە", ar: "لا يوجد شيء بعد", en: "Nothing yet" },
  delete: { ckb: "سڕینەوە", ar: "حذف", en: "Delete" },
  confirmDelete: { ckb: "ئەم گفتوگۆیە بسڕدرێتەوە؟", ar: "حذف هذه المحادثة؟", en: "Delete this chat?" },
  settings: { ckb: "ڕێکخستنەکان", ar: "الإعدادات", en: "Settings" },
  language: { ckb: "زمانی ئەپ", ar: "لغة التطبيق", en: "App language" },
  account: { ckb: "هەژمار", ar: "الحساب", en: "Account" },
  logout: { ckb: "چوونەدەرەوە", ar: "تسجيل الخروج", en: "Log out" },
  close: { ckb: "داخستن", ar: "إغلاق", en: "Close" },
  menu: { ckb: "لیست", ar: "القائمة", en: "Menu" },

  free: { ckb: "بەخۆڕایی", ar: "مجاني", en: "Free" },
  left: { ckb: "ماوە", ar: "متبقٍ", en: "left" },
  questions: { ckb: "پرسیار", ar: "سؤال", en: "questions" },
  perMonth: { ckb: "/ مانگ", ar: "/ شهر", en: "/ month" },
  plans: { ckb: "پلانەکان", ar: "الخطط", en: "Plans" },
  currentPlan: { ckb: "پلانی ئێستات", ar: "خطتك الحالية", en: "Your plan" },
  best: { ckb: "باشترین", ar: "الأفضل", en: "Best" },
  upLimit: { ckb: "پرسیارەکانت تەواو بوون. بۆ بەردەوامبوون پلانێک هەڵبژێرە.", ar: "انتهت أسئلتك. اختر خطة للمتابعة.", en: "You have used all your questions. Choose a plan to continue." },
  upPro: { ckb: "ناردنی فایل تایبەتە بە بەکارهێنەرانی Pro.", ar: "إرسال الملفات متاح لمشتركي Pro فقط.", en: "Sending files is for Pro users." },
  upInfo: { ckb: "پلانێک هەڵبژێرە کە لەگەڵ کارەکەت بگونجێت.", ar: "اختر الخطة المناسبة لعملك.", en: "Pick the plan that fits your work." },
  perk1: { ckb: "ناردنی فایلی کۆد و داگرتنی فایلی چاککراو", ar: "إرسال ملفات الكود وتنزيل الملف المُصلَح", en: "Send code files and download the fixed file" },
  perk2: { ckb: "دروستکردنی وێبسایت و ئەپی گەورەتر", ar: "إنشاء مواقع وتطبيقات أكبر", en: "Build bigger websites and apps" },
  buyTelegram: { ckb: "کڕین لە تەلەگرام", ar: "الشراء عبر تيليجرام", en: "Buy on Telegram" },
  botSoon: { ckb: "بۆتی تەلەگرام بەم زووانە ئامادە دەبێت.", ar: "بوت تيليجرام سيكون جاهزاً قريباً.", en: "The Telegram bot is coming soon." },

  helpQ: { ckb: "چۆن دەتوانم یارمەتیت بدەم؟", ar: "كيف يمكنني مساعدتك؟", en: "How can I help you?" },
  helpSub: { ckb: "بە کوردی، عەرەبی یان ئینگلیزی بپرسە.", ar: "اسأل بالكردية أو العربية أو الإنجليزية.", en: "Ask in Kurdish, Arabic or English." },
  buildQ: { ckb: "چ وێبسایت یان ئەپێک دروست بکەین؟", ar: "ما الموقع أو التطبيق الذي نبنيه؟", en: "What should we build?" },
  buildSub: { ckb: "بە شێوەی زیندوو لە ناو مۆبایلدا دەیبینیت، و دەتوانیت بە ZIP دایبگریت.", ar: "ستراه مباشرة داخل الهاتف، ويمكنك تنزيله ZIP.", en: "See it live inside a phone and download it as a ZIP." },
  chatSugg: {
    ckb: ["ڕوونکردنەوەیەک بدە لەسەر زیرەکی دەستکرد", "فەنکشنێکی Python بنووسە بۆ ڕیزکردنی لیست", "پێشبینی یاری داهاتووی ڕیال مەدرید چییە؟"],
    ar: ["اشرح لي الذكاء الاصطناعي ببساطة", "اكتب دالة Python لترتيب قائمة", "ما توقعك لمباراة ريال مدريد القادمة؟"],
    en: ["Explain artificial intelligence simply", "Write a Python function to sort a list", "What's your prediction for Real Madrid's next match?"],
  },
  buildSugg: {
    ckb: ["وێبسایتێکی جوان بۆ چێشتخانەیەک دروست بکە", "ئەپێکی لیستی کار (To-do) بە کوردی", "ئەپێکی ژمێرەری خەرجی ڕۆژانە"],
    ar: ["أنشئ موقعاً جميلاً لمطعم", "تطبيق قائمة مهام بالعربية", "تطبيق لحساب المصاريف اليومية"],
    en: ["Build a beautiful restaurant website", "A to-do list app", "A daily expense tracker app"],
  },
  placeholder: { ckb: "پەیامێک بنووسە...", ar: "اكتب رسالة...", en: "Write a message..." },
  placeholderFile: { ckb: "چی بکەم بەم فایلە؟", ar: "ماذا أفعل بهذا الملف؟", en: "What should I do with this file?" },
  placeholderBuild: { ckb: "وێبسایت یان ئەپەکەت وەسف بکە...", ar: "صف موقعك أو تطبيقك...", en: "Describe your website or app..." },
  placeholderEdit: { ckb: "چی بگۆڕم یان زیاد بکەم؟", ar: "ماذا أغيّر أو أضيف؟", en: "What should I change or add?" },
  fixFile: { ckb: "هەڵەکانی ئەم فایلە بدۆزەرەوە و چاکیان بکە.", ar: "اعثر على أخطاء هذا الملف وأصلحها.", en: "Find and fix the bugs in this file." },
  attach: { ckb: "ناردنی فایل (Pro)", ar: "إرسال ملف (Pro)", en: "Send a file (Pro)" },
  send: { ckb: "ناردن", ar: "إرسال", en: "Send" },
  stop: { ckb: "ڕاگرتن", ar: "إيقاف", en: "Stop" },
  copy: { ckb: "کۆپی", ar: "نسخ", en: "Copy" },
  copied: { ckb: "کۆپی کرا", ar: "تم النسخ", en: "Copied" },
  thinking: { ckb: "بیر دەکاتەوە...", ar: "يفكّر...", en: "Thinking..." },
  downloadFixed: { ckb: "داگرتنی فایلی چاککراو", ar: "تنزيل الملف المُصلَح", en: "Download fixed file" },
  changes: { ckb: "گۆڕانکاری", ar: "تغيير", en: "changes" },
  fixFailed: { ckb: "نەتوانرا گۆڕانکارییەکان خۆکارانە بخرێنە ناو فایلەکە؛ دەتوانیت لە سەرەوە کۆپییان بکەیت.", ar: "تعذّر تطبيق التغييرات تلقائياً؛ يمكنك نسخها من الأعلى.", en: "Couldn't apply the changes automatically; you can copy them above." },
  fileBig: { ckb: "فایل یان پرۆژەکە زۆر گەورەیە.", ar: "الملف أو المشروع كبير جداً.", en: "The file or project is too large." },
  errBusy: { ckb: "⚠️ ئێستا داواکاری زۆرە. چەند خولەکێکی تر هەوڵ بدەرەوە.", ar: "⚠️ الضغط مرتفع الآن. حاول بعد دقائق.", en: "⚠️ Too many requests right now. Try again in a few minutes." },
  errAi: { ckb: "⚠️ زیرەکی دەستکرد وەڵامی نەدایەوە. دووبارە هەوڵ بدەرەوە.", ar: "⚠️ لم يستجب الذكاء الاصطناعي. حاول مجدداً.", en: "⚠️ The AI did not respond. Please try again." },
  errConn: { ckb: "⚠️ پەیوەندی نەکرا. دووبارە هەوڵ بدەرەوە.", ar: "⚠️ تعذّر الاتصال. حاول مجدداً.", en: "⚠️ Connection failed. Please try again." },
  retry: { ckb: "دووبارە", ar: "إعادة", en: "Retry" },

  preview: { ckb: "بینینی ئەپەکە", ar: "عرض التطبيق", en: "View app" },
  code: { ckb: "کۆد", ar: "الكود", en: "Code" },
  refresh: { ckb: "نوێکردنەوە", ar: "تحديث", en: "Refresh" },
  zip: { ckb: "داگرتن بە ZIP", ar: "تنزيل ZIP", en: "Download ZIP" },
  building: { ckb: "دروست دەکرێت...", ar: "جارٍ الإنشاء...", en: "Building..." },
  previewEmpty: { ckb: "داوای وێبسایت یان ئەپێک بکە و لێرە دەیبینیت", ar: "اطلب موقعاً أو تطبيقاً وستراه هنا", en: "Ask for a website or app and see it here" },
  files: { ckb: "فایل · خۆکارانە هەڵدەگیرێن", ar: "ملفات · تُحفظ تلقائياً", en: "files · saved automatically" },
  noFiles: { ckb: "هیچ فایلێک نییە هێشتا", ar: "لا توجد ملفات بعد", en: "No files yet" },
  lines: { ckb: "دێڕ", ar: "سطر", en: "lines" },
};

export function makeT(lang) {
  return (key) => {
    const v = T[key];
    if (!v) return key;
    return v[lang] ?? v.ckb;
  };
}
