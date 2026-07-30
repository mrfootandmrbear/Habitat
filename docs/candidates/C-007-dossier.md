# C-007 — Arrival as the primary biological verb

**Status:** Locked (2026-07-29 — Slice 12 owner Pass)  
**Criterion (verbatim).** A written choice, plus a build in which at least one biological occupant appears **because conditions became suitable** rather than because the player introduced it — with the suitability field inspectable and monotone (improving the limiting input raises the chance of arrival; improving a non-limiting input does not).

## Machine half (complete — Slice 9 + Slice 12)

| Claim | Result | Artifact |
|---|---|---|
| Composition rule written (Liebig min) | Yes | `docs/slices/9-composition.md` |
| HSI / limiting fields registered + inspectable | Yes | `habitat.suitability`, `habitat.limitingFactor`, inspector layers |
| Improving limiting input raises HSI; non-limiting does not | Yes | `src/sim/habitat/hsi.test.ts` |
| Limiting identity can shift wet→dry | Yes | `limiting-shift` probe (`identityChanged = 1`, HSI drop ≈ 0.076) |
| Arrival composition written (herb + perimeter seed + continuous establishment) | Yes | `docs/slices/12-composition.md` |
| Seed bank / establishment / herb biomass registered | Yes | `veg.seedBank.herb` (legacy), `veg.establishment.herb`, `veg.biomass.herb` |
| Zero suitability blocks establishment | Yes | `src/sim/arrival.test.ts` |
| Improving limiting input raises arrival probability; non-limiting does not | Yes | `src/sim/arrival.test.ts` |
| Same seed + forcing → identical arrival hash; fields bounded | Yes | `arrival.test.ts`; `arrival-earned` `hashMatch = 1`, `bounded = 1` |
| Biological occupant arrives because conditions suit | Yes | `arrival-earned`: suitable biomass = 2.5, unsuitable = 0, `earned = 1` |
| Tier-P occupant encoding clears perceptual floor | Yes | `occupantEncodingDelta(0, 0.45) > 0.15` in `presentation.proxy.test.ts` |
| Continuous establishment (no stochastic draws while C-003 Open) | Yes | `arrivalComposition.ts` — no RNG stream |

## Owner half (Pass — 2026-07-29)

**Question.** When something shows up unannounced, does it feel earned by the place you made — or like a spawn?

**Verdict.** Pass — appearance of life should mimic real life; therefore it appears through earned conditions.

Playtest file: `docs/playtests/12-arrival-earned.md`.
