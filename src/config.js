// Single source of truth for the scene's colours and tuning constants.
// Keeping these out of the rendering code makes the look easy to adjust and test.

export const dayPalette = {
  skyTop: "#79c4ec",
  skyMid: "#a9dcf4",
  horizon: "#f4edcf",
  farHill: "#76b95d",
  nearHill: "#4e9c4d",
  frontHill: "#347744",
  grass: ["#a2cb55", "#76b944", "#55983e", "#377b3d", "#c1d369"],
};

export const nightPalette = {
  skyTop: "#10263e",
  skyMid: "#283d50",
  horizon: "#687565",
  farHill: "#435a48",
  nearHill: "#304a3d",
  frontHill: "#243c34",
  grass: ["#637c54", "#536f4b", "#496746", "#3e5c40", "#74845a"],
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
  fireflies: 26,
};

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
