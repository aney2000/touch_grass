// Cloud system: cumulus clouds built from soft billboard puffs that stream
// across the sky. Lower puffs use a cooler shade so each cloud reads as 3D.

import * as THREE from "three";
import { setSrgb } from "./color.js";
import { createCloudBank, cloudOffset } from "../clouds.js";
import { randomGenerator } from "../scene-math.js";
import { SCENE_SEED } from "../config.js";

export const CLOUD_BAND = Object.freeze({ span: 460, yMin: 30, yMax: 56, zMin: -230, zMax: -85 });
const PUFF_SCALE = 2.7;
const SHADE = 0.8;

function createPuffTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const falloff = Math.max(0, 1 - Math.hypot(dx, dy) * 2);
      const alpha = falloff ** 1.6;
      data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function puffMaterial(texture) {
  return new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

export function createCloudLayer({ count = 14 } = {}) {
  const clouds = createCloudBank(randomGenerator(SCENE_SEED + 2), count, CLOUD_BAND);
  const texture = createPuffTexture();
  const material = puffMaterial(texture);
  const shade = puffMaterial(texture);

  const object = new THREE.Group();
  object.name = "clouds";
  for (const cloud of clouds) {
    const group = new THREE.Group();
    group.position.set(cloud.x, cloud.y, cloud.z);
    for (const puff of cloud.puffs) {
      const sprite = new THREE.Sprite(puff.y < puff.radius * 0.6 ? shade : material);
      sprite.position.set(puff.x, puff.y, puff.z).multiplyScalar(cloud.scale);
      sprite.scale.setScalar(puff.radius * PUFF_SCALE * cloud.scale);
      group.add(sprite);
    }
    object.add(group);
  }

  return {
    object,
    clouds,
    material,
    update({ seconds, atmosphere, motionScale = 1 }) {
      object.children.forEach((group, index) => {
        group.position.x = cloudOffset(clouds[index], seconds, CLOUD_BAND.span, motionScale);
      });
      setSrgb(material.color, atmosphere.cloud);
      shade.color.copy(material.color).multiplyScalar(SHADE);
      material.opacity = atmosphere.cloudOpacity;
      shade.opacity = atmosphere.cloudOpacity;
    },
    dispose() {
      texture.dispose();
      material.dispose();
      shade.dispose();
    },
  };
}
