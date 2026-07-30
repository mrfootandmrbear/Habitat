# Slice 13 — Biology → physics integration

**Cited:** [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §11.1 owned physical properties; Slice 6 veg → roughness / infiltration; BUILD_GUIDE §4.9; **E-005**, F-001, ES-006, T-001, T-005, T-006, N-001, **C-007** (Locked). Study: Slice 6 `paired-storm`; Slice 12 arrival biomass as the earned input.

## Choice

Earned herb biomass changes how water moves, without a second hydrology or a second cover authority:

| Choice | Value | Why |
|---|---|---|
| Mapping | Local `physicalCover = min(1, veg.cover + herbFrac)` | Stacks arrival biomass onto moisture-grown cover for physical writes only; never dual-writes `veg.cover` |
| `herbFrac` | `clamp(veg.biomass.herb / herbBiomassMax, 0, 1)` | Same capacity scale as Slice 12 (ES-006); full max biomass ≡ unit cover-equivalent |
| Where applied | `surface.roughness` and `veg.infiltrationContribution` only | Storm path is the §4.9 Tier-M criterion; cheapest E-005 edge under SIM §11.1 |
| Owner | Same `vegetation` process reads seasonal `veg.biomass.herb` on the daily band | No inbox; biology already owns those physical fields |
| Probe twins | Matched edge distance; HSI (hence biomass) differs; `veg.cover` held at 0 for the storm | Isolates herb → physics from daily cover growth confounds |

## Equations

**Daily band — physical contribution (owner `vegetation`)**

```
herbFrac       = clamp(veg.biomass.herb / herbBiomassMax, 0, 1)
physicalCover  = min(1, veg.cover + herbFrac)   // local only — never stored as veg.cover
roughness      = baseRoughness + physicalCover · vegRoughnessBonus
infilContrib   = physicalCover · vegInfiltrationBonus
```

- `veg.cover` remains moisture-/light-grown authority (Slice 5–11). Herb does not write it.
- Zero herb biomass ⇒ `herbFrac = 0` ⇒ identical to Slice 6 (existing probes stay green).
- `physicalCover` is not a registered field; it is a local intermediate inside `runVegetationStep`.

## Field ownership

| Field | Owner | Band | Legacy | Role |
|---|---|---|---|---|
| `veg.cover` | `vegetation` | daily | no | Moisture/light cover authority — unchanged |
| `veg.biomass.herb` | `vegetation` | seasonal | no | Earned first-occupant biomass (Slice 12); read on daily for physics |
| `surface.roughness` | `vegetation` | daily | no | Manning n from `physicalCover` |
| `veg.infiltrationContribution` | `vegetation` | daily | no | Inbox contribution from `physicalCover` |
| `soil.infiltrationCapacity` | `soilWater` | daily | yes | Owner integrates vegetation contribution (unchanged) |

No new fields. No second writer of `veg.cover`. Hydrology equations unchanged.

## Deferred

- Herb → ET partition (still reads `veg.cover` alone; storm path is this slice’s criterion).
- Herb → light / LAI / fuel / geomorph cover factor.
- Beaver / `structure.obstructionHeight` / terrain elevation inbox (F-001 breadth; SIM §11.2).
- Additional functional types feeding the same `physicalCover` stack.

## Banned

- Painting `veg.cover` from HSI or from herb biomass (dual cover authority).
- A second process that owns `veg.cover` or invents parallel roughness fields.
- Changing Manning or infiltration equations in hydrology rather than contributing through vegetation-owned properties.
- Stochastic weather (C-003 Open).
- Claiming ET or light feedback in this slice’s Tier-M evidence.
