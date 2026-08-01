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

**Post-MVP / D-007:** Slices **14** / **16** / **15** Tier-O **Pass**; **Slice F** / **17**–**21** Done; rain-feel / clouds machine Done. **Lock A+B+C-004** (v2.0.9–v2.0.10); **C-006 Locked** (v2.0.11); **C-005 tooling / C-013 / C-002 / U-006 Locked** (v2.0.12); **C-020 Locked** (v2.0.13). **Slice G** shipped (machine) — **C-021** / **C-022** season / erosion-intensity dials wired, both Open pending owner Lock. **Slice B** / **Slice E** Done. **NS-007** / **NS-008** / **NS-009** / **NS-010** / **NS-011** Done. Living-wave **L1** / **L6** Done (time throughput; clock in real-world units), **L2** Done (local seed rain — a founded patch now spreads), and the **§4.44** / **§4.49–§4.52** correctness fixes shipped. Open taste: **C-014**, **C-021**, **C-022**. Island is the default playable world.

**Next — the Living wave.** Two reviews measured what the ladder had not: the [living-world review](docs/reviews/2026-07-31-living-world-review.md) (life) found that established biomass never produces seed, mortality is an instantaneous clamp rather than a rate, and life never moves on screen; the [time-architecture review](docs/reviews/2026-07-31-time-architecture-review.md) (the clock) found that "1×" is already 54,000× real time, that the annual and decadal bands run 10× and 360× fast against their own spec, and that a century costs 40 minutes of CPU. Queued as **L1** throughput → **L6** real-world time units → **L2** local seed rain → **L3** mortality as a rate → **L7** activity-gated event band → **L4** biotic motion ([BUILD_GUIDE §4.36–§4.43](docs/BUILD_GUIDE.md)). **L1**, **L6** and **L2** have shipped — deferred time debt plus a rate ladder in real units (`1 s/s` … `1 week/s`) with no baseline moved, then local seed rain: standing biomass is now a propagule source, so a founded meadow spreads, stops at ground too salty for it, and regrows from whatever survived a disturbance. **L3** (mortality as a rate) is next, and is what lets a front recede as well as advance. Blocked on newly-filed candidates: **L5** guild competition (**C-023**), **L8** deep-time ladder (**C-024** / **C-025**). Owner Lock backlog (**C-014**, **C-021**/**C-022** taste, **C-010** later) runs in parallel.

**A second, parallel queue.** Four more scoped domain reviews — [fire/fuel](docs/reviews/2026-07-31-fire-fuel-review.md), [vegetation/habitat](docs/reviews/2026-07-31-vegetation-habitat-review.md), [hydrology/geomorphology](docs/reviews/2026-07-31-hydrology-geomorphology-review.md), [UI encoding](docs/reviews/2026-07-31-ui-encoding-review.md) — found that fire has no rate of spread and never clears `fire.intensity` once out; six habitat-suitability curves are monotone where the correct hump shape already exists elsewhere in the same files; a flat-routing bug in the drainage fill severs the channel network with 2-cycles; and the color-delta functions that prove a signal is "Observable" (Definition of Done row 2) saturate across roughly half their domain. Nine defect-fix slices filed, **§4.44–§4.52**; one new candidate, **C-026** (CVD-safe palette, Open). **§4.44** (fire spread as a rate), **§4.49** (drainage flat-routing), **§4.50** (surface-flux stability), **§4.51** (coastal base-level & substrate coupling), and **§4.52** (encoding delta correctness) have shipped; **§4.45–§4.48** — fuel/scar numerics, HSI curve shapes, guild cover & light competition, habitat/dispersal hygiene — remain queued. Fire now spreads at a rate you can watch: the front advances a bounded number of cell-rings per step instead of consuming every connected patch of fuel the instant it is lit, and a burn that has gone out stops reporting itself as burning.

- Sim MVP (Slice 6) and Slice 8 geomorphology are Tier-M done
- Batched Tier-O ([PLAYTEST_PRESENTATION.md](docs/PLAYTEST_PRESENTATION.md) + erosion legibility) already fired and **Passed** — subsumed into `docs/playtests/batch-living-return.md` 2026-07-30; later batches fire on the third question or when a slice is blocked ([VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md) §4)
- Agents: [AGENTS.md](AGENTS.md) + BUILD_GUIDE §4.0 (test → probe → conformance → promote what CI settled → maybe ask), and §4.0.1 when blocked
- Skills: `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/blocked-note` (`.cursor/skills/`)
- Candidates whose Judge is CI alone are the agent's to promote; owner-judged ones get a dossier ([DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md) §3.0)

```bash
npm run dev
```

Playable loop: shape the island, set climate forces (rainfall mean, sea, tide, wind), run time, watch the place answer. No charts — the world is the readout.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
