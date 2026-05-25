# Cross-Model Review Report Template

The full markdown template for posting Codex review results to Linear. Use exactly this structure to preserve the audit trail and enable downstream extraction by `/close-epic`.

The flow is hands-off: the agent applies the impact-bar policy in `SKILL.md` Step 3 autonomously, posts this report, and lets the user review retrospectively. There is no mid-flow user-decision step.

## Standard Template

```markdown
## Cross-Model Review Report

**Model**: [model] | **Reasoning**: [reasoning level] | **Date**: [date]

### Summary
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed by Codex**: N
- **Fixed by agent**: N
- **SCOPE_EXPANSION_ESCAPE tickets filed**: N
- **Dismissed by agent (with reasoning)**: N
- **Closure-log (P3 + below-bar items)**: N

### Auto-Fixed by Codex
Items Codex fixed automatically because the correct fix was unambiguous.

| # | Priority | Category | File | What Changed | Codex Reasoning |
|---|----------|----------|------|--------------|-----------------|
| [n] | [P-level] | [bug/security/logic/style] | [file:line] | [what changed] | [why this was fixed] |

### Fixed by Agent
Items Codex could not auto-fix due to ambiguity. The agent applied the impact-bar policy and chose to fix in-branch.

| # | Priority | File | Finding | Fix Applied |
|---|----------|------|---------|-------------|
| [n] | [P-level] | [file:line] | [finding] | [fix description] |

### SCOPE_EXPANSION_ESCAPE Tickets
For each escape used — required for any P1/P2 not fixed in-branch. The escape applies ONLY when the fix would touch a different module entirely OR 3+ files outside the ticket's AC-defined scope, AND the agent can write a passing impact-bar sentence.

| # | Priority | File | Finding | Linear Ticket | Impact-Bar Sentence | Scope-Expansion Rationale |
|---|----------|------|---------|---------------|---------------------|---------------------------|
| [n] | [P-level] | [file:line] | [finding] | [PROJ-XXX] | "Without this, [behavior] changes for [code path / segment / property]" | [files outside AC scope, count, why fix-in-branch is inappropriate] |

### Dismissed
Items the agent concluded are wrong (Codex misunderstood intent, the pattern is intentional, the code is correct). Reasoning must be specific enough that a reviewer can evaluate.

| # | Priority | File | Finding | Agent's Reasoning |
|---|----------|------|---------|-------------------|
| [n] | [P-level] | [file:line] | [finding] | [why dismissed — specifics, not "intentional"] |

### Considered but not pursued (closure-log)

All P3 findings + any below-bar items the agent considered. Reviewers may promote any entry by filing a regular ticket referencing this comment line.

- **[Item]** — Why considered: [Codex finding]. Why below the bar: [disqualifying phrasing or unfillable slot — see `no-silent-deferrals` Part 2]. What would change to re-evaluate: [named condition that would promote this to a real ticket].
- (or: "None — all P1/P2 findings were resolved, no P3 items observed.")

---
*Automated by /epic-swarm — Tier [N]*
```

For `/execute-ticket` standalone mode, replace the footer with `*Automated by /execute-ticket*`.

## Critical Rules for This Report

- The **SCOPE_EXPANSION_ESCAPE Tickets** section is the named escape hatch. Every use must include the impact-bar sentence AND the scope-expansion rationale. The escape exists to handle genuine cross-module scope expansion — NOT difficulty, complexity, or "needs more thought." See `SKILL.md` Step 3 for the disqualifying-rationale list.
- The **Closure-log** section is durable audit-trail content. It is aggregated by `/close-epic` into the epic-level Considered-but-not-pursued section. Do NOT omit items to make the report shorter — every observation that didn't earn a fix or ticket goes here.
- The **Dismissed** section requires specific reasoning a reviewer can evaluate. Vague notes like "intentional" or "false positive" are insufficient.
- Items in **Auto-Fixed by Codex** should be reviewed by the agent for correctness before posting. If Codex misunderstood intent, revert and treat as Category B (Fixed by Agent or Dismissed).

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
