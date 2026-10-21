// Deterministic factories for the scene's populations (grass, stars, fireflies)
// and small helpers for the transient wind gusts. All pure and unit tested.

import { randomGenerator } from "./scene-math.js";
import { dayPalette, nightPalette, COUNTS, SCENE_SEED } from "./config.js";

const GUST_LIMIT = 7;
const GUST_MAX_AGE_MS = 2100;

// Build every seeded population from one generator so the layout is stable
// across resizes and reproducible in tests.
export function createSceneObjects(width, height, seed = SCENE_SEED) {
  const random = randomGenerator(seed);
  return {
    field: createField(random, width),
    stars: createStars(random),
    fireflies: createFireflies(random, width, height),
  };
}

export function createField(random, width) {
  const count = Math.min(COUNTS.maxGrass, Math.ceil(width * COUNTS.grassPerPixel));
  return Array.from({ length: count }, (_, index) => {
    const foreground = index > count * 0.58;
    const swatch = Math.floor(random() * dayPalette.grass.length);
    return {
      x: random() * width,
      height: (foreground ? 0.026 : 0.014) + random() * (foreground ? 0.058 : 0.036),
      width: 0.7 + random() * (foreground ? 1.7 : 1.1),
      phase: random() * Math.PI * 2,
      layer: foreground ? 1 : 0,
      dayColor: dayPalette.grass[swatch],
      nightColor: nightPalette.grass[swatch],
    };
  });
}

export function createStars(random) {
  return Array.from({ length: COUNTS.stars }, () => ({
    x: 0.02 + random() * 0.96,
    y: 0.02 + random() * 0.6,
    size: 0.6 + random() * 1.5,
    phase: random() * Math.PI * 2,
    brightness: 0.4 + random() * 0.6,
  }));
}

export function createFireflies(random, width, height) {
  return Array.from({ length: COUNTS.fireflies }, () => ({
    x: random() * width,
    y: height * (0.56 + random() * 0.2),
    driftX: height * (0.01 + random() * 0.03),
    driftY: height * (0.008 + random() * 0.02),
    driftSpeed: 0.0004 + random() * 0.0006,
    glowSpeed: 0.001 + random() * 0.0018,
    phase: random() * Math.PI * 2,
    size: 1 + random() * 1.6,
  }));
}

// Record a wind gust, keeping only the most recent few so older ones fade out.
export function addGust(gusts, point, direction, strength, now) {
  gusts.push({ x: point.x, y: point.y, direction, strength, startedAt: now });
  if (gusts.length > GUST_LIMIT) gusts.shift();
  return gusts;
}

// Drop gusts that have outlived their influence on the grass.
export function pruneGusts(gusts, now, maxAge = GUST_MAX_AGE_MS) {
  while (gusts.length && now - gusts[0].startedAt > maxAge) gusts.shift();
  return gusts;
}
