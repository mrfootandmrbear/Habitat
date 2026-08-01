/**
 * Conservative 4-neighbor outflow-flux step.
 * Off-map neighbors mirror the cell surface (no-flow, SIMULATION_MODEL §10.1),
 * except at authored / derived outlet cells where off-map is absorbing (§10.2).
 * Ocean cells (C-015): land→ocean transfers and residual ocean depth go to
 * oceanExchange rather than accumulating on the ocean store.
 *
 * Per-face flux is capped at `diff * 0.5` — transferring more than half a
 * head difference in one step would overshoot equalization and reverse the
 * sign next step (hydrology/geomorphology review §2: explicit virtual-pipe
 * schemes need a CFL-style bound or they checkerboard-slosh). Effective
 * roughness is floored at `Math.fround(baseRoughness)`: every production
 * write to `surface.roughness` (`WorldState.runVegetationStep`) is
 * `baseRoughness + physical * vegRoughnessBonus` with `physical >= 0`, so
 * real cells never fall below `baseRoughness` in exact arithmetic — but
 * `surface.roughness` is Float32Array-backed, and storing an f64 value
 * intended as exactly `baseRoughness` can round to a hair below the f64
 * constant. Flooring against the raw constant would therefore misfire on
 * ordinary bare-ground cells; flooring against its float32 rounding
 * (`Math.fround`) matches what's actually stored and only catches a
 * genuinely degenerate (zero / uninitialized) roughness input running at up
 * to 300× base flow, not the everyday case.
 */
const DX = [0, 1, 0, -1] as const;
const DZ = [-1, 0, 1, 0] as const;

export type FluxStepResult = {
  /** Water removed through perimeter / authored outlets (m depth · cell). */
  boundaryOutflow: number;
  /** Water exchanged into the ocean store (m depth · cell) — C-015. */
  oceanExchange: number;
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
  /** Cells with elev < seaLevel — absorbing ocean (C-015). */
  oceanCells?: ReadonlySet<number>,
): FluxStepResult {
  delta.fill(0);
  const n = width * height;
  let boundaryOutflow = 0;
  let oceanExchange = 0;

  for (let i = 0; i < n; i++) {
    if (oceanCells?.has(i)) continue;
    const w = water[i]!;
    if (w <= 0) continue;

    const x = i % width;
    const z = (i / width) | 0;
    const s = terrain[i]! + w;
    // `roughness` is Float32Array-backed, so a value the write path intends
    // as exactly baseRoughness can round to a hair below the f64 constant on
    // storage. Float baseRoughness itself before flooring so that rounding
    // isn't mistaken for a genuinely degenerate (near-zero) input.
    const nCell = Math.max(roughness?.[i] ?? baseRoughness, Math.fround(baseRoughness));
    const localFlow = flowRate * (baseRoughness / nCell);
    const isOutlet = outletCells?.has(i) === true;

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
        // §10.1 no-flow mirror, unless this cell is an outlet (§10.2 absorbing).
        neighborSurface = isOutlet ? terrain[i]! : s;
      } else {
        const ni = nz * width + nx;
        if (oceanCells?.has(ni)) {
          // Ocean neighbor acts as an open stage at bed elevation (absorbing).
          neighborSurface = terrain[ni]!;
        } else {
          neighborSurface = terrain[ni]! + water[ni]!;
        }
      }
      const diff = s - neighborSurface;
      if (diff > 0) {
        // CFL-style bound: never move more than what equalizes this pair.
        const d = Math.min(diff * localFlow * dt, diff * 0.5);
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
        const ni = nz * width + nx;
        if (oceanCells?.has(ni)) {
          oceanExchange += out;
        } else {
          delta[ni]! += out;
        }
      } else if (isOutlet) {
        boundaryOutflow += out;
      }
    }
    delta[i]! -= outSum;
  }

  for (let i = 0; i < n; i++) {
    if (oceanCells?.has(i)) {
      // Residual terrestrial water on ocean cells drains to the sea.
      const residual = water[i]! + delta[i]!;
      if (residual > 0) oceanExchange += residual;
      water[i] = 0;
      continue;
    }
    const next = water[i]! + delta[i]!;
    water[i] = next > 0 ? next : 0;
  }

  return { boundaryOutflow, oceanExchange };
}

/** Sum of all cell depths (m³ proxy when cell area is uniform). */
export function totalWaterVolume(water: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < water.length; i++) sum += water[i]!;
  return sum;
}

/** Build ocean cell set: elevation < seaLevel. */
export function computeOceanCells(
  elevation: Float32Array,
  seaLevel: number,
): Set<number> {
  const ocean = new Set<number>();
  for (let i = 0; i < elevation.length; i++) {
    if (elevation[i]! < seaLevel) ocean.add(i);
  }
  return ocean;
}

/** Land cells that share an edge with at least one ocean cell. */
export function computeShorelineCells(
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
): Set<number> {
  const shore = new Set<number>();
  for (const i of oceanCells) {
    const x = i % width;
    const z = (i / width) | 0;
    for (let dir = 0; dir < 4; dir++) {
      const nx = x + DX[dir]!;
      const nz = z + DZ[dir]!;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const ni = nz * width + nx;
      if (!oceanCells.has(ni)) shore.add(ni);
    }
  }
  return shore;
}
