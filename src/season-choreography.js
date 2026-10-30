// Season choreography: instead of crossfading every property at once, each
// visual channel changes in its own window of the transition, so a morph reads
// like nature (leaves turn, then fall, then snow settles...). Windows are
// authored for the forward steps of the ring; a backward step plays the same
// film in reverse, so melting is literally snowfall run backwards. Pure.

import { clamp } from "./scene-math.js";
import { SEASONS } from "./config.js";

export const CHANNELS = Object.freeze([
  "sky",
  "light",
  "groundSnow",
  "grassSnow",
  "grassColor",
  "grassHeight",
  "foliageColor",
  "foliageDensity",
  "blossom",
  "particles",
]);

export function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const EVEN = Object.freeze(Object.fromEntries(CHANNELS.map((channel) => [channel, [0, 1]])));

const FORWARD_WINDOWS = Object.freeze({
  "spring>summer": {
    ...EVEN,
    blossom: [0, 0.45],
    foliageColor: [0.1, 0.6],
    foliageDensity: [0.15, 0.65],
    grassColor: [0.2, 0.7],
    grassHeight: [0.4, 1],
    sky: [0.1, 0.9],
    light: [0.15, 0.95],
    particles: [0, 0.5],
  },
  "summer>autumn": {
    ...EVEN,
    grassColor: [0, 0.45],
    sky: [0.1, 0.8],
    light: [0.1, 0.85],
    foliageColor: [0.3, 0.75],
    particles: [0.4, 0.9],
    foliageDensity: [0.55, 1],
    grassHeight: [0.5, 1],
  },
  "autumn>winter": {
    ...EVEN,
    foliageColor: [0, 0.3],
    foliageDensity: [0.15, 0.55],
    sky: [0.2, 0.7],
    light: [0.25, 0.75],
    particles: [0.3, 0.75],
    grassColor: [0.35, 0.8],
    grassSnow: [0.4, 0.8],
    groundSnow: [0.5, 0.95],
    grassHeight: [0.65, 1],
  },
  "winter>spring": {
    ...EVEN,
    groundSnow: [0, 0.4],
    grassSnow: [0.1, 0.5],
    sky: [0.05, 0.6],
    light: [0.05, 0.65],
    grassColor: [0.3, 0.7],
    grassHeight: [0.35, 0.8],
    foliageDensity: [0.4, 0.85],
    foliageColor: [0.45, 0.9],
    blossom: [0.6, 1],
    particles: [0.6, 1],
  },
});

function progressInWindow([start, end], t) {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return easeInOutCubic((t - start) / (end - start));
}

function forwardKey(from, to) {
  const step = (SEASONS.indexOf(to) - SEASONS.indexOf(from) + SEASONS.length) % SEASONS.length;
  if (step === 1) return { key: `${from}>${to}`, reversed: false };
  if (step === SEASONS.length - 1) return { key: `${to}>${from}`, reversed: true };
  return { key: null, reversed: false };
}

// Per-channel progress (0..1) of a from>to morph at raw progress t.
export function seasonChoreography(from, to, t) {
  if (from === to) return Object.fromEntries(CHANNELS.map((channel) => [channel, 1]));
  const raw = clamp(t, 0, 1);
  const { key, reversed } = forwardKey(from, to);
  const windows = FORWARD_WINDOWS[key] ?? EVEN;
  return Object.fromEntries(
    CHANNELS.map((channel) => [
      channel,
      reversed
        ? 1 - progressInWindow(windows[channel], 1 - raw)
        : progressInWindow(windows[channel], raw),
    ]),
  );
}
