import LegalPage from "../../components/LegalPage";

export const metadata = { title: "پاراستنی زانیاری — Privacy", description: "چۆن AHM AI زانیارییەکانت دەپارێزێت. How AHM AI protects your data.", alternates: { canonical: "/privacy" } };

const DOC = {
  ckb: {
    title: "سیاسەتی پاراستنی زانیاری",
    updatedLabel: "دوایین نوێکردنەوە",
    intro: "AHM AI ڕێز لە تایبەتمەندیت دەگرێت. ئەم پەڕەیە بە ڕوونی دەڵێت چ زانیارییەک کۆدەکەینەوە و چۆن بەکاری دەهێنین.",
    sections: [
      ["چ زانیارییەک کۆدەکەینەوە", [
        "ئیمەیڵ و وشەی نهێنی بۆ چوونەژوورەوە. وشەی نهێنی بە شێوەی شاردراوە (hash) پاشەکەوت دەکرێت و کەس نایبینێت، تەنانەت ئێمەش.",
        "چاتەکانت لەسەر هەژمارەکەت پاشەکەوت دەکرێن بۆ ئەوەی لە هەموو ئامێرەکانت بیانبینیت.",
        "ژمارەی ئەو پرسیارانەی کردووتە و پلانەکەت، بۆ بەڕێوەبردنی سنوورەکان.",
        "ئەو ماڵپەڕانەی خۆت بڵاویان دەکەیتەوە، و ئەو ڕەخنە و پێشنیارانەی دەینێریت.",
      ]],
      ["چۆن بەکاری دەهێنین", [
        "تەنها بۆ کارکردنی ئەپەکە: وەڵامدانەوە، پاشەکەوتکردنی چاتەکان و بەڕێوەبردنی پلانەکان.",
        "پرسیارەکانت بۆ وەڵامدانەوە دەنێردرێن بۆ دابینکەرێکی متمانەپێکراوی زیرەکی دەستکرد. زانیارییەکانت نافرۆشین و بۆ ڕیکلام بەکاریان ناهێنین.",
        "زانیاری هەستیار (وەک ژمارەی کارتی بانکی یان وشەی نهێنی) لە چاتەکاندا مەنووسە.",
      ]],
      ["پارەدان", [
        "پارەدان لە ڕێگەی FIB و بۆتی تێلێگرامەوە دەکرێت. ئێمە زانیاری کارتی بانکیت پاشەکەوت ناکەین.",
      ]],
      ["مافەکانت", [
        "دەتوانیت هەر کاتێک چاتێک بسڕیتەوە.",
        "بۆ سڕینەوەی تەواوی هەژمارەکەت و زانیارییەکانت، لە ڕێگەی «ڕەخنە و پێشنیار» یان بۆتی تێلێگرامەوە داوامان لێ بکە.",
      ]],
      ["پەیوەندی", [
        "بۆ هەر پرسیارێک لە ناو ئەپەکەدا «ڕەخنە و پێشنیار» بەکاربهێنە، یان لە ڕێگەی بۆتی تێلێگرامی AHM AI ـەوە پەیوەندیمان پێوە بکە.",
      ]],
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updatedLabel: "آخر تحديث",
    intro: "يحترم AHM AI خصوصيتك. توضّح هذه الصفحة البيانات التي نجمعها وكيف نستخدمها.",
    sections: [
      ["البيانات التي نجمعها", [
        "البريد الإلكتروني وكلمة المرور لتسجيل الدخول. تُحفظ كلمة المرور مشفّرة ولا يمكن لأحد رؤيتها، ولا حتى نحن.",
        "محادثاتك تُحفظ في حسابك لتراها على جميع أجهزتك.",
        "عدد أسئلتك وخطتك لإدارة الحدود.",
        "المواقع التي تنشرها بنفسك، والملاحظات والاقتراحات التي ترسلها.",
      ]],
      ["كيف نستخدمها", [
        "فقط لتشغيل التطبيق: الإجابة، حفظ المحادثات وإدارة الخطط.",
        "تُرسل أسئلتك إلى مزوّد ذكاء اصطناعي موثوق للحصول على الإجابة. لا نبيع بياناتك ولا نستخدمها للإعلانات.",
        "لا تكتب معلومات حساسة (مثل رقم البطاقة أو كلمات المرور) في المحادثات.",
      ]],
      ["الدفع", ["يتم الدفع عبر FIB من خلال بوت تيليغرام. لا نحفظ بيانات بطاقتك البنكية."]],
      ["حقوقك", [
        "يمكنك حذف أي محادثة في أي وقت.",
        "لحذف حسابك وبياناتك بالكامل، اطلب ذلك عبر «النقد والاقتراحات» أو بوت تيليغرام.",
      ]],
      ["التواصل", ["استخدم «النقد والاقتراحات» داخل التطبيق، أو تواصل معنا عبر بوت تيليغرام الخاص بـ AHM AI."]],
    ],
  },
  en: {
    title: "Privacy Policy",
    updatedLabel: "Last updated",
    intro: "AHM AI respects your privacy. This page explains what we collect and how we use it.",
    sections: [
      ["What we collect", [
        "Your email and password to log in. Passwords are stored hashed — nobody can read them, not even us.",
        "Your chats, saved to your account so you can see them on all your devices.",
        "How many questions you used and your plan, to manage limits.",
        "Websites you choose to publish, and feedback you send.",
      ]],
      ["How we use it", [
        "Only to run the app: answering, saving chats and managing plans.",
        "Your questions are sent to a trusted AI service provider to produce answers. We never sell your data or use it for ads.",
        "Please don't write sensitive information (card numbers, passwords) in chats.",
      ]],
      ["Payments", ["Payments are made with FIB through our Telegram bot. We never store bank card details."]],
      ["Your rights", [
        "You can delete any chat at any time.",
        "To delete your whole account and data, ask us through \"Feedback\" in the app or our Telegram bot.",
      ]],
      ["Contact", ["Use \"Feedback\" inside the app, or contact us through the AHM AI Telegram bot."]],
    ],
  },
};

export default function Privacy() {
  return <LegalPage doc={DOC} updated="2026-10-12" />;
}
