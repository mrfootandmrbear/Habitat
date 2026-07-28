import type { WorldState } from "../WorldState";
import type { HydrologyModel } from "./HydrologyModel";

/**
 * HydrologyModel view over WorldState (T-007). Heightfield flux is the Slice 1–2
 * implementation; a different backend can implement the same surface later.
 */
export class HeightfieldHydrology implements HydrologyModel {
  readonly width: number;
  readonly height: number;

  constructor(private readonly world: WorldState) {
    this.width = world.width;
    this.height = world.height;
  }

  step(dt: number): void {
    this.world.runSurfaceWaterStep(dt);
  }

  addRain(amountPerCell: number): void {
    this.world.addRain(amountPerCell);
  }

  getTerrainHeight(x: number, z: number): number {
    if (!this.world.terrain.inBounds(x, z)) return 0;
    return this.world.terrain.get(x, z);
  }

  getWaterDepth(x: number, z: number): number {
    if (!this.world.water.inBounds(x, z)) return 0;
    return this.world.water.get(x, z);
  }

  getSurfaceHeight(x: number, z: number): number {
    return this.getTerrainHeight(x, z) + this.getWaterDepth(x, z);
  }

  resetWater(): void {
    this.world.resetWater();
  }

  snapshotWaterDepth(): Float32Array {
    return new Float32Array(this.world.water.data);
  }

  setWaterDepth(x: number, z: number, depth: number): void {
    if (!this.world.water.inBounds(x, z)) return;
    this.world.water.set(x, z, depth);
  }

  fillWater(depth: number): void {
    this.world.water.fill(depth);
  }
}
