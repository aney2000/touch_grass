// Constellation system: brighter named stars that are always part of the night
// sky, plus lines and labels that fade in when constellation mode is on (or a
// single constellation has just been spotted). Label sprites come from an
// injectable factory so headless tests need no canvas.

import * as THREE from "three";
import { layoutConstellations } from "../constellations.js";

const RADIUS = 780;
const LINE_OPACITY = 0.55;
const LABEL_OPACITY = 0.85;
const LINE_COLOR = 0xe8d6a0;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.82 + 0.18 * sin(uTime * 1.3 + aPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  uniform float uVisibility;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float falloff = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.96, 0.88) * 2.0, falloff * falloff * vTwinkle * uVisibility);
  }
`;

// A text sprite drawn onto a canvas; only used in the browser.
export function canvasLabel(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.font = "500 44px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(10, 20, 50, 0.9)";
  context.shadowBlur = 12;
  context.fillStyle = "rgba(240, 232, 205, 1)";
  context.fillText(name, 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }),
  );
  sprite.scale.set(64, 12, 1);
  return sprite;
}

function sizeFor(magnitude) {
  return Math.max(2.5, 9 - magnitude * 1.6);
}

export function createConstellations({ createLabel = canvasLabel, pixelRatio = 1 } = {}) {
  const layout = layoutConstellations();
  const object = new THREE.Group();
  object.name = "constellations";
  object.renderOrder = -1;

  const all = layout.flatMap((group) => group.stars);
  const positions = new Float32Array(all.length * 3);
  const sizes = new Float32Array(all.length);
  const phases = new Float32Array(all.length);
  all.forEach((star, i) => {
    positions.set(star.direction.map((v) => v * RADIUS), i * 3);
    sizes[i] = sizeFor(star.magnitude);
    phases[i] = i * 2.399;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uVisibility: { value: 0 },
    },
  });
  const stars = new THREE.Points(geometry, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  object.add(stars);

  const lines = [];
  const labels = [];
  for (const group of layout) {
    const points = new Float32Array(group.lines.length * 6);
    group.lines.forEach(([a, b], i) => {
      points.set(group.stars[a].direction.map((v) => v * RADIUS), i * 6);
      points.set(group.stars[b].direction.map((v) => v * RADIUS), i * 6 + 3);
    });
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const line = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: LINE_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    line.name = group.name;
    line.frustumCulled = false;
    line.renderOrder = -1;
    line.visible = false;
    lines.push(line);

    // Label just below the constellation's lowest star.
    const centre = [0, 0, 0];
    let lowest = Infinity;
    for (const star of group.stars) {
      star.direction.forEach((v, k) => (centre[k] += v / group.stars.length));
      lowest = Math.min(lowest, star.elevation);
    }
    const flat = Math.hypot(centre[0], centre[2]) || 1;
    const elevation = lowest - 0.06;
    const label = createLabel(group.name);
    label.position.set(
      (centre[0] / flat) * Math.cos(elevation) * RADIUS,
      Math.sin(elevation) * RADIUS,
      (centre[2] / flat) * Math.cos(elevation) * RADIUS,
    );
    label.material.opacity = 0;
    label.renderOrder = -1;
    label.visible = false;
    labels.push(label);
  }
  object.add(...lines, ...labels);

  return {
    object,
    stars,
    lines,
    labels,
    update({ seconds = 0, motionScale = 1, atmosphere, constellations }) {
      const visibility = atmosphere.starVisibility;
      starMaterial.uniforms.uVisibility.value = visibility;
      starMaterial.uniforms.uTime.value = seconds * motionScale;
      const state = constellations ?? { reveal: 0, highlight: null, highlightAmount: 0 };
      layout.forEach((group, i) => {
        const spotted = state.highlight === group.name ? state.highlightAmount : 0;
        const reveal = Math.max(state.reveal, spotted);
        const amount = visibility * reveal;
        lines[i].material.opacity = amount * LINE_OPACITY * (1 + spotted * 0.6);
        labels[i].material.opacity = amount * LABEL_OPACITY;
        lines[i].visible = amount > 0.001;
        labels[i].visible = amount > 0.001;
      });
    },
    dispose() {
      geometry.dispose();
      starMaterial.dispose();
      for (const line of lines) {
        line.geometry.dispose();
        line.material.dispose();
      }
      for (const label of labels) {
        label.material.map?.dispose();
        label.material.dispose();
      }
    },
  };
}
