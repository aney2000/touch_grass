import test from "node:test";
import assert from "node:assert/strict";
import { createFrameGovernor } from "../src/frame-governor.js";

function run(governor, dtMs, fromMs, toMs) {
  const hits = [];
  for (let now = fromMs; now <= toMs; now += dtMs) {
    if (governor.sample(dtMs, now)) hits.push(now);
  }
  return hits;
}

test("smooth frames never trigger a step down", () => {
  assert.deepEqual(run(createFrameGovernor(), 16, 0, 20000), []);
});

test("frames slower than budget for the whole window trigger once", () => {
  const hits = run(createFrameGovernor(), 40, 0, 5000);
  assert.equal(hits.length, 1);
  assert.ok(hits[0] >= 3000, `triggered too early at ${hits[0]}`);
});

test("a short hitch does not trigger", () => {
  const governor = createFrameGovernor();
  run(governor, 16, 0, 2000);
  run(governor, 50, 2016, 3000);
  assert.deepEqual(run(governor, 16, 3016, 10000), []);
});

test("after triggering, the governor waits out the cooldown", () => {
  const governor = createFrameGovernor({ windowMs: 1000, cooldownMs: 8000 });
  const hits = run(governor, 40, 0, 12000);
  assert.ok(hits.length >= 2);
  assert.ok(hits[1] - hits[0] >= 8000, `second hit after ${hits[1] - hits[0]}ms`);
});

test("the budget is configurable", () => {
  assert.deepEqual(run(createFrameGovernor({ budgetMs: 50 }), 40, 0, 6000), []);
});
