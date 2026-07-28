# Natural Process Mathematics — Candidate Survey

> **Status:** Working survey — not binding
> **Role:** Catalog of well-established mathematical models of natural processes, evaluated against Habitat's decided constraints
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md). Nothing here decides anything. Where a candidate would require a decision, it is flagged in §9 rather than assumed.

---

## 0. What this document is

A survey of natural processes that already have compact, tested mathematics behind them, judged on whether they fit *this* game rather than whether they are good science. Most of them are decades old, cheap on a grid, and deterministic. The value is not novelty — it is that Habitat's register has already committed to behaviors (hysteresis, emergent capacity, emergent succession, biology-to-physics feedback) that these specific equations produce for free, and that hand-authored rules would have to fake.

Each entry gives the model, the governing form, what register entry it serves, and its cost.

---

## 1. How a candidate is judged

Five tests, all derived from decided policy. A process that fails 1–3 should not enter the simulation regardless of ecological merit.

1. **Causal, not cosmetic** — it consumes simulation state and produces simulation state (S-004, U-003, N-004).
2. **Deterministic under stored seed** — no wall-clock, no frame-rate coupling, fixed iteration counts (T-001, T-006).
3. **Legible in its failure** — when it blocks recovery, the blocking variable can be named to the player (S-008, U-006).
4. **Parameterizable, not forked** — one implementation, biome differences expressed as data (S-001, T-004).
5. **Earns its cost** — dynamic behavior only where it changes ecological outcome or player understanding (GEO-002, U-002).

A sixth, softer test: **does it teach something transferable?** (P-004). Several models below are worth including largely because the lesson they produce survives the move to a new preserve.

Open-source *implementations* evaluated as study references (not dependencies) live in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md).

---

## 2. Tier 1 — the causal spine

The minimum set that makes Windward Basin a causal place rather than a terrain toy. Everything here is grid-cheap and runs in a single deterministic pass.

| # | Process | Form | Serves |
|---|---|---|---|
| 1.1 | Flow routing | D8 / D-∞ steepest descent | H-002 |
| 1.2 | Flow accumulation | A = 1 + Σ upstream A | H-002, W-002 |
| 1.3 | Depression handling | Priority-Flood | H-003 |
| 1.4 | Runoff generation | SCS Curve Number | H-001, P-006 |
| 1.5 | Infiltration | Horton or Green–Ampt | H-001 |
| 1.6 | Soil water balance | bucket, dS/dt = P − ET − R − D | H-003, ES-005 |
| 1.7 | Evapotranspiration | Hargreaves PET, moisture-limited AET | ES-005 |
| 1.8 | Channel velocity | Manning | H-002, E-005 |
| 1.9 | Insolation | slope/aspect + horizon shading | ART-001, ES-001 |
| 1.10 | Wetness index | TWI = ln(a / tan β) | P-006, E-009 |

**1.1–1.2 Flow routing and accumulation.** D8 assigns each cell its steepest downhill neighbor; accumulation is one topological sweep of the resulting DAG. This single pair produces the stream network, the watershed boundaries, and the drainage area term every erosion law needs. D-∞ (Tarboton) spreads flow between the two neighbors bracketing the true aspect and avoids D8's characteristic parallel-line artifacts on planar slopes — worth the small extra cost because those artifacts are visible.

Watershed delineation falls out of the same structure: label each cell by the outlet its flow path reaches. That is **W-002's "emergent regions" for free** — a watershed is not painted, it is the set of cells sharing a pour point, and it re-derives itself after every terrain edit.

**1.3 Depression handling.** Priority-Flood (Barnes et al. 2014) fills or breaches sinks in O(n log n) and, critically, reports *depression volume* on the way. That volume is pond storage. Ponds are then not objects — they are depressions whose fill level exceeds a threshold, which means a beaver dam, an excavation, or a road berm all create ponds through one mechanism.

**1.4 Curve Number.** Q = (P − 0.2S)² / (P + 0.8S) for P > 0.2S, with S = 25400/CN − 254 (mm). CN is a table lookup on hydrologic soil group × land cover × condition. Two reasons this is the right runoff model for Habitat despite being an empirical 1950s method: it is a pure data table (T-004), and CN is *the* variable the player moves. Vegetation cover, compaction, and soil development all change CN, so "I restored the riparian strip and the hydrograph changed" is a one-line causal chain the Field Notebook can state honestly.

**1.5 Infiltration.** Horton, f(t) = f_c + (f₀ − f_c)e^{−kt}, if you want cheap and legible. Green–Ampt, f = K(1 + ψΔθ/F), if you want infiltration to depend on current soil moisture — which matters, because it makes a second storm on wet ground behave differently from the first. That difference is a *teachable* one and is worth the extra state.

**1.6–1.7 Water balance and ET.** A per-cell bucket with field capacity and wilting point is enough. AET = PET · f(θ) where f is a piecewise ramp between wilting point and field capacity. Use Hargreaves for PET (needs only temperature range and extraterrestrial radiation) rather than Penman–Monteith; the extra inputs Penman needs are inputs Habitat would have to invent.

**1.8 Manning.** v = (1/n)R^{2/3}S^{1/2}. Roughness n is where riparian vegetation gets its physical grip: more vegetation → higher n → slower water → more infiltration and deposition, less incision. That is one number connecting the biological layer back to the physical layer, and it is the cheapest possible partial satisfaction of E-005.

**1.9 Insolation.** cos of incidence angle from slope, aspect, and solar position, times a horizon-shading term. North-facing slopes stay wetter and cooler, south-facing slopes dry out and burn — a real, visible, immediately legible pattern that costs one precomputed raster per season and makes terrain feel ecologically consequential the first time the player looks at it.

**1.10 TWI.** ln(a/tan β), where a is upslope area per unit contour width. Static enough to compute rarely, predictive enough to be worth reading. This is a strong candidate for the *first* thing the prediction mechanic (P-006) teaches, because a player can learn to eyeball it from terrain and then check themselves against the overlay.

---

## 3. Tier 2 — what makes it Habitat

These are the models that produce the behaviors the register has already committed to but which no amount of authored logic can honestly deliver.

### 3.1 Hysteresis and alternative stable states — Klausmeier / Rietkerk vegetation–water

The most important entry in this document.

```
∂w/∂t = a − w − w·n² + ν·∂w/∂x          (water: supply, loss, uptake, downhill flow)
∂n/∂t = w·n² − m·n + ∇²n                (plants: growth, mortality, dispersal)
```

The nonlinear uptake term `w·n²` encodes scale-dependent feedback: plants improve local infiltration, so vegetated patches draw water from bare ground. This system does three things Habitat needs and has no other honest source for:

- **Spatial self-organization.** Banded and spotted vegetation emerges from a uniform initial condition. Pure D-004.
- **Alternative stable states.** Over a range of rainfall `a`, both vegetated and bare states are stable. Which one you are in depends on history.
- **Genuine hysteresis with a fold.** Cross the collapse threshold and vegetation crashes; restoring rainfall to the old value does *not* bring it back. Recovery requires substantially more water than collapse required removing. **This is S-007 as an equation** rather than as a hand-tuned penalty, and because the mechanism is explicit, S-008's legibility requirement can be satisfied honestly: the game can say "infiltration capacity is too low for vegetation to capture this rainfall" and be telling the literal truth about the model.

Even if Windward Basin is not a drylands preserve, the same structure — a positive local feedback plus a competing long-range depletion — applies to wetland peat accumulation, riparian bank stability, and soil-crust systems. Worth prototyping on its own before deciding where it lives.

**Related, and nearly free once you have it: critical slowing down.** Approaching a fold bifurcation, a system's recovery from small perturbations slows, which shows up as rising lag-1 autocorrelation and variance in the state variable. That is a real early-warning signal used in actual ecology, it is a running-statistics computation over state Habitat already stores, and it is a *superb* fit for both S-008 and P-006 — an inspector that says "this stand is recovering from disturbance more slowly than it did five years ago" is legible, honest, non-prescriptive, and teaches something that transfers to every other preserve.

### 3.2 Emergent succession — Tilman R* and Beer–Lambert light competition

The register requires succession to emerge from conditions rather than run through authored stages (ES-001). Two mechanisms do this, and they compose:

**Resource-ratio (R*) competition.** Each species has an R* — the lowest resource level at which it can maintain itself. The species with the lowest R* for the *currently limiting* resource wins. Because restoration changes which resource is limiting (water early, then nitrogen, then light), the winner changes over time on its own. Succession is then a *consequence* of the resource trajectory, not a timer. Stage labels remain descriptive, exactly as ES-001 requires.

**Light competition.** I = I₀·e^{−k·LAI} (Beer–Lambert). Canopy leaf area shades the understory; shade-intolerant pioneers fail under their own offspring; shade-tolerant species take over. Classic forest succession from one exponential.

Together these give the grass → shrub → forest trajectory without a single authored stage, and — importantly — give *different* trajectories on wet vs. dry, north vs. south, burned vs. unburned sites, from the same rules.

### 3.3 Emergent carrying capacity — Liebig limitation and HSI

ES-006 requires capacity to be computed, not assigned. Two standard forms:

- **Multiplicative / minimum limitation.** growth = r_max · min(f_water, f_light, f_nutrient, f_temp), or the product of the same factors. The `min` form (Liebig's law of the minimum) has a large UX advantage: *it names the limiting factor as a side effect of evaluating it.* The "what is holding this back?" inspector is not a separate explanation system; it is the argmin.
- **Habitat Suitability Index.** HSI = (Π fᵢ)^{1/n} — geometric mean of per-factor suitability curves, the standard USFWS method. Geometric mean is the right aggregator because a zero on any factor zeroes the result, which is ecologically correct and prevents the "high score compensates for no water" failure. Per-factor contributions stay inspectable, which is precisely what E-003 and E-009 demand: evidence without prescription, no single hidden threshold.

### 3.4 Introduction success — Allee effects and stage-structured viability

E-006 says survival determines success; E-007 permits attempting a role under poor conditions; RC-003 is still open on what a failed attempt costs.

```
dN/dt = r·N·(N/A − 1)·(1 − N/K)
```

The Allee effect gives a genuine **minimum viable population**: below threshold A, growth is negative regardless of habitat quality. A small introduction into good habitat can still fail, and the reason is stateable — "the founding group was too small to find mates reliably" — without inventing a penalty. This is the honest mechanical answer to "why did my reintroduction fail?"

**Leslie / stage-structured matrices** add the complementary answer. N_{t+1} = L·N_t, and the dominant eigenvalue λ of L is the asymptotic growth rate: λ > 1 persists, λ < 1 declines. This gives a defensible, computable, non-arbitrary definition of "established" for G-003's persistence window, and it distinguishes a population that is currently large but demographically doomed from one that is small and growing — a distinction a raw headcount cannot make and which is exactly the kind of thing Habitat should teach.

### 3.5 Disturbance — fire as fuel accumulation plus percolation

**Fuel accumulation.** L(t) = (I/k)(1 − e^{−kt}) — the Olson litter model, first-order decay against constant input. Slow, monotone, memory-bearing.

**Spread.** Full Rothermel is available but its parameter demands are heavy. A cellular spread rule with a slope factor e^{a·tan φ} and a wind factor, gated on fuel load and fuel moisture, reproduces the behavior that matters: fire runs uphill, fire runs with wind, fire stops at wet ground and fuel gaps.

**Why this pairing is the right one:** fuel regrowth against ignition produces a **fire return interval as an emergent property** rather than a scheduled event, and the classic Drossel–Schwabl formulation of exactly this system self-organizes to a power-law fire-size distribution — many small fires, rare enormous ones. That is the real disturbance regime, and it means "fire suppression built up fuel and the eventual fire was catastrophic" is something the player can *cause and discover*, not something a scenario has to narrate.

Pulse interventions (A-002, A-006) then have obvious semantics: a prescribed burn is an ignition at a chosen location under chosen conditions, and its extent is simulated, not guaranteed — which is exactly what A-006 says a committed extent is.

### 3.6 Connectivity — percolation threshold and circuit theory

**Percolation.** On a square lattice with 4-neighbor connectivity, an infinite cluster appears at site occupancy ≈ 0.593. This is not decoration: it means habitat connectivity does not degrade smoothly with habitat loss but collapses over a narrow band. A player who learns this — that the last few percent of loss did something the earlier losses did not — has learned something real, transferable, and counterintuitive. The same threshold behavior governs fire spread across fuel, disease spread, and dispersal.

**Circuit theory (Circuitscape).** Model the landscape as a resistor network with per-cell resistance from habitat quality; effective resistance between two patches measures connectivity, and current density per cell measures how much movement funnels through it. It is a sparse linear solve — fully deterministic, no agents required — and current density renders directly as a corridor overlay. Unlike least-cost path, it accounts for the existence of *multiple* routes, which is the thing that actually matters for resilience.

**Metapopulation.** Levins, dp/dt = c·p(1−p) − e·p, with equilibrium occupancy p* = 1 − e/c, plus incidence-function colonization ∝ Σⱼ exp(−α·dᵢⱼ)·Aⱼ. Quantifies what a corridor is worth in the only currency that matters — the probability that a patch is occupied.

**Spread rate.** Fisher–KPP gives an invasion wave speed c = 2√(rD) for a recolonizing population. A closed-form, checkable prediction about how fast a front advances is a strong P-006 prediction target beyond water.

### 3.7 Ecosystem engineering — beaver as pure reuse

E-005 requires biology to write back into physics; F-001 defers breadth but requires the path survive. A beaver dam needs **no new mathematics** if Tier 1 exists:

1. Dam raises local base level → 2. Priority-Flood fill to the spill elevation gives pond extent and volume → 3. Raised pond stage raises the water table via Darcy → 4. Reduced velocity through the pond drops sediment via Exner → 5. Wetted riparian zone changes soil moisture, so vegetation responds → 6. Changed vegetation changes Manning's n and Curve Number, altering the next storm.

Six steps, all reusing Tier 1 and 3.8 machinery. This is the strongest available argument that the Tier 1 spine is the correct spine: the flagship engineer species falls out of it as a boundary condition.

### 3.8 Landscape memory — erosion, sediment, and soil carbon

The three canonical "slow systems remember" processes (S-006), all standard:

- **Stream power incision.** ∂z/∂t = U − K·A^m·S^n, with m/n ≈ 0.5/1. The workhorse of landscape evolution modeling; A comes free from 1.2.
- **Hillslope diffusion.** ∂z/∂t = D∇²z. Creep and soil transport; smooths what incision sharpens. Together these two produce realistic valley networks.
- **Exner sediment continuity.** (1−λ)·∂z/∂t = −∇·q_s. Deposition where transport capacity drops — bars, deltas, ponds filling in.
- **RUSLE.** A = R·K·LS·C·P. Empirical and coarse, but every factor maps to something the player either inherits or controls: C is cover management (vegetation), P is support practice (structural interventions). Excellent as an *inspector layer* explaining erosion risk even if the actual elevation change uses stream power.
- **Multi-pool soil carbon.** dCᵢ/dt = Iᵢ − kᵢ·Cᵢ·f(T)·f(θ), with fast/slow/passive pools (RothC/Century style) and a Q10 temperature response k = k_ref·Q10^{(T−T_ref)/10}. Decade-to-century turnover in the passive pool is *literally* how soil remembers land use, and it is why a drained wetland does not recover when you simply restore the water — the classic S-007 example, now with a mechanism behind it.
- **Soil production.** dh/dt = P₀·e^{−h/h₀} minus erosion. Ties bedrock to soil depth to plant-available water; makes eroded ground slow to return.

Note that GEO-002 explicitly limits dynamic terrain to where it earns its cost. The recommendation implied by that entry: run soil carbon and soil depth everywhere (cheap, per-cell, no neighbor coupling for the pools), and run stream power / diffusion / Exner only in channel and near-channel cells, where the deformation is visible and causal.

---

## 4. Tier 3 — depth once the spine holds

Real models, correctly deferred.

- **Groundwater.** Darcy, q = −K∇h, with a Boussinesq unconfined aquifer. Adds baseflow, so streams keep running between storms and springs appear where the water table meets the surface. Combined with recession Q(t) = Q₀e^{−αt}, it is the mechanism by which a watershed's *storage* — not its rainfall — determines whether it survives a drought. High ecological value, moderate cost (iterative solve).
- **Snowpack.** Degree-day melt, M = DDF·max(0, T − T_melt). One parameter. Turns winter precipitation into a spring pulse, which in many systems *is* the ecological year — floodplain inundation, germination timing, sediment transport.
- **Orographic precipitation.** P = P₀(1 + γ·u·∇z) with downwind depletion. Makes terrain cause climate: windward wet, leeward dry. Enormous payoff for W-005 world generation and for the "why is this valley different?" question.
- **Stochastic rainfall.** Poisson storm arrivals with exponentially distributed depths (Rodríguez-Iturbe). Produces realistic clustering of wet and dry spells — and therefore droughts — with two parameters and no scripting. Deterministic under a stored seed, so it satisfies T-001 as long as the generator state is saved (T-003).
- **Seed dispersal kernels.** Exponential or fat-tailed 2Dt kernel, convolved over the grid; establishment probability p = 1 − e^{−Σ seeds}. Fat tails matter: rare long-distance events dominate colonization rates, which is why isolated patches recover faster than a mean-distance model predicts.
- **Predator–prey with Holling type III.** f(N) = aN²/(1 + ahN²). The sigmoid response gives prey a low-density refuge and stabilizes the system, avoiding the Lotka–Volterra neutral-cycle artifact. Rosenzweig–MacArthur adds the **paradox of enrichment**: raising carrying capacity destabilizes the coexistence equilibrium into oscillations and can crash both populations. Counterintuitive, real, and directly supports G-004 and N-002 — "more productive" is not "better."
- **Landscape of fear.** Rather than simulating predation events, diffuse a *risk field* from cover and openness and weight herbivore foraging by it. Herbivores avoid risky ground, vegetation recovers there, riparian willow returns without a single predation event being resolved. This is the trophic cascade as a raster operation — cheap, deterministic, and visually striking.
- **Ideal free distribution.** Distribute a population across cells proportional to resource availability, at equilibrium. A way to have credible wildlife density without agent simulation, which matters given the cost of individuals at preserve scale.
- **Extreme value statistics.** Gumbel fit to annual maxima gives return periods. Speaks the language the player already knows — "hundred-year flood" — and gives scenario authoring a principled vocabulary for disturbance regime.
- **Meander migration.** Curvature-driven bank erosion (Ikeda–Parker–Sawai), producing cutoffs and oxbows. Beautiful and ecologically important; a strong GEO-002 candidate but a genuine cost, and clearly after everything above.

---

## 5. The transferable lessons these models produce

P-004 asks for knowledge that transfers between preserves. Worth noting explicitly which of the models above *generate a lesson* as opposed to merely generating behavior, because those are the ones that justify their complexity twice:

| Model | Lesson the player can carry to a new preserve |
|---|---|
| Klausmeier bistability | Restoring the original conditions does not restore the original state |
| Critical slowing down | A system recovering more slowly than it used to is a system approaching a threshold |
| Percolation threshold | Habitat loss is smooth until suddenly it isn't |
| Allee effect | A small population in good habitat can still fail |
| Paradox of enrichment | More productivity can destabilize rather than strengthen |
| Liebig minimum | Fixing the second-worst problem changes nothing |
| Beer–Lambert succession | A community that improves its site makes that site unsuitable for itself |
| Fuel accumulation + spread | Preventing small disturbances manufactures large ones |
| Soil carbon pools | The slowest variable decides whether recovery is possible |
| Fisher–KPP | Recolonization speed depends on reproduction *and* movement, multiplicatively |

Each of those is a real principle in restoration ecology, and each falls out of the equation rather than being asserted by a tutorial. That is D-006 and U-004 working as designed.

---

## 6. Poor fits and cautions

Not everything standard belongs here.

- **Agent-based individual animals at preserve scale.** Attractive, and W-004's diorama framing invites it, but individual agents are expensive, hard to keep deterministic under an update-order change, and largely unnecessary — density fields plus an ideal-free or risk-weighted distribution produce the same ecology. Reserve individuals for *rendered* representatives sampled from the density field (T-006 already permits presentation to abstract state). Do not let the renderer's animals become the population.
- **Full Navier–Stokes / volumetric fluid.** T-007 already rejects this for the first preserve. Virtual-pipe shallow water (Mei et al.) is the right middle ground if heightfield routing proves too static; it is cheap, stable, and visually convincing.
- **Full Penman–Monteith ET, full Rothermel fire, full van Genuchten retention curves.** Each demands parameters Habitat would have to fabricate, and fabricated parameters are worse than an honest simpler model — they carry an unearned appearance of rigor. Prefer the reduced form until a real limitation appears. (U-002 says exactly this: fidelity is judged by behavioral consequence, not variable count.)
- **Lotka–Volterra predator–prey as written.** Neutral cycles are a structural artifact, not ecology. Use Rosenzweig–MacArthur with a type II or III response.
- **Unbounded logistic growth as the only population model.** Fine as a scaffold, but with a *fixed* K it directly violates ES-006. K must be an output of §3.3, never a constant.
- **Any model whose output is a single health scalar.** D-002, N-002, G-004. Aggregate indices are permitted as *inspectors* over named contributors; they are not permitted as the thing the game optimizes.
- **Anything requiring a global iterative solve every tick.** Circuit theory and groundwater both need solves; run them at a slow cadence (§7), not per step.

---

## 7. Timescale ladder and numerical notes

S-005/S-006 is not just a design stance — it is a timestep hierarchy. Operator splitting with per-system substepping makes "fast systems teach, slow systems remember" a property of the integrator rather than of hand-tuned constants.

| Band | Δt | Systems |
|---|---|---|
| Event | minutes–hours | Surface flow routing, runoff, fire spread |
| Daily | 1 day | Soil moisture, ET, snowmelt, phenology (GDD) |
| Seasonal | ~10 days | Vegetation growth, light competition, wildlife distribution |
| Annual | 1 year | Population dynamics, succession outcome, fuel load, disturbance regime |
| Decadal+ | 5–10 years | Soil carbon pools, soil depth, channel incision, hillslope diffusion |

Practical constraints:

- **Explicit diffusion stability.** For ∂z/∂t = D∇²z on a 2-D grid, Δt ≤ Δx²/(4D). Violating it does not degrade gracefully — it explodes. Either respect it, substep, or go semi-implicit.
- **Determinism (T-001).** Floating-point addition is not associative, so accumulation order must be fixed; never iterate a hash map to sum; use a stored, seeded generator (PCG or xoshiro) whose state is saved (T-003); fix iteration counts on any solver rather than iterating to a tolerance, since tolerance-based termination varies across platforms. Consider fixed-point accumulators for the long-lived slow variables where drift would compound over decades of simulated time.
- **Read-then-write.** The wiki already requires double-buffered state per timestep. This is not optional for any neighbor-coupled model here — Klausmeier, diffusion, fire spread and dispersal all produce update-order artifacts otherwise, and those artifacts look exactly like directional bias in the rendered world.
- **Cadence, not every tick.** Circuit-theory connectivity, watershed re-delineation, region segmentation, and Leslie eigenvalue evaluation are all fine at annual or on-demand cadence. Only mark them dirty on the events that can change them (terrain edit, major disturbance, land-cover transition).
- **Emergent region labeling (W-002).** Watershed basins come from flow routing; other regions can come from clustering the per-cell ecological state vector (k-means with a fixed seed and fixed iteration count, or connected-component labeling over thresholded state). Either way, regions are *derived* each time they are needed, never stored as authored zones — which is what makes W-002's "labels describe, they do not contain" true in the implementation and not just in the doc.

---

## 8. Recommended sequence

Not a decision — a reading of what the register's dependency structure already implies.

1. **Tier 1 in full.** It is small, it is all deterministic single-pass work, and it makes the reference preserve causal. H-001 already names water as the spine; this is that spine.
2. **§3.3 (Liebig / HSI) next**, because it is what turns hydrological state into ecological meaning and it is the mechanism behind readiness (E-009), the limiting-factor inspector (S-008), and emergent capacity (ES-006) simultaneously.
3. **§3.8 soil carbon + §3.2 light competition**, which together give the game a memory and a succession trajectory.
4. **§3.5 fire**, the first disturbance, and the first pulse intervention with real semantics.
5. **§3.1 Klausmeier** as a *standalone prototype* before deciding where it belongs in the preserve. It is the highest-value and highest-risk item here.
6. **§3.7 beaver**, which by then requires no new math and serves as the integration test for whether the spine is actually coupled.

**Pull-forward (build plan).** When closed-loop dryness between storms is the product bug, [BUILD_GUIDE.md](BUILD_GUIDE.md) §4.3 may pull **Tier 3 groundwater / baseflow** (*lite*, not Richards) ahead of fire as Slice 8b under Open candidate **C-001**. That does not reorder the rest of this list into Locked policy — see DECISION_REGISTER §16.5.

---

## 9. What this raises for the register

Flagged, not decided. Each of these is a question the survey exposes that current entries do not answer.

1. **Is stochastic forcing permitted at all?** T-001 requires determinism under a stored seed, which a seeded rainfall generator satisfies. But P-006 asks the player to predict where water lands, and G-005/G-006 evaluate completion against fluctuating state. Whether weather is *stochastic-but-reproducible* or *authored per scenario* is a real fork with consequences for prediction fairness and scenario validation. Nothing currently says.
2. **Does the ecological state vector have a defined membership?** §3.3 and §7's region clustering both need to know what "ecological state" is composed of. T-004 says content is data-driven; it does not say whether the state schema itself is fixed by the engine.
3. **RC-003 has a candidate answer in §3.4.** The Allee effect makes a failed introduction cost *the founding population and the ecological time spent*, with the mechanism inspectable and no bookkeeping counter — which is precisely RC-003's stated leading direction, and it survives that entry's noted weakness (that ecological consequence approaches zero in a degraded preserve), because the consequence is borne by the introduced population rather than by the resident community. Worth evaluating as the resolution rather than as a data point.
4. **Critical slowing down as a player-facing indicator** would be a new capability under S-008 — an early-warning signal that is honest, non-prescriptive, and computed from state. It is not currently contemplated by any entry, and it sits close enough to E-003's "inform without prescribing" line to deserve an explicit decision.
5. **GEO-002's cost test needs a spatial answer.** §3.8 suggests per-cell soil processes everywhere and geomorphic processes only near channels. That is a defensible reading of GEO-002 but it is a reading, not a decision. Filed as Open candidate **C-002**.

6. **(Also filed.)** Cheap GW/baseflow store → **C-001**. Stochastic vs authored climate → **C-003**.

---

## 10. Source models referenced

Standard, published, and non-proprietary. Listed so derived documents can cite the model rather than re-deriving it.

D8 (O'Callaghan & Mark 1984) · D-∞ (Tarboton 1997) · Priority-Flood (Barnes, Lehman & Mulla 2014) · SCS Curve Number (USDA-NRCS) · Horton (1941) · Green–Ampt (1911) · Manning (1891) · Hargreaves–Samani (1985) · Beven & Kirkby TWI (1979) · stream power incision (Howard 1994; Whipple & Tucker 1999) · Exner · RUSLE (Renard et al. 1997) · RothC / Century soil carbon · soil production function (Heimsath et al. 1997) · Klausmeier (1999) · Rietkerk et al. (2004) · critical slowing down (Scheffer et al. 2009) · Tilman R* (1982) · Beer–Lambert · Liebig · USFWS Habitat Suitability Index (1981) · Allee · Leslie (1945) · Ricker (1954) · Beverton–Holt (1957) · Holling (1959) · Rosenzweig–MacArthur (1963) · Levins (1969) · Hanski incidence function (1994) · Fisher–KPP (1937) · Olson (1963) · Rothermel (1972) · Drossel–Schwabl (1992) · percolation theory (Stauffer & Aharony) · Circuitscape (McRae et al. 2008) · Rodríguez-Iturbe rectangular pulse rainfall (1987) · degree-day melt · Ikeda–Parker–Sawai (1981) · virtual pipes shallow water (Mei, Decaudin & Hu 2007) · Fretwell & Lucas ideal free distribution (1969) · Gumbel extreme value.
