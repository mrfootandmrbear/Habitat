# Habitat — Build Guide

> **Status:** Working draft  
> **Role:** Per-slice execution checklists for the joint sim/game ladder in [MVP_SCOPE.md](MVP_SCOPE.md)  
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md) and MVP_SCOPE. Architecture: [SIMULATION_MODEL.md](SIMULATION_MODEL.md). Evidence: [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md). Advisory origin: [reviews/2026-07-27-incremental-world-building-report.md](reviews/2026-07-27-incremental-world-building-report.md).

---

## 1. How to use this guide

1. Pick the next open row in [MVP_SCOPE.md](MVP_SCOPE.md) §4 (respect the fun gate in §6).  
2. Copy that slice’s checklist below into the PR / session notes.  
3. Do not start the next slice until **Definition of done** (§2) is satisfied — including owner play observation.  
4. After merge: `npm test`, `npm run conformance`, update golden hashes if physics intentionally changed.

Standing commands:

```bash
npm test
npm run build
npm run conformance          # regenerate ledger
npm run conformance:check    # CI
npm run dev                  # playtest
```

Study-not-ship references: [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md).

---

## 2. Definition of done (every slice)

A slice is complete only when all hold:

| # | Requirement | Notes |
|---|---|---|
| 1 | **Named loops** | One sim edge and one game edge stated in one sentence each (or “infrastructure” for sim). |
| 2 | **Observable** | Owner can see it on screen and form an opinion *without* requiring an inspector (inspector may still exist). |
| 3 | **Determinism** | Golden hash (or registry hash) committed; intentional physics changes update it deliberately (T-001). |
| 4 | **Invariant** | Named class from §2.1 — not the same as determinism. |
| 5 | **Inspector** | New authoritative fields registered and inspectable (T-005), if the registry exists. |
| 6 | **Notebook seed** | One sentence the Field Notebook *could* later say honestly (U-006). May be recorded in the PR even if U-006 UI does not exist. |
| 7 | **Register citations** | Code/docs cite IDs; unknown IDs fail conformance; new implicit decisions filed as candidates. |
| 8 | **Owner play** | Someone played the observable for several minutes (D-006). |

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

## 3. Completed slices (0–4)

Summary only — do not reopen unless fixing regressions.

| Slice | Sim | Game | Key artifacts | Invariants covered |
|---|---|---|---|---|
| 0–1 | Heightfield hydrology scaffold | Observe rain / pool | `fluxStep`, WaterMesh | Determinism (later fixed flux clamp) |
| 2 | WorldState, registry, no-flow, SimClock | Pause / 1× / 4× / 16× | `WorldState`, `SimClock`, CI | Conservation, S-009 time-rate |
| 3 | Terrain → watershed / accumulation | Inspector: accumulation / watershed | `flowRouting.ts` | Accumulation ≥ 1; channels form |
| 4 | Surface → soil moisture | Ground darkens; soil overlay | `soilWaterProcess`, TerrainMesh tint | **Pass** — infiltration + darkening |
| 5a | — | Predict wet cells | `PredictionSession` | **Pass** |
| 5b | Player edits terrain | Berm / dig | `raiseBerm` / `digChannel` | **Pass** |

**Current gate:** Slice 5 vegetation ready — [PLAYTEST_SLICE5.md](PLAYTEST_SLICE5.md). Slice 4 remains **Pass** (soil / flow).

---

## 4. Next slices (checklists)

### Slice 4b — Priority-flood depressions *(optional sim hygiene)*

**Loops.** Sim: honest closed basins / spill. Game: ponds that don’t secretly drain through DEM artifacts.  
**Register.** H-003; oracle: RichDEM ([EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md)).

- [ ] Implement priority-flood (or ε-fill) over routing surface; register derived depression fields per SIMULATION_MODEL §3.9  
- [ ] Declare authority: structure vs dynamic water still as §7  
- [ ] Invariant: flat closed basin conserves volume; filled sink does not invent cliffs to `z=0`  
- [ ] Golden / fixture vs RichDEM on a small DEM  
- [ ] Inspector layer for depression / spill (dev)  
- [ ] Notebook seed: e.g. “This hollow holds water until it reaches the spill elevation.”  
- [ ] Owner play: rain into a known depression; confirm it pools

---

### Slice 5a — Prediction on water *(next game priority)*

**Loops.** Sim: none new (read-only observer). Game: expect → commit → compare (P-006).  
**Register.** P-006 mechanical first; behavioral viewer study deferred.

- [x] Prediction module with `reads` only — **no** writes to WorldState / water buffers  
- [x] Player marks expected wet cells or flow corridor before advancing time  
- [x] After N steps, overlay expected vs actual (clear mismatch)  
- [x] Invariant class: **Write isolation** — automated test that prediction API cannot mutate sim  
- [x] Determinism: replay with same mark + schedule → same compare result  
- [x] Notebook seed: e.g. “You expected water here; it went there because of the slope.”  
- [x] Owner play: 10 minutes forming and checking predictions (score attention, not accuracy) — **Pass**  
- [x] Conformance: cite P-006 in sim observer + tests; criterion artifact named in DECISION_CONFORMANCE

**Do not** fake prediction with a second hydrology that writes the real buffers.

---

### Slice 5b — One siting verb *(pair with 5a on fun-hold)*

**Loops.** Sim: player edits routing surface / terrain owned by WorldState. Game: commit a **cause** (berm / channel), not an outcome (A-005, N-001).  
**Register.** A-005 spike; N-001 smoke test must still pass.

- [ ] One tool only (prefer berm or dig channel)  
- [x] Edit `terrain.elevation` or `structure.obstructionHeight` via WorldState — **never** a hydrology-private copy  
- [x] Recompute flow structure after edit  
- [x] Preview language / UI describes cause (“raise a berm here”), not wetland stamp  
- [x] Invariant: mass conservation still holds after edit; structure invalidation is explicit  
- [ ] Notebook seed: e.g. “The berm changed where water could spill.”  
- [x] Owner play + informal A-005 check: would a stranger say “cause” or “outcome”? — **Pass**  
- [ ] Expand N-001 smoke if new public APIs appear

---

### Slice 5 — Soil → vegetation (one-way)

**Loops.** Sim: moisture drives biomass/cover. Game: green follows wet ground.  
**Register.** ES-001; capacity must emerge later (no fixed `K` — ES-006).  
**Gate.** Only after Slice 4 playtest Pass (or after 5a/5b if Hold).

- [x] Register vegetation field(s) with owner `vegetation`, band seasonal/daily as appropriate  
- [x] Process reads `soil.moisture` (and optionally TWI); writes veg only  
- [x] Visible green without requiring inspector  
- [x] Invariant: **Monotonicity** — higher sustained moisture → ≥ biomass/cover (within bounds)  
- [x] No constant carrying capacity `K`  
- [x] Inspector: veg biomass or cover  
- [ ] Notebook seed: e.g. “Plants established where the ground stayed wet.”  
- [ ] Owner play: rain pattern → visible green gradient

**Do not** close vegetation → water in this slice (corollary: one direction at a time).

---

### Slice 6 — Vegetation → water *(sim MVP milestone)*

**Loops.** Sim: veg → roughness / infiltration → runoff. Game: vegetated slope blunts the hydrograph.  
**Register.** D-003, E-005 partial.

- [ ] `vegetation` owns or contributes to `surface.roughness` and/or `soil.infiltrationCapacity` (SIMULATION_MODEL §11)  
- [ ] Hydrology / soil reads those fields; declare `lagged` if needed to break the schedule cycle  
- [ ] Paired-storm test: same rain, bare vs vegetated → measurably different surface response  
- [ ] Invariant: paired-storm difference + conservation  
- [ ] Observable without inspector (hydrograph feel or peak wetness)  
- [ ] Notebook seed: e.g. “Cover slowed the runoff on this slope.”  
- [ ] Owner play: grow cover, storm again, see the difference  
- [ ] Mark MVP sim milestone in MVP_SCOPE status table when done

---

### Post-MVP (stubs only)

Do not expand these until MVP exit in MVP_SCOPE §4 is met.

| Slice | Focus | Register |
|---|---|---|
| 8 | Soil legacy / erosion memory | S-006, S-007, GEO-002, T-003 |
| 9 | Fire / fuel | ES-002, A-002, A-006 |
| 10 | Light / succession | ES-001 |
| 11 | Roles / introductions → informs RC-003 | E-*, ES-006 |
| 12 | Biology → physics integration test | E-005, F-001 |
| — | Field Notebook UI | U-006 |
| — | Scenarios | G-002, G-007 |

---

## 5. PR / commit hygiene

- Cite register IDs in new sim modules and tests.  
- Update `GOLDEN_*` hashes only when physics change is intentional; note why in the commit body.  
- Run `npm run conformance` before claiming a slice done.  
- Prefer small PRs: sim edge vs game edge can split if WorldState coupling allows (see split-to-PRs practice).  
- No remote required for local commits; create GitHub remote when ready to review.

---

## 6. Document roles

| Document | Owns |
|---|---|
| [MVP_SCOPE.md](MVP_SCOPE.md) | Which loops are in MVP; joint map; fun gate |
| **This file** | How to execute each slice |
| [SIMULATION_MODEL.md](SIMULATION_MODEL.md) | Fields, ownership, bands |
| [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) | Promotion criteria + ledger |
| [PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md) | Current fun-gate protocol |
| PLAYER_INTERACTION_SPEC.md | Detailed prediction/siting UX (not yet written) |
