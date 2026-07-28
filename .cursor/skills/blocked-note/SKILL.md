---
name: blocked-note
description: >-
  Writes a Habitat blocked-session note per BUILD_GUIDE §4.0.1 and moves to
  the next queue item. Use when a Tier-P proxy stays red after 3 retunes,
  policy is missing, an unexplained baseline moves, or an owner-judged
  candidate blocks the slice. Never idle; never invent policy.
---

# Blocked note

Authority: [BUILD_GUIDE.md](../../../docs/BUILD_GUIDE.md) §4.0.1.

## When to stop

| Situation | Action |
|---|---|
| Tier-P proxy red after **3** retunes | Note + add question to Tier-O batch + next queue item |
| Choice needs policy no Locked/candidate covers | File **C-00x** (five-part contract), Open, implement nothing under it |
| `conformance:check` fails on uncitable ID | Fix citation or file candidate — never delete the check |
| Golden hash / baseline moves **unintentionally** | Defect — diagnose before re-commit |
| Owner-judged candidate blocks (e.g. C-003) | Dossier, park slice, next queue item |

## File

Create `docs/blocked/<YYYY-MM-DD>-<slice>.md`:

```markdown
# Blocked — <slice>

**Date:** <ISO date>
**Stop condition:** <which §4.0.1 row>
**Tried:** <encodings / probes / retune count>
**Measured gap:** <numbers — what failed and by how much>
**Not doing:** <policy we refuse to invent>
**Next queue item:** <exact BUILD_GUIDE §4.x item>

## Artifacts
- <paths to probes, proxies, dossiers>
```

## After writing

1. Commit the note like any other artifact; name the next queue item in the body.
2. **Start** the next queue item in the same session. An idle session is not acceptable.
3. Do not reopen the blocked slice until the stop condition changes.
