import { config } from "../../config";
import { Grid2D } from "../Grid2D";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iz: number, seed: number): number {
  let n = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ (seed | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]. */
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

function gaussian(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sigma: number,
  amp: number,
): number {
  const dx = (x - cx) / sigma;
  const dz = (z - cz) / sigma;
  return amp * Math.exp(-0.5 * (dx * dx + dz * dz));
}

/**
 * Broad, low island sculpting canvas (Slice F / C-015 / C-006).
 *
 * Form goals (terrain-tools pass):
 * - Asymmetric shoreline — not a perfect radial bisect.
 * - Several soft hills over a low plateau — not one raised bedrock dome.
 * - No authored centerline gully or deep basins; hollows are mostly player-made.
 *
 * Elevations stay ≥ elevationFloor; seaLevel above shelf floods the rim.
 */
export function generateIsland(
  width: number,
  height: number,
  peakHeight: number,
  seed: number,
  options?: { shelfHeight?: number },
): Grid2D {
  const terrain = new Grid2D(width, height);
  const rand = mulberry32(seed);
  const cx = (width - 1) * 0.5;
  const cz = (height - 1) * 0.5;
  const maxR = Math.min(cx, cz);
  const shelf = options?.shelfHeight ?? Math.max(config.elevationFloor, 0.4);
  // Lower castle than peakHeight — most mass is editable regolith, not a dome.
  const relief = (peakHeight - shelf) * 0.42;

  // Seeded soft hills; one broad central rise keeps an interior, the rest break
  // radial symmetry so the preserve does not read as a raised rock biscuit.
  const hills: { cx: number; cz: number; sigma: number; amp: number }[] = [
    { cx, cz, sigma: maxR * 0.52, amp: relief * 0.48 },
  ];
  for (let i = 0; i < 5; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = maxR * (0.12 + rand() * 0.48);
    hills.push({
      cx: cx + Math.cos(ang) * dist,
      cz: cz + Math.sin(ang) * dist,
      sigma: maxR * (0.16 + rand() * 0.22),
      amp: relief * (0.22 + rand() * 0.4),
    });
  }

  const coastSeed = (seed ^ 0x9e3779b9) >>> 0;
  const microSeed = (seed + 17) >>> 0;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxR;
      const dz = (z - cz) / maxR;
      const r = Math.sqrt(dx * dx + dz * dz);
      const ang = Math.atan2(dz, dx);
      // Angle-locked coast warp — lobes and bays instead of a hard circle.
      const coastWarp =
        0.14 * (valueNoise2D(Math.cos(ang) * 1.4, Math.sin(ang) * 1.4, coastSeed) * 2 - 1) +
        0.07 *
          (valueNoise2D(Math.cos(ang * 2.1) * 2.2, Math.sin(ang * 2.1) * 2.2, coastSeed + 3) *
            2 -
            1);
      const coastR = 0.9 + coastWarp;
      const land = Math.max(0, 1 - r / Math.max(0.4, coastR));
      const landSoft = land * land * (3 - 2 * land);

      // Low workable plateau + soft hills (muted off-land).
      let h = shelf + relief * 0.32 * landSoft;
      for (const hill of hills) {
        h += gaussian(x, z, hill.cx, hill.cz, hill.sigma, hill.amp) * landSoft;
      }
      // Mild micro-relief — not a centerline drainage cut.
      const micro =
        (valueNoise2D(x / 7.5, z / 7.5, microSeed) * 2 - 1) * 0.55 +
        (valueNoise2D(x / 3.5 + 4, z / 3.5, microSeed + 5) * 2 - 1) * 0.25;
      h += relief * 0.05 * micro * landSoft;

      // Soft outer skirt toward shelf so mid sea floods a coastline.
      if (r > coastR * 0.82) {
        const t = Math.max(0, Math.min(1, (1 - r / Math.max(coastR, 1e-6)) / 0.18));
        const skirt = t * t * (3 - 2 * t);
        h = shelf + (h - shelf) * skirt;
      }

      terrain.set(x, z, Math.max(config.elevationFloor, h));
    }
  }

  return terrain;
}

/**
 * Paint mobile soil depth so most surface relief sits in the regolith column
 * and derived bedrock (elev − depth) stays a gentle plane — not a raised copy
 * of the hills. Ocean cells keep a thin wet column.
 */
export function paintIslandSoilDepth(
  depth: Float32Array,
  elev: Float32Array,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  options?: {
    bedPlane?: number;
    minDepth?: number;
    maxDepth?: number;
  },
): void {
  const minD = options?.minDepth ?? 0.35;
  // Registry soil.depth range is [0, 5] — absorb as much relief as the column allows.
  const maxD = options?.maxDepth ?? 4.5;
  const nCell = width * height;
  if (depth.length < nCell || elev.length < nCell) {
    throw new Error("paintIslandSoilDepth: depth/elev shorter than grid");
  }

  let minLand = Infinity;
  let nLand = 0;
  for (let i = 0; i < nCell; i++) {
    if (oceanCells.has(i)) continue;
    const e = elev[i]!;
    nLand++;
    if (e < minLand) minLand = e;
  }
  if (nLand === 0) {
    depth.fill(minD);
    return;
  }

  // Flat bed under the lowest land cell — hills become soil thickness.
  const bed =
    options?.bedPlane ?? Math.max(config.elevationFloor, minLand);

  for (let i = 0; i < nCell; i++) {
    if (oceanCells.has(i)) {
      depth[i] = minD;
      continue;
    }
    const d = elev[i]! - bed;
    depth[i] = Math.max(minD, Math.min(maxD, d));
  }
}

/** Default playable sea level (m) — above elevationFloor, floods island shelf. */
export const DEFAULT_SEA_LEVEL_METERS = 2;
