# Wave 0 — Locked presentation debt

**Status:** Done — machine (presentation + one sim contribute correction)
**Register:** AUD-001 / AUD-002 / AUD-003 Locked; C-014 Open (owner hearing half);
C-008 / C-013; T-001; ES-004 / N-004; F-003 Deferred (does not block same-preserve
seed regenerate)
**New Process?** no — no new `Process` registered. D-007 clip gate does not apply.
**Evidence:** `src/sim/fire.test.ts` (guild biomass kill), `src/audio/audio.test.ts`
(mix + null beds in CI)

Closes the largest register→build gaps called out by the game-side survey
(`what-else-abstract-castle`): Locked audio with no speakers, fire that clears
`veg.cover` but leaves every occupant shoot standing, a session that starts at
`1 day/s` with tool look (undo frozen in one frame), and a single forever island.

## 0a — Sound exists

`AudioBus` already computed water + life mixes. Wave 0 creates an `AudioContext`
on first user gesture, two looping filtered-noise beds, and feeds
`waterGainTarget` / `lifeGainTarget` from the existing mix. Text hints that
stood in for silence/recovery are retired. CI stays headless: `createAmbientBeds`
returns null without Web Audio.

Unblocks the **owner half of C-014** (hearing environment) — do not promote;
dossier question unchanged.

## 0b — Seed entry + regenerate

Seed field + **New island** button. Same preserve type (island + sea datum) —
not a second biome under **F-003**. Seed appears in the status line; T-001
determinism becomes a product feature.

## 0c — Fire kills guild biomass

`runFireStep` applies `fireVegMortality` to all six `veg.biomass.*` fields with
the same factor as `veg.cover`. `fireProcess.contributes` lists those fields.
OccupantMesh finally sees a burn. `burn-recover` never establishes guild biomass,
so its baseline is unchanged; `deep-time` never ignites.

## 0d — Pause on arrival; dig default

`timeRate` defaults to `pause`; `sitingTool` defaults to `dig`. The player meets
a still world; the first click digs; undo stays reachable until time runs
(C-013).

## Baselines / hashes

No probe baseline moved. No `GOLDEN_*` hash moved (biomass starts at 0 on the
determinism schedule; fire biomass kill is inert there).
