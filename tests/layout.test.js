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

describe("season picker", () => {
  const SEASON_KEYS = { spring: 1, summer: 2, autumn: 3, winter: 4 };

  it("sits in the dock as a labelled group", () => {
    const footer = elementBlock(/<footer class="scene-controls"/, "footer");
    assert.match(footer, /<div class="season-picker" role="group" aria-label="Season"/);
  });

  it("offers one button per season with its number shortcut and a coloured dot", () => {
    const picker = elementBlock(/<div class="season-picker"/, "div");
    for (const [season, key] of Object.entries(SEASON_KEYS)) {
      const button = picker.match(
        new RegExp(`<button[^>]*data-season="${season}"[^>]*>[\\s\\S]*?</button>`),
      );
      assert.ok(button, `expected a ${season} button`);
      assert.match(button[0], /class="dock-button season-button"/);
      assert.match(button[0], new RegExp(`aria-keyshortcuts="${key}"`));
      assert.match(button[0], /aria-label="[A-Z][a-z]+"/);
      assert.match(button[0], /class="season-button__dot" aria-hidden="true"/);
    }
  });

  it("keeps the season labels on narrow screens accessible by hiding only the text", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 600px)"));
    assert.match(narrow, /\.season-button__label\s*\{[^}]*display:\s*none/);
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

  it("lifts the hint along with the controls so the two never overlap", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 540px)"));
    assert.match(narrow, /\.scene-hint\s*\{[^}]*bottom:[^;]*var\(--badge-clearance-y\)/);
  });
});

function mediaBlock(query) {
  const start = css.indexOf(`@media ${query}`);
  assert.ok(start >= 0, `expected @media ${query}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  return css.slice(start);
}

const TOUCH = "(hover: none) and (pointer: coarse)";

describe("mobile and touch", () => {
  it("lets the page extend under the notch so safe-area insets apply", () => {
    assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover/);
  });

  it("keeps drags on the canvas for the grass, not for scrolling or pull-to-refresh", () => {
    assert.match(ruleBody(".scene__canvas"), /touch-action:\s*none/);
  });

  it("gives the zen countdown a 44px tap target and readable contrast", () => {
    const body = ruleBody(".zen-countdown");
    assert.match(body, /min-height:\s*44px/);
    const opacity = Number(body.match(/opacity:\s*([\d.]+)/)[1]);
    assert.ok(opacity >= 0.75, `opacity ${opacity}`);
  });

  it("only lifts buttons on hover where hovering exists", () => {
    const outside = css.replace(mediaBlock("(hover: hover)"), "");
    assert.doesNotMatch(outside, /:hover/);
    assert.match(mediaBlock("(hover: hover)"), /\.dock-button:hover/);
  });

  it("sizes the title fluidly instead of with fixed breakpoints", () => {
    assert.match(ruleBody(".scene-title h1"), /font-size:\s*clamp\(38px, 4vw \+ 1rem, 84px\)/);
    assert.doesNotMatch(css, /h1\s*\{[^}]*font-size:\s*\d+px/);
  });

  it("gives tablets their own insets while keeping season labels", () => {
    const tablet = mediaBlock("(min-width: 601px) and (max-width: 1024px)");
    assert.match(tablet, /24px/);
    assert.doesNotMatch(tablet, /season-button__label\s*\{[^}]*display:\s*none/);
  });

  it("compacts a short landscape phone: higher title, no hint, icon-only dock", () => {
    const landscape = mediaBlock("(orientation: landscape) and (max-height: 500px)");
    assert.match(landscape, /\.scene-title\s*\{[^}]*top:/);
    assert.match(landscape, /\.scene-hint\s*\{[^}]*display:\s*none/);
    assert.match(landscape, /\.season-button__label[^{]*\{[^}]*display:\s*none/);
  });

  it("caps the layout width on very large screens", () => {
    assert.match(mediaBlock("(min-width: 1920px)"), /max-width/);
  });

  it("hides the keyboard part of the hint on touch screens", () => {
    assert.match(html, /<span class="scene-hint__keys">/);
    assert.match(mediaBlock(TOUCH), /\.scene-hint__keys\s*\{[^}]*display:\s*none/);
  });
});
