// The 3D world as an ordered pipeline of independent systems (sky, terrain,
// grass, ...). Each system owns one object and reacts to the shared frame, so
// adding scenery means registering a system, never editing the loop.

import * as THREE from "three";
import { setSrgb } from "./color.js";

const FOG_NEAR = 45;
const FOG_FAR = 320;

export function createWorld(systems) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, FOG_NEAR, FOG_FAR);
  for (const system of systems) scene.add(system.object);

  return {
    scene,
    update(frame) {
      setSrgb(scene.fog.color, frame.atmosphere.fog);
      for (const system of systems) system.update?.(frame);
    },
    dispose() {
      for (const system of systems) {
        system.dispose?.();
        scene.remove(system.object);
      }
    },
  };
}
