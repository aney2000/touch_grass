// Pure, DOM-free helpers for the meadow scene. Kept isolated so they can be unit tested.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomGenerator(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function hexToRgb(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

export function mixHex(first, second, amount) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(",")})`;
}

export function blendColor(first, second, amount) {
  return mixHex(first, second, amount);
}

export function smoothstep(edgeA, edgeB, value) {
  const amount = clamp((value - edgeA) / (edgeB - edgeA), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

// Warm sunrise/sunset glow strength: 0 in full day or night, peaking mid-transition.
export function twilightAmount(dayAmount) {
  return Math.sin(clamp(dayAmount, 0, 1) * Math.PI);
}

// A single axis of a cubic Bézier curve, used to sample the hill silhouette.
export function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// The visually highest point of a sampled curve (smallest y); ties keep the first.
export function highestPoint(points) {
  return points.reduce((best, point) => (point.y < best.y ? point : best));
}

// A firefly wandering on two gentle sine paths while its glow pulses between 0 and 1.
export function fireflyAt(fly, now) {
  return {
    x: fly.x + Math.sin(now * fly.driftSpeed + fly.phase) * fly.driftX,
    y: fly.y + Math.cos(now * fly.driftSpeed * 0.8 + fly.phase) * fly.driftY,
    glow: (Math.sin(now * fly.glowSpeed + fly.phase) + 1) / 2,
  };
}

// A shooting star travelling in a straight line, fading in then out over its lifetime.
export function shootingStarAt(star, now) {
  const progress = clamp((now - star.bornAt) / star.duration, 0, 1);
  const distance = progress * star.length;
  return {
    progress,
    x: star.x + Math.cos(star.angle) * distance,
    y: star.y + Math.sin(star.angle) * distance,
    opacity: Math.sin(progress * Math.PI),
    done: now >= star.bornAt + star.duration,
  };
}

// Horizontal displacement of a grass blade tip: a slow idle sway plus any passing wind gusts,
// clamped so a blade never bends past a believable limit.
export function grassBend(blade, { gusts = [], height, now, motionScale = 1 } = {}) {
  let bend =
    Math.sin(now * 0.0008 + blade.phase + blade.x * 0.004) *
    blade.height *
    height *
    0.085 *
    motionScale;

  for (const gust of gusts) {
    const age = now - gust.startedAt;
    const distance = (blade.x - gust.x) * gust.direction;
    const wave = Math.exp(-(((distance - age * 0.1) / 34) ** 2));
    bend += wave * gust.strength * blade.height * height * 0.56 * Math.exp(-age / 1500);
  }

  const limit = blade.height * height * 0.68;
  return clamp(bend, -limit, limit);
}
