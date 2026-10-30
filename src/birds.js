// A small aviary: now and then a little flock leaves one tree and flies a
// smooth arc to another tree, out of view, or in from beyond the view to land.
// Pure state so the timing, routes and flock shape are all testable.

const EXIT_X = 140;
const EXIT_Y = 85;
const CRUISE_SPEED = 11;
const FLAP_HZ_MIN = 6;
const FLAP_HZ_SPAN = 3;
const SEASON_RATE = { spring: 1.2, summer: 1, autumn: 0.8, winter: 0.35 };
const TIER_BIRDS = { low: 4, mid: 6, high: 8 };

export function birdsForTier(tier) {
  return TIER_BIRDS[tier] ?? TIER_BIRDS.mid;
}

// Cumulative odds of a flock of 1, 2, 3, 4 and 5: mostly lone birds and pairs.
const FLOCK_ODDS = [0.4, 0.72, 0.92, 0.97, 1];
// Jitter around the mean interval: 0.7-1.5x, so ~14-30 s at full day.
const INTERVAL_MIN = 0.7;
const INTERVAL_SPAN = 0.8;

// Flights per second: ~1 per 20 s at full day, fading through dusk, none at night.
export function flightRate({ dayAmount, season }) {
  const light = Math.min(1, Math.max(0, (dayAmount - 0.3) / 0.6));
  return ((light * light) / 20) * (SEASON_RATE[season?.name] ?? 1);
}

function flockSize(random) {
  const roll = random();
  return FLOCK_ODDS.findIndex((odds) => roll < odds) + 1 || FLOCK_ODDS.length;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function bezier(p, t, out) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  for (const k of ["x", "y", "z"]) out[k] = a * p[0][k] + b * p[1][k] + c * p[2][k] + d * p[3][k];
  return out;
}

function inside(canopy, random) {
  return {
    x: canopy.x + (random() - 0.5) * canopy.radius * 0.5,
    y: canopy.y + (random() - 0.5) * canopy.radius * 0.3,
    z: canopy.z + (random() - 0.5) * canopy.radius * 0.5,
  };
}

function offscreen(random, nearZ) {
  if (random() < 0.3) return { x: (random() - 0.5) * 120, y: EXIT_Y + 10, z: nearZ - 40 };
  return {
    x: (random() < 0.5 ? -1 : 1) * (EXIT_X + random() * 20),
    y: 20 + random() * 25,
    z: nearZ,
  };
}

function planRoute(aviary) {
  const { canopies, random } = aviary;
  const pick = () => canopies[Math.floor(random() * canopies.length)];
  const roll = random();
  const from = pick();
  let start;
  let end;
  if (roll < 0.45 && canopies.length > 1) {
    let to = pick();
    if (to === from) to = canopies[(canopies.indexOf(from) + 1) % canopies.length];
    start = inside(from, random);
    end = inside(to, random);
  } else if (roll < 0.75) {
    start = inside(from, random);
    end = offscreen(random, from.z);
  } else {
    start = offscreen(random, from.z);
    end = inside(from, random);
  }
  const lift = 6 + random() * 10;
  const control = (p, q, t) => ({
    x: lerp(p.x, q.x, t) + (random() - 0.5) * 12,
    y: Math.max(p.y, q.y) + lift,
    z: lerp(p.z, q.z, t) + (random() - 0.5) * 12,
  });
  const points = [start, control(start, end, 0.3), control(start, end, 0.7), end];
  const length = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z) + lift * 2;
  return { points, duration: length / CRUISE_SPEED };
}

function launch(aviary) {
  const { random } = aviary;
  const room = aviary.maxBirds - aviary.birds.length;
  const size = Math.min(room, flockSize(random));
  if (size <= 0) return;
  const route = planRoute(aviary);
  aviary.flightsLaunched += 1;
  for (let i = 0; i < size; i += 1) {
    const bird = {
      id: aviary.nextId++,
      route,
      // Followers leave a beat after the leader and hold a loose echelon.
      progress: (-i * (0.25 + random() * 0.2)) / route.duration,
      offset: {
        x: (random() - 0.5) * 3 * i,
        y: (random() - 0.5) * 1.2 * i,
        z: (random() - 0.5) * 3 * i,
      },
      flapHz: FLAP_HZ_MIN + random() * FLAP_HZ_SPAN,
      glideAt: random() * 10,
      wingPhase: random() * Math.PI * 2,
      position: { ...route.points[0] },
      heading: 0,
      bank: 0,
      visible: false,
    };
    aviary.birds.push(bird);
  }
}

function flyBird(bird, dt) {
  const previous = { ...bird.position };
  bird.progress += dt / bird.route.duration;
  const t = Math.min(1, Math.max(0, bird.progress));
  bezier(bird.route.points, t, bird.position);
  // Offsets vanish at both ends, so every bird leaves and lands inside the target.
  const spread = Math.sin(Math.PI * t);
  bird.position.x += bird.offset.x * spread;
  bird.position.y += bird.offset.y * spread;
  bird.position.z += bird.offset.z * spread;
  bird.visible = bird.progress > 0 && bird.progress < 1;
  if (!bird.visible) return;

  const heading = Math.atan2(bird.position.x - previous.x, previous.z - bird.position.z);
  const turn = Math.atan2(Math.sin(heading - bird.heading), Math.cos(heading - bird.heading));
  bird.bank = lerp(bird.bank, Math.max(-0.7, Math.min(0.7, turn * 8)), Math.min(1, dt * 4));
  bird.heading = heading;
  // Flap in bursts with short glides, as small songbirds do.
  bird.glideAt += dt;
  const gliding = bird.glideAt % 4 > 3.1;
  bird.wingPhase += dt * bird.flapHz * Math.PI * 2 * (gliding ? 0.08 : 1);
}

export function createAviary({ canopies = [], random = Math.random, maxBirds = 6 } = {}) {
  return {
    canopies,
    random,
    maxBirds,
    birds: [],
    nextId: 0,
    flightsLaunched: 0,
    untilNext: 8 + random() * 12,
  };
}

export function stepAviary(aviary, dtSec, { dayAmount = 1, season, motionScale = 1 } = {}) {
  const flightDt = dtSec * motionScale;
  for (const bird of aviary.birds) flyBird(bird, flightDt);
  aviary.birds = aviary.birds.filter((bird) => bird.progress < 1);

  const rate = flightRate({ dayAmount, season });
  if (rate <= 0 || aviary.canopies.length === 0) return aviary;
  aviary.untilNext -= dtSec;
  if (aviary.untilNext <= 0) {
    launch(aviary);
    // Jittered around the mean interval, so flights never feel metronomic.
    aviary.untilNext = (INTERVAL_MIN + aviary.random() * INTERVAL_SPAN) / rate;
  }
  return aviary;
}
