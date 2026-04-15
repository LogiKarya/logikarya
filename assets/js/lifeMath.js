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

function renderTeori(teori) {
  const teoriCard = document.getElementById("teori-card");
  if (!teoriCard) return;

  teoriCard.innerHTML = `
    <h2>${teori.judul}</h2>
    <p class="formula">${teori.formula}</p>
    <p>${teori.deskripsi}</p>
  `;
}

function renderProblem(problem) {
  const contohCard = document.getElementById("contoh-card");
  if (!contohCard) return;

  const list = problem.pertanyaan
    .map((item) => `<li>${item.teks}</li>`)
    .join("");
  contohCard.innerHTML = `
    <h2>${problem.judul}</h2>
    <ul>${list}</ul>
  `;
}

function initSolving(solving) {
  const solvingCard = document.getElementById("solving-card");
  if (!solvingCard) return;

  const intro = solvingCard.querySelector(".life-math-intro");
  if (!intro) {
    solvingCard.insertAdjacentHTML(
      "afterbegin",
      `<p class="mb-2 life-math-intro">${solving.instruksi}</p>`,
    );
  }

  loadToolbar();
}

function loadToolbar() {
  const toolbar = document.getElementById("whiteboard-toolbar");
  if (!toolbar) return;

  if (typeof initLifeMathWhiteboard === "function") {
    initLifeMathWhiteboard();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadToolbar();
  loadLifeMath();

  window.addEventListener("resize", () => {
    if (typeof refreshCanvasBoard === "function") {
      refreshCanvasBoard("life-math-board");
    }
  });
});
