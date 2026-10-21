// Tree system: a lone, softly swaying tree on the shoulder of the Bliss hill,
// leaving the iconic main crest clear.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { findCrest } from "../terrain.js";
import { hexToUnitRgb, mixRgb } from "../scene-math.js";

const SITE = { xMin: 22, xMax: 60, zMin: -100, zMax: -70 };
const TRUNK_HEIGHT = 5.5;
const LEAF_DAY = hexToUnitRgb("#3f8a2a");
const LEAF_NIGHT = hexToUnitRgb("#16301f");
const BARK_DAY = hexToUnitRgb("#5b4327");
const BARK_NIGHT = hexToUnitRgb("#2a2320");

const CANOPY = [
  [0, 0, 0, 3.4],
  [-2.4, -0.6, 0.6, 2.4],
  [2.3, -0.4, -0.4, 2.5],
  [0.6, 1.8, 0.3, 2.4],
  [-1.2, 1.2, -1.4, 2.1],
  [1.2, 0.2, 1.8, 2.2],
];

export function createTree() {
  const crest = findCrest(SITE, 1);
  const bark = new THREE.MeshStandardMaterial({ roughness: 1 });
  const foliage = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });

  const trunkGeometry = new THREE.CylinderGeometry(0.32, 0.6, TRUNK_HEIGHT, 8);
  trunkGeometry.translate(0, TRUNK_HEIGHT / 2, 0);
  const trunk = new THREE.Mesh(trunkGeometry, bark);

  const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const canopy = new THREE.Group();
  canopy.position.y = TRUNK_HEIGHT;
  for (const [x, y, z, radius] of CANOPY) {
    const blob = new THREE.Mesh(leafGeometry, foliage);
    blob.position.set(x, y, z);
    blob.scale.set(radius, radius * 0.85, radius);
    canopy.add(blob);
  }

  const object = new THREE.Group();
  object.name = "tree";
  object.position.set(crest.x, crest.y, crest.z);
  object.add(trunk, canopy);

  return {
    object,
    canopy,
    foliage,
    update({ seconds, atmosphere, motionScale = 1 }) {
      const sway = motionScale ? Math.sin(seconds * 0.7) * 0.035 * motionScale : 0;
      canopy.rotation.z = sway;
      canopy.rotation.x = sway * 0.4;
      setSrgb(foliage.color, mixRgb(LEAF_DAY, LEAF_NIGHT, atmosphere.dayAmount));
      setSrgb(bark.color, mixRgb(BARK_DAY, BARK_NIGHT, atmosphere.dayAmount));
    },
    dispose() {
      trunkGeometry.dispose();
      leafGeometry.dispose();
      bark.dispose();
      foliage.dispose();
    },
  };
}
