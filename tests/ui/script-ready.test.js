import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { markScriptReady } from "../../src/ui/script-ready.js";
import { fakeElement } from "./fakes.js";

describe("markScriptReady", () => {
  it("removes the no-js class so script-only controls appear", () => {
    const root = fakeElement();
    root.classList.add("no-js");
    markScriptReady(root);
    assert.equal(root.classList.contains("no-js"), false);
  });

  it("marks the root as js-ready", () => {
    const root = fakeElement();
    markScriptReady(root);
    assert.equal(root.classList.contains("js"), true);
  });
});
