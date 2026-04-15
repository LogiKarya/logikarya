function initHome() {
  const buttons = document.querySelectorAll("#home [data-section]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;
      if (!section || typeof showSection !== "function") return;

      showSection(section);
    });
  });
}
