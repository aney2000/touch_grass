import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAviary, stepAviary, flightRate, birdsForTier } from "../src/birds.js";

const canopies = [
  { x: -30, y: 9, z: -60, radius: 4 },
  { x: 25, y: 10, z: -90, radius: 5 },
  { x: 0, y: 8, z: -50, radius: 3 },
];

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const summer = { name: "summer" };
const winter = { name: "winter" };

function run(aviary, seconds, env, onStep = () => {}) {
  for (let t = 0; t < seconds; t += 0.05) {
    stepAviary(aviary, 0.05, env);
    onStep(aviary);
  }
}

function insideCanopyOrOffscreen(p) {
  const inCanopy = canopies.some(
    (c) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) <= c.radius + 0.01,
  );
  return inCanopy || Math.abs(p.x) > 100 || p.y > 60;
}

describe("flightRate", () => {
  it("is zero at night, rare at dusk and lower in winter", () => {
    assert.equal(flightRate({ dayAmount: 0.1, season: summer }), 0);
    const day = flightRate({ dayAmount: 1, season: summer });
    assert.ok(flightRate({ dayAmount: 0.4, season: summer }) < day * 0.5);
    assert.ok(flightRate({ dayAmount: 1, season: winter }) < day);
  });
});

describe("a calm sky", () => {
  function observe(seconds) {
    const aviary = createAviary({ canopies, random: seeded(42), maxBirds: 50 });
    const launches = [];
    const sizes = [];
    let flights = 0;
    let t = 0;
    for (; t < seconds; t += 0.05) {
      const before = aviary.birds.length;
      stepAviary(aviary, 0.05, { dayAmount: 1, season: summer });
      if (aviary.flightsLaunched > flights) {
        flights = aviary.flightsLaunched;
        launches.push(t);
        sizes.push(aviary.birds.length - before);
      }
    }
    return { launches, sizes };
  }

  it("sends a flight about every 20 s at full day, 14 to 30 s apart", () => {
    const { launches } = observe(4000);
    const gaps = launches.slice(1).map((t, i) => t - launches[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    assert.ok(mean > 18 && mean < 24, `mean gap ${mean}`);
    for (const gap of gaps) assert.ok(gap >= 13.9 && gap <= 30.1, `gap ${gap}`);
  });

  it("flies mostly alone or in twos and threes; four or five is a rare sight", () => {
    const { sizes } = observe(8000);
    const large = sizes.filter((size) => size >= 4).length;
    assert.ok(sizes.every((size) => size >= 1 && size <= 5));
    assert.ok(large > 0, "a bigger flock still happens now and then");
    assert.ok(large / sizes.length <= 0.1, `${large} of ${sizes.length} flocks were large`);
  });
});

describe("birdsForTier", () => {
  it("scales the flock budget with quality", () => {
    assert.deepEqual(["low", "mid", "high"].map(birdsForTier), [4, 6, 8]);
  });
});

describe("stepAviary", () => {
  it("never launches a flight at night", () => {
    const aviary = createAviary({ canopies, random: seeded(), maxBirds: 8 });
    let seen = 0;
    run(aviary, 120, { dayAmount: 0, season: summer }, (a) => (seen += a.birds.length));
    assert.equal(seen, 0);
  });

  it("is deterministic for a seeded random", () => {
    const a = createAviary({ canopies, random: seeded(3), maxBirds: 6 });
    const b = createAviary({ canopies, random: seeded(3), maxBirds: 6 });
    run(a, 40, { dayAmount: 1, season: summer });
    run(b, 40, { dayAmount: 1, season: summer });
    assert.deepEqual(a.birds, b.birds);
  });

  it("flies birds between canopies or off-screen, respecting maxBirds", () => {
    const aviary = createAviary({ canopies, random: seeded(11), maxBirds: 4 });
    const flights = new Map();
    let peak = 0;
    run(aviary, 200, { dayAmount: 1, season: summer }, (a) => {
      peak = Math.max(peak, a.birds.length);
      for (const bird of a.birds) {
        if (!flights.has(bird.id)) flights.set(bird.id, { start: { ...bird.position } });
        flights.get(bird.id).end = { ...bird.position };
      }
    });
    assert.ok(flights.size > 0);
    assert.ok(peak <= 4);
    for (const { start } of flights.values()) {
      assert.ok(insideCanopyOrOffscreen(start), `start ${JSON.stringify(start)}`);
    }
    const ended = [...flights.values()].filter((f) => insideCanopyOrOffscreen(f.end));
    assert.ok(ended.length > 0);
  });

  it("hides perched birds and advances wing phase in flight", () => {
    const aviary = createAviary({ canopies, random: seeded(5), maxBirds: 6 });
    let checked = false;
    run(aviary, 60, { dayAmount: 1, season: summer }, (a) => {
      for (const bird of a.birds) {
        if (bird.progress <= 0 || bird.progress >= 1) assert.equal(bird.visible, false);
      }
      const flying = a.birds.find((b) => b.visible);
      if (flying && !checked) {
        const before = flying.wingPhase;
        stepAviary(a, 0.05, { dayAmount: 1, season: summer });
        if (a.birds.includes(flying)) assert.notEqual(flying.wingPhase, before);
        checked = true;
      }
    });
    assert.ok(checked);
  });

  it("slows flight under reduced motion", () => {
    const fast = createAviary({ canopies, random: seeded(9), maxBirds: 6 });
    const slow = createAviary({ canopies, random: seeded(9), maxBirds: 6 });
    // Same seed, so both launch the same first flight on the first step.
    stepAviary(fast, 30, { dayAmount: 1, season: summer });
    stepAviary(slow, 30, { dayAmount: 1, season: summer, motionScale: 0.25 });
    assert.ok(fast.birds.length > 0 && slow.birds.length > 0);
    stepAviary(fast, 1, { dayAmount: 1, season: summer });
    stepAviary(slow, 1, { dayAmount: 1, season: summer, motionScale: 0.25 });
    assert.ok(slow.birds[0].progress < fast.birds[0].progress);
  });

  it("launches fewer flights in winter", () => {
    const count = (season) => {
      const aviary = createAviary({ canopies, random: seeded(21), maxBirds: 8 });
      run(aviary, 600, { dayAmount: 1, season });
      return aviary.flightsLaunched;
    };
    assert.ok(count(winter) < count(summer));
  });
});
