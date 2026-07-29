---
name: run-gate
description: >-
  Runs Habitat's session green bar via npm run gate (test, build,
  conformance:check, probe --all --check) and reports failures with paths and
  numbers. Use when closing a slice, before a playtest ask, after physics
  changes, or when the user says gate, green bar, or done.
---

# Run gate

## Command

```bash
npm run gate
```

Equivalent to:

```bash
npm test
npm run build
npm run conformance:check
npm run probe -- --all --check
```

## Rules

1. Prefer `npm run gate`. Do not skip probe because "unit tests passed."
2. Report each failure with **file path + assertion/metric + measured number**.
3. Never ask the owner to confirm a number or that a test passes.
4. Unexplained `GOLDEN_*` or `docs/evidence/*.baseline.json` diffs are **defects** — diagnose; do not rewrite the baseline to pass. Intentional refresh: `npm run probe -- <scenario> --write-baseline` with the reason in the commit body.
5. Never document a red gate step as acceptable “env reality.” Fix it.

## Done means

`npm run gate` exits 0. State the outcomes in one short block the commit body can paste.
