# Slice N3 — Onshore spray stress gate (NS-003)

**Status:** Done — machine (C-017 / C-018 remain Open)  
**Nature cards:** NS-003  
**Register:** C-017 Open; C-018 Open; C-007 Locked; C-011 Locked; N-004  
**New Process?** no — reuses `shore.exposure` from Wind × fetch (C-017)

## Steal

Island-colonization salt-spray gate (≠ porewater salinity) → herb Liebig `f_spray` from `shore.exposure`. Exposure already embeds onshore wind; no second onshore multiply. Strand pioneers omit the arm (hold via `f_shore`). Rejected: collapsing spray into `soil.salinity`; `stress.spray` store; place-targeted wind.

## Rule

```
sprayStress = clamp01(shore.exposure)     // already onshore × fetch
f_spray     = 1 − sprayStress             // herb / inland guilds

HSI = min(f_moisture, f_depth, f_gw, f_salinity, f_temp, f_spray)
limiting = argmin (spray id = 5)
```

Default exposure 0 keeps prior inland HSI. Burial deferred (NS-005).

## Paired expectation

Identical fresh wet cell + seed schedule → lee (exposure 0) earns herb; windward (exposure 1) is spray-limited and strand holds. Salinity matched so the twin isolates spray from salt. Probe: `spray-arrival`.

## Bans

Inventing Locked C-017 / C-018 · second salt ledger · `stress.spray` store · place-targeted wind · new Process · burial arm this slice
