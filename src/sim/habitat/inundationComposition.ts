/**
 * Tidal inundation / hydroperiod for Liebig HSI (C-016).
 * Derived from the MHW/MLW envelope — not a per-event tidal phase.
 * Distinct from soil.salinity (C-018) and shore.exposure spray (C-017).
 * Real-world referent: fraction of time a cell is flood-occupied by tide (N-004).
 */

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Envelope hydroperiod in [0,1]: fraction of the tidal range below MHW.
 * elev ≥ MHW → 0; elev ≤ MLW → 1; linear between. Amplitude ≤ 0 → 0.
 * No instantaneous phase (C-016).
 */
export function tidalHydroperiod(
  elevMeters: number,
  mlwMeters: number,
  mhwMeters: number,
): number {
  if (!(mhwMeters > mlwMeters)) return 0;
  if (elevMeters >= mhwMeters) return 0;
  if (elevMeters <= mlwMeters) return 1;
  return (mhwMeters - elevMeters) / (mhwMeters - mlwMeters);
}

/**
 * Upland / inland herb inundation suitability: 1 above the envelope,
 * 0 anywhere the tide regularly floods (hydroperiod > 0).
 */
export function factorInundationUpland(hydroperiod: number): number {
  return clamp01(hydroperiod) > 0 ? 0 : 1;
}

/**
 * Salt-marsh engineer inundation suitability (Slice N9): triangular hump on the
 * same envelope hydroperiod. Peaks at mid-band (0.5); dry terrace (0) and
 * deep subtidal (1) → 0. Never fold into herb Liebig (inundation-arrival).
 */
export function factorInundationMarsh(hydroperiod: number): number {
  const h = clamp01(hydroperiod);
  return clamp01(1 - 2 * Math.abs(h - 0.5));
}
