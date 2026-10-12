"use client";
// The page visitors see before they log in: what AHM AI does, a live three-language demo, plans, and a clear way to start.
import { useEffect, useState } from "react";

const COPY = {
  ckb: {
    login: "چوونەژوورەوە",
    title: "زیرەکی دەستکرد کە بە زمانی خۆت قسە دەکات",
    sub: "پرسیار بکە، ماڵپەڕ و ئەپ دروست بکە و بیخەرە سەر شاشەکەت، و زمان فێربە. بە کوردی، عەرەبی و ئینگلیزی، لە مۆبایل و کۆمپیوتەر.",
    start: "بە بەخۆڕایی دەست پێبکە",
    note: (n) => `${n} پرسیار بە بەخۆڕایی. پێویستی بە کارتی بانکی نییە.`,
    whatTitle: "چی دەتوانیت بکەیت",
    feats: [
      ["chat", "پرسیار و وەڵام", "وەڵامی ڕوون بۆ خوێندن، کار، کۆد، وەرگێڕان و نووسینی نامە."],
      ["build", "ماڵپەڕ و ئەپ", "بڵێ چیت دەوێت؛ دروستی دەکات، لە iPhone و Android و کۆمپیوتەر پیشانت دەدات و بە ZIP دای دەگریت."],
      ["phone", "ئەپەکەت لەسەر شاشە", "ئەوەی دروستی دەکەیت بە ZIP دابگرە، یان بە چەند کلیکێک بیکە بە ئایکۆنێک لەسەر مۆبایل و کۆمپیوتەر."],
      ["wave", "گفتوگۆی دەنگی", "قسە بکە و بە دەنگ وەڵام وەربگرە، بێ ئەوەی پێویست بکات بنووسیت یان بخوێنیتەوە."],
      ["learn", "فێربوونی زمان", "تاقیکردنەوەی ئاست، وانەی ڕۆژانە، ڕاهێنانی قسەکردن و مامۆستایەکی زیرەک."],
    ],
    everyTitle: "یەک هەژمار، هەموو ئامێرەکانت",
    everySub: "لە مۆبایل دەست پێبکە و لە کۆمپیوتەر بەردەوام بە. چاتەکانت لەسەر هەژمارەکەت پاشەکەوت دەبن. دەتوانیت وەک ئەپ لەسەر ئایفۆن، ئەندرۆید و ویندۆز دایبمەزرێنیت.",
    plansTitle: "پلانەکان",
    free: "بەخۆڕایی",
    q: "پرسیار",
    days: "ڕۆژ",
    rounds: (h) => `کاتێک پرسیارەکان تەواو دەبن، دوای چاوەڕوانییەک (${h} کاتژمێر) هەموویان دەگەڕێنەوە.`,
    pay: "پارەدان بە FIB، لە ڕێگەی بۆتی تێلێگرامەوە.",
    endTitle: "ئامادەیت؟",
    endSub: "دروستکردنی هەژمار کەمتر لە خولەکێکی دەوێت.",
    privacy: "پاراستنی زانیاری",
    terms: "مەرجەکان",
    demo: [
      ["ماڵپەڕێک بۆ چێشتخانەکەم دروست بکە", "ماڵپەڕەکەت ئامادەیە: لیستی خواردن، وێنە و دوگمەی داواکردن. لە iPhone و کۆمپیوتەر سەیری بکە."],
      ["اكتب لي رسالة رسمية لطلب إجازة", "بالتأكيد! إليك رسالة رسمية قصيرة وواضحة يمكنك إرسالها مباشرة إلى مديرك."],
      ["Explain this error in my Python code", "The list is empty when you read index 0. Check its length first — here is the fixed code."],
    ],
  },
  ar: {
    login: "تسجيل الدخول",
    title: "ذكاء اصطناعي يتحدث بلغتك",
    sub: "اسأل، أنشئ المواقع والتطبيقات وضعها على شاشتك، وتعلّم اللغات. بالكردية والعربية والإنجليزية، على الهاتف والكمبيوتر.",
    start: "ابدأ مجاناً",
    note: (n) => `${n} سؤالاً مجاناً. لا حاجة لبطاقة بنكية.`,
    whatTitle: "ماذا يمكنك أن تفعل",
    feats: [
      ["chat", "أسئلة وأجوبة", "إجابات واضحة للدراسة والعمل والبرمجة والترجمة وكتابة الرسائل."],
      ["build", "مواقع وتطبيقات", "قل ما تريد؛ يبنيه ويعرضه على iPhone وAndroid والكمبيوتر وتنزّله بملف ZIP."],
      ["phone", "تطبيقك على الشاشة", "نزّل ما تنشئه بملف ZIP، أو حوّله ببضع نقرات إلى أيقونة على الهاتف والكمبيوتر."],
      ["wave", "محادثة صوتية", "تحدّث واسمع الإجابة، دون الحاجة إلى الكتابة أو القراءة."],
      ["learn", "تعلّم اللغات", "اختبار مستوى، دروس يومية، تدريب على النطق ومعلّم ذكي."],
    ],
    everyTitle: "حساب واحد، كل أجهزتك",
    everySub: "ابدأ على الهاتف وأكمل على الكمبيوتر. محادثاتك محفوظة في حسابك. ويمكنك تثبيته كتطبيق على آيفون وأندرويد وويندوز.",
    plansTitle: "الخطط",
    free: "مجاني",
    q: "سؤال",
    days: "يوم",
    rounds: (h) => `عند انتهاء الأسئلة تعود كلها بعد فترة انتظار (${h} ساعة).`,
    pay: "الدفع عبر FIB من خلال بوت تيليغرام.",
    endTitle: "جاهز؟",
    endSub: "إنشاء الحساب يستغرق أقل من دقيقة.",
    privacy: "الخصوصية",
    terms: "الشروط",
    demo: [
      ["ماڵپەڕێک بۆ چێشتخانەکەم دروست بکە", "ماڵپەڕەکەت ئامادەیە: لیستی خواردن، وێنە و دوگمەی داواکردن. لە iPhone و کۆمپیوتەر سەیری بکە."],
      ["اكتب لي رسالة رسمية لطلب إجازة", "بالتأكيد! إليك رسالة رسمية قصيرة وواضحة يمكنك إرسالها مباشرة إلى مديرك."],
      ["Explain this error in my Python code", "The list is empty when you read index 0. Check its length first — here is the fixed code."],
    ],
  },
  en: {
    login: "Log in",
    title: "AI that speaks your language",
    sub: "Ask anything, build websites and apps and put them on your screen, and learn languages. In Kurdish, Arabic and English, on your phone and computer.",
    start: "Start for free",
    note: (n) => `${n} free questions. No bank card needed.`,
    whatTitle: "What you can do",
    feats: [
      ["chat", "Questions and answers", "Clear answers for study, work, code, translation and writing messages."],
      ["build", "Websites and apps", "Say what you want; it builds it, previews it on iPhone, Android and computer, and you download a ZIP."],
      ["phone", "Your app on your screen", "Download what you build as a ZIP, or turn it into an icon on your phone or computer in a few taps."],
      ["wave", "Voice conversation", "Talk and hear the answer — no need to type or read."],
      ["learn", "Learn a language", "Level test, daily lessons, speaking practice and a smart tutor."],
    ],
    everyTitle: "One account, all your devices",
    everySub: "Start on your phone, continue on your computer. Your chats are saved to your account, and you can install it as an app on iPhone, Android and Windows.",
    plansTitle: "Plans",
    free: "Free",
    q: "questions",
    days: "days",
    rounds: (h) => `When questions run out, they all come back after a wait (${h} hours).`,
    pay: "Pay with FIB through our Telegram bot.",
    endTitle: "Ready?",
    endSub: "Creating an account takes less than a minute.",
    privacy: "Privacy",
    terms: "Terms",
    demo: [
      ["ماڵپەڕێک بۆ چێشتخانەکەم دروست بکە", "ماڵپەڕەکەت ئامادەیە: لیستی خواردن، وێنە و دوگمەی داواکردن. لە iPhone و کۆمپیوتەر سەیری بکە."],
      ["اكتب لي رسالة رسمية لطلب إجازة", "بالتأكيد! إليك رسالة رسمية قصيرة وواضحة يمكنك إرسالها مباشرة إلى مديرك."],
      ["Explain this error in my Python code", "The list is empty when you read index 0. Check its length first — here is the fixed code."],
    ],
  },
};

const rtl = (s) => /[؀-ۿ]/.test(s);

// The memorable part: the same assistant answering in three languages, typed live.
function Demo({ items }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [answer, setAnswer] = useState(false);
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const [q] = items[i];
    if (still) { setTyped(q); setAnswer(true); const id = setTimeout(() => setI((i + 1) % items.length), 6000); return () => clearTimeout(id); }
    setTyped(""); setAnswer(false);
    let n = 0;
    const timers = [];
    const tick = setInterval(() => {
      n++;
      setTyped(q.slice(0, n));
      if (n >= q.length) {
        clearInterval(tick);
        timers.push(setTimeout(() => setAnswer(true), 650));
        timers.push(setTimeout(() => setI((i + 1) % items.length), 5200));
      }
    }, 45);
    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
  }, [i, items]);
  const [q, a] = items[i];
  return (
    <div className="ld-demo" aria-label="AHM AI">
      <div className="ld-demo-top"><img src="/icon-192.png" alt="" /><span className="brand-name">AHM <b>AI</b></span></div>
      <div className="ld-demo-body">
        <div className="ld-q" dir={rtl(q) ? "rtl" : "ltr"}>{typed}<i className="ld-caret" aria-hidden="true" /></div>
        <div className={"ld-a" + (answer ? " on" : "")} dir={rtl(a) ? "rtl" : "ltr"}>{a}</div>
      </div>
      <div className="ld-langs" aria-hidden="true">
        {["کوردی", "العربية", "English"].map((l, k) => <span key={l} className={k === i ? "on" : ""}>{l}</span>)}
      </div>
    </div>
  );
}

export default function Landing({ lang, picker, onStart, Svg, Icon, botUrl }) {
  const c = COPY[lang] || COPY.ckb;
  const [plans, setPlans] = useState(null);
  useEffect(() => { fetch("/api/plans").then((r) => r.json()).then(setPlans).catch(() => {}); }, []);
  const freeN = plans?.freeLimit ?? 30;
  return (
    <div className="ld">
      <nav className="ld-nav">
        <div className="brand"><img src="/icon-192.png" alt="" /><span className="brand-name">AHM <b>AI</b></span></div>
        <div className="ld-nav-end">
          {picker}
          <button className="ld-login" onClick={() => onStart("login")}>{c.login}</button>
        </div>
      </nav>

      <div className="ld-hero">
        <div className="ld-hero-text">
          <h1>{c.title}</h1>
          <p className="ld-sub">{c.sub}</p>
          <div className="ld-ctas">
            <button className="gold-btn ld-cta" onClick={() => onStart("signup")}>{c.start}</button>
            <button className="ghost-btn ld-cta2" onClick={() => onStart("login")}>{c.login}</button>
          </div>
          <p className="ld-note">{c.note(freeN)}</p>
        </div>
        <Demo items={c.demo} />
      </div>

      <section className="ld-sec">
        <h2>{c.whatTitle}</h2>
        <ul className="ld-feats">
          {c.feats.map(([ic, title, text]) => (
            <li key={ic}>
              <span className="ld-ic"><Svg d={Icon[ic]} size={22} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ld-sec ld-every">
        <div className="ld-devices" aria-hidden="true">
          <div className="ld-pc"><div className="ld-pc-screen"><i /><i /><i /></div><div className="ld-pc-foot" /></div>
          <div className="ld-phone"><div className="ld-phone-screen"><i /><i /></div></div>
        </div>
        <div>
          <h2>{c.everyTitle}</h2>
          <p className="ld-sub">{c.everySub}</p>
        </div>
      </section>

      <section className="ld-sec">
        <h2>{c.plansTitle}</h2>
        <div className="ld-plans">
          <div className="ld-plan">
            <div className="ld-plan-name">{c.free}</div>
            <div className="ld-plan-price">$0</div>
            <div className="ld-plan-q"><b>{freeN}</b> {c.q}</div>
          </div>
          {(plans?.paid || []).map((p) => (
            <div key={p.id} className={"ld-plan" + (p.best ? " best" : "")}>
              <div className="ld-plan-name">{p.name}</div>
              <div className="ld-plan-price"><span dir="ltr">${p.price}</span><small> / {p.days} {c.days}</small></div>
              <div className="ld-plan-q"><b>{p.limit}</b> {c.q}</div>
            </div>
          ))}
        </div>
        <p className="ld-small">{c.rounds((plans?.cooldowns || [5, 7, 10, 24]).join(" → "))} {c.pay}</p>
      </section>

      <section className="ld-end">
        <h2>{c.endTitle}</h2>
        <p className="ld-sub">{c.endSub}</p>
        <button className="gold-btn ld-cta" onClick={() => onStart("signup")}>{c.start}</button>
      </section>

      <footer className="ld-foot">
        <span>© {new Date().getFullYear()} AHM AI</span>
        <a href="/privacy">{c.privacy}</a>
        <a href="/terms">{c.terms}</a>
        {botUrl && <a href={botUrl} target="_blank" rel="noreferrer">Telegram</a>}
      </footer>
    </div>
  );
}
