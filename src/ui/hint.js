// The opening hint retires itself after a while. The CSS dismiss animation only
// runs for visitors who allow motion, so the frame loop drives this as well to
// make sure reduced-motion visitors are not left with a permanent overlay.

const DISMISSED = "scene-hint--dismissed";

export function bindHint({ element, now, durationMs = 8_000 }) {
  const dismissAt = now + durationMs;
  let dismissed = false;
  return {
    update(time) {
      if (dismissed || time < dismissAt) return;
      dismissed = true;
      element.classList.add(DISMISSED);
    },
  };
}
