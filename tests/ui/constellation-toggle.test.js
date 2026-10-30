import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindConstellationToggle } from "../../src/ui/constellation-toggle.js";
import { fakeElement, keydown } from "./fakes.js";
import { createShortcutGate } from "../../src/ui/shortcuts.js";

function setup({ night = true, shortcuts, caption } = {}) {
  let clock = 42;
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
    now: () => clock,
    shortcuts,
    caption,
    bringNight: () => {
      nightfalls.push(true);
      model.isNight = true;
    },
  });
  const setClock = (time) => {
    clock = time;
  };
  return { button, announcer, keyTarget, model, nightfalls, binding, setClock };
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
    assert.equal(button.getAttribute("title"), "See the stars tonight (C)");
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

  it("shows only the pressed state, not the waiting dim, when day returns while on", () => {
    const { button, model, binding } = setup();
    button.click();
    model.isNight = false;
    binding.sync();
    assert.equal(button.getAttribute("aria-pressed"), "true");
    assert.equal(button.classList.contains("constellation-toggle--waiting"), false);
  });

  it("captions a spotted constellation, then hides the caption after 3 s of frames", () => {
    const caption = fakeElement();
    caption.hidden = true;
    const { binding, setClock } = setup({ caption });
    binding.announce("Orion");
    assert.equal(caption.textContent, "Orion");
    assert.equal(caption.hidden, false);
    assert.ok(caption.classList.contains("constellation-caption--visible"));
    setClock(42 + 2_999);
    binding.update();
    assert.ok(caption.classList.contains("constellation-caption--visible"));
    setClock(42 + 3_000);
    binding.update();
    assert.equal(caption.classList.contains("constellation-caption--visible"), false);
  });

  it("names the Big Dipper with its article in the caption", () => {
    const caption = fakeElement();
    const { binding } = setup({ caption });
    binding.announce("Big Dipper");
    assert.equal(caption.textContent, "The Big Dipper");
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
