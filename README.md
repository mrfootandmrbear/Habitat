# Habitat

Habitat is an ecological restoration game where the player creates conditions and natural systems do the meaningful work.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md).

## Run the prototype

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

Tests and conformance:

```bash
npm test
npm run conformance:check
```

Regenerate the conformance ledger after doc or citation changes:

```bash
npm run conformance
```

## Current slice

**Slice 2 — Simulation infrastructure** (H-002, S-009, T-001, T-006, T-007)

- Vite / TypeScript / Three.js with sim/render separation
- `WorldState` owns terrain and water; field registry for Slice 2 fields
- Event-band process scheduler with `surfaceWaterProcess`
- No-flow map edges; cumulative precipitation and boundary-outflow ledgers
- Pause / 1× / 4× / 16× time rates (wall clock only; `simDt` fixed)
- Automated determinism, time-invariance, and conservation tests (`npm test`)

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
