import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SEASONS,
  SEASON_LOOKS,
  seasonPosition,
  nearestSeasonTarget,
  seasonBlendAt,
  seasonLook,
  dominantSeason,
} from "../src/seasons.js";
import { hexToUnitRgb } from "../src/scene-math.js";

const sum = (weights) => Object.values(weights).reduce((total, value) => total + value, 0);

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);
}

describe("SEASONS", () => {
  it("lists the four seasons in calendar order and cannot be changed", () => {
    assert.deepEqual([...SEASONS], ["spring", "summer", "autumn", "winter"]);
    assert.ok(Object.isFrozen(SEASONS));
  });

  it("places each season at its index on a ring of four", () => {
    assert.deepEqual(SEASONS.map(seasonPosition), [0, 1, 2, 3]);
  });

  it("rejects unknown season names with a RangeError", () => {
    assert.throws(() => seasonPosition("monsoon"), RangeError);
  });
});

describe("nearestSeasonTarget: morphs take the shortest way round the year", () => {
  it("steps forward to the next season", () => {
    assert.equal(nearestSeasonTarget(1, "autumn"), 2);
  });

  it("goes from winter forward into spring instead of back through the year", () => {
    assert.equal(nearestSeasonTarget(3, "spring"), 4);
  });

  it("goes from spring back into winter the short way", () => {
    assert.equal(nearestSeasonTarget(0, "winter"), -1);
  });

  it("breaks the two-season tie by moving forward in time", () => {
    assert.equal(nearestSeasonTarget(0, "autumn"), 2);
  });

  it("stays put when the season is already shown", () => {
    assert.equal(nearestSeasonTarget(5, "summer"), 5);
  });
});

describe("seasonBlendAt", () => {
  it("gives a pure season at each whole position", () => {
    assert.deepEqual(seasonBlendAt(0), { spring: 1, summer: 0, autumn: 0, winter: 0 });
    assert.deepEqual(seasonBlendAt(3), { spring: 0, summer: 0, autumn: 0, winter: 1 });
  });

  it("splits evenly between adjacent seasons halfway through a morph", () => {
    assert.deepEqual(seasonBlendAt(1.5), { spring: 0, summer: 0.5, autumn: 0.5, winter: 0 });
  });

  it("wraps around the ring: 3.5 blends winter with spring, so do 4 and -1", () => {
    assert.deepEqual(seasonBlendAt(3.5), { spring: 0.5, summer: 0, autumn: 0, winter: 0.5 });
    assert.deepEqual(seasonBlendAt(4), seasonBlendAt(0));
    assert.deepEqual(seasonBlendAt(-1), seasonBlendAt(3));
  });

  it("always sums to one with at most two neighbouring seasons non-zero", () => {
    for (let position = -2; position <= 6; position += 0.137) {
      const weights = seasonBlendAt(position);
      assertClose(sum(weights), 1, `sum at ${position}`);
      assert.ok(Object.values(weights).filter((value) => value > 0).length <= 2);
    }
  });

  it("names the season with the largest weight", () => {
    assert.equal(dominantSeason(seasonBlendAt(2.2)), "autumn");
    assert.equal(dominantSeason(seasonBlendAt(3.8)), "spring");
  });
});

describe("SEASON_LOOKS", () => {
  it("is frozen all the way down", () => {
    assert.ok(Object.isFrozen(SEASON_LOOKS));
    for (const season of SEASONS) {
      assert.ok(Object.isFrozen(SEASON_LOOKS[season]));
      assert.ok(Object.isFrozen(SEASON_LOOKS[season].foliage));
      assert.ok(Object.isFrozen(SEASON_LOOKS[season].particleRates));
    }
  });

  it("grows the grass tallest in summer and flattens it under winter snow", () => {
    const heights = SEASONS.map((season) => SEASON_LOOKS[season].grassHeight);
    assert.deepEqual(heights, [0.85, 1.15, 0.95, 0.25]);
  });

  it("covers the ground in snow only in winter and leaves trees bare there", () => {
    assert.deepEqual(
      SEASONS.map((season) => SEASON_LOOKS[season].snowCover),
      [0, 0, 0, 1],
    );
    assert.equal(SEASON_LOOKS.winter.foliage.density, 0);
    assert.equal(SEASON_LOOKS.spring.foliage.blossom, 0.7);
  });

  it("drops petals in spring, leaves in autumn, snow in winter and nothing in summer", () => {
    assert.equal(SEASON_LOOKS.spring.particles, "petals");
    assert.equal(SEASON_LOOKS.summer.particles, "none");
    assert.equal(SEASON_LOOKS.autumn.particles, "leaves");
    assert.equal(SEASON_LOOKS.winter.particles, "snow");
    assert.deepEqual({ ...SEASON_LOOKS.summer.particleRates }, { petals: 0, leaves: 0, snow: 0 });
  });
});

describe("seasonLook", () => {
  it("returns one season's look exactly, with colours as unit RGB for WebGL", () => {
    const look = seasonLook(seasonBlendAt(2));
    const autumn = SEASON_LOOKS.autumn;
    assert.equal(look.grassHeight, autumn.grassHeight);
    assert.deepEqual(look.grassBase, hexToUnitRgb(autumn.grassBase));
    assert.deepEqual(look.grassTip, hexToUnitRgb(autumn.grassTip));
    assert.deepEqual(look.groundTint, hexToUnitRgb(autumn.groundTint));
    assert.deepEqual(look.foliage.color, hexToUnitRgb(autumn.foliage.color));
    assert.deepEqual(look.particleRates, { ...autumn.particleRates });
  });

  it("interpolates every numeric field halfway between two seasons", () => {
    const look = seasonLook(seasonBlendAt(2.5));
    const { autumn, winter } = SEASON_LOOKS;
    assertClose(look.grassHeight, (autumn.grassHeight + winter.grassHeight) / 2, "height");
    assertClose(look.snowCover, 0.5, "snow cover");
    assertClose(look.foliage.density, (autumn.foliage.density + 0) / 2, "foliage");
    assertClose(
      look.grassTip[0],
      (hexToUnitRgb(autumn.grassTip)[0] + hexToUnitRgb(winter.grassTip)[0]) / 2,
      "tip red",
    );
  });

  it("crossfades two particle kinds instead of switching abruptly", () => {
    const look = seasonLook(seasonBlendAt(2.5));
    assert.ok(look.particleRates.leaves > 0);
    assert.ok(look.particleRates.snow > 0);
    assert.equal(look.particleRates.petals, 0);
  });

  it("does not mutate the shared look table", () => {
    const look = seasonLook(seasonBlendAt(0));
    look.grassTip[0] = 99;
    look.particleRates.petals = 99;
    assert.notEqual(seasonLook(seasonBlendAt(0)).grassTip[0], 99);
    assert.notEqual(SEASON_LOOKS.spring.particleRates.petals, 99);
  });
});
