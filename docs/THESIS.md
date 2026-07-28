# Habitat — Thesis

> **Status:** Owner-authored source document (2026-07-28)
> **Role:** Where Habitat came from and what it is trying to feel like — the seed the decisions serve
> **Authority:** Not a governing document. The [Decision Register](DECISION_REGISTER.md) remains the constitution and wins any procedural conflict. But a conflict between this document and a register entry is a signal to revisit the entry, not to quietly ignore the thesis.

---

## 1. Where it came from

Habitat started with **terrain editing in RCT3 sandbox mode**. Sculpting a landscape freely, no objectives, no economy — and then a wish: *I would love for water to naturally trickle down this mountain and form pools.* That wish led to curiosity about the natural processes that would actually make it happen, and the curiosity became this project.

The other half of the impulse: watching people post projects that **materialize as they are built** — a thing coming into existence and running, in public. The question that produced Habitat was *what would I materialize, if I could?*

Both halves matter. The first is what the simulation is for. The second is why visible existence beats internal correctness whenever they compete for the same afternoon.

---

## 2. The analogy

**Building a digital sand castle and seeing what happens to it as life and nature have their way with it.**

This is more exact than "aquarium" or "terrarium," and the difference is worth stating. A terrarium is something you keep alive; the reward is persistence. A sand castle is something you build knowing the tide is coming; the reward includes the undoing. You are not the caretaker of the system. You are a person with a bucket, and the tide is larger than you.

When you build a sand castle you are already thinking about how tides and gravity work, and about how animals might move in. That anticipation *is* the play. The building is a hypothesis about forces.

The idea is scale-invariant: it reads the same at continental scale and at the scale of a tide pool. Scale changes quantity, not rules (DESIGN_WIKI). The current engine is terrestrial — heightfield hydrology — so reefs are a property of the thesis, not a roadmap item.

### 2.1 A *living* sand castle — and what the sand is

Two refinements that carry weight (owner, 2026-07-28):

**The castle becomes alive.** The good end state is not "it survived the tide." It is that the thing you built stopped being inert. Plants take the berm, roots hold what water was pulling apart, and the structure now meets the next storm as something living rather than as a pile. Thriving *is* the castle coming alive.

This is not aspirational — **it already runs**. Slice 6 gives vegetation → roughness and infiltration → water, and Slice 8 gates erosion on cover, which together mean a vegetated berm and a bare one already face the same rain differently. The mechanism has existed since the sim MVP and has never been *shown* to anyone. That is the whole argument for Slice 8c.

**The sand is every substrate nature has to work with.** Not literal sand: soil, clay, gravel, rock, organic matter — the materials a landscape is made of, each behaving differently under the same forces. Sand drains and slumps; clay holds water and holds its shape; rock resists and outlasts; organic matter accumulates and feeds. A castle built of one is not a castle built of another, and that difference is a large part of what makes rebuilding interesting.

Today the model has **one undifferentiated soil** — depth and moisture, with bedrock derived as `elevation − soil.depth` (SIMULATION_MODEL §3.1). The concept is already sanctioned by the register: S-006 says geological history establishes the substrate ecology inherits, and the tools entry already lists substrate among the things a player influences. What is missing is that the substrates differ. Filed as **C-009**.

A consequence worth naming: if sand is substrate, then **digging moves material**. A dig should displace mass, not just lower a number — which turns the open BUILD_GUIDE §4.1 item on berm/dig ↔ `soil.depth` from hygiene into a thesis requirement.

**The analogy is about shapability, not about sand.** Do not chase 3D falling-sand games. What carries over is *something shapable, made of different substrates, under adjustable natural forces* — not granular material simulation, and not a lattice of elements with invented behavior. See §2.2, which is the reason why.

### 2.2 The contract: real-world intuition is the instrument

**The player's own knowledge of how the world works is the thing being tested.**

You already know that water runs downhill and pools in hollows; that sand drains and slumps while clay holds; that a steep bare slope goes first; that plants take hold where it stays damp; that roots hold a bank together. Habitat's job is to be honest enough that **you can bet on what you already know and find out whether you were right.**

That is the actual reason the simulation is realistic. Not fidelity for its own sake, and not education — realism is what makes everyday intuition a **valid instrument** inside the game. The moment the world behaves in a way that has no real-world referent, the instrument stops working and the player is reduced to learning arbitrary rules.

This is the sharp line against the falling-sand family. Those games are learned from the inside: you discover that *their* powder does *this* when it touches *that*, and the pleasure is mastering an invented rule set. Habitat inverts it — **nothing should need to be learned that a person doesn't already know**, and the reward is finding your existing understanding confirmed, or productively wrong.

Consequences worth holding:

- **No invented materials or forces.** Every substrate and every dial must have a real-world referent a person can reason about (**C-011**, N-004).
- **No physics tutorial.** If the world needs to teach how water moves, either the encoding is failing or the model is doing something unreal. The instruction belongs to the interface, never to the ecology.
- **Being wrong must be informative, not arbitrary.** A surprise should resolve into "oh — the ground was already saturated," never into "that's just how this game works" (S-004, N-004).
- **This is what P-006 is measuring.** Commit-and-compare is not a study aid bolted onto a simulator; it is the mechanism by which the contract is tested, one prediction at a time (§6).
- **It is also the honest ceiling on simplification.** U-002 permits simplifying presentation, not ecological truth — because the truth is precisely what the intuition is being tested against.

---

## 3. What "restoration" means here

**Founding is the method. Damage may be the situation.**

The goal is to *set something up that will thrive* — and the test is whether it carries on without you. The register already contains this as a rule: **G-005**, completion measured by a persistence window. Did it keep going on its own.

That is a statement about *how* the player acts, not about what condition the land starts in. A ruined site is a perfectly good starting condition. What the player never does is repair it directly — no scrubbing, no placing a finished wetland. You route water, you shape ground, you set the forces, and the recovery is something the system performs. Repair is an **outcome nature produces**, never an action the player takes (D-001, N-001).

So read "restoration" as founding-for-thriving. It does not mean the land starts healthy.

### 3.1 Scenarios — where the damage lives

The sandbox is the sand castle: no objective, mess with it, watch. **Scenarios put the same loop into a situation with a finite objective** (G-002, Locked).

The motivating premise, and the reason much of the older documentation speaks in restoration language: **clean up a toxic waste site using natural processes.** You cannot dig the poison out. You establish the conditions under which the landscape processes it — hydrologic isolation so it stops spreading, plants that take it up, wet ground where it breaks down, time. Then you run time forward and find out whether you were right.

That premise is the thesis under load, not an exception to it:

| Thesis element | How the toxic site expresses it |
|---|---|
| Build the form | Grade, berm, and channel to control where contaminated water goes |
| Choose the forces | Rain regime decides whether you are flushing or concentrating the problem |
| Run time, then look | Remediation is decadal; fast-forward is the only way to see it |
| Nature takes what you built | Your containment erodes if you built it wrong |
| **Life moves in** | The readout of success — something arrives because the place finally suits it (**C-007**) |
| Persistence | It counts when it keeps going after you stop (G-005) |

It is also the natural home for two Locked entries with nothing to stand on yet. **S-007** (hysteresis is fundamental) and **S-008** (hysteresis must be legible) both describe a legacy condition blocking recovery after its cause is gone — which is exactly what a contaminant load is. S-008's promotion criterion asks whether a viewer can say *which historical condition is blocking*. A toxic site is the cleanest possible test of that, and it is currently unbuildable because no legacy-damage field exists beyond `soil.porosity`'s compaction memory.

Scenarios remain post-MVP (MVP_SCOPE §5). Recording the premise now matters anyway, because it constrains the substrate design: see **C-010**.

---

## 4. The loop

```
build the form  →  choose the forces  →  run time  →  look
                        ↑                              │
                        └──────── change them ─────────┘
```

**Phase one is sculpting.** Tactile, abundant, RCT3-style. You shape land. This is a cause, not an outcome — the water still decides what happens, and no ecosystem is ever painted (N-001).

**Phase two is not more sculpting.** After the initial build, the player's verb is **controlling which forces are at work and how hard** — rainfall regime, erosion, fire, season, time itself. You do not direct results; you set the conditions and find out. This is the axis the register has never recorded: every existing intervention entry (A-005, A-006) describes acting at a *place*. Force control acts on a *process*.

**Running time is an instrument, not a convenience.** Fast-forward is the tide coming in. It is how you get from the thing you made to what became of it, which resolves the standing question of whether fast-forward is "skipping work" or "choosing attention" — it is neither; it is the mechanism of the payoff.

**Then you change the forces and run it again.** Same castle, more rain. That comparison is the experiment the whole thing exists to run.

---

## 5. The two payoffs

A sand castle gives you both, and Habitat should too:

| Payoff | What it looks like | Build status |
|---|---|---|
| **Nature takes what you built** | Berms slump, channels incise, pools silt, walls wash out | Slice 8 geomorphology exists — and is **invisible** to a player. Its legibility question was deferred. |
| **Life moves into it** | Something arrives because the conditions suit it — you dug the moat, the moat got tenants | Not built. This is what the limiting-factor / HSI spine is *for*. |

The second one reframes the biological half of the register. Its entries are **introduction**-shaped (E-007 attemptable roles, E-008 role resolution, RC-003 failed-introduction consequence). Nobody introduces crabs to a sand castle moat. You dig the moat and something shows up, or it doesn't, and the answer is in the conditions. **Arrival, not introduction**, is the primary biological verb — which is D-001 more purely than introduction ever was.

---

## 6. What the player is thinking about

The prediction habit is not a feature bolted onto this; it is the mental activity the whole thing is made of. *I think the water will cut through here. I think this wall goes first. I think something will move into that hollow.* Then you run time and find out.

That is **P-006** commit-and-compare, already built and mechanically proven. Its unproven half — whether committing a prediction actually changes what a person does next — is the thesis question, not a bookkeeping promotion.

---

## 7. Determinism is a feature, not just hygiene

"Same castle, different forces" requires forking one world and running it twice. That makes **branch-and-compare a core instrument**, not the deferred convenience it is currently filed as (F-002, F-005 Deferred; P-005 hypothesis-Current).

The expensive prerequisite is already built. **T-001** determinism means any run is reproducible from a seed plus its force settings — which also makes a run *shareable*: a short string that regenerates the exact landscape and the exact storm that took it. For a project whose second impulse was watching things materialize in public, that is not a technical nicety. It is the artifact.

---

## 8. The showability standard

Because the origin impulse was *materialization*, there is a test that needs no playtest session, no probe, and no owner afternoon:

> **The 20-second clip test.** Could you record twenty seconds of Habitat — build something, run time forward, watch water and life have their way with it — that reads to a stranger with no explanation and makes them want to try it?

If yes, the project has arrived, whatever the ladder says. If no, the next slice is whatever moves that clip closest to existing — and it is almost never a new system.

This is a self-check the owner can run alone, at any time, in twenty seconds. Use it to order work.

---

## 9. Boundaries this thesis keeps

- **Regimes and pulses, not smiting.** You set the rainfall; you site an ignition. You do not drag a storm onto a hill you dislike. Force control must not become god-mode targeting, or D-001 and N-001 both die.
- **Terrain is a cause; ecosystems are not painted.** Sculpting freely is fine. Placing a finished wetland is not (N-001).
- **No score, no win.** Sandbox continues (G-001). Thriving is observed, not tallied (N-002).
- **Abundance in sculpting; scarcity in ecological time.** RC-004 already rejects an action economy — the constraint is what time does, not how many clicks you get.

---

## 10. Open questions this thesis raises

Filed as candidates in [DECISION_REGISTER.md](DECISION_REGISTER.md) §16.5 — none of them Locked, none to be implemented as settled policy:

| ID | Question |
|---|---|
| **C-004** | Force control as an intervention axis distinct from spatial siting |
| **C-005** | Branch-and-compare as a core instrument rather than a deferred tool |
| **C-006** | Sculpting is abundant; scarcity lives in ecological time |
| **C-007** | Arrival / colonization as the primary biological verb |
| **C-008** | Intervention → visible response budget (the RCT3 immediacy constraint) |
| **C-009** | Substrate differentiation — sand, clay, rock and organic matter behaving differently under the same forces |
| **C-010** | Legacy substances (contaminant load) — the toxic-site scenario premise, and the missing substrate for S-007 / S-008 |
| **C-011** | Real-world intuition is the instrument — no invented materials or forces; nothing to learn that a person does not already know |

---

## 11. Document role

| Document | Owns |
|---|---|
| **This file** | Where Habitat came from; what it is trying to feel like; the showability standard |
| [DECISION_REGISTER.md](DECISION_REGISTER.md) | What is true about the product (constitution) |
| [MVP_SCOPE.md](MVP_SCOPE.md) | Which loops the first playable proves |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | How to execute a slice; the autonomous protocol |
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies what |
