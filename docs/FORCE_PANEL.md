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
| **Siting tools** | Shape land / mark prediction / authored ignition | Become the rainfall or sea-level control |

Geography decides *where* a regime bites. The player sets the mean; the island decides the pattern. Proof is in the place, not in the panel.

## Live dials (Slice F)

| Control | IDs | Semantics |
|---|---|---|
| **Rainfall** | arid / light / moderate / wet | **Mean climate precip intensity** — average depth the world lives under (every event when intensity > 0). Not a storm-duty on/off switch. Multiplier on `rainDepthPerEvent`; orography redistributes without changing the regime’s mean. |
| **Sea** | off / low / mid / high | Global sea datum (**C-015**). |
| **Wind** | calm / from west / east / south / north | Global wind vector; drives orographic modulation of the rainfall mean (**C-020** lite). |

Chrome: one **Forces** group containing these selects (exact labels in `src/ui/controls.ts`). No cell arguments on any handler.

## Stubs (empty slots — do not invent policy)

- Tide envelope (Slice 17)
- Season (unfiled)

## Geography as modulator

Under a fixed rainfall mean and wind:

```
P(x,z) = P₀ · max(0, 1 + γ · u · ∇z)
```

then normalize over land so ΣP ≈ N_land · P₀ (mean tracks the dial; placement tracks relief). Ocean cells still absorb precip into `ledger.oceanExchange`.

## Targeting ban

APIs: `rainDepthForRegime(regime, base)`, `windById(id)`, `setSeaLevel(level)` — no `(x,z)` / cell index parameters. Conformance: cite **C-004**.

## Full C-020

Visible clouds and precip phase (rain/snow/sleet) remain later. Slice F does not claim **C-020** Locked.
