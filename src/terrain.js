// The landscape as a pure height field: a broad "Bliss" hill rising behind a
// gently rolling foreground meadow. Shared by the terrain mesh, grass, tree,
// and fireflies so everything sits on the same ground.

// Each dome is a smooth Gaussian bump: amplitude, centre, and spread per axis.
const DOMES = [
  { amplitude: 14, x: -8, z: -52, spreadX: 38, spreadZ: 22 },
  { amplitude: 9, x: 45, z: -85, spreadX: 30, spreadZ: 25 },
  { amplitude: 7, x: -70, z: -110, spreadX: 45, spreadZ: 30 },
];

function dome({ amplitude, x: cx, z: cz, spreadX, spreadZ }, x, z) {
  return amplitude * Math.exp(-(((x - cx) / spreadX) ** 2 + ((z - cz) / spreadZ) ** 2));
}

export function terrainHeight(x, z) {
  let height = 0;
  for (const shape of DOMES) height += dome(shape, x, z);
  const ridge = 6 * Math.exp(-(((z + 135) / 30) ** 2)) * (1 + 0.3 * Math.sin(x * 0.03));
  const rolls = 0.6 * Math.sin(x * 0.09 + z * 0.05) + 0.4 * Math.sin(x * 0.05 - z * 0.11 + 1.3);
  return height + ridge + rolls;
}

// Highest grid sample within the bounds; ties keep the first sample found.
export function findCrest({ xMin, xMax, zMin, zMax }, step, heightAt = terrainHeight) {
  const columns = Math.round((xMax - xMin) / step);
  const rows = Math.round((zMax - zMin) / step);
  let best = null;
  for (let i = 0; i <= columns; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const x = xMin + i * step;
      const z = zMin + j * step;
      const y = heightAt(x, z);
      if (!best || y > best.y) best = { x, y, z };
    }
  }
  return best;
}

export function scatterOnTerrain(random, count, { xMin, xMax, zMin, zMax }) {
  return Array.from({ length: count }, () => {
    const x = xMin + random() * (xMax - xMin);
    const z = zMin + random() * (zMax - zMin);
    return { x, y: terrainHeight(x, z), z };
  });
}
