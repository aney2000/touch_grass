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
// One shared sky scale for every figure, so their angular sizes stay true
// relative to each other (the window is a compressed view of the real sky).
export const SKY_SCALE = 0.6;

const POLE = { azimuth: -0.42, elevation: 0.6, scale: SKY_SCALE, rotation: -6 * DEG };

function polar(name, ra, dec, magnitude, bv, kind = "star") {
  const r = (90 - dec) * DEG * POLE.scale;
  const psi = ra * 15 * DEG + POLE.rotation;
  return {
    name,
    magnitude,
    bv,
    kind,
    azimuth: POLE.azimuth + (r * Math.cos(psi)) / Math.cos(POLE.elevation),
    elevation: POLE.elevation + r * Math.sin(psi),
  };
}

// A local tangent-plane projection for a constellation away from the pole.
// East (higher RA) is to the left, as on the real sky facing south.
function local(origin) {
  return (name, ra, dec, magnitude, bv, kind = "star") => ({
    name,
    magnitude,
    bv,
    kind,
    azimuth:
      origin.azimuth -
      ((ra - origin.ra) * 15 * Math.cos(origin.dec * DEG) * DEG * origin.scale) /
        Math.cos(origin.elevation),
    elevation: origin.elevation + (dec - origin.dec) * DEG * origin.scale,
  });
}

const orion = local({ ra: 5.58, dec: 0, azimuth: 0.86, elevation: 0.6, scale: SKY_SCALE });

// Pogson's law: five magnitudes is exactly a factor of 100 in flux.
export function starFlux(magnitude) {
  return 10 ** (-0.4 * magnitude);
}

// B-V colour index -> a pale RGB tint (blue-white O/B through orange-red M),
// interpolated from tabulated stellar colours.
const COLOR_STOPS = [
  [-0.4, [0.62, 0.72, 1]],
  [0, [0.8, 0.86, 1]],
  [0.4, [1, 0.97, 0.93]],
  [0.6, [1, 0.94, 0.82]],
  [1, [1, 0.84, 0.64]],
  [1.5, [1, 0.74, 0.48]],
  [2, [1, 0.62, 0.36]],
];

export function starColor(bv) {
  const first = COLOR_STOPS[0];
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  if (bv <= first[0]) return [...first[1]];
  if (bv >= last[0]) return [...last[1]];
  const upper = COLOR_STOPS.findIndex(([index]) => index >= bv);
  const [a, from] = COLOR_STOPS[upper - 1];
  const [b, to] = COLOR_STOPS[upper];
  const t = (bv - a) / (b - a);
  return from.map((value, k) => value + (to[k] - value) * t);
}

// Twinkle depth from the air mass a star's light crosses: barely any
// overhead, strong (but bounded) scintillation close to the horizon.
export function scintillation(elevation) {
  const airMass = 1 / Math.max(Math.sin(elevation), 0.05);
  return Math.min(0.5, 0.05 * airMass);
}

export const CONSTELLATIONS = [
  {
    name: "Big Dipper",
    stars: [
      polar("Dubhe", 11.062, 61.75, 1.8, 1.07),
      polar("Merak", 11.031, 56.38, 2.4, -0.02),
      polar("Phecda", 11.897, 53.69, 2.4, 0.04),
      polar("Megrez", 12.257, 57.03, 3.3, 0.08),
      polar("Alioth", 12.9, 55.96, 1.8, -0.02),
      polar("Mizar", 13.399, 54.93, 2.2, 0.02),
      polar("Alkaid", 13.792, 49.31, 1.9, -0.19),
      polar("Alcor", 13.42, 54.99, 4.0, 0.16),
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
      polar("Polaris", 2.53, 89.26, 2.0, 0.6),
      polar("Yildun", 17.537, 86.59, 4.4, 0.03),
      polar("Epsilon Ursae Minoris", 16.766, 82.04, 4.2, 0.89),
      polar("Zeta Ursae Minoris", 15.734, 77.79, 4.3, 0.04),
      polar("Kochab", 14.845, 74.16, 2.1, 1.47),
      polar("Pherkad", 15.345, 71.83, 3.0, 0.05),
      polar("Eta Ursae Minoris", 16.292, 75.76, 5.0, 0.37),
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
      polar("Caph", 0.153, 59.15, 2.3, 0.34),
      polar("Schedar", 0.675, 56.54, 2.2, 1.17),
      polar("Navi", 0.945, 60.72, 2.5, -0.15),
      polar("Ruchbah", 1.43, 60.24, 2.7, 0.13),
      polar("Segin", 1.906, 63.67, 3.4, -0.15),
      polar("Achird", 0.818, 57.82, 3.4, 0.57),
      polar("Zeta Cassiopeiae", 0.616, 53.9, 3.7, -0.2),
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
      orion("Betelgeuse", 5.919, 7.41, 0.5, 1.85),
      orion("Bellatrix", 5.419, 6.35, 1.6, -0.22),
      orion("Alnitak", 5.679, -1.94, 1.8, -0.21),
      orion("Alnilam", 5.603, -1.2, 1.7, -0.18),
      orion("Mintaka", 5.533, -0.3, 2.2, -0.22),
      orion("Saiph", 5.796, -9.67, 2.1, -0.17),
      orion("Rigel", 5.242, -8.2, 0.1, -0.03),
      orion("Meissa", 5.585, 9.93, 3.4, -0.18),
      orion("Hatysa", 5.59, -5.91, 2.8, -0.24),
      orion("Orion Nebula", 5.588, -5.39, 4.0, 0, "nebula"),
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
