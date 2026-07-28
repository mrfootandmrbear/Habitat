# Habitat — Build Guide

> **Status:** Working draft  
> **Role:** Per-slice execution checklists for the joint sim/game ladder in [MVP_SCOPE.md](MVP_SCOPE.md)  
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md) and MVP_SCOPE. Architecture: [SIMULATION_MODEL.md](SIMULATION_MODEL.md). Evidence: [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md). Who verifies what: [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md). Advisory origin: [reviews/2026-07-27-incremental-world-building-report.md](reviews/2026-07-27-incremental-world-building-report.md).

---

## 1. How to use this guide

1. Pick the next open row in [MVP_SCOPE.md](MVP_SCOPE.md) §4 (respect the fun gate in §6).  
2. Copy that slice’s checklist below into the PR / session notes.  
3. Do not start the next slice until **Definition of done** (§2) is satisfied.  
4. After merge: `npm test`, `npm run conformance`, update golden hashes if physics intentionally changed.

**Before requesting a playtest**, pass the ask gate in [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) §4. Anything settled by a number is the agent's to settle; owner sessions are for attention, legibility, and taste.

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

## 3. Completed slices (0–4)

Summary only — do not reopen unless fixing regressions.

| Slice | Sim | Game | Key artifacts | Invariants covered |
|---|---|---|---|---|
| 0–1 | Heightfield hydrology scaffold | Observe rain / pool | `fluxStep`, WaterMesh | Determinism (later fixed flux clamp) |
| 2 | WorldState, registry, no-flow, SimClock | Pause / 1× / 4× / 16× | `WorldState`, `SimClock`, CI | Conservation, S-009 time-rate |
| 3 | Terrain → watershed / accumulation | Inspector: accumulation / watershed | `flowRouting.ts` | Accumulation ≥ 1; channels form |
| 4 | Surface → soil moisture | Ground darkens; soil overlay | `soilWaterProcess`, TerrainMesh tint | **Pass** — infiltration + darkening |
| 5 | Soil → vegetation | Green follows wet | `vegetationProcess`, TerrainMesh | **Pass** |
| 6 | Veg → roughness / infil → water | Cover blunts storm | roughness + infil capacity | **Pass** (sim MVP) |

**Current gate:** Slice 8 scaffold in progress (schema v2 + `soil.depth` legacy). Optional Tier-O: [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md).

---

## 4. Next slices (checklists)

### 4.1 Post-MVP hygiene *(from Slice 2–6 implementation review)*

Ordered so earlier fixes don’t invalidate later ones ([reviews/2026-07-27-slice-2-6-implementation-review.md](reviews/2026-07-27-slice-2-6-implementation-review.md)).

- [x] `ledger.et` + multi-day conservation test (H-004, §8.2)  
- [x] Single-pass O(n log n) D8 accumulation (push-to-receiver)  
- [x] Ownership / contributes test; surface debit via inbox or explicit `contributes`  
- [x] Stretch golden / determinism schedule past a daily boundary  
- [x] Field `range` + bounds/NaN at band commit  
- [x] Metric pass (Δx, sim-minute clock) — before Slice 7 systems  
- [x] Priority-Flood + flat resolution (promote 4b)  
- [x] Symmetry invariant; single-source ledgers; register band phase  

*Hygiene batch:* no Tier-O question — agent probes + tests only (VERIFICATION_POLICY).

### 4.2 Presentation track — volume without voxels *(parallel; T-006 / T-007 / A-005)*

Study origin: [NicksterSand/3D-Falling-Sand](https://github.com/NicksterSand/3D-Falling-Sand), [ccrock4t/3DCellularWorld](https://github.com/ccrock4t/3DCellularWorld), and [Noniv/snowflow](https://github.com/Noniv/snowflow_demo) — voxel toys and a WebGPU snow deformation demo that sell “stuff moves through / carves the surface.” Catalogued in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). **Steal presentation patterns; do not adopt voxel CA or GPU deform buffers as authority.**

**Loops.** Sim: none new (observers + FX only). Game: volume and agency read as column-stack × time and cause verbs, not as painted voxels.

**Standing bans (do not schedule as work):**
- Full 3D voxel CA / Margolus / paint-element-as-world-state (fights T-007, A-005)
- Physics coupled to RAF / display rate (fights S-009, T-006)
- Opaque cube water as the primary depth language (prefer continuous depth tint / sheet)
- Duplicate GPU + CPU rule engines for hydrology
- Treating “need vertical structure” as “need voxels” — vertical = stacked 2D rasters per column (SIMULATION_MODEL §2)
- WebGPU-only stack, 90 FPS / heavy post as Definition of Done, or screenshot gate without Tier-P numbers (snowflow-class demos)
- GPU terrain-state / deform buffer as hydrology or terrain authority — map *ideas* onto owned rasters only

**Steal from snowflow (API shape, not stack):**
- **Shared surface write path** — one `applySurfaceEdit`-style inbox into owned terrain/water fields (feet, berm, dig, future sediment) rather than per-effect decals
- **Berm = displaced mass** — trails/edits read as raised edges because mass moved, not because albedo darkened
- **Beauty ≡ observer sampling** — flow cues / grains sample the same authoritative height/depth law so they do not float
- **Particles decorate** — spray/grains are presentation; WorldState rasters remain authority (T-006); aligns with deferred grains checkbox below

**Checklist (can interleave with Slice 7+; prefer before heavy visual retunes):**

- [x] **Extent cage** — `ExtentCage` wireframe around preserve bounds (U-005)
- [x] **Snapped intervention cursor** — `SitingCursor` cell gizmo for berm/dig/predict; orbit stays for look
- [x] **Motion-in-time** — `FlowCueMesh` D8 segments on wet cells (reads depth + flowDirection only)
- [x] **Dual readouts** — inspector overlays + cutaway strip (soil / water / veg at cursor cell)
- [x] **Conservation beat** — status HUD: precip · surface · soil · ET · residual (full U-006 later)
- [x] **Property bundles** — documented below; no CA neighborhoods
- [ ] **Presentation-only grains** — deferred (flow cues sufficient; Tier-P green without particles)
- [x] Tier-P proxies in `presentation.proxy.test.ts` — owner play only via batched ask ([PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md))

**Property bundles (material feel = parameter packs, not CA):**

| Pack | Fields | Owner |
|---|---|---|
| Surface flow | `baseRoughness`, `vegRoughnessBonus` → `surface.roughness` | vegetation |
| Infiltration | `infiltrationRate`, `vegInfiltrationBonus` → capacity | soilWater (+ veg contribute) |
| Storage | `soilPorosity` | soilWater / legacy later |

**Notebook seed (track):** “Water moved through the hollow over time — the ground held it until it spilled.”

**Also shipped with this batch:** RichDEM-class pit DEM fixture; `timeDebt` on HUD; paired-storm probe shows bare > vegetated downslope.

---

### Slice 4b — Priority-flood depressions *(promote before scenario objectives)*

**Loops.** Sim: honest closed basins / spill. Game: ponds that don’t secretly drain through DEM artifacts.  
**Register.** H-003; oracle: RichDEM ([EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md)).

- [x] Implement priority-flood (or ε-fill) over routing surface; register derived depression fields per SIMULATION_MODEL §3.9  
- [x] Declare authority: structure vs dynamic water still as §7  
- [x] Invariant: flat closed basin conserves volume; filled sink does not invent cliffs to `z=0`  
- [x] Golden / fixture vs RichDEM-class on a small DEM (`src/sim/fixtures/pitDem.ts`)  
- [x] Inspector layer for depression / spill (dev)  
- [x] Notebook seed: e.g. “This hollow holds water until it reaches the spill elevation.”  
- [x] ~~Owner play: rain into a known depression; confirm it pools~~ → **agent probe** (`basin-fill`): pooled volume, spill elevation, residual. Machine-verifiable per VERIFICATION_POLICY §3 — no owner-only question in this slice.

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
- [x] Notebook seed: e.g. “The berm changed where water could spill.”  
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
- [x] Notebook seed: e.g. “Plants established where the ground stayed wet.”  
- [x] Owner play: rain pattern → visible green gradient — **Pass** (with Slice 6)

**Do not** close vegetation → water in this slice (corollary: one direction at a time).

---

### Slice 6 — Vegetation → water *(sim MVP milestone)*

**Loops.** Sim: veg → roughness / infiltration → runoff. Game: vegetated slope blunts the hydrograph.  
**Register.** D-003, E-005 partial.

- [x] `vegetation` owns or contributes to `surface.roughness` and/or `soil.infiltrationCapacity` (SIMULATION_MODEL §11)  
- [x] Hydrology / soil reads those fields; declare `lagged` if needed to break the schedule cycle  
- [x] Paired-storm test: same rain, bare vs vegetated → measurably different surface response  
- [x] Invariant: paired-storm difference + conservation  
- [x] Observable without inspector (hydrograph feel or peak wetness)  
- [x] Notebook seed: e.g. “Cover slowed the runoff on this slope.”  
- [x] Owner play: grow cover, storm again, see the difference — **Pass**  
- [x] Mark MVP sim milestone in MVP_SCOPE status table when done

---

### Slice 8 — Soil legacy / erosion memory *(scaffold in progress)*

**Loops.** Sim: soil depth as persistent memory (recovery slows on thin soil later). Game: inspect legacy depth; save invalid without it (T-003).  
**Register.** S-006, S-007, GEO-002, T-003.  
**Gate.** Schema versioning before first legacy *process* — scaffold lands version + field first.

- [x] Schema version ≥ 2 + save serialize/apply stub (`src/sim/save.ts`)  
- [x] Register `soil.depth` (m, [0, 5], owner `geomorphology`, band `decadal`, **legacy: true**)  
- [x] Derive bedrock as `terrain.elevation − soil.depth` (not stored)  
- [x] Invariant: omit legacy field → save load fails; round-trip preserves depth + hash  
- [x] Inspector: soil depth overlay  
- [x] Notebook seed: e.g. “Thin soil here will take a long time to grow back.”  
- [ ] Geomorphology process: soil production / erosion couple elev + depth (decadal)  
- [ ] Wire moisture storage to `moisture · depth · Δx²` in mass balance (when ready)  
- [ ] Owner play: only when depth becomes visible consequence of erosion — Tier-O later  

---

### Post-MVP (stubs only)

Do not expand systems slices until MVP exit in MVP_SCOPE §4 is met. Presentation track (§4.2) may run in parallel — it does not add sim systems.

| Slice | Focus | Register |
|---|---|---|
| P (§4.2) | Volume-without-voxels presentation | T-005, T-006, T-007, A-005, U-005 |
| 8 | Soil legacy / erosion memory | S-006, S-007, GEO-002, T-003 | **Scaffold** — schema + `soil.depth` |
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
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies each claim; the ask gate and playtest request format |
| [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) | Study-not-ship refs (incl. falling-sand presentation peers for §4.2) |
| [PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md) | Current fun-gate protocol |
| PLAYER_INTERACTION_SPEC.md | Detailed prediction/siting UX (not yet written) |
