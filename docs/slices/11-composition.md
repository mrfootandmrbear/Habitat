# Slice 11 — Light / succession composition

**Cited:** [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) §1.9 (slope/aspect insolation), §3.2 (Beer–Lambert light competition), §7 (seasonal response); BUILD_GUIDE §4.6; ES-001, ES-006, E-009, ART-001, T-005.

## Choice

Use one deterministic solar position and derive incoming light from each cell's terrain normal:

```
I0 = clamp(dot(surfaceNormal, sunDirection), 0, 1)
LAI = maxLAI · veg.cover
Iunderstory = I0 · exp(−k · LAI)
```

`I0`, `LAI`, and `Iunderstory` are registered, inspectable fields owned by the existing vegetation process. Terrain slope/aspect sets the light supply; canopy cover creates the Beer–Lambert feedback. Vegetation growth is multiplied by `Iunderstory`, while moisture remains an independent requirement. No stage label drives either field.

The prototype uses a fixed southern, 45° solar direction. This is a seasonal representative raster, not a sun-position clock. The existing daily vegetation owner recomputes it after terrain changes; adding a second succession engine or scheduler phase would create more authority than this slice earns.

## Why this reduced form

1. More canopy always means less understory light, giving a direct Tier-M monotonicity invariant.
2. South- and north-facing planes receive different `I0` under identical forcing, so terrain produces divergent trajectories from one rule set.
3. Fire already removes `veg.cover`; the same equation therefore gives burned cells more understory light without a scripted post-fire stage.
4. Aggregate cover is the only vegetation state currently present. Species R* competition remains later breadth; inventing pioneer/shrub/forest labels now would make authored stages authoritative and violate ES-001.

## Deferred

- Horizon shading and moving seasonal solar position (§1.9).
- Species-specific R* and shade tolerance (§3.2).
- Adding light to the Slice 9 Liebig arrival gate. The field is now available, but C-007 remains Open and this slice does not introduce species.

## Banned

- Timed or authored succession stages.
- A free-floating “health” scalar.
- A second process that also owns `veg.cover`.
- Random solar forcing or stochastic succession.
