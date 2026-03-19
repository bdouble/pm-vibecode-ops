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

### Retrofit Analysis Triggers

Flag for retrofit analysis when:
- Patterns introduced in early tickets could improve later tickets
- Security findings in one ticket may affect sibling tickets
- Code review feedback suggests systemic improvements
- New shared utilities could replace code in completed tickets
