# Playtest — Presentation track (§4.2)

**When.** After Tier-P proxies are green (`npm test` includes `presentation.proxy.test.ts`).  
**Already proven (agent):** extent cage spans `worldSize`; siting cursor snaps with `worldToGrid`; flow cues draw on wet directed cells; soil encoding delta > 0.15 wet vs dry; cutaway names soil/water/veg; conservation line on HUD; paired-storm bare downslope > vegetated.

## Owner-only question (one sentence)

Does the yellow cell cursor (with the preserve cage) make berm/dig/predict feel like placing a **cause** on the lattice, rather than painting an outcome?

| Verdict | Meaning |
|---|---|
| **Pass** | Feels like siting a cause on a cell |
| **Hold** | Unsure / needs stronger cue |
| **Fail** | Still reads as painting / freeform scribble |

**Do not** ask whether flow arrows “exist” or whether mass balances — those are Tier M/P.

## Session (≈5 min)

1. `npm run dev` — note the green wireframe cage around the preserve.
2. Tool: raise berm — move pointer; yellow cell should snap. Place 2–3 berms.
3. Rain on; watch cyan flow cues on wet cells.
4. Hover with a tool — cutaway strip shows soil / water / veg at the cell.
5. Answer the question above only.
