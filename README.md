# Habitat

Habitat is a living sand castle: sculpt an island from the substrates nature gives you, set the forces at work, run time, and watch what the landscape and life make of it.

Where it came from and what it is trying to feel like is [THESIS.md](docs/THESIS.md). Read that first; everything else serves it.

Product decisions are governed by the [Decision Register](docs/DECISION_REGISTER.md). How those decisions shape play is explained in the [Design Wiki](docs/DESIGN_WIKI.md). Simulation architecture is specified in [SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md). How simulation state actually reaches the screen — the sim↔render wiring map — is [RENDER_SIM_INTERFACE.md](docs/RENDER_SIM_INTERFACE.md); rendering engine facts and traps are [RENDER_NOTES.md](docs/RENDER_NOTES.md). What the first playable proves — joint sim and game loops — is [MVP_SCOPE.md](docs/MVP_SCOPE.md). How to execute each slice is [BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Gated multi-agent cloud succession (one slice per agent, merge starts the next): [CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md). Who verifies what — agent measurement vs. owner playtest — is [VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md). Promotion criteria and the build-to-register ledger live in [DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md). External tools to study (not ship) are listed in [EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md). Island force inventory: [ISLAND_FORCES.md](docs/ISLAND_FORCES.md); force panel contract: [FORCE_PANEL.md](docs/FORCE_PANEL.md).

## Play (no AI)

- **iPad / any browser (hosted):** after Pages is enabled, open [https://mrfootandmrbear.github.io/Habitat/](https://mrfootandmrbear.github.io/Habitat/) — setup notes in [OWNER_RUN_LOCAL.md](docs/OWNER_RUN_LOCAL.md).
- **Mac local:** [OWNER_RUN_LOCAL.md](docs/OWNER_RUN_LOCAL.md).

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

**Post-MVP / D-007:** Slices **14** / **16** / **15** Tier-O **Pass**; **Slice F** / **17**–**21** Done; rain-feel / clouds machine Done. **Lock A+B+C-004** (v2.0.9–v2.0.10); **C-006 Locked** (v2.0.11); **C-005 tooling / C-013 / C-002 / U-006 Locked** (v2.0.12); **C-020 Locked** (v2.0.13). **Slice G** shipped (machine) — **C-021** / **C-022** season / erosion-intensity dials wired, both Open pending owner Lock. **Slice B** / **Slice E** Done. **NS-007** / **NS-008** / **NS-009** / **NS-010** / **NS-011** Done. Living-wave **L1** / **L6** / **L2** / **L3** / **L7** / **L4** Done; **Wave 0** Done (live audio, fire→biomass, pause+dig, seed regenerate). **§4.44** / **§4.45** / **§4.46** / **§4.47** / **§4.49–§4.52** correctness fixes shipped; **§4.54** starting surface Done; **§4.55** brush size Done; **§4.56** flatten / trowel Done — [C-028 framing](docs/candidates/C-028-framing.md); **§4.57** geometric mold stamps Done (cylinder / pyramid / terrace form stamps); **§4.58** Simple/Full control density Done (U-001); **§4.59** duplicator stamp Done (copy a sculpted form's relief + material, re-stamp elsewhere — C-028 structural kit now fully shipped); **§4.60** occupant sway direction correctness Done (every shoot now leans the same way under one wind instead of each cone rotating its own random yaw into the lean axis; steady lean + gentle flutter, not a pendulum). Open taste: **C-014** (now hearable), **C-021**, **C-022**, **C-028**. Island is the default playable world.

**Next.** Sole open executable machine slice: **Track A §4.67** Seed disperser fields — **§4.66** Herbivore shipped its machine half 2026-08-05 (**F-001 undeferred**, **C-027 Locked**, first `populations` Process; D-007 clip verdict outstanding, [ask](docs/playtests/A1-herbivore.md), gates any *other* new-Process slice, not §4.67 itself). Foxel silhouette/variant design for Track A is a separate low-cost lane, [docs/animal-design/PROTOCOL.md](docs/animal-design/PROTOCOL.md). Track V plant rendering **§4.60–§4.62** Done ([plant rendering review](docs/reviews/2026-08-03-plant-rendering-review.md)); **§4.63** deferred pending profiling. Track R / Track T / Living wave (through L5) Done. Mesopredator/apex-predator roles, ecosystem-engineer write-back, and adaptive radiation (**C-029**, Open) stay off Track A. Owner Lock backlog (**C-014** hearable, **C-021**/**C-022**/**C-028** taste, **C-010** later, **C-029** adaptive radiation) runs in parallel.

**A second, parallel queue.** **§4.44** / **§4.45** / **§4.46** / **§4.47** / **§4.49–§4.53** shipped; **§4.48** Done.

**A third, parallel queue.** Plant rendering (**§4.60–§4.62** Done; **§4.63** deferred) — see Track V above.

- Sim MVP (Slice 6) and Slice 8 geomorphology are Tier-M done
- Batched Tier-O ([PLAYTEST_PRESENTATION.md](docs/PLAYTEST_PRESENTATION.md) + erosion legibility) already fired and **Passed** — subsumed into `docs/playtests/batch-living-return.md` 2026-07-30; later batches fire on the third question or when a slice is blocked ([VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md) §4)
- Agents: [AGENTS.md](AGENTS.md) + BUILD_GUIDE §4.0 (test → probe → conformance → promote what CI settled → maybe ask), and §4.0.1 when blocked
- Cloud succession: [CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md) — Track T terrain tools + Track R review correctness + Track V plant rendering + Track A animal life; merge into `main` gates the next agent
- Skills: `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/blocked-note` (`.cursor/skills/`)
- Candidates whose Judge is CI alone are the agent's to promote; owner-judged ones get a dossier ([DECISION_CONFORMANCE.md](docs/DECISION_CONFORMANCE.md) §3.0)

```bash
npm run dev
```

Playable loop: shape the island, set climate forces (rainfall mean, sea, tide, wind), run time, watch the place answer. No charts — the world is the readout.

`habitat-water-poc` remains a separate reference prototype; this app is a fresh scaffold.
