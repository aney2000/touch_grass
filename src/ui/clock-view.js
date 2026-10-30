// The on-screen clock. Takes the pieces from clockFromDayAmount and writes them
// as plain text into two elements, skipping frames where the minute is unchanged.

export function formatClock({ hours12, minutes, meridiem }) {
  return { time: `${hours12}:${minutes}`, meridiem };
}

export function createClockView({ timeElement, meridiemElement }) {
  let lastKey = "";

  return {
    render(clock) {
      const { time, meridiem } = formatClock(clock);
      const key = `${time} ${meridiem}`;
      if (key === lastKey) return;
      lastKey = key;
      timeElement.textContent = time;
      meridiemElement.textContent = meridiem;
    },
  };
}
