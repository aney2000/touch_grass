// Layout contract for the page shell. There is no browser in these tests, so
// they read index.html and styles.css as text and pin the few structural
// promises the scripts and the hosting environment rely on.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `expected a top-level rule for ${selector}`);
  return match[2];
}

function elementBlock(openingPattern, tag) {
  const start = html.search(openingPattern);
  assert.ok(start >= 0, `expected ${openingPattern} in index.html`);
  const end = html.indexOf(`</${tag}>`, start);
  return html.slice(start, end);
}

describe("scene control dock", () => {
  it("groups the scene buttons in a labelled toolbar", () => {
    assert.match(html, /<div class="scene-dock" role="toolbar" aria-label="Scene controls"/);
  });

  it("holds the day/night toggle as a dock button", () => {
    const dock = elementBlock(/<div class="scene-dock"/, "div");
    assert.match(dock, /id="scene-toggle"/);
    assert.match(dock, /class="dock-button scene-toggle"/);
  });

  it("sits beside the clock in the footer", () => {
    const footer = elementBlock(/<footer class="scene-controls"/, "footer");
    assert.match(footer, /id="scene-clock"/);
    assert.match(footer, /class="scene-dock"/);
  });
});

describe("hosting badge clearance", () => {
  it("names the bottom-right area the host's badge covers", () => {
    const root = ruleBody(":root");
    assert.match(root, /--badge-clearance-x:\s*2[2-9]\dpx/);
    assert.match(root, /--badge-clearance-y:\s*[7-9]\dpx/);
  });

  it("keeps the footer controls out of that area by padding it off the right edge", () => {
    const controls = ruleBody(".scene-controls");
    assert.match(controls, /padding-right:\s*var\(--badge-clearance-x\)/);
    assert.match(controls, /justify-content:\s*flex-start/);
    assert.match(controls, /flex-wrap:\s*wrap/);
  });

  it("lifts the controls above the badge on narrow screens instead of squeezing them", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 540px)"));
    assert.match(narrow, /\.scene-controls\s*\{[^}]*padding-right:\s*0/);
    assert.match(narrow, /\.scene-controls\s*\{[^}]*bottom:[^;]*var\(--badge-clearance-y\)/);
  });
});
