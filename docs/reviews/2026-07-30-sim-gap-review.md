# Simulation gap review — what's missing from the plan

> **Date:** 2026-07-30  
> **Role:** Advisory inventory of shipped sim vs thesis loop vs BUILD_GUIDE queue  
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan updates live in [BUILD_GUIDE.md](../BUILD_GUIDE.md) Current gate / Next.  
> **Trigger:** Joint ladder largely Done; Nature P0 tip set; owner asked for a high-level sim review before more systems.

---

## 0. Verdict

The **mechanics of the living sand castle mostly exist**. Water, soil/GW, geomorphology, fire, light, HSI, arrival, biology→physics, island/sea/tide/shore/salt/overseas, substrates, force panel, and atmosphere precip are registered Processes or dials under `src/sim/`.

What the **plan understated** is not "add more Processes next" — it is:

1. Encoding / clip work already on the tip (**D-007**)
2. A pile of **Done ≠ Lock** owner debt
3. Thesis instruments that never got a queue slot: branch-and-compare (**C-005**), resolution honesty (**C-012**), season as a dial (unfiled), toxic legacy load (**C-010**)

**Executable tip stays Nature P0.** This review does not reorder it.

---

## 1. Shipped inventory (sim surface)

Registered in `WorldState` / `SimScheduler` (`src/sim/WorldState.ts`, `src/sim/process/`).

| Band | Processes | Player force dials |
|---|---|---|
| event | climate, surfaceWater, fire | Rain, Heat, Wind, Sea, Tide; Ignite pulse |
| daily | soilWater, groundwater, habitat, vegetation | — |
| seasonal | vegetation (herb establish) | *band only — no season dial* |
| annual | dispersal | — |
| decadal | geomorphology, fuel | — |

**Stores present:** elevation, water, soil (moisture / depth / material / salinity), GW, HSI, veg / cover / herb arrival, fire / fuel, shore, climate scalars.

**Absent:** snowpack / SWE store, nutrients, animals, contaminants, calendar season force dial.

Policy gaps are Open candidates in code comments — not `TODO` stubs.

---

## 2. Gap categories (plan impact order)

### 2.1 Queue tip is right — keep it

Per [nature-study/BACKLOG.md](../nature-study/BACKLOG.md):

1. **NS-006** — salt memory encoding (signal exists; default-view clip)
2. **NS-002** — Heat dial → plant gate (`f_temp`)
3. **NS-004** — strand guild (one new guild)

Obeys **D-007**: no new Process until encoding / clip work moves.

### 2.2 Lock / Pass debt (“Done ≠ Lock”)

| Cluster | Status | Why it matters |
|---|---|---|
| **C-009** substrate | Machine + legibility Pass | Gates **C-010** framing |
| **C-015…C-019** maritime | Owner halves often Pass | Constitution lag while Nature cards land |
| **C-004** / **C-020** | Force panel + clouds shipped | Stewardship / weather-feel Lock still owner |
| **C-014** / **U-006** | Audio + notebook chrome | Alive/silence + notebook Lock |

Treat as a standing **Owner Lock queue**, separate from Nature P0.

### 2.3 Thesis loop holes with weak or no queue slot

| Thesis need | Candidate / status | Plan before this review |
|---|---|---|
| Same castle, different forces | **C-005** Open; F-002 / F-005 Deferred | Not on Next |
| Habitat mosaic readable | **C-012** Open; Δx suspect | Named in AGENTS; no slice |
| Season as force dial | THESIS §4; unfiled | No C-02x |
| Erosion intensity dial | Geomorph runs; no regime dial | Unfiled |
| Toxic-site premise | **C-010** after C-009 | Gated line only |
| Undo edits not time | **C-013** | Not queued |
| Abundant sculpting | **C-006** CI-promotable | Idle while encoding runs |

Highest leverage **after** Nature P0 encoding: file a **season** candidate (or expand C-004), then a **C-005** slice scaffold (fork world + force delta) — the experiment [THESIS.md](../THESIS.md) §7 says the product exists to run.

### 2.4 Shipped but soft / deferred Tier-O

Fire, light/succession, HSI-without-HUD, dry-down feel — Tier-M green, Tier-O deferred/batched. Not missing sim; missing attention batch. Do not invent new systems to “finish” them.

### 2.5 Aspirational model — do not sneak onto tip

[SIMULATION_MODEL.md](../SIMULATION_MODEL.md) still describes soil C/N, populations, woody stages, authored outlets as schema. Nature P2 (nutrients, animals / F-001) correctly parks these.

**Rule:** no Process for nutrients / animals until a candidate exists and the D-007 clip is green.

---

## 3. Non-goals for the next sessions

- Persistent `snow.waterEquivalent` / SWE hydrology writer (optional C-020 remainder only)
- Nutrients / guano Process
- Animals / F-001 engineers
- Reordering Nature P0 ahead of owner Lock taste
- Promoting Open candidates as if Locked

---

## 4. Suggested work order after this review

```
NS-006 encode  →  NS-002 Heat→plant  →  NS-004 strand
     │
     └── parallel (owner): Lock batch dossiers
     └── next planning slice (agent): file season candidate + C-005 scaffold depth
     └── when C-009 Locked: C-010 toxic-site scenario content
     └── C-012 resolution experiment only if clip still fails mosaic test
```

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) Current gate / Next; [AGENTS.md](../../AGENTS.md) queue tip.
