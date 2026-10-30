// The seasons model. Seasons sit on a ring of positions (spring 0, summer 1,
// autumn 2, winter 3, then spring again at 4). The scene tweens one continuous
// position, always taking the shortest way round, so a morph only ever blends
// two neighbouring seasons. Pure and DOM/WebGL-free.

import { clamp, hexToUnitRgb } from "./scene-math.js";
import { seasonChoreography } from "./season-choreography.js";
import { SEASON_LOOKS, SEASONS } from "./config.js";

export { SEASON_LOOKS, SEASONS };

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

// Blend the per-season looks, each field weighted by its choreography channel
// (`weightsFor(channel)`). Colours come out as unit RGB arrays.
function blendLook(weightsFor) {
  const blendNumber = (channel, pick) => {
    const weights = weightsFor(channel);
    return SEASONS.reduce(
      (total, season) => total + pick(SEASON_LOOKS[season]) * weights[season],
      0,
    );
  };
  const blendColour = (channel, pick) => {
    const weights = weightsFor(channel);
    return SEASONS.reduce(
      (colour, season) => {
        const rgb = hexToUnitRgb(pick(SEASON_LOOKS[season]));
        return colour.map((value, index) => value + rgb[index] * weights[season]);
      },
      [0, 0, 0],
    );
  };
  const particleRates = Object.fromEntries(
    PARTICLE_KINDS.map((kind) => [
      kind,
      blendNumber("particles", (look) => look.particleRates[kind]),
    ]),
  );
  return {
    grassHeight: blendNumber("grassHeight", (look) => look.grassHeight),
    grassBase: blendColour("grassColor", (look) => look.grassBase),
    grassTip: blendColour("grassColor", (look) => look.grassTip),
    snowCover: blendNumber("groundSnow", (look) => look.snowCover),
    grassSnow: blendNumber("grassSnow", (look) => look.snowCover),
    groundTint: blendColour("groundSnow", (look) => look.groundTint),
    sky: {
      top: blendColour("sky", (look) => look.sky.top),
      horizon: blendColour("sky", (look) => look.sky.horizon),
      amount: blendNumber("sky", (look) => look.sky.amount),
      fogScale: blendNumber("sky", (look) => look.sky.fogScale),
    },
    light: {
      sunTint: blendColour("light", (look) => look.light.sunTint),
      sunStrength: blendNumber("light", (look) => look.light.sunStrength),
      sunElevationOffset: blendNumber("light", (look) => look.light.sunElevationOffset),
    },
    foliage: {
      color: blendColour("foliageColor", (look) => look.foliage.color),
      density: blendNumber("foliageDensity", (look) => look.foliage.density),
      blossom: blendNumber("blossom", (look) => look.foliage.blossom),
    },
    particles: SEASON_LOOKS[dominantSeason(weightsFor("particles"))].particles,
    particleRates,
  };
}

export function seasonLook(weights) {
  return blendLook(() => weights);
}

// The look part-way through a one-step morph, every field following its own
// choreography channel instead of one shared crossfade.
export function seasonLookDuring({ from, to, t }) {
  const progress = seasonChoreography(from, to, t);
  return blendLook((channel) => {
    const weights = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    weights[from] += 1 - progress[channel];
    weights[to] += progress[channel];
    return weights;
  });
}

// Where a morph from `start` to `target` (ring positions) is at linear
// `progress`. A jump of two seasons walks through the one in between, leg by
// leg, rather than blending the two directly: nature never goes from blossom to
// autumn without passing summer, and every leg then gets its own choreography.
export function seasonTransitionAt(start, target, progress) {
  const position = start + (target - start) * clamp(progress, 0, 1);
  const name = (index) => SEASONS[wrap(index)];
  if (target === start) return { position, from: name(start), to: name(start), t: 1 };
  const atWhole = position === Math.floor(position) && position !== target;
  if (target > start) {
    const lower = atWhole ? position : Math.ceil(position) - 1;
    return { position, from: name(lower), to: name(lower + 1), t: position - lower };
  }
  const upper = atWhole ? position : Math.floor(position) + 1;
  return { position, from: name(upper), to: name(upper - 1), t: upper - position };
}
