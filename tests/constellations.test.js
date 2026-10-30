import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONSTELLATIONS,
  constellationDirection,
  layoutConstellations,
  pickConstellation,
  findStar,
  angleBetween,
} from "../src/constellations.js";
import { atmosphereAt } from "../src/atmosphere.js";

const byName = (name) => CONSTELLATIONS.find((entry) => entry.name === name);

describe("constellations", () => {
  it("includes the recognisable patterns", () => {
    const names = CONSTELLATIONS.map((entry) => entry.name);
    for (const name of ["Big Dipper", "Little Dipper", "Cassiopeia", "Orion"]) {
      assert.ok(names.includes(name), name);
    }
  });

  it("keeps the Big Dipper's seven stars and its bowl and handle", () => {
    const dipper = byName("Big Dipper");
    assert.equal(dipper.stars.length, 7);
    assert.ok(dipper.lines.length >= 6 && dipper.lines.length <= 7);
    assert.deepEqual(
      dipper.stars.map((star) => star.name),
      ["Dubhe", "Merak", "Phecda", "Megrez", "Alioth", "Mizar", "Alkaid"],
    );
  });

  it("gives Cassiopeia a five-star W and Orion a three-star belt", () => {
    assert.equal(byName("Cassiopeia").stars.length, 5);
    assert.equal(byName("Cassiopeia").lines.length, 4);
    const orion = byName("Orion").stars.map((star) => star.name);
    for (const name of [
      "Alnitak",
      "Alnilam",
      "Mintaka",
      "Betelgeuse",
      "Bellatrix",
      "Rigel",
      "Saiph",
    ]) {
      assert.ok(orion.includes(name), name);
    }
  });

  it("only joins stars that exist", () => {
    for (const { stars, lines } of CONSTELLATIONS) {
      for (const [a, b] of lines) {
        assert.ok(stars[a] && stars[b] && a !== b);
      }
    }
  });

  it("extends the Merak to Dubhe pointer about five times to land near Polaris", () => {
    const merak = constellationDirection(findStar("Big Dipper", "Merak"));
    const dubhe = constellationDirection(findStar("Big Dipper", "Dubhe"));
    const polaris = constellationDirection(findStar("Little Dipper", "Polaris"));
    const step = angleBetween(merak, dubhe);
    const reach = angleBetween(dubhe, polaris);
    assert.ok(reach / step > 3.5 && reach / step < 7, `ratio ${reach / step}`);
    // Polaris lies along the pointer: the bend at Dubhe is small.
    const along = angleBetween(merak, polaris);
    assert.ok(Math.abs(along - (step + reach)) < 0.03, "Polaris sits on the pointer line");
  });

  it("places every star inside the visible sky window", () => {
    for (const { name, stars } of CONSTELLATIONS) {
      for (const star of stars) {
        assert.ok(
          star.elevation >= 0.25 && star.elevation <= 0.9,
          `${name}/${star.name} el ${star.elevation}`,
        );
        assert.ok(
          star.azimuth >= -1.1 && star.azimuth <= 1.1,
          `${name}/${star.name} az ${star.azimuth}`,
        );
      }
    }
  });

  it("keeps constellations apart from each other", () => {
    const layout = layoutConstellations();
    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        for (const a of layout[i].stars) {
          for (const b of layout[j].stars) {
            assert.ok(angleBetween(a.direction, b.direction) > 0.05, `${a.name} vs ${b.name}`);
          }
        }
      }
    }
  });

  it("stays clear of the night moon", () => {
    const moon = atmosphereAt(1).moonDirection;
    for (const group of layoutConstellations()) {
      for (const star of group.stars) {
        assert.ok(angleBetween(moon, star.direction) > 0.12, `${star.name} too close to the moon`);
      }
    }
  });

  it("lays out unit vectors", () => {
    for (const group of layoutConstellations()) {
      for (const star of group.stars) {
        assert.ok(Math.abs(Math.hypot(...star.direction) - 1) < 1e-9);
      }
    }
  });

  it("picks the constellation nearest a view direction", () => {
    const rigel = constellationDirection(findStar("Orion", "Rigel"));
    assert.equal(pickConstellation(rigel), "Orion");
    const near = [rigel[0] + 0.01, rigel[1], rigel[2]];
    assert.equal(pickConstellation(near), "Orion");
    assert.equal(pickConstellation([0, -1, 0]), null);
    assert.equal(
      pickConstellation(constellationDirection(findStar("Big Dipper", "Mizar"))),
      "Big Dipper",
    );
  });
});
