// Sky system: a gradient dome with a sun and moon painted in the shader, plus a
// field of twinkling stars. Disc colours go above 1.0 so the bloom pass glows them.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { randomGenerator } from "../scene-math.js";
import { SCENE_SEED } from "../config.js";

export const STAR_COUNT = 900;
const DOME_RADIUS = 900;
const STAR_RADIUS = 800;

const domeVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunVisibility;
  uniform float uTwilight;
  uniform vec3 uMoonDirection;
  uniform vec3 uMoonColor;
  uniform float uMoonVisibility;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = direction.y;
    vec3 color = mix(uHorizon, uMid, smoothstep(-0.04, 0.2, height));
    color = mix(color, uTop, smoothstep(0.2, 0.8, height));

    float sunAlign = max(dot(direction, normalize(uSunDirection)), 0.0);
    float sunGlow = pow(sunAlign, 90.0) * 0.7 + pow(sunAlign, 7.0) * (0.12 + 0.35 * uTwilight);
    color += uSunColor * sunGlow * uSunVisibility;
    float sunDisc = smoothstep(0.99935, 0.9996, sunAlign);
    color = mix(color, uSunColor * 7.0, sunDisc * uSunVisibility);

    vec3 moonAxis = normalize(uMoonDirection);
    float moonAlign = max(dot(direction, moonAxis), 0.0);
    color += uMoonColor * (pow(moonAlign, 400.0) * 0.25 + pow(moonAlign, 24.0) * 0.06) * uMoonVisibility;
    float moonDisc = smoothstep(0.99955, 0.99968, moonAlign);
    vec3 surface = direction - moonAxis * moonAlign;
    float maria = 0.8 + 0.2 * sin(surface.x * 2100.0) * sin(surface.y * 1700.0 + 1.3);
    color = mix(color, vec3(1.0, 0.97, 0.88) * 1.25 * maria, moonDisc * uMoonVisibility);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.6 + 0.4 * sin(uTime * (1.2 + fract(aPhase) * 1.6) + aPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  uniform float uVisibility;
  varying float vTwinkle;
  void main() {
    float falloff = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * 1.8, falloff * vTwinkle * uVisibility);
  }
`;

function createDome() {
  const material = new THREE.ShaderMaterial({
    vertexShader: domeVertex,
    fragmentShader: domeFragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSunVisibility: { value: 1 },
      uTwilight: { value: 0 },
      uMoonDirection: { value: new THREE.Vector3(0, -1, 0) },
      uMoonColor: { value: new THREE.Color() },
      uMoonVisibility: { value: 0 },
    },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 48, 24), material);
  dome.renderOrder = -2;
  return dome;
}

function createStars() {
  const random = randomGenerator(SCENE_SEED);
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const phases = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i += 1) {
    const elevation = 0.04 + Math.asin(random()) * 0.95;
    const azimuth = random() * Math.PI * 2;
    positions.set(
      [
        STAR_RADIUS * Math.cos(elevation) * Math.sin(azimuth),
        STAR_RADIUS * Math.sin(elevation),
        -STAR_RADIUS * Math.cos(elevation) * Math.cos(azimuth),
      ],
      i * 3,
    );
    sizes[i] = 1.2 + random() ** 3 * 3.2;
    phases[i] = random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uPixelRatio: { value: 1 },
    },
  });
  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -1;
  stars.frustumCulled = false;
  return stars;
}

export function createSky() {
  const dome = createDome();
  const stars = createStars();
  const object = new THREE.Group();
  object.name = "sky";
  object.add(dome, stars);

  return {
    object,
    dome,
    stars,
    update({ seconds, atmosphere, pixelRatio = 1 }) {
      const sky = dome.material.uniforms;
      setSrgb(sky.uTop.value, atmosphere.skyTop);
      setSrgb(sky.uMid.value, atmosphere.skyMid);
      setSrgb(sky.uHorizon.value, atmosphere.skyHorizon);
      sky.uSunDirection.value.fromArray(atmosphere.sunDirection);
      setSrgb(sky.uSunColor.value, atmosphere.sunColor);
      sky.uSunVisibility.value = atmosphere.sunVisibility;
      sky.uTwilight.value = atmosphere.twilight;
      sky.uMoonDirection.value.fromArray(atmosphere.moonDirection);
      setSrgb(sky.uMoonColor.value, atmosphere.moonColor);
      sky.uMoonVisibility.value = atmosphere.starVisibility;

      const twinkle = stars.material.uniforms;
      twinkle.uVisibility.value = atmosphere.starVisibility;
      twinkle.uTime.value = seconds;
      twinkle.uPixelRatio.value = pixelRatio;
      stars.visible = atmosphere.starVisibility > 0.002;
    },
    dispose() {
      dome.geometry.dispose();
      dome.material.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
    },
  };
}
