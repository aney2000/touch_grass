import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMeteorShower } from "../../src/three/meteors.js";
import { atmosphereAt } from "../../src/atmosphere.js";

function runNight(shower, { dayAmount = 1, motionScale = 1, step = 100 } = {}) {
  let peak = 0;
  for (let now = 0; now < 60000; now += step) {
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

  function spawnTimes(random, { nightAt = 0, until = 200_000 } = {}) {
    const shower = createMeteorShower({ random });
    const times = [];
    let seen = 0;
    for (let now = 0; now < until; now += 100) {
      const dayAmount = now < nightAt ? 0 : 1;
      shower.update({ now, atmosphere: atmosphereAt(dayAmount) });
      if (shower.active.length > seen) times.push(now);
      seen = shower.active.length;
    }
    return times;
  }

  it("lets the eye adjust: the first meteor comes about 6 s after night falls", () => {
    const [first] = spawnTimes(() => 0.5, { nightAt: 10_000 });
    assert.ok(first >= 15_500 && first <= 16_500, `first meteor at ${first}`);
  });

  it("keeps meteors rare: 15 to 40 s apart", () => {
    for (const random of [() => 0, () => 0.999]) {
      const times = spawnTimes(random);
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      assert.ok(gaps.length >= 3);
      for (const gap of gaps) assert.ok(gap >= 15_000 && gap <= 40_100, `gap ${gap}`);
    }
  });

  it("respects reduced motion", () => {
    assert.equal(runNight(createMeteorShower({ random: () => 0.5 }), { motionScale: 0.25 }), 0);
  });
});
