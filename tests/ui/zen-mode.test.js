import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindZenMode } from "../../src/ui/zen-mode.js";
import { createZenTimer } from "../../src/zen.js";
import { fakeElement, keydown } from "./fakes.js";

function setup({ durationMs = 60_000 } = {}) {
  let clock = 1_000;
  const elements = {
    button: fakeElement(),
    countdown: fakeElement(),
    countdownText: fakeElement({ text: "1:00" }),
    announcer: fakeElement(),
    sceneElement: fakeElement(),
  };
  elements.countdown.hidden = true;
  const keyTarget = new EventTarget();
  const zen = bindZenMode({
    ...elements,
    keyTarget,
    now: () => clock,
    timer: createZenTimer({ durationMs }),
  });
  return {
    ...elements,
    keyTarget,
    zen,
    advanceTo(time) {
      clock = time;
      zen.update(time);
    },
  };
}

describe("bindZenMode", () => {
  describe("entering", () => {
    it("clears the screen when the Zen button is pressed", () => {
      const { button, sceneElement, zen } = setup();
      button.click();
      assert.ok(sceneElement.classList.contains("scene--zen"));
      assert.equal(button.getAttribute("aria-pressed"), "true");
      assert.equal(zen.isActive(), true);
    });

    it("reveals the countdown pill at a full minute with a full ring", () => {
      const { button, countdown, countdownText } = setup();
      button.click();
      assert.equal(countdown.hidden, false);
      assert.equal(countdownText.textContent, "1:00");
      assert.equal(countdown.style.getPropertyValue("--zen-progress"), "1");
    });

    it("tells screen reader users what is happening", () => {
      const { button, announcer } = setup();
      button.click();
      assert.equal(announcer.textContent, "Zen mode for 1 minute");
    });

    it("moves focus to the countdown so keyboard users can leave from there", () => {
      const { button, countdown } = setup();
      button.click();
      assert.equal(countdown.focusCount, 1);
    });

    it("also starts with the Z key, ignoring modifiers and typing", () => {
      const { keyTarget, zen } = setup();
      keyTarget.dispatchEvent(keydown("z", { ctrlKey: true }));
      keyTarget.dispatchEvent(keydown("z", { target: { tagName: "TEXTAREA" } }));
      assert.equal(zen.isActive(), false);
      keyTarget.dispatchEvent(keydown("Z"));
      assert.equal(zen.isActive(), true);
    });
  });

  describe("counting down on the animation frame", () => {
    it("ticks the countdown text and drains the ring", () => {
      const { button, countdown, countdownText, advanceTo } = setup();
      button.click();
      advanceTo(1_000 + 1_500);
      assert.equal(countdownText.textContent, "0:59");
      advanceTo(1_000 + 45_000);
      assert.equal(countdownText.textContent, "0:15");
      assert.equal(countdown.style.getPropertyValue("--zen-progress"), "0.25");
    });

    it("does nothing on frames while zen mode is off", () => {
      const { sceneElement, announcer, advanceTo } = setup();
      advanceTo(5_000);
      assert.ok(!sceneElement.classList.contains("scene--zen"));
      assert.equal(announcer.textContent, "");
    });

    it("brings the interface back once the minute is up", () => {
      const { button, countdown, sceneElement, announcer, zen, advanceTo } = setup();
      button.click();
      advanceTo(1_000 + 60_000);
      assert.equal(zen.isActive(), false);
      assert.ok(!sceneElement.classList.contains("scene--zen"));
      assert.equal(button.getAttribute("aria-pressed"), "false");
      assert.equal(countdown.hidden, true);
      assert.equal(announcer.textContent, "Zen mode ended");
      assert.equal(button.focusCount, 1, "focus returns to the Zen button");
    });
  });

  describe("leaving early", () => {
    it("ends when the countdown pill is clicked", () => {
      const { button, countdown, zen } = setup();
      button.click();
      countdown.click();
      assert.equal(zen.isActive(), false);
      assert.equal(button.focusCount, 1);
    });

    it("ends with Escape or a second Z", () => {
      const first = setup();
      first.button.click();
      first.keyTarget.dispatchEvent(keydown("Escape"));
      assert.equal(first.zen.isActive(), false);

      const second = setup();
      second.button.click();
      second.keyTarget.dispatchEvent(keydown("z"));
      assert.equal(second.zen.isActive(), false);
    });

    it("leaves Escape alone while zen mode is off", () => {
      const { keyTarget, announcer } = setup();
      keyTarget.dispatchEvent(keydown("Escape"));
      assert.equal(announcer.textContent, "");
    });

    it("can start again afterwards with a fresh minute", () => {
      const { button, countdown, countdownText, advanceTo } = setup();
      button.click();
      advanceTo(20_000);
      countdown.click();
      button.click();
      assert.equal(countdownText.textContent, "1:00");
    });
  });

  it("stops listening once disposed", () => {
    const { button, keyTarget, zen } = setup();
    zen.dispose();
    button.click();
    keyTarget.dispatchEvent(keydown("z"));
    assert.equal(zen.isActive(), false);
  });
});
