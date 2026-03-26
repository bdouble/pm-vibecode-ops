---
description: Cross-model code review using OpenAI Codex for bug detection, security analysis, and surgical fixes
allowed-tools: Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix, mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__create_comment
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

**1.3 Determine base branch:**
```bash
base_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
```

**1.4 Get project directory:**
```bash
project_dir=$(git rev-parse --show-toplevel)
```

---

## Step 2: Codex Review and Fix

Codex runs as a **full agent** in the repository with complete file access. It reviews the branch diff, explores related files for context, and auto-fixes clear-cut issues — the same as running Codex manually.

**Default mode — Review and auto-fix (recommended):**

```
Use mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [absolute path to project root]
  - base_branch: [base branch from Step 1.3]
  - focus: "all" (or user preference: "bugs", "security", "performance")
  - context: [ticket description + acceptance criteria + implementation summary]
```

Codex will:
1. Review all changes with full repo access (reads files, explores imports, traces code paths)
2. Classify findings as P0 (critical), P1 (high), P2 (medium), P3 (low)
3. **Auto-fix P0-P2 findings** that are clear-cut (high confidence, obvious fix)
4. **Report but NOT fix P0-P2 findings** where Codex has questions or uncertainty
5. **Report P3 findings** for awareness only (never fixed)

**Alternative — Review-only mode:**

If you want to see all findings before any fixes:
```
Use mcp__codex-review-server__codex_review with:
  - project_dir: [absolute path to project root]
  - base_branch: [base branch]
  - focus: "all"
  - context: [ticket context]
```

This runs in read-only mode. No files are modified.

**If the MCP tool returns a rate limit error:**
1. Wait 60 seconds, retry once
2. If still rate-limited: report to user that Codex review is queued
3. Post a note to Linear: "Cross-model review deferred due to rate limiting. Run `/codex-review $ARGUMENTS` to complete."
4. Continue to the next workflow phase — Codex review is valuable but not a hard gate

---

## Step 3: Present Results

Parse Codex's output and present to the user in three sections:

```
## Codex Cross-Model Review Results

Model: gpt-5.3-codex | Reasoning: xhigh

### Auto-Fixed (P0-P2, clear-cut)
| # | Priority | Category | File | What was fixed |
|---|----------|----------|------|---------------|
| 1 | P0 | security | src/auth.ts:42 | Parameterized SQL query |
| 2 | P1 | bug | src/api.ts:89 | Added null check on response |

### Needs Your Decision (P0-P2, has questions)
| # | Priority | Category | File | Issue | Codex's Question |
|---|----------|----------|------|-------|-----------------|
| 3 | P1 | logic | src/util.ts:15 | Off-by-one in pagination | "Should this be 0-indexed or 1-indexed? The API docs are ambiguous." |

### For Awareness (P3)
| # | Category | File | Description |
|---|----------|------|-------------|
| 4 | style | src/config.ts:8 | Magic number could be a named constant |
```

**For "Needs Your Decision" items, ask the user:**
- **FIX** — provide guidance, then run second pass
- **DISMISS** — skip (note the reason)
- **DEFER** — add to technical debt

---

## Step 4: Second Pass (if needed)

If the user approved any "Needs Your Decision" items with guidance:

```
Use mcp__codex-review-server__codex_fix with:
  - project_dir: [absolute path to project root]
  - findings: [the approved findings with user's guidance]
  - context: [user's specific instructions for how to approach each fix]
```

Codex runs again with write access, applying only the specified fixes.

---

## Step 5: Commit and Push

After all fixes (auto and second-pass) are applied:

```bash
# Check what Codex changed
git diff --stat
git diff  # review the actual changes

# Commit
git add -A
git commit -m "fix: address cross-model review findings [$ARGUMENTS]"
git push origin HEAD
```

**Important:** Review the git diff before committing. Codex's auto-fixes should be surgical, but verify nothing unexpected changed.

---

## Step 6: Post Report to Linear

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
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed**: N (clear-cut P0-P2)
- **Fixed after review**: N (P0-P2 with user guidance)
- **Dismissed**: N
- **Deferred**: N
- **For awareness**: N (P3)

### Auto-Fixed Items
[For each: priority, file, what was changed and why]

### Human-Decided Items
[For each: priority, file, decision (fixed/dismissed/deferred), reasoning]

### For Awareness (P3)
[For each: description, file, why it's low priority]

### Deferred Items
[List items for follow-up tickets]
```

**If this is running as part of `/execute-ticket`:** the report becomes part of the context passed to the Security Review phase.

---

## Step 7: Add Label

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
| `CODEX_REVIEW_HOME` | `~/.codex` | Codex CLI home directory (config.toml + credentials) |
| `CODEX_REVIEW_MODEL` | `gpt-5.3-codex` | OpenAI model ID (must start with `gpt-` or `o`) |
| `CODEX_REVIEW_REASONING` | `xhigh` | Reasoning effort: none, low, medium, high, xhigh |
| `CODEX_REVIEW_TIMEOUT` | `1500` | Timeout in seconds per call (25 min default — repo-aware reviews are thorough) |
| `CODEX_REVIEW_FOCUS` | `all` | Focus area: bugs, security, performance, all |
