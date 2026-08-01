# Slice L4 — Biotic motion composition

**Cited:** [living-world review](../reviews/2026-07-31-living-world-review.md) §0 / §5; D-007 Locked; T-006; ART-003; ART-002; C-014 Open (adjacent); C-011 Open.

## What was actually wrong

Water smooths, clouds drift, rain slants with wind — and life was a field of **static cones**. `OccupantMesh` keyed colour and height to biomass with zero motion. The twenty-second clip read as a diorama with weather over it.

## What shipped

Presentation only — no WorldState writes (T-006).

| Piece | Role |
|---|---|
| `occupantSway.ts` | Pure sway law: amplitude from wind × guild flex × living vitality; one sine for tilt |
| `OccupantMesh` | Applies downwind lean per instance; phase from cell index; wall-clock sine |
| `livingVitality` | Standing excess under L3 (biomass > max·HSI) still draws a shoot but barely leans |

Calm wind → amplitude **0**. Storm wind lays the sward over. Shrub flexes less than herb; crust almost not at all. Motion is a **readout of forcing**, not ambient decoration (C-011).

## D-007 clip verdict

The shoots lean with the wind and go still when the dial is calm — the meadow is no longer a painted diorama under moving weather.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash. Tier-P only.

## Deferred

- Per-guild stored HSI for vitality (today cell `habitat.suitability` proxies all guilds on a cell — honest for herb, coarse for others).
- Shader-side instance attribute path — matrices already rebuild each frame; the sine lives in the pure function the mesh calls.
- **L5 / C-023** still blocked.
