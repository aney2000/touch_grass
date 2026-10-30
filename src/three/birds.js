// Bird system: tiny dark silhouettes for the aviary's flocks. One instanced
// mesh; the wing beat runs in the vertex shader from a per-instance phase, so
// only a matrix and a float change per bird per frame.

import * as THREE from "three";
import { createAviary, stepAviary } from "../birds.js";
import { screenSizeGlsl } from "./screen-size.js";

const MAX_STEP_SEC = 0.1;
const WINGSPAN = 0.45;
// Birds keep their 4 m screen size when farther away, readable at 40-125 m.
const NEAR_DISTANCE = 4;

const vertex = /* glsl */ `
  #include <fog_pars_vertex>
  attribute float aPhase;
  uniform float uNearDistance;
  ${screenSizeGlsl}
  void main() {
    vec3 p = position;
    float span = abs(p.x) / ${(WINGSPAN / 2).toFixed(3)};
    p.y += sin(aPhase) * span * span * 0.16;
    vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p * screenSizeGrow(centre, uNearDistance), 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
    #include <fog_fragment>
  }
`;

// A gull-wing silhouette facing -z: a slim body and two swept wings, whose
// tips are the only vertices the flap moves.
function birdGeometry() {
  const h = WINGSPAN / 2;
  const vertices = [
    // body
    0,
    0,
    -0.12,
    0.025,
    0,
    0.08,
    -0.025,
    0,
    0.08,
    // right wing: root front, root back, tip
    0.02,
    0,
    -0.04,
    0.02,
    0,
    0.04,
    h,
    0.01,
    0.05,
    // left wing
    -0.02,
    0,
    -0.04,
    -h,
    0.01,
    0.05,
    -0.02,
    0,
    0.04,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

export function createBirds({ canopies = [], maxBirds = 6, random = Math.random } = {}) {
  const aviary = createAviary({ canopies, random, maxBirds });
  const geometry = birdGeometry();
  const phases = new THREE.InstancedBufferAttribute(new Float32Array(maxBirds), 1);
  phases.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aPhase", phases);

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(0.07, 0.08, 0.1) },
        uNearDistance: { value: NEAR_DISTANCE },
      },
    ]),
  });
  const mesh = new THREE.InstancedMesh(geometry, material, maxBirds);
  mesh.name = "birds";
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  let lastSeconds = null;

  return {
    object: mesh,
    aviary,
    update({ seconds = 0, dayAmount, atmosphere, season, motionScale = 1 }) {
      const dt =
        lastSeconds === null ? 0 : Math.min(MAX_STEP_SEC, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      stepAviary(aviary, dt, {
        dayAmount: dayAmount ?? atmosphere?.dayAmount ?? 1,
        season,
        motionScale,
      });

      let count = 0;
      for (const bird of aviary.birds) {
        if (!bird.visible) continue;
        position.set(bird.position.x, bird.position.y, bird.position.z);
        euler.set(0, -bird.heading, bird.bank);
        matrix.compose(position, quaternion.setFromEuler(euler), scale);
        mesh.setMatrixAt(count, matrix);
        phases.setX(count, bird.wingPhase);
        count += 1;
      }
      mesh.count = count;
      if (count > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        phases.needsUpdate = true;
      }
      // Silhouettes lift a little toward the sky colour as daylight fades.
      material.uniforms.uColor.value.setScalar(0.06 + 0.06 * (atmosphere?.ambientIntensity ?? 0));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
