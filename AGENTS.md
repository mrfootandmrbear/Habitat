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

## Project skills (slash or auto)

| Skill | When |
|---|---|
| `/run-gate` | Closeout / before playtest ask |
| `/author-probe` | New or baseline probe scenarios |
| `/write-playtest` | Tier-O request after ask gate |
| `/promote-candidate` | Criterion met or dossier needed |
| `/study-steal` | Acting on EXTERNAL_REFERENCES |
| `/blocked-note` | §4.0.1 stop conditions |

Always-on rules in `.cursor/rules/` (vision, verify-before-asking, build-plan-on-commit) override when they conflict with convenience.

## Current queue tip

Autonomous closeouts ([BUILD_GUIDE.md](docs/BUILD_GUIDE.md) §4.1): probe baseline + **`deep-time` done** (P-005 Locked) → **slice manifests** next, then Slice **8b** (C-001).

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
