const canvasBoards = {};
let activeCanvasBoardId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cloneBoardObjects(objects) {
  return JSON.parse(JSON.stringify(objects || []));
}

function createBoardObjectId(prefix = "object") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeColor(color, fallback = "#2563eb") {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color || ""))
    ? color
    : fallback;
}

function clampCanvasValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createCanvasToolbarMarkup(boardId) {
  return `
    <div class="whiteboard-toolbar-inner">
      <div class="whiteboard-toolbar-group" role="group" aria-label="Tools">
        <button class="btn btn-outline-dark active" data-board-tool="${boardId}" data-tool="select" type="button">Select</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="text" type="button">Text</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="text-frame" type="button">Text Box</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="pen" type="button">Draw</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="line" type="button">Line</button>
      </div>

      <div class="whiteboard-toolbar-group" role="group" aria-label="Shapes">
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="rect" type="button">Rect</button>
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="circle" type="button">Circle</button>
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="triangle" type="button">Triangle</button>
        <button class="btn btn-outline-secondary" data-board-tool="${boardId}" data-tool="polygon" type="button">Polygon</button>
      </div>

      <div class="whiteboard-toolbar-group" role="group" aria-label="Data Objects">
        <button class="btn btn-outline-primary" data-board-tool="${boardId}" data-tool="table" type="button">Table</button>
        <button class="btn btn-outline-primary" data-board-tool="${boardId}" data-tool="chart-bar" type="button">Bar Chart</button>
        <button class="btn btn-outline-primary" data-board-tool="${boardId}" data-tool="chart-line" type="button">Line Chart</button>
        <button class="btn btn-outline-primary" data-board-action="${boardId}" data-action="upload-image" type="button">Upload Image</button>
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-fill-color">Fill</label>
        <input type="color" id="${boardId}-fill-color" data-board-style="${boardId}" data-style-key="fill" value="#2563eb" />
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-stroke-color">Stroke</label>
        <input type="color" id="${boardId}-stroke-color" data-board-style="${boardId}" data-style-key="stroke" value="#1d4ed8" />
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-stroke-width">Weight</label>
        <input type="range" id="${boardId}-stroke-width" data-board-style="${boardId}" data-style-key="strokeWidth" min="1" max="16" value="3" />
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-shape-kind">Shape</label>
        <select id="${boardId}-shape-kind" data-board-style="${boardId}" data-style-key="shapeKind">
          <option value="rect">Rect</option>
          <option value="circle">Circle</option>
          <option value="triangle">Triangle</option>
          <option value="polygon">Polygon</option>
        </select>
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-control">
        <label for="${boardId}-chart-kind">Chart</label>
        <select id="${boardId}-chart-kind" data-board-style="${boardId}" data-style-key="chartKind">
          <option value="bar">Bar</option>
          <option value="line">Line</option>
        </select>
      </div>

      <div class="whiteboard-toolbar-group whiteboard-toolbar-group-end" role="group" aria-label="Actions">
        <button class="btn btn-outline-danger" data-board-action="${boardId}" data-action="delete" type="button">Delete</button>
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="undo" type="button">Undo</button>
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="redo" type="button">Redo</button>
        <button class="btn btn-outline-danger" data-board-action="${boardId}" data-action="clear" type="button">Clear</button>
      </div>

      <input type="file" hidden accept="image/*" data-board-upload="${boardId}" />
    </div>
  `;
}

function getCanvasBoard(boardId) {
  return canvasBoards[boardId] || null;
}

function ensureBoardScene(board) {
  let scene = board.wrapper.querySelector(".whiteboard-scene");
  if (!scene) {
    scene = document.createElement("div");
    scene.className = "whiteboard-scene";
    board.wrapper.appendChild(scene);
  }
  board.scene = scene;
}

function getDefaultBoardStyle(fill = "#2563eb") {
  const normalizedFill = normalizeColor(fill);
  return {
    fill: normalizedFill,
    stroke: "#1d4ed8",
    strokeWidth: 3,
    textColor: "#16324f",
    shapeKind: "rect",
    chartKind: "bar",
  };
}

function createCanvasBoard({
  id,
  canvas,
  wrapper,
  toolbar,
  defaultColor = "#2563eb",
}) {
  if (!id || !canvas || !wrapper || !toolbar) return null;

  const existing = getCanvasBoard(id);
  if (existing) {
    existing.canvas = canvas;
    existing.wrapper = wrapper;
    existing.toolbar = toolbar;
    ensureBoardScene(existing);
    if (!toolbar.innerHTML.trim()) {
      toolbar.innerHTML = createCanvasToolbarMarkup(id);
      bindBoardToolbar(existing);
    }
    refreshCanvasBoard(id);
    syncBoardDom(existing);
    updateBoardToolbarState(existing);
    syncBoardStyleControls(existing);
    return existing;
  }

  const board = {
    id,
    canvas,
    wrapper,
    toolbar,
    scene: null,
    tool: "select",
    defaults: getDefaultBoardStyle(defaultColor),
    objects: [],
    history: [],
    redoStack: [],
    selectedObjectId: null,
    interaction: null,
    lastWidth: 0,
    lastHeight: 0,
    keyboardBound: false,
    resizeObserver: null,
    toolbarBound: false,
    sceneBound: false,
  };

  toolbar.innerHTML = createCanvasToolbarMarkup(id);
  ensureBoardScene(board);
  canvasBoards[id] = board;

  bindBoardToolbar(board);
  bindBoardSceneEvents(board);
  bindBoardKeyboard(board);
  observeBoardResize(board);
  refreshCanvasBoard(id);
  updateBoardToolbarState(board);
  syncBoardStyleControls(board);
  return board;
}

function observeBoardResize(board) {
  if (board.resizeObserver || typeof ResizeObserver === "undefined") return;

  board.resizeObserver = new ResizeObserver(() => {
    refreshCanvasBoard(board.id);
  });
  board.resizeObserver.observe(board.wrapper);
}

function bindBoardToolbar(board) {
  if (board.toolbarBound) return;
  board.toolbarBound = true;

  board.toolbar.addEventListener("click", (event) => {
    const toolButton = event.target.closest(`[data-board-tool="${board.id}"]`);
    if (toolButton) {
      handleBoardToolSelection(board, toolButton.dataset.tool || "select");
      return;
    }

    const actionButton = event.target.closest(
      `[data-board-action="${board.id}"]`,
    );
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    if (action === "delete") {
      deleteSelectedBoardObject(board.id);
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
      return;
    }

    if (action === "upload-image") {
      board.toolbar.querySelector(`[data-board-upload="${board.id}"]`)?.click();
    }
  });

  board.toolbar
    .querySelectorAll(`[data-board-style="${board.id}"]`)
    .forEach((control) => {
      control.addEventListener("input", () => {
        applyBoardStyleControl(board, control);
      });
      control.addEventListener("change", () => {
        applyBoardStyleControl(board, control);
      });
    });

  board.toolbar
    .querySelector(`[data-board-upload="${board.id}"]`)
    ?.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        addImageToCanvasBoard(board.id, String(reader.result || ""));
        event.target.value = "";
      };
      reader.readAsDataURL(file);
    });
}

function bindBoardSceneEvents(board) {
  if (board.sceneBound) return;
  board.sceneBound = true;

  board.scene.addEventListener("mousedown", (event) => {
    const objectNode = event.target.closest(".whiteboard-object");
    const resizeHandle = event.target.closest(".whiteboard-resize-handle");

    activeCanvasBoardId = board.id;

    if (!objectNode) {
      handleBoardEmptySceneDown(board, event);
      return;
    }

    const objectId = objectNode.dataset.objectId;
    const targetObject = board.objects.find((item) => item.id === objectId);
    if (!targetObject) return;

    setBoardSelection(board, objectId);

    if (resizeHandle && isObjectResizable(targetObject)) {
      event.preventDefault();
      saveCanvasBoardState(board.id);
      board.interaction = {
        type: "resize",
        objectId,
        handle: resizeHandle.dataset.handle || "se",
        startPointer: getBoardPointer(board, event),
        startX: targetObject.x,
        startY: targetObject.y,
        startWidth: targetObject.width,
        startHeight: targetObject.height,
        originalPoints: cloneBoardObjects(targetObject.points || []),
      };
      return;
    }

    if (board.tool !== "select") return;
    if (
      event.target.closest(".whiteboard-object-content[contenteditable='true']")
    )
      return;
    if (event.target.closest(".whiteboard-table-cell[contenteditable='true']"))
      return;

    event.preventDefault();
    saveCanvasBoardState(board.id);
    const pointer = getBoardPointer(board, event);
    board.interaction = {
      type: "move",
      objectId,
      offsetX: pointer.x - targetObject.x,
      offsetY: pointer.y - targetObject.y,
    };
  });

  board.scene.addEventListener("dblclick", (event) => {
    const objectNode = event.target.closest(".whiteboard-object");
    if (!objectNode) return;

    const objectId = objectNode.dataset.objectId;
    const targetObject = board.objects.find((item) => item.id === objectId);
    if (!targetObject) return;

    setBoardSelection(board, objectId);
    activeCanvasBoardId = board.id;

    if (isTextualObject(targetObject)) {
      setObjectEditing(board, objectId, true);
      return;
    }

    if (targetObject.type === "chart") {
      editChartObject(board, objectId);
      return;
    }

    if (targetObject.type === "table") {
      editTableStructure(board, objectId);
    }
  });

  board.scene.addEventListener("input", (event) => {
    const editable = event.target.closest(".whiteboard-object-content");
    if (editable) {
      const target = board.objects.find(
        (item) => item.id === editable.dataset.objectId,
      );
      if (!target) return;
      target.text = editable.textContent || "";
      if (target.type === "text") {
        target.width = Math.max(120, Math.min(420, editable.scrollWidth + 20));
        target.height = Math.max(36, editable.scrollHeight + 10);
        syncBoardDom(board);
      }
      return;
    }

    const tableCell = event.target.closest(".whiteboard-table-cell");
    if (tableCell) {
      const target = board.objects.find(
        (item) => item.id === tableCell.dataset.objectId,
      );
      if (!target || target.type !== "table") return;
      const rowIndex = Number(tableCell.dataset.row);
      const colIndex = Number(tableCell.dataset.col);
      if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) return;
      target.rows[rowIndex][colIndex] = tableCell.textContent || "";
    }
  });

  board.scene.addEventListener(
    "blur",
    (event) => {
      const editable = event.target.closest(".whiteboard-object-content");
      if (editable) {
        const target = board.objects.find(
          (item) => item.id === editable.dataset.objectId,
        );
        if (!target) return;
        target.editing = false;
        if (!target.text.trim()) {
          target.text = target.type === "text-frame" ? "Text box" : "Teks";
        }
        syncBoardDom(board);
      }
    },
    true,
  );

  window.addEventListener("mousemove", (event) => {
    if (!board.interaction) return;
    updateBoardInteraction(board, event);
  });

  window.addEventListener("mouseup", () => {
    stopBoardInteraction(board);
  });
}

function bindBoardKeyboard(board) {
  if (board.keyboardBound) return;
  board.keyboardBound = true;

  document.addEventListener("keydown", (event) => {
    if (activeCanvasBoardId !== board.id || !board.selectedObjectId) return;
    if (
      document.activeElement?.closest?.(
        ".whiteboard-object-content[contenteditable='true']",
      )
    )
      return;
    if (
      document.activeElement?.closest?.(
        ".whiteboard-table-cell[contenteditable='true']",
      )
    )
      return;

    if (event.key === "Delete" || event.key === "Backspace") {
      deleteSelectedBoardObject(board.id);
    }
  });
}

function handleBoardToolSelection(board, tool) {
  activeCanvasBoardId = board.id;
  board.tool = tool;
  updateBoardToolbarState(board);

  if (tool !== "select") {
    setBoardSelection(board, null, false);
  }

  if (tool === "table") {
    createTableObjectFromPrompt(board);
    board.tool = "select";
    updateBoardToolbarState(board);
    return;
  }

  if (tool === "chart-bar" || tool === "chart-line") {
    createChartObjectFromPrompt(board, tool === "chart-line" ? "line" : "bar");
    board.tool = "select";
    updateBoardToolbarState(board);
  }
}

function handleBoardEmptySceneDown(board, event) {
  if (board.tool === "text" || board.tool === "text-frame") {
    createTextObjectAtPointer(board, event, board.tool === "text-frame");
    return;
  }

  if (["rect", "circle", "triangle", "polygon"].includes(board.tool)) {
    createShapeObjectAtPointer(board, event, board.tool);
    return;
  }

  if (board.tool === "line") {
    startLineObject(board, event);
    return;
  }

  if (board.tool === "pen") {
    startFreehandObject(board, event);
    return;
  }

  setBoardSelection(board, null);
}

function getBoardPointer(board, event) {
  const rect = board.scene.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function setCanvasBoardTool(boardId, tool) {
  const board = getCanvasBoard(boardId);
  if (!board) return;
  handleBoardToolSelection(board, tool);
}

function updateBoardToolbarState(board) {
  board.toolbar
    .querySelectorAll(`[data-board-tool="${board.id}"]`)
    .forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === board.tool);
    });
}

function saveCanvasBoardState(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  board.history.push(cloneBoardObjects(board.objects));
  if (board.history.length > 60) {
    board.history.shift();
  }
  board.redoStack = [];
}

function undoCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.history.length) return;

  board.redoStack.push(cloneBoardObjects(board.objects));
  board.objects = board.history.pop();
  board.selectedObjectId = null;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function redoCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.redoStack.length) return;

  board.history.push(cloneBoardObjects(board.objects));
  board.objects = board.redoStack.pop();
  board.selectedObjectId = null;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function clearCanvasBoard(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.objects.length) return;

  saveCanvasBoardState(board.id);
  board.objects = [];
  board.selectedObjectId = null;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function deleteSelectedBoardObject(boardId) {
  const board = getCanvasBoard(boardId);
  if (!board || !board.selectedObjectId) return;

  saveCanvasBoardState(board.id);
  board.objects = board.objects.filter(
    (item) => item.id !== board.selectedObjectId,
  );
  board.selectedObjectId = null;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function setBoardSelection(board, objectId, sync = true) {
  board.selectedObjectId = objectId;
  activeCanvasBoardId = objectId ? board.id : activeCanvasBoardId;
  if (sync) {
    syncBoardDom(board);
  }
  syncBoardStyleControls(board);
}

function setObjectEditing(board, objectId, editing) {
  const target = board.objects.find((item) => item.id === objectId);
  if (!target || !isTextualObject(target)) return;

  target.editing = editing;
  syncBoardDom(board);
  if (!editing) return;

  requestAnimationFrame(() => {
    const editable = board.scene.querySelector(
      `.whiteboard-object[data-object-id="${objectId}"] .whiteboard-object-content`,
    );
    if (!editable) return;
    editable.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function isTextualObject(object) {
  return Boolean(
    object && (object.type === "text" || object.type === "text-frame"),
  );
}

function isObjectResizable(object) {
  return Boolean(object && object.type !== "freehand");
}

function getObjectStyle(object, board) {
  return {
    fill: normalizeColor(object.style?.fill, board.defaults.fill),
    stroke: normalizeColor(object.style?.stroke, board.defaults.stroke),
    strokeWidth:
      Number(object.style?.strokeWidth ?? board.defaults.strokeWidth) || 1,
    textColor: normalizeColor(
      object.style?.textColor,
      board.defaults.textColor,
    ),
    shapeKind: object.style?.shapeKind || board.defaults.shapeKind,
    chartKind: object.style?.chartKind || board.defaults.chartKind,
  };
}

function createBaseObject(type, x, y, width, height, board) {
  return {
    id: createBoardObjectId(type),
    type,
    x,
    y,
    width,
    height,
    style: { ...board.defaults },
  };
}

function createTextObjectAtPointer(board, event, framed = false) {
  saveCanvasBoardState(board.id);
  const pointer = getBoardPointer(board, event);
  const next = createBaseObject(
    framed ? "text-frame" : "text",
    pointer.x,
    pointer.y,
    framed ? 240 : 180,
    framed ? 130 : 44,
    board,
  );
  next.text = "";
  next.editing = true;
  next.style.fill = framed ? "#ffffff" : "transparent";
  next.style.textColor = board.defaults.textColor;

  board.objects.push(next);
  board.tool = "select";
  board.selectedObjectId = next.id;
  updateBoardToolbarState(board);
  syncBoardDom(board);
  syncBoardStyleControls(board);
  setObjectEditing(board, next.id, true);
}

function createShapeObjectAtPointer(board, event, shapeType) {
  saveCanvasBoardState(board.id);
  const pointer = getBoardPointer(board, event);
  const next = createBaseObject(
    shapeType,
    pointer.x - 70,
    pointer.y - 50,
    140,
    110,
    board,
  );
  next.style.fill = board.defaults.fill;
  next.style.stroke = board.defaults.stroke;
  next.style.shapeKind = shapeType;

  board.objects.push(next);
  board.tool = "select";
  board.selectedObjectId = next.id;
  updateBoardToolbarState(board);
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function startLineObject(board, event) {
  saveCanvasBoardState(board.id);
  const pointer = getBoardPointer(board, event);
  const next = createBaseObject("line", pointer.x, pointer.y, 10, 10, board);
  next.style.stroke = board.defaults.stroke;
  next.style.strokeWidth = board.defaults.strokeWidth;

  board.objects.push(next);
  board.selectedObjectId = next.id;
  board.interaction = {
    type: "draw-line",
    objectId: next.id,
    startPointer: pointer,
  };
  board.tool = "select";
  updateBoardToolbarState(board);
  syncBoardDom(board);
}

function startFreehandObject(board, event) {
  saveCanvasBoardState(board.id);
  const pointer = getBoardPointer(board, event);
  const next = createBaseObject("freehand", pointer.x, pointer.y, 1, 1, board);
  next.points = [{ x: 0, y: 0 }];
  next.style.stroke = board.defaults.stroke;
  next.style.strokeWidth = board.defaults.strokeWidth;
  next.style.fill = "transparent";

  board.objects.push(next);
  board.selectedObjectId = next.id;
  board.interaction = {
    type: "draw-freehand",
    objectId: next.id,
    rawPoints: [{ x: pointer.x, y: pointer.y }],
  };
  board.tool = "select";
  updateBoardToolbarState(board);
  syncBoardDom(board);
}

function updateBoardInteraction(board, event) {
  const target = board.objects.find(
    (item) => item.id === board.interaction?.objectId,
  );
  if (!target) return;

  const pointer = getBoardPointer(board, event);

  if (board.interaction.type === "move") {
    target.x = clampCanvasValue(
      pointer.x - board.interaction.offsetX,
      0,
      board.lastWidth - 20,
    );
    target.y = clampCanvasValue(
      pointer.y - board.interaction.offsetY,
      0,
      board.lastHeight - 20,
    );
    syncBoardDom(board);
    return;
  }

  if (board.interaction.type === "resize") {
    applyObjectResize(target, board.interaction, pointer);
    syncBoardDom(board);
    return;
  }

  if (board.interaction.type === "draw-line") {
    const deltaX = pointer.x - board.interaction.startPointer.x;
    const deltaY = pointer.y - board.interaction.startPointer.y;
    target.width = Math.max(10, Math.abs(deltaX));
    target.height = Math.max(10, Math.abs(deltaY));
    target.x = deltaX >= 0 ? board.interaction.startPointer.x : pointer.x;
    target.y = deltaY >= 0 ? board.interaction.startPointer.y : pointer.y;
    target.direction = {
      x1: deltaX >= 0 ? 0 : 1,
      y1: deltaY >= 0 ? 0 : 1,
      x2: deltaX >= 0 ? 1 : 0,
      y2: deltaY >= 0 ? 1 : 0,
    };
    syncBoardDom(board);
    return;
  }

  if (board.interaction.type === "draw-freehand") {
    board.interaction.rawPoints.push({ x: pointer.x, y: pointer.y });
    normalizeFreehandObject(target, board.interaction.rawPoints);
    syncBoardDom(board);
  }
}

function applyObjectResize(target, interaction, pointer) {
  const deltaX = pointer.x - interaction.startPointer.x;
  const deltaY = pointer.y - interaction.startPointer.y;
  const minWidth = target.type === "line" ? 20 : 80;
  const minHeight = target.type === "line" ? 20 : 48;

  let nextX = interaction.startX;
  let nextY = interaction.startY;
  let nextWidth = interaction.startWidth;
  let nextHeight = interaction.startHeight;

  if (interaction.handle.includes("e")) {
    nextWidth = Math.max(minWidth, interaction.startWidth + deltaX);
  }
  if (interaction.handle.includes("s")) {
    nextHeight = Math.max(minHeight, interaction.startHeight + deltaY);
  }
  if (interaction.handle.includes("w")) {
    nextWidth = Math.max(minWidth, interaction.startWidth - deltaX);
    nextX = interaction.startX + (interaction.startWidth - nextWidth);
  }
  if (interaction.handle.includes("n")) {
    nextHeight = Math.max(minHeight, interaction.startHeight - deltaY);
    nextY = interaction.startY + (interaction.startHeight - nextHeight);
  }

  if (target.type === "freehand" && interaction.originalPoints?.length) {
    const scaleX = nextWidth / interaction.startWidth;
    const scaleY = nextHeight / interaction.startHeight;
    target.points = interaction.originalPoints.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));
  }

  target.x = nextX;
  target.y = nextY;
  target.width = nextWidth;
  target.height = nextHeight;
}

function stopBoardInteraction(board) {
  if (!board.interaction) return;
  board.interaction = null;
}

function normalizeFreehandObject(target, rawPoints) {
  const xs = rawPoints.map((point) => point.x);
  const ys = rawPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  target.x = minX;
  target.y = minY;
  target.width = Math.max(10, maxX - minX);
  target.height = Math.max(10, maxY - minY);
  target.points = rawPoints.map((point) => ({
    x: point.x - minX,
    y: point.y - minY,
  }));
}

function applyBoardStyleControl(board, control) {
  const key = control.dataset.styleKey;
  const value =
    control.type === "range" ? Number(control.value) : control.value;

  if (key === "fill") {
    board.defaults.fill = normalizeColor(value, board.defaults.fill);
  } else if (key === "stroke") {
    board.defaults.stroke = normalizeColor(value, board.defaults.stroke);
  } else if (key === "strokeWidth") {
    board.defaults.strokeWidth = Number(value) || board.defaults.strokeWidth;
  } else if (key === "shapeKind") {
    board.defaults.shapeKind = value || board.defaults.shapeKind;
  } else if (key === "chartKind") {
    board.defaults.chartKind = value || board.defaults.chartKind;
  }

  const target = board.objects.find(
    (item) => item.id === board.selectedObjectId,
  );
  if (!target) return;

  if (key === "fill") {
    if (isTextualObject(target) && target.type === "text") {
      target.style.textColor = normalizeColor(value, board.defaults.fill);
    } else {
      target.style.fill = normalizeColor(value, board.defaults.fill);
    }
  }

  if (key === "stroke") {
    if (isTextualObject(target)) {
      target.style.textColor = normalizeColor(value, board.defaults.stroke);
    } else {
      target.style.stroke = normalizeColor(value, board.defaults.stroke);
    }
  }

  if (key === "strokeWidth") {
    target.style.strokeWidth = Number(value) || target.style.strokeWidth || 1;
  }

  if (
    key === "shapeKind" &&
    ["rect", "circle", "triangle", "polygon"].includes(target.type)
  ) {
    target.type = value;
    target.style.shapeKind = value;
  }

  if (key === "chartKind" && target.type === "chart") {
    target.style.chartKind = value;
  }

  syncBoardDom(board);
}

function syncBoardStyleControls(board) {
  const target = board.objects.find(
    (item) => item.id === board.selectedObjectId,
  );
  const style = target ? getObjectStyle(target, board) : board.defaults;

  const fillInput = board.toolbar.querySelector(`#${board.id}-fill-color`);
  const strokeInput = board.toolbar.querySelector(`#${board.id}-stroke-color`);
  const widthInput = board.toolbar.querySelector(`#${board.id}-stroke-width`);
  const shapeSelect = board.toolbar.querySelector(`#${board.id}-shape-kind`);
  const chartSelect = board.toolbar.querySelector(`#${board.id}-chart-kind`);

  if (fillInput)
    fillInput.value = normalizeColor(style.fill, board.defaults.fill);
  if (strokeInput)
    strokeInput.value = normalizeColor(style.stroke, board.defaults.stroke);
  if (widthInput)
    widthInput.value = String(style.strokeWidth || board.defaults.strokeWidth);
  if (shapeSelect)
    shapeSelect.value = style.shapeKind || board.defaults.shapeKind;
  if (chartSelect)
    chartSelect.value = style.chartKind || board.defaults.chartKind;
}

function scaleBoardObject(object, scaleX, scaleY) {
  object.x *= scaleX;
  object.y *= scaleY;
  object.width *= scaleX;
  object.height *= scaleY;
  if (object.points?.length) {
    object.points = object.points.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));
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

  if (
    board.lastWidth &&
    board.lastHeight &&
    (board.lastWidth !== width || board.lastHeight !== height)
  ) {
    const scaleX = width / board.lastWidth;
    const scaleY = height / board.lastHeight;
    board.objects.forEach((object) => scaleBoardObject(object, scaleX, scaleY));
  }

  board.canvas.width = width;
  board.canvas.height = height;
  board.lastWidth = width;
  board.lastHeight = height;
  board.scene.style.width = `${width}px`;
  board.scene.style.height = `${height}px`;
  syncBoardDom(board);
}

function getShapeSvgMarkup(object, style) {
  if (object.type === "line") {
    const direction = object.direction || { x1: 0, y1: 0, x2: 1, y2: 1 };
    return `
      <svg viewBox="0 0 ${Math.max(object.width, 10)} ${Math.max(object.height, 10)}" class="whiteboard-vector">
        <line
          x1="${direction.x1 * object.width}"
          y1="${direction.y1 * object.height}"
          x2="${direction.x2 * object.width}"
          y2="${direction.y2 * object.height}"
          stroke="${style.stroke}"
          stroke-width="${style.strokeWidth}"
          stroke-linecap="round"
        />
      </svg>
    `;
  }

  if (object.type === "freehand") {
    const path = (object.points || [])
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    return `
      <svg viewBox="0 0 ${Math.max(object.width, 10)} ${Math.max(object.height, 10)}" class="whiteboard-vector">
        <path
          d="${path}"
          fill="none"
          stroke="${style.stroke}"
          stroke-width="${style.strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  if (object.type === "circle") {
    return `
      <svg viewBox="0 0 ${object.width} ${object.height}" class="whiteboard-vector">
        <ellipse
          cx="${object.width / 2}"
          cy="${object.height / 2}"
          rx="${Math.max(4, object.width / 2 - style.strokeWidth)}"
          ry="${Math.max(4, object.height / 2 - style.strokeWidth)}"
          fill="${style.fill}"
          stroke="${style.stroke}"
          stroke-width="${style.strokeWidth}"
        />
      </svg>
    `;
  }

  if (object.type === "triangle") {
    return `
      <svg viewBox="0 0 ${object.width} ${object.height}" class="whiteboard-vector">
        <polygon
          points="${object.width / 2},${style.strokeWidth} ${object.width - style.strokeWidth},${object.height - style.strokeWidth} ${style.strokeWidth},${object.height - style.strokeWidth}"
          fill="${style.fill}"
          stroke="${style.stroke}"
          stroke-width="${style.strokeWidth}"
        />
      </svg>
    `;
  }

  if (object.type === "polygon") {
    const points = [
      [object.width * 0.5, style.strokeWidth],
      [object.width - style.strokeWidth, object.height * 0.34],
      [object.width * 0.82, object.height - style.strokeWidth],
      [object.width * 0.18, object.height - style.strokeWidth],
      [style.strokeWidth, object.height * 0.34],
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(" ");

    return `
      <svg viewBox="0 0 ${object.width} ${object.height}" class="whiteboard-vector">
        <polygon
          points="${points}"
          fill="${style.fill}"
          stroke="${style.stroke}"
          stroke-width="${style.strokeWidth}"
        />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 ${object.width} ${object.height}" class="whiteboard-vector">
      <rect
        x="${style.strokeWidth / 2}"
        y="${style.strokeWidth / 2}"
        width="${Math.max(0, object.width - style.strokeWidth)}"
        height="${Math.max(0, object.height - style.strokeWidth)}"
        rx="20"
        fill="${style.fill}"
        stroke="${style.stroke}"
        stroke-width="${style.strokeWidth}"
      />
    </svg>
  `;
}

function getChartMarkup(object, style) {
  const values = Array.isArray(object.values) ? object.values : [];
  const maxValue = Math.max(...values, 1);
  const title = escapeHtml(object.title || "Grafik");
  const labels =
    Array.isArray(object.labels) && object.labels.length === values.length
      ? object.labels
      : values.map((_, index) => `D${index + 1}`);

  if (style.chartKind === "line") {
    const points = values
      .map((value, index) => {
        const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
        const y = 100 - (value / maxValue) * 78;
        return `${x},${y}`;
      })
      .join(" ");

    const dots = values
      .map((value, index) => {
        const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
        const y = 100 - (value / maxValue) * 78;
        return `<circle cx="${x}" cy="${y}" r="2.2" fill="${style.stroke}" />`;
      })
      .join("");

    const footer = labels
      .map((label) => `<span>${escapeHtml(label)}</span>`)
      .join("");

    return `
      <div class="whiteboard-chart">
        <div class="whiteboard-chart-title">${title}</div>
        <svg viewBox="0 0 100 100" class="whiteboard-chart-line">
          <polyline
            points="${points}"
            fill="none"
            stroke="${style.stroke}"
            stroke-width="${Math.max(1.6, style.strokeWidth / 2)}"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          ${dots}
        </svg>
        <div class="whiteboard-chart-footer">${footer}</div>
      </div>
    `;
  }

  const bars = values
    .map((value, index) => {
      const height = Math.max(12, (value / maxValue) * 100);
      return `
        <div class="whiteboard-chart-bar-wrap">
          <span>${value}</span>
          <div class="whiteboard-chart-bar" style="height:${height}%; background:${style.fill}; border:1px solid ${style.stroke};"></div>
          <small>${escapeHtml(labels[index])}</small>
        </div>
      `;
    })
    .join("");

  return `
    <div class="whiteboard-chart">
      <div class="whiteboard-chart-title">${title}</div>
      <div class="whiteboard-chart-bars">${bars}</div>
    </div>
  `;
}

function renderBoardObject(board, object) {
  let node = board.scene.querySelector(
    `.whiteboard-object[data-object-id="${object.id}"]`,
  );
  if (!node) {
    node = document.createElement("div");
    node.className = "whiteboard-object";
    node.dataset.objectId = object.id;
    board.scene.appendChild(node);
  }

  const style = getObjectStyle(object, board);
  node.className = `whiteboard-object type-${object.type}`;
  node.classList.toggle("selected", board.selectedObjectId === object.id);
  node.style.left = `${object.x}px`;
  node.style.top = `${object.y}px`;
  node.style.width = `${Math.max(object.width, 20)}px`;
  node.style.height = `${Math.max(object.height, 20)}px`;
  node.style.color = style.textColor;
  node.style.background = "transparent";
  node.style.boxShadow = "none";
  node.style.border = "0";

  if (isTextualObject(object)) {
    renderTextObject(node, board, object, style);
  } else if (
    ["rect", "circle", "triangle", "polygon", "line", "freehand"].includes(
      object.type,
    )
  ) {
    node.innerHTML = getShapeSvgMarkup(object, style);
  } else if (object.type === "image") {
    node.innerHTML = `<img src="${object.src}" alt="Canvas asset" class="whiteboard-object-image" />`;
    node.style.background = "#ffffff";
    node.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    node.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.12)";
  } else if (object.type === "table") {
    renderTableObject(node, object);
  } else if (object.type === "chart") {
    node.innerHTML = getChartMarkup(object, style);
    node.style.background = "#ffffff";
    node.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    node.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.12)";
  }

  ensureResizeHandles(node, object, board.selectedObjectId === object.id);
}

function renderTextObject(node, board, object, style) {
  node.innerHTML = "";
  if (object.type === "text-frame") {
    node.style.background = style.fill;
    node.style.border = `1px solid ${style.stroke}`;
    node.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.12)";
    node.style.padding = "10px 12px";
  } else {
    node.style.padding = "4px 6px";
  }

  const content = document.createElement("div");
  content.className = "whiteboard-object-content";
  content.contentEditable = String(Boolean(object.editing));
  content.dataset.objectId = object.id;
  content.textContent =
    object.text ||
    (object.editing ? "" : object.type === "text-frame" ? "Text box" : "Teks");
  content.style.color = style.textColor;
  node.appendChild(content);
}

function renderTableObject(node, object) {
  const rows = (object.rows || [])
    .map(
      (row, rowIndex) =>
        `<tr>${row
          .map((cell, colIndex) => {
            const tag = rowIndex === 0 ? "th" : "td";
            return `<${tag}
              class="whiteboard-table-cell"
              contenteditable="true"
              data-object-id="${object.id}"
              data-row="${rowIndex}"
              data-col="${colIndex}"
            >${escapeHtml(cell || "")}</${tag}>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  node.innerHTML = `
    <div class="whiteboard-table-card">
      <div class="whiteboard-table-title">${escapeHtml(object.title || "Table")}</div>
      <table class="whiteboard-table">${rows}</table>
    </div>
  `;
  node.style.background = "#ffffff";
  node.style.border = "1px solid rgba(148, 163, 184, 0.35)";
  node.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.12)";
}

function ensureResizeHandles(node, object, selected) {
  node
    .querySelectorAll(".whiteboard-resize-handle")
    .forEach((handle) => handle.remove());
  if (!selected || !isObjectResizable(object)) return;

  ["nw", "ne", "sw", "se"].forEach((handleName) => {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = `whiteboard-resize-handle handle-${handleName}`;
    handle.dataset.handle = handleName;
    node.appendChild(handle);
  });
}

function syncBoardDom(board) {
  const existingIds = new Set(board.objects.map((item) => item.id));
  board.scene.querySelectorAll(".whiteboard-object").forEach((node) => {
    if (!existingIds.has(node.dataset.objectId)) {
      node.remove();
    }
  });

  board.objects.forEach((object) => {
    renderBoardObject(board, object);
  });
}

function addTextToCanvasBoard(
  boardId,
  text,
  coordinates = null,
  framed = false,
) {
  const board = getCanvasBoard(boardId);
  if (!board) return;

  saveCanvasBoardState(boardId);
  const next = createBaseObject(
    framed ? "text-frame" : "text",
    coordinates?.x ?? board.lastWidth / 2 - 90,
    coordinates?.y ?? board.lastHeight / 2 - 22,
    framed ? 240 : 180,
    framed ? 130 : 44,
    board,
  );
  next.text = text || "Teks baru";
  if (framed) {
    next.style.fill = "#ffffff";
  }

  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function addImageToCanvasBoard(boardId, src, dimensions = {}) {
  const board = getCanvasBoard(boardId);
  if (!board || !src) return;

  saveCanvasBoardState(boardId);
  const next = createBaseObject(
    "image",
    dimensions.x ?? 24,
    dimensions.y ?? 24,
    dimensions.width ?? 240,
    dimensions.height ?? 180,
    board,
  );
  next.src = src;
  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function addChartToCanvasBoard(
  boardId,
  title,
  values,
  chartKind = "bar",
  labels = null,
) {
  const board = getCanvasBoard(boardId);
  if (!board || !values?.length) return;

  saveCanvasBoardState(boardId);
  const next = createBaseObject(
    "chart",
    board.lastWidth * 0.52,
    64,
    Math.max(280, board.lastWidth * 0.34),
    230,
    board,
  );
  next.title = title || "Grafik";
  next.values = values;
  next.labels = labels;
  next.style.chartKind = chartKind;
  next.style.fill = board.defaults.fill;
  next.style.stroke = board.defaults.stroke;
  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function addTableToCanvasBoard(boardId, title, rows) {
  const board = getCanvasBoard(boardId);
  if (!board || !rows?.length) return;

  saveCanvasBoardState(boardId);
  const next = createBaseObject(
    "table",
    24,
    board.lastHeight * 0.56,
    Math.max(320, board.lastWidth * 0.44),
    Math.max(180, rows.length * 42 + 48),
    board,
  );
  next.title = title || "Table";
  next.rows = rows;
  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
}

function createTableObjectFromPrompt(board) {
  const rowCount = Number(window.prompt("Jumlah baris tabel:", "3"));
  const colCount = Number(window.prompt("Jumlah kolom tabel:", "3"));
  if (
    !Number.isInteger(rowCount) ||
    !Number.isInteger(colCount) ||
    rowCount < 1 ||
    colCount < 1
  )
    return;

  const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: colCount }, (_, colIndex) =>
      rowIndex === 0
        ? `Kolom ${colIndex + 1}`
        : `Isi ${rowIndex}.${colIndex + 1}`,
    ),
  );
  addTableToCanvasBoard(board.id, "Table", rows);
}

function createChartObjectFromPrompt(board, chartKind) {
  const title = window.prompt(
    "Judul grafik:",
    chartKind === "line" ? "Grafik Tren" : "Grafik Data",
  );
  const rawValues = window.prompt(
    "Masukkan data angka, pisahkan dengan koma:",
    "12,18,10,24",
  );
  if (!rawValues) return;

  const values = rawValues
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  if (!values.length) return;

  const rawLabels = window.prompt(
    "Masukkan label data, pisahkan dengan koma:",
    "A,B,C,D",
  );
  const labels = rawLabels
    ? rawLabels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : null;

  addChartToCanvasBoard(
    board.id,
    title || "Grafik",
    values,
    chartKind,
    labels?.length ? labels : null,
  );
}

function editChartObject(board, objectId) {
  const target = board.objects.find(
    (item) => item.id === objectId && item.type === "chart",
  );
  if (!target) return;

  const rawValues = window.prompt(
    "Edit data angka, pisahkan dengan koma:",
    (target.values || []).join(","),
  );
  if (!rawValues) return;

  const values = rawValues
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  if (!values.length) return;

  target.values = values;
  const rawLabels = window.prompt(
    "Edit label data, pisahkan dengan koma:",
    (target.labels || []).join(","),
  );
  target.labels = rawLabels
    ? rawLabels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : null;
  syncBoardDom(board);
}

function editTableStructure(board, objectId) {
  const target = board.objects.find(
    (item) => item.id === objectId && item.type === "table",
  );
  if (!target) return;

  const rowCount = Number(
    window.prompt("Jumlah baris baru:", String(target.rows?.length || 3)),
  );
  const colCount = Number(
    window.prompt("Jumlah kolom baru:", String(target.rows?.[0]?.length || 3)),
  );
  if (
    !Number.isInteger(rowCount) ||
    !Number.isInteger(colCount) ||
    rowCount < 1 ||
    colCount < 1
  )
    return;

  target.rows = Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from(
      { length: colCount },
      (_, colIndex) => target.rows?.[rowIndex]?.[colIndex] || "",
    ),
  );
  target.height = Math.max(180, rowCount * 42 + 48);
  syncBoardDom(board);
}

function initLifeMathWhiteboard() {
  const toolbar = document.getElementById("whiteboard-toolbar");
  const canvas = document.getElementById("whiteboard");
  const wrapper = canvas?.closest(".whiteboard-wrapper");

  if (!toolbar || !canvas || !wrapper) return null;
  return createCanvasBoard({
    id: "life-math-board",
    canvas,
    wrapper,
    toolbar,
    defaultColor: "#2563eb",
  });
}

window.createCanvasBoard = createCanvasBoard;
window.getCanvasBoard = getCanvasBoard;
window.refreshCanvasBoard = refreshCanvasBoard;
window.setCanvasBoardTool = setCanvasBoardTool;
window.undoCanvasBoard = undoCanvasBoard;
window.redoCanvasBoard = redoCanvasBoard;
window.clearCanvasBoard = clearCanvasBoard;
window.addTextToCanvasBoard = addTextToCanvasBoard;
window.addImageToCanvasBoard = addImageToCanvasBoard;
window.addChartToCanvasBoard = addChartToCanvasBoard;
window.addTableToCanvasBoard = addTableToCanvasBoard;
window.initLifeMathWhiteboard = initLifeMathWhiteboard;

document.addEventListener("DOMContentLoaded", () => {
  initLifeMathWhiteboard();
});
