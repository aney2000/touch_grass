import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMeadowInsects,
  stepInsects,
  flushChance,
  grasshopperCapacity,
} from "../src/grasshoppers.js";
import { terrainHeight } from "../src/terrain.js";

function seeded(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const season = (name) => ({
  name,
  weights: { spring: 0, summer: 0, autumn: 0, winter: 0, [name]: 1 },
});

const env = (overrides = {}) => ({
  touch: { x: 0, z: -4, strength: 1 },
  season: season("summer"),
  dayAmount: 1,
  motionScale: 1,
  ...overrides,
});

// Sweeps the hand sideways so it has speed, the trigger for a flush.
let sweepPhase = 0;
function sweep(state, frames, overrides = {}, dt = 1 / 60) {
  for (let i = 0; i < frames; i += 1) {
    sweepPhase += 1;
    const x = Math.sin(sweepPhase * 0.05) * 3;
    stepInsects(state, dt, env({ touch: { x, z: -4, strength: 1 }, ...overrides }));
  }
}

const everSpawns = (overrides) => {
  const state = createMeadowInsects({ random: seeded(3), max: 8 });
  let spawned = 0;
  for (let i = 0; i < 600; i += 1) {
    const x = Math.sin(i * 0.05) * 3;
    stepInsects(state, 1 / 60, env({ touch: { x, z: -4, strength: 1 }, ...overrides }));
    spawned = Math.max(spawned, state.insects.length);
  }
  return spawned;
};

describe("flushChance", () => {
  it("is zero at night, in winter and without a moving hand", () => {
    assert.equal(flushChance({ weights: season("winter").weights, dayAmount: 1, handSpeed: 3 }), 0);
    assert.equal(flushChance({ weights: season("summer").weights, dayAmount: 0, handSpeed: 3 }), 0);
    assert.equal(flushChance({ weights: season("summer").weights, dayAmount: 1, handSpeed: 0 }), 0);
  });

  it("is highest in a summer day and smaller in spring and at dusk", () => {
    const summer = flushChance({ weights: season("summer").weights, dayAmount: 1, handSpeed: 2 });
    const spring = flushChance({ weights: season("spring").weights, dayAmount: 1, handSpeed: 2 });
    const dusk = flushChance({ weights: season("summer").weights, dayAmount: 0.4, handSpeed: 2 });
    assert.ok(summer > 0);
    assert.ok(spring > 0 && spring < summer);
    assert.ok(dusk > 0 && dusk < summer);
  });
});

describe("stepInsects", () => {
  it("never flushes without the hand in the grass", () => {
    const state = createMeadowInsects({ random: seeded(), max: 8 });
    for (let i = 0; i < 600; i += 1) {
      stepInsects(state, 1 / 60, env({ touch: { x: i * 0.01, z: -4, strength: 0 } }));
    }
    assert.equal(state.insects.length, 0);
  });

  it("never flushes in winter or at night", () => {
    assert.equal(everSpawns({ season: season("winter") }), 0);
    assert.equal(everSpawns({ dayAmount: 0 }), 0);
  });

  it("flushes grasshoppers near the moving hand in summer", () => {
    const state = createMeadowInsects({ random: seeded(), max: 8 });
    let hand;
    for (let i = 0; i < 600 && state.insects.length === 0; i += 1) {
      hand = { x: Math.sin(i * 0.05) * 3, z: -4, strength: 1 };
      stepInsects(state, 1 / 60, env({ touch: hand }));
    }
    assert.ok(state.insects.length >= 1 && state.insects.length <= 3);
    for (const bug of state.insects) {
      const d = Math.hypot(bug.x - hand.x, bug.z - hand.z);
      assert.ok(d >= 0.4 && d <= 2.7, `distance ${d}`);
    }
  });

  it("hops away from the hand, upward, at a ballistic launch speed", () => {
    const state = createMeadowInsects({ random: seeded(), max: 8 });
    let hand;
    for (let i = 0; i < 600 && state.insects.length === 0; i += 1) {
      hand = { x: Math.sin(i * 0.05) * 3, z: -4, strength: 1 };
      stepInsects(state, 1 / 60, env({ touch: hand }));
    }
    for (const bug of state.insects) {
      const away = { x: bug.x - hand.x, z: bug.z - hand.z };
      assert.ok(bug.vx * away.x + bug.vz * away.z > 0);
      assert.ok(bug.vy > 0);
      const speed = Math.hypot(bug.vx, bug.vy, bug.vz);
      assert.ok(speed >= 2.5 && speed <= 4.0001, `speed ${speed}`);
      assert.ok(bug.airborne);
    }
  });

  it("lands on the terrain, hops at most twice more, then hides", () => {
    const state = createMeadowInsects({ random: seeded(11), max: 8 });
    for (let i = 0; i < 6000 && state.insects.length === 0; i += 1) sweep(state, 1);
    assert.ok(state.insects.length > 0, "a grasshopper is flushed");
    const bug = state.insects[0];
    let landings = 0;
    let wasAirborne = bug.airborne;
    for (let i = 0; i < 60 * 10 && state.insects.includes(bug); i += 1) {
      stepInsects(state, 1 / 60, env({ touch: { x: 0, z: -4, strength: 0 } }));
      if (wasAirborne && !bug.airborne) {
        landings += 1;
        assert.ok(Math.abs(bug.y - terrainHeight(bug.x, bug.z)) < 1e-9);
      }
      if (bug.airborne) assert.ok(bug.y >= terrainHeight(bug.x, bug.z) - 1e-9);
      wasAirborne = bug.airborne;
    }
    assert.ok(!state.insects.includes(bug), "it hides eventually");
    assert.ok(landings >= 1 && landings <= 3, `landings ${landings}`);
  });

  it("respects max", () => {
    const state = createMeadowInsects({ random: seeded(5), max: 2 });
    for (let i = 0; i < 3000; i += 1) {
      sweep(state, 1);
      state.cooldown = 0;
      assert.ok(state.insects.length <= 2);
    }
  });

  it("waits out a cooldown after a flush", () => {
    const state = createMeadowInsects({ random: seeded(), max: 8 });
    for (let i = 0; i < 6000 && state.insects.length === 0; i += 1) sweep(state, 1);
    const first = state.insects.length;
    assert.ok(state.cooldown > 0);
    const frames = Math.floor(state.cooldown * 60) - 2;
    let spawnedAgain = false;
    for (let i = 0; i < frames; i += 1) {
      const before = state.flushes;
      sweep(state, 1);
      if (state.flushes !== before) spawnedAgain = true;
    }
    assert.equal(spawnedAgain, false);
    assert.ok(first >= 1);
  });

  it("moves slower under reduced motion", () => {
    const make = () => {
      const state = createMeadowInsects({ random: seeded(), max: 8 });
      sweepPhase = 0;
      for (let i = 0; i < 6000 && state.insects.length === 0; i += 1) sweep(state, 1);
      return state;
    };
    const fast = make();
    const slow = make();
    const a = { ...fast.insects[0] };
    stepInsects(fast, 0.1, env({ touch: { x: 0, z: 0, strength: 0 } }));
    stepInsects(slow, 0.1, env({ touch: { x: 0, z: 0, strength: 0 }, motionScale: 0.25 }));
    const df = Math.hypot(fast.insects[0].x - a.x, fast.insects[0].z - a.z);
    const ds = Math.hypot(slow.insects[0].x - a.x, slow.insects[0].z - a.z);
    assert.ok(ds < df * 0.5);
  });
});

describe("grasshopperCapacity", () => {
  it("scales with the quality tier", () => {
    assert.equal(grasshopperCapacity("low"), 4);
    assert.equal(grasshopperCapacity("mid"), 6);
    assert.equal(grasshopperCapacity("high"), 8);
  });
});
