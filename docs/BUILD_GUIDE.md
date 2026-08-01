# Habitat — Build Guide

> **Status:** Working draft  
> **Role:** Per-slice execution checklists for the joint sim/game ladder in [MVP_SCOPE.md](MVP_SCOPE.md)  
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md) and MVP_SCOPE. Architecture: [SIMULATION_MODEL.md](SIMULATION_MODEL.md). Evidence: [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md). Who verifies what: [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md). Study-not-ship: [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). Advisory origin: [reviews/2026-07-27-incremental-world-building-report.md](reviews/2026-07-27-incremental-world-building-report.md).

---

## 1. How to use this guide

1. Read **§4.0 Autonomous session protocol** before starting work.  
2. Pick the next open checklist in §4 (respect MVP_SCOPE fun gate for owner asks).  
3. Do not start the next slice until **Definition of done** (§2) is satisfied.  
4. After merge: `npm test`, `npm run conformance`, update golden hashes if physics intentionally changed.  
5. Every steal from [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) must cite a register ID or candidate (**C-001**…); bans cite the fight (T-001, T-006, T-007, GEO-002).

**Before requesting a playtest**, pass the ask gate in [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) §4. Anything settled by a number is the agent's to settle; owner sessions are for attention, legibility, and taste.

Standing commands:

```bash
npm test
npm run build
npm run conformance             # regenerate ledger
npm run conformance:check       # CI
npm run probe -- <scenario>     # Tier-M scenario evidence (rewrites baseline-compared table)
npm run probe -- --all --check  # CI: every scenario vs committed baseline, non-zero on drift
npm run dev                     # playtest (owner only after ask gate)
```

The four green-bar commands (`test`, `build`, `conformance:check`, `probe -- --all --check`) are the session gate in §4.0 step 3. Alias: `npm run gate` (CI runs `gate`).

---

## 2. Definition of done (every slice)

A slice is complete only when all hold:

| # | Requirement | Notes |
|---|---|---|
| 1 | **Named loops** | One sim edge and one game edge stated in one sentence each (or “infrastructure” for sim). |
| 2 | **Observable** | Signal is encoded strongly enough to see without an inspector. Agent proves the encoded delta (VERIFICATION_POLICY Tier P); owner answers only whether they noticed it. |
| 3 | **Determinism** | Golden hash (or registry hash) committed; intentional physics changes update it deliberately (T-001). |
| 4 | **Invariant** | Named class from §2.1 — not the same as determinism. |
| 5 | **Inspector** | New authoritative fields registered and inspectable (T-005), if the registry exists. |
| 6 | **Notebook seed** | One sentence the Field Notebook *could* later say honestly (U-006). May be recorded in the PR even if U-006 UI does not exist. |
| 7 | **Register citations** | Code/docs cite IDs; unknown IDs fail conformance; new implicit decisions filed as candidates. |
| 8 | **Owner play** | Required **only** when the slice produces an owner-only question ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) Tier O). Infrastructure / hygiene / perf slices satisfy this row by stating “no owner-only question; deferred to \<next observable slice\>”. If there is one, pass the §4 ask gate first and write the request per §5. |
| 9 | **Slice manifest** | `docs/slices/<slice>.json` declares register IDs, invariant class, test files, probe scenario(s), notebook seed, and the Tier-O field (a question or the literal deferral sentence). `conformance:check` validates the named artifacts exist. A slice is not checked off in §3 until its manifest validates. |
| 10 | **Queue stays two deep** | Before closing a slice, the **next-but-one** slice is specified to §4.3 depth (loops, register/candidate IDs, study source, bans, checklist). A session must never finish with only one executable item ahead of it. |

### 2.1 Invariant classes (pick deliberately)

| Class | Catches |
|---|---|
| Conservation | Mass leak / silent boundary drain |
| Refinement | Dead `dt` / non-convergent schedules |
| Monotonicity | Wrong causal direction |
| Bounds | NaN / out-of-range registry fields |
| Equilibrium | Ringing / unstable ponds |
| Symmetry | Update-order / index-order bias |
| Write isolation | Observers (prediction, inspect) mutate sim (P-006, T-006) |

---

## 3. Completed slices (MVP + post-MVP Tier-M)

Summary only — do not reopen unless fixing regressions.

| Slice | Sim | Game | Key artifacts | Invariants / gate |
|---|---|---|---|---|
| 0–1 | Heightfield hydrology scaffold | Observe rain / pool | `fluxStep`, WaterMesh | Determinism |
| 2 | WorldState, registry, no-flow, SimClock | Pause / 1× / 4× / 16× | `WorldState`, `SimClock`, CI | Conservation, S-009 |
| 3 | Terrain → watershed / accumulation | Inspector: accumulation / watershed | `flowRouting.ts` | Accumulation ≥ 1 |
| 4 | Surface → soil moisture | Ground darkens | `soilWaterProcess` | **Pass** |
| 4b | Priority-Flood depressions | Honest ponds | `pitDem.ts`, `basin-fill` probe | Agent Tier-M |
| 5a | — (observer) | Predict water (P-006) | `PredictionSession` | Write isolation **Pass** |
| 5b | Terrain edit (berm/dig) | Site a cause (A-005) | siting tools | **Pass** (open: one-tool park — §4.1) |
| 5 | Soil → vegetation | Green follows wet | `vegetationProcess` | **Pass** |
| 6 | Veg → roughness / infil → water | Cover blunts storm | paired-storm probe | **Pass** (sim MVP) |
| §4.1 hygiene | Ledgers, D8, metric clock, bounds, symmetry | — | probes | Agent-only |
| P (§4.2) | Observers / FX only | Volume without voxels | cage, cursor, flow cues | Tier-P; Tier-O subsumed into batch-living-return (**Pass** 2026-07-30) |
| 8 | Soil depth legacy + geomorphology | Thin soil holds less | `save.ts`, `geomorphologyProcess` | Tier-M; Tier-O erosion deferred |
| 8b | Soil ↔ GW ↔ baseflow (C-001 Locked) | Channels seep after storms | `groundwaterProcess`, `baseflow-persist` | Tier-M conservation |
| 8c | Observers + rain regime + form memory | Return visit then→now | `rainRegime`, `regime-divergence` | **Done** — Tier-O Pass (batch 2026-07-30) |
| 9 | Liebig HSI / limiting factor | Inspect what holds a patch back | `hsiComposition`, `limiting-shift` | Tier-M; Tier-O deferred |
| 10 | Fire / fuel (Olson + BFS) | Authored ignition; wet resists | `fireProcess`, `burn-recover` | Tier-M; Tier-O deferred |
| 11 | Slope/aspect + Beer–Lambert light | Same rules, different succession trajectories | `lightCompetition`, `succession-diverge` | Tier-M + Tier-P; Tier-O deferred |
| drydown | Insolation × cover ET partitions | World dries unevenly after rain | `evapotranspiration`, `drydown-feedback` | Tier-M + Tier-P; audio wired |
| A | Audio scaffold (observer) | Water ambient + silence-as-signal | `AudioBus`, C-014 dossier | Agent Done; C-014 Open |
| 12 | Arrival / first occupant (C-007) | Shoots appear where conditions suit | `dispersalProcess`, `arrival-earned` | **Done** — C-007 Locked |
| 13 | Biology → physics (E-005) | Living hollow blunts the next storm | `physicalCover`, `living-hollow` | **Done** — Tier-O Pass (batch 2026-07-30) |
| 14 | Scenario objective scaffold (G-002) | Finite objective over same loop | `ScenarioSession`, `scenario-window` | **Done** — Tier-O Pass (batch 2026-07-30) |
| **16** | Sea level + island (**C-015**) | Shape an island; sea is the outlet | `generateIsland`, `ledger.oceanExchange` | **Done** — Tier-O Pass (batch 2026-07-30) |
| **15** | Scenario brief chrome | Accept a brief on the island world | Scenario UI observer | **Done** — Tier-O Pass (batch 2026-07-30) |
| **F** | Force panel + climate-mean rain + orographic wind (**C-020** lite) | Sculpt island · set forces · watch the place | `FORCE_PANEL`, `orographicPrecip`, `orographic-wind` | **Done** — agent (no Tier-O) |
| **17** | Tidal envelope / intertidal (**C-016**) | Widen tide → shore band grows | `tidalEnvelope`, `shore.intertidal`, `tidal-envelope` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **18** | Wave exposure + coastal erosion (**C-017**) | Windward shore retreats via geomorphology | `shoreExposure`, `shore-exposure` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **19** | Beaches / longshore deposition (**C-017**) | Windward scours; lee receives | `longshoreTendency`, `longshore-drift` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **20** | Salinity (**C-018**) | Freshened vs salty hollow | `soil.salinity`, `salinity-arrival` | **Done** — Tier-O Pass (batch-salt-overseas 2026-07-30) |
| **21** | Island biogeography (**C-019**) | Overseas arrival; small vs large island | overseas kernel, `island-arrival` | **Done** — Tier-O Pass (batch-salt-overseas 2026-07-30) |
| **S** | Substrate contrast (**C-009**) | Sand / clay / rock; geological deposit | `substrates.ts`, `substrate-contrast`, `substrate-deposit` | **Done** — owner Lock 2026-07-30 |
| **R** | Rain-feel mid-path (**C-020**) | Shower cadence + precip cue | `rainRegime` wetFraction, `RainCueMesh` | **Done** — D-007 clip Pass 2026-07-30 (full C-020 shipped later at §4.21) |
| **A+** | Recovery audible (**AUD-003**) | `veg.cover` → `ambient.life` | `AudioBus` life bed, `audio.test.ts` | **Done** — agent (C-014 still Open) |
| — | Full C-020 clouds / precip phase | Atmosphere Process + Heat dial | `climate.*`, `cloud-delivery`, `CloudMesh` | **Done** — **C-020 Locked** v2.0.13 |
| **N** | Salt-memory encoding (**NS-006**) | Freshened green vs salty pale sparse | `saltMemoryEncodingDelta` | **Done** — clip Pass (C-018 Q-A) |
| **N2** | Heat→plant gate (**NS-002**) | Cold stalls wet hollow; warm establishes | `f_temp`, `heat-arrival` | **Done** — agent (shipped under then-Open C-004 / C-020; both now **Locked**) |
| **N4** | Strand splash pioneer (**NS-004**) | Salty shore mats vs inland herb | `veg.*.strand`, `strand-arrival` | **Done** — agent (C-018 / C-019 **Locked**) |
| **N3** | Onshore spray stress (**NS-003**) | Windward stalls herb; strand holds | `f_spray`, `spray-arrival` | **Done** — agent (C-017 **Locked**) |
| **N5** | Sandy crest sand-binder (**NS-005**) | Dry sand crest binds; blunts storm | `veg.*.binder`, `binder-arrival` | **Done** — agent (C-009 / C-017 **Locked**) |
| **N8** | Tidal inundation (**NS-008**) | Foreshore stalls herb; terrace earns | `f_inundation`, `inundation-arrival` | **Done** — agent (C-016 **Locked**) |
| **N7** | Aspect light into Liebig (**NS-007**) | South earns; steep north light-limited | `f_light`, `light-arrival` | **Done** — agent (**C-007 Locked**; C-011 Open) |
| **N9** | Salt-marsh engineer (**NS-009**) | Mid-foreshore marsh; dry terrace herb | `veg.*.marsh`, `marsh-arrival` | **Done** — agent (C-016 **Locked**) |
| **N10** | Climate-capped woody shrub (**NS-010**) | Warm herb hollow escalates; cold/bare stall | `veg.*.shrub`, `shrub-arrival` | **Done** — agent (C-007 / NS-002) |
| **N11** | Cryptogam crust bootstrap (**NS-011**) | Damp bare crust; dry/shaded/salty stall | `veg.*.crust`, `crust-arrival` | **Done** — agent (C-007 stage-2) |
| **B** | Branch-and-compare (**C-005**) | Same castle, different forces | `branch.ts`, `branch-compare` | **Done** — C-005 Locked as tooling (v2.0.12) |
| **E** | Exner-lite inland deposit (**GEO-002**) | Channels cut; basins silt | `hillslopeDeposit`, `hillslope-deposit` | **Done** — agent |
| **G** | Season + erosion-intensity dials (**C-021** / **C-022**) | Long season pushes growth; stormy wears the slope faster | `seasonRegime.ts`, `erosionRegime.ts`, `season-regime`, `erosion-intensity` | **Done** — agent machine half; both Open (owner Lock sitting outstanding) |
| **L1** / **L6** | Deferred time debt; clock in real-world units | Rate ladder reads `1 s/s` … `1 week/s` instead of unnamed multipliers | `SimClock` debt counters, `src/ui/timeRates.ts` | **Done** — agent (no baseline moved) |
| §4.49–§4.52 | Flat routing, flux stability, coastal base level, encoding delta | Correctness under the existing loops (no new verb) | `flowRouting.ts`, `fluxStep.ts`, `colorDistance.ts` | **Done** — agent (baselines refreshed with stated reasons) |
| **L2** | Standing biomass is a propagule source; seed = overseas + local convolution | A founded meadow spreads, stalls at salt, and regrows from a refugium | `localSeedPressureField`, `seedRain.test.ts`, `spread-front` | **Done** — agent (Symmetry; only `deep-time` moved) |

**Current gate:** Slices **14** / **16** / **15** Tier-O **Pass**; **Slice F** / **17**–**21** Done. Maritime shore Tier-O **Pass** (C-016 / C-017). Salt / overseas Tier-O **Pass**. Stewardship: **C-004** / **C-005 tooling** / **C-013** / **C-002** / **U-006** / **C-020 Locked** (v2.0.13); **C-006 Locked** (CI); **C-014** Open (no hear). **Slice G** shipped (machine) — **C-021** / **C-022** wired, both Open pending owner Lock sitting; **C-010** framing Done. **Slice E** Exner-lite Done. **Slice N8** / **N7** / **N9** / **N10** / **N11** Done. **Slice L1** / **L6** Done (deferred time debt + real-world rate units; no baseline moved). Review-defect fixes **§4.49** / **§4.50** / **§4.51** / **§4.52** Done, and **§4.44** fire spread as a rate Done (`burn-recover` moved — burn is rate-limited, not instantaneous). **Slice L2** Done (local seed rain — standing biomass is now a propagule source; `deep-time` moved, `arrival-*` probes provably unaffected). L2 and §4.44 shipped in one commit; the two were checked against each other on the combined tree and are **provably non-interacting on the current probe set**. `burn-recover` never establishes any guild biomass (all six `veg.biomass.*` stay exactly 0 through the whole probe — its "recovery" is `veg.cover` regrowth under `runVegetationStep`, not seed-driven recolonization), so L2's local term is identically zero there; and `deep-time` never authors an ignition (**C-003** Open — authored ignition only), so `runFireStep` takes its no-active-front early return on all 100 sim-years and §4.44 cannot reach it. Both agents' independently measured baselines therefore reproduce unchanged when combined. The real coupling — fire clearing `veg.cover` but not `veg.biomass.*`, so a scar retains a live local seed source — is not yet observable to any probe, and is the thing §4.45–§4.48 and L3 will make measurable. Gap inventory: [reviews/2026-07-30-sim-gap-review.md](reviews/2026-07-30-sim-gap-review.md). **BUILD_GUIDE “Done” ≠ Lock.** **Queue tip:** **L3** mortality as a rate (§4.38), then **L7** / **L4**; §4.45–§4.48 (fuel numerics / vegetation defect fixes) run in parallel; owner Lock backlog runs beside both ([owner-lock-batch.md](candidates/owner-lock-batch.md)). **C-010** implement under Open later. Nutrients / animals stay off tip.

**Owner Lock backlog:** ~~A~~ / ~~B~~ / ~~**C-004**~~ / ~~**C-005**~~ / ~~**C-013**~~ / ~~**C-002**~~ / ~~**U-006**~~ / ~~**C-020**~~ **Locked**; **W-001 Superseded**; remaining Open: **C-014** (audio env), **C-021** / **C-022** (Slice G machine half done, taste sitting outstanding). Filed Open and owner-judged, none on tip: **C-023** (guild competition), **C-024** / **C-025** (band calendar / deep time), **C-026** (CVD-safe palette).

**Next (executable tip):** **L3** mortality as a rate (§4.38) → **L7** activity-gated event band (§4.42) → **L4** biotic motion (§4.39); **L5** blocked on **C-023**, **L8** on **C-024** / **C-025**. Parallel: §4.45–§4.48 (§4.44 Done). **L2** Done (§4.37) — L3 is now doubly earned: local seed gives a front that spreads, but nothing can recede until die-back is a rate. Residual owner asks: **C-014** when hearable; **C-021** / **C-022** taste sitting. **C-010** framing Done — implement later under Open. Keep nutrients / animals / SWE off the tip.

**Thesis holes (not tip):** **C-012** Δx / mosaic (only if place-reading still fails); **C-021** / **C-022** season + erosion dials (machine half shipped as Slice G §4.35; owner taste sitting outstanding); **C-010** implement after framing (not tip); optional SWE only if a later snow defect appears. Scenario campaign (G-002 / C-010) after implement.

**The ladder, read as force dials.** [THESIS.md](THESIS.md) §4 reframes what the remaining slices are *for*: each one adds a force the player can turn, and the value is combinatorial rather than additive. 8b adds *does it stay wet between storms*; 8c / **F** add *mean rainfall climate* and make windward/leeward consequence visible in the landscape; 9 adds *what can live here* as the arrival gate; 10 adds *fire*; 11 adds *light and succession*; dry-down closes the balancing ET edge so greening is not a one-way ratchet; 12 adds *life moves in*; 13 closes *life changes how water moves*; 14 adds *finite objectives over the same loop* (G-002); **16** adds *sea level as global base level* (island form — C-015); **17** adds *tidal envelope / intertidal* (C-016); **18** adds *wave exposure → shore change* (C-017); **19** adds *longshore lee deposit / beaches* (C-017); **20** adds *salinity as legacy load* (C-018); **21** adds *overseas arrival* (C-019); **G** adds *season length* and *erosion intensity* (C-021 / C-022 — dials shipped machine-side, both still Open on owner taste).

**Research ↔ decisions.** Steals from EXTERNAL_REFERENCES map to Locked/Current IDs or candidates C-001…C-022. Do not implement Open candidates as if Locked. Slice 21 acted on MacArthur–Wilson + new-island succession → overseas kernel + `island-arrival` (**C-019**); rejected species simulator, equilibrium paint, perimeter-as-island-default.

---

## 4. Next work

### 4.0 Autonomous session protocol

Cold-start one-pager: [AGENTS.md](../AGENTS.md). Procedural skills (slash or auto): `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/nature-study`, `/blocked-note` under `.cursor/skills/`. Cloud Agents: `.cursor/environment.json` (`npm install`; headless gate preferred). Always-on policy stays in `.cursor/rules/` — do not migrate vision / verify-before-asking into skippable skills.

Every agent session that advances the sim or build plan:

1. **Classify claims** for the slice as Tier **M** / **P** / **O** ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md)).  
2. **Implement** behind tests/probes — Prefer `npm run probe -- <scenario>` for scenario-scale Tier-M.  
3. **Green bar before “done”:** `npm test`, `npm run build`, `npm run conformance:check`, `npm run probe -- --all --check` (skill: `/run-gate`).  
4. **Name Tier-M artifacts** in the commit body when physics change (golden hash, probe baseline, test file). A probe baseline may only move in a commit that says why.  
5. **No owner ask** unless VERIFICATION_POLICY §4 ask gate passes (one sentence, no numbers). Hygiene / infrastructure / Closeouts: **never** open a playtest. When the gate passes, write the request with `/write-playtest`.  
6. **Batch Tier-O** — Presentation + erosion legibility share one future ask; do not drip-feed. The batch **fires** when a third question joins it, or when the next slice cannot start without an answer, whichever comes first (VERIFICATION_POLICY §4).  
7. **Research discipline** — If acting on an EXTERNAL_REFERENCES steal, cite the register/candidate ID in code or BUILD_GUIDE checklist; if inventing policy, file a candidate first (skill: `/study-steal`).  
8. **Close what you proved** — When a candidate's **Judge** in [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) §3 names only CI or agent probes, the agent promotes it itself once the criterion is met, in the same commit as the evidence (DECISION_CONFORMANCE §3.0; skill: `/promote-candidate`). When the Judge names the owner, the agent writes the promotion dossier instead and leaves the entry Open. Never leave a question the machine already answered sitting in the owner's queue.  
9. **Refill the queue** — DoD row 10: leave the next-but-one slice specified to §4.3 depth before closing the current one.  
10. **Clip gate before a new system (D-007, Locked)** — If the slice registers a new `Process` in `SimScheduler`, record a twenty-second clip verdict ([THESIS.md](THESIS.md) §8) in its §4 entry first. While the clip does not exist, the next slice is legibility / encoding / presentation, **not** another system. This is not a playtest: no ask gate, no batching, one sentence, no number — the test is designed to cost no owner session. Slices that register no process (infrastructure, hygiene, refactor, presentation) are exempt by construction.

### 4.0.1 Stop conditions — what to do when blocked

Autonomy needs a defined failure exit, or the two failure modes are idling and inventing policy. Both are worse than a note.

| Situation | Action |
|---|---|
| Tier-P proxy red after **3** retunes | Stop retuning. Write `docs/blocked/<date>-<slice>.md` naming the encoding tried and the measured gap; add the question to the Tier-O batch; move to the next queue item. |
| A choice needs policy that no Locked entry or candidate covers | File a candidate (**C-00x**) with the five-part contract, mark it Open, implement nothing under it; move to the next queue item. |
| `conformance:check` fails on an ID the agent cannot legitimately cite | Fix the citation or file the candidate — never delete the check or invent an ID. |
| Golden hash or probe baseline changes **unintentionally** | Treat as a defect, not a baseline update. Find the cause before re-committing; an unexplained baseline move is never “done”. |
| Candidate blocks the slice and its Judge is the owner (e.g. **C-003**) | Write the dossier, park the slice, take the next queue item. Do not implement under an owner-judged Open candidate. |

A blocked note is a normal session outcome. An idle session is not. Skill: `/blocked-note` → `docs/blocked/<date>-<slice>.md`, then take the named next item.

---

### 4.1 Autonomous closeouts *(agent-only; before Slice 8b)*

No Tier-O. Order:

- [x] **Probe baseline harness** *(do first — it is the tripwire everything else in §4.0 assumes)*. `npm run probe` compares against committed baselines; CI runs `npm run gate`. Scope:
  - [x] `docs/evidence/<scenario>.baseline.json` committed per scenario; each metric carries a tolerance (absolute or relative) chosen with the scenario, not per run  
  - [x] `npm run probe -- <scenario>` rewrites `docs/evidence/<scenario>.md` as **this run vs. baseline, with deltas**, matching VERIFICATION_POLICY §8  
  - [x] `npm run probe -- --all --check` runs every scenario, exits non-zero on any out-of-tolerance metric, writes nothing  
  - [x] `npm run gate` = `test` + `build` + `conformance:check` + `probe -- --all --check`; CI runs `gate`  
  - [x] Baselines for the three live scenarios (`paired-storm`, `berm-reroute`, `basin-fill`) committed from the current tree, with the numbers stated in the commit body  
  - Tier-M: a deliberately perturbed constant fails `--check`; an unperturbed run passes (`src/sim/probes/baseline.test.ts`). No Tier-O.
- [x] **`deep-time` probe** *(do second — it is the cheapest de-risking available)*. Headless 100 compressed sim-years (10 decadal bands × prototype ladder) on a fixed-seed 24² mountain. Slow fields still move late (no f32 stall). Mass residual and step ms reported at 20-year intervals (feeds **C-008** / **C-012**). P-005 criterion discharged and entry **Locked**.

  > **Residual finding, re-measured 2026-07-30 — closes the open ledger follow-up.** The earlier note read *"residual grows to ≈ −0.019 by year 100 … investigate as ledger follow-up"*. That framing was wrong in both halves and the number no longer reproduces. Measured on the current tree at 10-year intervals, absolute residual **rises to 3.6e-4 near year 50 and falls back to 5.5e-5 by year 100** — it reverses, so nothing is "growing". Worst **relative** residual across the horizon is **4.2e-7**, i.e. 239× inside the 1e-4 relative bound §8.2 already applies elsewhere. Attribution over a 20 000-step run shows the two f32 rounding sites are `addRain` (−6.2e-1) and `runSurfaceWaterStep` (+5.3e-1): opposite signs, near-cancelling, which is a bounded random walk from storing water depth in `Float32Array`, not a sink. **Absolute residual is not an invariant here** — it scales with throughput and wanders, so an absolute bound is both flaky and meaningless. The relative bound is the real invariant and is now asserted across the full 100-year horizon in `src/sim/probes/deepTime.test.ts` rather than narrated here. Ledgers were already f64 (`ScalarBox`); no code change was warranted.
  - [x] Headless run over a decadal horizon at fixed seed; record what actually moved — elevation, soil depth, cover, ledgers — at intervals, not just at the end  
  - [x] Assert slow accumulators are **still changing** late in the run, which is the specific f32-stall failure  
  - [x] Report mass residual and step ms across the horizon (feeds **C-008** and **C-012**)  
  - [x] P-005's criterion — advance 100 sim-years, reload, advance again, identical hash — landed in `deep-time` (+ legacy `soil.depth` production divergence)  
  - Tier-M only. No Tier-O.
- [x] **Slice manifest validation** — `docs/slices/<slice>.json` per DoD row 9; `conformance:check` fails when a manifest names a missing test, probe, or field. Manifests for Slices **8** and **P** committed; earlier slices grandfathered.  
- [x] **Generated world facts** — [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) §5 emits grid, Δx, extent, cell count, event Δt and step budget from `src/config.ts` between markers; `conformance:check` fails on drift and on `worldExtentMeters ≠ gridSize × cellSizeMeters`. **Why:** the ledger verifies that decision IDs are *cited*, never that prose claims about the code are *true* — **C-012** was filed against `worldSize: 48` read as metres (a Three.js scene unit) and asserted a "48 m plot at 0.5 m cells", wrong by 20× in Δx and 400× in area, while [SIMULATION_MODEL.md](SIMULATION_MODEL.md) §2 stayed correct throughout. Governing docs cite the block; they do not retype the numbers. Tier-M: both perturbations (extent, cell size) fail `--check`; restored tree passes.  
- [x] **5b one-tool — parked, won’t-do.** Berm and dig both shipped and both read as causes (A-005); “one tool only” was a spike constraint on the original prototype, not a register decision, and removing dig would cost a verb to satisfy a constraint nothing cites. Closed by decision, not by work.  
- [x] **Berm/dig ↔ `soil.depth` mass** — *thesis-critical.* Dig/berm move `soil.depth` with elevation so bedrock = elev − depth is unchanged (THESIS §2.1; snowflow steal; **C-002** / GEO-002). Tier-M in `siting.test.ts`: per-cell Δelev = Δdepth; ΣΔelev = ΣΔdepth across the brush. Moisture column conserved on depth change.  
- [x] **Deferred grains** — leave deferred (flow cues sufficient).  

---

### 4.2 Presentation track — volume without voxels *(parallel; T-006 / T-007 / A-005)*

Study origin: falling-sand peers + snowflow — catalogued in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). **Steal presentation patterns; do not adopt voxel CA or GPU deform buffers as authority.**

**Loops.** Sim: none new (observers + FX only). Game: volume and agency read as column-stack × time and cause verbs.

**Standing bans:** voxel CA as world authority; RAF-coupled physics; opaque cube water as primary depth language; dual GPU+CPU hydrology engines; WebGPU-only / 90 FPS as DoD; GPU deform as hydrology authority.

**Steal from snowflow (API shape):** shared surface write; berm = displaced mass; beauty ≡ observer sampling; particles decorate.

**Checklist:**

- [x] Extent cage, snapped cursor, flow cues, dual readouts, conservation HUD, property bundles, Tier-P proxies  
- [ ] Presentation-only grains — deferred; closed as won't-do in §4.1 (flow cues sufficient), so this box stays open by decision  
- [x] Batched Tier-O: [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md) — fired and subsumed into [playtests/batch-living-return.md](playtests/batch-living-return.md) (owner **Pass** 2026-07-30, via [8c-return-visit.md](playtests/8c-return-visit.md))  

---

### 4.3 Slice 8b — Groundwater / baseflow store *(Done — C-001 Locked)*

**Loops.** Sim: soil ↔ cheap GW store ↔ baseflow to surface so channels persist between storms (H-001, H-004, **C-001**). Game: dry spell does not instantly empty the hollow — storage, not a silent leak.  
**Register / candidates.** H-001, H-004, T-001, T-006; **C-001** Locked.  
**Study.** GWSWEX SW/UZ/GW compartment + mass-balance history ([EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md)); NATURAL_PROCESS_MATH §4 Darcy/Boussinesq *lite*.  
**Bans.** Richards / Celia / MODFLOW in-browser; ML water-cycle cores as authority.

- [x] Register `groundwater` (or equivalent) storage field + owner/band; schema bump if legacy  
- [x] Recharge from soil moisture; baseflow contribution onto surface (or channel cells)  
- [x] Extend water balance residual to include GW compartment  
- [x] Tier-M: conservation across multi-day wet→dry; probe `baseflow-persist` — wet channel after N dry days **with** GW ≫ without  
- [x] Inspector overlay for GW / water table proxy  
- [x] Notebook seed: e.g. “The hollow kept seeping after the rain stopped.”  
- [x] `docs/slices/8b.json` manifest (DoD row 9)  
- [x] **Promote C-001** — channel ≈ 0.011 vs 0; GW sum ≈ 30; H-004 rel residual < 1e-4  
- [x] Owner play: Tier-O deferred until persistence is visible without inspector  

---

### 4.3b Slice 8c — The return visit *(Done — Tier-O Pass; the game-side thesis slice)*

**Why this exists.** [THESIS.md](THESIS.md): the loop is *build the form → choose the forces → run time → look*. Slice 8 shipped geomorphology as Tier-M and left its legibility deferred, which means the payoff the whole project is named after — nature having its way with what you built — currently exists and is **invisible**. This slice makes the return visit real. It adds no new sim system.

**Loops.** Sim: none new (observers, encoding, and time controls only). Game: you build something you care about, run time forward, and come back to find out what became of it.  
**Register / candidates.** **C-004** (force regime as the post-build verb), **C-008** (response budget), A-005/N-001 boundary — regimes and pulses, never targeting; T-002/S-009 time rates; GEO-002 erosion already implemented.  
**Bans.** No new authoritative fields. No targeting a force at a location (THESIS §9). No scripted "your berm collapses now" event — the erosion must be the sim's (N-004).

- [x] **Save / load in the UI** — localStorage via `sessionPersist.ts` (T-003 / P-005)  
- [x] **Undo** for sculpting (**C-013** hypothesis) — edits only; cleared when time advances (S-007)  
- [x] Erosion / deposition legible **without** the inspector on player-made terrain — form-memory elev tint (Tier-P max encoding > 0.15 after geo)  
- [x] One force dial the player sets before running time — **Rain: dry / light / moderate / heavy** (authored; C-003 direction, C-004); storm wet-fraction + perimeter pour-point outlets (SIM §10.2) so heavy is not a closed-basin firehose  
- [x] Before/after readable across a fast-forward — **Remember form** captures then; default view encodes Δelev  
- [x] Tier-P: encoded-signal proxy on the eroded-vs-untouched delta at default camera; response-latency proxy per **C-008** *(proxy green; budget number still owner)*  
- [x] Tier-M: same seed + same regime → identical hash; different regime → divergent outcome (`regime-divergence`)  
- [x] `docs/slices/8c.json` manifest (DoD row 9)  
- [x] Notebook seed: “The berm I built is a low ridge now, and the channel moved.”  
- [x] **Tier-O Pass** ([docs/playtests/batch-living-return.md](playtests/batch-living-return.md), owner 2026-07-30): living hollow answered the storm; wanted another run — subsumes prior 8c return-visit ask; C-004 stewardship reading remains Open in dossier

---

### 4.4 Slice 9 — Limiting factors / HSI spine *(Done — agent)*

**Loops.** Sim: hydrological state → Liebig-style limiting factor / HSI fields (NATURAL_PROCESS_MATH §3.3, §8.2) — the first field whose *meaning* is "what is holding this patch back". Game: inspect *why* a patch is ready or not (E-009 / S-008 direction) without populations yet.

**Thesis role (C-007).** This is the **arrival gate**, not an inspector layer. THESIS §5: you dig the moat and something moves in *because the conditions suit it*. HSI is the mechanism that decides what shows up — which is why it outranks introduction machinery (E-007, E-008, RC-003) rather than serving it.  
**Register / candidates.** ES-006 (capacity emerges — no fixed `K`), E-009 (readiness inferred from state), S-008 (hysteresis legible), U-001 layered inspect, N-004 (no hidden rules — the limiting factor must be inspectable, never a magic gate).  
**Study.** NATURAL_PROCESS_MATH §3.3 Liebig minimum and §8.2 HSI composition; composition choice in `docs/slices/9-composition.md`.  
**Bans.** No scalar "health" score standing in for the limiting factor (N-002). No fixed carrying capacity (ES-006). No readiness value that the player cannot trace to a field (N-004, S-004).

- [x] Limiting-factor field: per cell, which input is minimum and by how much — derived from moisture / soil depth / GW; registered with owner + band (T-005)  
- [x] Composition rule written down before code (minimum vs. product), cited to NATURAL_PROCESS_MATH §3.3 — `docs/slices/9-composition.md`  
- [x] Inspector layer showing the limiting input, not just a score  
- [x] Tier-M: monotonicity — improving the limiting input raises HSI; improving a non-limiting input does not  
- [x] Tier-M: bounds — HSI stays in range, no NaN where an input is zero  
- [x] Probe `limiting-shift`: a patch whose limiting factor changes identity across a wet→dry schedule  
- [x] `docs/slices/9.json` manifest (DoD row 9)  
- [x] Notebook seed: “Water — not light — is limiting here.”  
- [x] Tier-O candidate (batch, do not ask alone): *does the world tell you what it needs without the inspector?* — deferred; C-007 dossier notes arrival still missing  

---

### 4.5 Slice 10 — Fire / fuel *(Done — agent)*

**Loops.** Sim: vegetation → fuel load → fire disturbance → cleared cover → succession restart (ES-002 — disturbance is necessary, not a failure state). Game: a pulse intervention with real semantics — the player sites a burn as a *cause* and lives with the result (A-002, A-006, A-005).  
**Register / candidates.** ES-002, ES-001 (succession emergent), A-002, A-006, A-005, RC-004 (ecological time constrains repetition), N-005. Fire ignition timing touches **C-003** — authored ignition only until C-003 closes; no stochastic arrivals.  
**Study.** NATURAL_PROCESS_MATH fire/fuel section; EXTERNAL_REFERENCES cellular fire-spread peers are **presentation and rule-shape study only** — spread must run on the same WorldState authority as hydrology (T-006).  
**Bans.** Fire as a scripted event or scenario trigger (N-004). Fire as pure penalty (ES-002 — it is a process, not a punishment). Stochastic ignition while C-003 is Open. A second disturbance engine parallel to the sim step.  
**Gate.** After Slice 9, so readiness / limiting factors exist to disturb and recovery is measurable.

- [x] `fuel` field accumulating from vegetation, depleted by fire; registered with owner + band (`fire.fuelLoad`, decadal)
- [x] Authored ignition only (C-003); BFS spread cited and deterministic under T-001 (`ignite` tool + `igniteCell`)
- [x] Moisture couples to spread — wet ground resists burning, closing fire back onto the hydrology spine
- [x] Tier-M: conservation/accounting across a burn (fuel consumed vs. cover lost); determinism hash across the disturbance (`fire.test.ts`)
- [x] Tier-M: post-fire recovery trajectory differs by pre-fire moisture (probe `burn-recover` — wet recover ≈ 0.454 vs dry ≈ 0.07 after Slice 11 light coupling; accountingError ≈ 6e-6; determinismMatch = 1)
- [x] `docs/slices/10.json` manifest (DoD row 9)
- [x] Notebook seed: “The burn ran to the wet ground and stopped.”
- [x] Tier-O candidate (batch): *did the burn read as something you did, or as something that happened to you?* (A-005 / N-001) — deferred
- [x] **Next-but-one:** Slice 11 specified to §4.3 depth (§4.6) before this slice closes (DoD row 10)

---

### 4.6b Dry-down ET coupling *(Done — agent)*

**Why this exists.** Flat `etRate` made vegetation a one-way ratchet: cover improved infiltration with no transpiration cost, and aspect did not dry differently. NATURAL_PROCESS_MATH §1.6–1.7 + Slice 11 insolation close the balancing edge.

**Loops.** Sim: insolation × lagged cover → moisture-limited PET/AET partitions (soil evaporation, transpiration, open water) with H-004 ledger closeout. Game: after rain, south slopes and bare ground dry faster; vegetated hollows keep drinking — readable in default terrain tint + wired water audio.

**Register / candidates.** H-001, H-003, H-004, ES-003, ES-005, S-009, T-001, T-005, T-006, C-008, C-014 (audio wire; still Open for owner half).

- [x] Composition note `docs/slices/drydown-composition.md`
- [x] Process hardening: topo scheduler, dt-scaled daily/decadal rates, fire contributes `veg.cover` / `fire.fuelLoad`
- [x] `et.potential` / `et.actual` + partition ledgers; `fire.scar` persistent fade
- [x] Default-view encoding keeps wet-vs-dry under cover; scar tint; audio observer in `main.ts`
- [x] Probes `drydown-feedback` (PET gap ≈ 0.0063; moisture gap ≈ 0.022; transpiration gap ≈ 6.68; rel residual ≈ 1e-7) and `disturbance-recovery` (half-recovery, bounded)
- [x] `docs/slices/drydown.json` manifest
- [x] Tier-O deferred (batch): *after the rain stopped, did the place feel like it was drying itself?*

---

### 4.6 Slice 11 — Light / succession *(Done — agent)*

**Why this exists.** [THESIS.md](THESIS.md) §2.1 / §5: the castle comes alive when life takes the form you built — and different aspects, burns, and moisture histories must produce different futures from the *same* rules, never from authored stages. Slice 9 already named water/depth/GW as limiting; Slice 10 clears cover. This slice adds the light dial so succession is a consequence of insolation × canopy, not a timer.

**Loops.** Sim: insolation / canopy light (Beer–Lambert) → light competition / succession trajectory without authored stages (ES-001). Game: north vs south / burned vs unburned / wet vs dry read as different futures from the same rules — not painted stages.

**Thesis role.** Force dial on the ladder (BUILD_GUIDE §3): after fire, *light and succession*. Under **C-007**, trajectories remain conditions for arrival, not introduction scripts — stage labels may describe state but cannot drive it (ES-001).

**Register / candidates.** **ES-001** (Locked — succession emergent; stage labels describe, do not drive). **ART-001** (Current — scientific impressionism; NATURAL_PROCESS_MATH §1.9 ties insolation readability here). Touchpoints: **ES-006** (capacity emerges — light may join Liebig inputs once registered, never a fixed `K`); **E-009** (readiness inferred — light must stay an inspectable field, not an unlock); **C-007** (Open — arrival verb; do not implement introduction machinery here). Field registration cites **T-005**.

**Study.** NATURAL_PROCESS_MATH §3.2 (Tilman R* + Beer–Lambert light competition) and §1.9 (insolation from slope/aspect + horizon shading); seasonal band on the timescale ladder (§7 — light competition ~10 days). Composition choice written before code as `docs/slices/11-composition.md` (same pattern as Slice 9's `9-composition.md`).

**Bans.** Authored succession stages as authority (ES-001 rejected alternatives). Light as a free-floating "health" scalar (N-002; NATURAL_PROCESS_MATH §6). A second vegetation engine parallel to existing `vegetationProcess` — extend cover/light coupling in-process, do not fork a rival owner of `veg.cover` (T-006 / GEO-002 earn-its-cost).

**Gate.** After Slice 10 (fire/fuel **Done**). Burn→cover restart is available for burned-vs-unburned trajectory contrast.

- [x] Register `light.insolation`, `veg.leafAreaIndex`, and `light.understory` with vegetation owner + daily band; understory-light inspector overlay (T-005)
- [x] Beer–Lambert reduced form cited before code — composition note `docs/slices/11-composition.md` (NATURAL_PROCESS_MATH §3.2, §1.9)
- [x] Couple to existing `veg.cover` via `vegetationProcess` (extend, do not replace); burn-cleared cells receive more understory light and a larger next-step gain
- [x] Tier-M: monotonicity / bounds — more canopy → less understory light; registered fields stay in range with no NaN (`light-succession.test.ts`)
- [x] Tier-M: paired divergence — identical moisture/rules yield south mean cover ≈ 0.506 vs north ≈ 0.361; deterministic replay match = 1
- [x] Probe `succession-diverge`: insolation gap ≈ 0.525; cover gap ≈ 0.145 with committed baseline tolerances
- [x] Tier-P: paired-aspect understory values produce inspector color-distance ≈ 0.223 (> 0.15 floor) at default encoding (`presentation.proxy.test.ts`)
- [x] `docs/slices/11.json` manifest (DoD row 9)
- [x] Notebook seed: “With the same soil moisture, the brighter south-facing slope filled in first.”
- [x] Tier-O candidate (batch, do not ask alone): *do the slopes feel like different futures, or like the same place with different tint?*
- [x] **Next-but-one:** Slice 12 specified to §4.3 depth (§4.8) before this slice closes (DoD row 10)

---

### 4.7 Slice A — Audio scaffold *(Done — agent machine half; C-014 Open)*

**Why this exists.** AUD-001 / AUD-002 / AUD-003 are **Locked** and had never appeared in a slice or a line of code. Silence is a *signal* (AUD-002), not an absence of assets, and THESIS §8's clip test cannot pass in silence. Open sub-question **C-014** (how audio derives from simulation state) — leading direction: sampled/mixed sources from field values; silence first-class.

**Loops.** Sim: none new — audio is a pure observer of an existing registry field (T-006). Game: ambient water gain rises with surface water and goes meaningfully silent when the hollow is dry (AUD-001 / AUD-002).

**Register / candidates.** AUD-001, AUD-002, AUD-003 (Locked intent); **C-014** Open (owner-judged promotion — dossier only, do not flip); T-006 (observer), T-001 (no sim RNG).

**Study.** No third-party audio engine steal required for the scaffold; EXTERNAL_REFERENCES peers remain study-not-ship for presentation. Mapping lives in `src/audio/AudioBus.ts`.

**Bans.** Writing WorldState from audio. A second sim RNG for mix decisions. Invented wildlife presence fields — drive from an existing field (`water.surfaceDepth`). Web Audio required for CI / Tier-M. Conflicting with Slice 10 fire/fuel process ownership.

**Gate.** Parallel to Slice 10 (does not own WorldState process order). Machine half closed here; owner half of C-014 stays Open.

- [x] Audio observer module (`src/audio/AudioBus.ts`) — reads `water.surfaceDepth`, maps mean → `ambient.water` gain
- [x] Zero / absent field → `silent === true`, `level === 0` (true silence as signal, AUD-002)
- [x] Raising the field raises mapped level (monotonic; saturate at 0.25 m mean)
- [x] Tier-M: write isolation — `audioObserver.writes === []`; snapshot sample does not change `stateHash`
- [x] Tier-M: RNG isolation — no `Math.random` / sim RNG in audio path; same depths → identical mix
- [x] Optional Web Audio apply hook is a no-op without a gain target (`webAudioHook.ts`) — CI does not need AudioContext
- [x] `docs/slices/A.json` manifest (DoD row 9)
- [x] Notebook seed: “The hollow went quiet when the water left.”
- [x] `docs/candidates/C-014-dossier.md` — machine half numbers; owner-only question (no playtest ask)
- [ ] **Tier-O / C-014 owner half** (batch only): *When the water left, did the quiet feel like the place going still — or like the sound broke?* — do not promote C-014
- [x] **Next-but-one:** main ladder Slice 11 already specified (§4.6); next audio follow-on remains AUD-003 recovery bed (later stub — not expanded)

---

### 4.8 Slice 12 — Arrival / first occupant *(Done — C-007 Locked)*

**Why this exists.** [THESIS.md](THESIS.md) §5 names “life moves into it” as the missing payoff. Slice 9 built the inspectable suitability gate and Slice 11 made terrain/light produce different ecological futures; this slice tests **C-007** by letting one real plant functional type arrive because a place became suitable, without a player introduction action.

**Loops.** Sim: fixed preserve seed source → dispersal pressure × Liebig HSI → establishment / biomass for one plant functional type. Game: shape and wet the place, run time, and see an occupant appear where the conditions earned it.

**Register / candidates.** **C-007** (**Locked** — owner Pass 2026-07-29: appearance mimics real life via earned conditions), **ES-006**, **E-009**, **W-003** / **E-004**, **T-001** / **T-003**, **T-005**, **N-001** / **N-004**. Steal: Viva Piñata condition-earned arrival → `12-composition.md` (authored unlock checklists rejected).

**Study.** NATURAL_PROCESS_MATH seed-dispersal kernel note (`p = 1 − e^{−Σ seeds}`) composed with §3.3 Liebig HSI; SIMULATION_MODEL §3.5 plant functional types. Write `docs/slices/12-composition.md` before code, including the fixed seed source, establishment equation, and why the chosen functional type belongs to Windward Basin.

**Bans.** An introduction/place-species tool as the primary biological verb. Occupancy copied directly from HSI with no dispersal path. Unsaved or ambient randomness. A hidden readiness unlock. Invented species/material names. A second vegetation owner parallel to `vegetationProcess`.

**Gate.** After Slice 11 (**Done**). C-007 Locked after machine half + owner Pass.

- [x] Composition note names one real functional type, fixed preserve seed source, dispersal/establishment equation, and field ownership
- [x] Register seed pressure / establishment probability / occupant biomass (minimal set) with owner + annual/seasonal band; RNG or accumulated arrival state is save-safe (T-003)
- [x] Couple establishment to existing `habitat.suitability`; zero suitability prevents establishment
- [x] Tier-M: improving the limiting HSI input raises arrival probability; improving a non-limiting input does not
- [x] Tier-M: same seed + forcing → identical arrival hash; fields bounded / finite
- [x] Probe `arrival-earned`: paired suitable/unsuitable patches under one seed schedule, with baseline tolerances and measured arrival delta (suitable biomass = 2.5, unsuitable = 0, `earned = 1`)
- [x] Tier-P: occupant encoding clears perceptual floor against the pre-arrival state without requiring the inspector (`occupantEncodingDelta > 0.15`)
- [x] Update `docs/candidates/C-007-dossier.md` with the completed machine half; owner-only question remains one sentence with no number
- [x] `docs/slices/12.json` manifest (DoD row 9)
- [x] Notebook seed: “The first shoots appeared in the hollow I kept wet.”
- [x] Tier-O **Pass**: *when it appeared, did it feel earned by the place you made — or like a spawn?* — owner: earned conditions mimic real life; **C-007 Locked**
- [x] **Next-but-one:** specify Slice 13 biology → physics integration before Slice 12 closes (DoD row 10) — §4.9

---

### 4.9 Slice 13 — Biology → physics integration *(Done — Tier-O Pass)*

**Why this exists.** Slice 12 ships a first occupant that does not yet change how water moves. The thesis payoff is that a vegetated hollow meets the next storm differently than a bare one — Slice 6 already couples aggregate `veg.cover` to roughness/infiltration; this slice closes the loop from **earned herb biomass** into those physical properties (E-005) without inventing a second hydrology.

**Loops.** Sim: `veg.biomass.herb` contributes to cover-equivalent roughness and infiltration so a colonized hollow retains more water / slows runoff versus an identical unsuitable patch. Game: keep a hollow wet until shoots appear, then run a storm and see the place answer differently.

**Register / candidates.** **E-005** (biology changes physical properties), **F-001** (feedback loops visible), **ES-006**, **T-001**, **T-005**, **T-006**, **N-001**, **C-007** (Locked — arrival gate already closed).

**Study.** SIMULATION_MODEL §11.1; composition in `docs/slices/13-composition.md`; Slice 6 `paired-storm` as comparison. ET partition stays on `veg.cover` alone this slice (storm path is the Tier-M criterion).

**Bans.** Painting cover directly from HSI. A second process that owns `veg.cover`. Changing hydrology equations rather than contributing through existing vegetation physical properties. Stochastic weather (C-003 Open).

**Gate.** After Slice 12 (**Done**): herb biomass and arrival probe exist.

- [x] Composition note: herb biomass → physical contribution equation; field ownership; no dual cover authority — `docs/slices/13-composition.md`
- [x] Wire `veg.biomass.herb` into roughness / infiltration via local `physicalCover` in the existing vegetation owner (ET deferred)
- [x] Tier-M: colonized suitable patch vs bare unsuitable twin under one storm — runoff / infiltration delta in the earned direction (`living-hollow.test.ts`)
- [x] Tier-M: determinism + bounds; mass residual unchanged class
- [x] Probe `living-hollow`: colonized downslope ≈ 0.152 vs bare ≈ 0.423; infil ≈ 25.83 vs 11.52; `coverHeld = 1`, `earned = 1`
- [x] Tier-P: soil-soak encoding delta after herb-driven infiltration clears perceptual floor `> 0.15`
- [x] `docs/slices/13.json` manifest (DoD row 9)
- [x] Notebook seed: “The hollow I kept wet held the next rain differently once shoots took.”
- [x] Tier-O **Pass** ([docs/playtests/batch-living-return.md](playtests/batch-living-return.md), owner 2026-07-30): *did the living hollow feel like it changed how the water moved — enough that you wanted another storm?*
- [x] **Next-but-one:** specify Slice 14 scenario objective scaffold to §4.3 depth before Slice 13 closes (DoD row 10) — §4.10

---

### 4.10 Slice 14 — Scenario objective scaffold *(Done — Tier-O Pass)*

**Why this exists.** Sandbox already runs the living-sand-castle loop (THESIS §4). **G-002** (Locked) says scenarios provide finite objectives under that same loop — not a second game. Without a scenario scaffold, G-005 / G-006 / G-007 stay unexercised and the toxic-site premise (C-010 / THESIS §7) has nowhere to land. This slice builds the **minimum objective container**, not a campaign or a win-condition resolution of Open **G-007**.

**Loops.** Sim: none new — scenarios are authored schedules + evaluation observers over existing WorldState (T-006). Game: accept a finite objective, run the same sculpt → forces → time loop, and see whether the preserve meets the authored criterion window.

**Register / candidates.** **G-002** (Locked — finite objectives), **G-001** (sandbox stays open — scenarios are additive), **G-005** / **G-006** / **G-007** (Open — coupling note; store all three completion shapes per SIM §12 without resolving), **G-008** (mixed-objective model), **C-010** (legacy substances — depends on scenario frame), T-006, N-001, N-004.

**Study.** SIMULATION_MODEL §12 scenario completion structure; MVP_SCOPE §5 (what MVP is not); THESIS §7 sandbox vs scenarios. Write `docs/slices/14-composition.md` before code: objective schema, evaluation cadence, how Open G-007 alternatives are stored without picking one.

**Bans.** Resolving Open G-007 by shipping only one completion shape. A cleanup tool that removes poison directly (C-010 / N-001). Scenario scripting that bypasses the sim (N-004). Closing sandbox or gating sculpting behind scenario progress (G-001, C-006). Inventing a second win meter unrelated to preserve state (N-002).

**Gate.** After Slice 13 (**Done** agent): biology→physics feedback exists so a scenario can ask the player to earn a living hollow that blunts a storm.

- [x] Composition note: objective schema; evaluation window; G-007 three-shape storage; no register invention — `docs/slices/14-composition.md`
- [x] Scenario container loads an authored objective + schedule over sandbox WorldState (observer evaluation only) — `ScenarioSession`
- [x] Tier-M: same seed + schedule → identical evaluation outcome hash; write isolation (evaluator does not mutate sim)
- [x] Tier-M: objective window uses hysteresis / rolling interval shape compatible with G-005 without locking its tuning
- [x] Probe `scenario-window`: paired meeting / failing preserve states under one authored criterion
- [x] `docs/slices/14.json` manifest (DoD row 9)
- [x] Notebook seed: “The brief asked me to keep the hollow wet long enough for life to hold the next storm.”
- [x] Tier-O **Pass** ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30): *did the objective feel like a reason to run the same loop — or like a different game?*
- [x] **Next-but-one:** Slice **16** island / sea level specified at §4.10b (DoD row 10) — precedes Slice 15 so Tier-O fires on a readable world

---

### 4.10b Slice 16 — Sea level + island *(Done — Tier-O Pass)*

**Why this exists.** The map edge is still an artifact (SIM §10.1); perimeter pour points are a provisional workaround. An island makes the ocean the outlet, supplies C-012's mosaic as geometry, and gives C-004 a second global force dial. Slice 16 alone is the best available shot at THESIS §8's clip test. Full maritime depth is C-016…C-019 — this slice is only the base level.

**Loops.** Sim: terrain + global sea datum determine drainage; water leaves where land meets sea (`ledger.oceanExchange`). Game: shape an island, set how high the sea stands, run time, watch the shore answer.

**Register / candidates.** **C-015** Open (hypothesis); C-004, C-011, C-012; H-002, H-004, W-002, W-004; **W-001** Current — supersession is owner call. T-001, T-006.

**Study.** SIMULATION_MODEL §10 rewrite; EXTERNAL_REFERENCES narrowed coastal-SWE ban; generateMountain is already radial.

**Bans.** Waves, tides, salt, coastal erosion (C-016…C-018). SWE as authority. Negative elevations (keep sea above `elevationFloor`). Making `seaLevel` a config global that moves existing golden hashes — must be opt-in on WorldState.

**Gate.** After Slice 14 agent Tier-M. Before Slice 15 brief chrome.

- [x] Composition note `docs/slices/16-composition.md` (sea datum, ocean mask, ledger, Priority-Flood seed, no-targeting dial)
- [x] `seaLevel?: number` on WorldState; absent = legacy perimeter / closed behavior (baselines unchanged)
- [x] Ocean cells + `ledger.oceanExchange` in flux path; H-004 residual includes ocean term
- [x] Priority-Flood seeds from ocean cells when sea level set
- [x] `generateIsland` terrain generator; playable default uses island + sea level
- [x] Ocean plane / shoreline encoding; extent cage → horizon; sea-level select in controls (global, no cell args)
- [x] Tier-M: conservation + determinism; probe `island-drainage` (ocean exchange, shoreline length, habitat-zone proxy, step ms)
- [x] Tier-P: shoreline reads without inspector (proxy floor)
- [x] `docs/slices/16.json` manifest
- [x] Notebook seed: “I raised the sea and the hollow I dug became a cove.”
- [x] Tier-O **Pass** with Slice 15 ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30)
- [x] **Next-but-one:** Slice 15 brief chrome (§4.11) and Slice 17 tidal envelope (§4.12) specified to §4.3 depth

---

### 4.11 Slice 15 — Scenario brief chrome *(Done — Tier-O Pass)*

**Why this exists.** Slice 14’s evaluator and `scenario-window` probe prove the objective container machine-side. Tier-O cannot answer “same loop or different game?” until the player can **accept a brief** and see window satisfaction without an inspector — preferably on the island world from Slice 16. This is presentation + load chrome over the existing observer — not a campaign and not G-007 resolution.

**Loops.** Sim: none new (loads Slice 14 `ScenarioDefinition` + calls `ScenarioSession.observe`). Game: see the authored brief, run time, notice whether the hollow is holding the criterion — still the sculpt → forces → time loop.

**Register / candidates.** **G-002**, G-001, G-005 (window legible), G-007 (Open — still store-only; no end-of-scenario victory screen that picks an alternative), T-006, U-003, D-006, N-002.

**Study.** Slice 14 composition; PredictionSession chrome pattern; rain-regime / sea-level controls as prior force dials.

**Bans.** Victory screen that resolves G-007. Health meter / second score (N-002). Scripted cutscenes that bypass sim (N-004). Closing sandbox (G-001).

**Gate.** After Slice 16 agent Tier-M green (`island-drainage` probe) so the brief sits on a readable island.

- [x] Load `livingHollowObjective` (or equivalent) as an optional scenario over sandbox
- [x] Brief visible without inspector; satisfied / not-yet encoding from `CompletionState` (no G-007 pick)
- [x] Tier-P proxy: brief + satisfaction affordance present when scenario active
- [x] Wire `observe` on event step when scenario loaded (write isolation retained)
- [x] `docs/slices/15.json` manifest; notebook seed from Slice 14 brief
- [x] Tier-O **Pass** ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30)
- [x] **Next-but-one:** Slice 17 tidal envelope (§4.12) — Slice **F** may run first (force panel / climate mean) without blocking 17

---

### 4.11b Slice F — Force panel + climate-mean rain + orographic wind *(Done — agent)*

**Why this exists.** Island Pass left the rain dial as a working but unnatural storm-like control. Owner direction: rainfall is a **climate mean** the preserve lives under (what vegetation experiences), not an on/off storm switch; wind × relief decides *where* that mean lands. The Force panel is the post-sculpt verb surface (C-004) — a control strip, not a dashboard. Proof is watching the landscape wetten and diverge, not reading meters.

**Loops.** Sim: global climate-mean precip intensity every event; wind × terrain slope modulates placement via `P = P₀(1 + γ·u·∇z)` with land-mean normalization (H-004). Game: shape a blanker island, set rainfall mean / sea / wind, run time, **watch the place** answer (soil darkening / water) — no inspector required.

**Register / candidates.** **C-004**, **C-011**, **C-015**, **C-020** (lite — do not Lock), H-004, T-001, T-006, C-006 (sculpt canvas).

**Study.** [ISLAND_FORCES.md](ISLAND_FORCES.md); [FORCE_PANEL.md](FORCE_PANEL.md); NATURAL_PROCESS_MATH §4 orographic; EXTERNAL_REFERENCES study row.

**Bans.** Cloud painter / cell-targeted rain. Charts, precip HUD meters, orographic inspector layer. Stochastic free weather while C-003 Open. Resolving full C-020. Blocking Slice 17. SWE. Inventing Locked policy.

**Gate.** After 14 / 16 / 15 Tier-O Pass. Inserts before 17 in the queue tip; 17 remains next-but-one maritime physics.

- [x] `docs/ISLAND_FORCES.md` + `docs/FORCE_PANEL.md` (feel contract: look at the world)
- [x] Climate-mean rainfall dial (wetFraction=1; intensity = mean; labels arid→wet)
- [x] Broader / lower `generateIsland` sculpting canvas (no deep authored basins)
- [x] Wind dial + orographic modulate + `addRainField`; Force panel chrome (controls only)
- [x] Tier-M: probe `orographic-wind` — opposite winds diverge; precip tracks mean; residual closes
- [x] Tier-P: wet/dry side soil-darkening encoding without inspector (`presentation.proxy.test.ts`)
- [x] `docs/slices/F.json` manifest
- [x] Notebook seed: “I set a wetter climate and the windward slope stayed green.”
- [x] No Tier-O required this slice (panel + modulation exist); C-004 / C-020 naturalness may batch later
- [x] **Next-but-one:** Slice 17 tidal envelope (§4.12)

---

### 4.12 Slice 17 — Tidal envelope / intertidal *(Done — agent)*

**Why this exists.** C-016: tides as mean high / mean low water envelope, not instantaneous phase. Intertidal zone is the band between them — a real habitat the island form earns.

**Loops.** Sim: MHW / MLW globals derive an intertidal mask; no per-event tidal phase. Game: widen the tide range and see the shore zone grow.

**Register / candidates.** **C-016** Open; C-015; C-004; S-009; T-001.

**Bans.** Semidiurnal phase advanced every event step. A second hydrology.

**Gate.** After Slice 16.

- [x] Composition note; MHW/MLW options; intertidal derived field or mask
- [x] Tier-M: envelope widening → more intertidal cells; determinism
- [x] Probe `tidal-envelope`; `docs/slices/17.json`
- [x] Tier-O batched (metaphor conflict is owner) — dossier `docs/candidates/C-016-dossier.md` → **Pass** ([batch-maritime-shore.md](playtests/batch-maritime-shore.md)); **C-016 Locked** 2026-07-30
- [x] **Next-but-one:** Slice 18 wave exposure (§4.13)

---

### 4.13 Slice 18 — Wave exposure + coastal erosion *(Done — agent)*

**Why this exists.** C-017: fetch × wind → exposure; contribute shoreline change through geomorphology owner only. Honors the island's implied promise without SWE.

**Loops.** Sim: derived exposure field contributes Δelev/Δdepth into geomorphology. Game: windward shore retreats differently than leeward under one wind regime.

**Register / candidates.** **C-017** Open; C-015; GEO-002; T-006; `climate.windVector` (SIM §3.8).

**Bans.** Shallow-water equations as authority (EXTERNAL_REFERENCES). Second sediment writer.

**Gate.** After Slice 16 (tides optional).

- [x] Composition note; exposure from fetch × wind; geomorphology contribution path
- [x] Tier-M: sheltered vs exposed paired divergence; soil mass closes
- [x] Probe `shore-exposure`; `docs/slices/18.json`
- [x] Tier-O batched (shore-legibility owner) — dossier `docs/candidates/C-017-dossier.md` → **Pass** ([batch-maritime-shore.md](playtests/batch-maritime-shore.md)); **C-017 Locked** 2026-07-30
- [x] **Next-but-one:** Slice 19 beaches / longshore (§4.14 stub) — salinity (20) remains available after

---

### 4.14 Slice 19 — Beaches / longshore deposition *(Done — agent; **C-017 Locked** 2026-07-30)*

**Why this exists.** Exposure alone retreats the windward shore; longshore transport is what builds the lee beach and closes the coastal sediment story under **C-017**.

**Loops.** Sim: alongshore flux tendency from wind × shore tangent deposits downdrift via geomorphology inbox. Game: one wind regime scours one flank and feeds the other.

**Register / candidates.** **C-017** Open; GEO-002; T-006.

**Bans.** SWE authority. Second sediment writer. Cell-painted beaches.

**Gate.** After Slice 18.

- [x] Composition note; longshore tendency → geomorphology deposit path
- [x] Tier-M: windward loss ↔ leeward gain couples under one wind; mass closes
- [x] Probe `longshore-drift`; `docs/slices/19.json`
- [x] **Next-but-one:** Slice 20 salinity (§4.15 stub)

---

### 4.15 Slice 20 — Salinity *(Done — agent; **C-018 Locked** 2026-07-30)*

**Why this exists.** Salt is the everyday **C-010** legacy load on an island — the first mobile soil-column substance that gates habitat near the shore and gives S-008 something to taste (**C-018**).

**Loops.** Sim: ocean-sourced `soil.salinity` dilutes with freshwater; HSI / arrival read it. Game: a freshened hollow earns differently than a salty twin under one seed schedule.

**Register / candidates.** **C-018** Open; C-010; C-007; H-004; T-003; N-001.

**Bans.** Player cleanup tool. Separate salt mass-balance ledger fighting H-004. Scoring biota (N-002).

**Gate.** After Slice 19 (may follow C-009 material table if that lands first; may proceed with a single salt field while C-009 stays Open).

- [x] Composition note; salinity field + ocean source / freshwater dilution
- [x] Tier-M: paired freshened-vs-salty hollow divergent arrival; save-legacy round-trip
- [x] Probe `salinity-arrival`; `docs/slices/20.json`
- [x] C-018 dossier (owner S-008 **Pass** — [batch-salt-overseas.md](playtests/batch-salt-overseas.md) Q-A) → **C-018 Locked** 2026-07-30 ([owner-lock-batch.md](candidates/owner-lock-batch.md) row A)
- [x] **Next-but-one:** Slice 21 island biogeography (§4.16)

---

### 4.16 Slice 21 — Island biogeography *(Done — agent; **C-019 Locked** 2026-07-30)*

**Why this exists.** Slice 12's mainland-perimeter seed rain is wrong on an island — seeds arrive over water, sparsely, and richness should track area and isolation (**C-019**). Closes the maritime arrival story after salt gates who can establish (**C-018**).

**Loops.** Sim: overseas seed pressure replaces perimeter rain on island worlds; eligible richness monotonic in area ↑ / isolation ↓. Game: a smaller island earns fewer occupants under identical regimes; suitable cells can stay empty for long stretches.

**Register / candidates.** **C-019** Open; C-007 Locked; C-015; W-003; T-001; N-004.

**Study source.** EXTERNAL_REFERENCES MacArthur–Wilson + new-island succession; `docs/evidence/island-colonization.md` §4.

**Bans.** Species simulator / speciation. Stochastic free weather arrivals while **C-003** Open. Mainland perimeter rain as island default. Instant equilibrium community paint. Mangrove-as-only first life.

**Gate.** After Slice 20 (preferably after C-018 machine half — discharged).

- [x] Composition note; over-water dispersal kernel + area/isolation eligibility
- [x] Tier-M: paired small/large island under identical regimes; hash-stable (T-001); island worlds must not use perimeter mainland rain as sole source
- [x] Probe `island-arrival`; `docs/slices/21.json`
- [x] C-019 dossier (owner sparse-earned **Pass** — [batch-salt-overseas.md](playtests/batch-salt-overseas.md) Q-B) → **C-019 Locked** 2026-07-30 ([owner-lock-batch.md](candidates/owner-lock-batch.md) row A)
- [x] **Next-but-one:** Slice **S** substrate contrast (§4.17) — D-007 redirects away from later stubs until the clip moves

---

### 4.17 Slice S — Substrate contrast (**C-009**) *(Done — agent; **C-009 Locked** 2026-07-30)*

**Why this exists.** The thesis noun is still one undifferentiated soil. Under **D-007**, the next work must move the twenty-second clip — sand vs clay under the same storm is the highest clip yield per unit work, and it registers **no new Process** (property table + existing soilWater / geomorphology). Berm/dig ↔ `soil.depth` is closed (§4.1).

**Clip verdict (D-007).** Before claiming this slice done for queue purposes: can you film twenty seconds — berm on sand, berm on clay, same rain regime, no inspector — where a stranger sees two materials answer differently? Record Pass/Hold in the closeout commit body. Not a playtest; no ask gate.

**Gate.** After Slice 21 Done; displaced-mass closeout (§4.1) already green.

- [x] Composition note `docs/slices/S-composition.md`; material table `src/sim/terrain/substrates.ts` (sand, clay, rock)
- [x] `soil.material` (or equivalent class raster) + properties drive infil / porosity / erodibility — one law, data-driven (T-004)
- [x] Default island seed paints a readable sand/clay mosaic; encoding Tier-P without inspector
- [x] Probe `substrate-contrast`; geological **deposit** tool + probe `substrate-deposit`; `docs/slices/S.json`
- [x] C-009 dossier (owner legibility half; deposit framing vs N-001) → **C-009 Locked** 2026-07-30 ([owner-lock-batch.md](candidates/owner-lock-batch.md) row A)
- [x] **Next-but-one:** C-020 rain-feel mid-path (§4.18) — still no cloud `Process`

---

### 4.18 Slice R — Rain-feel mid-path (**C-020** / **C-004**, no new Process) *(Done — agent; D-007 clip **Pass** 2026-07-30)*

**Why this exists.** Owner: rain dial still reads as a spigot (island-brief, salt-overseas). Full atmospheric clouds/phase would register a new `Process` and is **gated by D-007** until a clip exists. This slice changes regime **temporal shape** + observer precip cues only.

**Clip verdict (D-007).** **Pass (2026-07-30).** Owner: when rain falls / stops, it reads as weather the world made rather than a faucet. Full clouds remain later under C-020.

**Gate.** After Slice S machine half green (may overlap presentation work).

- [x] Deterministic shower / front cadence inside climate-mean regimes (mean intensity conserved or baselines updated with reason)
- [x] Observer-only wind-aligned precip presentation (T-006)
- [x] Arid dry-down encoding retune if needed; Tier-P proxy — shower off + existing moisture darkening; no new Process
- [x] Update `docs/candidates/C-020-dossier.md`; FORCE_PANEL.md mid-path note
- [x] **Next-but-one:** D-007 clip **Pass** → Slice A+ AUD-003 (§4.19); full C-020 clouds still later

---

### 4.19 Slice A+ — Recovery audible (**AUD-003**) *(Done — agent; **C-014** still Open)*

**Why this exists.** Slice A wired water ambience (AUD-001 / AUD-002). **AUD-003** (Locked) still has no second bed: recovery / life should enrich the soundscape from actual state, not a victory sting. Clip gate is clear (D-007 Pass 2026-07-30); this slice registers **no** new `Process`.

**Loops.** Sim: none — pure observer (T-006). Game: after life has earned a foothold, ambient richness rises with a visible recovery field; dry / bare stays quieter (AUD-002 still holds).

**Register / candidates.** AUD-003 Locked; **C-014** Open (do not promote); T-006, T-001.

**Bans.** Writing WorldState from audio. Canned “restored” one-shot mix. Inventing wildlife presence fields — drive from an existing registry field (cover / biomass / arrival occupancy — pick one in composition note). Web Audio required for CI. Cloud / precip-phase `Process` (that is full C-020, later).

**Gate.** After D-007 rain-feel clip Pass.

- [x] Composition note `docs/slices/A-plus-composition.md` — which existing field drives the recovery bed
- [x] Second ambient bed in `AudioBus` (or sibling) — monotonic with chosen field; silence when field absent
- [x] Tier-M: write isolation + determinism (same field → identical mix); no sim RNG
- [x] Probe or unit evidence with numbers in closeout
- [x] `docs/slices/A-plus.json`; refresh C-014 dossier machine note if mapping changes
- [x] **Next-but-one:** Field Notebook UI (U-006) — §4.20; full C-020 clouds later; scenario campaign still gated on C-009/C-010 framing

---

### 4.20 Field Notebook UI (**U-006**) *(Done — **U-006 Locked** v2.0.12)*

**Why this exists.** U-006 (Current) requires a bounded causal explanation layer — event vocabulary, scale selection, uncertainty language, supported questions — without becoming an inspector dashboard or spoiling curiosity (U-004). Clip gate is clear; this slice registers **no** new `Process`.

**Loops.** Sim: none — notebook is an observer of existing events / fields. Game: after something noticeable happens, the player can open a short notebook answer that names causes already visible in the world.

**Register / candidates.** U-006 Locked (v2.0.12); U-004; T-006.

**Bans.** Charts as primary readout. Guaranteed next-move advice. Inventing events not backed by sim state. Cloud / precip-phase `Process` (full C-020, later).

**Gate.** After Slice A+ machine green.

- [x] Composition note `docs/slices/notebook-composition.md` — MVP question set + event vocabulary
- [x] Minimal notebook UI chrome (observer); seed from existing notebook strings
- [x] Tier-M: write isolation if it reads WorldState; no sim RNG
- [x] `docs/slices/notebook.json` (or equivalent id)
- [x] **Next-but-one:** full C-020 clouds (§4.21) — chosen at closeout (owner still wants clouds; scenario campaign still gated on C-009/C-010)

---

### 4.21 Full C-020 clouds / precip phase *(Done — agent; **C-020 Locked** v2.0.13)*

**Why this exists.** Slice R / mid-path rain-feel Pass left clouds as the remaining weather read. Full C-020 is a precip-phase / cloud `Process`.

**Clip verdict (D-007).** **Pass (2026-07-30, authorizing).** Slice R established the twenty-second clip — weather the world made. Owner queued full visible clouds / precip phase and directed §4.21. Clip exists → Process registration allowed.

**Loops.** Sim: `climate` Process owns `climate.cloudWater` / `airTemperature` / `precipPhase`; wet-day dawn charges cloud from the rainfall dial; storm window discharges via orographic `addRainField` (H-004). Game: sky builds; Heat dial selects rain / sleet / snow presentation; still no cell targeting.

**Register / candidates.** C-020 Open (do not Lock); D-007 Locked; C-004; T-001; T-006; H-004; N-004.

**Bans.** Skipping the twenty-second clip verdict. Place-targeted storms. Stochastic free weather while C-003 Open. Claiming C-020 Locked.

**Gate.** After Field Notebook machine green; clip Pass before coding the Process.

- [x] D-007 twenty-second clip verdict recorded in this entry before Process registration
- [x] Composition note + process ownership (`docs/slices/clouds-composition.md`)
- [x] Atmosphere Process + Heat dial + CloudMesh / phase cues
- [x] Tier-M: `src/sim/atmosphere.test.ts`; probe `cloud-delivery` (T-001, H-004, phase divergence)
- [x] `docs/slices/clouds.json` manifest
- [x] Notebook seed: “The sky thickened before the shower; the cold spell left the hollow pale.”
- [x] **Next-but-one:** scenario campaign / toxic-site premise (G-002 / C-010) — still gated on C-009 framing; or SWE store if Lock needs persistent snow

---

### 4.22 Slice N — Twin hollow salt memory encoding (**NS-006**) *(Done — agent)*

**Why this exists.** C-018 machine + Tier-O Pass shipped salt and crust tint; Nature P0 still needed the engagement **outcome** proxy — freshened green vs salty pale sparse under one seed schedule — so the clip reads as salt memory, not weather (D-007 / THESIS §8).

**Clip verdict (D-007).** **Pass (2026-07-30).** Owner [batch-salt-overseas.md](playtests/batch-salt-overseas.md) Question A: pale sparse shore felt like the ground still tasting of the sea. Machine: `saltMemoryEncodingDelta` > 0.15.

**Nature cards:** NS-006. **Register:** C-018 Open; C-007; C-011; D-007. **New Process?** no.

- [x] Composition `docs/slices/N-composition.md`; manifest `docs/slices/N.json`
- [x] `saltMemoryEncodingDelta` + presentation proxy (terrain + occupant)
- [x] No new owner ask (C-018 Q-A already Pass)
- [x] **Next-but-one:** NS-002 Heat→plant (§4.23)

---

### 4.23 Slice N2 — Heat dial plant gate (**NS-002**) *(Done — agent)*

**Why this exists.** Heat dial already drives precip phase (`climate.airTemperature`); plants ignored it. NS-002 adds `f_temp` under Open **C-004** / **C-020** — one field, inspectable limiting label (C-011).

**Clip verdict (D-007).** Exempt — no new Process. Encoding clip (NS-006) already Pass.

**Nature cards:** NS-002. **Register:** C-004 Open; C-020 Open; C-007 Locked. **New Process?** no.

- [x] Composition `docs/slices/N2-composition.md`; `temperatureComposition.ts`; Liebig arm id 4
- [x] `WorldState.runHabitatStep` reads air temperature; herb kill/opt in `config`
- [x] Tier-M: cold stalls / warm earns; non-limiting moisture cannot raise temp-limited HSI
- [x] Probe `heat-arrival`; notebook seed for temperature limiting
- [x] Study log: island-colonization growing season → `f_temp`
- [x] **Next-but-one:** NS-004 strand splash pioneer (§4.24 stub)

---

### 4.24 Slice N4 — Strand splash pioneer (**NS-004**) *(Done — agent)*

**Why this exists.** One new guild after Heat gate; couples salt + shore + overseas so strand vs inland herb are two bets (Nature P0 #3).

**Clip verdict (D-007).** Exempt — no new Process. Encoding clip (NS-006) already Pass.

**Nature cards:** NS-004. **Register:** W-003; E-004; C-007 Locked; C-018 Open; C-019 Open; N-001; N-004. **New Process?** no.

- [x] Composition `docs/slices/N4-composition.md`; manifest `docs/slices/N4.json`
- [x] Fields `veg.{seedBank,establishment,biomass}.strand`; `factorSalinityTolerant` + `evaluateStrandHsi`
- [x] One seed schedule; shore-limited inland; salt-tolerant shore (no herb HSI reuse)
- [x] Tier-M: `strandArrival.test.ts`; probe `strand-arrival`
- [x] Tier-P: `guildOccupantEncodingDelta` + olive strand tint
- [x] Notebook seed `colonized-strand`; schema v9 (strand seed bank legacy)
- [x] Study log: island-colonization stage 1 → strand guild
- [x] **Next-but-one:** NS-003 onshore spray stress (P1) — §4.25 stub

---

### 4.25 Slice N3 — Onshore spray stress gate (**NS-003**) *(Done — agent)*

**Why this exists.** Distinct spray stress from `soil.salinity` (island evidence §3); Wind × shoreExposure derived field for canopy / interior filter.

**Gate.** After NS-004 machine green.

**Nature cards:** NS-003  
**Register:** C-017 Open; C-018 Open; C-007 Locked; C-011 Open; N-004  
**New Process?** no  
**Study log:** island-colonization salt-spray gate → `f_spray` (**C-017**); rejected second salt ledger / `stress.spray` store

- [x] `f_spray = 1 − shore.exposure` on herb Liebig (exposure already onshore × fetch); keep distinct from soil salt
- [x] Strand omits spray arm — holds via `f_shore`; no new Process
- [x] Probe `spray-arrival` + unit tests; notebook `limited-spray`
- [x] Composition + manifest: [N3-composition.md](slices/N3-composition.md), [N3.json](slices/N3.json)
- [x] **Next-but-one:** NS-005 sand-binder (§4.26 stub)

---

### 4.26 Slice N5 — Sandy crest sand-binder (**NS-005**) *(Done — agent)*

**Why this exists.** Second shore guild after spray differentiates windward faces (NS-003). Dry sandy crests earn binding cover that blunts the next storm (thesis payoff #2).

**Loops.** Sim: one seed schedule → binder HSI on drainage × exposure × sand × burial; physicalCover → geomorph cFactor. Game: sandy berm crest greens and holds; wet hollow stays herb.

**Register / candidates.** W-003; E-004; C-007 Locked; C-009 Open; C-017 Open; N-001; N-004; T-004.  
**Study.** island-colonization dune binder → crest-gated HSI; rejected dune painter / second sediment Process.  
**Bans.** Ecosystem painter; invent Locked C-009/C-017; second Process owning cover/biomass.  
**New Process?** no.

**Gate.** After NS-003 machine green.

- [x] Guild HSI / fields per [NS-005](nature-study/cards/NS-005-sandy-crest-sand-binder.md) — `evaluateBinderHsi`, `veg.*.binder`
- [x] Probe `binder-arrival` twin vs herb; burial via `|longshore|` tolerance; coastal cFactor blunting
- [x] Composition + manifest: [N5-composition.md](slices/N5-composition.md), [N5.json](slices/N5.json)
- [x] Schema 10 (legacy binder seed bank); Tier-P binder khaki encoding
- [x] **Next-but-one:** C-005 branch-and-compare scaffold (§4.27 stub) — thesis hole after Nature encoding

---

### 4.27 Slice B — Branch-and-compare scaffold (**C-005**) *(Done — machine)*

**Why this exists.** THESIS §7: same castle, different forces — Habitat's original instrument. Force dials exist (Slice F / C-020); fork + compare was missing.

**Gate.** After N5 machine green. Owner Lock batch may run in parallel.

- [x] World fork / restore point API extending P-005 (T-001 hash equality under same seed+forces) — `src/sim/branch.ts` + `forceSettings.ts`
- [x] Two branches under different force settings; comparison view without number-reading — Show A/B + moisture tint
- [x] Tier-M round-trip + branch isolation — probe `branch-compare` (encoding ≈ 0.191, isolated = 1); Tier-O deferred to dossier
- [x] `docs/slices/B.json` + `B-composition.md` + [C-005-dossier.md](candidates/C-005-dossier.md) (Locked tooling v2.0.12)
- [x] **Next-but-one:** C-006 CI promote (§4.28)

---

### 4.28 Slice C-006 — Abundant sculpting CI promote *(Done — agent)*

**Why this exists.** DECISION_CONFORMANCE §3: C-006 Judge is CI/agent only — no per-edit economy; no siting path writes mature ecology (N-001, RC-004).

**Gate.** After Slice B machine green. May run whenever free; does not block owner Lock batch.

- [x] Conformance / unit test: no action-economy counters on berm/dig/deposit; no direct mature veg/biomass write from siting tools (`src/sim/c006-abundant-sculpting.test.ts`)
- [x] Promote C-006 when criterion fully met (agent authority §3.0) — register v2.0.11
- [x] **Next-but-one:** filed **C-021** / **C-022** (season + erosion dials); tip → C-013 → C-010 framing → Nature P1; C-012 only if place-reading still fails

---

### 4.29 Slice E — Exner-lite inland hillslope deposit *(Done — agent)*

**Why this exists.** Slice 8 eroded near-channel soil but destroyed the mass. NATURAL_PROCESS_MATH §3.8 Exner + GEO-002 require deposition where capacity drops. Mei-class capacity fudge (study) — not Hjulström gates, not a second Process.

**Loops.** Sim: hillslope removals → basin/flat redeposit inside geomorphology; ponds do not incise. Game: same castle, channels cut and hollows silt under one force regime.

**Register / candidates.** GEO-002 Locked; **C-002 Locked** (v2.0.12 — ratify Slice 8 reading). D-007 exempt (no new Process).

**Bans.** Virtual-pipe SWE authority; droplet particle sim; second sediment writer; inventing Locked Hjulström multi-grain policy.

- [x] `hillslopeDeposit.ts` weights + pond no-incise; integrate in `runGeomorphologyStep`
- [x] Tier-M tests + probe `hillslope-deposit`; `docs/slices/E.json` + composition
- [x] EXTERNAL_REFERENCES study log row (Mei-class capacity fudge)
- [x] **Next-but-one:** C-006 CI promote (§4.28) — **Done**

---

### 4.30 Slice N8 — Tidal inundation hydroperiod gate (**NS-008**) *(Done — agent)*

**Why this exists.** Completes the spray / soil-salt / inundation triad (island evidence §3). Tide dial + form siting already exist (C-016); plants ignored hydroperiod.

**Loops.** Sim: envelope hydroperiod → herb Liebig `f_inundation`; foreshore stalls upland. Game: widen Tide or sit in the wet band — inland green stays out; terrace above can establish.

**Nature cards:** NS-008  
**Register:** C-016 Locked; C-018 Locked; C-007 Locked; C-011 Open; N-004  
**New Process?** no  
**Study log:** island-colonization tidal inundation → `f_inundation` (**C-016**); rejected salinity collapse / tidal phase

- [x] `tidalHydroperiod` + `f_inundation` on herb Liebig (id 6); keep distinct from soil salt and spray
- [x] Strand omits inundation arm; no new Process; marsh guild deferred
- [x] Probe `inundation-arrival` + unit tests; notebook `limited-inundation`
- [x] Composition + manifest: [N8-composition.md](slices/N8-composition.md), [N8.json](slices/N8.json)
- [x] **Next-but-one:** NS-007 aspect light→Liebig (§4.31 stub)

---

### 4.31 Slice N7 — Aspect light into Liebig (**NS-007**) *(Done — machine)*

**Why this exists.** `light.insolation` already drives succession; arrival HSI ignores open-sky aspect. NS-007 promotes insolation → inspectable `f_light` without folding Beer–Lambert understory into the arrival gate.

**Nature cards:** NS-007  
**Register:** C-007 Locked; C-011 Open; N-004  
**New Process?** no  

- [x] `f_light` from `light.insolation` in herb Liebig; understoryLight stays succession-only
- [x] Probe twin north vs south face under one seed schedule (`light-arrival`)
- [x] Composition + manifest; **Next-but-one:** P2 salt-marsh engineer (§4.32 stub)

---

### 4.32 Slice N9 — Salt-marsh engineer guild *(Done — machine)*

**Why this exists.** NS-008 zeros upland herbs in the intertidal; a marsh engineer guild should *prefer* a hydroperiod hump (mid-envelope) and feed back into shore physics via cover — the castle coming alive in the wet band.

**Nature cards:** NS-009  
**Register:** C-016 Locked; C-007 Locked; C-011 Open; W-003; N-004  
**New Process?** no — new guild HSI + establishment; physicalCover feedback only  

- [x] Guild HSI hump on envelope hydroperiod (≠ upland `f_inundation` zero)
- [x] Probe foreshore marsh vs dry terrace under one seed schedule (`marsh-arrival`)
- [x] Composition + manifest; **Next-but-one:** woody/shrub guild (P2) — or C-020 G1 in parallel

---

### 4.33 Slice N10 — Climate-capped woody shrub *(Done — machine)*

**Why this exists.** Stage-3 structural escalation needs a climate-capped inland guild distinct from herb/marsh — warm herb-covered hollows escalate; frost and bare substrate lock woody out (NS-002 floor; island-colonization stage 3).

**Nature cards:** NS-010  
**Register:** C-007 Locked; C-011 Open; C-004 Locked; W-003; E-004; N-004  
**New Process?** no — new guild HSI + establishment; physicalCover feedback only

- [x] Warmer f_temp floor + cover facilitation + upland inundation zero
- [x] Probe warm covered vs cold/mild/bare under one seed (`shrub-arrival`)
- [x] Composition + manifest; **Next-but-one:** cryptogam/crust guild (P2)

---

### 4.34 Slice N11 — Cryptogam crust bootstrap *(Done — machine)*

**Why this exists.** Stage-2 cover & soil bootstrap needs a damp-bare guild before woody — open canopy preferred (opposite of shrub facilitation); moisture holding via physicalCover → infil (island-colonization stage 2).

**Nature cards:** NS-011  
**Register:** C-007 Locked; C-011 Open; W-003; E-004; N-004  
**New Process?** no — new guild HSI + establishment; physicalCover feedback only

- [x] Moisture × open canopy × salt × upland inundation HSI
- [x] Probe damp bare vs dry/shaded/salty under one seed (`crust-arrival`); infil delta positive
- [x] Composition + manifest; **Next-but-one:** residual Lock C-014 / C-010 implement (nutrients stay off tip)

---

### 4.35 Slice G — Season + erosion-intensity force dials *(Done — machine; both Open)*

**Why this exists.** The two empty Force-panel stubs named in AGENTS.md, the [gap review](reviews/2026-07-30-sim-gap-review.md), and [ISLAND_FORCES.md](ISLAND_FORCES.md); both gated only on C-006 (Locked); DECISION_CONFORMANCE explicitly permits sharing one slice.

**Register:** C-004 Locked; C-011 Open; T-001; T-004; H-004; S-007; N-004; C-021 Open; C-022 Open
**New Process?** no — season scales the existing seasonal `vegetation` tick; erosion scales the existing `geomorphology` erosion terms (never production). D-007 clip gate does not apply.

- [x] Season pressure multiplier (`short`/`typical`/`long`) on `runHerbEstablishmentStep`; `typical` = 1 neutral
- [x] Erosion intensity multiplier (`calm`/`moderate`/`stormy`) on hillslope + coastal erosion terms only; `moderate` = 1 neutral
- [x] `ForceSettings` extended; travels through branch/save for free (no `branch.ts` changes)
- [x] Two new Force-panel selects, no cell arguments
- [x] Probes `season-regime` / `erosion-intensity`: paired divergence, neutral-default regression guard, mass conservation (erosion), replay determinism
- [x] Composition + manifest ([G-composition.md](slices/G-composition.md), [G.json](slices/G.json)); dossiers [C-021](candidates/C-021-dossier.md) / [C-022](candidates/C-022-dossier.md) — machine half only, **do not Lock**
- [x] **Next-but-one:** owner Lock sitting for C-021/C-022 taste (+ residual C-014); if no sitting, file storm-surge / freshwater-lens candidates from [ISLAND_FORCES.md](ISLAND_FORCES.md) owner gaps

---

### 4.36 Slice L1 — Time throughput defect *(Done — shipped with L6; defect, not a feature)*

**Why this exists.** [Living-world review](reviews/2026-07-31-living-world-review.md) §3. `config.maxStepsPerFrame = 5` caps throughput below what the 16× control demands, and `SimClock.tick` **discards** the excess instead of deferring it (the accumulator is drained by `excess` after the counter increments). Measured: event step **0.774 ms** → 22 steps/frame affordable in a 16.7 ms budget; the 16× button runs **3000 of 9600** steps per 10 wall-s → effective **5.00×**, 6600 discarded. At effective 5× one sim-year takes ~115 wall-seconds. "Run time forward and look" is the mechanism the whole loop routes through ([THESIS.md](THESIS.md) §4), so this throttles the payoff directly. The "wanting rates beyond 16×" note recorded under **C-004** is partly this defect, not product feedback.

**First, because** L2 and L3 play out over sim-decades; verifying them by eye at effective 5× is the expensive path.

**Already specified.** [SIMULATION_MODEL.md](SIMULATION_MODEL.md) §6.4 documents this exact defect — *"`config.maxStepsPerFrame = 5` currently drops the surplus silently, which dilates simulation time under load… Under S-009 the dropped time must be visible."* This slice is the spec being implemented, not a new idea. §6.4 also states the intended response to *sustained* debt is to lower the player's rate rather than skip ticks; keep that, and make the debt visible and payable rather than discarded.

**Register:** S-009; T-002; T-001; C-008 Open (latency budget)
**New Process?** no — presentation cadence only; fixed timestep is unchanged, so determinism and every probe baseline are untouched. D-007 clip gate does not apply.

- [x] `maxStepsPerFrame` 5 → **16**, measured: 0.918 ms/event step in the worst realistic case (wet, crossing every band) → 18 fit a 16.67 ms frame with no render left; 16 keeps ~1.9 ms of budget and ~4.8 steps/frame of catch-up above the fastest offered rate ([time-throughput.md](evidence/time-throughput.md))
- [x] `SimClock` carries the surplus in the accumulator as **deferred** debt paid down on later frames; `maxStepsPerFrame` stays the hard per-frame catch-up ceiling and a separate `config.maxTimeDebtSteps = 64` is the spiral-of-death guard
- [x] `getTimeDebt()` now means *owed* and `getDroppedSteps()` means *abandoned past the guard* — two counters where there was one; the HUD names the §6.4 response ("lower the rate") when the second is non-zero
- [x] Test: `time-invariance.test.ts` — steps run = steps demanded within one frame of slack at the fastest offered rate, a stalled frame is paid back rather than discarded, and the guard still bounds worst-case frame cost
- [x] Regression: every probe baseline and `GOLDEN_*` hash **unmoved** — full gate green, no baseline file touched
- [x] Composition + manifest ([L1-L6-composition.md](slices/L1-L6-composition.md), [L1-L6.json](slices/L1-L6.json)); **Next-but-one:** L2 local seed rain (§4.37)

---

### 4.37 Slice L2 — Local seed rain *(Done — agent; deep-time baseline refreshed)*

**Why this exists.** [Living-world review](reviews/2026-07-31-living-world-review.md) §1. `runDispersalStep` writes seed pressure as a pure function of distance-to-shore; `veg.biomass.*` is read only for HSI facilitation and is **never a propagule source**. Every seed arrives from off-map forever on a λ = 4 cell kernel. Measured on the default island (3562 land cells, max shore distance 32): **52.1%** of land reaches p_establish ≥ 10% at perfect HSI, **32.4%** sits at 1–10% (decades), **15.6%** below 1% (never). A founded meadow never expands; burned interior never returns, because refugia require local sources; a perfect hollow 25 cells inland reads HSI 1.0 and stays bare with no legible reason — the **C-011** failure mode exactly.

**This implements Locked C-007, it does not depart from it.** C-007's implications already say *"dispersal pressure is a real path — occupancy is never copied from HSI alone."* Today dispersal is a static field, not a path.

**Register:** C-007 Locked; C-019 Locked; C-011 Open; C-003 Open (no stochastic arrivals); T-001; E-005; W-003; N-004
**New Process?** no — changes what `dispersalProcess` sources pressure *from*; band, ownership, and field set are unchanged. D-007 clip gate does not apply.

- [x] Seed pressure = external term + local term: `overseas(d) + Σ_neighbours (biomass / biomassMax) · kernel · strength`, as a deterministic separable convolution (no RNG — **C-003** is Open). Unit-mass kernel + capacity-normalized occupancy bound the local term by `localSeedStrength`; zero biomass ⇒ exactly zero local term, so the cold-start field is bit-identical to pre-L2
- [x] `dispersalProcess.reads` was missing `veg.biomass.crust` (now that each guild seeds its own kind) — added; all six `veg.biomass.*` now declared `lagged`. The sort is per-band and dispersal is alone in `annual`, so the real edge is cross-band (seasonal writes → annual reads = previous band commit); declaring it makes the lag citable instead of an accident of band order (SIMULATION_MODEL §5)
- [x] Per-guild dispersal distance only where a referent exists (**N-004**): strand λ 6 (Slice N4 card, sea-dispersed / hydrochory), crust λ 1 (Slice N11 card, mats), one shared λ 2 for herb / binder / marsh / shrub whose cards state no dispersal mode — four invented numbers is exactly what N-004 bans
- [x] **C-019 guard:** measured sweep of `localSeedStrength` against the isolation signal — shipped value keeps 97% (y2) / 90% (y3) of the pre-L2 large-near vs small-far ratio, swamping is 4–8× away; `eligibleRichness` untouched, `S_elig` 0.087 vs 0.542 unchanged. `spread-front` asserts ratio > 1.5 and `S_elig` ordering
- [x] New probe `spread-front`: founded patch grows 9 → 61 → 129 cells over four years against a no-patch control pinned at **0** (re-measured each run — it is what proves the sample band isolates the local term); front stalls at a salt ring at or below background; refugium recovery 2.364 vs 0.0038 no-refugium control
- [x] Baselines: **only `deep-time` moved** — the one scenario running the full band cascade long enough for biomass to feed back into seed pressure (`p005.hashMatch` still 1, so P-005 determinism intact). `arrival-earned` / `island-arrival` / the six `*-arrival` probes did **not** move, correctly: each calls `runDispersalStep` once at t = 0 before any biomass exists, so the local term is identically zero and the change is a provable no-op for them
- [x] Composition + manifest ([L2-composition.md](slices/L2-composition.md), [L2.json](slices/L2.json)); **Next-but-one:** L3 mortality as a rate (§4.38) — confirmed still specified to §4.3 depth, unchanged

---

### 4.38 Slice L3 — Mortality as a rate *(queued)*

**Why this exists.** [Living-world review](reviews/2026-07-31-living-world-review.md) §2. `nextHerbBiomass` returns `min(capacity, biomass + growth)`, so an HSI collapse from 1.0 → 0.2 takes biomass **2.500 → 0.500 in a single band**. Loss is instantaneous; only recovery has a rate — backwards from real ecology, where loss is fast but finite and recovery is slow. Vegetation is therefore a *render of current HSI* rather than a state with history, and every scrap of ecological memory in the world lives in `soil.depth` / `soil.salinity` / `soil.porosity` with **none in the biota**. That is a bigger hole under **S-007** / **S-008** than the missing contaminant field **C-010** was filed for, and far cheaper to close.

**Register:** S-007 Locked; S-008 Current; ES-006 Locked; ES-002; C-011 Open; T-001; N-004
**New Process?** no — changes the biomass update law inside the existing seasonal tick. D-007 clip gate does not apply.

- [ ] Replace the clamp with a first-order decline toward capacity: when `biomass > capacity`, `biomass -= mortalityRate · (biomass − capacity) · dt`
- [ ] Per-guild mortality rate with a referent (**N-004**) — crust and herb do not die back on the same timescale as woody shrub; keep the numbers in `config.ts` beside the establishment rates
- [ ] Capacity stays `biomassMax · HSI` — **ES-006**: mortality must not smuggle in a fixed ecological K
- [ ] Test: a drought pulse shorter than the mortality timescale is **ridden out**; a longer one is not — the asymmetry is the point
- [ ] New probe `dieback-lag` (or extend `disturbance-recovery`): time-to-half-biomass after an HSI collapse is finite and guild-ordered; recovery still slower than loss
- [ ] **S-008 check:** the notebook / limiting-factor readout should be able to say *which* past condition the standing biomass is still carrying — this is the first biological hysteresis the register can point at
- [ ] Baselines: guild `*-arrival` and `disturbance-recovery` will move; state the reason in the commit body
- [ ] Composition + manifest; **Next-but-one:** L4 biotic motion (§4.39)

---

### 4.39 Slice L4 — Biotic motion *(queued; presentation)*

**Why this exists.** [Living-world review](reviews/2026-07-31-living-world-review.md) §0 / §5. Water smooths, clouds drift, rain slants with wind — and life is a field of **static cones** (`OccupantMesh`, `ConeGeometry`, colour and height keyed to biomass, zero motion). **D-007** is Locked and the twenty-second clip currently reads as a diorama with weather over it. This is the cheapest item on the list that moves the clip.

**Register:** D-007 Locked; T-006; ART-003; ART-002; C-014 Open (audio residual, adjacent)
**New Process?** no — presentation only; reads existing fields, writes no WorldState. **T-006** holds: no GPU state is authoritative.

- [ ] Per-instance sway keyed to the existing global wind vector, phase from cell index — one sine, shader-side; sway amplitude scales with guild height and with wind magnitude
- [ ] Motion must be a **readout of forcing**, not ambient decoration: still air is still, storm wind lays the sward over (**C-011** — the referent is what the player already knows about grass in wind)
- [ ] Dying biomass under L3 should read differently from absent biomass — standing dead does not sway like green
- [ ] Presentation proxy in `presentation.proxy.test.ts`: sway amplitude monotone in wind magnitude; zero at zero wind
- [ ] Record the twenty-second clip verdict in this entry (**D-007** — one sentence, no number, no owner session)
- [ ] **Next-but-one:** L5 is gated on C-023 judgment; if no sitting, take the residual Lock queue ([owner-lock-batch.md](candidates/owner-lock-batch.md))

---

### 4.40 Slice L5 — Guild competition *(blocked on C-023 — do not implement)*

**Why this exists.** Six guilds stack additively into `physicalCover` and **no guild is ever displaced**. Succession is parallel accumulation, not replacement. Filed as **C-023** Open ([register §16.5](DECISION_REGISTER.md), criterion in [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) §3).

**Status.** Open candidate, owner-judged. Per §4.0.1, **implement nothing under it** — the entry exists so the question is filed rather than answered by an agent. Ordering is also causal, not just procedural: without L3's mortality rate there is no mechanism by which a suppressed guild can recede, so building this first would measure nothing.

**Likely shape (hypothesis only).** Shorter guilds read `light.understory` instead of open-sky `light.insolation` in their HSI, making displacement a consequence of the Beer–Lambert budget `lightCompetition.ts` already computes rather than a new rule or a dominance table.

---

### 4.41 Slice L6 — Real-world time units *(Done — shipped with L1)*

**Why this exists.** [Time-architecture review](reviews/2026-07-31-time-architecture-review.md) §1. The rate control is a multiplier against a base nobody can state. Measured: **"1×" is 54,000× real time** (one 15-sim-minute step per 1/60 wall-second), "4×" is 216,000×, and "16×" — at its effective 5.00× — is 270,000×. **True real time is unreachable**, by a factor of 54,000. Replace the multipliers with rates a person can name: `1 s/s` (real time) · `1 min/s` · `1 h/s` · `1 day/s` · `1 year/s`, with the reachable ceiling stated honestly rather than implied.

**No candidate needed.** **T-002** is Locked and says exactly this: *"Exact multipliers are tuning parameters rather than constitutional decisions."* This is permitted tuning plus presentation, and it changes no authoritative outcome.

**Register:** T-002 Locked; S-009 Current; D-006; U-003; C-008 Open
**New Process?** no — rate values and labels only; the fixed timestep and every band period are untouched, so no baseline may move. D-007 clip gate does not apply.

- [x] Rate control expressed as **sim-time per wall-second** in `src/ui/timeRates.ts`, derived there and nowhere else from `config.eventDtMinutes` + `config.wallSecondsPerEventStep` — the label cannot drift from the clock
- [x] True real time (`1 s/s`) reachable at the slow end. Offered ladder: Pause · `1 s/s` · `1 min/s` · `1 h/s` · `1 day/s` · `1 week/s`; default `1 day/s`, the nearest nameable rate to the old "1×"
- [x] The ceiling is **honest**: every offered rate measured at **100.0% delivery, zero dropped**. `1 month/s` is in the ladder but withheld by `sustainableRates()` — measured at **33.3% delivery, 7616 steps dropped**, the same shape as the old "16×" at an effective 5.00× ([time-throughput.md](evidence/time-throughput.md))
- [x] HUD leads with the rate label and elapsed **simulation** time in real units — `3h 15m` → `2d 12h` → `2y 5d` on the world's own 360-day calendar
- [x] Test: `timeRates.test.ts` — label ↔ delivered sim-time agree to within the clock's own quantum (one event step) at every offered rate; ceiling asserted against the first withheld rate. Every probe baseline and `GOLDEN_*` hash **unmoved**
- [x] **Known incoherence surfaced, not fixed:** no band period is rescaled here; the 10×-fast annual and 360×-fast decadal bands are now legible because the clock speaks in real units. **C-024** decides it — recorded in the composition doc and the evidence note
- [x] **Next-but-one:** L7 activity-gated event band (§4.42) — ships only on hash-identity

---

### 4.42 Slice L7 — Activity-gated event band *(queued; ships only on hash-identity)*

**Why this exists.** [SIMULATION_MODEL.md](SIMULATION_MODEL.md) §6.2 specifies the event band as **activity-gated** — *"Between storms the ladder starts at `daily`"* — and argues it is determinism-safe because the gate is a pure function of authoritative state. It is **not implemented**: `WorldState.stepEvent` runs the event band unconditionally. Measured payoff ([review](reviews/2026-07-31-time-architecture-review.md) §3): a century falls from **39.9 min to 6.7 min** of CPU at 30 storm-days/year.

**Register:** S-009 Current; T-001 Locked; T-002 Locked; H-001; S-005
**New Process?** no — a gate predicate in front of an existing band. D-007 clip gate does not apply.

- [ ] Gate predicate exactly as §6.2 specifies: any `water.surfaceDepth > dryEpsilon`, or precipitation anywhere, or any cell burning — a pure function of authoritative state so replay is identical
- [ ] **The atmosphere caveat:** `atmosphereProcess` is in the event band and charges `climate.cloudWater` between storms. A naive gate would freeze cloud charging and change outcomes. Either exclude atmosphere from the gate or advance it analytically across the skipped span — decide with the measurement, and say which in the composition doc
- [ ] `clock.simMinutes` still advances across gated spans; the clock is not the thing being skipped
- [ ] **Ship gate: hash-identity.** New probe asserts `stateHash()` identical for gated vs ungated runs over a wet→dry→wet span crossing daily, seasonal, and annual boundaries. Not a tolerance — identity. If identity cannot be reached, the residue is **C-025**'s, and this slice stops at whatever subset is exact (§4.0.1 blocked note)
- [ ] Every existing probe baseline **unmoved** — that is the same claim as hash-identity, stated where CI will catch it
- [ ] Composition + manifest; **Next-but-one:** L8 is blocked on C-024 / C-025; if no owner sitting, take the residual Lock queue

---

### 4.43 Slice L8 — Deep-time ladder *(blocked on C-024 + C-025 — do not implement)*

**Why this exists.** Centuries are not reachable by throughput. Measured cost of one sim-year by integration floor ([review](reviews/2026-07-31-time-architecture-review.md) §3): today **23.95 s** (century = 39.9 min) · activity-gated **3.99 s** (6.7 min) · daily floor **2.03 s** (3.4 min) · seasonal floor **0.40 s** (39.6 s) · decadal floor **0.09 s** (**9.2 s**). Getting to seconds-per-century needs the ladder to start lower at high rates **and** the band calendar fixed — the compressed decadal schedule fires 36× a sim-year where the spec calendar fires 0.1×, and that is where the last two orders of magnitude live.

**Status.** Blocked on two owner-judged Open candidates: **C-024** (what a sim-year means) and **C-025** (may the rate select the integration floor). Per §4.0.1, **implement nothing under them**. The block is real, not procedural: floor selection means the same world at `1 day/s` and `1 decade/s` produces different numbers, because a decadal-floor century is **ten band calls** rather than a century of integration — and that trades directly against **S-009** rate-invariance and **T-002**.

**Do not** attempt a partial version that skips bands "only a little". A silent tolerance is the one failure mode where nothing goes red: **T-001** replay, **P-006** fairness, and **C-005** comparison all break without a test noticing. If deep time is wanted before the candidates are judged, the honest interim is **L1 + L7**, which buys 39.9 min → 6.7 min with outcomes provably unchanged.

**Framing written** ([C-024-C-025-framing.md](candidates/C-024-C-025-framing.md)): leading direction is a discrete skip-duration menu (1 day … 1000 years) bound per-preset to a floor, replayed as a sparse action log — a control surface separate from the L6 rate ladder, not a mode of it. Still framing only; implement nothing until both owner sittings in the dossier are held.

---

### 4.44 Slice — Fire spread as a rate *(Done — machine)*

**Why this exists.** [Fire/fuel review](reviews/2026-07-31-fire-fuel-review.md) §1–§3. `runFireStep` ignores `dt` and its BFS runs to full queue exhaustion in one call — an entire connected fuel region burns instantly and every burn flag clears before the function returns, so `fire.burning` (a declared written field) is never observably `1` outside the function, and a 1-hour tick burns identically to a 30-day tick. The only reset of `fire.intensity` lives in a post-effects loop an early return skips when no sources remain, so a fire that has gone out reports its last burn's intensity forever. `visited` is also marked before the spread test passes (`WorldState.ts:1831–1832`), so a cell rejected from one neighbor can never be re-probed from a better one — burn shape is an artifact of scan order, worst exactly on ridgelines. Slice 10 ([§4.5](#45-slice-10--fire--fuel-done--agent)) claims deterministic BFS and Tier-M conservation; both survive, but nothing about the slice's own claims describes fire as instantaneous or as leaking stale intensity.

**Register:** T-001 Locked (determinism); T-006 Locked (single WorldState authority); C-003 Open (authored ignition only, unaffected by this fix); ES-002 (disturbance is a process, not a punishment)
**New Process?** no — changes the internals of the existing fire step (rate-limiting, lifecycle, neighbor-test ordering); reads/writes/band are unchanged. D-007 clip gate does not apply.

- [x] BFS expansion capped per step at `ROS · dt / cellSizeMeters` rings instead of running to exhaustion; `fire.burning` stays set on active cells between steps so a fire has visible duration — `fireRateOfSpreadMetersPerMinute = 2` (≈0.033 m/s, unwinded surface fire) → **3 rings** at the shipped event step. Reach measured linear in `dt`: **25 / 85 / 313** burned cells at **3 / 6 / 12** rings, each exactly the Manhattan diamond its budget predicts. A 16² sheet of 3.0 kg/m² fuel now takes **7 steps** to burn out.
- [x] Track active/burning cells explicitly (replacing the full-grid `Uint8Array` visited scan each call) so `fire.intensity` clears on cells that stop burning without depending on an early return that skips cleanup — this is the same fix that resolves the stale-intensity bug. Cleanup moved into the same pass that collects the front, on the near side of the early return; measured `0.85` → `0` across the step after the last active cell goes out. Two full-grid passes plus a per-call allocation became one pass and a persistent stamped `Int32Array`.
- [x] `visited` gates re-enqueuing a cell already in the frontier; only cells that actually ignite become permanently unavailable — a cell that fails the gate from one neighbor must remain probeable from another. Ignition is now the logical OR over probing neighbours, and the frontier is re-sorted ascending each ring, making the "sorted queue by index" comment true of a queue that was in fact a plain FIFO.
- [x] Clamp the slope factor (`WorldState.ts:1841`, currently unbounded `exp(slopeA · dz/dx)`) so a player-sculpted near-vertical face cannot become an unconditional ignition source regardless of moisture — `fireSlopeFactorMax = 5`, sized against the gate it must lose to: at the ceiling a cell still needs soil moisture below ~0.97 × extinction to catch, so moisture stays decisive at every sculptable gradient. Verified at 500 m rise across one 10 m cell (unclamped `e^40`).
- [x] Test: two ticks of different `dt` on the same ignition produce proportionally different burned area, not identical instantaneous results; a fire that stops spreading reports `fire.intensity = 0` within one tick of its last active cell going out
- [x] New probe or extend `fire.test.ts`: burn shape is invariant to a rotation of the neighbor-check order (closes the "sorted queue by index" comment's actual claim) — ten tests added to `fire.test.ts`. The case is discriminating, not tautological: **32 cells** on the ridged fixture have order-dependent outcomes, and replaying the replaced mark-before-test rule there, two of three neighbour-order rotations produce a different burn (one changes the count 42 → 41).
- [x] Baselines: `fire.test.ts` and `burn-recover` will move — state the reason in the commit body — **`burn-recover` moved; `fire.test.ts` did not.** All 19 pre-existing fire assertions pass unchanged, which is the useful result: every behaviour Slice 10 already claimed survived the rewrite. `fire.burnedCells` 256 → **133**, and 133 is exactly the 49-cell ignition brush disc plus 3 rings, matched cell-for-cell against an independent computation; `fire.consumed` 741.465 → **385.214** = 133 × 3.4075 × 0.85. `determinismMatch` stayed **1**. No other baseline moved.
- [x] Composition + manifest — [fire-spread-rate-composition.md](slices/fire-spread-rate-composition.md) / [fire-spread-rate.json](slices/fire-spread-rate.json); **Next-but-one:** §4.45 Fuel / scar numeric fix (already specified to §4.3 depth below — confirmed adequate, not rewritten)

---

### 4.45 Slice — Fuel / scar numeric fix *(queued)*

**Why this exists.** [Fire/fuel review](reviews/2026-07-31-fire-fuel-review.md) §4. `runFuelAccumulationStep` is explicit Euler for `dF/dt = I − kF` with the decay coefficient clamped (`k = min(1, fuelDecayK·dt)`) but the input left unclamped — for `dt ≥ 1/fuelDecayK` the equilibrium becomes `cover·I·dt`, growing without bound until it pins at `fuelLoadMax`, so fuel load on the decadal band becomes a function of tick size rather than of climate. `decayFireScar` has the identical shape: it advertises "exponential fade" but implements `scar·(1 − 0.08·dt)`, which hard-zeroes at `dt ≥ 12.5` instead of decaying. This is a **Refinement-class** invariant failure in the §2.1 sense (dead `dt` / non-convergent schedule) — the exact bug class the deferred-time-debt work in **L1** exists to make visible by running variable/catch-up timesteps in the first place.

**Register:** T-001 Locked; S-009 Current (durations invariant under chosen rate — a `dt`-dependent equilibrium violates this directly)
**New Process?** no — replaces the update law inside the existing fuel/scar steps. D-007 clip gate does not apply.

- [ ] Replace both explicit-Euler updates with the analytic, unconditionally stable form: `F' = F·e^(−k·dt) + (I/k)(1 − e^(−k·dt))`
- [ ] Move the scar decay rate (currently hardcoded `0.08` at `WorldState.ts:1879`) into `config.ts` beside `fuelDecayK` and `fuelInputMax` (AGENTS.md: numbers in config are generated, not typed)
- [ ] Test: fuel load and scar value at a fixed sim-time are within tolerance regardless of whether that time was reached in one large step or many small ones (the Refinement invariant, stated as a probe)
- [ ] Baselines: any probe touching fuel load or scar decay under variable timestep will move — state the reason in the commit body
- [ ] Composition + manifest; **Next-but-one:** §4.46 HSI curve-shape corrections

---

### 4.46 Slice — HSI curve-shape corrections *(queued)*

**Why this exists.** [Vegetation/habitat review](reviews/2026-07-31-vegetation-habitat-review.md) §2.1. Six suitability factors are monotone ramps where the physically correct shape is a hump or threshold-slope — and that correct shape already exists elsewhere in the same file set: `factorInundationMarsh` (`inundationComposition.ts:42-45`) is a proper hump next to the upland arm's hard step at MHW; `factorSalinityTolerant` (`salinityComposition.ts:24-33`) is a proper threshold-slope next to the plain linear `factorSalinity`. Temperature has no upper limb (a 50°C world scores optimal for every guild), moisture has no wet limb for herb/shrub/crust (crust — a desiccation-adapted organism — is scored best at saturation), binder burial tolerance is inverted (sand binders require burial to stay vigorous; the current curve rewards sitting still), and strand/binder exposure factors have no destructive limb. The MHW step is the most consequential in combination with **L3**: a cell eroding across MHW by a millimetre loses its entire mature stand in one tick once mortality has no rate either.

**Register:** C-007 Locked; C-011 Open (real-world intuition is the instrument — binder burial response and crust moisture response are both currently backwards against their real referents); S-007 Locked; N-004
**New Process?** no — corrects suitability-curve shapes inside existing `*Composition.ts` files; the Liebig min-scan machinery itself is unchanged (verified correct — [review §3](reviews/2026-07-31-vegetation-habitat-review.md)). D-007 clip gate does not apply.

- [ ] Upland inundation gets the supratidal taper marsh already has (`inundationComposition.ts`)
- [ ] Intolerant-guild salinity gets a lower plateau on the existing `factorSalinityTolerant` shape (`salinityComposition.ts`)
- [ ] Temperature gets an upper limb — unimodal, right-skewed thermal performance curve (`temperatureComposition.ts`)
- [ ] Moisture gets a wet-side penalty for herb/shrub, and is inverted (peaks low-to-moderate) for crust specifically (`hsiComposition.ts`, `shrubHsiComposition.ts`, `crustHsiComposition.ts`)
- [ ] Binder burial tolerance becomes a hump with optimum at moderate accretion, and the forcing term switches from `|longshore|` (magnitude) to the transport divergence ∂Q/∂x — uniform drift should net zero burial pressure (`binderHsiComposition.ts`)
- [ ] Strand/binder exposure gets a destructive upper limb matching marsh's existing hump shape (`strandHsiComposition.ts`, `binderHsiComposition.ts`)
- [ ] `factorSandSubstrate` gets `clamp01` — the one unbounded curve in the set of sixteen (`binderHsiComposition.ts:60-66`)
- [ ] Test: each corrected curve is unimodal or threshold-shaped as specified, bounded [0,1], and the MHW/burial/moisture edge cases named above no longer produce the described backwards result
- [ ] Baselines: guild `*-arrival` and HSI-dependent probes will move — state the reason in the commit body
- [ ] Composition + manifest; **Next-but-one:** §4.47 Guild cover & light-competition correctness

---

### 4.47 Slice — Guild cover & light-competition correctness *(queued)*

**Why this exists.** [Vegetation/habitat review](reviews/2026-07-31-vegetation-habitat-review.md) §2.2–§2.3. `physicalCoverFrom` sums six guild fractions and clamps at 1 (`arrivalComposition.ts:196-205`); overlapping canopies physically combine as `1 − Π(1 − cᵢ)`, not a sum — three guilds at 40% independent cover give 0.78 by the correct formula but clamp to 1.0 here, which both overstates coupling into roughness/infiltration and flattens it past saturation. `canopyCoverFraction` has the identical defect for crust shading (`crustHsiComposition.ts:55-77`). Separately, nothing in this slice reads `light.understory` or `veg.leafAreaIndex` — `factorLight` uses open-sky insolation only (`lightComposition.ts:28`), so **there is no light competition between guilds today** — and a cell's own cover growth is scaled by its own *transmitted* light (`WorldState.ts:1412,1416`) when photosynthesis is driven by *absorbed* light, the inverse relationship, already double-counted by the same line's `(1 − cover)` logistic term. `LAI = cover · maxLAI` (`lightCompetition.ts:45`) is linear where the Beer–Lambert law it feeds implies `LAI = −ln(1−cover)/k` — full cover currently leaves a nonzero light floor instead of approaching darkness.

**Register:** C-023 Open (guild competition — this slice does not decide C-023, but the understory mechanism C-023's leading direction already names as the natural displacement path is currently unused; fixing absorbed-vs-transmitted light here is a prerequisite, not an implementation of C-023 itself); ES-006 Locked; C-011 Open
**New Process?** no — corrects the cover-combination formula and the light term the existing vegetation growth law reads. D-007 clip gate does not apply. **Does not implement C-023** — guild competition/displacement remains blocked on owner judgment; this slice only fixes the physics the eventual mechanism would ride on.

- [ ] `physicalCoverFrom` and `canopyCoverFraction` switch from additive-clamped to product-complement (`1 − Π(1 − cᵢ)`)
- [ ] Vegetation growth reads absorbed light (`I₀(1 − exp(−k·LAI))`) instead of transmitted light, removing the double-count with the existing `(1 − cover)` logistic term
- [ ] `LAI = cover · maxLAI` replaced with the Beer–Lambert-consistent inverse form
- [ ] Test: three guilds at 40% independent cover combine to ≈0.78, not 1.0; full-cover LAI produces near-zero transmitted light, not a floor
- [ ] Baselines: roughness/infiltration-dependent probes and any guild growth-rate probe will move — state the reason in the commit body
- [ ] Composition + manifest; **Next-but-one:** §4.48 Habitat/dispersal determinism hygiene

---

### 4.48 Slice — Habitat/dispersal determinism hygiene *(queued)*

**Why this exists.** [Vegetation/habitat review](reviews/2026-07-31-vegetation-habitat-review.md) §2.4. Three independent hygiene defects in the same code region: `habitatProcess`'s declared `reads` (`habitatProcess.ts:12-18`) omits `this.terrain.data` and `this.soilMaterial.data`, both silently consumed inside `runHabitatStep` — invisible to any future scheduler dependency analysis. `runHerbEstablishmentStep` updates guilds sequentially with downstream guilds reading already-updated upstream values in the same tick (`WorldState.ts:1661,1718,1738-1742`) — a Gauss-Seidel update where the §2.1 Symmetry invariant class calls for order-independence. `runDispersalStep` and `runHerbEstablishmentStep` compute the identical six-guild HSI math twice, at different cadences (annual vs. seasonal, `WorldState.ts:1498-1559` vs. `1670-1747`), so the displayed `veg.establishment.*` field can silently disagree with what actually drove growth.

**Register:** T-001 Locked; T-005 (registered fields inspectable — undeclared reads undermine this)
**New Process?** no — scheduling/read-declaration and code-dedup hygiene only. D-007 clip gate does not apply.

- [ ] `habitatProcess.reads` declares `terrain.elevation` (or whatever field backs `terrain.data`) and `soil.material`
- [ ] Guild establishment update switches to a Jacobi snapshot at tick start, removing same-tick order dependence
- [ ] `runHerbEstablishmentStep` reads the HSI values `runDispersalStep` already computed and wrote, instead of recomputing them
- [ ] Test: swapping the guild update order in source produces byte-identical results (closes the Symmetry gap directly)
- [ ] Composition + manifest; **Next-but-one:** §4.49 Drainage flat-routing correctness

---

### 4.49 Slice — Drainage flat-routing correctness *(Done — highest priority of the hydrology set)*

**Why this exists.** [Hydrology/geomorphology review](reviews/2026-07-31-hydrology-geomorphology-review.md) §1. `priorityFloodFill` fills depressions to the exact spill level with no ε increment, despite a doc comment claiming "ε-style spill" (`flowRouting.ts:15,102-104`) — every filled lake surface is a true flat. The flat resolver (`flowRouting.ts:141`) picks the lowest-index non-uphill neighbor, which provably creates 2-cycles on the rim of any interior flat (filled lake floors; the `elevationFloor`-clamped shelf both terrain generators produce). `computeD8Accumulation` then double-counts area through the cycles and channels terminate inside lakes instead of continuing through the spill point — **the drainage network is severed at every filled depression** — and the corrupted accumulation (`aNorm`) feeds directly into hillslope erosion forcing (`WorldState.ts:1227`) and the groundwater channel boost (`:1066`). This is upstream of geomorphology and baseflow both; nothing downstream of it is trustworthy until it's fixed.

**Register:** GEO-001 Locked (geology precedes ecology — a severed drainage network corrupts the substrate ecology inherits); T-001 Locked; §2.1 Conservation / Symmetry invariant classes
**New Process?** no — corrects the flat-resolution step inside existing D8 routing. D-007 clip gate does not apply.

- [x] **Not the ε increment — the deeper fault line instead.** Epsilon would only have narrowed how often a flat occurs, not fixed what happens on one; `priorityFloodFill`'s fill is untouched (still exact), and its doc comment — which claimed an "ε-style spill" that was never implemented — now says what the function actually does
- [x] Flat resolver directs flow toward the pour point via a second multi-source BFS (`computeFlatPourDistance`, distance-to-pour-point in flat-hops), not toward the lowest cell index — the exact mechanism this item's own example named
- [x] Test: a synthetic filled depression with a known pour point produces zero cycles in `computeD8Accumulation` and channels continue past the spill rather than terminating inside the lake — `flow-structure.test.ts`
- [x] Regression: on the default island, land sinks (via `computeWatershedLabels`) stay under 5% of land cells, not one per cell; the pre-fix index tie-break is reproduced in-test and shown to cycle on the same terrain
- [x] Baselines moved and refreshed: `berm-reroute`, `hillslope-deposit`, `erosion-intensity`, `baseflow-persist`, `deep-time`, `disturbance-recovery`, `orographic-wind` — expected, this is the fix working
- [x] Composition + manifest: [flat-routing-composition.md](slices/flat-routing-composition.md), [flat-routing.json](slices/flat-routing.json); **Next-but-one:** §4.50 Surface-flux stability guard

**Scope note.** The first pass at threading the open-boundary set used "touches the grid edge" as the open signal, which silently reached into §4.51's territory (structural vs. dynamic boundary) and produced a real regression (1,396 land-adjacent sinks on the default island) — caught by the regression test before it shipped, fixed by threading the actual `oceanCells`/perimeter set `priorityFloodFill` was seeded with instead of guessing from grid position. Full account: [flat-routing-composition.md](slices/flat-routing-composition.md).

---

### 4.50 Slice — Surface-flux stability guard *(Done)*

**Why this exists.** [Hydrology/geomorphology review](reviews/2026-07-31-hydrology-geomorphology-review.md) §2. Per-face flux (`fluxStep.ts:78`, `diff · localFlow · dt`) has no cap relative to the head difference driving it — `maxOutflowFraction` (`:89`) prevents negative depth but not overshoot, so two deep adjacent columns with a small height difference can equilibrate past level and reverse sign next step (checkerboard sloshing, the standard failure mode of an explicit virtual-pipe scheme with no CFL-style bound). This compounds with `localFlow = flowRate·(baseRoughness/max(n, 1e-4))` (`:51`): a zero or uninitialized roughness cell hits the floor and runs at 300× base flow, with nothing enforcing `n ≥ baseRoughness`.

**Register:** T-001 Locked; H-004 Locked (watersheds retain history — an unstable flux scheme corrupts the storage state H-004 requires to persist correctly)
**New Process?** no — adds a stability bound inside the existing flux step. D-007 clip gate does not apply.

- [x] Cap per-face flux to a fraction of the driving head difference — `Math.min(diff · localFlow · dt, diff · 0.5)`; `diff · 0.5` is the exact one-step equalization bound for a same-footprint pair, not a tuned margin
- [x] Roughness floored at `nCell = Math.max(roughness?.[i] ?? baseRoughness, Math.fround(baseRoughness))` — flooring against the raw f64 constant (the review's literal suggestion) instead moved the T-001 golden hash: `surface.roughness` is `Float32Array`-backed, so an ordinary bare-ground write of exactly `baseRoughness` rounds to a hair below the f64 constant on storage, and the raw-constant floor bumped every such cell. `Math.fround(baseRoughness)` matches what's actually stored, leaving real writes untouched and still catching a genuinely degenerate (zero/uninitialized) input. Full account: [flux-stability-composition.md](slices/flux-stability-composition.md).
- [x] Test: a synthetic two-column head-difference case (`2.0`/`0.6`, `flowRate 10 · dt 1` — ~64× production) equalizes exactly, stays put over 5 repeated steps, a local reproduction of the pre-fix formula is shown to slosh sign every step on the same inputs, and the float32-rounding failure mode above is pinned directly — `src/sim/fluxStability.test.ts`
- [x] Composition + manifest: [flux-stability-composition.md](slices/flux-stability-composition.md), [flux-stability.json](slices/flux-stability.json); **Next-but-one:** §4.51 Coastal base-level & substrate coupling

**Baselines.** None moved in the shipped fix — traced both bounds against `fluxStep`'s only production call site (`flowRate 0.156`, `dt 1`, bare-ground roughness) and confirmed `localFlow · dt = 0.156 ≪ 0.5`, so the per-face cap cannot engage at any parameter combination the game exercises today. The roughness floor's first draft (raw-constant comparison) *did* move the T-001 golden hash and every `aNorm`-adjacent probe by ~1e-9, caught before commit, not after — see the float32-rounding note above. Full probe suite green and unchanged after the corrected floor.

---

### 4.51 Slice — Coastal base-level & substrate coupling *(Done)*

**Why this exists.** [Hydrology/geomorphology review](reviews/2026-07-31-hydrology-geomorphology-review.md) §3–§4. `fluxStep` sets an ocean neighbor's stage to bed elevation, not `seaLevel` (`fluxStep.ts:70-72`) — `seaLevel` never appears in `fluxStep` at all — so coastal wetlands over-drain against a head difference overstated by the full ocean depth, with no marine backwater or ingress. Separately, `priorityFloodFill` seeds the entire map perimeter as structurally free-draining (`flowRouting.ts:79-88`) while `fluxStep` mirrors (no-flow) at every non-outlet edge (`:64-66`) — `generateMountain`'s flat, floor-clamped rim is the acute case, producing a structurally sealed bathtub that the fill model still treats as open on all four sides. And coastal erosion uses one global rate (`WorldState.ts:1176,1232`) where hillslope erosion correctly reads per-substrate `erosionK` (`:1225`) — a sand shore and a rock shore currently retreat identically, defeating the 47× erodibility contrast `substrates.ts` establishes everywhere else.

**Register:** C-015 Locked (the world is an island; sea level is global base level — `fluxStep` not reading `seaLevel` is a direct shortfall against this); C-009 Locked (substrate differentiation — coastal erosion ignoring substrate is the same shortfall applied to the shore); T-001 Locked
**New Process?** no — corrects boundary-condition and rate-lookup code in the existing surface-water and coastal-erosion steps. D-007 clip gate does not apply.

- [x] `fluxStep`'s ocean-neighbor stage uses `seaLevel`, not `terrain[ni]` — new trailing optional parameter, defaults to old behavior when omitted
- [x] Reconcile the structural (Priority-Flood, perimeter-open) and dynamic (`fluxStep`, no-flow except named outlets) boundary models — fixed at the consumer instead of the fill: `priorityFloodFill`'s whole-perimeter seeding is load-bearing for nested-depression resolution and is unchanged; `runGeomorphologyStep`'s ponded-cell gate now also excludes a non-outlet rim cell (`sealedRim`) from hillslope incision, since that's the one place the structural `depression == 0` signal was read as "can't pond" when the dynamics disagree
- [x] Coastal erosion (`kCoast`) reads per-cell `substrateProps(mat).erosionK` the way hillslope erosion already does, instead of one global rate — applied as a ratio against loam's `erosionK`, not a direct substitution: `substrates.ts`'s table was calibrated for hillslope erosion's units, and a literal substitution would have collapsed coastal erosion to ~1/27th its calibrated magnitude on the (default) loam substrate — an undocumented order-of-magnitude change the review never asked for. Ratio 1 on loam reproduces the pre-fix formula exactly.
- [x] Test: a coastal pond's one-step outflow matches the `seaLevel`-relative head, and land-side drainage is provably independent of the ocean cell's own depth; a hand-built flat-rim terrain confirms a non-outlet rim cell is excluded from hillslope erosion; a sand shore retreats measurably faster than a rock shore under identical wind forcing (windward side only, to avoid lee-deposit dilution) — `src/sim/coastalBaseLevel.test.ts`
- [x] Baselines: `deep-time`, `baseflow-persist`, `disturbance-recovery`, `hillslope-deposit`, `erosion-intensity`, `substrate-contrast`, `substrate-deposit`, `island-drainage`, `orographic-wind` moved and were refreshed — same `aNorm`-downstream family §4.49 named, now reacting to the sealed-rim and ocean-stage corrections. Every correctness test (conservation, determinism, bounds) passes unchanged.
- [x] Composition + manifest: [coastal-base-level-composition.md](slices/coastal-base-level-composition.md), [coastal-base-level.json](slices/coastal-base-level.json); **Next-but-one:** §4.52 Encoding delta correctness

---

### 4.52 Slice — Encoding delta correctness *(Done)*

**Why this exists.** [UI encoding review](reviews/2026-07-31-ui-encoding-review.md) §1–§4. `VERIFICATION_POLICY.md` names the encoded-delta proxy (`presentation.proxy.test.ts` and its siblings in `src/ui/`) as the Tier-P mechanism that discharges Definition of Done row 2 ("Observable") for every slice — "the agent proves the signal is encoded." That mechanism has a blind spot: every occupant/light color ramp saturates at ~55% (occupant) or 33% (light) of its domain (`occupantEncoding.ts:34` and six duplicates; `lightEncoding.ts:5`), so **every delta function built on those ramps returns exactly zero across the top of the range** — a proxy that cannot distinguish 55% biomass from 100% biomass is not proving what row 2 requires. Separately, every delta floor measures raw RGB Euclidean distance rather than a perceptual metric, and two unrelated quantities that co-occur on the shore — sand-binder mat (`occupantEncoding.ts:15`) and intertidal foreshore (`terrainEncoding.ts:26`) — sit ~0.07 unit-RGB apart because no test compares palettes across files, only within one file's own set.

**Register:** U-003 Current (the world is the primary visualization); D-007 Locked (twenty-second clip — a miscalibrated Tier-P proxy weakens every future clip-adjacent legibility claim)
**New Process?** no — presentation/verification-proxy correctness only; no WorldState field changes. D-007 clip gate does not apply. **Not** the palette redesign — that is **C-026**, filed separately, Open, owner-judged.

- [x] Occupant and light color ramps use a form that stays injective across the full [0,1] domain — dropped the `*1.35` (occupant) and `*3` (light) overshoot multipliers entirely rather than reshaping the curve, so each reaches `u=1` only at the true top of its domain; the concave `sqrt` shape occupant ramps used for early-arrival emphasis is kept, only the clipping is gone
- [x] Delta functions switch from raw RGB Euclidean distance to a luminance-weighted distance — new shared `src/ui/colorDistance.ts` (`rgbDistance`), Rec. 709 luma coefficients scaled ×3 so a neutral grey delta reproduces the old unweighted magnitude exactly (every floor calibrated against an achromatic difference stays valid; only cross-channel balance changes). CIELAB ΔE not required to close this slice, per the review's own §7.
- [x] Cross-file palette contrast check added (`presentation.proxy.test.ts`: binder vs. intertidal), and the one collision it measures fixed — `INTERTIDAL` darkened/cooled toward a wet-mud tone (`0xc49a5e` → `0x9c8868`), not a broader redesign (that's **C-026**, still Open)
- [x] `terrainEncoding.ts`'s scar/intertidal/salt overlay order fixed — categorical overlays now blend proportionally to their own weight (`Σweight·color / Σweight`, then `lerp(base, ·, min(1,Σweight))`) instead of layering sequentially, so a later tint can't wash an earlier one down to near-nothing when both are true at once; a single active overlay reproduces the old lerp exactly. Ported identically into the GLSL `TERRAIN_COLOR_INJECT` block in `TerrainMesh.ts`.
- [x] `substrateEncodingDelta` now compares all six pairs among the four substrates (was sand↔clay / sand↔rock only — clay↔rock went unchecked), each read at its own porosity via `substrateProps` (was a hardcoded 0.4 for every sample)
- [x] `timeRates.ts`'s hardcoded "fastest sustainable" label replaced with `rateDescription(rate, fps)`, which appends the suffix only when `rate` actually is `sustainableRates(fps).at(-1)` — tested by shrinking `fps` below the ceiling `week` needs and confirming the suffix follows the new fastest offered rate instead of staying on `week`
- [x] Test: re-ran every existing Tier-P proxy after the ramp/metric fix. Two floors broke because they were resting on the now-fixed defects, not a regression — re-measured and lowered with a note in place rather than re-litigating their origin slices: the paired-aspect understory-light test (Slice 11; `0.15→0.05`, measured 0.082 — almost entirely the ramp fix, not the metric) and the terrain wet-vs-dry test (`0.15→0.12`, measured 0.136 — entirely the metric fix, a red-dominated transition Rec.709 down-weights vs. green). One probe baseline moved (`tidal-envelope`'s `mean.encodingDelta`, `0.202→0.109`, its own `> 0.08` floor check unaffected) and was refreshed. Full account: [encoding-delta-composition.md](slices/encoding-delta-composition.md).
- [x] Composition + manifest: [encoding-delta-composition.md](slices/encoding-delta-composition.md), [encoding-delta.json](slices/encoding-delta.json); **Next-but-one:** owner-judged **C-026** if sitting, else residual Lock queue

---

### Later stubs

| Slice | Focus | Register | Gate |
|---|---|---|---|
| A+ / AUD-003 | Recovery audible — second ambient bed from `veg.cover` | AUD-003, C-014 | **Done** (§4.19) |
| — | Field Notebook UI | U-006 | **Done** (§4.20) — Locked v2.0.12 |
| — | Full C-020 clouds / precip phase | C-020 | **Done** (§4.21) — **C-020 Locked** v2.0.13 |
| N / NS-006 | Salt-memory encoding | C-018 | **Done** (§4.22) |
| N2 / NS-002 | Heat→plant | C-004, C-020 | **Done** (§4.23) |
| N4 / NS-004 | Strand splash pioneer | W-003, C-018, C-019 | **Done** (§4.24) |
| N3 / NS-003 | Onshore spray stress | C-017, C-018 | **Done** (§4.25) |
| N5 / NS-005 | Sandy crest sand-binder | W-003, C-017, C-009 | **Done** (§4.26) |
| N8 / NS-008 | Tidal inundation hydroperiod | C-016, C-018 | **Done** (§4.30) |
| N7 / NS-007 | Aspect light into Liebig | C-007, C-011 | **Done** (§4.31) |
| N9 / NS-009 | Salt-marsh engineer | C-016, W-003 | **Done** (§4.32) |
| N10 / NS-010 | Climate-capped woody shrub | C-007, W-003 | **Done** (§4.33) |
| N11 / NS-011 | Cryptogam crust bootstrap | C-007, W-003 | **Done** (§4.34) |
| B / C-005 | Branch-and-compare scaffold | C-005, T-001, P-005 | **Done** (§4.27) — Locked tooling v2.0.12 |
| E / Exner-lite | Inland hillslope deposit | GEO-002, C-002 | **Done** (§4.29) — C-002 Locked v2.0.12 |
| C-006 | Abundant sculpting CI promote | C-006, N-001, RC-004 | **Done** (§4.28) — **C-006 Locked** v2.0.11 |
| G | Season + erosion-intensity dials | C-021, C-022, T-001, T-004, H-004, S-007, N-004 | **Done** (§4.35) — machine only, both Open |
| — | C-020 glitches G1–G5 | C-020 presentation | **Fixed** — [C-020-dossier](candidates/C-020-dossier.md); `stormCue.test.ts` |
| L1 | Time throughput defect (16× ran at 5×) | S-009, T-002, C-008 | §4.36 **Done** — shipped with L6; no baseline moved |
| L2 | Local seed rain — established biomass seeds | C-007, C-019, C-011, C-003 | §4.37 **Queued** — next |
| L3 | Mortality as a rate, not a clamp | S-007, S-008, ES-006, ES-002 | §4.38 **Queued** — after L2 |
| L4 | Biotic motion (wind sway; presentation) | D-007, T-006, ART-003 | §4.39 **Queued** — after L3 |
| L5 | Guild competition / displacement | C-023, ES-006, N-002, E-005 | §4.40 **Blocked** — C-023 Open, owner-judged |
| L6 | Real-world time units (real time → weeks/s) | T-002, S-009, D-006, U-003 | §4.41 **Done** — shipped with L1; no candidate needed |
| L7 | Activity-gated event band (SIM §6.2) | S-009, T-001, T-002, H-001 | §4.42 **Queued** — ships only on hash-identity |
| L8 | Deep-time ladder (centuries) | C-024, C-025, S-009, T-001, T-003 | §4.43 **Blocked** — both Open, owner-judged |
| — | Scenario campaign / toxic-site premise | G-002, C-010 | After C-009 framing for C-010 |
| — | Fire spread as a rate | T-001, T-006, C-003, ES-002 | §4.44 **Done** — agent ([composition](slices/fire-spread-rate-composition.md)) |
| — | Fuel / scar numeric fix | T-001, S-009 | §4.45 **Queued** — after fire spread |
| — | HSI curve-shape corrections | C-007, C-011, S-007, N-004 | §4.46 **Queued** |
| — | Guild cover & light-competition correctness | C-023, ES-006, C-011 | §4.47 **Queued** — after HSI curves |
| — | Habitat/dispersal determinism hygiene | T-001, T-005 | §4.48 **Queued** — after cover/light |
| — | Drainage flat-routing correctness | GEO-001, T-001 | §4.49 **Done** |
| — | Surface-flux stability guard | T-001, H-004 | §4.50 **Done** |
| — | Coastal base-level & substrate coupling | C-015, C-009, T-001 | §4.51 **Done** |
| — | Encoding delta correctness | U-003, D-007 | §4.52 **Done** |
| C-026 | CVD-safe cross-domain palette | D-007, U-003, C-011 | **Open**, owner-judged — did not block §4.52, which shipped without it |

Slices **14** / **16** / **15** Tier-O **Pass** (§4.10–4.11). **Slice F** / **17**–**21** Done. **Slice S** / **Slice R** Done; D-007 clip **Pass**. **Slice A+** Done (machine). C-018 / C-019 Tier-O **Pass**. **Field Notebook** Done (**U-006 Locked**). **Full C-020 clouds** Done (**C-020 Locked** v2.0.13). **NS-006** / **NS-002** / **NS-004** / **NS-003** / **NS-005** / **NS-008** / **NS-007** / **NS-009** / **NS-010** / **NS-011** Done. **Slice B** Done (**C-005 Locked tooling**). **C-006** / **C-013** / **C-002 Locked**. **C-010** framing Done. **Slice G** Done — machine half only; **C-021**/**C-022** Open pending owner Lock sitting. **L1** / **L6** Done (§4.36 / §4.41) — deferred time debt plus a rate ladder in real-world units (`1 s/s` … `1 week/s`); no baseline or `GOLDEN_*` hash moved. **§4.49 flat-routing correctness** Done — drainage cycles fixed at the flat-resolver tie-break, not by epsilon; `aNorm`-downstream baselines refreshed. **§4.50 surface-flux stability guard** Done — per-face CFL cap + roughness floor inside `fluxStep`; no baseline moved (traced inert against every parameter the game currently exercises). **§4.51 coastal base-level & substrate coupling** Done — ocean-neighbor stage reads `seaLevel` not bed elevation, a non-outlet rim cell is excluded from hillslope erosion (structural/dynamic boundary disagreement), coastal erosion reads per-substrate `erosionK` as a ratio against loam (ratio 1 on loam, so the pre-fix calibration is unchanged there); nine `aNorm`-downstream baselines refreshed, same family §4.49 moved. **§4.52 encoding delta correctness** Done — occupant/light ramps no longer saturate before the top of their domain, delta floors switched to a luminance-weighted metric (grey deltas unchanged, blue discounted, green boosted vs. raw Euclidean), the binder/intertidal cross-file color collision fixed and checked, terrain overlay compositing made proportional instead of sequential (CPU + GLSL), `substrateEncodingDelta` now checks all substrate pairs at each one's own porosity, and the `timeRates.ts` "fastest sustains" label now derives from `sustainableRates()`; two Tier-P floors and one probe baseline (`tidal-envelope`) moved for documented reasons, not regressions.

**Executable tip is the Living wave**, from two reviews — [living-world](reviews/2026-07-31-living-world-review.md) (life) and [time-architecture](reviews/2026-07-31-time-architecture-review.md) (the clock):

```
L1 throughput defect [Done]  →  L6 real-world time units [Done]  →  L2 local seed rain [next]
   →  L3 mortality as a rate  →  L7 activity-gated event band  →  L4 biotic motion
```

L1 and L6 led because they are small, move no baselines, and are how L2/L3 get observed at all — both are about ecological timescales; both shipped in one commit with every baseline and `GOLDEN_*` hash unmoved (§4.36 / §4.41). **L1, L2, L3, L4, L6, L7 register no new `Process`** (D-007 clip gate does not apply) and **need no new candidate**: each implements a Locked entry or a written spec section the code falls short of. Blocked, owner-judged: **L5** on **C-023**; **L8** on **C-024** + **C-025**. Owner Lock backlog runs in parallel: residual **C-014**, **C-021**/**C-022** taste sitting, **C-010** implement later ([owner-lock-batch.md](candidates/owner-lock-batch.md)). Keep nutrients / animals / SWE off the tip.

**Two standing risks recorded, not resolved.** (1) L2 and L3 introduce per-band rate constants; if **C-024** later changes band periods, those constants need retuning — accepted rather than waiting on an owner-judged candidate (§4.0.1). (2) Any partial deep-time shortcut that skips bands "only a little" breaks **T-001** replay, **P-006** fairness, and **C-005** comparison *without going red*. Do not build one.

**A second, parallel review queue** — four scoped domain reviews using the same expert-review pattern as the renderer ([3c4b9f0](https://github.com/mrfootandmrbear/Habitat/commit/3c4b9f0)): [fire/fuel](reviews/2026-07-31-fire-fuel-review.md), [vegetation/habitat](reviews/2026-07-31-vegetation-habitat-review.md) (extends the living-world review's L2/L3/L5 territory), [hydrology/geomorphology](reviews/2026-07-31-hydrology-geomorphology-review.md), and [UI encoding](reviews/2026-07-31-ui-encoding-review.md) — filed as **§4.44–§4.52**. None registers a new `Process` and none needs a candidate except **C-026** (deliberate CVD-safe palette, Open, owner-judged, which did not block §4.52's bug fixes). **§4.44 and §4.49–§4.52 have shipped**; **§4.45–§4.48** (fuel/scar numerics, HSI curve shapes, guild cover & light, habitat/dispersal hygiene) remain queued and are the parallel track beside the Living wave. Three of the shipped five are worth recording outside severity ranking: **§4.44 fire spread as a rate** turned out to be one root cause wearing three faces — nothing tracked which cells were alight between calls, and that single absence produced the missing rate, the intensity that outlived the fire, and the scan-order-dependent burn shape, so tracking the front explicitly closed all three at once; **§4.49 drainage flat-routing correctness** was upstream of more than its own review scope suggested — it corrupted `aNorm`, which both hillslope erosion and the groundwater channel boost depend on, and its fix moved the baseline family §4.51 then moved again; and **§4.52 encoding delta correctness** repaired the Tier-P proxy mechanism ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md)) that discharges Definition-of-done row 2 for every slice, past and future.

---

## 5. PR / commit hygiene

- Cite register IDs (or C-00x candidates) in new sim modules and tests.  
- Update `GOLDEN_*` / probe baselines only when physics change is intentional; note why + Tier-M artifact in the commit body. A baseline diff with no stated reason is a blocking review comment, not a nit — it is the one place drift enters silently.  
- A candidate promoted under §4.0 step 8 lands in the same commit as its evidence: register status, register §16 queue entry struck, version-history line, `npm run conformance` re-run.  
- A blocked note (§4.0.1) is committed like any other artifact, with the next queue item named in the same body.  
- Run `npm run conformance` before claiming a slice done.  
- Prefer small PRs: sim edge vs game edge can split if WorldState coupling allows.  
- If a commit acts on an EXTERNAL_REFERENCES steal, refresh the Research↔Decision note in §3 Current gate or the slice checklist.

---

## 6. Document roles

| Document | Owns |
|---|---|
| [MVP_SCOPE.md](MVP_SCOPE.md) | Which loops are in MVP; joint map; fun gate |
| **This file** | How to execute each slice; autonomous protocol |
| [SIMULATION_MODEL.md](SIMULATION_MODEL.md) | Fields, ownership, bands |
| [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) | Promotion criteria + ledger |
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies each claim; ask gate |
| [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) | Study-not-ship refs; multi-state water survey |
| [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md) | Math candidates; Tier sequence |
| [PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md) | Fun-gate protocol (historical MVP) |
| PLAYER_INTERACTION_SPEC.md | Detailed prediction/siting UX (not yet written) |
