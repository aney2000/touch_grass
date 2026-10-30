import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Scene } from "../src/scene.js";
import { atmosphereAt } from "../src/atmosphere.js";
import { seasonBlendAt, seasonLook, seasonLookDuring } from "../src/seasons.js";
import {
  DAY_NIGHT_MS,
  REDUCED_MOTION_DAY_NIGHT_MS,
  COUNTS,
  SEASON_MS,
  REDUCED_MOTION_SEASON_MS,
} from "../src/config.js";

function settle(scene, from, duration) {
  for (let now = from; now <= from + duration + 100; now += 16) scene.advance(now);
}

describe("Scene", () => {
  it("starts in full daylight", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.equal(scene.dayAmount, 0);
    assert.equal(scene.isNight, false);
    assert.deepEqual(scene.frame().atmosphere, atmosphereAt(0));
  });

  it("eases into night over the same transition length as before", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.equal(scene.toggleNight(0), 1);
    scene.advance(DAY_NIGHT_MS / 2);
    assert.ok(scene.dayAmount > 0.3 && scene.dayAmount < 0.7);
    settle(scene, DAY_NIGHT_MS / 2, DAY_NIGHT_MS);
    assert.equal(scene.dayAmount, 1);
    assert.equal(scene.isNight, true);
  });

  it("uses the quicker transition when reduced motion is preferred", () => {
    const scene = new Scene({ prefersReducedMotion: true });
    scene.toggleNight(0);
    scene.advance(REDUCED_MOTION_DAY_NIGHT_MS);
    assert.equal(scene.dayAmount, 1);
    assert.equal(scene.frame().motionScale < 1, true);
  });

  describe("clock", () => {
    it("reads noon while resting in daylight", () => {
      const scene = new Scene();
      scene.advance(0);
      assert.deepEqual(scene.clock(), { hours12: 12, minutes: "00", meridiem: "PM" });
    });

    it("runs through the evening while night falls", () => {
      const scene = new Scene();
      scene.advance(0);
      scene.toggleNight(0);
      scene.advance(DAY_NIGHT_MS / 2);
      assert.equal(scene.clock().meridiem, "PM");
      assert.ok(scene.clock().hours12 >= 4 && scene.clock().hours12 <= 8);
    });

    it("reads midnight once night has settled", () => {
      const scene = new Scene();
      scene.toggleNight(0);
      settle(scene, 0, DAY_NIGHT_MS);
      assert.deepEqual(scene.clock(), { hours12: 12, minutes: "00", meridiem: "AM" });
    });

    it("runs through the morning while day returns", () => {
      const scene = new Scene();
      scene.toggleNight(0);
      settle(scene, 0, DAY_NIGHT_MS);
      const start = DAY_NIGHT_MS + 200;
      scene.toggleNight(start);
      scene.advance(start + DAY_NIGHT_MS / 2);
      assert.equal(scene.clock().meridiem, "AM");
      assert.ok(scene.clock().hours12 >= 4 && scene.clock().hours12 <= 8);
    });

    it("runs the evening backwards when day is recalled mid-dusk, never jumping to the morning", () => {
      const scene = new Scene();
      scene.advance(0);
      scene.toggleNight(0);
      scene.advance(DAY_NIGHT_MS / 2);
      const evening = scene.clock();
      scene.toggleNight(DAY_NIGHT_MS / 2);
      scene.advance(DAY_NIGHT_MS / 2 + DAY_NIGHT_MS / 4);
      const earlier = scene.clock();
      assert.equal(evening.meridiem, "PM");
      assert.equal(earlier.meridiem, "PM");
      assert.ok(earlier.hours12 % 12 < evening.hours12 % 12, "the clock rewinds toward noon");
      settle(scene, DAY_NIGHT_MS, DAY_NIGHT_MS);
      assert.deepEqual(scene.clock(), { hours12: 12, minutes: "00", meridiem: "PM" });
    });

    it("crosses the morning on the next full cycle after a reversed dusk", () => {
      const scene = new Scene();
      scene.toggleNight(0);
      scene.advance(DAY_NIGHT_MS / 2);
      scene.toggleNight(DAY_NIGHT_MS / 2);
      settle(scene, DAY_NIGHT_MS / 2, DAY_NIGHT_MS);
      const night = 3 * DAY_NIGHT_MS;
      scene.toggleNight(night);
      settle(scene, night, DAY_NIGHT_MS);
      assert.deepEqual(scene.clock(), { hours12: 12, minutes: "00", meridiem: "AM" });
      const morning = 5 * DAY_NIGHT_MS;
      scene.toggleNight(morning);
      scene.advance(morning + DAY_NIGHT_MS / 2);
      assert.equal(scene.clock().meridiem, "AM");
    });
  });

  it("accumulates elapsed seconds with a capped frame delta", () => {
    const scene = new Scene();
    scene.advance(1000);
    scene.advance(1016);
    scene.advance(60_000);
    const { seconds } = scene.frame();
    assert.ok(seconds > 0 && seconds < 0.2, "a long pause must not jump the animation");
  });

  it("packs pushed gusts for the grass shader and forgets old ones", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.pushGust({ x: 2, z: -5 }, 0.8, 0);
    assert.deepEqual(Array.from(scene.frame().wind.gusts.slice(0, 2)), [2, -5]);
    scene.advance(10_000);
    assert.equal(scene.frame().wind.gusts[3], 0);
  });

  it("sends a soft breeze across the meadow when a season change begins", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setSeason("autumn", 0);
    scene.advance(16);
    const { gusts } = scene.frame().wind;
    const active = [3, 7, 11, 15].filter((index) => gusts[index] > 0);
    assert.ok(active.length >= 2, "at least two gust points");
    assert.ok(
      active.every((index) => gusts[index] <= 0.6),
      "gentle, not a storm",
    );
  });

  it("stays still when the chosen season is already showing", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setSeason("summer", 0);
    scene.advance(16);
    assert.equal(scene.frame().wind.gusts[3], 0);
  });

  it("eases the hand touch in while the pointer rests on the grass", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setTouch({ x: 1, z: -3 });
    scene.advance(16);
    const first = scene.frame().wind.touch.strength;
    scene.advance(32);
    assert.ok(scene.frame().wind.touch.strength > first);
    scene.setTouch(null);
    settle(scene, 48, 3000);
    assert.ok(scene.frame().wind.touch.strength < 0.01);
  });

  it("flies the configured number of fireflies above the ground", () => {
    const scene = new Scene();
    scene.advance(0);
    const { fireflies } = scene.frame();
    assert.equal(fireflies.length, COUNTS.fireflies);
    for (const fly of fireflies) assert.ok(fly.glow >= 0 && fly.glow <= 1);
  });

  it("eases the parallax toward the pointer, clamped to the view", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setPointer({ x: 0.5, y: -2 });
    scene.advance(16);
    const { x } = scene.frame().pointer;
    assert.ok(x > 0 && x < 0.5, "the view should glide, not snap");
    settle(scene, 32, 4000);
    const settled = scene.frame().pointer;
    assert.ok(Math.abs(settled.x - 0.5) < 1e-3);
    assert.ok(Math.abs(settled.y + 1) < 1e-3);
  });

  it("can switch reduced motion on at runtime", () => {
    const scene = new Scene();
    scene.prefersReducedMotion = true;
    assert.ok(scene.frame().motionScale < 1);
  });
});

describe("Scene per-frame allocations", () => {
  it("reuses the season snapshot and atmosphere while nothing changes", () => {
    const scene = new Scene();
    scene.advance(0);
    const { season, atmosphere } = scene.frame();
    scene.advance(16);
    scene.advance(32);
    const next = scene.frame();
    assert.equal(next.season, season);
    assert.equal(next.atmosphere, atmosphere);
  });

  it("reuses the season snapshot again once a morph has settled", () => {
    const scene = new Scene({ prefersReducedMotion: true });
    scene.setSeason("autumn", 0);
    settle(scene, 0, REDUCED_MOTION_SEASON_MS);
    const { season } = scene.frame();
    scene.advance(REDUCED_MOTION_SEASON_MS + 500);
    assert.equal(scene.frame().season, season);
  });

  it("reuses one gust buffer across frames", () => {
    const scene = new Scene();
    scene.advance(0);
    const { gusts } = scene.frame().wind;
    scene.pushGust({ x: 1, z: 1 }, 1, 10);
    scene.advance(16);
    assert.equal(scene.frame().wind.gusts, gusts);
    assert.ok(gusts[3] > 0);
  });
});

describe("Scene seasons", () => {
  it("starts in summer, the look closest to the classic meadow", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.equal(scene.season, "summer");
    const { season } = scene.frame();
    assert.equal(season.name, "summer");
    assert.deepEqual(season.weights, seasonBlendAt(1));
    assert.deepEqual(season.look, seasonLook(seasonBlendAt(1)));
  });

  it("lets a season morph unfold slowly, gentler than day/night", () => {
    assert.ok(SEASON_MS >= 6500 && SEASON_MS <= 8000);
    assert.ok(SEASON_MS > DAY_NIGHT_MS);
    assert.ok(REDUCED_MOTION_SEASON_MS >= 1100 && REDUCED_MOTION_SEASON_MS <= 1500);
  });

  it("morphs to a new season over SEASON_MS, blending both on the way", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setSeason("autumn", 0);
    assert.equal(scene.season, "autumn");
    scene.advance(SEASON_MS / 2);
    const midway = scene.frame().season.weights;
    assert.ok(midway.summer > 0 && midway.autumn > 0);
    settle(scene, SEASON_MS / 2, SEASON_MS);
    assert.equal(scene.frame().season.weights.autumn, 1);
    assert.equal(scene.frame().season.name, "autumn");
  });

  it("goes from winter straight into spring rather than back through the year", () => {
    const scene = new Scene({ prefersReducedMotion: true });
    scene.setSeason("winter", 0);
    settle(scene, 0, REDUCED_MOTION_SEASON_MS);
    scene.setSeason("spring", 2000);
    scene.advance(2000 + REDUCED_MOTION_SEASON_MS / 2);
    const { weights } = scene.frame().season;
    assert.equal(weights.summer + weights.autumn, 0);
    assert.ok(weights.winter > 0 && weights.spring > 0);
  });

  it("finishes a reduced-motion morph within REDUCED_MOTION_SEASON_MS", () => {
    const scene = new Scene({ prefersReducedMotion: true });
    scene.setSeason("spring", 0);
    scene.advance(REDUCED_MOTION_SEASON_MS);
    assert.equal(scene.frame().season.weights.spring, 1);
  });

  it("tints the grass with the season's colours", () => {
    const scene = new Scene({ prefersReducedMotion: true });
    scene.setSeason("winter", 0);
    scene.advance(REDUCED_MOTION_SEASON_MS);
    const { atmosphere, season } = scene.frame();
    assert.deepEqual(atmosphere.grassTip, season.look.grassTip);
  });

  it("publishes the running transition and its choreographed look", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setSeason("autumn", 0);
    scene.advance(SEASON_MS * 0.3);
    const { transition, look } = scene.frame().season;
    assert.equal(transition.from, "summer");
    assert.equal(transition.to, "autumn");
    assert.ok(Math.abs(transition.t - 0.3) < 1e-9);
    assert.deepEqual(look, seasonLookDuring(transition));
  });

  it("walks a two-season jump through the season in between", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.setSeason("winter", 0);
    scene.advance(SEASON_MS * 0.25);
    const { transition } = scene.frame().season;
    assert.deepEqual([transition.from, transition.to], ["summer", "autumn"]);
  });

  it("rejects an unknown season with a RangeError", () => {
    assert.throws(() => new Scene().setSeason("monsoon", 0), RangeError);
  });
});

describe("Scene constellations", () => {
  it("starts with constellations hidden", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.equal(scene.constellationsVisible, false);
    assert.equal(scene.frame().constellations.reveal, 0);
    assert.equal(scene.frame().constellations.highlight, null);
  });

  it("tweens the reveal in and out", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.equal(scene.toggleConstellations(0), true);
    scene.advance(300);
    const mid = scene.frame().constellations.reveal;
    assert.ok(mid > 0 && mid < 1, `mid ${mid}`);
    settle(scene, 300, 2000);
    assert.equal(scene.frame().constellations.reveal, 1);
    scene.setConstellationsVisible(false, scene.now);
    settle(scene, scene.now, 2000);
    assert.equal(scene.frame().constellations.reveal, 0);
  });

  it("highlights a spotted constellation then fades it after a few seconds", () => {
    const scene = new Scene();
    scene.advance(0);
    scene.highlightConstellation("Orion", 0);
    settle(scene, 0, 1000);
    let state = scene.frame().constellations;
    assert.equal(state.highlight, "Orion");
    assert.ok(state.highlightAmount > 0.9);
    settle(scene, scene.now, 7000);
    state = scene.frame().constellations;
    assert.equal(state.highlightAmount, 0);
    assert.equal(state.highlight, null);
  });
});
