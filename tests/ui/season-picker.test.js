import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindSeasonPicker } from "../../src/ui/season-picker.js";
import { fakeElement, keydown } from "./fakes.js";
import { createShortcutGate } from "../../src/ui/shortcuts.js";

const NAMES = ["spring", "summer", "autumn", "winter"];

function setup({ shortcuts } = {}) {
  const buttons = NAMES.map((season) => ({ season, element: fakeElement() }));
  const sceneElement = fakeElement();
  const keyTarget = new EventTarget();
  const announcer = fakeElement();
  const calls = [];
  const model = {
    season: "summer",
    setSeason(name, now) {
      calls.push([name, now]);
      this.season = name;
      return name;
    },
  };
  const binding = bindSeasonPicker({
    buttons,
    sceneElement,
    model,
    keyTarget,
    now: () => 321,
    announcer,
    shortcuts,
  });
  const pressed = () =>
    buttons.filter(({ element }) => element.getAttribute("aria-checked") === "true");
  const button = (season) => buttons.find((entry) => entry.season === season).element;
  return { buttons, sceneElement, keyTarget, announcer, calls, binding, pressed, button };
}

describe("bindSeasonPicker", () => {
  it("reflects the model's starting season without starting a morph", () => {
    const { sceneElement, calls, pressed } = setup();
    assert.equal(sceneElement.getAttribute("data-season"), "summer");
    assert.deepEqual(
      pressed().map(({ season }) => season),
      ["summer"],
    );
    assert.equal(calls.length, 0);
  });

  it("morphs to the clicked season on the shared frame clock", () => {
    const { button, calls, sceneElement } = setup();
    button("autumn").click();
    assert.deepEqual(calls, [["autumn", 321]]);
    assert.equal(sceneElement.getAttribute("data-season"), "autumn");
  });

  it("keeps exactly one season button pressed, like a radio group", () => {
    const { button, pressed } = setup();
    button("winter").click();
    assert.deepEqual(
      pressed().map(({ season }) => season),
      ["winter"],
    );
    assert.equal(button("summer").getAttribute("aria-checked"), "false");
    assert.equal(button("winter").hasAttribute("aria-pressed"), false);
  });

  it("keeps a single tab stop on the checked season (roving tabindex)", () => {
    const { button } = setup();
    assert.equal(button("summer").getAttribute("tabindex"), "0");
    assert.equal(button("spring").getAttribute("tabindex"), "-1");
    button("autumn").click();
    assert.equal(button("autumn").getAttribute("tabindex"), "0");
    assert.equal(button("summer").getAttribute("tabindex"), "-1");
  });

  it("moves, selects and focuses with the arrow keys, wrapping at the ends", () => {
    const { button, calls } = setup();
    button("summer").dispatchEvent(keydown("ArrowRight"));
    assert.deepEqual(calls.at(-1), ["autumn", 321]);
    assert.equal(fakeElement.focused, button("autumn"));
    button("autumn").dispatchEvent(keydown("ArrowLeft"));
    assert.deepEqual(calls.at(-1), ["summer", 321]);
    button("summer").dispatchEvent(keydown("ArrowLeft"));
    button("spring").dispatchEvent(keydown("ArrowLeft"));
    assert.deepEqual(calls.at(-1), ["winter", 321]);
    assert.equal(button("winter").getAttribute("aria-checked"), "true");
  });

  it("claims the arrow key so the page does not scroll", () => {
    const { button } = setup();
    const event = keydown("ArrowRight");
    button("summer").dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  });

  it("announces the new season for screen readers", () => {
    const { button, announcer } = setup();
    button("spring").click();
    assert.equal(announcer.textContent, "Spring");
  });

  it("picks spring, summer, autumn and winter with the 1 to 4 keys", () => {
    const { keyTarget, calls } = setup();
    ["1", "2", "3", "4"].forEach((key) => keyTarget.dispatchEvent(keydown(key)));
    assert.deepEqual(
      calls.map(([name]) => name),
      NAMES,
    );
  });

  it("ignores the number keys while typing or with a modifier held", () => {
    const { keyTarget, calls } = setup();
    keyTarget.dispatchEvent(keydown("1", { target: { tagName: "INPUT" } }));
    keyTarget.dispatchEvent(keydown("2", { ctrlKey: true }));
    keyTarget.dispatchEvent(keydown("5"));
    assert.equal(calls.length, 0);
  });

  it("ignores the number keys while shortcuts are switched off", () => {
    const { keyTarget, calls } = setup({ shortcuts: createShortcutGate({ enabled: false }) });
    keyTarget.dispatchEvent(keydown("1"));
    assert.equal(calls.length, 0);
  });

  it("can select a season programmatically", () => {
    const { binding, calls } = setup();
    binding.select("winter");
    assert.deepEqual(calls, [["winter", 321]]);
  });

  it("stops listening once disposed", () => {
    const { binding, button, keyTarget, calls } = setup();
    binding.dispose();
    button("spring").click();
    keyTarget.dispatchEvent(keydown("1"));
    assert.equal(calls.length, 0);
  });
});
