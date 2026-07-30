/**
 * Shore exposure from fetch × wind (C-017 / Slice 18).
 * Rule shape from one-line coastline models — NOT a SWE solver
 * (EXTERNAL_REFERENCES ban; T-006 / GEO-002).
 *
 * exposure = onshore · saturate(fetch / fetchMax)
 * onshore  = max(0, −û · n̂_seaward) at land cells adjacent to ocean
 * fetch    = consecutive ocean cells upwind of the shore cell
 */

export type WindComponents = { ux: number; uz: number };

function saturate(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Fill `out` with [0,1] exposure. Non-shore / calm / no-ocean → 0.
 * Ban note: this is fetch geometry only — never import coastal SWE.
 */
export function fillShoreExposure(
  out: Float32Array,
  width: number,
  height: number,
  elevation: Float32Array,
  oceanCells: ReadonlySet<number>,
  wind: WindComponents,
  fetchMaxCells: number,
): void {
  out.fill(0);
  if (oceanCells.size === 0) return;
  const speed = Math.hypot(wind.ux, wind.uz);
  if (speed < 1e-9 || fetchMaxCells <= 0) return;

  const ux = wind.ux / speed;
  const uz = wind.uz / speed;
  // Prefer the dominant axis for discrete ray marches on a grid.
  const useX = Math.abs(ux) >= Math.abs(uz);
  const dx = useX ? (ux > 0 ? -1 : 1) : 0;
  const dz = useX ? 0 : uz > 0 ? -1 : 1;

  const neighbors = (i: number): number[] => {
    const x = i % width;
    const z = (i / width) | 0;
    const outN: number[] = [];
    if (z > 0) outN.push(i - width);
    if (z < height - 1) outN.push(i + width);
    if (x > 0) outN.push(i - 1);
    if (x < width - 1) outN.push(i + 1);
    return outN;
  };

  for (let i = 0; i < elevation.length; i++) {
    if (oceanCells.has(i)) continue;
    const oceanNeighbors = neighbors(i).filter((ni) => oceanCells.has(ni));
    if (oceanNeighbors.length === 0) continue;

    // Seaward unit: from land toward mean ocean-neighbor direction.
    const x = i % width;
    const z = (i / width) | 0;
    let sx = 0;
    let sz = 0;
    for (const ni of oceanNeighbors) {
      sx += (ni % width) - x;
      sz += ((ni / width) | 0) - z;
    }
    const sn = Math.hypot(sx, sz);
    if (sn < 1e-9) continue;
    const nx = sx / sn;
    const nz = sz / sn;
    // Wind blowing from sea onto land: −û · n_seaward > 0.
    const onshore = Math.max(0, -(ux * nx + uz * nz));
    if (onshore <= 0) continue;

    let fetch = 0;
    let cx = x + dx;
    let cz = z + dz;
    while (fetch < fetchMaxCells) {
      if (cx < 0 || cx >= width || cz < 0 || cz >= height) break;
      const ci = cz * width + cx;
      if (!oceanCells.has(ci)) break;
      fetch++;
      cx += dx;
      cz += dz;
    }
    if (fetch <= 0) continue;
    out[i] = onshore * saturate(fetch / fetchMaxCells);
  }
}

/** Mean exposure over cells where mask > 0 (or all land if mask empty). */
export function meanExposure(
  exposure: Float32Array,
  predicate: (i: number) => boolean,
): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < exposure.length; i++) {
    if (!predicate(i)) continue;
    sum += exposure[i]!;
    n++;
  }
  return n > 0 ? sum / n : 0;
}
