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
import { createGrove, createTree } from "./src/three/tree.js";
import { createGrass } from "./src/three/grass.js";
import { createFireflyLights } from "./src/three/fireflies.js";
import { createFallingParticles } from "./src/three/falling.js";
import { createClockView } from "./src/ui/clock-view.js";
import { bindDayNightToggle } from "./src/ui/day-night-toggle.js";
import { bindZenMode } from "./src/ui/zen-mode.js";
import { bindSeasonPicker } from "./src/ui/season-picker.js";

const COMPACT_SCREEN_PX = 700;
const MAX_PIXEL_RATIO = 1.75;

const sceneElement = document.querySelector(".scene");
const canvas = document.querySelector("#meadow");
const clockView = createClockView({
  timeElement: document.querySelector(".scene-clock__time"),
  meridiemElement: document.querySelector(".scene-clock__meridiem"),
});
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
  createGrove({ count: compact ? 16 : 22 }),
  createTree(),
  createGrass({ count: compact ? COUNTS.grassBladesCompact : COUNTS.grassBlades }),
  createFireflyLights({ capacity: COUNTS.fireflies }),
  createFallingParticles({ capacity: compact ? 250 : 600 }),
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

function resize() {
  const bounds = sceneElement.getBoundingClientRect();
  const width = bounds.width;
  const height = Math.max(bounds.height, window.innerHeight);
  pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  resizeCamera(camera, width, height);
  stage?.resize(width, height, pixelRatio);
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
  clockView.render(model.clock());
  zenMode.update(now);
  window.requestAnimationFrame(frame);
}

// The button, or the N key anywhere, switches between day and night.
bindDayNightToggle({
  button: document.querySelector("#scene-toggle"),
  label: document.querySelector(".scene-toggle__label"),
  sceneElement,
  model,
  keyTarget: window,
  now: () => model.now,
});

// The Zen button, or Z, hides everything but the field for a minute.
const zenMode = bindZenMode({
  button: document.querySelector("#zen-toggle"),
  countdown: document.querySelector("#zen-countdown"),
  countdownText: document.querySelector(".zen-countdown__time"),
  announcer: document.querySelector("#zen-status"),
  sceneElement,
  keyTarget: window,
  now: () => model.now,
});

// The season buttons, or keys 1-4, morph the meadow through the year.
bindSeasonPicker({
  buttons: [...document.querySelectorAll(".season-button")].map((element) => ({
    season: element.dataset.season,
    element,
  })),
  sceneElement,
  model,
  keyTarget: window,
  now: () => model.now,
  announcer: document.querySelector("#season-status"),
});

reducedMotion.addEventListener("change", (event) => {
  model.prefersReducedMotion = event.matches;
});

window.addEventListener("resize", resize);
resize();
window.requestAnimationFrame(frame);
