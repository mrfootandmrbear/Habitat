---
name: author-probe
description: >-
  Authors or extends a headless Habitat probe scenario with baseline contract,
  tolerances, and evidence output per VERIFICATION_POLICY §8. Use when adding
  a probe, wiring baseline JSON, implementing probe --all --check, or naming
  Tier-M scenario evidence.
---

# Author probe

Authority: [VERIFICATION_POLICY.md](../../../docs/VERIFICATION_POLICY.md) §8, [BUILD_GUIDE.md](../../../docs/BUILD_GUIDE.md) §4.1.

## Contract

| Artifact | Role |
|---|---|
| `src/sim/probes/scenarios.ts` | Named scenario; fixed seed + schedule; flat scalar record |
| `docs/evidence/<scenario>.baseline.json` | Committed scalars + per-metric tolerance (chosen with the scenario, not fitted post-hoc) |
| `docs/evidence/<scenario>.md` | Rewritten each run as **this run vs baseline, with deltas** |
| `npm run probe -- <scenario>` | Runs one scenario; writes the md |
| `npm run probe -- --all --check` | Every scenario; writes nothing; non-zero on out-of-tolerance |

## Steps

1. Name the scenario (`kebab-case`). Cite the register/candidate ID it guards.
2. Implement in `scenarios.ts` — real `WorldState`, no renderer (T-006).
3. Emit named scalars only (peak Σw, residual, step ms, paired deltas, …).
4. Commit `docs/evidence/<scenario>.baseline.json` with tolerances; state the numbers in the commit body.
5. Wire `--all --check` if missing. Prove: unperturbed run passes; deliberate constant perturbation fails.
6. Update BUILD_GUIDE / slice manifest probe list.

## Bans

- Do not vendor third-party sim packages (T-001, T-006, T-007).
- Do not treat an unexplained baseline move as an update — diagnose first (§4.0.1).
- No Tier-O. Probes are machine evidence.
