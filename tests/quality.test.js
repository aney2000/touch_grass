import test from "node:test";
import assert from "node:assert/strict";
import { chooseQuality, stepDown, stageOptionsFor } from "../src/quality.js";

test("stageOptionsFor asks for the discrete GPU only on the high tier", () => {
  const high = chooseQuality({ width: 1920, height: 1080, dpr: 1, hardwareConcurrency: 12 });
  assert.deepEqual(stageOptionsFor(high), {
    powerPreference: "high-performance",
    msaa: 4,
    bloomScale: 1,
  });
  assert.deepEqual(stageOptionsFor(stepDown(high)), {
    powerPreference: "default",
    msaa: 2,
    bloomScale: 0.5,
  });
});

const desktop = {
  width: 1920,
  height: 1080,
  dpr: 1,
  hardwareConcurrency: 12,
  deviceMemory: 16,
  reducedMotion: false,
  coarsePointer: false,
};

test("a big screen on a strong desktop gets the high tier", () => {
  const q = chooseQuality(desktop);
  assert.equal(q.tier, "high");
  assert.equal(q.grassBlades, 60000);
  assert.equal(q.groveTrees, 22);
  assert.equal(q.fallingCapacity, 600);
  assert.equal(q.msaa, 4);
  assert.deepEqual(q.bloom, { enabled: true, scale: 1 });
});

test("a touch phone with few cores gets the low tier", () => {
  const q = chooseQuality({
    ...desktop,
    width: 390,
    height: 844,
    dpr: 3,
    hardwareConcurrency: 4,
    coarsePointer: true,
  });
  assert.equal(q.tier, "low");
  assert.equal(q.grassBlades, 18000);
  assert.equal(q.groveTrees, 14);
  assert.equal(q.fallingCapacity, 220);
  assert.equal(q.pixelRatio, 1.25);
  assert.equal(q.msaa, 0);
  assert.deepEqual(q.bloom, { enabled: true, scale: 0.5 });
});

test("a touch device with little memory is low even with many cores", () => {
  const q = chooseQuality({ ...desktop, coarsePointer: true, deviceMemory: 3 });
  assert.equal(q.tier, "low");
});

test("a window whose short side is under 500px is low", () => {
  assert.equal(chooseQuality({ ...desktop, width: 800, height: 480 }).tier, "low");
});

test("a capable touch tablet is mid", () => {
  const q = chooseQuality({ ...desktop, width: 1024, height: 1366, dpr: 2, coarsePointer: true });
  assert.equal(q.tier, "mid");
  assert.equal(q.grassBlades, 36000);
  assert.equal(q.groveTrees, 18);
  assert.equal(q.fallingCapacity, 400);
  assert.equal(q.pixelRatio, 1.5);
  assert.equal(q.msaa, 2);
  assert.deepEqual(q.bloom, { enabled: true, scale: 0.5 });
});

test("six or fewer cores is mid", () => {
  assert.equal(chooseQuality({ ...desktop, hardwareConcurrency: 6 }).tier, "mid");
});

test("a laptop screen of 1366px or less is mid", () => {
  assert.equal(chooseQuality({ ...desktop, width: 1366, height: 768 }).tier, "mid");
});

test("missing hardware info is treated as mid-capable, not low", () => {
  const q = chooseQuality({
    ...desktop,
    hardwareConcurrency: undefined,
    deviceMemory: undefined,
    coarsePointer: true,
  });
  assert.equal(q.tier, "mid");
});

test("missing hardware info on a big desktop still reaches high", () => {
  const q = chooseQuality({ ...desktop, hardwareConcurrency: undefined, deviceMemory: undefined });
  assert.equal(q.tier, "high");
});

test("reduced motion drops one tier", () => {
  assert.equal(chooseQuality({ ...desktop, reducedMotion: true }).tier, "mid");
  assert.equal(
    chooseQuality({ ...desktop, hardwareConcurrency: 6, reducedMotion: true }).tier,
    "low",
  );
});

test("the pixel ratio is capped by tier", () => {
  assert.equal(chooseQuality({ ...desktop, width: 1600, height: 1000, dpr: 3 }).pixelRatio, 2);
});

test("effective pixels are clamped to about 8 megapixels", () => {
  const q = chooseQuality({ ...desktop, width: 3840, height: 2160, dpr: 2 });
  const pixels = 3840 * 2160 * q.pixelRatio ** 2;
  assert.ok(pixels <= 8e6 + 1, `got ${pixels}`);
});

test("a missing dpr counts as 1", () => {
  assert.equal(chooseQuality({ ...desktop, dpr: undefined }).pixelRatio, 1);
});

test("stepDown moves high to mid and mid to low, keeping the pixel clamp", () => {
  const high = chooseQuality({ ...desktop, dpr: 2 });
  const mid = stepDown(high);
  assert.equal(mid.tier, "mid");
  assert.equal(mid.pixelRatio, 1.5);
  assert.equal(mid.msaa, 2);
  assert.equal(stepDown(mid).tier, "low");
  assert.equal(stepDown(mid).pixelRatio, 1.25);
});

test("stepDown at low returns the same settings", () => {
  const low = chooseQuality({ ...desktop, width: 400, height: 700, coarsePointer: true });
  assert.deepEqual(stepDown(low), low);
});
