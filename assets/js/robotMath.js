let robotData = null;
let currentCategory = "gerakan-robot";
let workspaceZoom = 1;
let draggedBlockElement = null;
let robotCategoryListCollapsed = false;

const stageState = {
  text: "Robot Math",
  color: "#0d6efd",
  image: null,
  spriteX: 80,
  spriteY: 190,
  spriteAngle: 0,
  spriteMessage: "",
  status: "Siap",
  lastExpression: "-",
  lastResult: "-",
};

const outputState = {
  lines: ["Tambahkan blok Robot Math untuk mulai menyusun program."],
};

const robotRuntime = {
  variables: {},
  functions: {},
  isRunning: false,
};

function getRobotCanvas() {
  return document.getElementById("robot-canvas");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatValue(value) {
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2).replace(/\.00$/, "");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function sanitizeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBlockCatalog() {
  if (!robotData?.categories) return [];
  return robotData.categories.flatMap((category) =>
    category.blocks.map((block) => ({
      ...block,
      categoryId: category.id,
      categoryName: category.nama,
    })),
  );
}

function getBlockByType(type) {
  return getBlockCatalog().find((block) => block.type === type) || null;
}

function setRobotLog(lines) {
  outputState.lines = Array.isArray(lines) ? [...lines] : [String(lines)];
  renderOutputLog();
}

function appendRobotLog(line) {
  outputState.lines.push(String(line));
  renderOutputLog();
}

function renderOutputLog() {
  const log = document.getElementById("robot-log");
  if (!log) return;
  log.textContent = outputState.lines.join("\n");
  log.scrollTop = log.scrollHeight;
}

function setMathState(expression, result, realtime) {
  stageState.lastExpression = expression ?? stageState.lastExpression;
  stageState.lastResult = result ?? stageState.lastResult;
  const expressionEl = document.getElementById("math-expression");
  const resultEl = document.getElementById("math-result");
  const realtimeEl = document.getElementById("math-realtime");
  if (expressionEl)
    expressionEl.textContent = `Ekspresi: ${stageState.lastExpression}`;
  if (resultEl) resultEl.textContent = `Hasil: ${stageState.lastResult}`;
  if (realtimeEl)
    realtimeEl.textContent =
      realtime ||
      `Realtime: posisi (${Math.round(stageState.spriteX)}, ${Math.round(stageState.spriteY)})`;
}

function updateRobotInfo() {
  const items = [
    ["robot-pos-x", Math.round(stageState.spriteX)],
    ["robot-pos-y", Math.round(stageState.spriteY)],
    ["robot-angle", Math.round(stageState.spriteAngle)],
    ["robot-status", stageState.status],
  ];
  items.forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  });
}

function resetStageState() {
  stageState.spriteX = 80;
  stageState.spriteY = 190;
  stageState.spriteAngle = 0;
  stageState.spriteMessage = "";
  stageState.status = "Siap";
  stageState.lastExpression = "-";
  stageState.lastResult = "-";
}

function setRobotStatus(status) {
  stageState.status = status;
  updateRobotInfo();
}

function renderStage() {
  const canvas = getRobotCanvas();
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#f7fbff");
  background.addColorStop(1, "#edf5ff");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (stageState.image) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(stageState.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(37, 99, 235, 0.08)";
  for (let x = 20; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 20; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#15375e";
  ctx.font = "700 22px Arial";
  ctx.fillText(stageState.text || "Robot Math", 16, 30);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#57708d";
  ctx.fillText(`Status: ${stageState.status}`, 16, 52);
  ctx.fillText(
    `Ekspresi: ${String(stageState.lastExpression).slice(0, 42)}`,
    16,
    72,
  );
  ctx.fillText(`Hasil: ${String(stageState.lastResult).slice(0, 42)}`, 16, 92);

  if (stageState.spriteMessage) {
    const message = String(stageState.spriteMessage).slice(0, 48);
    const width = Math.max(140, message.length * 7);
    const bubbleX = clamp(
      stageState.spriteX + 16,
      10,
      canvas.width - width - 10,
    );
    const bubbleY = clamp(stageState.spriteY - 64, 10, canvas.height - 60);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.strokeStyle = "#9db2cc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, width, 42, 14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bubbleX + 22, bubbleY + 42);
    ctx.lineTo(bubbleX + 12, bubbleY + 56);
    ctx.lineTo(bubbleX + 32, bubbleY + 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#10233f";
    ctx.font = "14px Arial";
    ctx.fillText(message, bubbleX + 12, bubbleY + 25);
  }

  ctx.save();
  ctx.translate(stageState.spriteX, stageState.spriteY);
  ctx.rotate((stageState.spriteAngle * Math.PI) / 180);
  ctx.fillStyle = stageState.color;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-6, -4, 3, 0, Math.PI * 2);
  ctx.arc(6, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(28, 0);
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(18, -6);
  ctx.lineTo(18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#27496d";
  ctx.font = "12px Arial";
  ctx.fillText(
    `Koordinat (${Math.round(stageState.spriteX)}, ${Math.round(stageState.spriteY)})`,
    16,
    canvas.height - 16,
  );
}

function updateStageSettings() {
  const textInput = document.getElementById("stage-text");
  const colorInput = document.getElementById("stage-color");
  stageState.text = textInput?.value || "Robot Math";
  stageState.color = colorInput?.value || "#0d6efd";
  renderStage();
}

function handleStageImage(event) {
  const [file] = event.target.files || [];
  if (!file) {
    stageState.image = null;
    renderStage();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      stageState.image = image;
      renderStage();
    };
    image.src = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

function getCanvasPosition(event) {
  const canvas = getRobotCanvas();
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function initStageDrag() {
  const canvas = getRobotCanvas();
  if (!canvas || canvas.dataset.dragReady === "true") return;
  canvas.dataset.dragReady = "true";
  let dragging = false;
  canvas.addEventListener("mousedown", (event) => {
    const { x, y } = getCanvasPosition(event);
    if (Math.hypot(x - stageState.spriteX, y - stageState.spriteY) <= 26) {
      dragging = true;
      canvas.classList.add("dragging");
    }
  });
  canvas.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const { x, y } = getCanvasPosition(event);
    stageState.spriteX = clamp(x, 20, canvas.width - 20);
    stageState.spriteY = clamp(y, 24, canvas.height - 24);
    stageState.status = "Sprite dipindahkan";
    updateRobotInfo();
    setMathState(
      stageState.lastExpression,
      stageState.lastResult,
      `Realtime: posisi (${Math.round(stageState.spriteX)}, ${Math.round(stageState.spriteY)})`,
    );
    renderStage();
  });
  const stopDrag = () => {
    dragging = false;
    canvas.classList.remove("dragging");
  };
  canvas.addEventListener("mouseup", stopDrag);
  canvas.addEventListener("mouseleave", stopDrag);
}

function createFieldMarkup([name, config]) {
  const label = sanitizeHtml(config.label || name);
  const value = sanitizeHtml(config.value ?? "");
  const type = config.type || "text";
  return `
    <div class="workspace-field">
      <label>${label}</label>
      <input type="${type === "color" ? "color" : "text"}" value="${value}" data-param="${sanitizeHtml(name)}" data-type="${type}" />
    </div>
  `;
}

function renderCategoryButtons() {
  const container = document.getElementById("robot-category-list");
  if (!container || !robotData?.categories) return;
  container.innerHTML = "";
  robotData.categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category.nama;
    button.classList.toggle("active", category.id === currentCategory);
    button.addEventListener("click", () => showCategory(category.id));
    container.appendChild(button);
  });
}

function updateRobotCategoryToggle() {
  const panel = document.getElementById("robot-category-panel");
  const toggle = document.getElementById("robot-category-toggle");
  if (!panel || !toggle) return;

  panel.classList.toggle("collapsed", robotCategoryListCollapsed);
  toggle.textContent = robotCategoryListCollapsed ? "Show" : "Hide";
  toggle.setAttribute("aria-expanded", String(!robotCategoryListCollapsed));
}

function toggleRobotCategoryList() {
  robotCategoryListCollapsed = !robotCategoryListCollapsed;
  updateRobotCategoryToggle();
}

function showCategory(categoryId) {
  currentCategory = categoryId;
  renderCategoryButtons();
  renderPalette();
}

function renderPalette() {
  const palette = document.getElementById("palette");
  if (!palette || !robotData?.categories) return;
  const category = robotData.categories.find(
    (item) => item.id === currentCategory,
  );
  if (!category) return;

  palette.innerHTML = `
    <div class="palette-header">
      <h3>${sanitizeHtml(category.nama)}</h3>
      <p>Tarik blok ke workspace, lalu gabungkan ekspresi matematika di parameternya.</p>
    </div>
    <div class="palette-stack"></div>
  `;

  const stack = palette.querySelector(".palette-stack");
  category.blocks.forEach((block) => {
    const element = document.createElement("div");
    element.className = `block ${category.id}`;
    element.draggable = true;
    element.dataset.type = block.type;
    element.innerHTML = `
      <div class="block-title">${sanitizeHtml(block.label)}</div>
      <div class="block-hint">${sanitizeHtml(block.description || "Drag ke workspace")}</div>
    `;
    element.addEventListener("dragstart", (event) => {
      draggedBlockElement = null;
      event.dataTransfer.setData("application/x-robot-block", block.type);
      event.dataTransfer.effectAllowed = "copy";
    });
    stack.appendChild(element);
  });
}

function createWorkspaceBlock(type) {
  const block = getBlockByType(type);
  if (!block) return null;

  const wrapper = document.createElement("div");
  wrapper.className = `block workspace-block ${block.categoryId}`;
  wrapper.dataset.type = block.type;
  wrapper.draggable = true;

  const fieldsMarkup = Object.entries(block.params || {})
    .map(createFieldMarkup)
    .join("");
  const slotsMarkup = (block.slots || [])
    .map(
      (slot) => `
        <section class="block-slot" data-slot-id="${sanitizeHtml(slot.id)}">
          <div class="block-slot-header">${sanitizeHtml(slot.label || slot.id)}</div>
          <div class="block-slot-body workspace-dropzone">
            <p class="slot-placeholder">Drop blok ke area ini.</p>
          </div>
        </section>
      `,
    )
    .join("");

  wrapper.innerHTML = `
    <div class="workspace-block-header">
      <div class="workspace-block-meta">
        <span class="workspace-block-type">${sanitizeHtml(block.categoryName)}</span>
        <div class="block-title">${sanitizeHtml(block.label)}</div>
        <div class="block-hint">${sanitizeHtml(block.description || "")}</div>
      </div>
      <button type="button" class="workspace-remove">Hapus</button>
    </div>
    ${fieldsMarkup ? `<div class="workspace-block-fields">${fieldsMarkup}</div>` : ""}
    ${slotsMarkup ? `<div class="workspace-block-slots">${slotsMarkup}</div>` : ""}
  `;

  wrapper.querySelector(".workspace-remove")?.addEventListener("click", () => {
    wrapper.remove();
    refreshWorkspacePlaceholder();
  });

  wrapper.addEventListener("dragstart", (event) => {
    draggedBlockElement = wrapper;
    wrapper.classList.add("dragging");
    event.dataTransfer.setData(
      "application/x-robot-block",
      wrapper.dataset.type,
    );
    event.dataTransfer.effectAllowed = "move";
  });

  wrapper.addEventListener("dragend", () => {
    wrapper.classList.remove("dragging");
    draggedBlockElement = null;
  });

  wrapper
    .querySelectorAll(".block-slot-body")
    .forEach((slotBody) => initDropzone(slotBody));
  return wrapper;
}

function refreshWorkspacePlaceholder() {
  document.querySelectorAll(".workspace-dropzone").forEach((dropzone) => {
    const placeholder = dropzone.querySelector(
      ":scope > .slot-placeholder, :scope > .workspace-placeholder",
    );
    const hasBlocks = Boolean(
      dropzone.querySelector(":scope > .workspace-block"),
    );
    if (hasBlocks && placeholder) {
      placeholder.remove();
      return;
    }
    if (!hasBlocks && !placeholder) {
      const node = document.createElement("p");
      node.className =
        dropzone.id === "workspace"
          ? "workspace-placeholder"
          : "slot-placeholder";
      node.textContent =
        dropzone.id === "workspace"
          ? "Drag block ke sini. Ubah parameternya, atur urutan, lalu tekan Run. Gunakan scroll mouse di area ini untuk zoom."
          : "Drop blok ke area ini.";
      dropzone.appendChild(node);
    }
  });
}

function getDropTarget(container, pointerY) {
  const blocks = [
    ...container.querySelectorAll(":scope > .workspace-block:not(.dragging)"),
  ];
  return blocks.reduce(
    (closest, block) => {
      const box = block.getBoundingClientRect();
      const offset = pointerY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: block };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;
}

function initDropzone(dropzone) {
  if (!dropzone || dropzone.dataset.dropReady === "true") return;
  dropzone.dataset.dropReady = "true";
  dropzone.classList.add("workspace-dropzone");

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
    const activeBlock = draggedBlockElement;
    if (!activeBlock) return;
    const afterElement = getDropTarget(dropzone, event.clientY);
    if (afterElement) {
      dropzone.insertBefore(activeBlock, afterElement);
    } else {
      dropzone.appendChild(activeBlock);
    }
  });

  dropzone.addEventListener("dragleave", (event) => {
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("drag-over");
    }
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
    let blockToInsert = draggedBlockElement;
    if (!blockToInsert) {
      const type = event.dataTransfer.getData("application/x-robot-block");
      blockToInsert = createWorkspaceBlock(type);
    }
    if (!blockToInsert) return;
    const afterElement = getDropTarget(dropzone, event.clientY);
    if (afterElement) {
      dropzone.insertBefore(blockToInsert, afterElement);
    } else {
      dropzone.appendChild(blockToInsert);
    }
    refreshWorkspacePlaceholder();
  });
}

function updateWorkspaceZoomLabel() {
  const label = document.getElementById("workspace-zoom-label");
  const workspace = document.getElementById("workspace");
  if (label) label.textContent = `${Math.round(workspaceZoom * 100)}%`;
  if (workspace) workspace.style.transform = `scale(${workspaceZoom})`;
}

function initWorkspaceZoomGesture() {
  const workspaceStage = document.getElementById("workspace-stage");
  if (!workspaceStage || workspaceStage.dataset.zoomReady === "true") return;
  workspaceStage.dataset.zoomReady = "true";
  workspaceStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      workspaceZoom = clamp(
        Number((workspaceZoom + (event.deltaY < 0 ? 0.08 : -0.08)).toFixed(2)),
        0.55,
        2.1,
      );
      updateWorkspaceZoomLabel();
    },
    { passive: false },
  );
}

function initWorkspace() {
  const workspace = document.getElementById("workspace");
  if (!workspace) return;
  initDropzone(workspace);
  initWorkspaceZoomGesture();
  updateWorkspaceZoomLabel();
  refreshWorkspacePlaceholder();
}

function parseBlockElement(blockEl) {
  const template = getBlockByType(blockEl.dataset.type);
  const params = {};
  blockEl
    .querySelectorAll(":scope > .workspace-block-fields [data-param]")
    .forEach((input) => {
      params[input.dataset.param] = input.value;
    });
  const slots = {};
  (template?.slots || []).forEach((slot) => {
    const slotBody = blockEl.querySelector(
      `:scope .block-slot[data-slot-id="${slot.id}"] > .block-slot-body`,
    );
    slots[slot.id] = slotBody ? getProgramFromContainer(slotBody) : [];
  });
  return {
    type: blockEl.dataset.type,
    label: template?.label || blockEl.dataset.type,
    params,
    slots,
  };
}

function getProgramFromContainer(container) {
  return [...container.querySelectorAll(":scope > .workspace-block")].map(
    parseBlockElement,
  );
}

function clearWorkspace() {
  const workspace = document.getElementById("workspace");
  if (!workspace) return;
  workspace.innerHTML = "";
  refreshWorkspacePlaceholder();
}

function createExpressionScope(context) {
  const mathFns = {
    add: (a, b) => toNumber(a) + toNumber(b),
    subtract: (a, b) => toNumber(a) - toNumber(b),
    multiply: (a, b) => toNumber(a) * toNumber(b),
    divide: (a, b) => (toNumber(b) === 0 ? 0 : toNumber(a) / toNumber(b)),
    power: (a, b) => toNumber(a) ** toNumber(b),
    mod: (a, b) => (toNumber(b) === 0 ? 0 : toNumber(a) % toNumber(b)),
    sqrt: (nilai) => Math.sqrt(Math.max(0, toNumber(nilai))),
    abs: (nilai) => Math.abs(toNumber(nilai)),
    round: (nilai) => Math.round(toNumber(nilai)),
    floor: (nilai) => Math.floor(toNumber(nilai)),
    ceil: (nilai) => Math.ceil(toNumber(nilai)),
    random: (min, max) => {
      const lower = Math.min(toNumber(min), toNumber(max));
      const upper = Math.max(toNumber(min), toNumber(max));
      return Math.floor(Math.random() * (upper - lower + 1)) + lower;
    },
    greaterThan: (a, b) => toNumber(a) > toNumber(b),
    lessThan: (a, b) => toNumber(a) < toNumber(b),
    equal: (a, b) => a === b,
    and: (a, b) => Boolean(a) && Boolean(b),
    or: (a, b) => Boolean(a) || Boolean(b),
    not: (nilai) => !Boolean(nilai),
    getVariable: (name) => context.variables[String(name)] ?? 0,
  };

  const customFns = {};
  Object.entries(context.functions).forEach(([name, definition]) => {
    customFns[name] = (...args) => runCustomFunction(definition, args, context);
  });

  return {
    ...mathFns,
    ...customFns,
    ...context.variables,
    Math,
  };
}

function runCustomFunction(definition, args, parentContext) {
  const localContext = {
    variables: { ...parentContext.variables },
    functions: { ...parentContext.functions },
    returnSignal: { returned: false, value: 0 },
  };

  definition.parameters.forEach((name, index) => {
    if (name) localContext.variables[name] = args[index] ?? 0;
  });

  executeBlocksForFunction(definition.body || [], localContext);

  Object.keys(parentContext.variables).forEach((key) => {
    if (key in localContext.variables) {
      parentContext.variables[key] = localContext.variables[key];
    }
  });

  return localContext.returnSignal.returned
    ? localContext.returnSignal.value
    : 0;
}

function executeBlocksForFunction(blocks, context) {
  for (const block of blocks) {
    if (context.returnSignal?.returned) break;

    if (block.type === "setVariable") {
      const name = String(block.params.nama || "").trim();
      if (name)
        context.variables[name] = evaluateExpression(
          block.params.nilai,
          context,
          { track: false },
        );
      continue;
    }

    if (block.type === "changeVariable") {
      const name = String(block.params.nama || "").trim();
      if (name) {
        const value = evaluateExpression(block.params.nilai, context, {
          track: false,
        });
        context.variables[name] =
          toNumber(context.variables[name] ?? 0) + toNumber(value);
      }
      continue;
    }

    if (block.type === "createVariable") {
      const name = String(block.params.nama || "").trim();
      if (name) context.variables[name] = context.variables[name] ?? 0;
      continue;
    }

    if (block.type === "repeat") {
      const total = clamp(
        Math.floor(
          evaluateExpression(block.params.jumlah, context, { track: false }),
        ),
        0,
        24,
      );
      for (let index = 0; index < total; index += 1) {
        executeBlocksForFunction(block.slots.body || [], context);
        if (context.returnSignal?.returned) break;
      }
      continue;
    }

    if (block.type === "if") {
      if (evaluateExpression(block.params.kondisi, context, { track: false })) {
        executeBlocksForFunction(block.slots.body || [], context);
      }
      continue;
    }

    if (block.type === "ifElse") {
      const branch = evaluateExpression(block.params.kondisi, context, {
        track: false,
      })
        ? block.slots.ifBody || []
        : block.slots.elseBody || [];
      executeBlocksForFunction(branch, context);
      continue;
    }

    if (block.type === "return") {
      context.returnSignal.returned = true;
      context.returnSignal.value = evaluateExpression(
        block.params.nilai,
        context,
        { track: false },
      );
    }
  }
}

function evaluateExpression(rawExpression, context, options = {}) {
  const expression = String(rawExpression ?? "").trim();
  if (!expression) return 0;
  const normalized = /^(true|false)$/i.test(expression)
    ? expression.toLowerCase()
    : expression;
  const scope = createExpressionScope(context);

  try {
    const fn = new Function(
      "scope",
      `with (scope) { return (${normalized}); }`,
    );
    const result = fn(scope);
    if (options.track !== false) {
      setMathState(
        expression,
        formatValue(result),
        options.message || `Realtime: ${expression} => ${formatValue(result)}`,
      );
      renderStage();
    }
    return result;
  } catch (error) {
    appendRobotLog(`Error ekspresi "${expression}": ${error.message}`);
    setMathState(
      expression,
      "Error",
      `Realtime: ekspresi "${expression}" tidak valid.`,
    );
    renderStage();
    return 0;
  }
}

function setSpritePosition(x, y) {
  const canvas = getRobotCanvas();
  if (!canvas) return;
  stageState.spriteX = clamp(toNumber(x), 20, canvas.width - 20);
  stageState.spriteY = clamp(toNumber(y), 24, canvas.height - 24);
}

function moveRobot(steps) {
  const radians = (stageState.spriteAngle * Math.PI) / 180;
  setSpritePosition(
    stageState.spriteX + Math.cos(radians) * toNumber(steps),
    stageState.spriteY + Math.sin(radians) * toNumber(steps),
  );
}

function syncRuntimeToPanels(context) {
  updateRobotInfo();
  setMathState(
    stageState.lastExpression,
    stageState.lastResult,
    `Realtime: posisi (${Math.round(stageState.spriteX)}, ${Math.round(stageState.spriteY)}), variabel ${Object.keys(context.variables).length}`,
  );
  renderStage();
}

function captureRuntimeState(context) {
  appendRobotLog(`Variabel: ${JSON.stringify(context.variables)}`);
}

function buildRuntimeContext() {
  return {
    variables: { ...robotRuntime.variables },
    functions: { ...robotRuntime.functions },
    returnSignal: null,
  };
}

function commitRuntimeContext(context) {
  robotRuntime.variables = { ...context.variables };
  robotRuntime.functions = { ...context.functions };
}

async function resolveValue(rawValue, context) {
  if (typeof rawValue === "number" || typeof rawValue === "boolean")
    return rawValue;
  return await evaluateExpression(rawValue, context);
}

async function executeControlBlock(block, context, options) {
  if (block.type === "wait") {
    const seconds = await resolveValue(block.params.detik, context);
    appendRobotLog(`wait(${formatValue(seconds)})`);
    setRobotStatus(`Menunggu ${formatValue(seconds)} detik`);
    syncRuntimeToPanels(context);
    if (!options.skipDelay) await wait(clamp(toNumber(seconds) * 220, 0, 2400));
    return;
  }

  if (block.type === "repeat") {
    const total = clamp(
      Math.floor(await resolveValue(block.params.jumlah, context)),
      0,
      24,
    );
    appendRobotLog(`repeat(${total})`);
    for (let index = 0; index < total; index += 1) {
      setRobotStatus(`Repeat ${index + 1}/${total}`);
      await executeBlocks(block.slots.body || [], context, options);
    }
    return;
  }

  if (block.type === "forever") {
    appendRobotLog("forever() disimulasikan 12 siklus");
    for (let index = 0; index < 12; index += 1) {
      setRobotStatus(`Forever ${index + 1}/12`);
      await executeBlocks(block.slots.body || [], context, options);
    }
    return;
  }

  if (block.type === "if") {
    const condition = await resolveValue(block.params.kondisi, context);
    appendRobotLog(`if(${formatValue(condition)})`);
    if (condition)
      await executeBlocks(block.slots.body || [], context, options);
    return;
  }

  if (block.type === "ifElse") {
    const condition = await resolveValue(block.params.kondisi, context);
    appendRobotLog(`ifElse(${formatValue(condition)})`);
    await executeBlocks(
      condition ? block.slots.ifBody || [] : block.slots.elseBody || [],
      context,
      options,
    );
  }
}

async function executeBlocks(blocks, context, options = {}) {
  for (const block of blocks) {
    if (context.returnSignal?.returned) break;

    if (block.type === "move") {
      const steps = await resolveValue(block.params.langkah, context);
      appendRobotLog(`move(${formatValue(steps)})`);
      moveRobot(steps);
      setRobotStatus(`Bergerak ${formatValue(steps)} langkah`);
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "turn") {
      const angle = await resolveValue(block.params.derajat, context);
      appendRobotLog(`turn(${formatValue(angle)})`);
      stageState.spriteAngle = (stageState.spriteAngle + toNumber(angle)) % 360;
      setRobotStatus(`Berputar ${formatValue(angle)} derajat`);
      syncRuntimeToPanels(context);
      continue;
    }

    if (["goToXY", "setPosition"].includes(block.type)) {
      const x = await resolveValue(block.params.x, context);
      const y = await resolveValue(block.params.y, context);
      appendRobotLog(`${block.type}(${formatValue(x)}, ${formatValue(y)})`);
      setSpritePosition(x, y);
      setRobotStatus(`Ke posisi (${formatValue(x)}, ${formatValue(y)})`);
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "changeXBy") {
      const value = await resolveValue(block.params.nilai, context);
      appendRobotLog(`changeXBy(${formatValue(value)})`);
      setSpritePosition(
        stageState.spriteX + toNumber(value),
        stageState.spriteY,
      );
      setRobotStatus(`X berubah ${formatValue(value)}`);
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "changeYBy") {
      const value = await resolveValue(block.params.nilai, context);
      appendRobotLog(`changeYBy(${formatValue(value)})`);
      setSpritePosition(
        stageState.spriteX,
        stageState.spriteY + toNumber(value),
      );
      setRobotStatus(`Y berubah ${formatValue(value)}`);
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "say") {
      stageState.spriteMessage = String(block.params.teks || "");
      appendRobotLog(`say("${stageState.spriteMessage}")`);
      setRobotStatus("Robot berbicara");
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "showNumber") {
      const value = await resolveValue(block.params.nilai, context);
      appendRobotLog(`showNumber(${formatValue(value)})`);
      setMathState(
        block.params.nilai || String(value),
        formatValue(value),
        `Realtime: angka ${formatValue(value)}`,
      );
      renderStage();
      continue;
    }

    if (block.type === "showResult") {
      const expression = block.params.ekspresi || "";
      const value = await resolveValue(expression, context);
      appendRobotLog(`showResult(${expression}) => ${formatValue(value)}`);
      setMathState(
        expression,
        formatValue(value),
        `Realtime: ${expression} => ${formatValue(value)}`,
      );
      renderStage();
      continue;
    }

    if (block.type === "clearOutput") {
      setRobotLog(["Output dibersihkan."]);
      setRobotStatus("Output dibersihkan");
      syncRuntimeToPanels(context);
      continue;
    }

    if (block.type === "createVariable") {
      const name = String(block.params.nama || "").trim();
      if (name) {
        context.variables[name] = context.variables[name] ?? 0;
        appendRobotLog(`createVariable(${name})`);
        captureRuntimeState(context);
      }
      continue;
    }

    if (block.type === "setVariable") {
      const name = String(block.params.nama || "").trim();
      if (name) {
        const value = await resolveValue(block.params.nilai, context);
        context.variables[name] = value;
        appendRobotLog(`setVariable(${name}, ${formatValue(value)})`);
        captureRuntimeState(context);
        syncRuntimeToPanels(context);
      }
      continue;
    }

    if (block.type === "changeVariable") {
      const name = String(block.params.nama || "").trim();
      if (name) {
        const value = await resolveValue(block.params.nilai, context);
        context.variables[name] =
          toNumber(context.variables[name] ?? 0) + toNumber(value);
        appendRobotLog(`changeVariable(${name}, ${formatValue(value)})`);
        captureRuntimeState(context);
        syncRuntimeToPanels(context);
      }
      continue;
    }

    if (block.type === "getVariable") {
      const name = String(block.params.nama || "").trim();
      const value = context.variables[name] ?? 0;
      appendRobotLog(`getVariable(${name}) => ${formatValue(value)}`);
      setMathState(
        `getVariable(${name})`,
        formatValue(value),
        `Realtime: variabel ${name} = ${formatValue(value)}`,
      );
      renderStage();
      continue;
    }

    if (block.type === "createFunction") {
      const name = String(block.params.nama || "").trim();
      const parameters = String(block.params.parameter || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (name) {
        context.functions[name] = {
          name,
          parameters,
          body: block.slots.body || [],
        };
        appendRobotLog(
          `createFunction(${name}) dengan parameter [${parameters.join(", ")}]`,
        );
      }
      continue;
    }

    if (block.type === "return") {
      const value = await resolveValue(block.params.nilai, context);
      appendRobotLog(`return(${formatValue(value)})`);
      if (context.returnSignal) {
        context.returnSignal.returned = true;
        context.returnSignal.value = value;
      }
      setMathState(
        block.params.nilai || String(value),
        formatValue(value),
        `Realtime: return ${formatValue(value)}`,
      );
      renderStage();
      continue;
    }

    if (["wait", "repeat", "forever", "if", "ifElse"].includes(block.type)) {
      await executeControlBlock(block, context, options);
      continue;
    }

    if (
      [
        "add",
        "subtract",
        "multiply",
        "divide",
        "power",
        "mod",
        "sqrt",
        "abs",
        "round",
        "floor",
        "ceil",
        "random",
        "greaterThan",
        "lessThan",
        "equal",
        "and",
        "or",
        "not",
      ].includes(block.type)
    ) {
      const renderedArgs = Object.values(block.params || {}).join(", ");
      const expression = `${block.type}(${renderedArgs})`;
      const value = await resolveValue(expression, context);
      appendRobotLog(`${expression} => ${formatValue(value)}`);
      setMathState(
        expression,
        formatValue(value),
        `Realtime: ${expression} => ${formatValue(value)}`,
      );
      renderStage();
    }
  }
}

function selectBlocksForTrigger(program, trigger) {
  const eventBlocks = program.filter((block) =>
    ["whenStart", "whenButtonPressed"].includes(block.type),
  );
  if (!eventBlocks.length) return program;

  if (trigger.type === "button") {
    return eventBlocks
      .filter(
        (block) =>
          block.type === "whenButtonPressed" &&
          String(block.params.nama || "")
            .trim()
            .toLowerCase() ===
            String(trigger.name || "")
              .trim()
              .toLowerCase(),
      )
      .flatMap((block) => block.slots.body || []);
  }

  return eventBlocks
    .filter((block) => block.type === "whenStart")
    .flatMap((block) => block.slots.body || []);
}

async function runProgram(trigger = { type: "start" }) {
  if (robotRuntime.isRunning) return;
  const workspace = document.getElementById("workspace");
  if (!workspace) return;

  const program = getProgramFromContainer(workspace);
  if (!program.length) {
    setRobotLog([
      "Workspace masih kosong. Drag blok ke workspace terlebih dahulu.",
    ]);
    return;
  }

  const runnableBlocks = selectBlocksForTrigger(program, trigger);
  if (!runnableBlocks.length) {
    setRobotLog([
      trigger.type === "button"
        ? `Tidak ada blok whenButtonPressed("${trigger.name}") di workspace.`
        : "Tidak ada blok whenStart() untuk dijalankan.",
    ]);
    return;
  }

  robotRuntime.isRunning = true;
  setRobotLog([
    trigger.type === "button"
      ? `Trigger tombol ${trigger.name}`
      : "Menjalankan whenStart()",
  ]);
  setRobotStatus("Program berjalan");

  const context = buildRuntimeContext();
  try {
    await executeBlocks(runnableBlocks, context, { skipDelay: false });
    commitRuntimeContext(context);
    setRobotStatus("Program selesai");
    appendRobotLog("Selesai menjalankan blok Robot Math.");
    syncRuntimeToPanels(context);
  } catch (error) {
    appendRobotLog(`Runtime error: ${error.message}`);
    setRobotStatus("Terjadi error");
    renderStage();
  } finally {
    robotRuntime.isRunning = false;
  }
}

function triggerRobotButton() {
  const input = document.getElementById("trigger-button-name");
  runProgram({ type: "button", name: input?.value?.trim() || "A" });
}

function resetRobotOutput() {
  robotRuntime.variables = {};
  robotRuntime.functions = {};
  resetStageState();
  setRobotLog(["Robot Math di-reset."]);
  setMathState("-", "-", "Realtime: menunggu blok dijalankan.");
  updateStageSettings();
  updateRobotInfo();
  renderStage();
}

async function loadRobotMath() {
  try {
    const response = await fetch("data/robotMath.json");
    robotData = await response.json();
    renderCategoryButtons();
    updateRobotCategoryToggle();
    renderPalette();
    initWorkspace();
    updateStageSettings();
    initStageDrag();
    updateRobotInfo();
    renderOutputLog();
    setMathState("-", "-", "Realtime: menunggu blok dijalankan.");
    renderStage();
  } catch (error) {
    console.error("Gagal load Robot Math:", error);
    setRobotLog(["Gagal memuat data Robot Math."]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("robot-math")) loadRobotMath();
});

window.showCategory = showCategory;
window.clearWorkspace = clearWorkspace;
window.handleStageImage = handleStageImage;
window.updateStageSettings = updateStageSettings;
window.runProgram = runProgram;
window.resetRobotOutput = resetRobotOutput;
window.triggerRobotButton = triggerRobotButton;
window.toggleRobotCategoryList = toggleRobotCategoryList;
