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

## Step 0 — Budget shape: build inline, spawn only critics

**Read this before deciding how many agents to run.** The loop was first
written against API billing, where fanning out five parallel builders was the
obvious move. On a **Pro/Max subscription there is no API budget**, and the
economics invert: every subagent starts cold and re-derives context the main
thread already has, so wide fan-out is the *expensive* path, and usage limits
cut work off mid-round exactly the way a spend limit does.

Default shape on a subscription:

- **You are the builder.** Implement inline, in the main thread, where the
  context already lives. Do not spawn a builder agent to do work you could do
  directly — that is paying cold-start cost for nothing.
- **Spawn subagents only as critics.** This is the one role that genuinely
  cannot be done inline: grading your own output cold is precisely what the
  loop exists to prevent. A critic needs fresh context, so it must be a
  separate agent. Keep its brief small — the bar, the artifact, one question.
- **Work pieces sequentially.** One piece at a time, committed before the next
  starts. You lose the parallelism, but parallelism was buying wall-clock, not
  quality, and it was what made every Round 1 interruption so expensive.
- **Parallel worktrees are now the exception**, not the default. They only pay
  off when pieces genuinely cannot touch the same files *and* you have budget
  headroom to burn. Most rounds do not.

If you are on API billing with real budget, the original fan-out still applies
— but say which mode you are in at the top of the round, because it changes
the whole plan.

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
request real references first. **Ask the user for reference images.** They
very often have them, or can produce them in seconds, and one supplied
screenshot outranks any rubric you can write. If network access is blocked,
check whether that block is environmental rather than permanent — a cloud
container's policy is not the local machine's, and "we couldn't fetch
references" can silently persist as a fact long after it stopped being true.
Only fall back to a rubric if option 1 genuinely isn't available, and say so
explicitly rather than silently substituting a weaker bar. Log the bar
somewhere durable (a note in the repo, not just the chat) — the critic and any
future resumed session need to find it without re-deriving it.

### Confirm the bar governs what you think it governs

**A critic scoring against a mis-specified bar produces confidently wrong
direction, and it is worse than no critique at all** — it is a specific,
authoritative-sounding instruction to make the work worse, and the builder has
no reason to doubt it.

This is not hypothetical. In this project a rubric written for *physically
blended naturalism* was used to judge work whose actual target was *stylized
clarity*. The critic's headline finding was "feather the hard-edged material
boundaries" — the exact opposite of the art direction. It read as rigorous and
was wrong at the root.

So before any critic runs:

- **Get the direction from the user in their words**, not inferred from the
  code or from what the artifact currently looks like.
- **When references arrive, ask what they are references *for*.** A user
  supplying game screenshots may mean "match this colour and clarity" and not
  "match this shape language." Guessing wrong sends a whole round sideways.
  Ask which aspects govern and which do not, and write that split into the bar.
- **Re-read old findings against the corrected bar and explicitly void the
  ones that no longer hold.** Do not leave them sitting in the notes to be
  actioned later by someone who won't know.

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

## Step 4.5 — Never record an untested hypothesis as a finding

When you diagnose a cause, **test it before you write it down**, and if you
cannot test it yet, label it loudly as untested in the same sentence that
states it. A plausible mechanism written into a status note hardens into fact:
the next session reads it as established, plans around it, and can pause real
work waiting on it.

The cost is not theoretical. A round here was halted on a "leading hypothesis"
that the post-processing chain was double tone-mapping. Nobody had toggled
anything to check. On resume it took minutes to disprove on two independent
grounds — the engine does not tonemap into render targets at all, and the
symptom it was invented to explain had already been fixed by a commit that
landed an hour after the diagnosis was written. A whole round was blocked on a
guess that a ten-minute test would have killed.

Two habits that prevent it:

- **Timestamp findings, and check what landed after them.** A symptom observed
  at 01:21 may already be fixed by a 02:27 commit. If a finding predates
  intervening work, re-observe before acting on it.
- **State the disconfirming test alongside the hypothesis.** "Likely double
  tone-mapping; to check, toggle `OutputPass` and re-measure" invites the
  next session to spend ten minutes instead of replanning around it.

## Step 4.6 — Keep a domain-knowledge file, separate from status

Status notes answer *where are we*. They are the wrong home for *how does this
thing actually work*, and mixing the two loses the second kind: it gets buried
in a round's narrative, and the next session — reading for status — skims past
it and pays to rediscover it.

So keep a second durable file, in the repo, for **facts about the system being
built**: engine and library behaviour that surprised you, conventions the code
depends on but does not state, measurement techniques that work and the obvious
ones that don't, and things that look like bugs but are deliberate.

This is not bookkeeping. In one project the same handful of facts — that a sky
dome's scale parameter was a diameter, that materials skip tone mapping when
rendering to a target, that a readback returns all zeros without
`preserveDrawingBuffer` — were each worked out more than once, in separate
rounds, because the only place they had been written was a round summary.

Rules that make it worth reading:

- **State how each fact was verified**, in the entry. Untested mechanisms must
  be labelled untested in the same sentence (Step 4.5) or they harden into
  planning assumptions.
- **Record the tell**, not just the fact — "the symptom is every band reporting
  100% clipped-black" is what lets someone recognise it next time.
- **Include the deliberate non-bugs.** A critic or a builder that "fixes" an
  intentional feature costs a round, and this is the cheapest place to prevent
  it.
- **Delete entries that turn out wrong.** A stale entry is worse than none,
  because it carries the authority of having been written down.
- Point critics and builders at it in their briefs, so they inherit the
  knowledge instead of rebuilding it.

## Step 5 — Keep a live progress record

Two layers, both cheap:

- A short, durable note in the repo (what changed, why, current status per
  piece, anything interrupted or blocked) — this is what makes "restart"
  possible days later in a fresh session. Keep it distinct from the
  domain-knowledge file (Step 4.6): status ages and gets superseded, knowledge
  accumulates.
- Optionally, a visual progress page (e.g. an Artifact) updated as rounds land,
  if the work is visual — good for the user, not load-bearing for resumption
  (the repo note and git history are).

**Tooling you build to judge the work is part of the work — commit it.** A
measurement harness kept in a session scratchpad is deleted when that session
ends, and the next round pays to rebuild it before it can even start. If you
wrote a script to capture screenshots, measure pixels, or otherwise turn the
bar into numbers, it belongs in the repo with an npm script and a comment
saying what trap it exists to avoid. Prefer a dependency that uses a browser
already on the machine over one that downloads its own.

**Two sessions editing the same note will contradict each other.** Parallel
branches each appending to one status file is normal here, and neither can see
the other. On merge, do not just concatenate: read both, and if they disagree,
say which is current and why. Two independent cold critiques reaching the same
verdict is *corroboration* and worth keeping as such — but a claim like "this
was never critiqued," true from one branch's vantage point, becomes false once
both land, and will mislead whoever reads it next.

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
