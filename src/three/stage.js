// The WebGL boundary: renderer, HDR render target, bloom, and tone mapping.
// Everything visual is decided by the systems; this only puts pixels on screen.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BLOOM_RADIUS = 0.55;

export function createStage(canvas, { scene, camera }) {
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral tone mapping keeps the Bliss greens and blues saturated.
  renderer.toneMapping = THREE.NeutralToneMapping;

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, BLOOM_RADIUS, 0.95);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
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
