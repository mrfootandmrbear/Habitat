# Slice 16 — Sea level + island (composition)

**Candidates.** C-015 Open (hypothesis). Touches C-004, C-011, C-012, H-002, H-004, W-002, W-004; W-001 Current supersession is owner-only.

## Sea datum

- Preserve option `seaLevel?: number` on `WorldState` (metres on the elevation datum).
- **Absent** → legacy behavior (perimeter pour points or `closedBoundary`). Existing probes and `GOLDEN_DEPTH_HASH` must not move.
- **Present** → ocean mask = `terrain.elevation < seaLevel`. Sea level sits **above** `config.elevationFloor` (default playable: sea ≈ 2 m, floor 0).

## Ocean mask and drainage

- Ocean cells are not a terrestrial surface store: rain does not land on them; any residual surface depth is moved to `ledger.oceanExchange` and cleared.
- Land cells that would transfer water into an ocean neighbor contribute that depth to `ledger.oceanExchange` instead of accumulating on the ocean cell.
- Array-edge no-flow among land cells remains; the **ocean**, not the array edge, is the physical outlet (SIM §10 rewrite).

## Priority-Flood

When `seaLevel` is set, flood fill seeds from the ocean cell set (open boundary at sea stage). Legacy perimeter-edge seeding remains when sea level is absent.

## Force dial

Sea level is a global select (low / mid / high or continuous), with **no cell arguments** — same targeting ban as rain regime (C-004 / THESIS §9).

## Mass balance (H-004)

```
precip = surface + soil + gw + et + boundaryOutflow + oceanExchange
```

`boundaryOutflow` stays for legacy perimeter outlets; island worlds use `oceanExchange`.

## Bans this slice

Waves, tides, salt, coastal erosion (C-016…C-018). SWE solvers. Negative elevations. Config-global sea level that retunes closed-basin baselines.
