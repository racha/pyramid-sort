document.querySelectorAll("[data-stage]").forEach((stage) => {
  const buttons = stage.querySelectorAll("[data-view]");
  const panes = stage.querySelectorAll("[data-pane]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.getAttribute("data-view");
      buttons.forEach((item) => item.classList.toggle("is-on", item === button));
      panes.forEach((pane) => {
        pane.hidden = pane.getAttribute("data-pane") !== view;
      });
    });
  });
});
