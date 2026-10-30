import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groundColor, groundRoughness, SNOW_WHITE } from "../src/ground.js";
import { atmosphereAt } from "../src/atmosphere.js";
import { seasonBlendAt, seasonLook } from "../src/seasons.js";

const look = (position) => seasonLook(seasonBlendAt(position));
const close = (a, b) => a.every((value, index) => Math.abs(value - b[index]) < 1e-9);

describe("groundColor", () => {
  it("falls back to the atmosphere's hill without a season", () => {
    assert.deepEqual(groundColor(atmosphereAt(0)), atmosphereAt(0).hill);
  });

  it("leaves the summer hill unchanged", () => {
    assert.ok(close(groundColor(atmosphereAt(0.4), look(1)), atmosphereAt(0.4).hill));
  });

  it("turns fully snow white by day in winter and darker at night", () => {
    assert.ok(close(groundColor(atmosphereAt(0), look(3)), SNOW_WHITE));
    const night = groundColor(atmosphereAt(1), look(3));
    assert.ok(night.every((value, index) => value < SNOW_WHITE[index] * 0.5));
  });
});

describe("groundRoughness", () => {
  it("is matte grass by default and glossier under snow", () => {
    assert.equal(groundRoughness(), 0.95);
    assert.equal(groundRoughness(look(1)), 0.95);
    assert.ok(Math.abs(groundRoughness(look(3)) - 0.7) < 1e-9);
  });
});
