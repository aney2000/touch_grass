import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { terrainHeight, findCrest, scatterOnTerrain, pickTerrain } from "../src/terrain.js";
import { randomGenerator } from "../src/scene-math.js";

describe("terrainHeight", () => {
  it("is deterministic", () => {
    assert.equal(terrainHeight(3.2, -17.5), terrainHeight(3.2, -17.5));
  });

  it("rises from the foreground meadow to the Bliss hill behind it", () => {
    assert.ok(terrainHeight(-10, -45) > terrainHeight(0, 0) + 5);
  });

  it("is smooth enough to read as rolling grassland", () => {
    for (let x = -60; x <= 60; x += 7) {
      for (let z = -120; z <= 10; z += 9) {
        assert.ok(Math.abs(terrainHeight(x + 0.5, z) - terrainHeight(x, z)) < 0.6);
        assert.ok(Math.abs(terrainHeight(x, z + 0.5) - terrainHeight(x, z)) < 0.6);
      }
    }
  });

  it("returns finite heights far outside the field", () => {
    assert.ok(Number.isFinite(terrainHeight(10_000, -10_000)));
  });
});

describe("findCrest", () => {
  const bounds = { xMin: -30, xMax: 10, zMin: -70, zMax: -20 };

  it("returns the highest sampled point inside the bounds", () => {
    const crest = findCrest(bounds, 2);
    assert.ok(crest.x >= bounds.xMin && crest.x <= bounds.xMax);
    assert.ok(crest.z >= bounds.zMin && crest.z <= bounds.zMax);
    assert.equal(crest.y, terrainHeight(crest.x, crest.z));
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const x = crest.x + dx;
      const z = crest.z + dz;
      if (x < bounds.xMin || x > bounds.xMax || z < bounds.zMin || z > bounds.zMax) continue;
      assert.ok(crest.y >= terrainHeight(x, z));
    }
  });

  it("accepts a custom height function", () => {
    const crest = findCrest({ xMin: 0, xMax: 4, zMin: 0, zMax: 4 }, 1, (x, z) => x + z);
    assert.deepEqual(crest, { x: 4, y: 8, z: 4 });
  });
});

describe("scatterOnTerrain", () => {
  const area = { xMin: -5, xMax: 5, zMin: -8, zMax: 2 };

  it("places the requested number of points within the area, seated on the ground", () => {
    const points = scatterOnTerrain(randomGenerator(3), 200, area);
    assert.equal(points.length, 200);
    for (const { x, y, z } of points) {
      assert.ok(x >= area.xMin && x <= area.xMax);
      assert.ok(z >= area.zMin && z <= area.zMax);
      assert.equal(y, terrainHeight(x, z));
    }
  });

  it("is reproducible for the same seed", () => {
    assert.deepEqual(
      scatterOnTerrain(randomGenerator(9), 20, area),
      scatterOnTerrain(randomGenerator(9), 20, area),
    );
  });
});

describe("pickTerrain", () => {
  const normalize = ([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  };

  it("finds where a downward ray meets the ground", () => {
    const hit = pickTerrain({ origin: [0, 3, 12], direction: normalize([0, -0.3, -1]) });
    assert.ok(hit);
    assert.ok(Math.abs(hit.y - terrainHeight(hit.x, hit.z)) < 0.01);
    assert.ok(hit.z < 12);
  });

  it("misses when looking up into the sky", () => {
    assert.equal(pickTerrain({ origin: [0, 3, 12], direction: normalize([0, 1, -1]) }), null);
  });

  it("works against any height function", () => {
    const hit = pickTerrain({ origin: [0, 10, 0], direction: [0, -1, 0] }, { heightAt: () => 4 });
    assert.ok(Math.abs(hit.y - 4) < 0.01);
  });
});
