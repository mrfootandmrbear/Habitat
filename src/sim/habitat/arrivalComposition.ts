/**
 * Arrival / establishment composition (Slice 12 + Slice 21 overseas).
 * Rule: docs/slices/12-composition.md — NATURAL_PROCESS_MATH seed kernel × Liebig HSI.
 * Island: docs/slices/21-composition.md — over-water kernel × S_elig = f(A,d) (C-019).
 *
 * Continuous deterministic establishment (C-003 Open forbids stochastic arrivals).
 * Zero suitability blocks establishment (C-007 arrival gate).
 */

import { clamp01 } from "./hsiComposition";

const DX4 = [1, -1, 0, 0] as const;
const DZ4 = [0, 0, 1, -1] as const;

/** Distance in cell units from (x,z) to the nearest preserve perimeter cell. */
export function distanceToPreserveEdge(
  x: number,
  z: number,
  width: number,
  height: number,
): number {
  const dx = Math.min(x, width - 1 - x);
  const dz = Math.min(z, height - 1 - z);
  return Math.min(dx, dz);
}

/**
 * Isotropic exponential seed pressure from a fixed external perimeter source.
 * Highest at the edge, decays toward the interior. Mainland worlds only.
 */
export function seedPressureAt(
  x: number,
  z: number,
  width: number,
  height: number,
  seedSourceStrength: number,
  seedMeanDistance: number,
): number {
  const d = distanceToPreserveEdge(x, z, width, height);
  const mean = Math.max(seedMeanDistance, 1e-6);
  return seedSourceStrength * Math.exp(-d / mean);
}

/**
 * MacArthur–Wilson-shaped eligible richness multiplier (C-019).
 * Monotone in area ↑ and isolation ↓; sizes pressure, does not invent types.
 */
export function eligibleRichness(args: {
  landCells: number;
  isolationCells: number;
  areaRefCells: number;
  isolationMeanCells: number;
  sMin: number;
  sMax: number;
}): number {
  const A = Math.max(0, args.landCells);
  const Aref = Math.max(1e-6, args.areaRefCells);
  const d = Math.max(0, args.isolationCells);
  const ld = Math.max(1e-6, args.isolationMeanCells);
  const sMin = clamp01(args.sMin);
  const sMax = Math.max(sMin, Math.min(1, args.sMax));
  const areaFactor = A / (A + Aref);
  const isolationFactor = Math.exp(-d / ld);
  return sMin + (sMax - sMin) * areaFactor * isolationFactor;
}

/**
 * Shore-distance field (cells). Shoreline = 0; BFS inland on land only.
 * Ocean cells remain +Infinity (caller skips them).
 */
export function shoreDistanceField(
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  shorelineCells: ReadonlySet<number>,
): Float32Array {
  const n = width * height;
  const dist = new Float32Array(n);
  dist.fill(Number.POSITIVE_INFINITY);
  const queue: number[] = [];
  for (const i of shorelineCells) {
    if (oceanCells.has(i)) continue;
    dist[i] = 0;
    queue.push(i);
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const x = i % width;
    const z = (i / width) | 0;
    const d0 = dist[i]!;
    for (let dir = 0; dir < 4; dir++) {
      const nx = x + DX4[dir]!;
      const nz = z + DZ4[dir]!;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const ni = nz * width + nx;
      if (oceanCells.has(ni)) continue;
      const nd = d0 + 1;
      if (nd < dist[ni]!) {
        dist[ni] = nd;
        queue.push(ni);
      }
    }
  }
  return dist;
}

/**
 * Overseas seed pressure at a land cell: strength · exp(−distToShore / λ).
 * Ocean / non-finite distance → 0.
 */
export function overseasSeedPressure(
  distToShore: number,
  overseasStrength: number,
  overseasMeanDistance: number,
): number {
  if (!Number.isFinite(distToShore) || distToShore < 0) return 0;
  const mean = Math.max(overseasMeanDistance, 1e-6);
  return Math.max(0, overseasStrength) * Math.exp(-distToShore / mean);
}

/**
 * Establishment probability: p = 1 − exp(−seedBank · HSI · scale).
 * Zero HSI ⇒ zero probability.
 */
export function establishmentProbability(
  seedBank: number,
  habitatSuitability: number,
  establishmentScale: number,
): number {
  const seed = Math.max(0, seedBank);
  const hsi = clamp01(habitatSuitability);
  if (seed <= 0 || hsi <= 0) return 0;
  const scale = Math.max(0, establishmentScale);
  return 1 - Math.exp(-seed * hsi * scale);
}

/**
 * Continuous biomass increment toward resource-derived capacity (ES-006).
 * Capacity = herbBiomassMax · HSI — never a fixed ecological K.
 */
export function nextHerbBiomass(args: {
  biomass: number;
  seedBank: number;
  habitatSuitability: number;
  establishmentScale: number;
  establishmentRate: number;
  biomassMax: number;
  dt: number;
}): number {
  const hsi = clamp01(args.habitatSuitability);
  const capacity = Math.max(0, args.biomassMax) * hsi;
  const p = establishmentProbability(
    args.seedBank,
    hsi,
    args.establishmentScale,
  );
  const growth =
    p * Math.max(0, args.establishmentRate) * Math.max(0, args.dt);
  const next = Math.min(capacity, Math.max(0, args.biomass + growth));
  return next;
}

/**
 * Slice 13 — cover-equivalent from earned herb biomass for physical writes only.
 * Never dual-writes veg.cover (docs/slices/13-composition.md).
 */
export function herbCoverFraction(
  herbBiomass: number,
  herbBiomassMax: number,
): number {
  const max = Math.max(herbBiomassMax, 1e-6);
  return clamp01(Math.max(0, herbBiomass) / max);
}

/**
 * Local physical cover for roughness / infiltration — not a registered field.
 */
export function physicalCoverFrom(
  vegCover: number,
  herbBiomass: number,
  herbBiomassMax: number,
): number {
  return Math.min(
    1,
    clamp01(vegCover) + herbCoverFraction(herbBiomass, herbBiomassMax),
  );
}
