# Hydrology / geomorphology review — the bookkeeping is honest, the routing isn't

> **Date:** 2026-07-31
> **Role:** Advisory measurement of water and sediment routing against [sim-gap review](2026-07-30-sim-gap-review.md)'s physics inventory and H-004 (mass conservation), GEO-002 (Exner), T-001 (determinism).
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.49–§4.51.
> **Trigger:** Owner asked which other subsystems would benefit from the same scoped-expert-review treatment as the renderer; hydrology/geomorphology is the largest and most numerically dense part of the sim.
> **Companion:** [sim-gap review](2026-07-30-sim-gap-review.md), which inventoried that the physics mostly exists. This one measures whether the routing underneath it is structurally correct.
> **Scope:** `src/sim/process/{groundwaterProcess,soilWaterProcess,surfaceWaterProcess,geomorphologyProcess}.ts`, all of `src/sim/hydrology/`, non-test `src/sim/terrain/*`, `src/sim/climate/erosionRegime.ts`, `src/sim/branch.ts`, `WorldState.ts` lines 913–1082 and 1152–1387.

---

## 0. Verdict

The accounting discipline here is good: water mass is conserved across surface/soil/groundwater compartments to float noise, and the sediment ledger in the Exner-lite scheme closes with no leak or duplication — both were traced transfer-by-transfer and hold. **What's broken is structural, not accounting**, and it's upstream of everything else in this file set:

1. **Flat-filled depressions have no ε-increment, and the flat resolver creates 2-cycles.** Every lake surface Priority-Flood fills is an exact flat; the tie-break that resolves flow direction across it picks neighbors by lowest index rather than toward the pour point, which provably creates cycles on the rim of any filled depression. Channels terminate inside lakes instead of continuing through the spill, drainage accumulation is corrupted, and the corruption feeds directly into hillslope erosion forcing and the groundwater channel boost.
2. **The explicit surface-flux scheme has a negativity guard but no oscillation guard**, and a roughness floor that can amplify flow 300× if a cell's roughness field is ever zero/uninitialized.

Both are fixable without new mechanics — they're bugs in existing routing code, not missing features.

---

## 1. Flat routing breaks drainage continuity (high)

`priorityFloodFill` (`flowRouting.ts:102–104`) fills depressions to the *exact* spill level — no ε increment — despite a doc comment (`flowRouting.ts:15`) claiming "ε-style spill." Every filled lake surface is therefore a true flat. The flat resolver (`flowRouting.ts:141`, `score = drop·1e6 − ni`) then picks the lowest-index non-uphill neighbor, which does not drain toward the pour point and, worse, **provably creates 2-cycles**: on a flat, cell A's best neighbor can be lower-index cell B while B's best neighbor is lower-index A. This recurs along the low-index rim of any interior flat — filled lake floors, and the `elevationFloor`-clamped shelf both terrain generators produce.

Downstream: `computeD8Accumulation` (`flowRouting.ts:170–181`) pushes flow along directions unconditionally, so cycles double-count area and channels terminate inside lakes instead of continuing through the spill point — the drainage network is severed at every filled depression. `computeWatershedLabels` (`:212–215`) papers over each cycle by minting a spurious new sink, inflating watershed count and pushing toward the `Uint16` label overflow noted in §4. Corrupted `aNorm` (drainage area normalized) then feeds hillslope erosion forcing (`WorldState.ts:1227`) and the groundwater channel boost (`:1066`) directly — this bug is not contained to hydrology, it propagates into geomorphology and baseflow.

## 2. Surface flux has no stability limiter (high, config-conditional)

Per-face flux is `diff · localFlow · dt` (`fluxStep.ts:78`) with no cap relative to the head difference driving it. `maxOutflowFraction` (`fluxStep.ts:89`) prevents negative depth but not overshoot: two deep adjacent columns with a small surface-height difference have `available ≫ totalPositive`, so the limiter never engages, and any `localFlow·dt` exceeding roughly half per active face equilibrates past level and reverses sign next step — checkerboard sloshing, the classic failure mode of an explicit virtual-pipe scheme with no CFL-style bound.

This compounds with `localFlow = flowRate·(baseRoughness/max(n, 1e-4))` (`fluxStep.ts:51`): a zero or uninitialized roughness cell hits the `1e-4` floor and runs at **300× base flow**. Nothing reviewed enforces `n ≥ baseRoughness`, so a single bad roughness value can destabilize its neighborhood.

## 3. The fill model and the flux model disagree about which edges drain (medium)

Two related mismatches:

- **Coastal stage is bed elevation, not sea level.** `fluxStep.ts:70–72` sets an ocean neighbor's stage to `terrain[ni]` (the seabed), and Priority-Flood seeds ocean cells identically (`flowRouting.ts:72–76`, `h: elevation[i]`). Internally consistent with each other, but physically wrong: a coastal land cell sees a head difference against the *bed*, not against `seaLevel` — `seaLevel` never appears in `fluxStep` at all. Coastal wetlands over-drain (gradient overstated by the full ocean depth) and there is no marine backwater/ingress.
- **Structural vs. dynamic boundary mismatch.** `priorityFloodFill` seeds the *entire perimeter* as open (`flowRouting.ts:79–88`), so any cell whose filled path exits via an edge gets `depressionDepth = 0` — "structurally free-draining." But `fluxStep` mirrors (no-flow) at every non-outlet edge (`:64–66`), and `computePerimeterOutlets` (`:255–264`) admits only edge-minimum local minima as real outlets. Water can therefore pond dynamically in places the structural model says are free-draining, and geomorphology's ponded-cell gate (`WorldState.ts:1222`) then applies hillslope incision to cells that are actually underwater. `generateMountain`'s exactly-flat, `elevationFloor`-clamped rim is the acute case: `computePerimeterOutlets` returns empty (`flowRouting.ts:253`) → a structurally sealed bathtub, while the fill model still treats all four map edges as spillways.

## 4. Coastal erosion ignores substrate (medium)

Hillslope erosion correctly looks up `substrateProps(mat).erosionK` per cell (`WorldState.ts:1225`), giving sand (0.007) and rock (0.00015) a 47× erodibility contrast per `substrates.ts:59,77`. Coastal erosion uses a single global rate instead — `kCoast = config.shoreErosionK · erosionScale` (`WorldState.ts:1176,1232`) — so a sand shore and a rock shore retreat identically under wave attack, defeating the contrast the substrate table establishes everywhere else. The erosion-intensity dial itself is implemented correctly (scales both disturbance terms, never production — `erosionRegime.ts` neutral = 1).

## 5. Exner-lite deposition crosses drainage divides (medium)

Retained hillslope removals are pooled globally and redistributed by a weight function with no connectivity or watershed constraint (`WorldState.ts:1326–1381`). The weight (`hillslopeDeposit.ts:36`: `underCapacity·flat + basin·2 + pit`) gives a flat summit plateau a weight comparable to a 0.5 m basin (`basin·2 = 1`) — valley erosion in one watershed can measurably thicken mountaintops in another. Mass is conserved (verified independently — see §6), so "removed volume reappears in basins" holds only loosely: a nontrivial share reappears in flats that include ridgetops. Separately, redistributed mass is net of same-cell soil production (`removed = −actualDh`), which quietly under-represents transport wherever weathering partially offsets erosion.

## 6. Conservation — verified, holds

Traced explicitly rather than assumed: surface→soil infiltration (`WorldState.ts:969–975`), soil→GW recharge (`:1054–1061`), GW→surface baseflow (`:1063–1070`) are all two-sided transfers; every sink (ET at `:1019–1022`, boundary/ocean at `fluxStep.ts:107–120`) lands in a ledger rather than disappearing. `fluxStep` outflow is capped at `w·min(1, maxOutflowFraction)`, applied Jacobi-style, with ocean-directed flow ledgered not dropped — verified against negative depths (structurally impossible, `fluxStep.ts:89,123`). On the sediment side: retained mass distributes as `mobileHs·w/weightSum` summing exactly to `mobileHs`; overflow past the 5 m depth cap and the `weightSum === 0` degenerate case both correctly fall through to `shoreErosionLedger` (`WorldState.ts:1366–1370,1378–1380`). **No leak, no duplication in either budget.**

Soil production, however, is a volume source from nothing: production adds depth (`WorldState.ts:1199`) and the surface rebuilds as `bedrock + depth` (`:1250`) with bedrock never lowered — weathering creates elevation ex nihilo, bounded only by the exponential decay and a 5 m depth cap. The mirror problem: erosion floors depth at 0 (`:1236`), so once soil is stripped, erosion stops dead — the world evolves only within a ≤5 m soil skin over a frozen basement. Plausibly deliberate given the name "Exner-**lite**," but it's the single largest mass-balance asymmetry in the scheme and is currently undocumented as a design choice.

## 7. Minor findings

- Erosion is fully decoupled from actual hydrology — forcing is `K·√aNorm·slope` from static D8 cell counts (`WorldState.ts:1225–1227`); surface water depth, rainfall, and infiltration never enter. `aNorm = a/(width·height)` also makes channel forcing map-size-dependent (the same hillslope on a larger map erodes less), and `erosionK`'s stated unit ("m per decadal band," `substrates.ts:36`) silently rescales under any cadence change — the same class of hazard **C-024** already names for the biology bands.
- Groundwater: no lateral flow (accepted GWSWEX-style design, per **C-001** Locked); the recession discretization is `min(1, α·dt)` (`WorldState.ts:1046–1047`) against a comment citing `1−(1−α)^dt` — step-size-dependent recession; `channelFactor` multiplies after the ≤1 clamp (`:1066–1067`), safe only incidentally.
- Final clamp `next > 0 ? next : 0` (`fluxStep.ts:123`) creates ULP-scale mass rather than truly conserving at the floor — will show as drift under a strict conservation probe.
- `Uint16` watershed labels (`flowRouting.ts:190–191`) overflow silently past 65,535 sinks — Finding 1's cycle-minted spurious sinks push toward this ceiling on large/noisy grids.
- `geomorphologyProcess.ts:29` declares `soil.material` as written, but the deposit loops never set it — deposited sediment silently adopts the receiver cell's existing substrate identity.

---

## 8. What can ship without a candidate

All of it. Findings 1–2 are correctness bugs (cycles, missing stability bound) against already-implied invariants (§2.1 Conservation, Symmetry). Findings 3–5 are consistency gaps between two models that are each individually correct but disagree with each other or with an already-established contrast (the substrate erodibility table). Finding 6's soil-production asymmetry is the one item worth a documented design note rather than a code change — flagged, not queued, pending a one-line decision on whether "frozen bedrock" is the intended permanent shape of Exner-lite or a placeholder.

---

## 9. Suggested work order

```
Drainage flat-routing correctness (Finding 1)   — highest priority: severed drainage corrupts everything downstream of aNorm
     │
Surface-flux stability guard (Finding 2)         — independent; a CFL-style bound + roughness floor clamp
     │
Coastal base-level & substrate coupling (Findings 3+4)  — sea-level stage, substrate-aware kCoast, boundary reconciliation
```

Finding 5 (non-local deposition) and Finding 6 (soil-production asymmetry) are recorded but not yet queued — both are real but lower-severity, and Finding 6 in particular is closer to a design-note decision than a bug fix.

Queued as [BUILD_GUIDE §4.49–§4.51](../BUILD_GUIDE.md).

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.49–§4.51; [AGENTS.md](../../AGENTS.md) queue tip.
