// The view layer. Rendering is expressed as an ordered pipeline of independent
// "layers", each a pure-ish function of (context, scene, now). Adding or
// reordering scenery means touching the LAYERS list, not the render loop.

import {
  mixHex,
  smoothstep,
  twilightAmount,
  fireflyAt,
  shootingStarAt,
  grassBend,
} from "./scene-math.js";
import { dayPalette, nightPalette } from "./config.js";

function drawSky(ctx, scene) {
  const { width, height, dayAmount } = scene;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, mixHex(dayPalette.skyTop, nightPalette.skyTop, dayAmount));
  sky.addColorStop(0.62, mixHex(dayPalette.skyMid, nightPalette.skyMid, dayAmount));
  sky.addColorStop(1, mixHex(dayPalette.horizon, nightPalette.horizon, dayAmount));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.23,
    height * 0.69,
    2,
    width * 0.23,
    height * 0.69,
    height * 0.36,
  );
  glow.addColorStop(0, `rgba(255,205,123,${0.15 * (1 - dayAmount)})`);
  glow.addColorStop(1, "rgba(255,205,123,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

// Warm sunrise/sunset wash: a halo around the low sun plus a glow along the horizon.
function drawTwilightGlow(ctx, scene) {
  const { width, height, dayAmount } = scene;
  const warmth = twilightAmount(dayAmount);
  if (warmth <= 0.004) return;

  const sunX = width * (0.31 - dayAmount * 0.13);
  const sunY = height * (0.22 + dayAmount * 0.49);
  const halo = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, height * 0.55);
  halo.addColorStop(0, `rgba(255,196,120,${0.42 * warmth})`);
  halo.addColorStop(0.5, `rgba(255,151,88,${0.2 * warmth})`);
  halo.addColorStop(1, "rgba(255,138,86,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  const band = ctx.createLinearGradient(0, height * 0.4, 0, height * 0.78);
  band.addColorStop(0, "rgba(255,150,86,0)");
  band.addColorStop(0.6, `rgba(255,139,74,${0.22 * warmth})`);
  band.addColorStop(1, `rgba(255,103,92,${0.32 * warmth})`);
  ctx.fillStyle = band;
  ctx.fillRect(0, height * 0.4, width, height * 0.38);
}

function drawStars(ctx, scene) {
  const { width, height, dayAmount, elapsed, stars } = scene;
  const visibility = smoothstep(0.16, 0.9, dayAmount);
  if (visibility <= 0.005) return;

  for (const star of stars) {
    const twinkle = 0.72 + Math.sin(elapsed * 0.0015 + star.phase) * 0.28;
    ctx.globalAlpha = visibility * twinkle * star.brightness;
    ctx.fillStyle = "#fff4ce";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    ctx.fill();

    if (star.size > 1.6) {
      ctx.globalAlpha *= 0.55;
      ctx.fillRect(star.x * width - star.size * 2.5, star.y * height - 0.45, star.size * 5, 0.9);
    }
  }
  ctx.globalAlpha = 1;
}

// Occasional meteors streaking across the night sky. This layer owns both the
// spawning cadence and the drawing of its own particles.
function drawShootingStars(ctx, scene, now) {
  const { width, height, dayAmount, prefersReducedMotion, shootingStars } = scene;

  if (prefersReducedMotion || dayAmount < 0.62) {
    scene.nextStarAt = now + 1500;
  } else if (now >= scene.nextStarAt) {
    shootingStars.push(spawnShootingStar(width, height, now));
    scene.nextStarAt = now + 2600 + Math.random() * 4200;
  }

  const visibility = smoothstep(0.5, 0.95, dayAmount);
  for (let index = shootingStars.length - 1; index >= 0; index -= 1) {
    const star = shootingStars[index];
    const state = shootingStarAt(star, now);
    if (state.done) {
      shootingStars.splice(index, 1);
      continue;
    }
    const alpha = state.opacity * visibility;
    if (alpha <= 0.004) continue;

    const tailX = state.x - Math.cos(star.angle) * star.length * 0.18;
    const tailY = state.y - Math.sin(star.angle) * star.length * 0.18;
    const trail = ctx.createLinearGradient(tailX, tailY, state.x, state.y);
    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(1, `rgba(255,255,255,${alpha})`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(state.x, state.y);
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(state.x, state.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnShootingStar(width, height, now) {
  const angle = Math.PI * (0.12 + Math.random() * 0.12);
  return {
    x: width * (0.3 + Math.random() * 0.6),
    y: height * (0.05 + Math.random() * 0.25),
    angle,
    length: height * (0.25 + Math.random() * 0.2),
    bornAt: now,
    duration: 700 + Math.random() * 500,
  };
}

function drawSunAndMoon(ctx, scene) {
  const { width, height, dayAmount } = scene;
  const sunX = width * (0.31 - dayAmount * 0.13);
  const sunY = height * (0.22 + dayAmount * 0.49);
  const sunVisibility = 1 - smoothstep(0.58, 0.97, dayAmount);
  const sunRadius = Math.max(21, Math.min(42, width * 0.034));

  if (sunVisibility > 0.005) {
    const sunGlow = ctx.createRadialGradient(
      sunX,
      sunY,
      sunRadius * 0.45,
      sunX,
      sunY,
      sunRadius * 3.7,
    );
    sunGlow.addColorStop(0, `rgba(255,234,178,${0.66 * sunVisibility})`);
    sunGlow.addColorStop(1, "rgba(255,224,165,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - sunRadius * 4, sunY - sunRadius * 4, sunRadius * 8, sunRadius * 8);
    ctx.globalAlpha = sunVisibility;
    ctx.fillStyle = mixHex("#fff0b6", "#ff9e5a", twilightAmount(dayAmount));
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const moonX = width * 0.78;
  const moonY = height * (0.64 - dayAmount * 0.4);
  const moonVisibility = smoothstep(0.12, 0.82, dayAmount);
  if (moonVisibility > 0.005) {
    const moonR = Math.max(20, Math.min(34, width * 0.028));
    ctx.save();
    ctx.globalAlpha = moonVisibility;

    const glow = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 4.4);
    glow.addColorStop(0, "rgba(234,239,214,0.45)");
    glow.addColorStop(1, "rgba(234,239,214,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 4.4, 0, Math.PI * 2);
    ctx.fill();

    const disc = ctx.createRadialGradient(
      moonX - moonR * 0.32,
      moonY - moonR * 0.32,
      moonR * 0.2,
      moonX,
      moonY,
      moonR,
    );
    disc.addColorStop(0, "#fbf7df");
    disc.addColorStop(1, "#d8d2ac");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(181,176,142,0.45)";
    for (const [cx, cy, cr] of [
      [-0.32, -0.1, 0.16],
      [0.28, 0.16, 0.2],
      [0.08, -0.36, 0.12],
      [-0.12, 0.34, 0.1],
    ]) {
      ctx.beginPath();
      ctx.arc(moonX + cx * moonR, moonY + cy * moonR, cr * moonR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCloud(ctx, scene, cloud, visibility, color) {
  if (visibility <= 0.004) return;
  const { width, height, elapsed, prefersReducedMotion } = scene;
  const drift = elapsed * cloud.speed * (prefersReducedMotion ? 0.2 : 1);
  const cloudWidth = height * 0.23 * cloud.scale;
  const x = ((cloud.x * width + drift) % (width + cloudWidth * 2)) - cloudWidth;
  const y = height * cloud.y;
  const scale = height * 0.047 * cloud.scale;

  ctx.globalAlpha = visibility * 0.83;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, scale * 1.52, scale * 0.57, 0, 0, Math.PI * 2);
  ctx.ellipse(x - scale * 0.53, y - scale * 0.21, scale * 0.65, scale * 0.47, 0, 0, Math.PI * 2);
  ctx.ellipse(x + scale * 0.05, y - scale * 0.37, scale * 0.73, scale * 0.62, 0, 0, Math.PI * 2);
  ctx.ellipse(x + scale * 0.66, y - scale * 0.17, scale * 0.56, scale * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawClouds(ctx, scene) {
  const { dayAmount, clouds, nightClouds } = scene;
  const dayColor = mixHex("#fffdf3", "#9fb2b4", dayAmount);
  for (const cloud of clouds) {
    drawCloud(ctx, scene, cloud, 1 - smoothstep(0.12, 0.9, dayAmount), dayColor);
  }
  for (const cloud of nightClouds) {
    drawCloud(ctx, scene, cloud, smoothstep(0.45, 0.98, dayAmount) * 0.42, "#38475f");
  }
}

// Blend two hex colours by the current day amount and apply an alpha.
function tintRgba(dayAmount, dayHex, nightHex, alpha) {
  return mixHex(dayHex, nightHex, dayAmount).replace("rgb(", "rgba(").replace(")", `,${alpha})`);
}

// Soft atmospheric band just above the hills so the distance reads hazier.
function drawHaze(ctx, scene) {
  const { width, height, dayAmount } = scene;
  const band = ctx.createLinearGradient(0, height * 0.48, 0, height * 0.72);
  band.addColorStop(0, tintRgba(dayAmount, "#eef2e6", "#2b3b52", 0));
  band.addColorStop(1, tintRgba(dayAmount, "#eef2e6", "#2b3b52", 0.3));
  ctx.fillStyle = band;
  ctx.fillRect(0, height * 0.48, width, height * 0.24);
}

function drawHills(ctx, scene) {
  const { width, height, dayAmount } = scene;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.bezierCurveTo(
    width * 0.13,
    height * 0.58,
    width * 0.32,
    height * 0.75,
    width * 0.52,
    height * 0.67,
  );
  ctx.bezierCurveTo(width * 0.72, height * 0.58, width * 0.88, height * 0.66, width, height * 0.56);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = mixHex(dayPalette.farHill, nightPalette.farHill, dayAmount);
  ctx.fill();
  shadeHill(ctx, scene, height * 0.56, 0.08, 0.1);

  ctx.beginPath();
  ctx.moveTo(0, height * 0.76);
  ctx.bezierCurveTo(
    width * 0.2,
    height * 0.67,
    width * 0.4,
    height * 0.8,
    width * 0.62,
    height * 0.72,
  );
  ctx.bezierCurveTo(width * 0.81, height * 0.66, width * 0.91, height * 0.73, width, height * 0.68);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = mixHex(dayPalette.nearHill, nightPalette.nearHill, dayAmount);
  ctx.fill();
  shadeHill(ctx, scene, height * 0.66, 0.1, 0.15);

  ctx.beginPath();
  ctx.moveTo(0, height * 0.82);
  ctx.bezierCurveTo(
    width * 0.25,
    height * 0.72,
    width * 0.5,
    height * 0.86,
    width * 0.74,
    height * 0.78,
  );
  ctx.bezierCurveTo(width * 0.86, height * 0.74, width * 0.94, height * 0.78, width, height * 0.74);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = mixHex(dayPalette.frontHill, nightPalette.frontHill, dayAmount);
  ctx.fill();
  shadeHill(ctx, scene, height * 0.74, 0.12, 0.22);
}

// Clip to the last-filled hill and lay a crest highlight over a base shadow for volume.
function shadeHill(ctx, scene, crestY, lightAlpha, shadowAlpha) {
  const { width, height } = scene;
  ctx.save();
  ctx.clip();
  const shade = ctx.createLinearGradient(0, crestY, 0, height);
  shade.addColorStop(0, `rgba(255,255,255,${lightAlpha})`);
  shade.addColorStop(0.32, "rgba(255,255,255,0)");
  shade.addColorStop(0.72, "rgba(0,0,0,0)");
  shade.addColorStop(1, `rgba(0,0,0,${shadowAlpha})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, crestY, width, height - crestY);
  ctx.restore();
}

// A lone, stylised tree rooted on the hill crest, swaying gently with the breeze.
function drawTree(ctx, scene, now) {
  const { height, dayAmount, prefersReducedMotion, treeCrest } = scene;
  const { x, y } = treeCrest;
  const sway = prefersReducedMotion ? 0 : Math.sin(now * 0.0006) * 2.6;
  const trunkHeight = height * 0.11;
  const trunkWidth = Math.max(5, height * 0.011);
  const canopyR = height * 0.062;
  const canopyY = y - trunkHeight;
  const cx = x + sway;

  ctx.save();

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#17271b";
  ctx.beginPath();
  ctx.ellipse(x, y + height * 0.004, canopyR * 0.85, canopyR * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = mixHex("#5b4327", "#2a2320", dayAmount);
  ctx.lineWidth = trunkWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway * 0.3, canopyY + canopyR * 0.5, cx, canopyY);
  ctx.stroke();

  const foliage = mixHex("#4b8a3f", "#20402e", dayAmount);
  const blobs = [
    [-canopyR * 0.62, canopyR * 0.2, canopyR * 0.7],
    [canopyR * 0.62, canopyR * 0.2, canopyR * 0.68],
    [0, canopyR * 0.38, canopyR * 0.82],
    [-canopyR * 0.28, -canopyR * 0.34, canopyR * 0.72],
    [canopyR * 0.32, -canopyR * 0.3, canopyR * 0.7],
    [0, -canopyR * 0.05, canopyR * 0.96],
  ];
  ctx.fillStyle = foliage;
  for (const [dx, dy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(cx + dx, canopyY + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = mixHex("#69aa4d", "#2c5338", dayAmount);
  ctx.beginPath();
  ctx.arc(cx - canopyR * 0.22, canopyY - canopyR * 0.36, canopyR * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGrass(ctx, scene, now) {
  const { width, height, dayAmount, gusts, field, prefersReducedMotion } = scene;
  const motionScale = prefersReducedMotion ? 0.24 : 1;
  for (const blade of field) {
    const baseY =
      height * (0.746 + Math.sin((blade.x / Math.max(width, 1)) * 8 + blade.phase) * 0.022);
    const bladeHeight = blade.height * height;
    const bend = grassBend(blade, { gusts, height, now, motionScale });
    const tipX = blade.x + bend;
    const tipY = baseY - bladeHeight;
    ctx.strokeStyle = mixHex(blade.dayColor, blade.nightColor, dayAmount);
    ctx.lineWidth = blade.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(blade.x, baseY + (blade.layer ? height * 0.12 : height * 0.04));
    ctx.quadraticCurveTo(blade.x + bend * 0.58, baseY - bladeHeight * 0.55, tipX, tipY);
    ctx.stroke();
  }
}

// Fireflies drifting over the grass, glowing softly once night falls.
function drawFireflies(ctx, scene, now) {
  const { dayAmount, prefersReducedMotion, fireflies } = scene;
  const visibility = smoothstep(0.35, 0.95, dayAmount);
  if (visibility <= 0.004) return;

  const time = prefersReducedMotion ? 0 : now;
  for (const fly of fireflies) {
    const { x, y, glow } = fireflyAt(fly, time);
    const alpha = visibility * (0.25 + glow * 0.75);
    const radius = fly.size * (0.7 + glow * 0.6);

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
    halo.addColorStop(0, `rgba(216,255,150,${alpha})`);
    halo.addColorStop(1, "rgba(216,255,150,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(242,255,198,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A gentle darkening toward the edges to frame the scene with depth.
function drawVignette(ctx, scene) {
  const { width, height } = scene;
  const inner = Math.min(width, height) * 0.3;
  const outer = Math.max(width, height) * 0.78;
  const v = ctx.createRadialGradient(
    width / 2,
    height * 0.52,
    inner,
    width / 2,
    height * 0.6,
    outer,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
}

// The scenery, painted back to front. Order is the only thing that matters here.
export const LAYERS = [
  { name: "sky", draw: drawSky },
  { name: "twilight", draw: drawTwilightGlow },
  { name: "stars", draw: drawStars },
  { name: "shootingStars", draw: drawShootingStars },
  { name: "sunAndMoon", draw: drawSunAndMoon },
  { name: "clouds", draw: drawClouds },
  { name: "haze", draw: drawHaze },
  { name: "hills", draw: drawHills },
  { name: "tree", draw: drawTree },
  { name: "grass", draw: drawGrass },
  { name: "fireflies", draw: drawFireflies },
  { name: "vignette", draw: drawVignette },
];

// Binds a drawing context to the layer pipeline. The renderer knows nothing
// about the scene's internals beyond the read-only shape each layer expects.
export function createRenderer(ctx, layers = LAYERS) {
  return {
    render(scene, now) {
      ctx.clearRect(0, 0, scene.width, scene.height);
      for (const layer of layers) {
        layer.draw(ctx, scene, now);
      }
    },
  };
}
