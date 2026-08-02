# Simple / Full control density

**Status:** Done — agent (presentation)
**Register:** U-001 Locked; U-003 Locked; C-004 Locked (force panel still global);
T-005 (inspect stays Full); T-006 (observer only)
**New Process?** no — chrome layout only. D-007 clip gate does not apply.
**Evidence:** `src/ui/chromeDensity.test.ts`, `presentation.proxy.test.ts`
(Simple leaner than Full by ≥ 8 controls)

The control strip had become a wrap-heavy dashboard: every force dial, inspect
layer, branch/predict affordance, and session action competed for the same
bottom-left real estate as the sand-castle loop. Locked **U-001** already
requires a readable first layer with deeper diagnostics on demand; Locked
**U-003** says the world is the primary visualization. This slice makes that
true in the chrome.

## Density contract

| Mode | Shows | Hides |
|---|---|---|
| **Simple** (default) | Density toggle · Rain / Sea / Wind · time rates · tool / brush · deposit material when Tool: deposit · Undo · hint + status | Heat / Tide / Season / Erosion · brief · notebook · reset · seed · remember · branch · save/load · predict · inspector · cutaway |
| **Full** | Everything Simple shows, plus the Full-only set above | — |

Simple keeps the thesis loop (sculpt → choose forces → run time → look) without
erasing any dial — Full is one click away. Preference persists in
`localStorage` (`habitat.chromeDensity`).

## Layout

Controls are grouped into three rows (`chrome-row-loop`, `chrome-row-session`,
`chrome-row-read`) instead of one flat wrap. CSS hides `.chrome-full` when
`#controls[data-chrome="simple"]`. Force order puts Rain / Sea / Wind first so
Simple's primary forces stay in the visible prefix of the Forces fieldset.

## Bans / non-goals

- No new force semantics, no cell targeting, no inspector-as-payoff.
- No owner playtest — hygiene / presentation density; Tier-P is the control-count
  delta. Taste residual (whether Simple's force trio is the right first layer)
  can batch later if the owner wants a sitting; not gating this ship.
- Does not resolve **C-026** palette work or mold stamps (§4.57).

## Baselines / hashes

None moved — presentation only.
