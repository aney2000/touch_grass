import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Scene } from "../src/scene.js";
import { atmosphereAt } from "../src/atmosphere.js";
import { DAY_NIGHT_MS, REDUCED_MOTION_DAY_NIGHT_MS, COUNTS } from "../src/config.js";

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

  it("reads the clock from the transition", () => {
    const scene = new Scene();
    scene.advance(0);
    assert.deepEqual(scene.clock(), { hours12: 6, minutes: "00", meridiem: "PM" });
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
