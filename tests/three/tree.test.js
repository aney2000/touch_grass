import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTree } from "../../src/three/tree.js";
import { terrainHeight } from "../../src/terrain.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const frame = (overrides = {}) => ({
  seconds: 0,
  atmosphere: atmosphereAt(0),
  motionScale: 1,
  ...overrides,
});

describe("createTree", () => {
  it("roots the tree on the ground at its crest", () => {
    const tree = createTree();
    const { x, y, z } = tree.object.position;
    assert.ok(Math.abs(y - terrainHeight(x, z)) < 1e-9);
  });

  it("sways gently in the breeze, and stays still with reduced motion", () => {
    const tree = createTree();
    tree.update(frame({ seconds: 1.3 }));
    assert.notEqual(tree.canopy.rotation.z, 0);
    tree.update(frame({ seconds: 1.3, motionScale: 0 }));
    assert.equal(tree.canopy.rotation.z, 0);
  });

  it("darkens its foliage toward night", () => {
    const tree = createTree();
    tree.update(frame({ atmosphere: atmosphereAt(0) }));
    const day = tree.foliage.color.getHSL({}).l;
    tree.update(frame({ atmosphere: atmosphereAt(1) }));
    assert.ok(tree.foliage.color.getHSL({}).l < day);
  });
});
