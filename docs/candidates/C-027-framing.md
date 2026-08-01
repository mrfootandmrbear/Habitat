# C-027 — Animal trait expression: population fields, procedural morph + threshold swap (framing)

**Status:** Framing only (Open — do not implement as Locked)
**Date:** 2026-07-31
**Gate:** **F-001** remains Deferred; **L2** (local seed rain), **L3** (mortality as a rate), **L4** (biotic motion), and **L5** (guild competition, itself blocked on **C-023**) land for the plant substrate first. This is architecture for when animal work is unblocked, not a request to start it. AGENTS.md: *"Keep nutrients / animals / SWE off the tip."*

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
- Carrying capacity stays derived each annual step from habitat, resources, competition, and predation — **never a stored constant** (**ES-006**: "a constant `K` anywhere in the codebase is a direct ES-006 violation, including 'just for now'").

### 3.3 Trait update law

First-order movement toward a pressure-derived target, deliberately the same shape **L3** is already committing to for biomass mortality rather than the old instant-clamp:

```
traitMean += traitRate · (pressureOptimum(habitatState) − traitMean) · dt
```

`pressureOptimum` is a deterministic function of the same factor fields HSI composition already computes (moisture, temperature, salinity, exposure, inundation, light) — reused, not duplicated, the same reuse argument **L5**'s own leading direction makes for `lightCompetition.ts`. No RNG anywhere in the update; per-instance visual variety is a render-time concern (§3.4), not a sim-time one.

### 3.4 Render-side

Extends `OccupantMesh`'s existing `InstancedMesh` pattern rather than replacing it:

- One `InstancedMesh` per archetype (or a shared pool), same instancing approach already shipped for the plant guilds.
- Per cell: instance count = `density × cellAreaKm2`, capped at a render budget. This is the literal-readout decision from §2 — fewer visible animals always means genuinely lower simulated density.
- Each instance is a deterministic sample seeded from `(cellIndex, instanceIndex[, tick])` (**T-001**) — no instance persists identity between frames; it's a fresh draw from the field every time, the same non-authority guarantee **T-006** already requires of `OccupantMesh` today.
- Continuous trait → procedural morph (morph-target influence or bone scale on a rigged base mesh).
- Threshold-crossing trait → discrete socket-mesh swap: attach/detach a mesh at a named bone socket when the sampled trait crosses a fixed value. Binary, legible, matches the "a person already knows this happens" test in **C-011**.

### 3.5 Worked example — Herbivore

The only archetype this document fully specs; the others in §3.1 follow the same pattern later, one at a time, the way the plant guilds were each given their own nature-study card rather than all six at once.

| Trait | Pressure | Existing field to reuse | Referent (C-011) |
|---|---|---|---|
| `limbLength` (continuous) | Terrain ruggedness / slope | Terrain-derived slope factor (already computed for geomorphology) | Legs proportionally longer/stockier on rugged ground — the mountain-goat-vs-plains-grazer intuition a player already has |
| `insulation` (continuous) | Local temperature | `factorTemperature`, [`src/sim/habitat/temperatureComposition.ts`](../../src/sim/habitat/temperatureComposition.ts) — already computed for vegetation's kill-threshold term | Thicker coat in cold, thinner in heat — a familiar gradual response |
| `webbing` (discrete swap) | Fraction of home-range time spent inundated | `f_inundation`, shipped under **NS-008** | Webbed feet appear only once a life is genuinely wet enough of the time to matter — a legible threshold, not an arbitrary game rule |

Density's own habitat requirement ("sufficient carrying capacity, appropriate vegetation," DESIGN_WIKI §4) stands in on the existing vegetation-biomass fields within the role's home range — no new resource field is invented for this worked example.

---

## Hard bans

- **No individual entity or identity store.** Every other system in this sim is a field; an animal is not exempt (**T-001**, **T-006**).
- **No stochastic trait drift** while **C-003** is Open — the target must be a deterministic function of pressure fields only.
- **No player-authored or freely-generated creature bodies.** Species identity stays resolved through **W-003**'s fixed, curated pool; only trait *expression* is free-running (**N-003** no species collection game, **N-005** no decorative wildlife, **D-001** no player-authored finished ecosystems).
- **No trait or morph without a real-world referent** a player could already reason about (**C-011**) — a morph must read as a known adaptation story, never an invented "because the game says so" transformation.
- **No fixed carrying-capacity constant** anywhere in the trait or population model (**ES-006**).
- **No GPU-only or render-only authoritative state** — the trait-mean field is the only place a trait exists in truth; the instanced render is always downstream of it (**T-006**).
- **Does not reopen or duplicate L5 / C-023's scope.** Population competition and predation dynamics are a separate, later mechanism; this document specs trait expression for one role's morphology, not population interaction.

---

## Relationship to queued / blocked work

| Entry | Relationship |
|---|---|
| **F-001** (Deferred) | This document is the "extensible write-back path" F-001 asks be preserved for engineers — but the actual SIMULATION_MODEL §11 owned-property / delta-inbox mechanism for ecosystem engineers is **not** designed here; flagged as the next framing gap (§3.1) |
| **L2 / L3 / L4** (queued, plants) | Sequencing precedent this document follows: the plant substrate (local seeding, mortality-as-a-rate, motion) ships first. This document does not ask to jump that queue |
| **L5 / C-023** (guild competition, blocked) | The population-dynamics gap this document leaves open (§4, mesopredators/apex predators) will eventually need the same competition mechanism L5 is blocked on for plants. Do not build animal competition before L5 lands |
| **C-019** (island biogeography, Locked) | Animal dispersal (seed dispersers, and eventually any colonizing role) should follow the same Locked MacArthur–Wilson pool-eligibility / overseas-pressure shape already shipped for plants, once a dispersal mechanism exists for fauna |
| **ES-007** (food webs, Locked) | Trophic interaction — predator/prey coupling, herbivory pressure on vegetation — is explicitly out of scope here. This document specs trait expression for one role in isolation, not the food web |

---

## Owner half (later)

Not a playtest ask now — this is framing, not an implement slice. When the tip actually reaches this work:

1. Confirm the seven-role list (§3.1) is the right starting set, or narrow it further.
2. Confirm herbivore is the right first worked example, given **E-005**'s ecosystem-engineer write-back requirement is Locked but still architecturally unbuilt — an engineer might be the more load-bearing first case despite being harder.
3. Once **L2**–**L5** land and **F-001** is undeferred: walk the worked scenario (a herbivore population's limb-length / insulation / webbing trait-means visibly drifting after a force-dial change) and judge whether it reads as legible, earned adaptation, or as an arbitrary game effect — the same clip-test spirit **D-007** already applies elsewhere.

---

## Tip placement

Framing only — **do not implement**. Stays off tip per AGENTS.md ("Keep nutrients / animals / SWE off the tip") until **F-001** is undeferred and **L2**–**L5** land for the plant substrate.
