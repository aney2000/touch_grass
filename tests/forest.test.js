import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  plantForest,
  isInViewWedge,
  isOccluded,
  canopyAppearance,
  TREE_SPECIES,
} from "../src/forest.js";
import { basePoseForAspect, fovForAspect } from "../src/camera-rig.js";
import { terrainHeight } from "../src/terrain.js";

const POSE = basePoseForAspect(16 / 9);
const FOV = fovForAspect(16 / 9);

describe("isInViewWedge", () => {
  it("accepts the target and rejects points behind or far aside", () => {
    assert.ok(isInViewWedge(POSE.target, POSE, FOV, 16 / 9));
    assert.ok(!isInViewWedge([0, 2, 40], POSE, FOV, 16 / 9));
    assert.ok(!isInViewWedge([110, 5, -70], POSE, FOV, 16 / 9));
  });
});

describe("isOccluded", () => {
  it("detects the Bliss hill between the camera and the far ridge", () => {
    assert.ok(isOccluded(POSE.position, [-8, 2, -120], terrainHeight));
    assert.ok(!isOccluded(POSE.position, [-8, 30, -52], terrainHeight));
  });
});

describe("plantForest", () => {
  const forest = plantForest({ seed: 9, count: 36 });

  it("is deterministic for a seed", () => {
    assert.deepEqual(plantForest({ seed: 9, count: 36 }), forest);
    assert.notDeepEqual(plantForest({ seed: 10, count: 36 }), forest);
  });

  it("plants the count, mixing conifers at roughly a quarter", () => {
    assert.equal(forest.trees.length, 36);
    const conifers = forest.trees.filter((t) => t.species === "conifer").length;
    assert.ok(conifers >= 5 && conifers <= 14, `conifers ${conifers}`);
  });

  it("keeps every canopy in view and not hidden by the hills", () => {
    for (const t of forest.trees) {
      const canopy = [t.x, t.y + t.trunkHeight, t.z];
      assert.ok(isInViewWedge(canopy, POSE, FOV, 16 / 9, 0.92), `out of view ${t.x},${t.z}`);
      assert.ok(!isOccluded(POSE.position, canopy, terrainHeight), `occluded ${t.x},${t.z}`);
    }
  });

  it("spaces trees, keeps a central meadow and roots them on terrain", () => {
    const { trees } = forest;
    for (let i = 0; i < trees.length; i += 1) {
      const t = trees[i];
      assert.equal(t.y, terrainHeight(t.x, t.z));
      assert.ok(!(Math.abs(t.x) < 14 && t.z > -60), `in meadow ${t.x},${t.z}`);
      for (let j = i + 1; j < trees.length; j += 1) {
        assert.ok(Math.hypot(t.x - trees[j].x, t.z - trees[j].z) >= 3.5 - 1e-9);
      }
    }
  });

  it("exposes canopies for particles and birds", () => {
    assert.equal(forest.canopies.length, forest.trees.length);
    const [c] = forest.canopies;
    for (const key of ["x", "y", "z", "radius", "species"]) assert.ok(key in c);
  });
});

describe("canopyAppearance", () => {
  const summer = { color: [0.2, 0.5, 0.15], density: 1, blossom: 0 };
  const winter = { color: [0.4, 0.3, 0.2], density: 0, blossom: 0 };

  it("bares deciduous trees in winter", () => {
    const a = canopyAppearance({ foliage: winter, snowCover: 1 }, TREE_SPECIES.deciduous, 1);
    assert.equal(a.visible, false);
  });

  it("keeps conifers green and dusts them with snow", () => {
    const a = canopyAppearance({ foliage: winter, snowCover: 0.8 }, TREE_SPECIES.conifer, 1);
    assert.equal(a.visible, true);
    assert.equal(a.scale, 1);
    assert.ok(a.snowDust > 0.5);
    assert.ok(a.color[1] > a.color[0]);
  });

  it("follows the season colour and density for deciduous trees", () => {
    const a = canopyAppearance({ foliage: summer, snowCover: 0 }, TREE_SPECIES.deciduous, 1);
    assert.deepEqual(a.color, summer.color);
    assert.equal(a.scale, 1);
    assert.equal(a.snowDust, 0);
  });
});
