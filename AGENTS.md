# Habitat — Agent instructions

Habitat is a living sand castle: sculpt substrates, set forces, run time, watch nature and life take what you built. Thesis: [docs/THESIS.md](docs/THESIS.md). Decisions: [docs/DECISION_REGISTER.md](docs/DECISION_REGISTER.md). Execution: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what: [docs/VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md). Gated cloud succession (one slice per agent, merge starts the next): [docs/CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md).

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

**Executable tip now:** Track R's **§4.48** habitat/dispersal determinism hygiene and **§4.40 L5** guild competition are both shipped (**C-023 Locked** — shrub shades herb via the existing Beer-Lambert term; `succession-displace` probe shows herb peaking 1.69 then declining to 0.98 under competition vs 2.08 monotonic without). Track V (new, 2026-08-03) covers plant rendering ([plant rendering review](docs/reviews/2026-08-03-plant-rendering-review.md)); its **§4.60** per-guild silhouette geometry is **already shipped** — `OccupantMesh.buildGeometry` dispatches distinct strand/binder/marsh/shrub/crust/herb shapes — so the Track V tip is **§4.61** clustering, with **§4.62** composite runner-up guild behind it and **§4.63** distance LOD deferred until those are shipped and profiled. Track T (terrain tools) is parked: **§4.59** duplicator stamp shipped, completing the C-028 structural "keep" kit ([duplicator-stamp-composition.md](docs/slices/duplicator-stamp-composition.md)); no further machine slice, only owner taste. **§4.57** molds shipped; **§4.47** guild cover & light-competition correctness shipped ([guild-cover-light-composition.md](docs/slices/guild-cover-light-composition.md)). **§4.58** Simple/Full chrome shipped; **§4.46** HSI curves shipped. Living-wave remainder: **L8** still blocked on **C-024** + **C-025**.

**Executable tip now: none.** Track R, Track T, the nine-slice defect queue, and the Living wave (through L5) are all Done. What's left is either owner-judged taste sitting on already-shipped machine halves (**C-014**, **C-021**, **C-022**, **C-026**, **C-028**), owner-judged Open candidates blocking the one remaining Living-wave item (**L8** on **C-024** + **C-025**), or explicitly off-tip (animal work — see below). A fresh agent landing here without a new owner decision has no queue item to execute; the honest next action is `docs/blocked/<date>-next-tip.md` naming the owner-judged backlog below, not inventing a slice.

**Parallel owner queue:** residual Lock **C-014** (hearable after W0); **C-021**/**C-022** taste sitting. **Slice G shipped** (season + erosion-intensity dials, machine half; [G-composition.md](docs/slices/G-composition.md)). **NS-011 shipped** (N11 / cryptogam crust stage-2). **NS-010 shipped** (N10 / climate-capped woody shrub). **NS-009 shipped** (N9 / salt-marsh engineer). **NS-007 shipped** (N7 / `f_light`). **NS-008 shipped** (N8 / `f_inundation`). **C-006 Locked** (v2.0.11). **C-005 tooling / C-013 / C-002 / U-006 Locked** (v2.0.12). **C-020 Locked** (v2.0.13). **C-021** / **C-022** wired (Force-panel dials + probes) — both **Open**, owner Lock sitting outstanding — [C-021-dossier.md](docs/candidates/C-021-dossier.md) / [C-022-dossier.md](docs/candidates/C-022-dossier.md). **C-023 Locked** (2026-08-03 — see Living wave above). **C-010** framing written ([C-010-framing.md](docs/candidates/C-010-framing.md)) — implement later under Open. **C-028** framing written ([C-028-framing.md](docs/candidates/C-028-framing.md)) — sand-castle toolbox vocabulary; structural tools under C-006; wet-sand / freeze / figurines banned; §4.55 shipped. **C-027** framing written ([C-027-framing.md](docs/candidates/C-027-framing.md)) — animal trait expression as population fields; gated behind **F-001** undeferring (still Deferred — a pure owner register act, not triggered by anything landing) — not tip. **C-024**/**C-025** framing written ([C-024-C-025-framing.md](docs/candidates/C-024-C-025-framing.md)) — discrete skip-duration menu; L8 stays blocked until owner sits both. Taste residual: **C-014** — [owner-lock-batch.md](docs/candidates/owner-lock-batch.md). Keep nutrients / animals / SWE / wet-sand / freeze off the tip.

**Owner Lock backlog:** A/B/**C-004** / **C-005 tooling** / **C-013** / **C-002** / **U-006** / **C-020** / **C-023** Locked · **W-001** Superseded · remaining **C-014**, **C-021**, **C-022** (Slice G machine half done, taste sitting outstanding) · still Open, owner-judged, nothing more for an agent to build under them: **C-024** (what a sim-year means — annual 10× fast, decadal 360× fast vs SIM §6.1), **C-025** (rate-selected integration floor — the S-009 / T-002 trade that makes centuries reachable), **C-026** (CVD-safe palette), **C-028** (sculpt toolbox taste — molds/chrome; structural already shipping under C-006).

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
- **Succession.** Merge-gated multi-agent pipeline: [docs/CLOUD_AGENT_PIPELINE.md](docs/CLOUD_AGENT_PIPELINE.md). One BUILD_GUIDE slice per cloud run. Track R, Track T, the nine-slice defect queue, and the Living wave are Done as of 2026-08-03 (§4.48 + C-023 Locked + L5). The one executable machine slice left is **Track V §4.61** clustering (§4.60 per-guild silhouettes already shipped); claim that or nothing. If Track V is taken and no owner decision has landed on the backlog in "Current queue tip" above (C-024/C-025/C-026/C-028 taste, or F-001 undeferring for animal work), write a blocked note naming that backlog and stop; do not start animal/nutrient/SWE work off your own initiative. Rebase onto `main`; leave tip accurate for the next merge-triggered agent.
