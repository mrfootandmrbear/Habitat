import type { WorldState } from "../sim/WorldState";

/**
 * Bilinear sample of a row-major (z * width + x) grid at a continuous
 * (x, z) grid-index position. Mirrors FIELD_SAMPLE_GLSL's sampleFieldBilinear
 * in fieldTexture.ts so CPU-side placement (wildlife, future occupants)
 * reads the same surface the GPU renders — no separate approximation to
 * keep in sync.
 */
export function sampleBilinear(
  grid: Float32Array,
  width: number,
  height: number,
  x: number,
  z: number,
): number {
  const cx = Math.min(Math.max(x, 0), width - 1);
  const cz = Math.min(Math.max(z, 0), height - 1);
  const x0 = Math.floor(cx);
  const z0 = Math.floor(cz);
  const x1 = Math.min(x0 + 1, width - 1);
  const z1 = Math.min(z0 + 1, height - 1);
  const fx = cx - x0;
  const fz = cz - z0;
  const i00 = z0 * width + x0;
  const i10 = z0 * width + x1;
  const i01 = z1 * width + x0;
  const i11 = z1 * width + x1;
  const a = grid[i00]! + (grid[i10]! - grid[i00]!) * fx;
  const b = grid[i01]! + (grid[i11]! - grid[i01]!) * fx;
  return a + (b - a) * fz;
}

/** Rendered terrain height at a continuous (x, z) grid position. */
export function sampleTerrainHeight(
  world: WorldState,
  x: number,
  z: number,
): number {
  return sampleBilinear(world.terrain.data, world.width, world.height, x, z);
}

/** Rendered water depth at a continuous (x, z) grid position. */
export function sampleWaterDepth(
  world: WorldState,
  x: number,
  z: number,
): number {
  return sampleBilinear(world.water.data, world.width, world.height, x, z);
}
