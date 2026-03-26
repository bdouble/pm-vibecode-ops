---
description: Cross-model code review using OpenAI Codex for bug detection, security analysis, and surgical fixes
allowed-tools: Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix, mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__create_comment
argument-hint: <ticket-id>
workflow-phase: cross-model-review
closes-ticket: false
workflow-sequence: "codereview → **codex-review** → security-review"
---

# Cross-Model Code Review (Codex)

Perform an adversarial code review using OpenAI's Codex model to catch issues that Claude's review may have missed. This leverages documented blind-spot asymmetry between models — Codex excels at finding subtle runtime bugs, edge cases, and security vulnerabilities.

## Prerequisites

- Codex MCP server installed and configured (`codex-review-server`)
- Codex CLI authenticated (`codex login`)
- Target ticket has completed at least the Implementation phase

If the Codex MCP server is not available, inform the user:
```
Cross-model review requires the codex-review-server MCP. Install it from:
https://github.com/bdouble/codex-review-server

Then run: claude mcp add codex-review-server -- python3 ~/.claude/mcp/codex-review-server/server.py
```

## Input

- `$ARGUMENTS` — Linear ticket ID (e.g., `PRJ-123`)

---

## Step 1: Context Gathering

**1.1 Fetch ticket from Linear:**
```
Use mcp__linear-server__get_issue to fetch ticket: $ARGUMENTS
```

Extract:
- Ticket title and description
- Acceptance criteria (full, verbatim)
- Technical notes

**1.2 Fetch comments (prior phase reports):**
```
Use mcp__linear-server__list_comments to get all comments for the ticket
```

Extract key context from:
- Implementation report (what was built, approach taken)
- Code review report (any concerns flagged by Claude)

**1.3 Get git diff:**
```bash
# Get the base branch (usually main)
base_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

# Full diff against base
git diff ${base_branch}...HEAD
```

**1.4 Get changed files list:**
```bash
git diff --name-only ${base_branch}...HEAD
```

---

## Step 2: Codex Review

Call the `codex_review` MCP tool with the gathered context:

```
Use mcp__codex-review-server__codex_review with:
  - diff: [the full git diff from Step 1.3]
  - context: [ticket description + acceptance criteria + implementation summary]
  - focus: "all"  (or override with user preference)
  - depth: [from CODEX_REVIEW_REASONING env var, default "xhigh"]
```

The tool returns structured findings:
```json
{
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "category": "bug|security|performance|logic|edge-case",
      "file": "src/services/auth.ts",
      "line": 42,
      "description": "...",
      "evidence": "...",
      "suggested_fix": "...",
      "confidence": 0.95
    }
  ]
}
```

**If the MCP tool returns a rate limit error:**
1. Wait 60 seconds, retry once
2. If still rate-limited: report to user that Codex review is queued
3. Post a note to Linear: "Cross-model review deferred due to rate limiting. Run `/codex-review $ARGUMENTS` to complete."
4. Continue to the next workflow phase — Codex review is valuable but not a hard gate

---

## Step 3: Present Findings

Display findings to the user, sorted by severity (critical first):

```
## Codex Cross-Model Review Findings

Model: gpt-5.3-codex | Reasoning: xhigh | Findings: N

| # | Severity | Category | File:Line | Description |
|---|----------|----------|-----------|-------------|
| 1 | CRITICAL | security | src/auth.ts:42 | SQL injection via unsanitized input |
| 2 | HIGH     | bug      | src/api.ts:89  | Null dereference on empty response |
| 3 | MEDIUM   | logic    | src/util.ts:15 | Off-by-one in pagination calc |
```

**For each finding, ask the user:**
- **APPROVE** — queue for fix generation
- **DISMISS** — skip (note the reason for the record)
- **DEFER** — add to technical debt / follow-up ticket

**If `CODEX_REVIEW_AUTO_FIX=true`:** auto-approve all findings, skip user interaction.

**If no findings:** report clean review, skip to Step 5.

---

## Step 4: Fix Generation (for approved findings)

For each approved finding, generate and apply a fix:

**4.1 Generate fix:**
```
Use mcp__codex-review-server__codex_fix with:
  - finding: [the finding object]
  - file_content: [current content of the affected file]
  - context: [surrounding code context]
```

**4.2 Apply the patch:**
- Read the current file
- Apply the suggested changes using Edit tool
- Preserve surrounding code exactly

**4.3 Verify the fix:**
```bash
# Run affected tests
npm test -- --testPathPattern="[affected test file]"
# OR run the full suite if test mapping is unclear
npm test
```

**4.4 If tests fail after applying a fix:**
- Revert the fix: `git checkout -- [file]`
- Note the failure in the report
- Move to the next finding
- Do NOT attempt to debug Codex's fix — report it for manual review

**4.5 After all fixes are applied and verified:**
```bash
git add -A
git commit -m "fix: address cross-model review findings [$ARGUMENTS]"
git push origin HEAD
```

---

## Step 5: Post Report to Linear

Post the cross-model review report as a comment on the Linear ticket:

```
Use mcp__linear-server__create_comment with:
  issueId: [ticket ID]
  body: [report below]
```

**Report format:**

```markdown
## Cross-Model Review Report

**Model**: gpt-5.3-codex | **Reasoning**: xhigh | **Date**: [date]

### Summary
- **Findings**: N total (X critical, Y high, Z medium)
- **Approved**: N | **Dismissed**: N | **Deferred**: N
- **Fixes Applied**: N (all tests passing)

### Findings Detail

#### Finding 1: [description] — [FIXED | DISMISSED | DEFERRED]
- **Severity**: CRITICAL | **Category**: security
- **File**: src/auth.ts:42
- **Evidence**: [evidence from Codex]
- **Resolution**: [what was done — fix description, or dismissal reason, or deferral note]

[... repeat for each finding ...]

### Deferred Items
[List any deferred items for follow-up tickets]
```

**If this is running as part of `/execute-ticket`:** the report becomes part of the context passed to the Security Review phase.

---

## Step 6: Add Label

```bash
# Add codex-reviewed label to the PR if one exists
pr_number=$(gh pr list --head "$(git branch --show-current)" --json number -q '.[0].number')
if [ -n "$pr_number" ]; then
  gh pr edit "$pr_number" --add-label "codex-reviewed"
fi
```

---

## Configuration Reference

All configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEX_REVIEW_MODEL` | `gpt-5.3-codex` | OpenAI model ID (must start with `gpt-` or `o`) |
| `CODEX_REVIEW_REASONING` | `xhigh` | Reasoning effort: none, low, medium, high, xhigh |
| `CODEX_REVIEW_TIMEOUT` | `300` | Timeout in seconds per MCP call |
| `CODEX_REVIEW_AUTO_FIX` | `false` | Auto-approve all findings without user interaction |
| `CODEX_REVIEW_MIN_SEVERITY` | `medium` | Minimum severity to include in findings |
| `CODEX_REVIEW_FOCUS` | `all` | Focus area: bugs, security, performance, all |
