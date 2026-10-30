// The day/night button and its "N" shortcut. Flips the model, then reflects
// the new target in the button's pressed state, its label and the scene class.

import { matchesShortcut } from "./shortcuts.js";

const LABELS = { day: "Let night fall", night: "Let morning in" };

export function bindDayNightToggle({ button, label, sceneElement, model, keyTarget, now }) {
  function toggle() {
    const night = model.toggleNight(now()) === 1;
    button.setAttribute("aria-pressed", String(night));
    label.textContent = night ? LABELS.night : LABELS.day;
    sceneElement.classList.toggle("scene--night", night);
  }

  function onKeydown(event) {
    if (matchesShortcut(event, "n")) toggle();
  }

  button.addEventListener("click", toggle);
  keyTarget.addEventListener("keydown", onKeydown);

  return {
    toggle,
    dispose() {
      button.removeEventListener("click", toggle);
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
