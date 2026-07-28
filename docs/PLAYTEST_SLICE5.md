# Slice 5 playtest — Soil → vegetation

**Goal.** Rain wet ground; green cover follows moisture. No inspector required to see it.

## Loop

1. `npm run dev` → http://127.0.0.1:5173/
2. **Rain: on** for ~30–60s (or bump to 4× / 16×).
3. Watch terrain: wet basins should green up; dry ridges stay browner.
4. Optional: **Inspect: vegetation cover** for a clearer map; soil moisture still darkens too.
5. Optional: dig a berm, rain again — wetness (and later green) should shift.

## Pass / Hold

| Verdict | When |
|---------|------|
| **Pass** | You can see green following wet without hunting the inspector |
| **Hold** | Growth too slow/invisible — retune rates before Slice 6 |

Notebook seed: “Plants established where the ground stayed wet.”

**Note.** Vegetation does **not** change runoff yet (that’s Slice 6).
