import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { particleBudget, LEAVES_PER_TREE } from "../src/particle-budget.js";

const forest = (deciduous, conifer = 0) => [
  ...Array.from({ length: deciduous }, () => ({ species: "deciduous" })),
  ...Array.from({ length: conifer }, () => ({ species: "conifer" })),
];

describe("particleBudget", () => {
  it("gives leaves and petals a few particles per deciduous tree", () => {
    const budget = particleBudget({ trees: forest(10, 20), tier: "high" });
    assert.equal(budget.leaves, 10 * LEAVES_PER_TREE);
    assert.equal(budget.petals, 10 * LEAVES_PER_TREE);
    assert.ok(LEAVES_PER_TREE >= 6 && LEAVES_PER_TREE <= 10);
  });

  it("caps leaves per tier", () => {
    const many = forest(200);
    assert.equal(particleBudget({ trees: many, tier: "low" }).leaves, 120);
    assert.equal(particleBudget({ trees: many, tier: "mid" }).leaves, 200);
    assert.equal(particleBudget({ trees: many, tier: "high" }).petals, 300);
  });

  it("budgets snow per tier, independent of trees", () => {
    assert.equal(particleBudget({ trees: [], tier: "low" }).snow, 250);
    assert.equal(particleBudget({ trees: [], tier: "mid" }).snow, 400);
    assert.equal(particleBudget({ trees: forest(5), tier: "high" }).snow, 600);
  });

  it("budgets no leaves without deciduous trees", () => {
    assert.equal(particleBudget({ trees: forest(0, 30), tier: "high" }).leaves, 0);
  });
});
