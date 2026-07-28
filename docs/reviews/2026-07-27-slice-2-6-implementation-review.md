# High-level implementation review — Slices 2–6

> **Status:** Advisory finding. Does not govern; the [Decision Register](../DECISION_REGISTER.md) does.
> **Scope:** `src/` at `d5338e1` (Slice 6 veg→water), measured against [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) and [MVP_SCOPE.md](../MVP_SCOPE.md)
> **Build state:** 46 tests green, `npm run build` clean, CI runs test + build + conformance:check
> **Date:** 2026-07-27

---

## 0. Summary

The sim MVP is real. Slice 6 closes a genuine two-way loop — soil moisture grows cover, cover owns roughness and contributes infiltration capacity, and the next storm behaves differently — and the paired tests that prove it (`veg-water.test.ts`) are behavioral rather than tautological. All four defects named in the Slice 0–1 scaffold review are fixed and carry regression tests. The dual-graph rule in MVP_SCOPE §1 has actually been followed: every landed slice names a sim edge and a game edge.

The gap is not between the code and the game. It is between the code and **SIMULATION_MODEL.md**, which is a strong document that the implementation currently cites rather than implements. Three of its load-bearing mechanisms — the mass-balance invariant, the single-writer ownership check, and the metric/temporal datum — are declared in the model, cited in comments, and absent from the build. That is the same class of defect the model itself was written to prevent (§8: "a determinism test is structurally blind to a wrong answer"), and it has already produced two measurable bugs.

Ranked findings follow. §6 is the ordered fix list.

---

## 1. Water is not conserved once soil exists — H-004, §8.2

`WorldState.runSoilWaterStep` evaporates moisture (`WorldState.ts:165`) and writes it nowhere. There is no `ledger.et`. SIMULATION_MODEL §8.2 states the water balance as a binding invariant with a tolerance of 1e-6 per event step; the current build has no such test and would fail it by five orders of magnitude.

Measured — 16×16, uniform rain, three simulated days:

```
precipitation in : 276.48
surface + soil + outflow : 267.26
unaccounted : 9.22  (3.3% of input)
```

The two existing conservation tests do not catch this. `hydrology.determinism.test.ts:203` runs 40 event steps and `veg-water.test.ts:76` runs 30; `dailyEventSteps` is 360, so **neither test ever crosses a daily band boundary**, and the daily band is where the leak is. This is precisely §8's structural-blindness failure mode reproduced in a new place: the tests are correct about the band they exercise and silent about the one they do not.

H-004 makes the watershed a memory system. A system that silently loses mass cannot be one.

**Fix.** Register `ledger.et`. Accumulate the evaporated depth into it. Add a conservation test spanning ≥ 2 daily bands with the full §8.2 sum. One hour of work; it converts a declared invariant into an enforced one.

---

## 2. The single-writer rule is declared, unenforced, and already violated — §4, §5

`soilWaterProcess` declares `writes: ["soil.moisture", "soil.infiltrationCapacity"]`. Its implementation decrements `water.surfaceDepth` (`WorldState.ts:160`) — a field the registry assigns to `surfaceWater`. `addRain` writes the same field under a `climate` ledger with no climate process behind it.

The root cause is structural, not a slip. Every process is an empty shell:

```ts
step(world, dt) { world.runSoilWaterStep(dt); }
```

All simulation logic lives in `WorldState`, which owns and writes every buffer. `reads` / `writes` / `contributes` / `lagged` are therefore comments — accurate today because someone kept them accurate, with nothing that notices when they stop being. §4 promised the opposite: *"Ownership is checkable rather than conventional… a build-time pass verifies that every write target is owned by the writing process."* That pass does not exist, and the declarations have already drifted from the code.

The scheduler has the same shape of gap: `scheduler.ts:10` sorts processes by `id` alphabetically. §5.1 specifies a topological sort of the declared dependency graph with `id` only as the tie-break. The alphabetical order happens to be correct right now (`soilWater` → `surfaceWater` → `vegetation` puts capacity integration before the vegetation step that feeds it) — which is worse than being wrong, because it will keep being accidentally correct until it isn't.

**Fix.** Write the ownership check as a test over the process table (~20 lines). It will fail immediately on the `water.surfaceDepth` write; resolve that either by routing infiltration's surface debit through an inbox drained by `surfaceWater`, or by an explicit `contributes` declaration. Defer the real topological sort until a fourth process exists, but write it then rather than adding a fourth `id` that sorts correctly by luck.

---

## 3. Flow-structure recompute is O(n²) and already blocks the UI — §7.2

`computeD8Accumulation` (`flowRouting.ts:56`) iterates all *n* cells inside a loop over all *n* cells to find donors. `applyTerrainBrush` calls `recomputeFlowStructure()` synchronously on every berm or dig click.

Measured, single berm stroke:

| Grid | Recompute |
|---|---|
| 96 × 96 (current) | **188 ms** |
| 128 × 128 | 589 ms |
| 256 × 256 (SIMULATION_MODEL §2 target) | **9 509 ms** |

188 ms per click is already a perceptible hitch on the siting verb that A-005 is being judged on. At the model's declared working default the tool is unusable.

**Fix.** Two independent changes, both small:
1. Replace the inner donor scan with a single pass in descending-elevation order that pushes accumulation into each cell's receiver. Same result, O(n log n), and it deletes the inner loop rather than optimizing it. Tie-break the sort by index explicitly rather than relying on sort stability.
2. Honor §7.2: mark structure dirty on a terrain write and recompute at the next daily boundary, not inside the pointer handler.

---

## 4. The watershed layer is 77% noise — W-002

`generateMountain` clamps elevation at 0, leaving a flat outer plateau, and `computeD8FlowDirection` requires a strictly positive drop, so every flat cell becomes its own sink. At the shipping config:

```
distinct watershed labels : 262
labels of size 1          : 201
largest basins            : 1595, 1334, 1202, 903, 658
```

The five real basins are there. Everything else is speckle. W-002 permits a scenario objective to reference an inferred region "only when its ecological basis is inspectable" — today it is not. This also bears directly on P-006: prediction targets where water *pools*, and depression handling is what decides that.

Related, same root: `applyTerrainBrush` clamps at `Math.max(0, next)`. §2 says the datum is a label, never a physical boundary. A dig near the basin floor silently does nothing — the §1.3 scaffold defect (drainage governed by absolute elevation zero) re-expressed in the siting tool.

**Fix.** Promote Slice 4b (Priority-Flood depressions) from *Optional* to required before Slice 7, and add flat resolution. Remove the zero clamp from the brush and from `generateMountain`; let the preserve declare its own `zMin`.

---

## 5. Units are aspirational — §2, §6.1, §6.5

The registry declares `m³/m³`, `Manning n`, `m/step`. The world is 96 cells over 48 unitless units, `simDt = 1/60`, and a "day" is 360 event steps. SIMULATION_MODEL §2 and §6.1 are both explicit that no physical constant may be tuned before Δx is metric and the clock is an integer count of sim-minutes — *"a constant chosen against a Δt that is about to change by 15× is a constant chosen against nothing"* (§6.5).

Slices 4–6 have since tuned eight of them: `soilPorosity`, `infiltrationRate`, `etRate`, `baseRoughness`, `vegRoughnessBonus`, `vegInfiltrationBonus`, `vegGrowthRate`, `vegMoistureThreshold`.

This is the highest-leverage item in the review, and it is a scheduling problem rather than a bug. Every playtest Pass recorded so far is a verdict on numbers that must all change, and the recorded Pass verdicts are the project's stated gate for continuing. The cost of the metric pass is roughly a day now; after Slice 9 it is a day plus re-validating every playtest and every golden hash.

**Fix, in this order.** Declare Δx = 10 m and the metric world extent. Switch `SimClock` to integer sim-minutes on the 360-day calendar. Settle §6.5's event-Δt fork — **default: option 1, 15 sim-minutes**, which is the cheapest, keeps the ladder nesting exactly (96/day), and composes with option 4 later if storms need locality. Then re-tune the eight constants and re-cut the golden hash. Do this before Slice 7, not after.

---

## 6. Smaller items

**Ledgers are duplicated state.** `precipitationLedger` and friends exist as class fields *and* as registry scalars, reconciled by `syncLedgers()` on every mutation (`WorldState.ts:363`). Two sources of truth for exactly the fields §8.2's invariant is stated against; a writer that forgets the sync makes the state hash lie. Make the registry scalar the only storage, or expose the class field through a getter.

**Band phase is not state.** `eventStepsSinceDaily` is private, unregistered, and unhashed. §12 requires `clock.tick` and band phase in the save. Cheap now; a save-compatibility bug the day P-005 lands.

**Registry is a hash driver, not the enforcement point §3 designed.** No `range` (so §8.1's bounds/NaN check cannot exist), no `inspect` metadata (§13.6 made it a registration requirement precisely so T-005 is true by construction), no `accumulator`, no inbox declaration. Add `range` plus the dev-build bounds check first — it is the one that catches real bugs, and NaN should be a hard failure rather than a clamp.

**Symmetry is the missing invariant.** Of §8's seven classes, refinement and equilibrium are implemented, mass is partial and blind (§1 above), monotonicity is implicit in the paired veg tests, and bounds, symmetry and structural agreement are absent. Symmetry (§8.6) is the one worth adding now: `fluxStep` is delta-accumulated and the veg/soil loops are cell-local, so it should pass today — which is exactly when to commit it, before the first genuinely neighbor-coupled process (dispersal, fire spread) lands and makes the bias look like terrain.

---

## 7. Documentation and process

The doc-to-code ratio (4 254 : 2 911 lines) is appropriate to this project's method and is not a finding by itself. Three specific costs are, though:

**The conformance ledger asserts a verification that isn't happening.** All 101 rows read `Verified: 2cac63e` — six commits stale — and CI's `conformance:check` passes anyway, so the column currently certifies nothing while looking like it certifies everything. Either regenerate the ledger as part of CI, or drop the column until it means something.

**Register §0.4 has no remaining consumer.** The v1.1 identifier-migration tables are ~40 lines of archaeology and nothing in the repo cites a v1.1 ID. Suggest relocating §0.4 to an appendix so §0's governance rules — the part that is used constantly — reads in one screen. Content preserved, no supersession needed (§0.6 revision-log entry only).

**PLAYER_INTERACTION_SPEC.md is overdue.** Register §17 and MVP_SCOPE §7 both name it as the owner of "detailed verbs and prediction UX," and Slices 5a and 5b shipped both without it. A-005 and P-006 are both Current with *unfamiliar-viewer* promotion criteria; without a spec stating what the preview is supposed to communicate, a viewer session can only report a reaction, not a pass or fail against an intent.

**Playtest records are thinning.** PLAYTEST_SLICE4 is 98 lines with a register list and a scored rubric. SLICE5, 5A and 6 are 21–22 lines with a two-row table, and SLICE6 records its Pass verdict *inside the rubric* rather than as an observation. The fun gate (MVP_SCOPE §6) is the project's only stated stop condition for adding systems; it is worth keeping the instrument sharp. Suggest each playtest file gain a dated "what actually happened" section written after the run, with MVP_SCOPE's status table citing it.

---

## 8. Ordered fix list

Sequenced so that each item is cheaper than the one after it and nothing later invalidates anything earlier.

| # | Fix | Register / model | Est. |
|---|---|---|---|
| 1 | `ledger.et` + multi-day conservation test | H-004, §8.2 | 1 h |
| 2 | Single-pass D8 accumulation; recompute at band boundary | §7.2 | 1 h |
| 3 | Ownership test over the process table; fix the `water.surfaceDepth` write it finds | §4, §5 | 2 h |
| 4 | Field `range` + dev bounds/NaN check at band commit | §8.1, T-005 | 1 h |
| 5 | **Metric pass** — Δx = 10 m, integer sim-minute clock, event Δt = 15 min, re-tune, re-cut golden | §2, §6.1, §6.5, S-009 | 1 d |
| 6 | Priority-Flood depressions + flat resolution (promote Slice 4b) | W-002, H-003 | 0.5 d |
| 7 | Symmetry invariant test | §8.6 | 1 h |
| 8 | Single-source the ledgers; register clock tick and band phase | §12, T-003 | 1 h |

Items 1–4 are half a day together and all of them are enforcement that should have shipped with the slices they guard. Item 5 is the one that decides whether Slice 7 starts on a real datum or inherits an arbitrary one.

Documentation items (ledger regeneration, §0.4 relocation, PLAYER_INTERACTION_SPEC, playtest records) are independent of the code queue and can proceed in parallel.
