# Habitat — Decision Conformance

> **Status:** Governed (see Decision Register §0.7 and §17)
> **Authority:** Subordinate to [DECISION_REGISTER.md](DECISION_REGISTER.md)
> **Purpose:** Promotion criteria for hypothesis-Current and Open entries, review triggers for situation-Current entries, and a machine-generated build-to-register traceability ledger.

---

## 1. Purpose

The Decision Register defines *what* Habitat has decided. This document defines *how we know* a hypothesis-Current or Open entry is ready for promotion, *when* situation-Current entries should be revisited, and *where* the codebase cites register decisions.

Criteria here follow the five-part contract from the [2026-07-27 decision conformance report](reviews/2026-07-27-decision-conformance-report.md) §3:

1. **Observation** — something that either happened or did not
2. **Judge** — automated test, owner verification, or unfamiliar viewer
3. **Artifact** — where evidence lives
4. **Failure meaning** — what a failed criterion tells us
5. **Falsifiability** — a realistic outcome could fail it

---

## 2. Situation-Current review triggers

These entries describe the present stack or scope. They are not promotion candidates.

### T-007 — The reference prototype is Three.js with modular heightfield hydrology

**Kind:** situation-Current

**Review trigger.** Revisit when a demonstrated Habitat need for overhangs, caves, or undercut banks exists. Soil horizons, a water table, and multi-pool carbon are per-column raster stacks and do not by themselves trigger this review.

### W-001 — Windward Basin is the reference preserve

**Kind:** situation-Current

**Review trigger.** Revisit when a second preserve dataset loads without code change (F-003 scope), at which point W-001's scoping function is discharged.

---

## 3. Promotion criteria (hypothesis-Current and Open)

### 3.0 Who may promote

Register §0.7 sets the *conditions* for promotion — criterion recorded, judged, artifact exists — but names no actor, and the practical result has been that every entry waits on the owner even when the criterion is settled by CI. That is a bottleneck with no safety value: a question the machine has already answered does not become better answered by sitting in a queue.

The **Judge** field of each entry below is authoritative about who settles it, and therefore about who may promote it:

| Judge names | Promotion authority |
|---|---|
| CI, agent probes, or automated test **only** | **The agent**, in the same commit as the evidence. Flip the status, strike the entry from register §16 if listed, add the version-history line, re-run `npm run conformance`. State the measured numbers in the commit body. |
| Owner, unfamiliar viewer, or a judgment of feel — alone or **combined** with CI | **The owner.** The agent's job is the *dossier*, not the decision. |

**The dossier.** For an owner-judged entry, the agent prepares `docs/candidates/<id>-dossier.md`: the criterion verbatim, the machine half already discharged with numbers, the artifacts, and the owner-only question in one sentence containing no number (§4 step 4). A dossier reduces an open constitutional question to a yes/no; it is not itself a playtest request and does not fire the Tier-O batch.

**Bounds on agent promotion.** The agent may promote only entries carrying a criterion in this section. It may never author a new criterion for an entry and then promote against it in the same session, weaken a criterion to make it pass, or promote an entry whose criterion it partially met — a partial result is a blocked note ([BUILD_GUIDE.md](BUILD_GUIDE.md) §4.0.1), not a promotion. Failure to meet a criterion is a reportable outcome, not a retry loop: say the number, leave the entry Open.

---

### S-008 — Hysteresis must be legible

**Criterion.** In a preserve where a legacy condition is blocking recovery, a viewer who did not cause the damage, using only in-game inspection, states which historical condition is blocking and distinguishes it from current pressure.

**Judge.** Unfamiliar viewer, unassisted.

**Artifact.** Session transcript plus the actual blocking field.

**Failure means.** If they say "habitat unsuitable" or blame current rainfall, the inspector reports state rather than explaining constraint. Not yet.

**Slice trigger.** After legacy-state fields and inspector overlays exist.

---

### S-009 — Ecological duration is expressed in simulation time

**Criterion.** For a fixed rain schedule and simulation-step count, the outcome hash is identical regardless of wall-clock time rate; only wall-clock elapsed differs. Dropped steps from `maxStepsPerFrame` are observable when they occur.

**Judge.** CI.

**Artifact.** `src/sim/time-invariance.test.ts` — golden hashes and dropped-step counter tests.

**Failure means.** A durations-in-frames bug — a defect, not an entry problem. Flux scaling is verified separately in `src/sim/hydrology.determinism.test.ts`.

**Status note.** Mechanically satisfied by Slice 2 time-rate controls and `src/sim/time-invariance.test.ts`.

---

### P-005 — Save states support experimentation

**Criterion.** Save, advance 100 simulation-years, reload the save, advance again — identical state hash. Separately: a save round-trip preserves a legacy variable whose effect only manifests decades later.

**Judge.** CI.

**Artifact.** Save round-trip test plus the named legacy field it exercises.

**Failure means.** T-003 violated.

**Slice trigger.** After save/load system exists.

---

### P-006 — Prediction is an explicit commit-and-compare mechanic

**Criterion.** *Mechanical:* the prediction system provably never writes simulation state. *Behavioral:* a viewer who commits a prediction before advancing time makes a different subsequent intervention choice than one who does not.

**Judge.** CI for mechanical; unfamiliar viewer for behavioral.

**Artifact.** Write-access test (`src/sim/prediction/prediction.test.ts`); paired session notes.

**Failure means.** If the behavioral half fails, prediction is an overlay rather than a mechanic.

**Slice trigger.** Mechanical criterion after Slice 3 prediction overlay; behavioral deferred until UI is stable.

**Mechanical status (Slice 5a).** Implemented and **playtest Pass**: `PredictionSession` + `predictionObserver` (empty `writes`); compare uses `snapshotWaterReader`; CI covers write isolation and deterministic classify. Behavioral half still deferred.

---

### E-007 — Ecological roles are attemptable without readiness hard-locking

**Criterion.** The role action is available under poor conditions; attempting it there produces a legible ecological failure rather than a disabled control or guaranteed success; repeated attempts are not the dominant strategy.

**Judge.** Owner, plus the RC-003 experiment.

**Artifact.** RC-003 strategy comparison.

**Failure means.** Promotion blocked on RC-003.

**Slice trigger.** After role introduction system exists.

---

### E-008 — Role resolution selects the biome-appropriate candidate

**Criterion.** The selected candidate is derivable from preserve data alone, is inspectable, and the same role resolves differently under two different preserve datasets with no code change.

**Judge.** CI.

**Artifact.** Two preserve fixtures and the test that loads both.

**Failure means.** Hard-coded resolution; also fails T-004.

**Slice trigger.** After role resolution and preserve data loading exist.

---

### E-009 — Readiness is inferred from simulation state

**Criterion.** Readiness is reproducible from a state snapshot alone, with no authored flags; the inspector names limiting factors; changing a named limiting factor in isolation moves establishment outcome in the predicted direction.

**Judge.** CI for reproducibility; owner for naming.

**Artifact.** Snapshot fixture plus per-factor sensitivity table.

**Failure means.** A factor named as limiting that has no effect when changed proves the readiness display is decorative.

**Slice trigger.** After readiness inference system exists.

---

### A-005 — Siting selects a cause rather than painting an outcome

**Criterion.** Shown a siting preview, an unfamiliar viewer describes what they are committing in terms of a **cause** ("I'm digging a channel here") rather than an **outcome** ("I'm placing a wetland").

**Judge.** Unfamiliar viewer, phrasing unprompted and recorded verbatim.

**Artifact.** Verbatim responses.

**Failure means.** If they describe an outcome, the preview has failed N-001 regardless of what the code does.

**Slice trigger.** After siting preview UI exists (Slice 6+).

---

### A-006 — Pulse interventions are sited too

**Criterion.** Committed extent and realized extent differ in some runs — spread and containment are simulated — and the interface communicated the extent as intent before commitment.

**Judge.** CI for divergence; owner for communication.

**Artifact.** Run pairs showing committed vs. realized extent.

**Failure means.** If committed always equals realized, the burn tool is a paint tool wearing disturbance vocabulary.

**Slice trigger.** After pulse intervention system exists.

---

### G-007 — Post-completion persistence *(Open)*

**Criterion.** Run a completed scenario forward 200 simulation-years under no further intervention and measure how often completion criteria lapse from ES-003 fluctuation alone.

**Judge.** CI, reported as a rate.

**Artifact.** Lapse-rate table across several scenarios.

**Failure means.** Informs which post-completion option survives; does not promote an entry by itself.

**Slice trigger.** After scenario completion criteria exist.

---

### U-005 — The primary view is an elevated living diorama

**Criterion.** From the default framing the whole watershed is visible and named landmarks are individually distinguishable; zoom to ground scale is continuous without losing the authored silhouette; a viewer locates a specified degraded reach from the whole-preserve view within a stated time.

**Judge.** Owner for composition; timed task for readability.

**Artifact.** Frames at each zoom level plus task timings.

**Failure means.** If whole-preserve readability fails, W-004's diorama premise is at risk.

**Slice trigger.** After camera and landmark authoring exist.

---

### U-006 — The Field Notebook provides bounded causal explanation

**Criterion.** Every sentence the notebook emits is traceable to a specific simulated contributing condition, and a reviewer can locate that state. Sample the emitted corpus, not a curated example.

**Judge.** Reviewer against a sampled corpus.

**Artifact.** Sampled sentences with the state each is traced to.

**Failure means.** Any untraceable sentence is confident template prose; one such sentence is enough to fail.

**Slice trigger.** After Field Notebook exists.

---

### ART-001 — Scientific impressionism

**Criterion.** From a still frame at whole-preserve zoom, with all overlays off, an unfamiliar viewer correctly identifies where water is flowing, which slope is degraded, and where vegetation is recovering.

**Judge.** Unfamiliar viewers, several, on frames they have not seen before.

**Artifact.** Frames and verbatim responses.

**Failure means.** Stylization has decoupled from ecological meaning.

**Slice trigger.** After art-direction pass on reference preserve.

---

### RC-003 — Consequence of failed introduction attempts *(Open)*

**Criterion.** Simulate two strategies over equal simulation time in an identically seeded preserve: repeated immediate introduction attempts, versus attempting only when readiness is high. Measure established roles at the horizon.

**Judge.** CI, reported as a comparison.

**Artifact.** Strategy comparison table across seeds.

**Failure means.** If spam wins or ties, an additional consequence is required and E-007 promotion remains blocked. If patience wins by a clear margin, RC-003 can close with informational-only failure.

**Slice trigger.** Slice 11 (per incremental world-building report), after role introduction exists.

---

### C-001 — Cheap groundwater / baseflow store *(Open)*

**Criterion.** A Tier-M conservation residual that includes the GW compartment stays within H-004 bounds across a multi-day wet→dry schedule, and probe `baseflow-persist` shows channel wetness after N dry days with GW strictly greater than the no-GW baseline.

**Judge.** CI / agent probes (VERIFICATION_POLICY Tier M).

**Promotion authority.** Agent (§3.0) — the criterion is entirely machine-settled. Promote in the Slice 8b commit if it passes; report the numbers and leave Open if it does not.

**Artifact.** `baseflow-persist` evidence + mass-balance test citing C-001 / H-004.

**Failure means.** If persistence requires Richards/MODFLOW fidelity or breaks T-001, keep C-001 Open and do not promote; revisit NATURAL_PROCESS_MATH §4 scope.

**Slice trigger.** BUILD_GUIDE §4.3 Slice 8b.

---

### C-002 — GEO-002 spatial cost test *(Open)*

**Criterion.** Documented spatial rule (pools everywhere vs geomorphology near-channel / high-A only) matches the running `geomorphologyProcess`, with a Tier-M test that high-A cells erode under bare cover more than low-A cells, and production still runs on low-A cells.

**Judge.** CI + short register review (ratify Slice 8 reading or supersede).

**Promotion authority.** Owner (§3.0) — the CI half proves the implemented rule behaves as described, but ratifying *that* rule as policy is a register act. Agent prepares `docs/candidates/C-002-dossier.md` with the test result and the rule stated in one sentence; owner ratifies or supersedes.

**Artifact.** `geomorphology.test.ts` + BUILD_GUIDE / SIMULATION_MODEL note naming the rule.

**Failure means.** If a second conflicting erosion law appears in code, block until C-002 closes.

**Slice trigger.** After Slice 8; close before inventing alternate geomorphology.

---

### C-003 — Stochastic vs authored climate forcing *(Open)*

**Criterion.** A written choice: either (a) seeded stochastic storms with save-restored RNG state (T-001, T-003), or (b) authored climate schedules only — evaluated against P-006 prediction fairness on one preserve scenario.

**Judge.** Owner for fairness feel after Tier-M replay equality; agent for seed determinism.

**Promotion authority.** Owner (§3.0). The agent may discharge the seed-determinism half and write `docs/candidates/C-003-dossier.md`, but implements nothing under this entry meanwhile — no storm generator, no stochastic arrivals, not behind a flag.

**Artifact.** Decision note closing C-003; no storm-generator merge until then.

**Failure means.** Shipping stochastic arrivals while C-003 is Open is a process defect.

**Slice trigger.** Before any stochastic climate implementation.

---

## 4. Locked-entry test backlog

Highest-risk Locked entries without automated test citations today. Intent to automate vs defer:

| ID | Risk | Plan |
| --- | --- | --- |
| T-006 | Renderer mutates sim state | **Automated** — readonly view + conformance tests (Slice 0–1 fix) |
| T-001 | Nondeterminism | **Automated** — golden hash in determinism test |
| N-001 | Ecosystem painting creeps in | **Automated (minimal)** — smoke test; expand as features appear |
| E-005 | Wildlife→habitat blocked by terrain clone | **Defer** — unblocks with WorldState / Slice 2 infrastructure |
| S-007 | Hysteresis unimplemented | **Defer** — until legacy-state fields exist |
| ES-006 | Constant K shortcut | **Defer** — until population dynamics exist |
| N-002–N-005 | Prohibition drift | **Defer** — expand smoke tests as related features land |

---

## 5. Generated conformance ledger

Do not edit the table between the markers below by hand. Regenerate with `npm run conformance`.

<!-- GENERATED: conformance-ledger -->

| ID | Title | Status | Citing files | Citing tests | Criterion | Verified |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | Nature is the protagonist | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| D-002 | Habitat is the objective | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| D-003 | Process over outcome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| D-004 | Emergence over scripting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| D-005 | The world should feel like a work of art | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/VERIFICATION_POLICY.md | — | — | 1798878 |
| D-006 | Attention is the unit of engagement | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| S-001 | One simulation for every biome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| S-002 | Physical systems precede biology | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| S-003 | Continuous simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| S-004 | Ecology is causal and explainable | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| S-005 | Fast systems teach | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| S-006 | Slow systems remember | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/process/geomorphologyProcess.ts | src/sim/geomorphology.test.ts | — | 1798878 |
| S-007 | Hysteresis is fundamental | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/WorldState.ts, src/sim/process/geomorphologyProcess.ts | src/sim/save.test.ts | — | 1798878 |
| S-008 | Hysteresis must be legible | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| S-009 | Ecological duration is expressed in simulation time | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/sim/SimClock.ts | src/sim/hydrology.determinism.test.ts, src/sim/time-invariance.test.ts | yes | 1798878 |
| H-001 | Water is the primary ecological driver | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/process/soilWaterProcess.ts | src/sim/soil-water.test.ts | — | 1798878 |
| H-002 | Water follows terrain | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/hydrology/flowRouting.ts, src/sim/terrain/generateMountain.ts | src/sim/flow-structure.test.ts | — | 1798878 |
| H-003 | Water creates habitat | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/WorldState.ts, src/sim/hydrology/flowRouting.ts, src/sim/process/soilWaterProcess.ts | src/sim/depression.test.ts, src/sim/soil-water.test.ts | — | 1798878 |
| H-004 | Watersheds retain history | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md | src/sim/soil-water.test.ts | — | 1798878 |
| GEO-001 | Geology precedes ecology | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| GEO-002 | Terrain evolves only where simulation value justifies cost | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/WorldState.ts, src/sim/process/geomorphologyProcess.ts | src/sim/geomorphology.test.ts | — | 1798878 |
| GEO-003 | Landscape history matters | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| P-001 | Players modify forcings | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| P-002 | No ecosystem painting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| P-003 | Observation is primary | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md | — | — | 1798878 |
| P-004 | Institutional knowledge, not arbitrary instinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| P-005 | Save states support experimentation | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md | — | yes | 1798878 |
| P-006 | Prediction is an explicit commit-and-compare mechanic | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/PLAYTEST_SLICE5A.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/main.ts, src/sim/prediction/PredictionSession.ts, src/ui/controls.ts | src/sim/prediction/prediction.test.ts | yes | 1798878 |
| E-001 | Species respond to habitat | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| E-002 | Habitat readiness gates introductions | Superseded by E-007 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| E-003 | Readiness indicators inform without prescribing | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| E-004 | Players introduce ecological roles, not named species | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| E-005 | Wildlife can become habitat | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/WorldState.ts, src/sim/process/surfaceWaterProcess.ts, src/sim/process/vegetationProcess.ts | src/sim/veg-water.test.ts | — | 1798878 |
| E-006 | Survival determines introduction success | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| E-007 | Ecological roles are attemptable without readiness hard-locking | Current *(changed from Locked in v1 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| E-008 | Role resolution selects the biome-appropriate candidate; the simulation determines establishment | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| E-009 | Readiness is inferred from simulation state | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| A-001 | Interventions are functional, not geographically branded | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| A-002 | Pulse interventions are distinct | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| A-003 | Structural interventions are distinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| A-004 | Interventions have contextual consequences, not guaranteed results | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| A-005 | Siting selects a cause rather than painting an outcome | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/conformance.test.ts, src/sim/siting.test.ts | yes | 1798878 |
| A-006 | Pulse interventions are sited too | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 1798878 |
| G-001 | Sandbox has no win condition | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE6.md | — | — | 1798878 |
| G-002 | Scenarios provide finite objectives | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| G-003 | Scenario completion may use target species count | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| G-004 | No universal optimum ecosystem exists | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | 1798878 |
| G-005 | Scenario completion uses a persistence window | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | 1798878 |
| G-006 | Required objectives must remain recoverable or declare failure explicitly | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | 1798878 |
| G-007 | Post-completion persistence | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| G-008 | Scenarios use mixed ecological objectives | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| ES-001 | Succession is emergent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | src/sim/vegetation.test.ts | — | 1798878 |
| ES-002 | Disturbance is necessary and context-dependent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| ES-003 | Healthy ecosystems fluctuate | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| ES-004 | Local extinction is possible | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| ES-005 | Recovery takes ecological time | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| ES-006 | Carrying capacity emerges | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/WorldState.ts | src/sim/vegetation.test.ts | — | 1798878 |
| ES-007 | Food webs drive population dynamics | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| W-001 | Windward Basin is the reference preserve | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| W-002 | A preserve is one continuous landscape with emergent regions | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/hydrology/flowRouting.ts | src/sim/flow-structure.test.ts | — | 1798878 |
| W-003 | Each preserve has a fixed species pool | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md | — | — | 1798878 |
| W-004 | Every preserve is a living diorama | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| W-005 | Preserve terrain uses hybrid generation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| W-006 | Humans are outside the agent simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md | — | — | 1798878 |
| U-001 | Information is layered | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| U-002 | Simplify presentation, not ecological truth | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| U-003 | The world is the primary visualization | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| U-004 | Curiosity precedes explanation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md | — | — | 1798878 |
| U-005 | The primary view is an elevated living diorama | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| U-006 | The Field Notebook provides bounded causal explanation | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 1798878 |
| ART-001 | Scientific impressionism | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 1798878 |
| ART-002 | Beauty encourages stewardship | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| ART-003 | Ecological change is visible | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| AUD-001 | Sound reflects ecological state | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| AUD-002 | Silence has ecological meaning | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| AUD-003 | Recovery is audible | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| N-001 | No ecosystem painter | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md | src/sim/conformance.test.ts | — | 1798878 |
| N-002 | No universal optimization puzzle | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| N-003 | No species collection game | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md | — | — | 1798878 |
| N-004 | No arbitrary hidden rules | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 1798878 |
| N-005 | No decorative wildlife | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| RC-001 | Limiting mechanism for repeated intervention | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| RC-002 | Ecological opportunity as primary constraint | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| RC-003 | Consequence of failed introduction attempts | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 1798878 |
| RC-004 | Ecological time and opportunity constrain intervention | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| T-001 | Save-state determinism policy | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts | src/sim/hydrology.determinism.test.ts | — | 1798878 |
| T-002 | Supported player-facing time rates | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/SimClock.ts | — | — | 1798878 |
| T-003 | Save compatibility preserves causal history | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/WorldState.ts, src/sim/save.ts | src/sim/save.test.ts | — | 1798878 |
| T-004 | Content is data-driven | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/save.ts | src/sim/save.test.ts | — | 1798878 |
| T-005 | Layered simulation inspection is an engine capability | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/render/TerrainMesh.ts, src/ui/controls.ts | — | — | 1798878 |
| T-006 | Simulation and rendering are separate | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/render/FlowCueMesh.ts, src/sim/hydrology/HydrologyModel.ts, src/sim/types.ts | src/sim/hydrology.determinism.test.ts | — | 1798878 |
| T-007 | The reference prototype is Three.js with modular heightfield hydrology | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/hydrology/HeightfieldHydrology.ts, src/sim/hydrology/HydrologyModel.ts | — | yes | 1798878 |
| F-001 | Advanced ecosystem-engineer behaviors | Deferred | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 1798878 |
| F-002 | Advanced save comparison tools | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 1798878 |
| F-003 | Additional preserves | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 1798878 |
| F-004 | Expanded educational overlays | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| F-005 | Counterfactual causal replay | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 1798878 |
| C-001 | Cheap groundwater / baseflow store | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/VERIFICATION_POLICY.md | — | yes | 1798878 |
| C-002 | GEO-002 spatial cost test | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md | — | yes | 1798878 |
| C-003 | Stochastic vs authored climate forcing | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/VERIFICATION_POLICY.md | — | yes | 1798878 |

<!-- END GENERATED -->
