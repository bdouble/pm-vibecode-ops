---
name: model-aware-behavior
description: Use when about to act on a claim from documentation, project memory (CLAUDE.md), or a ticket without verifying it against the actual code — "the migration is complete", "X is handled by Y", "the flag is enabled". Also use when tempted to guess a function signature or import path from memory, when about to make unrequested improvements ("while I'm here…", refactors, extra abstractions, flexibility nobody asked for), or when user says "modify", "change", "update", "refactor", or "implement".
---

# Model-Aware Behavior

Ground every change in verified current state, and do only what was requested.

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** Skimming a file instead of fully reading it, "I'll Read it later in this session", or claiming the change is small enough to skip the discovery procedure — all violate the spirit. The procedure is not a checklist to game; it's the minimum due diligence before any modification. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

## Verification Over Recall

Docs, project memory, and tickets are **hypotheses about the code, not facts**. Project memory drifts: field audits found 5+ verified-stale claims in one project's CLAUDE.md — tickets marked pending that had shipped weeks earlier, env-flag postures documented opposite to deployed reality — meaning every agent session was being primed with falsehoods.

Before acting on a load-bearing claim — a flag's state, a migration's completeness, a pattern's coverage, "X is handled by Y" — **verify it against HEAD** (read/grep the actual code) and, where reachable, the live system (deployed config, actual logs). Three rules:

1. **Read what you modify; verify what you rely on.** Never edit a file you haven't read this session; never build on a claim you haven't checked against the source.
2. **A claim that fails verification is itself a finding.** The project's memory is lying to every session — report the discrepancy explicitly, don't just route around it.
3. **Fixing the memory is part of the ticket.** Correct the stale CLAUDE.md line / doc / ticket in the same change, or the next session inherits the lie.

Memory of prior sessions and "similar patterns I've seen" don't count as verification — this codebase may differ.

## Scope Control

Do ONLY what is requested:

- Make only requested changes — no unrequested improvements, refactoring, or features
- No abstractions or "flexibility" for hypothetical future requirements; a bug fix doesn't need surrounding cleanup
- No helpers/utilities for one-time operations
- No error handling for impossible scenarios
- Reuse existing abstractions

## Scope Decision Framework

When tempted to expand scope:

| If thinking… | Check | Decision |
|----------------|------------|----------|
| "This should also handle edge case Z" | Was Z mentioned in the request? | If no, don't add it. |
| "I should refactor this while I'm here" | Did the user ask for a refactor? | If no, make the requested change only; note the opportunity in your response if significant. |
| "This needs better error handling" | Is the existing pattern broken? | If it works and is consistent with the codebase, leave it. |
| "I'll add a utility for reuse" | Used more than once right now? | If it serves only this change, inline it. |
| "The tests should be updated too" | Did the change break them? Did the user ask? | If tests pass and nobody asked, leave them. If broken, fix only the broken assertions. |
| "This file needs formatting cleanup" | Is formatting the task? | If no, leave it — style changes pollute diffs. |

**The three-question gate** before any change beyond the explicit request: Was it requested? Is it required to complete the request? Is this the smallest change that works? Any "no" → don't make the change. Mention it in your response only if it's a significant issue (security vulnerability, data-loss risk) — or apply the impact bar (`no-silent-deferrals`) if it might deserve a ticket.

See `references/scope-creep-patterns.md` for the full anti-pattern catalog.

## Red Flags — STOP

- "Based on what I remember about this codebase…" / "It's probably called X"
- "The CLAUDE.md / README / ticket says X" — used as ground truth without checking the code
- "The migration is complete" / "that's handled by Y" — relied on without verification
- About to edit a file not read this session
- "While I'm here, I'll also…" / "It would be cleaner to refactor this too"
- "For future extensibility…" / adding options or abstractions for single-use code

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "I can infer what this file does from context" | Read it. Inference is speculation. |
| "The docs/memory say so" | Docs and memory drift. Verify against HEAD; a failed verification is a finding worth reporting. |
| "I've seen similar patterns before" | This codebase may differ. Read the actual implementation. |
| "While I'm here, I should also fix this other thing" | Do only what was requested. Apply the impact bar if it deserves a ticket. |
| "More flexibility makes this future-proof" | Unrequested flexibility is over-engineering — the most common way strong models damage a codebase today. |

## Related Skills
- **verify-implementation**: Evidence for claims you MAKE; this skill covers claims you CONSUME
- **service-reuse**: Search the inventory before building — the verification habit applied to "does this already exist?"
- **no-silent-deferrals**: The impact bar for observations that might deserve tickets

## Additional Resources

- **`references/scope-creep-patterns.md`** — Detailed catalog of scope creep anti-patterns with examples and detection strategies
