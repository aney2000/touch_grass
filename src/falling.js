// Falling seasonal particles: snow, leaves and petals drifting down in front of
// the viewer. Pure and deterministic; the three.js system only draws the state.

import { randomGenerator, hexToUnitRgb } from "./scene-math.js";
import { terrainHeight } from "./terrain.js";

export const FALLING_AREA = Object.freeze({ xMin: -25, xMax: 25, zMin: -45, zMax: 5, yMax: 18 });
export const FALLING_KINDS = Object.freeze(["petals", "leaves", "snow"]);

// Particles per second at rate 1, plus per-kind motion character.
const SPAWN_PER_SECOND = 60;
const PHYSICS = {
  snow: { fall: 1.1, sway: 0.5, swayFreq: 0.9, spin: 0.4, size: 0.12 },
  leaves: { fall: 2.2, sway: 1.6, swayFreq: 1.8, spin: 3.2, size: 0.32 },
  petals: { fall: 0.8, sway: 1.1, swayFreq: 1.3, spin: 2.2, size: 0.18 },
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

export function createFallingField({ seed, capacity, area = FALLING_AREA }) {
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
  }));
  return {
    random: randomGenerator(seed),
    area,
    particles,
    pending: { petals: 0, leaves: 0, snow: 0 },
    time: 0,
  };
}

function spawn(field, particle, kind) {
  const { random, area } = field;
  const physics = PHYSICS[kind];
  const palette = PALETTE_RGB[kind];
  particle.alive = true;
  particle.kind = kind;
  particle.x = area.xMin + random() * (area.xMax - area.xMin);
  particle.z = area.zMin + random() * (area.zMax - area.zMin);
  particle.y = area.yMax * (0.7 + random() * 0.3);
  particle.vx = (random() - 0.5) * 0.3;
  particle.vy = -physics.fall * (0.75 + random() * 0.5);
  particle.vz = (random() - 0.5) * 0.3;
  particle.rotation = [random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2];
  particle.spin = physics.spin * (0.6 + random() * 0.8) * (random() < 0.5 ? -1 : 1);
  particle.phase = random() * Math.PI * 2;
  particle.size = physics.size * (0.7 + random() * 0.6);
  particle.color = [...palette[Math.floor(random() * palette.length)]];
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

export function stepFalling(field, dtSec, { rates = {}, wind, motionScale = 1 } = {}) {
  const dt = dtSec * motionScale;
  field.time += dt;
  const { particles, area } = field;

  // Accumulate fractional spawns per kind so crossfading rates spawn smoothly.
  for (const kind of FALLING_KINDS) {
    field.pending[kind] += Math.max(0, rates[kind] ?? 0) * SPAWN_PER_SECOND * dt;
  }
  let cursor = 0;
  for (const kind of FALLING_KINDS) {
    while (field.pending[kind] >= 1) {
      field.pending[kind] -= 1;
      while (cursor < particles.length && particles[cursor].alive) cursor += 1;
      if (cursor >= particles.length) break;
      spawn(field, particles[cursor], kind);
    }
    if (cursor >= particles.length) field.pending[kind] = Math.min(field.pending[kind], 1);
  }

  const gusts = wind?.gusts;
  for (const p of particles) {
    if (!p.alive) continue;
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

    const outside = p.x < area.xMin || p.x > area.xMax || p.z < area.zMin || p.z > area.zMax;
    if (outside || p.y <= terrainHeight(p.x, p.z)) p.alive = false;
  }
  return field;
}
