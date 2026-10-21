import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFireflyLights } from "../../src/three/fireflies.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const flies = [
  { x: 1, y: 2, z: 3, glow: 1, size: 1 },
  { x: -1, y: 0.5, z: -3, glow: 0, size: 0.8 },
];

const frame = (dayAmount) => ({ atmosphere: atmosphereAt(dayAmount), fireflies: flies });

describe("createFireflyLights", () => {
  it("places a glowing point at each firefly", () => {
    const system = createFireflyLights({ capacity: 4 });
    system.update(frame(1));
    const position = system.object.geometry.getAttribute("position");
    assert.deepEqual([position.getX(0), position.getY(0), position.getZ(0)], [1, 2, 3]);
    assert.equal(system.object.geometry.getAttribute("aGlow").getX(0), 1);
    assert.equal(system.object.geometry.drawRange.count, 2);
  });

  it("glows additively and above 1.0 so bloom picks it up", () => {
    const { object } = createFireflyLights({ capacity: 1 });
    assert.equal(object.material.blending, THREE.AdditiveBlending);
    assert.equal(object.material.depthWrite, false);
    assert.ok(object.material.uniforms.uIntensity.value > 1);
  });

  it("hides the swarm entirely during the day", () => {
    const system = createFireflyLights({ capacity: 4 });
    system.update(frame(0));
    assert.equal(system.object.visible, false);
    system.update(frame(1));
    assert.equal(system.object.visible, true);
  });
});
