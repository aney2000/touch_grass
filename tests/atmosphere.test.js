import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { atmosphereAt } from "../src/atmosphere.js";
import { hexToUnitRgb } from "../src/scene-math.js";
import { dayPalette, nightPalette } from "../src/config.js";
import { seasonBlendAt, seasonLook } from "../src/seasons.js";

const lookOf = (position) => seasonLook(seasonBlendAt(position));
const withoutGrass = ({ grassTip, grassBase, ...rest }) => (grassTip && grassBase ? rest : rest);
const warmth = ([r, , b]) => r - b;

describe("atmosphereAt with seasonal sky and light", () => {
  it("reproduces the classic atmosphere exactly in summer, at any time of day", () => {
    for (const amount of [0, 0.3, 0.6, 1]) {
      assert.deepEqual(
        withoutGrass(atmosphereAt(amount, lookOf(1))),
        withoutGrass(atmosphereAt(amount)),
      );
    }
  });

  it("publishes fog distances, the classic ones without a season", () => {
    assert.equal(atmosphereAt(0).fogNear, 45);
    assert.equal(atmosphereAt(0).fogFar, 320);
  });

  it("makes winter paler and colder, with a lower, weaker, cooler sun and closer haze", () => {
    const summer = atmosphereAt(0, lookOf(1));
    const winter = atmosphereAt(0, lookOf(3));
    assert.ok(warmth(winter.skyHorizon) < warmth(summer.skyHorizon));
    assert.ok(warmth(winter.sunColor) < warmth(summer.sunColor));
    assert.ok(winter.sunDirection[1] < summer.sunDirection[1]);
    assert.ok(winter.sunIntensity < summer.sunIntensity);
    assert.ok(winter.fogFar < summer.fogFar);
    const spread = (rgb) => Math.max(...rgb) - Math.min(...rgb);
    assert.ok(spread(winter.skyTop) < spread(summer.skyTop), "paler sky");
  });

  it("gives autumn a golden, hazy sky with a warm sun", () => {
    const summer = atmosphereAt(0, lookOf(1));
    const autumn = atmosphereAt(0, lookOf(2));
    assert.ok(warmth(autumn.skyHorizon) > warmth(summer.skyHorizon));
    assert.ok(warmth(autumn.sunColor) > warmth(summer.sunColor));
    assert.ok(autumn.fogFar < summer.fogFar);
  });

  it("keeps the sunDirection a unit vector under a seasonal offset", () => {
    assert.ok(close(length(atmosphereAt(0.2, lookOf(3)).sunDirection), 1));
  });

  it("keeps the fog the same colour as the horizon so hills melt into the sky", () => {
    const winter = atmosphereAt(0.4, lookOf(3));
    assert.deepEqual(winter.fog, winter.skyHorizon);
  });
});

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
    assert.ok(atmosphereAt(1).moonDirection[1] > 0.25);
    assert.ok(atmosphereAt(1).moonIntensity > 0);
  });

  it("hangs the night moon low enough to sit inside the camera's view", () => {
    const [x, y, z] = atmosphereAt(1).moonDirection;
    const elevationDegrees = (Math.asin(y) * 180) / Math.PI;
    const azimuthDegrees = (Math.atan2(x, -z) * 180) / Math.PI;
    assert.ok(elevationDegrees > 12 && elevationDegrees < 24);
    assert.ok(azimuthDegrees > 10 && azimuthDegrees < 32);
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

describe("atmosphereAt with a season look", () => {
  const winter = { grassTip: [0.8, 0.84, 0.82], grassBase: [0.5, 0.58, 0.53] };

  it("uses the season's grass colours as they are in full daylight", () => {
    const atmosphere = atmosphereAt(0, winter);
    assert.deepEqual(atmosphere.grassTip, winter.grassTip);
    assert.deepEqual(atmosphere.grassBase, winter.grassBase);
  });

  it("darkens the season's grass toward moonlit tones at night but keeps it distinct", () => {
    const night = atmosphereAt(1, winter);
    const plainNight = atmosphereAt(1);
    assert.ok(night.grassTip[0] < winter.grassTip[0]);
    assert.notDeepEqual(night.grassTip, plainNight.grassTip);
  });

  it("leaves every other colour untouched", () => {
    const { grassTip, grassBase, ...rest } = atmosphereAt(0.4, winter);
    const { grassTip: t, grassBase: b, ...plain } = atmosphereAt(0.4);
    assert.deepEqual(rest, plain);
    assert.ok(grassTip && grassBase && t && b);
  });
});
