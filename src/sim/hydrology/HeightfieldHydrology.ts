import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import type { HydrologyModel } from "./HydrologyModel";
import { fluxStep } from "./fluxStep";

export class HeightfieldHydrology implements HydrologyModel {
  readonly width: number;
  readonly height: number;

  private readonly terrain: Grid2D;
  private readonly water: Grid2D;
  private readonly delta: Float32Array;
  private readonly flowRate: number;
  private readonly maxOutflowFraction: number;

  constructor(
    terrain: Grid2D,
    options?: { flowRate?: number; maxOutflowFraction?: number },
  ) {
    this.width = terrain.width;
    this.height = terrain.height;
    this.terrain = terrain.clone();
    this.water = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;
  }

  step(dt: number): void {
    fluxStep(
      this.width,
      this.height,
      this.terrain.data,
      this.water.data,
      this.delta,
      dt,
      this.flowRate,
      this.maxOutflowFraction,
    );
  }

  addRain(amountPerCell: number): void {
    if (amountPerCell === 0) return;
    const data = this.water.data;
    for (let i = 0; i < data.length; i++) {
      data[i]! += amountPerCell;
    }
  }

  getTerrainHeight(x: number, z: number): number {
    if (!this.terrain.inBounds(x, z)) return 0;
    return this.terrain.get(x, z);
  }

  getWaterDepth(x: number, z: number): number {
    if (!this.water.inBounds(x, z)) return 0;
    return this.water.get(x, z);
  }

  getSurfaceHeight(x: number, z: number): number {
    return this.getTerrainHeight(x, z) + this.getWaterDepth(x, z);
  }

  resetWater(): void {
    this.water.fill(0);
  }

  getWaterDepthBuffer(): Float32Array {
    return this.water.data;
  }

  getTerrainHeightBuffer(): Float32Array {
    return this.terrain.data;
  }
}
