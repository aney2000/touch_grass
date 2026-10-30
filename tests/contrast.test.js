// WCAG contrast for the colour pairs the UI relies on. styles.css is the
// source of truth for the UI tokens; the backgrounds the overlays float on
// (sky, ground, night) come from the scene and are pinned here.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composite, contrastRatio, relativeLuminance } from "../src/contrast.js";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const LIGHTEST_SKY = "#9cc7f5";
const DAY_SKY = "#4f95ea";
const DEEP_SKY = "#1d5fd1";
const GROUND = "#3c8420";
const NIGHT_SKY = "#0b1a2e";
const PAPER = "#fffdf5";
const INK = "#183d32";
const NIGHT_BUTTON = "#20332f";

const TEXT = 4.5;
const NON_TEXT = 3;

function cssVar(name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `expected ${name} in styles.css`);
  return match[1];
}

function rgba(text) {
  const m = text.match(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)%?\)/);
  assert.ok(m, `expected an rgb(r g b / a) colour in ${text}`);
  const alpha = Number(m[4]);
  return {
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    alpha: alpha > 1 ? alpha / 100 : alpha,
  };
}

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `expected a top-level rule for ${selector}`);
  return match[2];
}

describe("contrast helpers", () => {
  it("gives black and white their WCAG luminances", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#ffffff"), 1);
  });

  it("rates black on white 21:1 and is symmetric", () => {
    assert.equal(contrastRatio("#000", "#fff"), 21);
    assert.equal(contrastRatio("#fff", "#000"), 21);
    assert.equal(contrastRatio("#777777", "#777777"), 1);
  });

  it("composites a translucent colour over a background", () => {
    assert.equal(composite([0, 0, 0], 0.5, "#ffffff"), "#808080");
    assert.equal(composite([255, 0, 0], 1, "#00ff00"), "#ff0000");
  });
});

describe("text over the sky (WCAG 1.4.3)", () => {
  it("keeps dark ink readable on the clock's paper backplate over any sky or ground", () => {
    const plate = rgba(ruleBody(".scene-clock").match(/background:\s*([^;]+);/)[1]);
    for (const bg of [LIGHTEST_SKY, DAY_SKY, DEEP_SKY, GROUND]) {
      const ratio = contrastRatio(cssVar("--ink"), composite(plate.rgb, plate.alpha, bg));
      assert.ok(ratio >= TEXT, `ink on clock plate over ${bg}: ${ratio.toFixed(2)}`);
    }
  });

  it("keeps the small masthead note and eyebrow readable on their scrim over the lightest sky", () => {
    const scrim = rgba(ruleBody(":root").match(/--sky-scrim:\s*([^;]+);/)[1]);
    const ratio = contrastRatio(
      cssVar("--sky-ink"),
      composite(scrim.rgb, scrim.alpha, LIGHTEST_SKY),
    );
    assert.ok(ratio >= TEXT, `sky ink on scrim: ${ratio.toFixed(2)}`);
  });

  it("uses ink on paper for every dock label", () => {
    assert.ok(contrastRatio(INK, PAPER) >= TEXT);
    assert.ok(contrastRatio("#244c39", PAPER) >= TEXT);
    assert.ok(contrastRatio("#f6e6bb", NIGHT_BUTTON) >= TEXT);
  });
});

describe("selected and focus states (WCAG 1.4.11)", () => {
  it("keeps selected labels readable by day and night", () => {
    assert.ok(contrastRatio("#244c39", "#fff3d1") >= TEXT);
    assert.ok(contrastRatio("#f6e6bb", "#2f4a43") >= TEXT);
  });

  it("marks the selected button with an indicator that stands out from its fill", () => {
    const day = ruleBody('.dock-button[aria-pressed="true"],\n.dock-button[aria-checked="true"]');
    const bar = day.match(/inset 0 -3px 0 (#[0-9a-f]{6})/i)[1];
    assert.ok(contrastRatio(bar, "#fff3d1") >= NON_TEXT, `day bar ${bar}`);
    assert.ok(contrastRatio("#f3bd53", "#2f4a43") >= NON_TEXT, "night bar");
  });

  it("draws a two-tone focus ring where one tone always clears 3:1", () => {
    const focus = ruleBody(
      ".dock-button:focus-visible,\n.wordmark:focus-visible,\n.zen-countdown:focus-visible",
    );
    const dark = focus.match(/outline:\s*3px solid (#[0-9a-f]{6})/i)[1];
    const light = focus.match(/box-shadow:\s*0 0 0 \d+px (#[0-9a-f]{6})/i)[1];
    for (const bg of [LIGHTEST_SKY, DAY_SKY, DEEP_SKY, GROUND, NIGHT_SKY, PAPER, NIGHT_BUTTON]) {
      const best = Math.max(contrastRatio(dark, bg), contrastRatio(light, bg));
      assert.ok(best >= NON_TEXT, `focus ring on ${bg}: ${best.toFixed(2)}`);
    }
  });

  it("gives the pale winter dot a ring that stands out from the paper", () => {
    const winter = ruleBody('.season-button[data-season="winter"]');
    const ring = rgba(winter.match(/--season-ring:\s*([^;]+);/)[1]);
    const ratio = contrastRatio(composite(ring.rgb, ring.alpha, PAPER), PAPER);
    assert.ok(ratio >= NON_TEXT, `winter ring: ${ratio.toFixed(2)}`);
  });
});
