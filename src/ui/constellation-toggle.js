// The constellation button and its "C" shortcut. By day the button is dimmed
// with a hint, but stays usable: pressing it lets night fall first, then
// reveals the constellations. Spotted constellations are announced in a
// polite live region and, for sighted visitors, captioned briefly by the clock.
// The caption has no timer of its own; the animation loop calls update().

import { createShortcutGate } from "./shortcuts.js";

const TITLES = {
  day: "See the stars tonight (C)",
  night: "Spot the constellations (C)",
};

const CAPTION_MS = 3_000;
const CAPTION_VISIBLE = "constellation-caption--visible";
const NO_ARTICLE = new Set(["Orion", "Cassiopeia", "Cygnus"]);

export function spottedMessage(name) {
  return NO_ARTICLE.has(name) ? `You spotted ${name}` : `You spotted the ${name}`;
}

export function captionText(name) {
  return NO_ARTICLE.has(name) ? name : `The ${name}`;
}

export function bindConstellationToggle({
  button,
  announcer,
  caption,
  model,
  keyTarget,
  now,
  bringNight,
  shortcuts = createShortcutGate(),
}) {
  // Runs every frame from the loop, so it only touches the DOM on change.
  let lastState = null;
  function sync() {
    const night = model.isNight;
    const visible = model.constellationsVisible;
    const state = `${night}|${visible}`;
    if (state === lastState) return;
    lastState = state;
    button.classList.toggle("constellation-toggle--waiting", !night && !visible);
    button.setAttribute("title", night ? TITLES.night : TITLES.day);
    button.setAttribute("aria-pressed", String(visible));
  }

  function toggle() {
    if (!model.isNight) {
      bringNight?.();
      model.setConstellationsVisible(true, now());
    } else {
      model.toggleConstellations(now());
    }
    sync();
  }

  let captionUntil = null;
  function announce(name) {
    if (announcer) announcer.textContent = spottedMessage(name);
    if (!caption) return;
    caption.textContent = captionText(name);
    caption.hidden = false;
    caption.classList.add(CAPTION_VISIBLE);
    captionUntil = now() + CAPTION_MS;
  }

  function update() {
    if (captionUntil === null || now() < captionUntil) return;
    captionUntil = null;
    caption.classList.remove(CAPTION_VISIBLE);
  }

  function onKeydown(event) {
    if (shortcuts.matches(event, "c")) toggle();
  }

  button.addEventListener("click", toggle);
  keyTarget.addEventListener("keydown", onKeydown);

  return {
    toggle,
    sync,
    announce,
    update,
    dispose() {
      button.removeEventListener("click", toggle);
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
