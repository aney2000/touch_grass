// Single-key shortcuts that stay out of the way: they never fire while a
// modifier is held (so browser and OS shortcuts keep working) or while the
// visitor is typing into a field.

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isTypingTarget(target) {
  if (!target) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable === true;
}

// Auto-repeat is ignored so holding N cannot strobe the sky between day and night.
export function matchesShortcut(event, key) {
  if (typeof event.key !== "string") return false;
  if (event.repeat) return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  if (isTypingTarget(event.target)) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

// WCAG 2.1.4: single-character shortcuts must be switchable off. One gate is
// shared by every binding, so a single toggle silences them all.
export function createShortcutGate({ enabled = true } = {}) {
  const gate = {
    enabled,
    setEnabled(on) {
      gate.enabled = Boolean(on);
    },
    matches(event, key) {
      return gate.enabled && matchesShortcut(event, key);
    },
  };
  return gate;
}

const TOGGLE_LABELS = { on: "Shortcuts on", off: "Shortcuts off" };

export function bindShortcutToggle({ button, label, gate }) {
  function reflect() {
    button.setAttribute("aria-pressed", String(gate.enabled));
    label.textContent = gate.enabled ? TOGGLE_LABELS.on : TOGGLE_LABELS.off;
  }
  function toggle() {
    gate.setEnabled(!gate.enabled);
    reflect();
  }
  button.addEventListener("click", toggle);
  reflect();
  return {
    dispose: () => button.removeEventListener("click", toggle),
  };
}
