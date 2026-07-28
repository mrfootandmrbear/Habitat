/**
 * Conservative 4-neighbor outflow-flux step.
 * Off-map neighbors mirror the cell surface (no-flow, SIMULATION_MODEL §10.1).
 */
const DX = [0, 1, 0, -1] as const;
const DZ = [-1, 0, 1, 0] as const;

export type FluxStepResult = {
  /** Water removed through authored outlets (none in Slice 2). */
  boundaryOutflow: number;
};

export function fluxStep(
  width: number,
  height: number,
  terrain: Float32Array,
  water: Float32Array,
  delta: Float32Array,
  dt: number,
  flowRate: number,
  maxOutflowFraction: number,
  outletCells?: ReadonlySet<number>,
  /**
   * Per-cell roughness (Slice 6). Higher → slower local flow.
   * Scaled relative to baseRoughness so bare land matches prior hydrology.
   */
  roughness?: Float32Array,
  baseRoughness = 0.03,
): FluxStepResult {
  delta.fill(0);
  const n = width * height;
  let boundaryOutflow = 0;

  for (let i = 0; i < n; i++) {
    const w = water[i]!;
    if (w <= 0) continue;

    const x = i % width;
    const z = (i / width) | 0;
    const s = terrain[i]! + w;
    const nCell = roughness?.[i] ?? baseRoughness;
    const localFlow = flowRate * (baseRoughness / Math.max(nCell, 1e-4));

    let d0 = 0;
    let d1 = 0;
    let d2 = 0;
    let d3 = 0;
    let totalPositive = 0;

    for (let dir = 0; dir < 4; dir++) {
      const nx = x + DX[dir]!;
      const nz = z + DZ[dir]!;
      let neighborSurface: number;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) {
        neighborSurface = s;
      } else {
        const ni = nz * width + nx;
        neighborSurface = terrain[ni]! + water[ni]!;
      }
      const diff = s - neighborSurface;
      if (diff > 0) {
        const d = diff * localFlow * dt;
        if (dir === 0) d0 = d;
        else if (dir === 1) d1 = d;
        else if (dir === 2) d2 = d;
        else d3 = d;
        totalPositive += d;
      }
    }

    if (totalPositive <= 0) continue;

    const available = w * Math.min(1, maxOutflowFraction);
    const scale = Math.min(1, available / totalPositive);
    const outs = [d0 * scale, d1 * scale, d2 * scale, d3 * scale];

    let outSum = 0;
    for (let dir = 0; dir < 4; dir++) {
      const out = outs[dir]!;
      if (out <= 0) continue;
      outSum += out;
      const nx = x + DX[dir]!;
      const nz = z + DZ[dir]!;
      if (nx >= 0 && nz >= 0 && nx < width && nz < height) {
        delta[nz * width + nx]! += out;
      } else if (outletCells?.has(i)) {
        boundaryOutflow += out;
      }
    }
    delta[i]! -= outSum;
  }

  for (let i = 0; i < n; i++) {
    const next = water[i]! + delta[i]!;
    water[i] = next > 0 ? next : 0;
  }

  return { boundaryOutflow };
}

/** Sum of all cell depths (m³ proxy when cell area is uniform). */
export function totalWaterVolume(water: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < water.length; i++) sum += water[i]!;
  return sum;
}
