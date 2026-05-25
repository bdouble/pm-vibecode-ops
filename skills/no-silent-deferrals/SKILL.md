---
name: no-silent-deferrals
description: Use when an agent is about to defer in-scope work or file a follow-up ticket for something observed during execution — especially when saying "I'll defer this", "follow-up ticket", "retrofit ticket", "TODO", "out of scope", "future work", "subsequent iteration", "downstream", "punt to", "handle separately", "address later", "deserves its own ticket". Also use when writing a Deferred Items entry, classifying as AC-DEFERRED, scope-marking ACs, filing a DISCOVERED follow-up ticket, or advancing a phase with known unfinished in-scope work. Also use when justifying a ticket with generic rationale ("for maintainability", "for consistency", "for code quality", "for developer experience", "for future-proofing", "future bugs harder to catch", "this surface doesn't have the pattern yet", "to propagate the pattern"), when filing per-surface tickets for a cross-cutting concern, or when writing a "Considered but not pursued" closure-log entry.
---

# No Silent Deferrals

**Two distinct failure modes, two distinct controls.** This skill covers both:

1. **In-scope work not done** — work covered by the ticket's acceptance criteria that the agent didn't complete. Default disposition: do it now. Deferral is allowed ONLY under the four catastrophic conditions below.
2. **Out-of-scope items noticed during execution that the agent considers ticket-worthy** — patterns, gaps, adjacent observations, automated-review findings. Default disposition: do it now if you can, otherwise file a ticket ONLY if the item clears the impact bar below. Below the bar → record in the closure-log section of the phase report, do not file a ticket.

**The default in both cases is: complete the work.** Across the last 100+ tickets in this workflow, 80-90% of deferrals should never have happened, AND the closure phase routinely produced more follow-up tickets than the epic had sub-tickets. Most of those follow-ups had no concrete operational, cost, user-perceived, or compliance impact — they were observations the agent had no legal way to acknowledge without filing a ticket. This skill fixes that.

**Violating the letter of this skill is violating the spirit of this skill.** Rephrasing "follow-up ticket" as "subsequent iteration", inventing a fifth catastrophic condition, padding the impact-bar sentence with load-bearing-sounding generalities ("maintainability changes for developers"), declaring scope where none exists, or describing the same deferral with friendlier words is the same violation. Spirit over letter, always.

---

## Part 1 — In-Scope Work: The Four Catastrophic Conditions

This part applies when the work is **covered by an acceptance criterion** or required to fulfill an AC. A deferral is valid ONLY if it meets one of these conditions:

1. **External dependency genuinely unavailable** — a third-party API is down, a library has a known bug with no workaround, a required upstream service is offline. The unavailability must be a verifiable external fact, not your assessment of effort.
2. **Schema migration would collide with another in-flight ticket in the same tier** — concrete evidence: name the other ticket ID, name the colliding schema element, name the conflict.
3. **Required information from a human stakeholder is genuinely unobtainable in this session** — you have asked, no response is possible in-session, and the information is required to proceed correctly (not just to proceed more efficiently).
4. **The work requires a Linear ticket-level scope change (AC modification) that only the user can authorize** — the work is not in the acceptance criteria, not required to fulfill any acceptance criterion, and adding it would expand the ticket's documented scope.

If your situation does not match one of these four conditions with concrete external evidence, the disposition is **do the work now**. Difficulty, complexity, "would take a while," "is tricky," "needs more thought," "deserves its own ticket," and any other time/effort/judgment language are NOT catastrophic conditions. The closure-log option in Part 2 does NOT apply to in-scope work — it is reserved for the would-be-ticket scenario below.

### Required Justification Template (when AC-deferral IS legitimate)

If your AC-deferral genuinely meets one of the four catastrophic conditions, include this block in your Deferred Items section in addition to the standard table row:

```markdown
### Deferral Justification (CATASTROPHIC — required)
- Catastrophic condition: [1 | 2 | 3 | 4 from allowlist above]
- Evidence: [specific external fact, schema collision detail, or missing authorization — cite the upstream service name, ticket ID, or stakeholder]
- Confidence the catastrophic condition applies: [HIGH | MEDIUM | LOW]
- Specific blocker that prevents doing the work in this session: [factual description grounded in an external fact — not effort/time/complexity]
```

**Deliberately absent from this template:** time estimates, effort estimates, "cost to do now," "cost if deferred." Agents do not reason about clock time or coding effort well, and would use such estimates as a rationalization vector to defer in-scope work.

---

## Part 2 — Would-Be Tickets: The Impact Bar and the Closure-Log

This part applies when you notice something **outside the current ticket's acceptance criteria** during execution — an adjacent pattern, a related gap, an automated-review finding, a cross-cutting concern — and you are considering filing it as a follow-up ticket. Three legal outcomes:

1. **Fix it now** in the active branch, if you can do so without significantly expanding scope. (Default. Cheapest.)
2. **File a ticket** — ONLY if the item clears the impact bar below.
3. **Record in the closure-log** section of your phase report — for items considered but below the impact bar.

**Banned (unchanged):** silent drop, vague mention without specifying the item, deferring without identifying who or when, padding the closure-log with non-candidates to look thorough.

### The Impact Bar

To justify filing a ticket for an observed item, you MUST be able to complete this sentence with concrete content:

> "Without this, **[a specific production behavior, user experience, cost, security control, or operational property]** changes for **[an identified code path, user/operator segment, or named operation/system]**."

If both slots can be filled with specifics, the item earns a ticket. If either slot can only be filled with generic or hypothetical content, the item is a closure-log entry, not a ticket.

**Specificity requirement for the "for" slot.** Must name AT LEAST ONE OF:
- A code path: file:line, function name, route, module
- A user/operator segment: "admin role lookup", "checkout flow", "the on-call dashboard"
- A measurable operational property: a stated latency budget, cost ceiling, named security control, named compliance requirement

"Users" or "developers" alone is rejected. "Future maintainers" is rejected. "The codebase" is rejected.

### Disqualifying Phrasings — Closure-Log, Not Ticket

If your would-be impact sentence reads any of the following, the item is a closure-log entry:

- "The code is less elegant" / "maintainability changes" / "code quality is reduced"
- "Developer experience changes for future developers"
- "A future bug might be easier to catch" (unless you can name the bug class with a concrete example path)
- "This surface doesn't have the pattern yet" (unless paired with a named exploit path, named user-visible regression, or named operational property out of bounds)
- "An automated review tool flagged it" (the tool's flag is input, not justification)
- "There might be drift someday" / "to prevent future inconsistency"
- "It would be more consistent" / "for alignment" / "for best practice"
- "Future-proofing" / "defense in depth" without a named attack path
- "We should document this" (unless the absence of documentation produces a named failure)

### Pattern-Propagation Has a Higher Bar

"This pattern exists in this epic; other surfaces should have it too" is the most common ticket-sprawl source. To file such a ticket, you must name EITHER:
- A current exploit path or user-visible regression on a specific surface that lacks the pattern, OR
- A named operational property (security control, compliance requirement, performance budget) that is currently out of bounds on a specific surface

Pattern absence alone is not a real-impact bar. If the unsafe version is currently impossible to produce (or the at-risk surfaces aren't actually exposed), it's a closure-log entry.

See also Part 3 below — for cross-cutting concerns, the right answer is usually a boundary fix that makes the unsafe version impossible to produce, NOT a fan-out of per-surface tickets.

### The Closure-Log Outcome

When an observed item is below the impact bar, record it in your phase report under this section header:

```markdown
### Considered but not pursued

- **[Brief item description]** — Why considered: [the observation]. Why below the bar: [which disqualifying phrasing applies, or why the impact sentence couldn't be filled]. What would change to re-evaluate: [the named condition that, if it materialized, would promote this to a real ticket].

- (or: "None — all considered items were either completed or filed as tickets.")
```

The closure-log is durable. It lives in the phase report or closure comment where any reviewer can scan it and promote any item to a real ticket by creating one that references the comment. The closure-log is NOT a parking lot — items above the bar still must be completed or filed as tickets; they cannot be hidden here.

### Anti-Padding: What Does NOT Belong in the Closure-Log

The closure-log will itself inflate if agents pad it to look thorough. Constrain:

- Items belong here only if they were **one filled-out impact-bar sentence away from being filed as a ticket**. Passing thoughts and trivial observations are not candidates and should be omitted entirely.
- If you cannot write even a partial would-be impact sentence (e.g., "Without this, ?? changes for ??"), the item was never a ticket candidate. Do not log it.
- One-line entries only. Bulleted, not narrative. If a closure-log entry runs more than two short sentences, you have probably written a ticket; reconsider whether it actually clears the impact bar.
- An empty closure-log is a positive signal — it means the work was well-scoped and nothing adjacent surfaced. "None" is an acceptable and common entry.

---

## Doctrine

- **Deferral is the most expensive disposition.** Doing the work is almost always cheaper than the deferral cycle (follow-up ticket creation, context re-loading, re-review, retrofit risk, sprawl management).
- **The default disposition is: complete the work.** AC-deferral requires a catastrophic condition. Would-be tickets require the impact bar.
- **Filing a ticket is more expensive than not filing one.** Tickets create downstream review burden, decision-fatigue load on the PM, and false signals of unfinished work. The closure-log exists so the agent has a legal way to be honest about an observation without paying that cost.
- **If you find yourself writing "follow-up ticket" or "retrofit ticket" — STOP.** Either do the work now, or apply the impact bar. If the item is below the bar, write a closure-log entry instead.
- **There is no time-based or effort-based escape hatch for AC-deferral.** The four catastrophic conditions are the only gate.
- **Silent deferrals are the worst disposition.** Not completing AC work without surfacing it in Deferred Items will be caught at code review (SCOPE_GAP) or end-of-workflow review and re-dispatched. Save the round trip — just do the work.

## Rationalizations — STOP

If you think any of these, you are about to violate this skill.

| Excuse | Reality |
|--------|---------|
| "I'll handle this in a follow-up" | Either do it now (default), file a ticket if it clears the impact bar, or write a closure-log entry. "Follow-up" with no decision is silent deferral. |
| "This is out of scope for this ticket" | If it's in the ticket AC or required to fulfill an AC, it is in scope. Do it. If it's genuinely out of scope, apply the impact bar — do not assume "out of scope" means "file a ticket." |
| "The user can decide later" | The user has decided: do the work. Deferral interrupts their flow. |
| "This deserves its own ticket" | The impact bar decides whether it deserves a ticket. Apply it. Most of the time the answer is closure-log. |
| "It's a retrofit — we always file those" | Pre-policy yes. Under the new policy, retrofits get the impact bar plus the boundary question. See Part 3. |
| "Codex/lint/[automated review] flagged it" | The tool's flag is input, not the impact bar. Apply the bar. |
| "I'll write a TODO and come back to it" | TODOs are banned. There is no "coming back" — there is only this session. |
| "This is a discovered issue, not in AC" | DISCOVERED items still get the impact bar. Most do not clear it. |
| "I'm running out of context" | Context is not a catastrophic condition. Write the work now; if context truly runs out, the orchestrator will pause and resume. |
| "This is tricky and deserves more thought" | "Tricky" is not external. Either do it now or cite a catastrophic condition (for AC work) / apply the impact bar (for non-AC work). |
| "It's a 5-line fix but I want to be safe" | "Being safe" means doing it. Defer-and-review is more risk, not less. |
| "We should document this in a ticket" | Documentation gaps are closure-log entries unless their absence produces a named failure. |
| "This will help future maintainers" | "Future maintainers" is a disqualifying phrasing. Closure-log. |

## Red Flags — STOP

When you notice ANY of these in your own thinking or writing, you are about to violate this skill. Stop, re-read the relevant section above, and pick the correct disposition.

- "I'll handle this in a follow-up ticket" / "retrofit ticket" / "deferred ticket"
- "Adding TODO for [anything]"
- "Out of scope for this ticket" (without applying the impact bar)
- "Future work" / "subsequent iteration" / "downstream"
- "Punt to" / "Defer to later" / "Address separately"
- "This deserves its own ticket" (without filling the impact-bar sentence)
- "This is a tech-debt concern"
- "I'm running out of context"
- "This is tricky" / "This is complex" / "Would take a while"
- Writing a Deferred Items entry without the Deferral Justification block
- Writing `AC-DEFERRED` classification when you haven't attempted the work
- Filling the closure-log with trivia to look thorough
- Padding an impact-bar sentence with generic load-bearing-sounding terms ("maintainability", "code quality", "developer experience", "consistency")

**All of these mean: stop and pick the correct disposition.** Do not file a ticket as a way of acknowledging an item; do not log a non-candidate to look thorough; do not silently drop AC work.

---

## Part 3 — Cross-Cutting Concerns: The Boundary Question

When you notice that a pattern established in this work could be (or has been) violated on other surfaces (a check, a constraint, a guard, a process control, a quality standard), do NOT default to filing one ticket per surface. Ask:

> **"Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this work installed it?"**

Examples of enforcement points: a boundary helper, a typed wrapper, a lint rule, an interface that requires the safe call, a middleware, a schema-level constraint, a build-time check.

Three outcomes:

1. **Enforcement exists or was installed by this work.** No propagation tickets needed. Future work cannot skip the pattern. The existing un-migrated surfaces become a closure-log entry (or a single small migration ticket if migration is genuinely required to satisfy a current named-impact concern).

2. **Enforcement is not viable for this pattern AND the impact bar is cleared for at least one remaining surface.** File ONE propagation ticket (or epic, depending on scope) with all remaining surfaces enumerated as a checklist inside its description. Do NOT file one ticket per surface.

3. **Enforcement is not viable AND no remaining surface clears the impact bar.** All remaining surfaces become closure-log entries with the rationale "no enforcement point viable, no current named-impact concern on remaining surfaces."

Before falling back to outcome 2 or 3, write one sentence describing what boundary mechanism you considered installing and why it isn't viable here. "Not viable" is not a free-form opt-out — it must be argued from the architecture.

---

## Orchestrator Enforcement (what happens if you violate this skill)

The orchestrator validates every Deferred Items table entry AND every closure-log section against this skill at the end of each phase:

1. **Missing entry but missing work** (silent deferral of AC work): Caught at code review (SCOPE_GAP) or end-of-workflow review. Re-dispatched with the missing-work specifics.
2. **AC-DEFERRED entry, no Deferral Justification block**: Re-dispatched immediately with "do it now" instruction.
3. **Justification block present, catastrophic condition outside 1-4, or evidence field empty/generic**: Re-dispatched immediately with "do it now" instruction.
4. **Justification cites condition #4 (user authorization), but fuzzy match against AC shows the item IS covered by an AC**: Re-dispatched with "this is in scope per AC X — do it now" instruction.
5. **Would-be ticket filed without a passing impact-bar sentence visible in the report**: Re-dispatched with "apply the impact bar — most observations are closure-log entries" instruction.
6. **Multiple per-surface tickets filed for a cross-cutting pattern without a boundary-question answer**: Re-dispatched with "answer the boundary question first — one propagation epic, or closure-log" instruction.
7. **Closure-log padded with items that have no fillable would-be impact sentence**: Re-dispatched with "trim the closure-log to actual ticket candidates" instruction.
8. **Two re-dispatches and still violating**: Ticket paused, surfaced to user for direct decision.

At end of epic (epic-swarm) or end of ticket (execute-ticket), all surviving deferred items are aggregated into a single Linear comment titled `## Deferred Items Review — User Decision Required` with recommended dispositions. Closure-log entries do NOT appear in this review — they live in the phase reports and (aggregated) in the epic closure comment, where any reviewer can promote any item to a real ticket by creating one that references the comment.

## When You Are Genuinely Stuck (not catastrophic, just hard)

If the work is hard but you are not blocked by an external fact:
- **Do not defer.** Hardness is not catastrophic.
- **Use systematic-debugging** to work through the problem (4-phase root cause process).
- **Use divergent-exploration** if you need to consider multiple architectural approaches.
- **Use service-reuse** to find existing solutions you may have missed.
- **Return BLOCKED status only if** you genuinely cannot proceed in this session without information you cannot obtain — at which point you cite catastrophic condition #3 and request user input.

## Related Skills
- **production-code-standards**: TODOs are banned in production code; this skill bans TODOs as deferral receipts
- **verify-implementation**: Every status claim requires proof; "deferred" is a status claim that requires the Deferral Justification block; "below the impact bar" is a status claim that requires the would-be impact sentence
- **epic-closure-validation**: Blocks epic closure if any sub-ticket contains an AC-DEFERRED item without justification, OR if closure-log padding or per-surface ticket fan-out is detected
- **codex-finding-resolution**: Codex P1/P2 findings default to fix-now; P3 → closure-log; scope-expansion escape requires the impact-bar template
- **systematic-debugging**: Use when work is hard but not catastrophically blocked
- **divergent-exploration**: Use when blocked by indecision between approaches (NOT a catastrophic condition)
