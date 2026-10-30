// Spawn strategies for falling particles. Each strategy answers three questions
// — how many per second, where a new particle starts, and whether a particle is
// still inside its zone — so the simulation never needs to know about trees.

export const PER_TREE_RATE = 1.1;
// Leaves drift at most this many canopy radii from their tree before recycling.
export const DRIFT_FACTOR = 2.5;

export function canopyEmitters(canopies = []) {
  return (canopies ?? [])
    .filter((c) => c.species === "deciduous")
    .map(({ x, y, z, radius }) => ({ x, y, z, radius, weight: 1 }));
}

export function canopySpawner(emitters) {
  const total = emitters.reduce((sum, e) => sum + e.weight, 0);
  return {
    perSecond: (rate) => rate * PER_TREE_RATE * total,
    place(p, random) {
      let pick = random() * total;
      let home = emitters[emitters.length - 1];
      for (const e of emitters) {
        pick -= e.weight;
        if (pick < 0) {
          home = e;
          break;
        }
      }
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * home.radius * 0.9;
      p.x = home.x + Math.cos(angle) * reach;
      p.z = home.z + Math.sin(angle) * reach;
      p.y = home.y + (random() * 1.4 - 0.9) * home.radius;
      p.zoneX = home.x;
      p.zoneZ = home.z;
      p.zoneRadius = home.radius * DRIFT_FACTOR;
    },
    contains: (p) => Math.hypot(p.x - p.zoneX, p.z - p.zoneZ) <= p.zoneRadius,
  };
}

export function skySpawner(area, { perSecond }) {
  return {
    perSecond: (rate) => rate * perSecond,
    place(p, random) {
      p.x = area.xMin + random() * (area.xMax - area.xMin);
      p.z = area.zMin + random() * (area.zMax - area.zMin);
      p.y = area.yMax * (0.7 + random() * 0.3);
    },
    contains: (p) => p.x >= area.xMin && p.x <= area.xMax && p.z >= area.zMin && p.z <= area.zMax,
  };
}
