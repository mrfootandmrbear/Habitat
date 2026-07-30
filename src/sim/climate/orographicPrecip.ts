/**
 * Orographic precip modulation (Slice F / C-020 lite).
 * P = P₀(1 + γ·u·∇z) with land-mean normalization so the climate dial’s
 * mean depth is preserved while geography decides placement (C-004).
 * NATURAL_PROCESS_MATH §4 — study selection, not a Locked equation ID.
 */

export type WindComponents = { ux: number; uz: number };

/**
 * Fill per-cell rain depths (m). Ocean mask cells get `baseDepth` (caller
 * routes ocean precip to exchange). Calm wind → uniform `baseDepth`.
 */
export function fillOrographicRainDepths(
  out: Float32Array,
  elev: Float32Array,
  width: number,
  height: number,
  baseDepth: number,
  wind: WindComponents,
  gamma: number,
  isOcean: (i: number) => boolean,
): void {
  const n = width * height;
  if (baseDepth === 0) {
    out.fill(0);
    return;
  }
  const windMag = Math.hypot(wind.ux, wind.uz);
  if (windMag < 1e-12 || gamma === 0) {
    out.fill(baseDepth);
    return;
  }

  let landSum = 0;
  let landCount = 0;
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (isOcean(i)) {
        out[i] = baseDepth;
        continue;
      }
      const x0 = x > 0 ? elev[i - 1]! : elev[i]!;
      const x1 = x < width - 1 ? elev[i + 1]! : elev[i]!;
      const z0 = z > 0 ? elev[i - width]! : elev[i]!;
      const z1 = z < height - 1 ? elev[i + width]! : elev[i]!;
      const dx = x0 === x1 ? 0 : (x1 - x0) / (x > 0 && x < width - 1 ? 2 : 1);
      const dz = z0 === z1 ? 0 : (z1 - z0) / (z > 0 && z < height - 1 ? 2 : 1);
      const lift = wind.ux * dx + wind.uz * dz;
      const factor = Math.max(0, 1 + gamma * lift);
      out[i] = factor;
      landSum += factor;
      landCount++;
    }
  }

  const mean = landCount > 0 ? landSum / landCount : 1;
  const scale = mean > 1e-12 ? baseDepth / mean : baseDepth;
  for (let i = 0; i < n; i++) {
    if (isOcean(i)) {
      out[i] = baseDepth;
    } else {
      out[i] = out[i]! * scale;
    }
  }
}

/** Tier-P: mean soil-moisture encoding distance between two halves (0–1 scale). */
export function wetDrySideEncodingDelta(
  moistureA: number,
  moistureB: number,
  porosity: number,
): number {
  const cap = Math.max(porosity, 1e-6);
  return Math.abs(moistureA - moistureB) / cap;
}
