import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrass, MAX_LANTERNS } from "../../src/three/grass.js";
import { terrainHeight } from "../../src/terrain.js";
import { gustUniforms, GUST_LIMIT } from "../../src/wind.js";
import { setSrgb } from "../../src/three/color.js";
import { atmosphereAt } from "../../src/atmosphere.js";

function frame(overrides = {}) {
  return {
    seconds: 2,
    atmosphere: atmosphereAt(0),
    motionScale: 1,
    wind: { gusts: gustUniforms([], 0), touch: { x: 0, z: 0, strength: 0 } },
    fireflies: [],
    ...overrides,
  };
}

describe("createGrass", () => {
  const grass = createGrass({ count: 2000 });
  const roots = grass.object.geometry.getAttribute("aRoot");

  it("instances one blade per requested count", () => {
    assert.equal(grass.object.geometry.instanceCount, 2000);
    assert.equal(roots.count, 2000);
  });

  it("roots every blade on the terrain", () => {
    for (let i = 0; i < roots.count; i += 97) {
      const expected = terrainHeight(roots.getX(i), roots.getZ(i));
      assert.ok(Math.abs(roots.getY(i) - expected) < 1e-4);
    }
  });

  it("packs blades densely near the viewer and sparsely toward the hill", () => {
    let near = 0;
    let far = 0;
    for (let i = 0; i < roots.count; i += 1) {
      const z = roots.getZ(i);
      if (z > -15) near += 1;
      else if (z < -45 && z > -60) far += 1;
    }
    assert.ok(near > far * 2);
  });

  it("opts out of frustum culling since blades move in the vertex shader", () => {
    assert.equal(grass.object.frustumCulled, false);
  });

  it("forwards wind gusts and the pointer touch to the shader", () => {
    const gusts = gustUniforms([{ x: 3, z: -4, strength: 0.9, startedAt: 0 }], 500);
    grass.update(frame({ wind: { gusts, touch: { x: 1, z: -2, strength: 0.5 } } }));
    const { uGusts, uTouch } = grass.object.material.uniforms;
    assert.equal(uGusts.value.length, GUST_LIMIT);
    assert.deepEqual(uGusts.value[0].toArray(), [3, -4, 0.5, 0.8999999761581421]);
    assert.deepEqual(uTouch.value.toArray(), [1, -2, 0.5]);
  });

  it("colours the blades and light from the atmosphere", () => {
    const atmosphere = atmosphereAt(0.7);
    grass.update(frame({ atmosphere }));
    const { uTipColor, uSunIntensity } = grass.object.material.uniforms;
    assert.ok(uTipColor.value.equals(setSrgb(new THREE.Color(), atmosphere.grassTip)));
    assert.equal(uSunIntensity.value, atmosphere.sunIntensity);
  });

  it("lets the brightest nearby fireflies light up the blades around them", () => {
    const fireflies = Array.from({ length: MAX_LANTERNS + 3 }, (_, i) => ({
      x: i,
      y: 1,
      z: -i,
      glow: i === 2 ? 1 : 0.1,
    }));
    grass.update(frame({ fireflies, atmosphere: atmosphereAt(1) }));
    const { uLanterns } = grass.object.material.uniforms;
    assert.equal(uLanterns.value.length, MAX_LANTERNS);
    assert.deepEqual(uLanterns.value[0].toArray(), [2, 1, -2, 1]);
  });

  it("dims firefly light by their visibility so they never glow by day", () => {
    const fireflies = [{ x: 0, y: 1, z: 0, glow: 1 }];
    grass.update(frame({ fireflies, atmosphere: atmosphereAt(0) }));
    assert.equal(grass.object.material.uniforms.uLanterns.value[0].w, 0);
  });

  it("scales the idle sway for reduced motion", () => {
    grass.update(frame({ motionScale: 0.25, seconds: 9 }));
    const { uMotion, uTime } = grass.object.material.uniforms;
    assert.equal(uMotion.value, 0.25);
    assert.equal(uTime.value, 9);
  });
});
