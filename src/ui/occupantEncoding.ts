/**
 * Tier-P encoding for Slice 12 first-occupant herb biomass.
 * Shoots read as bright green against bare / pre-arrival terrain.
 * Sparse overseas fringe (C-019) stays visible at low biomass; shore vs interior
 * contrast is measured via occupantEncodingDelta / shoreInteriorOccupantDelta.
 */

export type OccupantRgb = readonly [number, number, number];

const BARE: OccupantRgb = [0x8b / 255, 0x73 / 255, 0x55 / 255];
const SHOOT: OccupantRgb = [0x2e / 255, 0xc4 / 255, 0x4e / 255];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inspector / proxy color from herb biomass (kg DM·m⁻²). */
export function herbBiomassRgb(
  biomass: number,
  biomassMax: number,
): OccupantRgb {
  const t = Math.min(1, Math.max(0, biomass / Math.max(biomassMax, 1e-6)));
  // Emphasize early shoots so first arrival clears the perceptual floor.
  const u = Math.min(1, Math.sqrt(t) * 1.35);
  return [lerp(BARE[0], SHOOT[0], u), lerp(BARE[1], SHOOT[1], u), lerp(BARE[2], SHOOT[2], u)];
}

export function occupantEncodingDelta(
  beforeBiomass: number,
  afterBiomass: number,
  biomassMax: number,
): number {
  const a = herbBiomassRgb(beforeBiomass, biomassMax);
  const b = herbBiomassRgb(afterBiomass, biomassMax);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Presentation strength for instanced shoots [0,1].
 * Low threshold so sparse overseas shore fringe still shows (C-019).
 */
export function shootVisibility(biomass: number, biomassMax: number): number {
  const t = Math.min(1, Math.max(0, biomass / Math.max(biomassMax, 1e-6)));
  if (t < 0.008) return 0;
  return Math.min(1, Math.sqrt(t) * 1.35);
}

/**
 * Mean herb biomass among land cells within `shoreMaxDist` of ocean vs deeper interior.
 * Used by Tier-P proxies for overseas shore-biased arrival without a twin island.
 */
export function shoreInteriorBiomassMeans(
  biomass: Float32Array,
  elev: Float32Array,
  width: number,
  height: number,
  seaLevel: number,
  shoreMaxDist: number,
): { shore: number; interior: number; shoreN: number; interiorN: number } {
  const dist = new Float32Array(width * height);
  dist.fill(Number.POSITIVE_INFINITY);
  const queue: number[] = [];
  for (let i = 0; i < elev.length; i++) {
    if (elev[i]! < seaLevel) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const x = i % width;
    const z = (i / width) | 0;
    const d = dist[i]!;
    const nbs = [
      z > 0 ? i - width : -1,
      z < height - 1 ? i + width : -1,
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
    ];
    for (const ni of nbs) {
      if (ni < 0) continue;
      if (elev[ni]! < seaLevel) continue;
      const nd = d + 1;
      if (nd < dist[ni]!) {
        dist[ni] = nd;
        queue.push(ni);
      }
    }
  }

  let shoreSum = 0;
  let interiorSum = 0;
  let shoreN = 0;
  let interiorN = 0;
  for (let i = 0; i < elev.length; i++) {
    if (elev[i]! < seaLevel) continue;
    const d = dist[i]!;
    if (!Number.isFinite(d)) continue;
    const b = biomass[i]!;
    if (d <= shoreMaxDist) {
      shoreSum += b;
      shoreN++;
    } else {
      interiorSum += b;
      interiorN++;
    }
  }
  return {
    shore: shoreN > 0 ? shoreSum / shoreN : 0,
    interior: interiorN > 0 ? interiorSum / interiorN : 0,
    shoreN,
    interiorN,
  };
}

/** Encoding Δ between shore-fringe and interior mean biomass (C-019 Tier-P). */
export function shoreInteriorOccupantDelta(
  biomass: Float32Array,
  elev: Float32Array,
  width: number,
  height: number,
  seaLevel: number,
  biomassMax: number,
  shoreMaxDist = 2,
): number {
  const { shore, interior } = shoreInteriorBiomassMeans(
    biomass,
    elev,
    width,
    height,
    seaLevel,
    shoreMaxDist,
  );
  return occupantEncodingDelta(interior, shore, biomassMax);
}
