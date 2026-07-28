# Habitat

Habitat is an ecological restoration game where the player creates conditions and natural systems do the meaningful work.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). What the first playable proves — joint sim and game loops — is [MVP_SCOPE.md](docs/MVP_SCOPE.md). How to execute each slice is [BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md). External tools to study (not ship) are listed in [EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md).

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

**Slice 6 — Cover blunts the storm** (E-005) — **playtest Pass** (sim MVP)

- Vegetation grows from wet soil, then raises roughness / infiltration so cover retains more water
- Status `Σw` / `infil`; paired-storm tests green
- Playtest: [docs/PLAYTEST_SLICE6.md](docs/PLAYTEST_SLICE6.md)

```bash
npm run dev
```

Rain → green → reset water / storm again, or bare reload for A/B.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
