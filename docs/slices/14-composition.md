# Slice 14 — Scenario objective scaffold

**Cited:** [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §12 scenario completion structure; [THESIS.md](../THESIS.md) §7 sandbox vs scenarios; BUILD_GUIDE §4.10; **G-002** (Locked), **G-001**, **G-005** / **G-006** / **G-007** (Open — store without resolving), **G-008**, T-006, N-001, N-004. Notebook seed: “The brief asked me to keep the hollow wet long enough for life to hold the next storm.”

## Choice

Scenarios are an **authored objective + evaluation schedule** over the same sandbox `WorldState`. No second sim, no win meter unrelated to preserve state, no cleanup tool.

| Choice | Value | Why |
|---|---|---|
| Authority | Existing `WorldState` only | G-002 configures conditions + criteria; N-004 forbids hidden scenario logic |
| Evaluator | Observer session (`writes: []`) | T-006 — evaluation must not mutate sim |
| Criterion | Named field mean ≥ threshold (authored) | G-008 primary ecological objective without a health scalar (N-002) |
| Window | Rolling sim-day ring + entry/exit hysteresis | G-005 Locked; lengths are scenario authoring (S-009), not register policy |
| Completion store | `achievedAtSimMinutes` + `currentlySatisfied` + `windowHistory` | SIM §12 / G-007 — all four alternatives expressible; loader does not pick one |
| Schedule | Sample every N event steps (default = one day) | Cadence in sim time; time-rate invariant (S-009) |
| Sandbox | Unchanged when no scenario loaded | G-001 — scenarios are additive |

## Objective schema

```
ScenarioDefinition {
  id: string
  brief: string                          // human-facing; notebook material
  criterion: {
    kind: "meanField"
    fieldId: string                      // registered field, e.g. veg.biomass.herb
    threshold: number                    // inclusive lower bound
    region?: { x0, x1, z0, z1 }          // half-open cell bounds; omit = full preserve
  }
  window: {
    lengthDays: number                   // rolling ring length (G-005)
    entryDays: number                    // consecutive rolling-met days to enter satisfied
    exitDays: number                     // consecutive rolling-failed days to leave satisfied
  }
  schedule: {
    sampleEveryEventSteps: number        // default config.dailyEventSteps
  }
}
```

Window lengths are **tuning / authoring parameters**, not Locked register values (G-005 Implications).

## Evaluation cadence

1. Host advances `WorldState` as usual (sculpt → forces → time).
2. After each event step, `ScenarioSession.observe(world)` may sample when `simMinutes` crosses the next schedule boundary.
3. Sample: read criterion → push boolean onto the rolling ring (cap = `lengthDays`).
4. `rollingMet` = ring is full **and** every sample is true.
5. Entry hysteresis: `rollingMet` true for `entryDays` consecutive samples → `currentlySatisfied = true`; if `achievedAtSimMinutes` is null, set it to current `clock.simMinutes`.
6. Exit hysteresis: `rollingMet` false for `exitDays` consecutive samples → `currentlySatisfied = false`. **`achievedAtSimMinutes` is never cleared** by the evaluator — that choice belongs to G-007.

A brief dip that does not fill `exitDays` leaves `currentlySatisfied` true (G-005 grace).

## G-007 three-shape storage (four alternatives)

| Field | Alt 1 permanent | Alt 2 while met | Alt 3 record + health | Alt 4 separate stewardship |
|---|---|---|---|---|
| `achievedAtSimMinutes` | completion | ignored | historical record | completion stamp |
| `currentlySatisfied` | ignored | live completion | live health | stewardship flag |
| `windowHistory` | evidence | evidence | evidence | evidence |

The session **stores all three** and exposes them. It does **not** promote one reading into UI copy, save semantics, or end-of-scenario presentation. G-007 stays Open.

## Field ownership

No new registered fields. Completion state lives on the observer session (like `PredictionSession`), not in the registry. Save integration of the completion structure is deferred to scenario campaign / T-003 save-schema work; the serializable shape is defined here so that work does not invent a fourth alternative.

| Concern | Owner | Writes WorldState? |
|---|---|---|
| Criterion sample | `ScenarioSession` observer | no |
| Rolling window / hysteresis | `ScenarioSession` | no |
| Preserve fields under criterion | Existing process owners | unchanged |

## Probe `scenario-window`

Paired meeting / failing preserve states under one authored criterion (`veg.biomass.herb` mean ≥ threshold):

- **Meet** twin: herb biomass held above threshold → window fills → `currentlySatisfied = 1`, `achievedAt` set.
- **Fail** twin: biomass held at 0 → window never fills → `currentlySatisfied = 0`, `achievedAt` null.
- Same definition + schedule → identical evaluation outcome hash on replay.
- World `stateHash` unchanged across `observe` (write isolation).

## Deferred

- Scenario load UI / brief presentation (Tier-O batch question).
- Mixed optional achievements (G-008 secondary recognitions).
- G-006 explicit failure / restore UX.
- G-007 resolution and end-of-scenario presentation.
- Contaminant / toxic-site objectives (**C-010**, needs **C-009**).
- Wiring completion state into `SaveDocument` (T-003).

## Banned

- Resolving Open G-007 by shipping only one completion shape.
- A cleanup tool that removes poison or paints an outcome (C-010 / N-001).
- Scenario scripting that bypasses the sim (N-004).
- Closing sandbox or gating sculpting behind scenario progress (G-001, C-006).
- A second win meter unrelated to preserve state (N-002).
- Wall-clock window lengths (S-009).
