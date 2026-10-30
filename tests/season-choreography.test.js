import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, easeInOutCubic, seasonChoreography } from "../src/season-choreography.js";
import { SEASONS } from "../src/seasons.js";

const pairs = SEASONS.flatMap((from) =>
  SEASONS.filter((to) => to !== from).map((to) => [from, to]),
);

describe("easeInOutCubic", () => {
  it("eases from 0 to 1 symmetrically and clamps", () => {
    assert.equal(easeInOutCubic(0), 0);
    assert.equal(easeInOutCubic(0.5), 0.5);
    assert.equal(easeInOutCubic(1), 1);
    assert.equal(easeInOutCubic(-1), 0);
    assert.equal(easeInOutCubic(2), 1);
    assert.ok(easeInOutCubic(0.1) < 0.1);
  });
});

describe("seasonChoreography", () => {
  it("names every channel", () => {
    assert.deepEqual(CHANNELS, [
      "sky",
      "light",
      "groundSnow",
      "grassSnow",
      "grassColor",
      "grassHeight",
      "foliageColor",
      "foliageDensity",
      "blossom",
      "particles",
    ]);
  });

  it("starts every channel at exactly 0 and ends it at exactly 1 for every pair", () => {
    for (const [from, to] of pairs) {
      const start = seasonChoreography(from, to, 0);
      const end = seasonChoreography(from, to, 1);
      for (const channel of CHANNELS) {
        assert.equal(start[channel], 0, `${from}>${to} ${channel} at 0`);
        assert.equal(end[channel], 1, `${from}>${to} ${channel} at 1`);
      }
    }
  });

  it("only ever moves each channel forward", () => {
    for (const [from, to] of pairs) {
      let previous = seasonChoreography(from, to, 0);
      for (let t = 0.02; t <= 1; t += 0.02) {
        const next = seasonChoreography(from, to, t);
        for (const channel of CHANNELS) assert.ok(next[channel] >= previous[channel] - 1e-12);
        previous = next;
      }
    }
  });

  it("autumn to winter: leaves turn, then fall, the sky cools, snow settles on tips then ground, grass shortens last", () => {
    const at = (t) => seasonChoreography("autumn", "winter", t);
    assert.ok(at(0.3).foliageColor > at(0.3).grassSnow);
    assert.ok(at(0.3).foliageColor > at(0.3).foliageDensity);
    assert.ok(at(0.4).sky > at(0.4).groundSnow);
    assert.ok(at(0.6).grassSnow > at(0.6).groundSnow);
    assert.ok(at(0.7).groundSnow > at(0.7).grassHeight);
    assert.equal(at(0.3).groundSnow, 0);
  });

  it("winter to spring: ground melts, then tips, grass greens and grows, blossoms open last", () => {
    const at = (t) => seasonChoreography("winter", "spring", t);
    assert.ok(at(0.2).groundSnow > at(0.2).grassSnow);
    assert.ok(at(0.4).grassSnow > at(0.4).grassColor);
    assert.ok(at(0.6).grassColor > at(0.6).blossom);
    assert.equal(at(0.5).blossom, 0);
  });

  it("spring to summer: blossom fades to green before the grass fills out", () => {
    const at = (t) => seasonChoreography("spring", "summer", t);
    assert.ok(at(0.3).blossom > at(0.3).grassHeight);
  });

  it("summer to autumn: grass yellows, then the canopy turns", () => {
    const at = (t) => seasonChoreography("summer", "autumn", t);
    assert.ok(at(0.3).grassColor > at(0.3).foliageColor);
    assert.ok(at(0.6).foliageColor > at(0.6).foliageDensity);
  });

  it("plays a backward step as the forward film in reverse", () => {
    const back = seasonChoreography("winter", "autumn", 0.3);
    const forward = seasonChoreography("autumn", "winter", 0.7);
    for (const channel of CHANNELS)
      assert.ok(Math.abs(back[channel] - (1 - forward[channel])) < 1e-12);
  });

  it("returns all ones when nothing changes", () => {
    const same = seasonChoreography("summer", "summer", 0.2);
    for (const channel of CHANNELS) assert.equal(same[channel], 1);
  });
});
