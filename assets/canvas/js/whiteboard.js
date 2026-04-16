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

function getBoardToolMeta(tool) {
  const toolMap = {
    select: {
      label: "Select",
      hint: "Pilih objek untuk pindah, resize, edit, atau hapus.",
    },
    text: {
      label: "Text",
      hint: "Tambahkan teks polos tanpa frame atau box.",
    },
    "text-frame": {
      label: "Text Box",
      hint: "Tambahkan kotak teks yang bisa di-resize lalu edit saat dipilih.",
    },
    pen: {
      label: "Draw",
      hint: "Gambar bebas di canvas dengan warna dan ketebalan aktif.",
    },
    line: {
      label: "Line",
      hint: "Klik lalu tarik untuk membuat garis lurus.",
    },
    rect: {
      label: "Rectangle",
      hint: "Klik canvas untuk menambah persegi panjang.",
    },
    circle: {
      label: "Circle",
      hint: "Klik canvas untuk menambah lingkaran.",
    },
    triangle: {
      label: "Triangle",
      hint: "Klik canvas untuk menambah segitiga.",
    },
    polygon: {
      label: "Polygon",
      hint: "Klik canvas untuk menambah polygon.",
    },
  };

  return toolMap[tool] || toolMap.select;
}

function isShapeTool(tool) {
  return ["rect", "circle", "triangle", "polygon"].includes(tool);
}

function canObjectEditInline(object) {
  return Boolean(
    object && (isTextualObject(object) || isShapeTool(object.type)),
  );
}

function createCanvasToolbarMarkup(boardId) {
  return `
    <div class="whiteboard-toolbar-inner">
      <div class="whiteboard-toolbar-group" role="group" aria-label="Tools">
        <button class="btn btn-outline-dark active" data-board-tool="${boardId}" data-tool="select" type="button">Select</button>
        <button class="btn btn-outline-dark" data-board-tool="${boardId}" data-tool="text" type="button">Masukkan Teks</button>
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
        <label for="${boardId}-font-size">Font</label>
        <input type="range" id="${boardId}-font-size" data-board-style="${boardId}" data-style-key="fontSize" min="12" max="72" value="24" />
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
        <button class="btn btn-outline-info" data-board-action="${boardId}" data-action="edit-content" type="button">Edit</button>
        <button class="btn btn-outline-danger" data-board-action="${boardId}" data-action="delete" type="button">Delete</button>
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="undo" type="button">Undo</button>
        <button class="btn btn-outline-warning" data-board-action="${boardId}" data-action="redo" type="button">Redo</button>
        <button class="btn btn-outline-danger" data-board-action="${boardId}" data-action="clear" type="button">Clear</button>
      </div>

      <div class="whiteboard-toolbar-status" data-board-status="${boardId}"></div>

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

function ensureBoardDialog(board) {
  let dialog = board.wrapper.querySelector(".whiteboard-dialog-backdrop");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.className = "whiteboard-dialog-backdrop";
    dialog.innerHTML = `
      <div class="whiteboard-dialog-card" role="dialog" aria-modal="true" aria-labelledby="${board.id}-dialog-title">
        <div class="whiteboard-dialog-header">
          <div>
            <p class="whiteboard-dialog-kicker">Canvas Editor</p>
            <h3 id="${board.id}-dialog-title" class="whiteboard-dialog-title">Edit Object</h3>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dialog-action="cancel">Tutup</button>
        </div>
        <form class="whiteboard-dialog-form">
          <div class="whiteboard-dialog-fields"></div>
          <div class="whiteboard-dialog-actions">
            <button type="button" class="btn btn-outline-secondary" data-dialog-action="cancel">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    `;
    board.wrapper.appendChild(dialog);
  }
  board.dialog = dialog;
}

function getDefaultBoardStyle(fill = "#2563eb") {
  const normalizedFill = normalizeColor(fill);
  return {
    fill: normalizedFill,
    stroke: "#1d4ed8",
    strokeWidth: 3,
    textColor: "#16324f",
    fontSize: 24,
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
    ensureBoardDialog(existing);
    if (!toolbar.innerHTML.trim()) {
      toolbar.innerHTML = createCanvasToolbarMarkup(id);
      bindBoardToolbar(existing);
    }
    bindBoardDialog(existing);
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
    pointerSession: null,
    tapState: null,
    dialog: null,
    pendingDialog: null,
    lastWidth: 0,
    lastHeight: 0,
    keyboardBound: false,
    resizeObserver: null,
    toolbarBound: false,
    sceneBound: false,
    dialogBound: false,
  };

  toolbar.innerHTML = createCanvasToolbarMarkup(id);
  ensureBoardScene(board);
  ensureBoardDialog(board);
  canvasBoards[id] = board;

  bindBoardToolbar(board);
  bindBoardSceneEvents(board);
  bindBoardKeyboard(board);
  bindBoardDialog(board);
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

    if (action === "edit-content") {
      openSelectedObjectEditor(board);
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

function bindBoardDialog(board) {
  if (board.dialogBound || !board.dialog) return;
  board.dialogBound = true;

  board.dialog.addEventListener("click", (event) => {
    if (
      event.target === board.dialog ||
      event.target.closest('[data-dialog-action="cancel"]')
    ) {
      closeBoardDialog(board);
    }
  });

  board.dialog
    .querySelector(".whiteboard-dialog-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitBoardDialog(board);
    });
}

function bindBoardSceneEvents(board) {
  if (board.sceneBound) return;
  board.sceneBound = true;

  board.scene.addEventListener("pointerdown", (event) => {
    if (!isPrimaryBoardPointerEvent(event)) return;

    const objectNode = event.target.closest(".whiteboard-object");
    const resizeHandle = event.target.closest(".whiteboard-resize-handle");
    const pointer = getBoardPointer(board, event);
    board.pointerSession = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || "mouse",
      objectId: objectNode?.dataset.objectId || null,
      startX: pointer.x,
      startY: pointer.y,
      moved: false,
      openedEditor: false,
    };

    activeCanvasBoardId = board.id;

    if (!objectNode) {
      handleBoardEmptySceneDown(board, event);
      return;
    }

    const objectId = objectNode.dataset.objectId;
    const targetObject = board.objects.find((item) => item.id === objectId);
    if (!targetObject) return;

    setBoardSelection(board, objectId);

    if (canObjectEditInline(targetObject) && event.detail > 1) {
      return;
    }

    if (resizeHandle && isObjectResizable(targetObject)) {
      event.preventDefault();
      saveCanvasBoardState(board.id);
      board.interaction = {
        type: "resize",
        objectId,
        handle: resizeHandle.dataset.handle || "se",
        pointerId: event.pointerId,
        startPointer: pointer,
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
    board.interaction = {
      type: "move",
      pointerId: event.pointerId,
      objectId,
      offsetX: pointer.x - targetObject.x,
      offsetY: pointer.y - targetObject.y,
    };
  });

  board.scene.addEventListener("dblclick", (event) => {
    if (event.button !== 0) return;

    const objectNode = event.target.closest(".whiteboard-object");
    if (!objectNode) return;

    const objectId = objectNode.dataset.objectId;
    const targetObject = board.objects.find((item) => item.id === objectId);
    if (!targetObject) return;

    setBoardSelection(board, objectId);
    activeCanvasBoardId = board.id;
    event.preventDefault();
    event.stopPropagation();
    openBoardObjectEditor(board, objectId, "all");
  });

  board.scene.addEventListener("contextmenu", (event) => {
    const objectNode = event.target.closest(".whiteboard-object");
    if (!objectNode) return;

    const objectId = objectNode.dataset.objectId;
    const targetObject = board.objects.find((item) => item.id === objectId);
    if (!targetObject) return;

    setBoardSelection(board, objectId);
    activeCanvasBoardId = board.id;
    event.preventDefault();
    event.stopPropagation();
    openBoardObjectEditor(board, objectId, "end");
  });

  board.scene.addEventListener("pointerup", (event) => {
    handleBoardPointerRelease(board, event);
  });

  board.scene.addEventListener("pointercancel", () => {
    board.pointerSession = null;
    stopBoardInteraction(board);
  });

  board.scene.addEventListener("input", (event) => {
    const editable = event.target.closest(".whiteboard-object-content");
    if (editable) {
      const target = board.objects.find(
        (item) => item.id === editable.dataset.objectId,
      );
      if (!target) return;
      target.text = editable.textContent || "";
      autoSizeTextObject(target, editable);
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
        if (isTextualObject(target) && !target.text.trim()) {
          target.text = target.type === "text-frame" ? "Text box" : "Teks";
        }
        autoSizeTextObject(target, editable);
        syncBoardDom(board);
      }
    },
    true,
  );

  window.addEventListener("pointermove", (event) => {
    if (!board.interaction) return;
    if (
      board.interaction.pointerId !== undefined &&
      event.pointerId !== board.interaction.pointerId
    )
      return;

    if (board.pointerSession) {
      const pointer = getBoardPointer(board, event);
      const deltaX = pointer.x - board.pointerSession.startX;
      const deltaY = pointer.y - board.pointerSession.startY;
      if (Math.hypot(deltaX, deltaY) > 6) {
        board.pointerSession.moved = true;
      }
    }
    updateBoardInteraction(board, event);
  });

  window.addEventListener("pointerup", (event) => {
    if (
      board.interaction?.pointerId !== undefined &&
      event.pointerId !== board.interaction.pointerId
    )
      return;
    stopBoardInteraction(board);
  });
}

function isPrimaryBoardPointerEvent(event) {
  if (event.pointerType === "touch") return event.isPrimary !== false;
  return event.button === 0;
}

function handleBoardPointerRelease(board, event) {
  if (!board.pointerSession) return;
  if (
    board.pointerSession.pointerId !== undefined &&
    event.pointerId !== board.pointerSession.pointerId
  )
    return;

  const session = board.pointerSession;
  board.pointerSession = null;

  if (
    session.pointerType !== "touch" &&
    session.pointerType !== "pen" &&
    session.pointerType !== ""
  )
    return;
  if (session.moved || !session.objectId || session.openedEditor) return;

  const now = Date.now();
  const lastTap = board.tapState;
  const isDoubleTap =
    lastTap &&
    lastTap.objectId === session.objectId &&
    now - lastTap.time < 360;

  if (isDoubleTap) {
    openBoardObjectEditor(board, session.objectId, "all");
    board.tapState = null;
    return;
  }

  board.tapState = {
    objectId: session.objectId,
    time: now,
  };
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
      return;
    }

    const target = board.objects.find(
      (item) => item.id === board.selectedObjectId,
    );
    if (!target) return;

    const movement = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft") {
      target.x = clampCanvasValue(target.x - movement, 0, board.lastWidth - 20);
      syncBoardDom(board);
      return;
    }
    if (event.key === "ArrowRight") {
      target.x = clampCanvasValue(target.x + movement, 0, board.lastWidth - 20);
      syncBoardDom(board);
      return;
    }
    if (event.key === "ArrowUp") {
      target.y = clampCanvasValue(
        target.y - movement,
        0,
        board.lastHeight - 20,
      );
      syncBoardDom(board);
      return;
    }
    if (event.key === "ArrowDown") {
      target.y = clampCanvasValue(
        target.y + movement,
        0,
        board.lastHeight - 20,
      );
      syncBoardDom(board);
    }
  });
}

function handleBoardToolSelection(board, tool) {
  activeCanvasBoardId = board.id;

  if (tool === "text") {
    board.tool = tool;
    updateBoardToolbarState(board);
    insertBoardTextFromToolbar(board, false, false);
    return;
  }

  if (tool === "text-frame") {
    board.tool = tool;
    updateBoardToolbarState(board);
    insertBoardTextFromToolbar(board, true, true);
    return;
  }

  if (tool === "table") {
    openTableDialog(board);
    updateBoardToolbarState(board);
    return;
  }

  if (tool === "chart-bar" || tool === "chart-line") {
    openChartDialog(board, null, tool === "chart-line" ? "line" : "bar");
    updateBoardToolbarState(board);
    return;
  }

  board.tool = tool;
  if (isShapeTool(tool)) {
    board.defaults.shapeKind = tool;
  }
  updateBoardToolbarState(board);
}

function getDialogFieldMarkup(field) {
  const id = `dialog-field-${field.name}`;
  const value = escapeHtml(field.value ?? "");
  const common = `id="${id}" name="${field.name}"`;
  if (field.type === "textarea") {
    return `
      <label class="whiteboard-dialog-field" for="${id}">
        <span>${escapeHtml(field.label || field.name)}</span>
        <textarea ${common} rows="${field.rows || 4}" placeholder="${escapeHtml(field.placeholder || "")}">${value}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    const options = (field.options || [])
      .map(
        (option) =>
          `<option value="${escapeHtml(option.value)}"${String(option.value) === String(field.value) ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
      )
      .join("");
    return `
      <label class="whiteboard-dialog-field" for="${id}">
        <span>${escapeHtml(field.label || field.name)}</span>
        <select ${common}>${options}</select>
      </label>
    `;
  }

  return `
    <label class="whiteboard-dialog-field" for="${id}">
      <span>${escapeHtml(field.label || field.name)}</span>
      <input
        ${common}
        type="${escapeHtml(field.type || "text")}"
        value="${value}"
        placeholder="${escapeHtml(field.placeholder || "")}"
        ${field.min !== undefined ? `min="${field.min}"` : ""}
        ${field.max !== undefined ? `max="${field.max}"` : ""}
        ${field.step !== undefined ? `step="${field.step}"` : ""}
      />
    </label>
  `;
}

function openBoardDialog(board, config) {
  ensureBoardDialog(board);
  if (!board.dialog || !config) return;

  const title = board.dialog.querySelector(".whiteboard-dialog-title");
  const fields = board.dialog.querySelector(".whiteboard-dialog-fields");
  const submitButton = board.dialog.querySelector('button[type="submit"]');
  if (title) title.textContent = config.title || "Edit";
  if (fields) {
    fields.innerHTML = (config.fields || []).map(getDialogFieldMarkup).join("");
  }
  if (submitButton) {
    submitButton.textContent = config.submitLabel || "Simpan";
  }

  board.pendingDialog = config;
  board.dialog.classList.add("open");
  requestAnimationFrame(() => {
    board.dialog.querySelector("input, textarea, select")?.focus();
  });
}

function closeBoardDialog(board) {
  if (!board.dialog) return;
  board.dialog.classList.remove("open");
  board.pendingDialog = null;
}

function submitBoardDialog(board) {
  if (!board.pendingDialog || !board.dialog) return;

  const form = board.dialog.querySelector(".whiteboard-dialog-form");
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  board.pendingDialog.onSubmit?.(values);
  closeBoardDialog(board);
}

function openChartDialog(board, objectId = null, chartKind = "bar") {
  const target = objectId
    ? board.objects.find(
        (item) => item.id === objectId && item.type === "chart",
      )
    : null;
  const activeKind = target?.style?.chartKind || chartKind;
  openBoardDialog(board, {
    mode: target ? "chart-edit" : "chart-create",
    title: target ? "Edit Grafik" : "Buat Grafik",
    submitLabel: target ? "Perbarui Grafik" : "Tambahkan Grafik",
    fields: [
      {
        name: "title",
        label: "Judul grafik",
        type: "text",
        value:
          target?.title ||
          (activeKind === "line" ? "Grafik Tren" : "Grafik Data"),
      },
      {
        name: "chartKind",
        label: "Jenis grafik",
        type: "select",
        value: activeKind,
        options: [
          { value: "bar", label: "Bar chart" },
          { value: "line", label: "Line chart" },
        ],
      },
      {
        name: "labels",
        label: "Label data (pisahkan koma)",
        type: "textarea",
        rows: 2,
        value: (target?.labels || ["A", "B", "C", "D"]).join(", "),
      },
      {
        name: "values",
        label: "Nilai data (pisahkan koma)",
        type: "textarea",
        rows: 3,
        value: (target?.values || [12, 18, 10, 24]).join(", "),
      },
    ],
    onSubmit(values) {
      const parsedValues = String(values.values || "")
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item));
      if (!parsedValues.length) return;

      const labels = String(values.labels || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (target) {
        saveCanvasBoardState(board.id);
        target.title = values.title || "Grafik";
        target.values = parsedValues;
        target.labels = labels.length ? labels : null;
        target.style.chartKind = values.chartKind || "bar";
        board.selectedObjectId = target.id;
        syncBoardDom(board);
        syncBoardStyleControls(board);
        return;
      }

      addChartToCanvasBoard(
        board.id,
        values.title || "Grafik",
        parsedValues,
        values.chartKind || "bar",
        labels.length ? labels : null,
      );
    },
  });
}

function openTableDialog(board, objectId = null) {
  const target = objectId
    ? board.objects.find(
        (item) => item.id === objectId && item.type === "table",
      )
    : null;
  openBoardDialog(board, {
    mode: target ? "table-edit" : "table-create",
    title: target ? "Edit Tabel" : "Buat Tabel",
    submitLabel: target ? "Perbarui Tabel" : "Tambahkan Tabel",
    fields: [
      {
        name: "title",
        label: "Judul tabel",
        type: "text",
        value: target?.title || "Table",
      },
      {
        name: "rows",
        label: "Jumlah baris",
        type: "number",
        min: 1,
        max: 20,
        value: target?.rows?.length || 3,
      },
      {
        name: "cols",
        label: "Jumlah kolom",
        type: "number",
        min: 1,
        max: 12,
        value: target?.rows?.[0]?.length || 3,
      },
    ],
    onSubmit(values) {
      const rowCount = clampCanvasValue(Number(values.rows) || 3, 1, 20);
      const colCount = clampCanvasValue(Number(values.cols) || 3, 1, 12);

      if (target) {
        saveCanvasBoardState(board.id);
        target.title = values.title || "Table";
        target.rows = Array.from({ length: rowCount }, (_, rowIndex) =>
          Array.from(
            { length: colCount },
            (_, colIndex) => target.rows?.[rowIndex]?.[colIndex] || "",
          ),
        );
        target.height = Math.max(180, rowCount * 42 + 48);
        board.selectedObjectId = target.id;
        syncBoardDom(board);
        syncBoardStyleControls(board);
        return;
      }

      const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
        Array.from({ length: colCount }, (_, colIndex) =>
          rowIndex === 0
            ? `Kolom ${colIndex + 1}`
            : `Isi ${rowIndex}.${colIndex + 1}`,
        ),
      );
      addTableToCanvasBoard(board.id, values.title || "Table", rows);
    },
  });
}

function openSelectedObjectEditor(board) {
  const target = board.objects.find(
    (item) => item.id === board.selectedObjectId,
  );
  if (!target) return;
  openBoardObjectEditor(board, target.id, "all");
}

function handleBoardEmptySceneDown(board, event) {
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
  const selectedObject = board.objects.find(
    (item) => item.id === board.selectedObjectId,
  );
  const activeTool = isShapeTool(board.tool)
    ? board.tool
    : board.tool === "select" &&
        selectedObject &&
        isShapeTool(selectedObject.type)
      ? selectedObject.type
      : board.tool;
  const toolMeta = getBoardToolMeta(activeTool);
  const statusNode = board.toolbar.querySelector(
    `[data-board-status="${board.id}"]`,
  );

  board.toolbar
    .querySelectorAll(`[data-board-tool="${board.id}"]`)
    .forEach((button) => {
      const tool = button.dataset.tool || "";
      button.classList.toggle("active", tool === activeTool);
      if (tool === "table" || tool === "chart-bar" || tool === "chart-line") {
        button.classList.remove("active");
      }
    });

  board.toolbar
    .querySelectorAll(`[data-board-action="${board.id}"]`)
    .forEach((button) => {
      const action = button.dataset.action;
      if (action === "edit-content") {
        button.disabled = !Boolean(
          selectedObject &&
          (canObjectEditInline(selectedObject) ||
            selectedObject.type === "table" ||
            selectedObject.type === "chart"),
        );
      }
      if (action === "delete") {
        button.disabled = !board.selectedObjectId;
      }
      if (action === "undo") {
        button.disabled = !board.history.length;
      }
      if (action === "redo") {
        button.disabled = !board.redoStack.length;
      }
      if (action === "clear") {
        button.disabled = !board.objects.length;
      }
    });

  if (statusNode) {
    statusNode.innerHTML = `
      <strong>${escapeHtml(toolMeta.label)}</strong>
      <span>${escapeHtml(toolMeta.hint)}</span>
    `;
  }
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
  board.objects.forEach((item) => {
    if (item.id !== objectId && canObjectEditInline(item)) {
      item.editing = false;
    }
    if (item.id !== objectId && item.type === "table") {
      item.editing = false;
    }
  });
  board.selectedObjectId = objectId;
  activeCanvasBoardId = objectId ? board.id : activeCanvasBoardId;
  if (sync) {
    syncBoardDom(board);
  }
  syncBoardStyleControls(board);
}

function startInlineObjectEditing(board, objectId, selectionMode = "end") {
  const target = board.objects.find((item) => item.id === objectId);
  if (!target || !canObjectEditInline(target)) return;

  setBoardSelection(board, objectId, false);
  setObjectEditing(board, objectId, true, selectionMode);
}

function openBoardObjectEditor(board, objectId, selectionMode = "end") {
  const target = board.objects.find((item) => item.id === objectId);
  if (!target) return;

  if (canObjectEditInline(target)) {
    startInlineObjectEditing(board, objectId, selectionMode);
    return;
  }

  if (target.type === "table") {
    openTableInlineEditing(board, objectId);
    return;
  }

  if (target.type === "chart") {
    editChartObject(board, objectId);
  }
}

function openTableInlineEditing(board, objectId) {
  const target = board.objects.find(
    (item) => item.id === objectId && item.type === "table",
  );
  if (!target) return;

  setBoardSelection(board, objectId, false);
  target.editing = true;
  syncBoardDom(board);
  requestAnimationFrame(() => {
    board.scene
      .querySelector(
        `.whiteboard-object[data-object-id="${objectId}"] .whiteboard-table-cell`,
      )
      ?.focus();
  });
}

function autoSizeTextObject(target, editable) {
  if (!target || !editable || !canObjectEditInline(target)) return;

  const objectNode = editable.closest(".whiteboard-object");
  if (!objectNode) return;

  if (target.type === "text") {
    target.width = Math.max(120, Math.min(420, editable.scrollWidth + 20));
    target.height = Math.max(36, editable.scrollHeight + 10);
  } else if (target.type === "text-frame") {
    target.height = Math.max(72, editable.scrollHeight + 20);
  }

  objectNode.style.width = `${Math.max(target.width, 20)}px`;
  objectNode.style.height = `${Math.max(target.height, 20)}px`;
}

function setObjectEditing(board, objectId, editing, selectionMode = "end") {
  const target = board.objects.find((item) => item.id === objectId);
  if (!target || !canObjectEditInline(target)) return;

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
    selection.removeAllRanges();
    if (selectionMode === "all") {
      selection.addRange(range);
      return;
    }
    range.collapse(false);
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
    fontSize: Number(object.style?.fontSize ?? board.defaults.fontSize) || 24,
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
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
  setObjectEditing(board, next.id, true);
}

function insertBoardTextFromToolbar(board, framed = false, autoEdit = true) {
  const width = framed ? 240 : 180;
  const height = framed ? 130 : 44;
  const x = Math.max(24, board.lastWidth / 2 - width / 2);
  const y = Math.max(24, board.lastHeight / 2 - height / 2);

  saveCanvasBoardState(board.id);
  const next = createBaseObject(
    framed ? "text-frame" : "text",
    x,
    y,
    width,
    height,
    board,
  );
  next.text = "";
  next.editing = Boolean(autoEdit);
  next.style.fill = framed ? "#ffffff" : "transparent";
  next.style.textColor = board.defaults.textColor;

  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
  if (autoEdit) {
    setObjectEditing(board, next.id, true, "all");
  }
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
  next.text = "";
  next.editing = false;

  board.objects.push(next);
  board.selectedObjectId = next.id;
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
  } else if (key === "fontSize") {
    board.defaults.fontSize = Number(value) || board.defaults.fontSize;
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

  if (key === "fontSize") {
    target.style.fontSize = Number(value) || target.style.fontSize || 24;
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

  if (key === "shapeKind" && !target && isShapeTool(value)) {
    board.tool = value;
  }

  syncBoardDom(board);
}

function syncBoardStyleControls(board) {
  updateBoardToolbarState(board);

  const target = board.objects.find(
    (item) => item.id === board.selectedObjectId,
  );
  const style = target ? getObjectStyle(target, board) : board.defaults;

  const fillInput = board.toolbar.querySelector(`#${board.id}-fill-color`);
  const strokeInput = board.toolbar.querySelector(`#${board.id}-stroke-color`);
  const widthInput = board.toolbar.querySelector(`#${board.id}-stroke-width`);
  const fontInput = board.toolbar.querySelector(`#${board.id}-font-size`);
  const shapeSelect = board.toolbar.querySelector(`#${board.id}-shape-kind`);
  const chartSelect = board.toolbar.querySelector(`#${board.id}-chart-kind`);

  if (fillInput)
    fillInput.value = normalizeColor(style.fill, board.defaults.fill);
  if (strokeInput)
    strokeInput.value = normalizeColor(style.stroke, board.defaults.stroke);
  if (widthInput)
    widthInput.value = String(style.strokeWidth || board.defaults.strokeWidth);
  if (fontInput)
    fontInput.value = String(style.fontSize || board.defaults.fontSize);
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
    renderDrawableObject(node, object, style);
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

function renderDrawableObject(node, object, style) {
  node.innerHTML = getShapeSvgMarkup(object, style);
  if (!isShapeTool(object.type)) return;

  const content = document.createElement("div");
  content.className = "whiteboard-shape-content whiteboard-object-content";
  content.contentEditable = String(Boolean(object.editing));
  content.dataset.objectId = object.id;
  content.textContent = object.text || (object.editing ? "" : "");
  content.style.color = style.textColor;
  content.style.fontSize = `${Math.max(14, style.fontSize * 0.78)}px`;
  node.appendChild(content);
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
  content.style.fontSize = `${style.fontSize}px`;
  node.appendChild(content);
}

function renderTableObject(node, object) {
  const editable = Boolean(object.editing);
  const rows = (object.rows || [])
    .map(
      (row, rowIndex) =>
        `<tr>${row
          .map((cell, colIndex) => {
            const tag = rowIndex === 0 ? "th" : "td";
            return `<${tag}
              class="whiteboard-table-cell"
              contenteditable="${editable}"
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
  next.editing = true;
  board.objects.push(next);
  board.selectedObjectId = next.id;
  syncBoardDom(board);
  syncBoardStyleControls(board);
  requestAnimationFrame(() => {
    board.scene
      .querySelector(
        `.whiteboard-object[data-object-id="${next.id}"] .whiteboard-table-cell`,
      )
      ?.focus();
  });
}

function createTableObjectFromPrompt(board) {
  openTableDialog(board);
}

function createChartObjectFromPrompt(board, chartKind) {
  openChartDialog(board, null, chartKind);
}

function editChartObject(board, objectId) {
  openChartDialog(board, objectId);
}

function editTableStructure(board, objectId) {
  openTableDialog(board, objectId);
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
