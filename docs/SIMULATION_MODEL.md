# Habitat Simulation Model

> **Status:** Working draft
> **Role:** The contract between the Decision Register and the simulation code — what state exists, who owns it, when it updates, and what must always be true
> **Authority:** The [Decision Register](DECISION_REGISTER.md) is Habitat's constitution and names this document in §17. Where this document conflicts with the register, this document is corrected. Where it selects among options offered by [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md), the selection binds implementation but not the register; §14 lists every selection that a register entry does not already cover.

---

## Contents

1. [Purpose and relationship to other documents](#1-purpose-and-relationship-to-other-documents)
2. [World discretization](#2-world-discretization)
3. [The state model — the field registry](#3-the-state-model--the-field-registry)
4. [Data ownership](#4-data-ownership)
5. [The process model](#5-the-process-model)
6. [The timescale ladder](#6-the-timescale-ladder)
7. [Derived structure vs. dynamic flux](#7-derived-structure-vs-dynamic-flux)
8. [Invariants](#8-invariants)
9. [The determinism contract](#9-the-determinism-contract)
10. [Boundary conditions](#10-boundary-conditions)
11. [Biology-to-physics write-back](#11-biology-to-physics-write-back)
12. [Save schema and legacy state](#12-save-schema-and-legacy-state)
13. [Extension contract](#13-extension-contract)
14. [Decisions this model implies that the register has not made](#14-decisions-this-model-implies-that-the-register-has-not-made)

---

## 1. Purpose and relationship to other documents

Design Wiki Chapter 3 describes the simulation architecture in principle: the world is state, one owner per datum, read-then-write, deterministic ordering, simulation separate from rendering. This document is the specific form of those principles — the field list, the units, the bands, the ordering rule, the invariants, and the failure modes each one catches. Chapter 3 says a piece of ecological information has one authoritative owner; §4 here names the owner of every field and states what happens when a second writer appears.

Three documents feed this one and none of them govern it:

- The **register** governs. Every binding claim below cites the entry it discharges. Where the register is Open (G-007, RC-003) or Current, this document accommodates every alternative the entry lists rather than picking one; §12 and §14 say where that accommodation costs something.
- The **process-math survey** is advisory. It catalogs candidates; this document selects, and the selections are recorded as candidate register entries in §14 rather than presented as decided.
- The two **2026-07-27 reviews** are advisory findings. This model is written so that the defects they identify cannot be re-expressed: the scaffold's private terrain clone (review §1.4), its map-edge drain at absolute elevation zero (review §1.3), its mutable "read-only" view (review §1.5), and its determinism test that passed over broken physics (review §1.6) each have a structural answer here.

This document does not specify the equations of individual processes. It specifies what a process is allowed to be. Per-process mathematics belongs in `HYDROLOGY_SPEC.md` and its siblings. Which loops belong in the first playable product — and how they pair with player verbs — belongs in [MVP_SCOPE.md](MVP_SCOPE.md). This document also does not specify how the renderer consumes any of the state below — §4 item 3 states the read-only-views principle, but the concrete crossing (which field, read by which `render/*.ts` file, uploaded how) is [RENDER_SIM_INTERFACE.md](RENDER_SIM_INTERFACE.md).

---

## 2. World discretization

The world is a regular square grid of cells, uniform in extent, addressed row-major as `z * width + x`. Every field is either a raster over that grid, a scalar, or a small array indexed by an authored entity list (outlets, ponds, roles).

| Quantity | Definition |
|---|---|
| `Δx` | Cell edge length in metres. A per-preserve constant declared in preserve data, not a global. Working default for Windward Basin / island prototype: **10 m**. |
| `width`, `height` | Cell counts, per-preserve. Documented working default: **256 × 256** (2.56 km square). Playable scaffold today: `config.gridSize = 96` (~0.96 km at 10 m). **C-012** / **C-015**: island form may set extent from shore-to-peak mosaic rather than a square kilometre target — measure step time before committing 256². |
| Cell area | `Δx²` m². All volumetric accounting multiplies by this; no field stores a volume per cell where a depth will do. |
| Datum | Elevations are metres above a per-preserve datum. Under **C-015** (Locked), a global **sea level** (metres on the same datum) is the physical base level for drainage; the numeric floor `elevationFloor` remains a clamp, not a drainage law. Without sea level, the datum is a label only (§10 legacy closed-edge / probe mode). |

Vertical structure is a stack of per-column rasters, not a volumetric representation. Soil horizons, a water table, and multi-pool carbon are all "six to ten floats deep at the same 2-D index" (review §3). T-007 governs the backend question; nothing in this model presumes a heightfield beyond the fact that every field named in §3 is addressable per column, which is equally true of any denser representation later.

The wiki's requirement that the architecture support multiple spatial resolutions without changing simulation behavior is satisfied by `Δx` being an input to every process rather than a constant baked into tuning values. A process whose behavior changes when `Δx` changes at fixed physical scale has a bug, and the symmetry and refinement invariants in §8 are the tests for it.

**The Slice 1 scaffold has no metric datum.** `config.gridSize = 96` over `config.worldSize = 48` is 96 cells across 48 unitless world units. No physical constant may be tuned against that until `Δx` is declared in metres, because every rate constant chosen beforehand is chosen against an arbitrary length scale.

---

## 3. The state model — the field registry

Every raster and every scalar in the authoritative world is **registered**. Nothing is a private member of a process (review §2.2). A registration is:

```ts
registerField({
  id: "soil.infiltrationCapacity",
  units: "mm/h",
  shape: "cell",                  // "cell" | "scalar" | "outlet" | "role"
  storage: "f32",                 // "f32" | "f64" | "u16" | "u8"
  range: [0, 500],                // checked every band commit in dev builds (§8)
  owner: "soilSurface",           // exactly one authoritative writer (§4)
  band: "daily",                  // which band commits it (§6)
  legacy: true,                   // T-003: a save is invalid without it
  accumulator: null,              // or { over: "annual" } — reset schedule as data
  inspect: {                      // T-005 is a registration requirement, not a later feature
    label: "Infiltration capacity",
    palette: "sequential.blue",
    audience: "dev",              // "dev" | "player" — U-001 layering
  },
})
```

`legacy` has a precise meaning and is not a synonym for "important". **A field is legacy state if it cannot be reconstructed from current forcing plus non-legacy state.** That is exactly the state hysteresis runs on (S-007) and exactly the state a save is invalid without (T-003). Standing woody biomass is legacy; this afternoon's puddle is not. Soil passive carbon is legacy; today's soil moisture is not. Every field below is saved; the `legacy` column marks which ones make the save *incorrect* rather than merely incomplete when omitted.

### 3.1 Terrain and substrate

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `terrain.elevation` | m above datum | preserve `[zMin, zMax]` | `geomorphology` | decadal | **yes** |
| `soil.depth` | m of mobile regolith | [0, 5] | `geomorphology` | decadal | **yes** |
| `soil.material` | enum class id | sand / clay / rock (Float32) | `geomorphology` | decadal | **yes** |
| `soil.porosity` | m³/m³ | [0.25, 0.65] | `geomorphology` | decadal | **yes** |
| `soil.hydrologicGroup` | enum A–D | {0,1,2,3} | `geomorphology` | decadal | **yes** |
| `structure.obstructionHeight` | m above terrain | [0, 5] | `structures` | daily | **yes** |

Bedrock elevation is **not stored**. It is `terrain.elevation − soil.depth`, derived on demand. Storing all three invites a three-way consistency failure that no invariant can cheaply catch; storing two makes the third true by construction. Erosion decrements elevation and depth together, soil production increments both, and both are the same owner's business, so the pair never disagrees.

`soil.porosity` carries compaction memory: prior land use lowers it, and root growth and bioturbation raise it over decades. That is why it is legacy and why it sits in the decadal band. `soil.hydrologicGroup` is the Curve Number lookup key (survey §1.4) and moves only when soil depth or porosity crosses a class boundary.

`structure.obstructionHeight` is the field a beaver dam, a check dam, a road berm, or a removed culvert writes. It is read by flow routing as an additive term on the routing surface and by the flux solver as a sill. It exists so that engineering does not require writing another process's terrain (§11).

> **Substrate status (2026-07-30).** [THESIS.md](THESIS.md) calls the "sand" every substrate nature works with.
>
> - **C-009 — material class.** **Shipped** as Slice **S**: `soil.material` (sand / clay / rock) plus a data-driven property table in `substrates.ts` read by existing processes — not a second erosion or infiltration law per material (GEO-002, T-004). Owner legibility Pass; **Lock still owner** (Open until register act). Further classes (loam, gravel, organic) remain design under the Open candidate.
> - **C-010 — legacy substances.** Still **Open** — contaminant load is the motivating case; travels on the *existing* water mass balance, drawn down by a vegetation-mediated pathway over decades, gates arrival. Legacy by §12's definition, therefore save-invalidating (T-003). Missing substrate for S-007 / S-008 beyond compaction memory. **First instance shipped:** `soil.salinity` under Open **C-018** (Slice 20) — salt, not yet contaminant.
>
> Both remain **Open candidates** until Lock — implement under them as hypotheses, not settled policy. Binding constraint: **material representation must carry a mobile quantity per cell** so C-010 does not force a rebuild.

Its owner is `structures`, not `engineers`. The same field carries obstruction of two origins — biological (E-005, annual band) and player-sited (A-005/A-006, committed whenever the player acts) — and neither may own it, because a field with two writers has no owner at all. `structures` owns it; `engineers` and `interventions` both contribute through the delta inbox (§11.2), summed in contributor-id order. It sits in the `daily` band so that a player earthwork takes effect at the next day boundary, which is the same boundary at which §7.2 recomputes the cached structural layer — the two would otherwise disagree for the remainder of a storm sequence.

### 3.2 Surface water

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `water.surfaceDepth` | m | [0, 50] | `surfaceWater` | event | no |
| `water.dischargeAccum` | m³ through cell | [0, ∞) | `surfaceWater` | event, `accumulator: {over:"annual"}` | no |
| `snow.waterEquivalent` | mm | [0, 5000] | `soilWater` | daily | no |
| `ledger.outflow[outlet]` | m³ cumulative | [0, ∞) | `surfaceWater` | event | **yes** |
| `ledger.precipitation` | m³ cumulative | [0, ∞) | `climate` | event | **yes** |
| `ledger.et` | m³ cumulative | [0, ∞) | `soilWater` | daily | **yes** |
| `ledger.deepDrainage` | m³ cumulative | [0, ∞) | `soilWater` | daily | **yes** |

The ledgers are `f64` scalars. They are legacy not because ecology depends on them but because the mass-balance invariant (§8.2) is stated against them, and a save that drops them loses the ability to audit the run it resumes. H-004 makes the watershed a memory system; a system that silently loses mass cannot be one (review §1.3).

### 3.3 Soil water and surface hydraulic properties

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `soil.moisture` | m³/m³ | [0, `soil.porosity`] | `soilWater` | daily | no |
| `soil.salinity` | fraction (0 = fresh, 1 = seawater) | [0, 1] | `soilWater` | daily | **yes** |
| `soil.infiltrationCapacity` | mm/h | [0, 500] | `soilSurface` | daily | **yes** |

`soil.salinity` is the first shipped instance of **C-010**'s mobile legacy substance, under Open **C-018**: ocean-sourced at shoreline cells, diluted by freshwater infiltrate, concentrated by ET, save-legacy (T-003). It rides moisture volumes — **no separate salt mass ledger** (H-004 residual class unchanged). Liebig HSI reads it as `f_salinity = 1 − S` (Slice 20). Spray and tidal inundation remain derived until a retune needs them as separate HSI inputs.
| `surface.roughness` | Manning n, s·m^(−1/3) | [0.010, 0.300] | `vegetation` | seasonal | no |

`soil.infiltrationCapacity` is the most consequential field in this table. It is the state variable that makes S-007 mechanical rather than punitive: vegetation raises it, compaction and crusting lower it, and it changes on a slower schedule than the vegetation that produced it. That lag is the fold in the Klausmeier-type feedback (survey §3.1) and it is why restoring rainfall does not restore the vegetated state. It is also the field S-008 names to the player: "infiltration capacity is too low for vegetation to capture this rainfall" is a statement about a registered, inspectable number, not a mood.

`surface.roughness` is owned by `vegetation` and read by `surfaceWater`. That is the cheapest satisfaction of E-005 available, and it is a genuine biology-to-physics edge under the rules in §11: the biological process owns a physical property, rather than reaching into a physical process's state.

`surface.curveNumber` is **derived**, not stored — a lookup on `soil.hydrologicGroup` × cover fraction × antecedent moisture, recomputed each daily step. It is registered as a derived layer so it is inspectable (T-005) without being saved.

### 3.4 Soil organic matter and nutrients

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `soil.carbon.fast` | kg C·m⁻² | [0, 5] | `soilCarbon` | annual | **yes** |
| `soil.carbon.slow` | kg C·m⁻² | [0, 40] | `soilCarbon` | annual | **yes** |
| `soil.carbon.passive` | kg C·m⁻² | [0, 200] | `soilCarbon` | decadal | **yes** |
| `soil.nitrogenAvailable` | g N·m⁻² | [0, 500] | `soilCarbon` | annual | no |
| `soil.litter` | kg DM·m⁻² | [0, 10] | `soilCarbon` | annual | **yes** |

Three pools, not one. The passive pool turning over on a decade-to-century schedule is literally how the landscape remembers land use (S-006), and it is the honest mechanism behind the register's own worked example of hysteresis — a drained wetland that does not recover when the water returns (S-007, wiki Ch. 1). A single "organic matter" scalar cannot produce that behavior and would have to fake it with a penalty, which N-004 forbids.

### 3.5 Vegetation

Four plant functional types for the reference preserve, resolved to species by preserve data exactly as animal roles are (E-004, E-008, W-003): `herb`, `shrub`, `pioneerTree`, `canopyTree`. A fifth, `emergent`, is registered where a preserve has standing water.

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `veg.biomass.herb` | kg DM·m⁻² | [0, 3] | `vegetation` | seasonal | no |
| `veg.biomass.shrub` | kg DM·m⁻² | [0, 20] | `vegetation` | seasonal | **yes** |
| `veg.biomass.pioneerTree` | kg DM·m⁻² | [0, 60] | `vegetation` | seasonal | **yes** |
| `veg.biomass.canopyTree` | kg DM·m⁻² | [0, 120] | `vegetation` | seasonal | **yes** |
| `veg.seedBank.<type>` | seeds·m⁻² | [0, 1e5] | `dispersal` | annual | **yes** |
| `veg.rootDepth.<type>` | m | [0, 3] | `vegetation` | annual | no |

Herbaceous biomass is not legacy — it regrows from present conditions within a season. Woody biomass is: a sixty-year stand is not reconstructible from this year's weather, and a save that reloads a forest as a growth curve from bare ground is wrong even if it looks identical for one frame (T-003: "visual similarity after load is not a correctness test").

`veg.seedBank` is legacy for the reason S-007 states outright: a lost seed bank persists after the pressure that removed it. It is owned by `dispersal` rather than `vegetation` because dispersal is the only process that adds to it, and the single-writer rule (§4) resolves shared-looking state by asking which process's mathematics produces the number.

`veg.lai` (m²·m⁻²) and `veg.coverFraction` are **derived** from biomass by per-type specific leaf area. They are registered as derived layers because Beer–Lambert light competition and the Curve Number lookup both consume them, and a derived registration is what makes those consumers auditable.

### 3.6 Fuel and disturbance

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `fuel.load` | kg DM·m⁻² | [0, 40] | `fuel` | annual | **yes** |
| `fuel.moisture` | kg water·kg dry⁻¹ | [0.02, 3.0] | `fuel` | daily | no |
| `disturbance.timeSinceFire` | sim-years | [0, 1000] | `fire` | annual | **yes** |
| `disturbance.burnSeverity` | dimensionless | [0, 1] | `fire` | event, `accumulator: {over:"annual"}` | no |

Fuel load is legacy for the reason the survey gives (§3.5): accumulated fuel against ignition produces the fire return interval as an emergent property, and the lesson that suppressing small disturbances manufactures large ones is only available if the accumulation persists across saves.

### 3.7 Populations

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `pop.<role>.density` | individuals·km⁻² | [0, role max] | `populations` | annual | **yes** |
| `pop.<role>.stage[k]` | individuals·km⁻² by stage | [0, role max] | `populations` | annual | **yes** |
| `pop.<role>.occupancy` | fraction | [0, 1] | `populations` | annual | **yes** |

Population *structure*, not just headcount, because a population that is currently large and demographically doomed is a different world state from one that is small and growing (S-006, survey §3.4). Carrying capacity is **not a field**. It is computed each annual step from habitat, resources, competition and predation and registered as a derived layer (ES-006). A constant `K` anywhere in the codebase is a direct ES-006 violation, including "just for now".

### 3.8 Climate forcing

| Field | Units | Range | Owner | Band | Legacy |
|---|---|---|---|---|---|
| `climate.precipitation` | mm per event step | [0, 200] | `climate` | event | no |
| `climate.airTemperature` | °C | [−60, 60] | `climate` | daily | no |
| `climate.windVector` | m/s (2 components) | [−50, 50] | `climate` | event | no |

`climate.pet` (mm/day, Hargreaves) and `climate.insolation` (MJ·m⁻²·day⁻¹, slope/aspect with horizon shading) are **derived**; insolation is cached per season and invalidated by terrain change on the same rule as §7.

Whether this forcing is stochastic-but-seeded or authored per scenario is not settled by the register and is not settled here (survey §9.1, §14.7). The registry accommodates both: a stochastic weather generator stores its stream state as a legacy scalar (§9), and an authored sequence stores its cursor. Nothing downstream of `climate.*` needs to know which it is.

### 3.9 Derived structural layers

These are **not saved** and **not owned by a band**. They are recomputed from authoritative state on the invalidation rule in §7, and registered so that they are hashable, inspectable, and citable by consumers.

| Layer | Units | Range | Recomputed from | Invalidated by |
|---|---|---|---|---|
| `flow.direction` | packed D-∞: two neighbor indices + fraction | — | routing surface | `terrain.elevation`, `structure.obstructionHeight` |
| `flow.accumulation` | m² contributing area | [Δx², W·H·Δx²] | `flow.direction` | as above |
| `flow.watershedLabel` | u16 outlet id | [0, outlets) | `flow.direction` + outlet list | as above, or outlet edit |
| `depression.label` | u16 | [0, depressions) | Priority-Flood over routing surface | as above |
| `depression.spillElevation` | m | preserve `[zMin, zMax]` | Priority-Flood | as above |
| `depression.capacity` | m³ | [0, ∞) | Priority-Flood | as above |
| `pond.extent` | boolean per cell | {0,1} | `depression.*` + `water.surfaceDepth` | continuous |
| `twi` | ln(m) | [−5, 20] | `flow.accumulation`, slope | as above |
| `connectivity.currentDensity` | dimensionless | [0, ∞) | circuit solve over habitat resistance | annual, or land-cover change |
| `region.label` | u16 | [0, regions) | clustering of the state vector | annual |

The routing surface is `terrain.elevation + structure.obstructionHeight`, not `terrain.elevation` alone. That single definition is what lets a beaver dam, an excavation and a road berm all create a pond through one mechanism (survey §1.3, §3.7).

Watershed labels and region labels are derived every time they are needed and never stored as authored zones. That is what makes W-002's "labels describe, they do not contain" true in the implementation rather than only in the document.

---

## 4. Data ownership

**Exactly one process is the authoritative writer of each registered field.** The registry records the owner; no other process may write it under any circumstance, including initialization, including "temporarily", including through an aliased buffer.

Three corollaries. Items 1–2 were scaffold defects; both are resolved on the `WorldState` path (Slice 2):

1. **No process holds a copy of a field it does not own.** `HeightfieldHydrology` reads `terrain.elevation` from `WorldState` without cloning. Direct construction bypassing `WorldState` is test-only.

2. **Non-owners contribute, they do not write.** A process that must change a field it does not own declares `contributes` and writes into that field's delta inbox; the owner integrates the inbox in its own band. §11 specifies the protocol.

3. **The renderer holds read-only views.** `WaterStateView` exposes getters and `snapshotWaterDepth()` only; live buffers are not exported (T-006).

Ownership is checkable rather than conventional: with `reads` and `writes` declared per process (§5), a build-time pass verifies that every write target is owned by the writing process and every contributed field has an inbox. That check is the whole reason the declarations exist.

---

## 5. The process model

A process is the only thing permitted to change world state.

```ts
interface Process {
  id: string;                    // stable, sorts deterministically
  band: TimescaleBand;
  reads:        FieldId[];       // including derived layers
  writes:       FieldId[];       // must be owned by this process
  contributes:  FieldId[];       // inbox writes to fields owned elsewhere (§11)
  lagged:       FieldId[];       // reads deliberately taken from the previous band commit
  step(world: WorldState, dt: SimSeconds, ctx: StepContext): void;
}
```

### 5.1 Ordering

Within a band, order is derived, not written down by hand:

1. Build the dependency graph: an edge from producer to consumer wherever one process writes or contributes to a field another reads, excluding fields the consumer declared `lagged`.
2. Topologically sort it.
3. Break ties by `id` string comparison, which is total and platform-independent.

The result is a fixed sequence recomputed only when the process set changes, and it reproduces the wiki's ecological dependency order — climate, hydrology, soil, vegetation, wildlife, disturbance, succession, capacity, readiness — as a *consequence* of the declared reads rather than as a hand-maintained list that can drift from the code.

**Cycles are expected and must be declared.** Vegetation reads soil moisture and writes roughness; hydrology reads roughness and writes soil moisture. That is the loop the project is about (D-003, E-005), and it is not a scheduling error. The cycle is broken by one participant declaring the back-edge field `lagged`, meaning it reads the value committed at the previous band boundary. The lag is then visible in the registry and citable in a review, instead of being an accident of call order that nobody can find later.

### 5.2 Read-then-write

Neighbor-coupled fields are double-buffered or delta-accumulated; cell-local fields may be updated in place.

- **Double buffer.** The process reads the front buffer for the whole pass and writes the back buffer. At band commit the buffers swap. Every cell in the pass therefore sees the same consistent previous state, so a cell's result does not depend on whether its neighbor was visited first.
- **Delta accumulation.** For conservative transport, the process reads the front buffer and accumulates signed changes into a zeroed delta array, applied at the end of the pass. This is what `fluxStep` already does correctly, and it is preferable for transport because the conservation invariant (§8.2) is then checkable as "the delta array sums to the tracked boundary flux".
- **In place.** Permitted only where the process reads no neighbor of the field it writes. Registered fields carry no marker for this; the check is that a process writing field `F` in place must not read `F` at any offset other than zero.

Update-order artifacts are not cosmetic. Every neighbor-coupled model in the survey — diffusion, fire spread, dispersal kernels, the Klausmeier system — produces directional bias when updated in place, and directional bias in a raster looks exactly like a rendering artifact, which is the reason it survives so long undetected. The symmetry invariant in §8.6 is the test.

### 5.3 What a process may not do

- Read wall-clock time, frame time, or any renderer state (T-006).
- Read an unregistered global. The composition root owns configuration and passes it in; the scaffold's direct `import { config }` inside `sim/` is the pattern to finish, not to extend (review §1.7, T-004).
- Allocate per step in a way that changes with state. Determinism does not require it, but unpredictable allocation makes the timestep budget in §6.4 unmeasurable.
- Terminate an iterative solve on a tolerance (§9).

The prediction system (P-006) and every inspector (T-005) are **observers**, not processes. They have `reads` and empty `writes` and `contributes`, and they run after the band commit. A prediction that could influence state would make P-006 self-fulfilling.

---

## 6. The timescale ladder

**Simulation time is not frame time.** `config.simDt = 1/60` is a render cadence wearing an ecological label; nothing depends on it yet, and nothing may (S-003, S-009, T-002, review §4.3, report §3).

### 6.1 The clock

The authoritative clock is an **integer count of simulated minutes**. Integer, so that band boundaries never drift and simulation time is exactly reproducible; minutes, so the fastest band has resolution to spare. Habitat's calendar is **360 days of 24 hours**, twelve 30-day months, which makes the ladder nest exactly with no residue at any boundary.

| Band | Δt | Period in ticks | Systems |
|---|---|---|---|
| `event` | 1 sim-minute | 1 | Surface flow, runoff generation, fire spread, storm forcing |
| `daily` | 1 sim-day | 1 440 | Soil moisture, infiltration capacity, ET, snowmelt, fuel moisture, phenology |
| `seasonal` | 10 sim-days | 14 400 | Vegetation growth, light competition, roughness, wildlife distribution |
| `annual` | 360 sim-days | 518 400 | Population dynamics, seed bank, fuel load, succession outcome, capacity, connectivity |
| `decadal` | 10 sim-years | 5 184 000 | Soil carbon passive pool, soil depth, porosity, channel incision, hillslope diffusion |

A band runs when `tick % period == 0`. When several bands are due on the same tick they run **fastest first**, because slow processes consume quantities the fast processes accumulated.

### 6.2 The event band is gated

Running surface flow every simulated minute for a simulated decade is neither affordable nor meaningful — most simulated minutes have no surface water in them. The event band is therefore **activity-gated**: it steps only when the gate predicate holds, and the gate is a pure function of authoritative state, so it is identical on replay.

```
eventBandActive = (any water.surfaceDepth > dryEpsilon)
               or (climate.precipitation > 0 anywhere)
               or (any cell burning)
```

Between storms the ladder starts at `daily`. This is not an optimization bolted onto the design; it is the design. S-005 says fast systems teach, and the player watches storms at low time rates and dry decades at high ones. It also means a storm genuinely takes longer in wall-clock time than a drought does, which is correct: T-002 forbids the *outcome* changing with the chosen rate, not the wall time.

### 6.3 Substepping

The event band's 1-minute Δt still exceeds the stability limit of an explicit surface-flow scheme at Δx = 10 m. Surface flow substeps internally, with a **fixed** substep count:

```
nSub = ceil(Δt_event · cMax / (CFL · Δx))
```

`cMax` (declared maximum celerity, per preserve) and `CFL` (0.4) are constants, so `nSub` is a constant for the run — not adaptive, not state-dependent, not tuned per frame. The same discipline applies to explicit diffusion, where `Δt ≤ Δx²/(4D)` is a hard limit that does not degrade gracefully but explodes (survey §7).

### 6.4 Time debt is observable

The wall-clock budget per frame may be exhausted before the tick target is reached. `config.maxStepsPerFrame` dropped the surplus silently, which dilated simulation time under load (review §1.7). Under S-009 the dropped time must be visible: the scheduler carries a `timeDebt` in ticks, exposes it to the dev HUD, and the correct response to sustained debt is to lower the player's time rate, not to skip ticks. Nothing ecological may read `timeDebt`.

**Implemented in Slice L1** ([BUILD_GUIDE §4.36](BUILD_GUIDE.md)). `SimClock` carries the surplus in its accumulator and pays it down on later frames; `maxStepsPerFrame` (16, measured) remains the hard per-frame catch-up ceiling and `maxTimeDebtSteps` (64) is the spiral-of-death guard past which debt is abandoned openly rather than silently. `getTimeDebt()` means *owed*, `getDroppedSteps()` means *abandoned*. Slice L6 supplies the other half §6.4 asks for: the rate control now offers only rates the machine sustains, so "lower the rate" is a choice the player can actually make in stated units — see [evidence/time-throughput.md](evidence/time-throughput.md).

### 6.5 The event band's cost is unresolved

The ladder above is stated as though a 1-minute event band at 256 × 256 were affordable. Measured against the existing solver, it is not.

`fluxStep` benchmarked at 256 × 256 on the reference machine runs **1.06 ms per pass**, about 62M cell-updates per second. At `nSub = 15` that is 16 ms per simulated minute, which gives:

| Simulated span | Compute |
|---|---|
| 1 storm-day (1 440 event steps) | ~23 s |
| 1 decade at 30 storm-days per year | ~115 min |

The activity gate in §6.2 is necessary but not sufficient. It removes dry time, and dry time was never the problem — storm time is, and storms are precisely what the player watches closely (S-005, H-001).

Four ways out, none of which this document is entitled to choose, because each trades against a different decided value:

1. **Coarser event Δt** — 15 sim-minutes rather than 1. Cheapest, and the ladder still nests (96 per day). Costs intra-hour hydrograph detail.
2. **Fewer substeps** — a semi-implicit or steady-state routing scheme during storms, removing the CFL limit. Largest engineering cost, best fidelity retained.
3. **Smaller grid or coarser `Δx`** — 128 × 128 is 4× cheaper. Trades against W-004's whole-preserve readability and GEO-002's cost test.
4. **Event-band locality** — step only cells that are wet or adjacent to wet, since most of a preserve is dry during most storms. Determinism-safe if the active set is a pure function of state, exactly as §6.2's gate is. Probably the highest ratio of saving to risk, and it composes with the other three.

Until this is settled, no physical rate constant should be tuned against the 1-minute assumption, for the same reason §2 says none should be tuned before `Δx` is metric: a constant chosen against a Δt that is about to change by 15× is a constant chosen against nothing. Recorded as §14.15.

---

## 7. Derived structure vs. dynamic flux

Habitat has two representations of where water is, and they are not redundant.

- The **structural layer** — D-∞ flow direction, contributing area, watershed labels, depressions, spill elevations, TWI — is computed from the routing surface in one deterministic pass and cached. It answers *where water goes and what drains to what*.
- The **dynamic layer** — `water.surfaceDepth` stepped by the flux solver — answers *where water is right now, how deep, and how fast*.

Letting them disagree silently is a real risk and the reason this section exists (report §6, Slice 3 note).

### 7.1 Authority

| Question | Authoritative source |
|---|---|
| Which cells drain to which outlet | `flow.watershedLabel` |
| Contributing area at a cell | `flow.accumulation` |
| Where a depression is, its spill elevation, its capacity | `depression.*` |
| Topographic wetness for readiness and prediction targets | `twi` |
| Visible water depth and motion | `water.surfaceDepth` |
| Discharge past a section | `water.dischargeAccum` |
| Whether a cell is currently a pond | both: `depression.label` set **and** depth above threshold |

**No consumer may read both for the same purpose.** Vegetation reads soil moisture and TWI; it does not read surface depth. The renderer reads surface depth; it does not read accumulation. The Field Notebook reads watershed labels for "where", surface depth for "how much" (U-006).

### 7.2 Invalidation

The structural layer is marked dirty by any write to `terrain.elevation`, `structure.obstructionHeight`, or the authored outlet list. Recomputation happens at the **next band boundary at or above `daily`**, never inside an event-band sequence, so every event step within a day sees one consistent structure. A terrain edit made during a storm therefore takes effect at the following day boundary — which is also the honest ecological answer, since the flux solver continues to route over the edited surface immediately and only the cached topology lags.

Dirty tracking is automatic: the registry knows which layers derive from which fields, and the process interface declares writes, so no process has to remember to invalidate anything.

### 7.3 Disagreement is a bug, not a case to handle

Where the two layers imply different answers — flux ponds water in a cell that Priority-Flood says is not in a depression, or a depression stays dry across a season of rainfall routed into it — the resolution is **not** to correct one toward the other. Correction hides which of the two is wrong. Instead:

> **Structural agreement invariant.** After the surface has settled (no cell's depth changing by more than 1e-5 m per event step for 60 consecutive steps), the set of cells with depth above the pond threshold must be a subset of the union of depression footprints, within a tolerance of 1% of cells. Violations fail the dev build.

A persistent violation means either the cached structure is stale (an invalidation was missed) or the flux solver is not conservative. Both are defects with distinct fixes, and papering over them with a reconciliation pass would guarantee that neither is ever found.

---

## 8. Invariants

**A determinism test is structurally blind to a wrong answer.** Slice 1's determinism test passed while `dt`, `flowRate` and terrain slope had no effect on flow rate whatsoever — every wet cell shed exactly half its water per step, and ponds oscillated 2× from a one-part-per-million perturbation. The test compared a run against itself and was perfectly happy (review §1.6, report §5). Determinism says the model is reproducible. It says nothing about whether it is a model of anything.

Every process therefore declares at least one invariant from the classes below, and the invariant is a committed test, not a review comment.

### 8.1 Bounds

Every registered field's `range` is checked at every band commit in dev builds, over the whole raster. Cheap, total, and generic — the registry makes it one function rather than one per system. A NaN anywhere is a hard failure, not a clamp.

### 8.2 Mass conservation

Water, in metres and cell area, over any interval:

```
Σ(water.surfaceDepth · Δx²)
  + Σ(soil.moisture · soil.depth · Δx²)
  + Σ(snow.waterEquivalent · 1e-3 · Δx²)
  + ledger.outflow + ledger.et + ledger.deepDrainage
=  initial storage + ledger.precipitation
```

Tolerance: relative error ≤ 1e-6 per event step, ≤ 1e-4 accumulated per sim-year. Ledgers accumulate in `f64` even though fields store `f32`, because the drift over a decade of simulated time is otherwise larger than the quantity being audited.

The same statement applies to sediment (Exner continuity: eroded volume equals deposited volume plus tracked export) and to seed and individual counts (dispersed equals established plus mortality plus tracked off-map loss).

This invariant alone would have caught the boundary drain in §10.

### 8.3 Refinement

`N` steps at Δt and `2N` steps at Δt/2 must **converge** toward the same state, not be identical. Identical results under halved Δt mean Δt is not in the equations. This alone would have caught the dead `dt` on day one, and it is the standing guard for S-009: a step must mean an amount of simulated time or nothing downstream of it can be expressed in simulation time.

The scaffold now has a version of this test (`hydrology.determinism.test.ts:149`). It is the right test and its tolerance should tighten as the solver improves. The equilibrium check in §8.4 is at `:128`.

### 8.4 Equilibrium

A system at rest stays at rest, and a small perturbation decays rather than growing. Flat terrain, uniform depth, one cell perturbed by 1e-6, traced for 60 steps: the perturbation must shrink monotonically in L∞. This alone would have caught the pond oscillation, and it must be checked in a form that damping cannot satisfy — a damping term added to hide a missing stability clamp reintroduces a Δt-dependent artifact while making the test pass.

### 8.5 Monotonicity

Directional statements that must hold regardless of tuning: more rain never yields less runoff; more shade never yields more understory light; higher roughness never yields faster flow; lower infiltration capacity never yields less runoff for the same storm. These are the cheapest tests in the suite and they catch sign errors that bounds checks miss entirely.

### 8.6 Symmetry

Symmetric terrain under symmetric forcing must produce a symmetric result, to bit equality where the scheme permits and to tight tolerance otherwise. This catches the entire class of update-order and index-order bias, which is otherwise nearly invisible — it renders as a plausible-looking directional preference in the water and the vegetation, and reviewers read it as terrain.

### 8.7 Structural agreement

§7.3.

---

## 9. The determinism contract

T-001 is **Locked** and exact: identical authoritative state, seed, configuration, timestep schedule, and player inputs produce identical future simulation state. In practice that requires all of the following.

**Fixed accumulation order.** Floating-point addition is not associative. Every reduction iterates a raster in index order or a registry in `id` order. No reduction ever iterates a `Map`, a `Set`, or an object's keys. Global sums use a fixed compensated-summation scheme — Kahan changes the result, but changes it identically every time, which is the property that matters.

**Stored, seeded, named generators.** One PCG32 stream per named purpose — `worldgen`, `weather`, `dispersal`, `establishment`, `mortality` — never a shared stream. Separate streams mean that adding a consumer does not shift another consumer's sequence, which is what makes a save from before the addition still meaningful and what makes a bug reproduction survive an unrelated feature. Every stream's state is a legacy scalar in the registry and is saved (T-003).

**Fixed iteration counts.** Any iterative solver — the circuit-theory connectivity solve, a groundwater relaxation, a k-means region clustering — runs a declared, constant number of iterations. Never a tolerance: tolerance-based termination varies across platforms and turns a numerical detail into a divergence.

**No renderer influence.** No process reads frame time, viewport size, device pixel ratio, camera state, or anything the renderer owns. The renderer's access to simulation state is read-only by type (§4). The simulation runs headless, and the headless test is the demonstration rather than the assertion (T-006).

**Field ordering in the state hash.** The canonical state hash is FNV-1a over every registered field's bytes, visited in `id` order, including derived layers only when they are being audited. Registry-driven hashing is total by construction: a field added without a hash update is impossible, which is the failure mode a hand-maintained hash always eventually has.

**Golden hashes are committed.** Each slice commits the hash constant its physics produces, so a physics change trips CI deliberately instead of a test comparing a run against itself and agreeing with whatever it did (review §1.6).

**Declared compatibility boundary.** T-001 requires cross-platform bit identity only where the implementation claims compatible replay, and requires boundaries to be declared rather than silently diverge. Habitat's declaration:

- Replay identity is guaranteed within one JavaScript engine family at one major version on one CPU architecture. `Math.exp`, `Math.pow`, `Math.sin` and friends are not specified to bit precision and do differ.
- A save stores an `engineFingerprint` (engine, major version, architecture) and the state hash at the tick it was written.
- Loading on a mismatched fingerprint succeeds, recomputes the hash, and if it differs marks the session **replay-divergent**. A replay-divergent session plays normally and saves normally; what it loses is the claim that a prediction comparison or a golden-hash regression from another machine means anything.

Silence would be the violation. A declared, checked, visible boundary is not.

**Slow accumulators.** Fields in the `decadal` band that integrate small increments over thousands of steps — passive carbon, soil depth, cumulative incision — accumulate in `f64` and are stored as `f64`, or as fixed-point where a bounded representation is preferable. `f32` accumulation over 10 000 simulated years loses the increment entirely once the running total is large enough, which reads in play as a slow variable that simply stops moving.

---

## 10. Boundary conditions

The map edge and a watershed outlet are different things, and conflating them lets the terrain datum silently govern drainage (review §1.3, report §7.4).

**Canonical outlet (C-015 Locked; supersedes W-001).** When a preserve declares a global **sea level**, the ocean *is* the outlet: every cell with `terrain.elevation < seaLevel` is an ocean cell, surface water there exchanges with `ledger.oceanExchange`, and Priority-Flood seeds from the ocean set. The map edge of the *grid* remains no-flow among land cells; water leaves the island where land meets sea, not where the array ends. Sea level is a force dial (no cell targeting — C-004 Locked). Sea level sits **above** `elevationFloor` so dig/soil clamps stay unchanged. Island + sea datum is the playable default; closed-basin / no-`seaLevel` remains for probes.

**Legacy / probe mode.** Without `seaLevel`, the scaffold keeps **no-flow mirroring** at map edges (`src/sim/hydrology/fluxStep.ts`) and optional provisional perimeter minima (`computePerimeterOutlets`) so closed-basin tests and pre-island baselines remain valid. Authored pour-point rating curves (§10.2 historical design) are not the island path.

### 10.1 The edge is closed (grid artifact)

The map edge is **no-flow** (Neumann) for land↔land flux across array bounds. An off-map neighbor's surface mirrors the cell's own surface, so the computed gradient is zero and nothing crosses *the array*. Under W-002 and W-006 the preserve is the world of interest; under C-015 the *ocean* — not the array edge — is the physical boundary that receives runoff.

Per-field boundary rules:

| Quantity | Edge / ocean rule |
|---|---|
| Surface water, soil water, sediment | No-flow at array edge; **ocean cells** (elev < seaLevel) absorb/exchange via `ledger.oceanExchange` when sea level is set; else optional perimeter outlets (§10.2 legacy) |
| Heat, light, wind | No-flow (mirror) |
| Seeds, dispersing individuals | **Absorbing** at array edge → `ledger.dispersalLoss`; island overseas arrival is a separate kernel (**C-019**) |
| Fire | No-flow; fire reaching the edge or ocean stops there |
| Flow routing | Ocean cells are open boundary seeds for Priority-Flood when sea level is set; otherwise edge cells that are not outlets route inward |

Dispersal is absorbing rather than reflecting because reflection manufactures propagule pressure at the edge, which produces a bright ring of establishment along the perimeter that looks like an ecological pattern and is not.

### 10.2 Outlets: ocean (leading) or authored / provisional (legacy)

**Ocean outlet (C-015).** Preserve option `seaLevel: number` (metres on the elevation datum). Ocean mask = `elevation < seaLevel`. Flux into ocean cells (or holding ocean cells at sea stage) removes water from the terrestrial surface store and adds the same depth·cell to `ledger.oceanExchange` in the same operation so mass balance (§8.2) closes. `flow.watershedLabel` may label cells by the ocean reach their path drains to.

**Tidal envelope (C-016 Open).** Optional half-range amplitude around sea level yields `MLW = sea − amp`, `MHW = sea + amp`. Derived mask `shore.intertidal` marks cells with `MLW ≤ elevation < MHW`. No per-event tidal phase (S-009). Ocean outlet stays at `seaLevel` — the envelope is habitat geometry, not a second hydrology.

**Shore exposure (C-017 Open).** Derived `shore.exposure` from fetch × onshore wind at the coastline. Coastal retreat (Δelev = Δdepth) integrates inside the geomorphology owner only — no SWE solver, no second sediment writer. Wind is a global force dial.

**Longshore / beaches (C-017 Open, Slice 19).** Derived signed `shore.longshore` = exposure × (û · shore tangent). Retained coastal erosion redeposits on lee shore weighted by max(0, û · n̂)·(1 − exposure); ocean share → `ledger.shoreErosion`. Same sole sediment writer.

**Legacy authored outlets.** A watershed pour point with location and rating curve remains a valid *closed-island-absent* design:

```
outlet = {
  id, cells[], invertElevation (m), ratingCurve: (stage m) -> (discharge m³/s)
}
```

**Provisional perimeter minima** (Slice 8c) exist only so non-island mountains are not closed bathtubs until C-015 lands in the playable default; they are not the long-term model.

A preserve with no sea level and no declared outlet is legal and is a closed basin. Its water leaves only through evapotranspiration and deep drainage / GW paths.

### 10.3 Deep drainage

Vertical loss below the soil column goes to `ledger.deepDrainage` at a rate set by the substrate, or into the groundwater store when that compartment is enabled (C-001 Locked). The ledger remains so mass balance stays auditable when the sink becomes a store.

---

## 11. Biology-to-physics write-back

E-005 is **Locked**: some wildlife modifies physical systems and creates habitat for other life, and the architecture may not forbid the feedback even where breadth is deferred (F-001). Vegetation's effect on roughness and infiltration is the same requirement in a quieter form. The problem is that write-back appears to conflict with §4's single-writer rule. It does not, given a protocol.

Two permitted mechanisms, in order of preference.

### 11.1 Owned physical properties

A biological process **owns** a physical property that physical processes read. `vegetation` owns `surface.roughness`. `vegetation` contributes to `soil.infiltrationCapacity`.

`structure.obstructionHeight` is deliberately *not* an example of this mechanism, even though a beaver dam is its motivating case. Player siting writes the same field, so ownership cannot sit with a biological process; it goes to `structures` and both origins contribute (§3.1). The distinction is worth keeping in view: mechanism 11.1 applies where the biological process is the *only* source of the property.

This is the preferred mechanism because it requires no special machinery: it is ordinary field ownership with the owner on the biological side of the causal boundary. Manning's `n` rising with riparian biomass — slower water, more infiltration and deposition, less incision — is one number connecting the biological layer back to the physical layer and the cheapest possible partial satisfaction of E-005 (survey §1.8).

### 11.2 The delta inbox

Where the physical *state* itself must change — sediment trapped behind a dam, a burrow field lowering the surface, a fire consuming standing biomass — the contributing process does not write the field. Every field that admits outside contribution has an inbox:

1. The registry declares the inbox and its unit, e.g. `terrain.elevation` accepts `terrain.elevationΔ` in metres per decadal step.
2. Contributors declare `contributes: ["terrain.elevation"]` and add into the inbox. Adds are per-cell and signed.
3. The **owner** drains the inbox during its own band step, applies it as part of its own mathematics — so incision, deposition and biological deposition go through one integrator — and zeroes it.
4. Contributions are summed in **contributor order**, which the registry fixes as the sorted list of contributing process ids. Not iteration order, not registration order, not whichever process happened to run first.

Determinism is preserved because the summation order is declared data. Ownership is preserved because exactly one process writes the state field. And the band separation is preserved: a biological process running in the `annual` band cannot change terrain in the middle of an event-band storm sequence, because the terrain owner does not run until its own band boundary.

### 11.3 The integration test

Slice 12 (report §6) should require no new mathematics: a dam raises the routing surface, Priority-Flood gives pond extent and volume, the raised pond stage raises soil moisture in the riparian zone, reduced velocity deposits sediment, wetted ground changes vegetation, changed vegetation changes roughness and infiltration capacity, and the next storm behaves differently. Six steps, all reuse. If any of them needs a new mechanism, something upstream was built too narrowly — and the specific narrowness to watch for is a process that reached into a field it does not own instead of contributing to it.

---

## 12. Save schema and legacy state

A save is a serialization of the registry, not a hand-written struct. It contains:

1. **Schema version** and **content version**, versioned separately (T-004).
2. `clock.tick`, band phase, and `timeDebt`.
3. Every registered field, in `id` order, with its `legacy` flag. A field that is `legacy: true` and absent makes the save **invalid**, not merely incomplete — the load fails rather than reconstructing it, because reconstruction from current conditions is exactly the error T-003 names.
4. Every RNG stream state (§9).
5. Every ledger (§3.2).
6. `engineFingerprint` and the state hash at write time (§9).
7. Authored inputs the run depends on: preserve id, scenario id, outlet list, player intervention history as a list of `(tick, action, parameters)`.

Derived layers are **not** saved. They are recomputed on load, and the recomputation is itself a check: if a loaded save's recomputed structural layer disagrees with the structural agreement invariant (§7.3), the save is reporting a defect rather than a corruption.

Versioning begins **before the first legacy field exists**, so the migration path is exercised while it is trivial (report §7.6). The first genuinely legacy state arrives with soil (Slice 8); the schema version should already be at 2 by then.

**Scenario completion state is stored as a structure that can express any of G-007's four alternatives** — an achieved-at tick, a currently-satisfied boolean, and an evaluation-window history — without the loader interpreting them. G-007 is Open; this model must not resolve it, and storing all three components costs nothing while storing only one would silently pick an option.

---

## 13. Extension contract

A new ecological system joins the model by providing all of the following. This list is the acceptance criterion; a system that cannot supply an item is not ready to be added.

1. **Fields.** Every piece of state it introduces, registered with id, units, shape, storage, valid range, band, and `legacy` designation with a one-line justification of the designation.
2. **Ownership.** Exactly one owner per new field. For any existing field it must change, either an argument that ownership belongs to the new process, or an inbox contribution (§11) — never a second writer.
3. **Band.** Which band it runs in, and why that band rather than the one above and the one below. A system in the wrong band is either unstable or invisible.
4. **Declared reads, writes, contributes, lagged.** With any cycle it participates in named, and the lagged edge chosen deliberately.
5. **Invariants.** At least one from §8, chosen for what it can catch in *this* system rather than for being easy. A conservation law if it transports anything; a monotonicity statement if it does not.
6. **Inspector metadata.** Label, palette, and audience for every field (T-005). Free once §3's registration is done, and the point is that it is free — inspection is product infrastructure, not scaffolding.
7. **One Field Notebook sentence** the system newly makes true and honest (U-006). If the system cannot produce a sentence the notebook could truthfully say, it has added machinery rather than meaning.
8. **The loop it closes.** A slice is not "add a system", it is "close a loop" — A changes B, B changes A — because a system with no consumer produces state nobody reads, which cannot be validated, cannot be tuned, and rots (report §1). Infrastructure slices are permitted and must say so.
9. **Register IDs discharged**, and any decision the implementation made that the register has not, filed as a candidate entry (§0.2 change control).

Three prohibitions, each of which is easy to introduce and expensive to remove:

- **No placeholder scalars.** A temporary `habitatHealth` written to make a demo move outlives everyone's intention to remove it and violates D-002 and N-002 the whole time. If a value is needed before its system exists, register it as a field with a declared owner and a constant process, so it appears as debt in the registry rather than hiding in a call site.
- **No fixed carrying capacity.** Capacity is computed from habitat, always (ES-006). A constant `K` "just for Slice 5" is painful to remove in Slice 11.
- **No single health scalar.** Aggregate indices are permitted as inspectors over named contributors. They are not permitted as the thing the game optimizes (D-002, G-004, N-002).

---

## 14. Decisions this model implies that the register has not made

Filed as candidate register entries per §0.2, not as decided policy. Each is a real fork that this document had to take a position on in order to be implementable; each should either acquire an entry or be corrected.

1. **The world is a regular square grid with a per-preserve cell size in metres.** §2 commits to a raster world model with `Δx` as preserve data and a working default of 10 m over 256 × 256. T-007 settles heightfield-versus-voxel for the prototype and the wiki says spatial structure is an engineering choice, but nothing decides that the *game's* spatial unit is a metric cell, and cell size governs which processes are even representable. Affects: world generation, every physical constant, GEO-002's cost test.

2. **Simulation time is an integer count of simulated minutes on a 360-day calendar.** §6.1. S-009 requires ecological durations in simulation time and T-002 leaves multipliers to tuning, but nothing defines the unit a step represents. The 360-day year is chosen so the band ladder nests without residue; it is a real commitment about seasonality and phenology. Affects: scenario authoring, persistence windows (G-005), every cooldown.

3. **The event band is activity-gated and dormant between storms.** §6.2. This is how the fastest band becomes affordable, and it means simulated wall time per simulated day is not constant. S-003 requires continuous simulation and T-002 requires outcomes invariant under rate; a gated band satisfies both, but "the world continues to simulate while the player observes" deserves an explicit reading against a band that is legitimately dormant.

4. **Boundary policy: closed edges, authored outlets, absorbing dispersal.** §10. Flagged by review §4.1 as currently being decided by an implementation detail. Affects W-005 generation, H-004 accounting, and any water-balance objective under G-002.

5. **Terrain is owned by world state, and non-owners contribute through delta inboxes.** §4, §11. Review §4.2 flags that the wiki states the ownership principle but no entry assigns terrain an owner. The inbox protocol is this document's answer to how E-005 (Locked) and F-001 survive single-writer ownership; it is a genuine architectural commitment and should be citable.

6. **Mass conservation is a binding invariant with a tracked boundary ledger.** §8.2. Review §4.4 notes that nothing currently requires water to be conserved. Given H-004, it probably should, and the tolerance figures are this document's proposal rather than anyone's decision.

7. **Whether weather is stochastic-but-seeded or authored per scenario remains unresolved.** Survey §9.1. This model deliberately does **not** decide it: `climate.*` is registered identically either way and the RNG stream exists whether or not weather uses it. The fork has consequences for prediction fairness (P-006) and scenario validation (G-002, G-006), and it needs an entry before Slice 7 rather than after.

8. **The core state schema is engine-fixed; per-preserve extension is data.** Survey §9.2 asks whether the ecological state vector has defined membership. §3 answers yes for the core fields and leaves per-preserve additions to data, which is a reading of T-004 rather than a decision by it. Region clustering (W-002) and multi-factor readiness (E-009) both need the answer.

9. **Plants are typed by functional type, four of them, resolved to species by preserve data.** §3.5. E-004 makes roles rather than species the player's vocabulary for *animals*; nothing extends that to vegetation, and the number of plant functional types is a real fidelity decision under U-002.

10. **Dynamic geomorphology runs only where contributing area or intervention justifies it; soil pools run everywhere.** §3.1, survey §9.5. **C-002 Locked** (owner 2026-07-31): ratifies Slice 8 — channel / high-A erosion (`erosionMinAccumulation`); production everywhere.

11. **The determinism compatibility boundary is one engine family at one major version on one architecture, declared in the save and checked on load.** §9. T-001 requires boundaries to be declared rather than silently diverge; it does not say what the boundary is or what happens when a load crosses it. The replay-divergent session state is this document's invention.

12. **The renderer may not hold references to simulation buffers, enforced by type.** §4. T-006 implies it and review §4/§7.5 flags it as a one-way door currently open. Worth an entry because the failure signature — a determinism bug that reproduces only with rendering enabled — is the most expensive class of bug this project can have.

13. **Inspector metadata is a required part of a field declaration.** §3, §13.6. T-005 makes layered inspection a Locked engine capability and calls debug visualization product infrastructure; making it a registration requirement is how that becomes true by construction rather than by discipline, but it does impose a cost on every field forever.

14. **Time debt under load is observable and never silently absorbed.** §6.4. Review §1.7 raises it as a minor item; under S-009 it is the difference between simulation time meaning something and meaning whatever the frame budget allowed.

15. **The event band's Δt, and how surface flow is made affordable, are unresolved.** §6.5. The 1-minute band is measured at roughly 23 seconds of compute per simulated storm-day at 256 × 256, and about two hours for a simulated decade of ordinary storminess. Whichever of the four options is taken changes the fastest band's Δt, which S-009 makes a decision about what a duration *means* rather than a performance setting. This is the only item in this list that blocks tuning rather than merely lacking an entry.

Two entries the register marks unresolved are deliberately left unresolved here. **RC-003** — the consequence of a failed introduction — is informed by the population fields in §3.7 and by the Allee-effect candidate the survey raises (§3.4), and Slice 11 is the prototype that should resolve it; this model provides the state that either resolution would need and picks neither. **G-007** — post-completion persistence — is accommodated by the completion structure in §12, which stores enough to express all four of the entry's alternatives and interprets none of them.
