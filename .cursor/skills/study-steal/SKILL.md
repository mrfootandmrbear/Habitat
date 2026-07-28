---
name: study-steal
description: >-
  Records an EXTERNAL_REFERENCES study pass for Habitat: what was taken,
  rejected, and where it landed, with register/candidate citation. Use when
  studying OpenFloodLab, GWSWEX, RichDEM, snowflow, or any listed reference,
  or when a commit acts on a steal.
---

# Study steal

Authority: [EXTERNAL_REFERENCES.md](../../../docs/EXTERNAL_REFERENCES.md), BUILD_GUIDE §4.0 step 7.

## Policy

Prefer **study clones and offline oracles** over vendoring. Integrating third-party simulation packages fights **T-001** (determinism), **T-004** (data-driven content), **T-006** (sim/render separation), and single-writer field ownership.

## Same-commit study log row

Update the Study log table in EXTERNAL_REFERENCES.md:

| Column | Content |
|---|---|
| Reference | Name as listed |
| Studied | What you actually opened/ran (honest — "no record" is valid) |
| What was taken | Concrete pattern or algorithm idea |
| What was rejected | Explicit bans (e.g. ship Richards solver, WebGPU as authority) |
| Landed in | File path or register **C-00x** / Locked ID — or "Nothing" |

## Rules

1. Every steal cites a Locked/Current ID or Open candidate (**C-001**…).
2. Do not invent Locked policy from an Open candidate — implement under it as hypothesis only.
3. If inventing new product policy, file a candidate first; do not smuggle it in via a study note.
4. Standing honesty: do not claim an oracle you did not run (see RichDEM correction).

## Output

Short note in the commit body: `steal: <ref> → <artifact> (C-00x); rejected <X>`.
