// The season buttons and their 1-4 shortcuts. A radio-like group: picking a
// season morphs the model, presses exactly one button and tags the scene
// element with data-season for season-aware styling.

import { matchesShortcut } from "./shortcuts.js";

const SHORTCUTS = { 1: "spring", 2: "summer", 3: "autumn", 4: "winter" };

const titleCase = (name) => name.charAt(0).toUpperCase() + name.slice(1);

export function bindSeasonPicker({ buttons, sceneElement, model, keyTarget, now, announcer }) {
  function reflect(season) {
    for (const entry of buttons) {
      entry.element.setAttribute("aria-pressed", String(entry.season === season));
    }
    sceneElement.setAttribute("data-season", season);
  }

  function select(season) {
    model.setSeason(season, now());
    reflect(season);
    if (announcer) announcer.textContent = titleCase(season);
  }

  const clickHandlers = buttons.map(({ season, element }) => {
    const handler = () => select(season);
    element.addEventListener("click", handler);
    return { element, handler };
  });

  function onKeydown(event) {
    const match = Object.keys(SHORTCUTS).find((key) => matchesShortcut(event, key));
    if (match) select(SHORTCUTS[match]);
  }
  keyTarget.addEventListener("keydown", onKeydown);

  reflect(model.season);

  return {
    select,
    dispose() {
      clickHandlers.forEach(({ element, handler }) =>
        element.removeEventListener("click", handler),
      );
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
