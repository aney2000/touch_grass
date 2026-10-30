import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createConstellations, createSkyPicker } from "../../src/three/constellations.js";
import { CONSTELLATIONS, findStar, starFlux } from "../../src/constellations.js";
import { atmosphereAt } from "../../src/atmosphere.js";

function frame({ dayAmount = 1, reveal = 0, highlight = null, highlightAmount = 0, now = 0 } = {}) {
  return {
    now,
    seconds: now / 1000,
    motionScale: 1,
    atmosphere: atmosphereAt(dayAmount),
    constellations: { visible: reveal > 0, reveal, highlight, highlightAmount },
  };
}

const allStars = CONSTELLATIONS.flatMap((c) => c.stars);
const indexOf = (group, name) => allStars.indexOf(findStar(group, name));

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
  it("builds stars and one line overlay per constellation", () => {
    const system = createConstellations();
    const { object, stars, lines } = system;
    assert.ok(object instanceof THREE.Group);
    assert.ok(stars instanceof THREE.Points);
    assert.equal(stars.geometry.getAttribute("position").count, allStars.length);
    assert.equal(lines.length, CONSTELLATIONS.length);
    assert.ok(lines.every((line) => line instanceof THREE.LineSegments));
    assert.equal(stars.material.fog, false);
    assert.equal(stars.material.depthWrite, false);
    assert.equal(object.renderOrder, -1);
    system.dispose();
  });

  it("puts no text in the sky", () => {
    const system = createConstellations();
    assert.equal(system.labels, undefined);
    system.object.traverse((child) => {
      assert.ok(!(child instanceof THREE.Sprite), `sprite ${child.name}`);
      const map = child.material?.map;
      assert.ok(!(map instanceof THREE.CanvasTexture), "no canvas text texture");
    });
  });

  it("sizes stars by Pogson flux and tints them by colour index", () => {
    const system = createConstellations();
    const size = system.stars.geometry.getAttribute("aSize");
    const color = system.stars.geometry.getAttribute("color");
    const rigel = indexOf("Orion", "Rigel");
    const mizar = indexOf("Big Dipper", "Mizar");
    const alcor = indexOf("Big Dipper", "Alcor");
    assert.ok(size.getX(rigel) > size.getX(mizar) && size.getX(mizar) > size.getX(alcor));
    const ratio = size.getX(rigel) ** 2 / size.getX(mizar) ** 2;
    const flux = starFlux(0.1) / starFlux(2.2);
    assert.ok(ratio > 1.5 && ratio < flux * 1.01, `area ratio ${ratio}`);
    const betelgeuse = indexOf("Orion", "Betelgeuse");
    assert.ok(color.getX(betelgeuse) > color.getZ(betelgeuse) + 0.3);
    assert.ok(color.getZ(rigel) > color.getX(rigel));
  });

  it("renders the Orion Nebula as a faint soft glow, not a sharp star", () => {
    const system = createConstellations();
    const soft = system.stars.geometry.getAttribute("aSoft");
    const nebula = indexOf("Orion", "Orion Nebula");
    assert.equal(soft.getX(nebula), 1);
    assert.equal(soft.getX(indexOf("Orion", "Rigel")), 0);
  });

  it("twinkles more for stars nearer the horizon", () => {
    const system = createConstellations();
    const depth = system.stars.geometry.getAttribute("aScintillation");
    const low = allStars.reduce((a, b) => (b.elevation < a.elevation ? b : a));
    const high = allStars.reduce((a, b) => (b.elevation > a.elevation ? b : a));
    assert.ok(depth.getX(allStars.indexOf(low)) > depth.getX(allStars.indexOf(high)));
  });

  it("is invisible by day", () => {
    const system = createConstellations();
    system.update(frame({ dayAmount: 0, reveal: 1 }));
    assert.equal(system.stars.material.uniforms.uVisibility.value, 0);
    assert.ok(system.lines.every((line) => line.material.opacity === 0));
  });

  it("shows the real sky with no lines at night when the mode is off", () => {
    const system = createConstellations();
    system.update(frame({ dayAmount: 1, reveal: 0 }));
    assert.ok(system.stars.material.uniforms.uVisibility.value > 0.9);
    assert.ok(system.lines.every((line) => line.material.opacity === 0 && !line.visible));
  });

  it("fades in thin, faint, cool-white chart lines with the reveal", () => {
    const system = createConstellations();
    system.update(frame({ reveal: 0.5 }));
    const half = system.lines[0].material.opacity;
    system.update(frame({ reveal: 1 }));
    const full = system.lines[0].material.opacity;
    assert.ok(half > 0 && full > half);
    assert.ok(full <= 0.3, `opacity ${full}`);
    const { r, b } = system.lines[0].material.color;
    assert.ok(b >= r && b > 0.8 && r > 0.7, "cool white");
  });

  it("traces only the spotted constellation and pulses its stars", () => {
    const system = createConstellations();
    system.update(frame({ highlight: "Orion", highlightAmount: 1 }));
    const index = CONSTELLATIONS.findIndex((c) => c.name === "Orion");
    system.lines.forEach((line, i) => {
      if (i === index) assert.ok(line.material.opacity > 0.15 && line.material.opacity <= 0.3);
      else assert.equal(line.material.opacity, 0);
    });
    const group = system.stars.geometry.getAttribute("aGroup");
    assert.equal(group.getX(indexOf("Orion", "Rigel")), index);
    assert.equal(system.stars.material.uniforms.uHighlightGroup.value, index);
    assert.equal(system.stars.material.uniforms.uHighlight.value, 1);
    system.update(frame({}));
    assert.equal(system.stars.material.uniforms.uHighlight.value, 0);
  });
});
