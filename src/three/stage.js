// The WebGL boundary: renderer, HDR render target, bloom, and tone mapping.
// Everything visual is decided by the systems; this only puts pixels on screen.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BLOOM_RADIUS = 0.4;

export function createStage(
  canvas,
  { scene, camera, powerPreference = "high-performance", msaa = 4, bloomScale = 1 },
) {
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral tone mapping keeps the Bliss greens and blues saturated.
  renderer.toneMapping = THREE.NeutralToneMapping;

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, BLOOM_RADIUS, 0.95);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let size = { width: 1, height: 1, pixelRatio: 1 };
  let scale = bloomScale;

  function applySize() {
    const { width, height, pixelRatio } = size;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    // Bloom is soft by nature; rendering it at a fraction of the size is cheap.
    bloom.setSize(
      Math.max(1, Math.round(width * pixelRatio * scale)),
      Math.max(1, Math.round(height * pixelRatio * scale)),
    );
  }

  return {
    resize(width, height, pixelRatio) {
      size = { width, height, pixelRatio };
      applySize();
    },
    setBloomScale(nextScale) {
      if (nextScale === scale) return;
      scale = nextScale;
      applySize();
    },
    render(atmosphere) {
      bloom.threshold = atmosphere.bloomThreshold;
      bloom.strength = atmosphere.bloomStrength;
      renderer.toneMappingExposure = atmosphere.exposure;
      composer.render();
    },
    dispose() {
      composer.dispose();
      renderer.dispose();
    },
  };
}
