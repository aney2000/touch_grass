import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { plantGrove, GROVE_AREA } from "../src/grove.js";
import { terrainHeight } from "../src/terrain.js";

describe("plantGrove", () => {
  it("is deterministic for a seed", () => {
    assert.deepEqual(plantGrove({ seed: 7, count: 20 }), plantGrove({ seed: 7, count: 20 }));
    assert.notDeepEqual(plantGrove({ seed: 7, count: 20 }), plantGrove({ seed: 8, count: 20 }));
  });

  it("plants the requested number of trees inside the background area", () => {
    const trees = plantGrove({ seed: 3, count: 22 });
    assert.equal(trees.length, 22);
    for (const tree of trees) {
      assert.ok(tree.x >= GROVE_AREA.xMin && tree.x <= GROVE_AREA.xMax);
      assert.ok(tree.z >= GROVE_AREA.zMin && tree.z <= GROVE_AREA.zMax);
      assert.ok(tree.z <= -70, "stays behind the grass field");
    }
  });

  it("keeps the camera axis a little clear and trees apart", () => {
    const trees = plantGrove({ seed: 11, count: 24, minSpacing: 7 });
    for (const tree of trees) assert.ok(Math.abs(tree.x) >= 6 || tree.z < -120);
    for (let i = 0; i < trees.length; i += 1) {
      for (let j = i + 1; j < trees.length; j += 1) {
        const d = Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z);
        assert.ok(d >= 7 - 1e-9, `trees ${i},${j} too close: ${d}`);
      }
    }
  });

  it("roots each tree on the terrain with sensible proportions", () => {
    for (const tree of plantGrove({ seed: 5, count: 18 })) {
      assert.equal(tree.y, terrainHeight(tree.x, tree.z));
      assert.ok(tree.scale > 0.5 && tree.scale < 1.6);
      assert.ok(tree.trunkHeight > 0 && tree.canopyRadius > 0);
      assert.ok(Math.abs(tree.hue) <= 0.08);
    }
  });
});
