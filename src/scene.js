// The scene model: all mutable state and the lifecycle that drives it (per-frame
// advance, day/night toggle, wind, pointer). It knows nothing about the DOM or
// WebGL; each frame it publishes one read-only snapshot for the 3D systems.

import { createTween, clockFromDayAmount } from "./time.js";
import { atmosphereAt } from "./atmosphere.js";
import { addGust, pruneGusts, gustUniforms, followTouch } from "./wind.js";
import { createFireflySwarm, snapshotSwarm } from "./fireflies.js";
import { clamp, randomGenerator } from "./scene-math.js";
import {
  COUNTS,
  FIREFLY_AREA,
  SCENE_SEED,
  DAY_NIGHT_MS,
  REDUCED_MOTION_DAY_NIGHT_MS,
} from "./config.js";

const MAX_FRAME_DELTA_MS = 48;
const REDUCED_MOTION_SCALE = 0.25;
const PARALLAX_EASE_MS = 280;

export class Scene {
  constructor({ prefersReducedMotion = false } = {}) {
    this.prefersReducedMotion = prefersReducedMotion;

    this.now = 0;
    this.previousFrame = 0;
    this.elapsed = 0;
    this.motionClock = 0;
    this.dayAmount = 0;
    this.atmosphere = atmosphereAt(0);

    this.targetNight = 0;
    this.tween = createTween(0);

    this.gusts = [];
    this.gustBuffer = gustUniforms([], 0);
    this.touchInput = { active: false };
    this.touch = { x: 0, z: 0, strength: 0 };
    this.pointer = { x: 0, y: 0 };
    this.pointerTarget = { x: 0, y: 0 };

    this.swarm = createFireflySwarm(
      randomGenerator(SCENE_SEED + 3),
      COUNTS.fireflies,
      FIREFLY_AREA,
    );
    this.fireflies = snapshotSwarm(this.swarm, 0);
  }

  get motionScale() {
    return this.prefersReducedMotion ? REDUCED_MOTION_SCALE : 1;
  }

  get isNight() {
    return this.targetNight === 1;
  }

  // Advance animation time and ease the day/night value toward its target.
  advance(now) {
    const delta = Math.min(MAX_FRAME_DELTA_MS, now - this.previousFrame || 16);
    this.previousFrame = now;
    this.now = now;
    this.elapsed += delta;
    this.motionClock += delta * this.motionScale;

    const duration = this.prefersReducedMotion ? REDUCED_MOTION_DAY_NIGHT_MS : DAY_NIGHT_MS;
    this.dayAmount = this.tween.valueAt(now, duration);
    this.atmosphere = atmosphereAt(this.dayAmount);

    pruneGusts(this.gusts, now);
    this.touch = followTouch(this.touch, this.touchInput, delta);
    const ease = 1 - Math.exp(-delta / PARALLAX_EASE_MS);
    this.pointer = {
      x: this.pointer.x + (this.pointerTarget.x - this.pointer.x) * ease,
      y: this.pointer.y + (this.pointerTarget.y - this.pointer.y) * ease,
    };
    snapshotSwarm(this.swarm, this.motionClock / 1000, this.fireflies);
  }

  // Flip between day and night, easing from wherever the transition is now.
  toggleNight(now) {
    this.targetNight = this.targetNight ? 0 : 1;
    this.tween.retarget(this.targetNight, this.dayAmount, now);
    return this.targetNight;
  }

  pushGust(point, strength, now) {
    addGust(this.gusts, point, strength, now);
  }

  // A world-space point under the pointer, or null once it leaves the grass.
  setTouch(point) {
    this.touchInput = point ? { active: true, x: point.x, z: point.z } : { active: false };
  }

  // Pointer in normalised view coordinates (-1..1) for camera parallax.
  setPointer({ x, y }) {
    this.pointerTarget = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  clock() {
    return clockFromDayAmount(this.dayAmount);
  }

  frame() {
    return {
      now: this.now,
      seconds: this.elapsed / 1000,
      dayAmount: this.dayAmount,
      atmosphere: this.atmosphere,
      motionScale: this.motionScale,
      pointer: this.pointer,
      fireflies: this.fireflies,
      wind: {
        gusts: gustUniforms(this.gusts, this.now, this.gustBuffer),
        touch: this.touch,
      },
    };
  }
}
