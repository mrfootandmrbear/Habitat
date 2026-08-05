# Animal-design (morph) card schema

Authority: [PROTOCOL.md](PROTOCOL.md). One card = one file under [`cards/`](cards/). Target size ~150–250 tokens / ≤200 words body.

## Filename

`AD-###-<slug>.md` — three-digit id, kebab slug from role + trait. Example: `AD-001-herbivore-limb-length.md`.

## Required fields

Copy the template below. Do not add free-form sections. Prefer short phrases over paragraphs.

```markdown
# AD-### — <role> <trait> (<pressure axis>)

| Field | Value |
|---|---|
| id | AD-### |
| role | archetype role name (must already exist in C-027-framing.md §3.1, or be justified against it) |
| trait | trait name (matches `pop.<role>.trait.<name>` if continuous, or the swap name if discrete) |
| kind | continuous \| discrete |
| pressure_axis | which HSI/climate field drives this trait |
| real_world_referent | one sentence, a species/analogue a person already knows (C-011) |
| mechanism | bone-scale (continuous) \| foxel-rung-swap (discrete) — never "morph target" |
| rungs | for discrete: numbered list, ≤5, one short description each. For continuous: the bone/axis scaled and its plausible min–max range |
| player_bet | one sentence, **no numbers** (C-011) |
| register | C-027-framing.md §3.5-style citation; Locked C-027, and C-029 only if the card proposes a regional/ecomorph variant |
| sourced_from | path §section, or "none — recalled/abstract only" |
| reject | ≤2 bullets — what was considered and ruled out |
| evidence_grade | abstract \| recalled \| Habitat-already |
```

## Field notes

| Field | Rule |
|---|---|
| `kind` | Exactly one of `continuous`, `discrete`. Determines `mechanism` — no other pairing is valid (Foxel has no blend shapes; see PROTOCOL ban block) |
| `mechanism` | `bone-scale` only for `continuous`; `foxel-rung-swap` only for `discrete`. A card proposing anything else (vertex morph, blend shape) is rejected at merge |
| `rungs` | Discrete only, ≤5 rungs — a ladder fine enough to read as variety, not so fine it's indistinguishable (VISUAL_UPGRADE_NOTE.md's own open question). Each rung needs a one-line silhouette description, not a full spec |
| `real_world_referent` | Mandatory, always. A card with no referent is not a valid card — ship nothing for that trait rather than invent one |
| `register` | Must cite Locked **C-027** (always) and, only if the card proposes a spatially-clustered/regional variant, Open **C-029** — do not smuggle a C-029 mechanism into a plain C-027 card |
| `sourced_from` | Cite the C-027-framing.md worked example when applicable (§3.5); otherwise the ecological source for the referent claim |
| `reject` | Rule-shape only, same discipline as nature-study cards — name what was considered and ruled out, don't just assert the accepted answer |
| `evidence_grade` | Honesty grade — see PROTOCOL token caps. `Habitat-already` only if the mapping is drawn from an existing shipped field (e.g. `factorTemperature`) |

## What a card is not

Not `.fxl` source, not a rendered PNG, not a shipped asset. A card is the design decision a higher-cost step later executes with the actual Foxel toolchain (`.fxl` → `render.py` preview → `fxl2gltf.py` export). Merging a card does not run any of those tools.

## Exemplar

See [cards/AD-001-herbivore-limb-length.md](cards/AD-001-herbivore-limb-length.md).
