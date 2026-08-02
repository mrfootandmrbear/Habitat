# Slice — HSI curve-shape corrections (§4.46)

**Cited:** [vegetation/habitat review](../reviews/2026-07-31-vegetation-habitat-review.md) §2.1; C-007 Locked; C-011 Open; S-007 Locked; N-004.

## What was wrong

Six suitability arms were monotone ramps or hard steps where the physically correct shape is a hump or threshold-slope — and that correct shape already existed elsewhere in the same file set (`factorInundationMarsh`, `factorSalinityTolerant`). Binder burial rewarded zero remobilization and read `|longshore|` instead of transport divergence. Crust moisture peaked at saturation.

## Fixes

| Factor | Shape now |
|---|---|
| Upland inundation | Supratidal taper `clamp01(1 − 2·hydroperiod)` |
| Intolerant salinity | Threshold-slope (`herbSalinityFullThrough = 0.2`) |
| Temperature | Unimodal TPC; right-skewed upper limb to `opt + 1.5·(opt−kill)` |
| Moisture (herb/shrub) | Triangular hump peaking at half field capacity |
| Moisture (crust) | Asymmetric peak at 25% fill; 0 at bone-dry and by mid-wet |
| Binder burial | Hump on accretion `max(0, −∂Q)`; peak at `binderBurialOptimum` |
| Strand/binder exposure | Triangular hump peaking at 0.5 |
| `factorSandSubstrate` | `clamp01` on every return |

`longshoreTransportDivergence` mirrors edges so a uniform field is exactly zero burial pressure. WorldState passes divergence into `evaluateBinderHsi`.

## Tests

`src/sim/habitat/hsiCurveShape.test.ts` — unimodal/threshold, bounded [0,1], MHW taper, burial divergence, crust dry=0.

## Baselines moved (stated)

Guild arrival and HSI-dependent probes moved because suitability scores changed on the same fixtures (half-fill moisture, mid-exposure crests, TPC upper limb). Refreshed with `--write-baseline`; reason is the curve fix, not an unexplained hash drift. Conservation / hydrology-only probes that touched vegetation hashes also moved where cover couples into roughness.

## Next-but-one

§4.47 Guild cover & light-competition correctness.
