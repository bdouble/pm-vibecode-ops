---
name: swarm-phase-reporting
description: Use when any workflow phase completes for a ticket — adaptation, implementation, testing, documentation, code review, codex review, or security review. Use when processing agent results, when about to advance to the next phase, when a ticket status is being updated, or when an agent has returned a structured report. Applies in both /epic-swarm and /execute-ticket workflows.
---

# Phase Report Posting

Every completed workflow phase MUST be posted as a structured comment on the ticket in Linear. No exceptions.

## The Rule

**After every phase completes for every ticket, post the full structured report as a Linear comment BEFORE advancing to the next phase.**

This is not optional. This is not deferrable. A phase that completes without a Linear comment is a phase that never happened — downstream workflows (/close-epic, resume detection) depend on these comments to function.

## Why This Exists

Production data from a prior epic-swarm run showed:
- 11 completed tickets
- Only 6 had adaptation reports posted
- **Zero** had implementation, testing, documentation, code review, or security reports
- Tickets were marked Done with no audit trail
- `/close-epic` cannot extract deferred items from missing reports
- Codex review findings were silently lost

The execute-ticket workflow posted all 7 phase reports correctly on the same workload. The difference: execute-ticket processes one ticket at a time; epic-swarm manages multiple tickets across waves and loses track of posting under cognitive load.

## Mandatory Steps After Every Phase

```
1. Agent returns structured report
2. VALIDATE report has required fields (see Report Validation below)
3. POST report to Linear via mcp__linear-server__create_comment
4. VERIFY the comment was created (check for errors)
5. ADD quality label if applicable
6. UPDATE swarm state (if in epic-swarm)
7. ONLY THEN advance to the next phase
```

**Step 3 is the critical step that gets skipped.** If you are about to move to the next phase and you have not called `mcp__linear-server__create_comment` for this ticket and this phase — STOP. You are violating this rule.

## Report Format

Every report comment MUST use this exact structure:

```markdown
## [Phase Name] Report

[Agent's full structured report — verbatim, unmodified, no summarization]

---
*Automated by /epic-swarm — Tier [N]*
```

Or for execute-ticket:

```markdown
## [Phase Name] Report

[Agent's full structured report — verbatim, unmodified, no summarization]

---
*Automated by /execute-ticket*
```

### Phase Name Mapping (EXACT — do not vary)

| Phase | Report Header |
|-------|---------------|
| Adaptation | `## Adaptation Report` |
| Implementation | `## Implementation Report` |
| Testing | `## Testing Report` |
| Documentation | `## Documentation Report` |
| Code Review | `## Code Review Report` |
| Codex Review | `## Cross-Model Review Report` |
| Security Scan (Pre-Merge) | `## Security Scan Report (Pre-Merge)` |
| Security Review (Post-Merge) | `## Security Review Report` |

These headers are consumed by `/execute-ticket` resume detection and `/close-epic` deferred item extraction. Using different headers breaks both.

## Report Validation — Required Fields Per Phase

Before posting, validate the report contains these fields. If ANY required field is missing, retry the phase ONCE with an enhanced prompt requesting the missing fields. If the retry also fails, PAUSE the ticket.

| Phase | Required Fields |
|-------|-----------------|
| Adaptation | Status, Summary, Target Files or Implementation Plan |
| Implementation | Status, Summary, Files Changed, Quality Gates (lint/typecheck/test results) |
| Testing | Status, Gate #0 result, Gate #1 result, Gate #2 result, Gate #3 result |
| Documentation | Status, Summary, Documentation Updated or Docs Created |
| Code Review | Review Status, Requirements Checklist, Files Reviewed |
| Codex Review | Summary with finding counts by priority, Auto-Fixed Items section, User-Reviewed Items section, Declined by Codex section |
| Security Scan | Status, Security Checklist or OWASP assessment |
| Security Review | Status, Security Checklist, OWASP assessment, Remediation Summary |

All reports MUST include a **Deferred Items** table (even if empty):

```markdown
### Deferred Items
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| [AC-DEFERRED/DISCOVERED/OUT-OF-SCOPE] | [severity] | [file:line] | [description] | [reason] |
```

## Quality Labels

After posting the report, add the appropriate label:

| Phase | Condition | Label |
|-------|-----------|-------|
| Testing | All gates PASS | `tests-complete` |
| Documentation | Report posted | `docs-complete` |
| Code Review | Review Status: APPROVED | `code-reviewed` |
| Security Review (Post-Merge) | PASS, no CRITICAL/HIGH | `security-approved` |

## Red Flags — STOP If You Notice These

| Thought | Reality |
|---------|---------|
| "I'll post the reports after all phases complete" | Post EACH report immediately. Batching = forgetting. |
| "The agent report was short, not worth posting" | Short reports are still reports. Post them. |
| "I already updated the swarm state, that's enough" | Swarm state is for resume. Linear comments are for humans and /close-epic. Both required. |
| "This phase didn't produce anything interesting" | Every phase produces a report. Even "no issues found" is a report. |
| "I'll post a summary at the end" | Summaries lose deferred items, AC verification details, and finding specifics. Post full reports. |
| "The ticket is already Done, no need to post" | Reports are the audit trail. Post them even for Done tickets. |
| "Posting would slow down the tier" | One API call takes < 1 second. Skipping it breaks /close-epic. |
| "The report didn't have the right format" | Fix the format and post. Don't skip posting because format was imperfect. |

## Gold Standard Example

See `examples/gold-standard-phase-reports.md` for a complete comment thread from a ticket executed with `/execute-ticket` that has all 7 phase reports posted correctly. Every ticket processed by `/epic-swarm` should have comparable report detail and completeness.

## Report Detail Expectations

Reports are NOT summaries. Each report should include:

- **Specific file paths** changed or reviewed
- **Concrete findings** with file:line references
- **Verification evidence** (command outputs, test counts, lint results)
- **Deferred items** with classification and reasoning
- **Quality gates** with pass/fail status and details

Compare against the gold-standard examples. If your report has less detail, it's probably missing something.

See `references/report-templates.md` for the full expected template for each phase.
