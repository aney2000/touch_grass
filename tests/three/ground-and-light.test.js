import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTerrain } from "../../src/three/terrain.js";
import { createLights } from "../../src/three/lights.js";
import { terrainHeight } from "../../src/terrain.js";
import { setSrgb } from "../../src/three/color.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const frame = (dayAmount) => ({ seconds: 0, atmosphere: atmosphereAt(dayAmount) });

describe("createTerrain", () => {
  it("shapes the ground mesh from the shared height field", () => {
    const { object } = createTerrain({ segments: 24 });
    const position = object.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 37) {
      const expected = terrainHeight(position.getX(i), position.getZ(i));
      assert.ok(Math.abs(position.getY(i) - expected) < 1e-4);
    }
  });

  it("lays the ground flat in the xz-plane with lighting normals", () => {
    const { object } = createTerrain({ segments: 8 });
    assert.ok(object.geometry.getAttribute("normal"));
    const box = new THREE.Box3().setFromObject(object);
    assert.ok(box.max.x - box.min.x > 100 && box.max.z - box.min.z > 100);
  });

  it("varies the ground colour so crests catch the light", () => {
    const { object } = createTerrain({ segments: 24 });
    const colors = object.geometry.getAttribute("color");
    const shades = new Set();
    for (let i = 0; i < colors.count; i += 11) shades.add(colors.getX(i).toFixed(2));
    assert.ok(shades.size > 3);
  });

  it("tints the grassland from the atmosphere", () => {
    const terrain = createTerrain({ segments: 4 });
    terrain.update(frame(1));
    const expected = setSrgb(new THREE.Color(), atmosphereAt(1).hill);
    assert.ok(terrain.object.material.color.equals(expected));
  });
});

describe("createLights", () => {
  it("points the sun light along the atmosphere's sun direction", () => {
    const lights = createLights();
    lights.update(frame(0.2));
    const direction = lights.sun.position.clone().sub(lights.sun.target.position).normalize();
    const expected = new THREE.Vector3(...atmosphereAt(0.2).sunDirection);
    assert.ok(direction.distanceTo(expected) < 1e-6);
  });

  it("hands the sky over from sun to moonlight as night falls", () => {
    const lights = createLights();
    lights.update(frame(0));
    assert.ok(lights.sun.intensity > 0 && lights.moon.intensity === 0);
    lights.update(frame(1));
    assert.ok(lights.sun.intensity === 0 && lights.moon.intensity > 0);
  });

  it("drives the ambient fill from the atmosphere", () => {
    const lights = createLights();
    lights.update(frame(0.6));
    assert.equal(lights.ambient.intensity, atmosphereAt(0.6).ambientIntensity);
  });
});
