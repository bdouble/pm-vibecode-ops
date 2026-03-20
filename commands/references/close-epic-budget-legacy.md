# Close-Epic Context Budget Rules (for context windows under 500K tokens)

This file is referenced by `/close-epic` when the orchestrator detects a context window smaller than 500K tokens. With limited context, full verbatim inclusion of all ticket summaries, deferred items, and phase reports risks exhausting the window before the epic-closure-agent completes its seven-phase analysis.

**When to apply these rules:** Only when your available context window is under 500K tokens. If you have 500K+ tokens available, ignore this file entirely and follow the Full Context Mode in close-epic.md.

---

## Budget Overview

**Maximum context for epic-closure-agent prompt: ~4,200 tokens total**

This is a hard cap. On a 250K window, the agent prompt, tool results, and the agent's own reasoning all compete for space. Keep context strictly within budget.

## Token Budgets Per Source

| Source | Max Tokens | Extract ONLY |
|--------|------------|--------------|
| Epic description | 200 | First 2 paragraphs, success criteria headers |
| Epic comments | 200 | Key decisions only (1 sentence each) |
| Per-ticket summaries | 80/ticket (max 2,400 for 30 tickets) | Status, key outcome (10 words), key decision (8 words), test %, security status |
| Deferred items | 400 | Full AC-DEFERRED items; top 10 DISCOVERED/OUT-OF-SCOPE by severity |
| Retrofit recommendations | 400 | Prioritized list with pattern names and file counts |
| Downstream guidance | 400 | Actionable guidance, affected epic IDs only |
| CLAUDE.md updates | 200 | Specific section names and proposed content summary |

## Essential Context (NEVER truncate)

Even under strict budget pressure, always preserve these items — they are load-bearing for closure analysis:

| Item | Rationale |
|------|-----------|
| Ticket status indicators (Done/Cancelled) | Completion verification depends on these |
| Late Findings (all severities) | Quality audit trail — cannot be summarized without risk |
| Deferred Items — AC-DEFERRED classification | Represent explicit user-approved scope cuts; must be visible for traceability |
| Retrofit recommendations with priority | Drive ticket creation — losing priority/effort data makes tickets useless |

## Truncation Priority Matrix

When combined context exceeds budget, truncate in this order (preserve first, trim last):

| Priority | Component | Action |
|----------|-----------|--------|
| 1 (PRESERVE) | Ticket status indicators | Never truncate |
| 2 (PRESERVE) | Late Findings | Never truncate |
| 2 (PRESERVE) | Deferred Items — AC-DEFERRED | Never truncate |
| 3 (PRESERVE) | Deferred Items — DISCOVERED/OUT-OF-SCOPE | Truncate to top 10 by severity |
| 4 (PRESERVE) | Key decisions (1 sentence each) | Truncate to 1 sentence |
| 5 (TRIM) | Pattern explanations | Reduce to bullet points |
| 6 (TRIM) | Testing details | Coverage % only |
| 7 (TRIM) | Historical context | Remove entirely |
| 8 (ALWAYS PRESERVE) | Retrofit recommendations with priority | Never truncate |

## Extraction Algorithm

```
For each sub-ticket:
  1. Extract Status (Done/Cancelled) — required
  2. Extract key outcome — max 10 words
  3. Extract key decision — max 8 words
  4. Extract test coverage % — number only
  5. Extract security status — Approved/Failed
  6. Extract Deferred Items table — PRESERVE AC-DEFERRED FULLY
  7. SKIP: detailed implementation notes, code snippets, full recommendations

For epic-level data:
  1. Extract description — first 2 paragraphs + success criteria headers
  2. Extract comments — key decisions only, 1 sentence each
  3. Extract related epics — IDs and titles only
  4. SKIP: full discussion threads, historical context

If extracted context exceeds total budget:
  1. Truncate per priority matrix above
  2. Append note: "[truncated — see Linear for full details]"
  3. Prioritize: Status > Late Findings > AC-DEFERRED > Deferred Items > Decisions > Details
```

## Tiered Gathering Strategy (Budget Mode)

Gathering strategy selection still applies in budget mode:

| Tier | Ticket Count | Strategy | Token Budget/Ticket |
|------|--------------|----------|---------------------|
| **Small** | 1-6 tickets | Direct gathering | ~80 tokens |
| **Medium** | 7-15 tickets | Parallel subagents (standard mode) | 60 tokens |
| **Large** | 16-30 tickets | Parallel subagents (ultra-condensed) | 40 tokens |
| **Very Large** | 31+ tickets | Phased execution | 40 tokens |

## Example: Condensed Epic Context (~800 tokens)

```
Epic: EPIC-123 — User Authentication Overhaul
Status: All 5 tickets Done

Ticket Summary:
| ID | S | Outcome | Decision | Tests | Security |
|----|---|---------|----------|-------|----------|
| PROJ-101 | ✓ | New auth service | Event-driven | 87% | Approved |
| PROJ-102 | ✓ | Migration script | Batch approach | 92% | Approved |
| PROJ-103 | ✓ | Admin dashboard | Existing UI lib | 78% | Approved |
| PROJ-104 | ✓ | API rate limiting | Token bucket | 85% | Approved |
| PROJ-105 | ✗ | Email templates | Cancelled — descoped | — | — |

Deferred Items:
| Source | Phase | Classification | Severity | Location | Issue | Reason |
|--------|-------|---------------|----------|----------|-------|--------|
| PROJ-101 | Impl | DISCOVERED | LOW | auth.ts:45 | Rate limit admin | Defense-in-depth |
| PROJ-102 | Impl | AC-DEFERRED | MED | forms/ | Old form validation | New path only |
| PROJ-103 | Review | DISCOVERED | LOW | api.ts:45 | Rate limit admin | Low-risk |
| PROJ-103 | Impl | OUT-OF-SCOPE | LOW | auth.ts:99 | Audit trail | Security epic |

Related Epics: EPIC-456 (Auth v2), EPIC-789 (Security Hardening)
```

## Tradeoffs

This budget system sacrifices context richness for reliability on constrained windows. Known consequences:

- Agent may miss nuanced deferral patterns if DISCOVERED/OUT-OF-SCOPE items are truncated (mitigated by preserving top 10 by severity)
- Agent may produce less specific retrofit recommendations with condensed ticket summaries (mitigated by preserving key decisions)
- Grouping quality for deferred items may be lower with fewer context clues (mitigated by always preserving AC-DEFERRED items in full)

If closure quality is consistently poor with budget mode active, the user should upgrade to a model with a larger context window rather than increasing the budget — the budget is already near the safe limit for 250K windows.
