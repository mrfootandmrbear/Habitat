# Habitat

Habitat is a living sand castle: sculpt an island from the substrates nature gives you, set the forces at work, run time, and watch what the landscape and life make of it.

Where it came from and what it is trying to feel like is [THESIS.md](docs/THESIS.md). Read that first; everything else serves it.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). What the first playable proves — joint sim and game loops — is [MVP_SCOPE.md](docs/MVP_SCOPE.md). How to execute each slice is [BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what — agent measurement vs. owner playtest — is [VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md). External tools to study (not ship) are listed in [EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md). Island force inventory: [ISLAND_FORCES.md](docs/ISLAND_FORCES.md); force panel contract: [FORCE_PANEL.md](docs/FORCE_PANEL.md).

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

**Post-MVP / D-007:** Slices **14** / **16** / **15** Tier-O **Pass**; **Slice F** / **17**–**21** Done; rain-feel / clouds machine Done. **Lock A+B+C-004** (v2.0.9–v2.0.10): C-009 / C-015…C-019 / C-004 Locked; **W-001** Superseded. Open taste: **C-020** Hold Lock (glitches), **C-014** (no hear), **U-006** unanswered. **Next:** agent **C-005** scaffold ([BUILD_GUIDE §4.27](docs/BUILD_GUIDE.md)). Island is the default playable world.

- Sim MVP (Slice 6) and Slice 8 geomorphology are Tier-M done
- Batched optional Tier-O: [PLAYTEST_PRESENTATION.md](docs/PLAYTEST_PRESENTATION.md) + erosion legibility — fires on the third question or when a slice is blocked ([VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md) §4)
- Agents: [AGENTS.md](AGENTS.md) + BUILD_GUIDE §4.0 (test → probe → conformance → promote what CI settled → maybe ask), and §4.0.1 when blocked
- Skills: `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/blocked-note` (`.cursor/skills/`)
- Candidates whose Judge is CI alone are the agent's to promote; owner-judged ones get a dossier ([DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md) §3.0)

```bash
npm run dev
```

Playable loop: shape the island, set climate forces (rainfall mean, sea, tide, wind), run time, watch the place answer. No charts — the world is the readout.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
