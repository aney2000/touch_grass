// Composition root: wires the DOM to the scene model, the renderer, and input,
// then runs the animation loop. All the heavy lifting lives in ./src.

import { Scene } from "./src/scene.js";
import { createRenderer } from "./src/renderer.js";
import { createPointerInput } from "./src/input.js";
import { mixHex } from "./src/scene-math.js";
import { dayPalette, nightPalette } from "./src/config.js";

const sceneElement = document.querySelector(".scene");
const canvas = document.querySelector("#meadow");
const context = canvas.getContext("2d", { alpha: false });
const toggle = document.querySelector("#scene-toggle");
const toggleLabel = document.querySelector(".scene-toggle__label");
const clock = document.querySelector("#scene-clock");
const themeColor = document.querySelector('meta[name="theme-color"]');
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const model = new Scene({ prefersReducedMotion: reducedMotion.matches });
const renderer = createRenderer(context);
createPointerInput({ canvas, sceneElement, model });

let pixelRatio = 1;
let lastClockKey = "";

function resizeCanvas() {
  const bounds = sceneElement.getBoundingClientRect();
  const width = bounds.width;
  const height = Math.max(bounds.height, window.innerHeight);
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  model.resize(width, height);
}

function updateClock() {
  const { hours12, minutes, meridiem } = model.clock();
  const key = `${hours12}:${minutes}${meridiem}`;
  if (key === lastClockKey) return;
  lastClockKey = key;
  clock.innerHTML = `${hours12}:${minutes} <span>${meridiem}</span>`;
}

function updateThemeColor() {
  themeColor.setAttribute("content", mixHex(dayPalette.skyTop, nightPalette.skyTop, model.dayAmount));
}

function frame(now = 0) {
  model.advance(now);
  renderer.render(model, now);
  updateThemeColor();
  updateClock();
  window.requestAnimationFrame(frame);
}

function toggleNight() {
  const night = model.toggleNight(performance.now());
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

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
window.requestAnimationFrame(frame);
