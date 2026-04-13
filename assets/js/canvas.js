// =========================
// GLOBAL CANVAS TOOL OBJECT
// =========================
window.canvasTool = null;

// =========================
// INIT CANVAS
// =========================
function initCanvas(canvas) {
  const ctx = canvas.getContext("2d");

  // Resize canvas sesuai container
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // State
  let drawing = false;
  let currentTool = "pen";
  let brushColor = "#000000";
  let brushSize = 2;

  // =========================
  // TOOL OBJECT
  // =========================
  window.canvasTool = {
    setTool(tool) {
      currentTool = tool;
    },
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    addText() {
      const text = document.createElement("div");
      text.className = "canvas-element canvas-text";
      text.contentEditable = true;
      text.style.left = "50px";
      text.style.top = "50px";
      text.innerText = "Tulis di sini...";

      canvas.parentElement.appendChild(text);
      makeDraggable(text);
    },
    addRect() {
      const rect = document.createElement("div");
      rect.className = "canvas-element canvas-rect";
      rect.style.width = "100px";
      rect.style.height = "60px";
      rect.style.left = "60px";
      rect.style.top = "60px";

      canvas.parentElement.appendChild(rect);
      makeDraggable(rect);
    },
  };

  // =========================
  // DRAW EVENTS
  // =========================
  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";

    if (currentTool === "pen") {
      ctx.strokeStyle = brushColor;
    } else if (currentTool === "eraser") {
      ctx.strokeStyle = "#ffffff";
    }

    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.closePath();
  });

  canvas.addEventListener("mouseleave", () => {
    drawing = false;
  });

  // =========================
  // TOOLBAR CONTROL
  // =========================
  document.addEventListener("input", (e) => {
    if (e.target.id === "colorPicker") {
      brushColor = e.target.value;
    }

    if (e.target.id === "brushSize") {
      brushSize = e.target.value;
    }
  });
}
