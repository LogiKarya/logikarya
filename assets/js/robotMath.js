// ===============================
// STATE
// ===============================
let robotData = null;
let currentCategory = "gerakan";
let draggedWorkspaceBlock = null;
let workspaceZoom = 1;
let isDraggingSprite = false;

const stageState = {
  text: "Halo Robot Math",
  color: "#0d6efd",
  imageSrc: "",
  image: null,
  spriteX: 80,
  spriteY: 190,
  spriteAngle: 0,
  spriteMessage: "",
};

// ===============================
// HELPERS
// ===============================
function getBlockCatalog() {
  if (!robotData) return [];
  return robotData.categories.flatMap((category) =>
    category.blocks.map((block) => ({
      ...block,
      categoryId: category.id,
    })),
  );
}

function getBlockByType(type) {
  return getBlockCatalog().find((block) => block.type === type) || null;
}

function formatFieldName(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseFieldValue(name, value, fieldType = "text") {
  if (fieldType === "number") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  return value;
}

function setRobotLog(lines) {
  const log = document.getElementById("robot-log");
  if (!log) return;

  log.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ===============================
// STAGE
// ===============================
function getRobotCanvas() {
  return document.getElementById("robot-canvas");
}

function renderStage() {
  const canvas = getRobotCanvas();
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (stageState.image) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(stageState.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  ctx.fillStyle = stageState.color;
  ctx.font = "700 24px Arial";
  ctx.fillText(stageState.text || "Halo Robot Math", 16, 32);

  if (stageState.spriteMessage) {
    drawSpeechBubble(
      ctx,
      stageState.spriteX + 18,
      stageState.spriteY - 50,
      stageState.spriteMessage,
    );
  }

  ctx.save();
  ctx.translate(stageState.spriteX, stageState.spriteY);
  ctx.rotate((stageState.spriteAngle * Math.PI) / 180);

  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = stageState.color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(24, 0);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawSpeechBubble(ctx, x, y, message) {
  const bubbleWidth = Math.max(120, message.length * 7);
  const bubbleHeight = 38;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, bubbleWidth, bubbleHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 18, y + bubbleHeight);
  ctx.lineTo(x + 8, y + bubbleHeight + 12);
  ctx.lineTo(x + 26, y + bubbleHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "14px Arial";
  ctx.fillText(message, x + 12, y + 24);
  ctx.restore();
}

function updateStageSettings() {
  const textInput = document.getElementById("stage-text");
  const colorInput = document.getElementById("stage-color");

  if (textInput) {
    stageState.text = textInput.value || "Halo Robot Math";
  }

  if (colorInput) {
    stageState.color = colorInput.value || "#0d6efd";
  }

  renderStage();
}

function handleStageImage(event) {
  const [file] = event.target.files || [];

  if (!file) {
    stageState.image = null;
    stageState.imageSrc = "";
    renderStage();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      stageState.imageSrc = reader.result;
      stageState.image = image;
      renderStage();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function getCanvasPosition(event) {
  const canvas = getRobotCanvas();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function initStageDrag() {
  const canvas = getRobotCanvas();
  if (!canvas) return;

  canvas.addEventListener("mousedown", (event) => {
    const { x, y } = getCanvasPosition(event);
    const dx = x - stageState.spriteX;
    const dy = y - stageState.spriteY;

    if (Math.sqrt(dx * dx + dy * dy) <= 20) {
      isDraggingSprite = true;
      canvas.classList.add("dragging");
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!isDraggingSprite) return;

    const { x, y } = getCanvasPosition(event);
    stageState.spriteX = clamp(x, 20, canvas.width - 20);
    stageState.spriteY = clamp(y, 45, canvas.height - 20);
    renderStage();
  });

  const stopDrag = () => {
    isDraggingSprite = false;
    canvas.classList.remove("dragging");
  };

  canvas.addEventListener("mouseup", stopDrag);
  canvas.addEventListener("mouseleave", stopDrag);
}

// ===============================
// WORKSPACE
// ===============================
function refreshWorkspacePlaceholder() {
  const workspace = document.getElementById("workspace");
  if (!workspace) return;

  const blocks = workspace.querySelectorAll(".workspace-block");
  const placeholder = workspace.querySelector(".workspace-placeholder");

  if (blocks.length === 0 && !placeholder) {
    const empty = document.createElement("p");
    empty.className = "workspace-placeholder";
    empty.textContent =
      "Drag block ke sini. Ubah parameternya, atur urutan, lalu tekan Run. Gunakan scroll mouse di area ini untuk zoom.";
    workspace.appendChild(empty);
  }

  if (blocks.length > 0 && placeholder) {
    placeholder.remove();
  }
}

function getWorkspaceDropTarget(container, pointerY) {
  const blocks = [
    ...container.querySelectorAll(".workspace-block:not(.dragging)"),
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

function updateWorkspaceZoomLabel() {
  const label = document.getElementById("workspace-zoom-label");
  const workspace = document.getElementById("workspace");

  if (label) {
    label.textContent = `${Math.round(workspaceZoom * 100)}%`;
  }

  if (workspace) {
    workspace.style.transform = `scale(${workspaceZoom})`;
  }
}

function zoomWorkspace(delta) {
  workspaceZoom = clamp(Number((workspaceZoom + delta).toFixed(2)), 0.55, 1.8);
  updateWorkspaceZoomLabel();
}

function initWorkspaceZoomGesture() {
  const workspaceStage = document.getElementById("workspace-stage");
  if (!workspaceStage) return;

  workspaceStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      zoomWorkspace(delta);
    },
    { passive: false },
  );
}

function createFieldMarkup([name, config]) {
  const fieldType =
    config.type || (typeof config.value === "number" ? "number" : "text");

  if (fieldType === "select") {
    const options = (config.options || [])
      .map(
        (option) =>
          `<option value="${option}" ${
            option === config.value ? "selected" : ""
          }>${option}</option>`,
      )
      .join("");

    return `
      <div class="workspace-field">
        <label>${config.label || formatFieldName(name)}</label>
        <select data-param="${name}" data-type="${fieldType}">
          ${options}
        </select>
      </div>
    `;
  }

  const step = fieldType === "number" ? 'step="any"' : "";
  const min = config.min !== undefined ? `min="${config.min}"` : "";
  const inputType = fieldType === "color" ? "color" : fieldType;

  return `
    <div class="workspace-field">
      <label>${config.label || formatFieldName(name)}</label>
      <input
        type="${inputType}"
        ${step}
        ${min}
        value="${config.value}"
        data-param="${name}"
        data-type="${fieldType}"
      />
    </div>
  `;
}

// ===============================
// LOAD DATA
// ===============================
async function loadRobotMath() {
  try {
    const res = await fetch("data/robotMath.json");
    robotData = await res.json();

    renderCategoryButtons();
    showCategory(currentCategory);
  } catch (err) {
    console.error("Gagal load RobotMath:", err);
  }
}

function renderCategoryButtons() {
  if (!robotData) return;

  const container = document.getElementById("robot-category-list");
  if (!container) return;

  container.innerHTML = robotData.categories
    .map(
      (category) =>
        `<button onclick="showCategory('${category.id}')">${category.nama}</button>`,
    )
    .join("");
}

// ===============================
// SHOW CATEGORY (PALETTE)
// ===============================
function showCategory(categoryId) {
  if (!robotData) return;

  currentCategory = categoryId;

  const palette = document.getElementById("palette");
  const categoryButtons = document.querySelectorAll(".robot-sidebar button");
  if (!palette) return;

  palette.innerHTML = "";

  const currentCategoryData = robotData.categories.find(
    (item) => item.id === categoryId,
  );

  categoryButtons.forEach((button) => {
    const isActive =
      button.textContent.trim().toLowerCase() ===
      (currentCategoryData?.nama || "").toLowerCase();
    button.classList.toggle("active", isActive);
  });

  if (!currentCategoryData) return;

  currentCategoryData.blocks.forEach((block) => {
    const el = document.createElement("div");
    el.className = `block ${categoryId}`;
    el.draggable = true;
    el.dataset.type = block.type;
    el.innerHTML = `
      <div class="block-title">${block.label}</div>
      <div class="block-hint">${block.description || "Drag ke workspace"}</div>
    `;

    el.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("type", block.type);
    });

    palette.appendChild(el);
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

  wrapper.innerHTML = `
    <div class="workspace-block-header">
      <div>
        <div class="block-title mb-0">${block.label}</div>
        <div class="block-hint">${block.description || ""}</div>
      </div>
      <button type="button" class="workspace-remove">Hapus</button>
    </div>
    ${fieldsMarkup ? `<div class="workspace-block-fields">${fieldsMarkup}</div>` : ""}
  `;

  wrapper.querySelector(".workspace-remove")?.addEventListener("click", () => {
    wrapper.remove();
    refreshWorkspacePlaceholder();
  });

  wrapper.addEventListener("dragstart", () => {
    draggedWorkspaceBlock = wrapper;
    wrapper.classList.add("dragging");
  });

  wrapper.addEventListener("dragend", () => {
    wrapper.classList.remove("dragging");
    draggedWorkspaceBlock = null;
  });

  return wrapper;
}

function getWorkspaceProgram() {
  const blocks = document.querySelectorAll("#workspace .workspace-block");

  return Array.from(blocks).map((blockEl) => {
    const params = {};

    blockEl.querySelectorAll("[data-param]").forEach((input) => {
      params[input.dataset.param] = parseFieldValue(
        input.dataset.param,
        input.value,
        input.dataset.type,
      );
    });

    return {
      type: blockEl.dataset.type,
      params,
      label:
        blockEl.querySelector(".block-title")?.textContent ||
        blockEl.dataset.type,
    };
  });
}

function initWorkspace() {
  const workspace = document.getElementById("workspace");
  if (!workspace) return;

  workspace.addEventListener("dragover", (event) => {
    event.preventDefault();

    if (!draggedWorkspaceBlock) return;

    const afterElement = getWorkspaceDropTarget(workspace, event.clientY);
    if (!afterElement) {
      workspace.appendChild(draggedWorkspaceBlock);
      return;
    }

    workspace.insertBefore(draggedWorkspaceBlock, afterElement);
  });

  workspace.addEventListener("drop", (event) => {
    event.preventDefault();

    if (draggedWorkspaceBlock) {
      refreshWorkspacePlaceholder();
      return;
    }

    const type = event.dataTransfer.getData("type");
    if (!type) return;

    const blockEl = createWorkspaceBlock(type);
    if (!blockEl) return;

    workspace.appendChild(blockEl);
    refreshWorkspacePlaceholder();
  });

  refreshWorkspacePlaceholder();
  updateWorkspaceZoomLabel();
  initWorkspaceZoomGesture();
}

function clearWorkspace() {
  const workspace = document.getElementById("workspace");
  if (!workspace) return;

  workspace.innerHTML = "";
  refreshWorkspacePlaceholder();
}

// ===============================
// EXECUTION
// ===============================
function resetRobotOutput() {
  stageState.spriteX = 80;
  stageState.spriteY = 190;
  stageState.spriteAngle = 0;
  stageState.spriteMessage = "";
  updateStageSettings();
  renderStage();
  setRobotLog(
    "Tambahkan block kejadian, gerakan, operasi, tampilan, kontrol, sensor, variabel, atau balok saya untuk mulai menyusun program.",
  );
}

async function runProgram() {
  const program = getWorkspaceProgram();

  if (!program.length) {
    setRobotLog("Workspace masih kosong. Drag block dulu sebelum menjalankan.");
    return;
  }

  if (program[0]?.type !== "start") {
    setRobotLog(
      "Mulai program dengan block Ketika Mulai di urutan paling atas.",
    );
    return;
  }

  const logs = [];
  const variables = {};
  stageState.spriteMessage = "";
  updateStageSettings();
  renderStage();

  for (const command of program) {
    switch (command.type) {
      case "start":
        logs.push("Program dimulai.");
        break;

      case "when_clicked":
        logs.push("Kejadian klik sprite siap dipakai.");
        break;

      case "move_forward": {
        const steps = Number(command.params.steps) || 0;
        stageState.spriteX +=
          steps * Math.cos((stageState.spriteAngle * Math.PI) / 180);
        stageState.spriteY +=
          steps * Math.sin((stageState.spriteAngle * Math.PI) / 180);
        logs.push(`Sprite maju ${steps} langkah.`);
        renderStage();
        await wait(220);
        break;
      }

      case "move_backward": {
        const steps = Number(command.params.steps) || 0;
        stageState.spriteX -=
          steps * Math.cos((stageState.spriteAngle * Math.PI) / 180);
        stageState.spriteY -=
          steps * Math.sin((stageState.spriteAngle * Math.PI) / 180);
        logs.push(`Sprite mundur ${steps} langkah.`);
        renderStage();
        await wait(220);
        break;
      }

      case "turn_left": {
        const turn = Number(command.params.angle) || 0;
        stageState.spriteAngle -= turn;
        logs.push(`Sprite belok kiri ${turn} derajat.`);
        renderStage();
        break;
      }

      case "turn_right": {
        const turn = Number(command.params.angle) || 0;
        stageState.spriteAngle += turn;
        logs.push(`Sprite belok kanan ${turn} derajat.`);
        renderStage();
        break;
      }

      case "go_to": {
        stageState.spriteX = Number(command.params.x) || stageState.spriteX;
        stageState.spriteY = Number(command.params.y) || stageState.spriteY;
        logs.push(
          `Sprite pindah ke (${stageState.spriteX}, ${stageState.spriteY}).`,
        );
        renderStage();
        break;
      }

      case "triangle_area": {
        const base = Number(command.params.base);
        const height = Number(command.params.height);
        if (base > 0 && height > 0) {
          const area = 0.5 * base * height;
          logs.push(`Luas segitiga = 1/2 x ${base} x ${height} = ${area}`);
        } else {
          logs.push(
            "Operasi luas segitiga butuh alas dan tinggi lebih dari 0.",
          );
        }
        break;
      }

      case "add":
      case "subtract":
      case "multiply":
      case "divide":
      case "modulo": {
        const a = Number(command.params.a);
        const b = Number(command.params.b);
        let result;

        if (command.type === "add") result = a + b;
        if (command.type === "subtract") result = a - b;
        if (command.type === "multiply") result = a * b;
        if (command.type === "divide") result = b === 0 ? null : a / b;
        if (command.type === "modulo") result = b === 0 ? null : a % b;

        logs.push(
          result === null
            ? `${command.label} tidak bisa memakai pembagi 0.`
            : `${command.label}: hasilnya ${result}`,
        );
        break;
      }

      case "show_text":
        stageState.text = command.params.text || stageState.text;
        logs.push(`Stage menampilkan kata: ${stageState.text}`);
        renderStage();
        break;

      case "set_stage_color":
        stageState.color = command.params.color || stageState.color;
        logs.push(`Warna stage diubah ke ${stageState.color}.`);
        renderStage();
        break;

      case "say_message":
      case "sprite_say":
        stageState.spriteMessage =
          command.params.message || command.params.text || "Halo";
        logs.push(`Sprite berkata: ${stageState.spriteMessage}`);
        renderStage();
        break;

      case "wait_seconds": {
        const seconds = Number(command.params.seconds) || 0;
        logs.push(`Menunggu ${seconds} detik.`);
        await wait(seconds * 1000);
        break;
      }

      case "repeat_note":
        logs.push(
          `Kontrol ulangi disiapkan ${command.params.times} kali. Untuk saat ini, ulangi block secara manual di workspace.`,
        );
        break;

      case "detect_distance":
        logs.push(`Sensor jarak membaca ${command.params.distance} cm.`);
        break;

      case "detect_touch":
        logs.push(
          `Sensor sentuh: ${command.params.pressed === "ya" ? "aktif" : "tidak aktif"}.`,
        );
        break;

      case "detect_color":
        logs.push(`Sensor warna membaca ${command.params.color}.`);
        break;

      case "set_variable":
        variables[command.params.name] = command.params.value;
        logs.push(
          `Variabel ${command.params.name} diset ke ${command.params.value}.`,
        );
        break;

      case "change_variable": {
        const currentValue = Number(variables[command.params.name] || 0);
        const delta = Number(command.params.delta || 0);
        variables[command.params.name] = currentValue + delta;
        logs.push(
          `Variabel ${command.params.name} berubah menjadi ${variables[command.params.name]}.`,
        );
        break;
      }

      case "custom_block":
        logs.push(
          `Balok saya "${command.params.name}" dijalankan: ${command.params.action}.`,
        );
        break;

      default:
        logs.push(`${command.label} belum punya aksi otomatis.`);
        break;
    }
  }

  setRobotLog(logs);
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadRobotMath();
  initWorkspace();
  initStageDrag();
  updateStageSettings();
  resetRobotOutput();
});
