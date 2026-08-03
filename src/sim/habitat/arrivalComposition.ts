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
 * Slice L2 — 1D normalized truncated exponential dispersal kernel (C-007).
 * Weights w[k] ∝ exp(−|k| / λ), truncated at ⌈3λ⌉ (≥ 95% of the mass) and
 * normalized to sum 1, so the separable 2D product is also a unit kernel and
 * the local term is a weighted *mean* occupancy rather than an unbounded sum.
 * Deterministic: fixed accumulation order, no RNG (C-003 Open — T-001).
 */
export function localDispersalKernel(lambdaCells: number): Float32Array {
  const lambda = Math.max(lambdaCells, 1e-6);
  const radius = Math.max(1, Math.ceil(3 * lambda));
  const w = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++) {
    const v = Math.exp(-Math.abs(k) / lambda);
    w[k + radius] = v;
    sum += v;
  }
  for (let i = 0; i < w.length; i++) w[i] = w[i]! / sum;
  return w;
}

/**
 * Separable convolution of a scalar field with a 1D kernel: horizontal pass
 * into a scratch buffer, then vertical. Never reads a partially-updated cell,
 * so the result is independent of scan order — the front spreads symmetrically
 * rather than biased toward +x / +z (BUILD_GUIDE §2.1 Symmetry).
 *
 * Out-of-bounds neighbours contribute nothing while the kernel stays normalized
 * over its full support, so pressure is diluted at the map edge and across open
 * water: propagules that land off the field are lost, not reflected back.
 */
export function convolveSeparable(
  src: Float32Array,
  width: number,
  height: number,
  kernel: Float32Array,
): Float32Array {
  const radius = (kernel.length - 1) >> 1;
  const tmp = new Float32Array(src.length);
  for (let z = 0; z < height; z++) {
    const row = z * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = x + k;
        if (sx < 0 || sx >= width) continue;
        acc += src[row + sx]! * kernel[k + radius]!;
      }
      tmp[row + x] = acc;
    }
  }
  const out = new Float32Array(src.length);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const sz = z + k;
        if (sz < 0 || sz >= height) continue;
        acc += tmp[sz * width + x]! * kernel[k + radius]!;
      }
      out[z * width + x] = acc;
    }
  }
  return out;
}

/**
 * Slice L2 — local propagule pressure from standing biomass (C-007).
 * `Σ_neighbours (biomass / biomassMax) · kernel · strength`, i.e. strength ×
 * the kernel-weighted mean occupancy of the neighbourhood. Normalizing by the
 * guild's own capacity keeps `strength` guild-independent (crust caps lower
 * than herb) and bounds the term at `strength`, so local seed can never run
 * away or swamp the overseas term (C-019 guard).
 *
 * Returns a field; callers add it to the external term. Biomass is zero
 * everywhere at world start, so a fresh island still colonizes from overseas
 * alone and the founding sequence is unchanged.
 */
export function localSeedPressureField(args: {
  biomass: Float32Array;
  width: number;
  height: number;
  biomassMax: number;
  strength: number;
  meanDistanceCells: number;
}): Float32Array {
  const n = args.width * args.height;
  const out = new Float32Array(n);
  const strength = Math.max(0, args.strength);
  if (strength <= 0) return out;
  const max = Math.max(args.biomassMax, 1e-6);
  const occupancy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    occupancy[i] = clamp01(Math.max(0, args.biomass[i]!) / max);
  }
  const kernel = localDispersalKernel(args.meanDistanceCells);
  const blurred = convolveSeparable(
    occupancy,
    args.width,
    args.height,
    kernel,
  );
  for (let i = 0; i < n; i++) out[i] = strength * blurred[i]!;
  return out;
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
 * Continuous biomass toward resource-derived capacity (ES-006).
 * Capacity = biomassMax · HSI — never a fixed ecological K.
 *
 * Below capacity: establishment growth (unchanged).
 * Above capacity: first-order decline
 *   biomass -= mortalityRate · (biomass − capacity) · dt
 * so loss is fast but finite (L3 / S-007) — not an instant clamp.
 */
export function nextHerbBiomass(args: {
  biomass: number;
  seedBank: number;
  habitatSuitability: number;
  establishmentScale: number;
  establishmentRate: number;
  /** Fraction of excess closed per seasonal band when biomass > capacity. */
  mortalityRate: number;
  biomassMax: number;
  dt: number;
}): number {
  const hsi = clamp01(args.habitatSuitability);
  const capacity = Math.max(0, args.biomassMax) * hsi;
  const biomass = Math.max(0, args.biomass);
  const dt = Math.max(0, args.dt);

  if (biomass > capacity) {
    const excess = biomass - capacity;
    const declined =
      biomass - Math.max(0, args.mortalityRate) * excess * dt;
    // Euler can overshoot when m·dt > 1; never fall below capacity in one step.
    return Math.max(capacity, declined);
  }

  const p = establishmentProbability(
    args.seedBank,
    hsi,
    args.establishmentScale,
  );
  const growth = p * Math.max(0, args.establishmentRate) * dt;
  return Math.min(capacity, biomass + growth);
}

/**
 * One guild's seasonal-establishment inputs (§4.48). `suitability` is read,
 * never recomputed here — the caller is expected to source it from a field
 * an earlier band already committed (e.g. `runDispersalStep`'s annual HSI),
 * so establishment and the suitability that justified it can never drift
 * apart into two silently disagreeing numbers.
 */
export interface GuildEstablishmentInputs {
  biomass: Float32Array;
  seedBank: Float32Array;
  suitability: Float32Array;
  establishmentScale: number;
  establishmentRate: number;
  mortalityRate: number;
  biomassMax: number;
}

/**
 * Jacobi update across guilds (§4.48, closes the BUILD_GUIDE §2.1 Symmetry
 * gap): every entry reads only its own pre-call biomass plus fields already
 * committed by an earlier band, and writes only its own biomass array — no
 * entry's result depends on another entry's output this call, so `guilds`
 * may be processed in any order and every entry's result is byte-identical
 * regardless of that order. Contrast the prior Gauss-Seidel version, where
 * a later guild in the loop read a biomass array an earlier guild in the
 * same tick had already overwritten.
 */
export function applyGuildEstablishment(
  guilds: readonly GuildEstablishmentInputs[],
  dt: number,
): void {
  for (const g of guilds) {
    for (let i = 0; i < g.biomass.length; i++) {
      g.biomass[i] = nextHerbBiomass({
        biomass: g.biomass[i]!,
        seedBank: g.seedBank[i]!,
        habitatSuitability: g.suitability[i]!,
        establishmentScale: g.establishmentScale,
        establishmentRate: g.establishmentRate,
        mortalityRate: g.mortalityRate,
        biomassMax: g.biomassMax,
        dt,
      });
    }
  }
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
 * Product-complement combination of independent cover fractions:
 * `1 − Π(1 − cᵢ)` (§4.47). Overlapping canopies occlude the ground
 * multiplicatively, not additively — three guilds at 40% independent cover
 * combine to 0.784, not the clamped 1.0 an additive sum reports. Each input is
 * clamped to [0,1]; the result is bounded in [0,1] by construction (no final
 * clamp needed) and stays monotone in every component, so extra biomass keeps
 * a physical effect instead of flattening past saturation.
 */
export function combineCoverFractions(fractions: readonly number[]): number {
  let openProduct = 1;
  for (const f of fractions) {
    openProduct *= 1 - clamp01(f);
  }
  return clamp01(1 - openProduct);
}

/**
 * Local physical cover for roughness / infiltration / erosion blunting —
 * not a registered field. Herb + strand + binder + marsh + shrub + crust stack
 * (C-018 / C-009 / C-016 / Slice N10 / N11); combined by product-complement
 * (§4.47) — never dual-writes veg.cover.
 */
export function physicalCoverFrom(
  vegCover: number,
  herbBiomass: number,
  herbBiomassMax: number,
  strandBiomass = 0,
  strandBiomassMax = 1,
  binderBiomass = 0,
  binderBiomassMax = 1,
  marshBiomass = 0,
  marshBiomassMax = 1,
  shrubBiomass = 0,
  shrubBiomassMax = 1,
  crustBiomass = 0,
  crustBiomassMax = 1,
): number {
  return combineCoverFractions([
    clamp01(vegCover),
    herbCoverFraction(herbBiomass, herbBiomassMax),
    herbCoverFraction(strandBiomass, strandBiomassMax),
    herbCoverFraction(binderBiomass, binderBiomassMax),
    herbCoverFraction(marshBiomass, marshBiomassMax),
    herbCoverFraction(shrubBiomass, shrubBiomassMax),
    herbCoverFraction(crustBiomass, crustBiomassMax),
  ]);
}
