// Shared layout for the privacy and terms pages (server-rendered, all three languages on one page).
const NAMES = { ckb: "کوردی", ar: "العربية", en: "English" };

export default function LegalPage({ doc, updated }) {
  return (
    <div className="legal">
      <nav className="legal-nav">
        <a href="/" className="brand"><img src="/icon-192.png" alt="" /><span className="brand-name">AHM <b>AI</b></span></a>
        <div className="legal-langs">
          {Object.keys(doc).map((l) => <a key={l} href={`#${l}`}>{NAMES[l]}</a>)}
        </div>
      </nav>
      {Object.entries(doc).map(([l, d]) => (
        <article key={l} id={l} lang={l} dir={l === "en" ? "ltr" : "rtl"} className="legal-doc">
          <h1>{d.title}</h1>
          <p className="legal-date">{d.updatedLabel}: {updated}</p>
          {d.intro && <p>{d.intro}</p>}
          {d.sections.map(([h, items]) => (
            <section key={h}>
              <h2>{h}</h2>
              <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          ))}
        </article>
      ))}
      <footer className="legal-foot"><a href="/">AHM AI</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></footer>
    </div>
  );
}
