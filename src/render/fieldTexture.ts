import * as THREE from "three";

/**
 * One-channel float field texture backing a Grid2D-style sim grid
 * (row-major, z * width + x). Shared by TerrainMesh / WaterMesh so a sim
 * field can be uploaded once and sampled by any shader the same way.
 */
export function createFieldTexture(
  width: number,
  height: number,
): THREE.DataTexture {
  const data = new Float32Array(width * height);
  const tex = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RedFormat,
    THREE.FloatType,
  );
  // Nearest, not linear: FloatType linear filtering isn't universally
  // supported across GPUs/drivers. Smooth sampling instead comes from the
  // manual bilinear helper in FIELD_SAMPLE_GLSL below.
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  // Pinned explicitly so row order doesn't depend on three.js's DataTexture
  // default; FIELD_SAMPLE_GLSL's fieldUv() does the row-order correction.
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

/** Upload a Grid2D-backed Float32Array (native memcpy) and flag for GPU upload. */
export function updateFieldTexture(
  tex: THREE.DataTexture,
  source: Float32Array,
): void {
  (tex.image.data as Float32Array).set(source);
  tex.needsUpdate = true;
}

/**
 * Shared GLSL: field sampling helpers reused by TerrainMesh and WaterMesh.
 *
 * - fieldUv: three.js's default PlaneGeometry V decreases with the
 *   geometry's local +Z row index; fields are uploaded row-major with
 *   increasing z, so sampling needs an explicit V flip to land on the same
 *   cell the CPU path indexes via z * width + x.
 * - sampleFieldBilinear: manual bilinear tap (see createFieldTexture note).
 * - sampleFieldNearest: single-texel tap for categorical fields (material
 *   id) where interpolating across a cell boundary would blend two ids into
 *   a value that decodes as a third, phantom substrate.
 * - fieldHeightNormal: analytic heightfield normal via central difference —
 *   replaces the CPU geometry.computeVertexNormals() pass.
 */
export const FIELD_SAMPLE_GLSL = /* glsl */ `
vec2 fieldUv(vec2 planeUv) {
  return vec2(planeUv.x, 1.0 - planeUv.y);
}

float sampleFieldNearest(sampler2D tex, vec2 uv, vec2 texSize) {
  vec2 texel = floor(uv * texSize);
  vec2 uv00 = (texel + 0.5) / texSize;
  return texture2D(tex, uv00).r;
}

float sampleFieldBilinear(sampler2D tex, vec2 uv, vec2 texSize) {
  vec2 texel = uv * texSize - 0.5;
  vec2 f = fract(texel);
  vec2 base = floor(texel);
  vec2 invSize = 1.0 / texSize;
  vec2 uv00 = (base + 0.5) * invSize;
  float s00 = texture2D(tex, uv00).r;
  float s10 = texture2D(tex, uv00 + vec2(invSize.x, 0.0)).r;
  float s01 = texture2D(tex, uv00 + vec2(0.0, invSize.y)).r;
  float s11 = texture2D(tex, uv00 + invSize).r;
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}

vec3 fieldHeightNormal(sampler2D heightTex, vec2 uv, vec2 texSize, float texelWorldSize) {
  vec2 invSize = 1.0 / texSize;
  float hL = sampleFieldBilinear(heightTex, uv - vec2(invSize.x, 0.0), texSize);
  float hR = sampleFieldBilinear(heightTex, uv + vec2(invSize.x, 0.0), texSize);
  float hD = sampleFieldBilinear(heightTex, uv - vec2(0.0, invSize.y), texSize);
  float hU = sampleFieldBilinear(heightTex, uv + vec2(0.0, invSize.y), texSize);
  float dHdx = (hR - hL) / (2.0 * texelWorldSize);
  float dHdz = (hU - hD) / (2.0 * texelWorldSize);
  return normalize(vec3(-dHdx, 1.0, -dHdz));
}
`;
