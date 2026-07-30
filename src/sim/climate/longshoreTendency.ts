/**
 * Longshore tendency from wind × shore tangent (C-017 / Slice 19).
 * CEM-class one-line rule shape — NOT a SWE solver
 * (EXTERNAL_REFERENCES ban; T-006 / GEO-002).
 *
 * n̂ = seaward unit normal
 * t̂ = CCW rotate(n̂) = (−n_z, n_x)
 * Q = exposure · (û · t̂)   (signed tendency)
 *
 * Lee deposit weights (island longshore budget, integrated in geomorphology):
 *   w = max(0, û · n̂) · (1 − exposure)
 *
 * Ban note: geometry + tangent tendency only — never import coastal SWE.
 */

import type { WindComponents } from "./shoreExposure";

function neighbors4(i: number, width: number, height: number): number[] {
  const x = i % width;
  const z = (i / width) | 0;
  const out: number[] = [];
  if (z > 0) out.push(i - width);
  if (z < height - 1) out.push(i + width);
  if (x > 0) out.push(i - 1);
  if (x < width - 1) out.push(i + 1);
  return out;
}

/** Seaward unit normal from land cell toward adjacent ocean cells, or null. */
export function seawardNormal(
  i: number,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
): { nx: number; nz: number } | null {
  if (oceanCells.has(i)) return null;
  const oceanNeighbors = neighbors4(i, width, height).filter((ni) =>
    oceanCells.has(ni),
  );
  if (oceanNeighbors.length === 0) return null;
  const x = i % width;
  const z = (i / width) | 0;
  let sx = 0;
  let sz = 0;
  for (const ni of oceanNeighbors) {
    sx += (ni % width) - x;
    sz += ((ni / width) | 0) - z;
  }
  const sn = Math.hypot(sx, sz);
  if (sn < 1e-9) return null;
  return { nx: sx / sn, nz: sz / sn };
}

/**
 * Fill `out` with signed longshore tendency.
 * Requires `exposure` already filled (Slice 18). Calm / non-shore → 0.
 */
export function fillLongshoreTendency(
  out: Float32Array,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  exposure: Float32Array,
  wind: WindComponents,
): void {
  out.fill(0);
  if (oceanCells.size === 0) return;
  const speed = Math.hypot(wind.ux, wind.uz);
  if (speed < 1e-9) return;
  const ux = wind.ux / speed;
  const uz = wind.uz / speed;

  for (let i = 0; i < out.length; i++) {
    const exp = exposure[i]!;
    if (exp <= 0) continue;
    const n = seawardNormal(i, width, height, oceanCells);
    if (!n) continue;
    const tx = -n.nz;
    const tz = n.nx;
    out[i] = exp * (ux * tx + uz * tz);
  }
}

/**
 * Lee / sheltered deposit weight for shore cell `i`.
 * Positive on the downwind flank; zero on windward exposed shore.
 */
export function leeDepositWeight(
  i: number,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  exposure: Float32Array,
  wind: WindComponents,
): number {
  const speed = Math.hypot(wind.ux, wind.uz);
  if (speed < 1e-9) return 0;
  const n = seawardNormal(i, width, height, oceanCells);
  if (!n) return 0;
  const ux = wind.ux / speed;
  const uz = wind.uz / speed;
  const lee = Math.max(0, ux * n.nx + uz * n.nz);
  return lee * (1 - Math.min(1, Math.max(0, exposure[i]!)));
}

/** Mean signed tendency over cells matching predicate. */
export function meanLongshore(
  tendency: Float32Array,
  predicate: (i: number) => boolean,
): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < tendency.length; i++) {
    if (!predicate(i)) continue;
    sum += tendency[i]!;
    n++;
  }
  return n > 0 ? sum / n : 0;
}
