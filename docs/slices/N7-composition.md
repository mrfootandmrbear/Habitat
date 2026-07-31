# Slice N7 — Aspect light into Liebig (NS-007)

**Status:** Done — machine  
**Nature cards:** NS-007  
**Register:** C-007 Locked; C-011 Locked; N-004  
**New Process?** no — reuses `light.insolation` / `terrainInsolation` from Slice 11

## Steal

Open-sky aspect insolation → herb Liebig `f_light`. Establishment differs on north vs south faces before canopy competition. Beer–Lambert `understoryLight` stays succession-only. Rejected: folding understory into arrival HSI; hidden light multiplier without `limiting.light` (C-011).

## Rule

```
I₀ = terrainInsolation(elev, …)           // open-sky; Slice 11
I_h = sin(solarAltitude)                  // horizontal reference
f_light = clamp01(I₀ / I_h)               // 1 on flat / brighter; 0 on steep north

HSI = min(…existing, f_light)
limiting = argmin (light id = 7)
```

Omit insolation at pure-factor call sites → f_light = 1 (legacy).

## Paired expectation

Identical moisture + seed schedule → south face earns herb; steep north is light-limited (HSI 0). Moisture matched so the twin isolates aspect. Probe: `light-arrival`.

## Bans

Inventing Locked policy · understoryLight in arrival HSI · new Process · hidden light multiplier without limiting label
