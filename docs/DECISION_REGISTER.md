# Habitat — Decision Register v2.0

> **Status:** Canonical
> **Supersedes:** v1.3.1 and every earlier register, all of which are now historical.
> **Baseline:** v1.0 is the floor of the stable identifier namespace. Pre-v1.0 identifiers are reserved but ambiguous and require manual resolution.
> **Purpose:** Record what Habitat has decided, why, what it requires, and how later changes supersede earlier policy without erasing history.
> **Self-contained:** This document replaces its predecessors entirely. No prior version needs to be read alongside it.
> **Release date:** 2026-07-27

---

## 0. Register Governance

### 0.1 Status definitions

- **Locked** — Examined enough to be binding. Reversal requires a superseding entry and impact review.
- **Current** — The present direction, still open to testing. Implementations should not make it unnecessarily irreversible. Current entries are either **hypothesis-Current** (a direction under test; requires a promotion criterion in [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md)) or **situation-Current** (a true statement about the present stack or scope; requires a review trigger, not promotion — see that document).
- **Deferred** — The requirement remains valid; delivery is postponed. Deferral is not permission to build an architecture that forecloses it.
- **Superseded** — Retained for history, no longer governing. Must name its replacement.
- **Open** — A consequential question identified but not decided. May state constraints; must not masquerade as policy.

### 0.2 Change-control rules

1. Never reuse an existing ID for different content.
2. Never silently delete a prior decision. Removals are recorded in §0.5.
3. A reversal marks the old entry Superseded and creates a new ID.
4. A superseding entry states what changed, why, and what is affected.
5. Why must give project reasoning, not name who requested it.
6. New or lightly tested ideas are Current, not Locked.
7. Deferred entries record both why deferred and why preserved.
8. Revisions are merged into a single document. Supplements and diff files are not a valid form of the register.

### 0.3 Supersession mechanism

One pattern throughout: the superseded entry stays in place, marked Superseded and naming its replacement; the replacement names what it supersedes and why. No synthetic or legacy namespaces are minted. Where a position predates the stable namespace, it is recorded as a **Prior position** field on the entry that replaced it rather than being assigned a retroactive ID.

### 0.4 Identifier migration from v1.1

v1.1 is not a valid identifier baseline: it reused v1.0 IDs for different content, dropped entries without notice, and introduced a `UI-*` prefix that no longer exists. The tables below cover **every** v1.1 identifier. A citation to v1.1 must be retranslated through them.

**Collisions — v1.1 ID means something different than it does canonically**

| v1.1 ID | Meaning in v1.1 | Canonical ID |
|---|---|---|
| S-004 | Fast systems teach; slow systems remember | S-005 (fast) + S-006 (slow) |
| S-005 | Hysteresis is fundamental | S-007 |
| S-006 | Carrying capacity emerges | ES-006 |
| S-007 | Disturbance is part of healthy ecology | ES-002 |
| P-001 | Observation is the primary mode of learning | P-003 |
| P-002 | Prediction must be an explicit mechanic | P-006 |
| P-003 | Institutional knowledge | P-004 |
| P-004 | The world is the primary graph | U-003 |
| E-002 | Wildlife can become habitat | E-005 |
| E-003 | Any species may be introduced; readiness determines success | E-007 |
| E-005 | Survival of the preselected fittest | E-008 |
| E-006 | Species count completes scenario goals | G-003 |
| A-002 | Pulse **and** structural interventions are distinct | A-002 (pulse) + A-003 (structural) |
| A-003 | Interventions should not guarantee outcomes | A-004 |
| G-003 | Windward Basin is the reference preserve | W-001 |
| UI-001 | Readiness indicators inform but do not prescribe | E-003 |
| UI-002 | Complexity is layered | U-001 |
| UI-003 | Fidelity is simplified when it improves clarity | U-002 |

Two of these were mapped incorrectly in the v1.3 supplement and are corrected here: v1.1 E-002 is wildlife-becomes-habitat (→ E-005), not readiness gating; v1.1 E-005 is role resolution (→ E-008), not wildlife-becomes-habitat. The supplement also omitted the entire `UI-*` and `G-*` blocks.

**Stable — v1.1 ID and canonical ID agree**

D-001, D-002, D-003, D-004, D-005, S-001, S-002, S-003, P-005, E-001, E-004, A-001, G-001, G-002, ART-001, AUD-001, N-001 through N-005, F-001, F-002, F-003.

**Dropped by v1.1, restored by v1.2 with their v1.0 meanings**

S-004 (ecology is causal), P-001 (players modify forcings), P-002 (no ecosystem painting), E-003 (readiness indicators), E-006 (survival determines success), A-003 (structural interventions), G-004 (no universal optimum), U-004 (curiosity precedes explanation), the full `H-*` block, the full `GEO-*` block, the full `ES-*` block, ART-002, ART-003, AUD-002, AUD-003.

**Introduced after v1.1**

S-008, P-006, E-007, E-008, A-005, A-006, G-005, G-006, G-007, W-001 (recovered v0.2 identifier), T-001, T-002, T-003, RC-001, RC-002, RC-003, F-004.

**Pre-v1.0 identifiers.** v0.2 used `D-*` and `E-*` with different meanings again (v0.2 D-004 was "same simulation at every scale," now S-001; v0.2 `E-*` denoted ecosystem simulation, not species). Those identifiers are reserved but not mechanically resolvable. Any citation older than v1.0 must be resolved by reading the original text.

### 0.5 Removal record

- **v1.1 removals** are enumerated above and were restored in v1.2.
- **v1.2 removed the Non-Goals section** (N-001 through N-005) without notice, on the implicit reasoning that the content survived inside individual entries' rejected alternatives. That reasoning is rejected: a short standing list of prohibitions is a different instrument from prohibitions distributed across forty entries. Restored in §12.
- **v1.2 removed the v1.0 Guiding Principles list.** Removal upheld. Every principle in that list restated a decision recorded elsewhere, and duplicated statements drift apart as the register grows. Principles now live only as the Why fields of the entries they justify.

### 0.6 Revision log

Corrections and relocations are recorded here. Content changes still require the supersession mechanism in §0.3; this log exists so that non-supersession edits are also traceable.

**v2.0 — constitutional release.**

- Promoted the register from a canonical working register to Habitat's canonical product constitution.
- Added D-006 to make attention an explicit unit of engagement rather than an implication distributed across P-003, P-006, and U-004.
- Added W-002 through W-006 to define the preserve as a continuous living diorama with emergent regions, fixed species pools, hybrid terrain authoring, and no simulated human agents.
- Added G-008 to preserve the accepted mixed-objective scenario model.
- Added E-009 to distinguish inferred ecological readiness from authored progression thresholds.
- Added U-005 and U-006 to define the living-diorama presentation and the bounded Field Notebook explanation layer.
- Added RC-004, superseding RC-001 and RC-002: ecological time and opportunity are the primary intervention constraints; Habitat has no general-purpose money or action-point economy.
- Resolved T-001 at exact deterministic replay for authoritative simulation state and identical inputs.
- Resolved T-002 at a hybrid real-time model while leaving exact speed multipliers to tuning.
- Added T-004 through T-007 for data-driven content, layered simulation inspection, simulation/render separation, and the current reference-prototype architecture.
- Reframed G-003 as one permissible scenario criterion rather than Habitat's universal completion rule; G-008 governs the broader objective model.
- Promoted G-005 and G-006 from lightly tested directions to binding scenario-authoring constraints.
- Updated the immediate queue so only genuinely unresolved constitutional questions remain.

**v1.3.1 — audit corrections.**

- A-001's siting cross-reference redirected from A-006 to A-005, the governing entry. A-006 extends it.
- S-009 created from a decision found inside T-002's constraint list, where nothing could cite it. T-002 now references it.
- RC-003's covert preference for ecological consequence moved from Constraints into a labelled leading direction, so the Open entry no longer narrows its own option space.
- G-005's prototype window value removed as a tuning parameter and routed to scenario authoring. No decision content lost.
- BUILD_GUIDE.md renamed from a tool-specific title in §17.

**v2.0.1 — conformance adoption.**

- Added §0.7 and hypothesis-Current versus situation-Current distinction in §0.1.
- Adopted [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) for promotion criteria, review triggers, and the generated conformance ledger.

**v2.0.2 — P-005 Locked.**

- Promoted **P-005** (save states) from hypothesis-Current to Locked after the `deep-time` probe discharged its criterion: save → advance 100 compressed sim-years → reload → advance again yields an identical state hash, and legacy `soil.depth` from a save still drives divergent decadal production. Artifact: `docs/evidence/deep-time.baseline.json`, `src/sim/probes/deepTime.ts`.

**v2.0.6 — Slice F climate-mean rainfall + orographic lite.**

- Reframed rainfall dial as **climate mean intensity** (arid→wet, every-event mean) under **C-004** / owner clarification — not storm on/off. Slice **F** adds Force panel + wind dial + orographic placement (**C-020** lite); full cloud/snow/sleet remains later. Island remains default playable world.

**v2.0.5 — C-020 filed; island brief Tier-O Pass.**

- Filed **C-020** (atmospheric precip delivery — clouds / wind / moisture / heat) after owner Pass on [batch-island-brief.md](playtests/batch-island-brief.md): rain dial works for now but is not natural-feeling; keep regime surface until a later atmospheric slice. Island place reading discharged for **C-015**; **W-001** supersession still an owner register act.

**v2.0.4 — C-007 Locked (Slice 12 owner Pass).**

- Promoted **C-007** (arrival as the primary biological verb) from Open to Locked after the machine half (Liebig HSI gate, `arrival-earned` probe: suitable biomass = 2.5, unsuitable = 0, `earned = 1`, `hashMatch = 1`) and the owner verdict that appearance of life must mimic real life and therefore arrive through earned conditions. Introduction remains secondary and later; **RC-003** falls in §16 queue priority. Artifacts: `docs/slices/12-composition.md`, `docs/evidence/arrival-earned.baseline.json`, `docs/playtests/12-arrival-earned.md`, `docs/candidates/C-007-dossier.md`.

**v2.0.3 — C-001 Locked (Slice 8b).**

- Promoted **C-001** (cheap groundwater / baseflow store) from Open to Locked after Tier-M conservation including the GW compartment stayed within H-004 bounds and probe `baseflow-persist` showed channel wetness after wet→dry with GW strictly greater than the no-GW baseline (channel ≈ 0.011 vs 0; GW sum ≈ 30). Artifact: `docs/evidence/baseflow-persist.baseline.json`. Richards/MODFLOW remain banned in-browser.

**v1.3.1 held items resolved in v2.0.** The Non-Goals survive because they are a scope-control instrument rather than ordinary explanatory decisions. The H-* and GEO-* blocks survive because changing either would redesign the causal foundation of Habitat. Closely related claims remain separate only where they govern different disciplines: D-005 governs product intent, ART-002 art direction, U-003 information hierarchy, and ART-003 state expression. Residual preview and inspector detail is treated as derived-document guidance rather than an immutable list. The attention gap is resolved by D-006.

### 0.7 Decision conformance

Promotion criteria for hypothesis-Current and Open entries, review triggers for situation-Current entries, and the generated build-to-register traceability ledger live in [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md). That document is governed here but is not part of this register; machine-generated ledger rows are updated by `npm run conformance`.

A Current entry is not a candidate for Locked status until its promotion criterion is recorded, judged, and the artifact named in that criterion exists. Situation-Current entries are revisited only when their review trigger fires.

---

## 1. Core Philosophy

### D-001 — Nature is the protagonist
**Status:** Locked

**Decision.** The player creates conditions; natural systems perform the meaningful ecological work.

**Why.** Habitat is not about constructing a finished landscape. Its central promise is that living systems organize themselves when conditions become suitable. This preserves humility, surprise, and ecological causality.

**Implications.** Restoration outcomes must normally emerge from simulation. The player should not directly author finished ecosystems. The world must be able to surprise the player in believable ways.

**Rejected alternatives.** The player as omnipotent landscape designer. Scripted restoration triggered by mission completion. Direct placement of mature ecosystems.

### D-002 — Habitat is the objective
**Status:** Locked

**Decision.** The game is about making places habitable rather than maximizing a universal score.

**Why.** A single score would flatten ecological complexity into optimization. The project instead asks whether a place can sustain life and relationships over time.

**Implications.** Scenarios may use explicit completion criteria, but no number represents total ecological worth. Multiple ecological equilibria can be valid. The interface should not imply one globally optimal ecosystem.

**Rejected alternatives.** A universal ecosystem-health score. One dominant biodiversity number. A global optimization objective.

### D-003 — Process over outcome
**Status:** Locked

**Decision.** Players alter forcings, constraints, and ecological processes rather than directly setting ecosystem state.

**Why.** The game is meaningful when players understand causes. Directly placing outcomes bypasses ecological reasoning and removes unintended consequences.

**Implications.** Tools affect water, disturbance, connectivity, substrate, access, or introductions. Ecological state must be computed from conditions. Interface verbs describe actions, not guaranteed ecological results.

**Rejected alternatives.** "Place forest." "Add wetland." "Increase biodiversity by 10%." Direct population sliders.

### D-004 — Emergence over scripting
**Status:** Locked

**Decision.** Shared simulation rules are preferred over authored ecological event chains.

**Why.** Scripted systems teach players to memorize a scenario. Emergent systems support replayability and knowledge that transfers between preserves.

**Implications.** Scenarios configure conditions more often than sequences. Species and habitats follow shared rules. Explanations reveal causal variables rather than hidden triggers.

**Rejected alternatives.** Fixed succession stages. Mission scripts presented as ecology. Scenario-specific exceptions without ecological justification.

### D-005 — The world should feel like a work of art
**Status:** Locked

**Decision.** Scientific grounding supports an aesthetically authored and emotionally resonant world.

**Why.** The intended outcome is connection to the natural world and respect for its components, not comprehension alone. Beauty creates attachment and makes stewardship emotionally meaningful.

**Implications.** Art direction and simulation readability are developed together. Abstraction is acceptable when it improves legibility and emotional force. Photorealism is not the default measure of success.

**Rejected alternatives.** Pure scientific visualization. Photorealism as an end in itself. A sterile dashboard-first presentation.

### D-006 — Attention is the unit of engagement
**Status:** Locked

**Decision.** Habitat rewards looking carefully, forming an expectation, and recognizing change. Player attention—not action frequency—is the primary unit of engagement.

**Why.** The project becomes a generic management game if constant intervention is the dominant source of activity. Habitat's distinct promise is that watching a living system can be active, consequential play.

**Implications.** Observation must reveal meaningful change. Prediction gives attention an explicit action (P-006). Time controls let the player choose the scale of attention. Strong play trends toward fewer, better-timed interventions rather than higher action throughput.

**Rejected alternatives.** Constant task queues. Click efficiency as mastery. Idle waiting with no interpretive work. Rewarding intervention volume.

---

## 2. Simulation

### S-001 — One simulation for every biome
**Status:** Locked

**Decision.** Preserves share one underlying simulation architecture. Biomes differ through parameters, content, species-role mappings, initial state, and boundary conditions.

**Why.** Separate biome engines would create inconsistent rules and unmaintainable content. A shared system demonstrates that common physical and ecological principles produce different places.

**Implications.** Preserve variation is data-driven. New preserves validate and extend shared systems rather than replace them. Bespoke logic requires explicit justification.

**Rejected alternatives.** One implementation per biome. Hard-coded biome behavior. Scenario-specific ecological engines.

### S-002 — Physical systems precede biology
**Status:** Locked

**Decision.** Geology, terrain, hydrology, climate, and soils establish the conditions from which biological systems emerge.

**Why.** Plants and animals are only ecologically meaningful when habitat is causal rather than decorative.

**Implications.** Core physical state must exist before advanced wildlife systems. Biological readiness derives from environmental state. Terrain and water cannot be cosmetic backdrops. Precedence describes dependency order, not one-way data flow: E-005 requires biological systems to write back into physical state.

**Rejected alternatives.** Building animal AI first and attaching habitat later. Spawning vegetation independently of substrate and water. Treating terrain as static scenery. A strictly one-directional physical-to-biological pipeline.

### S-003 — Continuous simulation
**Status:** Locked

**Decision.** The world continues to simulate while the player observes. Time controls alter the rate, not the governing rules.

**Why.** Waiting, watching, and recognizing delayed effects are part of the play. Ecological systems should not exist only when the player issues commands.

**Implications.** State remains coherent across supported time rates. Fast-forward must not replace causality with a separate resolution system. Important feedback remains legible under acceleration. Depends on T-002.

**Rejected alternatives.** Turn-based ecosystem resolution. Mission-step updates. Instant completion of long ecological processes.

### S-004 — Ecology is causal and explainable
**Status:** Locked

**Decision.** Every important ecological state should be traceable to simulated conditions and interactions rather than hidden scenario logic.

**Why.** The player is meant to develop ecological knowledge. That is impossible if similar conditions produce different outcomes because of invisible authored triggers.

**Implications.** Debug and explanation tooling must identify major causal contributors. Scenario scripting cannot silently override ecological rules. Failures must be explainable after the fact.

**Rejected alternatives.** Hidden mission modifiers. Unexplained threshold exceptions. Cosmetic simulation masking authored outcomes.

### S-005 — Fast systems teach
**Status:** Locked

**Decision.** Fast-changing systems provide timely, visible feedback about cause and effect.

**Why.** Observation becomes playable only when the world provides signals soon enough for players to connect them to an action or prediction.

**Implications.** Water, weather, and short disturbances expose readable responses. Long-term outcomes need early indicators. Immediate feedback is not a guarantee of success.

**Rejected alternatives.** Long periods with no informative change. Immediate final restoration. Teaching primarily through text panels.

### S-006 — Slow systems remember
**Status:** Locked

**Decision.** Slow-changing systems preserve ecological history and give interventions lasting weight.

**Why.** If all effects disappear as quickly as they appear, the world has no memory and stewardship becomes consequence-free experimentation.

**Implications.** Soil, succession, erosion, and population structure retain long-lived state. Save files must preserve relevant historical variables (T-003). The landscape visibly carries prior events.

**Rejected alternatives.** All systems sharing one response speed. Automatic reset toward a neutral baseline. History stored only in a textual event log.

### S-007 — Hysteresis is fundamental
**Status:** Locked

**Decision.** Recovery does not necessarily follow the reverse path of degradation.

**Why.** Erosion, fragmentation, lost seed banks, altered channels, and local extinction can persist after the original pressure is removed. This makes history materially important and prevents simplistic knob reversal.

**Implications.** State must include memory, not just present inputs. Some recovery requires additional work or time. Scenario design must account for path dependence (G-006).

**Rejected alternatives.** Fully reversible systems. Immediate recovery when a pressure is removed. Equilibrium models without historical state.

### S-008 — Hysteresis must be legible
**Status:** Current

**Decision.** When history blocks or slows recovery, the game must expose that fact and identify the relevant legacy condition.

**Why.** Illegible hysteresis is indistinguishable from a bug or arbitrary punishment. The player must be able to learn that current conditions are insufficient because prior damage changed the system.

**Implications.** Inspectors need a way to show legacy constraints. Feedback must distinguish current pressure from historical damage. Scenario objectives cannot depend on invisible historical variables.

**Rejected alternatives.** Hidden recovery penalties. Generic "habitat unsuitable" messages with no cause. Removing hysteresis because it is hard to explain.

### S-009 — Ecological duration is expressed in simulation time
**Status:** Current

**Decision.** Every duration with ecological meaning — persistence windows, recovery intervals, disturbance return periods, cooldowns — is defined in simulation time and is invariant under the player's chosen time rate.

**Why.** This was previously an unstated assumption inside T-002's constraints, which meant nothing could cite it. It is a decision rather than a constraint: if durations were wall-clock, a player could satisfy or fail an ecological criterion by changing playback speed, which would make G-005 arbitrary and contradict S-003's rule that time controls alter rate, not governing rules.

**Implications.** Scenario authoring, cooldowns, and completion criteria specify simulation time only. Any wall-clock element in the UI is presentation. Time-rate selection (T-002) cannot change whether a criterion is met, only how long the player waits to observe it.

**Rejected alternatives.** Wall-clock durations. Durations that scale with the selected rate. Criteria evaluated per rendered frame rather than per simulation step.

**Provenance.** Extracted from T-002 in v1.3.1. No content was lost; T-002 now references this entry.

---

## 3. Hydrology

### H-001 — Water is the primary ecological driver
**Status:** Locked

**Decision.** Water is the first physical system used to organize and teach the reference preserve.

**Why.** Water links terrain, soil, vegetation, disturbance, and habitat in a form the player can see moving through the world. Privileging it creates a coherent causal spine rather than treating every physical variable as equally foregrounded.

**Implications.** Early prototypes make rainfall, runoff, pooling, infiltration, and downstream effects readable. Prediction (P-006) begins with water. Other systems may be equally important scientifically without being equally central to play.

**Rejected alternatives.** Presenting all physical drivers with equal prominence. Water as a visual effect only. Beginning the learning loop with abstract nutrient variables.

### H-002 — Water follows terrain
**Status:** Locked

**Decision.** Flow paths arise from terrain geometry and physical rules rather than authored river splines alone.

**Why.** The player must be able to observe terrain and form a meaningful prediction about where water will go.

**Implications.** Terrain data drives flow routing. Authored watercourses may initialize or constrain the system but cannot contradict it without explanation. Terrain edits and structural interventions propagate into hydrology.

**Rejected alternatives.** Decorative rivers disconnected from topography. Fixed flow paths unaffected by intervention. Purely scripted flood behavior.

### H-003 — Water creates habitat
**Status:** Locked

**Decision.** Wetlands, ponds, riparian areas, floodplains, and moisture gradients emerge from water behavior.

**Why.** Hydrology matters because it changes ecological opportunity, not because moving water looks convincing.

**Implications.** Habitat suitability consumes hydrological state. Changes in water regime alter vegetation and species readiness. Hydrology cannot stop at rendering.

**Rejected alternatives.** Habitat zones painted independently of simulated water. Static wetlands. Water affecting only erosion.

### H-004 — Watersheds retain history
**Status:** Locked

**Decision.** Channel changes, erosion, sediment, storage, and altered connectivity persist.

**Why.** A watershed is a memory system. This connects fast teaching signals to long-term consequences.

**Implications.** Hydrological state survives saves. Structural interventions alter future flow, not just current visuals. Recovery may require more than restoring rainfall.

**Rejected alternatives.** Resetting water networks each weather cycle. No persistent erosion or storage. Structural interventions as temporary modifiers.

---

## 4. Terrain and Geology

### GEO-001 — Geology precedes ecology
**Status:** Locked

**Decision.** Geological and geomorphological history establishes the substrate inherited by ecological processes.

**Why.** Present habitat should have reasons grounded in the place rather than existing as a neutral board for gameplay.

**Implications.** Preserve authoring includes geological history or its simplified consequences. Soil, drainage, and terrain properties are related. Ecological differences do not rely on biome labels alone.

**Rejected alternatives.** Terrain as an arbitrary height map. Identical substrates under every preserve. Ecology detached from landscape history.

### GEO-002 — Terrain evolves only where simulation value justifies cost
**Status:** Locked

**Decision.** Dynamic terrain is implemented selectively, where it materially changes ecological behavior, player understanding, or long-term consequences.

**Why.** Fully dynamic geomorphology is expensive and can consume the project without improving the game. Static terrain everywhere would prevent meaningful erosion, channel change, and ecosystem engineering.

**Implications.** Use simplified or localized terrain change. Prioritize visible, causal deformation. Every dynamic terrain feature needs a gameplay or ecological justification.

**Rejected alternatives.** Full high-fidelity geomorphology across the map. Completely immutable terrain. Deformation as visual spectacle.

### GEO-003 — Landscape history matters
**Status:** Locked

**Decision.** Present terrain and habitat reflect accumulated geological, hydrological, and ecological history.

**Why.** This is the physical counterpart to hysteresis: place should record what has happened to it.

**Implications.** Preserve state includes more than current forcing values. Restoration may reveal or work with inherited structure. Historical state is readable where it affects decisions.

**Rejected alternatives.** Every scenario beginning from a memoryless surface. History existing only in narrative text. Present conditions with no causal past.

---

## 5. Player Agency and Learning

### P-001 — Players modify forcings
**Status:** Locked

**Decision.** Players influence water, disturbance, connectivity, infrastructure, substrate, access, and introductions rather than directly setting ecological outcomes.

**Why.** Agency must operate through ecological causes for observation and prediction to matter.

**Implications.** Tool design names mechanisms. Similar tools produce different outcomes in different contexts. Direct ecological placement requires explicit exception review.

**Rejected alternatives.** Direct habitat painting. Population sliders. Guaranteed outcome buttons.

### P-002 — No ecosystem painting
**Status:** Locked

**Decision.** The player cannot paint finished forests, wetlands, or animal populations onto the map.

**Why.** Painting skips the causal system and converts restoration into decoration.

**Implications.** Siting an intervention remains distinct from placing its ecological result (A-005, A-006). Visual previews show affected area or forcing, not a guaranteed finished habitat. Vegetation and wildlife placement arises from simulation.

**Rejected alternatives.** Brush-based forest placement. Painting biodiversity zones. Dropping completed wetlands as scenery.

### P-003 — Observation is primary
**Status:** Locked

**Decision.** Players learn by watching the world change and relating outcomes to conditions and prior actions.

**Why.** The project aims to build ecological understanding rather than teach hidden recipes.

**Implications.** Camera, time control, overlays, and visible state change are core features. Explanations support observation rather than replace it. The world must supply enough evidence to form hypotheses.

**Rejected alternatives.** Tutorial text as the principal learning system. Constant instructions identifying the correct move. Pure menu-based optimization.

### P-004 — Institutional knowledge, not arbitrary instinct
**Status:** Locked

**Decision.** Success should come from ecological relationships that remain consistent and transferable.

**Why.** Players should learn how the world works, not what an isolated level designer expects.

**Implications.** Shared rules hold across preserves. Exceptions need ecological justification. Failure feedback points toward relationships and conditions.

**Rejected alternatives.** Hidden one-off thresholds. Scenario-specific tricks. Unexplained trial and error.

### P-005 — Save states support experimentation
**Status:** Locked

**Decision.** Players can save or snapshot a simulation state and return to it.

**Why.** Ecological systems are slow and path-dependent. Save states allow serious experimentation without replaying long setup periods.

**Implications.** Saves preserve the historical state hysteresis requires (T-003). Basic saving is distinct from comparison tooling (F-002 / **C-005**). Determinism of a save→advance→reload→advance trajectory is proven by the `deep-time` probe (T-001).

**Rejected alternatives.** One irreversible timeline. Saves that store visible state but omit causal history. Framing saves as optimization checkpoints.

**Promotion.** Criterion in DECISION_CONFORMANCE discharged 2026-07-28 by `deep-time` probe + `src/sim/save.test.ts` (agent, Judge CI).

### P-006 — Prediction is an explicit commit-and-compare mechanic
**Status:** Current

**Decision.** The player marks where an environmental event is expected to occur — initially where rainfall or runoff will land or move — commits the prediction, then sees it overlaid against the simulated result.

**Why.** Observation alone can collapse into waiting. Committing a prediction turns attention into an action, makes learning visible, and gives the player a reason to study terrain before time advances.

**Implications.** Prediction is load-bearing for the core observation loop and should not be cut as polish. The overlay must clearly compare expected and actual results. The mechanic rewards attention, not optimization through hidden scores. Scope begins with one highly readable water prediction rather than many prediction types.

**Rejected alternatives.** Passive observation only. Forecasting through menus. A hidden prediction score with no spatial commitment. Removing prediction to reduce scope while retaining "observation" as a slogan.

**Prior position.** A pre-v1.0 draft (v0.2, within the observation entry) explicitly ruled out a required prediction-marking mechanic. That position is reversed here. It was never issued a stable identifier and is not assigned one retroactively. The reversal was made because observation had no instrument behind it and risked becoming passive waiting. Affected: core interaction loop, rainfall and runoff presentation, MVP scope, tutorial and feedback design.

---

## 6. Species and Wildlife

### E-001 — Species respond to habitat
**Status:** Locked

**Decision.** Species appear, move, survive, and reproduce because environmental conditions and ecological relationships support them.

**Why.** Wildlife presence must be evidence of a functioning place rather than a decorative reward.

**Implications.** Species systems consume habitat state. Visual presence corresponds to actual ecological state. Scenario milestones cannot spawn wildlife.

**Rejected alternatives.** Decorative wildlife. Scripted arrival scenes unrelated to habitat. Species as cosmetic unlocks.

### E-002 — Habitat readiness gates introductions
**Status:** Superseded by E-007

**Decision at the time.** An introduction action would become available only after readiness crossed a threshold.

**Why it changed.** Hard gating prevents ecologically informative failure and turns readiness into a progression lock. Allowing attempts while letting the simulation determine establishment better matches process-over-outcome.

**Affected.** Introduction UI, readiness indicators, failure feedback, scenario scripting.

### E-003 — Readiness indicators inform without prescribing
**Status:** Locked

**Decision.** The interface communicates whether current conditions plausibly support an ecological role, without promising success or naming one mandatory next move.

**Why.** Players need evidence for reasoning, but a prescriptive checklist would replace ecological judgment.

**Implications.** Indicators expose contributing conditions and uncertainty. "Ready" means support is plausible, not guaranteed. Indicators refer to roles, per E-004.

**Rejected alternatives.** No suitability feedback. Guaranteed green-check introductions. Exact next-action recommendations.

### E-004 — Players introduce ecological roles, not named species
**Status:** Locked

**Decision.** The player chooses a role such as Apex Predator; preserve data resolves that role to the appropriate species.

**Why.** The player should reason about ecological function rather than navigate a zoological catalog. This also supports a shared cross-biome interaction model.

**Implications.** Every preserve maps supported roles to local species. UI vocabulary remains role-first. The resulting species may be revealed after the action.

**Rejected alternatives.** Long named-species selection lists. One universal species roster. Taxonomic micromanagement.

### E-005 — Wildlife can become habitat
**Status:** Locked

**Decision.** Some wildlife modifies physical systems and creates habitat for other life.

**Why.** A one-way model in which terrain affects animals but animals never affect terrain omits ecosystem engineers and weakens the project's ecological thesis.

**Implications.** Biological systems must write back into hydrology, terrain, sediment, vegetation, or shelter state. The MVP may simplify the number of engineer species, but the architecture cannot forbid the feedback. Beaver-like engineering is a requirement, not decorative behavior.

**Rejected alternatives.** Animals affecting only population numbers. Wildlife as passive consumers. Deferring all physical wildlife effects without architectural support.

### E-006 — Survival determines introduction success
**Status:** Locked

**Decision.** An introduction succeeds only if the resulting population persists under simulated conditions.

**Why.** The action should create an ecological test, not award a species.

**Implications.** Establishment and persistence require explicit definitions. Failure must be legible. Temporary appearance does not count as successful reintroduction.

**Rejected alternatives.** Guaranteed establishment. Success at the moment of release. Species count incremented regardless of survival.

### E-007 — Ecological roles are attemptable without readiness hard-locking
**Status:** Current *(changed from Locked in v1.3 per rule 6: introduced one revision ago, supersedes a Locked entry, and its failed-attempt consequence remains unresolved in RC-003.)*

**Decision.** A supported ecological role may be attempted even when conditions are poor; readiness affects establishment probability or viability rather than whether the action exists.

**Why.** Allowing failure preserves agency, makes readiness informative rather than coercive, and keeps ecological consequences inside the simulation.

**Implications.** The UI may warn strongly but must not convert suitability into a progression lock. "Supported role" means roles mapped for the preserve, not every possible species. Failed attempts need meaningful consequence to avoid spam — see RC-003, which is unresolved.

**Rejected alternatives.** Hard readiness gates. Guaranteed success whenever an action is enabled. Player selection of arbitrary named species.

**Supersedes:** E-002.

### E-008 — Role resolution selects the biome-appropriate candidate; the simulation determines establishment
**Status:** Current

**Decision.** When a role is introduced, preserve data selects an ecologically appropriate species candidate, but survival and establishment remain simulated.

**Why.** This reduces taxonomic micromanagement without converting introduction into a guarantee.

**Implications.** Candidate selection rules are data-driven and inspectable. Multiple candidates may become a future extension. Remains Current until role resolution has been prototyped.

**Rejected alternatives.** Random species selection. Player-controlled subspecies selection. Guaranteed establishment of the selected candidate.

### E-009 — Readiness is inferred from simulation state
**Status:** Current

**Decision.** Ecological readiness is an interpretation of current and historical simulation state, not an authored unlock flag or a single hidden threshold.

**Why.** Readiness should summarize the world's evidence. An authored gate would recreate the arbitrary progression logic rejected by P-004, while one exact threshold would falsely imply certainty.

**Implications.** Readiness can combine habitat, food web, connectivity, disturbance history, and uncertainty. The UI may express confidence or limiting factors. Scenario authors configure ecological conditions but do not directly set a role to "ready." Prototype validation is required before promotion to Locked.

**Rejected alternatives.** Designer-set readiness flags. One universal suitability percentage. Exact guarantees disguised as ecological advice.

---

## 7. Interventions

### A-001 — Interventions are functional, not geographically branded
**Status:** Locked

**Decision.** Actions are named and modeled by ecological function rather than by a specific place, agency, or regional program.

**Why.** The project needs concepts that transfer between preserves. Geographic branding increases content burden and teaches case-specific vocabulary instead of system behavior.

**Implications.** Local art and text may contextualize an action without changing its function. Functional equivalence is reused across preserves. This decision does not determine whether an intervention is spatially sited — see A-005, extended by A-006.

**Rejected alternatives.** Agency-specific tool lists. One bespoke action set per biome. Geographic trivia as progression knowledge.

### A-002 — Pulse interventions are distinct
**Status:** Locked

**Decision.** Some interventions create immediate, temporary disturbances or forcing changes.

**Why.** A controlled flood or prescribed burn changes the system through timing and duration rather than permanent infrastructure.

**Implications.** Pulse actions need onset, duration, magnitude, and recovery behavior. Their effects may have persistent consequences even when the forcing ends. They cannot be represented as weaker structural actions.

**Rejected alternatives.** All actions as permanent modifiers. No temporal distinction between interventions. Instant stat changes without a simulated event.

### A-003 — Structural interventions are distinct
**Status:** Locked

**Decision.** Some interventions permanently or semi-permanently change future system behavior.

**Why.** Dam removal, reconnection, and earthworks alter constraints rather than applying a temporary event.

**Implications.** Structural actions modify persistent state. Saves preserve their effects. Placement and footprint require an explicit siting policy (A-005).

**Rejected alternatives.** Treating structural work as a temporary boost. Resetting infrastructure each scenario phase. Structural changes affecting visuals but not simulation.

### A-004 — Interventions have contextual consequences, not guaranteed results
**Status:** Locked

**Decision.** An intervention changes conditions; the ecosystem determines the result.

**Why.** Guaranteed outcomes would convert the game into recipes and violate process-over-outcome.

**Implications.** The same action behaves differently in different states. Previews distinguish affected forcing from predicted ecological result. Scenario design permits multiple strategies.

**Rejected alternatives.** "Use action X to create habitat Y." Fixed action chains. Guaranteed restoration buttons.

### A-005 — Siting selects a cause rather than painting an outcome
**Status:** Current

**Decision.** The player chooses where a spatial intervention occurs. The gesture places or modifies infrastructure, connectivity, excavation, obstruction, or another causal feature — not the habitat expected to result.

**Why.** Structural work is meaningless without location. The distinction from an ecosystem painter is not the gesture itself but what the gesture commits: a physical cause with uncertain consequences rather than a finished ecological state.

**Implications.** Previews show footprint, cost, physical effect, and uncertainty — never a guaranteed mature habitat. The simulation resolves downstream water, soil, vegetation, and wildlife response. Siting tools need constraints based on terrain and intervention type. Remains Current until an interaction prototype proves the distinction is legible.

**Rejected alternatives.** Unsited global intervention buttons. Painting the desired habitat directly. Automatically selecting a "best" location.

### A-006 — Pulse interventions are sited too
**Status:** Current

**Decision.** Spatial siting applies to pulse interventions as well as structural ones. A prescribed burn or controlled flood has a location and extent chosen by the player.

**Why.** A-005 established the cause-versus-outcome test for structural work but left pulse interventions spatially undefined, which would make burn and flood tools either global or arbitrarily placed. Disturbance regime is spatial in ecology — where a fire burns determines what it does — and unsited disturbance would remove the player's most direct expression of D-003.

**Implications.** Pulse tools need extent, boundary, and containment semantics in addition to A-002's onset, duration, and magnitude. Spread and containment may be simulated rather than fully specified by the player, which means the committed extent is an intent, not a guarantee. All of A-005's preview and legibility requirements apply unchanged.

**Rejected alternatives.** Global-scope pulse events. Disturbance placed automatically by the scenario. Player-drawn burn extents treated as exact and guaranteed boundaries.

**Extends:** A-005, which remains in force. This entry adds coverage; it does not replace A-005's preview requirements, siting constraints, or prototype condition.

---

## 8. Progression and Scenarios

> **Coupling note.** G-005, G-006, and G-007 are three faces of one decision: what completion means on approach, what happens when it becomes unreachable, and what happens after it is achieved. They must be resolved together; settling one in isolation will constrain the others in ways that may not be noticed.

### G-001 — Sandbox has no win condition
**Status:** Locked

**Decision.** Sandbox play continues indefinitely without a forced endpoint.

**Why.** An ecosystem is not finished. Sandbox should support inhabitation, observation, and experimentation rather than terminate at a score.

**Implications.** Long-term change must remain engaging. No mandatory victory screen ends the world. Optional self-directed goals may exist.

**Rejected alternatives.** A universal sandbox victory state. Resetting after ecological completion. Scoring sandbox against one optimum.

### G-002 — Scenarios provide finite objectives
**Status:** Locked

**Decision.** Scenarios provide authored ecological conditions and explicit completion criteria.

**Why.** The game needs directed play, onboarding, and testable challenges without imposing one universal objective on every preserve.

**Implications.** Scenario goals are authored separately from core simulation rules. Multiple valid strategies remain possible. Objectives must account for fluctuation and hysteresis.

**Rejected alternatives.** Sandbox only. Linear missions with scripted ecological solutions. One global scoring system.

### G-003 — Scenario completion may use target species count
**Status:** Locked

**Decision.** A scenario may complete when the preserve sustains the required number of qualifying species or ecological roles.

**Why.** Species count can provide a clear endpoint while remaining downstream of habitat quality. It is one permissible scenario criterion, not Habitat's universal completion model and not a measure of ecological value.

**Implications.** Only qualifying, established populations count. Completion requires a persistence window (G-005). Scenarios define which roles or species qualify. The UI must not present raw count as total ecosystem health.

**Rejected alternatives.** Species as collectibles. Completion at first appearance. A universal biodiversity score.

### G-004 — No universal optimum ecosystem exists
**Status:** Locked

**Decision.** Different stable or dynamic ecological states can be valid.

**Why.** Ecology cannot be reduced to a single best arrangement independent of context, history, and scenario purpose.

**Implications.** Scoring should not force convergence on one canonical layout. Scenario goals specify capacities or relationships rather than "perfect nature." Stability does not mean absence of fluctuation.

**Rejected alternatives.** One ideal climax state. Global optimization. Penalizing deviation from a reference composition.

### G-005 — Scenario completion uses a persistence window
**Status:** Locked

**Decision.** A qualifying population or role counts toward completion only after remaining established through a continuous evaluation window; a brief dip does not immediately revoke progress.

**Why.** Populations fluctuate. Sampling on one tick would make completion arbitrary and contradict ES-003.

**Implications.** Completion evaluates a rolling interval rather than a single frame. Thresholds need entry and exit hysteresis or grace periods. Window length is a tuning parameter rather than a register decision; it is set in scenario authoring, expressed per S-009 and bounded by T-002.

**Rejected alternatives.** Single-tick completion. Requiring constant population levels. Permanent completion at first appearance regardless of collapse.

### G-006 — Required objectives must remain recoverable or declare failure explicitly
**Status:** Locked

**Decision.** A scenario may not silently become unwinnable. If hysteresis can make an objective unreachable, the game must preserve a viable recovery path, identify a recognized failure state, or offer a scenario-level restore mechanism.

**Why.** Path dependence is meaningful; invisible permanent failure is not. The player must know whether continued play can still satisfy the objective.

**Implications.** Scenario validation tests reachability under plausible mistakes. Failure states need explicit communication. Save/restore may be part of recovery but cannot substitute for legibility (S-008). Designers may scope irreversible damage so it does not block required goals unless failure is intentional.

**Rejected alternatives.** Silent unwinnable states. Removing all irreversible consequences. Automatically undoing mistakes without acknowledgment.

### G-007 — Post-completion persistence
**Status:** Open

**Question.** Can a completed scenario become incomplete again?

**Why this must be decided.** ES-004 permits local extinction and G-005 defines completion over a window, so a completed preserve can subsequently fail its own criteria. Nothing currently says what that means.

**Alternatives.** (1) Completion permanently recorded once achieved. (2) Completion valid only while criteria remain satisfied. (3) Completion retained as a record while preserve health tracks independently. (4) Separate completion and ongoing-stewardship states.

**Constraints.** Option 2 makes completion revocable, which risks punishing the ecological fluctuation ES-003 requires. Option 1 makes it a permanent flag, which risks the collectible framing N-003 rejects. Options 3 and 4 preserve both but require the UI to represent two distinct things without implying one is a score.

**Decision required before.** Scenario completion UI, save schema (T-003), scenario authoring guidance, any end-of-scenario presentation.

### G-008 — Scenarios use mixed ecological objectives
**Status:** Locked

**Decision.** Each scenario has primary ecological-restoration objectives, with optional recognition for observation, scientific exploration, rare events, exceptional stewardship, and long-term stability.

**Why.** Pure numerical goals encourage optimization, while completely open-ended goals provide weak direction. Mixed objectives preserve a clear restoration purpose and reward curiosity without turning discovery into mandatory collection.

**Implications.** Primary objectives describe restored function, such as watershed recovery, connectivity, viable food webs, or self-sustaining processes. Optional achievements never substitute for primary restoration and do not make field-guide completion mandatory. Multiple ecologically valid strategies remain possible.

**Rejected alternatives.** Only fixed counters. Only open-ended sandbox goals. Mandatory field-guide completion. One prescribed solution per scenario.

---

## 9. Ecology

### ES-001 — Succession is emergent
**Status:** Locked

**Decision.** Community change arises from conditions and interactions rather than fixed authored stages.

**Why.** Succession should remain responsive to disturbance, hydrology, history, and species presence.

**Implications.** Stage labels may describe state but cannot drive it. Different pathways can reach different communities. Scenario scripts cannot force a sequence without changing conditions.

**Rejected alternatives.** Fixed grass-to-shrub-to-forest timers. Mission-triggered succession. One pathway for every site.

### ES-002 — Disturbance is necessary and context-dependent
**Status:** Locked

**Decision.** Fire, flooding, grazing, storms, and erosion are not automatically ecological failures.

**Why.** Many ecosystems depend on disturbance regimes. Equating health with stillness would teach the wrong model.

**Implications.** The UI distinguishes beneficial regime from destructive excess. Some interventions intentionally create disturbance. "More vegetation" is not universally better.

**Rejected alternatives.** Penalizing all fire or flooding. Static greenness as health. Removing disturbance to simplify balancing.

### ES-003 — Healthy ecosystems fluctuate
**Status:** Locked

**Decision.** Population, water, vegetation, and resource levels vary while the ecosystem remains functional.

**Why.** Dynamic stability is more ecologically credible than a motionless target state.

**Implications.** Goals require tolerance bands and persistence windows (G-005). Feedback distinguishes fluctuation from collapse. Tuning avoids perfectly static equilibria.

**Rejected alternatives.** Constant target values. Treating every decline as failure. Freezing the ecosystem after completion.

### ES-004 — Local extinction is possible
**Status:** Locked

**Decision.** A population can disappear locally when conditions no longer support it.

**Why.** Species presence must have ecological stakes and cannot be a permanent collectible flag.

**Implications.** Reintroduction may become necessary. Whether prior completion can be lost is unresolved (G-007). Failure causes must be explainable.

**Rejected alternatives.** Permanent species unlocks. Immortal minimum populations. Wildlife disappearing only through scripts.

### ES-005 — Recovery takes ecological time
**Status:** Locked

**Decision.** Correcting conditions does not instantly restore populations, soils, or communities.

**Why.** Delayed recovery gives history weight and creates a meaningful relationship between immediate intervention and long-term observation.

**Implications.** Early indicators are needed to avoid dead time. Time acceleration preserves the process. Recovery duration varies by system.

**Rejected alternatives.** Instant recovery. One universal recovery timer. Text-only statements that recovery occurred.

### ES-006 — Carrying capacity emerges
**Status:** Locked

**Decision.** Population capacity is computed from habitat, resources, competition, and predation rather than assigned as a fixed cap.

**Why.** A fixed cap disconnects populations from place and makes restoration irrelevant to their long-term scale.

**Implications.** Capacity changes as the preserve changes. Population systems need environmental inputs. Growth and failure are explainable.

**Rejected alternatives.** Fixed maximum populations. Scenario-authored caps unrelated to habitat. Arbitrary spawn quotas.

### ES-007 — Food webs drive population dynamics
**Status:** Locked

**Decision.** Producers, consumers, predators, decomposers, and ecosystem engineers affect one another through shared simulation.

**Why.** Species count without interaction would reduce biodiversity to parallel decorative bars.

**Implications.** Role introduction has indirect consequences. Predator and prey readiness cannot be assessed independently. Simplification may aggregate relationships but cannot remove causality.

**Rejected alternatives.** Independent species population timers. Predator presence with no prey dependency. Food webs represented only in educational text.

---

## 10. World and Preserve Scope

### W-001 — Windward Basin is the reference preserve
**Status:** Current

**Decision.** Windward Basin is the first environment used to prove the simulation, interaction loop, readability, and scenario structure.

**Why.** A concrete reference environment prevents abstract architecture from expanding without a playable test, and concentrates content effort before multi-biome production.

**Implications.** Core systems demonstrate value in Windward Basin first. Additional preserves are deferred, not removed (F-003). The reference preserve should not rely on disposable prototype rules.

**Rejected alternatives.** Building many preserves simultaneously. Designing abstract systems before a complete playable place. Treating the first preserve as throwaway content.

### W-002 — A preserve is one continuous landscape with emergent regions
**Status:** Locked

**Decision.** Each preserve is one spatially continuous ecological system. Watersheds, wetlands, forest stands, corridors, fire scars, and other regions are inferred from simulated patterns rather than imposed as separate gameplay zones.

**Why.** A continuous landscape makes upstream and downstream consequences tangible and gives each preserve a strong sense of place. Emergent regions remain useful for explanation without turning the world into colored administrative sectors.

**Implications.** Regional labels describe the ecosystem; they do not contain it. Water, wildlife, fire, and connectivity cross inferred boundaries. Scenario objectives may reference an inferred region only when its ecological basis is inspectable.

**Rejected alternatives.** Separate linked level maps. Designer-painted ecological zones. Regions that override cell-level simulation.

### W-003 — Each preserve has a fixed species pool
**Status:** Locked

**Decision.** A preserve draws from a curated, fixed pool of ecologically appropriate species and functional-role mappings.

**Why.** Fixed pools give preserves identity, keep role resolution coherent, and avoid requiring global biogeography before the shared ecological engine is proven.

**Implications.** Species do not migrate between preserves in the initial product. The same role resolves differently by preserve. Connected preserves and cross-preserve dispersal remain possible future expansions, not architectural assumptions.

**Rejected alternatives.** A universal global roster. Player-built species collections. Full cross-preserve biogeography in the first release.

### W-004 — Every preserve is a living diorama
**Status:** Locked

**Decision.** A preserve is composed as a self-contained, recognizable place that can be understood at a glance and rewards close inspection over time.

**Why.** The internal "snow globe" metaphor defines the player's relationship to Habitat: caretaker and observer of a living exhibit, not an avatar occupying or conquering a vast world.

**Implications.** Each preserve needs a recognizable silhouette, named landmarks, and whole-preserve readability. Scale favors ecological intimacy over procedural sprawl. The same mountain, river, and valley become familiar through repeated observation.

**Rejected alternatives.** Endless procedural continents. A first-person avatar. Anonymous maps valued mainly for size.

### W-005 — Preserve terrain uses hybrid generation
**Status:** Locked

**Decision.** Ecologically plausible procedural generation establishes terrain, watersheds, substrate, climate influence, and initial habitat patterns; scenario authors may constrain or sculpt the result.

**Why.** Procedural foundations create coherent variation, while authored shaping creates memorable restoration problems and recognizable places.

**Implications.** Authored changes work through the same physical rules as generated terrain. Generation order respects physical dependencies. Designers cannot paint exceptions that the simulation cannot explain.

**Rejected alternatives.** Entirely random terrain. Entirely handcrafted physical state. Authored rivers and habitats that contradict generated hydrology.

### W-006 — Humans are outside the agent simulation
**Status:** Locked

**Decision.** Once a preserve begins, humans are not simulated as visitors, workers, rangers, poachers, landowners, or economic agents. Intentional human influence enters through the player's interventions and authored boundary conditions.

**Why.** Human logistics, politics, and economics would shift Habitat into park or civilization management and compete with the ecological relationships at its center.

**Implications.** Roads, runoff, extraction, fragmentation, or prior land use may exist as initial state or ecological forcing, not as populations of human agents. Habitat has no visitor economy or staff-management layer.

**Rejected alternatives.** Simulated park visitors. Ranger staffing. Neighbor politics. A coupled city-builder economy.

---

## 11. UI, Art, and Audio

### U-001 — Information is layered
**Status:** Locked

**Decision.** The world presents a readable first layer, with deeper diagnostic information available on demand.

**Why.** Showing every variable at once overwhelms; hiding all variables makes causality unverifiable.

**Implications.** Overlays are task-specific. Expert detail exists without dominating normal play. The world remains visible during inspection where possible.

**Rejected alternatives.** Permanent full-screen dashboards. No diagnostics. One information density for every player and task.

### U-002 — Simplify presentation, not ecological truth
**Status:** Locked

**Decision.** Complex systems may be abstracted, but the abstraction must preserve the relationships that matter to play and understanding.

**Why.** The project cannot simulate everything, yet simplification that reverses or erases causality defeats its purpose.

**Implications.** Fidelity is judged by behavioral consequence, not variable count. Aggregated systems document their preserved relationships. Performance work targets invisible detail before visible causality.

**Rejected alternatives.** Maximum realism everywhere. Simplification into arbitrary rules. Systems included because they sound scientific.

### U-003 — The world is the primary visualization
**Status:** Locked

**Decision.** Landscape, motion, vegetation, wildlife, atmosphere, and sound communicate state before charts do.

**Why.** The player should remain connected to a place rather than operate a spreadsheet with scenery.

**Implications.** State changes need visual and audible expression. Charts supplement the world. Readability is an art-direction requirement.

**Rejected alternatives.** Dashboard-first play. Important state visible only numerically. Decorative rendering disconnected from simulation.

### U-004 — Curiosity precedes explanation
**Status:** Locked

**Decision.** The game first lets the player notice a change, then offers tools to investigate why it happened.

**Why.** Explanation is more meaningful when attached to an observed event and a question the player already has.

**Implications.** Event and inspection systems connect. Explanations reference visible causes. Tutorial prompts avoid pre-answering every observation.

**Rejected alternatives.** Constant proactive explanation. Long instructional sequences before play. Hidden systems with no explanation path.

### U-005 — The primary view is an elevated living diorama
**Status:** Current

**Decision.** Habitat uses an elevated three-quarter or isometric-like view with smooth zoom from whole-preserve composition to local ecological detail. Rotation is controlled rather than a free-flying camera.

**Why.** The view must preserve the authored silhouette of the preserve while supporting inspection. Looking into a living diorama reinforces observation and care better than an RTS command map or avatar camera.

**Implications.** Camera limits, occlusion, scale, and landmark composition are product requirements. The whole watershed remains a meaningful visual unit. Exact angles and rotation increments remain prototype-tuning choices.

**Rejected alternatives.** First-person navigation. Unrestricted flight as the default. Flat strategic map presentation.

### U-006 — The Field Notebook provides bounded causal explanation
**Status:** Current

**Decision.** The Field Notebook begins with trustworthy event chronology and simulated contributing conditions. It may use cautious inferred-driver language, but it does not claim certainty the simulation cannot support.

**Why.** Habitat needs a way to answer "what changed?" and eventually "why?" without inventing omniscient explanations. A bounded layer preserves trust while letting ecological history become legible.

**Implications.** MVP explanations prioritize chronology: burned, flooded, colonized, fragmented, recovered. Later maturity may rank likely drivers and eventually use counterfactual replay. Explanations identify scale and uncertainty. Counterfactual causal attribution is deferred until the local response model is stable.

**Rejected alternatives.** A static encyclopedia as the primary notebook. Confident template-generated causal claims. Opaque raw debug logs. Counterfactual replay as an MVP dependency.

### ART-001 — Scientific impressionism
**Status:** Current

**Decision.** The visual language expresses ecological truth through stylized, authored emphasis rather than strict photorealism.

**Why.** The world must be legible at simulation scale and emotionally distinctive.

**Implications.** Color, density, motion, and atmosphere may encode state. Stylization maps consistently to ecological meaning. The style requires prototype validation.

**Rejected alternatives.** Photorealism as the sole target. Default heat-map abstraction. Stylization disconnected from simulation.

### ART-002 — Beauty encourages stewardship
**Status:** Locked

**Decision.** Aesthetic attachment is part of the game's functional design.

**Why.** Players are more likely to care for a place they value emotionally.

**Implications.** Restoration feels sensorially meaningful. Degradation is not merely a number decreasing. Beauty is not limited to a final reward state.

**Rejected alternatives.** Aesthetics as optional polish. Purely utilitarian presentation. Rewarding only through scores.

### ART-003 — Ecological change is visible
**Status:** Locked

**Decision.** Restoration and degradation alter the observable world.

**Why.** A simulation the player cannot perceive cannot support observation-based play.

**Implications.** Major state variables need visual manifestations. Transition states matter, not only endpoints. Visual effects correspond to actual state.

**Rejected alternatives.** Hidden numerical change. Before-and-after swaps without transitions. Cosmetic changes unrelated to simulation.

### AUD-001 — Sound reflects ecological state
**Status:** Locked

**Decision.** Ambient sound and wildlife activity respond to simulated ecology.

**Why.** Sound communicates richness, absence, and transition without forcing the player into an interface panel.

**Implications.** Audio systems consume ecological state. Species calls correspond to actual presence. Soundscape change is gradual where ecology is gradual.

**Rejected alternatives.** Static ambience. Random wildlife sounds. Music as the only ecological audio feedback.

### AUD-002 — Silence has ecological meaning
**Status:** Locked

**Decision.** The absence of expected sound communicates degradation, absence, or failed recovery.

**Why.** Silence is a direct experiential signal and gives ecological loss emotional weight.

**Implications.** The mix leaves room for absence to be perceived. Silence is not filled with decorative ambience. Audio explanations may identify what is missing.

**Rejected alternatives.** Constantly dense ambience. Silence only as a scripted dramatic cue. Sounds unaffected by species loss.

### AUD-003 — Recovery is audible
**Status:** Locked

**Decision.** As ecological relationships recover, the soundscape becomes richer in ways tied to actual state.

**Why.** Audible recovery reinforces that restoration is occurring throughout the system, not only in visible vegetation.

**Implications.** Audio progression maps to species, water, vegetation, and activity. No single canned "restored" mix. Recovery audio remains dynamic after scenario completion.

**Rejected alternatives.** One victory sound replacing ecological audio. Static ambience by scenario phase. Soundscape changes unrelated to simulated populations.

---

## 12. Non-Goals

Restored in v1.3. These are binding prohibitions, not summaries. They exist as a standing list because a short set of things the project will not do is the instrument that settles scope arguments; the same content distributed across forty entries' rejected alternatives is not.

### N-001 — No ecosystem painter
**Status:** Locked. The player places causes, never finished ecological outcomes. See P-002, A-005, A-006.

### N-002 — No universal optimization puzzle
**Status:** Locked. No single score defines ecological success. See D-002, G-004.

### N-003 — No species collection game
**Status:** Locked. Species are evidence of functioning habitat, not collectibles. See G-003, ES-004, G-007.

### N-004 — No arbitrary hidden rules
**Status:** Locked. Ecological reasoning must remain inspectable. See S-004, P-004, S-008.

### N-005 — No decorative wildlife
**Status:** Locked. Wildlife participates in simulation and, where appropriate, modifies habitat. See E-001, E-005.

---

## 13. Resource and Constraint Model

### RC-001 — Limiting mechanism for repeated intervention
**Status:** Superseded by RC-004

**Question.** What prevents the player from attempting every intervention everywhere, repeatedly?

**Why this must be decided.** E-007 removed readiness hard-locking and cited "meaningful consequence" as the substitute; A-005 lists cost in its preview requirements. Both assume a constraint the register has never recorded. Without one, A-004's contextual consequences have no counterweight: trying everything is strictly better than reasoning.

**Candidate models.** Financial budget. Time or action economy. Ecological disturbance incurred by intervening. Institutional or political capacity. Ecological opportunity — conditions determine when an intervention is appropriate.

**Leading direction.** Ecological opportunity, on the grounds that it keeps attention on ecosystem state, reinforces process-over-outcome, and fits the restoration framing better than abstract currency. This is recorded as a preference, not a decision.

**Known weakness of the leading direction.** Ecological opportunity constrains *when* an intervention is appropriate, not *how many times* it may be attempted. If conditions are suitable, nothing limits repetition; if they are not, failure is already the ecology. It therefore does not by itself satisfy E-007's anti-spam requirement — see RC-003. A secondary scarcity system, or consequence-based limiting, is likely still required.

**Resolution.** RC-004 selects ecological time and opportunity as the primary model and rejects a general-purpose currency economy. RC-003 remains Open only for the narrower consequence of a failed biological introduction.

### RC-002 — Ecological opportunity as primary constraint
**Status:** Superseded by RC-004

**Decision at the time.** Ecological opportunity would be the primary limiting mechanism, recorded as Current.

**Why it changed.** RC-002 was Current while RC-001 was Open on the same question, which was a status contradiction. RC-004 now resolves the question by combining ecological opportunity with simulation-time constraint and rejecting a general-purpose currency economy.

**Affected.** Nothing implemented; the entry existed for one revision.

### RC-003 — Consequence of failed introduction attempts
**Status:** Open

**Question.** What does a failed introduction cost the player or the ecosystem?

**Why this must be decided.** E-007 permits attempting a role under poor conditions and depends on failure carrying weight. If a failed attempt is free, the optimal strategy is to attempt continuously until conditions happen to suffice, which converts the readiness system into a slot machine and contradicts P-004 and N-002.

**Candidate directions.** Ecological consequence — mortality, disturbance to resident populations, competitive displacement, disease or genetic risk. Temporal consequence — a cooldown expressed in ecological rather than wall-clock time. Institutional consequence — a capacity or credibility resource depleted by failure. Informational consequence only, where failure is legible but costless.

**Leading direction.** Ecological consequence rather than bookkeeping, on the grounds that a cost expressed in the ecosystem satisfies D-003 and remains explainable under S-004, whereas a depleting counter does neither. Recorded as a preference, not a decision; the institutional and temporal candidates remain live.

**Owner direction (2026-07-28).** Ecological consequence via the **Allee effect** (NATURAL_PROCESS_MATH §3.4): failure costs the founding population and the ecological time spent, the mechanism is inspectable, and no counter is introduced. Still Open — the criterion requires the strategy comparison, not a preference.

**Priority note.** **C-007** is Locked: arrival is primary; deliberate introduction is secondary and later. This entry stays Open for when introduction ships, but it is not next on the queue.

**Known weakness of the leading direction.** Ecological consequence scales with what is already present. In a degraded preserve — precisely where repeated attempts are most likely — there may be little left to damage, so the consequence approaches zero exactly when the limiting mechanism is most needed.

**Constraints.** The consequence must be explainable after the fact. It must not be so punitive that it reintroduces the hard gate E-007 removed, which is the failure mode to watch.

**Decision required before.** Introduction flow, failure feedback design, E-007 promotion to Locked.

### RC-004 — Ecological time and opportunity constrain intervention
**Status:** Locked

**Decision.** Habitat's primary intervention constraint is ecological time: interventions have windows, durations, recovery periods, and delayed consequences. Ecological opportunity determines when an action is plausible or effective. Habitat has no general-purpose money, energy, or action-point economy.

**Why.** Time and opportunity keep the player's attention on the ecosystem. Currency would make the central question "what can I afford?" rather than "what is this place ready for?" Waiting is not an arbitrary cooldown when it represents season, recovery, establishment, or disturbance regime.

**Implications.** Interventions specify ecological prerequisites and simulation-time consequences under S-009. Some actions may be unavailable outside their physical or seasonal window; that is a property of the world, not a progression lock. Time alone does not guarantee success. Scenario-specific constraints may exist when ecologically or narratively justified, but no universal treasury governs play.

**Rejected alternatives.** Universal money. Regenerating action points. A generic stamina meter. Unlimited immediate repetition. Opportunity with no temporal consequence.

**Supersedes:** RC-001 and RC-002 as the general constraint question. RC-003 remains unresolved because failed introduction may require an additional ecological consequence beyond elapsed time.

---

## 14. Technical Decisions and Open Requirements

### T-001 — Save-state determinism policy
**Status:** Locked

**Decision.** The authoritative simulation is exactly deterministic: identical authoritative state, seed, configuration, timestep schedule, and player inputs produce identical future simulation state.

**Why.** Save comparison, prediction review, debugging, regression testing, and player trust require outcomes that can be reproduced. The working hydrology prototype has demonstrated that this constraint is practical for Habitat's first physical system.

**Implications.** Randomness comes from stored deterministic generators. Update order is explicit. Saves preserve random and historical state. Cross-platform bit identity is required only where the implementation claims compatible replay; otherwise compatibility boundaries must be declared rather than silently diverge.

**Rejected alternatives.** Statistical replay as the default. Wall-clock randomness. Renderer state influencing simulation. "Deterministic where feasible."

### T-002 — Supported player-facing time rates
**Status:** Locked

**Decision.** Habitat uses hybrid real-time simulation with pause, normal play, fast-forward, and high-speed observation. Exact multipliers are tuning parameters rather than constitutional decisions.

**Why.** The world must feel continuously alive while allowing ecological processes spanning days, seasons, and decades to become observable without forcing real-time waiting.

**Implications.** Authoritative outcomes do not change with the chosen rate. At high speed, rendering and audio may sample or abstract state, but simulation causality remains intact. Planning interfaces may pause or slow time. Prediction review can temporarily control rate so a result remains legible.

**Rejected alternatives.** Turn-based time. One fixed real-time rate. Instant unresolved time skips. Changing simulation rules at higher speed.

### T-003 — Save compatibility preserves causal history
**Status:** Locked

**Decision.** A save is valid only if it stores the historical variables needed to continue the same ecological process, not merely the visible snapshot.

**Why.** Hysteresis and slow-system memory would break if loading reconstructed only current surface values.

**Implications.** Save schemas include legacy state and random-state policy where required. Schema migration requires explicit versioning. Visual similarity after load is not a correctness test.

**Rejected alternatives.** Saving only visible populations and terrain. Recalculating history from current conditions. Ignoring old saves when internal state evolves.

### T-004 — Content is data-driven
**Status:** Locked

**Decision.** Preserves, species mappings, climate and terrain presets, scenario goals, field-guide content, and audiovisual expression are defined through data rather than bespoke code whenever practical.

**Why.** The engine should understand what an ecological role does, not hard-code what a wolf, jaguar, or beaver means in one region. Data-driven content is required to validate S-001 and to expand Habitat without duplicating systems.

**Implications.** Engine and content schemas are versioned separately. New preserves reuse shared contracts. Data validation rejects ecologically incoherent definitions. Official mod support is optional; internal extensibility is not.

**Rejected alternatives.** Hard-coded species. One code branch per preserve. Making community modding a prerequisite for the first release.

### T-005 — Layered simulation inspection is an engine capability
**Status:** Locked

**Decision.** Development builds provide selectable inspection layers for major systems such as hydrology, soil moisture, succession, suitability, population flux, connectivity, and disturbance risk.

**Why.** A coupled simulation cannot be tuned or trusted through logs alone. Seeing what the model believes is necessary for debugging, balancing, scientific review, and causal explanation.

**Implications.** Inspectors read authoritative state without mutating it. Player-facing overlays may reuse selected layers but are governed by U-001. Debug visualization is maintained as product infrastructure rather than disposable scaffolding.

**Rejected alternatives.** Log-only debugging. Temporary one-off visualizers. Exposing every internal value permanently to players.

### T-006 — Simulation and rendering are separate
**Status:** Locked

**Decision.** The authoritative world exists as simulation data; rendering, animation, particles, and audio visualize or sonify that state without governing it.

**Why.** Determinism, accelerated time, testing, save comparison, and future renderer changes all depend on a model that can run independently of presentation.

**Implications.** The simulation can execute headlessly. Render frames may be skipped or interpolated; causal simulation steps may not. Visual quality changes cannot alter ecological outcome.

**Rejected alternatives.** Game state stored primarily in scene objects. Frame-rate-dependent ecology. Visual effects that secretly drive simulation.

### T-007 — The reference prototype is Three.js with modular heightfield hydrology
**Status:** Current

**Decision.** The active reference implementation uses Vite, TypeScript, and Three.js. Its first water model is deterministic heightfield surface flow behind a hydrology interface that can admit a different backend later.

**Why.** This stack has already produced visible, editable terrain and deterministic downhill water with a short feedback loop. Heightfield flow answers the immediate product question without making caves, fully volumetric terrain, and voxel fluids prerequisites.

**Implications.** The prototype is evidence and a development base, not an irreversible engine mandate. Simulation modules remain renderer-independent under T-006. A voxel or native backend requires a demonstrated Habitat need rather than speculative scale.

**Rejected alternatives.** Rebuilding immediately in another engine. Full volumetric fluid simulation for the first preserve. Treating the heightfield choice as a permanent ban on voxels.

---

## 15. Deferred but Preserved

### F-001 — Advanced ecosystem-engineer behaviors
**Status:** Deferred

*Why deferred:* implementing many species that alter terrain or hydrology may exceed first playable scope.
*Why preserved:* E-005 requires biology-to-physics feedback. At least one representative engineer and an extensible write-back path must survive the architecture.

### F-002 — Advanced save comparison tools
**Status:** Deferred

*Why deferred:* basic reliable saving matters more than side-by-side timelines and diff views.
*Why preserved:* comparison directly supports experimentation, and its architecture depends on T-001 and T-003.

### F-003 — Additional preserves
**Status:** Deferred

*Why deferred:* Windward Basin must first prove the shared engine and interaction loop.
*Why preserved:* additional preserves are the only way to validate S-001 rather than leaving "one simulation across biomes" untested.

### F-004 — Expanded educational overlays
**Status:** Deferred

*Why deferred:* the world, prediction loop, and essential causal inspectors must work before a broad explanatory layer is built.
*Why preserved:* P-004 and S-008 eventually require deeper explanation than surface visuals alone can provide.

### F-005 — Counterfactual causal replay
**Status:** Deferred

*Why deferred:* reliable counterfactual attribution depends on a mature, stable response model and could otherwise produce false causal certainty.
*Why preserved:* replaying local history with one factor removed is the strongest long-term way for the Field Notebook to answer "why?" using the simulation itself rather than authored prose. U-006 requires the MVP notebook to leave room for this maturity level.

---

## 16. Immediate Decision Queue

Ordered by how many other decisions depend on them.

**Reordered 2026-07-28** after [THESIS.md](THESIS.md) was written. The thesis candidates lead because they decide what the remaining slices are *for*; introduction-shaped questions fall until C-007 settles whether introduction is even the primary verb.

1. **C-004** — force control as an intervention axis (the post-build verb; no entry currently records it).
2. ~~**C-007** — arrival vs introduction as the primary biological verb~~ **Locked** (Slice 12 / owner Pass — earned conditions).
3. **C-005** — branch-and-compare as a core instrument rather than deferred tooling.
4. **G-007** — whether completion is permanent history, revocable state, or separate from ongoing stewardship.
5. ~~**C-001** — cheap GW/baseflow store~~ **Locked** (Slice 8b / `baseflow-persist`).
6. **C-003** — stochastic vs authored climate; owner direction recorded, P-006 fairness evaluation outstanding.
7. **C-002** — GEO-002 spatial cost test (ratify or replace Slice 8 reading).
8. **C-006** / **C-008** — sculpting abundance and the response-latency budget; both Tier-P measurable before they need an owner.
8b. **C-009** — substrate differentiation (the "sand" of the thesis); gated behind the displaced-mass closeout.
8c. **C-010** — legacy substances / contaminant load; gated behind C-009, but it is the missing substrate for S-007 and S-008 and the toxic-site scenario premise, so C-009's material table must not foreclose it.
8d. **C-011** — real-world intuition as the design contract; binds every future mechanic, so decide it early and cheaply.
8e. **C-012** — preserve extent and resolution from the habitat-mosaic criterion; blocks Slice 9, which needs distinguishable habitats to arrive into.
8f. **C-013** / **C-014** — undo boundary, and how audio derives from state. C-014 is overdue: three Locked entries with no plan.
8g. **C-015**…**C-019** — island maritime direction (sea as base level; tidal envelope; wave exposure; salinity; island biogeography). Filed 2026-07-30. C-015 place reading Pass (2026-07-30); **W-001** supersession still an owner call.
8h. **C-020** — atmospheric precip delivery (clouds → rain/snow/sleet from wind, moisture, heat). Filed 2026-07-30 from island-brief Pass notes. **Slice F** lands a lite path (climate-mean rain + orographic wind); full phase/clouds later — keep C-004 force panel until then.
9. **RC-003** — consequence of failed biological introduction; owner direction recorded (Allee); **priority lowered** — introduction is secondary after C-007 Locked.
10. **A-005 and A-006** — siting interaction prototype and the legibility boundary against N-001; now also bounded by C-004's regimes-not-smiting line.
11. **U-005** — camera and scale prototype proving whole-preserve readability and local inspection.
12. **U-006** — MVP Field Notebook contract: event vocabulary, scale selection, uncertainty language, and supported questions.
13. **ART-001** — visual prototype validating scientific impressionism against hydrology and ecological-state readability.
14. **E-008 and E-009** — role-resolution and inferred-readiness prototypes; E-009 rises if C-007 makes readiness the arrival gate.

Until resolved, these are Open or hypothesis-Current and must not be treated as locked implementation requirements. Situation-Current entries (**T-007**, **W-001**) are not on this queue; they carry review triggers in DECISION_CONFORMANCE.md.

---

## 16.5 Research candidates (not decided)

Filed from [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md) §9, the multi-state water survey in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md), and — for **C-004**…**C-008** — [THESIS.md](THESIS.md), the owner-authored origin and loop statement written 2026-07-28. **Open — do not treat as Locked** unless an entry below has been promoted.

**On the thesis candidates.** C-004…C-008 exist because the thesis describes a loop the register never recorded: build a form, then control the *forces* acting on it, run time, and look. Where the thesis and an entry disagree, the entry still governs — but the disagreement is a signal to revisit the entry, not to discard the thesis.

### C-001 — Cheap groundwater / baseflow store
**Status:** Locked

**Decision.** Habitat includes a cheap per-cell groundwater storage field with soil recharge above field capacity and linear-reservoir baseflow preferential on high-accumulation cells, so inter-storm channel persistence is a storage loop (H-001, H-004). The compartment shape follows GWSWEX SW/UZ/GW study notes; Richards, Celia, and MODFLOW are not shipped in-browser.

**Why.** Without a GW store, dry spells empty channels by ET and infiltration alone, so the watershed cannot retain history between storms. A linear reservoir is enough to prove the storage story under T-001 / T-006 without iterative solves.

**Implications.** `groundwater.storage` is legacy (T-003). Water-balance residuals must include the GW compartment. Process order keeps soilWater before groundwater so baseflow survives into the next event band.

**Rejected alternatives.** Richards/Celia/MODFLOW in-client (EXTERNAL_REFERENCES ban). Watershed-only scalar store (too coarse for channel preference). Alphabetical process sorting that re-infiltrated baseflow before the event band.

**Evidence.** Probe `baseflow-persist`: after wet→dry with storm pulse drained to the boundary ledger, channel wetness with GW ≈ 0.011 vs 0 without; GW sum ≈ 30; H-004 relative residual < 1e-4. Artifact: `docs/evidence/baseflow-persist.baseline.json`.

**Constraints.** T-001 determinism; T-006 headless authority; GEO-002 earn-its-cost; EXTERNAL_REFERENCES ban on in-browser Richards/Celia/MODFLOW and ML water-cycle cores as authority.
### C-002 — GEO-002 spatial cost test
**Status:** Open

**Question.** Does dynamic geomorphology run only where contributing area / intervention justifies cost, while soil pools run everywhere? (NATURAL_PROCESS_MATH §9.5.)

**Constraints.** GEO-002 Locked requires a spatial answer; Slice 8 already *implemented* channel-gated erosion + everywhere production as a reading.

**Leading direction.** Promote the Slice 8 reading to an explicit decision after a short review, or supersede with a different spatial rule. Until then agents must not invent a second erosion law.

### C-003 — Stochastic vs authored climate forcing
**Status:** Open *(owner direction recorded 2026-07-28; evaluation outstanding)*

**Question.** Is weather stochastic-but-reproducible under a stored seed, or authored per scenario? (NATURAL_PROCESS_MATH §9.1.)

**Constraints.** T-001 allows seeded RNGs; P-006 prediction fairness and G-005/G-006 completion evaluation both care.

**Owner direction (2026-07-28).** **Authored schedules**, not stochastic arrivals — deterministic by construction, prediction unambiguously fair, scenarios validatable. [THESIS.md](THESIS.md) §4 refines *who* authors: the **player at runtime**, setting a rainfall regime, with generation seeded and reproducible so branches stay comparable (**C-004**, **C-005**). Scenario-authored schedules remain the other legitimate source.

**Remaining to close.** The criterion in DECISION_CONFORMANCE §3 also requires evaluating the choice against P-006 prediction fairness on one scenario. Until then: still no free-running stochastic storm arrivals, not even behind a flag.

### C-004 — Force control as an intervention axis
**Status:** Open

**Question.** After the initial build, is the player's primary verb **setting which natural forces operate and at what intensity** (rainfall regime, erosion, fire, season, time rate) rather than acting at a place? Every existing intervention entry — A-005 siting, A-006 pulses — describes a *spatial* act. [THESIS.md](THESIS.md) §4 describes a *process* axis that no entry records.

**Constraints.** D-001 (nature is the protagonist) and N-001 (no ecosystem painter) survive only if forces are **regimes and pulses, not targeted smiting** — set the rainfall, site an ignition, never drag a storm onto a chosen hill. RC-004 already rejects an action economy, so dials need not be rationed. T-001 determinism must hold across force changes.

**Leading direction.** Yes — a force/regime control surface alongside spatial siting, with the targeting ban stated explicitly. Not Locked until a slice demonstrates the surface without collapsing into god-mode.

### C-005 — Branch-and-compare as a core instrument
**Status:** Open

**Question.** Should forking one world and running it twice under different forces ("same castle, more rain") be a **core mechanic** rather than the deferred convenience currently filed as F-002 and F-005? THESIS §7.

**Constraints.** T-001 determinism and T-003 save compatibility already supply the hard part; P-005 (hypothesis-Current) exists precisely for experimentation. A branch must not become a scoring or optimization surface (N-002) — comparison is for understanding, not for finding the best run.

**Leading direction.** Promote from Deferred to a real mechanic; a run should be reproducible and shareable from seed + force settings. Blocked from Locked until P-005's criterion is discharged and one comparison UI exists.

### C-006 — Sculpting is abundant; scarcity lives in ecological time
**Status:** Open

**Question.** Is terrain sculpting **abundant and tactile** (RCT3 brush — you do it constantly, undo is free), against a register tone that treats intervention as rationed and deliberate?

**Constraints.** N-001 bans painting *outcomes*; terrain is a cause, so abundance does not breach it. RC-004 already names ecological time — not action count — as the constraint, which supports abundance. A-005's "site a cause" framing stays true; only its implied scarcity is at issue.

**Leading direction.** Abundant sculpting, scarce time. Requires no register supersession — A-005 and RC-004 already permit it — but the tone should be stated so agents stop inferring rationing.

### C-007 — Arrival as the primary biological verb
**Status:** Locked

**Decision.** The primary biological mode is **colonization / arrival**: the player creates conditions; life appears when those conditions suit it. Deliberate introduction (E-007, E-008, RC-003) is secondary and later. The limiting-factor / HSI spine is the **arrival gate**, not an inspector layer. Appearance of life must mimic real life — earned by place, never an authored spawn.

**Why.** D-001: the player creates conditions; natural systems do the work. THESIS §5: you dig the moat and something moves in because the place suits it. Owner Pass (2026-07-29): appearance should mimic real life, therefore through earned conditions. Authored unlock checklists and random spawn tables fail N-004 and the thesis contract.

**Implications.** No introduction/place-species tool is required for the first biological payoff. Establishment couples to inspectable suitability (monotone in the limiting input). Dispersal pressure is a real path — occupancy is never copied from HSI alone. RC-003's failed-introduction consequence is deferred until introduction is built as a secondary mode. E-009 readiness stays inferred from state.

**Rejected alternatives.** Deliberate introduction as the primary biological verb. Occupancy painted from HSI with no dispersal. Hidden readiness unlock tables (Viva Piñata checklist form). Ambient or unsaved randomness as the arrival mechanism while C-003 remains Open for climate.

**Evidence.** Slice 9 HSI gate + Slice 12 occupant. Probe `arrival-earned`: suitable biomass = 2.5, unsuitable = 0, `earned = 1`, `hashMatch = 1`. Tier-P `occupantEncodingDelta(0, 0.45) > 0.15`. Owner verdict: earned conditions. Artifacts: `docs/evidence/arrival-earned.baseline.json`, `docs/slices/12-composition.md`, `docs/playtests/12-arrival-earned.md`.

**Constraints.** D-001, ES-006, E-009, W-003 / E-004, T-001, T-003, T-005, N-001, N-004.

### C-008 — Intervention → visible response budget
**Status:** Open

**Question.** Is there a stated maximum delay between a player edit and a visible world response, below which the "mess with it" feeling dies? In RCT3 the land moves instantly; in Habitat a berm's consequence is mediated by the sim clock.

**Constraints.** S-009 keeps duration in simulation time and T-002 fixes the offered rates, so the budget must be expressed as *sim-time to visible delta at a stated rate*, not as wall-clock. Tier-P measurable (VERIFICATION_POLICY §3) — this is a proxy question, not a taste question, until the proxy is green.

**Leading direction.** State a budget per interaction class (sculpt, force change) and make it a Tier-P check on observable slices. No value proposed yet; measure first.

### C-009 — Substrate differentiation
**Status:** Open

**Question.** Should the single undifferentiated soil (depth + moisture, bedrock derived — SIMULATION_MODEL §3.1) gain a **material class** — sand, clay, loam, gravel, rock, organic — so that the same rain, the same slope, and the same berm behave differently depending on what they are made of? [THESIS.md](THESIS.md) §2.1: "sand" in the thesis means every substrate nature has to work with.

**Constraints.** GEO-002 earn-its-cost: one added per-cell field is cheap, but each process that reads it (infiltration, erosion resistance, slope stability, soil production, rooting) must justify the coupling rather than sprinkle multipliers. S-006 already establishes that geological history sets the substrate ecology inherits, and the tools entries already list substrate among player-influenceable levers — so the concept is sanctioned; only the differentiation is new. T-004 wants the material table data-driven, not hard-coded. Must not become a paint-a-material tool (N-001) — substrate is inherited from geology and redistributed by processes.

**Leading direction.** Yes, minimally: one owned per-cell material class plus a small data-driven property table (infiltration rate, erodibility, cohesion, water retention), consumed first by the processes that already exist rather than by new ones. Not Locked until a slice shows two substrates producing visibly different outcomes from the same intervention.

**Coupled work.** Berm/dig ↔ `soil.depth` displaced mass (BUILD_GUIDE §4.1) is a prerequisite in spirit: if substrates are the material, an edit must move material. Design the material table so **C-010** can attach a mobile substance to it later.

### C-010 — Legacy substances (contaminant load)
**Status:** Open

**Question.** Should the soil column carry one or more **mobile, transformable substances** — a contaminant load being the motivating case — that travel with water, are taken up or immobilised by vegetation, degrade or sequester over decades, and gate habitat suitability until they fall?

**Motivation.** The scenario premise behind much of the older restoration language: *clean up a toxic waste site using natural processes* ([THESIS.md](THESIS.md) §3.1). It is also the missing substrate for two Locked entries — **S-007** (hysteresis is fundamental) and **S-008** (hysteresis must be legible) — whose promotion criterion requires a legacy condition that blocks recovery after its cause is gone. Today the only such field is `soil.porosity`'s compaction memory.

**Constraints.** Legacy by SIMULATION_MODEL §12's definition — not reconstructible from current forcing — so it is save-invalidating (T-003) and belongs in the decadal band. Transport must ride the existing water mass balance rather than introduce a second one (H-004, GEO-002 earn-its-cost). Uptake couples to vegetation, which already exists. Must not become a cleanup *tool* the player applies to a cell (N-001, D-001): the player sets conditions; the landscape processes the substance. Scenario objectives read it through arrival and persistence (**C-007**, G-005), never as a raw score (N-002).

**Leading direction.** Yes, but not before **C-009** — substance and substrate are one design, and a material table that cannot carry a mobile quantity would have to be rebuilt. Deliberately deferred until scenarios are near; recorded now so the substrate work does not foreclose it.

### C-011 — Real-world intuition is the instrument
**Status:** Open

**Question.** Is it a binding constraint that **every substrate, force, and mechanic have a real-world referent a person can reason about without instruction** — so that the player's existing understanding of how water, soil, slope, and plants behave is the tool they play with, rather than a rule set learned from inside the game? ([THESIS.md](THESIS.md) §2.2.)

**Why it is not already covered.** N-004 bans *arbitrary hidden* rules and S-004 requires explainability, but both are stated from the world's side — the rule must be inspectable and non-capricious. This entry states the same requirement from the **player's** side: a rule can be perfectly inspectable and still be something nobody could have anticipated, which breaks the contract just as thoroughly. U-002 permits simplifying presentation but not ecological truth; this explains *why* that line sits where it does.

**Constraints.** Applies to mechanics, not to presentation — stylisation is free (ART-001, U-002). It does not require quantitative accuracy: intuition is directional (*water goes there*, *that slope goes first*), so the obligation is that the **direction** of every outcome be reasonable from ordinary experience, not that the numbers match a field measurement. It must not become an argument for higher fidelity everywhere (GEO-002 earn-its-cost) — a simpler model that preserves direction serves this entry better than a complex one that obscures it.

**Leading direction.** Yes, binding. The strongest single consequence: **no invented materials or forces**, and no mechanic whose behavior must be taught before it can be predicted. Not Locked until an unfamiliar viewer demonstrates it — see DECISION_CONFORMANCE §3, which reuses P-006's behavioral apparatus.

**Relationship to P-006.** Prediction is how this entry is *measured*. If C-011 holds, commit-and-compare is a test of the player's knowledge of the world; if it fails, prediction degrades into guessing at game rules, and P-006's behavioral half will never pass either.

### C-012 — Preserve extent and resolution follow habitat mosaic
**Status:** Open

**Question.** Are preserve extent and cell size **derived** from one criterion — *several distinct habitats coexist and are simultaneously readable in the player's window* ([THESIS.md](THESIS.md) §2) — rather than chosen as engine parameters?

**Why now.** The build ships `gridSize: 96`, `worldSize: 48` — a 48 m plot at 0.5 m cells. That is a single patch. No wet hollow *beside* a dry slope *beside* a channel margin can emerge at that extent, which means W-002's "one continuous landscape with emergent regions" has nothing to emerge into and U-005's whole-preserve-versus-local-inspection tension does not yet exist.

**Constraints.** W-002 (emergent regions), U-005 (readable whole, inspectable local), **C-011** — scale must be real, since intuition about how far water travels and how big a wetland is comes from the world. **C-008** response budget and the unmeasured Tier-M performance claim both bound it from the other side: extent × resolution sets step cost, and a preserve that cannot answer a sculpt promptly fails a different requirement. GEO-002 earn-its-cost.

**Leading direction.** Set extent from the mosaic criterion first, then derive cell size from the **smallest feature that must read** — likely channel width or wetland margin — and accept whatever grid that implies, subject to a measured step-time budget rather than a guessed one. Both current values are almost certainly too small; neither should be changed without the probe that shows the new size still steps fast enough.

### C-013 — Undo as an affordance of abundant sculpting
**Status:** Open

**Question.** Does abundant sculpting (**C-006**) require an undo, and what exactly may be undone?

**Why now.** There is no undo anywhere in the build. RCT3's freedom to keep shaping — the origin experience — rests on being able to take an edit back without ceremony, and the register does not mention undo at all.

**Constraints and the hard part.** Undo of an **edit** is uncontroversial. Undo of **elapsed ecological time** is not: S-007 makes hysteresis fundamental and RC-004 makes time the real constraint, so a world where the tide can be un-run contradicts the thesis directly — the sand castle whose collapse you can rewind is not the same object. T-001 determinism and the P-005 save machinery supply the natural mechanism, since a restore point is the same construct as a branch (**C-005**).

**Leading direction.** Undo applies to **edits before time advances**; once the world has run, the way "back" is restoring a branch point, not rewinding history. That keeps sculpting frictionless and keeps consequence real. Not Locked until the boundary is built and does not read as a punishment.

### C-014 — How audio derives from simulation state
**Status:** Open

**Question.** Is ecological sound **procedurally derived** from registry fields (moisture, cover, flow, fauna presence) or **authored samples triggered** by state thresholds — and how does that stay deterministic (T-001)?

**Why now.** **AUD-001** (sound reflects ecological state), **AUD-002** (silence has ecological meaning) and **AUD-003** (recovery is audible) are all **Locked**, and none of them has ever appeared in a slice, a build plan, or a line of code. This is the only place in the register where locked decisions have never touched the roadmap. It also bears on THESIS §8: twenty seconds of silent water reads dead however good the erosion is, so the clip test cannot pass without an answer.

**Constraints.** T-006 — audio is an observer and must never write authoritative state; T-001 — anything stochastic in the audio layer must not touch sim streams. AUD-002 means quiet is a *signal*, so an ambient bed that never drops out breaches it. U-002 permits stylisation.

**Leading direction.** Sampled sources selected and mixed **from field values**, with silence as a first-class state rather than an absence of assets. Audio remains a pure observer of the registry. Not Locked until one field audibly drives one source and dropping that field produces meaningful silence.

### C-015 — The world is an island; sea level is global base level
**Status:** Open

**Question.** Is the preserve an **island** whose drainage exits through a global sea level (a force dial), rather than a closed map edge with heuristic perimeter pour points — and does that reframe supersede **W-001**'s Windward Basin reference?

**Why now.** SIMULATION_MODEL §10.1 treats the map edge as an artifact; §10.2's authored outlets were never built; Slice 8c shipped provisional perimeter minima instead. An island supplies an honest outlet every player already understands (C-011), answers C-012 with geometry (shore → slope → ridge), and gives C-004 a second non-spatial dial. THESIS §8's clip test favors a silhouette against water.

**Constraints.** Sea level is a **regime**, never aimed at a cell (THESIS §9 / C-004). Opt-in on WorldState so existing closed-basin probes and golden hashes stay untouched. Sea datum stays **above** `elevationFloor` so dig/soil clamps do not change. No waves, tides, salt, or coastal erosion under this entry alone — those are C-016…C-018. W-001 is Current, not Locked: supersession is an **owner call**.

**Leading direction.** Yes. `seaLevel` as a global option; ocean cells absorb surface water into `ledger.oceanExchange`; Priority-Flood seeds from the ocean; `generateIsland` is the default playable terrain. Not Locked until `island-drainage` proves conservation and shoreline legibility without inspector, and the owner ratifies W-001.

### C-016 — Tidal forcing as a band-appropriate envelope
**Status:** Open

**Question.** When tides enter, do they arrive as a **mean high / mean low water envelope** (and intertidal zone derived from it), rather than as an instantaneous tidal phase advanced every event step?

**Why now.** A semidiurnal tide is ~50 event steps at 15 min/event: resolvable at 1×, invisible at 16×, meaningless at decadal. Phase-at-all-bands is not buildable under S-009. The thesis already uses "the tide" as a metaphor for fast-forward (THESIS §4) — a literal tide must not muddy that metaphor without an explicit owner call.

**Constraints.** C-015 must land first. Envelope is authored / player-set (C-003 direction), deterministic (T-001), and a force dial with no cell targeting (C-004). Must not require a second hydrology engine.

**Leading direction.** Envelope only — MHW / MLW as globals; intertidal cells are those between them. Instantaneous phase is rejected. Not Locked until one intertidal zone is inspectable and the owner settles the metaphor conflict.

### C-017 — Wave exposure contributes to geomorphology; never a second sediment authority
**Status:** Open

**Question.** Is coastal wave work a **derived exposure field** (fetch × `climate.windVector`) that **contributes** erosion/deposition into the existing geomorphology owner, rather than a shallow-water-equations coastal engine?

**Why now.** Full maritime direction needs beaches and shore change (Slices 18–19), and EXTERNAL_REFERENCES bans coastal SWE suites as fidelity Habitat does not need. `climate.windVector` is already registered (SIM §3.8) and unused — the hook exists.

**Constraints.** T-006 / GEO-002: one sediment authority. Ban shallow-water equations in-browser the way C-001 banned Richards. Exposure is directional and derived, not painted. C-015 required.

**Leading direction.** Yes — one-line coastline / fetch-exposure rule shape only; contribute Δelev / Δdepth through the geomorphology inbox (§11.2). Not Locked until a paired sheltered-vs-exposed shore diverges under one wind regime without a second sediment writer.

### C-018 — Salinity as the first mobile legacy substance
**Status:** Open

**Question.** Is **salinity** the first instance of C-010's mobile, transformable soil-column substance — gating habitat near the shore and providing the hysteresis substrate S-007 / S-008 need — before a contaminant scenario is built?

**Why now.** C-010's motivating case is poison; an island makes salt the everyday legacy load. It unblocks S-008 legibility ("the ground still tastes of the sea") without waiting on the toxic-site campaign, and couples naturally to C-015 / C-016.

**Constraints.** Same as C-010: rides the water ledger (H-004), save-legacy (T-003), no cleanup tool (N-001), gates arrival (C-007) rather than scoring (N-002). Prefer after C-009's material table if that lands first; may proceed with a single salt field if C-009 remains Open.

**Leading direction.** Yes — one `soil.salinity` (or equivalent) field, ocean source at the shoreline, dilution by freshwater, suitability penalty. Not Locked until a paired freshened-vs-salty hollow shows divergent arrival under one seed schedule.

### C-019 — Island biogeography reframes the fixed species pool
**Status:** Open

**Question.** On an island preserve, is pool richness **derived from area and isolation** (MacArthur–Wilson), with overseas dispersal as the arrival path, rather than W-003's fixed curated pool copied from a continental preserve?

**Why now.** Slice 12's perimeter seed source (`seedSourceStrength: 40`) assumes an off-map mainland ring of seed rain. That is wrong on an island: seeds arrive over water, sparsely, and richness should track island size. C-007 Locked already prefers earned arrival; this entry asks what the *source* looks like when the world is surrounded by sea.

**Constraints.** W-003 is Locked — this reframes how the pool is *sized and sourced*, not whether a pool exists. T-001: overseas arrivals stay seeded/authored (C-003). No random spawn table (N-004). C-015 required.

**Leading direction.** Fixed functional-type catalogue still curated; which types are *eligible* and how hard seed pressure arrives depends on island area / isolation parameters. Not Locked until perimeter seed rain is replaced by an over-water kernel and a smaller island earns fewer occupants under identical regimes.

### C-020 — Atmospheric precip delivery (clouds from wind, moisture, heat)
**Status:** Open

**Question.** Should precipitation eventually arrive as **weather the atmosphere makes** — clouds that deliver rain, snow, or sleet from wind, moisture, and heat — rather than as a global rain-regime dial that dumps water everywhere at once?

**Why now.** Owner Pass on the island brief batch (2026-07-30): the rain dial **works for now** but does not feel natural. THESIS §2 / C-011 want everyday weather intuition as the instrument; uniform regime rain fails that test even when mass balance and force-dial mechanics are correct.

**Constraints.** Must not become cell-targeted smiting (C-004 / THESIS §9). Determinism (T-001) and prediction fairness (P-006) still bind — no free-running stochastic storm arrivals while **C-003** is Open; any atmospheric generator is seeded / authored at the climate layer. Phase of water (rain/snow/sleet) needs real-world referents (N-004), not invented materials. Keep the existing rain-regime surface until a slice demonstrates atmospheric delivery without collapsing stewardship into a cloud painter.

**Leading direction.** Yes — a **lite** path may land in **Slice F** (climate-mean rainfall dial + orographic wind modulation so geography places precip; no cell targeting). Full cloud / snow / sleet phase remains later and does not claim Locked until that criterion is met. Not Locked until one build shows precip phase and placement attributable to atmospheric state (not to a place the player clicked), with mass balance closed and no cell targeting.

---

## 17. Document Authority

This register governs GAME_DESIGN_OVERVIEW.md, SIMULATION_MODEL.md, HYDROLOGY_SPEC.md, PLAYER_INTERACTION_SPEC.md, SPECIES_AND_HABITAT.md, SCENARIO_AUTHORING.md, FIELD_NOTEBOOK_SPEC.md, UI_INFORMATION_ARCHITECTURE.md, ART_DIRECTION.md, MVP_SCOPE.md, BUILD_GUIDE.md, and DECISION_CONFORMANCE.md.

**[THESIS.md](THESIS.md) is not on that list, deliberately.** It is a *source* document — the owner's statement of where Habitat came from and what it is trying to feel like — not a derived one. This register still wins any procedural conflict: an entry is not overridden by the thesis. But a conflict between them is evidence that the entry was written without the vision in view, and the correct response is to revisit the entry, not to ignore the thesis. Candidates **C-004**…**C-009** in §16.5 exist precisely because the thesis exposed decisions this register had never made.

Derived documents are named by function. A document should not be named after the tool used to produce or consume it, since tool choice is not a decision this register makes and renaming under a tool switch would break every reference.

When a derived document conflicts with this register, either the derived document is corrected or the register is explicitly superseded. No document silently wins by being newer.
