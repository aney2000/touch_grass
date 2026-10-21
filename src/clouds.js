// Cumulus clouds as clusters of soft puffs streaming across a wrap-around band.

export function createCloudBank(random, count, { span, yMin, yMax, zMin, zMax }) {
  return Array.from({ length: count }, () => {
    const scale = 0.8 + random() * 0.9;
    const puffCount = 5 + Math.floor(random() * 4);
    return {
      x: -span / 2 + random() * span,
      y: yMin + random() * (yMax - yMin),
      z: zMin + random() * (zMax - zMin),
      speed: 1.6 + random() * 1.6,
      scale,
      puffs: Array.from({ length: puffCount }, (_, index) => {
        const along = index / (puffCount - 1) - 0.5;
        const radius = 4 * (1 - Math.abs(along) * 0.9) * (0.8 + random() * 0.4);
        return {
          x: along * 18 + (random() - 0.5) * 2,
          y: radius * 0.45 + random() * 1.5,
          z: (random() - 0.5) * 4,
          radius,
        };
      }),
    };
  });
}

// Horizontal position after drifting for `seconds`, wrapped into [-span/2, span/2).
export function cloudOffset(cloud, seconds, span, motionScale = 1) {
  const travelled = cloud.x + cloud.speed * seconds * motionScale + span / 2;
  return (((travelled % span) + span) % span) - span / 2;
}
