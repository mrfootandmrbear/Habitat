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

Gap review: [docs/reviews/2026-07-30-sim-gap-review.md](docs/reviews/2026-07-30-sim-gap-review.md). Joint ladder largely Done; **Done ≠ Lock**.

**Executable tip — Nature P0: NS-008** (tidal inundation → Liebig `f_inundation`; ≠ salinity / spray; no new Process). Then **NS-007** light→Liebig. Cards: [NS-008](docs/nature-study/cards/NS-008-tidal-inundation-hydroperiod.md), [NS-007](docs/nature-study/cards/NS-007-aspect-light-into-liebig.md). **C-006 Locked** (v2.0.11). **C-021** / **C-022** filed. C-020 G1–G5 named — fix in parallel. **C-013** machine Done (owner question batched). **C-010** framing written ([C-010-framing.md](docs/candidates/C-010-framing.md)) — implement later under Open. Taste residual: **C-005** / **C-013** / **C-020** / **C-014** / **U-006** — [owner-lock-batch.md](docs/candidates/owner-lock-batch.md). Keep nutrients / animals / SWE off the tip.

**Owner Lock backlog:** A/B/**C-004** Locked · **W-001** Superseded · remaining C-005 / C-020 / C-014 / U-006.

**Thesis holes (not tip):** C-012 Δx/mosaic (only if place-reading fails) · C-021/C-022 implement under Open · C-010 framing is on tip after C-013 · optional C-020 SWE only if G3 fails.

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
