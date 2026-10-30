// A small deterministic forest: a few copses plus a forest edge, placed only
// where the resting camera actually sees them (inside the view wedge, not
// behind the hills), with a clear meadow in the centre foreground.

import { randomGenerator, mixRgb } from "./scene-math.js";
import { terrainHeight } from "./terrain.js";
import { basePoseForAspect, fovForAspect } from "./camera-rig.js";

export const TREE_SPECIES = Object.freeze({
  deciduous: Object.freeze({ name: "deciduous", evergreen: false, share: 0.75 }),
  conifer: Object.freeze({
    name: "conifer",
    evergreen: true,
    share: 0.25,
    color: Object.freeze([0.12, 0.3, 0.17]),
  }),
});

export const FOREST_BAND = Object.freeze({ xMin: -110, xMax: 110, zMin: -125, zMax: -40 });

const SNOW = [0.93, 0.95, 0.98];
const MEADOW = { halfWidth: 14, zNear: -60 };
const COPSE_RADIUS = 14;
const EDGE_SHARE = 0.3;
const MAX_ATTEMPTS = 20000;

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => {
  const length = Math.hypot(...v);
  return v.map((c) => c / length);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Pure pinhole test; `margin` < 1 shrinks the wedge so trees never kiss the edge.
export function isInViewWedge(point, { position, target }, fov, aspect, margin = 1) {
  const forward = normalize(sub(target, position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const rel = sub(point, position);
  const depth = dot(rel, forward);
  if (depth <= 0) return false;
  const tanV = Math.tan((fov * Math.PI) / 360) * margin;
  return (
    Math.abs(dot(rel, right)) <= depth * tanV * aspect && Math.abs(dot(rel, up)) <= depth * tanV
  );
}

export function isOccluded(from, to, heightAt = terrainHeight, steps = 120) {
  for (let k = 1; k < steps; k += 1) {
    const t = k / steps;
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    if (y < heightAt(x, z) - 0.2) return true;
  }
  return false;
}

export function plantForest({
  seed,
  count,
  clusters = 3,
  band = FOREST_BAND,
  minSpacing = 3.5,
  aspect = 16 / 9,
}) {
  const random = randomGenerator(seed);
  const pose = basePoseForAspect(aspect);
  const fov = fovForAspect(aspect);
  const between = (min, max) => min + random() * (max - min);

  const seen = (x, z, lift) => {
    const point = [x, terrainHeight(x, z) + lift, z];
    return isInViewWedge(point, pose, fov, aspect, 0.9) && !isOccluded(pose.position, point);
  };
  const inMeadow = (x, z) => Math.abs(x) < MEADOW.halfWidth && z > MEADOW.zNear;
  const sampleBand = () => [between(band.xMin, band.xMax), between(band.zMin, band.zMax)];

  const centres = [];
  while (centres.length < clusters) {
    const [x, z] = sampleBand();
    if (!inMeadow(x, z) && seen(x, z, 4)) centres.push([x, z]);
  }

  const trees = [];
  let spacing = minSpacing;
  for (let attempt = 1; trees.length < count; attempt += 1) {
    if (attempt % MAX_ATTEMPTS === 0) spacing *= 0.85;
    let x;
    let z;
    if (random() < EDGE_SHARE) {
      // The forest edge: a loose line along the back of the visible band.
      x = between(band.xMin, band.xMax);
      z = band.zMin + random() * 18;
    } else {
      const [cx, cz] = centres[Math.floor(random() * centres.length)];
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * COPSE_RADIUS;
      x = cx + Math.cos(angle) * reach;
      z = cz + Math.sin(angle) * reach;
    }
    if (z < band.zMin || z > band.zMax || inMeadow(x, z)) continue;
    if (trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < spacing)) continue;
    const conifer = random() < TREE_SPECIES.conifer.share;
    const depth = (band.zMax - z) / (band.zMax - band.zMin);
    const scale = 0.75 + depth * 0.55 + random() * 0.3;
    const trunkHeight = (conifer ? 1.6 : 3.2 + random() * 1.4) * scale;
    const canopyRadius = (conifer ? 1.7 : 2 + random() * 0.8) * scale;
    if (!seen(x, z, trunkHeight)) continue;
    trees.push({
      x,
      z,
      y: terrainHeight(x, z),
      species: conifer ? "conifer" : "deciduous",
      scale,
      trunkHeight,
      canopyRadius,
      hue: (random() - 0.5) * 0.16,
    });
  }

  const canopies = trees.map((t) => ({
    x: t.x,
    y: t.y + t.trunkHeight,
    z: t.z,
    radius: t.canopyRadius,
    species: t.species,
  }));
  return { trees, canopies };
}

// One seasonal rule for every tree (grove and hero alike): deciduous canopies
// follow the season's foliage; conifers stay full and green but gather snow.
export function canopyAppearance({ foliage, snowCover = 0 }, species, shade = 1) {
  const tint = (rgb) => rgb.map((channel) => Math.min(1, channel * shade));
  if (species.evergreen) {
    const snowDust = Math.min(1, snowCover);
    return {
      color: mixRgb(tint(species.color), SNOW, snowDust * 0.35),
      scale: 1,
      visible: true,
      snowDust,
    };
  }
  return {
    color: tint(foliage.color),
    scale: 0.15 + 0.85 * foliage.density,
    visible: foliage.density > 0.04,
    snowDust: 0,
  };
}
