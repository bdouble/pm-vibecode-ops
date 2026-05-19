# Cross-Model Review Report Template

The full markdown template for posting Codex review results to Linear. Use exactly this structure to preserve the audit trail and enable downstream extraction by `/close-epic`.

## Standard Template

```markdown
## Cross-Model Review Report

**Model**: [model] | **Reasoning**: [reasoning level] | **Date**: [date]

### Summary
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed by Codex**: N (unambiguous P0-P3 — applied and committed)
- **Fixed after user review**: N (ambiguous items user chose to fix)
- **Dismissed by user**: N (with reasoning)
- **Deferred**: N (to follow-up tickets)
- **Declined by Codex**: N (identified but not auto-fixed, with reasoning)
- **For awareness**: N (P3 informational)

### Auto-Fixed Items
Items Codex fixed automatically because the correct fix was unambiguous.

| # | Priority | Category | File | What Changed | Codex Reasoning |
|---|----------|----------|------|-------------|-----------------|
| [n] | [P-level] | [bug/security/logic/style] | [file:line] | [what changed] | [why this was fixed] |

### User-Reviewed Items
Items Codex identified but could not auto-fix due to ambiguity. Each was presented to the user with Codex's question and recommendation. The user's decision and reasoning are recorded.

| # | Priority | File | Issue | Codex Question | Codex Recommendation | User Decision | User Reasoning |
|---|----------|------|-------|---------------|---------------------|--------------|----------------|
| [n] | [P-level] | [file:line] | [issue description] | [what Codex was uncertain about] | [what Codex would suggest] | Fixed / Dismissed / Deferred | [user's stated reasoning] |

### Declined by Codex
Items Codex identified but chose not to auto-fix because the fix would require broader changes, the risk of the fix outweighs the issue, or the item is outside the scope of a surgical review.

| # | Priority | Category | File | Issue | Why Not Auto-Fixed |
|---|----------|----------|------|-------|-------------------|
| [n] | [P-level] | [category] | [file:line] | [issue description] | [Codex's reasoning for declining] |

### For Awareness (P3)
Low-priority observations that don't require action but are worth noting.

| # | Category | File | Observation |
|---|----------|------|-------------|
| [n] | [category] | [file:line] | [observation] |

### Deferred Items
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| DISCOVERED | [severity] | [file:line] | [finding] | [why deferred — include user's reasoning if user chose to defer] |

---
*Automated by /epic-swarm — Tier [N]*
```

For `/execute-ticket` standalone mode, replace the footer with `*Automated by /execute-ticket*`.

## Critical Rules for This Report

- The **User-Reviewed Items** section preserves the FULL context chain: issue → Codex's uncertainty → Codex's recommendation → user's decision → user's reasoning. Do NOT collapse this into just "decision + reasoning" — the Codex question and recommendation are critical for understanding WHY the item needed human judgment.
- Items the user chose to DEFER in the User-Reviewed section MUST also appear in the Deferred Items table with classification `DISCOVERED`.
- Items in "Declined by Codex" that the user later identifies as needing fixes should be addressed in a follow-up — they are NOT retroactively fixed during this phase.

## Skip / Error Variants

When Codex review doesn't complete, still post a record to Linear using one of these variants:

### Server Unavailable

```markdown
## Cross-Model Review Report

**Status:** SKIPPED — Codex MCP server not configured

No cross-model review was performed. Install from: [server URL]

---
*Automated by /epic-swarm — Tier [N]*
```

### Rate Limited

```markdown
## Cross-Model Review Report

**Status:** DEFERRED — Rate limit reached (retried once after 60s)

Run `/codex-review [ticket-id]` independently to complete cross-model review.

---
*Automated by /epic-swarm — Tier [N]*
```

### Error / Timeout

```markdown
## Cross-Model Review Report

**Status:** FAILED — [error message]

Cross-model review did not complete. Error: [details]
Run `/codex-review [ticket-id]` independently to retry.

---
*Automated by /epic-swarm — Tier [N]*
```

**In ALL cases, a comment is posted.** The absence of a Cross-Model Review Report comment means the step was forgotten, not that it was skipped for a good reason.
