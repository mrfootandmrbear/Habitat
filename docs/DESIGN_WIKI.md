# Habitat Design Wiki

> **Status:** Working draft  
> **Role:** Design encyclopedia — explains how decided policy shapes the game  
> **Authority:** The [Decision Register](DECISION_REGISTER.md) is Habitat's constitution. When this wiki conflicts with the register, the wiki is corrected or the register is explicitly superseded.

This document is the beginning of Habitat's design encyclopedia, not a traditional game design document. It explains *how* decisions shape play. Binding *what* and *why* live in the Decision Register.

---

## Contents

0. [Introduction](#0-introduction)
1. [Core Simulation](#1-core-simulation)
2. [Player Systems](#2-player-systems)
3. [Simulation Architecture](#3-simulation-architecture)
4. [Species and Functional Groups](#4-species-and-functional-groups)
5. [World Generation](#5-world-generation)
6. [Scenario System](#6-scenario-system)
7. [Art Direction](#7-art-direction)
8. [User Experience](#8-user-experience)

---

## 0. Introduction

> **Read [THESIS.md](THESIS.md) first.** This wiki was written before the thesis was recorded (2026-07-28) and is the longest document in the repo, which makes it the easiest place to absorb the wrong picture. Habitat is a **living sand castle**: build a form, choose the forces acting on it, run time, and see what became of it. "Restoration" here means **founding** — set something up that will thrive — not repair toward a baseline.
>
> This wiki's restoration language is not an error — it comes from the **scenario** layer (THESIS §3.1), whose motivating premise is *cleaning up a toxic waste site using natural processes*. Sandbox and scenarios are the same simulation seen at different pressures: the sandbox is the sand castle, a scenario puts that loop into a situation with a finite objective (G-002).
>
> Two pillars below need that scoping to be read correctly:
>
> - ***"Intervene sparingly"*** — true of *ecological* intervention, not of sculpting. You do not repeatedly introduce species or force outcomes; you may shape terrain as much as you like (**C-006**: sculpting is abundant, scarcity lives in ecological time, RC-004).
> - ***"Knowledge is progression"*** — legitimate **within a scenario campaign**, where methods are introduced as situations call for them. It does **not** apply to sandbox, which stays fully open (G-001). No progression gating exists today; do not add one to sandbox.

### Purpose

Habitat is a systems-driven ecological restoration game about learning to understand living landscapes.

Players do not conquer nature, optimize production, or engineer perfect ecosystems. They learn to recognize ecological relationships, make informed interventions, and watch landscapes recover over time.

The objective is not to maximize numbers but to cultivate understanding. Success comes from reading the landscape correctly rather than acting constantly.

### Vision

Habitat should make players feel connected to the natural world and develop respect for its complexity.

The world should feel alive without feeling mechanical. Every successful restoration should feel earned through observation rather than solved through optimization.

Although scientifically grounded, Habitat is not a scientific simulator. It is an artistic interpretation of ecological processes designed to encourage curiosity, patience, and stewardship.

### Design pillars

**The world is primary.**  
The ecosystem exists independently of the player. The player influences the landscape but never controls it directly.

**Observation is gameplay.**  
The primary player skill is learning to notice. Looking carefully is an active mechanic, not downtime. Observation generates understanding, which enables better decisions.

**Prediction creates engagement.**  
Players express understanding by predicting ecological outcomes before they occur. Prediction transforms waiting into participation. Instead of merely observing change, players commit to an expectation and compare reality against it. Learning occurs when prediction and outcome differ.

**Intervene sparingly.**  
Most ecological recovery comes from enabling natural processes rather than continuously manipulating them. Player actions should create opportunities for ecosystems to recover rather than forcing predetermined outcomes.

**Emergence over scripting.**  
Large ecological changes emerge from interactions among many small systems. Wildlife, vegetation, hydrology, disturbance, and succession should interact naturally instead of relying on scripted events whenever practical.

**Knowledge is progression.**  
Player progression represents growing ecological understanding rather than increasing power. New interventions become available because the player understands when they are appropriate. The player becomes more capable by becoming more knowledgeable.

**Beauty matters.**  
Habitat is intended to feel like a living work of art. Scientific fidelity supports this goal but does not override it. Visual composition, sound, pacing, and atmosphere should encourage appreciation of the natural world rather than merely communicating information.

### Core player fantasy

The player is not a god, a city builder, or a resource manager. The player is an ecological steward.

They study landscapes. They identify limiting factors. They make carefully chosen interventions. They watch ecosystems respond. Over time they become capable of recognizing increasingly subtle ecological relationships.

### What Habitat is

- A systems-driven ecological restoration game
- A simulation built around ecological relationships
- An observation-driven strategy game
- A learning experience through experimentation
- An artistic interpretation of restoration ecology

### What Habitat is not

- A factory optimization game
- A survival game
- A resource extraction simulator
- A city builder
- A puzzle game with single correct solutions
- A perfect scientific model

### Design philosophy

Healthy ecosystems are not manufactured. They are allowed to recover when their limiting constraints are removed.

The player's role is therefore not to build nature but to create conditions in which nature can rebuild itself. Every mechanic should reinforce this philosophy.

### Guiding principle

The game should reward understanding over activity.

If two players perform the same number of actions, the player who better understands the ecosystem should consistently achieve better long-term outcomes.

### Vocabulary

These terms are used consistently throughout the wiki.

| Term | Meaning |
| --- | --- |
| **Observation** | Collecting ecological information from the landscape. |
| **Prediction** | Expressing an expected future ecological outcome before it occurs. |
| **Intervention** | A deliberate action intended to improve ecosystem conditions. |
| **Readiness** | An indication that ecological conditions plausibly support a functional role; introductions remain player-directed and are not guaranteed. |
| **Succession** | Long-term ecological change as communities develop from conditions and interactions. |
| **Disturbance** | Natural or human-caused events that alter ecosystem structure. |
| **Carrying capacity** | Sustainable population or biomass supported by current habitat conditions; computed from place, not assigned as a fixed cap. |
| **Hysteresis** | Recovery does not necessarily follow the reverse path of degradation. |
| **Institutional knowledge** | Ecological understanding that transfers across preserves — shared rules and relationships, not scenario tricks. |
| **Functional group / ecological role** | A category of organisms defined by ecological function (pollinators, herbivores, engineers, apex predators). Preserve data resolves the role to a biome-appropriate species. |
| **Preserve** | One continuous living landscape under restoration; Habitat's unit of place. |
| **Pulse intervention** | A temporary disturbance or forcing change with onset, duration, and magnitude. |
| **Structural intervention** | A lasting change to constraints — infrastructure, connectivity, earthworks. |

### Relationship to the Decision Register

The **Decision Register** records what has been decided and why.  
The **Design Wiki** explains how those decisions shape the game.

The register is the project's constitutional document. The wiki is its encyclopedia.

Changes to the design should first be reflected in the Decision Register and then incorporated into the appropriate wiki pages to maintain consistency and traceability.

**Decision references:** D-001, D-002, D-003, D-004, D-005, D-006, N-001 through N-005.

---

## 1. Core Simulation

### Purpose

The Core Simulation defines how the ecosystem functions independently of the player.

Every important change in the world should arise from ecological processes rather than hidden scenario logic whenever practical. The player influences these processes through intervention, but the simulation itself remains the primary actor.

This chapter intentionally contains no interface, progression, or implementation details. It describes the behavior of the living world.

### Simulation philosophy

The ecosystem is a network of interacting systems. No single variable determines ecological health.

Landscapes emerge from continuous interactions among climate, terrain, water, soil, vegetation, wildlife, disturbance, and time. Every system both affects and responds to others.

### The living landscape

A Habitat world is always changing. Even without player interaction: plants grow, water moves, nutrients cycle, disturbances occur, wildlife responds, and succession advances.

The player joins an ecosystem already in motion.

### Ecological state

The landscape is represented as a collection of ecological conditions rather than a health bar. Examples include soil moisture, organic matter, erosion, vegetation cover, habitat connectivity, biodiversity, water availability, and structural complexity.

These properties continuously influence one another. No single value determines whether an ecosystem is "healthy."

### Water

Water is the primary driver of ecological change in the reference preserve, and a coherent causal spine for teaching.

Water influences vegetation establishment, soil formation, erosion, wildlife distribution, disturbance severity, and carrying capacity. Flow should arise from terrain and climate rather than authored river splines alone.

Healthy water movement creates opportunities for nearly every other ecological process.

### Soil

Soil is living infrastructure. It stores nutrients, moisture, seeds, microorganisms, and organic matter.

Healthy soil increases ecological resilience. Degraded soil slows recovery even when rainfall is sufficient. Many interventions improve ecosystems indirectly by improving soil first.

### Vegetation

Plants are ecosystem builders. Vegetation stabilizes soil, regulates temperature, captures water, creates habitat, provides food, and alters disturbance regimes.

Plant communities change gradually through succession rather than instantly appearing. Different plant communities create different ecological opportunities.

### Wildlife

Wildlife responds to habitat quality. Animals are not decorative; they are ecological participants.

As habitat improves: pollinators disperse pollen, herbivores regulate vegetation, predators influence herbivore behavior, and ecosystem engineers reshape physical environments. Some wildlife actively modifies the landscape; those modifications become habitat for other organisms.

Wildlife therefore exists as both a consequence of restoration and a driver of further ecological change.

### Functional groups

The simulation operates primarily on ecological roles. Examples include primary producers, pollinators, herbivores, seed dispersers, ecosystem engineers, mesopredators, and apex predators.

The player introduces functional groups (roles). The simulation selects appropriate species based on preserve data and ecological context. This keeps ecological mechanics consistent while allowing geographic variation.

### Succession

Succession is the long-term process through which ecological communities develop. Early communities modify environmental conditions; those changes create opportunities for later communities.

Succession should emerge naturally from changing conditions rather than progressing through scripted stages. The player encourages succession but cannot skip ecological prerequisites.

### Disturbance

Disturbance is a natural ecological process: fire, flooding, drought, storms, disease, and human impacts. It is neither inherently good nor bad.

Its ecological effects depend upon timing, intensity, frequency, and ecosystem resilience. Some ecosystems require recurring disturbance to remain healthy; others require long periods of stability.

### Carrying capacity

Every landscape has limits. Available resources determine how much life an ecosystem can support. Carrying capacity changes continuously as habitat changes.

Increasing carrying capacity is generally more effective than increasing populations directly. Healthy ecosystems support larger and more stable communities.

### Habitat connectivity

Landscapes function as connected systems rather than isolated patches. Connected habitat allows migration, recolonization, genetic exchange, and seasonal movement.

Fragmentation reduces ecological resilience even when individual habitat patches appear healthy. Restoration often involves reconnecting landscapes.

### Feedback loops

Ecological systems contain reinforcing and balancing feedback.

**Positive feedback example:** vegetation improves soil → improved soil supports additional vegetation → additional vegetation further improves soil.

**Balancing feedback example:** herbivore populations increase → available vegetation declines → herbivore growth slows → vegetation recovers.

Most long-term behavior emerges from interacting feedback loops.

### Hysteresis

Recovery is not simply degradation in reverse. An ecosystem may require different conditions to recover than were required to degrade it.

A wetland drained decades ago may not recover simply by restoring water; its soils, vegetation, and ecological relationships may also require restoration. This principle discourages simplistic "undo" mechanics. When history blocks recovery, that fact must be legible to the player.

### Resilience

Resilience is the ability of an ecosystem to absorb disturbance while maintaining ecological function. Resilient ecosystems recover more quickly, experience fewer cascading failures, support greater biodiversity, and maintain processes during stress.

Increasing resilience is a more meaningful objective than maximizing any individual ecological metric.

### Emergence

No species exists independently. No system exists independently. Complex ecological behavior emerges from interactions among relatively simple rules.

The simulation should prefer emergent outcomes over scripted scenarios whenever possible. Unexpected yet scientifically plausible outcomes are desirable because they reward observation and experimentation.

### Time

Ecological change occurs across multiple timescales. Some changes occur within minutes; others require decades.

The simulation compresses ecological time while preserving relative relationships. Fast processes remain comparatively fast; slow processes remain comparatively slow. Durations with ecological meaning are defined in simulation time and are invariant under the player's chosen time rate.

Players should experience gradual ecological transformation rather than instantaneous success.

### Success

A healthy ecosystem is not defined by maximum biodiversity, maximum biomass, or perfect stability.

Healthy ecosystems exhibit functioning ecological processes, resilience, appropriate biodiversity, sustainable carrying capacity, continuous adaptation, and self-maintaining ecological relationships. Populations fluctuate while remaining functional.

The simulation should reward the restoration of ecological function rather than the maximization of numerical values.

**Decision references:** S-001 through S-009, H-001 through H-004, GEO-001 through GEO-003, ES-001 through ES-007, E-001, E-004, E-005, D-001, D-004.

---

## 2. Player Systems

### Purpose

Player Systems define how the player interacts with the living world.

The player does not directly control ecological outcomes. Instead, they gather information, develop understanding, make deliberate interventions, and observe how the ecosystem responds.

The gameplay loop mirrors ecological restoration itself: understand first, act second.

### The core loop

Every action in Habitat supports a repeating cycle:

1. Observe the landscape.
2. Form a hypothesis about what is limiting recovery.
3. Predict what will happen if conditions change.
4. Make an intervention.
5. Watch ecological processes unfold.
6. Compare the outcome to the prediction.
7. Learn from the result.
8. Repeat with deeper understanding.

The goal is not simply to complete objectives, but to become better at reading ecosystems. Attention — not action frequency — is the primary unit of engagement.

### Observation

Observation is the primary player activity. It is not passive waiting.

Players actively examine the landscape for patterns, relationships, and limiting factors: water movement, vegetation stress, erosion, wildlife activity, disturbance history, habitat fragmentation, succession, and opportunities for intervention.

The simulation always contains more information than the player initially perceives. Developing observational skill is therefore a form of progression.

### Prediction

Prediction transforms understanding into gameplay.

Before ecological change unfolds, the player may record an expectation of what they believe will happen — initially where rainfall or runoff will land or move; later, vegetation establishment, habitat suitability, wildlife distribution, or disturbance extent.

Predictions are never required to progress, but they are load-bearing for the core observation loop because they make waiting intellectually active. When time advances, the predicted outcome is compared with the actual outcome.

Incorrect predictions are valuable because they reveal misunderstandings. The mechanic rewards attention, not optimization through hidden scores.

### Institutional knowledge

Institutional knowledge represents ecological understanding that remains consistent and transferable across preserves — shared relationships, not isolated level-designer expectations.

It expands what the player is capable of recognizing. It does not solve problems automatically. Observation remains essential because every landscape is unique.

Knowledge provides context. Observation determines application.

### Interventions

Interventions are deliberate attempts to remove ecological limitations. They do not create healthy ecosystems directly. Instead, they improve conditions that allow ecological processes to continue naturally.

Examples include restoring water flow, stabilizing erosion, planting foundational vegetation, removing invasive species, reconnecting habitat, introducing functional groups, and managing disturbance.

Interventions are functional, not geographically branded. Pulse interventions (burns, controlled floods) and structural interventions (dam removal, earthworks) are distinct. Spatial siting selects a cause — footprint, forcing, uncertainty — never a guaranteed finished habitat.

Interventions should generally be infrequent but meaningful. Their consequences often unfold over extended periods. Ecological time and opportunity constrain intervention; Habitat has no general-purpose money or action-point economy.

### Readiness

Readiness represents ecological opportunity inferred from current and historical simulation state — not an authored unlock flag.

When environmental conditions become suitable for a functional role, the interface communicates that support is plausible. "Ready" does not mean guaranteed success, and readiness never introduces organisms automatically.

A supported role may be attempted even when conditions are poor; readiness affects establishment probability or viability rather than whether the action exists. The player chooses whether and when to introduce.

### Functional group introduction

The player introduces ecological roles rather than individual species: pollinator, herbivore, ecosystem engineer, mesopredator, apex predator.

Preserve data selects an ecologically appropriate species candidate; survival and establishment remain simulated. Temporary appearance does not count as successful reintroduction.

The player's decision concerns ecological function, not taxonomy.

### Learning through failure

Failure is expected. Incorrect interventions, inaccurate predictions, and unexpected ecological responses are opportunities for learning.

The simulation should explain why outcomes occurred through observable ecological relationships rather than abstract penalties. Players improve by refining their mental model of the ecosystem.

### Progression

Progression represents increasing ecological literacy: broader observational ability, additional restoration techniques, deeper understanding, more complex scenarios, greater confidence interpreting landscapes.

Players do not gain stronger tools that bypass ecological principles. Knowledge increases agency. Power does not.

### Information and uncertainty

The player never possesses complete information. Some conditions are directly observable; others must be inferred; some processes remain partially unpredictable. This uncertainty encourages experimentation rather than optimization.

### Time control

Players may pause, play, fast-forward, or observe at high speed. Time controls alter the rate, not the governing rules. Authoritative outcomes do not change with the chosen rate.

Players remain responsible for deciding when to observe closely and when to advance more quickly.

### Save states

Players may create save states to support experimentation and learning rather than perfect play. A player may compare alternative restoration strategies by returning to an earlier ecological state.

A save is valid only if it stores the historical variables hysteresis requires, not merely the visible snapshot. The authoritative simulation is deterministic: identical state, seed, configuration, timestep schedule, and inputs produce identical future state.

### Scenario goals

Scenarios provide ecological objectives rather than prescribing exact solutions. Goals may include restoring watershed function, increasing habitat connectivity, establishing resilient vegetation communities, supporting specific functional groups, or improving resilience.

Success measures ecosystem function rather than action count. Multiple restoration pathways should remain valid. Sandbox has no win condition.

### Success

Successful players become better observers. Their interventions become less frequent, more intentional, and better timed. Over time they shift from reacting to visible problems to anticipating ecological opportunities.

The player's growth is measured by understanding, not by the number of mechanics unlocked.

### Design principles

Every player-facing mechanic should reinforce:

- Observe before acting.
- Predict before intervening.
- Intervene only when ecological conditions warrant it.
- Learn from outcomes instead of optimizing blindly.
- Trust ecological processes once enabling conditions have been restored.

**Decision references:** D-006, P-001 through P-006, E-003, E-004, E-006 through E-009, A-001 through A-006, RC-004, T-001, T-002, T-003, G-001, G-002, G-008.

---

## 3. Simulation Architecture

### Purpose

Simulation Architecture defines how the ecosystem is represented and updated.

Unlike the previous chapters, which describe ecological behavior and player interaction, this chapter defines the conceptual architecture that implementation should follow. It intentionally avoids programming language, engine, or framework decisions (see T-007 in the Decision Register for the current reference prototype stack).

Its purpose is to preserve deterministic ecological behavior while remaining scalable and extensible.

### Architectural philosophy

The simulation exists independently of presentation. Rendering, animation, sound, interface, and visual effects communicate simulation state but never define it.

The simulation is the authoritative source of truth. Everything else observes it.

### The world is state

The ecosystem is represented entirely as state. Every ecological process reads existing state, performs calculations, and produces new state.

Examples include terrain, climate, soil, hydrology, vegetation, wildlife, disturbance, and player interventions.

The simulation never asks "Did the player plant a tree?" Instead it asks "What is the current vegetation state of this location?" History matters only insofar as it has altered present conditions — and those historical variables must be preserved when they affect recovery.

### State over events

Habitat favors persistent state over transient events.

A wildfire is not simply an event. It changes vegetation, soil, fuel loads, habitat, and nutrient availability. Once those changes occur, the event itself no longer matters; only its ecological consequences remain.

This keeps the simulation grounded in ecological conditions rather than historical bookkeeping alone. Chronology for explanation (Field Notebook) may still record events without driving outcomes.

### Spatial representation

The world is spatially organized. Every location possesses ecological properties. Locations influence neighbors through water movement, seed dispersal, erosion, wildlife movement, and disturbance spread.

The architecture should support multiple spatial resolutions without changing simulation behavior. The exact implementation (grid, hexes, graph, or another structure) is an engineering decision rather than a design constraint.

### Layers of state

World state can be understood as several interacting layers.

**Physical layer** — Relatively stable structure: elevation, slope, aspect, geology, watershed structure.

**Environmental layer** — Conditions that fluctuate: moisture, temperature, nutrients, water storage, sunlight, seasonal variation.

**Biological layer** — Living systems: vegetation communities, wildlife populations, biodiversity, succession.

**Human influence** — Player interventions and authored boundary conditions (roads, prior land use, fragmentation as initial state). Intentional human influence enters through the player and authored conditions; humans are not simulated as agents inside the preserve.

### Update philosophy

Simulation proceeds through repeated updates. Each update represents ecological change over a fixed amount of simulated time. Consistent ordering supports deterministic outcomes.

### Dependency order

Although implementation may parallelize calculations where safe, ecological dependencies should remain conceptually ordered. A typical update sequence is:

1. Climate
2. Hydrology
3. Soil
4. Vegetation
5. Wildlife
6. Disturbance
7. Succession
8. Carrying capacity
9. Readiness evaluation
10. Player-facing notifications / explanation hooks

This ordering reflects ecological causality rather than rendering order. Precedence describes dependency, not a one-way pipeline: ecosystem engineers must be able to write back into physical state.

### Read-then-write

Each simulation update should operate in two phases:

1. **Read phase** — Every system reads the previous world state. No system modifies shared state while calculations are occurring.
2. **Write phase** — Calculated results become the new world state simultaneously.

This prevents update-order artifacts where early systems unfairly influence later systems within the same timestep.

### Determinism

Given identical starting state, identical player actions, and identical random seed (and configuration / timestep schedule), the simulation should produce identical outcomes.

Determinism enables prediction comparisons, reproducible scenarios, reliable save states, debugging, and educational experimentation. Randomness introduces variation, but never irreproducibility when those inputs match.

### Emergent systems

No system should directly command another. Systems expose state; other systems respond to state.

Example: vegetation does not spawn deer. Improved vegetation creates suitable habitat. Suitable habitat increases carrying capacity. Carrying capacity supports herbivore persistence. Herbivores subsequently influence vegetation.

Complex ecological behavior emerges through these indirect relationships.

### Functional independence

Every ecological subsystem should be understandable in isolation. Each system owns specific state, exposes outputs, consumes inputs, and avoids unnecessary coupling. This makes the simulation easier to extend without rewriting unrelated mechanics.

### Data ownership

Each piece of ecological information has one authoritative owner. Hydrology owns water storage, flow, and infiltration; vegetation consumes those values and never calculates hydrology independently. This avoids conflicting ecological models.

### Player separation

The player does not bypass simulation. Player actions request ecological change; the simulation determines ecological consequences.

The player requests restoration planting; the vegetation system determines establishment success, growth, competition, and long-term survival. Player actions never directly set ecological outcomes.

### Readiness evaluation

Readiness is evaluated after ecological conditions stabilize for the timestep. The simulation asks: "Can this landscape now plausibly support another functional role?" It never asks: "Should one appear?" Introduction remains a player decision.

### Prediction evaluation

Predictions are evaluated against observed simulation state. The prediction system never influences ecological behavior. Its purpose is comparison and learning. It functions as an observer of the simulation rather than a participant.

### Time compression

Different ecological processes occur at different natural rates. The simulation compresses time while preserving relative ecological relationships. Acceleration changes how quickly the player observes processes; it does not change governing rules or whether an ecological criterion is met.

### Persistence

A save records simulation state including causal history. Upon loading, the simulation resumes naturally from that state. Visual similarity after load is not a correctness test.

### Extensibility

Future systems should integrate by consuming and producing ecological state rather than creating special-case logic: invasive species, climate change, disease, migration, seasonal behavior, additional restoration techniques. Each becomes another participant in the same ecological network.

Content — preserves, species mappings, scenarios, field-guide text, audiovisual expression — is data-driven whenever practical.

### Architectural principles

Every implementation should preserve:

- The simulation is authoritative.
- State (including legacy state) is more important than transient event scripts.
- Ecological relationships produce outcomes.
- Systems communicate through shared state.
- Player actions influence conditions, not results.
- Deterministic behavior enables experimentation.
- Emergence is preferred over scripting.
- Simulation and rendering are separate.

**Decision references:** T-001 through T-006, S-001 through S-004, S-007, S-009, E-005, E-009, U-001, U-003, W-006.

---

## 4. Species and Functional Groups

### Purpose

Habitat simulates ecological function before biological identity.

Players interact with functional groups because ecological roles are universal. The simulation translates those roles into biome-appropriate species, allowing every landscape to feel authentic without requiring different mechanics for every region.

This chapter defines the ecological contracts each functional group fulfills.

### Design philosophy

Species are expressions of ecological function. The simulation is fundamentally concerned with questions like: Who produces biomass? Who disperses seeds? Who engineers habitat? Who regulates herbivores?

Rather than: Is this a gray wolf? Is this a red fox? Is this a black-tailed prairie dog?

Species provide ecological flavor. Functional groups provide ecological mechanics.

### Functional groups

Every organism belongs to one or more ecological roles. Those roles define habitat requirements, ecological contributions, dependencies, responses to disturbance, and interactions with other groups.

This allows the simulation to remain geographically flexible while preserving ecological realism. Each preserve draws from a curated, fixed species pool and role mappings.

### Primary producers

**Purpose:** Capture solar energy and convert it into biomass — the foundation of nearly every terrestrial ecosystem.

**Requirements:** Adequate sunlight, appropriate soil, sufficient moisture, suitable climate.

**Contributions:** Stabilize soil, retain water, produce food, moderate temperature, create physical structure, initiate succession. Nearly every other functional group depends upon them.

### Pollinators

**Purpose:** Facilitate plant reproduction.

**Requirements:** Flowering vegetation, nesting habitat, seasonal resources.

**Contributions:** Increase plant diversity, reproductive success, and ecosystem resilience. Healthy pollinator communities improve long-term vegetation stability rather than immediate biomass.

### Seed dispersers

**Purpose:** Expand plant communities across the landscape.

**Requirements:** Existing vegetation, connected habitat, suitable movement corridors.

**Contributions:** Accelerate succession, recolonization, habitat recovery, and biodiversity. They allow ecosystems to spread rather than merely persist.

### Herbivores

**Purpose:** Convert plant biomass into animal biomass. They regulate vegetation rather than simply consuming it.

**Requirements:** Sufficient carrying capacity, appropriate vegetation, water, shelter.

**Contributions:** Influence plant competition, recycle nutrients, disperse seeds, create habitat mosaics. Excessive herbivory may suppress recovery; insufficient herbivory may reduce ecological diversity. Balance is more important than abundance.

### Ecosystem engineers

**Purpose:** Physically alter the landscape. Unlike most organisms, they modify habitat directly.

**Examples by biome:** Beavers, prairie dogs, termites, corals, earthworms. The specific species changes; the ecological role remains constant.

**Contributions:** Alter hydrology, reshape soil, construct habitat, increase structural diversity, create ecological niches. Their influence extends beyond their own populations — they become habitat for others. Architecture must allow biology to write back into physical systems.

### Mesopredators

**Purpose:** Regulate smaller animal populations.

**Requirements:** Prey, habitat, shelter.

**Contributions:** Help stabilize rodent populations, small herbivores, and ecological competition. They occupy an intermediate trophic role between herbivores and apex predators.

### Apex predators

**Purpose:** Regulate ecosystem structure through top-down ecological effects.

**Requirements:** Established food webs, adequate habitat, sufficient carrying capacity, connected landscapes. Readiness for apex predators often signals a relatively mature ecosystem.

**Contributions:** Influence herbivore movement, reduce overgrazing, stabilize trophic relationships, increase resilience. Greatest influence often comes through behavioral change rather than direct predation alone.

### Decomposers

**Purpose:** Recycle nutrients. Although rarely observed directly by the player, they are essential to ecosystem function.

**Contributions:** Return nutrients to soil. Without decomposition, productivity declines, succession slows, and nutrient cycles collapse. They form the closing loop of ecosystem energy flow.

### Functional dependencies

No functional group exists independently. A simplified dependency sketch:

Primary producers → pollinators → seed dispersers → herbivores → mesopredators → apex predators → decomposers recycle nutrients back into producers.

The network contains many feedback loops rather than a single food chain. Food webs drive population dynamics.

### Habitat requirements

Each functional group evaluates ecological suitability using multiple factors: vegetation structure, water availability, habitat connectivity, disturbance regime, climate, soil quality, existing biodiversity, and carrying capacity.

No single threshold determines success. Suitability emerges from combined ecological conditions and may include uncertainty.

### Population dynamics

The simulation does not guarantee population growth after introduction. Populations respond continuously to habitat quality.

Possible outcomes include establishment, expansion, stability, decline, and local extinction. Population changes communicate ecosystem condition rather than a collectible unlock.

### Species resolution

When the player selects a functional group, preserve data determines which species best fulfills that role in the current biome.

| Functional group | Temperate forest | Grassland | Desert |
| --- | --- | --- | --- |
| Pollinator | Bumblebee | Native bee | Solitary bee |
| Herbivore | White-tailed deer | Pronghorn | Desert bighorn sheep |
| Engineer | Beaver | Prairie dog | Kangaroo rat (where appropriate) |
| Apex predator | Wolf | Coyote (if apex in context) | Mountain lion |

The player always thinks in terms of ecological function. The world supplies biological identity. Establishment remains simulated.

### Biodiversity

Biodiversity is an emergent property. It increases because ecological conditions improve. It is never increased directly.

Healthy ecosystems support biodiversity. Biodiversity does not define ecosystem health by itself, and raw species count is not a measure of ecological worth.

### Extensibility

New species require little new logic. They implement existing functional roles while specifying biome suitability, climate preferences, habitat requirements, visual identity, and behavioral variation.

Most simulation behavior is inherited from the functional group. This allows the species library to expand without multiplying systemic complexity.

### Design principles

Every species should reinforce ecological understanding. Players should gradually recognize that organisms shape habitats, habitats shape organisms, and neither exists independently. The game teaches relationships rather than memorization.

**Decision references:** E-001, E-003 through E-009, ES-004, ES-006, ES-007, W-003, N-003, N-005.

---

## 5. World Generation

### Purpose

World generation creates living landscapes rather than game levels.

Every world begins as a coherent ecological system with its own geography, climate, opportunities, and limitations. The player restores an ecosystem that already has a history. They never begin with an empty map.

### Design philosophy

A Habitat world is generated from environmental processes. Features are not placed independently. Instead, each layer emerges from the one before it.

The world is generated in ecological order. This ensures every landscape has internal consistency. Ecologically plausible procedural generation establishes terrain, watersheds, substrate, climate influence, and initial habitat patterns; scenario authors may constrain or sculpt the result through the same physical rules.

### Generation pipeline

Every world follows the same conceptual sequence:

Planetary / regional conditions → climate → terrain → watersheds → soil → biomes / habitat patterns → vegetation → wildlife → historical disturbance → scenario start.

Each stage constrains the next. Nothing exists without ecological context.

### Terrain

Terrain defines the physical structure of the world: elevation, slope, valleys, ridges, plains, drainage basins. Terrain changes only where simulation value justifies cost. It provides the foundation upon which every other system develops.

### Watersheds

Water organizes landscapes. Terrain determines where water naturally accumulates and flows. Every location belongs to a watershed.

Watersheds influence soil formation, vegetation, wildlife movement, disturbance, and carrying capacity. Players often restore ecological function by restoring watershed function. Channel changes, erosion, sediment, and storage persist.

### Climate

Climate provides long-term environmental constraints: rainfall, temperature, growing season, drought frequency, seasonality. Climate influences possibility. It does not determine ecological success by itself. Healthy ecosystems exist under many climates.

### Soil development

Soil develops from interactions among parent material, climate, water, vegetation, and time. Different soils possess different capacities for water storage, nutrient retention, root penetration, and recovery after disturbance.

### Biomes and preserves

Biomes emerge from climate and geography: temperate forest, prairie, desert, wetland, alpine, coastal systems. Biomes determine available species, ecological strategies, disturbance regimes, and restoration opportunities.

Mechanics remain consistent across biomes (one shared simulation). Only ecological expression — parameters, content, role mappings, initial state, boundary conditions — changes. Windward Basin is the reference preserve used to prove the shared engine first.

Each preserve is one continuous landscape with emergent regions (watersheds, wetlands, corridors) inferred from simulated patterns, not imposed as separate gameplay zones. A preserve is composed as a living diorama: recognizable silhouette, named landmarks, whole-preserve readability.

### Initial vegetation

Vegetation establishes according to climate, soil, hydrology, and disturbance history. Not every location begins fully vegetated. Natural variation creates ecological diversity.

### Wildlife establishment

Wildlife is generated from habitat rather than random placement. Suitable habitat determines which functional groups exist, approximate abundance, and ecological relationships. Species appear because habitat supports them.

### Historical disturbance

Every world contains ecological history: wildfire, logging, agriculture, invasive species, overgrazing, drought, flood. These events explain why restoration is necessary. Players inherit ecological consequences rather than witnessing every historical event.

### Starting conditions

A scenario begins after history has shaped the landscape. The player enters an ecosystem that possesses functioning systems, contains degradation, and retains recovery potential. The world is damaged. It is not dead.

### Degrees of degradation

Not every scenario represents catastrophic collapse.

- **Light:** Fragmented habitat, invasive species, altered fire regime.
- **Moderate:** Declining biodiversity, erosion, disrupted hydrology.
- **Severe:** Collapsed food webs, extensive soil loss, disconnected landscapes, unstable succession.

Different restoration strategies emerge from different starting conditions.

### Restoration potential

Every scenario contains realistic recovery potential. Some systems recover quickly; others require decades. Some ecological losses may never be fully reversible. This reflects hysteresis rather than punishment. Players restore function rather than recreating an imagined pristine past.

### Natural variation

No two worlds should feel identical. Variation may include watershed arrangement, terrain complexity, vegetation density, disturbance history, habitat connectivity, climate variability, and biodiversity. Variation encourages ecological reasoning rather than memorization.

### Procedural consistency

Procedural generation must preserve ecological logic. Randomness should never create impossible landscapes: rivers should not flow uphill; wetlands should have hydrological justification; alpine vegetation should not appear in deserts; apex predators should not begin where no prey exists.

Randomness creates diversity. Ecology creates credibility. Designers cannot paint exceptions the simulation cannot explain.

### Scenario authoring

Hand-authored scenarios use the same generation and simulation rules. Designers do not manually override ecological principles except where educational goals require explicit justification. This keeps custom scenarios consistent with sandbox worlds.

### Scaling

The same generation model should support small educational maps, regional restoration projects, and larger sandbox landscapes. Scale changes quantity. It does not change ecological rules.

### Long-term stability

A generated world should remain ecologically coherent indefinitely. If the player takes no action: succession continues, disturbances occur, wildlife responds, ecosystems adapt. The landscape is never frozen.

### Design principles

World generation should create places that feel discovered rather than assembled. Players should be able to infer why rivers exist, why forests grow where they do, why wildlife occupies particular habitats, and why restoration opportunities differ across the landscape.

Every feature should have an ecological explanation.

**Decision references:** W-001 through W-006, GEO-001 through GEO-003, S-001, S-002, H-001 through H-004, ES-001 through ES-005, A-001.

---

## 6. Scenario System

### Purpose

Scenarios provide meaningful ecological challenges without prescribing a single correct solution.

They frame restoration problems, establish objectives, and communicate context, while allowing the simulation to determine outcomes.

A scenario is not a puzzle. It is an ecosystem with a story.

### Design philosophy

Every scenario begins with a landscape that has a history. The player is invited into an ongoing ecological narrative rather than a blank slate.

The challenge is to understand why the ecosystem exists in its current condition and determine how recovery can begin. Multiple restoration strategies should remain viable whenever they respect ecological principles. No universal optimum ecosystem exists.

### Scenario structure

Every scenario consists of four parts:

1. **Ecological context** — What happened before the player arrived.
2. **Current state** — The existing landscape and its limiting factors.
3. **Objectives** — What ecological functions should be restored.
4. **Evaluation** — How restoration success is measured over time.

The simulation provides the details. The scenario provides the purpose.

### Ecological context

Every scenario opens with a brief explanation of the landscape's history: a river channelized decades ago; fire suppression altered forest structure; wetlands drained for agriculture; grazing exceeded carrying capacity; habitat fragmented by development.

The goal is to answer one question: "Why does this ecosystem need restoration?"

### Starting conditions

Players inherit an ecosystem already in motion. Some ecological processes are still functioning; others have broken down. The landscape contains both problems and opportunities. Players must identify which limiting factors matter most.

### Objectives

Objectives describe ecological outcomes rather than prescribed actions: restore watershed function; reconnect fragmented habitat; increase resilience; reestablish natural disturbance regimes; support functioning pollinator communities; restore trophic balance.

Objectives define what success looks like. They do not dictate how it must be achieved.

Scenarios use mixed ecological objectives: primary restoration goals, with optional recognition for observation, scientific exploration, rare events, exceptional stewardship, and long-term stability. Optional achievements never substitute for primary restoration and do not make field-guide completion mandatory.

A scenario may complete when the preserve sustains a required number of qualifying species or roles — one permissible criterion, not Habitat's universal completion model and not a measure of ecological value. Qualifying populations count only after remaining established through a persistence window.

### Multiple solutions

Most scenarios should support multiple valid restoration strategies. A degraded stream might recover through restoring riparian vegetation, improving upstream hydrology, reconnecting floodplains, introducing ecosystem engineers, or a combination.

The simulation determines which approaches succeed under current conditions.

### Scenario progression

Scenarios increase in complexity by introducing richer ecological relationships rather than more powerful mechanics.

Early scenarios emphasize observation, water, vegetation, and simple succession. Later scenarios introduce wildlife interactions, ecosystem engineering, trophic cascades, disturbance management, landscape connectivity, and long-term planning.

The player grows by recognizing more relationships, not by unlocking shortcuts.

### Readiness and timing

Many objectives cannot be completed immediately. Functional groups become attemptable when preserve data supports the role; ecological conditions affect establishment. Introducing a functional group before the ecosystem can support it may result in failure. Waiting may delay restoration. Timing becomes part of ecological judgment.

### Optional objectives

Optional objectives encourage exploration without defining success: restore a rare habitat; encourage a keystone engineer; improve biodiversity beyond the minimum; preserve an old-growth stand; reduce intervention frequency; complete restoration within a specified ecological timeframe.

These reward deeper understanding without punishing players who achieve primary ecological goals.

### Failure

Failure is ecological, not punitive. A scenario may not silently become unwinnable. If hysteresis can make an objective unreachable, the game must preserve a viable recovery path, identify a recognized failure state, or offer a scenario-level restore mechanism.

Failure should always communicate why recovery stalled. The game teaches ecological reasoning rather than assigning blame.

### Evaluation

The simulation evaluates outcomes continuously across watershed function, habitat connectivity, resilience, carrying capacity, biodiversity, succession, wildlife persistence, and ecological stability. No single metric determines success. Evaluation considers the ecosystem as a whole, with tolerance for fluctuation.

### Scenario completion

A scenario ends when ecological function has become sufficiently self-sustaining relative to its authored criteria — not when every population reaches a maximum or every metric is perfect.

The landscape demonstrates that natural processes are functioning, limiting factors have been addressed, and recovery can continue without constant intervention.

Whether completion can later be revoked if criteria fail again remains an open register question (G-007).

### Sandbox mode

Sandbox removes predefined objectives. Players may experiment, observe, test restoration ideas, compare interventions, or simply watch ecological systems evolve. The simulation remains identical. Only external goals are removed. Sandbox has no win condition.

### Educational role

Scenarios should teach ecological principles through experience. Each scenario should emphasize one or two central concepts: water shapes landscapes; disturbance can be beneficial; habitat quality determines wildlife; recovery is not the reverse of degradation; timing matters; ecosystem engineers reshape opportunity.

Players discover these lessons by interacting with the simulation rather than reading explanations first.

### Replayability

Scenarios remain replayable because world generation introduces variation, ecological conditions differ, restoration strategies vary, predictions change, and player understanding evolves. The objective is mastery of ecological thinking rather than memorization of solutions.

### Campaign structure

If a campaign exists, it should represent a progression of ecological literacy rather than a narrative of personal power. The player moves through increasingly complex restoration challenges, encountering new landscapes, disturbance regimes, and ecological relationships — from recognizing obvious problems to understanding subtle, system-level dynamics.

### Design principles

Every scenario should answer three questions:

1. What happened here?
2. What is preventing recovery now?
3. How will the player know the ecosystem can sustain itself again?

If those questions are clear, the simulation can provide countless unique restoration stories.

**Decision references:** G-001 through G-008, ES-002 through ES-005, P-001, P-004 through P-006, E-007, S-008, N-002, N-003.

---

## 7. Art Direction

### Purpose

The visual direction of Habitat exists to cultivate connection, curiosity, and respect for the natural world.

The game should not present nature as scenery or spectacle alone. It should invite the player to slow down, observe carefully, and appreciate ecological relationships. The world should feel like a living work of art.

### Artistic philosophy

Habitat is not striving for photorealism. It is striving for truthful beauty — scientific impressionism: ecological truth expressed through stylized, authored emphasis.

Every artistic choice should make ecological relationships easier to perceive while preserving the emotional experience of being in a living landscape. Scientific fidelity serves artistic clarity. Artistic clarity serves ecological understanding.

### Emotional goals

The player should experience a gradual emotional progression.

- **At the beginning of a scenario:** concern, curiosity, uncertainty.
- **During restoration:** discovery, hope, patience.
- **After recovery:** pride, peace, stewardship.

The world itself should communicate these emotions more than dialogue or narration.

### Beauty as feedback

A recovering ecosystem should become visibly more beautiful — not because the player "leveled up," but because ecological function naturally creates visual richness.

As restoration progresses, players should notice fuller vegetation, healthier waterways, richer color variation, increased wildlife activity, more layered landscapes, and more dynamic movement.

Beauty is a consequence of ecological health. It is never an arbitrary reward. Aesthetic attachment is part of the game's functional design.

### Composition

Every camera view should resemble a landscape painting. The player should frequently pause simply because the world is pleasant to observe.

Composition emphasizes natural framing; foreground, middle ground, and distance; silhouettes; atmospheric perspective; and seasonal color harmony. The landscape should reward looking.

The primary view is an elevated living diorama — three-quarter or isometric-like — with smooth zoom from whole-preserve composition to local ecological detail, and controlled rather than free-flying rotation.

### Color language

Color communicates ecological condition before statistics.

Healthy ecosystems exhibit varied greens, rich earth tones, subtle seasonal variation, vibrant flowering species, and clear water. Degraded ecosystems trend toward exposed soil, desaturated vegetation, dusty atmospheres, stagnant water, and visual fragmentation.

Transitions should feel gradual rather than binary.

### Light

Lighting expresses ecological mood. Morning emphasizes renewal; midday emphasizes clarity; evening emphasizes reflection; storms communicate ecological tension. Sunlight filtering through recovering vegetation should become one of the player's strongest visual rewards.

### Scale

Nature should feel larger than the player. Trees should tower; mountains should dominate horizons; rivers should shape landscapes. The player should feel like a caretaker of a living exhibit rather than its owner or conqueror.

### Motion

Movement communicates life. Even when the player is inactive, the world should never appear frozen: grasses responding to wind, insects moving between flowers, birds circling, flowing streams, drifting clouds, leaves falling, rippling wetlands.

Stillness should be intentional rather than accidental.

### Ecological readability

Art should reveal ecological relationships. Players should be able to infer water movement, habitat quality, succession, disturbance, and restoration opportunities without relying exclusively on interface overlays. Visual storytelling is part of gameplay. Ecological change must be visible — transition states matter, not only endpoints.

### Wildlife presentation

Wildlife should feel independent. Animals are not visual effects triggered by player proximity. They occupy landscapes because ecological conditions support them. Players should occasionally encounter wildlife unexpectedly. These moments reinforce that the ecosystem exists independently.

### Seasonal identity

Seasons should transform landscapes without changing their identity. Seasonal change demonstrates ecological cycles, migration, flowering, senescence, dormancy, and recovery. Every season should possess its own visual beauty.

### Disturbance

Disturbance should feel emotionally significant. Fire should inspire respect rather than spectacle. Flooding should feel powerful rather than destructive for its own sake. Storms should communicate the forces shaping ecosystems. Disturbance is part of nature; its visual presentation should reflect this.

### Recovery

Restoration should rarely appear instantaneous. Players should witness gradual transformation — sparse vegetation and exposed soils early; developing canopy and improving waterways later; layered forest and complex habitat over longer horizons. Watching recovery unfold is part of the reward.

### Human presence

Human influence should be visible but restrained as inherited state: abandoned roads, drainage ditches, eroded fields, invasive vegetation, degraded stream banks. Successful restoration allows these scars to become less visually dominant over time. Nature reclaims rather than erases. Humans are not simulated as agents during play.

### Interface harmony

The interface should never compete with the landscape. Information appears when needed. The ecosystem remains the primary visual focus. Players should spend most of their time looking at the world, not at panels.

### Sound

Ambient sound and wildlife activity respond to simulated ecology. Silence has ecological meaning — absence communicates degradation or failed recovery. As relationships recover, the soundscape becomes richer in ways tied to actual state. No single canned "restored" mix.

### Inspiration

Habitat draws inspiration from landscape painting, ecological illustration, national park interpretation, nature documentaries, plein air art, and environmental photography. Its goal is not to imitate these styles directly but to evoke the same sense of wonder and attentiveness.

### Artistic principles

Every artistic decision should support at least one of the following:

- Encourage observation.
- Reveal ecological relationships.
- Communicate change through the landscape itself.
- Inspire respect for natural systems.
- Make the player want to spend time simply existing within the world.

If a visual element is beautiful but obscures ecological understanding, it should be reconsidered. If it is scientifically accurate but visually unreadable, it should also be reconsidered. The ideal solution achieves both.

**Decision references:** D-005, ART-001, ART-002, ART-003, AUD-001, AUD-002, AUD-003, U-003, U-005, W-004, W-006.

---

## 8. User Experience

### Purpose

The user experience exists to support ecological understanding.

Every interaction should help the player observe, interpret, and appreciate the living world. The interface should never become the primary focus of attention. The landscape is the interface.

### Experience philosophy

Habitat should feel calm without becoming passive; thoughtful without becoming academic; beautiful without becoming decorative; complex without becoming overwhelming.

The player should spend most of their time looking at ecosystems rather than menus.

### The landscape comes first

Whenever possible, information should be communicated through the world itself.

Instead of "Moisture: 73%," show darker soil, flowing water, lush riparian vegetation. Instead of "Habitat quality increased," show returning birds, expanding vegetation, healthier streams, increased animal activity.

The player learns by reading landscapes. Charts and overlays supplement the world; they do not replace it.

### Camera philosophy

The camera exists to encourage observation. It should feel more like visiting a living diorama than commanding an army. Players should naturally move between scales:

- **Preserve / regional scale** — Watersheds, habitat corridors, disturbance patterns, succession.
- **Landscape scale** — Forests, wetlands, streams, wildlife movement.
- **Local / ground scale** — Plant communities, individual animals, water movement, ecological detail.

Players should transition smoothly between these perspectives without losing the authored silhouette of the place.

### Pace

Habitat intentionally embraces slower pacing than most strategy games. Slower pacing creates opportunities for observation, prediction, reflection, and appreciation. The game should rarely pressure players into immediate action. Strong play trends toward fewer, better-timed interventions.

### Information hierarchy

Information should appear in layers.

1. **Visible immediately** — Terrain, vegetation, wildlife, weather, water.
2. **Available through inspection** — Succession, carrying capacity, readiness, habitat quality, limiting factors.
3. **Available through analysis** — Ecological dependencies, historical trends, prediction comparison, Field Notebook chronology and cautious causal language.

Players reveal complexity when they choose to investigate. Curiosity precedes explanation.

### Ecological overlays

Overlays exist to support understanding rather than replace observation: watershed visualization, habitat connectivity, succession stage, wildlife corridors, disturbance history, vegetation structure.

Overlays should feel like ecological field tools rather than debugging displays. The player should never feel compelled to leave them permanently enabled. Development builds may expose deeper inspection layers that player-facing overlays selectively reuse.

### Prediction interface

Prediction should feel like sketching a hypothesis. The player might outline an expected floodplain, indicate where forest expansion will occur, identify likely wildlife habitat, or estimate future disturbance boundaries.

Predictions remain visible until ecological time reveals the outcome. The comparison should clearly distinguish expectation, reality, and differences. The emphasis is learning, not grading.

### Observation tools

Observation should gradually become richer. Tools may include a Field Notebook, magnifying inspection, ecological reports, seasonal comparison, and watershed tracing.

The Field Notebook begins with trustworthy event chronology and simulated contributing conditions. It may use cautious inferred-driver language, but it does not claim certainty the simulation cannot support. Counterfactual causal replay is a deferred maturity level, not an MVP dependency.

Each tool helps reveal relationships rather than simply exposing hidden numbers.

### Notifications

Notifications should be infrequent and meaningful. Prefer ecological language ("A wetland can now plausibly support ecosystem engineers") over system language ("+1 Readiness").

### Progress feedback

Player progress should appear through the landscape: healthier rivers, richer biodiversity, expanding forests, increasingly complex food webs. Visual and audible transformation is the primary reward — not unlock banners.

### Failure feedback

When restoration struggles, the world explains why: erosion continuing, saplings dying, wildlife avoiding habitat, streams remaining disconnected. When history blocks recovery, inspectors and explanations identify the legacy condition. The simulation teaches through visible consequences.

### Accessibility

Accessibility should support observation without simplifying ecological relationships. Players should be able to customize text size, color accessibility, overlay contrast, interaction speed, notification frequency, and camera controls. Accessibility increases clarity. It should never reduce ecological depth.

### Minimal interface

The interface should remain intentionally restrained. Persistent screen elements should be limited to essential information. Whenever possible: hide controls; show landscape.

### Sound as interface

Audio communicates ecological state. Players should hear returning birds, stronger streams, healthier insect populations, changing weather, expanding forests. The player often recognizes restoration before consciously seeing it. Silence is allowed to speak.

### Player agency

The interface should encourage thoughtful decisions rather than rapid actions. Players should feel comfortable waiting, watching, comparing, reconsidering, and experimenting. Choosing not to intervene is a meaningful decision.

### Learning curve

The interface teaches gradually. Early scenarios expose only essential concepts. Additional ecological information appears as players become capable of interpreting it. Complexity grows with ecological literacy.

### Design principles

The interface should disappear into the landscape. Players should remember the river, the meadow, the returning wildlife, the recovering forest — not the menus they clicked.

Every interface element should justify its existence by making ecological understanding easier. If an element distracts from the landscape more than it supports learning, it should be redesigned or removed.

**Decision references:** U-001 through U-006, D-006, P-003, P-006, E-003, S-008, AUD-001 through AUD-003, T-005, F-004, F-005.

---

## Document maintenance

1. Prefer Decision Register IDs when citing binding policy.
2. When a wiki claim would change product direction, update the Decision Register first (new ID or supersession), then revise this wiki.
3. Keep vocabulary aligned with the Decision Register; do not mint parallel terms for the same concept.
4. This wiki may expand into separate pages later; until then, chapter headings are the page structure.
