// Grasshoppers hiding in the summer grass: a hand sweeping through the field
// sometimes flushes a few, which hop away ballistically and vanish again.
// Pure state stepping with injected randomness so every rule is testable.

import { terrainHeight } from "./terrain.js";

const TAU = Math.PI * 2;
const GRAVITY = 9.8;
const TOUCH_THRESHOLD = 0.3;
const BASE_RATE = 1.6;
const CAPACITY = { low: 4, mid: 6, high: 8 };

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function grasshopperCapacity(tier) {
  return CAPACITY[tier] ?? CAPACITY.mid;
}

// Expected flushes per second for a hand moving at `handSpeed` m/s.
export function flushChance({ weights, dayAmount, handSpeed }) {
  const seasonal = (weights.summer ?? 0) + 0.2 * ((weights.spring ?? 0) + (weights.autumn ?? 0));
  const daylight = smoothstep(0.15, 0.75, dayAmount);
  const motion = Math.min(handSpeed, 4) / 4;
  return BASE_RATE * seasonal * daylight * motion;
}

export function createMeadowInsects({ random = Math.random, max = 6 } = {}) {
  return { random, max, insects: [], cooldown: 0, flushes: 0, lastHand: null };
}

function launch(bug, random, scale) {
  const speed = (2.5 + 1.5 * random()) * scale;
  const elevation = ((45 + 25 * random()) * Math.PI) / 180;
  const ground = Math.cos(elevation) * speed;
  bug.vx = Math.cos(bug.heading) * ground;
  bug.vz = Math.sin(bug.heading) * ground;
  bug.vy = Math.sin(elevation) * speed;
  bug.airborne = true;
}

function spawn(state, hand) {
  const { random } = state;
  const angle = random() * TAU;
  const distance = 0.5 + 2 * random();
  const x = hand.x + Math.cos(angle) * distance;
  const z = hand.z + Math.sin(angle) * distance;
  const bug = {
    x,
    y: terrainHeight(x, z),
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: angle + (random() - 0.5) * 0.6,
    airborne: false,
    pause: 0,
    hopsLeft: Math.floor(random() * 3),
    size: 0.85 + 0.3 * random(),
  };
  launch(bug, random, 1);
  return bug;
}

function flush(state, hand) {
  const { random } = state;
  const room = state.max - state.insects.length;
  const count = Math.min(room, 1 + Math.floor(random() * 3));
  for (let i = 0; i < count; i += 1) state.insects.push(spawn(state, hand));
  state.cooldown = 4 + 5 * random();
  state.flushes += 1;
}

function fly(bug, dt) {
  bug.vy -= GRAVITY * dt;
  bug.x += bug.vx * dt;
  bug.y += bug.vy * dt;
  bug.z += bug.vz * dt;
  const ground = terrainHeight(bug.x, bug.z);
  if (bug.y > ground) return;
  bug.y = ground;
  if (bug.vy > 0) return;
  bug.airborne = false;
  bug.vx = bug.vy = bug.vz = 0;
  bug.pause = 0.25 + 0.4 * Math.abs(Math.sin(bug.x * 13.1 + bug.z * 7.7));
}

// Returns false once the grasshopper has slipped back into the grass.
function rest(bug, dt, random) {
  bug.pause -= dt;
  if (bug.pause > 0) return true;
  if (bug.hopsLeft <= 0) return false;
  bug.hopsLeft -= 1;
  bug.heading += (random() - 0.5) * 0.8;
  launch(bug, random, 0.6);
  return true;
}

export function stepInsects(state, dtSec, { touch, season, dayAmount, motionScale = 1 }) {
  const dt = dtSec * motionScale;
  state.insects = state.insects.filter((bug) => {
    if (bug.airborne) {
      fly(bug, dt);
      return true;
    }
    return rest(bug, dt, state.random);
  });

  state.cooldown = Math.max(0, state.cooldown - dtSec);
  const inGrass = touch && touch.strength > TOUCH_THRESHOLD;
  const last = state.lastHand;
  state.lastHand = inGrass ? { x: touch.x, z: touch.z } : null;
  if (!inGrass || !last || dtSec <= 0) return state;
  if (state.cooldown > 0 || state.insects.length >= state.max) return state;

  const handSpeed = Math.hypot(touch.x - last.x, touch.z - last.z) / dtSec;
  const rate = flushChance({ weights: season.weights, dayAmount, handSpeed });
  if (state.random() < 1 - Math.exp(-rate * dtSec)) flush(state, touch);
  return state;
}
