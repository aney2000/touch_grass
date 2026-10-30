// Shared GLSL for small far-away things (leaves, birds): grow an instance in
// proportion to its camera distance beyond a near distance, so it keeps the
// screen size it would have there. One definition keeps both systems in step.

export const screenSizeGlsl = /* glsl */ `
  float screenSizeGrow(vec3 worldCentre, float nearDistance) {
    return max(1.0, distance(worldCentre, cameraPosition) / nearDistance);
  }
`;
