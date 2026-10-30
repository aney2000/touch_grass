// Tree system: a lone, softly swaying tree on the shoulder of the Bliss hill,
// leaving the iconic main crest clear.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { findCrest } from "../terrain.js";
import { hexToUnitRgb, mixRgb, randomGenerator } from "../scene-math.js";
import { plantGrove } from "../grove.js";

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

// Background grove: instanced trunks, thin bare branches, and canopy blobs whose
// colour, size and blossom follow the season.
export const CANOPY_BLOBS = 3;
const BLOB_OFFSETS = [
  [0, 0.2, 0, 1],
  [-0.6, -0.15, 0.3, 0.75],
  [0.55, -0.1, -0.3, 0.8],
];
const BRANCHES = [
  [0.7, 0.6],
  [-0.65, 0.72],
  [0.15, 0.85],
];
const BLOSSOM_PINK = hexToUnitRgb("#f6c9d8");
const BLOSSOM_WHITE = hexToUnitRgb("#fff3f6");
const NIGHT_TINT = hexToUnitRgb("#3a4660");
const WHITE = [1, 1, 1];
const DEFAULT_FOLIAGE = { color: LEAF_DAY, density: 1, blossom: 0 };

export function createGrove({ count = 22, seed = 2207 } = {}) {
  const trees = plantGrove({ seed, count });
  const random = randomGenerator(seed + 1);
  const bark = new THREE.MeshStandardMaterial({ roughness: 1 });
  const foliage = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });

  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.3, 1, 6);
  trunkGeometry.translate(0, 0.5, 0);
  const branchGeometry = new THREE.CylinderGeometry(0.03, 0.08, 1, 4);
  branchGeometry.translate(0, 0.5, 0);
  const blobGeometry = new THREE.IcosahedronGeometry(1, 1);

  const trunks = new THREE.InstancedMesh(trunkGeometry, bark, trees.length);
  const branches = new THREE.InstancedMesh(branchGeometry, bark, trees.length * BRANCHES.length);
  const canopy = new THREE.InstancedMesh(blobGeometry, foliage, trees.length * CANOPY_BLOBS);
  trunks.name = "grove-trunks";
  branches.name = "grove-branches";
  canopy.name = "grove-canopy";

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  trees.forEach((tree, i) => {
    position.set(tree.x, tree.y - 0.2, tree.z);
    scale.set(tree.scale, tree.trunkHeight, tree.scale);
    trunks.setMatrixAt(i, matrix.compose(position, quaternion.identity(), scale));
    BRANCHES.forEach(([tilt, heightFraction], b) => {
      position.set(tree.x, tree.y + tree.trunkHeight * heightFraction * 0.7, tree.z);
      euler.set(tilt * 0.4, random() * Math.PI * 2, tilt);
      scale.set(tree.scale, tree.trunkHeight * 0.55, tree.scale);
      const at = i * BRANCHES.length + b;
      branches.setMatrixAt(at, matrix.compose(position, quaternion.setFromEuler(euler), scale));
    });
  });

  // Per-blob variation, fixed at creation: a shade and a blossom speckle weight.
  const shades = Array.from({ length: canopy.count }, () => 0.88 + random() * 0.2);
  const speckles = Array.from({ length: canopy.count }, () => random());
  const color = new THREE.Color();

  const placeCanopy = (fullness) => {
    trees.forEach((tree, i) => {
      BLOB_OFFSETS.forEach(([ox, oy, oz, size], b) => {
        const radius = tree.canopyRadius * size * fullness;
        position.set(
          tree.x + ox * tree.canopyRadius,
          tree.y + tree.trunkHeight + oy * tree.canopyRadius,
          tree.z + oz * tree.canopyRadius,
        );
        scale.set(radius, radius * 0.85, radius);
        canopy.setMatrixAt(
          i * CANOPY_BLOBS + b,
          matrix.compose(position, quaternion.identity(), scale),
        );
      });
    });
    canopy.instanceMatrix.needsUpdate = true;
  };

  const paintCanopy = ({ color: leaf, blossom }) => {
    for (let i = 0; i < canopy.count; i += 1) {
      const tree = trees[Math.floor(i / CANOPY_BLOBS)];
      const shade = shades[i] * (1 + tree.hue);
      let rgb = leaf.map((channel) => Math.min(1, channel * shade));
      if (blossom > 0) {
        const petal = mixRgb(BLOSSOM_PINK, BLOSSOM_WHITE, speckles[i]);
        rgb = mixRgb(rgb, petal, Math.min(1, blossom * (0.6 + speckles[i] * 0.8)));
      }
      canopy.setColorAt(i, setSrgb(color, rgb));
    }
    canopy.instanceColor.needsUpdate = true;
  };

  placeCanopy(1);
  paintCanopy(DEFAULT_FOLIAGE);

  const object = new THREE.Group();
  object.name = "grove";
  object.add(trunks, branches, canopy);

  let lastKey = "";
  return {
    object,
    trunks,
    branches,
    canopy,
    foliage,
    update({ atmosphere, season }) {
      const look = season?.look?.foliage ?? DEFAULT_FOLIAGE;
      const key = `${look.color.join()}|${look.density}|${look.blossom}`;
      if (key !== lastKey) {
        lastKey = key;
        canopy.visible = look.density > 0.04;
        branches.visible = look.density < 0.7;
        if (canopy.visible) {
          placeCanopy(0.15 + 0.85 * look.density);
          paintCanopy(look);
        }
      }
      // Instance colours carry the season; the material tint carries the night.
      setSrgb(foliage.color, mixRgb(WHITE, NIGHT_TINT, atmosphere.dayAmount));
      setSrgb(bark.color, mixRgb(BARK_DAY, BARK_NIGHT, atmosphere.dayAmount));
    },
    dispose() {
      trunkGeometry.dispose();
      branchGeometry.dispose();
      blobGeometry.dispose();
      bark.dispose();
      foliage.dispose();
      for (const mesh of [trunks, branches, canopy]) mesh.dispose();
    },
  };
}

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
