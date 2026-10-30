// The seasons model. Seasons sit on a ring of positions (spring 0, summer 1,
// autumn 2, winter 3, then spring again at 4). The scene tweens one continuous
// position, always taking the shortest way round, so a morph only ever blends
// two neighbouring seasons. Pure and DOM/WebGL-free.

import { hexToUnitRgb } from "./scene-math.js";
import { SEASON_LOOKS } from "./config.js";

export { SEASON_LOOKS };

export const SEASONS = Object.freeze(["spring", "summer", "autumn", "winter"]);

const RING = SEASONS.length;
const PARTICLE_KINDS = ["petals", "leaves", "snow"];

export function seasonPosition(name) {
  const index = SEASONS.indexOf(name);
  if (index === -1) throw new RangeError(`Unknown season: ${name}`);
  return index;
}

const wrap = (position) => ((position % RING) + RING) % RING;

// The target position nearest to `current` that shows `name`. Ties (two seasons
// away) go forward in time.
export function nearestSeasonTarget(current, name) {
  let step = wrap(seasonPosition(name) - current);
  if (step > RING / 2) step -= RING;
  return current + step;
}

export function seasonBlendAt(position) {
  const wrapped = wrap(position);
  const lower = Math.floor(wrapped);
  const amount = wrapped - lower;
  const weights = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  weights[SEASONS[lower % RING]] += 1 - amount;
  weights[SEASONS[(lower + 1) % RING]] += amount;
  return weights;
}

export function dominantSeason(weights) {
  return SEASONS.reduce((best, season) => (weights[season] > weights[best] ? season : best));
}

// Blend the per-season looks by weight. Colours come out as unit RGB arrays.
export function seasonLook(weights) {
  const blendNumber = (pick) =>
    SEASONS.reduce((total, season) => total + pick(SEASON_LOOKS[season]) * weights[season], 0);
  const blendColour = (pick) =>
    SEASONS.reduce(
      (colour, season) => {
        const rgb = hexToUnitRgb(pick(SEASON_LOOKS[season]));
        return colour.map((value, index) => value + rgb[index] * weights[season]);
      },
      [0, 0, 0],
    );
  const particleRates = Object.fromEntries(
    PARTICLE_KINDS.map((kind) => [kind, blendNumber((look) => look.particleRates[kind])]),
  );
  return {
    grassHeight: blendNumber((look) => look.grassHeight),
    grassBase: blendColour((look) => look.grassBase),
    grassTip: blendColour((look) => look.grassTip),
    snowCover: blendNumber((look) => look.snowCover),
    groundTint: blendColour((look) => look.groundTint),
    foliage: {
      color: blendColour((look) => look.foliage.color),
      density: blendNumber((look) => look.foliage.density),
      blossom: blendNumber((look) => look.foliage.blossom),
    },
    particles: SEASON_LOOKS[dominantSeason(weights)].particles,
    particleRates,
  };
}
