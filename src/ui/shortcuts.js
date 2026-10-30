// Single-key shortcuts that stay out of the way: they never fire while a
// modifier is held (so browser and OS shortcuts keep working) or while the
// visitor is typing into a field.

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isTypingTarget(target) {
  if (!target) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable === true;
}

export function matchesShortcut(event, key) {
  if (typeof event.key !== "string") return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  if (isTypingTarget(event.target)) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}
