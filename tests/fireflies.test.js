import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createFireflySwarm,
  fireflyFlight,
  fireflyFlash,
  snapshotSwarm,
} from "../src/fireflies.js";
import { randomGenerator } from "../src/scene-math.js";

const area = { xMin: -10, xMax: 10, zMin: -12, zMax: 4 };

describe("createFireflySwarm", () => {
  it("creates the requested number of fireflies homed inside the area", () => {
    const swarm = createFireflySwarm(randomGenerator(5), 40, area);
    assert.equal(swarm.length, 40);
    for (const fly of swarm) {
      assert.ok(fly.home.x >= area.xMin && fly.home.x <= area.xMax);
      assert.ok(fly.home.z >= area.zMin && fly.home.z <= area.zMax);
    }
  });

  it("hovers each firefly above the grass rather than inside the ground", () => {
    for (const fly of createFireflySwarm(randomGenerator(5), 40, area)) {
      assert.ok(fly.hover >= 0.3);
    }
  });

  it("is reproducible", () => {
    assert.deepEqual(
      createFireflySwarm(randomGenerator(2), 8, area),
      createFireflySwarm(randomGenerator(2), 8, area),
    );
  });
});

describe("fireflyFlight", () => {
  const [fly] = createFireflySwarm(randomGenerator(11), 1, area);

  it("wanders within its drift range around home", () => {
    for (let t = 0; t < 60; t += 0.37) {
      const { x, z } = fireflyFlight(fly, t);
      assert.ok(Math.abs(x - fly.home.x) <= fly.drift + 1e-9);
      assert.ok(Math.abs(z - fly.home.z) <= fly.drift + 1e-9);
    }
  });

  it("actually moves over time", () => {
    const a = fireflyFlight(fly, 0);
    const b = fireflyFlight(fly, 2);
    assert.notDeepEqual(a, b);
  });

  it("stays above the ground it hovers over", () => {
    for (let t = 0; t < 30; t += 0.5) {
      const { y, groundY } = fireflyFlight(fly, t);
      assert.ok(y > groundY);
    }
  });
});

describe("fireflyFlash", () => {
  const fly = { flashRate: 0.5, flashOffset: 0, flashDuty: 0.3 };

  it("stays within 0..1", () => {
    for (let t = 0; t < 20; t += 0.01) {
      const value = fireflyFlash(fly, t);
      assert.ok(value >= 0 && value <= 1);
    }
  });

  it("goes fully dark between flashes, like a real firefly", () => {
    assert.equal(fireflyFlash(fly, 1.5), 0);
  });

  it("peaks near full brightness mid-flash", () => {
    assert.ok(fireflyFlash(fly, 0.3) > 0.95);
  });
});

describe("snapshotSwarm", () => {
  const swarm = createFireflySwarm(randomGenerator(8), 3, area);

  it("captures each firefly's position, glow, and size at a moment", () => {
    const [first] = snapshotSwarm(swarm, 4.2);
    const { x, y, z } = fireflyFlight(swarm[0], 4.2);
    assert.deepEqual(first, { x, y, z, glow: fireflyFlash(swarm[0], 4.2), size: swarm[0].size });
  });

  it("reuses the output array and its entries to avoid per-frame garbage", () => {
    const out = snapshotSwarm(swarm, 1);
    const entry = out[0];
    assert.equal(snapshotSwarm(swarm, 2, out), out);
    assert.equal(out[0], entry);
    assert.equal(out.length, 3);
  });
});
