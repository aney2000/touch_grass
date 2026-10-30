import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrasshoppers } from "../../src/three/grasshoppers.js";

const summer = { name: "summer", weights: { spring: 0, summer: 1, autumn: 0, winter: 0 } };

const bug = (overrides) => ({
  x: 0,
  y: 0,
  z: -3,
  vx: 1,
  vy: 1,
  vz: 0,
  heading: 0,
  airborne: true,
  size: 1,
  ...overrides,
});

const fakeInsects = (insects) => ({ insects, step() {} });

describe("createGrasshoppers", () => {
  it("draws one instance per live grasshopper", () => {
    const insects = fakeInsects([bug(), bug({ x: 1 })]);
    const system = createGrasshoppers({ capacity: 4, insects });
    system.update({ season: summer, motionScale: 1, wind: { touch: {} }, dayAmount: 1 });
    const body = system.object.children[0];
    assert.equal(body.count, 2);
    assert.equal(body.frustumCulled, false);
    insects.insects = [];
    system.update({ season: summer, motionScale: 1, wind: { touch: {} }, dayAmount: 1 });
    assert.equal(body.count, 0);
  });

  it("points the body along the flight direction", () => {
    const insects = fakeInsects([bug({ vx: 0, vy: 0, vz: -2 })]);
    const system = createGrasshoppers({ capacity: 1, insects });
    system.update({ season: summer, motionScale: 1, wind: { touch: {} }, dayAmount: 1 });
    const matrix = new THREE.Matrix4();
    system.object.children[0].getMatrixAt(0, matrix);
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
    assert.ok(forward.z < -0.99, `forward ${forward.toArray()}`);
  });

  it("steps the meadow insects with the frame's touch, season and light", () => {
    const calls = [];
    const insects = { insects: [], step: (dt, env) => calls.push({ dt, env }) };
    const system = createGrasshoppers({ capacity: 1, insects });
    const touch = { x: 1, z: -2, strength: 1 };
    system.update({
      season: summer,
      motionScale: 0.25,
      wind: { touch },
      dayAmount: 0.8,
      seconds: 1,
    });
    system.update({
      season: summer,
      motionScale: 0.25,
      wind: { touch },
      dayAmount: 0.8,
      seconds: 1.05,
    });
    assert.equal(calls.length, 2);
    assert.ok(Math.abs(calls[1].dt - 0.05) < 1e-9);
    assert.equal(calls[0].env.touch, touch);
    assert.equal(calls[0].env.motionScale, 0.25);
    assert.equal(calls[0].env.dayAmount, 0.8);
  });

  it("releases its geometry and materials", () => {
    const system = createGrasshoppers({ capacity: 1, insects: fakeInsects([]) });
    let disposed = 0;
    system.object.traverse((node) => {
      if (node.isMesh) {
        node.geometry.addEventListener("dispose", () => (disposed += 1));
        node.material.addEventListener("dispose", () => (disposed += 1));
      }
    });
    system.dispose();
    assert.ok(disposed >= 2);
  });
});
