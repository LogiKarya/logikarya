const canvasBoards = {};

function cloneBoardElements(elements) {
  return JSON.parse(JSON.stringify(elements || []));
}

function generateBoardElementId(prefix = "board") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createCanvasToolbarMarkup(boardId) {
  return `
    <div class="whiteboard-toolbar-inner">
      <div class="whiteboard-toolbar-group" role="group" aria-label="Board Tools">
        <button class="btn btn-outline-dark active" data-board-tool="${boardId}" data-tool="pen" type="button">Pen</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="select" type="button">Select</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="eraser" type="button">Eraser</button>
      </div>

      <div class="whiteboard-toolbar-group" role="group" aria-label="Shapes">
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="rect" type="button">Rect</button>
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="circle" type="button">Circle</button>
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="line" type="button">Line</button>
      </div>

      <div class="whiteboard-toolbar-group" role="group" aria-label="Insert">
        <button class="btn btn-outline-primary" data-board-action="${boardId}" data-action="add-text" type="button">Add Text</button>
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-color-picker">Warna</label>
        <input type="color" id="${boardId}-color-picker" data-board-color="${boardId}" value="#0d6efd" title="Pilih warna" />
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-brush-size">Ukuran</label>
        <input type="range" id="${boardId}-brush-size" data-board-size="${boardId}" min="1" max="20" value="3" title="Ukuran brush" />
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-group-end" role="group" aria-label="Actions">
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="undo" type="button">Undo</button>
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="redo" type="button">Redo</button>
        <button class="btn btn-outline-danger" data-board-action="${boardId}" data-action="clear" type="button">Clear</button>
      </div>
    </div>
  `;
}

function ensureBoardOverlay(board) {
  let overlay = board.wrapper.querySelector(".whiteboard-object-layer");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "whiteboard-object-layer";
    board.wrapper.appendChild(overlay);
  }
  board.overlay = overlay;
}

function createCanvasBoard({
  id,
  canvas,
  wrapper,
  toolbar,
  defaultColor = "#0d6efd",
  defaultBrushSize = 3,
}) {
  if (!canvas || !wrapper || !toolbar) return null;

  const board = {
    id,
    canvas,
    wrapper,
    toolbar,
    overlay: null,
    ctx: canvas.getContext("2d"),
    tool: "pen",
    color: defaultColor,
    brushSize: defaultBrushSize,
    elements: [],
    history: [],
    redoStack: [],
    draftElement: null,
    activeObjectId: null,
    dragState: null,
    imageCache: {},
    lastWidth: canvas.width || 0,
    lastHeight: canvas.height || 0,
  };

  ensureBoardOverlay(board);
  board.toolbar.innerHTML = createCanvasToolbarMarkup(id);

  canvasBoards[id] = board;
  bindBoardToolbar(board);
  bindBoardCanvasEvents(board);
  bindBoardOverlayEvents(board);
  observeBoardResize(board);
  refreshCanvasBoard(id);
  updateBoardToolbarState(board);
  return board;
}

function observeBoardResize(board) {
  if (board.resizeObserver || typeof ResizeObserver === "undefined") return;

  board.resizeObserver = new ResizeObserver(() => {
    refreshCanvasBoard(board.id);
  });
  board.resizeObserver.observe(board.wrapper);
}

function getCanvasBoard(boardId) {
  return canvasBoards[boardId] || null;
}

function bindBoardToolbar(board) {
  if (board.toolbar.dataset.bound === "true") return;
  board.toolbar.dataset.bound = "true";

  board.toolbar.addEventListener("click", (event) => {
    const toolButton = event.target.closest(`[data-board-tool="${board.id}"]`);
    if (toolButton) {
      setCanvasBoardTool(board.id, toolButton.dataset.tool || "pen");
      return;
    }

    const actionButton = event.target.closest(`[data-board-action="${board.id}"]`);
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    if (action === "add-text") {
      promptBoardText(board.id);
      return;
    }

    if (action === "undo") {
      undoCanvasBoard(board.id);
      return;
    }

    if (action === "redo") {
      redoCanvasBoard(board.id);
      return;
    }

    if (action === "clear") {
      clearCanvasBoard(board.id);
    }
  });

  board.toolbar
    .querySelector(`[data-board-color="${board.id}"]`)
    ?.addEventListener("input", (event) => {
      board.color = event.target.value || board.color;
      repaintCanvasBoard(board);
    });

  board.toolbar
    .querySelector(`[data-board-size="${board.id}"]`)
    ?.addEventListener("input", (event) => {
      board.brushSize = Number(event.target.value) || board.brushSize;
    });
}

function bindBoardCanvasEvents(board) {
  if (board.canvas.dataset.bound === "true") return;
  board.canvas.dataset.bound = "true";

  board.canvas.addEventListener("mousedown", (event) => startBoardPointer(board, event));
  board.canvas.addEventListener("mousemove", (event) => moveBoardPointer(board, event));
  board.canvas.addEventListener("mouseup", (event) => stopBoardPointer(board, event));
  board.canvas.addEventListener("mouseleave", (event) => stopBoardPointer(board, event));
}

function bindBoardOverlayEvents(board) {
  if (board.overlay.dataset.bound === "true") return;
  board.overlay.dataset.bound = "true";

  board.overlay.addEventListener("mousedown", (event) => {
    const textNode = event.target.closest(".whiteboard-text-item");
    if (!textNode) return;

    const textId = textNode.dataset.objectId;
    if (!textId) return;

    if (board.tool !== "select") {
      board.activeObjectId = textId;
      renderBoardTextLayer(board);
      return;
    }

    event.preventDefault();
    board.activeObjectId = textId;
    const pointer = getBoardPointer(board, event);
    const target = board.elements.find((item) => item.id === textId);
    if (!target) return;

    saveCanvasBoardState(board.id);
    board.dragState = {
      id: textId,
      offsetX: pointer.x - target.x,
      offsetY: pointer.y - target.y,
    };
    renderBoardTextLayer(board);
  });

  board.overlay.addEventListener("dblclick", (event) => {
    const textNode = event.target.closest(".whiteboard-text-item");
    if (!textNode) return;
    editBoardText(board.id, textNode.dataset.objectId);
  });

  window.addEventListener("mousemove", (event) => moveBoardText(board, event));
  window.addEventListener("mouseup", () => stopBoardText(board));
}

function getBoardPointer(board, event) {
  const rect = board.canvas.getBoundingClientRect();
  const scaleX = rect.width ? board.canvas.width / rect.width : 1;
  const scaleY = rect.height ? board.canvas.height / rect.height : 1;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function setCanvasBoardTool(boardId, tool) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  board.tool = tool;
  if (tool !== "select") {
    board.activeObjectId = null;
  }
  updateBoardToolbarState(board);
  renderBoardTextLayer(board);
}

function updateBoardToolbarState(board) {
  board.toolbar.querySelectorAll(`[data-board-tool="${board.id}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === board.tool);
  });
}

function saveCanvasBoardState(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  board.history.push(cloneBoardElements(board.elements));
  board.redoStack = [];
}

function undoCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.history.length) return;

  board.redoStack.push(cloneBoardElements(board.elements));
  board.elements = board.history.pop();
  board.activeObjectId = null;
  repaintCanvasBoard(board);
}

function redoCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.redoStack.length) return;

  board.history.push(cloneBoardElements(board.elements));
  board.elements = board.redoStack.pop();
  board.activeObjectId = null;
  repaintCanvasBoard(board);
}

function clearCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.elements.length) return;

  saveCanvasBoardState(boardId);
  board.elements = [];
  board.activeObjectId = null;
  repaintCanvasBoard(board);
}

function promptBoardText(boardId) {
  const text = window.prompt("Masukkan teks yang ingin ditambahkan:");
  if (!text || !text.trim()) return;
  addTextToCanvasBoard(boardId, text.trim());
}

function addTextToCanvasBoard(boardId, text, coordinates = null) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  saveCanvasBoardState(boardId);
  board.elements.push({
    type: "text",
    id: generateBoardElementId("text"),
    text,
    x: coordinates?.x ?? board.canvas.width / 2,
    y: coordinates?.y ?? board.canvas.height / 2,
    color: board.color,
    fontSize: 18,
  });
  board.activeObjectId = board.elements.at(-1)?.id || null;
  board.tool = "select";
  updateBoardToolbarState(board);
  repaintCanvasBoard(board);
}

function editBoardText(boardId, objectId) {
  const board = getCanvasBoard(boardId);
  if (!board) return;
  const target = board.elements.find((item) => item.id === objectId && item.type === "text");
  if (!target) return;

  const nextText = window.prompt("Edit teks:", target.text);
  if (nextText === null) return;

  saveCanvasBoardState(boardId);
  target.text = nextText.trim() || target.text;
  board.activeObjectId = target.id;
  repaintCanvasBoard(board);
}

function moveBoardText(board, event) {
  if (!board.dragState) return;
  const target = board.elements.find((item) => item.id === board.dragState.id);
  if (!target) return;

  const pointer = getBoardPointer(board, event);
  target.x = clampBoardValue(pointer.x - board.dragState.offsetX, 16, board.canvas.width - 16);
  target.y = clampBoardValue(pointer.y - board.dragState.offsetY, 16, board.canvas.height - 16);
  renderBoardTextLayer(board);
}

function stopBoardText(board) {
  if (!board.dragState) return;
  board.dragState = null;
  repaintCanvasBoard(board);
}

function clampBoardValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function startBoardPointer(board, event) {
  if (board.tool === "select") {
    board.activeObjectId = null;
    renderBoardTextLayer(board);
    return;
  }

  const { x, y } = getBoardPointer(board, event);
  saveCanvasBoardState(board.id);

  if (board.tool === "pen" || board.tool === "eraser") {
    board.draftElement = {
      type: board.tool,
      id: generateBoardElementId(board.tool),
      color: board.tool === "eraser" ? "#ffffff" : board.color,
      brushSize: board.brushSize,
      points: [{ x, y }],
    };
    return;
  }

  if (["rect", "circle", "line"].includes(board.tool)) {
    board.draftElement = {
      type: board.tool,
      id: generateBoardElementId(board.tool),
      color: board.color,
      brushSize: board.brushSize,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
    };
  }
}

function moveBoardPointer(board, event) {
  if (!board.draftElement) return;

  const { x, y } = getBoardPointer(board, event);
  if (board.draftElement.type === "pen" || board.draftElement.type === "eraser") {
    board.draftElement.points.push({ x, y });
  } else {
    board.draftElement.x2 = x;
    board.draftElement.y2 = y;
  }

  repaintCanvasBoard(board, board.draftElement);
}

function stopBoardPointer(board, event) {
  if (!board.draftElement) return;

  const draft = board.draftElement;
  if (draft.type === "pen" || draft.type === "eraser") {
    if (draft.points.length > 1) {
      board.elements.push(draft);
    } else {
      board.history.pop();
    }
  } else {
    const { x, y } = getBoardPointer(board, event);
    draft.x2 = x;
    draft.y2 = y;
    if (Math.abs(draft.x2 - draft.x1) > 2 || Math.abs(draft.y2 - draft.y1) > 2) {
      board.elements.push(draft);
    } else {
      board.history.pop();
    }
  }

  board.draftElement = null;
  repaintCanvasBoard(board);
}

function repaintCanvasBoard(board, draft = null) {
  const ctx = board.ctx;
  ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);

  board.elements.forEach((element) => drawBoardElement(board, element));
  if (draft) {
    drawBoardElement(board, draft);
  }

  renderBoardTextLayer(board);
}

function drawBoardElement(board, element) {
  const ctx = board.ctx;
  if (element.type === "text") return;

  if (element.type === "pen" || element.type === "eraser") {
    if (!element.points?.length) return;
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(element.points[0].x, element.points[0].y);
    element.points.slice(1).forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (element.type === "rect") {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.brushSize;
    ctx.strokeRect(element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1);
    ctx.restore();
    return;
  }

  if (element.type === "circle") {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.brushSize;
    ctx.beginPath();
    ctx.arc(
      element.x1,
      element.y1,
      Math.sqrt((element.x2 - element.x1) ** 2 + (element.y2 - element.y1) ** 2),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (element.type === "line") {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.brushSize;
    ctx.beginPath();
    ctx.moveTo(element.x1, element.y1);
    ctx.lineTo(element.x2, element.y2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (element.type === "image") {
    const image = getCachedBoardImage(board, element.src);
    if (!image) return;
    if (image.complete) {
      ctx.drawImage(image, element.x, element.y, element.width, element.height);
    } else {
      image.onload = () => repaintCanvasBoard(board);
    }
    return;
  }

  if (element.type === "chart") {
    drawBoardChartElement(ctx, element);
    return;
  }

  if (element.type === "table") {
    drawBoardTableElement(ctx, element);
  }
}

function drawBoardChartElement(ctx, element) {
  const maxValue = Math.max(...element.values, 1);
  const barWidth = element.width / element.values.length - 12;

  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Arial";
  ctx.fillText(element.title, element.x, element.y - 16);

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(element.x, element.y);
  ctx.lineTo(element.x, element.y + element.height);
  ctx.lineTo(element.x + element.width, element.y + element.height);
  ctx.stroke();

  element.values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (element.height - 20);
    const x = element.x + 12 + index * (barWidth + 12);
    const y = element.y + element.height - barHeight;

    ctx.fillStyle = `hsl(${210 + index * 18} 75% 55%)`;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#0f172a";
    ctx.font = "12px Arial";
    ctx.fillText(String(value), x, y - 8);
  });
  ctx.restore();
}

function drawBoardTableElement(ctx, element) {
  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Arial";
  ctx.fillText(element.title, element.x, element.y - 16);

  element.rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = element.x + colIndex * element.colWidth;
      const y = element.y + rowIndex * element.rowHeight;

      ctx.fillStyle = rowIndex === 0 ? "#dbeafe" : "#ffffff";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.25;
      ctx.fillRect(x, y, element.colWidth, element.rowHeight);
      ctx.strokeRect(x, y, element.colWidth, element.rowHeight);

      ctx.fillStyle = "#0f172a";
      ctx.font = "13px Arial";
      ctx.fillText(cell || "-", x + 8, y + 22);
    });
  });
  ctx.restore();
}

function renderBoardTextLayer(board) {
  const textElements = board.elements.filter((item) => item.type === "text");
  const seenIds = new Set(textElements.map((item) => item.id));

  board.overlay.querySelectorAll(".whiteboard-text-item").forEach((node) => {
    if (!seenIds.has(node.dataset.objectId)) {
      node.remove();
    }
  });

  textElements.forEach((item) => {
    let node = board.overlay.querySelector(`[data-object-id="${item.id}"]`);
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "whiteboard-text-item";
      node.dataset.objectId = item.id;
      board.overlay.appendChild(node);
    }

    node.textContent = item.text;
    node.style.left = `${item.x}px`;
    node.style.top = `${item.y}px`;
    node.style.color = item.color;
    node.style.fontSize = `${item.fontSize}px`;
    node.classList.toggle("active", board.activeObjectId === item.id);
  });
}

function getCachedBoardImage(board, src) {
  if (!src) return null;
  if (board.imageCache[src]) return board.imageCache[src];

  const image = new Image();
  image.src = src;
  board.imageCache[src] = image;
  return image;
}

function scaleBoardElement(element, scaleX, scaleY) {
  if (element.type === "text") {
    element.x *= scaleX;
    element.y *= scaleY;
    element.fontSize = Math.max(14, Math.round(element.fontSize * ((scaleX + scaleY) / 2)));
    return;
  }

  if (element.type === "pen" || element.type === "eraser") {
    element.points = element.points.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));
    element.brushSize = Math.max(1, element.brushSize * ((scaleX + scaleY) / 2));
    return;
  }

  if (["rect", "circle", "line"].includes(element.type)) {
    element.x1 *= scaleX;
    element.y1 *= scaleY;
    element.x2 *= scaleX;
    element.y2 *= scaleY;
    return;
  }

  if (element.type === "image" || element.type === "chart" || element.type === "table") {
    element.x *= scaleX;
    element.y *= scaleY;
    element.width *= scaleX;
    element.height *= scaleY;
    if (element.colWidth) element.colWidth *= scaleX;
    if (element.rowHeight) element.rowHeight *= scaleY;
  }
}

function refreshCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  const rawWidth = board.wrapper.clientWidth || 0;
  const rawHeight = board.wrapper.clientHeight || 0;
  if ((!rawWidth || !rawHeight) && board.lastWidth && board.lastHeight) return;

  const width = Math.max(rawWidth || board.lastWidth || 320, 320);
  const height = Math.max(rawHeight || board.lastHeight || 320, 320);

  if (!width || !height) return;

  if (board.lastWidth && board.lastHeight && (board.lastWidth !== width || board.lastHeight !== height)) {
    const scaleX = width / board.lastWidth;
    const scaleY = height / board.lastHeight;
    board.elements.forEach((element) => scaleBoardElement(element, scaleX, scaleY));
  }

  board.canvas.width = width;
  board.canvas.height = height;
  board.lastWidth = width;
  board.lastHeight = height;
  repaintCanvasBoard(board);
}

function addImageToCanvasBoard(boardId, src, dimensions = {}) {
  const board = getCanvasBoard(boardId);
  if (!board || !src) return;

  saveCanvasBoardState(boardId);
  const width = dimensions.width || board.canvas.width * 0.42;
  const height = dimensions.height || width * 0.72;
  board.elements.push({
    type: "image",
    id: generateBoardElementId("image"),
    src,
    x: dimensions.x ?? 24,
    y: dimensions.y ?? 24,
    width,
    height,
  });
  repaintCanvasBoard(board);
}

function addChartToCanvasBoard(boardId, title, values) {
  const board = getCanvasBoard(boardId);
  if (!board || !values?.length) return;

  saveCanvasBoardState(boardId);
  board.elements.push({
    type: "chart",
    id: generateBoardElementId("chart"),
    title: title || "Grafik",
    values,
    x: board.canvas.width * 0.52,
    y: 80,
    width: board.canvas.width * 0.38,
    height: 220,
  });
  repaintCanvasBoard(board);
}

function addTableToCanvasBoard(boardId, title, rows) {
  const board = getCanvasBoard(boardId);
  if (!board || !rows?.length) return;

  const colCount = Math.max(...rows.map((row) => row.length), 1);
  const width = board.canvas.width * 0.52;

  saveCanvasBoardState(boardId);
  board.elements.push({
    type: "table",
    id: generateBoardElementId("table"),
    title: title || "Table",
    rows,
    x: 24,
    y: board.canvas.height * 0.58,
    width,
    height: rows.length * 36,
    colWidth: width / colCount,
    rowHeight: 36,
  });
  repaintCanvasBoard(board);
}

function initLifeMathWhiteboard() {
  const toolbar = document.getElementById("whiteboard-toolbar");
  const canvas = document.getElementById("whiteboard");
  const wrapper = canvas?.closest(".whiteboard-wrapper");

  if (!toolbar || !canvas || !wrapper) return null;
  const existingBoard = getCanvasBoard("life-math-board");
  if (existingBoard) {
    if (!toolbar.innerHTML.trim()) {
      toolbar.innerHTML = createCanvasToolbarMarkup("life-math-board");
      existingBoard.toolbar = toolbar;
      bindBoardToolbar(existingBoard);
      updateBoardToolbarState(existingBoard);
    }
    refreshCanvasBoard("life-math-board");
    return existingBoard;
  }

  return createCanvasBoard({
    id: "life-math-board",
    canvas,
    wrapper,
    toolbar,
    defaultColor: "#0d6efd",
    defaultBrushSize: 3,
  });
}

window.createCanvasToolbarMarkup = createCanvasToolbarMarkup;
window.createCanvasBoard = createCanvasBoard;
window.getCanvasBoard = getCanvasBoard;
window.refreshCanvasBoard = refreshCanvasBoard;
window.setCanvasBoardTool = setCanvasBoardTool;
window.undoCanvasBoard = undoCanvasBoard;
window.redoCanvasBoard = redoCanvasBoard;
window.clearCanvasBoard = clearCanvasBoard;
window.addTextToCanvasBoard = addTextToCanvasBoard;
window.editBoardText = editBoardText;
window.addImageToCanvasBoard = addImageToCanvasBoard;
window.addChartToCanvasBoard = addChartToCanvasBoard;
window.addTableToCanvasBoard = addTableToCanvasBoard;
window.initLifeMathWhiteboard = initLifeMathWhiteboard;

document.addEventListener("DOMContentLoaded", () => {
  initLifeMathWhiteboard();
});
