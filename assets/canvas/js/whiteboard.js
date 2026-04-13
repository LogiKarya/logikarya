// ===============================
// WHITEBOARD ENGINE
// ===============================
let canvas, ctx;
let drawing = false;
let currentTool = "pen";
let color = "#000000";
let brushSize = 3;

let history = [];
let redoStack = [];

let startX = 0;
let startY = 0;

// ===============================
// INIT
// ===============================
function initWhiteboard() {
  canvas = document.getElementById("whiteboard");
  if (!canvas) return;

  ctx = canvas.getContext("2d");

  // fix scaling
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // event mouse
  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mousemove", draw);
}

// ===============================
// DRAW EVENTS
// ===============================
function startDraw(e) {
  drawing = true;

  const { x, y } = getMousePos(e);
  startX = x;
  startY = y;

  saveState();

  ctx.beginPath();
  ctx.moveTo(x, y);
}

function stopDraw(e) {
  if (!drawing) return;
  drawing = false;

  if (["rect", "circle", "line"].includes(currentTool)) {
    const { x, y } = getMousePos(e);
    drawShape(startX, startY, x, y);
  }

  ctx.beginPath();
}

function draw(e) {
  if (!drawing) return;

  const { x, y } = getMousePos(e);

  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";

  if (currentTool === "pen") {
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  if (currentTool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
}

// ===============================
// SHAPES
// ===============================
function drawShape(x1, y1, x2, y2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;

  if (currentTool === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  if (currentTool === "circle") {
    const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    ctx.beginPath();
    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (currentTool === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// ===============================
// TOOL SETTINGS (dipanggil tools.js)
// ===============================
function setTool(tool) {
  currentTool = tool;
}

function setColor(newColor) {
  color = newColor;
}

function setBrushSize(size) {
  brushSize = size;
}

// ===============================
// UNDO / REDO
// ===============================
function saveState() {
  history.push(canvas.toDataURL());
  redoStack = [];
}

function undo() {
  if (history.length === 0) return;

  redoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = history.pop();

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function redo() {
  if (redoStack.length === 0) return;

  history.push(canvas.toDataURL());
  const img = new Image();
  img.src = redoStack.pop();

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

// ===============================
// CLEAR
// ===============================
function clearCanvas() {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ===============================
// UTIL
// ===============================
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initWhiteboard();
});
