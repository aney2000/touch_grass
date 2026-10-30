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

describe("zen mode shell", () => {
  it("offers a Zen toggle button in the dock", () => {
    const dock = elementBlock(/<div class="scene-dock"/, "div");
    assert.match(dock, /class="dock-button zen-toggle"\s+id="zen-toggle"/);
    assert.match(dock, /id="zen-toggle"[^>]*aria-pressed="false"/);
  });

  it("keeps the countdown pill hidden and outside the controls it outlives", () => {
    const footer = elementBlock(/<footer class="scene-controls"/, "footer");
    assert.doesNotMatch(footer, /zen-countdown/);
    assert.match(html, /<button[^>]*class="zen-countdown"[^>]*id="zen-countdown"[^>]*hidden/);
    assert.match(html, /class="zen-countdown__time"/);
  });

  it("has a polite live region for announcing the start and end", () => {
    assert.match(html, /id="zen-status"[^>]*aria-live="polite"/);
  });

  it("parks the countdown at the bottom-left, away from the host badge", () => {
    const pill = ruleBody(".zen-countdown");
    assert.match(pill, /left:/);
    assert.match(pill, /bottom:/);
    assert.doesNotMatch(pill, /right:/);
  });

  it("fades out every overlay, overriding the entrance animations", () => {
    const start = css.indexOf(".scene--zen .masthead,");
    assert.ok(start >= 0, "expected a combined .scene--zen hiding rule");
    const rule = css.slice(start, css.indexOf("}", start));
    for (const selector of [".masthead", ".scene-title", ".scene-controls", ".scene-hint"]) {
      assert.ok(rule.includes(`.scene--zen ${selector}`), `zen hides ${selector}`);
    }
    assert.match(rule, /opacity:\s*0\s*!important/);
    assert.match(rule, /visibility:\s*hidden\s*!important/);
    assert.match(rule, /pointer-events:\s*none/);
  });

  it("lets entrance animations release their last frame so zen can fade overlays back in", () => {
    assert.match(css, /animation: rise-in 900ms cubic-bezier\([^)]*\) backwards;/);
  });

  it("keeps a hidden countdown hidden despite its own display style", () => {
    assert.match(ruleBody(".zen-countdown[hidden]"), /display:\s*none/);
  });

  it("drains the countdown ring from the --zen-progress custom property", () => {
    assert.match(css, /var\(--zen-progress/);
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
