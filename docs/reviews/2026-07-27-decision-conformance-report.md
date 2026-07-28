# Report — Decision Conformance and Promotion Criteria

> **Date:** 2026-07-27
> **From:** high-level review
> **Subject:** closing the evidentiary gap in the register's own governance model
> **Status:** advisory. Adopting §3 requires a register change; see §7.

---

## 1. The gap

The [Decision Register](../DECISION_REGISTER.md) is unusually well governed. §0 defines five statuses, a supersession mechanism, change-control rules, a full identifier-migration table for a namespace that was broken once and repaired, and a removal record for content that was dropped without notice. It is a constitution written by someone who has watched a design document rot and decided not to let it happen again.

It has one structural hole, and it is in the direction the document cannot see: **the register defines a promotion mechanism but no evidentiary procedure.**

Fourteen entries are Current. Several state the condition for promotion in terms that cannot be acted on:

- E-008 — *"Remains Current until role resolution has been prototyped."*
- E-009 — *"Prototype validation is required before promotion to Locked."*
- A-005 — *"Remains Current until an interaction prototype proves the distinction is legible."*
- ART-001 — *"The style requires prototype validation."*

Nothing anywhere says what a prototype would have to demonstrate, who judges it, where the result is recorded, or what a failed validation means for the entry. §16 lists seven of these as the Immediate Decision Queue and closes with *"Until resolved, these are Open or Current and must not be treated as locked implementation requirements"* — which is correct and enforceable in exactly one direction. It tells you what you may not rely on. It gives you no way to stop needing the caveat.

The failure mode is slow and quiet. Current entries accumulate. None is ever promoted, because promotion has no defined test and nobody wants to declare victory by assertion in a document this careful. Eventually "Current" stops meaning *the present direction, still open to testing* and starts meaning *we never got around to it* — and the status distinction that §0.1 works hard to establish collapses into decoration.

This is the same decay §0 exists to prevent. §0 governs the **document** rigorously and the **product** not at all.

## 2. Two directions of conformance

"Does the build conform to the register?" is two questions, and only one of them is about evidence.

**Register → build.** Is a decision implemented, and is it tested? This is where the promotion criteria live (§3). It is mostly judgment and mostly manual.

**Build → register.** Does the code claim decisions that exist, own them consistently, and cite them where they actually bind? This is mechanical and can be automated today (§5), because Cursor already established the necessary habit: register IDs appear in the source docstrings — `T-006` in `src/sim/types.ts`, `T-007` in `src/sim/hydrology/HydrologyModel.ts`, `H-002` in the terrain generator, `T-001` in the determinism test. That is the raw material for a traceability index and it is currently unexploited.

## 3. What makes a promotion criterion valid

Before the criteria themselves, the contract they must satisfy. A criterion is valid when it states all five:

1. **An observation, not an intention.** Something that either happened or did not.
2. **A judge.** Automated test, or owner verification, or an unfamiliar viewer. Which one is part of the criterion, because "it looks right to the person who built it" is not evidence.
3. **A recorded artifact.** Where the evidence lives, so promotion is auditable a year later.
4. **A stated failure meaning.** What it tells you if the criterion is not met — sometimes "not yet," sometimes "this entry is wrong."
5. **Falsifiability.** If no realistic outcome could fail it, it is not a criterion.

## 4. Proposed criteria for every Current and Open entry

Sixteen entries. Each block gives the criterion, the judge, the artifact, and what failure means.

### 4.1 A distinction the register currently lacks: hypothesis-Current vs. situation-Current

Working through these surfaced something worth naming before the list.

**T-007** is Current, but not for the same reason as the others. E-009 is Current because it is an untested *hypothesis* — it might be wrong. T-007 is Current because it describes a *situation*: the active reference stack is Vite/TypeScript/Three.js with heightfield hydrology. That is not a claim awaiting proof; it is a true statement about now, which the entry itself flags by calling the prototype *"evidence and a development base, not an irreversible engine mandate."*

A situation-Current entry has no promotion criterion, because promotion is not the goal. What it needs instead is a **review trigger**: the condition under which it should be revisited. Filing it in the same queue as the hypotheses means it sits in §16 forever looking unresolved, which devalues the queue.

W-001 has the same shape — Windward Basin is the reference preserve because it is, not because that is a claim under test.

Recommendation: distinguish the two in §0.1, or mark situation entries with a review trigger rather than leaving them in the promotion queue. This is the one register change this report actively recommends on its own merits.

---

### S-008 — Hysteresis must be legible

**Criterion.** In a preserve where a legacy condition is blocking recovery, a viewer who did not cause the damage, using only in-game inspection, states which historical condition is blocking and distinguishes it from current pressure.
**Judge.** Unfamiliar viewer, unassisted.
**Artifact.** Session transcript plus the actual blocking field, for comparison.
**Failure means.** If they say "habitat unsuitable" or blame current rainfall, the inspector is reporting state rather than explaining constraint — the entry's own rejected alternative. Not yet.

### S-009 — Ecological duration is expressed in simulation time

**Criterion.** Automated. For every authored duration, an outcome hash is identical across all supported time rates; only wall-clock elapsed differs. No criterion's satisfaction depends on the rate.
**Judge.** CI.
**Artifact.** Test name and golden hashes.
**Failure means.** A durations-in-frames bug, which is a defect rather than an entry problem. Note this criterion is not yet satisfiable: the scaffold's `dt` currently has no effect at all (review §1.1), so simulation time does not exist to be invariant.

### P-005 — Save states support experimentation

**Criterion.** Save, advance 100 simulation-years, reload the save, advance again — identical state hash. Separately: a save round-trip preserves a legacy variable whose effect only manifests decades later.
**Judge.** CI.
**Artifact.** Test, plus the named legacy field it exercises.
**Failure means.** T-003 violated. The register explicitly rejects visual similarity after load as a correctness test, so the second half is the one that matters.

### P-006 — Prediction is an explicit commit-and-compare mechanic

**Criterion.** Two parts. *Mechanical:* the prediction system provably never writes simulation state — automated, via declared reads/writes. *Behavioral:* a viewer who commits a prediction before advancing time makes a different subsequent intervention choice than one who does not. That behavioral claim is the entry's whole justification — that prediction converts waiting into attention.
**Judge.** CI for the first, unfamiliar viewer for the second.
**Artifact.** Test; plus paired session notes.
**Failure means.** If the behavioral half fails, prediction is an overlay rather than a mechanic, and the entry's Prior position — the pre-v1.0 draft that ruled the mechanic out — deserves re-reading rather than dismissal.

### E-007 — Roles attemptable without readiness hard-locking

**Criterion.** The role action is available under poor conditions; attempting it there produces a legible ecological failure rather than a disabled control or a guaranteed success; and repeated attempts are not the dominant strategy.
**Judge.** Owner, plus the RC-003 experiment below.
**Artifact.** The RC-003 strategy comparison.
**Failure means.** **Promotion is blocked on RC-003 and should be stated as such.** The entry itself says failed attempts need meaningful consequence to avoid spam and that RC-003 is unresolved. E-007 cannot be Locked while its anti-spam requirement has no answer.

### E-008 — Role resolution selects the biome-appropriate candidate

**Criterion.** The selected candidate is derivable from preserve data alone, is inspectable, and the same role resolves differently under two different preserve datasets with no code change.
**Judge.** CI.
**Artifact.** Two preserve fixtures and the test that loads both.
**Failure means.** Hard-coded resolution, which fails T-004 as well. The second dataset is the load-bearing part: it is also the first real evidence for S-001, which is otherwise untestable until F-003 is undeferred.

### E-009 — Readiness is inferred from simulation state

**Criterion.** Readiness is reproducible from a state snapshot alone, with no authored flags; the inspector names limiting factors; and changing a named limiting factor **in isolation** moves establishment outcome in the predicted direction.
**Judge.** CI for reproducibility, owner for the naming.
**Artifact.** Snapshot fixture plus a per-factor sensitivity table.
**Failure means.** A factor named as limiting that has no effect when changed proves the readiness display is decorative — a worse outcome than no display, because it teaches a false relationship and violates P-004.

### A-005 — Siting selects a cause rather than painting an outcome

**Criterion.** Shown a siting preview, an unfamiliar viewer describes what they are committing in terms of a **cause** ("I'm digging a channel here") rather than an **outcome** ("I'm placing a wetland").
**Judge.** Unfamiliar viewer, phrasing unprompted and recorded verbatim.
**Artifact.** Verbatim responses.
**Failure means.** If they describe an outcome, the preview has failed N-001 regardless of what the code does. This single sentence converts "prove the distinction is legible" from a taste judgment into a test, and it is the criterion I would build first because it is cheap and it decides a Locked non-goal.

### A-006 — Pulse interventions are sited too

**Criterion.** Committed extent and realized extent differ in some runs — spread and containment are simulated — and the interface communicated the extent as intent *before* commitment.
**Judge.** CI for divergence, owner for the communication.
**Artifact.** Run pairs showing committed vs. realized extent.
**Failure means.** If committed always equals realized, the burn tool is a paint tool wearing disturbance vocabulary.

### G-007 — Post-completion persistence *(Open)*

**Criterion.** This entry needs a decision, not evidence — but one experiment materially constrains it: run a completed scenario forward 200 simulation-years under no further intervention and measure how often the completion criteria lapse from ES-003 fluctuation alone.
**Judge.** CI, reported as a rate.
**Artifact.** Lapse-rate table across several scenarios.
**Why it decides something.** If lapse is common under healthy fluctuation, option 2 (completion valid only while criteria hold) punishes exactly the dynamism ES-003 requires, and the option space collapses toward 3 or 4. If lapse is rare, option 2 survives. The register's constraints section reasons about this qualitatively; the experiment makes it a number.

### W-001 — Windward Basin is the reference preserve

**Situation entry** (§4.1). Suggested review trigger rather than a criterion: revisit when a second preserve dataset loads without code change, since at that point W-001's scoping function is discharged and F-003 becomes the live question.

### U-005 — The primary view is an elevated living diorama

**Criterion.** From the default framing the whole watershed is visible and named landmarks are individually distinguishable; zoom to ground scale is continuous without losing the authored silhouette; and a viewer locates a specified degraded reach from the whole-preserve view within a stated time.
**Judge.** Owner for composition, timed task for readability.
**Artifact.** Frames at each zoom level plus task timings.
**Failure means.** If whole-preserve readability fails, W-004's diorama premise is at risk, not just the camera.

### U-006 — The Field Notebook provides bounded causal explanation

**Criterion.** Every sentence the notebook emits is traceable to a specific simulated contributing condition, and a reviewer can locate that state. Sample the emitted corpus, not a curated example.
**Judge.** Reviewer against a sampled corpus.
**Artifact.** Sampled sentences with the state each is traced to.
**Failure means.** Any untraceable sentence is confident template prose — the entry's own rejected alternative — and one such sentence is enough to fail, because the notebook's value is entirely its trustworthiness.

### ART-001 — Scientific impressionism

**Criterion.** From a still frame at whole-preserve zoom, with all overlays off, an unfamiliar viewer correctly identifies where water is flowing, which slope is degraded, and where vegetation is recovering.
**Judge.** Unfamiliar viewers, several, on frames they have not seen before.
**Artifact.** Frames and verbatim responses.
**Failure means.** Stylization has decoupled from ecological meaning — which the entry requires it not do — and the fix is art direction, not overlays. Reaching for an overlay to rescue a failed frame is how ART-001 quietly becomes untrue while still reading as satisfied.

### RC-003 — Consequence of failed introduction attempts *(Open)*

**Criterion.** Simulate two strategies over equal simulation time in an identically seeded preserve: repeated immediate introduction attempts, versus attempting only when readiness is high. Measure established roles at the horizon.
**Judge.** CI, reported as a comparison.
**Artifact.** Strategy comparison table across seeds.
**Why it decides the entry.** If spam wins or ties, elapsed ecological time under RC-004 is insufficient and an additional consequence is required — which is precisely the question RC-003 asks. If patience wins by a clear margin, RC-003 can close with informational-only failure, and E-007 unblocks. This converts the register's #2 open question from a debate about candidate mechanisms into an experiment with a number at the end. It is the highest-value item in this list, because two entries and a §16 slot depend on it.

### T-007 — The reference prototype is Three.js with heightfield hydrology

**Situation entry** (§4.1). Suggested review trigger: a demonstrated Habitat need for overhangs, caves, or undercut banks — the entry's own standard. Note that soil horizons, a water table, and multi-pool carbon are **not** such a need; those are per-column raster stacks, and treating them as a voxel requirement would revisit T-007 for the wrong reason.

---

## 5. The mechanical half: a generated conformance ledger

The build → register direction needs no judgment and should not be maintained by hand.

**Extraction.** Scan `src/**` and `docs/**` for register-ID patterns (`[A-Z]{1,4}-\d{3}`), and parse the register for its authoritative entry list and statuses. Join.

**Ledger row.** Entry ID · title · status · citing source files · citing tests · promotion criterion present (yes/no) · last verified commit.

**What it flags without anyone deciding anything:**

| Flag | Why it matters |
|---|---|
| Code cites an ID absent from the register | Drift or typo. The v1.1 namespace collision documented in §0.4 is what this class of error grows into. |
| **Locked** entry with no citing test | The register's strongest claims are its least verified. Currently this is most of them. |
| **Current** entry with no promotion criterion | The gap in §1, made visible and countable. |
| Entry cited by rendering code that is a simulation decision | T-006 boundary erosion. |
| A field written by more than one process | Data-ownership violation, detectable once the field registry exists. |

**Effort.** Perhaps 150 lines and an hour, because the citation habit already exists. Run it in CI and the register loses the ability to diverge from the build silently.

**Honest proportion.** This is roughly 20% of the value in this report. The criteria in §4 are the other 80%. A ledger without criteria is a well-formatted list of gaps.

## 6. The other half of conformance: Locked entries with no test

Promotion criteria address entries that are not yet binding. The complementary risk is entries that *are* binding and unverified — and by construction, the strongest claims in the register are the ones nobody thought needed checking.

Highest-risk Locked entries, judged by consequence-if-silently-false:

- **E-005** (wildlife can become habitat) — architecturally blocked right now by the terrain clone (review §1.4), and nothing detects that.
- **S-007** (hysteresis is fundamental) — currently unimplemented, so trivially unverified.
- **ES-006** (carrying capacity emerges) — the failure mode is a constant `K` introduced "just for now," which no test would catch.
- **T-006** (simulation and rendering separate) — the renderer holds a writable handle to simulation state today (review §1.5).
- **N-001 through N-005** — prohibitions, so conformance means the absence of something, which is exactly what nobody notices creeping in.

A prohibition needs a test more than a requirement does. A missing feature is visible; a violated non-goal looks like progress.

## 7. Adoption

Where §4's criteria live is a register question, not mine to settle. Three options, with the tradeoff each carries:

1. **A `Promotion criterion` field on each Current entry, inside the register.** Highest authority and best locality — the criterion sits next to the decision it gates. Cost: the register grows, and §0.2 rule 8 means it stays one document.
2. **A new governed document in §17** — `DECISION_CONFORMANCE.md` — holding criteria and the generated ledger together. Keeps the register's size stable. Cost: a second place to look, and derived documents drift.
3. **Leave it advisory here.** Zero cost, zero authority, and it will be forgotten, which is the outcome §1 describes.

I would take option 1 for the criteria and option 2 for the generated ledger, since the ledger is machine output and does not belong in a constitution. Either way, adoption is itself a register change under §0.2 and needs an entry.

Separately, §4.1's hypothesis-Current versus situation-Current distinction is worth a §0.1 amendment on its own merits, independent of whether the criteria are adopted.

## 8. What to do first

1. **RC-003's strategy experiment.** One test, closes the register's #2 open question, unblocks E-007, and clears a §16 slot. Nothing else on this list has that leverage.
2. **A-005's cause-versus-outcome viewer test.** Cheapest criterion here, and it adjudicates a Locked non-goal (N-001) rather than a preference.
3. **The generated ledger.** An hour, and it makes the remaining gaps countable instead of remembered.
4. **G-007's lapse-rate measurement**, once completion criteria exist — it constrains the option space with a number rather than an argument.

Items 1 and 4 are worth noting for a reason beyond their own entries: they are experiments the *simulation* runs on the *design*. A register that can be tested by the thing it governs is a materially different instrument from one that can only be reasoned about.
