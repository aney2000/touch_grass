// Constellations: real star patterns placed in the visible night sky window.
// Stars are given by their catalogue right ascension (hours) and declination
// (degrees) and projected into the scene's elevation/azimuth space, so the
// shapes keep their true proportions. The circumpolar group (Ursa Major,
// Ursa Minor, Cassiopeia) shares one projection around Polaris, so the
// Merak -> Dubhe pointer really does lead to the pole star.

const DEG = Math.PI / 180;

// Same convention as atmosphere.js: azimuth 0 looks straight ahead (-z).
function directionFrom(elevation, azimuth) {
  const flat = Math.cos(elevation);
  return [flat * Math.sin(azimuth), Math.sin(elevation), -flat * Math.cos(azimuth)];
}

// Around the pole: offset = r * (cos psi, sin psi), psi grows with RA
// (counter-clockwise, as seen from inside the sphere looking north).
const POLE = { azimuth: -0.42, elevation: 0.6, scale: 0.55, rotation: -6 * DEG };

function polar(name, ra, dec, magnitude) {
  const r = (90 - dec) * DEG * POLE.scale;
  const psi = ra * 15 * DEG + POLE.rotation;
  return {
    name,
    magnitude,
    azimuth: POLE.azimuth + (r * Math.cos(psi)) / Math.cos(POLE.elevation),
    elevation: POLE.elevation + r * Math.sin(psi),
  };
}

// A local tangent-plane projection for a constellation away from the pole.
// East (higher RA) is to the left, as on the real sky facing south.
function local(origin) {
  return (name, ra, dec, magnitude) => ({
    name,
    magnitude,
    azimuth:
      origin.azimuth -
      ((ra - origin.ra) * 15 * Math.cos(origin.dec * DEG) * DEG * origin.scale) /
        Math.cos(origin.elevation),
    elevation: origin.elevation + (dec - origin.dec) * DEG * origin.scale,
  });
}

const orion = local({ ra: 5.58, dec: 0, azimuth: 0.86, elevation: 0.6, scale: 0.9 });

export const CONSTELLATIONS = [
  {
    name: "Big Dipper",
    stars: [
      polar("Dubhe", 11.062, 61.75, 1.8),
      polar("Merak", 11.031, 56.38, 2.4),
      polar("Phecda", 11.897, 53.69, 2.4),
      polar("Megrez", 12.257, 57.03, 3.3),
      polar("Alioth", 12.9, 55.96, 1.8),
      polar("Mizar", 13.399, 54.93, 2.2),
      polar("Alkaid", 13.792, 49.31, 1.9),
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: "Little Dipper",
    stars: [
      polar("Polaris", 2.53, 89.26, 2.0),
      polar("Yildun", 17.537, 86.59, 4.4),
      polar("Epsilon Ursae Minoris", 16.766, 82.04, 4.2),
      polar("Zeta Ursae Minoris", 15.734, 77.79, 4.3),
      polar("Kochab", 14.845, 74.16, 2.1),
      polar("Pherkad", 15.345, 71.83, 3.0),
      polar("Eta Ursae Minoris", 16.292, 75.76, 5.0),
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    name: "Cassiopeia",
    stars: [
      polar("Caph", 0.153, 59.15, 2.3),
      polar("Schedar", 0.675, 56.54, 2.2),
      polar("Navi", 0.945, 60.72, 2.5),
      polar("Ruchbah", 1.43, 60.24, 2.7),
      polar("Segin", 1.906, 63.67, 3.4),
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "Orion",
    stars: [
      orion("Betelgeuse", 5.919, 7.41, 0.5),
      orion("Bellatrix", 5.419, 6.35, 1.6),
      orion("Alnitak", 5.679, -1.94, 1.8),
      orion("Alnilam", 5.603, -1.2, 1.7),
      orion("Mintaka", 5.533, -0.3, 2.2),
      orion("Saiph", 5.796, -9.67, 2.1),
      orion("Rigel", 5.242, -8.2, 0.1),
      orion("Meissa", 5.585, 9.93, 3.4),
    ],
    lines: [
      [7, 0],
      [7, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
    ],
  },
];

// The dashed guide from Merak through Dubhe to Polaris.
export const POINTER = {
  from: ["Big Dipper", "Merak"],
  via: ["Big Dipper", "Dubhe"],
  to: ["Little Dipper", "Polaris"],
};

export function findStar(constellation, star) {
  const group = CONSTELLATIONS.find((entry) => entry.name === constellation);
  return group?.stars.find((entry) => entry.name === star) ?? null;
}

export function constellationDirection(star) {
  return directionFrom(star.elevation, star.azimuth);
}

// World-space unit vectors for every star, plus the line pairs.
export function layoutConstellations(constellations = CONSTELLATIONS) {
  return constellations.map(({ name, stars, lines }) => ({
    name,
    lines,
    stars: stars.map((star) => ({ ...star, direction: constellationDirection(star) })),
  }));
}

export function angleBetween(a, b) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const length = Math.hypot(...a) * Math.hypot(...b) || 1;
  return Math.acos(Math.min(1, Math.max(-1, dot / length)));
}

// The constellation with a star nearest the given view direction, if within
// `threshold` radians; otherwise null. Used for click/tap spotting.
export function pickConstellation(direction, threshold = 0.08, layout = layoutConstellations()) {
  let best = null;
  let bestAngle = threshold;
  for (const group of layout) {
    for (const star of group.stars) {
      const angle = angleBetween(direction, star.direction);
      if (angle <= bestAngle) {
        bestAngle = angle;
        best = group.name;
      }
    }
  }
  return best;
}
