// ===============================
// CODE RUNNER ENGINE
// ===============================
function initCodeRunner() {
  const runBtn = document.getElementById("run-code");
  const editor = document.getElementById("code-editor");
  const preview = document.getElementById("code-preview");

  if (!runBtn || !editor || !preview) return;

  runBtn.addEventListener("click", runCode);
}

// ===============================
// RUN CODE (SAFE MODE)
// ===============================
function runCode() {
  const editor = document.getElementById("code-editor");
  const preview = document.getElementById("code-preview");

  const code = editor.value;

  // basic sanitization (hindari script berbahaya sederhana)
  const safeCode = sanitizeCode(code);
  preview.srcdoc = code;
}

// ===============================
// SANITIZE CODE (SIMPLE SECURITY)
// ===============================
function sanitizeCode(code) {
  // blokir akses parent/window luar iframe
  return code
    .replace(/window\.parent/gi, "")
    .replace(/window\.top/gi, "")
    .replace(/document\.cookie/gi, "")
    .replace(/localStorage/gi, "")
    .replace(/sessionStorage/gi, "");
}

// ===============================
// AUTO RUN (OPTIONAL)
// ===============================
function autoRunCode() {
  const editor = document.getElementById("code-editor");
  if (!editor) return;

  let timeout;

  editor.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      runCode();
    }, 500); // debounce 500ms
  });
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initCodeRunner();
  autoRunCode(); // bisa dimatikan kalau tidak mau auto-run
});
