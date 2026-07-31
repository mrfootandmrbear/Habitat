# C-013 — Undo as an affordance of abundant sculpting

**Status:** Locked 2026-07-31 — fair (not punishment)  
**Criterion (verbatim).** Repeated sculpt-and-undo leaves the world **bit-identical** to never having sculpted (T-001 hash equality), undo is available without confirmation or cost, and **elapsed simulation time is not undoable** — after time advances, the only route back is restoring an explicit branch point (**C-005** tooling), never a rewind of history.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Sculpt then undo restores pre-edit terrain | elev match to 1e-5 | `src/sim/sessionPersist.test.ts` |
| Repeated berm+dig then double-undo ≡ never sculpted | `stateHash` equal | same (C-013 hash case) |
| After `stepEvent` + `noteTimeAdvanced`, undo is unavailable | `canUndo = false`, `undo() = false` | same |
| Undo control has no confirm / cost gate | `Undo edit` button only | `src/ui/controls.ts` |
| Restore machinery shared with save/load (P-005) | `captureWorld` / `restoreWorld` hash round-trip | `sessionPersist.ts` + test |

**Gap vs full criterion wording.** Explicit **branch-and-compare** scaffold (**C-005**) now exists (`Branch` / Show A·B / Compare branches); after time advances, the route back is still an explicit restore (branch or Save/Load), never a rewind of history (S-007). C-005 Lock remains owner-judged — see [C-005-dossier.md](C-005-dossier.md). **C-006** Locked 2026-07-31 — undo is now the take-back half of abundant sculpting.

## Owner-only question

After you ran time and the undo button went away, did that feel fair — or like the game punished you for looking?

**Owner 2026-07-31:** **Fair** → **Lock**. Register v2.0.12.
