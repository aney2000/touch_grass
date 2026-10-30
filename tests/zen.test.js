import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createZenTimer, formatCountdown, ZEN_DURATION_MS } from "../src/zen.js";

describe("formatCountdown", () => {
  it("shows a full minute as 1:00", () => {
    assert.equal(formatCountdown(60_000), "1:00");
  });

  it("rounds partial seconds up, so the display never reads zero early", () => {
    assert.equal(formatCountdown(59_001), "1:00");
    assert.equal(formatCountdown(59_000), "0:59");
    assert.equal(formatCountdown(4_200), "0:05");
    assert.equal(formatCountdown(1), "0:01");
  });

  it("pads single-digit seconds", () => {
    assert.equal(formatCountdown(5_000), "0:05");
  });

  it("reads 0:00 when time is up, never negative", () => {
    assert.equal(formatCountdown(0), "0:00");
    assert.equal(formatCountdown(-1_500), "0:00");
  });

  it("handles durations past a minute", () => {
    assert.equal(formatCountdown(125_000), "2:05");
  });
});

describe("createZenTimer", () => {
  it("lasts one minute by default", () => {
    assert.equal(ZEN_DURATION_MS, 60_000);
    assert.equal(createZenTimer().durationMs, 60_000);
  });

  it("is idle until started", () => {
    const timer = createZenTimer();
    assert.equal(timer.isActive(0), false);
    assert.equal(timer.remainingMs(0), 0);
    assert.equal(timer.progress(0), 0);
  });

  it("counts down from the moment it starts", () => {
    const timer = createZenTimer({ durationMs: 10_000 });
    timer.start(1_000);
    assert.equal(timer.isActive(1_000), true);
    assert.equal(timer.remainingMs(1_000), 10_000);
    assert.equal(timer.remainingMs(4_000), 7_000);
  });

  it("reports how much of the session remains as a 1 to 0 fraction", () => {
    const timer = createZenTimer({ durationMs: 10_000 });
    timer.start(0);
    assert.equal(timer.progress(0), 1);
    assert.equal(timer.progress(2_500), 0.75);
    assert.equal(timer.progress(10_000), 0);
  });

  it("ends by itself once the duration has passed", () => {
    const timer = createZenTimer({ durationMs: 10_000 });
    timer.start(0);
    assert.equal(timer.isActive(9_999), true);
    assert.equal(timer.isActive(10_000), false);
    assert.equal(timer.remainingMs(20_000), 0);
  });

  it("can be stopped early", () => {
    const timer = createZenTimer({ durationMs: 10_000 });
    timer.start(0);
    timer.stop();
    assert.equal(timer.isActive(1_000), false);
    assert.equal(timer.remainingMs(1_000), 0);
  });

  it("restarts the full duration when started again", () => {
    const timer = createZenTimer({ durationMs: 10_000 });
    timer.start(0);
    timer.start(8_000);
    assert.equal(timer.remainingMs(8_000), 10_000);
  });
});
