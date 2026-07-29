---
name: run-gate
description: >-
  Runs Habitat's session green bar (test, build, conformance:check, probe
  --all --check) and reports failures with paths and numbers. Use when
  closing a slice, before a playtest ask, after physics changes, or when the
  user says gate, green bar, or done.
---

# Run gate

## Commands (in order)

```bash
npm test
npm run build
npm run conformance:check
npm run probe -- --all --check
```

When `npm run gate` exists, prefer that single alias (BUILD_GUIDE §4.1).

## Rules

1. Run all four. Do not skip probe because "unit tests passed."
2. Report each failure with **file path + assertion/metric + measured number**.
3. Never ask the owner to confirm a number or that a test passes.
4. If probe `--all --check` is not implemented yet (BUILD_GUIDE §4.1 first item), run the three named probes (`paired-storm`, `berm-reroute`, `basin-fill`), note the `--all --check` gap, and still require test/build/conformance green. Do not fake a passing probe check.
5. Unexplained `GOLDEN_*` or `docs/evidence/*.baseline.json` diffs are **defects** — diagnose; do not rewrite the baseline to pass.
6. Never document a red `build` or `conformance:check` as acceptable “env reality.” Fix `@types/node` / regenerate ledger (`npm run conformance`) instead.

## Done means

All runnable gate steps exit 0. State the outcomes in one short block the commit body can paste.
