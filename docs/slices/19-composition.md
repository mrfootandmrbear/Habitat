# Slice 19 — Beaches / longshore deposition (composition)

**Candidates.** **C-017** Open (hypothesis; extends Slice 18). Touches C-015, GEO-002, T-006, C-004. Ban: SWE as WorldState authority ([EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md)).

## Steal (rule shape only)

CEM-class one-line longshore tendency + island sediment budget. Habitat form:

```
n̂     = seaward unit normal at shoreline land cell
t̂     = CCW rotate(n̂) = (−n_z, n_x)
Q     = exposure · (û · t̂)           // signed tendency (derived field)

// Geomorphology integrates the island longshore budget (no SWE pathline):
mobile = retain · coast_eroded_this_band
w_j    = max(0, û · n̂_j) · (1 − exposure_j)   // lee / sheltered shore
deposit_j = mobile · w_j / Σw
```

Coastal erosion from exposure (Slice 18) still removes soil at the cell. A retain fraction of that mass is **redeposited on lee shore** under the same wind; the rest leaves to the ocean ledger. No shallow-water equations. No second sediment process writing `terrain.elevation`.

## Ownership (GEO-002 / SIM §11)

- `shore.longshore` is **derived** (recomputed with exposure from elev + ocean + wind).
- Deposit and retreat apply **inside** `runGeomorphologyStep` — geomorphology remains the sole writer of elev/depth.
- Wind is a force dial; geography decides which flank scours and which receives (C-004).

## Mass

Bedrock invariant: Δelev = Δdepth on both coastal erosion and longshore deposit. Ocean share → `ledger.shoreErosion`. Retained share relocates on-island (windward loss ↔ leeward gain). No second writer, no SWE store.

## Encoding

Under one wind, windward foreshore loses elevation/soil and leeward foreshore gains relative to a calm control. Tier-P measures paired elev divergence. Inspector: `shore.longshore` optional.

## Bans this slice

SWE solvers in-tree. Coastal process that writes elev/depth directly. Cell-painted beaches. Resolving C-017 Locked without owner shore-legibility call.
