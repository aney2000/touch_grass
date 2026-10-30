import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatClock, createClockView } from "../../src/ui/clock-view.js";

function fakeText() {
  return { textContent: "" };
}

function countingElement() {
  let text = "";
  const element = { writes: 0 };
  Object.defineProperty(element, "textContent", {
    get: () => text,
    set: (value) => {
      text = value;
      element.writes += 1;
    },
  });
  return element;
}

describe("formatClock", () => {
  it("joins the hour and padded minutes into the time and keeps the meridiem apart", () => {
    assert.deepEqual(formatClock({ hours12: 6, minutes: "05", meridiem: "PM" }), {
      time: "6:05",
      meridiem: "PM",
    });
  });

  it("formats noon the way the page shows it before any script runs", () => {
    assert.deepEqual(formatClock({ hours12: 12, minutes: "00", meridiem: "PM" }), {
      time: "12:00",
      meridiem: "PM",
    });
  });
});

describe("createClockView", () => {
  it("writes the time and meridiem as plain text, never as markup", () => {
    const timeElement = fakeText();
    const meridiemElement = fakeText();
    const view = createClockView({ timeElement, meridiemElement });
    view.render({ hours12: 9, minutes: "30", meridiem: "AM" });
    assert.equal(timeElement.textContent, "9:30");
    assert.equal(meridiemElement.textContent, "AM");
  });

  it("only touches the DOM when the displayed minute changes", () => {
    const timeElement = countingElement();
    const meridiemElement = countingElement();
    const view = createClockView({ timeElement, meridiemElement });
    view.render({ hours12: 9, minutes: "30", meridiem: "AM" });
    view.render({ hours12: 9, minutes: "30", meridiem: "AM" });
    assert.equal(timeElement.writes, 1);
    view.render({ hours12: 9, minutes: "31", meridiem: "AM" });
    assert.equal(timeElement.writes, 2);
    assert.equal(meridiemElement.textContent, "AM");
  });
});
