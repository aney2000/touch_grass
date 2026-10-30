// Picks a rendering budget for the device: how much grass, how many trees and
// particles, and how expensive the pixels may be. Pure, so every rule is tested.

const MAX_PIXELS = 8e6;

const TIERS = ["low", "mid", "high"];

const SETTINGS = {
  low: {
    grassBlades: 18000,
    groveTrees: 14,
    fallingCapacity: 220,
    maxDpr: 1.25,
    msaa: 0,
    bloomScale: 0.5,
  },
  mid: {
    grassBlades: 36000,
    groveTrees: 18,
    fallingCapacity: 400,
    maxDpr: 1.5,
    msaa: 2,
    bloomScale: 0.5,
  },
  high: {
    grassBlades: 60000,
    groveTrees: 22,
    fallingCapacity: 600,
    maxDpr: 2,
    msaa: 4,
    bloomScale: 1,
  },
};

function baseTier({ width, height, hardwareConcurrency, deviceMemory, coarsePointer }) {
  const cores = hardwareConcurrency ?? Infinity;
  const memory = deviceMemory ?? Infinity;
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);
  if ((coarsePointer && (cores <= 4 || memory <= 3)) || minSide < 500) return "low";
  if (coarsePointer || cores <= 6 || maxSide <= 1366) return "mid";
  return "high";
}

function settingsFor(tier, dpr, pixelCap) {
  const s = SETTINGS[tier];
  return {
    tier,
    grassBlades: s.grassBlades,
    groveTrees: s.groveTrees,
    fallingCapacity: s.fallingCapacity,
    pixelRatio: Math.min(dpr, s.maxDpr, pixelCap),
    msaa: s.msaa,
    bloom: { enabled: true, scale: s.bloomScale },
    dpr,
    pixelCap,
  };
}

export function chooseQuality(device) {
  const { width, height, reducedMotion } = device;
  const dpr = device.dpr || 1;
  const pixelCap = Math.sqrt(MAX_PIXELS / Math.max(1, width * height));
  let index = TIERS.indexOf(baseTier(device));
  if (reducedMotion) index = Math.max(0, index - 1);
  return settingsFor(TIERS[index], dpr, pixelCap);
}

export function stepDown(quality) {
  const index = TIERS.indexOf(quality.tier);
  if (index <= 0) return quality;
  return settingsFor(TIERS[index - 1], quality.dpr, quality.pixelCap);
}
