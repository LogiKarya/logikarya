// =========================
// CANVAS UI ADVANCED CONTROL
// =========================

// =========================
// ENABLE DRAG WITH BOUNDARY
// =========================
function makeDraggableAdvanced(element, container) {
  let offsetX = 0,
    offsetY = 0,
    isDragging = false;

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    element.classList.add("canvas-dragging");
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Boundary check
    if (container) {
      const rect = container.getBoundingClientRect();

      x = Math.max(0, Math.min(x, rect.width - element.offsetWidth));
      y = Math.max(0, Math.min(y, rect.height - element.offsetHeight));
    }

    element.style.left = x + "px";
    element.style.top = y + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.classList.remove("canvas-dragging");
  });
}

// =========================
// ENABLE RESIZE
// =========================
function enableResize(element) {
  const handle = document.createElement("div");
  handle.className = "canvas-resize";

  element.appendChild(handle);

  let resizing = false;

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    resizing = true;
  });

  document.addEventListener("mousemove", (e) => {
    if (!resizing) return;

    element.style.width = e.movementX + element.offsetWidth + "px";
    element.style.height = e.movementY + element.offsetHeight + "px";
  });

  document.addEventListener("mouseup", () => {
    resizing = false;
  });
}

// =========================
// SELECTION BOX
// =========================
function createSelectionBox(container) {
  let selection = null;
  let startX = 0,
    startY = 0;

  container.addEventListener("mousedown", (e) => {
    if (e.target !== container) return;

    startX = e.offsetX;
    startY = e.offsetY;

    selection = document.createElement("div");
    selection.className = "selection-box";
    selection.style.left = startX + "px";
    selection.style.top = startY + "px";

    container.appendChild(selection);
  });

  container.addEventListener("mousemove", (e) => {
    if (!selection) return;

    const width = e.offsetX - startX;
    const height = e.offsetY - startY;

    selection.style.width = Math.abs(width) + "px";
    selection.style.height = Math.abs(height) + "px";
    selection.style.left = (width < 0 ? e.offsetX : startX) + "px";
    selection.style.top = (height < 0 ? e.offsetY : startY) + "px";
  });

  container.addEventListener("mouseup", () => {
    if (selection) {
      selection.remove();
      selection = null;
    }
  });
}

// =========================
// LAYER CONTROL
// =========================
function bringToFront(element) {
  element.style.zIndex = Date.now();
}

// =========================
// GRID TOGGLE
// =========================
function toggleGrid(container) {
  container.classList.toggle("canvas-grid");
}

// =========================
// ZOOM (SIMPLE)
// =========================
function enableZoom(container) {
  let scale = 1;

  container.addEventListener("wheel", (e) => {
    e.preventDefault();

    if (e.deltaY < 0) {
      scale += 0.1;
    } else {
      scale -= 0.1;
    }

    scale = Math.max(0.5, Math.min(scale, 2));

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = "0 0";
  });
}

// =========================
// INIT UI ENHANCEMENTS
// =========================
function initCanvasUI(container) {
  if (!container) return;

  createSelectionBox(container);
  enableZoom(container);
}
