# Slice N8 — Tidal inundation hydroperiod gate (NS-008)

**Status:** Done — machine  
**Nature cards:** NS-008  
**Register:** C-016 Locked; C-018 Locked; C-007 Locked; C-011 Locked; N-004  
**New Process?** no — derives from C-016 MHW/MLW envelope + elev (no tidal phase)

## Steal

Island-colonization distinct gate — tidal inundation / hydroperiod ≠ soil.salinity ≠ spray → herb Liebig `f_inundation`. Envelope hydroperiod from elev vs MHW/MLW; upland herbs zero when hydroperiod > 0. Strand omits the arm (holds via `f_shore`). Marsh hump shipped as Slice N9 / NS-009. Rejected: collapse into salinity/moisture; instantaneous tidal phase (C-016).

## Rule

```
hydroperiod = tidalHydroperiod(elev, MLW, MHW)   // 0 above MHW; 1 at/below MLW; linear between
f_inundation = 1 if hydroperiod = 0 else 0       // upland / inland herb

HSI = min(f_moisture, f_depth, f_gw, f_salinity, f_temp, f_spray, f_inundation)
limiting = argmin (inundation id = 6)
```

No sea or tide amplitude → f_inundation = 1 (legacy inland HSI).

## Paired expectation

Identical fresh wet cell + seed schedule + zero spray → tide off earns herb; spring foreshore is inundation-limited. Salinity and exposure matched so the twin isolates hydroperiod. Probe: `inundation-arrival`.

## Bans

Inventing Locked policy · collapsing into `soil.salinity` or `f_spray` · per-event tidal phase · new Process · marsh guild this slice
