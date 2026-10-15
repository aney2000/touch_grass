import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shootingStarAt } from "../src/scene-math.js";

// A horizontal streak so cos(angle) = 1, sin(angle) = 0 makes the maths easy to assert.
const star = { x: 0, y: 0, angle: 0, length: 100, bornAt: 1000, duration: 800 };

describe("shootingStarAt", () => {
  it("starts at its origin, invisible and not finished", () => {
    const state = shootingStarAt(star, 1000);
    assert.equal(state.progress, 0);
    assert.equal(state.x, 0);
    assert.equal(state.y, 0);
    assert.ok(state.opacity < 1e-9);
    assert.equal(state.done, false);
  });

  it("reaches peak brightness at the midpoint of its flight", () => {
    const state = shootingStarAt(star, 1400);
    assert.ok(Math.abs(state.progress - 0.5) < 1e-9);
    assert.ok(Math.abs(state.x - 50) < 1e-9);
    assert.ok(Math.abs(state.opacity - 1) < 1e-9);
  });

  it("finishes at the far end and reports done", () => {
    const state = shootingStarAt(star, 2000);
    assert.equal(state.progress, 1);
    assert.ok(Math.abs(state.x - 100) < 1e-9);
    assert.equal(state.done, true);
  });

  it("keeps opacity within [0, 1] across its whole life", () => {
    for (let t = 800; t <= 2200; t += 20) {
      const { opacity } = shootingStarAt(star, t);
      assert.ok(opacity >= 0 && opacity <= 1 + 1e-9);
    }
  });
});
