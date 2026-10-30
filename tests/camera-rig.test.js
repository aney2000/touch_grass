import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cameraPoseAt, fovForAspect, basePoseForAspect, CAMERA_BASE } from "../src/camera-rig.js";

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

  it("caps portrait phones at 70 degrees to avoid fisheye stretch", () => {
    assert.equal(fovForAspect(0.46), 70);
    assert.ok(fovForAspect(0.75) <= 70);
  });
});

describe("basePoseForAspect", () => {
  it("keeps the authored pose on landscape screens", () => {
    assert.deepEqual(basePoseForAspect(1.78), {
      position: [...CAMERA_BASE.position],
      target: [...CAMERA_BASE.target],
    });
  });

  it("pulls back and up on a tall phone so the meadow is not cropped", () => {
    const pose = basePoseForAspect(0.46);
    assert.ok(pose.position[2] > CAMERA_BASE.position[2] + 3, `z ${pose.position[2]}`);
    assert.ok(pose.position[1] > CAMERA_BASE.position[1], `y ${pose.position[1]}`);
  });

  it("eases between the two on a tablet in portrait", () => {
    const tablet = basePoseForAspect(0.75);
    const phone = basePoseForAspect(0.46);
    assert.ok(tablet.position[2] > CAMERA_BASE.position[2]);
    assert.ok(tablet.position[2] < phone.position[2]);
  });

  it("feeds cameraPoseAt so parallax builds on the portrait pose", () => {
    const pose = cameraPoseAt(0, { x: 0, y: 0 }, { reducedMotion: true, aspect: 0.46 });
    assert.deepEqual(pose.position, basePoseForAspect(0.46).position);
  });
});
