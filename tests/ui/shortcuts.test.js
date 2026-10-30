import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchesShortcut,
  isTypingTarget,
  createShortcutGate,
  bindShortcutToggle,
} from "../../src/ui/shortcuts.js";
import { fakeElement } from "./fakes.js";

function key(value, extra = {}) {
  return { key: value, altKey: false, ctrlKey: false, metaKey: false, target: null, ...extra };
}

describe("matchesShortcut", () => {
  it("matches the bare key regardless of letter case", () => {
    assert.equal(matchesShortcut(key("n"), "n"), true);
    assert.equal(matchesShortcut(key("N"), "n"), true);
  });

  it("does not match a different key", () => {
    assert.equal(matchesShortcut(key("m"), "n"), false);
  });

  it("leaves browser and OS shortcuts alone when a modifier is held", () => {
    assert.equal(matchesShortcut(key("n", { ctrlKey: true }), "n"), false);
    assert.equal(matchesShortcut(key("n", { metaKey: true }), "n"), false);
    assert.equal(matchesShortcut(key("n", { altKey: true }), "n"), false);
  });

  it("matches named keys such as Escape", () => {
    assert.equal(matchesShortcut(key("Escape"), "Escape"), true);
  });

  it("ignores keystrokes typed into a text field", () => {
    assert.equal(matchesShortcut(key("n", { target: { tagName: "INPUT" } }), "n"), false);
  });

  it("tolerates events without a key", () => {
    assert.equal(matchesShortcut({}, "n"), false);
  });

  it("ignores auto-repeat so a held key cannot flash the scene", () => {
    assert.equal(matchesShortcut(key("n", { repeat: true }), "n"), false);
  });
});

describe("createShortcutGate", () => {
  it("starts enabled and matches like matchesShortcut", () => {
    const gate = createShortcutGate();
    assert.equal(gate.enabled, true);
    assert.equal(gate.matches(key("n"), "n"), true);
    assert.equal(gate.matches(key("n", { repeat: true }), "n"), false);
  });

  it("matches nothing once switched off, and resumes when switched on", () => {
    const gate = createShortcutGate({ enabled: false });
    assert.equal(gate.matches(key("n"), "n"), false);
    gate.setEnabled(true);
    assert.equal(gate.enabled, true);
    assert.equal(gate.matches(key("n"), "n"), true);
  });
});

describe("bindShortcutToggle", () => {
  it("reflects the gate in aria-pressed and a short on/off label", () => {
    const button = fakeElement();
    const label = fakeElement();
    bindShortcutToggle({ button, label, gate: createShortcutGate() });
    assert.equal(button.getAttribute("aria-pressed"), "true");
    assert.equal(label.textContent, "Shortcuts on");
  });

  it("switches the gate off and on when clicked", () => {
    const button = fakeElement();
    const label = fakeElement();
    const gate = createShortcutGate();
    bindShortcutToggle({ button, label, gate });
    button.click();
    assert.equal(gate.enabled, false);
    assert.equal(button.getAttribute("aria-pressed"), "false");
    assert.equal(label.textContent, "Shortcuts off");
    button.click();
    assert.equal(gate.enabled, true);
  });
});

describe("isTypingTarget", () => {
  it("treats inputs, text areas, selects and editable content as typing", () => {
    assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
    assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
    assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
    assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  });

  it("does not treat buttons, the page or a missing target as typing", () => {
    assert.equal(isTypingTarget({ tagName: "BUTTON" }), false);
    assert.equal(isTypingTarget({}), false);
    assert.equal(isTypingTarget(null), false);
  });
});
