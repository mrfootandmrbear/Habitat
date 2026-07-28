# External References — Tools to Study (Not Ship)

> **Status:** Working notes  
> **Role:** Curated GitHub and open-source references evaluated against Habitat’s stack and Decision Register  
> **Authority:** Advisory. Nothing here is a dependency or a product decision. Binding math candidates remain in [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md); architecture in [SIMULATION_MODEL.md](SIMULATION_MODEL.md).

**Policy.** Prefer **study clones and offline oracles** over vendoring. Integrating third-party simulation packages would fight T-001 (determinism), T-004 (data-driven content), T-006 (sim/render separation), and single-writer field ownership.

Survey date: 2026-07-27.

---

## Helpful now

| Reference | URL | Use for Habitat |
|---|---|---|
| **OpenFloodLab** | https://github.com/taeyeons/OpenFloodLab | Closest architecture peer: browser TypeScript shallow-water, pause/speed, mass-balance documentation, CPU reference vs WebGL path. Study structure and audit patterns — not a library to import. Low stars; treat as a peer prototype. |
| **pysheds** | https://github.com/pysheds/pysheds | Offline oracle for watershed delineation and accumulation. Generate known-good labels on a DEM; compare to Slice 3 `flowRouting.ts` tests. |
| **RichDEM** | https://github.com/r-barnes/richdem | Priority-flood / depression filling (Barnes 2014). Gold standard before Habitat implements NATURAL_PROCESS_MATH §1.3. Offline validation only. |
| **SimpleHydrology** | https://github.com/weigert/SimpleHydrology | Play-feel reference for “water that looks alive on terrain.” C++/OpenGL — algorithms and presentation, not a drop-in. Watch for particle/erosion aesthetics that fight S-004 / N-004 (causal, inspectable). |
| **3D-Falling-Sand** | https://github.com/NicksterSand/3D-Falling-Sand | Presentation patterns only: lattice cursor, extent cage, lit solid clumps. 20³ voxel CA — **not** Habitat’s authoritative model (T-007). See BUILD_GUIDE §4.2. |
| **3DCellularWorld** | https://github.com/ccrock4t/3DCellularWorld | Dual readout (mesh vs ray-march), motion-through-volume demoability, property-composed motility → map to parameter bundles. Paint-element UX is a counterexample for A-005. See BUILD_GUIDE §4.2. |
| **snowflow** | https://github.com/Noniv/snowflow_demo | Shared `brush()` into RGBA surface state (depression + **berm mass** + compression), beauty/shadow-coherent displacement, presentation spray vs swept-mesh wake. WebGPU/Babylon spectacle — **not** Habitat stack or authority (T-006, T-007). Live: https://snowflow-lilac.vercel.app/ . See BUILD_GUIDE §4.2. |

---

## Helpful later

| Reference | URL | When |
|---|---|---|
| **Landlab** | https://github.com/landlab/landlab | Slice 5–6+. Closest scientific analogue to Process + registry. Ecohydrology / vegetation CA notebooks for moisture↔plant loops. Python research toolkit — study coupling, don’t ship. |
| **hydraulic-erosion** (tessapower) | https://github.com/tessapower/hydraulic-erosion | Slice 8 / GEO-002. Same stack (Three.js, Vite, TypeScript) for comparing erosion algorithms. Terrain *authoring*, not Habitat’s water→habitat loop. |
| **river-runner** | https://github.com/sdl60660/river-runner | P-006 / observation UX. Raindrop-to-outlet path as an attention mechanic. Data/UX idea only. |
| **WhiteboxTools** | https://github.com/jblindsay/whitebox-tools | Occasional offline GIS check: “does our stream overlay match a DEM toolbox?” Overkill for day-to-day. |

---

## Not helpful (skip)

| Kind | Examples | Why |
|---|---|---|
| Ecosystem / evolution games | ecosim, evoli, similar | Wrong fantasy vs D-001, D-002, N-001. Pacing maybe; mechanics no. |
| AI pathfinding “flow fields” | flow-field-ts, tower-defense flow fields | Unrelated to hydrologic D8 routing. |
| Heavy SWE / stormwater | SWMM, ANUGA, coastal shallow-water suites | Fidelity Habitat does not need (U-002, GEO-002). |
| WebGPU mega-erosion demos | Hyperpoly, TerrainX-class projects | Conflict with T-001, T-006, and “earn its cost.” |
| Tiny one-off DSM toys | crest, ad-hoc flood-fill demos | Mild reading value at most; not load-bearing. |
| Falling-sand **as world authority** | Noita clones, Margolus voxel sandboxes shipped as sim | Steal UX cues (BUILD_GUIDE §4.2); never replace heightfield + stacked rasters (T-007, SIMULATION_MODEL §2). |
| AAA WebGPU spectacle as DoD | snowflow-class demos taken as product bar | Study shared-write / berm-mass presentation; do not import WebGPU-only, 90 FPS post mandate, screenshot-as-gate without Tier-P, or GPU deform as hydrology authority. |

---

## Recommended study order

1. **OpenFloodLab** — solver/docs patterns vs `fluxStep` + ledgers  
2. **SimpleHydrology** — fun bar for water playtests ([PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md))  
3. **pysheds / RichDEM** — D8, sinks, watersheds for Slice 3+ oracle tests  
4. **Landlab ecohydrology notebooks** — vegetation ↔ moisture (Slice 5–6)  
5. **3D-Falling-Sand / 3DCellularWorld** — presentation-only: cage, cursor, dual readout, motion-in-time (BUILD_GUIDE §4.2); do not study as hydrology backends  
6. **snowflow** — shared surface-write + berm-as-mass presentation; map API shape onto WorldState rasters, not GPU deform authority  
7. **tessapower/hydraulic-erosion** — when terrain evolution lands  
8. **river-runner** — raindrop / prediction UX for P-006  

---

## Highest ROI next steps

| Effort | Action |
|---|---|
| Hours | Read OpenFloodLab’s numerical/architecture docs beside Habitat’s flux + ledger code |
| Hours | Play SimpleHydrology (or watch demos) before scoring Slice 4 playtest fun |
| Half-day | Export a Habitat mountain DEM; run pysheds (and later RichDEM fill) as CI-adjacent golden fixtures |
| Later slice | Port *ideas* from RichDEM priority-flood into Habitat’s own TS, with register-cited invariants — do not link the C++ library into the browser bundle |

---

## Relationship to other docs

- Process *equations* and register fit → [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md)  
- Field ownership, bands, structural vs dynamic water → [SIMULATION_MODEL.md](SIMULATION_MODEL.md)  
- What the build must prove → [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md)
