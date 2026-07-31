# Slice E — Exner-lite inland hillslope deposit (composition)

**Candidates.** **GEO-002** Locked (sole sediment writer). Touches **C-002** Open (spatial cost reading unchanged: channel erosion still high-A only). No new Process (D-007 exempt).

## Steal (rule shape only)

Mei-class / fluvial capacity fudge from hydraulic-erosion discourse (not a vendored engine):

```
Ĉ      = slope · √Â                         // capacity proxy
mobile = Σ hillslope_removed · retain
w_j    = underCapacity(Ĉ) · flat(slope) + 2·depression + localMin
       // concentrated high-A cells excluded unless basin/pit
deposit_j = mobile · w_j / Σw
```

Ponded cells (`depression.depth > 0`) do not hillslope-incise — water-surface slope is flat; they are Exner sinks.

## Ownership

All elev/depth writes stay inside `runGeomorphologyStep`. Coastal longshore budget unchanged (Slice 19). Rejected: virtual-pipe SWE, droplet particles, Hjulström multi-grain thresholds as the primary law, second sediment Process.

## Mass

Bedrock invariant: Δelev = Δdepth. With `hillslopeSedimentRetainFraction = 1` and no ocean, Σsoil does not shrink from redistribution (production may still raise it). Unplaced share (depth cap / no weight) → `ledger.shoreErosion` when applicable.

## Encoding / Tier-O

Machine closeout only — no owner ask. Legibility of inland silt remains under existing form-memory / return-visit encoding.
