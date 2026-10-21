// The atmosphere model: every colour, light, and visibility in the 3D scene is
// derived here from the single day/night amount (0 = midday, 1 = deep night).
// Pure and DOM/WebGL-free, so the whole transition is unit tested.

import { clamp, hexToUnitRgb, mixRgb, smoothstep, twilightAmount } from "./scene-math.js";
import { dayPalette, nightPalette, twilightPalette } from "./config.js";

const DAY = {
  skyTop: hexToUnitRgb(dayPalette.skyTop),
  skyMid: hexToUnitRgb(dayPalette.skyMid),
  horizon: hexToUnitRgb(dayPalette.horizon),
  hill: hexToUnitRgb(dayPalette.nearHill),
  grassTip: hexToUnitRgb(dayPalette.grass[0]),
  grassBase: hexToUnitRgb(dayPalette.grass[3]),
  cloud: hexToUnitRgb(dayPalette.cloud),
};

const NIGHT = {
  skyTop: hexToUnitRgb(nightPalette.skyTop),
  skyMid: hexToUnitRgb(nightPalette.skyMid),
  horizon: hexToUnitRgb(nightPalette.horizon),
  hill: hexToUnitRgb(nightPalette.nearHill),
  grassTip: hexToUnitRgb(nightPalette.grass[0]),
  grassBase: hexToUnitRgb(nightPalette.grass[3]),
  cloud: hexToUnitRgb(nightPalette.cloud),
};

const TWILIGHT = {
  horizon: hexToUnitRgb(twilightPalette.horizon),
  sky: hexToUnitRgb(twilightPalette.sky),
  sun: hexToUnitRgb(twilightPalette.sun),
};

const WHITE = [1, 1, 1];
const MOONLIGHT = hexToUnitRgb("#9fb6e8");

// Sun arcs from high in the front-left down past the horizon; the moon rises front-right.
const SUN_PATH = { elevation: [0.95, -0.32], azimuth: [-0.55, -0.95] };
const MOON_PATH = { elevation: [-0.35, 0.82], azimuth: [0.65, 0.45] };

function directionFrom(elevation, azimuth) {
  const flat = Math.cos(elevation);
  return [flat * Math.sin(azimuth), Math.sin(elevation), -flat * Math.cos(azimuth)];
}

function along([from, to], amount) {
  return from + (to - from) * amount;
}

export function atmosphereAt(dayAmount) {
  const amount = clamp(dayAmount, 0, 1);
  const twilight = twilightAmount(amount);
  const mix = (key) => mixRgb(DAY[key], NIGHT[key], amount);

  const skyHorizon = mixRgb(mix("horizon"), TWILIGHT.horizon, twilight * 0.8);
  const sunVisibility = 1 - smoothstep(0.55, 0.95, amount);

  return {
    dayAmount: amount,
    twilight,
    skyTop: mix("skyTop"),
    skyMid: mixRgb(mix("skyMid"), TWILIGHT.sky, twilight * 0.45),
    skyHorizon,
    fog: [...skyHorizon],
    hill: mix("hill"),
    grassTip: mix("grassTip"),
    grassBase: mix("grassBase"),
    cloud: mixRgb(mix("cloud"), TWILIGHT.horizon, twilight * 0.5),
    cloudOpacity: 1 - amount * 0.6,
    sunDirection: directionFrom(along(SUN_PATH.elevation, amount), along(SUN_PATH.azimuth, amount)),
    sunColor: mixRgb(WHITE, TWILIGHT.sun, twilight),
    sunIntensity: 2.6 * sunVisibility,
    sunVisibility,
    moonDirection: directionFrom(
      along(MOON_PATH.elevation, amount),
      along(MOON_PATH.azimuth, amount),
    ),
    moonColor: MOONLIGHT,
    moonIntensity: 0.6 * smoothstep(0.35, 0.9, amount),
    ambientIntensity: 0.95 - amount * 0.72,
    starVisibility: smoothstep(0.16, 0.9, amount),
    fireflyVisibility: smoothstep(0.35, 0.95, amount),
  };
}
