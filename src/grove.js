// A deterministic background grove: tree specs scattered across the far hills,
// behind the grass field and a little off the camera axis, spaced apart.

import { randomGenerator } from "./scene-math.js";
import { terrainHeight } from "./terrain.js";

export const GROVE_AREA = Object.freeze({ xMin: -110, xMax: 110, zMin: -180, zMax: -72 });

const AXIS_CLEARANCE = 6;
const MAX_ATTEMPTS = 4000;

const clearOfAxis = (x, z) => Math.abs(x) >= AXIS_CLEARANCE || z < -120;

export function plantGrove({ seed, count, area = GROVE_AREA, minSpacing = 7 }) {
  const random = randomGenerator(seed);
  const trees = [];
  let spacing = minSpacing;
  for (let attempt = 0; trees.length < count; attempt += 1) {
    // Relax spacing rather than loop forever if the area is crowded.
    if (attempt > 0 && attempt % MAX_ATTEMPTS === 0) spacing *= 0.85;
    const x = area.xMin + random() * (area.xMax - area.xMin);
    const z = area.zMin + random() * (area.zMax - area.zMin);
    if (!clearOfAxis(x, z)) continue;
    if (trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < spacing)) continue;
    const scale = 0.7 + random() * 0.7;
    trees.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale,
      trunkHeight: (3.2 + random() * 1.6) * scale,
      canopyRadius: (2 + random() * 0.9) * scale,
      hue: (random() - 0.5) * 0.16,
    });
  }
  return trees;
}
