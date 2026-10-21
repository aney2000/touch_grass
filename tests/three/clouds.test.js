import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCloudLayer, CLOUD_BAND } from "../../src/three/clouds.js";
import { cloudOffset } from "../../src/clouds.js";
import { setSrgb } from "../../src/three/color.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const frame = (overrides = {}) => ({
  seconds: 0,
  atmosphere: atmosphereAt(0),
  motionScale: 1,
  ...overrides,
});

describe("createCloudLayer", () => {
  it("builds each cloud from soft puffs inside the cloud band", () => {
    const layer = createCloudLayer({ count: 6 });
    assert.equal(layer.object.children.length, 6);
    for (const cloud of layer.object.children) {
      assert.ok(cloud.children.length >= 5);
      assert.ok(cloud.position.y >= CLOUD_BAND.yMin && cloud.position.y <= CLOUD_BAND.yMax);
    }
  });

  it("streams clouds across the sky as time passes", () => {
    const layer = createCloudLayer({ count: 3 });
    layer.update(frame({ seconds: 10 }));
    const [first] = layer.object.children;
    assert.equal(first.position.x, cloudOffset(layer.clouds[0], 10, CLOUD_BAND.span));
  });

  it("slows clouds down for reduced motion", () => {
    const layer = createCloudLayer({ count: 1 });
    layer.update(frame({ seconds: 10, motionScale: 0.25 }));
    const expected = cloudOffset(layer.clouds[0], 10, CLOUD_BAND.span, 0.25);
    assert.equal(layer.object.children[0].position.x, expected);
  });

  it("tints and thins the clouds with the atmosphere", () => {
    const layer = createCloudLayer({ count: 1 });
    const atmosphere = atmosphereAt(1);
    layer.update(frame({ atmosphere }));
    assert.ok(layer.material.color.equals(setSrgb(new THREE.Color(), atmosphere.cloud)));
    assert.equal(layer.material.opacity, atmosphere.cloudOpacity);
  });
});
