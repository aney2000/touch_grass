import { randomGenerator, mixHex, blendColor, smoothstep, twilightAmount, grassBend } from "./src/scene-math.js";

const scene = document.querySelector(".scene");
const canvas = document.querySelector("#meadow");
const context = canvas.getContext("2d", { alpha: false });
const toggle = document.querySelector("#scene-toggle");
const toggleLabel = document.querySelector(".scene-toggle__label");
const clock = document.querySelector("#scene-clock");
const themeColor = document.querySelector('meta[name="theme-color"]');
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const dayPalette = {
  skyTop: "#79c4ec",
  skyMid: "#a9dcf4",
  horizon: "#f4edcf",
  farHill: "#76b95d",
  nearHill: "#4e9c4d",
  frontHill: "#347744",
  grass: ["#a2cb55", "#76b944", "#55983e", "#377b3d", "#c1d369"],
};
const nightPalette = {
  skyTop: "#10263e",
  skyMid: "#283d50",
  horizon: "#687565",
  farHill: "#435a48",
  nearHill: "#304a3d",
  frontHill: "#243c34",
  grass: ["#637c54", "#536f4b", "#496746", "#3e5c40", "#74845a"],
};

let width = 0;
let height = 0;
let pixelRatio = 1;
let field = [];
let dayAmount = 0;
let targetNight = 0;
let elapsed = 0;
let previousFrame = 0;
let lastClockMinute = "";
const gusts = [];
const stars = [];
const clouds = [
  { x: 0.08, y: 0.2, scale: 0.8, speed: 0.004 },
  { x: 0.39, y: 0.12, scale: 0.58, speed: 0.006 },
  { x: 0.67, y: 0.28, scale: 0.94, speed: 0.003 },
  { x: 0.9, y: 0.15, scale: 0.52, speed: 0.005 },
];

function makeField() {
  const random = randomGenerator(741);
  const count = Math.min(1500, Math.ceil(width * 0.78));
  field = Array.from({ length: count }, (_, index) => {
    const foreground = index > count * 0.58;
    const swatch = Math.floor(random() * dayPalette.grass.length);
    return {
      x: random() * width,
      height: (foreground ? 0.035 : 0.018) + random() * (foreground ? 0.083 : 0.052),
      width: 0.7 + random() * (foreground ? 1.7 : 1.1),
      phase: random() * Math.PI * 2,
      layer: foreground ? 1 : 0,
      dayColor: dayPalette.grass[swatch],
      nightColor: nightPalette.grass[swatch],
    };
  });

  stars.length = 0;
  for (let index = 0; index < 110; index += 1) {
    stars.push({
      x: 0.46 + random() * 0.55,
      y: 0.035 + random() * 0.52,
      size: 0.6 + random() * 1.5,
      phase: random() * Math.PI * 2,
      brightness: 0.4 + random() * 0.6,
    });
  }
}

function resizeCanvas() {
  const bounds = scene.getBoundingClientRect();
  width = bounds.width;
  height = Math.max(bounds.height, window.innerHeight);
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  makeField();
}

function skyColorAt(y) {
  const amount = Math.max(0, Math.min(1, y / height));
  if (amount < 0.67) {
    return blendColor(
      mixHex(dayPalette.skyTop, nightPalette.skyTop, dayAmount),
      mixHex(dayPalette.skyMid, nightPalette.skyMid, dayAmount),
      amount / 0.67,
    );
  }
  return blendColor(
    mixHex(dayPalette.skyMid, nightPalette.skyMid, dayAmount),
    mixHex(dayPalette.horizon, nightPalette.horizon, dayAmount),
    (amount - 0.67) / 0.33,
  );
}

function drawSky() {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, mixHex(dayPalette.skyTop, nightPalette.skyTop, dayAmount));
  sky.addColorStop(0.62, mixHex(dayPalette.skyMid, nightPalette.skyMid, dayAmount));
  sky.addColorStop(1, mixHex(dayPalette.horizon, nightPalette.horizon, dayAmount));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.23, height * 0.69, 2, width * 0.23, height * 0.69, height * 0.36);
  glow.addColorStop(0, `rgba(255,205,123,${0.15 * (1 - dayAmount)})`);
  glow.addColorStop(1, "rgba(255,205,123,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

// Warm sunrise/sunset wash: a halo around the low sun plus a glow along the horizon.
function drawTwilightGlow() {
  const warmth = twilightAmount(dayAmount);
  if (warmth <= 0.004) return;

  const sunX = width * (0.31 - dayAmount * 0.13);
  const sunY = height * (0.22 + dayAmount * 0.49);
  const halo = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, height * 0.55);
  halo.addColorStop(0, `rgba(255,196,120,${0.42 * warmth})`);
  halo.addColorStop(0.5, `rgba(255,151,88,${0.2 * warmth})`);
  halo.addColorStop(1, "rgba(255,138,86,0)");
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);

  const band = context.createLinearGradient(0, height * 0.4, 0, height * 0.78);
  band.addColorStop(0, "rgba(255,150,86,0)");
  band.addColorStop(0.6, `rgba(255,139,74,${0.22 * warmth})`);
  band.addColorStop(1, `rgba(255,103,92,${0.32 * warmth})`);
  context.fillStyle = band;
  context.fillRect(0, height * 0.4, width, height * 0.38);
}

function drawStars() {
  const visibility = smoothstep(0.16, 0.9, dayAmount);
  if (visibility <= 0.005) return;

  for (const star of stars) {
    const twinkle = 0.72 + Math.sin(elapsed * 0.0015 + star.phase) * 0.28;
    context.globalAlpha = visibility * twinkle * star.brightness;
    context.fillStyle = "#fff4ce";
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    context.fill();

    if (star.size > 1.6) {
      context.globalAlpha *= 0.55;
      context.fillRect(star.x * width - star.size * 2.5, star.y * height - 0.45, star.size * 5, 0.9);
    }
  }
  context.globalAlpha = 1;
}

function drawSunAndMoon() {
  const sunX = width * (0.31 - dayAmount * 0.13);
  const sunY = height * (0.22 + dayAmount * 0.49);
  const sunVisibility = 1 - smoothstep(0.58, 0.97, dayAmount);
  const sunRadius = Math.max(21, Math.min(42, width * 0.034));

  if (sunVisibility > 0.005) {
    const sunGlow = context.createRadialGradient(sunX, sunY, sunRadius * 0.45, sunX, sunY, sunRadius * 3.7);
    sunGlow.addColorStop(0, `rgba(255,234,178,${0.66 * sunVisibility})`);
    sunGlow.addColorStop(1, "rgba(255,224,165,0)");
    context.fillStyle = sunGlow;
    context.fillRect(sunX - sunRadius * 4, sunY - sunRadius * 4, sunRadius * 8, sunRadius * 8);
    context.globalAlpha = sunVisibility;
    context.fillStyle = mixHex("#fff0b6", "#ff9e5a", twilightAmount(dayAmount));
    context.beginPath();
    context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  const moonX = width * 0.79;
  const moonY = height * (0.68 - dayAmount * 0.45);
  const moonVisibility = smoothstep(0.12, 0.82, dayAmount);
  if (moonVisibility > 0.005) {
    context.globalAlpha = moonVisibility;
    context.fillStyle = "#f4edcc";
    context.beginPath();
    context.arc(moonX, moonY, 23, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = skyColorAt(moonY - 12);
    context.beginPath();
    context.arc(moonX + 12, moonY - 7, 22, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }
}

function drawCloud(cloud) {
  const drift = elapsed * cloud.speed * (reducedMotion.matches ? 0.2 : 1);
  const cloudWidth = height * 0.23 * cloud.scale;
  const wrappedX = ((cloud.x * width + drift) % (width + cloudWidth * 2)) - cloudWidth;
  const x = wrappedX;
  const y = height * cloud.y;
  const scale = height * 0.047 * cloud.scale;
  const visibility = 1 - smoothstep(0.12, 0.9, dayAmount);

  context.globalAlpha = visibility * 0.83;
  context.fillStyle = mixHex("#fffdf3", "#9fb2b4", dayAmount);
  context.beginPath();
  context.ellipse(x, y, scale * 1.52, scale * 0.57, 0, 0, Math.PI * 2);
  context.ellipse(x - scale * 0.53, y - scale * 0.21, scale * 0.65, scale * 0.47, 0, 0, Math.PI * 2);
  context.ellipse(x + scale * 0.05, y - scale * 0.37, scale * 0.73, scale * 0.62, 0, 0, Math.PI * 2);
  context.ellipse(x + scale * 0.66, y - scale * 0.17, scale * 0.56, scale * 0.4, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function drawHills() {
  context.fillStyle = mixHex(dayPalette.farHill, nightPalette.farHill, dayAmount);
  context.beginPath();
  context.moveTo(0, height * 0.72);
  context.bezierCurveTo(width * 0.13, height * 0.58, width * 0.32, height * 0.75, width * 0.52, height * 0.67);
  context.bezierCurveTo(width * 0.72, height * 0.58, width * 0.88, height * 0.66, width, height * 0.56);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  context.fillStyle = mixHex(dayPalette.nearHill, nightPalette.nearHill, dayAmount);
  context.beginPath();
  context.moveTo(0, height * 0.76);
  context.bezierCurveTo(width * 0.2, height * 0.67, width * 0.4, height * 0.8, width * 0.62, height * 0.72);
  context.bezierCurveTo(width * 0.81, height * 0.66, width * 0.91, height * 0.73, width, height * 0.68);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  context.fillStyle = mixHex(dayPalette.frontHill, nightPalette.frontHill, dayAmount);
  context.beginPath();
  context.moveTo(0, height * 0.82);
  context.bezierCurveTo(width * 0.25, height * 0.72, width * 0.5, height * 0.86, width * 0.74, height * 0.78);
  context.bezierCurveTo(width * 0.86, height * 0.74, width * 0.94, height * 0.78, width, height * 0.74);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
}

function drawGrass(now) {
  for (const blade of field) {
    const baseY = height * (0.746 + Math.sin((blade.x / Math.max(width, 1)) * 8 + blade.phase) * 0.022);
    const bladeHeight = blade.height * height;
    const bend = grassBend(blade, { gusts, height, now, motionScale: reducedMotion.matches ? 0.24 : 1 });
    const tipX = blade.x + bend;
    const tipY = baseY - bladeHeight;
    context.strokeStyle = mixHex(blade.dayColor, blade.nightColor, dayAmount);
    context.lineWidth = blade.width;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(blade.x, baseY + (blade.layer ? height * 0.12 : height * 0.04));
    context.quadraticCurveTo(blade.x + bend * 0.58, baseY - bladeHeight * 0.55, tipX, tipY);
    context.stroke();
  }
}

function updateClock() {
  const totalMinutes = Math.round(18 * 60 + dayAmount * 12 * 60) % (24 * 60);
  const minuteKey = `${totalMinutes}`;
  if (minuteKey === lastClockMinute) return;

  lastClockMinute = minuteKey;
  const hours = Math.floor(totalMinutes / 60);
  const displayHour = hours % 12 || 12;
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  clock.innerHTML = `${displayHour}:${minutes} <span>${hours < 12 ? "AM" : "PM"}</span>`;
}

function render(now = 0) {
  const delta = Math.min(48, now - previousFrame || 16);
  previousFrame = now;
  elapsed += delta;
  const transitionSpeed = reducedMotion.matches ? 1 : 1 - Math.exp(-delta / 2300);
  dayAmount += (targetNight - dayAmount) * transitionSpeed;
  if (Math.abs(targetNight - dayAmount) < 0.001) dayAmount = targetNight;

  context.clearRect(0, 0, width, height);
  drawSky();
  drawTwilightGlow();
  drawStars();
  drawSunAndMoon();
  for (const cloud of clouds) drawCloud(cloud);
  drawHills();
  drawGrass(now);

  const currentThemeColor = mixHex(dayPalette.skyTop, nightPalette.skyTop, dayAmount);
  themeColor.setAttribute("content", currentThemeColor);
  updateClock();

  while (gusts.length && now - gusts[0].startedAt > 2100) gusts.shift();
  window.requestAnimationFrame(render);
}

function addGust(point, direction = 1, strength = 0.72) {
  gusts.push({ x: point.x, y: point.y, direction, strength, startedAt: performance.now() });
  if (gusts.length > 7) gusts.shift();
}

function localPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

let previousPointer = null;
canvas.addEventListener("pointermove", (event) => {
  const point = localPoint(event);
  const overGrass = point.y > height * 0.62;
  scene.classList.toggle("scene--touching", overGrass);

  if (overGrass && previousPointer && event.pointerType !== "touch") {
    const deltaX = point.x - previousPointer.x;
    if (Math.abs(deltaX) > 8) addGust(point, Math.sign(deltaX), Math.min(1, 0.35 + Math.abs(deltaX) / 150));
  }
  previousPointer = point;
});

canvas.addEventListener("pointerdown", (event) => {
  const point = localPoint(event);
  if (point.y > height * 0.62) addGust(point, 1, 0.9);
});

canvas.addEventListener("pointerleave", () => {
  scene.classList.remove("scene--touching");
  previousPointer = null;
});

toggle.addEventListener("click", () => {
  targetNight = targetNight ? 0 : 1;
  toggle.setAttribute("aria-pressed", String(targetNight === 1));
  toggleLabel.textContent = targetNight ? "Let morning in" : "Let night fall";
  scene.classList.toggle("scene--night", targetNight === 1);
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
window.requestAnimationFrame(render);