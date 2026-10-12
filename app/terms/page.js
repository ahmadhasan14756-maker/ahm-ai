import LegalPage from "../../components/LegalPage";

export const metadata = { title: "مەرجەکان — Terms", description: "مەرجەکانی بەکارهێنانی AHM AI. AHM AI terms of use.", alternates: { canonical: "/terms" } };

const DOC = {
  ckb: {
    title: "مەرجەکانی بەکارهێنان",
    updatedLabel: "دوایین نوێکردنەوە",
    intro: "بە بەکارهێنانی AHM AI، ڕازی دەبیت بەم مەرجانە.",
    sections: [
      ["بەکارهێنانی ڕێگەپێدراو", [
        "AHM AI بۆ فێربوون، کار، نووسین، کۆد، دیزاین و فێربوونی زمانە.",
        "قەدەغەیە بۆ: ناوەڕۆکی بێ ئەخلاقی و سێکسی، قسەی ناشیرین، هاککردن و هێرشکردنە سەر ئەکاونت و سیستەم، فێڵ و دزینی زانیاری، یان هەر کارێکی نایاسایی.",
        "ئەگەر ئەم مەرجانە بشکێنرێن، دەتوانین هەژمارەکە ڕابگرین یان ماڵپەڕە بڵاوکراوەکان لابەرین.",
      ]],
      ["وەڵامەکانی زیرەکی دەستکرد", [
        "AHM AI دەکرێت هەڵە بکات. زانیاریی گرنگ (پزیشکی، یاسایی، دارایی) لە سەرچاوەی تر بپشکنە.",
        "تۆ بەرپرسیاریت لەو ناوەڕۆکەی دروستی دەکەیت و بڵاوی دەکەیتەوە.",
      ]],
      ["پلان و پارەدان", [
        "پلانی بەخۆڕایی ژمارەیەکی دیاریکراو پرسیاری هەیە. کاتێک تەواو دەبن، دوای ماوەیەکی چاوەڕوانی دەگەڕێنەوە.",
        "پلانەکانی Pro بۆ ماوەی دیاریکراو چالاک دەبن، دوای پشتڕاستکردنەوەی پارەدان لە ڕێگەی FIB ـەوە.",
        "نرخ و سنوورەکان دەکرێت بگۆڕدرێن؛ گۆڕانکاری کار لە پلانێک ناکات کە پێشتر کڕاوە تا کۆتایی ماوەکەی.",
      ]],
      ["ماڵپەڕە بڵاوکراوەکان", [
        "ئەو ماڵپەڕانەی بڵاویان دەکەیتەوە بۆ هەموو کەس دەکرێنەوە. زانیاریی تایبەت تێیاندا دامەنێ.",
        "ماڵپەڕێک کە مەرجەکان بشکێنێت بەبێ ئاگادارکردنەوە لادەبرێت.",
      ]],
      ["گۆڕانکاری", ["دەکرێت ئەم مەرجانە نوێ بکرێنەوە. بەردەوامبوون لە بەکارهێنان واتە ڕازیبوون بە وەشانی نوێ."]],
    ],
  },
  ar: {
    title: "شروط الاستخدام",
    updatedLabel: "آخر تحديث",
    intro: "باستخدامك AHM AI فإنك توافق على هذه الشروط.",
    sections: [
      ["الاستخدام المسموح", [
        "AHM AI للتعلّم والعمل والكتابة والبرمجة والتصميم وتعلّم اللغات.",
        "يُمنع استخدامه في: المحتوى غير الأخلاقي والجنسي، الألفاظ البذيئة، الاختراق ومهاجمة الحسابات والأنظمة، الاحتيال وسرقة البيانات، أو أي عمل غير قانوني.",
        "عند مخالفة الشروط يمكننا إيقاف الحساب أو حذف المواقع المنشورة.",
      ]],
      ["إجابات الذكاء الاصطناعي", [
        "قد يخطئ AHM AI. تحقّق من المعلومات المهمة (الطبية والقانونية والمالية) من مصادر أخرى.",
        "أنت مسؤول عن المحتوى الذي تنشئه وتنشره.",
      ]],
      ["الخطط والدفع", [
        "الخطة المجانية لها عدد محدد من الأسئلة، تعود بعد فترة انتظار عند انتهائها.",
        "تُفعّل خطط Pro لمدة محددة بعد تأكيد الدفع عبر FIB.",
        "قد تتغير الأسعار والحدود؛ ولا يؤثر ذلك على خطة مشتراة حتى نهاية مدتها.",
      ]],
      ["المواقع المنشورة", [
        "المواقع التي تنشرها يمكن لأي شخص فتحها. لا تضع فيها معلومات خاصة.",
        "يُحذف أي موقع يخالف الشروط دون إشعار.",
      ]],
      ["التغييرات", ["قد نحدّث هذه الشروط. استمرارك في الاستخدام يعني موافقتك على النسخة الجديدة."]],
    ],
  },
  en: {
    title: "Terms of Use",
    updatedLabel: "Last updated",
    intro: "By using AHM AI you agree to these terms.",
    sections: [
      ["Allowed use", [
        "AHM AI is for learning, work, writing, code, design and language learning.",
        "Not allowed: sexual or immoral content, obscene language, hacking or attacking accounts and systems, scams and data theft, or anything illegal.",
        "If these terms are broken we may suspend the account or remove published sites.",
      ]],
      ["AI answers", [
        "AHM AI can make mistakes. Check important medical, legal or financial information elsewhere.",
        "You are responsible for the content you create and publish.",
      ]],
      ["Plans and payment", [
        "The free plan has a set number of questions; when they run out they come back after a wait.",
        "Pro plans are activated for a set period after the FIB payment is confirmed.",
        "Prices and limits may change; a plan you already bought is not affected until it ends.",
      ]],
      ["Published sites", [
        "Sites you publish can be opened by anyone. Don't put private information in them.",
        "Sites that break these terms are removed without notice.",
      ]],
      ["Changes", ["We may update these terms. Continuing to use AHM AI means you accept the new version."]],
    ],
  },
};

export default function Terms() {
  return <LegalPage doc={DOC} updated="2026-10-12" />;
}
