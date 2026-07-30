# Slice 18 — Wave exposure + coastal erosion (composition)

**Candidates.** **C-017** Open (hypothesis). Touches C-015, GEO-002, T-006, C-004; uses `climate.wind` on WorldState. Ban: SWE as WorldState authority ([EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md)).

## Steal (rule shape only)

One-line coastline / fetch × wave-power → retreat rate. Habitat form:

```
fetch(cell) = ocean run length upwind of a shoreline cell (cells)
onshore    = max(0, −û · n̂_seaward)
exposure   = onshore · saturate(fetch / fetchMax)
Δh_coast   = −K_coast · exposure · dt   (soil depth and elev together)
```

No shallow-water equations. No second sediment process writing `terrain.elevation`.

## Ownership (GEO-002 / SIM §11)

- `shore.exposure` is **derived** (recomputed from elev + ocean mask + wind).
- Coastal retreat is applied **inside** `runGeomorphologyStep` — geomorphology remains the sole writer of elev/depth.
- Wind is a force dial (`setWind(ux, uz)`); geography decides which shore is bitten (C-004).

## Mass

Bedrock invariant: Δelev = Δdepth on coastal erosion (same column rule as channel erosion / berm). Displaced soil leaves to the ocean; `ledger.shoreErosion` accounts the depth·cell removed. No second writer, no SWE store.

## Encoding

Windward foreshore loses elevation / soil relative to leeward under one wind. Default view already darkens/tints via soil + foreshore; Tier-P measures paired elev/soil divergence. Inspector: `shore.exposure` optional.

## Bans this slice

SWE solvers in-tree. Coastal process that writes elev/depth directly. Cell-targeted wave painting. Longshore deposition (Slice 19). Resolving C-017 Locked without owner shore-legibility call.
