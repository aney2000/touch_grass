import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONSTELLATIONS,
  constellationDirection,
  layoutConstellations,
  pickConstellation,
  findStar,
  angleBetween,
  SKY_SCALE,
  starFlux,
  starColor,
  scintillation,
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
    assert.ok(dipper.lines.length >= 6 && dipper.lines.length <= 7);
    assert.deepEqual(
      dipper.stars.slice(0, 7).map((star) => star.name),
      ["Dubhe", "Merak", "Phecda", "Megrez", "Alioth", "Mizar", "Alkaid"],
    );
  });

  it("gives Cassiopeia a five-star W and Orion a three-star belt", () => {
    assert.equal(new Set(byName("Cassiopeia").lines.flat()).size, 5);
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

  it("adds the real faint neighbours, not just line endpoints", () => {
    const dipper = byName("Big Dipper");
    const mizar = constellationDirection(findStar("Big Dipper", "Mizar"));
    const alcor = findStar("Big Dipper", "Alcor");
    assert.ok(alcor && alcor.magnitude > 3.5);
    assert.ok(angleBetween(mizar, constellationDirection(alcor)) < 0.4 * (Math.PI / 180));
    assert.ok(!dipper.lines.flat().includes(dipper.stars.indexOf(alcor)), "Alcor is no vertex");
    assert.ok(findStar("Orion", "Meissa"));
    assert.ok(findStar("Orion", "Hatysa"));
    assert.equal(findStar("Orion", "Orion Nebula").kind, "nebula");
  });

  it("gives every star a real B-V colour index", () => {
    for (const { stars } of CONSTELLATIONS) {
      for (const star of stars) assert.equal(typeof star.bv, "number", star.name);
    }
  });

  it("scales flux with Pogson's law", () => {
    assert.ok(Math.abs(starFlux(0) / starFlux(5) - 100) < 1e-9);
    assert.ok(starFlux(0.1) > starFlux(2) && starFlux(2) > starFlux(4));
  });

  it("tints stars subtly by colour index", () => {
    const [br, , bb] = starColor(findStar("Orion", "Betelgeuse").bv);
    const [rr, , rb] = starColor(findStar("Orion", "Rigel").bv);
    const [dr, , db] = starColor(findStar("Big Dipper", "Dubhe").bv);
    const [pr, pg, pb] = starColor(findStar("Little Dipper", "Polaris").bv);
    assert.ok(br > bb + 0.3, "Betelgeuse orange-red");
    assert.ok(rb > rr, "Rigel blue-white");
    assert.ok(dr > db + 0.15, "Dubhe yellow-orange");
    assert.ok(pr >= pg && pg > pb && pb > 0.7, "Polaris yellowish-white");
    for (const value of [...starColor(-0.4), ...starColor(2.5)]) {
      assert.ok(value >= 0 && value <= 1);
    }
  });

  it("scintillates more near the horizon than overhead", () => {
    assert.ok(scintillation(0.2) > scintillation(0.6));
    assert.ok(scintillation(0.6) > scintillation(Math.PI / 2));
    assert.ok(scintillation(Math.PI / 2) < 0.1, "subtle overhead");
    assert.ok(scintillation(0.05) <= 0.5);
  });

  it("keeps the figures' true angular sizes relative to one another", () => {
    const span = (name) => {
      const dirs = byName(name).stars.map(constellationDirection);
      let widest = 0;
      for (const a of dirs) for (const b of dirs) widest = Math.max(widest, angleBetween(a, b));
      return widest / (Math.PI / 180) / SKY_SCALE;
    };
    for (const [name, degrees] of [
      ["Big Dipper", 25],
      ["Orion", 20],
      ["Cassiopeia", 13],
    ]) {
      const measured = span(name);
      assert.ok(Math.abs(measured - degrees) / degrees < 0.15, `${name} spans ${measured} deg`);
    }
  });
});
