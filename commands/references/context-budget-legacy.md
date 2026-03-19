# Context Budget Rules (for context windows under 500K tokens)

This file is referenced by `/execute-ticket` when the orchestrator detects a context window smaller than 500K tokens. With limited context, full verbatim inclusion of all prior phase reports risks exhausting the window before later phases (especially security review, which receives 5 prior reports plus full ticket context).

**When to apply these rules:** Only when your available context window is under 500K tokens. If you have 500K+ tokens available, ignore this file entirely and follow the Full Context Inclusion Policy in execute-ticket.md.

---

## Budget Overview

**Maximum context from prior phases: ~2,000 tokens total**

This is a hard cap. Every token matters on a 250K window — agent prompts, tool results, and the agent's own reasoning all compete for space. Keep prior-phase context strictly within budget.

## Token Budgets Per Source

| Source | Max Tokens | Extract ONLY |
|--------|------------|--------------|
| Ticket description | 300 | First 2 paragraphs, acceptance criteria headers |
| Adaptation report | 400 | Target files (list), approach (1 paragraph), integration points |
| Implementation report | 300 | Files changed (list), branch name, PR number |
| Testing report | 200 | Gate results (PASS/FAIL only), coverage % |
| Documentation report | 100 | Docs created (file list only) |
| Code Review report | 200 | Status + blocking issues only |

## Essential Context (NEVER truncate)

Even under strict budget pressure, always preserve these items — they are load-bearing across all phases:

| Source | Rationale |
|--------|-----------|
| Acceptance Criteria headers | Every phase needs to understand what "done" looks like |
| Files Changed lists (paths only) | Needed for scope in every downstream phase |
| Deferred Items tables (including Classification column) | Needed for traceability and orchestrator validation gates — the Classification column (AC-DEFERRED, DISCOVERED, OUT-OF-SCOPE) determines whether the orchestrator pauses for user approval before advancing |

**Note:** On a 250K window, "full verbatim AC" and "full Technical Notes" may not fit. Include AC headers and Technical Notes bullet points. If the ticket has unusually long AC or Technical Notes, truncate the body of each item but preserve every header/bullet so the agent knows the full scope exists.

## Phase-Specific Priority

When a phase particularly depends on a prior report, expand that report's budget by borrowing from older, less relevant reports:

| Phase | Expand This Source | Borrow From |
|-------|-------------------|-------------|
| implementation | Adaptation (up to 600 tokens) | Testing, Documentation (not yet written) |
| testing | Implementation (up to 500 tokens) | Adaptation (reduce to 200) |
| codereview | Implementation + Adaptation (up to 400 each) | Testing, Documentation (reduce to 100 each) |
| security-review | Implementation + Code Review (up to 400 each) | Documentation (reduce to 50), Testing (reduce to 100) |

## Extraction Algorithm

```
For each prior phase report:
  1. Extract Status line (required)
  2. Extract Summary — first sentence only
  3. Extract file lists — paths only, no descriptions
  4. Extract blocking issues or security concerns (if any)
  5. Extract Deferred Items table (if present) — PRESERVE FULLY
  6. SKIP: detailed explanations, code snippets, full recommendations

If extracted context exceeds phase budget:
  1. Truncate to budget limit
  2. Append note: "[truncated — see Linear for full report]"
  3. Prioritize: Status > Files > Deferred Items > Summary > Details
```

## Truncation Rules

- If ticket has 4+ completed phases, omit Details sections entirely
- If extracted context still exceeds total budget, keep only the most recent 2 phases
- Always preserve: Files Changed lists, Deferred Items tables (both needed for traceability)
- Never include code snippets — use file:line references instead

## Example: Condensed Context for Security Review (~400 tokens)

```
Prior Phase Summary:
- Adaptation: 5 target files, event-driven approach, deferred rate limiting
- Implementation: 6 files changed (user.service.ts, auth.guard.ts,
  notification.handler.ts, user.routes.ts, user.schema.ts, user.test.ts), PR #45
- Testing: 87% coverage, all gates PASS
- Documentation: API docs updated (3 files)
- Code Review: APPROVED, flagged auth token expiry concern + unbounded payload

Deferred Items:
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| DISCOVERED | LOW | auth.ts:45 | Missing rate limit on admin login | Defense-in-depth |
```

## Tradeoffs

This budget system sacrifices context richness for reliability on constrained windows. Known consequences:

- Agents may miss nuanced requirements buried in full AC text (mitigated by preserving AC headers)
- Agents may miss edge cases noted in prior reports (mitigated by always extracting blocking issues/concerns)
- Code review may miss scope gaps if adaptation reasoning is truncated (mitigated by preserving Deferred Items)

If implementation quality is consistently poor with budget mode active, the user should upgrade to a model with a larger context window rather than increasing the budget — the budget is already near the safe limit for 250K windows.
