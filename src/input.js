// Pointer input: the cursor's view position drives camera parallax, and where
// it meets the meadow becomes a resting "hand" plus ripples on brisk swipes.

const MIN_SWIPE_PX = 8;

export function toNdc({ clientX, clientY }, bounds) {
  return {
    x: ((clientX - bounds.left) / bounds.width) * 2 - 1,
    y: 1 - ((clientY - bounds.top) / bounds.height) * 2,
  };
}

// `pick(ndc)` returns the world point on the ground under the pointer, or null.
export function createPointerInput({ canvas, sceneElement, model, pick }) {
  let previousX = null;

  function locate(event) {
    const ndc = toNdc(event, canvas.getBoundingClientRect());
    return { ndc, hit: pick(ndc) };
  }

  function setTouching(hit) {
    model.setTouch(hit);
    sceneElement.classList.toggle("scene--touching", Boolean(hit));
  }

  function onPointerMove(event) {
    const { ndc, hit } = locate(event);
    model.setPointer(ndc);
    setTouching(hit);

    if (hit && previousX !== null && event.pointerType !== "touch") {
      const deltaX = event.clientX - previousX;
      if (Math.abs(deltaX) > MIN_SWIPE_PX) {
        model.pushGust(hit, Math.min(1, 0.35 + Math.abs(deltaX) / 150), performance.now());
      }
    }
    previousX = event.clientX;
  }

  function onPointerDown(event) {
    const { hit } = locate(event);
    if (hit) model.pushGust(hit, 0.9, performance.now());
  }

  function onPointerLeave() {
    setTouching(null);
    model.setPointer({ x: 0, y: 0 });
    previousX = null;
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerleave", onPointerLeave);

  return {
    dispose() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
