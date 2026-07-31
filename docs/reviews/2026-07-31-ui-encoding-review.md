# UI encoding review — the proxy that's supposed to catch this can't see half the range

> **Date:** 2026-07-31
> **Role:** Advisory measurement of the perceptual-encoding layer against [VERIFICATION_POLICY.md](../VERIFICATION_POLICY.md)'s Tier-P contract ("the agent proves the signal is encoded") and D-007 / U-003 legibility.
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.52. A new candidate, **C-026**, is filed for deliberate palette redesign.
> **Trigger:** Owner asked which other subsystems would benefit from the same scoped-expert-review treatment as the renderer; the UI encoding layer is the sibling of that review — what the visuals communicate, not how they're drawn.
> **Companion:** [renderer review](../reviews/2026-07-30-sim-gap-review.md) mechanism ([commit 3c4b9f0](https://github.com/mrfootandmrbear/Habitat/commit/3c4b9f0)) — same scoped-expert pattern, applied to `src/ui/` instead of `src/render/`.
> **Scope:** `src/ui/terrainEncoding.ts`, `lightEncoding.ts`, `occupantEncoding.ts`, `timeRates.ts`, `stormCue.ts`.

---

## 0. Verdict

Every "Observable" row in this project's Definition of Done is a Tier-P claim discharged by an *encoded-delta* proxy — `VERIFICATION_POLICY.md` names `presentation.proxy.test.ts` as its sibling and states plainly: "the agent proves the signal is encoded." That proxy mechanism has a blind spot large enough to hide real regressions:

1. **Every biomass/occupant color ramp saturates at ~55% of its domain** (`sqrt(t)*1.35`, duplicated seven times) — the top half of every guild's biomass range renders as one flat color, and **every delta function built on top of it returns exactly zero across that range.** A Tier-P proxy that can't distinguish 55% biomass from 100% biomass isn't measuring what "Observable" requires. `lightEncoding.ts` has the identical bug in miniature (clips at 1/3).
2. **The delta floors measure raw RGB Euclidean distance**, not a perceptual metric — miscalibrated in blue vs. green, so a passing delta test is not reliable evidence a player can actually see the difference.
3. **A genuine cross-domain color collision**: sand-binder mat and intertidal foreshore render as the same khaki (~0.07 unit-RGB apart) because no test compares palettes *across* files — each is only checked against itself.

None of this is a request to redesign the palette (that's real taste work, filed separately as **C-026**). It's that the machine-checkable stand-in for "can the player see this" is currently miscalibrated, which means passing proxies on past and future slices are weaker evidence than the project's own process assumes they are.

---

## 1. Saturating ramps hide the top half of every range (high)

`occupantEncoding.ts:34` — `u = min(1, sqrt(t) * 1.35)` — clips at `t ≈ 0.549`. The identical expression is duplicated six more times (`:55,64,78,92,106,120`). All biomass from ~55% to 100% of `biomassMax` produces an **identical color** across every guild: the encoding is non-injective across nearly half its domain. Consequences:

- Mature stands show no density variation at all.
- Every delta function built on the ramp (`occupantEncodingDelta` `:38–46`, all five guild deltas `:129–181`) returns **exactly 0** for two genuinely different high-biomass states — a Tier-P proxy silently blind exactly where a reviewer would expect it to matter most (late-succession, post-recovery states).
- `shoreInteriorOccupantDelta` (`:253–271`) reports zero shore/interior contrast whenever both means clear the 0.55 knee, even if shore biomass is literally double interior.

`lightEncoding.ts:5` — `min(1, max(0, light) * 3)` — clips at `light = 1/3`; if light can reach 1.0 (it's a normalized field elsewhere in the codebase), two-thirds of the domain is one flat color and `lightEncodingDelta` (`:9–13`) reads 0 across it too.

## 2. Delta floors use the wrong metric (medium)

Every delta function in both files (`terrainEncoding.ts:111`, `occupantEncoding.ts:45` and siblings, `lightEncoding.ts:12`) is a Euclidean distance in raw RGB. Equal RGB distances are not equally discriminable to a human eye — differences concentrated in blue read far weaker than the same numeric distance in green, and luminance isn't weighted at all. Since these deltas are the project's machine-checkable stand-in for "the player can see this" (§0), the floor mechanism itself is calibrated in the wrong space. A luminance-weighted distance is the minimum fix; CIELAB ΔE is the correct one.

## 3. Cross-file color collision (high)

`occupantEncoding.ts:15` (BINDER, `0xc4a24e`) and `terrainEncoding.ts:26` (INTERTIDAL, `0xc49a5e`) are ~0.07 unit-RGB apart — a unit-RGB distance far below any plausible discrimination floor, and below deltas these same files elsewhere treat as minimums. These are two *different quantities* (occupant guild cover vs. terrain tidal state) that co-occur in exactly the same screen region: the shore. A crest of full-biomass binder mat and a wet foreshore band will read as the same khaki. No existing test catches this because every delta function measures within its own file's palette only — there is no cross-file contrast check.

Related but lower severity: **CVD collapse.** Most occupant guild colors (bare→shoot→strand→shrub→crust) vary primarily along the red–green axis — the textbook brown/green confusion pair for deuteranopia/protanopia. Under a CVD projection, several guilds become difficult to distinguish; only marsh (teal) and binder (khaki) sit safely on the blue–yellow axis. `lightEncoding.ts:6`'s dark-blue-to-warm-pale ramp is, by contrast, a well-chosen CVD-robust template (monotone in luminance, cividis-like) — the right pattern for the other continuous ramps to follow.

## 4. Compositing and calibration nits (medium, straightforward fixes)

- **Overlay order lets a later tint erase an earlier one.** `terrainEncoding.ts:67–75`: burn scar darkens (up to 0.85 toward black), then intertidal tints at a fixed 0.62, then salt lerps up to 0.78 toward white — applied *last*. A burned, salty hollow renders pale, with the scar nearly gone and much of the intertidal tint overwritten. Two categorical states the player is meant to read (burned; foreshore) can be masked by a third.
- **`substrateEncodingDelta` measures the wrong pairs under the wrong porosity** (`terrainEncoding.ts:155–184`): it checks `min(sand↔clay, sand↔rock)` but never `clay↔rock` — two of four substrates could be indistinguishable and the floor would still pass. Porosity is also hardcoded to 0.4 for all three test samples, while the real render uses each substrate's own porosity (`soilT = moisture/porosity`, `:58`) — a low-porosity rock at low moisture renders far wetter/greener than the test simulates.
- **A stale hardcoded label.** `timeRates.ts:101–102` hardcodes "the fastest this machine sustains" in the `week` description, but sustainability is computed at runtime by `sustainableRates()` (`:142–144`); on a machine that sustains `month` instead, the tooltip is simply false — the one place in a module whose own header comment says labels are "derived, never typed" where a label isn't.
- **Storm-cue strength encodes climate archetype, not event magnitude** (`stormCue.ts:15–26`): veil strength is fixed per regime, so a rare, violent storm in a `dry` regime renders weaker (0.28) than a routine `moderate` drizzle (0.78). Comment says this is deliberate; as an encoding it inverts salience — the strongest visual cues attach to the most common events.

## 5. Minor

- `occupantEncoding.ts:54–55` — `shootVisibility` jumps discontinuously from 0 to ≈0.12 at the arrival threshold rather than fading in.
- `terrainEncoding.ts:58` — moisture is encoded relative to porosity (saturation fraction), so identical absolute moisture renders differently across substrate boundaries; physically defensible but worth a legend note since a player comparing sand-vs-clay wetness by color alone will be misled.
- `timeRates.ts:157–172` — `formatSimElapsed` floors float divisions (a value one ulp under N days displays as "(N−1)d 23h") and is unguarded for negative input.
- `occupantEncoding.ts` — the `sqrt(t)*1.35` ramp body is copy-pasted seven times; any recalibration (including the Finding 1 fix) must touch all seven or guild ramps silently diverge.

## 6. What's done well (worth preserving through any fix)

`terrainEncoding.ts:19–28` exporting one palette shared by both the CPU and GPU render paths is exactly right — no drift between the legend's source of truth and the shader. `stormCue.ts:15–26` switches exhaustively over the regime union with a declared `number` return, so a new regime is a compile error rather than a silent `undefined`. `timeRates.ts` deriving the offered rate ladder from measured throughput rather than a hand-picked list (`:135–144`) is honest UI. `occupantEncoding.ts:187–250`'s shore-distance BFS is correct: multi-source from ocean, uniform weights, consistent land/ocean boundary in both passes, landlocked cells handled. No off-by-one or clamp-range bug was found beyond the saturation knees in Finding 1 — every lerp checked is properly clamped and monotone in its input.

---

## 7. What can ship without a candidate, and what needs one

**No candidate needed** — these are correctness fixes against the encoding layer's own stated contract (accurate delta proxies, non-colliding palette, compositing that doesn't erase a state it's meant to show): the saturating-ramp fix (§1), the delta-metric fix (§2), the cross-file collision check (§3, mechanism only — not a palette redesign), the overlay-order fix, the `substrateEncodingDelta` correction, and the stale-label fix (§4).

**Needs a candidate — filed as C-026.** Deliberately redesigning the guild/terrain palette to be colorblind-safe end-to-end (not just fixing the one binder/intertidal collision, but choosing new hues across all six guilds so the red–green confusion pattern in §3 doesn't recur) is an art-direction/taste decision, not a bug fix — the same category **D-007**'s clip gate and **U-003** already treat as owner-judged. See [DECISION_REGISTER §16.5 C-026](../DECISION_REGISTER.md).

---

## 8. Suggested work order

```
Encoding delta correctness (§1 + §2 + §3-mechanism + §4)   — fixes the Tier-P proxy itself; no candidate
     │
C-026 CVD-safe palette — Open, owner-judged, not blocking the above
```

Queued as [BUILD_GUIDE §4.52](../BUILD_GUIDE.md).

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.52; [DECISION_REGISTER.md](../DECISION_REGISTER.md) §16.5 C-026; [AGENTS.md](../../AGENTS.md) queue tip.
