let activeProjectId = "design";

const projectBoardConfigs = [
  { id: "design", title: "Design" },
  { id: "science", title: "Sains & Lingkungan" },
  { id: "economy", title: "Ekonomi" },
];

const pendingBoardImages = {};

function initProjectSubmenu() {
  document.querySelectorAll(".project-submenu-btn").forEach((button) => {
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

  if (typeof refreshCanvasBoard === "function") {
    refreshCanvasBoard(`project-${projectId}`);
  }
}

function initProjectWhiteboards() {
  projectBoardConfigs.forEach((config) => {
    const toolbar = document.getElementById(`${config.id}-whiteboard-toolbar`);
    const canvas = document.getElementById(`${config.id}-whiteboard`);
    const wrapper = canvas?.closest(".whiteboard-wrapper");

    if (!toolbar || !canvas || !wrapper) return;

    createCanvasBoard({
      id: `project-${config.id}`,
      canvas,
      wrapper,
      toolbar,
      defaultColor: "#0d6efd",
      defaultBrushSize: 3,
    });
  });
}

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
        pendingBoardImages[boardId] = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });

    addImageButton?.addEventListener("click", () => {
      if (!pendingBoardImages[boardId]) return;
      addImageToCanvasBoard(`project-${boardId}`, pendingBoardImages[boardId]);
    });

    addChartButton?.addEventListener("click", () => {
      const titleInput = document.getElementById(`${boardId}-chart-title`);
      const valuesInput = document.getElementById(`${boardId}-chart-values`);
      if (!valuesInput) return;

      const values = valuesInput.value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item >= 0);

      if (!values.length) return;
      const board = getCanvasBoard(`project-${boardId}`);
      addChartToCanvasBoard(
        `project-${boardId}`,
        titleInput?.value || "Grafik",
        values,
        board?.defaults?.chartKind || "bar",
      );
    });

    addTableButton?.addEventListener("click", () => {
      const titleInput = document.getElementById(`${boardId}-table-title`);
      const dataInput = document.getElementById(`${boardId}-table-data`);
      if (!dataInput) return;

      const rows = dataInput.value
        .split(";")
        .map((row) => row.split("|").map((cell) => cell.trim()))
        .filter((row) => row.length && row.some(Boolean));

      if (!rows.length) return;
      addTableToCanvasBoard(
        `project-${boardId}`,
        titleInput?.value || "Table",
        rows,
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initProjectSubmenu();
  initProjectWhiteboards();
  initConnectedBoardTools();
  showProjectPanel(activeProjectId);

  window.addEventListener("resize", () => {
    if (typeof refreshCanvasBoard !== "function") return;
    projectBoardConfigs.forEach((config) => {
      refreshCanvasBoard(`project-${config.id}`);
    });
  });
});
