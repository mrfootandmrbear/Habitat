# Slice 17 — Tidal envelope / intertidal (composition)

**Candidates.** **C-016** Open (hypothesis). Touches C-015, C-004, S-009, T-001. Owner settles metaphor conflict (THESIS §4 "tide" = fast-forward).

## Band fit (S-009)

A semidiurnal tide is ~50 event steps at 15 min/event: readable at 1×, invisible at 16×, meaningless at decadal. Advancing instantaneous phase every event step fights the clock. This slice uses a **mean high / mean low water envelope** only — no tidal phase in the scheduler.

## Envelope scalars

- Require `seaLevel` (C-015). Absent sea → no envelope; intertidal empty.
- Player sets a global **tidal amplitude** (half-range, metres) via Force panel — no cell arguments (C-004).
- `MLW = seaLevel − amplitude`
- `MHW = seaLevel + amplitude`
- Amplitude `0` → MHW = MLW = seaLevel → empty intertidal (Tide: off).

## Intertidal mask

- Cell is intertidal iff `MLW ≤ elevation < MHW` (and amplitude > 0).
- Derived / recomputed with flow structure when sea or amplitude changes — not a second hydrology.
- Registered as `shore.intertidal` (0/1) for inspectability (T-005).
- Ocean outlet remains `elevation < seaLevel` (C-015 unchanged). No phase, no SWE.

## Force dial

Tide select: off / neap / mean / spring. Widening amplitude must grow intertidal cell count monotonically (Tier-M). Same envelope → identical `stateHash` (T-001).

## Encoding

Default terrain view tints **land** foreshore cells (`seaLevel ≤ elev < MHW`) so the shore band reads without an inspector. Ocean mesh still covers subtidal cells. Tier-P proxy measures color distance; Tier-O metaphor question is batched.

## Bans this slice

Per-event tidal phase. Second hydrology engine. Cell-targeted shore painting. Resolving C-016 Locked without owner metaphor call. Wave exposure / salinity (C-017 / C-018).
