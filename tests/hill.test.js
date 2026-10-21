import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cubicBezier, highestPoint } from "../src/scene-math.js";

describe("cubicBezier", () => {
  it("returns the first control point at t = 0", () => {
    assert.equal(cubicBezier(0, 10, 20, 30, 0), 0);
  });

  it("returns the last control point at t = 1", () => {
    assert.equal(cubicBezier(0, 10, 20, 30, 1), 30);
  });

  it("is linear when control points are evenly spaced", () => {
    assert.ok(Math.abs(cubicBezier(0, 10, 20, 30, 0.5) - 15) < 1e-9);
  });
});

describe("highestPoint", () => {
  it("returns the point with the smallest y (visually highest)", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 1, y: 4 },
      { x: 2, y: 7 },
    ];
    assert.deepEqual(highestPoint(points), { x: 1, y: 4 });
  });

  it("keeps the first point when several share the minimum", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
    ];
    assert.deepEqual(highestPoint(points), { x: 0, y: 5 });
  });
});
