import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrove, CANOPY_BLOBS } from "../../src/three/tree.js";
import { atmosphereAt } from "../../src/atmosphere.js";
import { seasonBlendAt, seasonLook } from "../../src/seasons.js";

const SPRING = 0;
const SUMMER = 1;
const WINTER = 3;

const frame = (position, overrides = {}) => ({
  seconds: 0,
  motionScale: 1,
  atmosphere: atmosphereAt(0),
  season: { look: seasonLook(seasonBlendAt(position)) },
  ...overrides,
});

const canopyScale = (grove, index = 0) => {
  const matrix = new THREE.Matrix4();
  grove.canopy.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixScale(matrix).x;
};

const canopyColor = (grove, index) => {
  const color = new THREE.Color();
  grove.canopy.getColorAt(index, color);
  return color;
};

describe("createGrove", () => {
  it("instances one trunk and several canopy blobs per tree", () => {
    const grove = createGrove({ count: 20 });
    assert.equal(grove.trunks.count, 20);
    assert.equal(grove.canopy.count, 20 * CANOPY_BLOBS);
    assert.ok(grove.trunks instanceof THREE.InstancedMesh);
    assert.ok(grove.canopy.instanceColor);
  });

  it("shades summer canopies in the season's foliage green at full size", () => {
    const grove = createGrove({ count: 18 });
    grove.update(frame(SUMMER));
    assert.equal(grove.canopy.visible, true);
    const { r, g, b } = canopyColor(grove, 0);
    assert.ok(g > r && g > b, "green dominates");
    const full = canopyScale(grove);
    grove.update(frame(2));
    assert.ok(canopyScale(grove) < full, "autumn thins the canopy");
  });

  it("goes bare in winter, leaving only trunks and branches", () => {
    const grove = createGrove({ count: 18 });
    grove.update(frame(WINTER));
    assert.equal(grove.canopy.visible, false);
    assert.equal(grove.trunks.visible, true);
    assert.equal(grove.branches.visible, true);
  });

  it("speckles spring canopies with pink-white blossom", () => {
    const grove = createGrove({ count: 18 });
    grove.update(frame(SPRING));
    const pinkish = Array.from({ length: grove.canopy.count }, (_, i) =>
      canopyColor(grove, i),
    ).filter(({ r, g, b }) => r > 0.6 && b > 0.4 && r >= g);
    assert.ok(pinkish.length > grove.canopy.count * 0.4);
  });

  it("darkens toward night", () => {
    const grove = createGrove({ count: 18 });
    grove.update(frame(SUMMER));
    const day = grove.foliage.color.getHSL({}).l;
    grove.update(frame(SUMMER, { atmosphere: atmosphereAt(1) }));
    assert.ok(grove.foliage.color.getHSL({}).l < day);
  });
});
