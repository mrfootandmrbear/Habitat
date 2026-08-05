/**
 * Substrate property table (Slice S / C-009 / T-004).
 * One infiltration + erosion law; materials differ by data, not process forks.
 * Loam matches the pre-S global knobs so existing probes keep their baselines.
 * Rock = rocky ground / lithosol — not derived bedrock (elev − depth).
 */

/** Class ids stored in soil.material (Float32 raster). */
export const SUBSTRATE_LOAM = 0;
export const SUBSTRATE_SAND = 1;
export const SUBSTRATE_CLAY = 2;
export const SUBSTRATE_ROCK = 3;

export type SubstrateId =
  | typeof SUBSTRATE_LOAM
  | typeof SUBSTRATE_SAND
  | typeof SUBSTRATE_CLAY
  | typeof SUBSTRATE_ROCK;

/** Player-depositable geological materials (loam stays the probe default). */
export const DEPOSIT_MATERIALS = [
  SUBSTRATE_SAND,
  SUBSTRATE_CLAY,
  SUBSTRATE_ROCK,
] as const;

export type DepositMaterialId = (typeof DEPOSIT_MATERIALS)[number];

export type SubstrateProps = {
  id: SubstrateId;
  name: string;
  /** Volumetric porosity — moisture capacity (m³/m³). */
  porosity: number;
  /** Base infiltration rate (m/day) before veg contribution. */
  infiltrationRate: number;
  /** Hillslope / channel erosion scale (m / decadal band) at unit forcing. */
  erosionK: number;
  /** Dry-ground BASE color for default-view encoding (Tier-P). */
  dryRgb: readonly [number, number, number];
};

/**
 * Data table — process code must look up, never hardcode sand/clay/rock constants.
 * Loam = prior config.soilPorosity / infiltrationRate / soilErosionK.
 */
export const SUBSTRATES: readonly SubstrateProps[] = [
  {
    id: SUBSTRATE_LOAM,
    name: "loam",
    porosity: 0.45,
    infiltrationRate: 0.08,
    erosionK: 0.003,
    // Warm saturated ochre-brown (gauntlet-loop C1, bar v2 point 4) — was a
    // muted 39%-saturation tan that read grey-brown against the reference set.
    // Round 2: a critic measured the rendered (lit, tonemapped) frame at
    // roughly half the reference's on-screen saturation/value despite this
    // already-boosted raw albedo — lighting + ACES eats a large fraction of
    // input chroma (RENDER_NOTES.md), so raw values run hotter than the
    // target look to compensate.
    dryRgb: [0xa6 / 255, 0x6d / 255, 0x35 / 255],
  },
  {
    id: SUBSTRATE_SAND,
    name: "sand",
    porosity: 0.35,
    infiltrationRate: 0.22,
    erosionK: 0.007,
    // Warm pale — drains and bleaches dry. Richened toward gold (C1).
    dryRgb: [0xd9 / 255, 0xb2 / 255, 0x73 / 255],
  },
  {
    id: SUBSTRATE_CLAY,
    name: "clay",
    porosity: 0.52,
    infiltrationRate: 0.025,
    erosionK: 0.0012,
    // Rust-red, holds and darkens dry — pushed more saturated (C1 round 2) to
    // read as the ochre-rust cliff face the reference set shows. A critic
    // measured the summit patch at ~42% sat/34% value on screen against the
    // reference's ~54%/52% — raw pushed further to compensate for lighting's
    // chroma loss, per the same measured-not-assumed reasoning as loam above.
    dryRgb: [0x9e / 255, 0x45 / 255, 0x18 / 255],
  },
  {
    id: SUBSTRATE_ROCK,
    name: "rock",
    porosity: 0.08,
    infiltrationRate: 0.002,
    erosionK: 0.00015,
    // Warm pale stone, not neutral grey (gauntlet-loop C1 / bar v2 point 5:
    // "no large achromatic region" — the old 5%-saturation grey was exactly
    // that). Sheds and resists; still the palest, coolest-in-relative-terms
    // substrate, just no longer colourless.
    dryRgb: [0xa6 / 255, 0x95 / 255, 0x72 / 255],
  },
] as const;

/** Upper bound for soil.moisture registry range (widest table porosity). */
export const MAX_SUBSTRATE_POROSITY = Math.max(
  ...SUBSTRATES.map((s) => s.porosity),
);

export function substrateProps(classId: number): SubstrateProps {
  const id = Math.round(classId);
  const row = SUBSTRATES.find((s) => s.id === id);
  return row ?? SUBSTRATES[SUBSTRATE_LOAM]!;
}

/**
 * Relative percolation to groundwater vs. loam (H-003 — clay's low
 * permeability perches water above it instead of draining it, the same way
 * its infiltrationRate already slows surface intake). 1 at loam so worlds
 * that never paint substrate are unaffected; clay << 1 (water lingers,
 * waterlogs, ponds); sand > 1 (drains through, dries out); rock ≈ 0 (sheds).
 * Reuses infiltrationRate rather than adding a second material column —
 * one law, data-driven (T-004), no per-material process fork (C-002).
 */
export function relativePercolation(classId: number): number {
  return (
    substrateProps(classId).infiltrationRate /
    SUBSTRATES[SUBSTRATE_LOAM]!.infiltrationRate
  );
}

function hash2(ix: number, iz: number, seed: number): number {
  let n = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ (seed | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n >>> 0) / 4294967296;
}

function valueNoise2D(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/**
 * Chebyshev distance (cells) to nearest ocean cell. Land-only; ocean → 0.
 */
function shoreDistanceField(
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
): Float32Array {
  const n = width * height;
  const dist = new Float32Array(n);
  dist.fill(1e9);
  const qx = new Int32Array(n);
  const qz = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const i of oceanCells) {
    dist[i] = 0;
    qx[tail] = i % width;
    qz[tail] = (i / width) | 0;
    tail++;
  }
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (head < tail) {
    const x = qx[head]!;
    const z = qz[head]!;
    head++;
    const i = z * width + x;
    const d0 = dist[i]!;
    for (const [dx, dz] of dirs) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const ni = nz * width + nx;
      const nd = d0 + 1;
      if (nd < dist[ni]!) {
        dist[ni] = nd;
        qx[tail] = nx;
        qz[tail] = nz;
        tail++;
      }
    }
  }
  return dist;
}

/**
 * Paint a readable sand / clay / rock mosaic on land (ocean cells stay loam).
 *
 * Seeded value-noise patches — not a hard mid-x bisect. Real-world bias:
 * sand toward the shore, clay inland, sparse rock on the farthest interior
 * rises so the starting castle reads as geology rather than a painted split.
 */
export function paintSubstrateMosaic(
  material: Float32Array,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  seed: number = 0,
  options?: { elev?: Float32Array },
): void {
  const nCell = width * height;
  if (material.length < nCell) {
    throw new Error("paintSubstrateMosaic: material shorter than grid");
  }
  const elev = options?.elev;
  if (elev !== undefined && elev.length < nCell) {
    throw new Error("paintSubstrateMosaic: elev shorter than grid");
  }

  const shore = shoreDistanceField(width, height, oceanCells);
  let maxShore = 0;
  let maxElev = 0;
  let minElev = Infinity;
  for (let i = 0; i < nCell; i++) {
    if (oceanCells.has(i)) continue;
    if (shore[i]! > maxShore) maxShore = shore[i]!;
    if (elev) {
      const e = elev[i]!;
      if (e > maxElev) maxElev = e;
      if (e < minElev) minElev = e;
    }
  }
  const elevSpan = Math.max(1e-6, maxElev - minElev);
  const noiseSeed = (seed ^ 0x85ebca6b) >>> 0;
  const hasShore = oceanCells.size > 0 && maxShore > 0;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (oceanCells.has(i)) {
        material[i] = SUBSTRATE_LOAM;
        continue;
      }

      const n1 = valueNoise2D(x / 9, z / 9, noiseSeed);
      const n2 = valueNoise2D(x / 4.5 + 3, z / 4.5, noiseSeed + 11);
      const patch = n1 * 0.65 + n2 * 0.35;

      // Shore → sand; interior → clay. Without ocean, noise alone decides.
      const inland = hasShore ? Math.min(1, shore[i]! / maxShore) : 0.45;
      let score = inland * 0.42 + patch * 0.72 - 0.38;
      if (elev) {
        const elevNorm = (elev[i]! - minElev) / elevSpan;
        score += elevNorm * 0.1;
      }

      if (
        inland > 0.7 &&
        patch > 0.82 &&
        (elev ? (elev[i]! - minElev) / elevSpan > 0.55 : patch > 0.9)
      ) {
        material[i] = SUBSTRATE_ROCK;
      } else if (score < 0.32) {
        material[i] = SUBSTRATE_SAND;
      } else {
        material[i] = SUBSTRATE_CLAY;
      }
    }
  }
}
