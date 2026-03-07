---
name: systematic-debugging
description: |
  This skill should be used when enforcing disciplined debugging methodology. Activate when:
  - Encountering: test failures, build errors, runtime exceptions, unexpected behavior
  - User says: "it's broken", "not working", "bug", "error", "failing", "crashed", "regression"
  - User says: "why isn't this working", "what went wrong", "fix this", "debug this"
  - About to: guess at a fix, try random changes, stack multiple fixes without testing between them
  - A previous fix attempt just failed and about to try another approach
  - Tests pass locally but fail in CI, or vice versa

  Enforces root cause investigation before any fix attempt. Blocks guess-and-check debugging.
  Requires 4-phase process: investigate, analyze, hypothesize, implement. Escalates after 3 failed fixes.
---

# Systematic Debugging

## The Iron Law

**No fixes without root cause investigation first. Symptom-fixing is failure.**

When a bug appears, the instinct is to guess at a fix and try it. Resist. Systematic debugging is faster than thrashing—a methodical approach achieves first-time resolution far more often than iterative guessing.

## The 4-Phase Process

Every debugging session follows these phases in order. Do not skip ahead.

| Phase | What the AI Does | What the PM Sees |
|-------|-----------------|------------------|
| 1. Root Cause Investigation | Reads errors, reproduces bug, checks recent changes, traces data flow | AI reports what it found, not what it guesses |
| 2. Pattern Analysis | Finds working examples in codebase, compares against broken code | AI explains the difference between working and broken |
| 3. Hypothesis & Test | Forms one theory, makes smallest possible change to test it | AI states its theory clearly before changing anything |
| 4. Implementation | Creates failing test, implements single fix, verifies | AI shows before/after evidence (ties to verify-implementation) |

### Phase 1: Root Cause Investigation

Before touching any code:

1. **Read the actual error** — full stack trace, not just the message
2. **Reproduce the issue** — run the failing command, observe exact output
3. **Check recent changes** — `git diff` and `git log` for what changed
4. **Trace the data flow** — follow the error backward from symptom to source

If the bug appears deep in the call stack, trace backward through each caller until you find where invalid data originated. Fix at the source, not where the error surfaces.

### Phase 2: Pattern Analysis

1. **Find working examples** — locate similar code in the codebase that works correctly
2. **Compare implementations** — what's different between working and broken?
3. **Check dependencies** — are versions, configs, or interfaces mismatched?
4. **Study the contract** — what does the API/function actually expect vs. what it receives?

### Phase 3: Hypothesis & Test

1. **Form one specific theory** — "The error occurs because X passes Y to Z, but Z expects W"
2. **State the theory before changing code** — make the hypothesis explicit
3. **Make the smallest possible change** to validate or invalidate the theory
4. **Observe the result** — did it confirm or refute the theory?
5. **If refuted, return to Phase 1** with new information — do not guess again

### Phase 4: Implementation

1. **Demonstrate the bug exists** — show the failing test or error output
2. **Implement the single fix** — one targeted change addressing the root cause
3. **Demonstrate the bug is gone** — show the same test passing or error resolved
4. **Verify no regressions** — run the full test suite, show results

This phase connects directly to the **verify-implementation** skill. Before/after evidence is mandatory.

## The 3-Fix Architectural Stop

**If 3 consecutive fix attempts fail, STOP. Do not attempt Fix #4.**

Instead:

1. **Question the architecture** — is the underlying pattern fundamentally sound?
2. **Check for inertia** — are you sticking with an approach because you've invested time, not because it's right?
3. **Surface the problem to the user** — explain what you've tried, what failed, and why you suspect an architectural issue

### Signs This Is an Architectural Problem, Not a Bug

- Each fix reveals new shared state, coupling, or problems in different places
- Fixes require large refactoring to implement
- Each fix creates new symptoms elsewhere
- The "simple fix" keeps getting more complex

When these patterns appear, the right move is to step back and reconsider the approach — not to keep patching.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too |
| "Emergency, no time for process" | Systematic is FASTER than thrashing |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right |
| "I see the problem, let me fix it" | Seeing symptoms is not understanding root cause |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Escalate |
| "It's probably just a typo" | Verify before assuming |
| "The test is wrong, not the code" | Prove it. Run the test against known-good code |

## Process Violations — Red Flags

Stop immediately if you catch yourself:

- **Proposing a fix before tracing data flow** — you're guessing
- **Attempting a "quick fix"** — there's no such thing
- **Making multiple changes at once** — you won't know what worked
- **Skipping reproduction** — you can't fix what you can't see
- **Saying "let me try..."** without stating a hypothesis — that's guessing

## Why This Matters for PMs

Non-engineers can't tell from the outside whether the AI is making progress or thrashing. Without this discipline:

- Token and time costs escalate with no visibility
- Each random fix attempt may introduce new bugs
- The AI may report "fixed!" after a guess that appears to work but masks the real issue
- PMs have no way to know when to intervene

This skill forces the AI to **escalate before burning more resources**, giving PMs the information they need to make decisions.

## Related Skills
- **verify-implementation**: Evidence requirements for Phase 4 completion claims
- **production-code-standards**: No workarounds or temporary fixes in production code
- **testing-philosophy**: Test accuracy gates for regression tests

## Extended Resources

- `references/root-cause-tracing.md` - Backward tracing technique for deep call stack bugs

## Attribution

The 4-phase debugging process, 3-fix architectural stop, and root cause tracing technique were adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, specifically the `systematic-debugging` skill. Licensed under MIT.
