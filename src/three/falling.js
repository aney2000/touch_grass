// Falling-particle system: leaves and petals as tumbling double-sided instanced
// quads, snow as soft round points. Motion comes from the pure simulation.

import * as THREE from "three";
import { createFallingField, stepFalling, fallingSpawners } from "../falling.js";

const MAX_STEP_SEC = 0.1;
// Leaves are real-sized (~0.15 m) within this distance of the camera.
const NEAR_DISTANCE = 12;

// Trees stand 40-125 m away, where a true-size leaf is far below a pixel. Each
// quad is grown in proportion to its camera distance beyond NEAR_DISTANCE, so a
// leaf keeps the screen size it would have at NEAR_DISTANCE: zonal emission
// stays readable without a sorted transparent pass or a separate sprite path.
const flakeVertex = /* glsl */ `
  uniform float uNearDistance;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float grow = max(1.0, distance(centre, cameraPosition) / uNearDistance);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position * grow, 1.0);
  }
`;

// A pointed-oval leaf/petal silhouette with a faint midrib, cut from the quad.
const flakeFragment = /* glsl */ `
  uniform float uLight;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float width = 0.62 * (1.0 - p.y * p.y);
    if (abs(p.x) > width) discard;
    float rib = 1.0 - 0.18 * smoothstep(0.06, 0.0, abs(p.x));
    gl_FragColor = vec4(vColor * rib * uLight, 1.0);
  }
`;

const snowVertex = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * 420.0 * uPixelRatio / -mvPosition.z;
  }
`;

const snowFragment = /* glsl */ `
  uniform float uLight;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = smoothstep(1.0, 0.2, d) * 0.9;
    gl_FragColor = vec4(vec3(uLight), alpha);
  }
`;

export function createFallingParticles({ capacity, limits, canopies = [], seed = 913 } = {}) {
  const flakeLimit = limits ? Math.max(limits.leaves ?? 0, limits.petals ?? 0) : capacity;
  const snowLimit = limits ? (limits.snow ?? 0) : capacity;
  const total = capacity ?? flakeLimit + snowLimit;
  const field = createFallingField({
    seed,
    capacity: total,
    limits,
    spawners: fallingSpawners({ canopies }),
  });

  const flakeGeometry = new THREE.PlaneGeometry(1, 1);
  const flakeMaterial = new THREE.ShaderMaterial({
    vertexShader: flakeVertex,
    fragmentShader: flakeFragment,
    side: THREE.DoubleSide,
    uniforms: { uLight: { value: 1 }, uNearDistance: { value: NEAR_DISTANCE } },
  });
  const flakes = new THREE.InstancedMesh(flakeGeometry, flakeMaterial, flakeLimit);
  flakes.name = "falling-flakes";
  flakes.frustumCulled = false;
  flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flakes.setColorAt(0, new THREE.Color(1, 1, 1));
  flakes.instanceColor.setUsage(THREE.DynamicDrawUsage);
  flakes.count = 0;

  const snowGeometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(snowLimit * 3), 3);
  const sizes = new THREE.BufferAttribute(new Float32Array(snowLimit), 1);
  positions.setUsage(THREE.DynamicDrawUsage);
  sizes.setUsage(THREE.DynamicDrawUsage);
  snowGeometry.setAttribute("position", positions);
  snowGeometry.setAttribute("aSize", sizes);
  snowGeometry.setDrawRange(0, 0);
  const snowMaterial = new THREE.ShaderMaterial({
    vertexShader: snowVertex,
    fragmentShader: snowFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uLight: { value: 1 }, uPixelRatio: { value: 1 } },
  });
  const snow = new THREE.Points(snowGeometry, snowMaterial);
  snow.name = "falling-snow";
  snow.frustumCulled = false;

  const object = new THREE.Group();
  object.name = "falling";
  object.add(flakes, snow);
  object.visible = false;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  let lastSeconds = null;

  return {
    object,
    flakes,
    snow,
    field,
    update({ seconds = 0, season, wind, motionScale = 1, atmosphere, pixelRatio = 1 }) {
      const rates = season?.look?.particleRates ?? {};
      const dt =
        lastSeconds === null ? 0 : Math.min(MAX_STEP_SEC, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      stepFalling(field, dt, { rates, wind, motionScale });

      // Idle: nothing alive and already drawn empty, so skip the loop and uploads.
      if (field.aliveCount === 0 && flakes.count === 0 && snowGeometry.drawRange.count === 0) {
        object.visible = false;
        return;
      }

      let flakeCount = 0;
      let snowCount = 0;
      for (const p of field.particles) {
        if (!p.alive) continue;
        // Landed particles shrink away instead of alpha-fading: no sorting needed.
        if (p.kind === "snow") {
          if (snowCount >= snowLimit) continue;
          positions.setXYZ(snowCount, p.x, p.y, p.z);
          sizes.setX(snowCount, p.size * p.fade);
          snowCount += 1;
          continue;
        }
        if (flakeCount >= flakeLimit) continue;
        position.set(p.x, p.y, p.z);
        quaternion.setFromEuler(euler.set(p.rotation[0], p.rotation[1], p.rotation[2]));
        scale.set(p.size * 0.7 * p.fade, p.size * p.fade, p.size);
        flakes.setMatrixAt(flakeCount, matrix.compose(position, quaternion, scale));
        flakes.setColorAt(flakeCount, color.setRGB(p.color[0], p.color[1], p.color[2], "srgb"));
        flakeCount += 1;
      }
      // Upload only the buffers that hold live instances; updateRanges trim to them.
      if (flakeCount > 0) {
        flakes.instanceMatrix.clearUpdateRanges();
        flakes.instanceMatrix.addUpdateRange(0, flakeCount * 16);
        flakes.instanceMatrix.needsUpdate = true;
        flakes.instanceColor.clearUpdateRanges();
        flakes.instanceColor.addUpdateRange(0, flakeCount * 3);
        flakes.instanceColor.needsUpdate = true;
      }
      flakes.count = flakeCount;
      if (snowCount > 0) {
        positions.clearUpdateRanges();
        positions.addUpdateRange(0, snowCount * 3);
        positions.needsUpdate = true;
        sizes.clearUpdateRanges();
        sizes.addUpdateRange(0, snowCount);
        sizes.needsUpdate = true;
      }
      snowGeometry.setDrawRange(0, snowCount);

      // Dim toward night like the rest of the lit scene.
      const light = atmosphere ? 0.35 + 0.65 * Math.min(1, atmosphere.ambientIntensity / 0.95) : 1;
      flakeMaterial.uniforms.uLight.value = light;
      snowMaterial.uniforms.uLight.value = Math.max(0.55, light);
      snowMaterial.uniforms.uPixelRatio.value = pixelRatio;
      object.visible = flakeCount + snowCount > 0;
    },
    dispose() {
      flakeGeometry.dispose();
      flakeMaterial.dispose();
      flakes.dispose();
      snowGeometry.dispose();
      snowMaterial.dispose();
    },
  };
}
