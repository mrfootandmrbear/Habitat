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
| **snowflow** | Demo + API shape, 2026-07-28 | Berm reads as displaced mass; shared surface write; observers sample beauty rather than authoring it (C-002 / GEO-002) | WebGPU deform as hydrology authority; 90 FPS as DoD; screenshot-as-gate (T-006, T-007) | BUILD_GUIDE §4.2 presentation substrate; the depth↔elev mass item is still **open** in §4.1 |
| **GWSWEX** | API/compartment shape read; no code run | SW / UZ / GW compartment list + per-step Δstore ledger as the shape for a cheap store (**C-001**) | Richards / Celia solver in-browser | Register **C-001**, BUILD_GUIDE §4.3 — **not yet implemented** |
| **3D-Falling-Sand** · **3DCellularWorld** | Presentation pass, 2026-07-28 | Extent cage, snapped lattice cursor, dual readout, motion-in-time | Voxel CA as world authority (T-007); paint-element UX as a *counterexample* for A-005 | BUILD_GUIDE §4.2 — `ExtentCage.ts`, `SitingCursor.ts`, `FlowCueMesh.ts` |
| **pysheds** | **No record.** Listed as a Slice 3 oracle; no fixture or artifact exists in the repo | — | — | Nothing. The accumulation tests are self-derived |
| **OpenFloodLab** · **Landlab** · **SimpleHydrology** | **No record** — top of the study order, no evidence either was opened | — | — | Nothing |
| **VIC** · **SHUD** · **CWatM** · **GSFLOW** · **H2MV** · **HMC** · others in *Helpful later* | Not yet — gated on a GW store existing | — | — | Nothing |

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
| Ecosystem / evolution games | ecosim, evoli, similar | Wrong fantasy vs D-001, D-002, N-001. Pacing maybe; mechanics no. |
| AI pathfinding “flow fields” | flow-field-ts, tower-defense flow fields | Unrelated to hydrologic D8 routing. |
| Heavy SWE / stormwater | SWMM, ANUGA, coastal shallow-water suites | Fidelity Habitat does not need (U-002, GEO-002). |
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

**Research ↔ decisions.** Every **Helpful now/later** steal must cite a Locked/Current register ID or an Open candidate (**C-001**, **C-002**, **C-003**), and must add its row to the **Study log** in the same commit. Bans cite the fight (T-001, T-006, T-007, GEO-002). Agents must not treat Open candidates as Locked policy.

**Sourcing.** Where a reference has a published paper (NATURAL_PROCESS_MATH §10 lists one for nearly every algorithm here), implement from the paper. The repository is for reading and for oracles, not for transcription — which keeps the implementation ours, keeps it citable, and keeps the option open if this ever goes anywhere.
