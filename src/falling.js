// Falling seasonal particles: leaves and petals shed by deciduous trees, snow
// across the whole view. Pure and deterministic; the three.js system only draws
// the state. Where particles start is delegated to per-kind spawn strategies.

import { randomGenerator, hexToUnitRgb } from "./scene-math.js";
import { terrainHeight } from "./terrain.js";
import { canopyEmitters, canopySpawner, skySpawner } from "./emitters.js";

// Snow covers the visible meadow and forest so it reads the same everywhere.
export const SNOW_AREA = Object.freeze({ xMin: -80, xMax: 80, zMin: -135, zMax: 8, yMax: 24 });
const SNOW_PER_SECOND = 40;
export const FALLING_KINDS = Object.freeze(["petals", "leaves", "snow"]);
// Seconds a landed particle lies on the ground, fading, before it recycles.
const GROUND_SECONDS = { snow: 0.8, leaves: 1.5, petals: 1.5 };

export function fallingSpawners({ canopies = [] } = {}) {
  const trees = canopySpawner(canopyEmitters(canopies));
  const sky = skySpawner(SNOW_AREA, { perSecond: SNOW_PER_SECOND });
  return { petals: trees, leaves: trees, snow: sky };
}

// Per-kind motion character.
const PHYSICS = {
  snow: { fall: 0.9, sway: 0.5, swayFreq: 0.9, spin: 0.4, size: 0.08 },
  leaves: { fall: 1.6, sway: 1.2, swayFreq: 1.8, spin: 3.2, size: 0.18 },
  petals: { fall: 0.8, sway: 0.9, swayFreq: 1.3, spin: 2.2, size: 0.14 },
};
const PALETTES = {
  snow: ["#ffffff", "#f4f8ff", "#eef4fb"],
  leaves: ["#c0392b", "#e0662a", "#d98e2b", "#8a5a2b", "#e8b83a"],
  petals: ["#f6c9d8", "#fff3f6", "#f2b3c8", "#fbe0ea"],
};
const PALETTE_RGB = Object.fromEntries(
  Object.entries(PALETTES).map(([kind, hexes]) => [kind, hexes.map(hexToUnitRgb)]),
);
const GUST_LIMIT = 6;
const GUST_RADIUS = 9;
const GUST_SECONDS = 2.6;

export function createFallingField({ seed, capacity, spawners = fallingSpawners(), limits = {} }) {
  const particles = Array.from({ length: capacity }, () => ({
    alive: false,
    kind: "snow",
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotation: [0, 0, 0],
    spin: 0,
    phase: 0,
    size: 0,
    color: [1, 1, 1],
    landed: 0,
    fade: 1,
    zoneX: 0,
    zoneZ: 0,
    zoneRadius: 0,
  }));
  return {
    random: randomGenerator(seed),
    spawners,
    limits: Object.fromEntries(FALLING_KINDS.map((k) => [k, limits[k] ?? capacity])),
    particles,
    pending: { petals: 0, leaves: 0, snow: 0 },
    alive: { petals: 0, leaves: 0, snow: 0 },
    spawned: { petals: 0, leaves: 0, snow: 0 },
    time: 0,
    aliveCount: 0,
  };
}

const NO_RATES = Object.freeze({});

function spawn(field, particle, kind) {
  const { random } = field;
  const physics = PHYSICS[kind];
  const palette = PALETTE_RGB[kind];
  particle.alive = true;
  particle.kind = kind;
  particle.landed = 0;
  particle.fade = 1;
  field.spawners[kind].place(particle, random);
  particle.vx = (random() - 0.5) * 0.3;
  particle.vy = -physics.fall * (0.75 + random() * 0.5);
  particle.vz = (random() - 0.5) * 0.3;
  // Reuse the particle's arrays: spawning happens in the frame loop.
  particle.rotation[0] = random() * Math.PI * 2;
  particle.rotation[1] = random() * Math.PI * 2;
  particle.rotation[2] = random() * Math.PI * 2;
  particle.spin = physics.spin * (0.6 + random() * 0.8) * (random() < 0.5 ? -1 : 1);
  particle.phase = random() * Math.PI * 2;
  particle.size = physics.size * (0.7 + random() * 0.6);
  const rgb = palette[Math.floor(random() * palette.length)];
  particle.color[0] = rgb[0];
  particle.color[1] = rgb[1];
  particle.color[2] = rgb[2];
  field.aliveCount += 1;
  field.alive[kind] += 1;
  field.spawned[kind] += 1;
}

function recycle(field, p) {
  p.alive = false;
  field.aliveCount -= 1;
  field.alive[p.kind] -= 1;
}

// Sideways push from the visitor's ripple gusts ([x, z, ageSeconds, strength] quads).
function gustPush(gusts, x, z) {
  let push = 0;
  if (!gusts) return push;
  for (let i = 0; i < GUST_LIMIT; i += 1) {
    const strength = gusts[i * 4 + 3];
    if (!strength) continue;
    const dx = x - gusts[i * 4];
    const dz = z - gusts[i * 4 + 1];
    const distance = Math.hypot(dx, dz);
    const fade = Math.max(0, 1 - gusts[i * 4 + 2] / GUST_SECONDS);
    const reach = Math.max(0, 1 - distance / GUST_RADIUS);
    push += Math.sign(dx || 1) * strength * fade * reach * 6;
  }
  return push;
}

export function stepFalling(field, dtSec, { rates = NO_RATES, wind, motionScale = 1 } = {}) {
  // Idle (e.g. summer): nothing alive and nothing to spawn, so skip everything.
  const idle =
    field.aliveCount === 0 && !(rates.petals > 0) && !(rates.leaves > 0) && !(rates.snow > 0);
  if (idle) return field;

  const dt = dtSec * motionScale;
  field.time += dt;
  const { particles, spawners, limits } = field;

  // Accumulate fractional spawns per kind so crossfading rates spawn smoothly.
  for (const kind of FALLING_KINDS) {
    field.pending[kind] += spawners[kind].perSecond(Math.max(0, rates[kind] ?? 0)) * dt;
  }
  let cursor = 0;
  for (const kind of FALLING_KINDS) {
    while (field.pending[kind] >= 1 && field.alive[kind] < limits[kind]) {
      field.pending[kind] -= 1;
      while (cursor < particles.length && particles[cursor].alive) cursor += 1;
      if (cursor >= particles.length) break;
      spawn(field, particles[cursor], kind);
    }
    field.pending[kind] = Math.min(field.pending[kind], 1);
  }

  const gusts = wind?.gusts;
  for (const p of particles) {
    if (!p.alive) continue;
    if (p.landed > 0) {
      p.landed += dt;
      p.fade = Math.max(0, 1 - p.landed / GROUND_SECONDS[p.kind]);
      if (p.fade === 0) recycle(field, p);
      continue;
    }
    const physics = PHYSICS[p.kind];
    const sway = Math.sin(field.time * physics.swayFreq + p.phase) * physics.sway;
    const push = gustPush(gusts, p.x, p.z);
    p.vx += (push - p.vx * 0.8) * Math.min(1, dt * 2);
    p.x += (p.vx + sway) * dt;
    p.z += p.vz * dt;
    // Leaves flutter: their fall speed pulses as they tumble; petals swirl.
    const flutter =
      p.kind === "leaves" ? 0.6 + 0.4 * Math.abs(Math.cos(field.time * 2.4 + p.phase)) : 1;
    p.y += p.vy * flutter * dt;
    if (p.kind === "petals") p.z += Math.cos(field.time * physics.swayFreq + p.phase) * 0.6 * dt;
    p.rotation[0] += p.spin * dt;
    p.rotation[1] += p.spin * 0.6 * dt;
    p.rotation[2] += p.spin * 0.3 * dt;

    if (!spawners[p.kind].contains(p)) {
      recycle(field, p);
      continue;
    }
    const ground = terrainHeight(p.x, p.z);
    if (p.y <= ground) {
      // Settle flat on the ground; the tiny start keeps "landed" truthy.
      p.y = ground + 0.02;
      p.landed = 1e-6;
      p.rotation[0] = Math.PI / 2;
    }
  }
  return field;
}
