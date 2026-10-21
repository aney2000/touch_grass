# Stillfield

A quiet little field to visit whenever you need a moment outside.

Stillfield is a single-page, dependency-free canvas animation: a rolling meadow
under a changing sky. Brush the grass with your cursor to send ripples of wind
through it, and let night fall to watch stars, fireflies, a drifting moon, and
the occasional shooting star arrive.

## Features

- **Hand-drawn canvas scene** — layered hills, clouds, a lone swaying tree, and
  a field of individually simulated grass blades.
- **Day / night transition** — an eased tween with a warm sunrise/sunset glow,
  moving sun and moon, and a live clock that tracks the time of day.
- **Interactive wind** — move or press the pointer over the grass to create
  gusts that bend nearby blades and fade out naturally.
- **Night life** — twinkling stars, softly glowing fireflies, and meteors that
  streak across the sky.
- **Respects `prefers-reduced-motion`** — animation is dialled back for users
  who ask for less motion.
- **Pure, tested math core** — all the non-DOM maths lives in
  [src/scene-math.js](src/scene-math.js) and is covered by unit tests.

## Getting started

No build step and no dependencies — it is plain HTML, CSS, and ES modules.
Because it uses `type="module"`, it must be served over HTTP rather than opened
as a `file://` URL.

```bash
# Serve the folder on http://localhost:3000
npm run serve
```

Then open the printed URL in your browser.

Any static file server works equally well, for example:

```bash
python3 -m http.server 5173
```

## Running the tests

The scene logic is unit tested with Node's built-in test runner (no dependencies required):

```bash
npm test
```

## Linting and formatting

Code style is enforced with ESLint and Prettier:

```bash
npm run lint        # report problems
npm run lint:fix    # auto-fix where possible
npm run format      # format with Prettier
```

## Project structure

```
index.html          Markup and the canvas element
styles.css          Layout, controls, theming, and motion
app.js              Composition root: wires the DOM to the model/renderer/input
src/
  config.js         Palettes and tuning constants (single source of truth)
  scene-math.js     Pure, DOM-free maths (colour mixing, curves, motion)
  time.js           Clock formatting and the day/night tween
  scene-objects.js  Deterministic factories for grass, stars, fireflies, gusts
  scene.js          Scene model: mutable state and per-frame lifecycle
  renderer.js       Ordered layer pipeline that paints the scene
  input.js          Pointer controller that turns gestures into wind
tests/
  *.test.js         Unit tests for the pure modules
```

## How it works

The code is split along clear responsibilities:

- **`Scene`** ([src/scene.js](src/scene.js)) holds all mutable state and the
  per-frame lifecycle (resize, advance, day/night toggle, wind). It knows
  nothing about the canvas or DOM.
- **The renderer** ([src/renderer.js](src/renderer.js)) is an ordered list of
  layer functions — sky, twilight, stars, sun/moon, clouds, hills, tree, grass,
  fireflies, vignette. Each is a pure-ish `(context, scene, now)` draw call, so
  adding scenery means registering a layer, not editing the loop.
- **The input controller** ([src/input.js](src/input.js)) turns pointer
  gestures over the grass into short-lived "gusts" on the model, which
  [src/scene-math.js](src/scene-math.js) converts into per-blade bending.
- **`app.js`** is a thin composition root: it owns the DOM, sizes the canvas,
  and runs the `requestAnimationFrame` loop.

The day/night toggle sets a target and the model eases `dayAmount` from its
current value toward it, so every colour, glow, and position is just a blend
driven by that single number.
