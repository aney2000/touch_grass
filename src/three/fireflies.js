// Firefly glow system: one additive point per firefly, sized by distance and
// pushed above 1.0 in brightness so the bloom pass turns them into real glows.

import * as THREE from "three";

const vertexShader = /* glsl */ `
  attribute float aGlow;
  attribute float aSize;
  uniform float uPixelRatio;
  uniform float uScale;
  varying float vGlow;
  void main() {
    vGlow = aGlow;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uScale * uPixelRatio * (0.35 + 0.65 * aGlow) / -mvPosition.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uVisibility;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.35, 0.0, d);
    float halo = pow(max(1.0 - d, 0.0), 2.5) * 0.35;
    float light = (core + halo) * (0.06 + 0.94 * vGlow) * uVisibility;
    gl_FragColor = vec4(uColor * uIntensity * light, light);
  }
`;

export function createFireflyLights({ capacity = 64 } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
  const glows = new THREE.BufferAttribute(new Float32Array(capacity), 1);
  const sizes = new THREE.BufferAttribute(new Float32Array(capacity), 1);
  for (const attribute of [positions, glows, sizes]) attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("aGlow", glows);
  geometry.setAttribute("aSize", sizes);
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0.72, 1.0, 0.32) },
      uIntensity: { value: 4.5 },
      uVisibility: { value: 0 },
      uPixelRatio: { value: 1 },
      uScale: { value: 260 },
    },
  });

  const object = new THREE.Points(geometry, material);
  object.name = "fireflies";
  object.frustumCulled = false;

  return {
    object,
    update({ atmosphere, fireflies = [], pixelRatio = 1 }) {
      const visibility = atmosphere.fireflyVisibility;
      object.visible = visibility > 0.002;
      if (!object.visible) return;

      const count = Math.min(capacity, fireflies.length);
      for (let i = 0; i < count; i += 1) {
        const fly = fireflies[i];
        positions.setXYZ(i, fly.x, fly.y, fly.z);
        glows.setX(i, fly.glow);
        sizes.setX(i, fly.size);
      }
      geometry.setDrawRange(0, count);
      positions.needsUpdate = true;
      glows.needsUpdate = true;
      sizes.needsUpdate = true;
      material.uniforms.uVisibility.value = visibility;
      material.uniforms.uPixelRatio.value = pixelRatio;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
