import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clockFromDayAmount, createTween } from "../src/time.js";

describe("clockFromDayAmount", () => {
  it("reads 6:00 PM at full daylight", () => {
    assert.deepEqual(clockFromDayAmount(0), { hours12: 6, minutes: "00", meridiem: "PM" });
  });

  it("reads 6:00 AM at full night", () => {
    assert.deepEqual(clockFromDayAmount(1), { hours12: 6, minutes: "00", meridiem: "AM" });
  });

  it("passes through midnight at the midpoint", () => {
    assert.deepEqual(clockFromDayAmount(0.5), { hours12: 12, minutes: "00", meridiem: "AM" });
  });

  it("zero-pads the minutes", () => {
    const { minutes } = clockFromDayAmount(0.01);
    assert.equal(minutes.length, 2);
  });

  it("clamps out-of-range input", () => {
    assert.deepEqual(clockFromDayAmount(-5), clockFromDayAmount(0));
    assert.deepEqual(clockFromDayAmount(5), clockFromDayAmount(1));
  });
});

describe("createTween", () => {
  it("holds its initial value before being retargeted", () => {
    const tween = createTween(0.3);
    assert.equal(tween.valueAt(1000, 500), 0.3);
  });

  it("eases from the current value to the new target", () => {
    const tween = createTween(0);
    tween.retarget(1, 0, 0);
    assert.equal(tween.valueAt(0, 1000), 0);
    assert.equal(tween.valueAt(1000, 1000), 1);
    assert.ok(tween.valueAt(500, 1000) > 0 && tween.valueAt(500, 1000) < 1);
  });

  it("clamps progress past the duration", () => {
    const tween = createTween(0);
    tween.retarget(1, 0, 0);
    assert.equal(tween.valueAt(99999, 1000), 1);
  });

  it("exposes the current target", () => {
    const tween = createTween(0);
    tween.retarget(1, 0, 0);
    assert.equal(tween.target, 1);
  });
});
