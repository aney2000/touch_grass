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

export const SEASONS = Object.freeze(["spring", "summer", "autumn", "winter"]);

// Season morphs are slower than day/night: the whole meadow changes over, one
// choreographed channel after another, so it needs room to breathe.
export const SEASON_MS = 7000;
export const REDUCED_MOTION_SEASON_MS = 1200;

const freezeLook = ({ foliage, particleRates, sky, light, ...rest }) =>
  Object.freeze({
    ...rest,
    foliage: Object.freeze(foliage),
    particleRates: Object.freeze(particleRates),
    sky: Object.freeze(sky),
    light: Object.freeze(light),
  });

// What each season looks like at midday. Colours are hex; seasonLook() blends
// them into unit RGB. `particles` names the season's dominant falling particle,
// while `particleRates` (0..1 per kind) lets two kinds crossfade during a morph.
// `sky` tints the sky (top and horizon, by `amount`) and scales the fog
// distances; `light` tints and scales the sun and lowers its arc. Summer is the
// neutral season (no tint, scale 1, no offset) so it keeps the classic sky.
export const SEASON_LOOKS = Object.freeze({
  spring: freezeLook({
    sky: { top: "#5d9be6", horizon: "#d4ecf4", amount: 0.25, fogScale: 0.95 },
    light: { sunTint: "#fff6ea", sunStrength: 0.95, sunElevationOffset: -0.05 },
    grassHeight: 0.85,
    grassBase: "#4f9a2e",
    grassTip: "#a6dc5a",
    snowCover: 0,
    groundTint: "#5f9e3a",
    foliage: { color: "#f6d6e2", density: 0.75, blossom: 0.7 },
    particles: "petals",
    particleRates: { petals: 0.6, leaves: 0, snow: 0 },
  }),
  summer: freezeLook({
    sky: { top: "#1d5fd1", horizon: "#b8d9f6", amount: 0, fogScale: 1 },
    light: { sunTint: "#ffffff", sunStrength: 1, sunElevationOffset: 0 },
    grassHeight: 1.15,
    grassBase: "#3c8420",
    grassTip: "#7cc23a",
    snowCover: 0,
    groundTint: "#4c9a2c",
    foliage: { color: "#3f8a2a", density: 1, blossom: 0 },
    particles: "none",
    particleRates: { petals: 0, leaves: 0, snow: 0 },
  }),
  autumn: freezeLook({
    sky: { top: "#5a86c8", horizon: "#f0d09a", amount: 0.35, fogScale: 0.75 },
    light: { sunTint: "#ffd8a0", sunStrength: 0.9, sunElevationOffset: -0.15 },
    grassHeight: 0.95,
    grassBase: "#8a7a34",
    grassTip: "#d4b25a",
    snowCover: 0,
    groundTint: "#8c7a3c",
    foliage: { color: "#c8541e", density: 0.65, blossom: 0 },
    particles: "leaves",
    particleRates: { petals: 0, leaves: 0.7, snow: 0 },
  }),
  winter: freezeLook({
    sky: { top: "#9fb8d8", horizon: "#9fbce6", amount: 0.5, fogScale: 0.7 },
    light: { sunTint: "#dce8ff", sunStrength: 0.75, sunElevationOffset: -0.35 },
    grassHeight: 0.25,
    grassBase: "#7f9488",
    grassTip: "#c9d6cf",
    snowCover: 1,
    groundTint: "#e8eef2",
    foliage: { color: "#6b5a4a", density: 0, blossom: 0 },
    particles: "snow",
    particleRates: { petals: 0, leaves: 0, snow: 0.8 },
  }),
});

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
