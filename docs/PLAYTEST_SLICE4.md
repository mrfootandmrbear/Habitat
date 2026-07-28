# Playtest — Slice 4

> **Purpose:** Test whether the attention loop is fun *before* writing the extensive build plan.  
> **Build:** Slices 0–4 (hydrology, time rates, flow structure, soil storage, inspector overlays)  
> **Duration:** 20–30 minutes  
> **Register:** D-006, P-003, T-005, H-002, H-003, W-002

---

## Start the prototype

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## Controls

| Control | Action |
|---|---|
| **Rain: on/off** | Toggle rainfall |
| **Reset water** | Clear surface water and soil moisture |
| **Pause / 1× / 4× / 16×** | Wall-clock time rate (simulation step size unchanged) |
| **Inspector dropdown** | Toggle T-005 dev overlays (see below) |

---

## What to look at

### 1. Passive observation (5 min) — P-003, D-006

1. Turn rain **on**, time rate **1×**.
2. Watch water pool in basins and flow downhill without touching anything else.
3. Note: *Does your eye want to follow the water?* *Do you feel curiosity about where it will end up?*

### 2. Time as attention scale (3 min) — S-009, T-002

1. With rain on, switch **4×** then **16×**.
2. Pause and inspect a pool at steady-ish state.
3. Note: *Does fast-forward feel like “skipping work” or “choosing how much attention to spend”?*

### 3. Flow structure overlay (5 min) — Slice 3, H-002, W-002

1. Set inspector to **Inspect: flow accumulation**.
2. Purple/bright channels = where many cells drain. These are emergent stream networks from terrain alone.
3. Switch to **Inspect: watershed**. Each color = cells draining to the same sink.
4. Note: *Can you read where the watershed divides are without being told?*

### 4. Soil memory (5 min) — Slice 4, H-001, H-003

1. Reset water. Rain on at **4×** for ~30 seconds.
2. Turn rain **off**. Keep time running until terrain visibly **darkens** (soil moisture).
3. Toggle inspector **Inspect: soil moisture** to confirm.
4. Rain on again. Note: *Does the second wetting look or feel different from the first?*

### 5. Inspector trust (2 min) — T-005

1. Cycle overlays: terrain → water → accumulation → watershed → soil moisture.
2. Note: *Do the overlays match what you see in the 3D view?* *Would you trust these to form a hypothesis?*

---

## Questions to answer after the session

Write brief notes — these feed MVP_SCOPE and BUILD_GUIDE.

1. **Attention:** What held your eye longest? (water motion, pooling, darkening ground, overlays?)
2. **Expectation:** Did you form a prediction about where water would go? Was it right?
3. **Action desire:** Did you want to *do* something (dig, block, slow, inspect)? What?
4. **Pacing:** Was 1× too slow, 16× too fast, or about right for observation?
5. **Fun verdict:** On a 1–5 scale, how much did you want to keep watching? What would raise it by one point?

---

## What this build deliberately lacks

Not a failure — these are later slices:

- Player interventions (siting, earthworks) — A-005
- Prediction commit-and-compare — P-006 (Slice 7)
- Vegetation, species, scenarios
- Field Notebook sentences — U-006

If the verdict is “not fun yet,” the next spike is likely **prediction + one siting action on water**, not more ecology.

---

## Pass / hold criteria

| Verdict | Meaning | Next step |
|---|---|---|
| **Pass** | Score ≥ 3 and you wanted to intervene or predict | Write MVP_SCOPE + BUILD_GUIDE; continue slice ladder |
| **Hold** | Score 2 — interesting but flat | Fun spike: add P-006 prediction overlay + one berm tool |
| **Fail** | Score 1 — watching water is boring | Revisit camera, art direction (ART-001), or core loop thesis |
