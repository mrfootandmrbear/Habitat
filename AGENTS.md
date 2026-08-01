# Habitat — Agent instructions

Habitat is a living sand castle: sculpt substrates, set forces, run time, watch nature and life take what you built. Thesis: [docs/THESIS.md](docs/THESIS.md). Decisions: [docs/DECISION_REGISTER.md](docs/DECISION_REGISTER.md). Execution: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what: [docs/VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md).

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

Reviews: [sim-gap](docs/reviews/2026-07-30-sim-gap-review.md) (physics) · [living-world](docs/reviews/2026-07-31-living-world-review.md) (life) · [time-architecture](docs/reviews/2026-07-31-time-architecture-review.md) (the clock) · [fire/fuel](docs/reviews/2026-07-31-fire-fuel-review.md) · [vegetation/habitat](docs/reviews/2026-07-31-vegetation-habitat-review.md) (extends living-world) · [hydrology/geomorphology](docs/reviews/2026-07-31-hydrology-geomorphology-review.md) · [UI encoding](docs/reviews/2026-07-31-ui-encoding-review.md). Joint ladder largely Done; **Done ≠ Lock**.

**Second queue, parallel to the Living wave below** — nine defect-fix slices from the four newest reviews, [BUILD_GUIDE §4.44–§4.52](docs/BUILD_GUIDE.md), plus **C-026** (CVD-safe palette, Open, owner-judged). None registers a new `Process`; none but C-026 needs a candidate. **§4.49 drainage flat-routing correctness shipped** ([flat-routing-composition.md](docs/slices/flat-routing-composition.md)) — the flat resolver's index tie-break provably 2-cycled on every filled lake's rim, corrupting `aNorm` and everything downstream (hillslope erosion, groundwater channel boost); fixed by routing flats toward their pour point via BFS distance instead of by cell index, not by adding the epsilon the review's own leading suggestion proposed. `aNorm`-downstream baselines refreshed (berm-reroute, hillslope-deposit, erosion-intensity, baseflow-persist, deep-time, disturbance-recovery, orographic-wind). **§4.50 surface-flux stability guard shipped** ([flux-stability-composition.md](docs/slices/flux-stability-composition.md)) — per-face flux capped at the exact one-step equalization bound (`diff · 0.5`); roughness floored at `Math.fround(baseRoughness)`, not the raw constant, after the naive version moved the T-001 golden hash by rounding every bare-ground cell (`surface.roughness` is `Float32Array`-backed). Shipped fix traced inert against every parameter the game exercises today — no baseline moved. **§4.51 coastal base-level & substrate coupling shipped** ([coastal-base-level-composition.md](docs/slices/coastal-base-level-composition.md)) — ocean-neighbor stage in `fluxStep` now reads `seaLevel`, not bed elevation (the ocean's water column doesn't belong in a land cell's head difference); a non-outlet rim cell is now excluded from hillslope erosion, since Priority-Flood's whole-perimeter-open fill seeding (load-bearing for nested-basin resolution, left unchanged) disagreed with `fluxStep`'s narrower "only named outlets drain" dynamics; coastal erosion now reads `substrateProps(mat).erosionK` as a **ratio against loam**, not a direct substitution — a literal substitution would have collapsed coastal erosion to ~1/27th its calibrated magnitude on the default substrate, since `substrates.ts`'s table was calibrated for hillslope erosion's units, not coastal's. Nine `aNorm`-downstream baselines refreshed (deep-time, baseflow-persist, disturbance-recovery, hillslope-deposit, erosion-intensity, substrate-contrast, substrate-deposit, island-drainage, orographic-wind) — same family §4.49 moved, now reacting to the sealed-rim and ocean-stage corrections. **§4.52 encoding delta correctness shipped** ([encoding-delta-composition.md](docs/slices/encoding-delta-composition.md)) — occupant/light color ramps no longer saturate before the top of their domain (dropped the overshoot multipliers rather than reshaping the curve); every delta floor switched from raw RGB Euclidean distance to a shared luminance-weighted metric ([colorDistance.ts](src/ui/colorDistance.ts), scaled so grey deltas keep their old magnitude — only cross-channel balance moves); the binder/intertidal cross-file color collision (~0.07 unit-RGB apart) fixed with a minimal color change and a new cross-file check, not the full C-026 redesign; `terrainEncoding.ts`'s scar/intertidal/salt overlay compositing made proportional instead of sequential, in both the CPU path and the GLSL shader it must stay in sync with, so a late tint can no longer wash an earlier categorical state down to near-nothing; `substrateEncodingDelta` now checks all substrate pairs at each one's own porosity; `timeRates.ts`'s "fastest sustains" label now derives from `sustainableRates()`. Two Tier-P floors and one probe baseline (`tidal-envelope`) moved for documented reasons — re-measured and lowered with a note, not re-litigated. This closes the second queue's priority-flagged item; **§4.44 fire spread as a rate** is next in that queue's own numeric order, but sequencing it against the Living wave below is still not owner-set.

**Executable tip — the Living wave, in order** ([BUILD_GUIDE §4.36–§4.43](docs/BUILD_GUIDE.md)):

1. ~~**L1** throughput defect~~ + ~~**L6** real-world time units~~ — **shipped together** ([L1-L6-composition.md](docs/slices/L1-L6-composition.md), [time-throughput.md](docs/evidence/time-throughput.md)). Surplus steps are now deferred, not discarded; `maxStepsPerFrame` 5 → 16 (measured 0.918 ms/step worst case). The control speaks in sim-time per wall-second — Pause · `1 s/s` · `1 min/s` · `1 h/s` · `1 day/s` · `1 week/s`, default `1 day/s` — every offered rate measured at **100.0% delivery, zero dropped**. `1 month/s` is withheld, not offered-and-discarded. No baseline moved.
2. **L2** local seed rain — established biomass never seeds; 15.6% of the island can never vegetate.
3. **L3** mortality as a rate — biomass 2.500 → 0.500 in one band; no biological hysteresis anywhere.
4. **L7** activity-gated event band — SIM §6.2 specifies it, `stepEvent` ignores it; century 39.9 min → 6.7 min. *Ships only on hash-identity.*
5. **L4** biotic motion — life is static cones; D-007 clip.

None registers a new `Process` (D-007 clip gate does not apply); none needs a new candidate — each implements a Locked entry or a written spec section the code falls short of. **Blocked, owner-judged — implement nothing under them:** **L5** on **C-023**; **L8** deep-time ladder on **C-024** + **C-025**. Do not build a partial deep-time shortcut: skipping bands "a little" breaks T-001 replay, P-006 fairness, and C-005 comparison *without going red*.

**Parallel owner queue:** residual Lock **C-014** when hearable; **C-021**/**C-022** taste sitting. **Slice G shipped** (season + erosion-intensity dials, machine half; [G-composition.md](docs/slices/G-composition.md)). **NS-011 shipped** (N11 / cryptogam crust stage-2). **NS-010 shipped** (N10 / climate-capped woody shrub). **NS-009 shipped** (N9 / salt-marsh engineer). **NS-007 shipped** (N7 / `f_light`). **NS-008 shipped** (N8 / `f_inundation`). **C-006 Locked** (v2.0.11). **C-005 tooling / C-013 / C-002 / U-006 Locked** (v2.0.12). **C-020 Locked** (v2.0.13). **C-021** / **C-022** wired (Force-panel dials + probes) — both **Open**, owner Lock sitting outstanding — [C-021-dossier.md](docs/candidates/C-021-dossier.md) / [C-022-dossier.md](docs/candidates/C-022-dossier.md). **C-010** framing written ([C-010-framing.md](docs/candidates/C-010-framing.md)) — implement later under Open. **C-027** framing written ([C-027-framing.md](docs/candidates/C-027-framing.md)) — animal trait expression as population fields, procedural morph + threshold swap, herbivore worked example; gated behind F-001 undeferring and L2–L5, not tip. **C-024**/**C-025** framing written ([C-024-C-025-framing.md](docs/candidates/C-024-C-025-framing.md)) — discrete skip-duration menu (1 day … 1000 years), each bound to a floor, separate control surface from the L6 rate ladder; L8 stays blocked until owner sits both. Taste residual: **C-014** — [owner-lock-batch.md](docs/candidates/owner-lock-batch.md). Keep nutrients / animals / SWE off the tip.

**Owner Lock backlog:** A/B/**C-004** / **C-005 tooling** / **C-013** / **C-002** / **U-006** / **C-020** Locked · **W-001** Superseded · remaining **C-014**, **C-021**, **C-022** (Slice G machine half done, taste sitting outstanding) · newly filed Open, nothing to judge yet: **C-023** (guild competition — gated behind L2/L3), **C-024** (what a sim-year means — annual 10× fast, decadal 360× fast vs SIM §6.1), **C-025** (rate-selected integration floor — the S-009 / T-002 trade that makes centuries reachable).

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
