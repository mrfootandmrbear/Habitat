# Force panel — contract (Slice F)

> **Status:** Working draft · Slice F  
> **Role:** UI and API contract for global force dials on the island sandbox  
> **Authority:** Subordinate to [DECISION_REGISTER.md](DECISION_REGISTER.md) **C-004** / **C-015** / **C-020** (Open). Inventory: [ISLAND_FORCES.md](ISLAND_FORCES.md).

## Feel contract

Primary information is **watching the world develop** — not overlays, charts, precip meters, or inspector confirmation. Ownership is (1) shaping the island and (2) setting forces, then looking. The Force panel is a **control strip**, not a dashboard. Wet/dry sides and climate consequences must read in terrain darkening, water, and vegetation (Tier-P proxies measure that encoding). Do not invent an orographic inspector layer.

## Regime vs siting

| Axis | Player verb | Must never |
|---|---|---|
| **Force panel** | Set which forces act and how hard (whole preserve) | Target a cell, paint a storm, drag weather onto a hill; become a readout dashboard |
| **Siting tools** | Geological setup (berm / dig / **deposit** sand·clay·rock) / mark prediction / authored ignition | Become the rainfall or sea-level control; paint ecosystems (N-001) |

Geography decides *where* a regime bites. The player sets the mean; the island decides the pattern. Proof is in the place, not in the panel. **Deposit** is geological setup (C-009) — raises ground and stamps substrate — not a force dial.

## Live dials (Slice F)

| Control | IDs | Semantics |
|---|---|---|
| **Rainfall** | arid / light / moderate / wet | **Climate archetype** — real-scale annual means (~150 / 550 / 1000 / 2200 mm/yr) plus spell cadence (C-020). Arid = rare desert storms; light/moderate = rain events; wet = monsoon block. Not the old cartoon rates that flooded the island. Orography places precip; no cell targeting. |
| **Heat** | warm / mild / cold | Air temperature → precip phase rain / sleet / snow (**C-020**); also Liebig `f_temp` for herb arrival (**C-004** / NS-002). |
| **Sea** | off / low / mid / high | Global sea datum (**C-015**). |
| **Tide** | off / neap / mean / spring | MHW/MLW envelope half-range around sea (**C-016**). No per-event phase. |
| **Wind** | calm / from west / east / south / north | Global wind vector; orographic mean rain (**C-020**) and shore exposure (**C-017**). |
| **Season** | short / typical / long | Phenology-pressure multiplier on the seasonal establishment tick (**C-021**, Slice G) — day-length / growing-season referent, distinct from Heat's temperature gate. `typical` = 1 is neutral. Machine half only; owner Lock sitting outstanding. |
| **Erosion intensity** | calm / moderate / stormy | Storminess multiplier on the existing hillslope + coastal erosion terms (**C-022**, Slice G) — never scales soil production, never a second erosion Process. `moderate` = 1 is neutral. Machine half only; owner Lock sitting outstanding. |

Chrome: one **Forces** group containing these selects (exact labels in `src/ui/controls.ts`). No cell arguments on any handler.

**Density (U-001).** The control strip defaults to **Simple**: Rain / Sea / Wind stay visible with time and sculpt tools. Heat / Tide / Season / Erosion (and inspect / branch / session chrome) live under **Full**. Toggle is `#chrome-density` in `src/ui/controls.ts`; contract in [chrome-density-composition.md](slices/chrome-density-composition.md).

## Geography as modulator

Under a fixed rainfall mean and wind:

```
P(x,z) = P₀ · max(0, 1 + γ · u · ∇z)
```

then normalize over land so ΣP ≈ N_land · P₀ (mean tracks the dial; placement tracks relief). Ocean cells still absorb precip into `ledger.oceanExchange`.

## Targeting ban

APIs: `rainDepthForRegime(regime, base)`, `heatById(id)` / `setAirTemperature(t)`, `setRainRegime(id)`, `windById(id)`, `setSeaLevel(level)`, `setTidalAmplitude(amp)` / `tideById(id)` — no `(x,z)` / cell index parameters. Conformance: cite **C-004**.

## Slice R mid-path (C-020 / C-004)

Regimes are **weather archetypes**, not a faucet: multi-day wet/dry cycles with one contiguous storm chunk on wet days. Cycle-mean depth matches the Slice F intensity calibration. Observer storm cue = soft overcast veil + streaks; shallow water sheet is muted during the event so rain reads as weather, not a blue mass (T-006).

## Full C-020

Visible clouds + precip phase (rain/snow/sleet) via `climate` Process and Heat dial (shipped §4.21). Rainfall dial remains the moisture budget; clouds charge then discharge; phase from air temperature. Melt-on-contact for snow/sleet this pass — dedicated SWE store optional later. Slice F / R / clouds do not claim **C-020** Locked.
