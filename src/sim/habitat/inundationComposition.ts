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
 * Marsh guilds later take a hump on the same hydroperiod (not this slice).
 */
export function factorInundationUpland(hydroperiod: number): number {
  return clamp01(hydroperiod) > 0 ? 0 : 1;
}
