import * as THREE from "three";

/**
 * Terrain-weighted patchy snow ground-cover mask (G8).
 * Presentation-only (T-006) — reads `terrain.elevation` that already exists,
 * writes nothing back, and holds no state across calls. Not a snowpack
 * store: this only reshapes the existing `RainCueMesh.groundOpacity` hold
 * from a flat sheet into a patchy one; SWE stays off the tip.
 */

/** Deterministic 32-bit integer hash → [0, 1). No RNG (C-003 stays Open). */
function hash01(x: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Grid cells per noise lattice step — patch-sized, not per-cell static. */
const NOISE_CELL = 4;

function valueNoise(x: number, z: number): number {
  const gx = x / NOISE_CELL;
  const gz = z / NOISE_CELL;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = gx - x0;
  const fz = gz - z0;
  const n00 = hash01(x0, z0);
  const n10 = hash01(x0 + 1, z0);
  const n01 = hash01(x0, z0 + 1);
  const n11 = hash01(x0 + 1, z0 + 1);
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = n00 + (n10 - n00) * sx;
  const b = n01 + (n11 - n01) * sx;
  return a + (b - a) * sz;
}

/**
 * Snow-accumulation bias 0..1 per cell, row-major (z * width + x): higher
 * where the ground is flatter and higher-elevation (exposed ridges shed,
 * low flat ground and hollows hold), textured with patch-scale noise so it
 * reads as drifts rather than a smooth gradient or flat sheet.
 */
export function computeSnowAffinity(
  elevation: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  if (width <= 0 || height <= 0) return out;

  let elevMin = Infinity;
  let elevMax = -Infinity;
  for (let i = 0; i < elevation.length; i++) {
    const e = elevation[i]!;
    if (e < elevMin) elevMin = e;
    if (e > elevMax) elevMax = e;
  }
  const elevRange = Math.max(elevMax - elevMin, 1e-6);

  const slope = new Float32Array(width * height);
  let slopeMax = 1e-6;
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const xL = Math.max(0, x - 1);
      const xR = Math.min(width - 1, x + 1);
      const zD = Math.max(0, z - 1);
      const zU = Math.min(height - 1, z + 1);
      const dhdx =
        (elevation[z * width + xR]! - elevation[z * width + xL]!) /
        Math.max(xR - xL, 1);
      const dhdz =
        (elevation[zU * width + x]! - elevation[zD * width + x]!) /
        Math.max(zU - zD, 1);
      const s = Math.sqrt(dhdx * dhdx + dhdz * dhdz);
      slope[z * width + x] = s;
      if (s > slopeMax) slopeMax = s;
    }
  }

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      const elevNorm = (elevation[i]! - elevMin) / elevRange;
      const flatFactor = 1 - slope[i]! / slopeMax;
      const base = Math.min(1, Math.max(0, 0.5 * elevNorm + 0.5 * flatFactor));
      const patch = 0.6 + 0.4 * valueNoise(x, z);
      out[i] = Math.min(1, Math.max(0, base * patch));
    }
  }
  return out;
}

/**
 * Bakes `computeSnowAffinity` into an RGBA `DataTexture` for use as a
 * `MeshBasicMaterial.alphaMap` (three multiplies material.opacity by the
 * sampled channel, so the existing `groundOpacity` scalar still drives the
 * overall build/melt — only the per-texel weighting is new).
 *
 * Row order is flipped on write: three's default `PlaneGeometry` V
 * decreases with the geometry's local +Z row index (see `fieldTexture.ts`),
 * but the built-in alphaMap path has no custom UV flip the way the GPU
 * terrain shader does, so the flip has to happen in the data instead.
 */
export function buildSnowAffinityTexture(
  elevation: Float32Array,
  width: number,
  height: number,
): THREE.DataTexture {
  const affinity = computeSnowAffinity(elevation, width, height);
  const data = new Uint8Array(width * height * 4);
  for (let z = 0; z < height; z++) {
    const destZ = height - 1 - z;
    for (let x = 0; x < width; x++) {
      const v = Math.round(affinity[z * width + x]! * 255);
      const o = (destZ * width + x) * 4;
      data[o] = v;
      data[o + 1] = v;
      data[o + 2] = v;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
