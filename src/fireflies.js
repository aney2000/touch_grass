// Fireflies as little 3D flyers: each wanders around a home spot above the
// grass and flashes like the real thing — a short bright pulse, then darkness.

import { terrainHeight } from "./terrain.js";

const TAU = Math.PI * 2;

export function createFireflySwarm(random, count, { xMin, xMax, zMin, zMax }) {
  return Array.from({ length: count }, () => ({
    home: { x: xMin + random() * (xMax - xMin), z: zMin + random() * (zMax - zMin) },
    hover: 0.35 + random() * 1.4,
    bob: 0.1 + random() * 0.2,
    drift: 0.6 + random() * 1.6,
    speed: 0.15 + random() * 0.35,
    phase: random() * TAU,
    flashRate: 0.25 + random() * 0.35,
    flashOffset: random(),
    flashDuty: 0.18 + random() * 0.2,
    size: 0.7 + random() * 0.6,
  }));
}

export function fireflyFlight(fly, seconds) {
  const t = seconds * fly.speed + fly.phase;
  const x = fly.home.x + fly.drift * (0.6 * Math.sin(t) + 0.4 * Math.sin(t * 2.3 + fly.phase));
  const z = fly.home.z + fly.drift * (0.6 * Math.cos(t * 0.8) + 0.4 * Math.cos(t * 1.9 + 1.1));
  const groundY = terrainHeight(x, z);
  const y = groundY + fly.hover + fly.bob * Math.sin(t * 3);
  return { x, y, z, groundY };
}

// Brightness 0..1: a smooth pulse for the first `flashDuty` of each cycle, dark otherwise.
export function fireflyFlash(fly, seconds) {
  const cycle = (seconds * fly.flashRate + fly.flashOffset) % 1;
  if (cycle >= fly.flashDuty) return 0;
  return Math.sin((Math.PI * cycle) / fly.flashDuty) ** 2;
}

// Where every firefly is and how brightly it glows right now, reusing `out` between frames.
export function snapshotSwarm(swarm, seconds, out = []) {
  out.length = swarm.length;
  swarm.forEach((fly, index) => {
    const { x, y, z } = fireflyFlight(fly, seconds);
    const state = out[index] ?? {};
    state.x = x;
    state.y = y;
    state.z = z;
    state.glow = fireflyFlash(fly, seconds);
    state.size = fly.size;
    out[index] = state;
  });
  return out;
}
