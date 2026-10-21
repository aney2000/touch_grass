// Time helpers: turning the day/night amount into a readable clock, and the
// eased tween that drives the transition. Both are pure and unit tested.

import { clamp, smoothstep } from "./scene-math.js";

// Map the day/night amount (0 = midday, 1 = deep night) onto a clock face.
// Returns the pieces so the view layer decides how to render them.
export function clockFromDayAmount(dayAmount) {
  const totalMinutes = Math.round(18 * 60 + clamp(dayAmount, 0, 1) * 12 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  return {
    hours12: hours % 12 || 12,
    minutes: String(totalMinutes % 60).padStart(2, "0"),
    meridiem: hours < 12 ? "AM" : "PM",
  };
}

// A one-dimensional eased tween. The duration is supplied per sample so callers
// can slow or speed the transition (for example when reduced motion is on).
export function createTween(initial = 0) {
  let from = initial;
  let target = initial;
  let startedAt = -Infinity;

  return {
    get target() {
      return target;
    },
    retarget(nextTarget, currentValue, now) {
      target = nextTarget;
      from = currentValue;
      startedAt = now;
    },
    valueAt(now, duration) {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      return from + (target - from) * smoothstep(0, 1, progress);
    },
  };
}
