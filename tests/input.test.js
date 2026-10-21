import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPointerInput, toNdc } from "../src/input.js";

const bounds = { left: 0, top: 0, width: 200, height: 100 };

function fakeEnvironment({ pick = () => ({ x: 1, y: 0, z: -2 }) } = {}) {
  const canvas = new EventTarget();
  canvas.getBoundingClientRect = () => bounds;
  const classes = new Set();
  const sceneElement = {
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
  };
  const calls = { gusts: [], touches: [], pointers: [] };
  const model = {
    now: 0,
    pushGust: (point, strength) => calls.gusts.push({ point, strength }),
    setTouch: (point) => calls.touches.push(point),
    setPointer: (ndc) => calls.pointers.push(ndc),
  };
  const input = createPointerInput({ canvas, sceneElement, model, pick });
  return { canvas, classes, calls, input };
}

function pointer(type, clientX, clientY, pointerType = "mouse") {
  return Object.assign(new Event(type), { clientX, clientY, pointerType });
}

describe("toNdc", () => {
  it("maps the canvas corners onto -1..1 with y pointing up", () => {
    assert.deepEqual(toNdc({ clientX: 0, clientY: 0 }, bounds), { x: -1, y: 1 });
    assert.deepEqual(toNdc({ clientX: 200, clientY: 100 }, bounds), { x: 1, y: -1 });
    assert.deepEqual(toNdc({ clientX: 100, clientY: 50 }, bounds), { x: 0, y: 0 });
  });
});

describe("createPointerInput", () => {
  it("feeds the pointer to the model for parallax", () => {
    const { canvas, calls } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointermove", 150, 25));
    assert.deepEqual(calls.pointers.at(-1), { x: 0.5, y: 0.5 });
  });

  it("rests a hand on the grass under the cursor and shows the touch affordance", () => {
    const { canvas, calls, classes } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointermove", 100, 80));
    assert.deepEqual(calls.touches.at(-1), { x: 1, y: 0, z: -2 });
    assert.ok(classes.has("scene--touching"));
  });

  it("lifts the hand when the pointer is over the sky", () => {
    const { canvas, calls, classes } = fakeEnvironment({ pick: () => null });
    canvas.dispatchEvent(pointer("pointermove", 100, 10));
    assert.equal(calls.touches.at(-1), null);
    assert.ok(!classes.has("scene--touching"));
  });

  it("sends a ripple through the grass on a brisk swipe", () => {
    const { canvas, calls } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointermove", 50, 80));
    canvas.dispatchEvent(pointer("pointermove", 90, 80));
    assert.equal(calls.gusts.length, 1);
    assert.ok(calls.gusts[0].strength > 0 && calls.gusts[0].strength <= 1);
  });

  it("ignores tiny jitters", () => {
    const { canvas, calls } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointermove", 50, 80));
    canvas.dispatchEvent(pointer("pointermove", 52, 80));
    assert.equal(calls.gusts.length, 0);
  });

  it("ripples the grass on tap", () => {
    const { canvas, calls } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointerdown", 100, 80, "touch"));
    assert.equal(calls.gusts.length, 1);
  });

  it("lifts the hand and recentres the view when the pointer leaves", () => {
    const { canvas, calls, classes } = fakeEnvironment();
    canvas.dispatchEvent(pointer("pointermove", 100, 80));
    canvas.dispatchEvent(pointer("pointerleave", 0, 0));
    assert.equal(calls.touches.at(-1), null);
    assert.deepEqual(calls.pointers.at(-1), { x: 0, y: 0 });
    assert.ok(!classes.has("scene--touching"));
  });

  it("stops listening once disposed", () => {
    const { canvas, calls, input } = fakeEnvironment();
    input.dispose();
    canvas.dispatchEvent(pointer("pointermove", 100, 80));
    assert.equal(calls.pointers.length, 0);
  });
});
