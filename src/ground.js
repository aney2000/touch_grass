// Ground colour under a season: the atmosphere's hill colour tinted by the
// season's ground relative to summer, then blanketed toward snow white by the
// snow cover. Snow dims with the ambient light so it still darkens at night.
// Pure and DOM/WebGL-free.

import { hexToUnitRgb } from "./scene-math.js";
import { SEASON_LOOKS } from "./config.js";

export const SNOW_WHITE = hexToUnitRgb("#eef3f8");
const SUMMER_GROUND = hexToUnitRgb(SEASON_LOOKS.summer.groundTint);
const DAYLIGHT_AMBIENT = 0.95;

export function groundColor(atmosphere, look = null) {
  if (!look) return [...atmosphere.hill];
  const night = Math.min(atmosphere.ambientIntensity / DAYLIGHT_AMBIENT, 1);
  const snow = look.snowCover;
  return atmosphere.hill.map((hill, index) => {
    const tinted = (hill * look.groundTint[index]) / SUMMER_GROUND[index];
    return tinted * (1 - snow) + SNOW_WHITE[index] * night * snow;
  });
}

// Fresh snow glints, so the ground loses a little roughness under it.
export function groundRoughness(look = null) {
  return 0.95 - 0.25 * (look?.snowCover ?? 0);
}
