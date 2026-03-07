# Cherry-Pick Brief: Superpowers Patterns into PM Vibecoder's Toolkit

## WHY

AI coding agents fail in two predictable ways that hurt non-engineers most:
1. They claim "done" without evidence, and PMs can't independently verify
2. They thrash on bugs with random fixes, burning tokens and introducing new problems

The PM Vibecoder's `verify-implementation` skill already covers #1 well. But Superpowers has battle-tested anti-circumvention patterns that would make it harder for the model to weasel around the rules. And there's no debugging discipline skill at all for #2.

This brief covers two targeted cherry-picks -- not wholesale adoption.

---

## Cherry-Pick 1: Anti-Rationalization Armor for `verify-implementation`

### What Superpowers Has That You Don't

Your skill has the right philosophy and good reference files. But Superpowers adds three enforcement mechanisms your skill lacks:

**A. Rationalization Prevention Table**

Superpowers includes an explicit excuse-busting table inline in the skill (not in a reference file). This matters because skills load into context -- reference files may not. The table format forces the model to pattern-match its own behavior against known evasions:

```
| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence != evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter != compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion != excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |
```

Your `speculation-red-flags.md` covers similar ground but lives in a reference file that may not load. The table should be inline in SKILL.md.

**B. The "Spirit Over Letter" Anti-Gaming Rule**

Superpowers explicitly states: *"Violating the letter of this rule is violating the spirit of this rule."* And includes the rationalization "Different words so rule doesn't apply" -> "Spirit over letter." This blocks the model from paraphrasing its way around the rules -- a failure mode your current skill doesn't address.

**C. Agent Delegation Verification**

Superpowers specifically calls out that trusting a subagent's success report is NOT verification. The required pattern is:

```
Agent reports success -> Check VCS diff -> Verify changes -> Report actual state
```

This is relevant to your toolkit because `/execute-ticket` dispatches multiple agents. If the orchestrator trusts agent reports without independent verification, the same problem surfaces at a higher level.

### Recommended Changes to `verify-implementation/SKILL.md`

1. **Add a Rationalization Prevention section** (inline, not in references) with the excuse/reality table. Merge your best red-flag phrases with Superpowers' excuse table into one inline block
2. **Add the "spirit over letter" statement** near the top, after "Every status claim requires proof"
3. **Add an Agent Delegation subsection** under Evidence Requirements specifying that subagent success reports require independent VCS/output verification
4. **Promote 3-5 key phrases from `speculation-red-flags.md` into the main SKILL.md** -- the reference file is good supplementary material, but the highest-signal patterns should be inline where they always load

### What NOT to Change

- Keep the PM-specific framing ("Why This Matters for PMs") -- Superpowers doesn't have this and it's a strength
- Keep the Accountability Standard (traceable, repeatable, auditable, trustworthy) -- unique to your toolkit
- Keep the reference files as supplementary material -- just ensure the critical patterns are also inline
- Don't adopt Superpowers' tone of "honesty" and "lying" -- your skill already makes the point without the adversarial framing

---

## Cherry-Pick 2: New Skill -- `systematic-debugging`

### What's Missing

Your toolkit has no debugging discipline skill. When the AI hits a bug, there's nothing preventing it from guessing at fixes, stacking changes, or thrashing for 30 minutes before surfacing the problem to you.

### The Key Pattern: 3-Fix Architectural Stop

This is the single most valuable pattern from Superpowers' debugging skill. The rule:

> If 3+ consecutive fix attempts fail, STOP. Do not attempt Fix #4. Instead:
> 1. Question whether the architecture/pattern is fundamentally sound
> 2. Check if you're "sticking with it through sheer inertia"
> 3. Surface the problem to the user before proceeding

**Indicators of an architectural problem (not just a bug):**
- Each fix reveals new shared state, coupling, or problems in different places
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

This matters for non-engineers because you can't tell from the outside whether the AI is making progress or thrashing. This rule forces the AI to escalate before burning more time and tokens.

### The 4-Phase Process (Adapted for PMs)

Superpowers uses a 4-phase debugging process. Adapt it with PM-appropriate framing:

| Phase | What the AI Does | What You See |
|-------|-----------------|--------------|
| 1. Root Cause Investigation | Reads errors, reproduces bug, checks recent changes, traces data flow | AI reports what it found, not what it guesses |
| 2. Pattern Analysis | Finds working examples in codebase, compares against broken code | AI explains the difference between working and broken |
| 3. Hypothesis & Test | Forms one theory, makes smallest possible change to test it | AI states its theory clearly before changing anything |
| 4. Implementation | Creates failing test, implements single fix, verifies | AI shows before/after evidence (ties back to verify-implementation) |

### Anti-Rationalization Table for Debugging

```
| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too |
| "Emergency, no time for process" | Systematic is FASTER than thrashing |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right |
| "I see the problem, let me fix it" | Seeing symptoms != understanding root cause |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Escalate |
```

### Recommended Implementation

Create `skills/systematic-debugging/SKILL.md` with:

1. **Trigger description**: Activate on any bug, test failure, unexpected behavior, or build failure
2. **The Iron Law**: No fixes without root cause investigation first
3. **4-phase process** with the PM-friendly table above
4. **3-fix architectural stop** as a hard gate with the escalation pattern
5. **Anti-rationalization table** inline
6. **Cross-reference** to `verify-implementation` for Phase 4 evidence requirements
7. **Reference file**: `references/root-cause-tracing.md` for the detailed backward-tracing technique (optional, lower priority)

### What NOT to Copy

- Don't require TDD for the debugging test case -- your toolkit's `testing-philosophy` skill already handles test approach. Just require "demonstrate the bug exists, demonstrate it's fixed"
- Don't reference Superpowers skills (`superpowers:test-driven-development`) -- reference your own skills
- Don't copy the multi-component diagnostic instrumentation examples verbatim -- they assume engineering knowledge. Simplify to "the AI will add logging to find where the problem is"

---

## Priority Order

1. **Cherry-Pick 1** (verify-implementation upgrades) -- lower effort, immediate value, strengthens an existing skill
2. **Cherry-Pick 2** (systematic-debugging new skill) -- higher effort, high value, fills a real gap

## Validation

After implementing, test each change against these scenarios:
- Ask the AI to implement a feature, then check if it claims "done" without running tests
- Introduce a deliberate bug and see if the AI follows the 4-phase process or jumps to guessing
- Have a subagent complete a task and check if the orchestrator independently verifies the result
