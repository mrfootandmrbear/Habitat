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

**Executable tip — Owner Lock batch:** [docs/candidates/owner-lock-batch.md](docs/candidates/owner-lock-batch.md) (C-009 / C-016…C-019 ready; C-015 + W-001). Remaining taste: [docs/playtests/batch-stewardship-alive.md](docs/playtests/batch-stewardship-alive.md) (C-004 / C-020 / C-014 / U-006). Nature tip paused: NS-005 after Lock session.

**Owner Lock backlog:** ballot A ready · B = W-001 · C = stewardship sitting.

**Thesis holes (not tip):** C-005 branch-and-compare · C-012 Δx/mosaic · season dial (unfiled) · C-010 after C-009 Lock · C-006 CI-promotable when free. Optional C-020 SWE store.

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
