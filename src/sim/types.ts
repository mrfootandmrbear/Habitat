/** Read-only surface the renderer may observe (T-006). */
export type WaterStateView = {
  readonly width: number;
  readonly height: number;
  getTerrainHeight(x: number, z: number): number;
  getWaterDepth(x: number, z: number): number;
  getSurfaceHeight(x: number, z: number): number;
  getWaterDepthBuffer(): Float32Array;
  getTerrainHeightBuffer(): Float32Array;
};
