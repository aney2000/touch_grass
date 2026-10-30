import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFallingParticles } from "../../src/three/falling.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const look = (particleRates) => ({ look: { particleRates } });
const frame = (rates, overrides = {}) => ({
  now: 0,
  seconds: 0,
  delta: 1 / 30,
  motionScale: 1,
  atmosphere: atmosphereAt(0),
  season: look(rates),
  wind: { gusts: new Float32Array(24) },
  ...overrides,
});
const NONE = { petals: 0, leaves: 0, snow: 0 };

const run = (system, rates, steps = 60) => {
  for (let i = 0; i < steps; i += 1) system.update(frame(rates, { now: i * 33, seconds: i / 30 }));
};

describe("createFallingParticles", () => {
  it("draws leaves and petals as double-sided instanced quads and snow as points", () => {
    const system = createFallingParticles({ capacity: 120 });
    assert.ok(system.flakes instanceof THREE.InstancedMesh);
    assert.equal(system.flakes.material.side, THREE.DoubleSide);
    assert.ok(system.snow instanceof THREE.Points);
    assert.equal(system.flakes.instanceMatrix.count, 120);
  });

  it("is hidden while every rate is zero", () => {
    const system = createFallingParticles({ capacity: 60 });
    run(system, NONE, 5);
    assert.equal(system.object.visible, false);
  });

  it("instances falling leaves with moving matrices and colours", () => {
    const system = createFallingParticles({ capacity: 120 });
    run(system, { ...NONE, leaves: 0.7 }, 30);
    assert.equal(system.object.visible, true);
    assert.ok(system.flakes.count > 0);
    const before = new THREE.Matrix4();
    system.flakes.getMatrixAt(0, before);
    run(system, { ...NONE, leaves: 0.7 }, 2);
    const after = new THREE.Matrix4();
    system.flakes.getMatrixAt(0, after);
    assert.notDeepEqual(before.elements, after.elements);
    assert.ok(system.flakes.instanceColor);
    assert.equal(system.snow.geometry.drawRange.count, 0);
  });

  it("fills the snow points in winter", () => {
    const system = createFallingParticles({ capacity: 120 });
    run(system, { ...NONE, snow: 0.8 }, 30);
    assert.ok(system.snow.geometry.drawRange.count > 0);
    assert.equal(system.flakes.count, 0);
  });

  it("does not flag buffer uploads while nothing is alive", () => {
    const system = createFallingParticles({ capacity: 60 });
    run(system, NONE, 3);
    const versions = () => [
      system.flakes.instanceMatrix.version,
      system.flakes.instanceColor.version,
      system.snow.geometry.attributes.position.version,
    ];
    const before = versions();
    run(system, NONE, 5);
    assert.equal(system.flakes.count, 0);
    assert.deepEqual(versions(), before);
  });

  it("only uploads the flake buffers that changed while snowing", () => {
    const system = createFallingParticles({ capacity: 60 });
    run(system, { ...NONE, snow: 1 }, 10);
    const before = system.flakes.instanceMatrix.version;
    run(system, { ...NONE, snow: 1 }, 5);
    assert.equal(system.flakes.instanceMatrix.version, before);
  });
});
