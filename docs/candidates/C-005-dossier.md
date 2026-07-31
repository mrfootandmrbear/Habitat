# C-005 — Branch-and-compare as a core instrument

**Status:** Locked 2026-07-31 — **tooling / debug panel**, not a core play instrument  
**Criterion (verbatim).** A world can be forked and both branches run under different force settings, reproducibly: same seed + same settings → identical hash (T-001, P-005), and the two branches are presentable side by side without the player reading numbers.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Fork preserves hash at branch point | `stateHash` equal | `src/sim/branch.test.ts` |
| Same forces → identical hash after multi-day run | match | same + probe `branch-compare` `same.hashMatch = 1` |
| Different rain → hashes diverge; heavy precip > dry | precipDelta ≈ 18.2 | `docs/evidence/branch-compare.baseline.json` |
| Branch B isolation under A mutation | `delta.isolated = 1` | probe |
| Moisture compare encoding clears floor (no numbers) | encoding ≈ 0.191 > 0.15 | probe + `presentation.proxy.test.ts` |
| Comparison UI (Show A/B · Compare branches · Keep) | controls present | `src/ui/controls.ts`, `src/main.ts` |

**Gap vs full criterion.** Dual physical viewport deferred; scaffold is lane toggle + moisture tint. Owner half discharged below.

## Owner-only question

Did you want to fork the world and run it again under different forces — or did Compare feel like a debug panel?

**Owner 2026-07-31:** Compare felt like a **debug panel** → **Lock as tooling**, not core. Register v2.0.12.
