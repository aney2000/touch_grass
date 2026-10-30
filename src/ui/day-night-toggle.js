// The day/night button and its "N" shortcut. Flips the model, then reflects
// the new target in the button's label and the scene class. The label names
// the next action, so the button has no pressed state; the change itself is
// spoken through a separate live region.

import { createShortcutGate } from "./shortcuts.js";

const LABELS = { day: "Let night fall", night: "Let morning in" };
const STATUS = { day: "Morning comes", night: "Night falls" };

export function bindDayNightToggle({
  button,
  label,
  announcer,
  sceneElement,
  model,
  keyTarget,
  now,
  shortcuts = createShortcutGate(),
}) {
  function toggle() {
    const night = model.toggleNight(now()) === 1;
    label.textContent = night ? LABELS.night : LABELS.day;
    sceneElement.classList.toggle("scene--night", night);
    if (announcer) announcer.textContent = night ? STATUS.night : STATUS.day;
  }

  function onKeydown(event) {
    if (shortcuts.matches(event, "n")) toggle();
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
