# C-027 — Animal trait expression: population fields, procedural morph + threshold swap (framing)

**Status:** Framing only (Open — do not implement as Locked)
**Date:** 2026-07-31
**Gate:** **F-001** remains Deferred; the plant substrate lands first. **L2** (local seed rain), **L3** (mortality as a rate) and **L4** (biotic motion) have since shipped ([BUILD_GUIDE](../BUILD_GUIDE.md)); **L5** (guild competition, itself blocked on **C-023**) has not, so the remaining gate is **F-001** undeferring plus **L5**. This is architecture for when animal work is unblocked, not a request to start it. AGENTS.md: *"Keep nutrients / animals / SWE off the tip."*

Authority: register **E-004**, **E-005**, **E-006**, **E-007**, **E-008**, **E-009**, **ES-006**, **ES-007**, **W-003**, **N-003**, **N-004**, **N-005**, **D-001**, **T-001**, **T-002**, **T-006**, **F-001**; [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §3.7 (Populations); [DESIGN_WIKI.md](../DESIGN_WIKI.md) §4 (Species and Functional Groups); **C-007** Locked (arrival), **C-011** (real-world intuition), **C-019** Locked (island biogeography), **C-003** Open (stochastic vs. authored forcing), **C-023** Open (guild competition).

---

## Why this document exists

The owner shared an informal design chat (Gemini, 2026-07-31) exploring how animals should work: generic archetypes drawn from the food web, a hybrid model of a stable "frame" expressing a fluid procedural "expression," continuous procedural morphs plus discrete threshold-driven asset swaps, and `InstancedMesh`-based rendering in Three.js. The chat was exploratory and never checked against this register, because it wasn't written with the register in view.

Two facts the chat didn't have: Habitat has **zero animals today** — "life" is six plant-guild biomass fields on a 96×96 grid (`WorldState.ts`), rendered as static colored cones through one `InstancedMesh` (`OccupantMesh.ts`); and animal work is **explicitly deferred and off the build tip** (**F-001** Deferred; the 2026-07-31 living-world review names "the instinct is animals" as the wrong next move; AGENTS.md keeps it off tip). This document reconciles the chat's genuinely useful ideas against what the register already decided, so the architecture is ready the moment **F-001** is undeferred — without proposing to start it now.

This is not a Lock. It does not weaken any cited entry, and it implements nothing.

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
| **Ecosystem engineers** | Needs the **E-005** write-back path (SIMULATION_MODEL §11 owned-property / delta-inbox) in addition to trait fields — flagged as a gap this document does not resolve; see §5 |
| **Mesopredators** | Density/trait fields plus a prey-dependency term — first real touch of **ES-007**'s food-web coupling, out of scope here (§4) |
| **Apex predators** | Same shape as mesopredators, one trophic level up; **E-009** readiness ("often signals a relatively mature ecosystem") suggests this role's density target should read a longer habitat history than the others |
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

**Adaptation is spatial, because the trait mean is a field.** Neighbouring cells under different pressure carry different means, so the same role reads visibly differently across the island — thicker-coated upslope, longer-limbed on the rugged ground. That gradient is the readout that makes the whole mechanism legible from the world rather than from a panel (**U-003**), and it falls out of the field representation for free.

### 3.4 Render-side

Extends `OccupantMesh`'s existing `InstancedMesh` pattern rather than replacing it:

- One `InstancedMesh` per archetype (or a shared pool), same instancing approach already shipped for the plant guilds.
- Per cell: instance count = `density × cellAreaKm2`, capped at a render budget. This is the literal-readout decision from §2 — fewer visible animals always means genuinely lower simulated density.
- Each instance is a deterministic sample seeded from `(cellIndex, instanceIndex[, tick])` (**T-001**) — no instance persists identity between frames; it's a fresh draw from the field every time, the same non-authority guarantee **T-006** already requires of `OccupantMesh` today.
- Continuous trait → procedural morph (morph-target influence or bone scale on a rigged base mesh).
- Threshold-crossing trait → discrete socket-mesh swap: attach/detach a mesh at a named bone socket when the sampled trait crosses a fixed value. Binary, legible, matches the "a person already knows this happens" test in **C-011**.
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

## 4. Food-web coupling — the gaps this document leaves open

**ES-007** is Locked ("producers, consumers, predators, decomposers, and ecosystem engineers affect one another through shared simulation") and this document deliberately does not implement it. That deferral is defensible, but it has consequences the §3 model cannot pretend away, and naming them now is what keeps a later slice from discovering them as a rewrite. **Nothing here is a proposal**; each item is a stated gap and the constraint any eventual answer inherits.

**4.1 Only abiotically-keyed roles are actually specifiable today.** `pressureOptimum` (§3.3) reads HSI factor fields, all of which are physical. That is sufficient for the herbivore worked example, and for pollinators and seed dispersers, whose pressure keys to flowering-vegetation cover — a field that exists. It is *not* sufficient for mesopredators or apex predators, whose density and trait targets depend on prey, a field that does not exist until another animal role does. The seven-role table in §3.1 therefore overstates readiness: four roles could be specified against today's state, three cannot be specified at all until a second role exists to eat.

**4.2 Trophic simultaneity resolves as a one-band lag, and that is a decision.** **ES-007**'s "predator and prey readiness cannot be assessed independently" meets [SIMULATION_MODEL §5.2](../SIMULATION_MODEL.md)'s read-then-write rule: within the `annual` band a predator reads the prey density its own step began with, so the coupled system is solved with a one-band lag rather than simultaneously. A predator responds to *last year's* prey. That is well-defined, deterministic, and almost certainly right — but it is a modelling choice with a visible signature (predator–prey cycles get their period partly from the lag, not only from the ecology), and it should be recorded as chosen rather than discovered.

**4.3 Herbivory is a write-back, and the worked example is the role that forces it.** A herbivore that eats changes `veg.biomass.*`, which `vegetation` owns — so under [§11.2](../SIMULATION_MODEL.md) it contributes to a delta inbox rather than writing the field, exactly as `fire` already does for `veg.cover` and `veg.biomass.herb`. This is the point where "trait expression in isolation" stops being sustainable: a herbivore whose population is simulated but which never consumes anything is decorative wildlife, which **N-005** forbids outright. Either the first animal slice carries a biomass-consumption inbox — the smallest possible piece of **ES-007**, not the food web — or the first worked role should be one with no write-back at all. §3.5 picked the role that cannot avoid the question; owner call in the Owner half.

**4.4 Apex readiness has nothing to read.** §3.1 notes that **E-009** ("often signals a relatively mature ecosystem") implies an apex predator's density target should read a longer habitat history than the other roles. No habitat-history field exists — every HSI factor is instantaneous. Either a slow integrated habitat-quality field is introduced (a new field with its own band and legacy status) or apex readiness collapses to "conditions are good right now," which is precisely the readiness-as-a-checkbox reading **E-009** was written against.

**4.5 Decomposers are the cheapest role and the most blocked.** They need no visible instancing (DESIGN_WIKI: "rarely observed directly by the player"), and their substrate — soil organic matter, [§3.4](../SIMULATION_MODEL.md) — already exists, which makes them arguably a better first case than the herbivore on architectural grounds. They are also the role that most directly touches nutrients, which AGENTS.md keeps off the tip. Noted, not resolved.

**Out of scope, explicitly.** Population competition and predation *dynamics* — who suppresses whom, and by what mechanism — remain **C-023** / **L5** / **ES-007** scope and are not reopened here. §4 names where trait expression touches the food web; it does not design the food web.

---

## 5. Ecosystem-engineer write-back — the gap, stated accurately

**F-001** is Deferred but preserves a requirement: "at least one representative engineer and an extensible write-back path must survive the architecture." It is worth being precise about which half is missing, because the framing is easy to get backwards.

**The path is built and enforced, not pending.** [SIMULATION_MODEL §11.2](../SIMULATION_MODEL.md)'s delta inbox exists in code: `Process.contributes` ([`src/sim/process/Process.ts`](../../src/sim/process/Process.ts)) declares non-owner inbox writes, the scheduler treats them as ordering edges, and [`src/sim/ownership.test.ts`](../../src/sim/ownership.test.ts) asserts the discipline directly — `fire` contributes `veg.cover` and `veg.biomass.herb` rather than owning them; `vegetation` contributes `soil.infiltrationCapacity` rather than owning it. **E-005**'s feedback path therefore already survives the architecture, proved twice, before any animal exists. What is missing is an animal *using* it.

**What an engineer role would still have to declare** — three things, none of them new machinery: which physical field it contributes to, in which unit the inbox is denominated, and on which band it contributes. The third is the one with teeth. Biology runs `annual`; `terrain.elevation`'s owner runs `decadal`, and §11.2 has the owner drain the inbox during its own band step. A beaver's trapped sediment therefore accumulates for up to ten sim-years before it appears in the terrain — correct under the protocol, band-separation intact, but it means an engineer's physical signature lands in decadal jumps rather than continuously. Whether that reads as "the dam did that" or as a delayed unexplained step is a **C-011** question this document does not answer.

**One shape is already settled and worth not re-deriving.** §11.1 explicitly rules `structure.obstructionHeight` out of biological ownership because player siting writes the same field — so an animal engineer's dam contributes to the field the player's own structures write, both origins summing in declared contributor order. That is the intended arrangement, not a collision to design around.

**Still not designed here.** Which roles are engineers, what each one contributes, and what the resulting physical effect is worth to the player. This document specs trait expression; the engineer path is named, its one real constraint (band-crossing latency) is recorded, and the design is left to the slice that undefers **F-001**.

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
- **No trophic term smuggled into `pressureOptimum`.** Prey-dependent roles stay unspecifiable until **ES-007** scope is genuinely opened (§4.1); a predator may not read a prey field this document has not defined.
- **No GPU-only or render-only authoritative state** — the trait-mean field is the only place a trait exists in truth; the instanced render is always downstream of it (**T-006**).
- **Does not reopen or duplicate L5 / C-023's scope.** Population competition and predation dynamics are a separate, later mechanism; this document specs trait expression for one role's morphology, not population interaction.

---

## Relationship to queued / blocked work

| Entry | Relationship |
|---|---|
| **F-001** (Deferred) | The write-back path F-001 asks be preserved already exists and is test-enforced (§5) — `Process.contributes` plus the §11.2 delta inbox, proved by `fire` and `vegetation`. What is undesigned is which animal roles are engineers and what each contributes; §5 records the one constraint that answer inherits (annual biology vs. decadal terrain owner) |
| **L2 / L3 / L4** (queued, plants) | Sequencing precedent this document follows: the plant substrate (local seeding, mortality-as-a-rate, motion) ships first. This document does not ask to jump that queue |
| **L5 / C-023** (guild competition, blocked) | The population-dynamics gap this document leaves open (§4, mesopredators/apex predators) will eventually need the same competition mechanism L5 is blocked on for plants. Do not build animal competition before L5 lands |
| **C-019** (island biogeography, Locked) | Animal dispersal (seed dispersers, and eventually any colonizing role) should follow the same Locked MacArthur–Wilson pool-eligibility / overseas-pressure shape already shipped for plants, once a dispersal mechanism exists for fauna |
| **ES-007** (food webs, Locked) | Trophic interaction — predator/prey coupling, herbivory pressure on vegetation — is explicitly out of scope here. This document specs trait expression for one role in isolation, not the food web |

---

## Owner half (later)

Not a playtest ask now — this is framing, not an implement slice. When the tip actually reaches this work:

1. Confirm the seven-role list (§3.1) is the right starting set, or narrow it further — noting §4.1: only four of the seven can be specified against today's state at all.
2. Confirm herbivore is the right first worked example. The case against it is §4.3: a herbivore that doesn't eat is decorative wildlife (**N-005**), so choosing it means the first animal slice carries a biomass-consumption inbox — the smallest piece of **ES-007** — while a pollinator would keep the food web fully out. An engineer is the other candidate, more load-bearing and harder (§5).
3. Decide whether adaptation is allowed to **fail** (§3.3): when a place demands more than the resolved species' trait envelope holds, the population declines and can go locally extinct rather than morphing further. This is the entry's most consequential taste call — it is what separates earned adaptation from a creature that bends to fit anything.
4. Confirm the plasticity/adaptation split (§3.3): insulation reversible on the `seasonal` band, webbing slow and hysteretic on `annual`, rather than one law at one rate.
5. Once **L5** lands and **F-001** is undeferred: walk the worked scenario (a herbivore population's limb-length / insulation / webbing trait-means visibly drifting after a force-dial change, and a second population failing against its envelope) and judge whether it reads as legible, earned adaptation, or as an arbitrary game effect — the same clip-test spirit **D-007** already applies elsewhere.

---

## Tip placement

Framing only — **do not implement**. Stays off tip per AGENTS.md ("Keep nutrients / animals / SWE off the tip") until **F-001** is undeferred and **L5** lands for the plant substrate (**L2** / **L3** / **L4** have since shipped).
