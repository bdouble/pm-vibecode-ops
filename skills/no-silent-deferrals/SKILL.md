---
name: no-silent-deferrals
description: Use when about to defer in-scope work or file a follow-up ticket for something observed during execution — saying "I'll defer this", "follow-up ticket", "out of scope", "future work", "handle separately", writing a Deferred Items entry, classifying AC-DEFERRED, or advancing a phase with known unfinished in-scope work. Also use when justifying a ticket with generic rationale ("for maintainability", "for consistency", "to propagate the pattern"), filing per-surface tickets for a cross-cutting concern, writing a "Considered but not pursued" entry, or proposing defensive runtime machinery — a retry tier, reconciliation job, sweep, or recovery cron — "just in case".
---

# No Silent Deferrals

**Two distinct failure modes, two distinct controls.** This skill covers both:

1. **In-scope work not done** — work covered by the ticket's acceptance criteria that wasn't completed. Default disposition: do it now. Deferral is valid only under the four catastrophic conditions below.
2. **Out-of-scope items noticed during execution** — patterns, gaps, adjacent observations, automated-review findings. Default disposition: do it now if cheap; file a ticket only if it clears the impact bar; otherwise record it in the closure-log.

**The default in both cases is: complete the work.** Historical baseline: 80–90% of deferrals across 100+ tickets should never have happened, and closure phases routinely produced more follow-up tickets than the epic had sub-tickets. This skill exists to keep both numbers down — and to give you a legal way to acknowledge an observation without filing a ticket.

<!-- @protected reason="foundational principle from v4.5; SkillOpt §3.6 protects slow-state content from automated rewrites — removing the analog cost SpreadsheetBench 22pts" -->
**Violating the letter of this skill is violating the spirit of this skill.** Rephrasing "follow-up ticket" as "subsequent iteration", inventing a fifth catastrophic condition, padding the impact-bar sentence with load-bearing-sounding generalities ("maintainability changes for developers"), declaring scope where none exists, or describing the same deferral with friendlier words is the same violation. Spirit over letter, always.

### Slow/Meta Update Log
<!-- Append one bullet per audit pass capturing what stayed true across iterations. Initially empty. -->
<!-- @end-protected -->

---

## Part 1 — In-Scope Work: The Four Catastrophic Conditions

Applies when the work is covered by (or required to fulfill) an acceptance criterion. A deferral is valid only under one of:

1. **External dependency genuinely unavailable** — a third-party API down, a library bug with no workaround, an upstream service offline. A verifiable external fact, not an effort assessment.
2. **Schema migration collides with another in-flight ticket in the same tier** — name the other ticket, the colliding schema element, and the conflict.
3. **Required stakeholder information genuinely unobtainable in this session** — you asked, no response is possible, and the information is required to proceed correctly.
4. **The work requires an AC modification only the user can authorize** — it isn't in the acceptance criteria and adding it would expand documented scope.

Anything else — difficulty, complexity, time, "deserves its own ticket" — means: do the work now. The closure-log option in Part 2 is for would-be tickets, not for AC work.

### Required Justification Template (when AC-deferral IS legitimate)

Include this block in your Deferred Items section, in addition to the standard table row:

```markdown
### Deferral Justification (CATASTROPHIC — required)
- Catastrophic condition: [1 | 2 | 3 | 4]
- Evidence: [specific external fact, schema collision detail, or missing authorization — cite the service, ticket ID, or stakeholder]
- Confidence the catastrophic condition applies: [HIGH | MEDIUM | LOW]
- Specific blocker preventing the work this session: [grounded in an external fact — not effort/time/complexity]
```

Time and effort estimates are deliberately absent from this template: they are a rationalization vector, not evidence.

---

## Part 2 — Would-Be Tickets: The Impact Bar and the Closure-Log

Applies when you notice something outside the ticket's ACs and are considering filing it. Three legal outcomes: **fix it now** (default, cheapest), **file a ticket** (only if it clears the bar), or **record it in the closure-log**. Silent drops and vague mentions are not outcomes.

### The Impact Bar

To file a ticket, you must complete this sentence with concrete content:

> "Without this, **[a specific production behavior, user experience, cost, security control, or operational property]** changes for **[an identified code path, user/operator segment, or named operation/system]**."

The "for" slot must name at least one of: a code path (file:line, function, route, module), a named user/operator segment ("admin role lookup", "checkout flow"), or a measurable operational property (latency budget, cost ceiling, named security control or compliance requirement). "Users", "developers", "future maintainers", and "the codebase" don't qualify.

### Disqualifying Phrasings — Closure-Log, Not Ticket

- "Less elegant" / "maintainability" / "code quality" / "developer experience"
- "A future bug might be easier to catch" (without a named bug class and concrete path)
- "This surface doesn't have the pattern yet" (without a named exploit path, regression, or out-of-bounds operational property)
- "An automated review tool flagged it" (the flag is input, not justification)
- "Drift someday" / "consistency" / "alignment" / "best practice" / "future-proofing" / "defense in depth" without a named attack path
- "We should document this" (unless the absence produces a named failure)

### Title Prefix for Any Filed Ticket: `[Follow-up]`

Every ticket filed from an execution-time observation — any phase, any flow — uses the `[Follow-up]` prefix. Not `[Retrofit]`: that v4.5-era prefix reflected the "one ticket per remaining surface" pattern this skill replaced.

### Pattern-Propagation Has a Higher Bar

"This pattern exists here; other surfaces should have it too" is the most common sprawl source. To file such a ticket, name either a current exploit path / user-visible regression on a specific surface, or a named operational property currently out of bounds there. Pattern absence alone is a closure-log entry — and for cross-cutting patterns, the right move is usually a boundary fix (Part 3), not tickets.

### The Closure-Log Outcome

Record below-the-bar items in your phase report under:

```markdown
### Considered but not pursued

- **[Brief item]** — Why considered: [the observation]. Why below the bar: [which disqualifying phrasing applies]. What would change to re-evaluate: [the named condition that would promote this to a ticket].

- (or: "None — all considered items were either completed or filed as tickets.")
```

The closure-log is durable — any reviewer can promote an entry to a ticket later. It is not a parking lot (above-the-bar items must be done or filed) and not a stage for thoroughness: log only items that were one filled impact-bar sentence away from a ticket, one or two short sentences each. "None" is a common and positive entry.

---

## The Symmetric Bar — Additions of Defensive Machinery

The impact bar applies symmetrically to **adding** defensive runtime machinery: a retry tier, a reconciliation job, a sweep, a recovery cron, a new error-taxonomy layer. With agents, the marginal cost of building machinery is near zero, so the economic regulator on complexity is gone — field data shows the runtime apparatus of a much larger company accumulating while the controls that actually protected quality were the cheap static ones.

To build defensive machinery, you must name the **concrete observed failure** it answers — an incident, a red test, a logged error, a vendor behavior that actually bit. "This could theoretically fail" does not clear the bar: record it in the closure-log instead.

Machinery that does clear the bar **ships with its activation metric** — a counter or log line the operator can check. `/entropy-audit` later asks: which machinery has fired zero times since the problem it guards was fixed? Unmeasured janitors accumulate forever.

The same rigor applies to **vendor/SaaS dependencies**: every external service is a behavioral coupling that will eventually change underneath the project. Adding one requires the concrete problem it solves and an inventory check first — observability vendors especially, since each one fragments the debugging story.

---

## Doctrine

- **Deferral is the most expensive disposition.** Doing the work is almost always cheaper than the deferral cycle (ticket creation, context re-loading, re-review, sprawl management).
- **Filing a ticket is more expensive than not filing one.** Tickets create review burden and decision fatigue. The closure-log exists so honesty about an observation doesn't carry that cost.
- **There is no time- or effort-based escape hatch for AC work.** The four catastrophic conditions are the only gate.
- **Silent deferrals are the worst disposition.** Unsurfaced AC gaps are caught at code review (SCOPE_GAP) and re-dispatched — save the round trip and do the work.

## Rationalizations — STOP

| Excuse | Reality |
|--------|---------|
| "I'll handle this in a follow-up" | Do it now, file it past the impact bar, or closure-log it. "Follow-up" with no decision is a silent deferral. |
| "This deserves its own ticket" | The impact bar decides. Most of the time the answer is closure-log. |
| "Codex/lint flagged it" | The tool's flag is input, not the bar. Apply the bar. |
| "This is tricky / would take a while" | Not external facts. Do it now or cite a catastrophic condition. |
| "This will help future maintainers" | Disqualifying phrasing. Closure-log. |
| "A retry/sweep here makes the system more resilient" | Name the observed failure. Unobserved-failure machinery is ballast — closure-log it. |
| "I'm running out of context" | Not a catastrophic condition. Do the work; the orchestrator handles pauses and resumes. |

## Red Flags — STOP

- "Follow-up ticket" / "retrofit ticket" / "future work" / "subsequent iteration" / "punt to"
- "Out of scope" without applying the impact bar
- A Deferred Items entry without the Deferral Justification block
- `AC-DEFERRED` on work you haven't attempted
- An impact-bar sentence padded with "maintainability", "consistency", "developer experience"
- Proposing defensive machinery without naming the observed failure it answers
- Filling the closure-log with trivia to look thorough

---

## Part 3 — Cross-Cutting Concerns: The Boundary Question

When a pattern established in this work could be (or has been) violated on other surfaces, do NOT default to filing tickets per surface. Ask:

> **"Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this work installed it?"**

Enforcement points: a boundary helper, a typed wrapper, a lint rule, a static-guard test, a middleware, a schema constraint, a build-time check — and for migrating N existing surfaces, a **ratchet** (shrink-only allowlist guard test; see `production-code-standards` → `references/enforcement-ladder.md`).

Three outcomes:

1. **Enforcement exists or was installed by this work.** Zero propagation tickets. Un-migrated surfaces become a closure-log entry, or a ratchet allowlist that shrinks opportunistically.

2. **No single chokepoint is expressible, AND the impact bar clears for at least one remaining surface.** Before reaching for tickets, attempt a ratchet — it usually replaces the propagation ticket entirely (field data: per-surface propagation tickets went 14 opened / 0 closed; ratchets cost ~1-2 hours and never rot). Only if neither a guard nor a ratchet is technically expressible: file ONE propagation ticket with all remaining surfaces as a checklist inside it. Never one ticket per surface.

3. **No enforcement viable AND no remaining surface clears the bar.** All remaining surfaces become closure-log entries.

Before settling on outcome 2 or 3, write one sentence stating what boundary mechanism (including a ratchet) you considered and why it isn't expressible here — argued from the architecture, not asserted.

---

## Orchestrator Enforcement (what happens if you violate this skill)

The orchestrator validates every Deferred Items entry and closure-log section at the end of each phase:

1. **Silent deferral of AC work**: caught at code review (SCOPE_GAP) or end-of-workflow review; re-dispatched with specifics.
2. **AC-DEFERRED without a Deferral Justification block**: re-dispatched with "do it now".
3. **Justification cites a condition outside 1–4, or evidence is empty/generic**: re-dispatched with "do it now".
4. **Justification cites condition 4 but fuzzy-match shows the item IS covered by an AC**: re-dispatched with "this is in scope per AC X".
5. **Ticket filed without a passing impact-bar sentence in the report**: re-dispatched with "apply the impact bar".
6. **Per-surface tickets filed for a cross-cutting pattern without a boundary-question answer**: re-dispatched with "guard or ratchet first; a single propagation ticket only with an argued not-expressible rationale; else closure-log".
7. **Defensive machinery proposed/built beyond AC without a named observed failure**: re-dispatched with "name the observed failure and its activation metric, or move it to the closure-log".
8. **Closure-log padded with non-candidates**: re-dispatched with "trim to actual ticket candidates".
9. **Two re-dispatches and still violating**: ticket paused, surfaced to the user.

At end of epic or ticket, surviving deferred items are aggregated into one Linear comment titled `## Deferred Items Review — User Decision Required`. Closure-log entries don't appear there — they live in the phase reports and the aggregated epic closure comment.

## When You Are Genuinely Stuck (hard, not catastrophic)

Hardness is not a deferral condition. Use **systematic-debugging** for root-cause work, **divergent-exploration** when torn between approaches, **service-reuse** to find existing solutions. Return BLOCKED only when you genuinely cannot proceed without unobtainable information — that's condition 3, and it goes through the justification template.

## Related Skills
- **production-code-standards**: The enforcement ladder — guards and ratchets as the boundary fixes Part 3 prefers
- **verify-implementation**: "Deferred" and "below the bar" are status claims that require their evidence blocks
- **epic-closure-validation**: Blocks closure on unjustified AC-DEFERRED items, closure-log padding, or per-surface fan-out
- **codex-finding-resolution**: P1/P2 findings default to fix-now; P3 → closure-log; scope escapes use the impact-bar template
