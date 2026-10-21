import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fireflyAt } from "../src/scene-math.js";

const fly = { x: 50, y: 50, driftX: 10, driftY: 6, driftSpeed: 0.001, glowSpeed: 0.002, phase: 0 };

describe("fireflyAt", () => {
  it("pulses its glow strictly within 0..1", () => {
    for (let t = 0; t < 10000; t += 50) {
      const { glow } = fireflyAt(fly, t);
      assert.ok(glow >= 0 && glow <= 1);
    }
  });

  it("never drifts outside its wander radius", () => {
    for (let t = 0; t < 10000; t += 50) {
      const { x, y } = fireflyAt(fly, t);
      assert.ok(x >= fly.x - fly.driftX - 1e-9 && x <= fly.x + fly.driftX + 1e-9);
      assert.ok(y >= fly.y - fly.driftY - 1e-9 && y <= fly.y + fly.driftY + 1e-9);
    }
  });

  it("sits at a known phase-zero position", () => {
    const { x, y, glow } = fireflyAt(fly, 0);
    assert.ok(Math.abs(x - 50) < 1e-9); // sin(0) = 0
    assert.ok(Math.abs(y - 56) < 1e-9); // cos(0) = 1 -> +driftY
    assert.ok(Math.abs(glow - 0.5) < 1e-9); // (sin(0)+1)/2
  });
});
