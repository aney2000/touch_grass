import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createConstellations, createSkyPicker } from "../../src/three/constellations.js";
import { CONSTELLATIONS } from "../../src/constellations.js";
import { atmosphereAt } from "../../src/atmosphere.js";

const fakeLabel = (name) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
  sprite.name = name;
  return sprite;
};

function frame({ dayAmount = 1, reveal = 0, highlight = null, highlightAmount = 0, now = 0 } = {}) {
  return {
    now,
    seconds: now / 1000,
    motionScale: 1,
    atmosphere: atmosphereAt(dayAmount),
    constellations: { visible: reveal > 0, reveal, highlight, highlightAmount },
  };
}

describe("createSkyPicker", () => {
  it("turns a tap on a star into its constellation name", () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.updateMatrixWorld();
    const star = CONSTELLATIONS.find((c) => c.name === "Orion").stars[3];
    const world = new THREE.Vector3(
      Math.cos(star.elevation) * Math.sin(star.azimuth),
      Math.sin(star.elevation),
      -Math.cos(star.elevation) * Math.cos(star.azimuth),
    ).multiplyScalar(500);
    const ndc = world.clone().project(camera);
    const pick = createSkyPicker(camera);
    assert.equal(pick({ x: ndc.x, y: ndc.y }), "Orion");
    assert.equal(pick({ x: 0, y: -0.99 }), null);
  });
});

describe("createConstellations", () => {
  it("builds stars, lines and one label per constellation", () => {
    const system = createConstellations({ createLabel: fakeLabel });
    const { object, stars, lines, labels } = system;
    const starCount = CONSTELLATIONS.reduce((sum, c) => sum + c.stars.length, 0);
    assert.ok(object instanceof THREE.Group);
    assert.ok(stars instanceof THREE.Points);
    assert.equal(stars.geometry.getAttribute("position").count, starCount);
    assert.equal(lines.length, CONSTELLATIONS.length);
    assert.ok(lines.every((line) => line instanceof THREE.LineSegments));
    assert.equal(labels.length, CONSTELLATIONS.length);
    assert.equal(stars.material.fog, false);
    assert.equal(stars.material.depthWrite, false);
    assert.equal(object.renderOrder, -1);
    system.dispose();
  });

  it("is invisible by day", () => {
    const system = createConstellations({ createLabel: fakeLabel });
    system.update(frame({ dayAmount: 0, reveal: 1 }));
    assert.equal(system.stars.material.uniforms.uVisibility.value, 0);
    assert.ok(system.lines.every((line) => line.material.opacity === 0));
    assert.ok(system.labels.every((label) => label.material.opacity === 0));
  });

  it("shows stars but hides lines at night when the mode is off", () => {
    const system = createConstellations({ createLabel: fakeLabel });
    system.update(frame({ dayAmount: 1, reveal: 0 }));
    assert.ok(system.stars.material.uniforms.uVisibility.value > 0.9);
    assert.ok(system.lines.every((line) => line.material.opacity === 0 && !line.visible));
  });

  it("raises line and label opacity with the reveal at night", () => {
    const system = createConstellations({ createLabel: fakeLabel });
    system.update(frame({ reveal: 0.5 }));
    const half = system.lines[0].material.opacity;
    system.update(frame({ reveal: 1 }));
    const full = system.lines[0].material.opacity;
    assert.ok(half > 0 && full > half);
    assert.ok(system.labels[0].material.opacity > 0);
  });

  it("reveals only the highlighted constellation when spotted", () => {
    const system = createConstellations({ createLabel: fakeLabel });
    system.update(frame({ highlight: "Orion", highlightAmount: 1 }));
    const index = CONSTELLATIONS.findIndex((c) => c.name === "Orion");
    system.lines.forEach((line, i) => {
      if (i === index) assert.ok(line.material.opacity > 0.5);
      else assert.equal(line.material.opacity, 0);
    });
  });
});
