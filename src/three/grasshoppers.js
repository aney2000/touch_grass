// Grasshopper renderer: a tiny instanced low-poly body with hind-leg wedges,
// plus a wing-flash quad that only shows mid-hop. It owns the meadow insect
// state so app.js just drops it into the world like any other system.

import * as THREE from "three";
import { createMeadowInsects, stepInsects } from "../grasshoppers.js";

// Exaggerated (~12 cm) so a hop reads from the camera.
const LENGTH = 0.12;
const MAX_DT = 0.1;
const SUMMER_GREEN = new THREE.Color(0.38, 0.62, 0.16);
const DRY_BROWN = new THREE.Color(0.52, 0.42, 0.2);
const WING_FLASH = new THREE.Color(0.95, 0.55, 0.25);

function bodyGeometry() {
  const body = new THREE.ConeGeometry(0.16, 1, 5, 1);
  body.rotateX(Math.PI / 2);
  body.scale(1, 0.9, 1);
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.TetrahedronGeometry(0.22);
    leg.scale(0.35, 0.9, 1.6);
    leg.translate(side * 0.16, 0.06, -0.15);
    return leg;
  });
  const parts = [body, ...legs].map((g) => g.toNonIndexed());
  const positions = parts.flatMap((g) => Array.from(g.getAttribute("position").array));
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  merged.scale(LENGTH, LENGTH, LENGTH);
  for (const g of [body, ...legs, ...parts]) g.dispose();
  return merged;
}

function wingGeometry() {
  const wing = new THREE.PlaneGeometry(1.4, 0.6);
  wing.rotateX(-Math.PI / 2);
  wing.translate(0, 0.1, -0.1);
  wing.scale(LENGTH, LENGTH, LENGTH);
  return wing;
}

const forward = new THREE.Vector3();
const target = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const sideways = new THREE.Vector3(1, 0, 0);
const look = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const tint = new THREE.Color();

function orient(bug) {
  forward.set(bug.vx, bug.vy, bug.vz);
  if (forward.lengthSq() < 1e-8) forward.set(Math.cos(bug.heading), 0, Math.sin(bug.heading));
  forward.normalize();
  // Matrix4.lookAt maps local +Z to (eye - target); the cone's tip is +Z.
  target.set(0, 0, 0);
  look.lookAt(forward, target, Math.abs(forward.y) > 0.99 ? sideways : up);
  quaternion.setFromRotationMatrix(look);
}

export function createGrasshoppers({ capacity = 6, insects, random = Math.random } = {}) {
  const meadow = insects ?? {
    state: createMeadowInsects({ random, max: capacity }),
    get insects() {
      return this.state.insects;
    },
    step(dt, env) {
      stepInsects(this.state, dt, env);
    },
  };

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: SUMMER_GREEN, flatShading: true });
  const wingMaterial = new THREE.MeshBasicMaterial({
    color: WING_FLASH,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const body = new THREE.InstancedMesh(bodyGeometry(), bodyMaterial, capacity);
  const wings = new THREE.InstancedMesh(wingGeometry(), wingMaterial, capacity);
  for (const mesh of [body, wings]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
  }

  const object = new THREE.Group();
  object.name = "grasshoppers";
  object.add(body, wings);

  let lastSeconds = null;

  return {
    object,
    update({ seconds = 0, season, dayAmount, motionScale = 1, wind }) {
      const dt = lastSeconds === null ? 0 : Math.min(MAX_DT, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      meadow.step(dt, { touch: wind?.touch, season, dayAmount, motionScale });

      const summer = season?.weights?.summer ?? 1;
      bodyMaterial.color.copy(tint.copy(DRY_BROWN).lerp(SUMMER_GREEN, summer));

      const live = meadow.insects;
      const count = Math.min(capacity, live.length);
      let flying = 0;
      for (let i = 0; i < count; i += 1) {
        const bug = live[i];
        orient(bug);
        position.set(bug.x, bug.y, bug.z);
        scale.setScalar(bug.size ?? 1);
        matrix.compose(position, quaternion, scale);
        body.setMatrixAt(i, matrix);
        if (bug.airborne) wings.setMatrixAt(flying++, matrix);
      }
      body.count = count;
      wings.count = flying;
      body.instanceMatrix.needsUpdate = true;
      wings.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      body.geometry.dispose();
      wings.geometry.dispose();
      bodyMaterial.dispose();
      wingMaterial.dispose();
    },
  };
}
