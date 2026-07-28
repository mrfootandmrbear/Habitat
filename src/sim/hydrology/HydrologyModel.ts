import type { WaterStateView } from "../types";

/**
 * Swappable hydrology backend (T-007). Heightfield is the Slice 1 implementation;
 * a different backend can implement the same surface later.
 */
export interface HydrologyModel extends WaterStateView {
  step(dt: number): void;
  addRain(amountPerCell: number): void;
  resetWater(): void;
  /** Copy for tests and hashing — renderer must not receive live buffers (T-006). */
  snapshotWaterDepth(): Float32Array;
  setWaterDepth(x: number, z: number, depth: number): void;
  fillWater(depth: number): void;
}
