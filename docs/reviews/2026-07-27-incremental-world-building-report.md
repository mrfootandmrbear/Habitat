# Report to Cursor — Building the Simulated World Incrementally

> **Date:** 2026-07-27
> **From:** high-level review
> **Context:** `47ebe8c` Slice 0–1 landed; [review](2026-07-27-slice-0-1-scaffold.md) filed; [process-math survey](../NATURAL_PROCESS_MATH.md) available
> **Status:** advisory. Nothing here supersedes a [register](../DECISION_REGISTER.md) entry. If the owner wants this promoted, it splits into the governed names `MVP_SCOPE.md` and `BUILD_GUIDE.md` (register §17).

---

## 0. The problem this report addresses

Habitat is a coupled simulation. Coupled simulations resist incremental construction for a specific reason: the interesting behavior lives in the *feedback between* systems, not in the systems themselves. That creates two failure modes, and most simulation projects pick one and die of it.

**Bottom-up by dependency order** — build climate, then hydrology, then soil, then vegetation, then wildlife, in the order the Design Wiki lists for *updates*. The trap: four or five systems get built before anything is observable, each one tuned against nothing, and every one of them is wrong in ways that only surface when the system downstream finally consumes them. The wiki's dependency order is an **update** order. It is not a **build** order, and using it as one is the most natural mistake available here.

**Top-down by feature** — build what the player sees, fake what is underneath. The trap: the register forbids the fake (S-004, N-004, U-002), and every placeholder scalar written to make a demo work becomes load-bearing before anyone removes it.

This report proposes a third sequencing rule, an architecture that makes it cheap, and a slice ladder that follows it.

---

## 1. The sequencing rule: close one feedback loop per slice

**A slice is not "add a system." A slice is "close a loop."**

A system added without a consumer produces state nobody reads, which cannot be validated, cannot be tuned, and rots. A closed loop — A changes B, B changes A — produces behavior that is immediately visible, immediately testable, and immediately wrong in ways you can see.

This is not a general software principle borrowed from elsewhere. It is what Habitat is *about*: D-001 says natural systems perform the meaningful work, D-004 prefers emergence over scripting, and the Design Wiki names feedback loops as the source of most long-term behavior. A build sequence organized around closing loops is a build sequence organized around the product thesis. It also means every slice makes the world observably *more alive* rather than more instrumented, which is the difference between a project that stays motivating and one that becomes a chore at slice 6.

Three corollaries:

1. **Prefer the shortest loop that is real.** Vegetation → Manning's n → runoff → soil moisture → vegetation is a four-hop loop and it is worth more than three unconnected systems, because it can be falsified by looking at it.
2. **Never add the second half of a loop in the same slice as the first.** Ship A→B, look at it, *then* ship B→A. The intermediate state is informative; the combined state hides which half is wrong.
3. **If a slice cannot name the loop it closes, it is infrastructure.** That is allowed — Slice 2 below is exactly that — but it should be labeled honestly rather than dressed as ecology.

---

## 2. The architecture that makes slice N+1 cheap

Four changes, all cheapest right now, all of which convert per-system work into one-time work. This is the highest-value section of this report: without these, every slice below costs roughly twice what it should, and the cost is paid in the systems that already exist rather than the one being added.

### 2.1 `WorldState` owns everything; processes borrow

Already filed as review §1.4, restated because everything else depends on it. Terrain is not owned by hydrology. One `WorldState` owns all layers; processes hold references and never copies.

Without this, E-005 (Locked) has no write-back path, A-005 terrain edits desync silently, and GEO-002 incision has nowhere to land.

### 2.2 A field registry, not bespoke members

This is the single largest lever in the report.

Instead of each system declaring private `Grid2D` members, every raster is **registered** with metadata:

```
registerField({
  id: "soil.moisture",
  units: "m³/m³",
  band: "daily",            // §3 timescale ladder
  legacy: false,            // does hysteresis depend on it? → T-003 save requirement
  range: [0, 1],            // invariant test bound
  owner: "soil",            // one authoritative writer (Design Wiki, data ownership)
  inspect: { palette: "moisture", label: "Soil moisture" },
})
```

Five capabilities the register demands then become **generic, written once**, instead of being re-implemented per system forever:

| Capability | Register | What the registry gives you |
|---|---|---|
| State hashing | T-001 | Hash every registered field in id order — deterministic, total, no per-system maintenance |
| Save / load | T-003 | Serialize the registry; `legacy: true` fields are the ones a save is *invalid* without |
| Inspection layers | T-005 | Every field is inspectable the day it exists, with no per-system UI work |
| Player overlays | U-001 | Player-facing overlays select a subset of the same layers rather than duplicating them |
| Ownership enforcement | Wiki §3 | A field has exactly one declared writer; violations are detectable rather than conventional |

The cost is roughly a day at Slice 2. The saving is a day per system for the life of the project, plus it makes T-005 true by construction rather than by discipline — and T-005 is Locked and describes debug visualization as *product infrastructure rather than disposable scaffolding*.

### 2.3 A process interface with an explicit, declared order

```
interface Process {
  id: string
  band: TimescaleBand
  reads: FieldId[]
  writes: FieldId[]
  step(world: WorldState, dt: SimSeconds): void
}
```

Declared `reads`/`writes` are not bureaucracy. They give you:

- **Update order as data**, satisfying the wiki's determinism requirement without the order being implicit in a call site.
- **A detectable read-then-write violation** — a process writing a field another process reads in the same band is exactly the artifact class the wiki warns about.
- **Automatic dirty-tracking** for the expensive derived layers in §3.

### 2.4 A multi-rate scheduler skeleton — before it is needed

Register everything in one band initially. Do not defer the *skeleton*, because the moment a second band arrives (Slice 4) the retrofit touches every process.

S-005 and S-006 — fast systems teach, slow systems remember — are not a design stance to be honored by choosing tasteful constants. They are a **timestep hierarchy**. Making them structural is what makes them true.

---

## 3. Simulation time must stop being frame time — at Slice 4

`simDt = 1/60` is a render cadence. Right now nothing depends on that, so nothing is broken. It breaks the moment soil moisture exists, because water moves in minutes and soil dries in days, and running both at 60 Hz is either 60× too slow for one or wildly unstable for the other.

Define the mapping once, explicitly, as data:

| Band | Simulated Δt | Systems |
|---|---|---|
| `event` | ~15 sim-minutes | Surface flow, runoff, fire spread |
| `daily` | 1 sim-day | Soil moisture, ET, snowmelt, phenology |
| `seasonal` | ~10 sim-days | Vegetation growth, light competition, wildlife distribution |
| `annual` | 1 sim-year | Population dynamics, succession outcome, fuel load |
| `decadal` | 5–10 sim-years | Soil carbon pools, soil depth, channel incision |

S-009 requires every ecologically meaningful duration to be expressed in simulation time and invariant under the player's chosen rate. That is only expressible once a step means something. **A player-facing time-rate control (T-002) should not be built before this exists** — it would be a control over frame pacing wearing an ecological label, and it would then be the thing everyone tunes against.

---

## 4. The definition of done for a slice

Proposed contract. A slice is complete when all seven hold:

1. **One loop closed** (or explicitly labeled infrastructure), stated in one sentence.
2. **One observable** — a thing the owner can see on screen and form an opinion about without opening an inspector.
3. **A determinism test** — golden hash committed as a constant, so physics changes trip CI deliberately.
4. **An invariant test** — see §5. Not optional, and not the same thing as the determinism test.
5. **An inspector layer** — free, if §2.2 is done.
6. **One Field Notebook sentence** it newly makes true and honest (U-006). If the slice cannot produce a sentence the notebook could truthfully say, the slice has added machinery rather than meaning.
7. **Register IDs discharged**, and any decision the code made that the register has not, filed as a candidate entry rather than left implicit.

Item 2 deserves emphasis. D-006 makes attention the unit of engagement, and the owner is the first player. A slice that ends with only a passing test suite has not been evaluated by the only instrument that can evaluate it.

---

## 5. Determinism is not correctness — evidence from Slice 1

The single most transferable lesson available in this repository right now:

**Slice 1's determinism test passed while the hydrology was wrong.** `dt`, `flowRate`, and terrain slope had no effect on flow rate — every wet cell moved exactly half its water per step, and ponds oscillated ~2× from a one-part-per-million perturbation. The test compared a run against itself and was perfectly happy.

A deterministic wrong answer is still wrong, and determinism tests are structurally blind to it. Every slice therefore needs invariants from the class below:

- **Conservation** — mass in = mass out + storage + tracked boundary flux, to tolerance. This alone would have caught the boundary drain.
- **Refinement** — N steps at `dt` and 2N at `dt/2` converge rather than being identical. This alone would have caught the dead `dt`.
- **Monotonicity** — more rain never yields less runoff; more shade never yields more understory light.
- **Bounds** — registered `range` metadata (§2.2) checked every step in dev builds.
- **Equilibrium** — a system at rest stays at rest; perturbation decays rather than growing. This alone would have caught the oscillation.
- **Symmetry** — a symmetric terrain under symmetric forcing produces a symmetric result. Catches the entire class of update-order and index-order bias, which is otherwise nearly invisible.

Recommendation: make the invariant class a **named requirement of the slice contract**, so it is chosen deliberately per slice rather than remembered.

---

## 6. The slice ladder

Each row closes one loop, ships one observable, and carries one invariant. Sequence is a proposal; the *rule* generating it (§1) matters more than the exact ordering.

| Slice | Loop closed | Observable | Invariant | Register |
|---|---|---|---|---|
| **2** | *(infrastructure)* | Ponds settle and stay; steep drains faster than shallow | Conservation + equilibrium | Review §1.1–1.5 |
| **3** | Terrain → water structure | Stream network and watershed boundaries appear | Accumulation sums; basins partition | H-002, W-002 |
| **4** | Water → storage | Ground darkens; a second storm behaves unlike the first | Conservation across surface + soil + outflow | H-001, H-003 |
| **5** | Water → vegetation | Green follows the wet ground | Monotonicity in moisture | ES-001, ES-006 |
| **6** | **Vegetation → water** | Vegetated slope visibly blunts the hydrograph | Paired-storm difference | **D-003, E-005 (partial)** |
| **7** | Player → prediction | Commit-and-compare on where water goes | Prediction never mutates sim state | P-006 |
| **8** | Vegetation → soil → vegetation | Bare slopes lose soil; recovery slows on eroded ground | Sediment conservation; legacy-state persistence | S-006, S-007, GEO-002 |
| **9** | Vegetation → fuel → fire → vegetation | Fuel builds; fire runs uphill; mosaic remains | Burned area bounded by fuel + ignition | ES-002, A-002, A-006 |
| **10** | Vegetation → light → composition | Succession without authored stages | Shade monotonicity; Beer–Lambert bounds | ES-001 |
| **11** | Vegetation → herbivore → vegetation | Readiness reads; introduction persists or fails | Population bounds; capacity from habitat | E-001/003/006/007, ES-006 |
| **12** | Biology → physics | Dam → pond → riparian → changed hydrograph | Terrain write-back conserves volume | **E-005, F-001** |

### Notes on individual slices

**Slice 2 is infrastructure and should say so.** Clamp fix, `WorldState` ownership, field registry, process interface, scheduler skeleton, boundary policy, cumulative-outflow accounting. It has a real observable anyway — water that settles into ponds and drains at slope-dependent rates is H-002 and H-003 becoming true for the first time — but no new ecology, and pretending otherwise would set a bad precedent for the eleven slices after it.

**Slice 3 introduces a second water representation, and the relationship must be declared.** Flow routing and accumulation (D8/D-∞, priority-flood) are the *structural* layer, recomputed when terrain changes. The existing flux model is the *dynamic* layer, stepped continuously. They must not be allowed to disagree about where water goes. Name which is authoritative for what — structure and watershed identity from routing, visible depth and motion from flux — before both have consumers. Watershed labels then fall out of routing directly, which is W-002's emergent regions for free rather than as a later feature.

**Slice 6 is the milestone.** It is the first genuine two-way loop, and the first moment the project demonstrates D-003 rather than asserting it: the player changes a condition, and the physical response is different in a way they can see. Everything before it is a terrain toy with good bones. If schedule pressure ever arrives, protect the path to Slice 6 and cut sideways, not through it.

**Slice 7 should not wait for ecology.** P-006 is Current but the register calls prediction load-bearing for the core loop and warns specifically against cutting it as polish while keeping "observation" as a slogan. Water is predictable-but-nontrivial as of Slice 3, which is the earliest point the mechanic is worth playing. Build it there, not at the end.

**Slice 8 is where the world gets a memory**, and where hysteresis first appears without being authored: eroded soil recovers slowly because soil production is slow, not because a penalty says so. This is also where T-003 schema versioning must begin in earnest, because it is the first state a save is genuinely invalid without.

**Slice 11 informs RC-003**, which is the register's #2 open question. An Allee-effect establishment model makes a failed introduction cost the founding population and the elapsed ecological time, with the mechanism inspectable and no bookkeeping counter — see the process survey §3.4. Treat the slice as the prototype that resolves the entry.

**Slice 12 should require no new mathematics.** If it does, something upstream was built too narrowly. It is the integration test for whether the world is actually coupled: dam raises base level → priority-flood gives pond extent → pond raises the water table → velocity drop deposits sediment → wetted ground changes vegetation → vegetation changes roughness and infiltration → the next storm behaves differently. Six steps, all reuse.

---

## 7. One-way doors

Decisions that are cheap now and expensive later. Make them deliberately rather than by accretion.

1. **What owns world state** (§2.1). Currently being decided by default, in the wrong direction.
2. **Field registry vs. bespoke members** (§2.2). Retrofitting the registry means touching every system that exists at the time.
3. **What a simulation step means** (§3). Every constant chosen before this is chosen against frame pacing.
4. **Boundary condition policy.** Edge (no-flow) and outlet (authored) are different things; conflating them makes the terrain datum silently govern drainage.
5. **Whether the renderer may hold references to simulation buffers** (T-006). Currently it may. A renderer write is a determinism bug that reproduces only with rendering enabled — the worst possible failure signature.
6. **When save versioning starts.** Before the first legacy state exists, so the migration path is exercised while it is trivial.
7. **Spatial representation.** T-007 governs; the pressure that actually arrives is soil horizons and a water table, which is a stack of per-column rasters, not voxels. Same 2D indexing, ~6–10 floats deep, every Tier 1 algorithm unchanged. Voxels buy overhangs and caves, which appear nowhere in the register. Do not let "we need vertical structure" become "we need a volumetric representation."

---

## 8. Anti-patterns specific to this project

- **Placeholder scalars.** A temporary `habitatHealth` written to make a demo move will outlive everyone's intention to remove it and violates D-002 and N-002 the whole time. If a value is needed before its system exists, register it as a field with a declared owner and a constant process, so it is visible as debt in the registry rather than invisible in a call site.
- **Fixed carrying capacity.** A constant `K` anywhere is a direct ES-006 violation. Capacity is an output of habitat, always. Easy to introduce as "just for now" in Slice 5 and painful to remove in Slice 11.
- **Tuning against the renderer.** Constants chosen so the water looks right at 60 fps are constants that break the moment T-002 time rates exist.
- **Species before roles.** E-004 is Locked. A named species reached for early ("just a deer for now") will leak into the interface vocabulary and read as taxonomy rather than function.
- **Determinism-only testing.** §5. Already demonstrated to fail in this repository.
- **Building the second half of a loop before looking at the first.** §1, corollary 2.

---

## 9. What to do next

1. Read the [Slice 0–1 review](2026-07-27-slice-0-1-scaffold.md); the flux clamp blocks meaningful tuning of everything downstream.
2. Treat **Slice 2 as infrastructure** and take §2.1–2.4 in full. It is the cheapest it will ever be, and it is what makes slices 3–12 additive rather than invasive.
3. Adopt the slice contract in §4 and pick the invariant class per slice from §5 deliberately.
4. Protect the path to **Slice 6**. That is where Habitat starts being Habitat.
