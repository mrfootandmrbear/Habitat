# Island forces — disposition inventory (Slice F)

> **Status:** Working draft · Slice F  
> **Role:** Classify natural forcings that shape an island preserve against Habitat’s intuition and targeting rules  
> **Authority:** Advisory. Does not Lock policy. Cites Open candidates **C-004**, **C-015**…**C-020**. Binding math: [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md). Panel contract: [FORCE_PANEL.md](FORCE_PANEL.md).

**Dispositions.** Dial = player sets a global regime (no cell args). Derived = geography / existing state decides where the dial bites. Inherited = already shipped terrestrial process. Deferred = later slice or unfiled. Ban = must not become WorldState authority.

| Forcing | Disposition | Notes |
|---|---|---|
| Mean rainfall / climate intensity | **Dial** (shipped; Slice F reframes) | Stepped average precip the preserve lives under — not a storm on/off switch (**C-004**, owner 2026-07-30 clarification). Labels: arid → wet. |
| Wind vector | **Dial** (Slice F) | Global direction/strength; modulates *where* mean rain lands via orography — never paints cells. |
| Orographic precip | **Derived** (Slice F lite) | `P = P₀(1 + γ·u·∇z)` ([NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md) §4). Windward wet / leeward dry under one climate mean. |
| Sea level | **Dial** (Slice 16) | Global base level; ocean outlet (**C-015**). |
| Tidal envelope (MHW/MLW) | **Dial** (shipped; Slice 17) | Envelope, not phase-every-step (**C-016**). Intertidal = MLW ≤ elev < MHW. |
| Wave exposure / fetch | **Derived** then dial wind (shipped; Slice 18) | Exposure from fetch × wind; shoreline change via geomorphology only (**C-017**). |
| Longshore / beaches | **Derived** deposit (shipped; Slice 19) | `shore.longshore` tendency + lee deposit budget inside geomorphology (**C-017**). |
| Salinity / salt spray | **Deferred** (20) | First everyday **C-010** instance (**C-018**). |
| Overseas seed pressure | **Derived** (shipped; Slice 21) | Shore-biased overseas kernel × \(S_{\text{elig}}=f(A,d)\) on island worlds (**C-019**). Mainland perimeter rain retained when seaLevel absent. |
| Clouds → rain/snow/sleet | **Deferred** (full **C-020**) | Slice F lite is orographic mean only; phase + visible clouds later. |
| Season / climate regime (beyond precip mean) | **Deferred** | Unfiled beyond candidates; mean rainfall is the precip half. |
| Storm surge | **Deferred** | Unfiled gap — do not invent a C-id here. |
| Freshwater lens | **Deferred** | GW × salt; needs C-018 path. |
| Runoff, infil, GW, ET, erosion, fire, aspect/light | **Inherited** | Terrestrial ladder already shipped. |
| Coastal SWE as authority | **Ban** | EXTERNAL_REFERENCES; T-006 / GEO-002. |
| Cell-targeted rain / smiting | **Ban** | THESIS §9 / **C-004**. |
| Stochastic free weather while **C-003** Open | **Ban** | Seeded / authored climate layer only. |

**Owner gaps (not filed this slice).** Storm surge; season beyond precip mean; freshwater lens. Recommend file or reject in a later session — do not invent Locked policy from this table.
