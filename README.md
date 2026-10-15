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
# Serve the folder (uses Python's built-in server)
npm run serve
```

Then open http://localhost:5173 in your browser.

Any static file server works equally well, for example:

```bash
npx serve .
```

## Running the tests

The scene maths is unit tested with Node's built-in test runner:

```bash
npm test
```

## Project structure

```
index.html          Markup and the canvas element
styles.css          Layout, controls, and theming
app.js              Scene setup, rendering loop, and input handling
src/
  scene-math.js     Pure, DOM-free helpers (colour mixing, curves, motion)
tests/
  *.test.js         Unit tests for the scene maths
```

## How it works

[app.js](app.js) owns the canvas: it builds the field, runs the
`requestAnimationFrame` loop, and draws each layer (sky, twilight glow, stars,
sun/moon, clouds, hills, tree, grass, fireflies, vignette) every frame. Pointer
input adds short-lived "gusts" that [src/scene-math.js](src/scene-math.js)
turns into per-blade bending.

The day/night toggle sets a target and the render loop eases `dayAmount` from
its current value to that target, so every colour, glow, and position is just a
blend driven by that single number.
