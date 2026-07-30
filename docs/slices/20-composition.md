# Slice 20 — Salinity (composition)

**Candidates.** **C-018** Open (hypothesis). Touches C-010, C-007, H-004, T-003, N-001, N-002. Steal: [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md) coastal salinity / freshening; evidence [island-colonization.md](../evidence/island-colonization.md) §3.

## Steal (rule shape only)

One mobile porewater concentration on the **existing** water column — no second salt ledger:

```
S ∈ [0, 1]     // soil.salinity; 1 = seawater-equivalent

// Ocean source (shoreline land adjacent to oceanCells):
S ← S + α·dt·(1 − S)

// Freshwater infiltrate V into storage W (salt mass conserved):
S ← S · W / (W + V)

// ET removes water depth R from storage W (salt stays):
S ← clamp01(S · W / max(W − R, ε))   // concentrate; cap at 1

// HSI gate (non-halophyte herb catalogue role):
f_salinity = 1 − S
HSI = min(f_moisture, f_depth, f_groundwater, f_salinity)
```

Spray and tidal inundation remain derived (exposure / intertidal) until a retune needs them as separate HSI inputs. Freeze-concentration and pan guilds are later multipliers on the same field.

## Ownership

- `soil.salinity` is **legacy** (T-003) — hysteresis memory; save-invalidating.
- Owner: `soilWater` (daily). Concentration rides moisture volumes; **water-balance residual unchanged** (no salt mass term on H-004).
- `habitat` reads salinity into Liebig HSI; arrival/establishment already gate on HSI (C-007). No cleanup tool (N-001). Not a biota score (N-002).

## Paired expectation

Identical elevation, moisture, depth, GW, and seed schedule → freshened hollow (S≈0) earns herb biomass; salty twin (S high) stays sparse / salt-limited. Probe: `salinity-arrival`.

## Bans this slice

Player desalinate tool · separate salt mass-balance ledger · salt-as-mangrove-theater only · scoring biota from salinity · inventing new species from salt · resolving C-018 Locked without owner S-008 legibility call.
