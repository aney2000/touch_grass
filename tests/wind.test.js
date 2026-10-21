import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addGust,
  pruneGusts,
  gustUniforms,
  followTouch,
  GUST_LIMIT,
  GUST_MAX_AGE_MS,
} from "../src/wind.js";

describe("addGust", () => {
  it("records a world-space gust with its timing", () => {
    const gusts = [];
    addGust(gusts, { x: 1, z: -2 }, 0.7, 500);
    assert.deepEqual(gusts, [{ x: 1, z: -2, strength: 0.7, startedAt: 500 }]);
  });

  it("keeps only the most recent gusts", () => {
    const gusts = [];
    for (let i = 0; i < GUST_LIMIT + 5; i += 1) addGust(gusts, { x: i, z: 0 }, 1, i);
    assert.equal(gusts.length, GUST_LIMIT);
    assert.equal(gusts.at(-1).x, GUST_LIMIT + 4);
  });
});

describe("pruneGusts", () => {
  it("drops gusts that have outlived their ripple", () => {
    const gusts = [{ startedAt: 0 }, { startedAt: 5000 }];
    pruneGusts(gusts, GUST_MAX_AGE_MS + 1);
    assert.deepEqual(gusts, [{ startedAt: 5000 }]);
  });
});

describe("gustUniforms", () => {
  it("packs each gust as x, z, age in seconds, and strength", () => {
    const data = gustUniforms([{ x: 2, z: -3, strength: 0.5, startedAt: 1000 }], 3000);
    assert.deepEqual(Array.from(data.slice(0, 4)), [2, -3, 2, 0.5]);
  });

  it("pads unused slots with zero-strength gusts so the shader array is always full", () => {
    const data = gustUniforms([], 0);
    assert.equal(data.length, GUST_LIMIT * 4);
    assert.ok(data.every((value) => value === 0));
  });
});

describe("followTouch", () => {
  it("eases the touch strength toward its target", () => {
    const next = followTouch({ x: 0, z: 0, strength: 0 }, { x: 4, z: 2, active: true }, 16);
    assert.ok(next.strength > 0 && next.strength < 1);
  });

  it("jumps to a new position while touching so the grass parts under the cursor", () => {
    const next = followTouch({ x: 0, z: 0, strength: 0.5 }, { x: 4, z: 2, active: true }, 16);
    assert.equal(next.x, 4);
    assert.equal(next.z, 2);
  });

  it("releases smoothly and keeps the last position when the pointer leaves", () => {
    const next = followTouch({ x: 4, z: 2, strength: 1 }, { active: false }, 16);
    assert.ok(next.strength < 1 && next.strength > 0);
    assert.equal(next.x, 4);
  });

  it("settles fully given enough time", () => {
    let state = { x: 0, z: 0, strength: 0 };
    for (let i = 0; i < 200; i += 1) state = followTouch(state, { x: 0, z: 0, active: true }, 16);
    assert.ok(state.strength > 0.999);
  });
});
