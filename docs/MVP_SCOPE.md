# Habitat — MVP Scope

> **Status:** Working draft  
> **Role:** Defines what the first playable Habitat proves — as a **joint** map of simulation interdependencies and game interdependencies  
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md). Slice order may change; the dual-graph rule does not. Detailed execution lives in [BUILD_GUIDE.md](BUILD_GUIDE.md). Architecture detail lives in [SIMULATION_MODEL.md](SIMULATION_MODEL.md).

---

## 1. The dual-graph rule

Habitat is a coupled product. Interesting behavior lives in **feedback**, not in isolated systems. That is true twice:

| Graph | What couples | A loop is real when… | Done when… |
|---|---|---|---|
| **Simulation** | Fields and processes | A changes B and B changes A *in state* | Invariant + golden hash (T-001) |
| **Game** | Attention, verbs, readable change | The player can notice, expect, or intervene and *care* about the result | Observable without an inspector (D-006, P-003) |

**Rule.** Every slice names **both** halves. A slice that only extends the sim graph is infrastructure (allowed; must say so). A slice that only extends the game graph over fake state is forbidden (S-004, N-004).

**Anti-patterns.**

- Sim-only ladder → beautiful water toy, no verb, playtest scores stay low.  
- Game-only ladder → UI over placeholders that become load-bearing lies.  
- Closing both directions of a sim loop in one slice → cannot tell which half is wrong.

---

## 2. Target game graph (player loops)

The player fantasy is steward, not god (Design Wiki). Engagement is attention (D-006), not action throughput.

```mermaid
flowchart LR
  build[Build the form — sculpt C-006] --> forces[Choose the forces C-004]
  forces --> advance[Run time — the tide T-002]
  advance --> look[Look at what became of it]
  look --> forces
  look --> build
  observe[Observe world] --> expect[Form expectation]
  expect --> predict[Commit prediction P-006]
  predict --> advance
  advance --> compare[Compare expected vs actual]
  compare --> observe
  observe --> build
  look --> branch[Run it again, different forces C-005]
  compare --> explain[Optional notebook U-006]
```

The outer ring — **build → forces → time → look** — is the thesis loop ([THESIS.md](THESIS.md) §4). The inner ring is the prediction loop, and the two are the same activity seen from different distances: thinking about how tides and gravity work *is* forming an expectation. Prediction is not a feature attached to this game; it is the mental act the sandcastle is made of.

| Edge | Register | MVP? | Notes |
|---|---|---|---|
| Build the form — abundant sculpting | A-005, **C-006** | **Yes** | Shipped Slice 5b (berm/dig); island canvas retuned Slice F. Unrationed; scarcity is ecological time (RC-004) |
| Choose the forces — regime control | **C-004** | **Yes (Locked)** | Force panel: climate-mean rainfall, sea level, wind (Slice F). Full weather phase (**C-020 Locked**). Not a dashboard — look at the world |
| Return visit — see what became of it | **C-008**, GEO-002 | **Done** | Slice 8c Tier-O **Pass** (batch-living-return 2026-07-30). C-008 budget number still owner |
| Run it again, different forces | **C-005** | **Post-MVP tooling** | Locked tooling (not core) — scaffold Done |
| Observe ↔ readable change | P-003, U-003, ART-001 | **Yes** | World is primary visualization |
| Expect → commit prediction | P-006 | **Yes** | Load-bearing; not polish |
| Intervene as cause, not outcome | A-005, N-001 | **Yes** | One siting verb on water/terrain is enough |
| Time rate as attention scale | T-002, S-009 | **Yes** | Already in prototype |
| Layered inspect | T-005, U-001 | **Dev yes / player selective** | Dev overlays now; player overlays later |
| Field Notebook | U-006 | **No** | Locked v2.0.12 — post-MVP unless playtest demands more |
| Roles / introductions | E-007, RC-003 | **No** | Needs Slice 11-class systems |
| Scenarios / completion | G-002, G-007 | **No** | After sandbox loop works |

---

## 3. Target simulation graph (world loops)

Structural vs dynamic water, bands, and ownership: [SIMULATION_MODEL.md](SIMULATION_MODEL.md). Process math candidates: [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md).

```mermaid
flowchart TB
  terrain[terrain.elevation] --> structure[flow structure D8]
  structure --> watershed[watershed labels]
  climate[rain / climate] --> surface[water.surfaceDepth]
  terrain --> surface
  surface --> soil[soil.moisture]
  soil --> surface
  soilDepth[soil.depth] --> soil
  soil --> gw[groundwater C-001]
  gw --> surface
  soil --> veg[vegetation]
  veg --> roughness[surface.roughness / infiltration]
  roughness --> surface
  veg --> wildlife[roles / populations]
  wildlife --> structureObstruction[structure.obstructionHeight]
  structureObstruction --> structure
```

| Edge | Register | MVP? | Notes |
|---|---|---|---|
| Terrain → flow structure | H-002, W-002 | **Yes** | Slice 3 landed |
| Rain → surface flux | H-001 | **Yes** | Slice 1–2 |
| Surface → soil storage | H-003 | **Yes** | Slice 4 landed |
| Soil → vegetation (one-way) | ES-001 | **MVP stretch** | Slice 5 — first green |
| Vegetation → water (return) | D-003, E-005 partial | **MVP core** | Slice 6 — first true two-way ecology |
| Priority-flood / depressions | H-003 | **Yes** | Slice 4b Done (agent) |
| Soil depth / geomorphology | S-006, S-007, GEO-002, C-002 | **Post-MVP** | Slice 8 Tier-M; **C-002 Locked** |
| Groundwater / baseflow | H-001, H-004, **C-001** | **Done** (Locked) | Slice 8b — `baseflow-persist` |
| Fire / succession / populations | ES-*, E-* | **No** | After limiting-factor spine (Slice 9+) |
| Full beaver write-back | E-005, F-001 | **Architecture yes, breadth no** | Path must exist; one later engineer |

---

## 4. Joint slice map

Each row closes one **named** sim edge and one **named** game edge (or labels infrastructure). Sequence follows the incremental report with one deliberate reorder: **prediction (game) may attach to water before vegetation returns to water (sim Slice 6)** — register P-006 says prediction is load-bearing and water is enough once structure exists.

| Slice | Sim edge closed | Game edge closed | Status |
|---|---|---|---|
| 0–1 | — (scaffold) | Observe water motion | Done |
| 2 | Infrastructure: WorldState, registry, no-flow, clock | Time rate as attention scale | Done |
| 3 | Terrain → watershed / accumulation | Read structure via inspector | Done |
| 4 | Surface → soil moisture | Read soil memory (darkening) | **Done — playtest Pass** |
| **4b** | *(optional)* Priority-flood depressions | Ponds that stay honest | **Done** (agent; hand-derived Priority-Flood fixtures) |
| **5a** | — | **Predict water path / pool** (P-006 mechanical) | **Done — playtest Pass** |
| **5b** | Player edits terrain (berm / dig) | **Site a cause** (A-005) | **Done — playtest Pass** |
| 5 | Soil → vegetation (one-way) | Green follows wet ground | **Done — playtest Pass** |
| 6 | Vegetation → roughness / infiltration → water | See hydrograph change from plant cover | **Done — playtest Pass (sim MVP)** |
| **P** | — (observers / FX only) | **Volume without voxels** — cage, cursor, motion-in-time | **Done — Tier-P**; optional [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md) |
| **8** | Soil depth legacy + geomorphology | Thin soil holds less; channels erode without cover | **Done — Tier-M** (Tier-O deferred) |
| **8b** | Soil ↔ GW ↔ baseflow (C-001) | Streams persist between storms | **Done** — C-001 Locked; BUILD_GUIDE §4.3 |
| **8c** | — (observers, encoding, time) | **The return visit** — build it, run time, see what nature did | **Done** — Tier-O Pass (batch 2026-07-30) |
| **9** | Limiting factors / HSI spine | Inspect why a patch is limited — the **arrival gate** (**C-007**) | **Done** (agent) — BUILD_GUIDE §4.4; C-007 Locked via Slice 12 |
| **10** | Fuel → fire disturbance → succession restart | Site a burn as a cause | **Done — Tier-M** (Tier-O deferred; authored ignition; **C-003** Open) |
| **11** | Insolation / Beer–Lambert light → succession trajectory | North/south, burned/unburned, wet/dry as different futures | **Done — Tier-M + Tier-P** (Tier-O deferred) |
| **12** | Arrival / first occupant (**C-007** Locked) | Something appears because the place suits it | **Done** — BUILD_GUIDE §4.8; owner Pass |
| **13** | Biology → physics integration | Living hollow meets the next storm differently | **Done** — BUILD_GUIDE §4.9; Tier-O Pass ([batch-living-return.md](playtests/batch-living-return.md)) |
| **14** | Scenario objective scaffold (G-002) | Finite objective over the same sculpt → forces → time loop | **Done** — Tier-O Pass ([batch-island-brief.md](playtests/batch-island-brief.md)) |
| **16** | Sea level + island (**C-015 Locked**) | Shape an island; sea is the outlet / force dial | **Done** — Tier-O Pass; W-001 Superseded (ballot B 2026-07-30) |
| **15** | Scenario brief chrome | Accept a brief; see window hold without inspector | **Done** — Tier-O Pass ([batch-island-brief.md](playtests/batch-island-brief.md)) |
| **F** | Force panel + climate-mean rain + orographic wind (**C-020** lite) | Sculpt → set climate forces → watch the place | **Done** — BUILD_GUIDE §4.11b (agent; no Tier-O) |
| **17** | Tidal envelope / intertidal (**C-016**) | MHW/MLW force dial; intertidal zone | **Done** — agent; C-016 Open (owner metaphor batched) |
| **18** | Wave exposure + coastal erosion (**C-017**) | Windward shore changes via geomorphology | **Done** — agent; C-017 Open (owner shore-legibility batched) |
| **19** | Beaches / longshore deposition (**C-017**) | Windward scours; lee receives | **Done** — agent; Tier-O shore-legibility batched |
| **20** | Salinity (**C-018**) | Freshened vs salty hollow earns differently | **Done** — Tier-O Pass (batch-salt-overseas) |
| **21** | Island biogeography (**C-019**) | Overseas arrival; small vs large island | **Done** — Tier-O Pass (batch-salt-overseas) |
| **S** | Substrate contrast (**C-009**) | Sand / clay / rock; geological deposit | **Done** — owner legibility Pass; Lock still owner |
| **R** | Rain-feel mid-path (**C-020**) | Shower cadence + precip cue | **Done** — D-007 clip Pass 2026-07-30 (full clouds later) |
| **A+** | Recovery audible (**AUD-003**) | Second ambient bed from `veg.cover` | **Done** — BUILD_GUIDE §4.19 (agent; C-014 still Open) |
| — | Field Notebook UI (**U-006**) | Bounded causal explanation chrome | **Done** — BUILD_GUIDE §4.20; **Locked** v2.0.12 |
| — | Full C-020 clouds / precip phase | Weather as clouds + phase | **Done** — BUILD_GUIDE §4.21 (machine; Lock still owner) |

**MVP exit.** The player can: watch water and soil; commit a prediction and be wrong or right; site one cause and see the sim respond; see vegetation blunt runoff. Sandbox only. No win condition (G-001). **Sim MVP playtest Pass** at Slice 6. **Post-MVP ladder** (autonomous-first): … → Slice 14 / 16 / 15 Tier-O **Pass**; **Slice F** / **17**–**21** Done; C-018 / C-019 Tier-O **Pass**; **Slice S** / **Slice R** Done — D-007 rain-feel clip **Pass**; **Slice A+** Done; **Field Notebook** **U-006 Locked**; **Full C-020 clouds** Done (machine); **NS-006** / **NS-002** / **NS-004** / **NS-003** / **NS-005** / **NS-008** / **NS-007** / **NS-009** Done; **Slice B** (**C-005 Locked tooling**); **Slice E** Exner-lite Done; **C-006** / **C-013** / **C-002 Locked**. Gap review: [reviews/2026-07-30-sim-gap-review.md](reviews/2026-07-30-sim-gap-review.md). **Next:** Nature P2 woody/shrub; **C-020 Locked**; **C-014**; **C-021** / **C-022** filed Open.

---

## 5. What MVP is not

- A second preserve (F-003)  
- Species catalog / collection (N-003)  
- Universal score (N-002)  
- Full Field Notebook corpus (U-006)  
- Resolved RC-003 / G-007 (Open entries stay Open; architecture accommodates)  
- Voxel / cave terrain (T-007 situation-Current)  
- Falling-sand / voxel CA as the authoritative water or terrain model (presentation cues only — BUILD_GUIDE §4.2)  

---

## 6. Fun gate (before more post-MVP systems)

The Slice 4 fun gate already **Passed** ([PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md)). Before opening a new **owner** playtest for post-MVP work, pass [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) ask gate. Agent-only slices (closeouts, 8b Tier-M, hygiene) do not spend a fun-gate session.

The batch does not wait forever: it fires on the third accumulated Tier-O question, or when a slice cannot start without an answer (VERIFICATION_POLICY §4). The more the ladder is built autonomously, the more that firing rule — not the ask gate — is what keeps the world answerable to taste. **Fired 2026-07-28** into [playtests/8c-return-visit.md](playtests/8c-return-visit.md), which subsumes the batched presentation and erosion-legibility questions.

**The 20-second clip test** ([THESIS.md](THESIS.md) §8) is a self-check that costs no session: could you record twenty seconds — build, run time, watch nature take it — that reads to a stranger and makes them want to try it? When the answer is no, the next slice is whatever moves that clip closest to existing, and it is almost never a new system.

| Verdict | Action |
|---|---|
| Pass (historical) | Continue joint ladder; post-MVP order in BUILD_GUIDE §4 |
| Hold (future asks) | Agent retunes encoding / proxy — do not add Fire or roles first |
| Fail | Revisit framing / ART-001 / core loop thesis before more systems |

---

## 7. Document roles

| Document | Owns |
|---|---|
| **This file (MVP_SCOPE)** | Which loops are in/out of first playable; joint slice map |
| [SIMULATION_MODEL.md](SIMULATION_MODEL.md) | How sim interdependencies are represented |
| [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) | How we know a register entry is earned |
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies each claim — agent vs. owner — and the gate before any playtest request |
| [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) | External tools to study, not ship |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | Per-slice execution checklists |
| PLAYER_INTERACTION_SPEC.md | Detailed verbs and prediction UX (not yet written) |

When this document conflicts with the register, correct this document or supersede the register explicitly.
