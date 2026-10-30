import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindDayNightToggle } from "../../src/ui/day-night-toggle.js";
import { fakeElement, keydown } from "./fakes.js";
import { createShortcutGate } from "../../src/ui/shortcuts.js";

describe("bindDayNightToggle shortcut gate", () => {
  it("ignores N while keyboard shortcuts are switched off", () => {
    const shortcuts = createShortcutGate({ enabled: false });
    const { keyTarget, toggles } = setup({ shortcuts });
    keyTarget.dispatchEvent(keydown("n"));
    assert.equal(toggles.length, 0);
    shortcuts.setEnabled(true);
    keyTarget.dispatchEvent(keydown("n"));
    assert.equal(toggles.length, 1);
  });
});

function setup({ shortcuts } = {}) {
  const button = fakeElement();
  const label = fakeElement({ text: "Let night fall" });
  const announcer = fakeElement();
  const sceneElement = fakeElement();
  const keyTarget = new EventTarget();
  const toggles = [];
  const model = {
    targetNight: 0,
    toggleNight(now) {
      toggles.push(now);
      this.targetNight = this.targetNight ? 0 : 1;
      return this.targetNight;
    },
  };
  const binding = bindDayNightToggle({
    button,
    label,
    announcer,
    sceneElement,
    model,
    keyTarget,
    now: () => 777,
    shortcuts,
  });
  return { button, label, announcer, sceneElement, keyTarget, toggles, binding };
}

describe("bindDayNightToggle", () => {
  it("lets night fall on click: action label, night styling and a status line", () => {
    const { button, label, sceneElement, announcer } = setup();
    button.click();
    assert.equal(label.textContent, "Let morning in");
    assert.ok(sceneElement.classList.contains("scene--night"));
    assert.equal(announcer.textContent, "Night falls");
  });

  it("lets morning back in on a second click", () => {
    const { button, label, sceneElement, announcer } = setup();
    button.click();
    button.click();
    assert.equal(label.textContent, "Let night fall");
    assert.ok(!sceneElement.classList.contains("scene--night"));
    assert.equal(announcer.textContent, "Morning comes");
  });

  it("names the action in its label, so it carries no pressed state", () => {
    const { button } = setup();
    button.click();
    assert.equal(button.hasAttribute("aria-pressed"), false);
  });

  it("starts the transition on the shared frame clock", () => {
    const { button, toggles } = setup();
    button.click();
    assert.deepEqual(toggles, [777]);
  });

  it("toggles with the N key, upper or lower case", () => {
    const { keyTarget, toggles } = setup();
    keyTarget.dispatchEvent(keydown("n"));
    keyTarget.dispatchEvent(keydown("N"));
    assert.equal(toggles.length, 2);
  });

  it("ignores N while a modifier is held or while typing in a field", () => {
    const { keyTarget, toggles } = setup();
    keyTarget.dispatchEvent(keydown("n", { ctrlKey: true }));
    keyTarget.dispatchEvent(keydown("n", { metaKey: true }));
    keyTarget.dispatchEvent(keydown("n", { altKey: true }));
    keyTarget.dispatchEvent(keydown("n", { target: { tagName: "INPUT" } }));
    assert.equal(toggles.length, 0);
  });

  it("stops listening once disposed", () => {
    const { button, keyTarget, toggles, binding } = setup();
    binding.dispose();
    button.click();
    keyTarget.dispatchEvent(keydown("n"));
    assert.equal(toggles.length, 0);
  });
});
