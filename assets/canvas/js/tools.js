// ===============================
// INIT TOOLS
// ===============================
function initTools() {
  bindToolButtons();
  bindColorPicker();
  bindBrushSize();
  bindActions();
}

// ===============================
// TOOL BUTTONS (PEN, ERASER, SHAPES)
// ===============================
function bindToolButtons() {
  const tools = [
    { id: "tool-pen", tool: "pen" },
    { id: "tool-eraser", tool: "eraser" },
    { id: "tool-rect", tool: "rect" },
    { id: "tool-circle", tool: "circle" },
    { id: "tool-line", tool: "line" },
  ];

  tools.forEach((t) => {
    const btn = document.getElementById(t.id);
    if (!btn) return;

    btn.addEventListener("click", () => {
      setTool(t.tool);
      setActiveButton(btn);
    });
  });
}

// ===============================
// COLOR PICKER
// ===============================
function bindColorPicker() {
  const colorPicker = document.getElementById("color-picker");
  if (!colorPicker) return;

  colorPicker.addEventListener("input", (e) => {
    setColor(e.target.value);
  });
}

// ===============================
// BRUSH SIZE
// ===============================
function bindBrushSize() {
  const brush = document.getElementById("brush-size");
  if (!brush) return;

  brush.addEventListener("input", (e) => {
    setBrushSize(e.target.value);
  });
}

// ===============================
// ACTION BUTTONS (UNDO, REDO, CLEAR)
// ===============================
function bindActions() {
  const undoBtn = document.getElementById("undo");
  const redoBtn = document.getElementById("redo");
  const clearBtn = document.getElementById("clear");

  if (undoBtn) undoBtn.addEventListener("click", undo);
  if (redoBtn) redoBtn.addEventListener("click", redo);
  if (clearBtn) clearBtn.addEventListener("click", clearCanvas);
}

// ===============================
// ACTIVE BUTTON UI
// ===============================
function setActiveButton(activeBtn) {
  document.querySelectorAll(".whiteboard-toolbar .btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  activeBtn.classList.add("active");
}
