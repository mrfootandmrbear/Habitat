# Review — Slice 0–1 scaffold (`47ebe8c`)

> **Date:** 2026-07-27
> **Reviewed:** `47ebe8c` — *Add Slice 0–1 scaffold with deterministic heightfield hydrology*
> **Scope:** high-level architecture and behavior review against the [Decision Register](../DECISION_REGISTER.md)
> **Method:** register reading, source reading, and behavioral probes run against the real modules (see §5)
> **Status:** advisory. Nothing here supersedes a register entry; §4 lists what may need one.

---

## 0. Summary

The scaffold's architecture is sound and its intent is correctly aimed at T-006, T-007, and T-001. One finding is severe enough to address before Slice 2, because it invalidates every tuning value chosen after it. One more is cheap now and expensive in three slices.

| # | Finding | Severity | Register |
|---|---|---|---|
| 1 | `dt`, `flowRate`, and slope have no effect on flow rate | **Severe** | S-003, S-009, T-002, H-002 |
| 2 | Water oscillates violently near equilibrium | **Severe** (same cause) | H-003, ART-003 |
| 3 | Map boundary drains to absolute elevation 0 | High | H-004, W-005 |
| 4 | Hydrology owns a private *copy* of terrain | High (cheap now) | E-005, F-001, A-005, GEO-002 |
| 5 | `WaterStateView` claims read-only, returns a mutable buffer | Medium | T-006 |
| 6 | Determinism test passes for a weaker reason than it appears | Medium | T-001 |
| 7 | Minor items | Low | T-004, S-009 |

---

## 1. Findings

### 1.1 `dt`, `flowRate`, and slope are all dead parameters — severe

**Where:** [`src/sim/hydrology/fluxStep.ts:58-60`](../../src/sim/hydrology/fluxStep.ts)

`scale = available / totalPositive` is never clamped to ≤ 1. Every candidate outflow carries the same `flowRate · dt` factor, so it cancels exactly:

```
d_i        = diff_i · flowRate · dt
totalPos   = Σ diff · flowRate · dt
out_i      = d_i · (w·0.5)/totalPos
           = 0.5 · w · diff_i / Σ diff        ← flowRate and dt gone
```

Every wet cell with at least one downhill neighbor moves **exactly 50% of its water per step**, unconditionally. Gradient determines *direction* only; it never determines *rate*.

Measured against the real module:

| Varied | Range | Remaining after 1 step |
|---|---|---|
| terrain slope | 0.001 → 1000 (10⁶×) | `0.50000000` in every case |
| `flowRate` | 0.001 → 1000 (10⁶×) | `0.50000000` in every case |
| `dt` | 1/60 → 1.0 (60×) | bit-identical state after 20 steps |

**Why this is a register problem, not just a physics problem.** S-003 and T-002 both say time controls alter the rate and not the governing rules — but the model currently has no notion of time at all, only of steps, so there is nothing for a rate control to scale. S-009 requires every ecologically meaningful duration to be expressed in simulation time; that is presently unexpressible. And H-002 promises the player can read terrain and predict water: they can predict *where*, never *how fast*, because a gentle swale and a cliff drain at identical rates.

**Fix.** Clamp the scale:

```ts
const scale = Math.min(1, available / totalPositive);
```

Outflow then becomes gradient-proportional, with the 50% cap acting as the stability limit it was presumably meant to be. This changes the meaning of every tuning constant in [`config.ts`](../../src/config.ts), which is precisely why it should land before more values are chosen against the current behavior.

### 1.2 Water oscillates violently near equilibrium — severe, same root cause

Flat terrain, uniform water depth 1.0, a single cell perturbed by 1e-6. That cell over six steps:

```
0.5000   1.9062   0.9531   1.2642   0.6321   1.1015
```

A one-part-per-million perturbation produces 2× swings. Because any nonzero gradient still moves half the cell's water, the solver overshoots and rings indefinitely. Ponds will never settle — they will shimmer, which reads as a rendering bug and contradicts H-003's "wetlands and ponds emerge" and ART-003's requirement that visual state correspond to actual state.

**Fix.** The clamp in §1.1 resolves this. Worth stating explicitly to whoever implements, so it is not "fixed" independently by adding damping — damping would mask the missing clamp and reintroduce a dt-independent artifact.

### 1.3 The map boundary is a hole at absolute elevation zero — high

**Where:** [`src/sim/hydrology/fluxStep.ts:39-44`](../../src/sim/hydrology/fluxStep.ts)

Off-map neighbors are assigned `neighborSurface = 0`. The border therefore drains toward absolute elevation zero regardless of the terrain's datum: a preserve sitting at 200 m elevation would have its entire perimeter behaving like a cliff into the void. On a test ramp the domain lost roughly 75% of its water in 20 steps.

Two distinct things are currently conflated and should be separated:

- **The edge** — should be no-flow (mirror the cell's own surface, i.e. a Neumann boundary). A map edge is an artifact of the map, not a feature of the world.
- **The outlet** — should be authored. A watershed has a pour point, and under W-005 that is a real, generated place, not a side effect of the array bounds.

Also worth adding now: a cumulative-outflow scalar, so water balance remains auditable once infiltration, ET, and storage arrive. H-004 makes the watershed a memory system; a system that silently loses mass cannot be one.

### 1.4 Hydrology owns a private copy of terrain — high, and cheap only right now

**Where:** [`src/sim/hydrology/HeightfieldHydrology.ts:22`](../../src/sim/hydrology/HeightfieldHydrology.ts) — `this.terrain = terrain.clone()`

This is the highest-leverage item in the review. Today it is a one-line change; in three slices it is a refactor across every system that touches terrain.

The Design Wiki's data-ownership principle states that each piece of ecological information has exactly one authoritative owner. A cloned terrain means:

- **E-005 is architecturally blocked.** Ecosystem engineers, sediment deposition, and channel incision must write back into terrain. They cannot write into a private copy that nothing else reads. E-005 is **Locked**, and F-001 explicitly requires that the write-back path survive the architecture even while breadth is deferred.
- **A-005 siting breaks silently.** A player earthwork edits the world's terrain; hydrology continues routing over the pre-edit copy. The failure is invisible — water simply keeps going the old way.
- **GEO-002 incision has nowhere to land.**

**Fix.** Terrain is owned by a world-state object; hydrology holds a reference, not a copy. If defensive copying was the motive, the correct instrument is an ownership convention plus the readonly view in §1.5, not duplication.

### 1.5 `WaterStateView` claims read-only but returns a mutable buffer — medium

**Where:** [`src/sim/types.ts:1-9`](../../src/sim/types.ts)

The docstring correctly cites T-006, but `getWaterDepthBuffer(): Float32Array` hands the renderer a writable handle to authoritative simulation state. The probes in §5 wrote through it to construct test conditions — that is the demonstration that the contract is unenforced.

The *contract* is right and the *enforcement* is missing. A readonly view type (or a `readonly` element-access wrapper) costs little now and prevents a class of bug that is very hard to find later, since a renderer writing to simulation state produces a determinism failure that reproduces only with rendering enabled.

### 1.6 The determinism test passes for a weaker reason than it appears — medium

**Where:** [`src/sim/hydrology.determinism.test.ts:23-28`](../../src/sim/hydrology.determinism.test.ts)

The test runs the same schedule twice in one process and compares hashes. That catches nondeterministic iteration order and little else — note that it passed happily with §1.1 in place.

Two upgrades:

1. **Commit a golden hash constant.** Any change to the physics then trips CI deliberately rather than silently, which is what T-001 is actually protecting.
2. **Add a timestep-refinement test.** Assert that N steps at `dt` and 2N steps at `dt/2` converge toward the same state rather than being identical. This is the test that would have caught §1.1 on day one, and it remains the standing guard for S-009.

### 1.7 Minor

- [`fluxStep.ts:58`](../../src/sim/hydrology/fluxStep.ts) — `Math.min(w, w * maxOutflowFraction)` has a dead `min` while the fraction is below 1.
- [`config.ts:10`](../../src/config.ts) — `dryEpsilon` is unused.
- [`main.ts:71`](../../src/main.ts) — `maxStepsPerFrame: 5` silently dilates simulation time under load. The spiral-of-death guard is correct, but under S-009 the dropped simulation time should be observable rather than silent.
- [`HeightfieldHydrology.ts:1`](../../src/sim/hydrology/HeightfieldHydrology.ts) — sim modules import the global `config` directly. The existing `options` parameter is the right pattern; finishing it and letting the composition root own configuration is what T-004 asks for once preserves become data.

---

## 2. What is right and should be preserved

Recorded because a review that lists only defects invites the wrong kind of rewrite.

- The `HydrologyModel` interface is exactly the seam T-007 describes — a backend boundary that does not presume the heightfield is permanent.
- Delta-buffered accumulation in `fluxStep` is genuine read-then-write; neighbor reads see a consistent previous state.
- Fixed index order plus the FNV-1a state hash show that determinism was designed in rather than hoped for.
- The headless test demonstrates the T-006 separation concretely rather than asserting it.
- Register IDs appear in the docstrings at the points where they bind. This is the right habit for a project whose constitution is citable, and it should be treated as a requirement rather than a courtesy.

---

## 3. On voxels and spatial representation

The scaffold is a 2.5D heightfield. T-007 already governs the question: heightfield now, and a voxel or native backend requires *demonstrated Habitat need rather than speculative scale*. That line should hold, with one correction to how the question is usually framed.

The pressure that will actually arrive is not "we need voxels." It is **soil horizons, a water table, and multi-pool soil carbon** — all of which are layered quantities per column. That is a stack of rasters: identical 2D indexing, roughly six to ten floats deep, no sparse structure, no meshing problem, and every candidate algorithm in [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) survives unchanged.

Voxels become necessary only for overhangs, caves, and undercut banks. None of those appear anywhere in the register, and W-004's living-diorama framing does not imply them. The expensive mistake available here is conflating "we need vertical structure" with "we need a volumetric representation."

It follows that the seam that matters is **not** the hydrology interface — it is world-state ownership, which is §1.4. Resolve that and the representation question stays cheap to revisit indefinitely. Leave it and the heightfield assumption diffuses into every system that touches terrain, at which point T-007's "not an irreversible engine mandate" stops being true in practice.

---

## 4. Decisions the code is making that the register has not

Flagged as candidate entries rather than defects, per the register's own change-control discipline.

1. **Boundary condition policy.** Whether a preserve's edge is no-flow, an authored outlet, or a free drain is currently decided by an implementation detail (`neighborSurface = 0`). It affects W-005 generation, H-004 watershed accounting, and any future water-balance objective under G-002.
2. **What owns terrain.** §1.4 is an architecture question with register consequences (E-005, A-005, GEO-002). The Design Wiki states the data-ownership principle but no entry assigns terrain an owner.
3. **The relationship between simulation timestep and ecological time.** `simDt = 1/60` is a render cadence. S-009 requires ecological durations in simulation time, and §7 of NATURAL_PROCESS_MATH.md proposes a multi-rate ladder. Nothing currently decides how a simulation step maps to simulated days.
4. **Whether mass conservation is a stated invariant.** T-001 requires determinism; nothing requires that water be conserved except through boundaries the design names. Given H-004, it probably should be.

---

## 5. Reproducing the measurements

Probes were bundled against the real modules and run under Node, without editing the repository — the working tree may be in use by another tool during review.

```bash
./node_modules/.bin/esbuild probe.ts --bundle --format=esm --outfile=probe.mjs && node probe.mjs
```

Three probes were used:

1. **Timestep invariance** — identical rain schedule stepped at `dt ∈ {1/60, 1/6, 1}`, comparing total water and a sampled cell. Result: bit-identical, proving `dt` has no effect.
2. **Gradient and rate sensitivity** — a single wet cell on ramps of slope `{0.001, 0.1, 10, 1000}` and with `flowRate ∈ {0.001, 2.5, 1000}`, measuring depth remaining after one step. Result: `0.5` in all twelve combinations.
3. **Equilibrium stability** — flat terrain, uniform depth, one cell perturbed by 1e-6, traced over six steps. Result: sustained ~2× oscillation.

Probes 1 and 3 are the two worth promoting into the test suite; probe 3 in particular is a compact regression guard for the clamp in §1.1.
