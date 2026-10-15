import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createSceneObjects,
  createField,
  addGust,
  pruneGusts,
} from "../src/scene-objects.js";
import { randomGenerator } from "../src/scene-math.js";
import { COUNTS } from "../src/config.js";

describe("createSceneObjects", () => {
  it("is deterministic for a given seed and size", () => {
    const a = createSceneObjects(800, 600, 123);
    const b = createSceneObjects(800, 600, 123);
    assert.deepEqual(a, b);
  });

  it("produces the configured star and firefly counts", () => {
    const { stars, fireflies } = createSceneObjects(800, 600);
    assert.equal(stars.length, COUNTS.stars);
    assert.equal(fireflies.length, COUNTS.fireflies);
  });

  it("keeps grass blades within the canvas width", () => {
    const { field } = createSceneObjects(400, 600);
    for (const blade of field) {
      assert.ok(blade.x >= 0 && blade.x <= 400);
    }
  });
});

describe("createField", () => {
  it("caps the blade count regardless of width", () => {
    const field = createField(randomGenerator(1), 100000);
    assert.equal(field.length, COUNTS.maxGrass);
  });

  it("gives each blade a day and night colour", () => {
    const field = createField(randomGenerator(1), 300);
    for (const blade of field) {
      assert.match(blade.dayColor, /^#[0-9a-f]{6}$/i);
      assert.match(blade.nightColor, /^#[0-9a-f]{6}$/i);
    }
  });
});

describe("addGust", () => {
  it("appends a gust carrying its origin and timing", () => {
    const gusts = [];
    addGust(gusts, { x: 10, y: 20 }, 1, 0.5, 1000);
    assert.deepEqual(gusts[0], { x: 10, y: 20, direction: 1, strength: 0.5, startedAt: 1000 });
  });

  it("never grows past the gust limit", () => {
    const gusts = [];
    for (let i = 0; i < 20; i += 1) addGust(gusts, { x: i, y: 0 }, 1, 0.5, i);
    assert.ok(gusts.length <= 7);
    assert.equal(gusts.at(-1).x, 19);
  });
});

describe("pruneGusts", () => {
  it("removes gusts older than the max age", () => {
    const gusts = [{ startedAt: 0 }, { startedAt: 1000 }, { startedAt: 2000 }];
    pruneGusts(gusts, 2500, 1000);
    assert.deepEqual(
      gusts.map((g) => g.startedAt),
      [2000],
    );
  });

  it("keeps gusts still within the window", () => {
    const gusts = [{ startedAt: 2000 }];
    pruneGusts(gusts, 2100, 1000);
    assert.equal(gusts.length, 1);
  });
});
