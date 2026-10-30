// The season buttons and their 1-4 shortcuts, exposed as an ARIA radio group:
// picking a season morphs the model, checks exactly one radio and tags the
// scene element with data-season for season-aware styling. The group keeps a
// single tab stop (roving tabindex) and Left/Right move the selection, as the
// radio pattern expects; arrows are not character keys, so the shortcut gate
// does not apply to them.

import { createShortcutGate } from "./shortcuts.js";

const SHORTCUTS = { 1: "spring", 2: "summer", 3: "autumn", 4: "winter" };
const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const titleCase = (name) => name.charAt(0).toUpperCase() + name.slice(1);

export function bindSeasonPicker({
  buttons,
  sceneElement,
  model,
  keyTarget,
  now,
  announcer,
  shortcuts = createShortcutGate(),
}) {
  function reflect(season) {
    for (const entry of buttons) {
      const checked = entry.season === season;
      entry.element.setAttribute("aria-checked", String(checked));
      entry.element.setAttribute("tabindex", checked ? "0" : "-1");
    }
    sceneElement.setAttribute("data-season", season);
  }

  function select(season) {
    model.setSeason(season, now());
    reflect(season);
    if (announcer) announcer.textContent = titleCase(season);
  }

  const handlers = buttons.map(({ season, element }, index) => {
    const click = () => select(season);
    const arrow = (event) => {
      const step = STEPS[event.key];
      if (!step) return;
      event.preventDefault();
      const next = buttons[(index + step + buttons.length) % buttons.length];
      select(next.season);
      next.element.focus();
    };
    element.addEventListener("click", click);
    element.addEventListener("keydown", arrow);
    return { element, click, arrow };
  });

  function onKeydown(event) {
    const match = Object.keys(SHORTCUTS).find((key) => shortcuts.matches(event, key));
    if (match) select(SHORTCUTS[match]);
  }
  keyTarget.addEventListener("keydown", onKeydown);

  reflect(model.season);

  return {
    select,
    dispose() {
      handlers.forEach(({ element, click, arrow }) => {
        element.removeEventListener("click", click);
        element.removeEventListener("keydown", arrow);
      });
      keyTarget.removeEventListener("keydown", onKeydown);
    },
  };
}
