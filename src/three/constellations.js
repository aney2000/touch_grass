// Constellation system rendered like the real sky: stars sized and tinted
// from their catalogue magnitude and colour index, twinkling by air mass, and
// no text at all. Constellation mode (or a spotted figure) only adds a faint
// star-chart overlay of thin lines plus a gentle glow on the figure's stars;
// names reach people through the screen-reader announcement instead.

import * as THREE from "three";
import {
  layoutConstellations,
  pickConstellation,
  scintillation,
  starColor,
  starFlux,
} from "../constellations.js";

// Normalised device coordinates -> the constellation under them, or null.
export function createSkyPicker(camera, threshold = 0.08) {
  const point = new THREE.Vector3();
  return ({ x, y }) => {
    point.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    return pickConstellation([point.x, point.y, point.z], threshold);
  };
}

const RADIUS = 780;
const LINE_OPACITY = 0.22;
const SPOTTED_LINE_BOOST = 0.05;
const LINE_COLOR = 0xdde6ff;
const NEBULA_SIZE = 26;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aBright;
  attribute float aScintillation;
  attribute float aSoft;
  attribute float aGroup;
  attribute vec3 color;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uHighlight;
  uniform float uHighlightGroup;
  varying float vAlpha;
  varying float vSoft;
  varying vec3 vColor;
  void main() {
    float flicker = sin(uTime * 7.1 + aPhase) * 0.6 + sin(uTime * 12.7 + aPhase * 1.7) * 0.4;
    float twinkle = 1.0 + aScintillation * flicker * (1.0 - aSoft);
    float spotted = step(abs(aGroup - uHighlightGroup), 0.5) * uHighlight * (1.0 - aSoft);
    float glow = 1.0 + spotted * (0.35 + 0.25 * sin(uTime * 2.4));
    vAlpha = aBright * twinkle * glow;
    vSoft = aSoft;
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * glow * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  uniform float uVisibility;
  varying float vAlpha;
  varying float vSoft;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float falloff = mix(core * core, core * 0.35, vSoft);
    gl_FragColor = vec4(vColor * 2.0, falloff * vAlpha * uVisibility);
  }
`;

// Point area grows with flux, compressed so faint neighbours stay visible.
function sizeFor(magnitude) {
  return 2.2 + 7 * starFlux(magnitude) ** 0.35;
}

function brightnessFor(magnitude) {
  return Math.min(1, Math.max(0.22, Math.sqrt(starFlux(magnitude - 0.5))));
}

function buildStars(layout, pixelRatio) {
  const all = layout.flatMap((group, g) => group.stars.map((star) => ({ ...star, group: g })));
  const attribute = (size) => new Float32Array(all.length * size);
  const positions = attribute(3);
  const colors = attribute(3);
  const sizes = attribute(1);
  const phases = attribute(1);
  const bright = attribute(1);
  const depth = attribute(1);
  const soft = attribute(1);
  const groups = attribute(1);
  all.forEach((star, i) => {
    const nebula = star.kind === "nebula";
    positions.set(
      star.direction.map((v) => v * RADIUS),
      i * 3,
    );
    colors.set(nebula ? [0.75, 0.82, 1] : starColor(star.bv), i * 3);
    sizes[i] = nebula ? NEBULA_SIZE : sizeFor(star.magnitude);
    phases[i] = i * 2.399;
    bright[i] = nebula ? 0.3 : brightnessFor(star.magnitude);
    depth[i] = scintillation(star.elevation);
    soft[i] = nebula ? 1 : 0;
    groups[i] = star.group;
  });
  const geometry = new THREE.BufferGeometry();
  const set = (name, array, size) =>
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size));
  set("position", positions, 3);
  set("color", colors, 3);
  set("aSize", sizes, 1);
  set("aPhase", phases, 1);
  set("aBright", bright, 1);
  set("aScintillation", depth, 1);
  set("aSoft", soft, 1);
  set("aGroup", groups, 1);
  const material = new THREE.ShaderMaterial({
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
      uHighlight: { value: 0 },
      uHighlightGroup: { value: -1 },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -1;
  return points;
}

function buildLines(group) {
  const points = new Float32Array(group.lines.length * 6);
  group.lines.forEach(([a, b], i) => {
    points.set(
      group.stars[a].direction.map((v) => v * RADIUS),
      i * 6,
    );
    points.set(
      group.stars[b].direction.map((v) => v * RADIUS),
      i * 6 + 3,
    );
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const line = new THREE.LineSegments(
    geometry,
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
  return line;
}

export function createConstellations({ pixelRatio = 1 } = {}) {
  const layout = layoutConstellations();
  const object = new THREE.Group();
  object.name = "constellations";
  object.renderOrder = -1;

  const stars = buildStars(layout, pixelRatio);
  const lines = layout.map(buildLines);
  object.add(stars, ...lines);
  const uniforms = stars.material.uniforms;

  return {
    object,
    stars,
    lines,
    update({ seconds = 0, motionScale = 1, atmosphere, constellations }) {
      const visibility = atmosphere.starVisibility;
      uniforms.uVisibility.value = visibility;
      uniforms.uTime.value = seconds * motionScale;
      const state = constellations ?? { reveal: 0, highlight: null, highlightAmount: 0 };
      const spottedIndex = layout.findIndex((group) => group.name === state.highlight);
      uniforms.uHighlightGroup.value = spottedIndex;
      uniforms.uHighlight.value = spottedIndex >= 0 ? state.highlightAmount : 0;
      layout.forEach((group, i) => {
        const spotted = i === spottedIndex ? state.highlightAmount : 0;
        const amount = visibility * Math.max(state.reveal, spotted);
        lines[i].material.opacity = amount * (LINE_OPACITY + spotted * SPOTTED_LINE_BOOST);
        lines[i].visible = amount > 0.001;
      });
    },
    dispose() {
      stars.geometry.dispose();
      stars.material.dispose();
      for (const line of lines) {
        line.geometry.dispose();
        line.material.dispose();
      }
    },
  };
}
