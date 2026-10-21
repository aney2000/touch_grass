// Meteor system: occasional shooting stars across the night sky. Trajectories
// reuse the tested 2D shootingStarAt maths, in azimuth/elevation space.

import * as THREE from "three";
import { shootingStarAt } from "../scene-math.js";

const SKY_RADIUS = 600;
const POOL_SIZE = 3;
const MIN_DARKNESS = 0.62;

function skyPoint(azimuth, elevation, target) {
  const flat = Math.cos(elevation) * SKY_RADIUS;
  return target.set(
    flat * Math.sin(azimuth),
    Math.sin(elevation) * SKY_RADIUS,
    -flat * Math.cos(azimuth),
  );
}

function createStreak() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 3, 3, 3]), 3),
  );
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

export function createMeteorShower({ random = Math.random } = {}) {
  const pool = Array.from({ length: POOL_SIZE }, createStreak);
  const object = new THREE.Group();
  object.name = "meteors";
  object.add(...pool);

  const active = [];
  let nextAt = 0;
  const head = new THREE.Vector3();
  const tail = new THREE.Vector3();

  function spawn(now) {
    return {
      x: -0.9 + random() * 1.8,
      y: 0.35 + random() * 0.45,
      angle: -Math.PI * (0.12 + random() * 0.12),
      length: 0.25 + random() * 0.2,
      bornAt: now,
      duration: 700 + random() * 500,
    };
  }

  return {
    object,
    active,
    update({ now, atmosphere, motionScale = 1 }) {
      if (motionScale < 1 || atmosphere.dayAmount < MIN_DARKNESS) {
        nextAt = now + 1500;
      } else if (now >= nextAt && active.length < POOL_SIZE) {
        active.push(spawn(now));
        nextAt = now + 2600 + random() * 4200;
      }

      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (shootingStarAt(active[i], now).done) active.splice(i, 1);
      }

      pool.forEach((line, index) => {
        const meteor = active[index];
        line.visible = Boolean(meteor);
        if (!meteor) return;
        const state = shootingStarAt(meteor, now);
        const trail = meteor.length * 0.18;
        skyPoint(state.x, state.y, head);
        skyPoint(
          state.x - Math.cos(meteor.angle) * trail,
          state.y - Math.sin(meteor.angle) * trail,
          tail,
        );
        const position = line.geometry.getAttribute("position");
        position.setXYZ(0, tail.x, tail.y, tail.z);
        position.setXYZ(1, head.x, head.y, head.z);
        position.needsUpdate = true;
        line.material.opacity = state.opacity * atmosphere.starVisibility;
      });
    },
    dispose() {
      for (const line of pool) {
        line.geometry.dispose();
        line.material.dispose();
      }
    },
  };
}
