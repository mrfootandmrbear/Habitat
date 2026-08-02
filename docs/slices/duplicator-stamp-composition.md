# Slice §4.59 — Duplicator stamp

**Status:** Done — agent
**Register:** C-006 Locked; C-002 Locked; C-013 Locked; A-005 Locked; **C-028** Open (framing — "Sandbox magic" / Duplicator); **C-009** Locked (material copies only through the existing deposit-stamp path — never a new mechanism, never veg/water)
**New Process?** no — one-shot siting tool over elev+depth(+material), same family as berm/flatten/mold. D-007 clip gate does not apply.

## Why

C-028 kit map §4 "Sandbox magic": **Duplicator Stamp** — copy `elev(+depth)[+material]` from a source footprint and re-stamp the same form elsewhere. After §4.57 gave fixed geometric molds, the duplicator lets the player lift a form they *already* sculpted — a ridge, a basin lip, an asymmetric mound no fixed mold produces — and repeat it. Still a terrain **cause** (A-005) that multiplies a form-copy **verb** under Locked C-006, never a placed habitat (N-001) and never Townscaper building paste.

## Composition

| Piece | Role |
|---|---|
| `WorldState.copyForm(srcCx, srcCz, radius?)` | Pure observer (P-006 / T-006): walks the circular footprint (same falloff test as berm/flatten), records each cell's elevation **minus the footprint mean** into `copiedForm.dElev`, plus the absolute `soilMaterial` id into `copiedForm.material`. No sim write; `stateHash()` is unchanged by a copy. |
| `WorldState.pasteForm(dstCx, dstCz)` | Re-applies the captured relative delta at a new footprint through the same signed-delta clamp block `stampMold` uses (depth rides elev, C-002; elevation floor; depth ∈ [0, 5]); no-op if nothing has been copied. Material re-stamps with a direct overwrite — the same write `depositSubstrate` already performs — never a new path. |
| `WorldState.hasCopiedForm()` | Cheap UI query — is the clipboard armed. |
| `Tool: duplicate` | Two-click cycle in `main.ts`: first click on a still-unarmed clipboard calls `copyForm` (no undo checkpoint — it writes nothing) and arms; second click calls `pasteForm` (undo checkpoint pushed first, C-013) and disarms, ready for the next source. |
| Fixed footprint | Shares `config.moldRadius` as the default radius — same fixed-footprint clamp family as mold, not the brush size tier (bucket/shovel stay for berm/dig/deposit/flatten only). |

## Rejected

Copying vegetation, water, or suitability as a finished habitat (N-001 / C-007) · Townscaper finished-building paste · an edit budget / cooldown on copy or paste (C-006) · freeze-against-nature · wet-sand carve physics · carving-needle facade detail at ~10 m cells (C-012) · a second material-copy mechanism outside the existing deposit direct-write (C-009) · pasting a whole living scene · absolute-elevation paste (rejected in favor of mean-subtracted **relief**, so the same duplicator works on differently-elevated terrain instead of flattening the destination to the source's raw height).

## Tier-M

- `copyForm` leaves `stateHash()` unchanged — proven observer, no sim write (`siting.test.ts`)
- `pasteForm` reproduces the source relief within f32: an independently-computed mean-subtracted pyramid-mold profile (via the same `moldProfileWeight` the mold stamp itself uses) matches the pasted per-cell delta to 4 decimal places, on a flat destination with headroom against the depth clamp
- ΣΔelev = ΣΔdepth on paste within 1e-4 (C-002)
- Undo restores `stateHash` after a paste (C-013)
- Material re-stamps through `pasteForm` exactly where `depositSubstrate` wrote it at the source (C-009)
- `pasteForm` before any `copyForm` is a safe no-op (hash unchanged)
- 20 pastes write no vegetation, water, or suitability (C-006 / N-001); the C-006 abundant-sculpting loop extended to 140 berm/dig/deposit/flatten/mold/duplicate edits with no veg write

No `GOLDEN_*` hash or probe baseline moved — this adds a new player verb, it does not change any Process.

## Next-but-one

The C-028 structural "keep" list is now fully shipped (§4.55 brush size → §4.56 flatten → §4.57 molds → §4.59 duplicator); everything left in the kit map ([C-028-framing.md](../candidates/C-028-framing.md)) is either banned (wet-sand, freeze, carving needles, figurines) or **owner taste** (do molds/duplicator feel like shaping sand or placing architecture; do flags/banners earn a chrome slot) — not agent-executable. Track T (terrain tools) has no further machine slice queued; that taste question joins the **owner Lock backlog** batch alongside C-014 / C-021 / C-022.

The sole remaining agent-executable queue is Track R (review correctness): **§4.47** guild cover & light-competition correctness is in flight ([PR #10](https://github.com/mrfootandmrbear/Habitat/pull/10)); its own next-but-one is **§4.48** habitat/dispersal determinism hygiene (T-001, T-005) — after cover/light lands.
