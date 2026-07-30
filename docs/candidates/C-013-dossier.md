# C-013 — Undo as an affordance of abundant sculpting

**Status:** Open (owner-judged half outstanding)  
**Criterion (verbatim).** Repeated sculpt-and-undo leaves the world **bit-identical** to never having sculpted (T-001 hash equality), undo is available without confirmation or cost, and **elapsed simulation time is not undoable** — after time advances, the only route back is restoring an explicit branch point (**C-005**), never a rewind of history.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Sculpt then undo restores pre-edit terrain | elev match to 1e-5 | `src/sim/sessionPersist.test.ts` |
| Repeated berm+dig then double-undo ≡ never sculpted | `stateHash` equal | same (C-013 hash case) |
| After `stepEvent` + `noteTimeAdvanced`, undo is unavailable | `canUndo = false`, `undo() = false` | same |
| Undo control has no confirm / cost gate | `Undo edit` button only | `src/ui/controls.ts` |
| Restore machinery shared with save/load (P-005) | `captureWorld` / `restoreWorld` hash round-trip | `sessionPersist.ts` + test |

**Gap vs full criterion wording.** Explicit **branch-and-compare** UI (**C-005**) is not built; after time advances, the practical route back is **Save / Load** (same snapshot restore). That satisfies “not a rewind of history” (S-007) but leaves C-005’s compare instrument for a later slice.

## Owner-only question

After you ran time and the undo button went away, did that feel fair — or like the game punished you for looking?

(Not a playtest request by itself; joins the Slice 8c Tier-O batch when that session fires.)
