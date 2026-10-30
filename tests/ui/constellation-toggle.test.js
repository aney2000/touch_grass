import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindConstellationToggle } from "../../src/ui/constellation-toggle.js";
import { fakeElement, keydown } from "./fakes.js";
import { createShortcutGate } from "../../src/ui/shortcuts.js";

function setup({ night = true, shortcuts } = {}) {
  const button = fakeElement();
  const announcer = fakeElement();
  const keyTarget = new EventTarget();
  const nightfalls = [];
  const model = {
    isNight: night,
    constellationsVisible: false,
    toggleConstellations(now) {
      this.lastNow = now;
      this.constellationsVisible = !this.constellationsVisible;
      return this.constellationsVisible;
    },
    setConstellationsVisible(visible) {
      this.constellationsVisible = visible;
      return visible;
    },
  };
  const binding = bindConstellationToggle({
    button,
    announcer,
    model,
    keyTarget,
    now: () => 42,
    shortcuts,
    bringNight: () => {
      nightfalls.push(true);
      model.isNight = true;
    },
  });
  return { button, announcer, keyTarget, model, nightfalls, binding };
}

describe("bindConstellationToggle", () => {
  it("toggles constellation mode on click and reflects aria-pressed", () => {
    const { button, model } = setup();
    button.click();
    assert.equal(model.constellationsVisible, true);
    assert.equal(model.lastNow, 42);
    assert.equal(button.getAttribute("aria-pressed"), "true");
    button.click();
    assert.equal(button.getAttribute("aria-pressed"), "false");
  });

  it("answers the C shortcut", () => {
    const { keyTarget, model } = setup();
    keyTarget.dispatchEvent(keydown("c"));
    assert.equal(model.constellationsVisible, true);
  });

  it("ignores C while shortcuts are switched off", () => {
    const { keyTarget, model } = setup({ shortcuts: createShortcutGate({ enabled: false }) });
    keyTarget.dispatchEvent(keydown("c"));
    assert.equal(model.constellationsVisible, false);
  });

  it("ignores C typed into a text field", () => {
    const { keyTarget, model } = setup();
    const field = fakeElement();
    field.tagName = "INPUT";
    keyTarget.dispatchEvent(keydown("c", { target: field }));
    assert.equal(model.constellationsVisible, false);
  });

  it("dims itself by day with a hint, and clears it at night", () => {
    const { button, model, binding } = setup({ night: false });
    binding.sync();
    assert.ok(button.classList.contains("constellation-toggle--waiting"));
    assert.equal(button.getAttribute("title"), "Wait for night to spot constellations");
    model.isNight = true;
    binding.sync();
    assert.equal(button.classList.contains("constellation-toggle--waiting"), false);
    assert.equal(button.getAttribute("title"), "Spot the constellations (C)");
  });

  it("brings night on when pressed by day, then shows the constellations", () => {
    const { button, model, nightfalls } = setup({ night: false });
    button.click();
    assert.equal(nightfalls.length, 1);
    assert.equal(model.constellationsVisible, true);
    assert.equal(button.getAttribute("aria-pressed"), "true");
  });

  it("leaves the DOM alone when sync runs again with nothing changed", () => {
    const { button, model, binding } = setup();
    binding.sync();
    let writes = 0;
    const setAttribute = button.setAttribute;
    button.setAttribute = (...args) => {
      writes += 1;
      setAttribute(...args);
    };
    const toggleClass = button.classList.toggle;
    button.classList.toggle = (...args) => {
      writes += 1;
      return toggleClass(...args);
    };
    binding.sync();
    binding.sync();
    assert.equal(writes, 0);
    model.constellationsVisible = true;
    binding.sync();
    assert.ok(writes > 0);
    assert.equal(button.getAttribute("aria-pressed"), "true");
  });

  it("announces a spotted constellation in the live region", () => {
    const { announcer, binding } = setup();
    binding.announce("Big Dipper");
    assert.equal(announcer.textContent, "You spotted the Big Dipper");
    binding.announce("Orion");
    assert.equal(announcer.textContent, "You spotted Orion");
  });

  it("stops listening once disposed", () => {
    const { button, keyTarget, model, binding } = setup();
    binding.dispose();
    button.click();
    keyTarget.dispatchEvent(keydown("c"));
    assert.equal(model.constellationsVisible, false);
  });
});
