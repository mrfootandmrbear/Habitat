# C-027 — Animal trait expression: population fields, procedural morph + threshold swap (framing)

**Status:** **Locked** (2026-08-05, owner)
**Date:** 2026-07-31 · **Updated 2026-08-03** (§4 food-web backbone added; owner direction in session) · **Updated 2026-08-05** (Locked; plasticity/adaptation split, turnover-derived rate, trait envelope, hysteretic swap latch, §5 engineer write-back gap, Foxel render mechanism)
**Gate:** Clear. **F-001** undeferred 2026-08-05. **L2**–**L5** (plant substrate, including guild competition, **C-023 Locked**) all landed. This document is now buildable architecture, not a hypothesis — see [BUILD_GUIDE §4.66](../BUILD_GUIDE.md) (A1 Herbivore, tip) / [§4.67](../BUILD_GUIDE.md) (A2 Seed disperser), [CLOUD_AGENT_PIPELINE.md](../CLOUD_AGENT_PIPELINE.md) §3 Track A.

Authority: register **E-004**, **E-005**, **E-006**, **E-007**, **E-008**, **E-009**, **ES-006**, **ES-007**, **W-003**, **N-003**, **N-004**, **N-005**, **D-001**, **T-001**, **T-002**, **T-006**, **F-001**; [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §3.7 (Populations); [DESIGN_WIKI.md](../DESIGN_WIKI.md) §4 (Species and Functional Groups); **C-007** Locked (arrival), **C-011** (real-world intuition), **C-019** Locked (island biogeography), **C-003** Open (stochastic vs. authored forcing), **C-023** Locked (guild competition, 2026-08-03).

---

## Why this document exists

The owner shared an informal design chat (Gemini, 2026-07-31) exploring how animals should work: generic archetypes drawn from the food web, a hybrid model of a stable "frame" expressing a fluid procedural "expression," continuous procedural morphs plus discrete threshold-driven asset swaps, and `InstancedMesh`-based rendering in Three.js. The chat was exploratory and never checked against this register, because it wasn't written with the register in view.

Two facts the chat didn't have: Habitat has **zero animals today** — "life" is six plant-guild biomass fields on a 96×96 grid (`WorldState.ts`), rendered as static colored cones through one `InstancedMesh` (`OccupantMesh.ts`); and animal work is **explicitly deferred and off the build tip** (**F-001** Deferred; the 2026-07-31 living-world review names "the instinct is animals" as the wrong next move; AGENTS.md keeps it off tip). This document reconciles the chat's genuinely useful ideas against what the register already decided, so the architecture is ready the moment **F-001** is undeferred — without proposing to start it now.

**2026-08-05 update.** This document is now Locked (header above) — the reconciliation below was written while it was still framing-only, and the text is left as the historical record of that reconciliation. It does not weaken any cited entry.

---

## 1. What the chat got right, folded into what's already decided

- **Archetype = ecological role.** The chat's "generic archetypes from the food web" is exactly **E-004**/**E-008**/**W-003**: the player thinks in roles (Apex Predator, Herbivore, ...); preserve data resolves the role to a biome-appropriate, curated species. The chat arrived at this independently; it was already Locked.
- **The hybrid model maps onto resolved-species vs. trait-expression.** The chat's "stable frame + fluid expression" split becomes: **frame** = the resolved species/role itself, fixed per preserve (**W-003**, unchanged over a play session); **expression** = population trait-mean fields that drift with local pressure. Identity doesn't move; appearance does.
- **"Evolution as emergent response to pressure, not a scripted upgrade tree"** is **N-004** (no arbitrary hidden rules) and **C-011** (real-world intuition is the instrument) restated in the chat's own words. A trait must move because the place made it move, using the same kind of pressure term vegetation HSI already computes — not an invented rule the player has to learn.
- **Procedural morph (continuous) + discrete socket swap (threshold)** is a good split specifically because it matches **C-011**'s test: a continuous change (heavier coat as it gets colder) is a thing a person's intuition already contains in degree; a discrete change (webbing appears once a life is genuinely wet enough) is a thing intuition already contains as a threshold event. Neither needs to be taught.
- **`T-006` already forces the render layer to be a pure readout.** The chat treated Three.js as a downstream consumer of simulation data without being told to — that's exactly the contract **L4** (biotic motion) is shipping under for plant sway ("a readout of forcing, not decoration"), and the animal render layer inherits it for free.

---

## 2. What must change from how the chat framed it

- **No individual identity, no lifetime mutation.** The chat assumed discrete creatures with position and traits that persist and evolve over an individual's life. Owner direction for this document: **field-simulated, individually-rendered** — the sim only ever owns per-cell aggregate fields (density, trait-mean); nothing tracks a specific animal's history between ticks. Building a persistent per-creature entity store would be a new architecture nothing else in this sim uses, and neither **T-001** (determinism) nor **T-006** (render never authoritative) need it.
- **No open species design.** "Have the game evolve an existing animal or generate a proxy" is not how this project resolves organisms — **W-003**'s fixed, curated per-preserve pool is Locked, and **E-004** keeps the player thinking in roles, never a zoological or creature-design catalog. What's free to vary is trait *expression*; what's fixed is *which* species a role resolves to.
- **No stochastic drift.** "Random mutation" is off the table while **C-003** (stochastic vs. authored forcing) is Open. A trait-mean's target must be a deterministic function of pressure fields, exactly like every other update law in this sim today.
- **Rendered instance count is a literal density readout, not a tuned number.** The owner's direction: how many animals you see in a cell is how many are actually there (density, scaled to cell area, capped for budget) — never an arbitrary "always show 3–12" choice. This keeps the same "what you see is what's true" contract **C-011** already holds the rest of the world to.

---

## 3. Proposed model

### 3.1 Archetype list

The seven DESIGN_WIKI §4 consumer/heterotroph roles, excluding primary producers (already built as the six plant guilds):

| Role | What it needs architecturally, in this model |
|---|---|
| **Pollinators** | Density/trait fields keyed to flowering-vegetation cover (reads existing biomass fields); no new physical write-back |
| **Seed dispersers** | Same density/trait shape; eventually a local term in the L2 seed-rain kernel — the biological analog of what L2 already proposes for plants |
| **Herbivores** | Worked example, §3.5 |
| **Ecosystem engineers** | Needs the **E-005** write-back path (SIMULATION_MODEL §11 owned-property / delta-inbox) in addition to trait fields — flagged as a gap this document does not resolve; see the F-001 row below ("Relationship to queued / blocked work") |
| **Mesopredators** | Density/trait fields plus a prey-dependency term — first real touch of **ES-007**'s food-web coupling, specified in §4 |
| **Apex predators** | Same shape as mesopredators, one trophic level up (§4); **E-009** readiness ("often signals a relatively mature ecosystem") suggests this role's density target should read a longer habitat history than the others |
| **Decomposers** | DESIGN_WIKI: "rarely observed directly by the player." May not need visible instancing at all — a decomposition-rate field decomposers modulate could stay presentation-free, same as most soil chemistry today |

### 3.2 Sim-side fields

Extends [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §3.7 — does not replace it. Per role, per cell:

- `pop.<role>.density` (individuals·km⁻², annual band, legacy) — already spec'd.
- `pop.<role>.stage[k]` (staged demographic structure, annual band, legacy) — already spec'd.
- **New:** `pop.<role>.trait.<name>` — one population trait-mean field per morphable trait the role has, same band/legacy status as density, so trait state survives a save exactly as population structure already does.
- **New:** `pop.<role>.swap.<name>` — the latch state for each threshold trait (§3.4), per cell, legacy. A hysteretic threshold has to remember which side it is on, and that memory is population state on the grid — not per-animal state, which stays banned.
- Carrying capacity stays derived each annual step from habitat, resources, competition, and predation — **never a stored constant** (**ES-006**: "a constant `K` anywhere in the codebase is a direct ES-006 violation, including 'just for now'").

### 3.3 Trait update law

First-order movement toward a pressure-derived target, deliberately the same shape **L3** is already committing to for biomass mortality rather than the old instant-clamp:

```
traitMean += traitRate · (pressureOptimum(habitatState) − traitMean) · dt
```

`pressureOptimum` is a deterministic function of the same factor fields HSI composition already computes (moisture, temperature, salinity, exposure, inundation, light) — reused, not duplicated, the same reuse argument **L5**'s own leading direction makes for `lightCompetition.ts`. No RNG anywhere in the update; per-instance visual variety is a render-time concern (§3.4), not a sim-time one.

**What this law is, and what it is not.** Written as above it is *acclimation*, not evolution: the mean relaxes toward whatever the place currently rewards, at a speed nothing constrains. Trait change in the world has three things this form omits — a generation to happen in, a differential that causes it, and a finite supply of variation to draw on. Each is cheap to add, and each closes a hole that would otherwise ship as an animal that morphs its way out of every pressure and never pays for it.

**Rate is demographic turnover, not a tuned constant.** A population's trait mean cannot move faster than its individuals are replaced, so `traitRate` is derived from the role's own turnover — which is what `pop.<role>.stage[k]` (§3.2, already spec'd) exists to expose, on the same `annual` band [SIMULATION_MODEL §6](../SIMULATION_MODEL.md) already runs population dynamics in. A hand-set `traitRate` is the trait-side equivalent of a stored `K` and is banned for the same reason (**ES-006**): it makes the speed of adaptation an authored constant rather than a consequence of the place.

**The mean moves because the distribution is trimmed.** Selection is a mortality differential, not an attraction. Mismatch — the distance between `traitMean` and `pressureOptimum` — must therefore enter the role's own mortality / capacity term, the same term **L3** ships for plant biomass, and move the mean as a consequence of that term rather than beside it. Without this, a role always establishes because it can always morph, which contradicts **E-006** (survival determines introduction success) and **E-009** (readiness inferred from simulation state) directly: an animal immune to habitat quality makes both unreadable.

**Adaptive room is finite, and it comes from the species.** An unbounded mean drifts forever — limbs lengthen without limit as long as the ground stays rugged. The real bound is standing variation, and the form of it that fits **W-003**'s Locked fixed pool is a per-species trait envelope carried in preserve data: `pressureOptimum` may sit anywhere, but `traitMean` clamps to the envelope of the species the role resolved to. This is not an **ES-006** violation — an envelope is a species property from curated data, not a capacity — and it is what makes the load-bearing case expressible at all. When a place demands more than the species has, the population declines and eventually fails locally *instead of* morphing into something else. That failure is the earned, legible outcome **C-011** asks for; unbounded morph is the arbitrary game effect the same entry forbids.

**Plasticity and adaptation are different processes on different bands.** The worked example's traits are not the same kind of thing and must not share one law. Insulation is a within-lifetime response — `seasonal` band, **reversible**, the coat thickening each winter and thinning each summer. Webbing is a multi-generational morphological change — `annual` at the fastest, slow, and not undone by one mild season. Collapsing both into a single first-order law with a single rate guarantees one of them reads wrong whatever rate is chosen: a coat that takes decades, or webbing that appears in a season. Splitting them costs nothing structurally — two derived rates on two bands — and is what makes each read as an adaptation story the player already holds.

**Adaptation is spatial, because the trait mean is a field.** Neighbouring cells under different pressure carry different means, so the same role reads visibly differently across the island — thicker-coated upslope, longer-limbed on the rugged ground. That gradient is the readout that makes the whole mechanism legible from the world rather than from a panel (**U-003**), and it falls out of the field representation for free. (**C-029**, filed alongside this Lock, asks whether sustained isolation between such gradients should be allowed to read as distinct regional morphs rather than a smooth ramp — a separate, still-Open question this document does not resolve.)

### 3.4 Render-side

Extends `OccupantMesh`'s existing `InstancedMesh` pattern rather than replacing it — and settles the mechanism only framed hypothetically before (2026-08-04 Foxel research, [VISUAL_UPGRADE_NOTE.md](../VISUAL_UPGRADE_NOTE.md)):

- One `InstancedMesh` per archetype (or a shared pool), same instancing approach already shipped for the plant guilds.
- Per cell: instance count = `density × cellAreaKm2`, capped at a render budget. This is the literal-readout decision from §2 — fewer visible animals always means genuinely lower simulated density.
- Each instance is a deterministic sample seeded from `(cellIndex, instanceIndex[, tick])` (**T-001**) — no instance persists identity between frames; it's a fresh draw from the field every time, the same non-authority guarantee **T-006** already requires of `OccupantMesh` today.
- **Continuous trait → skeleton bone-scale.** Base meshes are Foxel-authored (`.fxl` → `fxl2gltf.py` → `.glb`, offline, gitignored toolchain — an asset pipeline, not a runtime dependency, T-006/T-007 clean: no sim state ever lives in the asset). Foxel has no blend shapes/morph targets, so continuous vertex-morphing between two generated variants is off the table — but a `.glb`'s skeleton is an ordinary rigged skeleton, and scaling one of its bones at runtime is standard Three.js `SkinnedMesh` behavior, independent of anything Foxel does or doesn't support. `limbLength`, `insulation` ride bone-scale.
- **Threshold-crossing trait → discrete rung swap.** Foxel supplies a pre-generated ladder of variant `.glb` assets per discrete trait (parametric Python generator, vary the parameter, regenerate); the sampled trait-mean and its latch state (§3.2) pick which rung's asset renders — selected, never blended, matching Foxel's own topology limits rather than fighting them. `webbing` swaps rungs.
- **The threshold latches; it is never bare.** A single fixed value flickers whenever the pressure sits near it — feet webbing and un-webbing as inundation wobbles across the line, which reads as a rendering glitch rather than as a threshold being crossed. The swap therefore uses two values (attach above, detach below) with the latch held in `pop.<role>.swap.<name>` (§3.2), so the state is hysteretic, deterministic on replay, and cheap to assert in a test. The detach threshold sitting well below the attach threshold is also the honest ecology: a morphological change acquired over generations does not come off the moment one wet decade ends.

### 3.5 Worked example — Herbivore

The only archetype this document fully specs; the others in §3.1 follow the same pattern later, one at a time, the way the plant guilds were each given their own nature-study card rather than all six at once.

| Trait | Pressure | Existing field to reuse | Referent (C-011) |
|---|---|---|---|
| `limbLength` (continuous) | Terrain ruggedness / slope | Terrain-derived slope factor (already computed for geomorphology) | Legs proportionally longer/stockier on rugged ground — the mountain-goat-vs-plains-grazer intuition a player already has |
| `insulation` (continuous) | Local temperature | `factorTemperature`, [`src/sim/habitat/temperatureComposition.ts`](../../src/sim/habitat/temperatureComposition.ts) — already computed for vegetation's kill-threshold term | Thicker coat in cold, thinner in heat — a familiar gradual response |
| `webbing` (discrete swap) | Fraction of home-range time spent inundated | `f_inundation`, shipped under **NS-008** | Webbed feet appear only once a life is genuinely wet enough of the time to matter — a legible threshold, not an arbitrary game rule |

Density's own habitat requirement ("sufficient carrying capacity, appropriate vegetation," DESIGN_WIKI §4) stands in on the existing vegetation-biomass fields within the role's home range — no new resource field is invented for this worked example.

---

## 4. Food-web coupling (ES-007 backbone)

**Owner direction (2026-08-03, in session).** Retain the food web as the organizing structure; keep every role terrain-adaptive; keep the render payoff. Narrow everything else — this document does not need to grow beyond those three things. This section resolves §3.1's forward references to "§4" and replaces the Hard-bans line that previously deferred population interaction wholesale: that mechanism is specified below, using **ES-007**'s own Locked criterion — *"role introduction has indirect consequences... predator and prey readiness cannot be assessed independently... simplification may aggregate relationships but cannot remove causality."*

### 4.1 Trophic backbone

The seven §3.1 roles plus the six already-built plant guilds form one chain, not seven independent bars:

```
Producers (6 plant guilds — built; L5 / C-023 gives them competition)
  → Herbivores · Pollinators · Seed dispersers        (primary consumers)
      → Mesopredators
          → Apex predators
  ↺ Decomposers — read standing-dead biomass at every level, close the loop back to soil
Ecosystem engineers — cross-cutting write-back (E-005), not a trophic level (§3.1 gap, still open)
```

Pollinators and seed dispersers read producer fields as §3.1 already says (flowering cover, biomass) but are mutualists, not extractive consumers — they contribute no mortality term to what they read, only a future dispersal-kernel term (L2 precedent, §3.1). Herbivores are the one primary-consumer role with a real extractive coupling to producers, and grazing pressure is not a new mechanism: it is a mortality-rate term on the guild(s) grazed, identical in shape to what **L3** already ships for guild dieback.

### 4.2 Bottom-up: capacity

Repeats **ES-006** at every level instead of once: a role's carrying capacity is a deterministic function of the standing density or biomass of the role(s) below it, never a stored constant —

```
capacity(role) = f(density_or_biomass(preyRole), habitatSuitability(role))
```

Herbivore capacity already reads vegetation biomass (§3.5's "sufficient carrying capacity, appropriate vegetation"). Mesopredator capacity reads herbivore density the same way; apex predator capacity reads mesopredator density the same way again — one function shape, reapplied up the chain, not three bespoke rules.

### 4.3 Top-down: predation as a mortality-rate term

The missing half of the coupling, and the reason ES-007 names independent predator/prey readiness a rejected alternative. Reuses the exact update law **L3** shipped for guild dieback — first-order decline toward a lower target, never an instant clamp — the same reuse §3.3 already cites for the trait law, now applied to density:

```
preyDensity += -predationRate · predatorDensity · dt   (bounded, same clamp family as L3)
```

`predationRate` is a per-pair tuned constant the way `herbMortalityRate` etc. already live in `config.ts` — a rate, not a capacity, so it does not trip **ES-006**. This is what turns the chain into a cascade instead of decoration: apex predators suppress mesopredators → mesopredator pressure on herbivores relaxes → herbivore pressure on producers rises → producers meet the competition mechanism **L5** already shipped. Four already-Locked or already-shipped mechanisms (**ES-006** capacity, **L3**'s mortality-rate shape, **L5** competition, **E-005** write-back for engineers) compose into the food web; nothing in this section is a new kind of law, only a new set of neighbors for existing laws to read.

### 4.4 Terrain adaptation at every level

**§3.3's trait law is already role-agnostic** — restated here to apply to every row of §3.1's table, not only herbivore's worked example. Mesopredator and apex build should read the same kind of terrain pressure herbivore's `limbLength` does: open ground favors a pursuit build (longer legs, lower cover-dependence), broken or forested terrain favors an ambush build (shorter legs, higher cover-dependence) — the pursuit-vs-ambush predator morphology a person's intuition already has (a cheetah is a plains animal; a jaguar is a forest animal), the identical **C-011** referent test §3.5 already applies to herbivore limb length, one trophic level up.

### 4.5 Render — unchanged

§3.4 already generalizes without modification: one `InstancedMesh` per role, sampling that role's own density and trait-mean fields. Nothing in §4.1–§4.4 changes the render contract — a mesopredator's instances read `pop.mesopredator.density` / `.trait.*` exactly as a herbivore's do; the trophic coupling above only changes what feeds those fields, never how they get drawn.

### 4.6 What §4's mechanism doesn't yet make buildable

§4.1–§4.5 specify the *shape* of the food web. They do not, by themselves, make every role in §3.1 sliceable today — naming the remaining gaps now is what keeps a later slice from discovering them as a rewrite.

**4.6.1 Only abiotically-keyed roles are actually specifiable today.** `pressureOptimum` (§3.3) reads HSI factor fields, all of which are physical. That is sufficient for the herbivore worked example, and for pollinators and seed dispersers, whose pressure keys to flowering-vegetation cover — a field that exists. It is *not* sufficient for mesopredators or apex predators, whose density and trait targets depend on prey (§4.2), a field that does not exist until another animal role does. The seven-role table in §3.1 therefore overstates readiness: four roles are specifiable against today's state; three cannot be specified at all until a second, prey-linked role exists to eat — this is a *sequencing* constraint (build the primary consumer first), not a missing mechanism.

**4.6.2 Trophic simultaneity resolves as a one-band lag, and that is a decision.** **ES-007**'s "predator and prey readiness cannot be assessed independently" meets [SIMULATION_MODEL §5.2](../SIMULATION_MODEL.md)'s read-then-write rule: within the `annual` band a predator reads the prey density its own step began with, so §4.3's coupled system is solved with a one-band lag rather than simultaneously. A predator responds to *last year's* prey. That is well-defined, deterministic, and almost certainly right — but it is a modelling choice with a visible signature (predator–prey cycles get their period partly from the lag, not only from the ecology), and it should be recorded as chosen rather than discovered.

**4.6.3 Herbivory is a write-back, and the worked example is the role that forces it.** A herbivore that eats changes `veg.biomass.*`, which `vegetation` owns — so under [§11.2](../SIMULATION_MODEL.md) it contributes to a delta inbox rather than writing the field, exactly as `fire` already does for `veg.cover` and `veg.biomass.herb`. This is the point where "trait expression in isolation" stops being sustainable: a herbivore whose population is simulated but which never consumes anything is decorative wildlife, which **N-005** forbids outright. **A1** (herbivore, [BUILD_GUIDE §4.66](../BUILD_GUIDE.md)) therefore carries a biomass-consumption inbox — the smallest possible piece of **ES-007**, not the food web — as part of its own scope, not a later addition.

**4.6.4 Apex readiness has nothing to read.** §3.1 notes that **E-009** ("often signals a relatively mature ecosystem") implies an apex predator's density target should read a longer habitat history than the other roles. No habitat-history field exists — every HSI factor is instantaneous. Either a slow integrated habitat-quality field is introduced (a new field with its own band and legacy status) or apex readiness collapses to "conditions are good right now," which is precisely the readiness-as-a-checkbox reading **E-009** was written against. Unresolved; blocks apex predator specifically, not mesopredator.

**4.6.5 Decomposers are the cheapest role and the most blocked.** They need no visible instancing (DESIGN_WIKI: "rarely observed directly by the player"), and their substrate — soil organic matter, [§3.4](../SIMULATION_MODEL.md) — already exists, which makes them arguably a better architectural case than the herbivore. They are also the role that most directly touches nutrients, which AGENTS.md keeps off the tip. Noted, not resolved.

---

## 5. Ecosystem-engineer write-back — the gap, stated accurately

**F-001** is undeferred but preserves the requirement it always carried: "at least one representative engineer and an extensible write-back path must survive the architecture." Worth being precise about which half is missing, because the framing is easy to get backwards.

**The path is built and enforced, not pending.** [SIMULATION_MODEL §11.2](../SIMULATION_MODEL.md)'s delta inbox exists in code: `Process.contributes` ([`src/sim/process/Process.ts`](../../src/sim/process/Process.ts)) declares non-owner inbox writes, the scheduler treats them as ordering edges, and [`src/sim/ownership.test.ts`](../../src/sim/ownership.test.ts) asserts the discipline directly — `fire` contributes `veg.cover` and `veg.biomass.herb` rather than owning them; `vegetation` contributes `soil.infiltrationCapacity` rather than owning it. **E-005**'s feedback path therefore already survives the architecture, proved twice, before any animal exists. What is missing is an animal *using* it.

**What an engineer role would still have to declare** — three things, none of them new machinery: which physical field it contributes to, in which unit the inbox is denominated, and on which band it contributes. The third is the one with teeth. Biology runs `annual`; `terrain.elevation`'s owner runs `decadal`, and §11.2 has the owner drain the inbox during its own band step. A beaver's trapped sediment therefore accumulates for up to ten sim-years before it appears in the terrain — correct under the protocol, band-separation intact, but it means an engineer's physical signature lands in decadal jumps rather than continuously. Whether that reads as "the dam did that" or as a delayed unexplained step is a **C-011** question this document does not answer.

**One shape is already settled and worth not re-deriving.** §11.1 explicitly rules `structure.obstructionHeight` out of biological ownership because player siting writes the same field — so an animal engineer's dam contributes to the field the player's own structures write, both origins summing in declared contributor order. That is the intended arrangement, not a collision to design around.

**Still not designed here.** Which roles are engineers, what each one contributes, and what the resulting physical effect is worth to the player. This document specs trait expression; the engineer path is named, its one real constraint (band-crossing latency) is recorded, and the design is left to the slice that takes it on — explicitly not A1 or A2 ([BUILD_GUIDE §4.66](../BUILD_GUIDE.md)/[§4.67](../BUILD_GUIDE.md)), neither of which is an engineer role.

---

## Hard bans

- **No individual entity or identity store.** Every other system in this sim is a field; an animal is not exempt (**T-001**, **T-006**).
- **No stochastic trait drift** while **C-003** is Open — the target must be a deterministic function of pressure fields only.
- **No player-authored or freely-generated creature bodies.** Species identity stays resolved through **W-003**'s fixed, curated pool; only trait *expression* is free-running (**N-003** no species collection game, **N-005** no decorative wildlife, **D-001** no player-authored finished ecosystems).
- **No trait or morph without a real-world referent** a player could already reason about (**C-011**) — a morph must read as a known adaptation story, never an invented "because the game says so" transformation.
- **No fixed carrying-capacity constant** anywhere in the trait or population model (**ES-006**) — and no hand-tuned `traitRate` either, for the same reason (§3.3): the speed of adaptation is derived from demographic turnover, never authored.
- **No adaptation without a survival cost.** Trait mismatch enters the role's mortality / capacity term; a population may not morph its way out of a pressure while its density is untouched (**E-006**, **E-009**).
- **No unbounded trait drift.** Every trait carries a per-species envelope from **W-003** preserve data, and a population that hits the envelope declines rather than continuing to morph.
- **No bare threshold for a discrete swap** — two-value latch with per-cell state (§3.4), so a morph cannot flicker on a pressure field sitting near the line.
- **No GPU-only or render-only authoritative state** — the trait-mean field is the only place a trait exists in truth; the instanced render is always downstream of it (**T-006**).
- **No Foxel output as a runtime dependency.** The toolchain (`.fxl` → `.glb`) runs offline, at build time, gitignored; the shipped app only ever loads static `.glb` files, never generates them at runtime (T-006/T-007).
- **Does not reopen or duplicate L5 / C-023's scope.** L5 governs *plant* guild competition (light budget); §4's predation term governs cross-*role* animal density coupling. Same mortality-as-a-rate shape, different populations — §4 does not reimplement or re-tune L5's own mechanism.
- **No trophic shortcut.** §4.3's predation term may not skip a level (apex predators do not directly suppress herbivores) — the cascade must run through the chain §4.1 states, or it stops being the food web ES-007 requires and becomes an authored effect.

---

## Relationship to queued / blocked work

| Entry | Relationship |
|---|---|
| **F-001** (Current, undeferred 2026-08-05) | The write-back path F-001 asks be preserved already exists and is test-enforced (§5) — `Process.contributes` plus the §11.2 delta inbox, proved by `fire` and `vegetation`. What is undesigned is which animal roles are engineers and what each contributes; §5 records the one constraint that answer inherits (annual biology vs. decadal terrain owner) |
| **L2 / L3 / L4** (shipped, plants) | Sequencing precedent this document followed: the plant substrate (local seeding, mortality-as-a-rate, motion) shipped first |
| **L5 / C-023** (guild competition, Locked, shipped) | Landed 2026-08-03. §4.3's predation term reuses its mortality-as-a-rate shape directly; §4.1's cascade closes through L5's producer-level competition rather than around it |
| **C-019** (island biogeography, Locked) | Animal dispersal (seed dispersers, and eventually any colonizing role) should follow the same Locked MacArthur–Wilson pool-eligibility / overseas-pressure shape already shipped for plants — **A2** ([BUILD_GUIDE §4.67](../BUILD_GUIDE.md)) is where a dispersal mechanism first exists for fauna |
| **ES-007** (food webs, Locked) | §4 is this document's ES-007 backbone: bottom-up capacity, top-down predation-as-mortality-rate, the trophic chain in §4.1. §4.6 names what it still doesn't make buildable (prey-dependent roles, apex readiness) |
| **C-029** (adaptive radiation, Open, framing) | Extends §3.3's per-cell trait-mean field spatially — regional ecomorph divergence under sustained isolation. Gated behind this entry (now Locked) and **A1**+**A2** shipping; not designed here |

---

## Owner half

The machine half of this entry (determinism, no-fixed-K/no-tuned-rate, envelope-bound-and-decline, literal density mapping) is CI-judged (DECISION_CONFORMANCE C-027). The owner half stays legibility, judged once there is a real trait field to look at — same posture BUILD_GUIDE's D-007 clip gate already uses elsewhere:

1. Confirm the seven-role list (§3.1) is the right starting set, or narrow it further — noting §4.6.1: only four of the seven are specifiable against today's state at all, the rest wait on a prey-linked role existing first.
2. Confirm herbivore was the right first worked example, now that §4.6.3 has made the case concrete: a herbivore that doesn't eat is decorative wildlife (**N-005**), so **A1** carries a biomass-consumption inbox from the start rather than deferring it.
3. Once **A1** ships: walk the worked scenario (a herbivore population's limb-length / insulation / webbing trait-means visibly drifting after a force-dial change, and a population failing against its envelope in a place that has stopped suiting it) and judge whether it reads as legible, earned adaptation, or as an arbitrary game effect — the **D-007** clip verdict this entry's Lock note requires before any later Track A slice claims a new Process.
4. Once **A2** ships and **C-029** is reviewable: confirm §4.1's trophic backbone (which roles eat which) and §4.4's ambush-vs-pursuit terrain referent read as correct before any mesopredator/apex slice starts — cheaper to correct in this document than after a species-specific asset exists.

---

## Tip placement

**Locked — buildable.** Opens Track A: [BUILD_GUIDE §4.66](../BUILD_GUIDE.md) (A1 Herbivore, tip) / [§4.67](../BUILD_GUIDE.md) (A2 Seed disperser, next-but-one). Mesopredator, apex-predator, and ecosystem-engineer roles stay off Track A until §4.6 and §5's respective gaps get their own framing pass — this Lock does not, by itself, unblock them.
