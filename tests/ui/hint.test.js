import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindHint } from "../../src/ui/hint.js";
import { fakeElement } from "./fakes.js";

describe("bindHint", () => {
  it("keeps the hint up until its duration has passed", () => {
    const element = fakeElement();
    const hint = bindHint({ element, now: 1_000, durationMs: 8_000 });
    hint.update(8_999);
    assert.equal(element.classList.contains("scene-hint--dismissed"), false);
    hint.update(9_000);
    assert.ok(element.classList.contains("scene-hint--dismissed"));
  });

  it("defaults to eight seconds", () => {
    const element = fakeElement();
    const hint = bindHint({ element, now: 0 });
    hint.update(7_999);
    assert.equal(element.classList.contains("scene-hint--dismissed"), false);
    hint.update(8_000);
    assert.ok(element.classList.contains("scene-hint--dismissed"));
  });

  it("touches the DOM only once", () => {
    const element = fakeElement();
    let writes = 0;
    const add = element.classList.add;
    element.classList.add = (...tokens) => {
      writes += 1;
      add(...tokens);
    };
    const hint = bindHint({ element, now: 0, durationMs: 10 });
    hint.update(20);
    hint.update(30);
    assert.equal(writes, 1);
  });
});
