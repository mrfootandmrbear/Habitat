---
name: promote-candidate
description: >-
  Promotes an Open Habitat register candidate when its DECISION_CONFORMANCE
  Judge is CI/agent only, or writes an owner dossier when Judge includes the
  owner. Use when a criterion is met, closing Slice 8b/C-001, or filing
  docs/candidates/*-dossier.md.
---

# Promote candidate

Authority: [DECISION_CONFORMANCE.md](../../../docs/DECISION_CONFORMANCE.md) §3.0.

## Branch on Judge

| Judge field | Action |
|---|---|
| CI / agent probes / automated test **only** | **Agent promotes** in the same commit as evidence |
| Owner, unfamiliar viewer, or mixed with CI | **Write dossier only** — do not flip status |

## Agent promotion checklist

1. Confirm the entry already has a criterion in DECISION_CONFORMANCE §3. Do **not** author a new criterion and promote against it in the same session.
2. Meet the criterion fully. Partial → blocked note, leave Open. Never weaken the criterion.
3. In one commit with the evidence:
   - Flip register status (Open → Locked/Current as the entry specifies)
   - Strike the entry from register §16 if listed
   - Add version-history line
   - Run `npm run conformance` (regenerate) and ensure `conformance:check` passes
4. Commit body states the **measured numbers**.

## Owner-judged → dossier

Write `docs/candidates/<id>-dossier.md`:

- Criterion verbatim
- Machine half discharged with numbers + artifact paths
- Owner-only question in **one sentence, no numbers**
- Not a playtest request; does not fire the Tier-O batch by itself

Implement nothing under an owner-judged Open candidate that blocks the slice (§4.0.1) — park, take next queue item.
