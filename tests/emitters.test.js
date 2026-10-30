import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canopyEmitters,
  canopySpawner,
  skySpawner,
  PER_TREE_RATE,
  DRIFT_FACTOR,
} from "../src/emitters.js";
import { randomGenerator } from "../src/scene-math.js";

const CANOPIES = [
  { x: 10, y: 6, z: -60, radius: 2, species: "deciduous" },
  { x: -20, y: 5, z: -90, radius: 1.7, species: "conifer" },
  { x: 30, y: 7, z: -110, radius: 3, species: "deciduous" },
];
const particle = () => ({});

describe("canopyEmitters", () => {
  it("keeps only deciduous canopies (conifers don't shed)", () => {
    const emitters = canopyEmitters(CANOPIES);
    assert.equal(emitters.length, 2);
    assert.deepEqual(
      emitters.map((e) => [e.x, e.z, e.radius]),
      [
        [10, -60, 2],
        [30, -110, 3],
      ],
    );
    for (const e of emitters) assert.ok(e.weight > 0);
  });

  it("returns nothing for no canopies", () => {
    assert.deepEqual(canopyEmitters([]), []);
    assert.deepEqual(canopyEmitters(undefined), []);
  });
});

describe("canopySpawner", () => {
  it("scales its rate with the tree count, bounded per tree", () => {
    const one = canopySpawner(canopyEmitters(CANOPIES.slice(0, 1)));
    const two = canopySpawner(canopyEmitters(CANOPIES));
    assert.equal(one.perSecond(1), PER_TREE_RATE);
    assert.equal(two.perSecond(1), PER_TREE_RATE * 2);
    assert.ok(PER_TREE_RATE <= 1.2);
    assert.equal(canopySpawner([]).perSecond(1), 0);
  });

  it("places particles inside or under a canopy and keeps them in its zone", () => {
    const emitters = canopyEmitters(CANOPIES);
    const spawner = canopySpawner(emitters);
    const random = randomGenerator(3);
    for (let i = 0; i < 200; i += 1) {
      const p = particle();
      spawner.place(p, random);
      const home = emitters.find((e) => Math.hypot(e.x - p.x, e.z - p.z) <= e.radius);
      assert.ok(home, `spawned at ${p.x},${p.z}`);
      assert.ok(p.y <= home.y + home.radius && p.y >= home.y - home.radius);
      assert.equal(spawner.contains(p), true);
      p.x = home.x + home.radius * (DRIFT_FACTOR + 0.5);
      assert.equal(spawner.contains(p), false);
    }
  });
});

describe("skySpawner", () => {
  it("places particles uniformly inside its volume", () => {
    const area = { xMin: -5, xMax: 5, zMin: -10, zMax: 0, yMax: 20 };
    const spawner = skySpawner(area, { perSecond: 10 });
    assert.equal(spawner.perSecond(0.5), 5);
    const random = randomGenerator(1);
    for (let i = 0; i < 100; i += 1) {
      const p = particle();
      spawner.place(p, random);
      assert.ok(p.x >= -5 && p.x <= 5 && p.z >= -10 && p.z <= 0 && p.y <= 20);
      assert.equal(spawner.contains(p), true);
    }
    assert.equal(spawner.contains({ x: 6, z: -1 }), false);
  });
});
