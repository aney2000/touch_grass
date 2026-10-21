// Camera adapter: applies the pure rig pose to a three.js camera and turns
// pointer positions into rays that pick the ground.

import * as THREE from "three";
import { CAMERA_BASE, fovForAspect } from "../camera-rig.js";
import { pickTerrain } from "../terrain.js";

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(fovForAspect(16 / 9), 16 / 9, 0.1, 1400);
  applyCameraPose(camera, CAMERA_BASE);
  return camera;
}

export function applyCameraPose(camera, { position, target }) {
  camera.position.fromArray(position);
  camera.lookAt(target[0], target[1], target[2]);
}

export function resizeCamera(camera, width, height) {
  camera.aspect = width / height;
  camera.fov = fovForAspect(camera.aspect);
  camera.updateProjectionMatrix();
}

export function createGroundPicker(camera) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return ({ x, y }) => {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(ndc.set(x, y), camera);
    const { origin, direction } = raycaster.ray;
    return pickTerrain({ origin: origin.toArray(), direction: direction.toArray() });
  };
}
