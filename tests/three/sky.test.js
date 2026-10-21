import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createSky, STAR_COUNT } from "../../src/three/sky.js";
import { setSrgb } from "../../src/three/color.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const frame = (dayAmount, seconds = 1) => ({ seconds, atmosphere: atmosphereAt(dayAmount) });

describe("createSky", () => {
  it("renders the dome from the inside, behind everything and unaffected by fog", () => {
    const { dome } = createSky();
    assert.equal(dome.material.side, THREE.BackSide);
    assert.equal(dome.material.depthWrite, false);
    assert.equal(dome.material.fog, false);
  });

  it("feeds the atmosphere's sky gradient into the dome shader", () => {
    const sky = createSky();
    const { atmosphere } = frame(0.4);
    sky.update(frame(0.4));
    const { uniforms } = sky.dome.material;
    assert.ok(uniforms.uTop.value.equals(setSrgb(new THREE.Color(), atmosphere.skyTop)));
    assert.ok(uniforms.uHorizon.value.equals(setSrgb(new THREE.Color(), atmosphere.skyHorizon)));
    assert.deepEqual(uniforms.uSunDirection.value.toArray(), atmosphere.sunDirection);
    assert.equal(uniforms.uMoonVisibility.value, atmosphere.starVisibility);
  });

  it("scatters the configured number of stars across the upper sky", () => {
    const { stars } = createSky();
    const positions = stars.geometry.getAttribute("position");
    assert.equal(positions.count, STAR_COUNT);
    for (let i = 0; i < positions.count; i += 1) assert.ok(positions.getY(i) > 0);
  });

  it("fades stars in with the night and advances their twinkle", () => {
    const sky = createSky();
    sky.update(frame(0, 3));
    assert.equal(sky.stars.material.uniforms.uVisibility.value, 0);
    sky.update(frame(1, 4));
    assert.equal(sky.stars.material.uniforms.uVisibility.value, 1);
    assert.equal(sky.stars.material.uniforms.uTime.value, 4);
  });

  it("skips drawing the stars entirely while they are invisible", () => {
    const sky = createSky();
    sky.update(frame(0));
    assert.equal(sky.stars.visible, false);
    sky.update(frame(1));
    assert.equal(sky.stars.visible, true);
  });

  it("releases its GPU resources on dispose", () => {
    const sky = createSky();
    let disposed = 0;
    sky.dome.geometry.addEventListener("dispose", () => (disposed += 1));
    sky.stars.material.addEventListener("dispose", () => (disposed += 1));
    sky.dispose();
    assert.equal(disposed, 2);
  });
});
