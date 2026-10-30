// Time helpers: turning the day/night amount into a readable clock, and the
// eased tween that drives the transition. Both are pure and unit tested.

import { clamp, smoothstep } from "./scene-math.js";

const MINUTES_PER_DAY = 24 * 60;
const NOON = 12 * 60;

// Map the day/night amount (0 = midday, 1 = deepest night) onto a clock face
// that agrees with the sky: noon when the sun is highest, midnight when the
// moon is. The phase says which half of the day the sky is travelling through,
// so the clock always runs forward: "dusk" (day to night) crosses the evening,
// "dawn" (night to day) crosses the morning. Both meet at the endpoints.
// Returns the pieces so the view layer decides how to render them.
export function clockFromDayAmount(dayAmount, phase = "dusk") {
  const amount = clamp(dayAmount, 0, 1);
  const minutesOfDay = phase === "dawn" ? (1 - amount) * NOON : NOON + amount * NOON;
  const totalMinutes = Math.round(minutesOfDay) % MINUTES_PER_DAY;
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
