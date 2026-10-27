// The presentation format the AI writes (shared by the Slides studio and by PowerPoint files made in the chat).
export const LANG = { ckb: "Kurdish Sorani in Arabic script (correct Sorani spelling with ڕ ڵ ێ ۆ ە)", ar: "Modern Standard Arabic", en: "English" };
export const LAYOUTS = ["title", "section", "agenda", "bullets", "cards", "two", "table", "process", "stats", "chart", "timeline", "quote", "image", "closing"];
export const ICON_LIST = "rocket shield chart trend users people target idea money clock globe heart star check book education leaf sun energy phone laptop cloud lock home building truck cart chat mail calendar settings search health handshake award location code water factory growth";

export const SCHEMA = `Return JSON only:
{"title": "...", "subtitle": "...", "lang": "ckb|ar|en",
 "corrections": ["short note of each important spelling/grammar/wording fix you made (in the deck language)"],
 "slides": [ one object per slide, each with "layout" and only the fields that layout uses:
  {"layout":"title","kicker":"…","title":"…","subtitle":"…","image":"english picture idea or empty"}
  {"layout":"section","number":"01","title":"…","subtitle":"…"}
  {"layout":"agenda","title":"…","items":["…" ×3-6]}
  {"layout":"bullets","title":"…","text":"optional one-sentence intro","bullets":["…" ×3-6],"image":"optional english picture idea"}
  {"layout":"cards","title":"…","cards":[{"icon":"an icon name","title":"…","text":"one short sentence"} ×2-4]}
  {"layout":"two","title":"…","left":{"title":"…","bullets":["…"]},"right":{"title":"…","bullets":["…"]}}
  {"layout":"table","title":"…","columns":["…" ×2-4],"rows":[["…","…"] ×2-6],"text":"optional one-line note"}
  {"layout":"process","title":"…","flow":[{"icon":"an icon name","title":"2-4 words","text":"one short sentence"} ×3-5]}
  {"layout":"stats","title":"…","stats":[{"value":"42%","label":"…"} ×2-4],"text":"optional source/explanation"}
  {"layout":"chart","title":"…","chart":{"type":"bar|pie|line","labels":["…"],"values":[numbers],"unit":"% or empty"},"text":"the main takeaway","bullets":["optional ×0-3"]}
  {"layout":"timeline","title":"…","steps":[{"when":"…","what":"…"} ×3-6]}
  {"layout":"quote","quote":"…","author":"…"}
  {"layout":"closing","title":"…","subtitle":"…"}
  EVERY slide MUST have "notes": speaker notes — what the presenter says (2-4 natural sentences, same language). ]}`;

export const RULES = (lang) => `You are a world-class presentation designer and editor.
- Write EVERYTHING the audience sees in ${lang}. Perfect spelling and grammar, natural professional wording — never word-by-word translation.
- Keep the original topic, all important facts and the intended meaning. Fix mistakes, remove repetition, make the wording clear and professional.
- PROFESSIONAL, SHORT SLIDES like a top consulting firm: one idea per slide; a title of max 6 words that states the message; bullets of max 8-10 words (key words, not full sentences); max 4-5 bullets; card/step texts of max ~12 words. Never paragraphs on a slide — every explanation goes in "notes".
- Choose the best layout for each slide and vary them (agenda right after the title slide for decks of 7+ slides, cards for 2-4 parallel ideas, two for pros/cons, table for comparing options/features/prices, process for how-it-works steps, timeline for dates/history, stats for key numbers, quote for a strong quote). Avoid more than two "bullets" slides in a row. First slide = "title", last = "closing". Use "section" only for long decks (12+ slides).
- NEVER invent numbers, statistics, dates or quotes. Use "stats"/"chart" only with numbers that are in the source or are well-established public facts; otherwise use another layout.
- "image": a short English idea for a photo/illustration, only for the title slide and at most 2 other slides where a picture really helps; otherwise leave it out. No text in pictures.
- "icon" is ALWAYS one of these names (never an emoji): ${ICON_LIST}.`;


// Keep only known, sensible fields.
export function cleanDeck(d) {
  const s = (v, n = 300) => String(v ?? "").slice(0, n);
  const arr = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f) : undefined);
  const slides = (Array.isArray(d?.slides) ? d.slides : []).slice(0, 30).map((x) => ({
    layout: LAYOUTS.includes(x?.layout) ? x.layout : "bullets",
    title: s(x.title, 160), subtitle: s(x.subtitle, 260), kicker: s(x.kicker, 80), number: s(x.number, 4), text: s(x.text, 300),
    bullets: arr(x.bullets, 6, (b) => s(b, 220)), image: s(x.image, 300),
    cards: arr(x.cards, 4, (c) => ({ icon: s(c?.icon, 16), title: s(c?.title, 90), text: s(c?.text, 260) })),
    items: arr(x.items, 7, (b) => s(b, 120)),
    columns: arr(x.columns, 4, (b) => s(b, 40)),
    rows: arr(x.rows, 6, (r) => (Array.isArray(r) ? r.slice(0, 4).map((c) => s(c, 90)) : [])),
    flow: arr(x.flow, 5, (t) => ({ icon: s(t?.icon, 16), title: s(t?.title, 60), text: s(t?.text, 200) })),
    left: x.left ? { title: s(x.left.title, 90), bullets: arr(x.left.bullets, 5, (b) => s(b, 200)) } : undefined,
    right: x.right ? { title: s(x.right.title, 90), bullets: arr(x.right.bullets, 5, (b) => s(b, 200)) } : undefined,
    stats: arr(x.stats, 4, (t) => ({ value: s(t?.value, 16), label: s(t?.label, 100) })),
    chart: x.chart ? { type: ["bar", "pie", "line"].includes(x.chart.type) ? x.chart.type : "bar", labels: arr(x.chart.labels, 8, (l) => s(l, 40)) || [], values: arr(x.chart.values, 8, (v) => Number(v) || 0) || [], unit: s(x.chart.unit, 12) } : undefined,
    steps: arr(x.steps, 6, (t) => ({ when: s(t?.when, 40), what: s(t?.what, 140) })),
    quote: s(x.quote, 320), author: s(x.author, 80), notes: s(x.notes, 1500),
  }));
  if (!slides.length) return null;
  return { title: s(d.title, 160), subtitle: s(d.subtitle, 260), lang: ["ckb", "ar", "en"].includes(d.lang) ? d.lang : "ckb", corrections: (Array.isArray(d.corrections) ? d.corrections : []).slice(0, 8).map((c) => s(c, 200)), slides };
}

