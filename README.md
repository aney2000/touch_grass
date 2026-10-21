# Stillfield

A quiet little field to visit whenever you need a moment outside.

Stillfield is a single-page three.js scene: a sunlit, rolling hill under a
cobalt sky — an homage to the classic "Bliss" desktop — that you can actually
touch. Rest your cursor on the grass to part it, swipe to send ripples through
the meadow, and let night fall to watch the moon rise, stars and meteors
appear, and fireflies blink to life.

## Features

- **Real-time 3D meadow** — tens of thousands of GPU-instanced grass blades
  swaying in rolling wind waves, a Bliss-style hill, a lone swaying tree, and
  billowy cumulus clouds streaming across the sky.
- **Day / night transition** — the same eased tween and live clock as before,
  now driving a sunset sky dome, moving sun and moon lights, fog, bloom, and
  exposure from a single `dayAmount`.
- **Touch the grass** — the pointer is ray-cast onto the terrain: grass parts
  under your hand, and brisk swipes or taps send expanding ripple rings.
- **Real fireflies** — each one wanders in 3D and flashes like the real thing
  (a short pulse, then darkness); bloom makes them glow and they light the
  grass blades around them.
- **Living camera** — a slow breathing drift plus gentle parallax toward the
  pointer; the field of view widens on portrait screens.
- **Respects `prefers-reduced-motion`** — wind, clouds, fireflies, and the
  camera calm down, meteors stay away, and the transition is quicker.
- **Graceful fallback** — without WebGL, a CSS rendition of the field remains.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production bundle
```

> Working from WSL on a Windows drive (`/mnt/c/...`)? File watching does not
> see edits there; start the dev server with `CHOKIDAR_USEPOLLING=1 npm run dev`.

## Quality gates

```bash
npm test             # Node's built-in test runner
npm run lint         # ESLint
npm run format:check # Prettier
npm run verify       # all of the above
```

Scene logic is test-driven. The pure models need no browser, and the three.js
systems are tested headlessly against three's core (no WebGL required) — only
the WebGL stage and the composition root are left to manual checks.

## Project structure

```
index.html            Markup and the canvas element
styles.css            Layout, controls, theming, and the static fallback
app.js                Composition root: wires DOM, model, world, and input
vite.config.js        Build config (three.js in its own vendor chunk)
src/
  config.js           Palettes and tuning constants (single source of truth)
  scene-math.js       Pure maths: colour mixing, easing, shooting stars
  time.js             Clock formatting and the day/night tween
  atmosphere.js       dayAmount -> every sky colour, light, and visibility
  terrain.js          Height field, crest finding, and ground picking
  wind.js             Ripple gusts and the hand that parts the grass
  fireflies.js        3D firefly flight and flash pattern
  clouds.js           Cumulus cloud generation and drift
  camera-rig.js       Camera drift, parallax, and portrait FOV
  scene.js            Scene model: state, lifecycle, per-frame snapshot
  input.js            Pointer controller: parallax, touch, and gusts
  three/
    world.js          Ordered pipeline of scene systems
    stage.js          WebGL renderer, bloom, and tone mapping
    camera.js         Camera pose, resize, and ground picker
    sky.js            Sky dome (sun, moon, twilight) and stars
    lights.js         Sun, moon, and hemisphere lights
    clouds.js         Billboard-puff cumulus clouds
    meteors.js        Night meteor shower
    terrain.js        Bliss hill mesh
    tree.js           The lone tree
    grass.js          Instanced grass shader (wind, gusts, firefly light)
    fireflies.js      Bloom-ready firefly glow
tests/
  *.test.js           Pure model tests
  three/*.test.js     Headless tests for the three.js systems
```

## How it works

The code is split along clear responsibilities:

- **Pure models** ([src/atmosphere.js](src/atmosphere.js),
  [src/terrain.js](src/terrain.js), [src/wind.js](src/wind.js), ...) hold all
  the maths and know nothing about the DOM or WebGL.
- **`Scene`** ([src/scene.js](src/scene.js)) owns mutable state and the
  per-frame lifecycle, and publishes one read-only `frame()` snapshot: time,
  atmosphere, wind, fireflies, and pointer.
- **The world** ([src/three/world.js](src/three/world.js)) is an ordered list
  of systems. Each owns one three.js object and an `update(frame)`, so adding
  scenery means registering a system, not editing the loop.
- **The stage** ([src/three/stage.js](src/three/stage.js)) is the only WebGL
  boundary: it renders through bloom and tone mapping.
- **`app.js`** is a thin composition root that owns the DOM and runs the
  `requestAnimationFrame` loop.

The day/night toggle sets a target and the model eases `dayAmount` toward it;
[`atmosphereAt(dayAmount)`](src/atmosphere.js) turns that single number into
every colour, light, and glow on screen.

The Bliss look is recreated procedurally — no copyrighted imagery is bundled.
