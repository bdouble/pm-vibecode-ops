---
name: no-silent-deferrals
description: Use when an agent is about to defer in-scope work — especially when saying "I'll defer this", "follow-up ticket", "TODO", "leave for later", "out of scope for this", "future work", "subsequent iteration", "next phase", "downstream", "punt to", "handle separately", "address later". Also use when writing a Deferred Items table entry, when classifying an item as AC-DEFERRED, when scope-marking acceptance criteria, or when about to advance a phase or close a ticket with known unfinished in-scope work.
---

# No Silent Deferrals

**The default disposition is: complete the work in scope.** Deferral is the most expensive disposition. It creates ticket sprawl, hidden gaps, and downstream review burden. Across the last 100+ tickets in the pm-vibecode-ops workflow, 80-90% of deferrals should never have happened — they were not catastrophic, they were not external blockers, they were just an agent reaching for the cheapest cognitive disposition.

This skill exists to shift that default. Deferral is now categorically prohibited except under narrowly enumerated catastrophic conditions, and the orchestrator will re-dispatch you with "do it now" instructions if you defer without meeting them.

**Violating the letter of this skill is violating the spirit of this skill.** Rephrasing "follow-up ticket" as "subsequent iteration", inventing a fifth catastrophic condition, declaring scope where none exists, or describing the same deferral with friendlier words is the same violation. The four catastrophic conditions below are exhaustive; the default is "do the work now."

## The Four Catastrophic Conditions (the ONLY valid deferral reasons)

A deferral is valid ONLY if it meets one of these conditions:

1. **External dependency genuinely unavailable** — a third-party API is down, a library has a known bug with no workaround, a required upstream service is offline. The unavailability must be a verifiable external fact, not your assessment of effort.
2. **Schema migration would collide with another in-flight ticket in the same tier** — concrete evidence: name the other ticket ID, name the colliding schema element, name the conflict.
3. **Required information from a human stakeholder is genuinely unobtainable in this session** — you have asked, no response is possible in-session, and the information is required to proceed correctly (not just to proceed more efficiently).
4. **The work requires a Linear ticket-level scope change (AC modification) that only the user can authorize** — the work is not in the acceptance criteria, not required to fulfill any acceptance criterion, and adding it would expand the ticket's documented scope.

If your situation does not match one of these four conditions with concrete external evidence, the disposition is **do the work now**. Difficulty, complexity, "would take a while," "is tricky," "needs more thought," "deserves its own ticket," and any other time/effort/judgment language are NOT catastrophic conditions.

## Doctrine

- **Deferral is the most expensive disposition.** Doing the work is almost always cheaper than the deferral cycle (follow-up ticket creation, context re-loading, re-review, retrofit risk, sprawl management).
- **The default disposition is: complete the work.** Deferral requires a written justification meeting one of the four catastrophic conditions.
- **If you find yourself writing "follow-up ticket" for in-scope work — STOP. Do the work now.**
- **There is no time-based or effort-based escape hatch.** The conditions above are the only gate.
- **Silent deferrals are the worst disposition.** Not completing work without surfacing it in Deferred Items will be caught at code review (SCOPE_GAP) or end-of-workflow review and re-dispatched. Save the round trip — just do the work.

## Rationalizations — STOP

If you think any of these, you are about to violate this skill.

| Excuse | Reality |
|--------|---------|
| "I'll handle this in a follow-up" | Follow-ups don't exist. Write the work now. |
| "This is out of scope for this ticket" | If it's in the ticket AC or required to fulfill an AC, it is in scope. Do it. |
| "The user can decide later" | The user has decided: do the work. Deferral interrupts their flow. |
| "This is a tech-debt concern" | Tech debt is created when work is deferred. Don't create more. |
| "This deserves its own ticket" | Ticket sprawl is the problem this skill exists to solve. Do the work in this ticket. |
| "I'll write a TODO and come back to it" | TODOs are banned. There is no "coming back" — there is only this session. |
| "This is a discovered issue, not in AC" | If it was required to make the AC work correctly, it IS the AC. Fix it now. |
| "I'm running out of context" | Context is not a catastrophic condition. Write the work now; if context truly runs out, the orchestrator will pause and resume. |
| "This is tricky and deserves more thought" | "Tricky" is not external. Either do it now or cite a catastrophic condition with evidence. |
| "It's a 5-line fix but I want to be safe" | "Being safe" means doing it. Defer-and-review is more risk, not less. |

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to violate this skill. Stop, re-read the four catastrophic conditions above, and complete the work in scope.

- "I'll handle this in a follow-up ticket"
- "Adding TODO for [anything]"
- "Out of scope for this ticket"
- "Future work" / "subsequent iteration" / "downstream"
- "Punt to" / "Defer to later" / "Address separately"
- "This deserves its own ticket"
- "This is a tech-debt concern"
- "I'm running out of context"
- "This is tricky" / "This is complex" / "Would take a while"
- Writing a Deferred Items entry without the Deferral Justification block
- Writing `AC-DEFERRED` classification when you haven't attempted the work
- Marking a phase complete with known unfinished in-scope work in your head

**All of these mean: do the work now.** If you genuinely meet one of the four catastrophic conditions, stop and write the Deferral Justification block first — never slip a silent deferral past the orchestrator.

## Required Justification Template (when deferral IS legitimate)

If your deferral genuinely meets one of the four catastrophic conditions, you MUST include the following block in your Deferred Items section, in addition to the standard table row:

```markdown
### Deferral Justification (CATASTROPHIC — required)
- Catastrophic condition: [1 | 2 | 3 | 4 from allowlist above]
- Evidence: [specific external fact, schema collision detail, or missing authorization — cite the upstream service name, ticket ID, or stakeholder]
- Confidence the catastrophic condition applies: [HIGH | MEDIUM | LOW]
- Specific blocker that prevents doing the work in this session: [factual description grounded in an external fact — not effort/time/complexity]
```

**Deliberately absent from this template:** time estimates, effort estimates, "cost to do now," "cost if deferred." Agents do not reason about clock time or coding effort well, and would use such estimates as a rationalization vector to defer in-scope work. The disposition test is purely condition-based.

If the orchestrator detects a Deferred Items entry with a `Classification` of `AC-DEFERRED` (i.e., the deferral matches an acceptance criterion) but lacks the Deferral Justification block, OR with a justification block whose Catastrophic condition value is not 1-4, you WILL be re-dispatched with explicit "do it now" instructions.

## Orchestrator Enforcement (what happens if you violate this skill)

The orchestrator validates every Deferred Items table entry against this skill at the end of each phase:

1. **Missing entry but missing work** (silent deferral): Caught at code review (SCOPE_GAP) or end-of-workflow review. Re-dispatched with the missing-work specifics.
2. **Entry present, classification `AC-DEFERRED`, no Deferral Justification block**: Re-dispatched immediately with "do it now" instruction.
3. **Justification block present, catastrophic condition outside 1-4, or evidence field empty / generic**: Re-dispatched immediately with "do it now" instruction.
4. **Justification cites condition #4 (user authorization), but fuzzy match against AC shows the item IS covered by an AC**: Re-dispatched with "this is in scope per AC X — do it now" instruction.
5. **Two re-dispatches and still deferring without proper justification**: Ticket paused, surfaced to user for direct decision.

At end of epic (epic-swarm) or end of ticket (execute-ticket), all surviving deferred items are aggregated into a single Linear comment titled `## Deferred Items Review — User Decision Required` with recommended dispositions. The user picks DO_NOW, ACCEPT_DEFERRAL, or NEW_TICKET per item.

## When You Are Genuinely Stuck (not catastrophic, just hard)

If the work is hard but you are not blocked by an external fact:
- **Do not defer.** Hardness is not catastrophic.
- **Use systematic-debugging** to work through the problem (4-phase root cause process).
- **Use divergent-exploration** if you need to consider multiple architectural approaches.
- **Use service-reuse** to find existing solutions you may have missed.
- **Return BLOCKED status only if** you genuinely cannot proceed in this session without information you cannot obtain — at which point you cite catastrophic condition #3 and request user input.

## Related Skills
- **production-code-standards**: TODOs are banned in production code; this skill bans TODOs as deferral receipts
- **verify-implementation**: Every status claim requires proof; "deferred" is a status claim that requires the Deferral Justification block
- **epic-closure-validation**: Blocks epic closure if any sub-ticket contains an AC-DEFERRED item without justification
- **systematic-debugging**: Use when work is hard but not catastrophically blocked
- **divergent-exploration**: Use when blocked by indecision between approaches (NOT a catastrophic condition)
