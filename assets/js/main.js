// ===============================
// LOAD HTML COMPONENTS
// ===============================
async function loadComponent(id, path) {
  try {
    const el = document.getElementById(id);

    if (!el) {
      console.error("Element tidak ditemukan:", id);
      return null;
    }

    const res = await fetch(path);
    const html = await res.text();
    el.innerHTML = html;

    return el;
  } catch (err) {
    console.error("Gagal load component:", path, err);
    return null;
  }
}

// ===============================
// INIT APP
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  const navbarEl = await loadComponent("navbar", "components/navbar.html");
  await loadComponent("home-container", "components/home.html");
  const sidebarEl = await loadComponent("sidebar", "components/sidebar.html");

  await loadComponent(
    "whiteboard-toolbar",
    "assets/canvas/components/tools.html",
  );
  await loadComponent("footer", "components/footer.html");

  if (navbarEl) initNavbarEvents();
  if (sidebarEl) initSidebarEvents();

  if (typeof initTools === "function") {
    initTools();
  }

  initResponsiveSidebar();
  showSection("home");
});

// ===============================
// ROUTING SECTION
// ===============================
function showSection(id) {
  const sections = document.querySelectorAll(".section");

  if (!sections.length) {
    console.warn("Tidak ada section ditemukan");
    return;
  }

  sections.forEach((sec) => {
    sec.classList.remove("active");
    sec.style.display = "none";
  });

  const active = document.getElementById(id);

  if (!active) {
    console.warn("Section tidak ditemukan:", id);
    return;
  }

  active.classList.add("active");
  active.style.display = "block";

  syncSidebarActive(id);
  updateToolbarTitle(id);

  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

// ===============================
// SYNC SIDEBAR ACTIVE
// ===============================
function syncSidebarActive(sectionId) {
  const buttons = document.querySelectorAll(
    "#app-sidebar button[data-section]",
  );

  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === sectionId);
  });
}

// ===============================
// UPDATE TOOLBAR CONTEXT
// ===============================
function updateToolbarTitle(id) {
  const labelMap = {
    home: "Home",
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
// SIDEBAR EVENTS
// ===============================
function initSidebarEvents() {
  const buttons = document.querySelectorAll(
    "#app-sidebar button[data-section]",
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      showSection(btn.dataset.section);
    });
  });
}

// ===============================
// SIDEBAR CONTROL
// ===============================
function toggleSidebar() {
  const appLayout = document.querySelector(".app-layout");
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleButton = document.getElementById("btn-toggle-sidebar");

  if (!sidebar || !overlay || !appLayout) return;

  if (window.innerWidth <= 768) {
    const willShow = !sidebar.classList.contains("show");
    sidebar.classList.toggle("show", willShow);
    overlay.classList.toggle("show", willShow);

    if (toggleButton) {
      toggleButton.setAttribute("aria-expanded", String(willShow));
    }

    return;
  }

  const willHide = !appLayout.classList.contains("sidebar-hidden");
  appLayout.classList.toggle("sidebar-hidden", willHide);

  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", String(!willHide));
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleButton = document.getElementById("btn-toggle-sidebar");

  if (!sidebar || !overlay) return;

  sidebar.classList.remove("show");
  overlay.classList.remove("show");

  if (toggleButton && window.innerWidth <= 768) {
    toggleButton.setAttribute("aria-expanded", "false");
  }
}

// ===============================
// NAVBAR EVENTS
// ===============================
function initNavbarEvents() {
  const btn = document.getElementById("btn-toggle-sidebar");

  if (!btn) {
    console.warn("Navbar button tidak ditemukan");
    return;
  }

  btn.addEventListener("click", toggleSidebar);
}

function initResponsiveSidebar() {
  const handleResize = () => {
    const appLayout = document.querySelector(".app-layout");
    const sidebar = document.getElementById("app-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const toggleButton = document.getElementById("btn-toggle-sidebar");

    if (!appLayout || !sidebar || !overlay) return;

    if (window.innerWidth > 768) {
      sidebar.classList.remove("show");
      overlay.classList.remove("show");

      if (toggleButton) {
        const expanded = !appLayout.classList.contains("sidebar-hidden");
        toggleButton.setAttribute("aria-expanded", String(expanded));
      }

      return;
    }

    if (toggleButton) {
      toggleButton.setAttribute(
        "aria-expanded",
        String(sidebar.classList.contains("show")),
      );
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize();
}

// ===============================
// GLOBAL ACTIONS
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
