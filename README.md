# Habitat

Habitat is an ecological restoration game where the player creates conditions and natural systems do the meaningful work.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md). External tools to study (not ship) are listed in [EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md).

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

**Slice 4 — Flow structure, soil storage, inspector overlays** (H-002, H-001, H-003, T-005, W-002)

- Everything in Slice 2, plus:
- D8 flow accumulation and watershed labels from terrain (Slice 3)
- Soil moisture infiltration; ground darkens as soil wets (Slice 4)
- T-005 inspector dropdown: water, accumulation, watershed, soil moisture
- Playtest guide: [docs/PLAYTEST_SLICE4.md](docs/PLAYTEST_SLICE4.md)

```bash
npm run dev   # then follow PLAYTEST_SLICE4.md
```

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
