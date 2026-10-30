import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clockFromDayAmount, createTween } from "../src/time.js";

const NOON = { hours12: 12, minutes: "00", meridiem: "PM" };
const MIDNIGHT = { hours12: 12, minutes: "00", meridiem: "AM" };

describe("clockFromDayAmount", () => {
  describe("at rest, where the clock agrees with the sky", () => {
    it("reads 12:00 PM at midday, when the sun is highest", () => {
      assert.deepEqual(clockFromDayAmount(0), NOON);
    });

    it("reads 12:00 AM at deepest night, when the moon is highest", () => {
      assert.deepEqual(clockFromDayAmount(1), MIDNIGHT);
    });

    it("shows the same endpoints whichever way the sky is heading", () => {
      assert.deepEqual(clockFromDayAmount(0, "dusk"), clockFromDayAmount(0, "dawn"));
      assert.deepEqual(clockFromDayAmount(1, "dusk"), clockFromDayAmount(1, "dawn"));
    });
  });

  describe("at dusk, heading from day into night", () => {
    it("is the default phase", () => {
      assert.deepEqual(clockFromDayAmount(0.5), clockFromDayAmount(0.5, "dusk"));
    });

    it("runs forward through the evening, passing 6:00 PM halfway", () => {
      assert.deepEqual(clockFromDayAmount(0.5, "dusk"), {
        hours12: 6,
        minutes: "00",
        meridiem: "PM",
      });
    });

    it("moves the clock forward as night deepens", () => {
      assert.deepEqual(clockFromDayAmount(0.25, "dusk"), {
        hours12: 3,
        minutes: "00",
        meridiem: "PM",
      });
      assert.deepEqual(clockFromDayAmount(0.75, "dusk"), {
        hours12: 9,
        minutes: "00",
        meridiem: "PM",
      });
    });
  });

  describe("at dawn, heading from night into day", () => {
    it("runs forward through the morning, passing 6:00 AM halfway", () => {
      assert.deepEqual(clockFromDayAmount(0.5, "dawn"), {
        hours12: 6,
        minutes: "00",
        meridiem: "AM",
      });
    });

    it("moves the clock forward as daylight returns", () => {
      assert.deepEqual(clockFromDayAmount(0.75, "dawn"), {
        hours12: 3,
        minutes: "00",
        meridiem: "AM",
      });
      assert.deepEqual(clockFromDayAmount(0.25, "dawn"), {
        hours12: 9,
        minutes: "00",
        meridiem: "AM",
      });
    });
  });

  describe("formatting", () => {
    it("zero-pads the minutes", () => {
      assert.equal(clockFromDayAmount(0.01).minutes, "07");
    });

    it("writes the twelve o'clock hours as 12, never 0", () => {
      assert.deepEqual(clockFromDayAmount(0.001, "dusk"), {
        hours12: 12,
        minutes: "01",
        meridiem: "PM",
      });
      assert.deepEqual(clockFromDayAmount(0.999, "dawn"), {
        hours12: 12,
        minutes: "01",
        meridiem: "AM",
      });
    });

    it("rounds to the nearest whole minute", () => {
      assert.equal(clockFromDayAmount(1 / 720 / 3).minutes, "00");
      assert.equal(clockFromDayAmount((1 / 720) * 0.6).minutes, "01");
    });

    it("clamps out-of-range input to the nearest endpoint", () => {
      assert.deepEqual(clockFromDayAmount(-5), NOON);
      assert.deepEqual(clockFromDayAmount(5), MIDNIGHT);
      assert.deepEqual(clockFromDayAmount(-5, "dawn"), NOON);
      assert.deepEqual(clockFromDayAmount(5, "dawn"), MIDNIGHT);
    });
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
