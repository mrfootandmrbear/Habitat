# Habitat

Habitat is an ecological restoration game where the player creates conditions and natural systems do the meaningful work.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). What the first playable proves — joint sim and game loops — is [MVP_SCOPE.md](docs/MVP_SCOPE.md). How to execute each slice is [BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what — agent measurement vs. owner playtest — is [VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md). External tools to study (not ship) are listed in [EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md).

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

**§4.2 presentation substrate done** (cage, snapped cursor, flow cues, cutaway, conservation HUD). Tier-P proxies green.

- Optional owner ask: [PLAYTEST_PRESENTATION.md](docs/PLAYTEST_PRESENTATION.md)
- Next systems: Slice 8 (soil legacy) when ready

```bash
npm run dev
```

Sim MVP (Slices 2–6) remains playable: rain, predict, berm/dig, green cover that retains water.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
