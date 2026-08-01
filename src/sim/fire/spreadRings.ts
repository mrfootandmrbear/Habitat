/**
 * Ring-limited fire spread front (BUILD_GUIDE §4.44; fire/fuel review §1–§3).
 *
 * The front advances a bounded number of whole cell-rings per call rather than
 * running the BFS to queue exhaustion, so a step's reach is set by a rate of
 * spread and the elapsed time rather than by the size of the connected fuel
 * region. `WorldState.runFireStep` owns the rate → ring conversion and the
 * post-front effects; this module owns only "which cells catch this step".
 *
 * Deterministic under T-001 by construction, not by accident:
 *   - the frontier is re-sorted ascending at every ring, which is what the
 *     original "sorted queue by index" comment claimed but did not do (the old
 *     queue was a plain FIFO seeded from sorted sources);
 *   - ignition of a cell is the logical OR of the spread test over every
 *     already-burning neighbour that probes it this ring, which is independent
 *     of the order neighbours are checked in.
 *
 * `claimed` gates *re-enqueuing* a cell that already caught — it is not an
 * eligibility filter. The original marked a candidate visited before testing
 * it (review §3), so a cell rejected when probed from a downslope neighbour
 * could never be re-probed from the upslope neighbour that would have carried
 * fire into it, making burn shape an artifact of scan order and leaving
 * spurious unburned cells exactly on ridgelines. Only cells that actually
 * ignite become permanently unavailable here.
 */

/** 4-neighbour offsets as (dx, dz). Order is a parameter, never a result. */
export const FIRE_NEIGHBORS: FireNeighborOffsets = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export type FireNeighborOffsets = readonly (readonly [number, number])[];

export type SpreadStrengthInput = {
  /** Fuel load of the candidate cell (kg/m²). */
  fuel: number;
  /** Soil moisture fraction of the candidate cell. */
  moisture: number;
  /** Elevation rise from the burning cell to the candidate (m). */
  riseMeters: number;
  cellSizeMeters: number;
  fuelSpreadThreshold: number;
  moistureExtinction: number;
  slopeA: number;
  slopeFactorMax: number;
};

/**
 * Spread strength for one burning-cell → candidate-cell probe.
 *
 * The slope term `e^{a·tanφ}` is clamped at `slopeFactorMax`. Unclamped it is
 * unbounded in player-sculpted relief (review §5): a near-vertical sculpted
 * face produces a factor in the thousands, which swamps both the fuel and the
 * moisture terms and turns any cliff edge into an unconditional ignition
 * source regardless of how wet it is. Real rate of spread saturates with
 * slope, so a ceiling is the physical behaviour as well as the safe one.
 */
export function fireSpreadStrength(input: SpreadStrengthInput): number {
  if (input.fuel < input.fuelSpreadThreshold) return 0;
  if (input.moisture >= input.moistureExtinction) return 0;

  const tanPhi = input.riseMeters / input.cellSizeMeters;
  const slopeFactor = Math.min(
    input.slopeFactorMax,
    Math.exp(input.slopeA * tanPhi),
  );
  const fuelFraction = Math.min(1, input.fuel / (input.fuelSpreadThreshold * 3));
  const moistureFactor = 1 - input.moisture / input.moistureExtinction;
  return fuelFraction * moistureFactor * slopeFactor;
}

export type SpreadRingsInput = {
  width: number;
  height: number;
  /** Cells alight at the start of the step, ascending index (T-001). */
  active: readonly number[];
  /** `fire.burning` — newly caught cells are set to 1 in place. */
  burning: Float32Array;
  fuel: Float32Array;
  moisture: Float32Array;
  elev: Float32Array;
  /** Whole cell-rings the front may advance this step. */
  maxRings: number;
  /** Persistent scratch, one slot per cell, compared against `stamp`. */
  claimed: Int32Array;
  /** Monotonic per-call marker — avoids re-zeroing `claimed` every step. */
  stamp: number;
  cellSizeMeters: number;
  fuelSpreadThreshold: number;
  moistureExtinction: number;
  slopeA: number;
  slopeFactorMax: number;
  spreadStrengthMin: number;
  /** Rotating this changes nothing — asserted in `fire.test.ts`. */
  neighbors?: FireNeighborOffsets;
};

/**
 * Advance the front up to `maxRings` cell-rings.
 * Returns the newly ignited cells in ring order, each ring ascending by index.
 */
export function spreadFireRings(input: SpreadRingsInput): number[] {
  const {
    width: w,
    height: h,
    burning,
    fuel,
    moisture,
    elev,
    claimed,
    stamp,
  } = input;
  const neighbors = input.neighbors ?? FIRE_NEIGHBORS;
  const ignited: number[] = [];

  // Cells already alight hold their own slot so the front cannot re-enter them.
  for (const i of input.active) claimed[i] = stamp;
  if (input.maxRings <= 0) return ignited;

  let frontier: readonly number[] = input.active;
  for (let ring = 0; ring < input.maxRings && frontier.length > 0; ring++) {
    const next: number[] = [];
    for (const ci of frontier) {
      const cx = ci % w;
      const cz = (ci - cx) / w;
      const cElev = elev[ci]!;

      for (const [ox, oz] of neighbors) {
        const nx = cx + ox;
        const nz = cz + oz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        const ni = nz * w + nx;
        if (claimed[ni] === stamp) continue;

        const strength = fireSpreadStrength({
          fuel: fuel[ni]!,
          moisture: moisture[ni]!,
          riseMeters: elev[ni]! - cElev,
          cellSizeMeters: input.cellSizeMeters,
          fuelSpreadThreshold: input.fuelSpreadThreshold,
          moistureExtinction: input.moistureExtinction,
          slopeA: input.slopeA,
          slopeFactorMax: input.slopeFactorMax,
        });
        // Failing here leaves `ni` unclaimed on purpose: another neighbour in
        // this same ring may still carry fire into it (review §3).
        if (strength <= input.spreadStrengthMin) continue;

        claimed[ni] = stamp;
        burning[ni] = 1;
        next.push(ni);
      }
    }

    next.sort((a, b) => a - b);
    for (const i of next) ignited.push(i);
    frontier = next;
  }

  return ignited;
}
