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

// Colour as [r, g, b] in 0..1, the form WebGL materials and uniforms expect.
export function hexToUnitRgb(hex) {
  return hexToRgb(hex).map((channel) => channel / 255);
}

// Endpoint-exact lerp form, so amount 0 or 1 yields the input colour bit-for-bit.
export function mixRgb(first, second, amount) {
  return first.map((value, index) => value * (1 - amount) + second[index] * amount);
}

export function mixHex(first, second, amount) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(",")})`;
}

export function smoothstep(edgeA, edgeB, value) {
  const amount = clamp((value - edgeA) / (edgeB - edgeA), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

// Warm sunrise/sunset glow strength: 0 in full day or night, peaking mid-transition.
export function twilightAmount(dayAmount) {
  const amount = clamp(dayAmount, 0, 1);
  if (amount === 0 || amount === 1) return 0;
  return Math.sin(amount * Math.PI);
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
