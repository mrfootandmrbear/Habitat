# Habitat — Agent instructions

Habitat is a living sand castle: sculpt substrates, set forces, run time, watch nature and life take what you built. Thesis: [docs/THESIS.md](docs/THESIS.md). Decisions: [docs/DECISION_REGISTER.md](docs/DECISION_REGISTER.md). Execution: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md). Who verifies what: [docs/VERIFICATION_POLICY.md](docs/VERIFICATION_POLICY.md).

## Green bar (session gate)

```bash
npm test
npm run build
npm run conformance:check
npm run probe -- --all --check
```

When `npm run gate` exists, use that. Until probe `--all --check` lands (BUILD_GUIDE §4.1), run the first three and treat missing probe-check as a known gap — never invent a passing baseline.

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

Autonomous closeouts ([BUILD_GUIDE.md](docs/BUILD_GUIDE.md) §4.1): **probe baseline harness first**, then `deep-time`, then Slice **8b** (C-001).

## Cursor Cloud specific instructions

- Install: `npm install` (see `.cursor/environment.json`). No secrets required for the green bar.
- Prefer **headless** verification (tests + probes). Do not start `npm run dev` unless the task is Tier-P visual encoding or a playtest file that names exact on-screen controls.
- Computer use / browser: only for presentation/encoding checks after a proxy metric exists — never to "see if the pond looks right" as a substitute for Tier-M.
- Long jobs (`deep-time`, full probe suite): run to completion; paste measured scalars into the commit body / evidence md.
- Open PRs with gate results summarized; never silently refresh baselines.
- Green-bar reality on a clean `npm install` (verified): `npm test` passes (79); individual probes (`paired-storm`, `berm-reroute`, `basin-fill`) pass. `npm run build` (`tsc`) currently **fails** because `@types/node` is not declared as a devDependency while node-importing tests/scripts (`node:fs`, `process`, `import.meta.dirname`) are typechecked — a repo defect, not an env-setup gap. `npm run dev` (Vite/esbuild, no typecheck) runs fine and is the way to run/see the app.
- `npm run conformance:check` may exit non-zero with "ledger is out of date" when cited docs changed without regenerating; fix by `npm run conformance` in a docs-scoped commit (never as part of env setup). `probe -- --all --check` is still unimplemented (see queue tip); run the named probes individually.
