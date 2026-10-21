import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMeteorShower } from "../../src/three/meteors.js";
import { atmosphereAt } from "../../src/atmosphere.js";

function runNight(shower, { dayAmount = 1, motionScale = 1, step = 100 } = {}) {
  let peak = 0;
  for (let now = 0; now < 30000; now += step) {
    shower.update({ now, atmosphere: atmosphereAt(dayAmount), motionScale });
    peak = Math.max(peak, shower.active.length);
  }
  return peak;
}

describe("createMeteorShower", () => {
  it("never spawns meteors in daylight", () => {
    assert.equal(runNight(createMeteorShower({ random: () => 0.5 }), { dayAmount: 0 }), 0);
  });

  it("streaks meteors across a dark sky, then retires them", () => {
    const shower = createMeteorShower({ random: () => 0.5 });
    assert.ok(runNight(shower, { step: 50 }) >= 1);
    assert.ok(shower.active.length <= 1);
  });

  it("respects reduced motion", () => {
    assert.equal(runNight(createMeteorShower({ random: () => 0.5 }), { motionScale: 0.25 }), 0);
  });
});
