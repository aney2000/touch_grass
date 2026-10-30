// The constellation button and its "C" shortcut. By day the button is dimmed
// with a hint, but stays usable: pressing it lets night fall first, then
// reveals the constellations. Spotted constellations are announced in a
// polite live region.

import { matchesShortcut } from "./shortcuts.js";

const TITLES = {
  day: "Wait for night to spot constellations",
  night: "Spot the constellations (C)",
};

const NO_ARTICLE = new Set(["Orion", "Cassiopeia", "Cygnus"]);

export function spottedMessage(name) {
  return NO_ARTICLE.has(name) ? `You spotted ${name}` : `You spotted the ${name}`;
}

export function bindConstellationToggle({ button, announcer, model, keyTarget, now, bringNight }) {
  // Runs every frame from the loop, so it only touches the DOM on change.
  let lastState = null;
  function sync() {
    const night = model.isNight;
    const state = `${night}|${model.constellationsVisible}`;
    if (state === lastState) return;
    lastState = state;
    button.classList.toggle("constellation-toggle--waiting", !night);
    button.setAttribute("title", night ? TITLES.night : TITLES.day);
    button.setAttribute("aria-pressed", String(model.constellationsVisible));
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

  function announce(name) {
    if (announcer) announcer.textContent = spottedMessage(name);
  }

  function onKeydown(event) {
    if (matchesShortcut(event, "c")) toggle();
  }

  button.addEventListener("click", toggle);
  keyTarget.addEventListener("keydown", onKeydown);

  return {
    toggle,
    sync,
    announce,
    dispose() {
      button.removeEventListener("click", toggle);
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
