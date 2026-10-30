// Watches frame times and says when the device is persistently struggling, so
// the app can lower its rendering cost. A smoothed (EMA) frame time must stay
// over budget for a full window; after a trigger the governor rests a while.

const SMOOTHING = 0.1;

export function createFrameGovernor({ budgetMs = 22, windowMs = 3000, cooldownMs = 8000 } = {}) {
  let average = null;
  let overSince = null;
  let quietUntil = -Infinity;

  return {
    sample(dtMs, now) {
      average = average === null ? dtMs : average + (dtMs - average) * SMOOTHING;
      if (now < quietUntil) return false;
      if (average <= budgetMs) {
        overSince = null;
        return false;
      }
      if (overSince === null) overSince = now;
      if (now - overSince < windowMs) return false;
      overSince = null;
      quietUntil = now + cooldownMs;
      return true;
    },
  };
}
