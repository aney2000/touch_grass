// index.html ships with `no-js` so script-only controls stay hidden when the
// module never runs; the composition root flips it before anything else.
export function markScriptReady(root) {
  root.classList.remove("no-js");
  root.classList.add("js");
}
