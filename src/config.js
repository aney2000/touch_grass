// Single source of truth for the scene's colours and tuning constants.
// Keeping these out of the rendering code makes the look easy to adjust and test.

// Day colours recreate the look of the classic "Bliss" desktop: a saturated
// cobalt sky over a vivid, rolling green hill.
export const dayPalette = {
  skyTop: "#1d5fd1",
  skyMid: "#4f95ea",
  horizon: "#b8d9f6",
  farHill: "#5aa83a",
  nearHill: "#4c9a2c",
  frontHill: "#3f8a24",
  grass: ["#7cc23a", "#62ad2c", "#4e9a24", "#3c8420", "#9bd04a"],
  cloud: "#ffffff",
};

export const nightPalette = {
  skyTop: "#06122a",
  skyMid: "#16284a",
  horizon: "#34486a",
  farHill: "#24402f",
  nearHill: "#1d3627",
  frontHill: "#162d20",
  grass: ["#3f6a3a", "#355f34", "#2d552f", "#264a29", "#4a7642"],
  cloud: "#3a4a66",
};

// Warm sunset/sunrise tones blended in while the sky changes over.
export const twilightPalette = {
  horizon: "#ff9a5c",
  sky: "#c86a8a",
  sun: "#ffb070",
};

// Day/night is an explicit eased tween so the sunrise/sunset is always visible.
export const DAY_NIGHT_MS = 4200;
export const REDUCED_MOTION_DAY_NIGHT_MS = 1100;

// Seed for the scene's deterministic random generator.
export const SCENE_SEED = 741;

export const COUNTS = {
  maxGrass: 1500,
  grassPerPixel: 0.78,
  stars: 150,
  fireflies: 48,
  grassBlades: 60000,
  grassBladesCompact: 24000,
  clouds: 14,
};

// Where the fireflies hover: the meadow just in front of the viewer.
export const FIREFLY_AREA = { xMin: -14, xMax: 14, zMin: -26, zMax: 6 };

export const dayClouds = [
  { x: 0.08, y: 0.2, scale: 0.8, speed: 0.004 },
  { x: 0.39, y: 0.12, scale: 0.58, speed: 0.006 },
  { x: 0.67, y: 0.28, scale: 0.94, speed: 0.003 },
  { x: 0.9, y: 0.15, scale: 0.52, speed: 0.005 },
];

export const nightClouds = [
  { x: 0.2, y: 0.17, scale: 0.7, speed: 0.0024 },
  { x: 0.55, y: 0.1, scale: 0.95, speed: 0.0017 },
  { x: 0.82, y: 0.23, scale: 0.6, speed: 0.0031 },
];

// Control points (as fractions of width/height) of the far hill's upper arc,
// mirroring the hills layer so the tree can sit on that sky-lit crest.
export const TREE_HILL_CURVE = {
  x: [0.52, 0.72, 0.88, 1.0],
  y: [0.67, 0.58, 0.66, 0.56],
};
