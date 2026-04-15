// ===============================
// PROJECT STUDIO STATE
// ===============================
let activeProjectId = "design";

const projectWhiteboards = {};
const projectBoardConfigs = [
  { id: "design", title: "Design" },
  { id: "science", title: "Sains & Lingkungan" },
  { id: "economy", title: "Ekonomi" },
];
const pendingBoardImages = {};

// ===============================
// SUBMENU
// ===============================
function initProjectSubmenu() {
  const buttons = document.querySelectorAll(".project-submenu-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      showProjectPanel(button.dataset.project);
    });
  });
}

function showProjectPanel(projectId) {
  activeProjectId = projectId;

  document.querySelectorAll(".project-submenu-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.project === projectId);
  });

  document.querySelectorAll("[data-project-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.projectPanel === projectId);
  });

  if (projectWhiteboards[projectId]) {
    resizeProjectWhiteboard(projectId);
  }
}

// ===============================
// WHITEBOARD HELPERS
// ===============================
function createProjectToolbar(boardId) {
  return `
    <div class="btn-group" role="group" aria-label="Drawing Tools">
      <button class="btn btn-outline-dark active" data-board-tool="${boardId}" data-tool="pen" type="button">Pen</button>
      <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="eraser" type="button">Eraser</button>
    </div>

    <div class="btn-group" role="group" aria-label="Shapes">
      <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="rect" type="button">Rect</button>
      <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="circle" type="button">Circle</button>
      <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="line" type="button">Line</button>
    </div>

    <div class="d-flex align-items-center gap-1">
      <label for="${boardId}-color-picker" class="small">Warna</label>
      <input type="color" id="${boardId}-color-picker" value="#0d6efd" title="Pick Color" />
    </div>

    <div class="d-flex align-items-center gap-1">
      <label for="${boardId}-brush-size" class="small">Ukuran</label>
      <input type="range" id="${boardId}-brush-size" min="1" max="20" value="3" title="Brush Size" />
    </div>

    <div class="btn-group ms-auto" role="group" aria-label="Actions">
      <button class="btn btn-outline-warning" id="${boardId}-undo" type="button">Undo</button>
      <button class="btn btn-outline-warning" id="${boardId}-redo" type="button">Redo</button>
      <button class="btn btn-outline-danger" id="${boardId}-clear" type="button">Clear</button>
    </div>
  `;
}

function initProjectWhiteboards() {
  projectBoardConfigs.forEach((config) => {
    const toolbar = document.getElementById(`${config.id}-whiteboard-toolbar`);
    const canvas = document.getElementById(`${config.id}-whiteboard`);
    const wrapper = canvas?.parentElement;

    if (!toolbar || !canvas || !wrapper) return;

    toolbar.innerHTML = createProjectToolbar(config.id);

    projectWhiteboards[config.id] = {
      canvas,
      ctx: canvas.getContext("2d"),
      wrapper,
      drawing: false,
      tool: "pen",
      color: "#0d6efd",
      brushSize: 3,
      history: [],
      redoStack: [],
      startX: 0,
      startY: 0,
    };

    resizeProjectWhiteboard(config.id);
    bindProjectWhiteboardEvents(config.id);
    bindProjectToolbar(config.id);
  });

  window.addEventListener("resize", () => {
    projectBoardConfigs.forEach((config) => resizeProjectWhiteboard(config.id));
  });

  initConnectedBoardTools();
}

function resizeProjectWhiteboard(boardId) {
  const board = projectWhiteboards[boardId];
  if (!board) return;

  const snapshot = board.canvas.toDataURL();
  board.canvas.width = board.wrapper.clientWidth;
  board.canvas.height = board.wrapper.clientHeight;

  if (snapshot !== "data:,") {
    restoreBoardImage(boardId, snapshot);
  }
}

function bindProjectWhiteboardEvents(boardId) {
  const board = projectWhiteboards[boardId];
  const { canvas } = board;

  canvas.addEventListener("mousedown", (event) => startProjectDraw(boardId, event));
  canvas.addEventListener("mouseup", (event) => stopProjectDraw(boardId, event));
  canvas.addEventListener("mouseleave", (event) => stopProjectDraw(boardId, event));
  canvas.addEventListener("mousemove", (event) => drawOnProjectWhiteboard(boardId, event));
}

function bindProjectToolbar(boardId) {
  const board = projectWhiteboards[boardId];
  if (!board) return;

  document
    .querySelectorAll(`[data-board-tool="${boardId}"]`)
    .forEach((button) => {
      button.addEventListener("click", () => {
        board.tool = button.dataset.tool;
        setProjectActiveTool(boardId, button);
      });
    });

  document
    .getElementById(`${boardId}-color-picker`)
    ?.addEventListener("input", (event) => {
      board.color = event.target.value;
    });

  document
    .getElementById(`${boardId}-brush-size`)
    ?.addEventListener("input", (event) => {
      board.brushSize = Number(event.target.value);
    });

  document
    .getElementById(`${boardId}-undo`)
    ?.addEventListener("click", () => undoProjectWhiteboard(boardId));

  document
    .getElementById(`${boardId}-redo`)
    ?.addEventListener("click", () => redoProjectWhiteboard(boardId));

  document
    .getElementById(`${boardId}-clear`)
    ?.addEventListener("click", () => clearProjectWhiteboard(boardId));
}

function setProjectActiveTool(boardId, activeButton) {
  document
    .querySelectorAll(`[data-board-tool="${boardId}"]`)
    .forEach((button) => button.classList.remove("active"));

  activeButton.classList.add("active");
}

function getProjectMousePosition(boardId, event) {
  const board = projectWhiteboards[boardId];
  const rect = board.canvas.getBoundingClientRect();
  const scaleX = board.canvas.width / rect.width;
  const scaleY = board.canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function saveProjectWhiteboardState(boardId) {
  const board = projectWhiteboards[boardId];
  board.history.push(board.canvas.toDataURL());
  board.redoStack = [];
}

function startProjectDraw(boardId, event) {
  const board = projectWhiteboards[boardId];
  const { x, y } = getProjectMousePosition(boardId, event);

  board.drawing = true;
  board.startX = x;
  board.startY = y;
  saveProjectWhiteboardState(boardId);

  board.ctx.beginPath();
  board.ctx.moveTo(x, y);
}

function stopProjectDraw(boardId, event) {
  const board = projectWhiteboards[boardId];
  if (!board.drawing) return;

  board.drawing = false;

  if (["rect", "circle", "line"].includes(board.tool)) {
    const { x, y } = getProjectMousePosition(boardId, event);
    drawProjectShape(boardId, board.startX, board.startY, x, y);
  }

  board.ctx.beginPath();
}

function drawOnProjectWhiteboard(boardId, event) {
  const board = projectWhiteboards[boardId];
  if (!board.drawing) return;

  const { x, y } = getProjectMousePosition(boardId, event);
  const { ctx, tool, color, brushSize } = board;

  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";

  if (tool === "pen") {
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  if (tool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
}

function drawProjectShape(boardId, x1, y1, x2, y2) {
  const board = projectWhiteboards[boardId];
  const { ctx, tool, color, brushSize } = board;

  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;

  if (tool === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  if (tool === "circle") {
    const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    ctx.beginPath();
    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function restoreBoardImage(boardId, dataUrl) {
  const board = projectWhiteboards[boardId];
  if (!board || !dataUrl || dataUrl === "data:,") return;

  const image = new Image();
  image.onload = () => {
    board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
    board.ctx.drawImage(image, 0, 0, board.canvas.width, board.canvas.height);
  };
  image.src = dataUrl;
}

function undoProjectWhiteboard(boardId) {
  const board = projectWhiteboards[boardId];
  if (!board || board.history.length === 0) return;

  board.redoStack.push(board.canvas.toDataURL());
  restoreBoardImage(boardId, board.history.pop());
}

function redoProjectWhiteboard(boardId) {
  const board = projectWhiteboards[boardId];
  if (!board || board.redoStack.length === 0) return;

  board.history.push(board.canvas.toDataURL());
  restoreBoardImage(boardId, board.redoStack.pop());
}

function clearProjectWhiteboard(boardId) {
  const board = projectWhiteboards[boardId];
  if (!board) return;

  saveProjectWhiteboardState(boardId);
  board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
}

// ===============================
// CONNECTED BOARD TOOLS
// ===============================
function initConnectedBoardTools() {
  ["design", "science", "economy"].forEach((boardId) => {
    const imageInput = document.getElementById(`${boardId}-image-input`);
    const addImageButton = document.getElementById(`${boardId}-add-image`);
    const addChartButton = document.getElementById(`${boardId}-add-chart`);
    const addTableButton = document.getElementById(`${boardId}-add-table`);

    imageInput?.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (!file) {
        pendingBoardImages[boardId] = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          pendingBoardImages[boardId] = image;
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    addImageButton?.addEventListener("click", () => {
      drawBoardImage(boardId);
    });

    addChartButton?.addEventListener("click", () => {
      drawBoardChart(boardId);
    });

    addTableButton?.addEventListener("click", () => {
      drawBoardTable(boardId);
    });
  });
}

function drawBoardImage(boardId) {
  const board = projectWhiteboards[boardId];
  const image = pendingBoardImages[boardId];
  if (!board || !image) return;

  saveProjectWhiteboardState(boardId);

  const maxWidth = board.canvas.width * 0.45;
  const ratio = image.width / image.height || 1;
  const drawWidth = Math.min(maxWidth, image.width);
  const drawHeight = drawWidth / ratio;

  board.ctx.drawImage(image, 24, 24, drawWidth, drawHeight);
}

function drawBoardChart(boardId) {
  const board = projectWhiteboards[boardId];
  const titleInput = document.getElementById(`${boardId}-chart-title`);
  const valuesInput = document.getElementById(`${boardId}-chart-values`);
  if (!board || !titleInput || !valuesInput) return;

  const values = valuesInput.value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);

  if (!values.length) return;

  saveProjectWhiteboardState(boardId);

  const startX = board.canvas.width * 0.52;
  const startY = 80;
  const chartWidth = board.canvas.width * 0.4;
  const chartHeight = 220;
  const maxValue = Math.max(...values, 1);
  const barWidth = chartWidth / values.length - 12;

  board.ctx.save();
  board.ctx.fillStyle = "#0f172a";
  board.ctx.font = "bold 20px Arial";
  board.ctx.fillText(titleInput.value || "Grafik", startX, startY - 20);

  board.ctx.strokeStyle = "#94a3b8";
  board.ctx.lineWidth = 2;
  board.ctx.beginPath();
  board.ctx.moveTo(startX, startY);
  board.ctx.lineTo(startX, startY + chartHeight);
  board.ctx.lineTo(startX + chartWidth, startY + chartHeight);
  board.ctx.stroke();

  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (chartHeight - 20);
    const x = startX + 12 + index * (barWidth + 12);
    const y = startY + chartHeight - barHeight;

    board.ctx.fillStyle = `hsl(${210 + index * 18} 75% 55%)`;
    board.ctx.fillRect(x, y, barWidth, barHeight);

    board.ctx.fillStyle = "#0f172a";
    board.ctx.font = "12px Arial";
    board.ctx.fillText(String(value), x, y - 8);
  });
  board.ctx.restore();
}

function drawBoardTable(boardId) {
  const board = projectWhiteboards[boardId];
  const titleInput = document.getElementById(`${boardId}-table-title`);
  const dataInput = document.getElementById(`${boardId}-table-data`);
  if (!board || !titleInput || !dataInput) return;

  const rows = dataInput.value
    .split(";")
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.length && row.some(Boolean));

  if (!rows.length) return;

  saveProjectWhiteboardState(boardId);

  const startX = 24;
  const startY = board.canvas.height * 0.58;
  const tableWidth = board.canvas.width * 0.52;
  const rowHeight = 36;
  const colCount = Math.max(...rows.map((row) => row.length), 1);
  const colWidth = tableWidth / colCount;

  board.ctx.save();
  board.ctx.fillStyle = "#0f172a";
  board.ctx.font = "bold 20px Arial";
  board.ctx.fillText(titleInput.value || "Table", startX, startY - 16);

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = startX + colIndex * colWidth;
      const y = startY + rowIndex * rowHeight;

      board.ctx.fillStyle = rowIndex === 0 ? "#dbeafe" : "#ffffff";
      board.ctx.strokeStyle = "#94a3b8";
      board.ctx.lineWidth = 1.5;
      board.ctx.fillRect(x, y, colWidth, rowHeight);
      board.ctx.strokeRect(x, y, colWidth, rowHeight);

      board.ctx.fillStyle = "#0f172a";
      board.ctx.font = "13px Arial";
      board.ctx.fillText(cell || "-", x + 8, y + 22);
    });
  });
  board.ctx.restore();
}

// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initProjectSubmenu();
  initProjectWhiteboards();
  showProjectPanel(activeProjectId);
});
