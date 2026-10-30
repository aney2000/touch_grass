// How many falling particles each kind may keep alive. Leaves and petals scale
// with the deciduous trees that shed them; snow is sky-wide, so only the device
// tier limits it.

export const LEAVES_PER_TREE = 8;
const LEAF_CAP = { low: 120, mid: 200, high: 300 };
const SNOW = { low: 250, mid: 400, high: 600 };

export function particleBudget({ trees = [], tier }) {
  const deciduous = trees.filter((t) => t.species === "deciduous").length;
  const leaves = Math.min(LEAF_CAP[tier], deciduous * LEAVES_PER_TREE);
  return { leaves, petals: leaves, snow: SNOW[tier] };
}
