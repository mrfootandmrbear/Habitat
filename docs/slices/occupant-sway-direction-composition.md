# Slice §4.60 — Occupant sway direction composition

**Cited:** [L4-composition.md](L4-composition.md) (the mechanism this slice corrects); D-007 Locked; T-006; C-011.

## What was actually wrong

An owner playtest screenshot showed a shoreline meadow where every cone leaned a visibly different way — read as a field of independently animated characters, not plants bent by one wind. L4 (§4.39) already keyed sway to the single global wind vector, so every instance should have leaned the same direction. It didn't, because `OccupantMesh` built the per-instance rotation as:

```ts
this.dummy.rotation.set(0, yaw, 0);          // random per-cell facet spin
this.dummy.rotateOnAxis(this.leanAxis, tilt); // meant to be a world-space wind axis
```

`Object3D.rotateOnAxis` rotates about an axis expressed in the object's own (already-yawed) local space, not world space. Composing it after the yaw meant the "world-space" wind axis was silently re-rotated by that same random yaw before the lean was applied. One uniform wind vector rendered as N different lean directions, keyed to each cell's `(x*17 + z*31) % 360` hash — the exact "moving trees" artifact in the screenshot.

Separately, `swayTilt` was a plain sine through zero — the shoot swings symmetrically past vertical every cycle. Real wind-shaped vegetation holds a steady lean into the prevailing wind and flutters a little on top; it doesn't rock back through upright, let alone past it.

## What shipped

Presentation only — no WorldState writes (T-006), same as L4.

| Piece | Change |
|---|---|
| `OccupantMesh.ts` | Yaw and lean composed explicitly as quaternions: `this.dummy.quaternion.multiplyQuaternions(leanQuat, yawQuat)` — yaw applied first (spins the cone's own facets), lean applied second with its axis outermost, so the lean's world-space axis never sees the yaw |
| `occupantSway.ts` | `swayTilt` rebalanced: `lean = amplitude · 0.7`, `flutter = amplitude · 0.3`, `tilt = lean + flutter·sin(...)` — tilt stays in `[0.4·amplitude, amplitude]`, always leaning the same way, never crossing back toward vertical |

Wind vector is unchanged as the sway driver (owner call — see Deferred). Amplitude law (`swayAmplitude`, guild flex, living vitality) is untouched; only how the tilt is spent (steady lean vs. oscillation) and how the lean axis is composed in 3D changed.

## Regression test

`presentation.proxy.test.ts` builds two-plus grid cells with different yaw hashes under one wind vector, reads each instance's matrix via `InstancedMesh.getMatrixAt`, decomposes the quaternion, and checks the world-space horizontal lean direction is parallel (`cos > 0.999`) across cells. Run against the pre-fix code (verified by hand, not committed) this measures `cos ≈ 0.53` — confirms the bug and pins the fix.

## D-007 clip note

L4's clip verdict ("the shoots lean with the wind and go still when the dial is calm") was never wrong about the *law* — wind magnitude did drive amplitude correctly. It was wrong about what the renderer actually drew. This slice makes the code match that verdict.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash — confirmed by `npm run gate`. Tier-P only.

## Deferred

- A per-cell lean direction keyed to local terrain slope / erosion angle instead of the single global wind vector — owner explicitly chose to keep wind as the driver for now and readability as the fix; floated as a plant-diversity-slice candidate if lean should vary by place rather than by one global forcing (this would be a bigger lift: no per-cell aspect/gradient field is currently exposed to presentation).
- `FLUTTER_FRACTION` (0.3) is a first legibility pass, not tuned against a playtest; revisit if the held lean still reads too stiff or too loose.
