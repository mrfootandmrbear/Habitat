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

**Kind:** situation — **Superseded by C-015** (owner ballot B 2026-07-30)

**Review trigger.** Discharged: island + sea datum is the canonical preserve reference. Windward Basin / closed-basin fixtures remain valid probe modes. F-003 second-preserve loading is unchanged.

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

### U-006 — The Field Notebook provides bounded causal explanation *(Locked — owner 2026-07-31)*

**Criterion.** Every sentence the notebook emits is traceable to a specific simulated contributing condition, and a reviewer can locate that state. Sample the emitted corpus, not a curated example.

**Judge.** Reviewer against a sampled corpus; owner for whether the notebook answers a question already had (U-004).

**Promotion authority.** Owner (§3.0) — discharged 2026-07-31: machine corpus traceability + owner **yes** (answers existing question).

**Artifact.** Sampled sentences with the state each is traced to; `docs/candidates/U-006-dossier.md`.

**Failure means.** Any untraceable sentence is confident template prose; one such sentence is enough to fail.

**Slice trigger.** After Field Notebook exists — met.

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

### C-002 — GEO-002 spatial cost test *(Locked — owner 2026-07-31)*

**Criterion.** Documented spatial rule (pools everywhere vs geomorphology near-channel / high-A only) matches the running `geomorphologyProcess`, with a Tier-M test that high-A cells erode under bare cover more than low-A cells, and production still runs on low-A cells.

**Judge.** CI + short register review (ratify Slice 8 reading or supersede).

**Promotion authority.** Owner (§3.0) — discharged 2026-07-31: owner **Lock** (ratify Slice 8 reading).

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

### C-004 — Force control as an intervention axis *(Locked — stewardship sitting 2026-07-30)*

**Criterion.** A build exists in which the player changes a force regime (not a place) and the world's response is attributable to that change: same seed, same terrain, two regime settings, divergent outcome — plus a stated and enforced boundary that no control targets a location. Owner half: after setting a regime and running time, the player describes what happened as something the world did, not as something they placed.

**Judge.** CI for the paired-regime divergence and the no-targeting invariant; owner for the "world did it" reading (A-005 / N-001 boundary).

**Promotion authority.** Owner (§3.0) — discharged: machine `regime-divergence` + owner Pass (alive / world-did-it). Want-faster-than-16× is product feedback, not a criterion failure. **C-020** weather glitches do not reopen C-004.

**Artifact.** `docs/evidence/regime-divergence.baseline.json`; Force panel; `docs/candidates/C-004-dossier.md`; [batch-stewardship-alive.md](playtests/batch-stewardship-alive.md).

**Failure means.** If regime control reads as smiting, the boundary in THESIS §9 was not enforced and D-001 is at risk — narrow the surface before widening it.

**Slice trigger.** The first slice that ships a force dial — met.

---

### C-005 — Branch-and-compare as a core instrument *(Locked — tooling, not core; owner 2026-07-31)*

**Criterion.** A world can be forked and both branches run under different force settings, reproducibly: same seed + same settings → identical hash (T-001, P-005), and the two branches are presentable side by side without the player reading numbers.

**Judge.** CI for reproducibility and branch isolation; owner for whether comparison is something they *want* to do rather than a debugging feature.

**Promotion authority.** Owner (§3.0) — discharged 2026-07-31: owner locked **as debug / optional tooling**, not a core play instrument. Machine scaffold remains valid for tooling; F-002 advanced compare stays Deferred. THESIS §7 "run again" is force change + time, not mandated branch UI.

**Artifact.** Branch round-trip test extending P-005's criterion; the comparison view. Evidence: `docs/evidence/branch-compare.baseline.json`, `src/sim/branch.ts`, `docs/candidates/C-005-dossier.md`.

**Failure means.** If branches diverge without a force change, determinism is broken and this is a T-001 defect, not a design question. *(Owner chose tooling — criterion's "want in play" half closed against core-instrument; not a Hold.)*

**Slice trigger.** After a force dial exists to vary.

---

### C-006 — Sculpting is abundant; scarcity lives in ecological time *(Locked — CI 2026-07-31)*

**Criterion.** Sculpting is unrationed — no counter, cost, or cooldown on terrain edits — and a session of heavy sculpting still cannot produce a finished ecosystem without elapsed simulation time (N-001, RC-004).

**Judge.** CI — the absence of an action economy is testable, and so is "no edit path writes a mature ecological state directly."

**Promotion authority.** Agent (§3.0) — discharged 2026-07-31: `src/sim/c006-abundant-sculpting.test.ts` (no economy patterns; 100 edits → veg sums unchanged; heavy sculpt without time → biomass = 0).

**Artifact.** Conformance test asserting no per-edit economy and no direct ecological write from a siting tool.

**Failure means.** If a cost mechanic is needed to prevent degenerate play, RC-004 is wrong and the register — not this candidate — needs revisiting.

**Slice trigger.** Any slice touching siting tools.

---

### C-007 — Arrival as the primary biological verb *(Locked — Slice 12)*

**Criterion.** A written choice, plus a build in which at least one biological occupant appears **because conditions became suitable** rather than because the player introduced it — with the suitability field inspectable and monotone (improving the limiting input raises the chance of arrival; improving a non-limiting input does not).

**Judge.** CI for the monotonicity and the inspectability; owner for whether an unannounced arrival reads as *earned by the place you made* rather than as a spawn.

**Promotion authority.** Owner (§3.0) — discharged 2026-07-29: appearance of life must mimic real life, therefore through earned conditions.

**Artifact.** Limiting-factor / HSI field (BUILD_GUIDE §4.4) as arrival gate; Slice 12 occupant (`arrival-earned`); decision note in register C-007 Locked; `docs/candidates/C-007-dossier.md`.

**Failure means.** If arrival reads as random spawning, the gate is not legible and S-008 / N-004 are both implicated. If the owner prefers deliberate introduction, close C-007 against the thesis and restore RC-003's queue position. *(Did not fire — owner chose earned arrival.)*

**Slice trigger.** Slice 9 — the spine is the gate; Slice 12 — first occupant; owner Pass closes.

---

### C-008 — Intervention → visible response budget *(Open)*

**Criterion.** For each interaction class (terrain sculpt; force-regime change), a stated budget in **simulation time at a named rate** within which a visible change occurs, measured by the encoded-signal proxy (§3, Tier P) rather than by opinion — and the shipped build meets it.

**Judge.** CI / agent proxy. The budget value itself is an owner preference, but conformance to it is machine-checked.

**Promotion authority.** Agent (§3.0) **once the owner has named the budget** — measurement and enforcement are Tier M/P; choosing the number is not. Until a number exists, this stays Open with the proxy reported.

**Artifact.** Response-latency proxy per interaction class; THESIS §4.

**Failure means.** If no achievable budget makes sculpting feel responsive, the problem is the encoding or the clock — not the player's patience.

**Slice trigger.** The first observable slice after this is filed.

---

### C-009 — Substrate differentiation *(Locked — owner Lock batch A 2026-07-30)*

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

### C-013 — Undo as an affordance of abundant sculpting *(Locked — owner 2026-07-31)*

**Criterion.** Repeated sculpt-and-undo leaves the world **bit-identical** to never having sculpted (T-001 hash equality), undo is available without confirmation or cost, and **elapsed simulation time is not undoable** — after time advances, the only route back is restoring an explicit branch point (**C-005** tooling), never a rewind of history.

**Judge.** CI for hash equality and for the absence of a time-rewind path; owner for whether the boundary reads as fair rather than as punishment.

**Promotion authority.** Owner (§3.0) — discharged 2026-07-31: machine hash cases + owner **fair** (not punishment).

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

### C-015 — The world is an island; sea level is global base level *(Locked — owner ballot B 2026-07-30)*

**Criterion.** With `seaLevel` set, surface water leaves through ocean cells into `ledger.oceanExchange` (not perimeter-minima outlets); mass balance closes (H-004); same seed + same sea level → identical hash; different sea level → divergent shoreline / wet fraction. Sea-level API has no cell/place arguments. Priority-Flood seeds from ocean cells. Existing probes without `seaLevel` keep prior baselines and golden hashes.

**Judge.** CI / agent probes for conservation, determinism, and no-targeting; owner for W-001 supersession and whether the island reads as a place (THESIS §8 / C-012 mosaic).

**Promotion authority.** Owner (§3.0) — discharged: machine `island-drainage` + place Pass (batch-island-brief) + **Supersede W-001 / Lock C-015**.

**Artifact.** Probe `island-drainage` + `docs/evidence/island-drainage.baseline.json`; sea-level control surface; SIMULATION_MODEL §10; `docs/candidates/C-015-dossier.md`.

**Failure means.** If ocean exchange is a silent leak, H-004 fails. If enabling sea level moves unrelated golden hashes, the option was not truly opt-in. If the silhouette does not read without inspector, encoding — not hydrology — is the defect.

**Slice trigger.** Slice 16 (before Slice 15 brief chrome) — met.

---

### C-016 — Tidal forcing as a band-appropriate envelope *(Locked — owner Lock batch A 2026-07-30)*

**Criterion.** Mean high / mean low water are global scalars; intertidal cells are those with elevation between them; no per-event tidal phase advances the sim. Same envelope → identical hash; widening the envelope grows the intertidal cell count monotonically.

**Judge.** CI for determinism / monotonicity; owner for whether a literal tide muddies the thesis metaphor (THESIS §4 "tide" = fast-forward).

**Promotion authority.** Owner (§3.0).

**Artifact.** Intertidal field or derived mask + probe; composition note citing S-009 band fit. Machine evidence: `docs/evidence/tidal-envelope.baseline.json`, `docs/candidates/C-016-dossier.md`.

**Failure means.** If phase must run every event step to look right, the model is fighting the clock — keep the envelope or drop tides.

**Slice trigger.** Slice 17, after C-015 machine half.

---

### C-017 — Wave exposure contributes to geomorphology *(Locked — owner Lock batch A 2026-07-30)*

**Criterion.** A derived exposure field (fetch × wind) changes shoreline elev/depth only by contributing into the geomorphology owner; no second sediment writer; no SWE solver in-tree. Sheltered vs exposed paired shores diverge under one wind regime; mass of displaced soil closes.

**Judge.** CI for contribution protocol + paired divergence; owner for whether shore change reads as the sea's work (A-005 / C-004).

**Promotion authority.** Owner (§3.0).

**Artifact.** Exposure field + longshore tendency + geomorphology contribution path; probes `shore-exposure` and `longshore-drift`; EXTERNAL_REFERENCES ban on SWE authority cited in code. Machine evidence: `docs/evidence/shore-exposure.baseline.json`, `docs/evidence/longshore-drift.baseline.json`, `docs/candidates/C-017-dossier.md`.

**Failure means.** If a coastal process writes `terrain.elevation` directly, T-006 / GEO-002 fail. If fidelity seems to require SWE, keep the entry Open and do not ship.

**Slice trigger.** Slice 18, after C-016 or directly after C-015 if tides defer.

---

### C-018 — Salinity as the first mobile legacy substance *(Locked — owner Lock batch A 2026-07-30)*

**Criterion.** One salinity field sources at the ocean boundary, dilutes with freshwater, is save-legacy, and gates HSI / arrival so a salty hollow earns less (or different) occupancy than a freshened twin under one seed schedule. No player cleanup tool. Water-balance residual class unchanged.

**Judge.** CI for transport / save / arrival gating; owner (or unfamiliar viewer) for S-008 "which history is blocking" legibility.

**Promotion authority.** Owner (§3.0).

**Artifact.** Salinity field + paired arrival probe; save round-trip. Machine evidence: `docs/evidence/salinity-arrival.baseline.json`, `docs/candidates/C-018-dossier.md`. Tier-P default-view crust: `src/ui/terrainEncoding.ts` (`salinityEncodingDelta`), `presentation.proxy.test.ts`. Owner sitting **Pass** 2026-07-30: `docs/playtests/batch-salt-overseas.md` Question A (Lock still owner).

**Failure means.** If salt needs its own mass balance, coupling is wrong. If the viewer blames today's rain instead of legacy salt, S-008 stays unearned.

**Slice trigger.** Slice 20 (may follow C-009 if substrate table lands first).

---

### C-019 — Island biogeography reframes the fixed species pool *(Locked — owner Lock batch A 2026-07-30)*

**Criterion.** Overseas seed pressure replaces mainland-perimeter rain on island worlds; smaller island area (or greater isolation) yields lower eligible richness / establishment under identical regimes; W-003's curated catalogue remains the universe of types. Deterministic under T-001.

**Judge.** CI for area/isolation monotonicity + determinism; owner for whether sparse overseas arrival still feels earned (C-007).

**Promotion authority.** Owner (§3.0).

**Artifact.** Over-water dispersal kernel + paired small/large island probe; note reframing W-003 sourcing without striking the Locked entry. Machine evidence: `docs/evidence/island-arrival.baseline.json`, `docs/candidates/C-019-dossier.md`. Tier-P shore–interior occupants: `src/ui/occupantEncoding.ts`, `OccupantMesh`, `presentation.proxy.test.ts`. Owner sitting **Pass** 2026-07-30: `docs/playtests/batch-salt-overseas.md` Question B (Lock still owner).

**Failure means.** If arrival becomes a random spawn table, N-004 / C-007 fail. If perimeter seed rain remains the only path on an island, C-015's boundary story is incomplete.

**Slice trigger.** Slice 21, after C-015 and preferably after C-018.

---

### C-020 — Atmospheric precip delivery *(Locked)*

**Criterion.** Precipitation phase and placement are attributable to atmospheric state (wind, moisture, heat → cloud → rain/snow/sleet), not to a place the player targeted; mass balance closes (H-004); same seed + same atmospheric forcing → identical hash; the control surface (if any) remains a regime / climate dial with no cell arguments. Existing rain-regime dial may remain as a fallback until this criterion is met.

**Judge.** CI for conservation, determinism, and no-targeting; owner for whether precip feels like weather the world made (C-004 / C-011).

**Promotion authority.** Owner (§3.0) — discharged 2026-07-31: machine `cloud-delivery` + G1–G5 proxies + owner Lock (weather the atmosphere made; cold spells read as snow).

**Artifact.** Atmospheric / cloud process + probe; `docs/candidates/C-020-dossier.md`; `docs/playtests/C-020-weather-lock.md`; `src/ui/stormCue.test.ts`.

**Failure means.** If clouds become a paint-where-it-rains tool, C-004 / N-001 fail. If delivery is stochastic while C-003 is Open, process defect. If phase has no real-world referent, N-004 fails.

**Slice trigger.** Slice **F** may land climate-mean + orographic lite ahead of Slice 17; full cloud/phase criterion remains after that lite path is proven in the landscape (not via inspector).

---

### C-021 — Season as a force dial *(Open)*

**Criterion.** A Force-panel season / seasonal-regime control (no cell arguments) changes which seasonal-band outcomes fire or how strongly under identical terrain and rainfall/heat settings; paired regimes diverge on a named seasonal observable (T-001 hash or field delta); the dial has a real-world referent (N-004) and does not rewind or erase legacy state (S-007).

**Judge.** CI for no-targeting + paired divergence; owner for whether the dial reads as choosing the season the place is living through rather than a calendar cheat.

**Promotion authority.** Owner (§3.0).

**Artifact.** Force panel control + probe; dossier when machine half lands.

**Failure means.** If season becomes a cell-targeted frost brush, C-004 fails. If it duplicates Heat without a distinct referent, C-011 fails.

**Slice trigger.** After C-006 Locked; may share a force-panel slice with **C-022**.

---

### C-022 — Erosion intensity as a force dial *(Open)*

**Criterion.** A Force-panel erosion / geomorph intensity control (no cell arguments) scales existing hillslope/channel/shore work under one GEO-002 law; paired high vs low intensity on identical terrain diverges on channel loss / deposit metrics with mass conserved (H-004); intensity has a storminess / disturbance referent (N-004).

**Judge.** CI for conservation, no-targeting, and paired divergence; owner for whether dialling intensity feels like choosing how hard the forces work — not like a smooth tool.

**Promotion authority.** Owner (§3.0).

**Artifact.** Intensity dial on existing geomorphology + probe; dossier when machine half lands.

**Failure means.** If intensity becomes a second erosion Process or a paint-smooth brush, GEO-002 / N-001 fail.

**Slice trigger.** After C-006 Locked; may share a force-panel slice with **C-021**.

---

### C-023 — Guild competition / successional displacement *(Open)*

**Criterion.** On identical terrain, seed schedule, and forcing, a cell suitable for two guilds resolves to a **dominant** one rather than both at capacity: the suppressed guild's biomass declines from a previously established level while the dominant guild rises, driven by the existing Beer–Lambert `light.understory` budget and not by a new rule or a dominance table. Capacity stays resource-derived (ES-006 — no fixed K). No stochastic tie-breaks (T-001 / C-003 Open). `veg.cover` keeps one authority (E-005). A no-competition regression case leaves current baselines unmoved.

**Judge.** CI for displacement direction, determinism, single-authority, and the ES-006 guard; owner for whether one guild giving way to another reads as succession rather than as a hidden ranking.

**Promotion authority.** Owner (§3.0).

**Artifact.** Understory-light coupling in guild HSI + a `succession-displace` probe; dossier when the machine half lands.

**Failure means.** If displacement needs a dominance rank with no real-world referent, C-011 / N-004 fail. If one guild always wins everywhere it occurs, N-002's no-optimization-puzzle fails and the six guilds collapse to a ladder (N-003 / W-003).

**Slice trigger.** After **L2** (local seed rain) and **L3** (mortality as a rate) — [BUILD_GUIDE.md](BUILD_GUIDE.md) §4.37–§4.38. A suppressed guild cannot recede while mortality is an instantaneous clamp, so building competition first would measure nothing.

---

### C-024 — What a sim-year means (band calendar coherence) *(Open)*

**Criterion.** Every band advances at the period its name claims: over one nominal sim-year the daily band commits 360 times, seasonal 36, annual once, and decadal once per ten sim-years — asserted by test against the clock, not by documentation. Per-call rates are reconciled so that the *behaviour per sim-year* is a deliberate, stated choice rather than an artefact of the compression factor, and the reconciliation taken (slow the bands vs rescale the rates) is named in the register with its **C-008** cost. Baselines move wholesale; each move is explained.

**Judge.** CI for calendar coherence and the band-refinement tolerance after rescaling; **owner** for whether the resulting pacing still reads as a place worth watching — slowing the decadal band to spec means waiting 360× longer for erosion, and that is a taste question against **C-008**, not a number.

**Promotion authority.** Owner (§3.0).

**Artifact.** Band-period test + reconciled rate constants + a full baseline refresh with stated reasons; dossier when the machine half lands.

**Failure means.** If it is resolved by relabelling the HUD while the bands stay incoherent, **S-009** is not satisfied and the review's finding is merely hidden. If the decadal band is slowed to spec without addressing the wait, **C-008** immediacy fails and the living-sand-castle payoff moves out of session reach.

**Slice trigger.** Blocks **L8**; rises once **L6** (real-world time units) lands, because the incoherence becomes player-visible the moment the control speaks in years.

---

### C-025 — Rate-selected integration floor (deep time) *(Open)*

**Criterion.** With floor selection active, a world advanced to the same simulation time at two different rates agrees within a **stated, measured tolerance** on named ecological observables (the `band-refinement` family's existing 5–8% form, extended across floors rather than across dt within one band) — and the rate schedule is part of the run's declared state, so replay from seed plus schedule is once again hash-exact (**T-001**), travels through save (**T-003**), and leaves branch comparison (**C-005**) and prediction fairness (**P-006**) well-defined. The HUD names the active floor.

**Judge.** CI for the tolerance, replay-with-schedule hash exactness, and save/branch round-trip; **owner** for whether a coarser world at high rate is still recognisably the same world, and whether the tolerance is one they are willing to have their predictions judged against.

**Promotion authority.** Owner (§3.0).

**Artifact.** Floor-selection scheduler + rate schedule in save/branch state + a `floor-invariance` probe naming the tolerance; dossier when the machine half lands.

**Failure means.** If floors diverge beyond a stated tolerance, **S-009** rate-invariance and **T-002** both fail and the deep-time control is a different simulation wearing the same name. If the schedule does not travel with the run, **T-001** replay, **P-006** fairness, and **C-005** comparison all break silently — the worst outcome, because nothing goes red.

**Slice trigger.** Blocks **L8**, jointly with **C-024**. **L7** (activity-gated event band) is deliberately outside this entry: it ships only on hash-identity, and only the residue that cannot be made hash-identical falls here.

---

### C-026 — CVD-safe cross-domain palette *(Open)*

**Criterion.** No two categorical colors that can co-occur on screen in the default view (occupant guild colors, terrain substrate/tidal states) fall within a stated minimum perceptual distance of each other under a simulated common-CVD (deuteranopia/protanopia) projection, asserted by a cross-file contrast test — not only the existing within-file delta checks. The measured binder/intertidal collision (`occupantEncoding.ts` vs `terrainEncoding.ts`) is the concrete regression case.

**Judge.** CI for the cross-file contrast floor and the CVD-projected distance; **owner** for whether the resulting palette still reads as the place it's depicting (**U-003**) and passes a clip re-check (**D-007**) if the default view changes.

**Promotion authority.** Owner (§3.0).

**Artifact.** Cross-file palette contrast test (real, CVD-projected metric) + resolved hue set for the colliding pairs; dossier when the palette choice lands.

**Failure means.** If the fix is scoped to the one measured collision without a standing cross-file check, the same class of bug recurs the next time a guild or terrain state is added. If the repalette is broad enough to change the default view's read without a clip-test pass, **D-007** fails.

**Slice trigger.** The mechanical contrast-check fix ships without this candidate ([BUILD_GUIDE §4.52](BUILD_GUIDE.md)); this entry gates only the deliberate hue redesign.

---

### C-027 — Animal trait expression as population fields (procedural morph + threshold swap) *(Open)*

**Criterion.** For at least one animal role, a `pop.<role>.trait.<name>` population trait-mean field exists per cell that (a) moves toward a pressure-derived target by a deterministic first-order law reusing existing HSI factor terms — no RNG, no fixed carrying-capacity constant (**ES-006**) — and (b) drives a rendered `InstancedMesh` population whose per-cell instance count is a literal function of `pop.<role>.density` (not a tuned display number) and whose per-instance morph/socket state is a deterministic sample of the trait-mean field, with no instance identity persisting across ticks (**T-001**, **T-006**). Species identity for the role stays resolved through **W-003**'s fixed pool; only the trait-mean field varies.

**Judge.** CI for determinism (identical seed/state → identical trait-mean trajectory and identical per-instance render sample), the no-fixed-K guard, and the literal density→instance-count mapping; **owner** for whether the resulting trait drift reads as earned, legible adaptation (**C-011**) rather than an arbitrary visual effect.

**Promotion authority.** Owner (§3.0).

**Artifact.** Trait-mean update law + `InstancedMesh` render sampling test + a probe comparable in shape to `arrival-earned`, showing a trait-mean tracking a synthetic pressure change; dossier when the machine half lands.

**Failure means.** If trait drift needs stochastic mutation or per-animal persistent state to look right, the field-simulated/individually-rendered model has failed and the entry should be revisited rather than patched with an entity store. If instance count is tuned for legibility rather than read from density, **C-011**'s "what you see is true" contract breaks the same way it would for vegetation.

**Slice trigger.** Not before **F-001** (ecosystem-engineer behaviors, currently Deferred) is undeferred, and not before **L2**–**L5** land for the plant substrate ([BUILD_GUIDE §4.37–§4.40](BUILD_GUIDE.md)) — L3's mortality-as-a-rate direction is the precedent this entry's update law follows, and L5's competition mechanism is the thing this entry deliberately does not build. Framing: [C-027-framing.md](candidates/C-027-framing.md).

---

### C-028 — Sculpt toolbox vocabulary (sand-castle craft → Habitat causes) *(Open)*

**Criterion.** (a) Every shipped sculpt verb under this entry writes only form and/or substrate material — never vegetation, occupancy, or water-as-finished-habitat (**A-005**, **N-001**, **C-006**). (b) No freeze / lock / protect field or tool exists that exempts cells from tide, waves, erosion, or fire (**C-004**, S-007). (c) No wet-sand sculpt mode changes berm/dig response from sprayed moisture (THESIS §2.2). (d) Brush size (and later flatten / molds / duplicator) leave `stateHash` identical under undo before time advances (**C-013**) and conserve ΣΔelev = ΣΔdepth where clamps do not bind (**C-002**).

**Judge.** CI/agent for (a)–(d); **owner** for whether bucket/shovel (and later molds) feel like shaping sand rather than placing finished architecture, and whether non-ecological flags/banners earn a chrome slot.

**Promotion authority.** Owner (§3.0) for the taste half; agent may ship structural tools under Locked **C-006** without promoting this entry.

**Artifact.** Framing [C-028-framing.md](candidates/C-028-framing.md); §4.55 brush-size tests; dossier when owner sits the taste questions.

**Failure means.** If a sculpt tool paints life or freezes nature, **N-001** / **C-004** fail. If size tiers introduce an edit budget, **C-006** fails.

**Slice trigger.** §4.55 brush size under Locked **C-006** (no wait on Lock); flatten / molds / duplicator follow; decorative chrome stays off tip until owner half.

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

## 5. Generated world facts

**Cite these; do not retype them.** Every number below exists in `src/config.ts`, and any governing document that needs one should link here rather than restating it in prose. The rule exists because prose copies drift silently: **C-012** was filed against `worldSize: 48` read as metres — a scene unit, not a length — and asserted a "48 m plot at 0.5 m cells" that was wrong by 20× in Δx and 400× in area, while [SIMULATION_MODEL.md](SIMULATION_MODEL.md) §2 carried the correct figures the whole time. Nothing in the conformance system caught it, because the ledger checks that IDs are **cited**, never that claims about the code are **true**.

`conformance:check` now fails when this block drifts from `config.ts`, and fails when `worldExtentMeters ≠ gridSize × cellSizeMeters`. Regenerate with `npm run conformance`.

<!-- GENERATED: world-facts -->

| Fact | Value | Source |
| --- | --- | --- |
| Grid | 96 × 96 | `config.gridSize` |
| Cell count | 9,216 | derived |
| Δx (cell edge) | 10 m | `config.cellSizeMeters` |
| Metric extent | 960 m | `config.worldExtentMeters` = gridSize × Δx |
| Cell area | 100 m² | derived |
| Scene half-extent | 48 (Three.js units — **not a length**) | `config.worldSize` |
| Event Δt | 15 sim-min (96 events/day) | `config.eventDtMinutes` |
| Soil | porosity 0.45, default depth 0.8 m | `config.soilPorosity` |
| Step budget | 16 event steps / frame | `config.maxStepsPerFrame` |

<!-- END GENERATED: world-facts -->

---

## 6. Generated conformance ledger

Do not edit the table between the markers below by hand. Regenerate with `npm run conformance`.

<!-- GENERATED: conformance-ledger -->

| ID | Title | Status | Citing files | Citing tests | Criterion | Verified |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | Nature is the protagonist | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| D-002 | Habitat is the objective | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| D-003 | Process over outcome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| D-004 | Emergence over scripting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| D-005 | The world should feel like a work of art | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/VERIFICATION_POLICY.md | — | — | eeb4e62 |
| D-006 | Attention is the unit of engagement | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/L1-L6-composition.md | — | — | eeb4e62 |
| D-007 | Showability orders the work | Locked *(owner, 2026-07-30)* | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-009-dossier.md, docs/candidates/C-020-dossier.md, docs/candidates/C-024-C-025-framing.md, docs/candidates/C-027-framing.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/reviews/2026-07-31-fire-fuel-review.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-ui-encoding-review.md, docs/slices/A-plus-composition.md, docs/slices/B-composition.md, docs/slices/C-006-composition.md, docs/slices/E-composition.md, docs/slices/G-composition.md, docs/slices/L1-L6-composition.md, docs/slices/L4-composition.md, docs/slices/N-composition.md, docs/slices/R-composition.md, docs/slices/S-composition.md, docs/slices/W0-composition.md, docs/slices/chrome-density-composition.md, docs/slices/clouds-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/encoding-delta-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/notebook-composition.md, docs/slices/sculpt-brush-size-composition.md, docs/slices/starting-surface-composition.md | — | — | eeb4e62 |
| S-001 | One simulation for every biome | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | eeb4e62 |
| S-002 | Physical systems precede biology | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | eeb4e62 |
| S-003 | Continuous simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | eeb4e62 |
| S-004 | Ecology is causal and explainable | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| S-005 | Fast systems teach | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/L7-composition.md | — | — | eeb4e62 |
| S-006 | Slow systems remember | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md, src/sim/process/geomorphologyProcess.ts | src/sim/geomorphology.test.ts | — | eeb4e62 |
| S-007 | Hysteresis is fundamental | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/candidates/C-013-dossier.md, docs/candidates/C-021-dossier.md, docs/candidates/C-028-framing.md, docs/evidence/island-colonization.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-vegetation-habitat-review.md, docs/slices/B-composition.md, docs/slices/G-composition.md, docs/slices/L3-composition.md, docs/slices/hsi-curve-shape-composition.md, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/geomorphologyProcess.ts, src/sim/sessionPersist.ts | src/sim/arrival.test.ts, src/sim/save.test.ts, src/sim/seasonRegime.test.ts, src/sim/sessionPersist.test.ts | — | eeb4e62 |
| S-008 | Hysteresis must be legible | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/candidates/C-018-dossier.md, docs/evidence/island-colonization.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-vegetation-habitat-review.md, docs/slices/20-composition.md, docs/slices/L3-composition.md, src/sim/WorldState.ts, src/sim/probes/scenarios.ts | src/sim/arrival.test.ts | yes | eeb4e62 |
| S-009 | Ecological duration is expressed in simulation time | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/14-composition.md, docs/slices/17-composition.md, docs/slices/L1-L6-composition.md, docs/slices/L7-composition.md, docs/slices/drydown-composition.md, docs/slices/fuel-scar-composition.md, docs/slices/guild-cover-light-composition.md, src/config.ts, src/sim/SimClock.ts, src/sim/climate/tidalEnvelope.ts, src/sim/scenario/types.ts, src/ui/timeRates.ts | src/sim/band-refinement.test.ts, src/sim/hydrology.determinism.test.ts, src/sim/time-invariance.test.ts, src/ui/timeRates.test.ts | yes | eeb4e62 |
| H-001 | Water is the primary ecological driver | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/L7-composition.md, docs/slices/drydown-composition.md, src/sim/WorldState.ts | src/sim/soil-water.test.ts | — | eeb4e62 |
| H-002 | Water follows terrain | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/16-composition.md, src/sim/hydrology/flowRouting.ts, src/sim/terrain/generateMountain.ts | src/sim/flow-structure.test.ts | — | eeb4e62 |
| H-003 | Water creates habitat | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/drydown-composition.md, src/sim/WorldState.ts, src/sim/fixtures/pitDem.ts, src/sim/hydrology/flowRouting.ts | src/sim/depression.test.ts, src/sim/soil-water.test.ts | — | eeb4e62 |
| H-004 | Watersheds retain history | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-010-framing.md, docs/candidates/C-015-dossier.md, docs/candidates/C-020-dossier.md, docs/candidates/C-022-dossier.md, docs/playtests/8c-return-visit.md, docs/playtests/C-020-weather-lock.md, docs/playtests/batch-living-return.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/reviews/2026-07-31-fire-fuel-review.md, docs/reviews/2026-07-31-hydrology-geomorphology-review.md, docs/slices/16-composition.md, docs/slices/20-composition.md, docs/slices/G-composition.md, docs/slices/clouds-composition.md, docs/slices/drydown-composition.md, docs/slices/flux-stability-composition.md, src/sim/WorldState.ts, src/sim/habitat/salinityComposition.ts, src/sim/probes/scenarios.ts | src/sim/drydown.test.ts, src/sim/erosionIntensity.test.ts, src/sim/island.test.ts, src/sim/probes/deepTime.test.ts, src/sim/soil-water.test.ts | — | eeb4e62 |
| GEO-001 | Geology precedes ecology | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/slices/flat-routing-composition.md | — | — | eeb4e62 |
| GEO-002 | Terrain evolves only where simulation value justifies cost | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-002-dossier.md, docs/candidates/C-022-dossier.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-31-hydrology-geomorphology-review.md, docs/slices/18-composition.md, docs/slices/19-composition.md, docs/slices/E-composition.md, docs/slices/G-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/climate/erosionRegime.ts, src/sim/climate/longshoreTendency.ts, src/sim/climate/shoreExposure.ts, src/sim/probes/scenarios.ts, src/sim/process/geomorphologyProcess.ts, src/sim/terrain/hillslopeDeposit.ts | src/sim/geomorphology.test.ts, src/sim/terrain/hillslopeDeposit.test.ts | — | eeb4e62 |
| GEO-003 | Landscape history matters | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | eeb4e62 |
| P-001 | Players modify forcings | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | eeb4e62 |
| P-002 | No ecosystem painting | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| P-003 | Observation is primary | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md | — | — | eeb4e62 |
| P-004 | Institutional knowledge, not arbitrary instinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | eeb4e62 |
| P-005 | Save states support experimentation | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md, docs/candidates/C-005-dossier.md, docs/candidates/C-013-dossier.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/B-composition.md, docs/slices/L2-composition.md, docs/slices/L3-composition.md, docs/slices/guild-cover-light-composition.md, src/sim/branch.ts, src/sim/probes/deepTime.ts, src/sim/probes/scenarios.ts, src/sim/sessionPersist.ts | src/sim/branch.test.ts, src/sim/probes/deepTime.test.ts | — | eeb4e62 |
| P-006 | Prediction is an explicit commit-and-compare mechanic | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/PLAYTEST_SLICE5A.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-024-C-025-framing.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/duplicator-stamp-composition.md, src/config.ts, src/main.ts, src/sim/WorldState.ts, src/sim/prediction/PredictionSession.ts, src/ui/controls.ts | src/sim/prediction/prediction.test.ts, src/sim/siting.test.ts | yes | eeb4e62 |
| E-001 | Species respond to habitat | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| E-002 | Habitat readiness gates introductions | Superseded by E-007 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| E-003 | Readiness indicators inform without prescribing | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md | — | — | eeb4e62 |
| E-004 | Players introduce ecological roles, not named species | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/nature-study/cards/NS-011-cryptogam-crust.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/12-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N4-composition.md, docs/slices/N5-composition.md, docs/slices/N9-composition.md | — | — | eeb4e62 |
| E-005 | Wildlife can become habitat | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/13-composition.md, docs/slices/L2-composition.md, src/sim/WorldState.ts, src/sim/probes/scenarios.ts, src/sim/process/surfaceWaterProcess.ts, src/sim/process/vegetationProcess.ts | src/sim/living-hollow.test.ts, src/sim/veg-water.test.ts | — | eeb4e62 |
| E-006 | Survival determines introduction success | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/candidates/C-027-framing.md | — | — | eeb4e62 |
| E-007 | Ecological roles are attemptable without readiness hard-locking | Current *(changed from Locked in v1 | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | eeb4e62 |
| E-008 | Role resolution selects the biome-appropriate candidate; the simulation determines establishment | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-027-framing.md, docs/evidence/island-colonization.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | eeb4e62 |
| E-009 | Readiness is inferred from simulation state | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/11-composition.md, docs/slices/12-composition.md, docs/slices/9-composition.md | — | yes | eeb4e62 |
| A-001 | Interventions are functional, not geographically branded | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | eeb4e62 |
| A-002 | Pulse interventions are distinct | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-31-fire-fuel-review.md, docs/slices/fire-spread-rate-composition.md, src/main.ts, src/sim/WorldState.ts | src/sim/fire.test.ts | — | eeb4e62 |
| A-003 | Structural interventions are distinct | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| A-004 | Interventions have contextual consequences, not guaranteed results | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| A-005 | Siting selects a cause rather than painting an outcome | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/C-006-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/sculpt-brush-size-composition.md, src/config.ts, src/main.ts, src/sim/WorldState.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/conformance.test.ts, src/sim/siting.test.ts | yes | eeb4e62 |
| A-006 | Pulse interventions are sited too | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-31-fire-fuel-review.md, docs/slices/fire-spread-rate-composition.md, src/sim/WorldState.ts | — | yes | eeb4e62 |
| G-001 | Sandbox has no win condition | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE6.md, docs/THESIS.md, docs/slices/14-composition.md, docs/slices/C-006-composition.md, src/main.ts | — | — | eeb4e62 |
| G-002 | Scenarios provide finite objectives | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/14-composition.md, src/main.ts, src/sim/probes/scenarios.ts, src/sim/scenario/ScenarioSession.ts, src/sim/scenario/types.ts, src/ui/controls.ts | src/sim/scenario.test.ts | — | eeb4e62 |
| G-003 | Scenario completion may use target species count | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md | — | — | eeb4e62 |
| G-004 | No universal optimum ecosystem exists | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md | — | — | eeb4e62 |
| G-005 | Scenario completion uses a persistence window | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/slices/14-composition.md, src/sim/scenario/types.ts, src/sim/scenario/windowEval.ts | src/sim/scenario.test.ts | — | eeb4e62 |
| G-006 | Required objectives must remain recoverable or declare failure explicitly | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/slices/14-composition.md | — | — | eeb4e62 |
| G-007 | Post-completion persistence | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/14-composition.md, src/sim/probes/scenarios.ts, src/sim/scenario/ScenarioSession.ts, src/sim/scenario/types.ts, src/sim/scenario/windowEval.ts, src/ui/briefChrome.ts | src/sim/scenario.test.ts | yes | eeb4e62 |
| G-008 | Scenarios use mixed ecological objectives | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/slices/14-composition.md | — | — | eeb4e62 |
| ES-001 | Succession is emergent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/11-composition.md, docs/slices/N10-composition.md, src/config.ts, src/sim/habitat/crustHsiComposition.ts, src/sim/habitat/shrubHsiComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/vegetationProcess.ts | src/sim/light-succession.test.ts, src/sim/vegetation.test.ts | — | eeb4e62 |
| ES-002 | Disturbance is necessary and context-dependent | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/L3-composition.md, docs/slices/fire-spread-rate-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/probes/scenarios.ts | src/sim/fire.test.ts | — | eeb4e62 |
| ES-003 | Healthy ecosystems fluctuate | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/drydown-composition.md, src/sim/probes/scenarios.ts | src/sim/drydown.test.ts | — | eeb4e62 |
| ES-004 | Local extinction is possible | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/slices/W0-composition.md, src/sim/process/fireProcess.ts | src/sim/fire.test.ts | — | eeb4e62 |
| ES-005 | Recovery takes ecological time | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/slices/drydown-composition.md | — | — | eeb4e62 |
| ES-006 | Carrying capacity emerges | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/11-composition.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/9-composition.md, docs/slices/L3-composition.md, docs/slices/guild-cover-light-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/probes/scenarios.ts | src/sim/arrival.test.ts, src/sim/vegetation.test.ts | — | eeb4e62 |
| ES-007 | Food webs drive population dynamics | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-31-living-world-review.md | — | — | eeb4e62 |
| W-001 | Windward Basin is the reference preserve | Superseded by C-015 | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-015-dossier.md, docs/candidates/owner-lock-batch.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/16-composition.md | — | — | eeb4e62 |
| W-002 | A preserve is one continuous landscape with emergent regions | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/16-composition.md, src/sim/hydrology/flowRouting.ts | src/sim/flow-structure.test.ts | — | eeb4e62 |
| W-003 | Each preserve has a fixed species pool | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/SIMULATION_MODEL.md, docs/candidates/C-019-dossier.md, docs/candidates/C-027-framing.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/nature-study/cards/NS-011-cryptogam-crust.md, docs/slices/12-composition.md, docs/slices/21-composition.md, docs/slices/L2-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N4-composition.md, docs/slices/N5-composition.md, docs/slices/N9-composition.md, src/sim/habitat/crustHsiComposition.ts, src/sim/habitat/shrubHsiComposition.ts, src/sim/habitat/strandHsiComposition.ts | — | — | eeb4e62 |
| W-004 | Every preserve is a living diorama | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/16-composition.md | — | — | eeb4e62 |
| W-005 | Preserve terrain uses hybrid generation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md | — | — | eeb4e62 |
| W-006 | Humans are outside the agent simulation | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/SIMULATION_MODEL.md | — | — | eeb4e62 |
| U-001 | Information is layered | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/FORCE_PANEL.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/chrome-density-composition.md, src/ui/chromeDensity.ts, src/ui/controls.ts | src/sim/presentation.proxy.test.ts, src/ui/chromeDensity.test.ts | — | eeb4e62 |
| U-002 | Simplify presentation, not ecological truth | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | — | eeb4e62 |
| U-003 | The world is the primary visualization | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/reviews/2026-07-31-ui-encoding-review.md, docs/slices/L1-L6-composition.md, docs/slices/chrome-density-composition.md, docs/slices/encoding-delta-composition.md, src/ui/chromeDensity.ts | — | — | eeb4e62 |
| U-004 | Curiosity precedes explanation | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/NATURAL_PROCESS_MATH.md, docs/slices/notebook-composition.md, src/main.ts, src/notebook/FieldNotebook.ts, src/ui/notebookChrome.ts | — | — | eeb4e62 |
| U-005 | The primary view is an elevated living diorama | Current | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | yes | eeb4e62 |
| U-006 | The Field Notebook provides bounded causal explanation | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/candidates/U-006-dossier.md, docs/candidates/owner-lock-batch.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/notebook-composition.md, src/main.ts, src/notebook/FieldNotebook.ts, src/notebook/corpus.ts, src/notebook/types.ts, src/ui/controls.ts, src/ui/notebookChrome.ts | src/notebook/notebook.test.ts, src/sim/presentation.proxy.test.ts | — | eeb4e62 |
| ART-001 | Scientific impressionism | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/PLAYTEST_SLICE4.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/11-composition.md | — | yes | eeb4e62 |
| ART-002 | Beauty encourages stewardship | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/slices/L4-composition.md | — | — | eeb4e62 |
| ART-003 | Ecological change is visible | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/L4-composition.md | — | — | eeb4e62 |
| AUD-001 | Sound reflects ecological state | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/slices/W0-composition.md, src/audio/AudioBus.ts, src/audio/webAudioHook.ts, src/main.ts | — | — | eeb4e62 |
| AUD-002 | Silence has ecological meaning | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/candidates/C-014-dossier.md, docs/playtests/batch-stewardship-alive.md, docs/slices/W0-composition.md, src/audio/AudioBus.ts, src/audio/webAudioHook.ts | src/audio/audio.test.ts | — | eeb4e62 |
| AUD-003 | Recovery is audible | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/candidates/C-014-dossier.md, docs/slices/A-plus-composition.md, docs/slices/W0-composition.md, src/audio/AudioBus.ts, src/audio/webAudioHook.ts | src/audio/audio.test.ts | — | eeb4e62 |
| N-001 | No ecosystem painter | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-009-dossier.md, docs/candidates/C-010-framing.md, docs/candidates/C-028-framing.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/nature-study/cards/NS-006-twin-hollow-salt-memory.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/14-composition.md, docs/slices/20-composition.md, docs/slices/C-006-composition.md, docs/slices/N-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N4-composition.md, docs/slices/N5-composition.md, docs/slices/N9-composition.md, docs/slices/S-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, src/sim/WorldState.ts | src/sim/c006-abundant-sculpting.test.ts, src/sim/conformance.test.ts, src/sim/siting.test.ts | — | eeb4e62 |
| N-002 | No universal optimization puzzle | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/evidence/island-colonization.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/14-composition.md, docs/slices/20-composition.md, docs/slices/9-composition.md, docs/slices/B-composition.md, docs/slices/N2-composition.md, src/sim/branch.ts, src/sim/habitat/hsiComposition.ts | src/sim/branch.test.ts | — | eeb4e62 |
| N-003 | No species collection game | Locked | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/candidates/C-027-framing.md, docs/nature-study/PROTOCOL.md | — | — | eeb4e62 |
| N-004 | No arbitrary hidden rules | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-010-framing.md, docs/candidates/C-021-dossier.md, docs/candidates/C-022-dossier.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md, docs/evidence/island-colonization.md, docs/nature-study/CARD_SCHEMA.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/nature-study/cards/NS-002-heat-dial-plant-gate.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/nature-study/cards/NS-007-aspect-light-into-liebig.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/nature-study/cards/NS-011-cryptogam-crust.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/slices/12-composition.md, docs/slices/14-composition.md, docs/slices/21-composition.md, docs/slices/9-composition.md, docs/slices/G-composition.md, docs/slices/L2-composition.md, docs/slices/L3-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N2-composition.md, docs/slices/N3-composition.md, docs/slices/N4-composition.md, docs/slices/N5-composition.md, docs/slices/N7-composition.md, docs/slices/N8-composition.md, docs/slices/N9-composition.md, docs/slices/S-composition.md, docs/slices/W0-composition.md, docs/slices/clouds-composition.md, docs/slices/hsi-curve-shape-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/climate/atmosphere.ts, src/sim/climate/seasonRegime.ts, src/sim/habitat/inundationComposition.ts, src/sim/habitat/lightComposition.ts, src/sim/habitat/shrubHsiComposition.ts, src/sim/habitat/sprayComposition.ts, src/sim/habitat/temperatureComposition.ts, src/sim/probes/scenarios.ts | src/sim/seedRain.test.ts | — | eeb4e62 |
| N-005 | No decorative wildlife | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md | — | — | eeb4e62 |
| RC-001 | Limiting mechanism for repeated intervention | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| RC-002 | Ecological opportunity as primary constraint | Superseded by RC-004 | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md | — | — | eeb4e62 |
| RC-003 | Consequence of failed introduction attempts | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md | — | yes | eeb4e62 |
| RC-004 | Ecological time and opportunity constrain intervention | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/C-006-composition.md | src/sim/c006-abundant-sculpting.test.ts | — | eeb4e62 |
| T-001 | Save-state determinism policy | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-005-dossier.md, docs/candidates/C-013-dossier.md, docs/candidates/C-014-dossier.md, docs/candidates/C-019-dossier.md, docs/candidates/C-020-dossier.md, docs/candidates/C-021-dossier.md, docs/candidates/C-022-dossier.md, docs/candidates/C-024-C-025-framing.md, docs/candidates/C-027-framing.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/playtests/C-020-weather-lock.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-31-fire-fuel-review.md, docs/reviews/2026-07-31-hydrology-geomorphology-review.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/17-composition.md, docs/slices/21-composition.md, docs/slices/A-plus-composition.md, docs/slices/B-composition.md, docs/slices/G-composition.md, docs/slices/L1-L6-composition.md, docs/slices/L2-composition.md, docs/slices/L3-composition.md, docs/slices/L7-composition.md, docs/slices/W0-composition.md, docs/slices/clouds-composition.md, docs/slices/coastal-base-level-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/fire-spread-rate-composition.md, docs/slices/flat-routing-composition.md, docs/slices/flux-stability-composition.md, docs/slices/fuel-scar-composition.md, docs/slices/guild-cover-light-composition.md, docs/slices/notebook-composition.md, docs/slices/starting-surface-composition.md, src/audio/AudioBus.ts, src/audio/webAudioHook.ts, src/config.ts, src/main.ts, src/sim/WorldState.ts, src/sim/branch.ts, src/sim/climate/atmosphere.ts, src/sim/climate/rainRegime.ts, src/sim/eventBandGate.ts, src/sim/fire/spreadRings.ts, src/sim/habitat/arrivalComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/fireProcess.ts, src/sim/process/scheduler.ts, src/ui/controls.ts | src/sim/atmosphere.test.ts, src/sim/branch.test.ts, src/sim/erosionIntensity.test.ts, src/sim/fire.test.ts, src/sim/fluxStability.test.ts, src/sim/hydrology.determinism.test.ts, src/sim/island.test.ts, src/sim/islandArrival.test.ts, src/sim/islandSurface.test.ts, src/sim/seasonRegime.test.ts, src/sim/substrate.test.ts | — | eeb4e62 |
| T-002 | Supported player-facing time rates | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/L1-L6-composition.md, docs/slices/L7-composition.md, src/sim/SimClock.ts, src/ui/timeRates.ts | src/ui/timeRates.test.ts | — | eeb4e62 |
| T-003 | Save compatibility preserves causal history | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-010-framing.md, docs/candidates/C-024-C-025-framing.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/12-composition.md, docs/slices/14-composition.md, docs/slices/20-composition.md, docs/slices/S-composition.md, src/sim/WorldState.ts, src/sim/process/habitatProcess.ts, src/sim/save.ts, src/sim/sessionPersist.ts, src/ui/controls.ts | src/sim/save.test.ts | — | eeb4e62 |
| T-004 | Content is data-driven | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-009-dossier.md, docs/candidates/C-022-dossier.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/G-composition.md, docs/slices/N2-composition.md, docs/slices/S-composition.md, src/sim/WorldState.ts, src/sim/climate/erosionRegime.ts, src/sim/habitat/binderHsiComposition.ts, src/sim/habitat/temperatureComposition.ts, src/sim/probes/scenarios.ts, src/sim/save.ts, src/sim/terrain/substrates.ts | src/sim/save.test.ts, src/sim/substrate.test.ts | — | eeb4e62 |
| T-005 | Layered simulation inspection is an engine capability | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/MVP_SCOPE.md, docs/PLAYTEST_SLICE4.md, docs/SIMULATION_MODEL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-2-6-implementation-review.md, docs/slices/11-composition.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/17-composition.md, docs/slices/chrome-density-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/notebook-composition.md, src/ui/controls.ts | src/sim/light-succession.test.ts | — | eeb4e62 |
| T-006 | Simulation and rendering are separate | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-014-dossier.md, docs/candidates/C-027-framing.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/slices/13-composition.md, docs/slices/14-composition.md, docs/slices/18-composition.md, docs/slices/19-composition.md, docs/slices/A-plus-composition.md, docs/slices/B-composition.md, docs/slices/L4-composition.md, docs/slices/chrome-density-composition.md, docs/slices/clouds-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/fire-spread-rate-composition.md, docs/slices/notebook-composition.md, src/audio/AudioBus.ts, src/config.ts, src/main.ts, src/notebook/FieldNotebook.ts, src/notebook/types.ts, src/render/CloudMesh.ts, src/render/FlowCueMesh.ts, src/render/OccupantMesh.ts, src/render/OceanMesh.ts, src/render/RainCueMesh.ts, src/render/WaterMesh.ts, src/render/WindArrowMesh.ts, src/sim/WorldState.ts, src/sim/branch.ts, src/sim/climate/longshoreTendency.ts, src/sim/climate/shoreExposure.ts, src/sim/formMemory.ts, src/sim/habitat/binderHsiComposition.ts, src/sim/habitat/crustHsiComposition.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/marshHsiComposition.ts, src/sim/habitat/shrubHsiComposition.ts, src/sim/habitat/strandHsiComposition.ts, src/sim/hydrology/HydrologyModel.ts, src/sim/probes/scenarios.ts, src/sim/scenario/ScenarioSession.ts, src/sim/types.ts, src/ui/chromeDensity.ts, src/ui/occupantSway.ts, src/ui/stormCue.ts | src/audio/audio.test.ts, src/sim/hydrology.determinism.test.ts, src/sim/scenario.test.ts, src/sim/siting.test.ts | — | eeb4e62 |
| T-007 | The reference prototype is Three.js with modular heightfield hydrology | Current | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, src/config.ts, src/sim/hydrology/HeightfieldHydrology.ts, src/sim/hydrology/HydrologyModel.ts | — | yes | eeb4e62 |
| F-001 | Advanced ecosystem-engineer behaviors | Deferred | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-27-incremental-world-building-report.md, docs/reviews/2026-07-27-slice-0-1-scaffold.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/reviews/2026-07-31-living-world-review.md, docs/slices/13-composition.md | — | — | eeb4e62 |
| F-002 | Advanced save comparison tools | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/THESIS.md, docs/reviews/2026-07-30-sim-gap-review.md | — | — | eeb4e62 |
| F-003 | Additional preserves | Deferred | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/reviews/2026-07-27-decision-conformance-report.md, docs/slices/W0-composition.md, src/main.ts | — | — | eeb4e62 |
| F-004 | Expanded educational overlays | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md | — | — | eeb4e62 |
| F-005 | Counterfactual causal replay | Deferred | docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/THESIS.md, docs/reviews/2026-07-30-sim-gap-review.md | — | — | eeb4e62 |
| C-001 | Cheap groundwater / baseflow store | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/VERIFICATION_POLICY.md, docs/nature-study/PROTOCOL.md, docs/reviews/2026-07-31-hydrology-geomorphology-review.md, src/config.ts, src/sim/WorldState.ts, src/sim/probes/scenarios.ts, src/sim/process/groundwaterProcess.ts | src/sim/soil-water.test.ts | — | eeb4e62 |
| C-002 | GEO-002 spatial cost test | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/candidates/C-002-dossier.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/slices/E-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/sculpt-brush-size-composition.md, src/config.ts, src/sim/WorldState.ts | src/sim/siting.test.ts | — | eeb4e62 |
| C-003 | Stochastic vs authored climate forcing | Open *(owner direction recorded 2026-07-28; evaluation outstanding)* | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-007-dossier.md, docs/candidates/C-027-framing.md, docs/evidence/island-colonization.md, docs/nature-study/PROTOCOL.md, docs/playtests/12-arrival-earned.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/21-composition.md, docs/slices/L2-composition.md, docs/slices/N2-composition.md, docs/slices/clouds-composition.md, docs/slices/fire-spread-rate-composition.md, src/config.ts, src/main.ts, src/sim/WorldState.ts, src/sim/climate/rainRegime.ts, src/sim/habitat/arrivalComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/dispersalProcess.ts, src/sim/process/fireProcess.ts | src/sim/fire.test.ts, src/sim/seedRain.test.ts | — | eeb4e62 |
| C-004 | Force control as an intervention axis | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-004-dossier.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-002-heat-dial-plant-gate.md, docs/nature-study/cards/NS-003-onshore-spray-stress-gate.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/playtests/8c-return-visit.md, docs/playtests/batch-island-brief.md, docs/playtests/batch-salt-overseas.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/reviews/2026-07-31-living-world-review.md, docs/slices/16-composition.md, docs/slices/17-composition.md, docs/slices/18-composition.md, docs/slices/19-composition.md, docs/slices/9-composition.md, docs/slices/B-composition.md, docs/slices/G-composition.md, docs/slices/N10-composition.md, docs/slices/N2-composition.md, docs/slices/R-composition.md, docs/slices/chrome-density-composition.md, docs/slices/clouds-composition.md, src/sim/WorldState.ts, src/sim/climate/atmosphere.ts, src/sim/climate/erosionRegime.ts, src/sim/climate/orographicPrecip.ts, src/sim/climate/rainRegime.ts, src/sim/climate/seaLevel.ts, src/sim/climate/seasonRegime.ts, src/sim/climate/tidalEnvelope.ts, src/sim/climate/windRegime.ts, src/sim/forceSettings.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/temperatureComposition.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/branch.test.ts, src/sim/erosionIntensity.test.ts, src/sim/habitat/hsi.test.ts, src/sim/heatArrival.test.ts, src/sim/rainRegime.test.ts, src/sim/seasonRegime.test.ts | — | eeb4e62 |
| C-005 | Branch-and-compare as a core instrument | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-005-dossier.md, docs/candidates/C-013-dossier.md, docs/candidates/C-024-C-025-framing.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/B-composition.md, src/main.ts, src/sim/branch.ts, src/sim/forceSettings.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/branch.test.ts, src/sim/presentation.proxy.test.ts | — | eeb4e62 |
| C-006 | Sculpting is abundant; scarcity lives in ecological time | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/DESIGN_WIKI.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/candidates/C-013-dossier.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/14-composition.md, docs/slices/C-006-composition.md, docs/slices/G-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/sculpt-brush-size-composition.md, docs/slices/starting-surface-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/terrain/generateIsland.ts | src/sim/c006-abundant-sculpting.test.ts, src/sim/siting.test.ts | — | eeb4e62 |
| C-007 | Arrival as the primary biological verb | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-007-dossier.md, docs/candidates/C-010-framing.md, docs/candidates/C-019-dossier.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-001-wet-site-herb.md, docs/nature-study/cards/NS-002-heat-dial-plant-gate.md, docs/nature-study/cards/NS-003-onshore-spray-stress-gate.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/nature-study/cards/NS-006-twin-hollow-salt-memory.md, docs/nature-study/cards/NS-007-aspect-light-into-liebig.md, docs/nature-study/cards/NS-008-tidal-inundation-hydroperiod.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/nature-study/cards/NS-011-cryptogam-crust.md, docs/playtests/12-arrival-earned.md, docs/playtests/batch-living-return.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-vegetation-habitat-review.md, docs/slices/11-composition.md, docs/slices/12-composition.md, docs/slices/13-composition.md, docs/slices/20-composition.md, docs/slices/21-composition.md, docs/slices/9-composition.md, docs/slices/L2-composition.md, docs/slices/N-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N2-composition.md, docs/slices/N3-composition.md, docs/slices/N4-composition.md, docs/slices/N5-composition.md, docs/slices/N7-composition.md, docs/slices/N8-composition.md, docs/slices/N9-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/hsi-curve-shape-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/lightComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/dispersalProcess.ts | src/sim/arrival.test.ts, src/sim/habitat/hsi.test.ts, src/sim/lightArrival.test.ts, src/sim/seedRain.test.ts, src/sim/tidal.test.ts | — | eeb4e62 |
| C-008 | Intervention → visible response budget | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/THESIS.md, docs/candidates/C-024-C-025-framing.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/L1-L6-composition.md, docs/slices/W0-composition.md, src/main.ts | — | yes | eeb4e62 |
| C-009 | Substrate differentiation | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-009-dossier.md, docs/candidates/C-010-framing.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/nature-study/BACKLOG.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/14-composition.md, docs/slices/N5-composition.md, docs/slices/S-composition.md, docs/slices/coastal-base-level-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/starting-surface-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/habitat/binderHsiComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/dispersalProcess.ts, src/sim/terrain/substrates.ts, src/ui/controls.ts, src/ui/occupantEncoding.ts, src/ui/terrainEncoding.ts | src/sim/binderArrival.test.ts, src/sim/presentation.proxy.test.ts, src/sim/siting.test.ts, src/sim/substrate.test.ts | — | eeb4e62 |
| C-010 | Legacy substances (contaminant load) | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/NATURAL_PROCESS_MATH.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/reviews/2026-07-31-living-world-review.md, docs/slices/14-composition.md, docs/slices/20-composition.md, docs/slices/C-006-composition.md | — | yes | eeb4e62 |
| C-011 | Real-world intuition is the instrument | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/THESIS.md, docs/VISUAL_UPGRADE_NOTE.md, docs/candidates/C-010-framing.md, docs/candidates/C-021-dossier.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md, docs/nature-study/BACKLOG.md, docs/nature-study/CARD_SCHEMA.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-002-heat-dial-plant-gate.md, docs/nature-study/cards/NS-003-onshore-spray-stress-gate.md, docs/nature-study/cards/NS-006-twin-hollow-salt-memory.md, docs/nature-study/cards/NS-007-aspect-light-into-liebig.md, docs/nature-study/cards/NS-008-tidal-inundation-hydroperiod.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/nature-study/cards/NS-010-woody-shrub.md, docs/nature-study/cards/NS-011-cryptogam-crust.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-vegetation-habitat-review.md, docs/slices/16-composition.md, docs/slices/G-composition.md, docs/slices/L2-composition.md, docs/slices/L3-composition.md, docs/slices/L4-composition.md, docs/slices/N-composition.md, docs/slices/N10-composition.md, docs/slices/N11-composition.md, docs/slices/N2-composition.md, docs/slices/N3-composition.md, docs/slices/N7-composition.md, docs/slices/N8-composition.md, docs/slices/N9-composition.md, docs/slices/S-composition.md, docs/slices/drydown-composition.md, docs/slices/guild-cover-light-composition.md, docs/slices/hsi-curve-shape-composition.md, docs/slices/starting-surface-composition.md, src/sim/WorldState.ts, src/sim/habitat/binderHsiComposition.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/lightComposition.ts, src/sim/probes/scenarios.ts, src/ui/occupantSway.ts | src/sim/habitat/hsi.test.ts, src/sim/lightArrival.test.ts, src/sim/seasonRegime.test.ts, src/sim/seedRain.test.ts, src/sim/tidal.test.ts | yes | eeb4e62 |
| C-012 | Preserve extent and resolution follow habitat mosaic | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-028-framing.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/16-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/geometric-mold-stamps-composition.md, src/sim/WorldState.ts | — | yes | eeb4e62 |
| C-013 | Undo as an affordance of abundant sculpting | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/candidates/C-013-dossier.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/B-composition.md, docs/slices/C-006-composition.md, docs/slices/W0-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/sculpt-brush-size-composition.md, src/main.ts, src/sim/sessionPersist.ts, src/ui/controls.ts | src/sim/sessionPersist.test.ts, src/sim/siting.test.ts | — | eeb4e62 |
| C-014 | How audio derives from simulation state | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-014-dossier.md, docs/candidates/owner-lock-batch.md, docs/nature-study/BACKLOG.md, docs/playtests/batch-island-brief.md, docs/playtests/batch-living-return.md, docs/playtests/batch-maritime-shore.md, docs/playtests/batch-salt-overseas.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/A-plus-composition.md, docs/slices/L4-composition.md, docs/slices/W0-composition.md, docs/slices/duplicator-stamp-composition.md, src/audio/AudioBus.ts, src/main.ts | src/audio/audio.test.ts | yes | eeb4e62 |
| C-015 | The world is an island; sea level is global base level | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-015-dossier.md, docs/candidates/owner-lock-batch.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/16-composition.md, docs/slices/17-composition.md, docs/slices/18-composition.md, docs/slices/19-composition.md, docs/slices/21-composition.md, docs/slices/coastal-base-level-composition.md, docs/slices/flat-routing-composition.md, docs/slices/starting-surface-composition.md, src/render/ExtentCage.ts, src/render/OceanMesh.ts, src/sim/WorldState.ts, src/sim/climate/seaLevel.ts, src/sim/hydrology/flowRouting.ts, src/sim/hydrology/fluxStep.ts, src/sim/probes/scenarios.ts, src/sim/terrain/generateIsland.ts, src/ui/controls.ts | src/sim/island.test.ts, src/sim/presentation.proxy.test.ts | — | eeb4e62 |
| C-016 | Tidal forcing as a band-appropriate envelope | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-016-dossier.md, docs/candidates/C-017-dossier.md, docs/candidates/owner-lock-batch.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-008-tidal-inundation-hydroperiod.md, docs/nature-study/cards/NS-009-salt-marsh-engineer.md, docs/playtests/batch-maritime-shore.md, docs/playtests/batch-stewardship-alive.md, docs/slices/16-composition.md, docs/slices/17-composition.md, docs/slices/N8-composition.md, docs/slices/N9-composition.md, src/config.ts, src/render/ExtentCage.ts, src/sim/WorldState.ts, src/sim/climate/tidalEnvelope.ts, src/sim/habitat/arrivalComposition.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/inundationComposition.ts, src/sim/habitat/marshHsiComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/dispersalProcess.ts, src/ui/controls.ts, src/ui/occupantEncoding.ts, src/ui/terrainEncoding.ts | src/sim/habitat/hsi.test.ts, src/sim/inundationArrival.test.ts, src/sim/marshArrival.test.ts, src/sim/presentation.proxy.test.ts, src/sim/save.test.ts, src/sim/tidal.test.ts | — | eeb4e62 |
| C-017 | Wave exposure contributes to geomorphology; never a second sediment authority | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-016-dossier.md, docs/candidates/C-017-dossier.md, docs/candidates/owner-lock-batch.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-003-onshore-spray-stress-gate.md, docs/nature-study/cards/NS-005-sandy-crest-sand-binder.md, docs/playtests/batch-maritime-shore.md, docs/slices/17-composition.md, docs/slices/18-composition.md, docs/slices/19-composition.md, docs/slices/N3-composition.md, docs/slices/N5-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/climate/longshoreTendency.ts, src/sim/climate/shoreExposure.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/inundationComposition.ts, src/sim/habitat/salinityComposition.ts, src/sim/habitat/sprayComposition.ts, src/sim/habitat/strandHsiComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/geomorphologyProcess.ts, src/sim/process/habitatProcess.ts | src/sim/habitat/hsi.test.ts, src/sim/longshore.test.ts, src/sim/presentation.proxy.test.ts, src/sim/shoreExposure.test.ts, src/sim/sprayArrival.test.ts | — | eeb4e62 |
| C-018 | Salinity as the first mobile legacy substance | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-010-framing.md, docs/candidates/C-018-dossier.md, docs/candidates/C-019-dossier.md, docs/candidates/owner-lock-batch.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-003-onshore-spray-stress-gate.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/nature-study/cards/NS-006-twin-hollow-salt-memory.md, docs/nature-study/cards/NS-008-tidal-inundation-hydroperiod.md, docs/playtests/batch-maritime-shore.md, docs/playtests/batch-salt-overseas.md, docs/slices/16-composition.md, docs/slices/17-composition.md, docs/slices/20-composition.md, docs/slices/9-composition.md, docs/slices/N-composition.md, docs/slices/N3-composition.md, docs/slices/N4-composition.md, docs/slices/N8-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/inundationComposition.ts, src/sim/habitat/salinityComposition.ts, src/sim/habitat/strandHsiComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/dispersalProcess.ts, src/sim/process/habitatProcess.ts, src/sim/process/soilWaterProcess.ts, src/ui/occupantEncoding.ts, src/ui/terrainEncoding.ts | src/sim/habitat/hsi.test.ts, src/sim/presentation.proxy.test.ts, src/sim/salinity.test.ts, src/sim/strandArrival.test.ts | — | eeb4e62 |
| C-019 | Island biogeography reframes the fixed species pool | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/SIMULATION_MODEL.md, docs/THESIS.md, docs/candidates/C-019-dossier.md, docs/candidates/C-027-framing.md, docs/candidates/owner-lock-batch.md, docs/evidence/island-colonization.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-004-strand-splash-pioneer.md, docs/playtests/batch-maritime-shore.md, docs/playtests/batch-salt-overseas.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/21-composition.md, docs/slices/L2-composition.md, docs/slices/N4-composition.md, src/config.ts, src/sim/WorldState.ts, src/sim/habitat/arrivalComposition.ts, src/sim/probes/scenarios.ts, src/ui/occupantEncoding.ts | src/sim/inundationArrival.test.ts, src/sim/islandArrival.test.ts, src/sim/presentation.proxy.test.ts, src/sim/seedRain.test.ts | — | eeb4e62 |
| C-020 | Atmospheric precip delivery (clouds from wind, moisture, heat) | Locked | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/EXTERNAL_REFERENCES.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-004-dossier.md, docs/candidates/C-009-dossier.md, docs/candidates/C-020-dossier.md, docs/candidates/C-024-C-025-framing.md, docs/candidates/C-028-framing.md, docs/candidates/owner-lock-batch.md, docs/nature-study/BACKLOG.md, docs/nature-study/PROTOCOL.md, docs/nature-study/cards/NS-002-heat-dial-plant-gate.md, docs/playtests/C-020-weather-lock.md, docs/playtests/batch-island-brief.md, docs/playtests/batch-salt-overseas.md, docs/playtests/batch-stewardship-alive.md, docs/reviews/2026-07-30-sim-gap-review.md, docs/slices/9-composition.md, docs/slices/N2-composition.md, docs/slices/R-composition.md, docs/slices/clouds-composition.md, src/config.ts, src/render/CloudMesh.ts, src/render/RainCueMesh.ts, src/sim/WorldState.ts, src/sim/climate/atmosphere.ts, src/sim/climate/orographicPrecip.ts, src/sim/climate/seasonRegime.ts, src/sim/climate/windRegime.ts, src/sim/habitat/hsiComposition.ts, src/sim/habitat/temperatureComposition.ts, src/sim/probes/scenarios.ts, src/sim/process/atmosphereProcess.ts, src/ui/controls.ts, src/ui/stormCue.ts | src/sim/atmosphere.test.ts, src/sim/heatArrival.test.ts, src/sim/orographic.test.ts, src/sim/rainRegime.test.ts, src/ui/stormCue.test.ts | — | eeb4e62 |
| C-021 | Season as a force dial | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-021-dossier.md, docs/slices/C-006-composition.md, docs/slices/G-composition.md, docs/slices/duplicator-stamp-composition.md, src/sim/WorldState.ts, src/sim/climate/seasonRegime.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/seasonRegime.test.ts | yes | eeb4e62 |
| C-022 | Erosion intensity as a force dial | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/FORCE_PANEL.md, docs/ISLAND_FORCES.md, docs/MVP_SCOPE.md, docs/THESIS.md, docs/candidates/C-022-dossier.md, docs/candidates/C-028-framing.md, docs/slices/C-006-composition.md, docs/slices/G-composition.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/sculpt-brush-size-composition.md, src/sim/WorldState.ts, src/sim/climate/erosionRegime.ts, src/sim/probes/scenarios.ts, src/ui/controls.ts | src/sim/erosionIntensity.test.ts | yes | eeb4e62 |
| C-023 | Guild competition / successional displacement | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/candidates/C-027-framing.md, docs/reviews/2026-07-31-living-world-review.md, docs/reviews/2026-07-31-vegetation-habitat-review.md, docs/slices/L2-composition.md, docs/slices/L3-composition.md, docs/slices/L4-composition.md, docs/slices/guild-cover-light-composition.md | — | yes | eeb4e62 |
| C-024 | What a sim-year means (band calendar coherence) | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/candidates/C-024-C-025-framing.md, docs/evidence/time-throughput.md, docs/reviews/2026-07-31-hydrology-geomorphology-review.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/L1-L6-composition.md, docs/slices/L7-composition.md | — | yes | eeb4e62 |
| C-025 | Rate-selected integration floor (deep time) | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/candidates/C-024-C-025-framing.md, docs/reviews/2026-07-31-time-architecture-review.md, docs/slices/L1-L6-composition.md, docs/slices/L7-composition.md | — | yes | eeb4e62 |
| C-026 | CVD-safe cross-domain palette | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/reviews/2026-07-31-ui-encoding-review.md, docs/slices/chrome-density-composition.md, docs/slices/encoding-delta-composition.md, src/ui/terrainEncoding.ts | — | yes | eeb4e62 |
| C-027 | Animal trait expression as population fields (procedural morph + threshold swap) | Open | docs/BUILD_GUIDE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/candidates/C-027-framing.md, docs/candidates/C-028-framing.md | — | yes | eeb4e62 |
| C-028 | Sculpt toolbox vocabulary (sand-castle craft → Habitat causes) | Open | docs/BUILD_GUIDE.md, docs/CLOUD_AGENT_PIPELINE.md, docs/DECISION_CONFORMANCE.md, docs/DECISION_REGISTER.md, docs/MVP_SCOPE.md, docs/candidates/C-028-framing.md, docs/slices/duplicator-stamp-composition.md, docs/slices/flatten-trowel-composition.md, docs/slices/geometric-mold-stamps-composition.md, docs/slices/sculpt-brush-size-composition.md, src/config.ts, src/main.ts, src/render/SitingCursor.ts, src/sim/WorldState.ts, src/ui/controls.ts | src/sim/siting.test.ts | yes | eeb4e62 |

<!-- END GENERATED -->
