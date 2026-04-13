// ===============================
// LOAD DATA LIFE MATH
// ===============================
async function loadLifeMath() {
  try {
    const res = await fetch("data/lifeMath.json");
    const data = await res.json();

    renderTeori(data.teori);
    renderProblem(data.problem);
    initSolving(data.solving);
  } catch (err) {
    console.error("Gagal load LifeMath:", err);
  }
}

// ===============================
// RENDER TEORI
// ===============================
function renderTeori(teori) {
  const teoriCard = document.getElementById("teori-card");

  teoriCard.innerHTML = `
    <h2>${teori.judul}</h2>
    <p class="formula">${teori.formula}</p>
    <p>${teori.deskripsi}</p>
  `;
}

// ===============================
// RENDER PROBLEM
// ===============================
function renderProblem(problem) {
  const contohCard = document.getElementById("contoh-card");

  let list = problem.pertanyaan.map((p) => `<li>${p.teks}</li>`).join("");

  contohCard.innerHTML = `
    <h2>${problem.judul}</h2>
    <ul>${list}</ul>
  `;
}

// ===============================
// INIT SOLVING (WHITEBOARD)
// ===============================
function initSolving(solving) {
  const solvingCard = document.getElementById("solving-card");

  solvingCard.insertAdjacentHTML(
    "afterbegin",
    `<p class="mb-2">${solving.instruksi}</p>`,
  );

  loadToolbar();
}

// ===============================
// LOAD TOOLBAR (CANVAS TOOLS)
// ===============================
async function loadToolbar() {
  try {
    const res = await fetch("assets/canvas/components/tools.html");
    const html = await res.text();

    document.getElementById("whiteboard-toolbar").innerHTML = html;

    // setelah toolbar muncul, aktifkan tools
    if (typeof initTools === "function") {
      initTools();
    }
  } catch (err) {
    console.error("Gagal load toolbar:", err);
  }
}

// ===============================
// AUTO INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadLifeMath();
});
