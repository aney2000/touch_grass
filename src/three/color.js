// Atmosphere colours are authored in sRGB; three.js lights and shades in linear space.

export function setSrgb(color, [r, g, b]) {
  return color.setRGB(r, g, b, "srgb");
}
