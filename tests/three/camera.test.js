import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createCamera,
  applyCameraPose,
  resizeCamera,
  createGroundPicker,
} from "../../src/three/camera.js";
import { CAMERA_BASE, fovForAspect } from "../../src/camera-rig.js";
import { terrainHeight } from "../../src/terrain.js";

describe("camera adapter", () => {
  it("starts at the rig's resting pose, far enough to see the sky dome", () => {
    const camera = createCamera();
    assert.deepEqual(camera.position.toArray(), [...CAMERA_BASE.position]);
    assert.ok(camera.far > 900);
  });

  it("moves and aims the camera at the posed target", () => {
    const camera = createCamera();
    applyCameraPose(camera, { position: [1, 3, 10], target: [1, 3, 0] });
    assert.deepEqual(camera.position.toArray(), [1, 3, 10]);
    const forward = camera.getWorldDirection(new THREE.Vector3());
    assert.ok(forward.distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-6);
  });

  it("matches the aspect ratio and portrait-friendly FOV on resize", () => {
    const camera = createCamera();
    resizeCamera(camera, 400, 800);
    assert.equal(camera.aspect, 0.5);
    assert.equal(camera.fov, fovForAspect(0.5));
  });
});

describe("createGroundPicker", () => {
  const camera = createCamera();
  resizeCamera(camera, 1600, 900);
  applyCameraPose(camera, CAMERA_BASE);
  const pick = createGroundPicker(camera);

  it("finds the meadow below the horizon", () => {
    const hit = pick({ x: 0, y: -0.8 });
    assert.ok(hit);
    assert.ok(Math.abs(hit.y - terrainHeight(hit.x, hit.z)) < 0.01);
  });

  it("returns null when pointing at the sky", () => {
    assert.equal(pick({ x: 0, y: 0.95 }), null);
  });

  it("reports hits as plain objects the model can store", () => {
    const hit = pick({ x: 0.2, y: -0.7 });
    assert.deepEqual(Object.keys(hit).sort(), ["x", "y", "z"]);
  });
});
