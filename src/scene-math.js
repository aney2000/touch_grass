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
