// ===============================
// UTILS: CANVAS HELPERS

// Resize canvas agar tetap tajam (HD / Retina)
function resizeCanvas(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  ctx.scale(ratio, ratio);
}

// Simpan canvas ke image (base64)
function exportCanvas(canvas) {
  return canvas.toDataURL("image/png");
}

// Download canvas sebagai file PNG
function downloadCanvas(canvas, filename = "whiteboard.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ===============================
// UTILS: LOCAL STORAGE

// Simpan data ke localStorage
function saveToLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Ambil data dari localStorage
function loadFromLocal(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Hapus data
function clearLocal(key) {
  localStorage.removeItem(key);
}

// ===============================
// UTILS: DOM HELPERS

// Ambil elemen
function $(selector) {
  return document.querySelector(selector);
}

// Ambil banyak elemen
function $all(selector) {
  return document.querySelectorAll(selector);
}

// ===============================
// UTILS: EVENT HELPERS
function on(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

// ===============================
// UTILS: RANDOM / ID

function generateId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).substr(2, 9);
}

// ===============================
// UTILS: DEBOUNCE (PERFORMANCE)
function debounce(func, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// ===============================
// UTILS: SIMPLE LOGGER
function log(...args) {
  console.log("[LogiKarya]:", ...args);
}
