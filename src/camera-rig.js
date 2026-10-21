// The camera's pose: a resting viewpoint over the meadow, a slow breathing
// drift, and a parallax lean toward the pointer. Pure, so motion is testable.

import { clamp } from "./scene-math.js";

export const CAMERA_BASE = Object.freeze({
  position: Object.freeze([0, 2.6, 12]),
  target: Object.freeze([-4, 6, -50]),
});

const BASE_FOV = 50;
const WIDEST_ASPECT_KEPT = 1.6;
const MAX_FOV = 80;

// Vertical FOV that preserves the landscape's horizontal framing on narrow screens.
export function fovForAspect(aspect) {
  if (aspect >= WIDEST_ASPECT_KEPT) return BASE_FOV;
  const halfWidth = Math.tan((BASE_FOV * Math.PI) / 360) * WIDEST_ASPECT_KEPT;
  const fov = (Math.atan(halfWidth / aspect) * 360) / Math.PI;
  return Math.min(MAX_FOV, fov);
}

export function cameraPoseAt(seconds, pointer, { reducedMotion = false } = {}) {
  const px = clamp(pointer.x, -1, 1);
  const py = clamp(pointer.y, -1, 1);
  const drift = reducedMotion ? 0 : 1;
  const [x, y, z] = CAMERA_BASE.position;
  const [tx, ty, tz] = CAMERA_BASE.target;

  return {
    position: [
      x + px * 1.1 + drift * 0.5 * Math.sin(seconds * 0.07),
      y + py * 0.5 + drift * 0.18 * Math.sin(seconds * 0.11 + 1),
      z + drift * 0.35 * Math.sin(seconds * 0.05 + 2),
    ],
    target: [
      tx + px * 2 + drift * 1.2 * Math.sin(seconds * 0.06),
      ty + py * 0.8 + drift * 0.4 * Math.sin(seconds * 0.09 + 0.5),
      tz,
    ],
  };
}
