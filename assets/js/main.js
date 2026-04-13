// ===============================
// LOAD HTML COMPONENTS
// ===============================
async function loadComponent(id, path) {
  try {
    const el = document.getElementById(id);

    if (!el) {
      console.error("❌ Element tidak ditemukan:", id);
      return;
    }

    const res = await fetch(path);
    const html = await res.text();
    el.innerHTML = html;

    // init tools canvas
    if (id === "whiteboard-toolbar" && typeof initTools === "function") {
      initTools();
    }
  } catch (err) {
    console.error("Gagal load component:", path, err);
  }
}

// ===============================
// INIT APP
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("navbar", "components/navbar.html");
  await loadComponent("sidebar", "components/sidebar.html");
  await loadComponent(
    "whiteboard-toolbar",
    "assets/canvas/components/tools.html",
  );
  await loadComponent("footer", "components/footer.html");

  // FIX: langsung init setelah DOM siap
  initNavbarEvents();
  initSidebarEvents();

  showSection("life-math");
});

// ===============================
// ROUTING SECTION
// ===============================
function showSection(id) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.remove("active");
    sec.style.display = "none";
  });

  const active = document.getElementById(id);
  if (active) {
    active.classList.add("active");
    active.style.display = "block";
  }

  updateToolbarTitle(id);
}

// ===============================
// UPDATE TOOLBAR CONTEXT
// ===============================
function updateToolbarTitle(id) {
  const labelMap = {
    "life-math": "Life Math",
    "project-studio": "Project Studio",
    "robot-math": "Robot Math",
  };

  const el = document.getElementById("current-section");
  if (el) {
    el.textContent = labelMap[id] || "Workspace";
  }
}

// ===============================
// SIDEBAR EVENTS (NEW CLEAN SYSTEM)
// ===============================
function initSidebarEvents() {
  const buttons = document.querySelectorAll(
    "#app-sidebar button[data-section]",
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;

      showSection(section);
      setActiveSidebar(btn);
      closeSidebar();
    });
  });
}

// ===============================
// ACTIVE SIDEBAR
// ===============================
function setActiveSidebar(el) {
  document.querySelectorAll("#app-sidebar button").forEach((btn) => {
    btn.classList.remove("active");
  });

  el.classList.add("active");
}

// ===============================
// SIDEBAR CONTROL
// ===============================
function toggleSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (!sidebar || !overlay) return;

  sidebar.classList.toggle("show");
  overlay.classList.toggle("show");
}

function closeSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (!sidebar || !overlay) return;

  sidebar.classList.remove("show");
  overlay.classList.remove("show");
}

// ===============================
// NAVBAR EVENTS (FIXED SAFE INIT)
// ===============================
function initNavbarEvents() {
  const btn = document.getElementById("floating-sidebar-btn");

  if (!btn) {
    // retry kecil kalau navbar belum render
    setTimeout(initNavbarEvents, 100);
    return;
  }

  btn.removeEventListener("click", toggleSidebar);
  btn.addEventListener("click", toggleSidebar);
}

// ===============================
// GLOBAL ACTIONS (UNCHANGED)
// ===============================
function saveProgress() {
  alert("Progress disimpan (dummy)");
}

function exportData() {
  alert("Export data (dummy)");
}

function resetWorkspace() {
  if (confirm("Yakin reset workspace?")) {
    location.reload();
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
}

// ===============================
// DARK MODE STYLE
// ===============================
const style = document.createElement("style");
style.innerHTML = `
.dark-mode {
  background-color: #121212;
  color: #ffffff;
}
.dark-mode .card {
  background-color: #1e1e1e;
  color: #ffffff;
}
`;
document.head.appendChild(style);
