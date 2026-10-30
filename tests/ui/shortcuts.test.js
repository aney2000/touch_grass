import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesShortcut, isTypingTarget } from "../../src/ui/shortcuts.js";

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
