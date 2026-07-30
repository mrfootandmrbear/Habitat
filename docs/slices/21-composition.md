# Slice 21 — Island biogeography (composition)

**Candidates.** **C-019** Open (hypothesis). Touches C-007 Locked, C-015, W-003, T-001, N-004. Steal: [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md) MacArthur–Wilson + new-island succession; evidence [island-colonization.md](../evidence/island-colonization.md) §4.

## Steal (rule shape only)

On island worlds (`seaLevel` set), replace mainland-perimeter seed rain with an over-water kernel. Eligible richness sizes pressure — it does not invent types (W-003 catalogue stays the universe):

```
A = land cell count (elev ≥ seaLevel)
d = authored isolation (cells; WorldState option / config default)

S_elig = S_min + (S_max − S_min) · (A / (A + A_ref)) · exp(−d / λ_d)
       // monotone: A↑ → S↑, d↑ → S↓; clamped via S_min/S_max

// Ocean cells: seedPressure = 0
// Land: seedPressure = overseasSeedBase · S_elig · exp(−distToShore / λ_overseas)
//   distToShore = 0 on shoreline (land adjacent to ocean); BFS inland
```

Mainland worlds (`seaLevel` absent) keep Slice 12 perimeter rain unchanged (baselines / golden hashes).

Establishment math is unchanged (`p = 1 − exp(−seed · HSI · scale)` → continuous biomass). Sparse empty-suitable windows come from low continuous pressure under small A / large d — not from RNG (C-003 Open).

## Ownership

| Concern | Owner |
|---|---|
| `veg.seedBank.herb` / establishment snapshot | `dispersal` (annual) — source swaps; field identity unchanged |
| Isolation parameter | Authored world option (like sea level) — not a mobile legacy field |
| HSI / arrival gate | Unchanged (habitat + vegetation seasonal) |

No species simulator. No mainland perimeter as island default. No equilibrium community paint on load.

## Paired expectation

Identical regimes and HSI setup at a shoreline sample → large island (or nearer isolation) earns more herb biomass than small (or farther). Island seed field ≠ perimeter formula. Hash-stable under same seed (T-001). Probe: `island-arrival`.

## Bans this slice

Species simulator / speciation · stochastic free weather arrivals · keeping perimeter rain as island default · instant equilibrium paint · mangrove-as-only first life · inventing catalogue types from area · resolving C-019 Locked without owner sparse-earned feel call.
