import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRenderLoop, bindContextLoss } from "../src/loop.js";

function fakeRaf() {
  const queue = new Map();
  let nextId = 1;
  return {
    raf: (callback) => {
      const id = nextId++;
      queue.set(id, callback);
      return id;
    },
    cancelRaf: (id) => queue.delete(id),
    get pending() {
      return queue.size;
    },
    tick(now = 16) {
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(now));
    },
  };
}

function setup(overrides = {}) {
  const clock = fakeRaf();
  const frames = [];
  const fatal = [];
  const loop = createRenderLoop({
    raf: clock.raf,
    cancelRaf: clock.cancelRaf,
    onFrame: (now) => frames.push(now),
    onFatal: (error) => fatal.push(error),
    ...overrides,
  });
  return { clock, frames, fatal, loop };
}

describe("createRenderLoop", () => {
  it("runs a frame per animation tick once started", () => {
    const { clock, frames, loop } = setup();
    assert.equal(loop.running, false);
    loop.start();
    assert.equal(loop.running, true);
    clock.tick(16);
    clock.tick(32);
    assert.deepEqual(frames, [16, 32]);
  });

  it("never schedules two frames at once", () => {
    const { clock, loop } = setup();
    loop.start();
    loop.start();
    loop.resume();
    assert.equal(clock.pending, 1);
  });

  it("schedules the next frame before running the work", () => {
    const clock = fakeRaf();
    let pendingDuringFrame;
    const loop = createRenderLoop({
      raf: clock.raf,
      cancelRaf: clock.cancelRaf,
      onFrame: () => (pendingDuringFrame = clock.pending),
      onFatal: () => {},
    });
    loop.start();
    clock.tick();
    assert.equal(pendingDuringFrame, 1);
  });

  it("stops scheduling after stop", () => {
    const { clock, frames, loop } = setup();
    loop.start();
    loop.stop();
    assert.equal(clock.pending, 0);
    assert.equal(loop.running, false);
    clock.tick();
    assert.deepEqual(frames, []);
  });

  it("pauses and resumes without losing the loop", () => {
    const { clock, frames, loop } = setup();
    loop.start();
    loop.pause();
    clock.tick(16);
    assert.deepEqual(frames, []);
    loop.resume();
    clock.tick(32);
    assert.deepEqual(frames, [32]);
  });

  it("does not resume a stopped loop", () => {
    const { clock, loop } = setup();
    loop.start();
    loop.stop();
    loop.resume();
    assert.equal(clock.pending, 0);
  });

  it("starts paused while the page is hidden", () => {
    const { clock, loop } = setup({ isHidden: () => true });
    loop.start();
    assert.equal(clock.pending, 0);
    loop.resume();
    assert.equal(clock.pending, 1);
  });

  it("tolerates occasional errors and resets the count on success", () => {
    let calls = 0;
    const { clock, fatal, loop } = setup({
      onFrame: () => {
        calls += 1;
        if (calls % 3 !== 0) throw new Error("glitch");
      },
    });
    loop.start();
    for (let i = 0; i < 9; i += 1) clock.tick();
    assert.equal(fatal.length, 0);
    assert.equal(loop.running, true);
  });

  it("gives up after too many consecutive errors", () => {
    const boom = new Error("boom");
    const { clock, fatal, loop } = setup({
      onFrame: () => {
        throw boom;
      },
      maxConsecutiveErrors: 2,
    });
    loop.start();
    clock.tick();
    clock.tick();
    assert.deepEqual(fatal, [boom]);
    assert.equal(loop.running, false);
    assert.equal(clock.pending, 0);
  });
});

describe("bindContextLoss", () => {
  it("prevents the default on loss so the context can be restored", () => {
    const canvas = new EventTarget();
    const events = [];
    bindContextLoss({
      canvas,
      onLost: () => events.push("lost"),
      onRestored: () => events.push("restored"),
    });
    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    assert.equal(lost.defaultPrevented, true);
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    assert.deepEqual(events, ["lost", "restored"]);
  });

  it("can be unbound", () => {
    const canvas = new EventTarget();
    let lost = 0;
    const unbind = bindContextLoss({ canvas, onLost: () => lost++, onRestored: () => {} });
    unbind();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    assert.equal(lost, 0);
  });
});
