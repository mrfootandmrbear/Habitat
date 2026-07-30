# C-007 — Arrival as the primary biological verb

**Status:** Open (owner-judged; machine half partial)  
**Criterion (verbatim).** A written choice, plus a build in which at least one biological occupant appears **because conditions became suitable** rather than because the player introduced it — with the suitability field inspectable and monotone (improving the limiting input raises the chance of arrival; improving a non-limiting input does not).

## Machine half (partial — Slice 9)

| Claim | Result | Artifact |
|---|---|---|
| Composition rule written (Liebig min) | Yes | `docs/slices/9-composition.md` |
| HSI / limiting fields registered + inspectable | Yes | `habitat.suitability`, `habitat.limitingFactor`, inspector layers |
| Improving limiting input raises HSI; non-limiting does not | Yes | `src/sim/habitat/hsi.test.ts` |
| Limiting identity can shift wet→dry | Yes | `limiting-shift` probe (`identityChanged = 1`, HSI drop ≈ 0.076) |
| Biological occupant arrives because conditions suit | **Not yet** | Requires populations / arrival process — not Slice 9 |

## Owner-only question

When something shows up unannounced, does it feel earned by the place you made — or like a spawn?

(Not a playtest request; waits until an arrival actually exists.)
