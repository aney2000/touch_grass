// Terrain system: the shared height field as a lit mesh, with vertex shading
// that brightens crests and deepens hollows for the Bliss hill's soft volume.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { terrainHeight } from "../terrain.js";
import { smoothstep } from "../scene-math.js";

const SIZE = { width: 560, depth: 380, centerZ: -130 };

export function createTerrain({ segments = 180 } = {}) {
  const geometry = new THREE.PlaneGeometry(SIZE.width, SIZE.depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, SIZE.centerZ);

  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);
    const shade = 0.78 + 0.3 * smoothstep(-1, 14, y) + 0.05 * Math.sin(x * 0.21 + z * 0.17);
    colors.set([shade, shade * 1.02, shade * 0.94], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const object = new THREE.Mesh(geometry, material);
  object.name = "terrain";

  return {
    object,
    update({ atmosphere }) {
      setSrgb(material.color, atmosphere.hill);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
