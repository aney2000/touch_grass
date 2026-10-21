import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { atmosphereAt } from "../src/atmosphere.js";
import { hexToUnitRgb } from "../src/scene-math.js";
import { dayPalette, nightPalette } from "../src/config.js";

const length = ([x, y, z]) => Math.hypot(x, y, z);
const close = (a, b, epsilon = 1e-9) => Math.abs(a - b) < epsilon;

describe("hexToUnitRgb", () => {
  it("maps hex channels onto the 0..1 range", () => {
    assert.deepEqual(hexToUnitRgb("#ff0000"), [1, 0, 0]);
    assert.deepEqual(hexToUnitRgb("#000000"), [0, 0, 0]);
  });
});

describe("atmosphereAt", () => {
  it("paints the Bliss day sky at full daylight", () => {
    const day = atmosphereAt(0);
    assert.deepEqual(day.skyTop, hexToUnitRgb(dayPalette.skyTop));
    assert.deepEqual(day.skyHorizon, hexToUnitRgb(dayPalette.horizon));
  });

  it("paints the night sky at full night", () => {
    const night = atmosphereAt(1);
    assert.deepEqual(night.skyTop, hexToUnitRgb(nightPalette.skyTop));
    assert.deepEqual(night.skyHorizon, hexToUnitRgb(nightPalette.horizon));
  });

  it("hides stars and fireflies by day and reveals them by night", () => {
    assert.equal(atmosphereAt(0).starVisibility, 0);
    assert.equal(atmosphereAt(0).fireflyVisibility, 0);
    assert.equal(atmosphereAt(1).starVisibility, 1);
    assert.equal(atmosphereAt(1).fireflyVisibility, 1);
  });

  it("keeps the sun high by day and sets it below the horizon at night", () => {
    assert.ok(atmosphereAt(0).sunDirection[1] > 0.4);
    assert.ok(atmosphereAt(1).sunDirection[1] < 0);
    assert.equal(atmosphereAt(1).sunIntensity, 0);
  });

  it("raises the moon as night falls", () => {
    assert.equal(atmosphereAt(0).moonIntensity, 0);
    assert.ok(atmosphereAt(1).moonDirection[1] > 0.4);
    assert.ok(atmosphereAt(1).moonIntensity > 0);
  });

  it("returns unit-length light directions", () => {
    for (const amount of [0, 0.25, 0.5, 0.75, 1]) {
      const state = atmosphereAt(amount);
      assert.ok(close(length(state.sunDirection), 1));
      assert.ok(close(length(state.moonDirection), 1));
    }
  });

  it("peaks the sunset warmth mid-transition and warms the horizon", () => {
    const dusk = atmosphereAt(0.5);
    assert.ok(close(dusk.twilight, 1));
    const [r, , b] = dusk.skyHorizon;
    assert.ok(r > b, "the horizon should glow warm at dusk");
  });

  it("dims the ambient light steadily toward night", () => {
    let previous = Infinity;
    for (let amount = 0; amount <= 1; amount += 0.1) {
      const { ambientIntensity } = atmosphereAt(amount);
      assert.ok(ambientIntensity <= previous);
      previous = ambientIntensity;
    }
    assert.ok(atmosphereAt(1).ambientIntensity > 0, "night should never be pitch black");
  });

  it("matches the fog to the horizon so the hills melt into the sky", () => {
    const state = atmosphereAt(0.3);
    assert.deepEqual(state.fog, state.skyHorizon);
  });

  it("blooms only the sun by day but lets night glows bloom generously", () => {
    const day = atmosphereAt(0);
    const night = atmosphereAt(1);
    assert.ok(day.bloomThreshold > night.bloomThreshold);
    assert.ok(night.bloomStrength > day.bloomStrength);
    assert.ok(day.bloomThreshold >= 0.9, "a bright Bliss sky must not haze over");
  });

  it("keeps the exposure positive throughout the transition", () => {
    for (let amount = 0; amount <= 1; amount += 0.1) {
      assert.ok(atmosphereAt(amount).exposure > 0);
    }
  });

  it("clamps out-of-range input", () => {
    assert.deepEqual(atmosphereAt(-2), atmosphereAt(0));
    assert.deepEqual(atmosphereAt(3), atmosphereAt(1));
  });
});
