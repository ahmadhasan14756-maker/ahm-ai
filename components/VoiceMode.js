"use client";
// Hands-free voice conversation: you talk → AI answers out loud → it listens again.
import { useEffect, useRef, useState } from "react";

const TX = {
  start: { ckb: "دەست پێبکە", ar: "ابدأ", en: "Start" },
  startSub: { ckb: "قسە بکە، و AHM AI بە دەنگ وەڵامت دەداتەوە. پێویست بە خوێندنەوە ناکات.", ar: "تحدّث وسيجيبك AHM AI بصوته. لا حاجة للقراءة.", en: "Talk, and AHM AI answers out loud. No reading needed." },
  listening: { ckb: "گوێ دەگرم... قسە بکە", ar: "أستمع... تحدّث", en: "Listening... speak now" },
  thinking: { ckb: "بیر دەکاتەوە...", ar: "يفكّر...", en: "Thinking..." },
  speaking: { ckb: "قسە دەکات... دابگرە بۆ ڕاگرتن", ar: "يتحدث... اضغط للمقاطعة", en: "Speaking... tap to interrupt" },
  idle: { ckb: "دابگرە بۆ قسەکردن", ar: "اضغط لتتحدث", en: "Tap to talk" },
  you: { ckb: "تۆ", ar: "أنت", en: "You" },
  showText: { ckb: "پیشاندانی نووسین", ar: "إظهار النص", en: "Show text" },
  hideText: { ckb: "شاردنەوەی نووسین", ar: "إخفاء النص", en: "Hide text" },
  end: { ckb: "کۆتایی", ar: "إنهاء", en: "End" },
  mic: { ckb: "ڕێگە بە مایکرۆفۆن بدە لە ڕێکخستنەکانی مۆبایلەکەت، پاشان دووبارە هەوڵ بدەرەوە.", ar: "اسمح باستخدام الميكروفون من إعدادات الهاتف ثم حاول مجدداً.", en: "Allow the microphone in your phone settings, then try again." },
  error: { ckb: "پەیوەندی نەکرا. دابگرە بۆ دووبارە هەوڵدان.", ar: "تعذّر الاتصال. اضغط للمحاولة مجدداً.", en: "Couldn't connect. Tap to try again." },
  voiceLimit: { ckb: "کاتی دەنگی ئەمڕۆت تەواو بوو. بۆ کاتی زیاتر پلانێکی Pro هەڵبژێرە.", ar: "انتهت دقائق الصوت لليوم. اختر خطة Pro لوقت أطول.", en: "Today's voice minutes are used up. Choose a Pro plan for more." },
  busy: { ckb: "ئێستا داواکاری زۆرە. کەمێکی تر هەوڵ بدەرەوە.", ar: "الضغط مرتفع الآن. حاول بعد قليل.", en: "Too many requests right now. Try again shortly." },
  teacher: { ckb: "مامۆستای زمان", ar: "معلم اللغة", en: "Language teacher" },
};

// A tiny silent sound, played on the first tap so the phone allows audio later.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const SPEECH_LANG = { ckb: "ar", ar: "ar-SA", en: "en-US" };
const HEARD = /^\s*⟦([^⟧]*)⟧\s*/;

export default function VoiceMode({ lang, getToken, history, tutor, greeting, onTurn, onClose, onLimit }) {
  const tl = (k) => TX[k]?.[lang] ?? TX[k]?.ckb ?? k;
  const [phase, setPhase] = useState("start"); // start | listening | thinking | speaking | idle | error
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState(greeting || "");
  const [msg, setMsg] = useState("");
  const [showText, setShowText] = useState(true);

  const alive = useRef(true);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const recRef = useRef(null);
  const audioRef = useRef(null);
  const orbRef = useRef(null);
  const rafRef = useRef(0);
  const histRef = useRef(history || []);
  const turnRef = useRef(onTurn);
  const abortRef = useRef(null);
  useEffect(() => { turnRef.current = onTurn; }, [onTurn]);
  useEffect(() => { histRef.current = history || []; }, [history]);

  useEffect(() => () => {
    alive.current = false;
    cancelAnimationFrame(rafRef.current);
    try { recRef.current?.state !== "inactive" && recRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try { ctxRef.current?.close(); } catch {}
    try { audioRef.current?.pause(); window.speechSynthesis?.cancel(); } catch {}
    abortRef.current?.abort();
  }, []);

  async function begin() {
    try {
      const a = new Audio();
      a.src = SILENT;
      a.play().catch(() => {});
      audioRef.current = a;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      ctxRef.current = ctx;
      analyserRef.current = an;
      if (greeting) speak(greeting);
      else listen();
    } catch {
      setMsg(tl("mic"));
      setPhase("error");
    }
  }

  function level() {
    const an = analyserRef.current;
    if (!an) return 0;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  function listen() {
    if (!alive.current || !streamRef.current) return;
    setMsg("");
    setPhase("listening");
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((x) => window.MediaRecorder?.isTypeSupported?.(x)) || "";
    const mr = new MediaRecorder(streamRef.current, type ? { mimeType: type } : undefined);
    const chunks = [];
    let spoke = false;
    let lastLoud = 0;
    let noise = 0.008;
    const started = performance.now();
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      if (orbRef.current) orbRef.current.style.setProperty("--lv", 0);
      if (!alive.current) return;
      if (!spoke || !chunks.length) { setPhase("idle"); return; }
      process(new Blob(chunks, { type: mr.mimeType || type || "audio/webm" }));
    };
    recRef.current = mr;
    mr.start(250);

    const tick = () => {
      if (mr.state === "inactive") return;
      const now = performance.now();
      const lv = level();
      if (now - started < 500) noise = Math.max(noise, lv * 1.2); // learn the room's background noise
      const threshold = Math.max(0.015, noise * 2.2);
      if (lv > threshold) { spoke = true; lastLoud = now; }
      if (orbRef.current) orbRef.current.style.setProperty("--lv", Math.min(1, lv * 9).toFixed(3));
      if ((spoke && now - lastLoud > 1400) || (!spoke && now - started > 15000) || now - started > 60000) { mr.stop(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopListening() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  async function process(blob) {
    setPhase("thinking");
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
    const past = histRef.current.filter((m) => m.content && !m.failed && !m.gen && !m.designs).map(({ role, content }) => ({ role, content })).slice(-16);
    const body = JSON.stringify({
      mode: "chat",
      lang,
      voice: true,
      tutor: tutor || undefined,
      messages: [...past, { role: "user", content: "(voice message)" }],
      images: [{ mimeType: (blob.type || "audio/webm").split(";")[0], data }],
    });
    let acc = "";
    for (let attempt = 0; attempt < 3 && alive.current; attempt++) {
      try {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const res = await fetch("/api/chat", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (j.error === "limit") { onLimit?.(); onClose(); return; }
          throw new Error(j.error || "ai");
        }
        acc = await res.text();
        if (/\u0000ERR:/.test(acc) && !acc.replace(/\u0000ERR:\w+/, "").trim()) throw new Error(/busy/.test(acc) ? "busy" : "ai");
        break;
      } catch (e) {
        if (!alive.current || e?.name === "AbortError") return;
        if (attempt === 2) { setMsg(e.message === "busy" ? tl("busy") : tl("error")); setPhase("idle"); return; }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    acc = acc.replace(/\n*\u0000ERR:\w+\s*$/, "");
    const m = acc.match(HEARD);
    const you = m ? m[1].trim() : "";
    const answer = acc.replace(HEARD, "").trim();
    setHeard(you);
    setReply(answer);
    turnRef.current?.(you, answer);
    speak(answer);
  }

  function speakFallback(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[tutor?.target] || SPEECH_LANG[lang] || "en-US";
      u.onend = () => alive.current && listen();
      u.onerror = () => alive.current && listen();
      window.speechSynthesis.speak(u);
    } catch {
      listen();
    }
  }

  async function speak(text) {
    if (!alive.current) return;
    setPhase("speaking");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ text }),
      });
      if (res.status === 429 && (await res.clone().json().catch(() => ({}))).error === "voice_limit") {
        setMsg(tl("voiceLimit")); setPhase("error");
        setTimeout(() => { onLimit?.("voice"); onClose(); }, 2500);
        return;
      }
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = audioRef.current || new Audio();
      audioRef.current = a;
      a.onended = () => { URL.revokeObjectURL(url); if (alive.current) listen(); };
      a.onerror = () => speakFallback(text);
      a.src = url;
      await a.play();
    } catch {
      if (alive.current) speakFallback(text);
    }
  }

  function interrupt() {
    try { audioRef.current?.pause(); window.speechSynthesis?.cancel(); } catch {}
    listen();
  }

  function onOrb() {
    if (phase === "start") return begin();
    if (phase === "listening") return stopListening();
    if (phase === "speaking") return interrupt();
    if (phase === "idle" || phase === "error") return streamRef.current ? listen() : begin();
  }

  const status = { start: tl("startSub"), listening: tl("listening"), thinking: tl("thinking"), speaking: tl("speaking"), idle: tl("idle"), error: msg }[phase];

  return (
    <div className="voice" role="dialog" aria-label="Voice">
      <div className="voice-top">
        <span className="voice-title">{tutor ? "🎓 " + tl("teacher") : "AHM AI"}</span>
        <button className="voice-text-toggle" onClick={() => setShowText(!showText)}>{showText ? tl("hideText") : tl("showText")}</button>
      </div>

      <div className="voice-center">
        <button ref={orbRef} className={"orb " + phase} onClick={onOrb} aria-label={status}>
          <span className="orb-core" />
          <span className="orb-ring" />
        </button>
        {phase === "start" ? (
          <>
            <button className="gold-btn voice-start" onClick={begin}>{tl("start")}</button>
            <p className="voice-status">{status}</p>
          </>
        ) : (
          <p className={"voice-status" + (phase === "error" ? " err" : "")} role="status">{msg || status}</p>
        )}
      </div>

      {showText && (heard || reply) && phase !== "start" && (
        <div className="voice-text">
          {heard && <p className="you" dir="auto"><small>{tl("you")}:</small> {heard}</p>}
          {reply && <p className="ai" dir="auto">{reply}</p>}
        </div>
      )}

      <button className="voice-end" onClick={onClose}>{tl("end")}</button>
    </div>
  );
}
