# Stillfield

A quiet little field to visit whenever you need a moment outside.

Stillfield is a single-page three.js scene: a sunlit, rolling hill under a
cobalt sky (an homage to the classic "Bliss" desktop) that you can actually
touch. Brush the grass to part it, swipe to send ripples through the meadow,
change the season, and let night fall to watch the moon rise, stars and meteors
appear, and fireflies blink to life.

## Features

- **Real-time 3D meadow**: tens of thousands of GPU-instanced grass blades in
  rolling wind waves, a Bliss-style hill and billowy cumulus clouds.
- **Touch the grass**: the pointer is ray-cast onto the terrain; grass parts
  under your hand, and brisk swipes or taps send expanding ripple rings.
- **Day / night**: one eased `dayAmount` drives the sky dome, sun and moon
  lights, fog, bloom, exposure and a live clock (noon at midday, midnight at
  the depth of night).
- **Forest**: 24 / 36 / 48 trees (by quality tier) in a few copses and a
  forest edge, planted only where the resting camera sees them, with the
  centre meadow kept clear. About a quarter are conifers that stay green and
  gather snow; deciduous trees blossom, green, turn and go bare
  (`src/forest.js`).
- **Season choreography**: a 7 s morph (1.2 s with reduced motion), opened by
  a soft breeze. Each channel (sky, light, ground snow, grass snow, grass colour
  and height, foliage, blossom, particles) eases in its own window
  (`src/season-choreography.js`): into winter the leaves turn, then fall, the
  sky cools, snow settles on the blade tips before the ground and the grass
  shortens last. Backwards plays in reverse; a two-season jump walks through the
  season in between.
- **Zonal falling particles**: none in summer. In spring and autumn each
  deciduous tree drops petals or leaves from its own canopy (about one per
  second) that drift within ~2.5 canopy radii, settle and shrink away. Winter
  snow is sparse and soft over the whole visible field. The budget scales with
  the forest: ~8 leaves per deciduous tree (≤ 120 / 200 / 300 by tier) and
  250 / 400 / 600 flakes (`src/particle-budget.js`).
- **Birds**: by day a flock of 1–5 birds leaves a canopy every 6–18 s and
  flies a Bézier arc to another tree, out of view, or in to land. Rarer at dusk
  and in winter, none at night; at most 4 / 6 / 8 by tier.
- **Grasshoppers**: in summer, sweeping through the grass sometimes flushes
  1–3 grasshoppers that hop away with an orange wing flash. Never at night or
  in winter; at most 4 / 6 / 8 by tier.
- **Label-free constellations**: the Big Dipper, Little Dipper, Cassiopeia
  and Orion from real star coordinates, with brightness by magnitude, colour by
  B−V index and twinkle near the horizon. No text on the sky: <kbd>C</kbd>
  fades in a faint tracing, and tapping a figure traces it briefly while a
  quiet caption by the clock (and a screen-reader announcement) names it.
- **Zen**: hides all text and controls for one minute with a small countdown.
- **Fireflies, meteors, living camera**: fireflies flash like the real thing
  and light the grass; meteors cross the night sky; the camera breathes and
  leans toward the pointer.
- **Graceful fallback**: without WebGL or JavaScript, a CSS rendition of the
  field remains.

## Controls

The dock sits at the bottom-left beside the clock.

| Control        | Shortcut                       | What it does                                                         |
| -------------- | ------------------------------ | -------------------------------------------------------------------- |
| Brush / swipe  | —                              | Parts the grass; brisk swipes and taps send ripples                  |
| Day / night    | <kbd>N</kbd>                   | Lets night fall or morning in                                        |
| Seasons        | <kbd>1</kbd>–<kbd>4</kbd>      | Spring, summer, autumn, winter                                       |
| Season group   | <kbd>←</kbd> <kbd>→</kbd> etc. | Radio group with one tab stop; arrow keys move and select the season |
| Constellations | <kbd>C</kbd>                   | Traces the constellations (lets night fall first by day)             |
| Zen            | <kbd>Z</kbd>                   | Hides everything for one minute                                      |
| Leave zen      | <kbd>Esc</kbd> / <kbd>Z</kbd>  | Brings everything back early (or click the countdown)                |
| Shortcuts      | —                              | Switches the single-key shortcuts off and on (hidden on touch)       |

Shortcuts ignore modifier keys and keystrokes typed into fields.

## Performance & devices

- **Quality tiers** (`src/quality.js`): screen size, pixel ratio, CPU cores,
  device memory, pointer type and reduced motion pick `low`, `mid` or `high`.
  The tier sets grass blades (18k / 36k / 60k), trees, particle, bird and
  grasshopper caps, pixel-ratio cap (1.25 / 1.5 / 2), MSAA (0 / 2 / 4) and
  bloom resolution. Effective pixels are clamped to ~8 MP.
- **Frame governor** (`src/frame-governor.js`): if smoothed frame time stays
  over 22 ms for 3 s, it steps down a tier live (pixel ratio and bloom only),
  then waits 8 s before judging again.
- **Idle cost** (`src/loop.js`): rendering pauses while the tab is hidden,
  resizes are coalesced, WebGL context loss is handled, and the frame loop
  rebuilds season and atmosphere data only when their inputs move.
- **Distance-aware sprites** (`src/three/screen-size.js`): leaves and birds
  grow with camera distance so they stay readable far away.
- **Small screens**: drags brush the grass (no scroll or pull-to-refresh),
  safe-area insets apply, portrait gets a capped 70° field of view, and layouts
  cover phones, tablets (601–1024 px), short landscape phones and ≥1920 px.

## Accessibility

- **Contrast**: overlay text and dock colours are checked against WCAG ratios
  in tests (`src/contrast.js`, `tests/contrast.test.js`), day and night.
- **Keyboard**: every control is a real button; seasons are a radio group with
  roving focus; single-key shortcuts can be turned off (WCAG 2.1.4).
- **Screen readers**: the canvas is a labelled image, an intro explains the
  controls, and day/night, season, zen and constellation changes are announced
  in polite live regions.
- **Touch**: dock buttons are 44 px squares on phones; the zen countdown has a
  44 px target; hover effects only apply to hover-capable pointers.
- **`prefers-reduced-motion`**: a static camera (no drift or parallax), no
  season-change breeze gust, slower wind, clouds, fireflies, particles and
  birds, no meteors, shorter day/night and season transitions, and one lower
  quality tier.

## Architecture

- **Pure model → snapshot → systems.** Pure modules (`src/*.js`) hold all
  the maths and know nothing of the DOM or WebGL, so they are unit-tested in
  plain Node. `Scene` (`src/scene.js`) owns mutable state and publishes one
  read-only `frame()` snapshot per frame. The world (`src/three/world.js`) is an
  ordered list of systems, each owning one three.js object and an
  `update(frame)`; adding scenery means registering a system, not editing the
  loop. The stage (`src/three/stage.js`) is the only WebGL boundary.
- **Strategy spawners.** Falling particles take a spawner strategy per kind
  (`src/emitters.js`): canopy emitters for petals and leaves, a sky-area
  spawner for snow. Zonal behaviour and the forest-relative budget come from
  the strategy, not from branches in the particle system.
- **Quality tiers** set every expensive count once at startup; the governor
  only touches cheap knobs at runtime, so nothing is rebuilt mid-session.
- **Thin composition root.** `app.js` wires DOM bindings (`src/ui/*`), model,
  world and input, and runs the loop.

The Bliss look is procedural; no copyrighted imagery is bundled.

## Project structure

```
index.html              Markup, canvas, share meta
styles.css              Layout, dock, theming, static fallback
app.js                  Composition root
public/favicon.svg      Copied to the dist/ root by Vite
vite.config.js          Relative base, three.js in its own chunk
src/
  config.js             Palettes and tuning constants
  scene-math.js         Colour mixing, easing, random, shooting stars
  time.js               Clock formatting and the day/night tween
  atmosphere.js         dayAmount + season look -> sky, light, visibility
  terrain.js            Height field and ground picking
  ground.js             Ground colour and snow cover
  wind.js               Ripple gusts and the hand that parts the grass
  fireflies.js          Firefly flight and flash pattern
  clouds.js             Cumulus generation and drift
  camera-rig.js         Drift, parallax, portrait FOV
  scene.js              Scene model and per-frame snapshot
  input.js              Pointer controller
  seasons.js            Season ring, blend weights, season looks
  season-choreography.js  Per-channel timing of a season morph
  forest.js             Tree placement in copses and the forest edge
  emitters.js           Spawner strategies (canopy, sky)
  falling.js            Petal, leaf and snow particle field
  particle-budget.js    Particle caps from forest size and tier
  birds.js              Flock flights between canopies
  grasshoppers.js       Grasshopper flushes and hops
  constellations.js     Star catalogue, magnitudes, colours, layout
  zen.js                Zen timer and countdown
  quality.js            Quality tiers and stage options
  frame-governor.js     Live tier step-down
  loop.js               Render loop, visibility, context loss
  contrast.js           WCAG luminance and contrast ratio
  ui/
    shortcuts.js        Shortcut matching and the on/off gate + toggle
    clock-view.js       Clock text
    day-night-toggle.js Day/night button, N, status announcements
    season-picker.js    Season radio group, 1–4 and arrow keys
    constellation-toggle.js  C toggle, caption, announcements
    zen-mode.js         Zen button, countdown, Z / Escape
    hint.js             Hint that dismisses itself
    script-ready.js     Clears the no-js class
  three/
    world.js            Ordered pipeline of systems
    stage.js            Renderer, bloom, tone mapping
    camera.js           Camera pose, resize, ground picker
    sky.js              Sky dome, sun, moon, stars
    lights.js           Sun, moon, hemisphere lights
    clouds.js           Billboard cumulus
    meteors.js          Night meteors
    terrain.js          Hill mesh
    tree.js             Grove of deciduous trees and conifers
    grass.js            Instanced grass shader
    fireflies.js        Firefly glow
    falling.js          Falling-particle points
    birds.js            Bird silhouettes
    grasshoppers.js     Grasshopper sprites
    constellations.js   Star figures, tracing, sky picker
    color.js            Colour helpers
    screen-size.js      Distance-aware sprite sizing (GLSL)
tests/
  *.test.js             Pure model tests
  three/*.test.js       Headless tests for three.js systems
  ui/*.test.js          DOM bindings with tiny element fakes
  layout.test.js        index.html / styles.css / vite.config.js as text
```

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # Node's built-in test runner
npm run lint         # ESLint
npm run format:check # Prettier
npm run verify       # all three
```

Scene logic is test-driven: pure models need no browser, three.js systems are
tested headlessly against three's core, and only the WebGL stage and the
composition root are left to manual checks on real devices.

> **WSL on a Windows drive (`/mnt/c/...`)**: Node there intermittently
> misreads large files in `node_modules`. Run tests, lint and builds from a
> copy on the Linux filesystem (e.g. `rsync` to `/tmp`, then `npm ci` there).
> File watching also misses edits on `/mnt/c`; use
> `CHOKIDAR_USEPOLLING=1 npm run dev`.

## Deployment

```bash
npm run build        # writes dist/
```

Upload the contents of `dist/` to any static host. `base: "./"` makes every
asset URL relative, so the folder works from a domain root or a subfolder.
