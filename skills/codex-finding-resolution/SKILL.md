---
name: codex-finding-resolution
description: Use when Codex review returns findings, when processing codex_review_and_fix or codex_review results, when cross-model review report contains P1-P3 items, or when about to post a Codex review report to Linear. Use in both /epic-swarm and /execute-ticket workflows.
---

# Codex Finding Resolution

All Codex findings at P1-P3 severity MUST be resolved — fixed, explicitly dismissed with reasoning, or deferred with user approval. Silently ignoring findings is never acceptable.

## The Rule

**Codex is instructed to auto-fix all unambiguous P1-P3 issues.** The orchestrator then presents the REMAINING items — ambiguous findings, questions, and awareness items — to the user for decisions. Every finding reaches a resolution: auto-fixed, manually fixed, dismissed with reasoning, or deferred with user approval. Nothing is silently dropped.

## Why This Exists

Production data from a prior epic-swarm run showed Codex reviews completing with P1-P3 findings that were silently dropped — never posted to Linear, never fixed, never presented to the user. These findings are frequently more important than Codex's priority labels suggest. In past projects, all P1-P3 items were fixed. The epic-swarm workflow broke this discipline by treating Codex review as a fire-and-forget step.

## Context Quality is Critical

Codex review quality depends directly on the context provided. The `context` field passed to `codex_review_and_fix` should be a structured prompt that includes:

1. **Explicit review dimensions** — requirements compliance, tech-stack best practices, SOLID/DRY, bugs, code quality, security
2. **Full ticket description and acceptance criteria** — verbatim, not summarized
3. **Implementation summary** — from the implementation phase report
4. **Prior code review concerns** — from Claude's code review report
5. **Tech stack reference** — explicitly name the project's frameworks so Codex activates framework-specific review patterns

See `commands/codex-review.md` Step 2 for the exact context string template.

## The Resolution Process

### Step 1: Run Codex Review

```
Call mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [path to worktree or project]
  - base_branch: [base branch]
  - context: [ticket description + AC + implementation summary]
```

**Parse the JSON response first.** The tool returns a JSON string:
- If `"status": "complete"` → the review succeeded. Proceed to Step 2 with the `"output"` field.
- If `"error": "rate_limit"` → actual rate limit. Handle per the skip templates below.
- If `"error": "codex_not_found"` or `"error": "codex_error"` → handle per skip templates.

**CRITICAL:** The `"output"` field of a successful response may contain the phrase "rate limit" as a **code review finding** (e.g., "Missing rate limit on auth endpoint"). This is Codex reporting a code quality issue, NOT a rate limit error. Only `"error": "rate_limit"` at the JSON top level is a rate limit error.

### Step 2: Parse Results into Three Categories

After `codex_review_and_fix` returns with `"status": "complete"`:

**Category A — Auto-Fixed (P1-P3 unambiguous):**
Items Codex fixed automatically because the fix was clear. Review these for correctness — verify Codex didn't introduce regressions or misunderstand the intent.

**Category B — Needs Decision (P1-P3 with questions):**
Items Codex identified but couldn't auto-fix because the right approach is ambiguous. These require user judgment — Codex provides its question or concern for each.

**Category C — For Awareness (P3 informational):**
Low-priority observations that don't require action but are worth noting. Present for completeness.

### Step 3: Present ALL Findings to the User

**This step is mandatory. Do NOT skip it.**

```
## Codex Review Results — [ticket-id]

### Auto-Fixed ([count] items)
| Priority | File | Change | Codex Reasoning |
|----------|------|--------|-----------------|
| P1 | src/services/auth.ts:42 | Added null check | Potential NPE on optional field |

### Needs Decision ([count] items)
| # | Priority | File | Finding | Codex Question |
|---|----------|------|---------|----------------|
| 1 | P1 | src/routes/api.ts:89 | Missing rate limit | Should this endpoint have per-user rate limiting? |
| 2 | P2 | src/utils/parse.ts:15 | Unchecked cast | Is this type assertion guaranteed safe? |

### For Awareness ([count] items)
| Priority | File | Observation |
|----------|------|-------------|
| P3 | src/config.ts:3 | Magic number could be a named constant |

What would you like to do with the "Needs Decision" items?
Options per item: [Fix] [Dismiss with reason] [Defer to follow-up ticket]
```

**WAIT for user response.** Do not proceed until the user has decided on every Needs Decision item.

### Step 4: Apply User Decisions

For each item the user approves for fixing:

```
Call mcp__codex-review-server__codex_fix with:
  - project_dir: [path]
  - instructions: [user's guidance for this specific fix]
```

Or fix manually if Codex fix is not suitable.

Commit all fixes:
```bash
git -C [worktree-path] add -A
git -C [worktree-path] commit -m "fix([ticket-id]): apply codex review findings

[Summary of fixes applied]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 5: Post Full Report to Linear

Post the **complete** Cross-Model Review Report with all findings AND their resolutions:

```
mcp__linear-server__create_comment:
  - issue_id: [ticket-id]
  - body: [formatted report — see template below]
```

**Report template:**

The report MUST capture the full audit trail: what Codex found, what it fixed, what it asked the user, what the user decided, and why. This enables `/close-epic` to extract deferred items and gives the team a complete review history.

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

**Key rules for this report:**
- The "User-Reviewed Items" section preserves the FULL context chain: issue → Codex's uncertainty → Codex's recommendation → user's decision → user's reasoning. Do NOT collapse this into just "decision + reasoning" — the Codex question and recommendation are critical for understanding WHY the item needed human judgment.
- Items the user chose to DEFER in the User-Reviewed section MUST also appear in the Deferred Items table with classification `DISCOVERED`.
- Items in "Declined by Codex" that the user later identifies as needing fixes should be addressed in a follow-up — they are NOT retroactively fixed during this phase.
- For `/execute-ticket` standalone mode, use footer: `*Automated by /execute-ticket*`

### Step 6: Add Label

```
mcp__linear-server__update_issue:
  - issue_id: [ticket-id]
  - labelNames: [add "codex-reviewed"]
```

## Red Flags — STOP If You Notice These

| Thought | Reality |
|---------|---------|
| "Codex only found P3 items, not worth presenting" | Present ALL findings. P3s may be more important than Codex thinks. |
| "I'll just auto-fix and move on" | Auto-fixes are step 1. Needs Decision items require user input. |
| "The user is busy, I'll skip the decision step" | Finding resolution is the whole point. WAIT for the user. |
| "These findings aren't critical" | Past projects fixed ALL P1-P3. The user decides criticality, not you. |
| "Codex review timed out, nothing to do" | Post a skip note to Linear. Document WHY it was skipped. |
| "The tier is waiting, I'll defer all findings" | Present findings. User can choose to defer, but that's their call. |
| "I already posted the phase reports" | Codex report is a SEPARATE report. It gets its own comment. |
| "The report would be mostly empty" | "0 findings" IS a report. Post it — it proves the review ran. |

## Handling Skip/Error Cases

Even when Codex review doesn't complete, post a record to Linear:

**Server unavailable:**
```markdown
## Cross-Model Review Report

**Status:** SKIPPED — Codex MCP server not configured

No cross-model review was performed. Install from: [server URL]

---
*Automated by /epic-swarm — Tier [N]*
```

**Rate limited:**
```markdown
## Cross-Model Review Report

**Status:** DEFERRED — Rate limit reached (retried once after 60s)

Run `/codex-review [ticket-id]` independently to complete cross-model review.

---
*Automated by /epic-swarm — Tier [N]*
```

**Error/timeout:**
```markdown
## Cross-Model Review Report

**Status:** FAILED — [error message]

Cross-model review did not complete. Error: [details]
Run `/codex-review [ticket-id]` independently to retry.

---
*Automated by /epic-swarm — Tier [N]*
```

**In ALL cases, a comment is posted.** The absence of a Cross-Model Review Report comment means the step was forgotten, not that it was skipped for a good reason.

## Epic-Swarm Specific Behavior

In the epic-swarm workflow, Codex review runs after the code review phase completes for each ticket (Section 3.3). The orchestrator must:

1. Run Codex review for each ticket that passed code review
2. Present findings for ALL tickets to the user at once (batch presentation is acceptable)
3. Wait for user decisions
4. Apply fixes in each ticket's worktree
5. Post individual reports to each ticket in Linear
6. Record outcome in swarm state

Batching the presentation (showing findings for CON-42, CON-43, CON-44 together) is fine for efficiency, but each ticket gets its own Linear comment with its own findings.
