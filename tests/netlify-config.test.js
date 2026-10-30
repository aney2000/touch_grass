import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Documents the deploy contract; netlify.toml is read as text, not parsed.
const toml = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");

test("builds with vite into dist", () => {
  assert.match(toml, /command = "npm run build"/);
  assert.match(toml, /publish = "dist"/);
});

test("ships a strict content security policy", () => {
  assert.match(toml, /Content-Security-Policy = "default-src 'self'; script-src 'self';/);
  assert.match(toml, /object-src 'none'/);
  assert.match(toml, /frame-ancestors 'none'/);
});

test("caches hashed assets forever but revalidates the page", () => {
  assert.match(
    toml,
    /for = "\/assets\/\*"[\s\S]*?Cache-Control = "public, max-age=31536000, immutable"/,
  );
  assert.match(
    toml,
    /for = "\/index.html"[\s\S]*?Cache-Control = "public, max-age=0, must-revalidate"/,
  );
});
