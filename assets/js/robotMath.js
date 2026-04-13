// ===============================
// STATE
// ===============================
let robotData = null;
let currentCategory = "motion";

// ===============================
// LOAD DATA
// ===============================
async function loadRobotMath() {
  try {
    const res = await fetch("data/robotMath.json");
    robotData = await res.json();

    showCategory(currentCategory);
  } catch (err) {
    console.error("Gagal load RobotMath:", err);
  }
}

// ===============================
// SHOW CATEGORY (PALETTE)
// ===============================
function showCategory(categoryId) {
  if (!robotData) return;

  currentCategory = categoryId;

  const palette = document.getElementById("palette");
  palette.innerHTML = "";

  const category = robotData.categories.find((c) => c.id === categoryId);
  if (!category) return;

  category.blocks.forEach((block) => {
    const el = document.createElement("div");
    el.className = `block ${categoryId}`;
    el.draggable = true;
    el.textContent = block.label;
    el.dataset.type = block.type;

    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("type", block.type);
    });

    palette.appendChild(el);
  });
}

// ===============================
// DRAG & DROP WORKSPACE
// ===============================
function initWorkspace() {
  const workspace = document.getElementById("workspace");

  workspace.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  workspace.addEventListener("drop", (e) => {
    e.preventDefault();

    const type = e.dataTransfer.getData("type");
    if (!type) return;

    const blockEl = document.createElement("div");
    blockEl.className = "block";
    blockEl.textContent = type;

    workspace.appendChild(blockEl);
  });
}

// ===============================
// RUN PROGRAM (ROBOT SIMULATION)
// ===============================
function runProgram() {
  const canvas = document.getElementById("robot-canvas");
  const ctx = canvas.getContext("2d");

  const blocks = document.querySelectorAll("#workspace .block");

  let x = 50;
  let y = 150;
  let angle = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function drawRobot() {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "blue";
    ctx.fill();
  }

  let i = 0;

  function executeNext() {
    if (i >= blocks.length) return;

    const cmd = blocks[i].textContent;

    switch (cmd) {
      case "move_forward":
      case "Move Forward":
        x += 20 * Math.cos((angle * Math.PI) / 180);
        y += 20 * Math.sin((angle * Math.PI) / 180);
        break;

      case "move_backward":
      case "Move Backward":
        x -= 20 * Math.cos((angle * Math.PI) / 180);
        y -= 20 * Math.sin((angle * Math.PI) / 180);
        break;

      case "turn_left":
      case "Turn Left":
        angle -= 90;
        break;

      case "turn_right":
      case "Turn Right":
        angle += 90;
        break;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRobot();

    i++;
    setTimeout(executeNext, 500);
  }

  drawRobot();
  executeNext();
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadRobotMath();
  initWorkspace();
});
