# Slice N2 — Heat dial plant gate (NS-002)

**Status:** Done — machine (C-004 / C-020 remain Open)  
**Nature cards:** NS-002  
**Register:** C-004 Open; C-020 Open; C-007 Locked; C-011 Locked; N-004  
**New Process?** no — reuses `climate.airTemperature` from atmosphere / Heat dial

## Steal

Island-colonization growing-season / frost gate → `f_temp` in Liebig HSI. One Heat dial field serves precip phase **and** plant gate (C-020 hypothesis). Rejected: hidden temperature multiplier without limiting label; second plant-climate Process.

## Rule

```
f_temp = 0 at/below herbTempKillC
f_temp = 1 at/above herbTempOptC
f_temp linear between

HSI = min(f_moisture, f_depth, f_gw, f_salinity, f_temp)
limiting = argmin (temperature id = 4)
```

Guild tolerances live in `config` (T-004). Warm Heat sits above opt so default worlds keep prior HSI.

## Paired expectation

Identical wet hollow + seed schedule → warm earns herb biomass; cold is temperature-limited (HSI 0). Mild sits between. Probe: `heat-arrival`.

## Bans

Inventing Locked C-004 / C-020 · place-targeted heat · stochastic frost while C-003 Open · temperature as health score (N-002)
