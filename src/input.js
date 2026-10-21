// Pointer input: turns cursor gestures over the lower "grass" region of the
// canvas into wind gusts on the model, and toggles the hover affordance.

const GRASS_TOP = 0.62; // fraction of height below which the grass responds
const MIN_SWIPE_PX = 8;

export function createPointerInput({ canvas, sceneElement, model }) {
  let previousPointer = null;

  function localPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function overGrass(point) {
    return point.y > model.height * GRASS_TOP;
  }

  function onPointerMove(event) {
    const point = localPoint(event);
    const touching = overGrass(point);
    sceneElement.classList.toggle("scene--touching", touching);

    if (touching && previousPointer && event.pointerType !== "touch") {
      const deltaX = point.x - previousPointer.x;
      if (Math.abs(deltaX) > MIN_SWIPE_PX) {
        const strength = Math.min(1, 0.35 + Math.abs(deltaX) / 150);
        model.pushGust(point, Math.sign(deltaX), strength, performance.now());
      }
    }
    previousPointer = point;
  }

  function onPointerDown(event) {
    const point = localPoint(event);
    if (overGrass(point)) model.pushGust(point, 1, 0.9, performance.now());
  }

  function onPointerLeave() {
    sceneElement.classList.remove("scene--touching");
    previousPointer = null;
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
