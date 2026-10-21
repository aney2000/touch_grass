// The scene model: all mutable state and the lifecycle that drives it (resize,
// per-frame advance, day/night toggle, wind). It knows nothing about the canvas
// or the DOM, which keeps it easy to reason about and the renderer decoupled.

import { cubicBezier, highestPoint } from "./scene-math.js";
import { createTween, clockFromDayAmount } from "./time.js";
import { createSceneObjects, addGust, pruneGusts } from "./scene-objects.js";
import {
  dayClouds,
  nightClouds,
  TREE_HILL_CURVE,
  DAY_NIGHT_MS,
  REDUCED_MOTION_DAY_NIGHT_MS,
} from "./config.js";

const MAX_FRAME_DELTA_MS = 48;

export class Scene {
  constructor({ prefersReducedMotion = false } = {}) {
    this.prefersReducedMotion = prefersReducedMotion;

    this.width = 0;
    this.height = 0;
    this.dayAmount = 0;
    this.elapsed = 0;
    this.previousFrame = 0;

    this.field = [];
    this.stars = [];
    this.fireflies = [];
    this.shootingStars = [];
    this.gusts = [];
    this.clouds = dayClouds;
    this.nightClouds = nightClouds;
    this.treeCrest = { x: 0, y: 0 };
    this.nextStarAt = 0;

    this.targetNight = 0;
    this.tween = createTween(0);
  }

  // Rebuild everything that depends on the canvas size.
  resize(width, height) {
    this.width = width;
    this.height = height;
    const { field, stars, fireflies } = createSceneObjects(width, height);
    this.field = field;
    this.stars = stars;
    this.fireflies = fireflies;
    this.computeTreeCrest();
  }

  // Advance animation time and ease the day/night value toward its target.
  advance(now) {
    const delta = Math.min(MAX_FRAME_DELTA_MS, now - this.previousFrame || 16);
    this.previousFrame = now;
    this.elapsed += delta;

    const duration = this.prefersReducedMotion ? REDUCED_MOTION_DAY_NIGHT_MS : DAY_NIGHT_MS;
    this.dayAmount = this.tween.valueAt(now, duration);

    pruneGusts(this.gusts, now);
  }

  // Flip between day and night, easing from wherever the transition is now.
  toggleNight(now) {
    this.targetNight = this.targetNight ? 0 : 1;
    this.tween.retarget(this.targetNight, this.dayAmount, now);
    return this.targetNight;
  }

  get isNight() {
    return this.targetNight === 1;
  }

  pushGust(point, direction, strength, now) {
    addGust(this.gusts, point, direction, strength, now);
  }

  clock() {
    return clockFromDayAmount(this.dayAmount);
  }

  // Seat the tree on the sky-lit crest of the far hill by sampling its arc and
  // keeping the highest point within an off-centre window.
  computeTreeCrest() {
    const { x: cx, y: cy } = TREE_HILL_CURVE;
    const samples = [];
    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      const x = cubicBezier(cx[0], cx[1], cx[2], cx[3], t) * this.width;
      if (x < this.width * 0.5 || x > this.width * 0.8) continue;
      samples.push({ x, y: cubicBezier(cy[0], cy[1], cy[2], cy[3], t) * this.height });
    }
    this.treeCrest = highestPoint(samples);
  }
}
