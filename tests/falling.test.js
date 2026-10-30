import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createFallingField as createField,
  stepFalling,
  fallingSpawners,
  SNOW_AREA,
} from "../src/falling.js";
import { terrainHeight } from "../src/terrain.js";
import { SEASON_LOOKS } from "../src/config.js";
import { DRIFT_FACTOR, PER_TREE_RATE } from "../src/emitters.js";

// A small grove: plenty of deciduous canopies so leaf/petal tests have emitters.
const CANOPIES = Array.from({ length: 40 }, (_, i) => {
  const x = -30 + (i % 10) * 7;
  const z = -50 - Math.floor(i / 10) * 12;
  const species = i % 5 === 4 ? "conifer" : "deciduous";
  return { x, y: terrainHeight(x, z) + 5, z, radius: 2.2, species };
});
const createFallingField = (options) =>
  createField({ spawners: fallingSpawners({ canopies: CANOPIES }), ...options });

const NONE = { petals: 0, leaves: 0, snow: 0 };
const run = (field, seconds, options, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) stepFalling(field, dt, options);
  return field;
};
const alive = (field) => field.particles.filter((p) => p.alive);

describe("falling particles", () => {
  it("is deterministic for a seed", () => {
    const opts = { rates: { petals: 0.5, leaves: 0.5, snow: 0.5 } };
    const a = run(createFallingField({ seed: 4, capacity: 80 }), 3, opts);
    const b = run(createFallingField({ seed: 4, capacity: 80 }), 3, opts);
    assert.deepEqual(a.particles, b.particles);
  });

  it("spawns nothing at zero rates, yet lets existing particles finish falling", () => {
    const empty = run(createFallingField({ seed: 1, capacity: 50 }), 2, { rates: NONE });
    assert.equal(alive(empty).length, 0);

    const field = run(createFallingField({ seed: 1, capacity: 50 }), 1, {
      rates: { ...NONE, snow: 1 },
    });
    const count = alive(field).length;
    assert.ok(count > 0);
    stepFalling(field, 1 / 30, { rates: NONE });
    assert.ok(alive(field).length > 0 && alive(field).length <= count);
    run(field, 60, { rates: NONE });
    assert.equal(alive(field).length, 0);
  });

  it("spawns kinds in proportion to their rates", () => {
    const field = run(createFallingField({ seed: 9, capacity: 600 }), 4, {
      rates: { petals: 0.2, leaves: 0.6, snow: 0 },
    });
    const kinds = alive(field).map((p) => p.kind);
    const leaves = kinds.filter((k) => k === "leaves").length;
    const petals = kinds.filter((k) => k === "petals").length;
    assert.equal(kinds.filter((k) => k === "snow").length, 0);
    assert.ok(leaves > petals * 1.8, `${leaves} leaves vs ${petals} petals`);
  });

  it("gives each particle its kind's colour palette and a spin", () => {
    const field = run(createFallingField({ seed: 2, capacity: 300 }), 2, {
      rates: { petals: 0.5, leaves: 0.5, snow: 0.5 },
    });
    for (const p of alive(field)) {
      assert.equal(p.color.length, 3);
      if (p.kind === "snow") assert.ok(p.color.every((c) => c > 0.9));
      if (p.kind === "leaves") assert.ok(p.color[0] > p.color[2]);
      if (p.kind === "petals") assert.ok(p.color[0] > 0.9);
      assert.ok(Number.isFinite(p.spin));
    }
  });

  it("falls over time and recycles below ground", () => {
    const field = run(createFallingField({ seed: 3, capacity: 40 }), 0.5, {
      rates: { ...NONE, leaves: 1 },
    });
    const p = alive(field)[0];
    const y = p.y;
    stepFalling(field, 0.2, { rates: NONE });
    assert.ok(p.y < y);
    p.y = terrainHeight(p.x, p.z) - 0.1;
    run(field, 3, { rates: NONE });
    assert.equal(p.alive, false);
  });

  it("keeps snow within its sky-wide volume", () => {
    const field = run(createFallingField({ seed: 5, capacity: 200 }), 5, {
      rates: { ...NONE, snow: 1 },
    });
    for (const p of alive(field)) {
      assert.ok(p.x >= SNOW_AREA.xMin && p.x <= SNOW_AREA.xMax);
      assert.ok(p.z <= SNOW_AREA.zMax && p.z >= SNOW_AREA.zMin);
      assert.ok(p.y <= SNOW_AREA.yMax);
    }
  });

  it("keeps leaves and petals in the drift zone of a deciduous tree", () => {
    const field = run(createFallingField({ seed: 5, capacity: 400 }), 8, {
      rates: { petals: 1, leaves: 1, snow: 0 },
      wind: { gusts: new Float32Array([-30, -50, 0.1, 1]) },
    });
    const deciduous = CANOPIES.filter((c) => c.species === "deciduous");
    assert.ok(field.aliveCount > 0);
    for (const p of alive(field)) {
      const near = deciduous.some(
        (c) => Math.hypot(c.x - p.x, c.z - p.z) <= c.radius * DRIFT_FACTOR + 1e-9,
      );
      assert.ok(near, `${p.kind} at ${p.x},${p.z}`);
    }
  });

  it("sheds no leaves without deciduous trees", () => {
    const conifers = CANOPIES.map((c) => ({ ...c, species: "conifer" }));
    const field = run(
      createField({ seed: 1, capacity: 100, spawners: fallingSpawners({ canopies: conifers }) }),
      3,
      { rates: { petals: 1, leaves: 1, snow: 0 } },
    );
    assert.equal(field.aliveCount, 0);
  });

  it("bounds the emission per tree so totals scale with the forest", () => {
    const count = (canopies) => {
      const field = createField({
        seed: 2,
        capacity: 2000,
        spawners: fallingSpawners({ canopies }),
      });
      for (let i = 0; i < 30; i += 1) stepFalling(field, 1 / 30, { rates: { ...NONE, leaves: 1 } });
      return field.spawned.leaves;
    };
    const few = count(CANOPIES.slice(0, 4));
    const many = count(CANOPIES);
    assert.ok(few <= 4 * PER_TREE_RATE + 1, `${few}`);
    assert.ok(many > few * 5, `${many} vs ${few}`);
  });

  it("stays empty all summer", () => {
    assert.deepEqual({ ...SEASON_LOOKS.summer.particleRates }, NONE);
    const field = run(createFallingField({ seed: 1, capacity: 100 }), 3, {
      rates: SEASON_LOOKS.summer.particleRates,
    });
    assert.equal(field.aliveCount, 0);
  });

  it("caps each kind at its own limit", () => {
    const field = run(createFallingField({ seed: 1, capacity: 300, limits: { snow: 20 } }), 4, {
      rates: { ...NONE, snow: 1 },
    });
    assert.equal(field.aliveCount, 20);
  });

  it("lets a landed leaf lie briefly on the ground, fading, before recycling", () => {
    const field = run(createFallingField({ seed: 3, capacity: 40 }), 0.5, {
      rates: { ...NONE, leaves: 1 },
    });
    const p = alive(field)[0];
    p.y = terrainHeight(p.x, p.z) - 0.1;
    stepFalling(field, 0.05, { rates: NONE });
    assert.equal(p.alive, true);
    assert.ok(Math.abs(p.y - terrainHeight(p.x, p.z)) < 0.05);
    stepFalling(field, 0.5, { rates: NONE });
    assert.ok(p.fade < 1 && p.fade > 0);
    const x = p.x;
    stepFalling(field, 0.3, { rates: NONE });
    assert.equal(p.x, x);
    stepFalling(field, 1.2, { rates: NONE });
    assert.equal(p.alive, false);
  });

  it("slows with reduced motion", () => {
    const make = () =>
      run(createFallingField({ seed: 6, capacity: 30 }), 0.4, { rates: { ...NONE, snow: 1 } });
    const fast = make();
    const slow = make();
    const before = alive(fast)[0].y;
    stepFalling(fast, 0.5, { rates: NONE, motionScale: 1 });
    stepFalling(slow, 0.5, { rates: NONE, motionScale: 0.25 });
    assert.ok(before - alive(slow)[0].y < before - alive(fast)[0].y);
  });

  it("is pushed sideways by a gust", () => {
    const make = () =>
      run(createFallingField({ seed: 8, capacity: 30 }), 0.4, { rates: { ...NONE, snow: 1 } });
    const calm = make();
    const gusty = make();
    const p = alive(gusty)[0];
    const gusts = new Float32Array([p.x - 3, p.z, 0.2, 1]);
    stepFalling(calm, 0.3, { rates: NONE });
    stepFalling(gusty, 0.3, { rates: NONE, wind: { gusts } });
    assert.ok(alive(gusty)[0].x > alive(calm)[0].x);
  });
});

describe("falling particles idle cost", () => {
  it("leaves an empty field untouched at zero rates (early return)", () => {
    const field = createFallingField({ seed: 1, capacity: 20 });
    const before = JSON.stringify(field);
    stepFalling(field, 1 / 30, { rates: NONE });
    assert.equal(JSON.stringify(field), before);
    assert.equal(field.aliveCount, 0);
  });

  it("tracks how many particles are alive", () => {
    const field = run(createFallingField({ seed: 1, capacity: 50 }), 0.5, {
      rates: { ...NONE, snow: 1 },
    });
    assert.equal(field.aliveCount, alive(field).length);
    assert.ok(field.aliveCount > 0);
  });

  it("reuses particle rotation and colour arrays when respawning", () => {
    const field = createFallingField({ seed: 1, capacity: 5 });
    const { rotation, color } = field.particles[0];
    stepFalling(field, 0.1, { rates: { ...NONE, leaves: 1 } });
    assert.notDeepEqual(rotation, [0, 0, 0]);
    assert.equal(field.particles[0].rotation, rotation);
    assert.equal(field.particles[0].color, color);
  });
});
