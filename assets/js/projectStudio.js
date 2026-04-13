// ===============================
// LOAD DATA PROJECT STUDIO
// ===============================
async function loadProjectStudio() {
  try {
    const res = await fetch("data/projectStudio.json");
    const data = await res.json();

    console.log("Project Studio Loaded:", data);

    initCanvasProjects();
    initCodeRunner();
  } catch (err) {
    console.error("Gagal load Project Studio:", err);
  }
}

// ===============================
// INIT CANVAS (DESIGN, SCIENCE, ECONOMY)
// ===============================
function initCanvasProjects() {
  const canvasIds = ["design-canvas", "canvas-science", "canvas-economy"];

  canvasIds.forEach((id) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let drawing = false;

    canvas.addEventListener("mousedown", () => {
      drawing = true;
    });

    canvas.addEventListener("mouseup", () => {
      drawing = false;
      ctx.beginPath();
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!drawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
  });
}

// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadProjectStudio();
});
