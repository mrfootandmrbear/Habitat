# Slice C-006 — Abundant sculpting CI promote

**Status:** Done — agent (Locked register v2.0.11)  
**Register:** C-006 Locked; N-001; RC-004; A-005; G-001  
**New Process?** no — invariant closeout (D-007 exempt)

## Rule

```
no editBudget / sculptCost / cooldown / actionPoints in sim|ui|config
∀ berm|dig|deposit edits: Δ(herb+strand+binder+cover) = 0 without stepEvent
heavy sculpt without time → biomass sums = 0
```

## Evidence

`src/sim/c006-abundant-sculpting.test.ts`: economy-pattern scan clean; 100 edits → veg sums unchanged; heavy sculpt → biomass = 0; terrain elev moves.

## Next-but-one

C-013 (owner half) → C-010 framing → Nature P1; C-021/C-022 filed Open.
