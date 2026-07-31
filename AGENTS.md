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

Reviews: [sim-gap](docs/reviews/2026-07-30-sim-gap-review.md) (physics) · [living-world](docs/reviews/2026-07-31-living-world-review.md) (life) · [time-architecture](docs/reviews/2026-07-31-time-architecture-review.md) (the clock). Joint ladder largely Done; **Done ≠ Lock**.

**Executable tip — the Living wave, in order** ([BUILD_GUIDE §4.36–§4.43](docs/BUILD_GUIDE.md)):

1. **L1** throughput defect — 16× runs at an effective 5.00×, 6600/9600 steps discarded; SIM §6.4 already documents it. *No baseline may move.*
2. **L6** real-world time units — "1×" is presently 54,000× real time and true real time is unreachable. T-002 Locked permits it; no candidate.
3. **L2** local seed rain — established biomass never seeds; 15.6% of the island can never vegetate.
4. **L3** mortality as a rate — biomass 2.500 → 0.500 in one band; no biological hysteresis anywhere.
5. **L7** activity-gated event band — SIM §6.2 specifies it, `stepEvent` ignores it; century 39.9 min → 6.7 min. *Ships only on hash-identity.*
6. **L4** biotic motion — life is static cones; D-007 clip.

None registers a new `Process` (D-007 clip gate does not apply); none needs a new candidate — each implements a Locked entry or a written spec section the code falls short of. **Blocked, owner-judged — implement nothing under them:** **L5** on **C-023**; **L8** deep-time ladder on **C-024** + **C-025**. Do not build a partial deep-time shortcut: skipping bands "a little" breaks T-001 replay, P-006 fairness, and C-005 comparison *without going red*.

**Parallel owner queue:** residual Lock **C-014** when hearable; **C-021**/**C-022** taste sitting. **Slice G shipped** (season + erosion-intensity dials, machine half; [G-composition.md](docs/slices/G-composition.md)). **NS-011 shipped** (N11 / cryptogam crust stage-2). **NS-010 shipped** (N10 / climate-capped woody shrub). **NS-009 shipped** (N9 / salt-marsh engineer). **NS-007 shipped** (N7 / `f_light`). **NS-008 shipped** (N8 / `f_inundation`). **C-006 Locked** (v2.0.11). **C-005 tooling / C-013 / C-002 / U-006 Locked** (v2.0.12). **C-020 Locked** (v2.0.13). **C-021** / **C-022** wired (Force-panel dials + probes) — both **Open**, owner Lock sitting outstanding — [C-021-dossier.md](docs/candidates/C-021-dossier.md) / [C-022-dossier.md](docs/candidates/C-022-dossier.md). **C-010** framing written ([C-010-framing.md](docs/candidates/C-010-framing.md)) — implement later under Open. Taste residual: **C-014** — [owner-lock-batch.md](docs/candidates/owner-lock-batch.md). Keep nutrients / animals / SWE off the tip.

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
- Hello-world smoke (optional after gate): `npm run dev` → Rain on → 4×/16× → water pools downhill; inspect water-depth layer. Residual and hashes are Tier-M — report numbers, don’t ask the owner.
