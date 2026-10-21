// Cumulus clouds as clusters of soft puffs streaming across a wrap-around band.
// Each cloud heaps up in tiers: a level base row, a fuller middle, and a crown.

const BASE_WIDTH = 18;

function tier(random, { count, spread, y, yJitter, radius, radiusJitter }) {
  return Array.from({ length: count }, (_, index) => {
    const along = count === 1 ? 0 : index / (count - 1) - 0.5;
    const size = radius + random() * radiusJitter;
    return {
      x: along * spread,
      y: (typeof y === "function" ? y(size) : y) + random() * yJitter,
      z: (random() - 0.5) * 1.6,
      radius: size,
    };
  });
}

export function createCloudBank(random, count, { span, yMin, yMax, zMin, zMax }) {
  return Array.from({ length: count }, () => {
    const baseCount = 6 + Math.floor(random() * 2);
    const middleCount = 3 + Math.floor(random() * 2);
    return {
      x: -span / 2 + random() * span,
      y: yMin + random() * (yMax - yMin),
      z: zMin + random() * (zMax - zMin),
      speed: 2.5 + random() * 2.5,
      scale: 0.8 + random() * 0.9,
      puffs: [
        ...tier(random, {
          count: baseCount,
          spread: BASE_WIDTH,
          y: (size) => size * 0.5,
          yJitter: 0.3,
          radius: 3.5,
          radiusJitter: 0.8,
        }),
        ...tier(random, {
          count: middleCount,
          spread: 10,
          y: 3.6,
          yJitter: 0.8,
          radius: 3.9,
          radiusJitter: 1,
        }),
        ...tier(random, {
          count: 1 + Math.floor(random() * 2),
          spread: 3,
          y: 6.3,
          yJitter: 0.6,
          radius: 3.6,
          radiusJitter: 0.8,
        }),
      ],
    };
  });
}

// Horizontal position after drifting for `seconds`, wrapped into [-span/2, span/2).
export function cloudOffset(cloud, seconds, span, motionScale = 1) {
  const travelled = cloud.x + cloud.speed * seconds * motionScale + span / 2;
  return (((travelled % span) + span) % span) - span / 2;
}
