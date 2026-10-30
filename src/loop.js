// The animation loop and WebGL context-loss wiring, with the browser injected
// so both can be driven by fakes. A broken frame must never take the page
// down: transient errors are tolerated, persistent ones hand over to onFatal.

export function createRenderLoop({
  raf,
  cancelRaf,
  onFrame,
  onFatal,
  maxConsecutiveErrors = 3,
  isHidden = () => false,
}) {
  let running = false;
  let paused = false;
  let frameId = null;
  let consecutiveErrors = 0;

  function schedule() {
    if (frameId !== null || !running || paused) return;
    frameId = raf(frame);
  }

  function cancel() {
    if (frameId === null) return;
    cancelRaf(frameId);
    frameId = null;
  }

  function frame(now) {
    frameId = null;
    if (!running || paused) return;
    // Scheduled first so a frame that throws still leaves the loop alive.
    schedule();
    try {
      onFrame(now);
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors += 1;
      if (consecutiveErrors < maxConsecutiveErrors) return;
      stop();
      onFatal(error);
    }
  }

  function start() {
    running = true;
    paused = isHidden();
    schedule();
  }

  function stop() {
    running = false;
    cancel();
  }

  function pause() {
    paused = true;
    cancel();
  }

  function resume() {
    paused = false;
    schedule();
  }

  return {
    start,
    stop,
    pause,
    resume,
    get running() {
      return running;
    },
  };
}

export function bindContextLoss({ canvas, onLost, onRestored }) {
  const lost = (event) => {
    // Without preventDefault the browser never offers the context back.
    event.preventDefault();
    onLost(event);
  };
  const restored = (event) => onRestored(event);
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return () => {
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
  };
}
