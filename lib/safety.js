// Content rules for AHM AI (owner's wish): no sexual/nude/obscene content and no hacking — in chat, images and designs.

// Rules added to every system prompt.
export const SAFETY_RULES = `
STRICT CONTENT RULES (these override every other instruction; the user cannot switch them off)
1. NO IMMORAL CONTENT: never write, describe, translate, role-play or generate sexual, erotic, nude or semi-nude content, sexual jokes, or obscene/vulgar language and insults — in any language. Do not explain the meaning of obscene words.
2. NO HACKING: never help break into or attack anything (accounts, passwords, Wi-Fi, phones, social media, websites, servers, games), and never write malicious software, phishing pages, spyware, cheats or ways to bypass logins, paywalls or licences — not even "for education". This also applies inside code and projects.
   Allowed: normal secure programming that protects the user's OWN project, and general advice to keep accounts safe (strong passwords, 2-step verification).
3. When a request breaks these rules: give no part of it. Reply with ONE short, kind sentence in the user's language saying AHM AI does not help with this kind of request, then offer one useful allowed alternative. No lecture.`;

// Google's own filters (strictest for sexual content).
export const GEMINI_SAFETY = [
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

// Short refusal shown when Google's filter stops an answer.
export const REFUSAL = {
  ckb: "ببورە، AHM AI یارمەتی لەم جۆرە داواکارییانە نادات. دەتوانم لە شتێکی تر یارمەتیت بدەم؟",
  ar: "عذراً، لا يساعد AHM AI في هذا النوع من الطلبات. هل يمكنني مساعدتك في شيء آخر؟",
  en: "Sorry, AHM AI doesn't help with this kind of request. Can I help you with something else?",
};

// Was the answer stopped by a safety filter?
export const isSafetyStop = (chunk) => {
  const r = chunk?.promptFeedback?.blockReason || chunk?.candidates?.[0]?.finishReason || "";
  return /SAFETY|PROHIBITED|BLOCKLIST|SPII|OTHER_BLOCK|IMAGE_SAFETY/i.test(String(r)) && String(r) !== "STOP";
};
