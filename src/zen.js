// Zen mode timing: a fixed-length quiet spell with nothing on screen but the
// field. Pure and clock-agnostic; callers pass in the current time.

export const ZEN_DURATION_MS = 60_000;

// "1:00", "0:59" ... "0:00". Seconds round up so the display reaches 0:00 only
// when the spell is actually over.
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function createZenTimer({ durationMs = ZEN_DURATION_MS } = {}) {
  let endsAt = -Infinity;

  function remainingMs(now) {
    return Math.max(0, Math.min(durationMs, endsAt - now));
  }

  return {
    durationMs,
    start(now) {
      endsAt = now + durationMs;
    },
    stop() {
      endsAt = -Infinity;
    },
    remainingMs,
    isActive(now) {
      return remainingMs(now) > 0;
    },
    // Fraction of the spell still to come: 1 at the start, 0 when over or idle.
    progress(now) {
      return remainingMs(now) / durationMs;
    },
  };
}
