# Slice 5a playtest — Predict wet cells (P-006)

**Goal.** Commit where you expect water, advance time, see hit / miss / unexpected. Score attention, not accuracy.

## Loop

1. `npm run dev` → http://127.0.0.1:5173/
2. **Tool: predict wet** — click cells you think will hold water (teal marks).
3. **Commit prediction** — locks marks.
4. **Rain: on**, wait (~3s at 1×; auto-compares after `predictionHorizonSteps`).
5. Or hit **Compare** early.
6. Read colors: **green** hit · **red** miss · **amber** wet but unmarked · teal = pending.

## Pass / Hold

| Verdict | When |
|---------|------|
| **Pass** | You formed at least one prediction and cared about the overlay | Continue to Slice 5 vegetation |
| **Hold** | Mechanic unclear or ignored — tune UX before vegetation | Revisit marks / compare timing |

Notebook seed: “You expected water here; it went there because of the slope.”
