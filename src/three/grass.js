// Grass system: tens of thousands of GPU-instanced blades. All motion happens
// in the vertex shader — rolling wind waves, ripple rings from gusts, and the
// grass parting under the visitor's hand — and nearby fireflies light the blades.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { terrainHeight } from "../terrain.js";
import { randomGenerator } from "../scene-math.js";
import { GUST_LIMIT } from "../wind.js";
import { SCENE_SEED } from "../config.js";

export const MAX_LANTERNS = 8;
const BLADE_SEGMENTS = 4;
const FIELD = { nearZ: 10, depth: 70, baseHalfWidth: 9, widening: 0.8 };

const vertexShader = /* glsl */ `
  #define GUST_LIMIT ${GUST_LIMIT}
  attribute vec3 aRoot;
  attribute vec4 aParams; // height, width, yaw, phase
  attribute float aShade;
  uniform float uTime;
  uniform float uMotion;
  uniform vec4 uGusts[GUST_LIMIT]; // x, z, age (s), strength
  uniform vec3 uTouch; // x, z, strength
  varying float vHeight;
  varying float vShade;
  varying vec3 vWorld;
  varying vec3 vNormal;
  #include <fog_pars_vertex>

  vec2 safeDirection(vec2 v) {
    float len = length(v);
    return len > 1e-4 ? v / len : vec2(0.0);
  }

  void main() {
    float h = position.y;
    float yaw = aParams.z;
    vec2 facing = vec2(cos(yaw), sin(yaw));
    vec3 world = aRoot + vec3(position.x * aParams.y * facing.x, h * aParams.x, position.x * aParams.y * facing.y);

    vec2 bend = vec2(cos(aParams.w), sin(aParams.w)) * 0.18;
    float roll = sin(uTime * 0.9 - aRoot.x * 0.11 + aRoot.z * 0.07);
    float flutter = sin(uTime * 2.7 + aRoot.x * 0.6 + aRoot.z * 0.4 + aParams.w);
    bend += vec2(0.8, 0.35) * (0.45 * roll + 0.55 + 0.12 * flutter) * 0.42 * uMotion;

    for (int i = 0; i < GUST_LIMIT; i++) {
      vec4 gust = uGusts[i];
      if (gust.w <= 0.0) continue;
      vec2 away = aRoot.xz - gust.xy;
      float distance = length(away);
      float ring = exp(-pow((distance - gust.z * 7.5) / 1.4, 2.0)) * exp(-gust.z * 1.2);
      bend += safeDirection(away) * ring * gust.w * 1.5;
    }

    vec2 fromHand = aRoot.xz - uTouch.xy;
    float press = uTouch.z * smoothstep(2.4, 0.2, length(fromHand));
    bend += safeDirection(fromHand) * press * 1.8;

    float stiffness = h * h;
    world.xz += bend * stiffness * aParams.x;
    world.y -= dot(bend, bend) * stiffness * aParams.x * 0.22;

    vHeight = h;
    vShade = aShade;
    vWorld = world;
    vNormal = normalize(vec3(-facing.y * 0.35 + bend.x * 0.3, 1.0, facing.x * 0.35 + bend.y * 0.3));

    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #define MAX_LANTERNS ${MAX_LANTERNS}
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform vec3 uMoonDirection;
  uniform vec3 uMoonColor;
  uniform float uMoonIntensity;
  uniform vec3 uSkyColor;
  uniform vec3 uGroundColor;
  uniform float uAmbient;
  uniform vec4 uLanterns[MAX_LANTERNS]; // x, y, z, glow
  uniform vec3 uLanternColor;
  varying float vHeight;
  varying float vShade;
  varying vec3 vWorld;
  varying vec3 vNormal;
  #include <fog_pars_fragment>

  const float INV_PI = 0.3183098861837907;

  void main() {
    vec3 albedo = mix(uBaseColor, uTipColor, smoothstep(0.0, 1.0, vHeight)) * vShade;
    albedo *= mix(0.45, 1.0, vHeight);
    vec3 normal = normalize(vNormal);

    vec3 light = uSkyColor * uAmbient * mix(0.6, 1.0, normal.y);
    light += uGroundColor * uAmbient * 0.25;
    light += uSunColor * uSunIntensity * (0.35 + 0.65 * max(dot(normal, normalize(uSunDirection)), 0.0));
    light += uMoonColor * uMoonIntensity * max(dot(normal, normalize(uMoonDirection)), 0.0);

    vec3 view = normalize(cameraPosition - vWorld);
    float translucency = pow(max(dot(view, -normalize(uSunDirection)), 0.0), 6.0) * vHeight;
    light += uSunColor * uSunIntensity * translucency * 0.9;

    vec3 color = albedo * light * INV_PI;
    for (int i = 0; i < MAX_LANTERNS; i++) {
      vec4 lantern = uLanterns[i];
      if (lantern.w <= 0.0) continue;
      vec3 offset = lantern.xyz - vWorld;
      color += uLanternColor * lantern.w * (0.35 + 0.65 * vHeight) / (1.0 + dot(offset, offset) * 3.5);
    }

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function createBladeGeometry() {
  const vertices = [];
  for (let row = 0; row < BLADE_SEGMENTS; row += 1) {
    const y = row / BLADE_SEGMENTS;
    const half = 0.5 * (1 - y ** 1.4);
    vertices.push(-half, y, 0, half, y, 0);
  }
  vertices.push(0, 1, 0);

  const indices = [];
  for (let row = 0; row < BLADE_SEGMENTS - 1; row += 1) {
    const a = row * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (BLADE_SEGMENTS - 1) * 2;
  indices.push(last, last + 1, last + 2);

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function plantBlades(geometry, count) {
  const random = randomGenerator(SCENE_SEED + 1);
  const roots = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  const shades = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const z = FIELD.nearZ - FIELD.depth * random() ** 1.8;
    const distance = FIELD.nearZ - z;
    const halfWidth = FIELD.baseHalfWidth + distance * FIELD.widening;
    const x = (random() * 2 - 1) * halfWidth;
    const growth = 1 + distance * 0.035;
    roots.set([x, terrainHeight(x, z), z], i * 3);
    params.set(
      [
        (0.35 + random() * 0.5) * growth,
        (0.05 + random() * 0.05) * growth,
        random() * Math.PI * 2,
        random() * Math.PI * 2,
      ],
      i * 4,
    );
    shades[i] = 0.75 + random() * 0.45;
  }

  geometry.setAttribute("aRoot", new THREE.InstancedBufferAttribute(roots, 3));
  geometry.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
  geometry.setAttribute("aShade", new THREE.InstancedBufferAttribute(shades, 1));
  geometry.instanceCount = count;
}

function vectorArray(length, Vector) {
  return Array.from({ length }, () => new Vector());
}

export function createGrass({ count = 60000 } = {}) {
  const geometry = createBladeGeometry();
  plantBlades(geometry, count);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uTouch: { value: new THREE.Vector3() },
        uBaseColor: { value: new THREE.Color() },
        uTipColor: { value: new THREE.Color() },
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color() },
        uSunIntensity: { value: 0 },
        uMoonDirection: { value: new THREE.Vector3(0, 1, 0) },
        uMoonColor: { value: new THREE.Color() },
        uMoonIntensity: { value: 0 },
        uSkyColor: { value: new THREE.Color() },
        uGroundColor: { value: new THREE.Color() },
        uAmbient: { value: 1 },
        uLanternColor: { value: new THREE.Color(0.55, 1.0, 0.25) },
      },
    ]),
  });
  // Arrays of vectors are assigned after merge so they keep their identity.
  material.uniforms.uGusts = { value: vectorArray(GUST_LIMIT, THREE.Vector4) };
  material.uniforms.uLanterns = { value: vectorArray(MAX_LANTERNS, THREE.Vector4) };

  const object = new THREE.Mesh(geometry, material);
  object.name = "grass";
  object.frustumCulled = false;
  const lanternPicks = [];

  function updateLanterns(fireflies, visibility) {
    lanternPicks.length = 0;
    lanternPicks.push(...fireflies);
    lanternPicks.sort((a, b) => b.glow - a.glow);
    material.uniforms.uLanterns.value.forEach((lantern, index) => {
      const fly = lanternPicks[index];
      if (fly) lantern.set(fly.x, fly.y, fly.z, fly.glow * visibility);
      else lantern.set(0, 0, 0, 0);
    });
  }

  return {
    object,
    update({ seconds, atmosphere, motionScale = 1, wind, fireflies = [] }) {
      const u = material.uniforms;
      u.uTime.value = seconds;
      u.uMotion.value = motionScale;

      if (wind) {
        u.uGusts.value.forEach((gust, index) => gust.fromArray(wind.gusts, index * 4));
        u.uTouch.value.set(wind.touch.x, wind.touch.z, wind.touch.strength);
      }

      setSrgb(u.uBaseColor.value, atmosphere.grassBase);
      setSrgb(u.uTipColor.value, atmosphere.grassTip);
      u.uSunDirection.value.fromArray(atmosphere.sunDirection);
      setSrgb(u.uSunColor.value, atmosphere.sunColor);
      u.uSunIntensity.value = atmosphere.sunIntensity;
      u.uMoonDirection.value.fromArray(atmosphere.moonDirection);
      setSrgb(u.uMoonColor.value, atmosphere.moonColor);
      u.uMoonIntensity.value = atmosphere.moonIntensity;
      setSrgb(u.uSkyColor.value, atmosphere.skyMid);
      setSrgb(u.uGroundColor.value, atmosphere.hill);
      u.uAmbient.value = atmosphere.ambientIntensity;

      updateLanterns(fireflies, atmosphere.fireflyVisibility);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
