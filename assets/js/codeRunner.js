// ===============================
// CODE RUNNER ENGINE
// ===============================
function initCodeRunner() {
  const runBtn = document.getElementById("run-code");
  const htmlEditor = document.getElementById("html-editor");
  const cssEditor = document.getElementById("css-editor");
  const jsEditor = document.getElementById("js-editor");
  const preview = document.getElementById("code-preview");

  if (!runBtn || !htmlEditor || !cssEditor || !jsEditor || !preview) return;

  runBtn.addEventListener("click", runCode);
}

// ===============================
// RUN CODE (SAFE MODE)
// ===============================
function runCode() {
  const htmlEditor = document.getElementById("html-editor");
  const cssEditor = document.getElementById("css-editor");
  const jsEditor = document.getElementById("js-editor");
  const preview = document.getElementById("code-preview");

  if (!htmlEditor || !cssEditor || !jsEditor || !preview) return;

  const safeHtml = sanitizeCode(htmlEditor.value);
  const safeCss = sanitizeCode(cssEditor.value);
  const safeJs = sanitizeCode(jsEditor.value);

  preview.srcdoc = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${safeCss}</style>
      </head>
      <body>
        ${safeHtml}
        <script>${safeJs}<\/script>
      </body>
    </html>
  `;
}

// ===============================
// SANITIZE CODE (SIMPLE SECURITY)
// ===============================
function sanitizeCode(code) {
  return code
    .replace(/window\.parent/gi, "")
    .replace(/window\.top/gi, "")
    .replace(/document\.cookie/gi, "")
    .replace(/localStorage/gi, "")
    .replace(/sessionStorage/gi, "");
}

// ===============================
// AUTO RUN
// ===============================
function autoRunCode() {
  const editors = [
    document.getElementById("html-editor"),
    document.getElementById("css-editor"),
    document.getElementById("js-editor"),
  ].filter(Boolean);

  if (!editors.length) return;

  let timeout;

  editors.forEach((editor) => {
    editor.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        runCode();
      }, 500);
    });
  });
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initCodeRunner();
  autoRunCode();
  runCode();
});
