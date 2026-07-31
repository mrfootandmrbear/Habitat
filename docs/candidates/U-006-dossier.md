# U-006 — Field Notebook bounded causal explanation

**Status:** Locked 2026-07-31 — answers a question already had  
**Criterion (verbatim).** Every sentence the notebook emits is traceable to a specific simulated contributing condition, and a reviewer can locate that state. Sample the emitted corpus, not a curated example.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| MVP question set | `what-changed`, `what-contributed` only | `docs/slices/notebook-composition.md` |
| Event vocabulary | flooded / seeping / burned / colonized / recovered / limited (`fragmented` deferred) | same + `src/notebook/corpus.ts` |
| Scale + uncertainty | preserve-scale answers; contributed lines use “Likely — …” hedge | `src/notebook/FieldNotebook.ts` |
| Corpus traceability | Every emit sentence has `traces[]` + `visibleWhen`; `corpusAllTraced() === true` | `src/notebook/notebook.test.ts` |
| Write isolation | `notebookObserver.writes === []`; answer after freeze leaves `stateHash` unchanged | same |
| RNG isolation | notebook modules contain no `Math.random` / sim RNG | same |
| Chrome | Starts closed; Notebook toggle; Tier-P present proxy | `src/ui/notebookChrome.ts` |

**Notebook seed.** The ground still held water where the hollow stayed wet.

**Slice.** Field Notebook UI (`docs/slices/notebook.json`).

## Owner / reviewer half

Sample sentences the notebook emits after play (not only the static corpus file). For each sentence, locate the contributing field state.

**2026-07-30 stewardship sitting:** owner did **not** answer Q-D.  
**2026-07-31:** owner answered — **yes**, answers existing question → **Lock**. Register v2.0.12.

## Owner-only question

After something on the map changed, did opening the notebook feel like answering a question you already had — or like the game explaining itself first?

**Owner 2026-07-31:** **Yes** → **Lock**.
