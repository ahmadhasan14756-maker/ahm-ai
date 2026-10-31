// The app does not render LaTeX, so math must be plain, readable text like in a school book.
// This turns any LaTeX the model slips in ($…$, \frac, a_{10}, x^2, \times …) into clean Unicode:
//   $S_{20} = \frac{20}{2}(a_1 + a_n)$  →  S₂₀ = (20)/(2)(a₁ + aₙ)
// Code blocks and inline code are left untouched.
const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", i: "ᵢ", j: "ⱼ", k: "ₖ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ" };
const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ" };
const toSub = (s) => [...String(s)].map((c) => SUB[c] ?? c).join("");
const toSup = (s) => [...String(s)].map((c) => SUP[c] ?? c).join("");

function convert(s) {
  // remove the $…$ / $$…$$ and \( \) \[ \] math delimiters (keep what is inside)
  s = s.replace(/\${1,2}/g, "").replace(/\\[()[\]]/g, " ");
  // \frac{a}{b} → (a)/(b) — run twice for one level of nesting
  const frac = (x) => x.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (m, a, b) => `(${a.trim()})/(${b.trim()})`);
  s = frac(frac(s));
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  // operators and arrows
  s = s.replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\cdot/g, "·")
       .replace(/\\pm/g, "±").replace(/\\leq?\b/g, "≤").replace(/\\geq?\b/g, "≥")
       .replace(/\\neq\b/g, "≠").replace(/\\approx\b/g, "≈").replace(/\\infty\b/g, "∞")
       .replace(/\\(?:Rightarrow|rightarrow|to|implies)\b/g, "→").replace(/\\(?:Leftarrow|leftarrow)\b/g, "←")
       .replace(/\\(?:left|right|quad|qquad|,|;|!|:)/g, " ").replace(/\\%/g, "%").replace(/\\\$/g, "$");
  // subscripts and superscripts: a_{10}, a_1, S_{n}, x^{2}, x^2
  s = s.replace(/_\{([^{}]+)\}/g, (m, g) => toSub(g)).replace(/_([A-Za-z0-9])/g, (m, g) => toSub(g));
  s = s.replace(/\^\{([^{}]+)\}/g, (m, g) => toSup(g)).replace(/\^([A-Za-z0-9])/g, (m, g) => toSup(g));
  // any remaining \command → just its name; then drop the math braces that are left over
  s = s.replace(/\\([A-Za-z]+)\s?/g, "$1").replace(/[{}]/g, "");
  return s;
}

export function tidyMath(text) {
  const t = String(text ?? "");
  if (!/[$\\]|_[A-Za-z0-9{]|\^[A-Za-z0-9{]/.test(t)) return t; // nothing LaTeX-like: leave it
  // keep fenced ```…``` and inline `…` code exactly as they are
  return t.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((p, i) => (i % 2 ? p : convert(p))).join("");
}
