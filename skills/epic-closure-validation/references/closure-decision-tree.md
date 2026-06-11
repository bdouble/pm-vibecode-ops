# Epic Closure Decision Tree

## Pre-Closure Checklist

Before initiating epic closure, verify:

### Sub-Ticket Status Check
- Query all sub-tickets for the epic
- Categorize: Done, Cancelled, In Progress, Todo, Blocked

### Decision Matrix

| Scenario | Action | Rationale |
|----------|--------|-----------|
| All Done | Proceed to closure | Standard path |
| Mix of Done + Cancelled | Proceed IF business value delivered | Cancelled tickets may indicate scope refinement, not failure |
| Any In Progress | BLOCK closure | Active work must complete or be explicitly cancelled |
| Any Todo | BLOCK closure | Unstarted work indicates incomplete planning |
| Any Blocked | BLOCK closure | Blockers must be resolved or tickets cancelled |

### "Business Value Delivered" Assessment

When epics have cancelled tickets, assess whether the remaining Done tickets still deliver the epic's stated business value:

1. Read the epic description and acceptance criteria
2. Map each Done ticket to the business capabilities it delivers
3. Map each Cancelled ticket to what was lost
4. If core capabilities are delivered: closure is valid
5. If critical capabilities were cancelled: closure should be blocked until replacements are filed

### Workaround Detection

Before closure, search for workarounds in completed tickets:
- Grep for TODO/FIXME/HACK in files changed by epic tickets
- Check Deferred Items tables for AC-DEFERRED classifications
- Verify no tickets were closed with known production workarounds

### Convention Guard Audit

For every convention/canonical pattern the epic established, verify a guard artifact exists (enforcement-ladder rungs 1–5) or the rule carries an explicit `[prose-only]` tag with rationale. Neither → CRITICAL, blocks closure until the guard ships (typically a ~200-line rung-2 test) or the user explicitly approves prose-only status.

### Follow-Up Discipline

When patterns introduced in this epic could (or have been) violated on existing surfaces, apply this decision in order:

1. **Impact bar.** For each candidate, write the impact-bar sentence: "Without this, [specific behavior/property] changes for [identified code path/segment/property]." Generic content ("users", "developers", "maintainability") fails the bar → closure-log only.
2. **Boundary question** (for cross-cutting candidates). "Is there a single point of enforcement that makes the unsafe version impossible to produce, and has this epic installed it?"
   - Enforcement installed → zero propagation tickets; closure-log only
   - No chokepoint expressible + bar clears → install a **ratchet** (shrink-only allowlist guard test) — it replaces the propagation ticket entirely. Only if neither a guard nor a ratchet is expressible: ONE propagation ticket with surfaces as checklist (never one per surface)
   - Not viable + bar fails → all surfaces → closure-log
3. **Absolute cap of 3 filed follow-ups per closure.** Excess candidates → closure-log. 4+ filed → block closure, surface to user.

This replaces prior "Retrofit Analysis Triggers." Under the new discipline, most candidates land in the Considered-but-not-pursued closure-log or become ratchet allowlist entries; filing a ticket is a residual outcome, not a default. (Field data behind the ratchet preference: per-surface propagation tickets went 14 opened / 0 closed; ratchets cost ~1-2 hours and never rot.)
