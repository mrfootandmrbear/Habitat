/**
 * Analytic (unconditionally stable) updates for fuel load and fire scar (§4.45).
 * Replaces explicit Euler that made equilibrium a function of tick size.
 */

/** Olson litter: dF/dt = I − k·F → F' = F·e^(−k·dt) + (I/k)(1 − e^(−k·dt)). */
export function nextFuelLoad(
  fuel: number,
  inputRate: number,
  decayK: number,
  dt: number,
  maxFuel: number,
): number {
  const scale = Math.max(0, dt);
  if (!(scale > 0) || !(maxFuel > 0)) {
    return Math.min(maxFuel, Math.max(0, fuel));
  }
  const I = Math.max(0, inputRate);
  const k = Math.max(0, decayK);
  let next: number;
  if (k * scale < 1e-15) {
    next = fuel + I * scale;
  } else {
    const e = Math.exp(-k * scale);
    next = fuel * e + (I / k) * (1 - e);
  }
  if (!Number.isFinite(next)) next = 0;
  return Math.min(maxFuel, Math.max(0, next));
}

/** Exponential scar fade: dS/dt = −k·S → S' = S·e^(−k·dt). */
export function nextFireScar(
  scar: number,
  decayK: number,
  dt: number,
  floor = 1e-4,
): number {
  const scale = Math.max(0, dt);
  if (!(scar > 0)) return 0;
  if (!(scale > 0) || !(decayK > 0)) return scar;
  const next = scar * Math.exp(-decayK * scale);
  if (!Number.isFinite(next) || next < floor) return 0;
  return Math.min(1, Math.max(0, next));
}
