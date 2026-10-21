// Single source of truth for the scene's colours and tuning constants.
// Keeping these out of the rendering code makes the look easy to adjust and test.

// Day colours recreate the look of the classic "Bliss" desktop: a saturated
// cobalt sky over a vivid, rolling green hill.
export const dayPalette = {
  skyTop: "#1d5fd1",
  skyMid: "#4f95ea",
  horizon: "#b8d9f6",
  nearHill: "#4c9a2c",
  grass: ["#7cc23a", "#62ad2c", "#4e9a24", "#3c8420", "#9bd04a"],
  cloud: "#ffffff",
};

export const nightPalette = {
  skyTop: "#06122a",
  skyMid: "#16284a",
  horizon: "#34486a",
  nearHill: "#1d3627",
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
  fireflies: 48,
  grassBlades: 60000,
  grassBladesCompact: 24000,
  clouds: 14,
};

// Where the fireflies hover: the meadow just in front of the viewer.
export const FIREFLY_AREA = { xMin: -14, xMax: 14, zMin: -26, zMax: 6 };
