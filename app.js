// Composition root: wires the DOM to the scene model, the 3D world, and input,
// then runs the animation loop. All the heavy lifting lives in ./src.

import { Scene } from "./src/scene.js";
import { createPointerInput } from "./src/input.js";
import { cameraPoseAt } from "./src/camera-rig.js";
import { mixHex } from "./src/scene-math.js";
import { COUNTS, dayPalette, nightPalette } from "./src/config.js";
import { createWorld } from "./src/three/world.js";
import { createStage } from "./src/three/stage.js";
import {
  createCamera,
  applyCameraPose,
  resizeCamera,
  createGroundPicker,
} from "./src/three/camera.js";
import { createSky } from "./src/three/sky.js";
import { createLights } from "./src/three/lights.js";
import { createCloudLayer } from "./src/three/clouds.js";
import { createMeteorShower } from "./src/three/meteors.js";
import { createTerrain } from "./src/three/terrain.js";
import { createTree } from "./src/three/tree.js";
import { createGrass } from "./src/three/grass.js";
import { createFireflyLights } from "./src/three/fireflies.js";

const COMPACT_SCREEN_PX = 700;
const MAX_PIXEL_RATIO = 1.75;

const sceneElement = document.querySelector(".scene");
const canvas = document.querySelector("#meadow");
const toggle = document.querySelector("#scene-toggle");
const toggleLabel = document.querySelector(".scene-toggle__label");
const clock = document.querySelector("#scene-clock");
const themeColor = document.querySelector('meta[name="theme-color"]');
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const model = new Scene({ prefersReducedMotion: reducedMotion.matches });
const camera = createCamera();
const compact = window.innerWidth < COMPACT_SCREEN_PX;

// The world, painted back to front. Order is the only thing that matters here.
const world = createWorld([
  createSky(),
  createLights(),
  createCloudLayer({ count: COUNTS.clouds }),
  createMeteorShower(),
  createTerrain(),
  createTree(),
  createGrass({ count: compact ? COUNTS.grassBladesCompact : COUNTS.grassBlades }),
  createFireflyLights({ capacity: COUNTS.fireflies }),
]);

let stage;
try {
  stage = createStage(canvas, { scene: world.scene, camera });
} catch {
  // Without WebGL the CSS backdrop still shows a calm, static field.
  sceneElement.classList.add("scene--static");
}

createPointerInput({ canvas, sceneElement, model, pick: createGroundPicker(camera) });

let pixelRatio = 1;
let lastClockKey = "";

function resize() {
  const bounds = sceneElement.getBoundingClientRect();
  const width = bounds.width;
  const height = Math.max(bounds.height, window.innerHeight);
  pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  resizeCamera(camera, width, height);
  stage?.resize(width, height, pixelRatio);
}

function updateClock() {
  const { hours12, minutes, meridiem } = model.clock();
  const key = `${hours12}:${minutes}${meridiem}`;
  if (key === lastClockKey) return;
  lastClockKey = key;
  clock.innerHTML = `${hours12}:${minutes} <span>${meridiem}</span>`;
}

function updateThemeColor() {
  themeColor.setAttribute(
    "content",
    mixHex(dayPalette.skyTop, nightPalette.skyTop, model.dayAmount),
  );
}

function frame(now = 0) {
  model.advance(now);
  const snapshot = { ...model.frame(), pixelRatio };
  applyCameraPose(
    camera,
    cameraPoseAt(snapshot.seconds, snapshot.pointer, {
      reducedMotion: model.prefersReducedMotion,
    }),
  );
  world.update(snapshot);
  stage?.render(snapshot.atmosphere);
  updateThemeColor();
  updateClock();
  window.requestAnimationFrame(frame);
}

function toggleNight() {
  const night = model.toggleNight(model.now);
  toggle.setAttribute("aria-pressed", String(night === 1));
  toggleLabel.textContent = night ? "Let morning in" : "Let night fall";
  sceneElement.classList.toggle("scene--night", night === 1);
}

toggle.addEventListener("click", toggleNight);

// Keyboard affordance: press "n" anywhere to switch between day and night.
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    toggleNight();
  }
});

reducedMotion.addEventListener("change", (event) => {
  model.prefersReducedMotion = event.matches;
});

window.addEventListener("resize", resize);
resize();
window.requestAnimationFrame(frame);
