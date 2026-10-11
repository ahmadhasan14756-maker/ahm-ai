"use client";
// Code editor with syntax colours (CodeMirror). Loaded only in the browser.
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

function langFor(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (["js", "mjs", "cjs"].includes(ext)) return [javascript()];
  if (ext === "jsx") return [javascript({ jsx: true })];
  if (ext === "ts") return [javascript({ typescript: true })];
  if (ext === "tsx") return [javascript({ jsx: true, typescript: true })];
  if (["html", "htm", "vue", "svelte", "php"].includes(ext)) return [html()];
  if (["css", "scss", "less"].includes(ext)) return [css()];
  if (ext === "py") return [python()];
  if (ext === "json") return [json()];
  if (["md", "markdown", "txt"].includes(ext)) return [markdown()];
  return [];
}

const look = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "#0e0f12" },
  ".cm-scroller": { fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace', lineHeight: "1.6" },
  ".cm-gutters": { backgroundColor: "#0e0f12", borderRight: "1px solid #2b2e35" },
  ".cm-content": { direction: "ltr", textAlign: "left" },
});

export default function CodeEditor({ path, value, onChange, readOnly }) {
  return (
    <CodeMirror
      key={path}
      value={value}
      height="100%"
      theme={oneDark}
      extensions={[...langFor(path), look, EditorView.lineWrapping]}
      editable={!readOnly}
      readOnly={readOnly}
      basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: true }}
      onChange={(v) => onChange(v)}
    />
  );
}
