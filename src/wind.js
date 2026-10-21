// Wind the visitor creates: short-lived ripple gusts in world space, plus a
// smoothed "hand" that parts the grass under the pointer. Pure and tested; the
// grass shader consumes the packed uniforms.

export const GUST_LIMIT = 6;
export const GUST_MAX_AGE_MS = 2600;

const TOUCH_IN_MS = 120;
const TOUCH_OUT_MS = 400;

export function addGust(gusts, { x, z }, strength, now) {
  gusts.push({ x, z, strength, startedAt: now });
  if (gusts.length > GUST_LIMIT) gusts.shift();
  return gusts;
}

export function pruneGusts(gusts, now, maxAge = GUST_MAX_AGE_MS) {
  while (gusts.length && now - gusts[0].startedAt > maxAge) gusts.shift();
  return gusts;
}

// Flatten gusts into [x, z, ageSeconds, strength] quadruples for a vec4 uniform array.
export function gustUniforms(gusts, now, out = new Float32Array(GUST_LIMIT * 4)) {
  out.fill(0);
  gusts.slice(-GUST_LIMIT).forEach((gust, index) => {
    out.set([gust.x, gust.z, (now - gust.startedAt) / 1000, gust.strength], index * 4);
  });
  return out;
}

export function followTouch(state, input, deltaMs) {
  const target = input.active ? 1 : 0;
  const tau = input.active ? TOUCH_IN_MS : TOUCH_OUT_MS;
  const ease = 1 - Math.exp(-deltaMs / tau);
  return {
    x: input.active ? input.x : state.x,
    z: input.active ? input.z : state.z,
    strength: state.strength + (target - state.strength) * ease,
  };
}
