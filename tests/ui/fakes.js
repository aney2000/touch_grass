// Tiny DOM stand-ins for the UI binding tests. There is no jsdom here: each
// fake implements just the slice of the element API the bindings touch.

export function fakeClassList() {
  const names = new Set();
  return {
    names,
    add: (...tokens) => tokens.forEach((token) => names.add(token)),
    remove: (...tokens) => tokens.forEach((token) => names.delete(token)),
    contains: (token) => names.has(token),
    toggle(token, force) {
      const on = force === undefined ? !names.has(token) : Boolean(force);
      if (on) names.add(token);
      else names.delete(token);
      return on;
    },
  };
}

export function fakeElement({ text = "" } = {}) {
  const element = new EventTarget();
  const attributes = new Map();
  const properties = new Map();
  element.textContent = text;
  element.classList = fakeClassList();
  element.style = {
    setProperty: (name, value) => properties.set(name, value),
    getPropertyValue: (name) => properties.get(name) ?? "",
  };
  element.setAttribute = (name, value) => attributes.set(name, String(value));
  element.getAttribute = (name) => (attributes.has(name) ? attributes.get(name) : null);
  element.removeAttribute = (name) => attributes.delete(name);
  element.hasAttribute = (name) => attributes.has(name);
  element.hidden = false;
  element.focusCount = 0;
  element.focus = () => {
    element.focusCount += 1;
    fakeElement.focused = element;
  };
  element.click = () => element.dispatchEvent(new Event("click"));
  return element;
}

// A keydown event. Pass `target` to pretend it came from another element (for
// example a text field), since fake EventTargets do not bubble.
export function keydown(key, { target, ...extra } = {}) {
  const event = Object.assign(new Event("keydown", { cancelable: true }), {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...extra,
  });
  if (target) Object.defineProperty(event, "target", { value: target });
  return event;
}
