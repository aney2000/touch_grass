import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWorld } from "../../src/three/world.js";
import { setSrgb } from "../../src/three/color.js";
import { atmosphereAt } from "../../src/atmosphere.js";

function fakeSystem(name, log) {
  return {
    object: Object.assign(new THREE.Group(), { name }),
    update: (frame) => log.push([name, frame.seconds]),
    dispose: () => log.push([name, "disposed"]),
  };
}

describe("setSrgb", () => {
  it("stores an sRGB triple as the linear colour three.js works in", () => {
    const color = setSrgb(new THREE.Color(), [1, 0.5, 0]);
    assert.equal(color.r, 1);
    assert.ok(color.g > 0.2 && color.g < 0.22, "0.5 sRGB is ~0.214 linear");
    assert.equal(color.getHexString(THREE.SRGBColorSpace), "ff8000");
  });
});

describe("createWorld", () => {
  it("adds every system's object to the scene in order", () => {
    const world = createWorld([fakeSystem("sky", []), fakeSystem("grass", [])]);
    assert.deepEqual(
      world.scene.children.map((child) => child.name),
      ["sky", "grass"],
    );
  });

  it("updates systems in pipeline order with the shared frame", () => {
    const log = [];
    const world = createWorld([fakeSystem("a", log), fakeSystem("b", log)]);
    world.update({ seconds: 2, atmosphere: atmosphereAt(0) });
    assert.deepEqual(log, [
      ["a", 2],
      ["b", 2],
    ]);
  });

  it("tints the fog with the atmosphere so distant hills fade into the sky", () => {
    const world = createWorld([]);
    const atmosphere = atmosphereAt(0.5);
    world.update({ seconds: 0, atmosphere });
    const expected = setSrgb(new THREE.Color(), atmosphere.fog);
    assert.ok(world.scene.fog.color.equals(expected));
  });

  it("tolerates systems without update or dispose hooks", () => {
    const world = createWorld([{ object: new THREE.Group() }]);
    world.update({ seconds: 0, atmosphere: atmosphereAt(0) });
    world.dispose();
  });

  it("disposes every system and empties the scene", () => {
    const log = [];
    const world = createWorld([fakeSystem("a", log)]);
    world.dispose();
    assert.deepEqual(log, [["a", "disposed"]]);
    assert.equal(world.scene.children.length, 0);
  });
});
