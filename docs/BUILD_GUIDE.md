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
npm run conformance          # regenerate ledger
npm run conformance:check    # CI
npm run probe -- <scenario>  # Tier-M scenario evidence
npm run dev                  # playtest (owner only after ask gate)
```

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
| P (§4.2) | Observers / FX only | Volume without voxels | cage, cursor, flow cues | Tier-P; optional Tier-O batched |
| 8 | Soil depth legacy + geomorphology | Thin soil holds less | `save.ts`, `geomorphologyProcess` | Tier-M; Tier-O erosion deferred |

**Current gate:** Autonomous closeouts (§4.1), then **Slice 8b groundwater / baseflow** (C-001). Batched Tier-O asks: [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md) + erosion legibility — do not request until ask gate.

**Research ↔ decisions.** Steals from EXTERNAL_REFERENCES map to Locked/Current IDs or candidates C-001…C-003. Do not implement Open candidates as if Locked.

---

## 4. Next work

### 4.0 Autonomous session protocol

Every agent session that advances the sim or build plan:

1. **Classify claims** for the slice as Tier **M** / **P** / **O** ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md)).  
2. **Implement** behind tests/probes — Prefer `npm run probe -- <scenario>` for scenario-scale Tier-M.  
3. **Green bar before “done”:** `npm test`, `npm run build`, `npm run conformance:check`.  
4. **Name Tier-M artifacts** in the commit body when physics change (golden hash, probe baseline, test file).  
5. **No owner ask** unless VERIFICATION_POLICY §4 ask gate passes (one sentence, no numbers). Hygiene / infrastructure / Closeouts: **never** open a playtest.  
6. **Batch Tier-O** — Presentation + erosion legibility share one future ask; do not drip-feed.  
7. **Research discipline** — If acting on an EXTERNAL_REFERENCES steal, cite the register/candidate ID in code or BUILD_GUIDE checklist; if inventing policy, file a candidate first.

---

### 4.1 Autonomous closeouts *(agent-only; before Slice 8b)*

No Tier-O. Order:

- [ ] **5b one-tool** — Park as won’t-do for now (berm + dig both shipped; “one tool only” was a spike constraint). Document park reason here when closing the checkbox, or finish by removing dig from default UI.  
- [ ] **Berm/dig ↔ `soil.depth` mass** — snowflow steal (EXTERNAL_REFERENCES): raise/lower depth with elev so edits read as displaced mass (C-002 / GEO-002; T-006). Tier-M: depth+elev delta conservation on brush.  
- [ ] **Deferred grains** — leave deferred (flow cues sufficient).  

---

### 4.2 Presentation track — volume without voxels *(parallel; T-006 / T-007 / A-005)*

Study origin: falling-sand peers + snowflow — catalogued in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). **Steal presentation patterns; do not adopt voxel CA or GPU deform buffers as authority.**

**Loops.** Sim: none new (observers + FX only). Game: volume and agency read as column-stack × time and cause verbs.

**Standing bans:** voxel CA as world authority; RAF-coupled physics; opaque cube water as primary depth language; dual GPU+CPU hydrology engines; WebGPU-only / 90 FPS as DoD; GPU deform as hydrology authority.

**Steal from snowflow (API shape):** shared surface write; berm = displaced mass; beauty ≡ observer sampling; particles decorate.

**Checklist:**

- [x] Extent cage, snapped cursor, flow cues, dual readouts, conservation HUD, property bundles, Tier-P proxies  
- [ ] Presentation-only grains — deferred  
- [ ] Batched Tier-O: [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md) — only after ask gate  

---

### 4.3 Slice 8b — Groundwater / baseflow store *(next systems)*

**Loops.** Sim: soil ↔ cheap GW store ↔ baseflow to surface so channels persist between storms (H-001, H-004, **C-001**). Game: dry spell does not instantly empty the hollow — storage, not a silent leak.  
**Register / candidates.** H-001, H-004, T-001, T-006; **C-001** (not Locked — implement as hypothesis under that candidate).  
**Study.** GWSWEX SW/UZ/GW compartment + mass-balance history ([EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md)); NATURAL_PROCESS_MATH §4 Darcy/Boussinesq *lite*.  
**Bans.** Richards / Celia / MODFLOW in-browser; ML water-cycle cores as authority.

- [ ] Register `groundwater` (or equivalent) storage field + owner/band; schema bump if legacy  
- [ ] Recharge from soil moisture; baseflow contribution onto surface (or channel cells)  
- [ ] Extend water balance residual to include GW compartment  
- [ ] Tier-M: conservation across multi-day wet→dry; probe `baseflow-persist` — wet channel after N dry days **with** GW ≫ without  
- [ ] Inspector overlay for GW / water table proxy  
- [ ] Notebook seed: e.g. “The hollow kept seeping after the rain stopped.”  
- [ ] Owner play: Tier-O deferred until persistence is visible without inspector  

---

### 4.4 Slice 9 — Limiting factors / HSI spine

**Loops.** Sim: hydrological state → Liebig-style limiting factor / HSI fields (NATURAL_PROCESS_MATH §3.3, §8.2). Game: inspect *why* a patch is ready or not (E-009 / S-008 direction) without populations yet.  
**Register.** ES-006 path, E-009, S-008; no fixed `K`.

- [ ] Derived or owned limiting-factor field(s) from moisture / depth / (later GW)  
- [ ] Inspector layer; monotonicity tests where applicable  
- [ ] Notebook seed: e.g. “Water — not light — is limiting here.”  
- [ ] No owner ask unless a Tier-O legibility question appears  

---

### 4.5 Slice 10 — Fire / fuel *(stub)*

**Loops.** Sim: fuel + fire disturbance (ES-002). Game: pulse intervention with real semantics (A-002, A-006).  
**Register.** ES-002, A-002, A-006.  
**Gate.** After Slice 9 spine so readiness/limiting factors exist to disturb.

---

### Later stubs

| Slice | Focus | Register |
|---|---|---|
| 11 | Light / succession | ES-001 |
| 12 | Roles / introductions → informs RC-003 | E-*, ES-006 |
| 13 | Biology → physics integration test | E-005, F-001 |
| — | Field Notebook UI | U-006 |
| — | Scenarios | G-002, G-007 |

Do not expand these until Slice 8b–9 DoD holds. Presentation (§4.2) may run in parallel — it does not add sim systems.

---

## 5. PR / commit hygiene

- Cite register IDs (or C-00x candidates) in new sim modules and tests.  
- Update `GOLDEN_*` / probe baselines only when physics change is intentional; note why + Tier-M artifact in the commit body.  
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
