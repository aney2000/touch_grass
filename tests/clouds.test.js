import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCloudBank, cloudOffset } from "../src/clouds.js";
import { randomGenerator } from "../src/scene-math.js";

const band = { span: 300, yMin: 30, yMax: 50, zMin: -160, zMax: -60 };

describe("createCloudBank", () => {
  const bank = createCloudBank(randomGenerator(4), 10, band);

  it("creates the requested clouds inside the band", () => {
    assert.equal(bank.length, 10);
    for (const cloud of bank) {
      assert.ok(cloud.y >= band.yMin && cloud.y <= band.yMax);
      assert.ok(cloud.z >= band.zMin && cloud.z <= band.zMax);
    }
  });

  it("builds every cloud from several puffs for a cumulus silhouette", () => {
    for (const cloud of bank) assert.ok(cloud.puffs.length >= 5);
  });

  it("drifts noticeably faster than the old 2D clouds (several units a second)", () => {
    for (const cloud of bank) assert.ok(cloud.speed >= 1.5);
  });
});

describe("cloudOffset", () => {
  const cloud = { x: 0, speed: 2 };

  it("advances with time", () => {
    assert.equal(cloudOffset(cloud, 5, band.span), 10);
  });

  it("wraps around so clouds keep streaming across the sky", () => {
    const x = cloudOffset(cloud, 1000, band.span);
    assert.ok(x >= -band.span / 2 && x < band.span / 2);
  });

  it("can be slowed for reduced motion", () => {
    assert.equal(cloudOffset(cloud, 5, band.span, 0.2), 2);
  });
});
