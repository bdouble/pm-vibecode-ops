---
name: codex-finding-resolution
description: Use when Codex review returns findings, when processing codex_review_and_fix or codex_review results, when cross-model review report contains P1-P3 items, or when about to post a Codex review report to Linear. Also use when about to file a Codex finding as a follow-up ticket (use the SCOPE_EXPANSION_ESCAPE rules), when about to skip a P1 or P2 finding with rationale like "complex / tricky / needs more thought" (these are disqualifying — fix it now), when about to file P3 findings as tickets (P3 → closure-log only), or when about to pause Codex review for mid-flow user input (the flow is hands-off; agent applies impact-bar autonomously). Use in both /epic-swarm and /execute-ticket workflows.
---

# Codex Finding Resolution

Codex review is a hands-off automated step. The agent applies a disciplined resolution policy on its own — bias strongly toward fix-now — and posts a full audit-trail report to Linear. The user reviews retrospectively and can promote any rejection by filing a regular ticket that references the report comment. Mid-flow user-decision prompts are explicitly removed; they were producing user-decision fatigue and false sprawl of "Defer to follow-up ticket" outcomes.

## The Rule

**P1/P2 default: fix it now in the originating branch.** Filing a P1 or P2 as a follow-up ticket is a deferral of important work and is prohibited except via the named SCOPE_EXPANSION_ESCAPE below. **P3 default: closure-log entry, not ticket.** Codex auto-fixes the unambiguous items first; the agent resolves the remainder by applying the impact bar from `no-silent-deferrals` Part 2. Nothing is silently dropped — every finding lands as auto-fixed, agent-fixed, SCOPE_EXPANSION_ESCAPE ticket, or closure-log entry.

## Why This Exists

Two failure modes drove this policy:

1. **Silent drops.** Earlier production data showed Codex reviews completing with P1-P3 findings that never reached Linear. The audit-trail report exists to prevent that.
2. **User-decision sprawl.** The prior "Present ALL findings, WAIT for user response, options [Fix / Dismiss / Defer]" flow was producing two bad outcomes at once: it required the user to manually adjudicate every Codex run (Codex review was supposed to be hands-off), and the "Defer to follow-up ticket" option became the agent's escape hatch for any fix that felt complex — flooding the backlog with low-impact P3 tickets that no one wanted. Removing the user wait and replacing the defer-to-ticket default with closure-log fixes both.

Codex review is now expected to complete without user intervention. The user reviews the posted report afterward and can promote any closure-log entry or SCOPE_EXPANSION_ESCAPE ticket by filing a new ticket referencing the comment.

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

### Step 2: Categorize Findings

After `codex_review_and_fix` returns with `"status": "complete"`:

**Category A — Auto-Fixed by Codex (any priority, unambiguous):**
Items Codex fixed automatically because the fix was clear. Review each for correctness — verify Codex didn't introduce regressions or misunderstand the intent. If a Codex auto-fix is wrong, revert it (treat as Category B-Fix).

**Category B — Needs Agent Resolution (P1-P2 with ambiguity, or P3 candidates):**
Items Codex identified but couldn't auto-fix. These are NOT user-decision items anymore — the agent resolves them following Step 3.

**Category C — For Awareness (P3 informational):**
Low-priority observations that Codex did not auto-fix and that obviously don't justify a fix. Default disposition: closure-log entry.

### Step 3: Agent Resolution (Hands-Off, No User Wait)

For each Category B item, the agent applies this resolution tree in order:

**(a) If the finding is P1 or P2 → DEFAULT: fix it now in the originating branch.**

Use `codex_fix` with explicit instructions, or fix manually. Bias strongly toward this default. "It's complex," "it's tricky," "it needs more thought," "I'm not sure how to approach it" are not reasons to skip the fix — they are reasons to think harder and do it. Use `systematic-debugging` if you genuinely need to work through the problem.

**(b) SCOPE_EXPANSION_ESCAPE — single escape for P1/P2 only.**

The agent may file a follow-up ticket for a P1 or P2 finding ONLY when BOTH conditions hold:

1. **The fix would touch files outside the ticket's AC-defined scope** in a substantial way. Concretely: a different module entirely, OR 3 or more files outside the surfaces named in the ticket's acceptance criteria. Touching one adjacent file is not scope expansion — fix it now.
2. **The agent can write a passing impact-bar sentence** for the deferred fix using the template from `no-silent-deferrals` Part 2:

> "Without this, **[specific production behavior / user experience / cost / security control / operational property]** changes for **[identified code path / user-operator segment / named operation-system]**."

The impact-bar sentence in the SCOPE_EXPANSION_ESCAPE rationale describes the *finding* (why it's worth a ticket), not the *scope-expansion* (which is the reason for filing instead of fixing). Both must be argued.

**Disqualifying rationales** (the fix happens in branch, no escape):
- "It's complex" / "it's tricky" / "it would take a while"
- "It needs more thought"
- "It might cause regressions" (use systematic-debugging — that's not an escape, it's a method)
- "The user might disagree with the approach" (the user reviews retrospectively; ship the best fix and document the choice)
- "Maintainability" / "code quality" / "consistency" / "developer experience" (these are the disqualifying phrasings from no-silent-deferrals Part 2)

When the escape applies, file ONE ticket and tag it explicitly in the Linear report as `SCOPE_EXPANSION_ESCAPE` so reviewers can spot every use. The agent does not need to prompt the user.

**(c) If the finding is P3 → closure-log entry, not ticket.**

P3 findings document non-load-bearing concerns. They go into the closure-log section of the Linear report so reviewers can see them and promote any to a ticket if they disagree. Do not file tickets for P3 findings under any circumstance — there is no escape for P3.

**(d) Dismiss with reasoning — agent-driven.**

If the agent concludes the finding is wrong (Codex misunderstood the intent, the pattern is intentional, the code is correct), record a dismissal with explicit reasoning. Dismissals appear in the report with the agent's reasoning so reviewers can disagree.

### Step 4: Apply Resolutions

For each Category B item the agent resolved as "fix now":

```
Call mcp__codex-review-server__codex_fix with:
  - project_dir: [path]
  - instructions: [agent's guidance for this specific fix]
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

For each SCOPE_EXPANSION_ESCAPE ticket the agent filed, capture the ticket ID for the report.

For each closure-log entry, capture the item + rationale for the report.

### Step 5: Post Full Report to Linear

Post the **complete** Cross-Model Review Report with all findings AND their resolutions:

```
mcp__linear-server__save_comment:
  - issue_id: [ticket-id]
  - body: [formatted report — see template below]
```

The report MUST capture the full audit trail: what Codex found, what it fixed, what the agent fixed, what the agent dismissed (with reasoning), what the agent filed as SCOPE_EXPANSION_ESCAPE (with rationale), and what the agent placed in the closure-log (with rationale). This enables retrospective user review and `/close-epic` aggregation.

### Required Report Structure

The full report template lives in `references/report-template.md` (six required sections: Summary, Auto-Fixed by Codex, Fixed by Agent, SCOPE_EXPANSION_ESCAPE Tickets, Dismissed, Considered but not pursued). Copy that template verbatim — it captures the audit trail and enables `/close-epic` aggregation.

Critical rules (covered fully in the references file):
- Every SCOPE_EXPANSION_ESCAPE ticket must include the impact-bar sentence AND the scope-expansion rationale.
- The closure-log section must be present even if "None" — its absence breaks the audit trail.
- Dismissals require specific reasoning a reviewer can evaluate ("intentional" alone is insufficient).
- Reviewers who disagree with any agent decision file a regular ticket referencing the comment line. No special promotion mechanism is needed.

**Skip / error variants** (rate-limited, server unavailable, codex error) are documented in the same references file.

### Step 6: Add Label

```
mcp__linear-server__update_issue:
  - issue_id: [ticket-id]
  - labelNames: [add "codex-reviewed"]
```

## Red Flags — STOP If You Notice These

| Thought | Reality |
|---------|---------|
| "Codex only found P3 items, not worth posting" | Post the report. P3 closure-log entries are the audit trail. "0 P1/P2 findings" IS the report. |
| "I'll defer this P1 to a follow-up ticket — it's complex" | "Complex" is a disqualifying rationale. Fix it now. SCOPE_EXPANSION_ESCAPE is for genuine scope expansion, not difficulty. |
| "I'll defer this P2 — the user might want a different approach" | The user reviews retrospectively. Ship the best fix and document the choice. |
| "I'll file P3 tickets to show I was thorough" | P3 → closure-log, never ticket. Period. |
| "I'll wait for the user to decide on the ambiguous items" | The user-wait step is removed. The agent applies the impact bar and acts. |
| "These findings aren't critical, I'll skip the report" | Post the report even if empty. The audit trail is the deliverable. |
| "Codex review timed out, nothing to do" | Post a skip note to Linear. Document WHY it was skipped. |
| "SCOPE_EXPANSION_ESCAPE feels safer than fixing in branch" | The escape is for genuine cross-module scope expansion only. The bar is high — touching 1-2 adjacent files is not scope expansion. |
| "The P2 fix needs systematic-debugging — that's an escape" | systematic-debugging is a method for hard fixes, not an escape from doing them. Use it and fix the finding. |
| "I'll dismiss this with a vague 'intentional' note" | Dismissals require explicit reasoning the reviewer can evaluate. Specifics or fix-it. |

## Handling Skip/Error Cases

Even when Codex review doesn't complete, post a record to Linear. See `references/report-template.md` for the verbatim templates for `SKIPPED` (server unavailable), `DEFERRED` (rate limited), and `FAILED` (error/timeout) variants.

**In ALL cases, a comment is posted.** The absence of a Cross-Model Review Report comment means the step was forgotten, not that it was skipped for a good reason.

## Epic-Swarm Specific Behavior

In the epic-swarm workflow, Codex review runs after the code review phase completes for each ticket (Section 3.3). The orchestrator must:

1. Run Codex review for each ticket that passed code review
2. The agent in each ticket's run applies the resolution policy and posts the report — no batched user-decision step
3. Apply fixes in each ticket's worktree
4. Post individual reports to each ticket in Linear
5. Record outcome in swarm state — including any SCOPE_EXPANSION_ESCAPE ticket IDs

Closure-log entries from per-ticket Codex reports are aggregated by `/close-epic` into the epic-level Considered-but-not-pursued section.

## Related Skills
- **no-silent-deferrals**: Defines the impact bar (Part 2), closure-log outcome, and the disqualifying phrasings the SCOPE_EXPANSION_ESCAPE must avoid. The bias-toward-fix-now is the same default as the deferral discipline.
- **production-code-standards**: Codex auto-fixes and agent fixes must meet the same production-quality bar as original implementation.
- **systematic-debugging**: When a P1/P2 fix is hard, use this — not the SCOPE_EXPANSION_ESCAPE.
- **epic-closure-validation**: Closure aggregates per-ticket codex closure-logs and applies the follow-up ticket cap.
