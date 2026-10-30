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
import { createBirds } from "./src/three/birds.js";
import { birdsForTier } from "./src/birds.js";
import { createTerrain } from "./src/three/terrain.js";
import { createGrove, createTree } from "./src/three/tree.js";
import { createGrass } from "./src/three/grass.js";
import { createGrasshoppers } from "./src/three/grasshoppers.js";
import { grasshopperCapacity } from "./src/grasshoppers.js";
import { createFireflyLights } from "./src/three/fireflies.js";
import { createFallingParticles } from "./src/three/falling.js";
import { createClockView } from "./src/ui/clock-view.js";
import { bindDayNightToggle } from "./src/ui/day-night-toggle.js";
import { bindZenMode } from "./src/ui/zen-mode.js";
import { bindSeasonPicker } from "./src/ui/season-picker.js";
import { createConstellations, createSkyPicker } from "./src/three/constellations.js";
import { bindConstellationToggle } from "./src/ui/constellation-toggle.js";

import { chooseQuality, stepDown, stageOptionsFor } from "./src/quality.js";
import { createFrameGovernor } from "./src/frame-governor.js";
import { particleBudget } from "./src/particle-budget.js";

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
let quality = chooseQuality({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio,
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemory: navigator.deviceMemory,
  reducedMotion: reducedMotion.matches,
  coarsePointer: window.matchMedia("(pointer: coarse)").matches,
});
const governor = createFrameGovernor();

// Leaves and petals are shed by the trees themselves, so the forest feeds them.
const grove = createGrove({ count: quality.groveTrees });
const heroTree = createTree();
const canopies = [...grove.canopies, heroTree.canopyVolume];

// The world, painted back to front. Order is the only thing that matters here.
const world = createWorld([
  createSky(),
  createLights(),
  createCloudLayer({ count: COUNTS.clouds }),
  createMeteorShower(),
  createConstellations(),
  createTerrain(),
  grove,
  heroTree,
  createBirds({ canopies, maxBirds: birdsForTier(quality.tier) }),
  createGrass({ count: quality.grassBlades }),
  createGrasshoppers({ capacity: grasshopperCapacity(quality.tier) }),
  createFireflyLights({ capacity: COUNTS.fireflies }),
  createFallingParticles({
    canopies,
    limits: particleBudget({ trees: canopies, tier: quality.tier }),
  }),
]);

let stage;
try {
  stage = createStage(canvas, { scene: world.scene, camera, ...stageOptionsFor(quality) });
} catch {
  // Without WebGL the CSS backdrop still shows a calm, static field.
  sceneElement.classList.add("scene--static");
}

createPointerInput({ canvas, sceneElement, model, pick: createGroundPicker(camera) });

let pixelRatio = quality.pixelRatio;
let lastSize = "";
let resizeQueued = false;

function resize() {
  resizeQueued = false;
  // The canvas fills .scene (100svh); innerHeight would squash it on mobile.
  const bounds = sceneElement.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  const key = `${width}x${height}@${pixelRatio}`;
  if (key === lastSize || width === 0 || height === 0) return;
  lastSize = key;
  resizeCamera(camera, width, height);
  stage?.resize(width, height, pixelRatio);
}

function queueResize() {
  if (resizeQueued) return;
  resizeQueued = true;
  window.requestAnimationFrame(resize);
}

function lowerQuality() {
  const next = stepDown(quality);
  if (next === quality) return;
  quality = next;
  pixelRatio = quality.pixelRatio;
  stage?.setBloomScale(quality.bloom.scale);
  resize();
}

let lastThemeColor = "";
function updateThemeColor() {
  const color = mixHex(dayPalette.skyTop, nightPalette.skyTop, model.dayAmount);
  if (color === lastThemeColor) return;
  lastThemeColor = color;
  themeColor.setAttribute("content", color);
}

let lastFrameAt = null;
let running = true;
let framePending = false;

function scheduleFrame() {
  framePending = true;
  window.requestAnimationFrame(frame);
}

function frame(now = 0) {
  framePending = false;
  if (!running) return;
  if (lastFrameAt !== null && governor.sample(now - lastFrameAt, now)) lowerQuality();
  lastFrameAt = now;
  model.advance(now);
  const snapshot = { ...model.frame(), pixelRatio };
  applyCameraPose(
    camera,
    cameraPoseAt(snapshot.seconds, snapshot.pointer, {
      reducedMotion: model.prefersReducedMotion,
      aspect: camera.aspect,
    }),
  );
  world.update(snapshot);
  stage?.render(snapshot.atmosphere);
  updateThemeColor();
  clockView.render(model.clock());
  zenMode.update(now);
  constellationToggle.sync();
  scheduleFrame();
}

// The button, or the N key anywhere, switches between day and night.
const dayNight = bindDayNightToggle({
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

// The star button, or C, reveals the constellations (letting night fall by
// day); tapping a constellation star at night outlines and names it.
const constellationToggle = bindConstellationToggle({
  button: document.querySelector("#constellation-toggle"),
  announcer: document.querySelector("#constellation-status"),
  model,
  keyTarget: window,
  now: () => model.now,
  bringNight: () => dayNight.toggle(),
});
const pickSky = createSkyPicker(camera);
canvas.addEventListener("click", (event) => {
  if (!model.isNight) return;
  const bounds = canvas.getBoundingClientRect();
  const name = pickSky({
    x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    y: 1 - ((event.clientY - bounds.top) / bounds.height) * 2,
  });
  if (!name) return;
  model.highlightConstellation(name, model.now);
  constellationToggle.announce(name);
});

reducedMotion.addEventListener("change", (event) => {
  model.prefersReducedMotion = event.matches;
});

// A hidden tab renders nothing; on return, Scene caps the first delta at 48ms
// so the meadow resumes without a jump.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    running = false;
    return;
  }
  if (running) return;
  running = true;
  lastFrameAt = null;
  if (!framePending) scheduleFrame();
});

window.addEventListener("resize", queueResize);
resize();
scheduleFrame();
