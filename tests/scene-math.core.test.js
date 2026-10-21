import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clamp, smoothstep, hexToRgb, mixHex, randomGenerator } from "../src/scene-math.js";

describe("clamp", () => {
  it("passes values already in range through unchanged", () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  it("clamps to the bounds", () => {
    assert.equal(clamp(-3, 0, 10), 0);
    assert.equal(clamp(42, 0, 10), 10);
  });
});

describe("smoothstep", () => {
  it("is 0 at or below the lower edge", () => {
    assert.equal(smoothstep(0, 1, 0), 0);
    assert.equal(smoothstep(0, 1, -1), 0);
  });

  it("is 1 at or above the upper edge", () => {
    assert.equal(smoothstep(0, 1, 1), 1);
    assert.equal(smoothstep(0, 1, 2), 1);
  });

  it("eases symmetrically to 0.5 at the midpoint", () => {
    assert.ok(Math.abs(smoothstep(0, 1, 0.5) - 0.5) < 1e-9);
  });
});

describe("hexToRgb", () => {
  it("splits a hex colour into channel values", () => {
    assert.deepEqual(hexToRgb("#ffffff"), [255, 255, 255]);
    assert.deepEqual(hexToRgb("#000000"), [0, 0, 0]);
    assert.deepEqual(hexToRgb("#4e9c4d"), [78, 156, 77]);
  });
});

describe("mixHex", () => {
  it("returns the first colour at amount 0", () => {
    assert.equal(mixHex("#000000", "#ffffff", 0), "rgb(0,0,0)");
  });

  it("returns the second colour at amount 1", () => {
    assert.equal(mixHex("#000000", "#ffffff", 1), "rgb(255,255,255)");
  });

  it("blends halfway at amount 0.5", () => {
    assert.equal(mixHex("#000000", "#ffffff", 0.5), "rgb(128,128,128)");
  });
});

describe("randomGenerator", () => {
  it("is deterministic for a given seed", () => {
    const a = randomGenerator(99);
    const b = randomGenerator(99);
    for (let i = 0; i < 20; i += 1) assert.equal(a(), b());
  });

  it("produces values within [0, 1)", () => {
    const random = randomGenerator(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      assert.ok(value >= 0 && value < 1);
    }
  });
});
