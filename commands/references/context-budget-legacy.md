# Context Budget Rules (Legacy — for context windows under 500K tokens)

This file is referenced by `/execute-ticket` when the orchestrator detects a context window smaller than 500K tokens. With limited context, full verbatim inclusion of all prior phase reports risks exhausting the window before later phases (especially security review, which receives 5 prior reports plus full ticket context).

**When to apply these rules:** Only when your available context window is under 500K tokens. If you have 1M+ tokens available, ignore this file entirely and follow the Full Context Inclusion Policy in execute-ticket.md.

---

## Budget Overview

**Maximum context from prior phases: ~15,000 tokens total**

This is a soft cap. If total context reaches ~15,000 tokens, begin applying the extraction priorities below. Most tickets will stay well under this limit.

## Token Budgets Per Source

| Source | Budget | What to Include |
|--------|--------|-----------------|
| Ticket description | 2,000 | Full description, all AC (verbatim), all Technical Notes (verbatim) |
| Adaptation report | 3,000 | Full approach with trade-off reasoning, target files, integration points, constraints, deferred items with rationale |
| Implementation report | 3,000 | Files changed with descriptions, patterns used, edge cases noted, concerns, integration points |
| Testing report | 2,000 | Gate results with failure details, coverage %, skipped areas, risk notes |
| Documentation report | 500 | Docs created, API changes documented, any gaps noted |
| Code Review report | 2,000 | Status, requirements checklist results, best practices findings, SOLID/DRY findings, security concerns flagged |

## Essential Context (NEVER truncate)

These items are protected across ALL phases, regardless of budget pressure:

| Source | Rationale |
|--------|-----------|
| Full Acceptance Criteria (from ticket) | Every phase needs to understand what "done" looks like |
| Full Technical Notes (from ticket) | Contains explicit implementation requirements that are frequently missed |
| Files Changed lists | Needed for scope in every downstream phase |
| Deferred Items tables | Needed for traceability — items deferred in one phase may need attention in the next |
| Adaptation scope decisions | Needed to detect SCOPE_GAPs and understand why certain approaches were chosen |

## Phase-Specific Expanded Context

When a phase particularly depends on a prior report, expand that report's budget at the expense of older reports:

| Phase | Expand These Sources | Rationale |
|-------|----------------------|-----------|
| implementation | Full adaptation trade-off reasoning, service reuse mandates with specifics | Implementer needs architectural decisions, not just file targets |
| testing | Full implementation report (what was built, edge cases, concerns) | QA needs to understand what was built to test it properly |
| codereview | Full AC, Technical Notes, adaptation scope decisions, implementation details | Requirements Verification checks every AC individually |
| security-review | Full ticket context, adaptation architecture decisions, implementation details, code review security flags | Security needs data flow, trust boundaries, and attack surface |

## Extraction Algorithm

When total context from prior phases approaches ~15,000 tokens, apply this algorithm:

```
For each prior phase report:
  1. Extract Status line (required)
  2. Extract Summary (full, not just first sentence)
  3. Extract file lists with descriptions
  4. Extract key decisions and trade-off reasoning
  5. Extract blocking issues, concerns, or security flags
  6. Extract Deferred Items table (FULL — never truncate)
  7. Extract edge cases, risks, and warnings

If total context still exceeds ~15,000 tokens:
  1. Reduce older phase reports first (adaptation before implementation)
  2. Trim detailed explanations, keep decisions and outcomes
  3. Trim code snippets (keep file:line references)
  4. Append note: "[condensed — see Linear for full report]"
  5. NEVER truncate: AC, Technical Notes, Adaptation Scope Decisions,
     Files Changed, Deferred Items

Priority order (last to cut → first to cut):
  Essential context (protected) > Decisions/reasoning > Files with descriptions >
  Concerns/risks > Summary > Detailed explanations > Code snippets
```

## Truncation Rules

- Always preserve essential context (listed above) regardless of phase count
- If total context exceeds budget, condense the **oldest** phase reports first
- Never drop a phase entirely — keep at minimum: Status + Summary + Files Changed + Deferred Items
- Prefer condensing 3 phases lightly over dropping 1 phase completely

## Example: Condensed Context for Security Review (~2,500 tokens)

```
## Ticket Context
[Full ticket description, AC, Technical Notes — verbatim]

## Prior Phase Summary

### Adaptation
- Approach: Event-driven architecture using existing NotificationService
  and UserRepository. Chose async processing over sync to handle scale.
- Target files: user.service.ts, auth.guard.ts, notification.handler.ts,
  user.routes.ts, user.schema.ts
- Integration: Connects to existing auth middleware, uses Inngest for
  async event processing
- Deferred: Rate limiting on admin endpoints (defense-in-depth, not critical path)
- Scope decisions: Deferred batch import UI (AC #4) to follow-up ticket

### Implementation
- 6 files changed: user.service.ts (new CRUD + validation), auth.guard.ts
  (role-based access), notification.handler.ts (event consumer),
  user.routes.ts (REST endpoints), user.schema.ts (Zod schemas),
  user.test.ts (integration tests)
- Branch: feature/PRJ-123-user-profile, PR #45
- Auth pattern: JWT validation via existing auth middleware, role enum check
- Edge cases noted: email uniqueness handled via DB constraint + friendly error
- Concerns: Large payload handling on profile update not explicitly bounded

### Testing
- All gates PASS, 87% coverage
- Skipped: Visual regression (no UI), E2E for notification delivery (async)
- Tested: All CRUD operations, auth scenarios, validation edge cases
- Risk note: Async notification delivery tested via event spy, not full E2E

### Documentation
- API docs updated: user-endpoints.md, auth-patterns.md, event-catalog.md

### Code Review
- Status: APPROVED
- Requirements: 6/7 AC verified (batch import deferred per adaptation)
- Security concerns flagged: auth token expiry check uses > not >=,
  profile update accepts unbounded payload size
- SOLID/DRY: No MUST_FIX items. 1 SHOULD_FIX (validation logic
  duplicated between route handler and service layer)
```
