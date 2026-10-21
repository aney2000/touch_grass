import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cameraPoseAt, fovForAspect, CAMERA_BASE } from "../src/camera-rig.js";

const still = { x: 0, y: 0 };

describe("cameraPoseAt", () => {
  it("rests on the base pose when motion is reduced and the pointer is centred", () => {
    const pose = cameraPoseAt(12.3, still, { reducedMotion: true });
    assert.deepEqual(pose.position, CAMERA_BASE.position);
    assert.deepEqual(pose.target, CAMERA_BASE.target);
  });

  it("drifts gently over time for a living, breathing view", () => {
    const a = cameraPoseAt(0, still);
    const b = cameraPoseAt(3, still);
    assert.notDeepEqual(a.position, b.position);
    for (let t = 0; t < 120; t += 0.7) {
      const { position } = cameraPoseAt(t, still);
      CAMERA_BASE.position.forEach((base, i) => assert.ok(Math.abs(position[i] - base) < 0.8));
    }
  });

  it("leans toward the pointer for parallax", () => {
    const left = cameraPoseAt(0, { x: -1, y: 0 }, { reducedMotion: true });
    const right = cameraPoseAt(0, { x: 1, y: 0 }, { reducedMotion: true });
    assert.ok(right.position[0] > left.position[0]);
  });

  it("bounds the parallax even for out-of-range pointers", () => {
    const pose = cameraPoseAt(0, { x: 50, y: -50 }, { reducedMotion: true });
    assert.ok(Math.abs(pose.position[0] - CAMERA_BASE.position[0]) <= 1.2);
    assert.ok(Math.abs(pose.position[1] - CAMERA_BASE.position[1]) <= 0.6);
  });
});

describe("fovForAspect", () => {
  it("uses a cinematic field of view on landscape screens", () => {
    assert.equal(fovForAspect(16 / 9), fovForAspect(2.4));
  });

  it("widens on portrait screens so the hill stays in frame", () => {
    assert.ok(fovForAspect(0.5) > fovForAspect(16 / 9));
  });

  it("never exceeds a sensible maximum", () => {
    assert.ok(fovForAspect(0.1) <= 80);
  });
});
