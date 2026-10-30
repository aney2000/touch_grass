import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBirds } from "../../src/three/birds.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const canopies = [
  { x: -30, y: 9, z: -60, radius: 4 },
  { x: 25, y: 10, z: -90, radius: 5 },
];

function frame(seconds, dayAmount) {
  return {
    now: seconds * 1000,
    seconds,
    dayAmount,
    atmosphere: atmosphereAt(dayAmount),
    season: { name: "summer" },
    motionScale: 1,
  };
}

function simulate(birds, dayAmount, onFrame = () => {}) {
  for (let s = 0; s < 120; s += 0.05) {
    birds.update(frame(s, dayAmount));
    onFrame();
  }
}

describe("createBirds", () => {
  it("draws one instance per visible bird, never more than the budget", () => {
    const birds = createBirds({ canopies, maxBirds: 4, random: () => 0.3 });
    const mesh = birds.object;
    assert.equal(mesh.frustumCulled, false);
    let peak = 0;
    simulate(birds, 1, () => {
      const visible = birds.aviary.birds.filter((b) => b.visible).length;
      assert.equal(mesh.count, visible);
      peak = Math.max(peak, mesh.count);
    });
    assert.ok(peak > 0 && peak <= 4);
  });

  it("stays empty at night", () => {
    const birds = createBirds({ canopies, maxBirds: 6, random: () => 0.3 });
    simulate(birds, 0, () => assert.equal(birds.object.count, 0));
  });

  it("disposes its geometry and material", () => {
    const birds = createBirds({ canopies });
    let disposed = 0;
    birds.object.geometry.addEventListener("dispose", () => (disposed += 1));
    birds.object.material.addEventListener("dispose", () => (disposed += 1));
    birds.dispose();
    assert.equal(disposed, 2);
  });
});
