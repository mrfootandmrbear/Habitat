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
4. If probe `--all --check` is not implemented yet (BUILD_GUIDE §4.1 first item), run `npm run probe -- --list`, note the gap, and still run the other three. Do not fake a green probe check.
5. Unexplained `GOLDEN_*` or `docs/evidence/*.baseline.json` diffs are **defects** — diagnose; do not rewrite the baseline to pass.

## Done means

All runnable gate steps exit 0. State the outcomes in one short block the commit body can paste.
