import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { twilightAmount } from "../src/scene-math.js";

describe("twilightAmount", () => {
  it("is 0 in full daylight", () => {
    assert.ok(Math.abs(twilightAmount(0)) < 1e-9);
  });

  it("is 0 in full night", () => {
    assert.ok(Math.abs(twilightAmount(1)) < 1e-9);
  });

  it("peaks at the midpoint of the transition", () => {
    assert.ok(Math.abs(twilightAmount(0.5) - 1) < 1e-9);
  });

  it("is symmetric around the midpoint (sunrise mirrors sunset)", () => {
    assert.ok(Math.abs(twilightAmount(0.25) - twilightAmount(0.75)) < 1e-9);
  });

  it("stays within [0, 1] across the whole transition", () => {
    for (let d = 0; d <= 1.0001; d += 0.02) {
      const value = twilightAmount(d);
      assert.ok(value >= 0 && value <= 1 + 1e-9);
    }
  });
});
