/**
 * Conservative 4-neighbor outflow-flux step.
 * Fixed index order; off-map surface = 0 (edge drain).
 */
const DX = [0, 1, 0, -1] as const;
const DZ = [-1, 0, 1, 0] as const;

export function fluxStep(
  width: number,
  height: number,
  terrain: Float32Array,
  water: Float32Array,
  delta: Float32Array,
  dt: number,
  flowRate: number,
  maxOutflowFraction: number,
): void {
  delta.fill(0);
  const n = width * height;

  for (let i = 0; i < n; i++) {
    const w = water[i]!;
    if (w <= 0) continue;

    const x = i % width;
    const z = (i / width) | 0;
    const s = terrain[i]! + w;

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
        neighborSurface = 0;
      } else {
        const ni = nz * width + nx;
        neighborSurface = terrain[ni]! + water[ni]!;
      }
      const diff = s - neighborSurface;
      if (diff > 0) {
        const d = diff * flowRate * dt;
        if (dir === 0) d0 = d;
        else if (dir === 1) d1 = d;
        else if (dir === 2) d2 = d;
        else d3 = d;
        totalPositive += d;
      }
    }

    if (totalPositive <= 0) continue;

    const available = Math.min(w, w * maxOutflowFraction);
    const scale = available / totalPositive;
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
      }
    }
    delta[i]! -= outSum;
  }

  for (let i = 0; i < n; i++) {
    const next = water[i]! + delta[i]!;
    water[i] = next > 0 ? next : 0;
  }
}
