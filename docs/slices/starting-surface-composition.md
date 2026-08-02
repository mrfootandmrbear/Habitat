# Starting surface generation — island form + substrate mosaic

**Status:** Done — agent  
**Register:** C-006 Locked; C-015 Locked; C-009 Locked; T-001; C-011  
**New Process?** no — worldgen / presentation of the sculpting canvas (D-007 exempt)

## Defect

The default island read as a raised bedrock biscuit bisected by a hard mid-x sand|clay split:

1. `generateIsland` was a single radial dome plus a centerline gully — circular, symmetric, with surface relief mirrored into derived bedrock (`elev − uniform depth`).
2. `paintSubstrateMosaic` painted west sand / east clay at `mid-x` — the comment already reserved the seed for "future noise variants."

## Fix

- **Form:** noise-warped coast + several soft hills over a low plateau; no authored gully or deep basins (C-006 canvas).
- **Column:** `paintIslandSoilDepth` sets depth so bedrock sits on a gentle plane under the lowest land cell — hills are mostly regolith thickness.
- **Mosaic:** seeded value-noise patches with shore→sand / inland→clay bias and sparse interior rock — not a mid-x bisect.

## Evidence

- `src/sim/islandSurface.test.ts` — determinism; shoreline + land; `bedStd < elevStd · 0.75` after soil paint; coast radius std > 0.6
- `src/sim/substrate.test.ts` — both sand and clay present; hard mid-x bisect false; seed identity / divergence
- Playable path (`main.ts`) paints soil depth + mosaic on load and regenerate

## Probe baselines

Island-shape probes that hash or measure geometry from `generateIsland` may move (`island-drainage`, maritime shore family). Refresh only with stated reason — form change is intentional; conservation / determinism must still pass.

## Next-but-one

Terrain tools continue (sculpt feel); parallel tip remains **§4.46** HSI curve-shape corrections.
