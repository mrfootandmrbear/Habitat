# Slice 6 playtest — Cover blunts the storm

**Goal.** Vegetation changes runoff: green slopes should hold more water in soil and move surface water more slowly.

## Loop

1. `npm run dev` → http://127.0.0.1:5173/
2. **Rain: on** at **4×** until basins green (Slice 5).
3. Note status `Σw` (surface water sum) and `infil` while raining.
4. **Reset water** (cover stays), rain the same way again — vegetated land should soak more / peak less harshly than a fresh bare run (reload page for bare).
5. Optional A/B: reload for bare mountain, rain without waiting for green; compare `Σw` / `infil` feel.

## Pass / Hold

| Verdict | When |
|---------|------|
| **Pass** | Cover clearly changes the storm (soak / slower sheet) | **Recorded** — vegetation grows then retains more water |
| **Hold** | Difference too subtle — retune roughness / infil bonus | — |

Notebook seed: “Cover slowed the runoff on this slope.”

This is the **sim MVP milestone** (veg → water). Sandbox still has no win condition (G-001).
