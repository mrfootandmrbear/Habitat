---
name: write-playtest
description: >-
  Writes a Habitat Tier-O playtest request only after the ask gate passes.
  Use when requesting owner play, drafting docs/playtests/, or batching
  attention/legibility/taste questions.
---

# Write playtest

Authority: [VERIFICATION_POLICY.md](../../../docs/VERIFICATION_POLICY.md) §4–§6.

## Ask gate — all four, or stop

1. Green bar: `npm test`, `npm run build`, `npm run conformance:check`, `npm run probe -- --all --check` (use `/run-gate`).
2. Every Tier-M claim for the slice has a committed test/probe; you can state the numbers.
3. Every Tier-P claim has a green proxy measurement.
4. One owner-only question in **one sentence containing no number**.

Fails 4 → more agent work, not a playtest. Infrastructure / hygiene / perf → **no** playtest file; defer in the slice manifest.

## File

Create `docs/playtests/<slice>.md`:

```markdown
# Playtest — <slice>

**Time box:** N minutes. Stop at N even if unfinished.
**The one question:** <single sentence, no numbers>

## Do this
1. <exact command>
2. <exact click, exact control name>
3. <exact thing to watch>

## Already proven — do not check these
- <Tier-M claim> — <test/probe>, <number>
- <Tier-P claim> — <proxy>, <number vs floor>

## Verdict (circle one)
- **Pass** — <what you noticed / cared about>
- **Hold** — <what Hold means>

**If Hold, the agent will:** <concrete change — not a discussion>

Notebook seed: "<sentence>"
```

## Hard rules

- Numbered steps only. No options, no "play around," no HUD reading, no A/B reload.
- Verdict is about the **owner**, not whether the sim works.
- Batch: do not fire a lone Tier-O if VERIFICATION_POLICY §4 says wait for the third question / blocker — add to the batch instead.
