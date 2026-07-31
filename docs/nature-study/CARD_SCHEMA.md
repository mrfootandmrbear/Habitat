# Nature-study card schema

Authority: [PROTOCOL.md](PROTOCOL.md). One card = one file under [`cards/`](cards/). Target size ~150–250 tokens / ≤200 words body.

## Filename

`NS-###-<slug>.md` — three-digit id, kebab slug from title. Example: `NS-001-wet-site-herb.md`.

## Required fields

Copy the template below. Do not add free-form sections. Prefer short phrases over paragraphs.

```markdown
# NS-### — <title ≤8 words>

| Field | Value |
|---|---|
| id | NS-### |
| lane | factor \| guild \| engagement |
| title | ≤8 words |
| real_world_referent | one sentence (N-004) |
| player_bet | one sentence, **no numbers** (C-011) |
| maps_to_fields | comma-separated existing or proposed field ids |
| hsi_or_growth_rule | one-line min/product shape |
| physics_feedback | what veg changes if established (or "n/a") |
| register | Locked ID(s) and/or Open C-00x |
| steal | ≤2 bullets |
| reject | ≤2 bullets |
| legibility | inspectable limiting label, or "none yet" |
| priority | P0 \| P1 \| P2 |
| evidence_grade | abstract \| recalled \| Habitat-already |
```

## Field notes

| Field | Rule |
|---|---|
| `lane` | Exactly one of `factor`, `guild`, `engagement` |
| `player_bet` | What the player expects from real-world intuition; never a HUD number |
| `maps_to_fields` | Prefer existing WorldState ids (`habitat.suitability`, `veg.biomass.herb`, `soil.salinity`, …). Proposed ids use `proposed:` prefix |
| `hsi_or_growth_rule` | e.g. `HSI = min(..., f_temp)`; engagement cards may say `n/a — needs cards: NS-…` |
| `physics_feedback` | Roughness / infil / fuel / erosion — or `n/a` for factor-only until a guild uses it |
| `register` | At least one Locked/Current ID or Open **C-00x**. No invented Locked policy |
| `steal` / `reject` | Rule-shape only; bans must be explicit |
| `priority` | P0 = controllable dial or two-bet differentiation; P1 = new derived field, no new Process; P2 = new Process / deferred |
| `evidence_grade` | Honesty grade — see PROTOCOL token caps |

## Exemplar

See [cards/NS-001-wet-site-herb.md](cards/NS-001-wet-site-herb.md) (Habitat-already — Slice 12).
