// The camera's pose: a resting viewpoint over the meadow, a slow breathing
// drift, and a parallax lean toward the pointer. Pure, so motion is testable.

import { clamp } from "./scene-math.js";

export const CAMERA_BASE = Object.freeze({
  position: Object.freeze([0, 2.6, 12]),
  target: Object.freeze([-4, 6, -50]),
});

const BASE_FOV = 50;
const WIDEST_ASPECT_KEPT = 1.6;
// Wider than this looks like a fisheye; portrait framing comes from pulling back.
const MAX_FOV = 70;
// Below this aspect the camera starts retreating; at PORTRAIT_FULL it is fully back.
const PORTRAIT_START = 1;
const PORTRAIT_FULL = 0.46;
const PULL_BACK = 6;
const RISE = 1.4;

// Vertical FOV that preserves the landscape's horizontal framing on narrow screens.
export function fovForAspect(aspect) {
  if (aspect >= WIDEST_ASPECT_KEPT) return BASE_FOV;
  const halfWidth = Math.tan((BASE_FOV * Math.PI) / 360) * WIDEST_ASPECT_KEPT;
  const fov = (Math.atan(halfWidth / aspect) * 360) / Math.PI;
  return Math.min(MAX_FOV, fov);
}

// Resting pose for a screen shape: portrait screens step back and up so the
// capped FOV still shows the hill and the tree instead of cropping them.
export function basePoseForAspect(aspect = 16 / 9) {
  const portrait = clamp((PORTRAIT_START - aspect) / (PORTRAIT_START - PORTRAIT_FULL), 0, 1);
  const [x, y, z] = CAMERA_BASE.position;
  return {
    position: [x, y + RISE * portrait, z + PULL_BACK * portrait],
    target: [...CAMERA_BASE.target],
  };
}

export function cameraPoseAt(seconds, pointer, { reducedMotion = false, aspect } = {}) {
  // Under reduced motion the view is a fixed photograph: no sway, no parallax.
  const motion = reducedMotion ? 0 : 1;
  const px = clamp(pointer.x, -1, 1) * motion;
  const py = clamp(pointer.y, -1, 1) * motion;
  const drift = motion;
  const base = basePoseForAspect(aspect);
  const [x, y, z] = base.position;
  const [tx, ty, tz] = base.target;

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
