# Gauntlet Loop — implementation patterns

Concrete techniques that worked running this loop for real, worth reusing
rather than rediscovering next time.

## Status file shape

Keep it to what a resuming session actually needs — don't over-engineer this:

```json
{"piece": "terrain", "round": 1, "status": "awaiting-critic", "note": "procedural micro-normal + per-substrate roughness shipped"}
```

`status` enum worth standardizing across a loop: `modeling` / `wiring` /
`verifying` / `awaiting-critic` / `revising` / `done` / `blocked`. Write this
file after *every* transition, not just at round end — the value of the file
is entirely in it reflecting the last real checkpoint if the agent dies one
step later.

Put status files somewhere all agents in the session can reach regardless of
which git worktree they're in — a scratchpad/tmp path outside the repo works
well, since worktrees are separate checkouts but usually share the same
container filesystem outside git.

## Screenshot verification without a browser GUI

Commit this as a repo script, not a scratchpad file — see SKILL.md Step 5.
On a developer machine, prefer `playwright-core` pointed at the system Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS) over
`playwright`, which downloads its own ~150 MB browser.

**Measure the screenshot, not the live canvas.** The obvious approach —
`gl.readPixels` on the page's WebGL canvas — returns **all zeros** whenever the
renderer was created without `preserveDrawingBuffer`, because the backbuffer is
cleared once the frame composites. The tell is every region reporting 100%
clipped-black. Screenshot first, then decode that PNG in-page via an `Image`
and a 2D canvas, and measure there.

Two more traps that cost real time here:

- **`page.evaluate` with a string does not bind arguments.** Passing a real
  function instead fails differently under `tsx`, which injects esbuild's
  `__name` helper into the function source — the browser then throws
  `ReferenceError: __name is not defined`. Simplest fix that works in both:
  build a self-invoking expression string with the argument already inlined
  via `JSON.stringify`.
- **Comments inside a GLSL template literal cannot contain backticks.** Writing
  `` `mix(1.0, a, b)` `` in a shader comment terminates the JS template string
  and produces a parse error far from the apparent cause. It surfaces as a
  blank/error page and suspiciously uniform pixel stats.

Headless Chromium is commonly pre-installed in agent sandboxes but not always
on `$PATH` in a way `playwright install` expects — check for an existing
binary before trying to download one (a download often isn't possible/allowed
anyway). Pattern that worked:

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/path/to/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:PORT/', { waitUntil: 'load' });
  await page.waitForTimeout(2500); // let the scene/app settle
  await page.screenshot({ path: 'out.png' });
  await browser.close();
})();
```

If the `playwright` package isn't in the project's own `node_modules`, check
whether it's installed globally and point `NODE_PATH` at it rather than adding
a new dependency to the project just for verification.

**Give every parallel dev server its own port, explicitly.** Shell `cd`
persists across lines within one tool call — a copy-pasted block of `cd DIR &&
start-server` commands for N different worktrees is a common way to
accidentally start two servers in the same directory and one nowhere, because
a line without its own `cd` inherits whatever directory the previous line left
you in. Verify with `ps aux | grep <port>` and check the working directory in
the process list, don't just trust the port didn't collide.

## Embedding screenshots in a progress page without burning your own context

A screenshot's base64 encoding can be hundreds of KB of text — reading that
through your own context window (e.g. via a file-read tool) to then write it
into an HTML file is enormously wasteful and adds up fast across multiple
images and multiple rounds. Instead, keep the binary data out of your context
entirely: write the HTML in two (or more) text fragments split exactly where
each image's data URI goes, and concatenate them with the base64 file via
shell redirection:

```
cat part1.html image1.b64 part2.html image2.b64 part3.html > page.html
```

`part1.html` ends mid-attribute (`<img src="data:image/png;base64,`),
`part2.html` starts with the closing quote. You only ever read/write the text
fragments yourself; the image bytes flow through the shell, never through your
own context.

## Worktree integration — the staleness trap

When multiple builders work in parallel worktrees branched at different times
from a moving base branch, an agent that branched *before* a shared foundation
change (Step 2 of the main skill) will have code that's silently stale against
that foundation — not broken in isolation, wrong once integrated. Concretely
hit: a shader hardcoded a light direction as a literal constant, correct for
the foundation that existed when the agent's worktree was created, wrong (and
rendering as near-black) once integrated against a foundation whose lighting
had since changed.

Before trusting a partial diff:
1. `git log --oneline -3` in the worktree — check what base commit it's
   actually built on vs. the current tip of the working branch.
2. If it predates a foundation change other pieces also depend on, specifically
   grep the diff for any hardcoded values that *should* be derived from that
   foundation (light directions, color constants, size/scale assumptions) —
   these are exactly the kind of thing that typechecks and passes tests while
   still being visually wrong.
3. Recompute the correct constant against the *current* foundation code
   directly (e.g. run the actual function that produces it) rather than
   estimating by hand — small angular/color errors are easy to get wrong by
   eye and hard to spot in a diff review.

## Diagnosing "changed a parameter, nothing visibly happened"

If a meaningfully large parameter change produces little to no visible
difference in output, don't conclude the parameter doesn't matter — check
whether you're deep in a compressive/clipping region of whatever pipeline sits
downstream (tone mapping, normalization, a clamp) where inputs far from the
edge of the visible range all collapse to roughly the same output. Confirm by
trying a much more extreme value; if that *does* move the output, you've
confirmed the mechanism and just needed a bigger step, not a different lever.
