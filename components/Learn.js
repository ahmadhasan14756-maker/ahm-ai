"use client";
// 🎓 Language learning: pick a language, placement test, daily plan, alphabet, lessons, speaking coach, AI tutor.
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ALPHABETS, STARTER_SENTENCES } from "../lib/alphabets";

const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"];
const LANG_INFO = {
  en: { glyph: "Aa", dir: "ltr", speech: "en-US" },
  ar: { glyph: "أب", dir: "rtl", speech: "ar-SA" },
  ckb: { glyph: "ئا", dir: "rtl", speech: "ar" },
};

const TX = {
  title: { ckb: "فێربوونی زمان", ar: "تعلّم اللغات", en: "Learn a language" },
  pickQ: { ckb: "کام زمان فێر دەبیت؟", ar: "أي لغة تريد أن تتعلم؟", en: "Which language do you want to learn?" },
  pickSub: { ckb: "مامۆستایەکی زیرەک، وانەی ڕۆژانە، و ڕاهێنانی قسەکردن.", ar: "معلم ذكي، دروس يومية، وتدريب على النطق.", en: "A smart teacher, daily lessons and speaking practice." },
  name_en: { ckb: "ئینگلیزی", ar: "الإنجليزية", en: "English" },
  name_ar: { ckb: "عەرەبی", ar: "العربية", en: "Arabic" },
  name_ckb: { ckb: "کوردی", ar: "الكردية", en: "Kurdish" },
  startQ: { ckb: "ئاستی خۆت بزانە", ar: "اعرف مستواك", en: "Find your level" },
  startSub: { ckb: "تاقیکردنەوەیەکی کورت (١٠ پرسیار) ئاستەکەت دیاری دەکات، یان خۆت هەڵیبژێرە.", ar: "اختبار قصير (10 أسئلة) يحدد مستواك، أو اختره بنفسك.", en: "A short 10-question test finds your level, or choose it yourself." },
  takeTest: { ckb: "دەستپێکردنی تاقیکردنەوە", ar: "ابدأ الاختبار", en: "Start the test" },
  fromZero: { ckb: "لە سفرەوە دەست پێدەکەم", ar: "أبدأ من الصفر", en: "I'm a complete beginner" },
  orPick: { ckb: "یان ئاستەکەت هەڵبژێرە", ar: "أو اختر مستواك", en: "Or choose your level" },
  lv_A0: { ckb: "دەستپێک", ar: "مبتدئ تماماً", en: "Starter" },
  lv_A1: { ckb: "سەرەتایی", ar: "مبتدئ", en: "Beginner" },
  lv_A2: { ckb: "سەرەتایی+", ar: "أساسي", en: "Elementary" },
  lv_B1: { ckb: "مامناوەند", ar: "متوسط", en: "Intermediate" },
  lv_B2: { ckb: "مامناوەند+", ar: "فوق المتوسط", en: "Upper-intermediate" },
  lv_C1: { ckb: "پێشکەوتوو", ar: "متقدم", en: "Advanced" },
  question: { ckb: "پرسیار", ar: "سؤال", en: "Question" },
  of: { ckb: "لە", ar: "من", en: "of" },
  preparing: { ckb: "ئامادە دەکرێت...", ar: "جارٍ التحضير...", en: "Preparing..." },
  yourLevel: { ckb: "ئاستەکەت", ar: "مستواك", en: "Your level" },
  correct: { ckb: "ڕاست", ar: "صحيح", en: "correct" },
  startLearning: { ckb: "دەستپێکردنی فێربوون", ar: "ابدأ التعلم", en: "Start learning" },
  today: { ckb: "پلانی ئەمڕۆ", ar: "خطة اليوم", en: "Today's plan" },
  taskLesson: { ckb: "وانەی ڕۆژی", ar: "درس اليوم", en: "Lesson, day" },
  taskSpeak: { ckb: "ڕاهێنانی قسەکردن", ar: "تدريب النطق", en: "Speaking practice" },
  taskTutor: { ckb: "قسەکردن لەگەڵ مامۆستا", ar: "تحدّث مع المعلم", en: "Talk with the teacher" },
  voiceTutorSub: { ckb: "بە دەنگ، بەبێ خوێندنەوە", ar: "بالصوت، دون قراءة", en: "By voice, no reading needed" },
  textTutor: { ckb: "نووسین لەگەڵ مامۆستا", ar: "اكتب مع المعلم", en: "Write with the teacher" },
  streak: { ckb: "ڕۆژ لە سەر یەک", ar: "أيام متتالية", en: "day streak" },
  points: { ckb: "خاڵ", ar: "نقطة", en: "points" },
  alphabet: { ckb: "پیتەکان", ar: "الحروف", en: "Alphabet" },
  alphabetSub: { ckb: "گوێ لە هەر پیتێک بگرە", ar: "استمع لكل حرف", en: "Hear every letter" },
  lessonsSub: { ckb: "وشە، ڕستە، ڕێزمان، تاقیکردنەوە", ar: "كلمات، جمل، قواعد، اختبار", en: "Words, phrases, grammar, quiz" },
  speakSub: { ckb: "قسە بکە و نمرە وەربگرە", ar: "تحدّث واحصل على تقييم", en: "Speak and get a score" },
  tutorSub: { ckb: "قسەکردن و ڕاستکردنەوەی هەڵە", ar: "محادثة وتصحيح الأخطاء", en: "Talk and get corrections" },
  change: { ckb: "گۆڕینی زمان", ar: "تغيير اللغة", en: "Change language" },
  retest: { ckb: "دووبارە تاقیکردنەوە", ar: "إعادة الاختبار", en: "Retake the test" },
  back: { ckb: "گەڕانەوە", ar: "رجوع", en: "Back" },
  words: { ckb: "وشەکان", ar: "الكلمات", en: "Words" },
  phrases: { ckb: "ڕستە بەسوودەکان", ar: "جمل مفيدة", en: "Useful phrases" },
  dialogue: { ckb: "گفتوگۆ", ar: "حوار", en: "Dialogue" },
  grammar: { ckb: "ڕێزمان", ar: "القواعد", en: "Grammar" },
  quiz: { ckb: "تاقیکردنەوەی بچووک", ar: "اختبار قصير", en: "Quick quiz" },
  finish: { ckb: "تەواوکردنی وانە", ar: "إنهاء الدرس", en: "Finish lesson" },
  finishNeed: { ckb: "سەرەتا وەڵامی تاقیکردنەوەکە بدەرەوە", ar: "أجب عن الاختبار أولاً", en: "Answer the quiz first" },
  wellDone: { ckb: "زۆر باشە! وانەی ئەمڕۆ تەواو بوو 🎉", ar: "أحسنت! انتهى درس اليوم 🎉", en: "Well done! Today's lesson is complete 🎉" },
  listen: { ckb: "گوێگرتن", ar: "استماع", en: "Listen" },
  sayThis: { ckb: "ئەم ڕستەیە بڵێ", ar: "قل هذه الجملة", en: "Say this sentence" },
  tapRecord: { ckb: "دابگرە و قسە بکە", ar: "اضغط وتحدّث", en: "Tap and speak" },
  stopSend: { ckb: "ڕاگرتن و ناردن", ar: "إيقاف وإرسال", en: "Stop and send" },
  checking: { ckb: "گوێ دەگرم...", ar: "أستمع...", en: "Listening..." },
  heard: { ckb: "ئەوەی بیستم", ar: "ما سمعته", en: "What I heard" },
  next: { ckb: "دواتر", ar: "التالي", en: "Next" },
  tryAgain: { ckb: "دووبارە", ar: "مرة أخرى", en: "Try again" },
  micDenied: { ckb: "ڕێگە بە مایکرۆفۆن بدە لە ڕێکخستنەکانی مۆبایلەکەت.", ar: "اسمح باستخدام الميكروفون من إعدادات الهاتف.", en: "Allow the microphone in your phone settings." },
  error: { ckb: "ئێستا ئامادە نەکرا. دووبارە هەوڵ بدەرەوە.", ar: "تعذّر التحضير الآن. حاول مجدداً.", en: "Couldn't prepare it right now. Try again." },
  busy: { ckb: "ئێستا داواکاری زۆرە. چەند خولەکێکی تر هەوڵ بدەرەوە.", ar: "الضغط مرتفع الآن. حاول بعد دقائق.", en: "Too many requests right now. Try again in a few minutes." },
  done: { ckb: "تەواو", ar: "تم", en: "Done" },
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

const I = {
  back: <path d="M15 18l-6-6 6-6" />,
  speaker: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></>,
  abc: <path d="M4 18l4-12 4 12M5.5 14h5M14 6h4a3 3 0 0 1 0 6h-4zM14 12h5a3 3 0 0 1 0 6h-5z" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  wave: <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />,
};
const Svg = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

// ---- pronunciation playback (cached) ----
const audioCache = new Map();
let playing = null;
async function playText(text, target, getToken) {
  try {
    playing?.pause();
    window.speechSynthesis?.cancel();
  } catch {}
  // English: the phone's own voice is instant and good.
  if (target === "en" && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length || voices.some((v) => v.lang?.startsWith("en"))) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
      return;
    }
  }
  try {
    let url = audioCache.get(text);
    if (!url) {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error();
      url = URL.createObjectURL(await r.blob());
      audioCache.set(text, url);
    }
    playing = new Audio(url);
    await playing.play();
  } catch {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_INFO[target]?.speech || "en-US";
      window.speechSynthesis?.speak(u);
    } catch {}
  }
}

function SpeakBtn({ text, target, getToken, label, big }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className={"say-btn" + (big ? " big" : "")} aria-label={label} title={label}
      onClick={async (e) => { e.stopPropagation(); setBusy(true); await playText(text, target, getToken); setTimeout(() => setBusy(false), 600); }}>
      {busy ? <span className="mini-spin" /> : <Svg d={I.speaker} size={big ? 22 : 17} />}
    </button>
  );
}

function Quiz({ items, dir, onDone, tl }) {
  const [picked, setPicked] = useState({});
  const answered = Object.keys(picked).length;
  useEffect(() => { if (answered === items.length) onDone(items.filter((q, i) => picked[i] === q.answer).length); }, [answered]);
  return (
    <ol className="quiz">
      {items.map((q, i) => (
        <li key={i}>
          <p className="quiz-q" dir="auto">{q.q}</p>
          <div className="quiz-opts">
            {q.options.map((o, k) => {
              const chosen = picked[i] === k;
              const show = picked[i] != null;
              const cls = show ? (k === q.answer ? " right" : chosen ? " wrong" : " dim") : "";
              return (
                <button key={k} dir="auto" className={"quiz-opt" + cls} disabled={show} onClick={() => setPicked({ ...picked, [i]: k })}>
                  {o}{show && k === q.answer && <Svg d={I.check} size={16} />}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Learn({ lang, uid, getToken, onTutor, onVoiceTutor, onLimit }) {
  const tl = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const storeKey = `ahm-learn-${uid}`;
  const [store, setStore] = useState(null);
  const [screen, setScreen] = useState("pick");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [test, setTest] = useState(null); // {questions, i, answers:[]}
  const [result, setResult] = useState(null);
  const [lessonOk, setLessonOk] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let s = { current: null, courses: {} };
    try { s = JSON.parse(localStorage.getItem(storeKey) || "null") || s; } catch {}
    setStore(s);
    const c = s.current && s.courses[s.current];
    setScreen(c ? (c.level ? "dash" : "start") : "pick");
  }, [storeKey]);
  useEffect(() => { if (store) try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch {} }, [store]);
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(""), 2600); return () => clearTimeout(x); }, [toast]);

  if (!store) return <div className="learn"><div className="learn-center"><span className="mini-spin" /></div></div>;

  const target = store.current;
  const course = target ? store.courses[target] : null;
  const info = LANG_INFO[target] || LANG_INFO.en;
  const td = course?.today?.date === todayKey() ? course.today : { date: todayKey(), lesson: false, speak: false, tutor: false };

  const updateCourse = (fn) => setStore((s) => ({ ...s, courses: { ...s.courses, [s.current]: fn(s.courses[s.current]) } }));
  function markTask(task) {
    updateCourse((c) => {
      const today = c.today?.date === todayKey() ? c.today : { date: todayKey() };
      if (today[task]) return c;
      let { streak = 0, lastDone = null } = c;
      if (lastDone !== todayKey()) { streak = lastDone === yesterdayKey() ? streak + 1 : 1; lastDone = todayKey(); }
      return { ...c, today: { ...today, [task]: true }, streak, lastDone, xp: (c.xp || 0) + 10 };
    });
  }

  async function api(body) {
    const r = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
      body: JSON.stringify({ ...body, target: body.target || store.current, native: lang, level: course?.level || "A1" }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.error === "limit") { onLimit(); throw new Error("limit"); }
    if (!r.ok) throw new Error(j.error || "ai");
    return j;
  }
  // Retry quietly up to 3 times before showing an error.
  async function apiRetry(body) {
    let last;
    for (let i = 0; i < 3; i++) {
      try { return await api(body); } catch (e) { last = e; if (e.message === "limit") throw e; await new Promise((r) => setTimeout(r, 1000 * (i + 1))); }
    }
    throw last;
  }
  const showErr = (e) => { if (e.message !== "limit") setErr(e.message === "busy" ? tl("busy") : tl("error")); };

  function chooseLang(l) {
    setStore((s) => ({ ...s, current: l, courses: { ...s.courses, [l]: s.courses[l] || { level: null, day: 1, streak: 0, xp: 0, titles: [] } } }));
    setScreen(store.courses[l]?.level ? "dash" : "start");
  }
  function setLevel(lv) {
    updateCourse((c) => ({ ...c, level: lv }));
    setScreen("dash");
  }

  async function startTest() {
    setErr(""); setLoading(true); setScreen("test"); setTest(null);
    try {
      const j = await apiRetry({ action: "placement" });
      setTest({ questions: j.questions, i: 0, answers: [] });
    } catch (e) { showErr(e); setScreen("start"); } finally { setLoading(false); }
  }
  function answerTest(k) {
    const q = test.questions[test.i];
    const answers = [...test.answers, { level: q.level, ok: k === q.answer }];
    if (test.i + 1 < test.questions.length) { setTest({ ...test, i: test.i + 1, answers }); return; }
    // Highest level reached with at least one correct answer at every level before it.
    let reached = "A0";
    for (const lv of LEVELS.slice(1)) {
      const at = answers.filter((a) => a.level === lv);
      if (!at.length) continue;
      if (at.some((a) => a.ok)) reached = lv; else break;
    }
    setResult({ level: reached, score: answers.filter((a) => a.ok).length, total: answers.length });
    setScreen("result");
  }

  async function openLesson() {
    setErr(""); setLessonOk(false); setScreen("lesson");
    if (course.lesson?.day === course.day && course.lesson?.data) return;
    setLoading(true);
    try {
      const data = await apiRetry({ action: "lesson", day: course.day, previous: course.titles || [] });
      updateCourse((c) => ({ ...c, lesson: { day: c.day, data } }));
    } catch (e) { showErr(e); setScreen("dash"); } finally { setLoading(false); }
  }
  function finishLesson() {
    const title = course.lesson?.data?.title;
    markTask("lesson");
    updateCourse((c) => ({ ...c, day: c.day + 1, titles: [...(c.titles || []), title].filter(Boolean).slice(-30), lastLesson: c.lesson }));
    setToast(tl("wellDone"));
    setScreen("dash");
  }

  const Back = ({ to = "dash" }) => (
    <button className="learn-back" onClick={() => { setErr(""); setScreen(to); }}><Svg d={I.back} size={18} /> {tl("back")}</button>
  );

  // ---------- screens ----------
  let body = null;

  if (screen === "pick") {
    body = (
      <div className="learn-center">
        <h2 className="learn-h">{tl("pickQ")}</h2>
        <p className="muted">{tl("pickSub")}</p>
        <div className="lang-cards">
          {["en", "ar", "ckb"].map((l) => (
            <button key={l} className="lang-card" onClick={() => chooseLang(l)}>
              <span className="glyph" dir={LANG_INFO[l].dir}>{LANG_INFO[l].glyph}</span>
              <b>{tl("name_" + l)}</b>
              {store.courses[l]?.level && <em>{store.courses[l].level} · {tl("lv_" + store.courses[l].level)}</em>}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (screen === "start") {
    body = (
      <div className="learn-center">
        <Back to="pick" />
        <span className="glyph hero" dir={info.dir}>{info.glyph}</span>
        <h2 className="learn-h">{tl("startQ")}</h2>
        <p className="muted">{tl("startSub")}</p>
        {err && <p className="learn-err">{err}</p>}
        <div className="learn-actions">
          <button className="gold-btn" onClick={startTest}>{tl("takeTest")}</button>
          <button className="ghost-btn" onClick={() => setLevel("A0")}>{tl("fromZero")}</button>
        </div>
        <p className="muted small">{tl("orPick")}</p>
        <div className="level-chips">
          {LEVELS.slice(1).map((lv) => <button key={lv} onClick={() => setLevel(lv)}><b>{lv}</b> {tl("lv_" + lv)}</button>)}
        </div>
      </div>
    );
  } else if (screen === "test") {
    const q = test?.questions?.[test.i];
    body = (
      <div className="learn-center">
        <Back to="start" />
        {loading || !q ? (
          <div className="learn-loading"><span className="mini-spin" /> {tl("preparing")}</div>
        ) : (
          <>
            <div className="progress"><i style={{ width: `${(test.i / test.questions.length) * 100}%` }} /></div>
            <p className="muted small">{tl("question")} {test.i + 1} {tl("of")} {test.questions.length} · {q.level}</p>
            <p className="test-q" dir="auto">{q.q}</p>
            <div className="quiz-opts col">
              {q.options.map((o, k) => <button key={k} dir="auto" className="quiz-opt" onClick={() => answerTest(k)}>{o}</button>)}
            </div>
          </>
        )}
      </div>
    );
  } else if (screen === "result") {
    body = (
      <div className="learn-center">
        <p className="muted">{tl("yourLevel")}</p>
        <div className="level-badge big">{result.level}</div>
        <h2 className="learn-h">{tl("lv_" + result.level)}</h2>
        <p className="muted">{result.score} / {result.total} {tl("correct")}</p>
        <button className="gold-btn" onClick={() => setLevel(result.level)}>{tl("startLearning")}</button>
      </div>
    );
  } else if (screen === "dash") {
    const tasks = [
      { k: "lesson", label: `${tl("taskLesson")} ${course.day}`, go: openLesson, icon: I.book },
      { k: "speak", label: tl("taskSpeak"), go: () => { setErr(""); setScreen("speak"); }, icon: I.mic },
      { k: "tutor", label: tl("taskTutor"), go: () => { markTask("tutor"); onVoiceTutor(target, course.level); }, icon: I.wave },
    ];
    const doneCount = tasks.filter((x) => td[x.k]).length;
    body = (
      <div className="learn-dash">
        <div className="dash-head">
          <span className="glyph" dir={info.dir}>{info.glyph}</span>
          <div>
            <h2>{tl("name_" + target)}</h2>
            <span className="level-badge">{course.level} · {tl("lv_" + course.level)}</span>
          </div>
          <div className="dash-stats">
            <span className={"streak" + (course.streak ? " on" : "")}><Svg d={I.flame} size={18} /> <b>{course.streak || 0}</b></span>
            <small>{course.xp || 0} {tl("points")}</small>
          </div>
        </div>
        {err && <p className="learn-err">{err}</p>}
        <section className="today">
          <div className="today-head"><h3>{tl("today")}</h3><span>{doneCount}/3</span></div>
          <div className="progress"><i style={{ width: `${(doneCount / 3) * 100}%` }} /></div>
          {tasks.map((x) => (
            <button key={x.k} className={"task" + (td[x.k] ? " done" : "")} onClick={x.go}>
              <span className="task-ico">{td[x.k] ? <Svg d={I.check} size={16} /> : <Svg d={x.icon} size={16} />}</span>
              <span>{x.label}</span>
              <Svg d={I.chevron} size={16} />
            </button>
          ))}
        </section>
        <div className="learn-grid">
          <button className="cap" onClick={() => setScreen("letters")}><Svg d={I.abc} /><b>{tl("alphabet")}</b><span>{tl("alphabetSub")}</span></button>
          <button className="cap" onClick={openLesson}><Svg d={I.book} /><b>{tl("taskLesson")} {course.day}</b><span>{tl("lessonsSub")}</span></button>
          <button className="cap" onClick={() => setScreen("speak")}><Svg d={I.mic} /><b>{tl("taskSpeak")}</b><span>{tl("speakSub")}</span></button>
          <button className="cap" onClick={() => { markTask("tutor"); onVoiceTutor(target, course.level); }}><Svg d={I.wave} /><b>{tl("taskTutor")}</b><span>{tl("voiceTutorSub")}</span></button>
          <button className="cap" onClick={() => { markTask("tutor"); onTutor(target, course.level); }}><Svg d={I.chat} /><b>{tl("textTutor")}</b><span>{tl("tutorSub")}</span></button>
        </div>
        <div className="dash-links">
          <button onClick={() => setScreen("pick")}>{tl("change")}</button>
          <button onClick={startTest}>{tl("retest")}</button>
        </div>
      </div>
    );
  } else if (screen === "letters") {
    const al = ALPHABETS[target];
    body = (
      <div className="learn-page">
        <Back />
        <h2 className="learn-h">{tl("alphabet")}</h2>
        <div className="letters" dir={al.dir}>
          {al.letters.map(([L, w]) => (
            <button key={L} className="letter" onClick={() => playText(`${L.split(" ")[0]}، ${w}`, target, getToken)}>
              <span className="L">{L}</span>
              <span className="w">{w}</span>
            </button>
          ))}
        </div>
      </div>
    );
  } else if (screen === "lesson") {
    const d = course.lesson?.day === course.day ? course.lesson?.data : null;
    body = (
      <div className="learn-page">
        <Back />
        {loading || !d ? (
          <div className="learn-loading"><span className="mini-spin" /> {tl("preparing")}</div>
        ) : (
          <>
            <p className="muted small">{tl("taskLesson")} {course.day} · {course.level}</p>
            <h2 className="learn-h">{d.title}</h2>
            {d.goal && <p className="lesson-goal">{d.goal}</p>}

            <h3 className="lesson-h">{tl("words")}</h3>
            <div className="word-grid">
              {d.words?.map((w, i) => (
                <div key={i} className="word-card">
                  <div className="word-top"><span className="word" dir={info.dir}>{w.word}</span><SpeakBtn text={w.word} target={target} getToken={getToken} label={tl("listen")} /></div>
                  {w.say && <span className="say">{w.say}</span>}
                  <span className="mean">{w.meaning}</span>
                </div>
              ))}
            </div>

            {d.phrases?.length > 0 && (<>
              <h3 className="lesson-h">{tl("phrases")}</h3>
              <ul className="phrase-list">
                {d.phrases.map((p, i) => (
                  <li key={i}>
                    <SpeakBtn text={p.text} target={target} getToken={getToken} label={tl("listen")} />
                    <div><p className="ph" dir={info.dir}>{p.text}</p>{p.say && <p className="say">{p.say}</p>}<p className="mean">{p.meaning}</p></div>
                  </li>
                ))}
              </ul>
            </>)}

            {d.dialogue?.length > 0 && (<>
              <h3 className="lesson-h">{tl("dialogue")}</h3>
              <div className="dialogue">
                {d.dialogue.map((l, i) => (
                  <div key={i} className={"dl " + (l.who === "B" ? "b" : "a")}>
                    <p dir={info.dir}>{l.text}</p><small>{l.meaning}</small>
                  </div>
                ))}
              </div>
            </>)}

            {d.grammar && (<>
              <h3 className="lesson-h">{tl("grammar")}</h3>
              <div className="grammar bubble"><ReactMarkdown>{d.grammar}</ReactMarkdown></div>
            </>)}

            {d.quiz?.length > 0 && (<>
              <h3 className="lesson-h">{tl("quiz")}</h3>
              <Quiz items={d.quiz} tl={tl} onDone={() => setLessonOk(true)} />
            </>)}

            <button className="gold-btn finish" disabled={d.quiz?.length > 0 && !lessonOk} onClick={finishLesson}>
              {d.quiz?.length > 0 && !lessonOk ? tl("finishNeed") : tl("finish")}
            </button>
          </>
        )}
      </div>
    );
  } else if (screen === "speak") {
    body = <Speak target={target} lang={lang} course={course} tl={tl} getToken={getToken} api={apiRetry} onScore={(s, n) => { if (s >= 60 || n >= 3) markTask("speak"); }} back={<Back />} />;
  }

  return (
    <div className="learn">
      {body}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

// ---------- speaking coach ----------
function Speak({ target, lang, course, tl, getToken, api, onScore, back }) {
  const info = LANG_INFO[target];
  const source = course.lesson?.data?.phrases?.length ? course.lesson.data.phrases : course.lastLesson?.data?.phrases?.length ? course.lastLesson.data.phrases : null;
  const list = source
    ? source.map((p) => ({ text: p.text, say: p.say, meaning: p.meaning }))
    : STARTER_SENTENCES[target].map((p) => ({ text: p.text, meaning: p.meaning[lang] || "" }));
  const [i, setI] = useState(0);
  const [rec, setRec] = useState(false);
  const [checking, setChecking] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const tries = useRef(0);
  const recRef = useRef(null);
  const item = list[i % list.length];

  async function start() {
    setErr(""); setRes(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((x) => window.MediaRecorder?.isTypeSupported?.(x)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRec(false);
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: mr.mimeType || type || "audio/webm" });
        const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
        setChecking(true);
        try {
          const j = await api({ action: "speak", sentence: item.text, audio: { mimeType: (blob.type || "audio/webm").split(";")[0], data } });
          tries.current += 1;
          setRes(j);
          onScore(j.score, tries.current);
        } catch (e) {
          if (e.message !== "limit") setErr(e.message === "busy" ? tl("busy") : tl("error"));
        } finally { setChecking(false); }
      };
      recRef.current = mr;
      mr.start(400);
      setRec(true);
      setTimeout(() => { if (mr.state !== "inactive") mr.stop(); }, 20000);
    } catch { setErr(tl("micDenied")); }
  }
  const stop = () => { if (recRef.current?.state !== "inactive") recRef.current?.stop(); };
  const tone = res ? (res.score >= 80 ? "good" : res.score >= 60 ? "ok" : "low") : "";

  return (
    <div className="learn-center">
      {back}
      <p className="muted small">{tl("sayThis")} · {(i % list.length) + 1}/{list.length}</p>
      <div className="speak-card">
        <p className="speak-text" dir={info.dir}>{item.text}</p>
        {item.say && <p className="say">{item.say}</p>}
        {item.meaning && <p className="mean">{item.meaning}</p>}
        <SpeakBtn text={item.text} target={target} getToken={getToken} label={tl("listen")} big />
      </div>

      {checking ? (
        <div className="learn-loading"><span className="mini-spin" /> {tl("checking")}</div>
      ) : (
        <button className={"mic-big" + (rec ? " rec" : "")} onClick={rec ? stop : start} aria-label={rec ? tl("stopSend") : tl("tapRecord")}>
          <Svg d={rec ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /> : I.mic} size={30} />
        </button>
      )}
      {!checking && <p className="muted small">{rec ? tl("stopSend") : tl("tapRecord")}</p>}
      {err && <p className="learn-err">{err}</p>}

      {res && (
        <div className={"score-card " + tone}>
          <div className="score-ring" style={{ "--p": res.score }}><b>{res.score}</b></div>
          <div className="score-body">
            {res.heard && <p><small>{tl("heard")}:</small> <span dir={info.dir}>{res.heard}</span></p>}
            {res.feedback && <p>{res.feedback}</p>}
            {res.tip && <p className="tip">💡 {res.tip}</p>}
          </div>
        </div>
      )}
      {res && (
        <div className="learn-actions row">
          <button className="ghost-btn" onClick={() => { setRes(null); start(); }}>{tl("tryAgain")}</button>
          <button className="gold-btn" onClick={() => { setRes(null); setI(i + 1); }}>{tl("next")}</button>
        </div>
      )}
    </div>
  );
}
