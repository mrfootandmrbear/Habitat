# Habitat

Habitat is an ecological restoration game where the player creates conditions and natural systems do the meaningful work.

Where it came from and what it is trying to feel like — a digital sand castle that life and nature have their way with — is [THESIS.md](docs/THESIS.md). Read that first; everything else serves it.

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

**Post-MVP:** Slice **8b** groundwater / baseflow **Done** (**C-001** Locked). Next: **Slice 8c** return visit; next-but-one **Slice 9** limiting factors / HSI.

- Sim MVP (Slice 6) and Slice 8 geomorphology are Tier-M done
- Batched optional Tier-O: [PLAYTEST_PRESENTATION.md](docs/PLAYTEST_PRESENTATION.md) + erosion legibility — fires on the third question or when a slice is blocked ([VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md) §4)
- Agents: [AGENTS.md](AGENTS.md) + BUILD_GUIDE §4.0 (test → probe → conformance → promote what CI settled → maybe ask), and §4.0.1 when blocked
- Skills: `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/blocked-note` (`.cursor/skills/`)
- Candidates whose Judge is CI alone are the agent's to promote; owner-judged ones get a dossier ([DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md) §3.0)

```bash
npm run dev
```

Sim MVP (Slices 2–6) remains playable: rain, predict, berm/dig, green cover that retains water.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
