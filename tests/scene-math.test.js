import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clamp, randomGenerator, hexToRgb, mixHex, mixRgb, smoothstep } from "../src/scene-math.js";

describe("clamp", () => {
  it("returns the value when it is inside the range", () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  it("clamps to the lower and upper bounds", () => {
    assert.equal(clamp(-3, 0, 10), 0);
    assert.equal(clamp(42, 0, 10), 10);
  });
});

describe("randomGenerator", () => {
  it("is deterministic for the same seed", () => {
    const a = randomGenerator(741);
    const b = randomGenerator(741);
    assert.equal(a(), b());
    assert.equal(a(), b());
  });

  it("produces values within the [0, 1) range", () => {
    const next = randomGenerator(1);
    for (let i = 0; i < 1000; i += 1) {
      const value = next();
      assert.ok(value >= 0 && value < 1);
    }
  });

  it("diverges for different seeds", () => {
    assert.notEqual(randomGenerator(1)(), randomGenerator(2)());
  });
});

describe("hexToRgb", () => {
  it("parses a six-digit hex colour", () => {
    assert.deepEqual(hexToRgb("#ff8800"), [255, 136, 0]);
  });

  it("parses pure white and black", () => {
    assert.deepEqual(hexToRgb("#ffffff"), [255, 255, 255]);
    assert.deepEqual(hexToRgb("#000000"), [0, 0, 0]);
  });
});

describe("mixHex", () => {
  it("returns the first colour at amount 0", () => {
    assert.equal(mixHex("#000000", "#ffffff", 0), "rgb(0,0,0)");
  });

  it("returns the second colour at amount 1", () => {
    assert.equal(mixHex("#000000", "#ffffff", 1), "rgb(255,255,255)");
  });

  it("blends the midpoint", () => {
    assert.equal(mixHex("#000000", "#ffffff", 0.5), "rgb(128,128,128)");
  });
});

describe("mixRgb", () => {
  it("interpolates each channel independently", () => {
    assert.deepEqual(mixRgb([0, 0.5, 1], [1, 0.5, 0], 0.25), [0.25, 0.5, 0.75]);
  });

  it("returns a new array rather than mutating its inputs", () => {
    const first = [0, 0, 0];
    const mixed = mixRgb(first, [1, 1, 1], 1);
    assert.deepEqual(first, [0, 0, 0]);
    assert.deepEqual(mixed, [1, 1, 1]);
  });
});

describe("smoothstep", () => {
  it("is 0 at or below the lower edge", () => {
    assert.equal(smoothstep(0.2, 0.8, 0.2), 0);
    assert.equal(smoothstep(0.2, 0.8, 0), 0);
  });

  it("is 1 at or above the upper edge", () => {
    assert.equal(smoothstep(0.2, 0.8, 0.8), 1);
    assert.equal(smoothstep(0.2, 0.8, 1), 1);
  });

  it("eases through 0.5 at the midpoint", () => {
    assert.ok(Math.abs(smoothstep(0, 1, 0.5) - 0.5) < 1e-10);
  });
});
