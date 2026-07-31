# External References — Tools to Study (Not Ship)

> **Status:** Working notes  
> **Role:** Curated GitHub and open-source references evaluated against Habitat’s stack and Decision Register  
> **Authority:** Advisory. Nothing here is a dependency or a product decision. Binding math candidates remain in [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md); architecture in [SIMULATION_MODEL.md](SIMULATION_MODEL.md).

**Policy.** Prefer **study clones and offline oracles** over vendoring. Integrating third-party simulation packages would fight T-001 (determinism), T-004 (data-driven content), T-006 (sim/render separation), and single-writer field ownership.

Survey date: 2026-07-28 (multi-state water pass added).

---

## Study log

The tables below are a **reading list** — what might be worth studying. This section is the **record** — what was actually studied, what came back, and where it landed. A reference is only as useful as the note it leaves behind, and on a solo project with long gaps and cold-start agent sessions, nobody remembers the July reading in October.

**Rule.** When a commit acts on a reference, add or update its row here in the same commit — steal *and* rejection. "No record" is an honest value; a blank row is not. If a steal lands in code, name the file.

| Reference | Studied | What was taken | What was rejected | Landed in |
|---|---|---|---|---|
| **RichDEM** | Algorithm only, via Barnes, Lehman & Mulla 2014 (NATURAL_PROCESS_MATH §10). **The tool has never been run.** | Priority-Flood fill semantics: `filled = max(elev, min-over-paths path-max)` (H-003) | Linking the C++ library; treating our fixtures as tool-generated output | `hydrology/flowRouting.ts` `priorityFloodFill`; `fixtures/pitDem.ts` (hand-derived — single-pit + nested-basin, 2026-07-28) |
| **snowflow** | Demo + API shape, 2026-07-28 | Berm reads as displaced mass; shared surface write; observers sample beauty rather than authoring it (C-002 / GEO-002) | WebGPU deform as hydrology authority; 90 FPS as DoD; screenshot-as-gate (T-006, T-007) | BUILD_GUIDE §4.2 presentation substrate; **berm/dig ↔ soil.depth** in `WorldState.applyTerrainBrush` (2026-07-28) — Δelev = Δdepth, bedrock invariant |
| **GWSWEX** | API/compartment shape read; no code run | SW / UZ / GW compartment list + per-step Δstore ledger as the shape for a cheap store (**C-001**) | Richards / Celia solver in-browser | Register **C-001** Locked — Slice 8b (`groundwater.storage`, `baseflow-persist`) |
| **3D-Falling-Sand** · **3DCellularWorld** | Presentation pass, 2026-07-28 | Extent cage, snapped lattice cursor, dual readout, motion-in-time | Voxel CA as world authority (T-007); paint-element UX as a *counterexample* for A-005 | BUILD_GUIDE §4.2 — `ExtentCage.ts`, `SitingCursor.ts`, `FlowCueMesh.ts` |
| **pysheds** | **No record.** Listed as a Slice 3 oracle; no fixture or artifact exists in the repo | — | — | Nothing. The accumulation tests are self-derived |
| **OpenFloodLab** · **Landlab** · **SimpleHydrology** | **No record** — top of the study order, no evidence either was opened | — | — | Nothing |
| **VIC** · **SHUD** · **CWatM** · **GSFLOW** · **H2MV** · **HMC** · others in *Helpful later* | Not yet — gated on a GW store existing | — | — | Nothing |
| **Game references** — RCT3, From Dust, Terra Nil, Viva Piñata, SimEarth, Cities: Skylines, falling-sand toys, Townscaper | **Recalled, not replayed**, 2026-07-28. Mechanics-and-structure level only; tuning and version behavior unverified. RCT3 is owner-lived, and that account outranks the table | Conserved carried matter (From Dust) → the §4.1 displaced-mass closeout; arrival-by-conditions (Viva Piñata) → **C-007**; force dials (SimEarth) → **C-004**; drag-continuous brush + free undo (RCT3) → **C-006**; material personality learned by play (sand toys) → **C-009**; leave-and-it-persists (Terra Nil) → G-005, **C-010** | Arcade erosion timescales (From Dust); deterministic placement puzzles (Terra Nil); authored per-species unlock checklists (Viva Piñata); opaque untraceable dials (SimEarth); unstable non-conserving water (Cities: Skylines) | Survey artifact plus Slice 12 landing: Viva Piñata condition-earned arrival → `docs/slices/12-composition.md`, `dispersalProcess`, `veg.biomass.herb` (**C-007** Open hypothesis). Authored unlock checklists still rejected. Branch-and-compare (**C-005**) has **no prior art** in any of them |
| **Viva Piñata** (arrival steal, Slice 12) | Recalled mechanics, 2026-07-29 — condition-meets-arrival loop only; no replay | Species appear because the place meets inspectable conditions; HSI gate × dispersal is the Habitat form (**C-007 Locked**) | Authored per-species unlock checklists; collection-game readiness; stochastic spawn tables while **C-003** is Open | `docs/slices/12-composition.md`; `src/sim/habitat/arrivalComposition.ts`; `src/sim/process/dispersalProcess.ts` |
| **From Dust** (deposit / rock, C-009) | Recalled mechanics + Habitat deposit tool land 2026-07-30 — matter as cause; sand erodes, rock resists | Geological **deposit** raises elev+depth and stamps `soil.material`; rock table row (near-zero infil/erosionK); berm/dig stay shape-only (**C-009**) | Carry-sphere conservation; arcade erosion timescales; lava→rock cycle; paint-ecosystem | `WorldState.depositSubstrate`; `substrates.ts` rock; probe `substrate-deposit`; `docs/candidates/C-009-dossier.md` |
| **Coastal SWE / coastline / MacArthur–Wilson** | Ban narrowed + study rows filed 2026-07-30 (**C-015**…**C-019**); tools not run | Rule-shape only: sea as base level; one-line coastline / fetch exposure; island biogeography area–isolation | Shallow-water equations as WorldState authority (ANUGA / coastal SWE suites) | Register candidates; SIMULATION_MODEL §10 rewrite; Slice 16+ ladder in BUILD_GUIDE |
| **One-line coastline / shore-exposure models** | Rule-shape read, 2026-07-30 (Slice 18) — papers/CEM class not executed | `exposure = onshore · saturate(fetch/fetchMax)`; coastal Δh inside geomorphology only (**C-017**) | SWE / ANUGA as WorldState authority; second sediment writer | `src/sim/climate/shoreExposure.ts`, `runGeomorphologyStep`, probe `shore-exposure` |
| **One-line coastline / longshore (CEM)** | Rule-shape read, 2026-07-30 (Slice 19) — CEM class not executed | `Q = exposure · (û · t̂)`; lee deposit weight `max(0, û · n̂)·(1 − exposure)`; retain fraction on-island (**C-017**) | SWE pathline solver; second sediment writer; cell-painted beaches | `src/sim/climate/longshoreTendency.ts`, `runGeomorphologyStep`, probe `longshore-drift` |
| **MacArthur–Wilson + new-island succession** (Surtsey, Krakatau, spit/marsh) | Parallel literature pass 2026-07-30 — theory + tropical / temperate / cold / volcanic bands; abstracts/pages + Habitat constraints; not a species census; **Slice 21 land 2026-07-30** | Overseas kernel replaces mainland perimeter rain; \(S_{\text{elig}}=f(A,d)\); non-equilibrium young islands; guild-ordered eligibility; shore-biased hydrochory (**C-019**) | Species simulator; equilibrium paint-on-load; random spawn; mangrove-default | `docs/evidence/island-colonization.md`; `docs/slices/21-composition.md`; overseas kernel in `arrivalComposition.ts` / `WorldState.runDispersalStep`; probe `island-arrival`; Open **C-019** (dossier) |
| **Island colonization — growing season / frost** | Same evidence pass + NS-002 land 2026-07-30 — climate table, not a new paper | Heat dial `climate.airTemperature` → Liebig `f_temp`; cold stalls herb; warm earns (**C-004** / **C-020** hypothesis) | Hidden temp multiplier; second plant-climate Process; invent Locked | `temperatureComposition.ts`; `hsiComposition.ts`; probe `heat-arrival`; `docs/slices/N2-composition.md` |
| **Coastal salinity / freshening (multi-climate)** | Same pass 2026-07-30 — tropical pans, temperate hollows, cold freeze-concentration, volcanic splash/strand; **Slice 20 land 2026-07-30**; **NS-006 encoding closeout 2026-07-30** | One ocean-sourced soil salinity on water ledger; freshwater dilution; HSI gate; freshened vs salty twin under one seed schedule; outcome encoding `saltMemoryEncodingDelta` (**C-018**) | Player cleanup; second salt ledger; salt-as-mangrove-only | `docs/slices/20-composition.md`; `docs/slices/N-composition.md`; `src/sim/habitat/salinityComposition.ts`; `soil.salinity`; probe `salinity-arrival`; Open **C-018** (dossier) |
| **Island colonization — stage 1 strand guild** | Same evidence §1 + NS-004 land 2026-07-30 | Shore-biased seed schedule × salt-tolerant HSI; strand mats on salty exposure before inland herb (**C-018** / **C-019** / **W-003**) | Reuse herb `f_salinity=1−S`; ecosystem painter; invent Locked | `strandHsiComposition.ts`; `veg.*.strand`; probe `strand-arrival`; `docs/slices/N4-composition.md` |
| **Island colonization — salt spray ≠ soil salt** | Same evidence §3 + NS-003 land 2026-07-30 | Herb Liebig `f_spray = 1 − shore.exposure` (exposure already onshore × fetch); windward stalls inland guilds; strand holds via `f_shore` (**C-017**) | Collapse into `soil.salinity`; `stress.spray` store; second onshore multiply; place-targeted wind | `sprayComposition.ts`; `hsiComposition.ts`; probe `spray-arrival`; `docs/slices/N3-composition.md` |
| **Island colonization — sandy crest sand-binder** | Same evidence §2 dune binder + NS-005 land 2026-07-30 | Crest HSI = drainage × exposure × sand × burial(`|longshore|`); binder mats blunt coastal/hillslope work via physicalCover (**C-009** / **C-017** / **W-003**) | Dune painter; second sediment Process; invent Locked | `binderHsiComposition.ts`; `veg.*.binder`; probe `binder-arrival`; `docs/slices/N5-composition.md` |
| **Mei-class / hydraulic-erosion capacity fudge** | Discourse + NATURAL_PROCESS_MATH §3.8 Exner; tessapower listed but not run; 2026-07-30 | Capacity∝slope·√A; deposit where C drops; Priority-Flood basins + local minima as sinks; no incision in ponded cells (**GEO-002**) | Virtual-pipe SWE authority; Hjulström multi-grain as primary law; droplet particles; second sediment Process | `hillslopeDeposit.ts`; `runGeomorphologyStep` Exner-lite; probe `hillslope-deposit`; `docs/slices/E-composition.md` |

**Standing correction (2026-07-28).** Docs previously called the priority-flood fixture a "RichDEM oracle." It is hand-derived from the published algorithm; RichDEM was never executed. VERIFICATION_POLICY §3 and MVP_SCOPE now say so. Either run the tool and regenerate, or keep the honest wording — do not restore the stronger claim.

---

## Helpful now

| Reference | URL | Use for Habitat |
|---|---|---|
| **OpenFloodLab** | https://github.com/taeyeons/OpenFloodLab | Closest architecture peer: browser TypeScript shallow-water, pause/speed, mass-balance documentation, CPU reference vs WebGL path. Study structure and audit patterns — not a library to import. Low stars; treat as a peer prototype. |
| **GWSWEX** | https://github.com/veethahavya-CU-cz/GWSWEX | Clearest **multi-store** API: surface ponding (SW) · unsaturated layers (UZ) · groundwater head/volume (GW) with per-step mass-balance history. Study compartment list + ledger shape for Slice 8b under **C-001** — do not ship Richards/Celia solvers. |
| **pysheds** | https://github.com/pysheds/pysheds | Offline oracle for watershed delineation and accumulation. Generate known-good labels on a DEM; compare to Slice 3 `flowRouting.ts` tests. |
| **RichDEM** | https://github.com/r-barnes/richdem | Priority-flood / depression filling (Barnes 2014). Gold standard before Habitat implements NATURAL_PROCESS_MATH §1.3. Offline validation only. **Implement from the paper, not the repo** — the published algorithm is the source; the C++ is a reading aid. Status: paper used, tool not run (study log). |
| **SimpleHydrology** | https://github.com/weigert/SimpleHydrology | Play-feel reference for “water that looks alive on terrain.” C++/OpenGL — algorithms and presentation, not a drop-in. Watch for particle/erosion aesthetics that fight S-004 / N-004 (causal, inspectable). |
| **3D-Falling-Sand** | https://github.com/NicksterSand/3D-Falling-Sand | Presentation patterns only: lattice cursor, extent cage, lit solid clumps. 20³ voxel CA — **not** Habitat’s authoritative model (T-007). See BUILD_GUIDE §4.2. |
| **3DCellularWorld** | https://github.com/ccrock4t/3DCellularWorld | Dual readout (mesh vs ray-march), motion-through-volume demoability, property-composed motility → map to parameter bundles. Paint-element UX is a counterexample for A-005. See BUILD_GUIDE §4.2. |
| **snowflow** | https://github.com/Noniv/snowflow_demo | Shared `brush()` into RGBA surface state (depression + **berm mass** + compression), beauty/shadow-coherent displacement, presentation spray vs swept-mesh wake. WebGPU/Babylon spectacle — **not** Habitat stack or authority (T-006, T-007). Live: https://snowflow-lilac.vercel.app/ . See BUILD_GUIDE §4.2. |

---

## Helpful later

| Reference | URL | When |
|---|---|---|
| **SHUD** | https://github.com/SHUD-System/SHUD | Fully coupled FVM: ponding · soil moisture · GW · river stage (Duffy two-state integral balance). Oracle for coupling / state naming after a Habitat GW store exists. |
| **VIC** | https://github.com/UW-Hydro/VIC | Macroscale land surface; **lake/wetland storage** with dynamic area vs stage. Playbook for depression ponds as a named storage (ties to Priority-Flood spill). |
| **CWatM** | https://github.com/iiasa/CWatM | Full cycle modules: snow · soil · GW · lakes/reservoirs · routing (+ human demand). Steal modular *store list*, not the global model. |
| **GSFLOW** | https://github.com/rniswon/gsflow_v2 | USGS PRMS + MODFLOW integrated watershed. Offline validation only when GW/baseflow fidelity is in question. |
| **H2MV** | https://github.com/EarthyScience/h2mv | Hybrid physics–ML water cycle with **mass balance enforced every step** (soil, GW, snow, runoff, TWS + veg). Steal constrained-ledger pattern; do not adopt NN cores as authority (T-001). |
| **HMC** | https://github.com/c-hydro/hmc-dev | Distributed continuum: soil · GW · snow · routing. Concepts only (Fortran/HPC). |
| **Landlab** | https://github.com/landlab/landlab | Closest scientific analogue to Process + registry. Ecohydrology / vegetation CA notebooks for moisture↔plant loops. Python research toolkit — study coupling, don’t ship. |
| **hydraulic-erosion** (tessapower) | https://github.com/tessapower/hydraulic-erosion | Slice 8 / GEO-002. Same stack (Three.js, Vite, TypeScript) for comparing erosion algorithms. Terrain *authoring*, not Habitat’s water→habitat loop. |
| **river-runner** | https://github.com/sdl60660/river-runner | P-006 / observation UX. Raindrop-to-outlet path as an attention mechanic. Data/UX idea only. |
| **WhiteboxTools** | https://github.com/jblindsay/whitebox-tools | Occasional offline GIS check: “does our stream overlay match a DEM toolbox?” Overkill for day-to-day. |
| **hydro-sim** (Aperocky) | https://github.com/Aperocky/hydro-sim | Browser TS basins / lakes / overflow. Mild peer for pond fill UX; weak closed-loop soil/GW. |
| **HydroLang** | https://github.com/uihilab/HydroLang | Browser hydro toolbox (lumped rainfall–runoff, stats). Analysis framework — not a preserve WorldState. |
| **One-line coastline / shore-exposure models** | Papers / notebooks (e.g. simple fetch × wave-power → retreat rate; CEM-class one-line) — study via NATURAL_PROCESS_MATH citations, not a vendored engine | **C-017** / Slices 18–19: rule shape for exposure and longshore tendency. Contribute Δelev through geomorphology owner only. |
| **MacArthur–Wilson island biogeography** | Classic theory + modern reviews (area / isolation → richness) | **C-019** / Slice 21: overseas arrival pressure and eligible pool sizing on an island preserve. Not a species simulator to ship. Cross-climate succession steal recorded 2026-07-30 → `docs/evidence/island-colonization.md`. |

---

## Game references — tactility, forces, and the return visit

**Why this section exists.** Until 2026-07-28 every reference here was hydrology or rendering tooling, and the only entry about games was a one-line dismissal. That was backwards: the simulation half is the half that works, and every unresolved question in the project ([THESIS.md](THESIS.md) §10, candidates **C-004**…**C-010**) is a game question. These are works that already solved part of the thesis loop.

**Provenance — read this before citing any row.** These are **design recollections, not play sessions**. Nobody replayed these for this survey. They are catalogued at the level of mechanics and structure, which is durable; specific numbers, tuning, and version-to-version behavior are **not** verified here and must not be cited as fact. The owner's own RCT3 memory outranks this table — it is the origin of the project and the one entry written from lived experience rather than description.

| Reference | What it already solves | Steal | Ban / caution |
|---|---|---|---|
| **RollerCoaster Tycoon 3** — terrain sandbox *(the origin, THESIS §1)* | The tactile half: brush-based sculpting that feels like handling material | Continuous **drag** application rather than click-per-edit; adjustable brush footprint previewed before commit; raise/lower as one tool with a modifier instead of two modes; free undo. This is what "abundant" means concretely (**C-006**) | Its terrain is **decorative** — nothing downstream cares. Habitat's whole premise is that the land answers back. Also: RCT3's water tool sets a water *height* directly; Habitat must not. The equivalent affordance is already built — **Tool: predict wet** answers "where would water go?" without faking it (P-006) |
| **From Dust** (2011) — *the closest existing work to the thesis* | Sculpt-then-watch, with conserved matter and materials that differ | **Matter you carry is conserved** — take sand from here and it is gone from here, which is exactly the open berm/dig ↔ `soil.depth` closeout (§4.1) made into the core verb and read instantly by players. Materials behave differently — sand erodes, rock resists (**C-009**). Vegetation stabilises terrain and spreads with water — the living sand castle, shipped. Scheduled water events your earthworks either survive or don't (**C-004** regime) | Erosion timescales are **arcade-fast** — thrilling, dishonest, and incompatible with ecological time (S-009, ES-005). It has fail states and casualties; sandbox has neither (G-001). Pouring *matter* is a cause and fine; pouring life would breach N-001 |
| **Terra Nil** (2023) | The scenario premise, and founding-not-repair as a shipped structure | You green a wasteland, then **dismantle your machinery and leave** — the win state is the place carrying on without you, which is G-005's persistence window as a felt ending. Closest commercial analogue to the toxic-site scenario (**C-010**, THESIS §3.1) | Its restoration is largely **deterministic and puzzle-shaped** — place the right tool in the right spot, get the biome. That is the ecosystem painter Habitat forbids (N-001, N-002). Steal the arc and the ending, never the placement logic |
| **Viva Piñata** (2006) | **Arrival** as a mechanic — the best commercial example | Species appear because the garden *meets conditions* — the requirement is inspectable, and meeting it is the gameplay. That is **C-007** and Slice 9's arrival gate almost exactly, and it demonstrates the loop is satisfying without deliberate introduction | Requirements are authored checklists per species, which becomes a collection game (N-003) and hidden rules (N-004). Habitat's version must be **derived from simulation state** (E-009), not from a table of unlock conditions |
| **SimEarth** (1990) | Force dials — the ancestor of **C-004** | Planetary processes exposed as **regime controls** rather than spatial actions: you set rates and conditions, then run time and watch. Proof the verb is old, legible, and works | Notoriously opaque — dials whose effects nobody could trace, which is N-004 and S-004 territory. A dial the player cannot form an expectation about is worse than no dial |
| **Cities: Skylines** (2015) — terraforming against live water | Evidence the appetite is real: players spend hours routing water by shaping ground | The desire to **dam, divert, and flood on purpose** is a mainstream pleasure, not a niche one | Its water is widely reported as flood-prone and unstable — spectacular, not legible, and not conserving in a way a player can reason about. Habitat's answer is already Locked: H-004 mass balance, and a ledger you can audit |
| **Falling-sand toys** — Powder Toy, Sandspiel, 3D voxel-sand games | Why toys are *toys*: zero-friction experimentation, no goals, no failure, response latency ~0 (**C-008**) | **Only** the friction level and the immediacy. Pick a tool, act, see the result now | **Corrected 2026-07-28 — this row previously said to steal "material personality learned by playing."** That is the opposite of what Habitat wants. Falling-sand games are learned **from the inside**: you discover that *their* powder does *this*, and mastering an invented rule set is the pleasure. Habitat inverts it — the player's **existing** knowledge of how water, sand, clay and slope behave is the instrument, and nothing should need to be learned that a person doesn't already know (**C-011**, THESIS §2.2). Sand is also not the point: the transferable idea is *something shapable made of real substrates under adjustable natural forces*, not granular simulation. Still never the authoritative model (T-007) |
| **Townscaper** (2021) | The "just messing" bar | Every single input produces something pleasing; no goals, no fail, no resource. The purest available demonstration that abundance plus beauty is a complete loop (D-005, ART-002) | No simulation at all — it owes the player nothing over time. Habitat's pleasure has to survive the *second* look, which is a harder problem |

**What none of them do.** Not one of these lets you fork a world and run the same construction under two different force regimes. From Dust has no branch, Terra Nil has no replay-with-variation, SimEarth has no comparison view. **C-005 branch-and-compare is Habitat's original move**, and the determinism to support it (T-001) is already built. If the thesis is right that "same castle, more rain" is the experiment the game exists to run, this is the part with no prior art to steal — which is worth knowing before designing it.

**Study order for the game half.** From Dust first (nearest neighbour, most transferable). Then Viva Piñata for arrival, Terra Nil for the scenario arc and its painter trap, RCT3 for brush feel — owner-led, since that memory is the source. SimEarth and the sand toys are short reads.

---

## Multi-state / closed-loop water (survey note)

**Closed loop** here means one conserved mass among **named storages**, with auditable fluxes — not a single wetness scalar.

| Habitat today | Common next stores (study above) |
|---|---|
| precip ledger → **surface depth** → **soil moisture · depth** → ET + boundary outflow | **Groundwater / baseflow** (streams persist between storms); **snow**; **channel/lake stage** as storage |

**Steal:** compartment list + per-step Δstore ledgers (GWSWEX, H2MV, OpenFloodLab); lake area↔storage (VIC); Duffy-style two-state naming (SHUD).  
**Ban as authority:** Richards/MODFLOW in-browser; ML water-cycle cores; surface-only spectacle without soil/GW stores.  
**Next ROI for Habitat:** cheap GW/baseflow store under Open candidate **C-001** (NATURAL_PROCESS_MATH §4 Darcy / Boussinesq *lite*; BUILD_GUIDE §4.3) so dry-out between storms is a storage story, not an ET leak. Richards/MODFLOW remain study-only.

---

## Not helpful (skip)

| Kind | Examples | Why |
|---|---|---|
| Ecosystem / evolution games | ecosim, evoli, similar | Wrong fantasy vs D-001, D-002, N-001. Pacing maybe; mechanics no. **Narrowed 2026-07-28:** this row previously dismissed commercial games as a category, which is how the reference surface ended up with zero entries about attention, tactility, or arrival. Rejecting a *fantasy* is not grounds for ignoring how a work holds a player's eye — see **Game references** above. |
| AI pathfinding “flow fields” | flow-field-ts, tower-defense flow fields | Unrelated to hydrologic D8 routing. |
| Heavy SWE / stormwater **as WorldState authority** | SWMM, ANUGA, coastal shallow-water equation suites run in-browser as the hydrology core | Fidelity Habitat does not need (U-002, GEO-002). **Narrowed 2026-07-30:** reject SWE *authority*; still study **rule shape** from one-line coastline / fetch-exposure models under **C-017** (never import ANUGA/SWMM). |
| Richards / MODFLOW **as browser authority** | GWSWEX implicit Celia solver, GSFLOW MODFLOW core shipped in-client | Study equations offline; Habitat stays heightfield + stacked rasters (T-007, GEO-002). |
| ML water-cycle **as sim core** | H2MV neural parameterizations treated as WorldState | Constrained ledgers yes; nondeterministic / opaque nets no (T-001, S-004). |
| WebGPU mega-erosion demos | Hyperpoly, TerrainX-class projects | Conflict with T-001, T-006, and “earn its cost.” |
| Tiny one-off DSM toys | crest, ad-hoc flood-fill demos | Mild reading value at most; not load-bearing. |
| Falling-sand **as world authority** | Noita clones, Margolus voxel sandboxes shipped as sim | Steal UX cues (BUILD_GUIDE §4.2); never replace heightfield + stacked rasters (T-007, SIMULATION_MODEL §2). |
| AAA WebGPU spectacle as DoD | snowflow-class demos taken as product bar | Study shared-write / berm-mass presentation; do not import WebGPU-only, 90 FPS post mandate, screenshot-as-gate without Tier-P, or GPU deform as hydrology authority. |

---

## Recommended study order

1. **OpenFloodLab** — solver/docs patterns vs `fluxStep` + ledgers  
2. **GWSWEX** — SW / UZ / GW compartment + mass-balance history vs Habitat precip · surface · soil · ET residual  
3. **SimpleHydrology** — fun bar for water playtests ([PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md))  
4. **pysheds / RichDEM** — D8, sinks, watersheds for Slice 3+ oracle tests  
5. **Landlab ecohydrology notebooks** — vegetation ↔ moisture (Slice 5–6)  
6. **3D-Falling-Sand / 3DCellularWorld** — presentation-only: cage, cursor, dual readout, motion-in-time (BUILD_GUIDE §4.2); do not study as hydrology backends  
7. **snowflow** — shared surface-write + berm-as-mass presentation; map API shape onto WorldState rasters, not GPU deform authority  
8. **VIC lake/wetland + SHUD state naming** — when ponds / baseflow become named stores  
9. **tessapower/hydraulic-erosion** — when terrain evolution lands  
10. **river-runner** — raindrop / prediction UX for P-006  

---

## Highest ROI next steps

| Effort | Action |
|---|---|
| Hours | Read OpenFloodLab’s numerical/architecture docs beside Habitat’s flux + ledger code |
| Hours | Skim GWSWEX `get_state` / `get_mass_balance` API; sketch Habitat field IDs for a future GW store without implementing Richards |
| Hours | Play SimpleHydrology (or watch demos) before scoring Slice 4 playtest fun |
| Half-day | Export a Habitat mountain DEM; run pysheds (and later RichDEM fill) as CI-adjacent golden fixtures |
| Later slice | Port *ideas* from RichDEM priority-flood into Habitat’s own TS, with register-cited invariants — do not link the C++ library into the browser bundle |
| Later slice | Add a cheap baseflow / GW store (NATURAL_PROCESS_MATH §4) so inter-storm stream persistence is a storage loop |

---

## Relationship to other docs

- Process *equations* and register fit → [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md)  
- Field ownership, bands, structural vs dynamic water → [SIMULATION_MODEL.md](SIMULATION_MODEL.md)  
- What the build must prove → [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md)  
- Execution order + autonomous protocol → [BUILD_GUIDE.md](BUILD_GUIDE.md)  
- Low-token guild / factor / engagement study (subagent cards, not species lists) → [nature-study/PROTOCOL.md](nature-study/PROTOCOL.md), skill `/nature-study` (**propose**). Code or Study-log **land** → `/study-steal`.  

**Research ↔ decisions.** Every **Helpful now/later** steal must cite a Locked/Current register ID or an Open candidate (**C-001**…**C-019**), and must add its row to the **Study log** in the same commit. Bans cite the fight (T-001, T-006, T-007, GEO-002). Agents must not treat Open candidates as Locked policy.

**Sourcing.** Where a reference has a published paper (NATURAL_PROCESS_MATH §10 lists one for nearly every algorithm here), implement from the paper. The repository is for reading and for oracles, not for transcription — which keeps the implementation ours, keeps it citable, and keeps the option open if this ever goes anywhere.
