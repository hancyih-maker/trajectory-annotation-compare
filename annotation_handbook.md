# Annotation Handbook
**Multi-agent LLM failure attribution** · prompt v6

---

## The Four Labels

| Label | When to use |
|---|---|
| **Critical** | Root cause of the final failure. Fixing only this step would likely fix the output. Every failed trajectory must have at least one. Always include a sub-type. |
| **Error** | Contributes to failure but is not the root cause. Often downstream propagation of a Critical step. Fixing alone may be insufficient. |
| **Warning** | Redundant or wasteful action — 3rd+ repeated search, extra coordinator round, slightly imprecise answer. No new failure introduced. |
| **Informational** | Correct and necessary. Should remain unchanged during optimisation. A step can be decisive for success and still be Informational. |

> **Key distinction:** "Critical" means critical *error*, never critical *importance*. A correct step, even a decisive one, is always Informational.

---

## Decision Flowchart

**Step 0 — Check the step type first**
- `think` → apply Think Step Rules below
- `answer` / `final_answer` → label on output quality only; Warning due to search count is forbidden
- `search_and_info` → repeated-query rules apply
- `coordinator_thinking` / `expert_call` → continue to Step 1

**Step 1 — Did something go wrong?**
- No → **Informational** (if necessary) or **Warning** (if redundant)
- Yes → Step 2

**Step 2 — Is this the root cause? Would fixing only this step likely fix the final output?**
- Yes → **Critical** + sub-type
- No → Step 3

**Step 3 — Did it contribute to the final failure?**
- Yes → **Error**
- No → **Warning** (wrong but inconsequential)

> **Pro tip:** Work backwards. Read the final answer first, confirm it's wrong, then trace back to find the earliest step where something went wrong — that's your Critical.

---

## Search & Info Rules

| Occurrence | Label |
|---|---|
| 1st search returns irrelevant docs | **Error** |
| 2nd search — identical query, no strategy change | **Error** |
| 3rd+ search — same query repeated | **Warning** (pure waste) |
| Repeated search returns noisy/misleading docs causing wrong answer | **Error** or **Critical** (not Warning) |
| Repeated query that looks "correct" | Still **Warning** — repetition count alone determines this |

---

## Think Step Rules

- **Rule A** — Almost never Warning. Thinking wastes no external resource. The search that follows may be Warning, but the thought is not.
- **Rule B** — Label on reasoning content, not on adjacent searches.
- **Rule C** — When in doubt, default to **Informational**. If the reasoning is not demonstrably wrong, it's Informational.
- **Rule D** — Think steps inside a Warning search loop are **Informational**. The Warning belongs on the `search_and_info` step, not the `think` step between them.

```
Pattern in a repeated-search loop:
  [sN]   (search_and_info)  same query          →  Warning       (wasteful action)
  [sN+1] (think)            "I'll try again"    →  Informational (reasoning is fine)
  [sN+2] (search_and_info)  same query          →  Warning       (wasteful action)
  [sN+3] (think)            "Still no results"  →  Informational (correct interpretation)
```

---

## Coordinator Rules

### Mid-trajectory transitions
| Situation | Label |
|---|---|
| Correct sub-task framing and assignment | **Informational** |
| Wrong sub-task or wrong expert — introduces new failure | **Critical** (Task decomposition or Expert Assignment) |
| Extra round caused by prior expert failure | **Warning** (wasteful overhead, not a new error) |

### Final answer / final coordinator step
| Situation | Label |
|---|---|
| Had enough correct info from experts but still produced wrong answer | **Critical** (Response Process) |
| Introduced a new incorrect factor not in any expert output | **Critical** (Response Process) |
| Merely propagated a prior expert error without adding a new mistake | **Error** |

### Cascade failures
Only one step is the root Critical. When a coordinator introduces a false framing, everything downstream that follows it is Error, not Critical. Only assign a second Critical if a genuinely new and independent failure is introduced.

---

## Sequential vs Parallel Chains

**Sequential** (each expert call depends on the previous):
- An error early propagates to all downstream steps
- Downstream steps following the wrong assumption → **Error**
- Typically one Critical (root) + multiple Errors (propagation)

**Parallel** (coordinator dispatches independent sub-questions):
- An error in expert A does not affect expert B's independent branch
- Expert B's steps can be **Informational** even in a failed trajectory
- Evaluate each branch independently

---

## Precision Failures

When the answer is factually reasonable but too coarse (e.g. "Mongolia" instead of "Khamag Mongol", "Wilhelm Röntgen" instead of full name):
- `answer` and `final_answer` → **Warning**
- Upstream reasoning that was logically correct → **Informational**
- Do not label the coordinator's correct identification as Critical

---

## Common Pitfalls

| Wrong | Right |
|---|---|
| Labelling a correct coordinator step Critical because it was "important" to success | Correct + necessary = Informational, always |
| Labelling think steps Warning because nearby searches are Warning | Think steps in Warning loops are Informational |
| Multiple Critical labels in a single cascade | One root Critical — everything downstream following the same mistake → Error |
| Labelling a precision failure (too coarse, not wrong) as Error or Critical | Precision failures → Warning throughout; upstream reasoning → Informational |
| Labelling an `answer` step Warning because nearby searches were repeated | Answer steps are never Warning due to search count |

---

## Critical Sub-types Reference

Every Critical label must include one of these sub-types in parentheses.

**Coordinator-level** (`coordinator_thinking`, `expert_call`, `final_answer`):
- `Centralized Agent — Task decomposition`
- `Centralized Agent — Subtask Generation`
- `Centralized Agent — Expert Assignment`
- `Centralized Agent — Response Process`

**Expert-level** (`think`, `search_and_info`, `answer`):
- `Expert Agent — reasoning`
- `Expert Agent — interaction`
- `Expert Agent — communication`

**Example format:**
```
coord_r1: Critical (Centralized Agent — Task decomposition) | Hallucinated Doctor Who framing not present in the question.
```

---

*For internal use — annotation team · prompt v6 · who&when benchmark*
