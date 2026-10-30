// Zen mode: the Zen button (or "Z") clears the screen for a minute so only the
// field remains, with a small countdown pill as the one way back. It has no
// timers of its own; the animation loop calls update(now) every frame.

import { createZenTimer, formatCountdown } from "../zen.js";
import { createShortcutGate, matchesShortcut } from "./shortcuts.js";

const ZEN_CLASS = "scene--zen";
const MESSAGES = { start: "Zen mode for 1 minute", end: "Zen mode ended" };

export function bindZenMode({
  button,
  countdown,
  countdownText,
  announcer,
  sceneElement,
  keyTarget,
  now,
  timer = createZenTimer(),
  shortcuts = createShortcutGate(),
}) {
  let active = false;
  let lastText = "";
  let lastProgress = "";

  function render(time) {
    const text = formatCountdown(timer.remainingMs(time));
    if (text !== lastText) {
      lastText = text;
      countdownText.textContent = text;
    }
    const progress = String(Math.round(timer.progress(time) * 1000) / 1000);
    if (progress !== lastProgress) {
      lastProgress = progress;
      countdown.style.setProperty("--zen-progress", progress);
    }
  }

  function setActive(on) {
    active = on;
    sceneElement.classList.toggle(ZEN_CLASS, on);
    button.setAttribute("aria-pressed", String(on));
    countdown.hidden = !on;
    announcer.textContent = on ? MESSAGES.start : MESSAGES.end;
  }

  function enter() {
    const time = now();
    timer.start(time);
    setActive(true);
    render(time);
    countdown.focus();
  }

  function exit() {
    if (!active) return;
    timer.stop();
    setActive(false);
    button.focus();
  }

  function toggle() {
    if (active) exit();
    else enter();
  }

  function onKeydown(event) {
    if (shortcuts.matches(event, "z")) toggle();
    else if (active && matchesShortcut(event, "Escape")) exit();
  }

  button.addEventListener("click", toggle);
  countdown.addEventListener("click", exit);
  keyTarget.addEventListener("keydown", onKeydown);

  return {
    isActive: () => active,
    enter,
    exit,
    update(time) {
      if (!active) return;
      if (timer.isActive(time)) render(time);
      else exit();
    },
    dispose() {
      button.removeEventListener("click", toggle);
      countdown.removeEventListener("click", exit);
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
