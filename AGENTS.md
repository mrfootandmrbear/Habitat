# Habitat — Agent instructions

Habitat is a living sand castle: sculpt substrates, set forces, run time, watch nature and life take what you built. Thesis: [docs/THESIS.md](docs/THESIS.md). Decisions: [docs/DECISION_REGISTER.md](docs/DECISION_REGISTER.md). Execution: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what: [docs/VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md). Gated cloud succession (one slice per agent, merge starts the next): [docs/CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md).

**Touching rendering code?** Read [docs/RENDER_SIM_INTERFACE.md](docs/RENDER_SIM_INTERFACE.md) first — the map of which sim field feeds which render file, and the per-frame call sequence — before editing by screenshot. [docs/RENDER_NOTES.md](docs/RENDER_NOTES.md) has the engine traps once you know which file is involved.

## Green bar (session gate)

```bash
npm run gate
```

Equivalent to `npm test` · `npm run build` · `npm run conformance:check` · `npm run probe -- --all --check`. Prefer the alias.

Intentional probe baseline refresh: `npm run probe -- <scenario> --write-baseline` — state why in the commit body.

## Non-negotiables

- **Numbers are yours.** Conservation, hashes, probes, proxies — report the number. Never ask the owner to confirm a test or read the HUD.
- **Owner asks** only for attention / legibility / taste, one sentence with **no number**, after the ask gate (VERIFICATION_POLICY §4). Batch Tier-O; hygiene slices get no playtest.
- **Do not vendor** third-party sim engines (T-001, T-006, T-007). Study via [docs/EXTERNAL_REFERENCES.md](docs/EXTERNAL_REFERENCES.md); cite Locked IDs or **C-00x**.
- **Unexplained** `GOLDEN_*` or probe-baseline moves are defects, not updates.
- **Blocked ≠ idle.** §4.0.1 → `docs/blocked/<date>-<slice>.md`, name next queue item, take it.
- **CI-judged candidates:** promote yourself in the evidence commit (DECISION_CONFORMANCE §3.0). Owner-judged → dossier only.
- **Clip gate before a new system (D-007, Locked).** A slice registering a new `Process` records a twenty-second clip verdict (THESIS §8) in its BUILD_GUIDE entry first. While the clip does not exist, the next slice is legibility / encoding / presentation, **not** another system. Not a playtest — no ask gate, no batching, no owner session. Slices registering no process are exempt.
- **Numbers that live in `config.ts` are generated, not typed.** Cite DECISION_CONFORMANCE §5 world facts; never restate grid, Δx, or extent in prose. `conformance:check` fails on drift — this is how the 20× C-012 units error is prevented from recurring.

## Project skills (slash or auto)

| Skill | When |
|---|---|
| `/run-gate` | Closeout / before playtest ask |
| `/author-probe` | New or baseline probe scenarios |
| `/write-playtest` | Tier-O request after ask gate |
| `/promote-candidate` | Criterion met or dossier needed |
| `/study-steal` | Acting on EXTERNAL_REFERENCES |
| `/nature-study` | Guild / factor / engagement cards ([docs/nature-study/PROTOCOL.md](docs/nature-study/PROTOCOL.md)) — not species catalogs |
| `/blocked-note` | §4.0.1 stop conditions |

Always-on rules in `.cursor/rules/` (vision, verify-before-asking, build-plan-on-commit) override when they conflict with convenience.

## Current queue tip

Reviews: [sim-gap](docs/reviews/2026-07-30-sim-gap-review.md) (physics) · [living-world](docs/reviews/2026-07-31-living-world-review.md) (life) · [time-architecture](docs/reviews/2026-07-31-time-architecture-review.md) (the clock) · [fire/fuel](docs/reviews/2026-07-31-fire-fuel-review.md) · [vegetation/habitat](docs/reviews/2026-07-31-vegetation-habitat-review.md) (extends living-world) · [hydrology/geomorphology](docs/reviews/2026-07-31-hydrology-geomorphology-review.md) · [UI encoding](docs/reviews/2026-07-31-ui-encoding-review.md). Joint ladder largely Done; **Done ≠ Lock**. [Plant rendering](docs/reviews/2026-08-03-plant-rendering-review.md) (presentation — `OccupantMesh`'s one shared cone reads as "thin pyramids"; menu of geometry fixes, no new `Process`) — owner agreed 2026-08-03 with its recommendation to ship plant rendering now over animals (**F-001** stays Deferred). Queued as **§4.60–§4.63** on a new **Track V**, §4.60 tip.

**Second queue — nine defect-fix slices from the four newest reviews, [BUILD_GUIDE §4.44–§4.52](docs/BUILD_GUIDE.md) — all Done.** §4.44–§4.47 shipped earlier; **§4.48 habitat/dispersal determinism hygiene shipped** ([habitat-dispersal-hygiene-composition.md](docs/slices/habitat-dispersal-hygiene-composition.md)) — declared `habitatProcess`'s undeclared terrain/soil-material reads; removed `runHerbEstablishmentStep`'s same-tick Gauss-Seidel order dependence by moving every cross-guild biomass read into `runDispersalStep` (which only ever reads biomass, never mutates it); strand/binder/marsh/shrub/crust HSI is now computed once by dispersal and cached (`veg.hsi.*`, annual band), not recomputed a second time at establishment's own cadence. 29 baselines refreshed (the cadence change ripples broadly, same shape as §4.47's own blast radius). **§4.49–§4.52 shipped** (flat-routing / flux-stability / coastal base-level / encoding-delta correctness — see prior entries in [BUILD_GUIDE.md](docs/BUILD_GUIDE.md) for detail). Only **C-026** (CVD-safe palette) remains from this queue, Open and owner-judged, not tip.

**Living wave — [BUILD_GUIDE §4.36–§4.43](docs/BUILD_GUIDE.md) — all Done, including L5:**

1. ~~**L1** throughput defect~~ + ~~**L6** real-world time units~~ — **shipped together** ([L1-L6-composition.md](docs/slices/L1-L6-composition.md)).
2. ~~**L2** local seed rain~~ — **shipped** ([L2-composition.md](docs/slices/L2-composition.md), [spread-front](docs/evidence/spread-front.md)).
3. ~~**W0** Locked presentation debt~~ — **shipped** ([W0-composition.md](docs/slices/W0-composition.md)): live audio beds, fire kills guild biomass, pause+dig defaults, seed regenerate. **C-014** now hearable (still Open).
4. ~~**L3** mortality as a rate~~ — **shipped** ([L3-composition.md](docs/slices/L3-composition.md), [dieback-lag](docs/evidence/dieback-lag.md)): first-order dieback; crust 1 / herb 2 / shrub 7 bands-to-half; short drought ridden out.
5. ~~**L7** activity-gated event band~~ — **shipped** ([L7-composition.md](docs/slices/L7-composition.md), [event-band-gate](docs/evidence/event-band-gate.md)): surface+fire sleep when dry; atmosphere always runs; hash-identity vs ungated; skipFrac **0.3**.
6. ~~**L4** biotic motion~~ — **shipped** ([L4-composition.md](docs/slices/L4-composition.md)): wind sway; calm is still; standing dead barely leans; D-007 clip Pass.
7. ~~**L5** guild competition~~ — **shipped** ([succession-displace-composition.md](docs/slices/succession-displace-composition.md)). **C-023 Locked** (owner delegated the choice in session, 2026-08-03 — leading direction adopted as written). Shrub, the one structurally taller (woody) guild among the six, attenuates the insolation feeding herb's existing light arm via the Beer–Lambert `evaluateLight` §4.47 already made correct — a new call site, not a new law. `succession-displace` probe: herb rises to a peak then genuinely *declines* under a live shrub canopy (≈1.69 → ≈0.98) while a shrub-suppressed twin rises monotonically and never declines (≈2.08) — real displacement, not parallel accumulation, and the regression case (zero shrub cover) is bit-identical to the old unattenuated behavior. Scoped to shrub → herb only; strand/binder/marsh/crust have no light arm to attenuate today. Only **deep-time** baseline moved, and only slightly.

**Executable tip now:** Track R's **§4.48** / **§4.40 L5** (**C-023 Locked**) shipped. Track V **§4.60–§4.62** Done; **§4.63** deferred. Track T parked. Living wave through **L8** Done (**C-024** / **C-025 Locked**).

**Executable tip now (updated 2026-08-06):** **Track A §4.67** Seed disperser remains the animal-life tip (extends A1's `populations` Process — **§4.66** Herbivore machine half shipped 2026-08-05; D-007 clip verdict outstanding, [ask](docs/playtests/A1-herbivore.md)). **L8** (§4.43) **Done** — deep-time skip menu + presentation LOD; **C-024** / **C-025 Locked** (v2.0.21). Next performance follow-on: SIM §6.5 #2 semi-implicit / fewer flux substeps. Remaining owner-judged taste: **C-014**, **C-021**, **C-022**, **C-026**, **C-028**. Mesopredator/apex/engineer and **C-029** stay off Track A.

**Parallel owner queue:** residual **C-014** (hearable after W0); **C-021**/**C-022** taste sitting; **C-028** taste. **C-023** / **C-024** / **C-025** / **C-006** / **C-020** / **C-027** Locked. **C-010** framing written. Taste residual: [owner-lock-batch.md](docs/candidates/owner-lock-batch.md).

**Owner Lock backlog:** A/B/**C-004** / **C-005 tooling** / **C-013** / **C-002** / **U-006** / **C-020** / **C-023** / **C-024** / **C-025** Locked · **W-001** Superseded · remaining **C-014**, **C-021**, **C-022** · still Open, owner-judged: **C-026** (CVD-safe palette), **C-028** (sculpt toolbox taste).

**Thesis holes (not tip):** C-012 Δx/mosaic (only if place-reading fails) · C-010 framing is on tip after C-013 · optional SWE only if a later snow defect appears.

## Cursor Cloud specific instructions

- Install: `npm install` (see `.cursor/environment.json`). No secrets required for the green bar.
- Prefer **headless** verification (tests + probes). Do not start `npm run dev` unless the task is Tier-P visual encoding or a playtest file that names exact on-screen controls.
- Computer use / browser: only for presentation/encoding checks after a proxy metric exists — never to "see if the pond looks right" as a substitute for Tier-M.
- Long jobs (`deep-time`, full probe suite): run to completion; paste measured scalars into the commit body / evidence md.
- Open PRs with gate results summarized; never silently refresh baselines.
- **Green bar must stay green.** `npm run gate` is expected to pass on a clean install. If it fails, fix it — do not document a red gate as normal.
- Named probes also work individually (`paired-storm`, `berm-reroute`, `basin-fill`); `--all --check` is the CI tripwire.
- If `conformance:check` says the ledger is out of date, run `npm run conformance` and commit the ledger with the doc change that made it stale — do not leave the check red.
- Hello-world smoke (optional after gate): `npm run dev` → Rain on → `1 day/s` / `1 week/s` → water pools downhill; inspect water-depth layer. Residual and hashes are Tier-M — report numbers, don’t ask the owner.
- **Succession.** Merge-gated multi-agent pipeline: [docs/CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md). One BUILD_GUIDE slice per cloud run. Track R, Track T, Track V (§4.60–§4.62), Living wave through **L8**, and **C-024**/**C-025** are Done. Sole open animal-life machine slice: **Track A §4.67** Seed disperser fields. Performance follow-on: SIM §6.5 #2. Foxel lane: [docs/animal-design/PROTOCOL.md](docs/animal-design/PROTOCOL.md). If that tip is taken and no owner decision has landed on the remaining backlog (C-026/C-028 taste, or C-029 Lock), write a blocked note naming that backlog and stop; do not start mesopredator/apex-predator/ecosystem-engineer/adaptive-radiation work off your own initiative — those stay gated per [C-027-framing.md](docs/candidates/C-027-framing.md) §4.6/§5. Rebase onto `main`; leave tip accurate for the next merge-triggered agent.
