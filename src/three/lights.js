// Light system: the sun and moon as directional lights following the
// atmosphere's arcs, plus a sky/ground hemisphere fill.

import * as THREE from "three";
import { setSrgb } from "./color.js";

const LIGHT_DISTANCE = 120;

export function createLights() {
  const sun = new THREE.DirectionalLight(0xffffff, 0);
  const moon = new THREE.DirectionalLight(0xffffff, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
  const object = new THREE.Group();
  object.name = "lights";
  object.add(sun, moon, ambient);

  return {
    object,
    sun,
    moon,
    ambient,
    update({ atmosphere }) {
      sun.position.fromArray(atmosphere.sunDirection).multiplyScalar(LIGHT_DISTANCE);
      setSrgb(sun.color, atmosphere.sunColor);
      sun.intensity = atmosphere.sunIntensity;

      moon.position.fromArray(atmosphere.moonDirection).multiplyScalar(LIGHT_DISTANCE);
      setSrgb(moon.color, atmosphere.moonColor);
      moon.intensity = atmosphere.moonIntensity;

      setSrgb(ambient.color, atmosphere.skyMid);
      setSrgb(ambient.groundColor, atmosphere.hill);
      ambient.intensity = atmosphere.ambientIntensity;
    },
  };
}
