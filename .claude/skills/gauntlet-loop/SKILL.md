---
name: gauntlet-loop
description: >
  Run a Gauntlet Loop — decompose a goal into the smallest independently-judgeable
  pieces, fan out a builder and a separate fresh-context critic per piece, and
  iterate each piece until its critic is genuinely won over against a concrete bar
  (real reference material when available, a written checkable rubric when not).
  Use whenever the user asks to "run a gauntlet loop," "restart the gauntlet loop,"
  wants iterative builder/critic agent rounds pushing something toward a quality
  bar, or references this workflow by name. Also use when resuming work that got
  interrupted mid-flight (spend limit, crash, timeout, closed session) — the loop
  checkpoints aggressively specifically so "restart" means resuming from the last
  commit and status file, never starting over from scratch.
---

# Gauntlet Loop

A Gauntlet Loop is: pick a concrete bar, break the goal into pieces small enough
to judge in isolation, and for each piece run a builder against a separate
fresh-context critic until the critic is won over. Named after the workflow
behind Matt Shumer's "Claude of Duty" (real Call of Duty screenshots as the bar
for a from-scratch FPS) — the technique generalizes past games to any goal where
"does this actually look/read/perform as good as X" is the real test, and no
single self-review can be trusted to answer that honestly.

The failure mode this skill exists to prevent isn't bad output — it's **losing
real work to something outside your control** (an API spend limit, a crashed
agent, a session that closes) and either discarding hours of good partial work
or blindly re-running everything from zero. Checkpointing is not a nice-to-have
bolted onto the loop; treat it as load-bearing as the builder/critic mechanic
itself.

## Step 1 — Pick the bar, and say so in one sentence

The bar is whatever a critic scores the work against. In order of strength:

1. **Real reference artifacts** the user supplies or you can actually fetch
   (screenshots, files, a running comparable product). This is the strongest
   bar — a critic can do a genuine blind side-by-side.
2. **A written, checkable rubric** when no live reference exists — e.g. no
   network access, the reference is a copyrighted product you can't legally
   clone, or nothing comparable exists yet. Write it as a numbered list of
   *specific, screenshot/output-verifiable* claims, not vague adjectives.
   "Shadows are soft and grounded, no acne" is checkable; "looks polished" is
   not.

Before committing to option 2, actually try option 1 — attempt to fetch or
request real references first. Only fall back to a rubric if that genuinely
isn't available, and say so explicitly (to the user and in whatever status doc
you're keeping) rather than silently substituting a weaker bar. Log the bar
somewhere durable (a note in the repo, not just the chat) — the critic and any
future resumed session need to find it without re-deriving it.

## Step 2 — Decompose, then build shared foundation *first*

Break the goal into the smallest pieces a critic can judge independently.
Two decomposition traps, both learned the hard way:

- **Shared infrastructure is not a piece — it's a prerequisite.** If several
  pieces will touch a common foundation (a shared render pipeline, a shared
  config schema, a shared build step), build and commit that foundation
  yourself, sequentially, *before* fanning out. Parallel agents editing shared
  files at the same time produces conflicts; parallel agents building on a
  foundation that doesn't exist yet produces silent staleness (see the
  worktree-staleness gotcha in `references/patterns.md` — an agent that
  branched before a lighting rig changed hardcoded the *old* light direction
  as a literal constant, and nothing caught it until integration).
- **Match piece count to what's actually independent.** Enough pieces that
  each is small and judgeable on its own; not so many that you're spending
  more effort orchestrating than building.

## Step 3 — Wire in checkpointing before you fan out a single agent

This is the step that's easy to skip under time pressure and the one that
actually matters when something goes wrong. Every builder agent's brief must
include:

1. **Commit locally after every safely-completed unit of work**, not just at
   the end of a round. If a round is "model it, wire it in, verify it, screenshot
   it," that's at minimum two commit points, not one. An uncommitted diff sitting
   in a worktree is one crash away from being unrecoverable; a commit is durable
   the instant it lands. Cheap to do, expensive to have skipped.
2. **Write a status file after every checkpoint, not just at completion.**
   One line is enough: piece name, round number, a status enum (e.g.
   `modeling` → `wiring` → `verifying` → `awaiting-critic` → `done` /
   `blocked`), and a one-line note. The point isn't the file's content — it's
   that if the agent dies mid-round, whoever picks up the pieces can tell
   *exactly* how far it got instead of staring at silence. See
   `references/patterns.md` for the exact JSON shape used successfully before.
3. **Verify before handing off, every round**: typecheck / build / test suite
   green, not just "looks done." A partial diff that still compiles and passes
   existing tests is safe to keep even if the agent never reports back; one
   that doesn't is not.

Tell each builder explicitly: *you may be terminated without warning; commit
and checkpoint as if that's certain, not as if it's unlikely.*

## Step 4 — Fan out a builder and a separate critic per piece

For each piece: a builder implements, verifies (Step 3), and reports. A
**separate agent with fresh context** — not the builder grading its own work —
reviews the actual output against the bar from Step 1, names the single
biggest remaining gap, and sends it back. Loop until the critic is won over.
Don't prescribe a fixed round count up front; do notice diminishing returns and
say so rather than looping forever on marginal polish.

Use isolated worktrees for parallel builders touching the same repo (the Agent
tool's `isolation: "worktree"` option) so simultaneous edits can't collide.
Give each builder a narrow, explicit file scope.

## Step 5 — Keep a live progress record

Two layers, both cheap:

- A short, durable note in the repo (what changed, why, current status per
  piece, anything interrupted or blocked) — this is what makes "restart"
  possible days later in a fresh session.
- Optionally, a visual progress page (e.g. an Artifact) updated as rounds land,
  if the work is visual — good for the user, not load-bearing for resumption
  (the repo note and git history are).

## Step 6 — When integrating multiple pieces, re-verify the *whole*

Each piece passing in isolation doesn't mean the integrated result is right.
Re-run the full verification suite on the merged result, and if the output is
visual or user-facing, actually look at it — tests don't check aesthetics.
Watch specifically for the staleness trap from Step 2 (constants or assumptions
baked in before a shared foundation changed) — it won't show up in any test,
only in the integrated output looking wrong.

## Handling a failure mid-loop

When a builder is cut off (spend limit, crash, timeout — anything, not just
budget):

1. **Don't retry immediately.** Retrying blind repeats whatever just failed.
2. **Check what survived**: does the worktree/branch still exist? What's
   committed vs. merely on disk? Does it typecheck, build, pass tests?
3. **If salvageable, integrate it yourself directly** rather than re-spawning
   an agent to redo work that already exists — cheaper, faster, and you get to
   fix any integration issues (Step 6) in the same pass.
4. **If not salvageable, say exactly what was lost** and retry only that
   narrow piece, not the whole loop.
5. **Report honestly.** "Interrupted, partially salvaged, here's the real
   state" beats a report that implies a clean run.

## Restarting an interrupted loop

When told to restart (or resume, or continue) a Gauntlet Loop, don't start
over. Reconstruct state first:

1. Read whatever durable status note exists in the repo (Step 5) and recent
   git log on the working branch.
2. Check for per-piece status files if any builder was mid-round when things
   stopped (Step 3) — they tell you the exact last checkpoint, not just "some
   work happened."
3. Classify every piece: done-and-verified / done-but-uncritiqued /
   in-progress-with-a-checkpoint / never-started / blocked-and-why.
4. Resume from there — critique pieces waiting on a critic, finish pieces
   with a partial checkpoint, start pieces that never got going. Don't re-fan
   pieces already integrated and verified.
5. If the interruption was a resource limit, run one small piece as a canary
   before fanning out broadly again — confirm the limit is actually clear
   rather than immediately re-triggering the same failure at scale.

## Implementation patterns

Concrete, copy-pasteable techniques (screenshot verification without a browser
GUI, embedding large images into a progress page without blowing out your own
context, the worktree-integration bisection technique) are in
`references/patterns.md` — read it when you're actually executing a loop, not
needed just to understand the workflow above.
