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

**Artifact.** `docs/evidence/deep-time.baseline.json` + `src/sim/probes/deepTime.ts` (P-005 hash match + legacy thin-soil production); round-trip scaffold in `src/sim/save.test.ts`.

**Failure means.** T-003 violated.

**Slice trigger.** After save/load system exists.

**Status.** **Discharged 2026-07-28** — criterion met; register entry promoted to Locked.

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

### C-001 — Cheap groundwater / baseflow store *(Locked — Slice 8b)*

**Criterion.** A Tier-M conservation residual that includes the GW compartment stays within H-004 bounds across a multi-day wet→dry schedule, and probe `baseflow-persist` shows channel wetness after N dry days with GW strictly greater than the no-GW baseline.

**Judge.** CI / agent probes (VERIFICATION_POLICY Tier M).

**Promotion authority.** Agent (§3.0) — the criterion is entirely machine-settled. Promote in the Slice 8b commit if it passes; report the numbers and leave Open if it does not.

**Artifact.** `baseflow-persist` evidence + mass-balance test citing C-001 / H-004.

**Failure means.** If persistence requires Richards/MODFLOW fidelity or breaks T-001, keep C-001 Open and do not promote; revisit NATURAL_PROCESS_MATH §4 scope.

**Slice trigger.** BUILD_GUIDE §4.3 Slice 8b.

**Discharged.** Channel wetness with GW ≈ 0.011 vs 0 without after wet→dry (storm pulse to boundary ledger); GW sum ≈ 30; relative mass residual < 1e-4. `docs/evidence/baseflow-persist.baseline.json`, `src/sim/soil-water.test.ts`.

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

### C-004 — Force control as an intervention axis *(Open)*

**Criterion.** A build exists in which the player changes a force regime (not a place) and the world's response is attributable to that change: same seed, same terrain, two regime settings, divergent outcome — plus a stated and enforced boundary that no control targets a location. Owner half: after setting a regime and running time, the player describes what happened as something the world did, not as something they placed.

**Judge.** CI for the paired-regime divergence and the no-targeting invariant; owner for the "world did it" reading (A-005 / N-001 boundary).

**Promotion authority.** Owner (§3.0) — the machine half is a probe, but whether force control still feels like stewardship rather than god-mode is Tier O.

**Artifact.** Paired-regime probe + the control surface; THESIS §4, §9.

**Failure means.** If regime control reads as smiting, the boundary in THESIS §9 was not enforced and D-001 is at risk — narrow the surface before widening it.

**Slice trigger.** The first slice that ships a force dial.

---

### C-005 — Branch-and-compare as a core instrument *(Open)*

**Criterion.** A world can be forked and both branches run under different force settings, reproducibly: same seed + same settings → identical hash (T-001, P-005), and the two branches are presentable side by side without the player reading numbers.

**Judge.** CI for reproducibility and branch isolation; owner for whether comparison is something they *want* to do rather than a debugging feature.

**Promotion authority.** Owner (§3.0).

**Artifact.** Branch round-trip test extending P-005's criterion; the comparison view.

**Failure means.** If branches diverge without a force change, determinism is broken and this is a T-001 defect, not a design question. If comparison exists and is never used in play, the thesis is wrong about the loop and THESIS §7 should be amended.

**Slice trigger.** After a force dial exists to vary.

---

### C-006 — Sculpting is abundant; scarcity lives in ecological time *(Open)*

**Criterion.** Sculpting is unrationed — no counter, cost, or cooldown on terrain edits — and a session of heavy sculpting still cannot produce a finished ecosystem without elapsed simulation time (N-001, RC-004).

**Judge.** CI — the absence of an action economy is testable, and so is "no edit path writes a mature ecological state directly."

**Promotion authority.** Agent (§3.0) — both halves are machine-settled. Promote when the invariant test lands.

**Artifact.** Conformance test asserting no per-edit economy and no direct ecological write from a siting tool.

**Failure means.** If a cost mechanic is needed to prevent degenerate play, RC-004 is wrong and the register — not this candidate — needs revisiting.

**Slice trigger.** Any slice touching siting tools.

---

### C-007 — Arrival as the primary biological verb *(Open)*

**Criterion.** A written choice, plus a build in which at least one biological occupant appears **because conditions became suitable** rather than because the player introduced it — with the suitability field inspectable and monotone (improving the limiting input raises the chance of arrival; improving a non-limiting input does not).

**Judge.** CI for the monotonicity and the inspectability; owner for whether an unannounced arrival reads as *earned by the place you made* rather than as a spawn.

**Promotion authority.** Owner (§3.0) — the "earned, not spawned" reading is Tier O and is the whole point of the entry.

**Artifact.** Limiting-factor / HSI field (BUILD_GUIDE §4.4) used as an arrival gate, plus the decision note.

**Failure means.** If arrival reads as random spawning, the gate is not legible and S-008 / N-004 are both implicated. If the owner prefers deliberate introduction, close C-007 against the thesis and restore RC-003's queue position.

**Slice trigger.** Slice 9 — the spine is the gate.

---

### C-008 — Intervention → visible response budget *(Open)*

**Criterion.** For each interaction class (terrain sculpt; force-regime change), a stated budget in **simulation time at a named rate** within which a visible change occurs, measured by the encoded-signal proxy (§3, Tier P) rather than by opinion — and the shipped build meets it.

**Judge.** CI / agent proxy. The budget value itself is an owner preference, but conformance to it is machine-checked.

**Promotion authority.** Agent (§3.0) **once the owner has named the budget** — measurement and enforcement are Tier M/P; choosing the number is not. Until a number exists, this stays Open with the proxy reported.

**Artifact.** Response-latency proxy per interaction class; THESIS §4.

**Failure means.** If no achievable budget makes sculpting feel responsive, the problem is the encoding or the clock — not the player's patience.

**Slice trigger.** The first observable slice after this is filed.

---

### C-009 — Substrate differentiation *(Open)*

**Criterion.** Two cells differing **only** in material class, under an identical storm and identical slope, produce measurably different outcomes across at least two processes already in the build (e.g. infiltration and erodibility) — and the material properties come from a data table, not from constants embedded in process code (T-004). Owner half: the difference between building in sand and building in clay is noticeable in play without the inspector.

**Judge.** CI for the paired-cell divergence and the data-driven property source; owner for whether the material difference is legible in play.

**Promotion authority.** Owner (§3.0). The machine half is a probe; whether substrates *read* as different materials rather than as retuned numbers is Tier O.

**Artifact.** Paired-substrate probe (`substrate-contrast`) + the material property table + THESIS §2.1.

**Failure means.** If outcomes differ in the ledger but not on screen, the field is real and the encoding is not — a Tier-P problem, not a reason to add more material classes. If a second erosion or infiltration law appears per material rather than one law reading a property, GEO-002's earn-its-cost test has failed and C-002 is implicated.

**Slice trigger.** Not before the berm/dig displaced-mass closeout (BUILD_GUIDE §4.1) — if an edit does not move material, material class has nothing to attach to.

---

### C-010 — Legacy substances (contaminant load) *(Open)*

**Criterion.** A substance field exists that (a) moves with water under the *existing* mass balance — total substance is conserved across transport, no second ledger (H-004), (b) is reduced by a vegetation-mediated pathway over decadal time, (c) survives a save round-trip as legacy state and makes the save invalid when dropped (T-003, SIMULATION_MODEL §12), and (d) gates arrival: nothing establishes above a stated threshold, and something does below it (**C-007**). Owner half: a viewer who did not cause the damage can say *which historical condition is blocking recovery* — which is **S-008**'s criterion, unchanged.

**Judge.** CI for conservation, decay, save-legacy, and the arrival gate; unfamiliar viewer for the S-008 legibility half.

**Promotion authority.** Owner (§3.0) — S-008's viewer test is the point of the entry, not a formality.

**Artifact.** Substance transport test + save round-trip citing T-003 + arrival-threshold test; scenario fixture.

**Failure means.** If transport needs its own mass balance, the coupling is wrong — ride the water ledger or do not ship it. If the viewer blames current rainfall instead of the legacy load, S-008 stays unearned and the inspector is reporting state rather than explaining constraint.

**Slice trigger.** Not before **C-009** substrate lands — substance and substrate are one design. Not before scenarios are actually near (post-MVP, G-002).

---

### C-011 — Real-world intuition is the instrument *(Open)*

**Criterion.** A viewer who has **never been told any game rule**, shown only the world and the controls, predicts the *direction* of outcomes better than chance across a short set — where water will pool, which slope loses material first, where plants take hold first — and, asked why, explains in ordinary real-world terms ("it's downhill", "nothing's holding that bank") rather than in game terms ("I learned that this tool does that").

**Judge.** Unfamiliar viewer, unassisted. Shares apparatus with P-006's behavioral half — run them in one session, since the same person predicting once answers both.

**Promotion authority.** Owner (§3.0) — an unfamiliar-viewer test is not a probe, and it is the point of the entry rather than a formality.

**Artifact.** Session transcript with the predictions, the outcomes, and the stated reasoning; the seeded scenario used.

**Failure means.** Two distinguishable failures, and they have different fixes. If the viewer predicts correctly but explains in game terms, the encoding is teaching a rule where the world should be speaking — a Tier-P problem. **If the viewer predicts wrongly and the sim was right, the model contains behavior with no real-world referent** — that is a defect in the model, not in the player, and it is the failure this entry exists to catch. Retuning the visuals will not fix it.

**Falsifiability note.** A realistic outcome could fail this: real hydrology contains genuine surprises (saturated ground shedding water like pavement) where correct simulation defeats naive intuition. Those are *productive* wrongness and count as passes **only if** the explanation is available afterward in real-world terms (S-004, S-008). Surprise that cannot be explained back to ordinary experience is failure.

**Slice trigger.** Any observable slice; cheapest to run alongside the Slice 8c return-visit session, since the terrain the viewer predicts about is one they just watched being made.

---

### C-012 — Preserve extent and resolution follow habitat mosaic *(Open)*

**Criterion.** At the chosen extent and resolution, a single default view contains **at least three distinguishable habitat conditions** produced by the simulation rather than by authoring — e.g. persistently wet hollow, dry upper slope, channel margin — each large enough to read at default camera by the Tier-P encoded-signal proxy. Separately, the step-time budget at that grid is **measured**, not assumed, and satisfies **C-008**.

**Judge.** CI for the habitat-count and step-time measurements; owner for whether the window reads as a place with parts rather than one patch (U-005).

**Promotion authority.** Owner (§3.0).

**Artifact.** Probe reporting distinct habitat regions and step ms at candidate grid sizes; the chosen `gridSize` / `worldSize` with the reasoning recorded.

**Failure means.** If three conditions cannot coexist legibly, the extent is too small — W-002 has nothing to emerge into. If they can but the step misses the budget, the resolution is too fine for the extent, and cell size gives way before extent does: the mosaic is the requirement, resolution is the adjustment.

**Slice trigger.** Before Slice 9 — the arrival gate is meaningless without distinguishable habitats to arrive into.

---

### C-013 — Undo as an affordance of abundant sculpting *(Open)*

**Criterion.** Repeated sculpt-and-undo leaves the world **bit-identical** to never having sculpted (T-001 hash equality), undo is available without confirmation or cost, and **elapsed simulation time is not undoable** — after time advances, the only route back is restoring an explicit branch point (**C-005**), never a rewind of history.

**Judge.** CI for hash equality and for the absence of a time-rewind path; owner for whether the boundary reads as fair rather than as punishment.

**Promotion authority.** Owner (§3.0) — the machine half is a hash test; whether "you can't un-run the tide" feels right is Tier O.

**Artifact.** Sculpt/undo round-trip hash test; the restore-point mechanism shared with P-005.

**Failure means.** If undo cannot restore exactly, terrain edits are not the pure state change they appear to be. If players reach for undo *after* running time and feel cheated, the branch-point affordance is missing or invisible — a UI gap, not a reason to make history rewindable (S-007).

**Slice trigger.** With Slice 8c, alongside save/load — they share the state-restore machinery.

---

### C-014 — How audio derives from simulation state *(Open)*

**Criterion.** One registry field audibly drives one source, demonstrated both ways: raising the field raises the source, and **removing the field produces meaningful silence** rather than a missing asset (AUD-002). The audio layer holds no authoritative state and consumes no simulation RNG stream (T-006, T-001).

**Judge.** CI for the write-isolation and RNG-isolation halves; owner for whether the world sounds alive and whether the silence reads as ecological rather than as a bug.

**Promotion authority.** Owner (§3.0).

**Artifact.** Observer-isolation test in the audio path; the field→source mapping.

**Failure means.** If silence reads as breakage, AUD-002 is not yet earned and the mapping needs a floor that is *quiet-but-alive* rather than absent. If audio ever needs to write state or advance a sim stream, the layering is wrong.

**Slice trigger.** Not before Slice 8c ships something worth hearing; strongly implied by the THESIS §8 clip test.

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
| D-001 | Nature is the protagonist | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| D-002 | Habitat is the objective | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| D-003 | Process over outcome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| D-004 | Emergence over scripting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| D-005 | The world should feel like a work of art | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/VERIFICATION_POLICY.md | — | — | 2b74cb9 |
| D-006 | Attention is the unit of engagement | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| S-001 | One simulation for every biome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| S-002 | Physical systems precede biology | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| S-003 | Continuous simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| S-004 | Ecology is causal and explainable | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| S-005 | Fast systems teach | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| S-006 | Slow systems remember | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/process/geomorphologyProcess.ts | src/sim/geomorphology.test.ts | — | 2b74cb9 |
| S-007 | Hysteresis is fundamental | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/WorldState.ts, src/sim/process/geomorphologyProcess.ts, src/sim/sessionPersist.ts | src/sim/save.test.ts, src/sim/sessionPersist.test.ts | — | 2b74cb9 |
| S-008 | Hysteresis must be legible | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| S-009 | Ecological duration is expressed in simulation time | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/sim/SimClock.ts | src/sim/hydrology.determinism.test.ts, src/sim/time-invariance.test.ts | yes | 2b74cb9 |
| H-001 | Water is the primary ecological driver | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/WorldState.ts, src/sim/process/soilWaterProcess.ts | src/sim/soil-water.test.ts | — | 2b74cb9 |
| H-002 | Water follows terrain | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/hydrology/flowRouting.ts, src/sim/terrain/generateMountain.ts | src/sim/flow-structure.test.ts | — | 2b74cb9 |
| H-003 | Water creates habitat | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/WorldState.ts, src/sim/fixtures/pitDem.ts, src/sim/hydrology/flowRouting.ts, src/sim/process/soilWaterProcess.ts | src/sim/depression.test.ts, src/sim/soil-water.test.ts | — | 2b74cb9 |
| H-004 | Watersheds retain history | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/playtests/8c-return-visit.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/WorldState.ts, src/sim/probes/scenarios.ts | src/sim/soil-water.test.ts | — | 2b74cb9 |
| GEO-001 | Geology precedes ecology | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| GEO-002 | Terrain evolves only where simulation value justifies cost | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-002-dossier.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/WorldState.ts, src/sim/process/geomorphologyProcess.ts | src/sim/geomorphology.test.ts | — | 2b74cb9 |
| GEO-003 | Landscape history matters | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| P-001 | Players modify forcings | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| P-002 | No ecosystem painting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| P-003 | Observation is primary | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md | — | — | 2b74cb9 |
| P-004 | Institutional knowledge, not arbitrary instinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| P-005 | Save states support experimentation | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/probes/deepTime.ts, src/sim/probes/scenarios.ts, src/sim/sessionPersist.ts | src/sim/probes/deepTime.test.ts | — | 2b74cb9 |
| P-006 | Prediction is an explicit commit-and-compare mechanic | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/PLAYTEST_SLICE5A.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/main.ts, src/sim/prediction/PredictionSession.ts, src/ui/controls.ts | src/sim/prediction/prediction.test.ts | yes | 2b74cb9 |
| E-001 | Species respond to habitat | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| E-002 | Habitat readiness gates introductions | Superseded by E-007 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| E-003 | Readiness indicators inform without prescribing | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| E-004 | Players introduce ecological roles, not named species | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| E-005 | Wildlife can become habitat | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/WorldState.ts, src/sim/process/surfaceWaterProcess.ts, src/sim/process/vegetationProcess.ts | src/sim/veg-water.test.ts | — | 2b74cb9 |
| E-006 | Survival determines introduction success | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| E-007 | Ecological roles are attemptable without readiness hard-locking | Current *(changed from Locked in v1 | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| E-008 | Role resolution selects the biome-appropriate candidate; the simulation determines establishment | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| E-009 | Readiness is inferred from simulation state | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/9-composition.md | — | yes | 2b74cb9 |
| A-001 | Interventions are functional, not geographically branded | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| A-002 | Pulse interventions are distinct | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| A-003 | Structural interventions are distinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| A-004 | Interventions have contextual consequences, not guaranteed results | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| A-005 | Siting selects a cause rather than painting an outcome | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/config.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/conformance.test.ts, src/sim/siting.test.ts | yes | 2b74cb9 |
| A-006 | Pulse interventions are sited too | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 2b74cb9 |
| G-001 | Sandbox has no win condition | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE6.md, docs/THESIS.md | — | — | 2b74cb9 |
| G-002 | Scenarios provide finite objectives | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| G-003 | Scenario completion may use target species count | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| G-004 | No universal optimum ecosystem exists | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | 2b74cb9 |
| G-005 | Scenario completion uses a persistence window | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md | — | — | 2b74cb9 |
| G-006 | Required objectives must remain recoverable or declare failure explicitly | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | 2b74cb9 |
| G-007 | Post-completion persistence | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| G-008 | Scenarios use mixed ecological objectives | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| ES-001 | Succession is emergent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | src/sim/vegetation.test.ts | — | 2b74cb9 |
| ES-002 | Disturbance is necessary and context-dependent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| ES-003 | Healthy ecosystems fluctuate | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| ES-004 | Local extinction is possible | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| ES-005 | Recovery takes ecological time | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| ES-006 | Carrying capacity emerges | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/9-composition.md, src/sim/WorldState.ts | src/sim/vegetation.test.ts | — | 2b74cb9 |
| ES-007 | Food webs drive population dynamics | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| W-001 | Windward Basin is the reference preserve | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| W-002 | A preserve is one continuous landscape with emergent regions | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/hydrology/flowRouting.ts | src/sim/flow-structure.test.ts | — | 2b74cb9 |
| W-003 | Each preserve has a fixed species pool | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md | — | — | 2b74cb9 |
| W-004 | Every preserve is a living diorama | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| W-005 | Preserve terrain uses hybrid generation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| W-006 | Humans are outside the agent simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md | — | — | 2b74cb9 |
| U-001 | Information is layered | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| U-002 | Simplify presentation, not ecological truth | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | 2b74cb9 |
| U-003 | The world is the primary visualization | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| U-004 | Curiosity precedes explanation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md | — | — | 2b74cb9 |
| U-005 | The primary view is an elevated living diorama | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| U-006 | The Field Notebook provides bounded causal explanation | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 2b74cb9 |
| ART-001 | Scientific impressionism | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | 2b74cb9 |
| ART-002 | Beauty encourages stewardship | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md | — | — | 2b74cb9 |
| ART-003 | Ecological change is visible | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| AUD-001 | Sound reflects ecological state | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| AUD-002 | Silence has ecological meaning | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| AUD-003 | Recovery is audible | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| N-001 | No ecosystem painter | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md | src/sim/conformance.test.ts | — | 2b74cb9 |
| N-002 | No universal optimization puzzle | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/9-composition.md, src/render/TerrainMesh.ts, src/sim/habitat/hsiComposition.ts | — | — | 2b74cb9 |
| N-003 | No species collection game | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md | — | — | 2b74cb9 |
| N-004 | No arbitrary hidden rules | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/9-composition.md | — | — | 2b74cb9 |
| N-005 | No decorative wildlife | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| RC-001 | Limiting mechanism for repeated intervention | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| RC-002 | Ecological opportunity as primary constraint | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | 2b74cb9 |
| RC-003 | Consequence of failed introduction attempts | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | 2b74cb9 |
| RC-004 | Ecological time and opportunity constrain intervention | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| T-001 | Save-state determinism policy | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/probes/scenarios.ts | src/sim/hydrology.determinism.test.ts | — | 2b74cb9 |
| T-002 | Supported player-facing time rates | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/SimClock.ts | — | — | 2b74cb9 |
| T-003 | Save compatibility preserves causal history | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/sim/WorldState.ts, src/sim/process/habitatProcess.ts, src/sim/save.ts, src/sim/sessionPersist.ts, src/ui/controls.ts | src/sim/save.test.ts | — | 2b74cb9 |
| T-004 | Content is data-driven | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/sim/save.ts | src/sim/save.test.ts | — | 2b74cb9 |
| T-005 | Layered simulation inspection is an engine capability | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, src/render/TerrainMesh.ts, src/ui/controls.ts | — | — | 2b74cb9 |
| T-006 | Simulation and rendering are separate | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/render/FlowCueMesh.ts, src/sim/formMemory.ts, src/sim/habitat/hsiComposition.ts, src/sim/hydrology/HydrologyModel.ts, src/sim/types.ts | src/sim/hydrology.determinism.test.ts | — | 2b74cb9 |
| T-007 | The reference prototype is Three.js with modular heightfield hydrology | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/hydrology/HeightfieldHydrology.ts, src/sim/hydrology/HydrologyModel.ts | — | yes | 2b74cb9 |
| F-001 | Advanced ecosystem-engineer behaviors | Deferred | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | 2b74cb9 |
| F-002 | Advanced save comparison tools | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md | — | — | 2b74cb9 |
| F-003 | Additional preserves | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | 2b74cb9 |
| F-004 | Expanded educational overlays | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | 2b74cb9 |
| F-005 | Counterfactual causal replay | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/THESIS.md | — | — | 2b74cb9 |
| C-001 | Cheap groundwater / baseflow store | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/VERIFICATION_POLICY.md, src/config.ts, src/sim/WorldState.ts, src/sim/probes/scenarios.ts, src/sim/process/groundwaterProcess.ts, src/sim/process/scheduler.ts | src/sim/save.test.ts, src/sim/soil-water.test.ts | — | 2b74cb9 |
| C-002 | GEO-002 spatial cost test | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/candidates/C-002-dossier.md, src/sim/WorldState.ts | src/sim/siting.test.ts | yes | 2b74cb9 |
| C-003 | Stochastic vs authored climate forcing | Open *(owner direction recorded 2026-07-28; evaluation outstanding)* | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/VERIFICATION_POLICY.md, src/sim/climate/rainRegime.ts | src/sim/rainRegime.test.ts | — | 2b74cb9 |
| C-004 | Force control as an intervention axis | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-004-dossier.md, docs/playtests/8c-return-visit.md, src/sim/climate/rainRegime.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/rainRegime.test.ts | yes | 2b74cb9 |
| C-005 | Branch-and-compare as a core instrument | Open | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md | — | yes | 2b74cb9 |
| C-006 | Sculpting is abundant; scarcity lives in ecological time | Open | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, src/config.ts | — | yes | 2b74cb9 |
| C-007 | Arrival as the primary biological verb | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-007-dossier.md, docs/slices/9-composition.md, src/sim/habitat/hsiComposition.ts | — | yes | 2b74cb9 |
| C-008 | Intervention → visible response budget | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md | — | yes | 2b74cb9 |
| C-009 | Substrate differentiation | Open | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md | — | yes | 2b74cb9 |
| C-010 | Legacy substances (contaminant load) | Open | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md | — | yes | 2b74cb9 |
| C-011 | Real-world intuition is the instrument | Open | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/THESIS.md | — | yes | 2b74cb9 |
| C-012 | Preserve extent and resolution follow habitat mosaic | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md | — | yes | 2b74cb9 |
| C-013 | Undo as an affordance of abundant sculpting | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md, src/sim/sessionPersist.ts, src/ui/controls.ts | src/sim/sessionPersist.test.ts | yes | 2b74cb9 |
| C-014 | How audio derives from simulation state | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md | — | yes | 2b74cb9 |

<!-- END GENERATED -->
