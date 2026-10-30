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
- **Spot the constellations** — on a starry night the Big Dipper, Little
  Dipper (with Polaris), Cassiopeia and Orion shine a little brighter, placed
  from real star coordinates so the Merak → Dubhe pointer leads to the pole
  star. Press <kbd>C</kbd> to fade in their lines and names, or tap a
  constellation star to outline it for a few seconds; screen readers hear
  which one you spotted.
- **Graceful fallback** — without WebGL, a CSS rendition of the field remains.

## Controls

The controls sit in a dock at the bottom-left, next to the clock, clear of the
hosting badge in the bottom-right corner.

| Control        | Shortcut                      | What it does                                                          |
| -------------- | ----------------------------- | --------------------------------------------------------------------- |
| Brush / swipe  | —                             | Parts the grass under the pointer; brisk swipes and taps send ripples |
| Day / night    | <kbd>N</kbd>                  | Lets night fall or morning in                                         |
| Seasons        | <kbd>1</kbd>–<kbd>4</kbd>     | Morphs the meadow to spring, summer, autumn or winter                 |
| Constellations | <kbd>C</kbd>                  | Outlines and names the constellations (lets night fall first by day)  |
| Zen            | <kbd>Z</kbd>                  | Hides all text and controls for one minute, with a small countdown    |
| Leave zen      | <kbd>Esc</kbd> / <kbd>Z</kbd> | Brings everything back early (or click the countdown)                 |

Shortcuts ignore modifier keys and keystrokes typed into fields. The clock
follows the sky: noon at midday, midnight at the depth of night, running
forward through the evening as night falls and through the morning as day
returns.

## Performance & devices

- **Quality tiers** (`src/quality.js`): at startup the screen size, pixel
  ratio, CPU cores, device memory, pointer type and reduced-motion preference
  pick a `low`, `mid` or `high` tier. The tier sets grass blades
  (18k / 36k / 60k), grove trees, falling particles, pixel ratio cap
  (1.25 / 1.5 / 2), MSAA samples (0 / 2 / 4) and bloom resolution. Effective
  pixels are clamped to about 8 MP; unknown hardware counts as mid-capable,
  and reduced motion drops one tier.
- **Frame governor** (`src/frame-governor.js`): if smoothed frame time stays
  over 22 ms for 3 s, the app steps down a tier live (pixel ratio and bloom
  scale only; geometry is not rebuilt), then waits 8 s before judging again.
- **Idle cost**: rendering pauses while the tab is hidden; resizes are
  coalesced into one frame and skipped when nothing changed; per-frame DOM
  writes happen only on change.
- **Touch & small screens**: drags on the canvas brush the grass (no scroll or
  pull-to-refresh), safe-area insets apply under notches, tap targets are at
  least 44 px, hover effects are limited to hover-capable pointers, and
  portrait screens get a capped 70° field of view with the camera pulled back.
  Layouts cover phones, tablets (601–1024 px), short landscape phones and
  large (≥1920 px) screens.

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
  zen.js              Zen mode timer and countdown formatting
  seasons.js          Season ring, blend weights, and blended season looks
  ui/
    shortcuts.js      Single-key shortcuts that ignore modifiers and typing
    clock-view.js     Renders the clock as text
    day-night-toggle.js  Day/night button and N shortcut
    zen-mode.js       Zen button, countdown pill, and Z / Escape shortcuts
    season-picker.js  Season buttons and the 1-4 shortcuts
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
  ui/*.test.js        DOM bindings, tested with tiny element fakes
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
