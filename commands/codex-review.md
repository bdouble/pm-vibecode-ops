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

**1.1 Fetch ticket and ALL sub-context from Linear:**
```
Use mcp__linear-server__get_issue to fetch ticket: $ARGUMENTS
```

Extract (full, verbatim — do NOT summarize):
- Ticket title and full description
- Acceptance criteria (every item)
- Technical notes
- Parent epic context (if applicable)

**1.2 Fetch ALL comments (prior phase reports):**
```
Use mcp__linear-server__list_comments to get all comments for the ticket
```

Read ALL phase reports — not just implementation. The full history gives Codex the context to evaluate whether the implementation matches the adaptation decisions, whether testing covered the right areas, and whether code review concerns were addressed:
- Adaptation report (architecture decisions, target files, patterns to reuse)
- Implementation report (what was built, files changed, key decisions)
- Testing report (gate results, coverage, deferred items)
- Documentation report (what was documented)
- Code review report (concerns flagged by Claude, requirements checklist results)

**1.3 Determine base branch:**
```bash
base_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
```

**1.4 Get project directory:**
```bash
project_dir=$(git rev-parse --show-toplevel)
```

**1.5 Detect the project's tech stack:**

Scan the project root for stack indicators to inform the review context:
```bash
# Detect package managers and frameworks
[ -f package.json ] && echo "Node.js project"
[ -f tsconfig.json ] && echo "TypeScript"
[ -f next.config.* ] && echo "Next.js"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "Python"
[ -f Cargo.toml ] && echo "Rust"
[ -f go.mod ] && echo "Go"
```

Use the detected stack to inform the `context` field — Codex performs better with explicit stack references because they activate its internal knowledge of framework-specific best practices and common pitfalls.

---

## Step 2: Codex Review and Fix

Codex runs as a **full agent** in the repository with complete file access. It reviews the branch diff, explores related files for context, and auto-fixes clear-cut issues — the same as running Codex manually.

**Default mode — Review and auto-fix (recommended):**

```
Use mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [absolute path to project root]
  - base_branch: [base branch from Step 1.3]
  - focus: "all"
  - context: [build the context string as described below]
```

### Building the Context String

The `context` field is the most important parameter — it determines the quality and specificity of the review. Build it as a structured prompt:

```
We just completed [ticket-id]. Read all ticket context, then conduct a
meticulous code review on the branch. Review for:

1. Compliance with the ticket requirements and acceptance criteria
2. Adherence to [detected tech stack] best practices
3. SOLID/DRY violations
4. Bugs and edge cases
5. Code quality issues
6. Security vulnerabilities
7. Any other issues worth fixing before merge

Fix all P1-P3 issues that are unambiguous, then provide a report with the
remaining prioritized list of questions and issues to resolve.

## Ticket Context
[Full ticket description — verbatim]

## Acceptance Criteria
[Full AC list — verbatim]

## Implementation Summary
[From implementation report — files changed, key decisions, patterns used]

## Prior Review Concerns
[From code review report — any flagged issues, requirements checklist gaps]
```

**Tech stack examples for the `[detected tech stack]` placeholder:**
- TypeScript + Next.js + React project: "TypeScript, Next.js, and React"
- Python + FastAPI: "Python and FastAPI"
- Go + gRPC: "Go and gRPC"
- Rust + Actix: "Rust and Actix"

The explicit stack reference activates framework-specific review patterns in Codex (e.g., React hook rules, Next.js server/client boundary issues, Python async pitfalls).

### What Codex Does

Codex will:
1. Read all ticket context and review the complete branch diff
2. Explore related files for full understanding (imports, shared types, consumers)
3. Classify findings as P0 (critical), P1 (high), P2 (medium), P3 (low)
4. **Auto-fix P1-P3 findings** that are unambiguous (clear fix, high confidence)
5. **Report P0-P2 findings** where Codex has questions or uncertainty
6. **Report P3 findings** for awareness

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

**Interpreting the MCP response:** The tool returns a JSON string. Parse it and check the structure:
- `"status": "complete"` → success. Process the `"output"` field for findings. **Findings may mention "rate limit" as a code quality issue** (e.g., "Missing rate limit on auth endpoint") — this is a review finding about the code, NOT a rate limit error. Process normally.
- `"error": "rate_limit"` → actual rate limit from OpenAI. Handle as below.
- `"error": "codex_not_found"` or `"error": "codex_error"` → server/CLI issue.

**CRITICAL:** Only `"error": "rate_limit"` at the top level of the JSON is a rate limit error. The phrase "rate limit" appearing in successful review output is a code finding.

**If and ONLY if the JSON contains `"error": "rate_limit"`:**
1. Wait 60 seconds, retry once
2. If still rate-limited: report to user that Codex review is queued
3. Post a note to Linear: "Cross-model review deferred due to rate limiting. Run `/codex-review $ARGUMENTS` to complete."
4. Continue to the next workflow phase — Codex review is valuable but not a hard gate

---

## Step 3: Present Results

Parse Codex's output and present to the user in four sections:

```
## Codex Cross-Model Review Results

Model: gpt-5.4 | Reasoning: xhigh

### Auto-Fixed (P0-P3, unambiguous)
| # | Priority | Category | File | What Changed | Codex Reasoning |
|---|----------|----------|------|-------------|-----------------|
| 1 | P0 | security | src/auth.ts:42 | Parameterized SQL query | Raw string interpolation — SQL injection risk |
| 2 | P1 | bug | src/api.ts:89 | Added null check on response | Optional field accessed without guard |

### Needs Your Decision (has questions or ambiguity)
| # | Priority | Category | File | Issue | Codex's Question | Codex Recommendation |
|---|----------|----------|------|-------|-----------------|---------------------|
| 3 | P1 | logic | src/util.ts:15 | Off-by-one in pagination | "0-indexed or 1-indexed? API returns 1-indexed but frontend sends 0-indexed." | Align to API convention (1-indexed) |

### Declined by Codex (identified but not auto-fixed)
| # | Priority | Category | File | Issue | Why Not Fixed |
|---|----------|----------|------|-------|--------------|
| 4 | P2 | perf | src/routes/search.ts:120 | N+1 query in loop | Fix requires restructuring data loader — too broad for auto-fix |

### For Awareness (P3)
| # | Category | File | Observation |
|---|----------|------|-------------|
| 5 | style | src/config.ts:8 | Magic number could be a named constant |
```

**For "Needs Your Decision" items, ask the user for each:**
- **FIX** — provide guidance, then run second pass via `codex_fix`
- **DISMISS** — skip (record the reason — it goes in the Linear report)
- **DEFER** — add to deferred items for follow-up ticket

**Record the user's decision and reasoning for each item.** These are included in the Linear report (Step 6) as the "User-Reviewed Items" section with the full context chain: issue → Codex question → Codex recommendation → user decision → user reasoning.

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

The report captures the full audit trail: what Codex found, what it fixed, what was ambiguous, what the user decided, and why. This serves both as documentation and as input for `/close-epic` deferred item extraction.

```markdown
## Cross-Model Review Report

**Model**: gpt-5.4 | **Reasoning**: xhigh | **Date**: [date]

### Summary
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed by Codex**: N (unambiguous P0-P3 — applied and committed)
- **Fixed after user review**: N (ambiguous items user chose to fix)
- **Dismissed by user**: N (with reasoning)
- **Deferred**: N (to follow-up tickets)
- **Declined by Codex**: N (identified but not auto-fixed, with reasoning)
- **For awareness**: N (P3 informational)

### Auto-Fixed Items
| # | Priority | Category | File | What Changed | Codex Reasoning |
|---|----------|----------|------|-------------|-----------------|
| [n] | [P-level] | [category] | [file:line] | [change description] | [why fixed] |

### User-Reviewed Items
Items Codex could not auto-fix due to ambiguity — presented to user with Codex's question and recommendation.

| # | Priority | File | Issue | Codex Question | Codex Recommendation | User Decision | User Reasoning |
|---|----------|------|-------|---------------|---------------------|--------------|----------------|
| [n] | [P-level] | [file:line] | [issue] | [uncertainty] | [suggestion] | Fixed/Dismissed/Deferred | [reasoning] |

### Declined by Codex
Items identified but not auto-fixed (broader refactoring needed, risk outweighs benefit, etc.).

| # | Priority | Category | File | Issue | Why Not Auto-Fixed |
|---|----------|----------|------|-------|-------------------|
| [n] | [P-level] | [category] | [file:line] | [issue] | [Codex reasoning] |

### For Awareness (P3)
| # | Category | File | Observation |
|---|----------|------|-------------|
| [n] | [category] | [file:line] | [observation] |

### Deferred Items
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| DISCOVERED | [severity] | [file:line] | [finding] | [why deferred] |
```

**If this is running as part of `/execute-ticket` or `/epic-swarm`:** the report becomes part of the context passed to the Security Review phase. The "User-Reviewed Items" and "Declined by Codex" sections are critical for security review — they may reveal issues the security agent should assess.

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
| `CODEX_REVIEW_MODEL` | `gpt-5.4` | OpenAI model ID (must start with `gpt-` or `o`) |
| `CODEX_REVIEW_REASONING` | `xhigh` | Reasoning effort: none, low, medium, high, xhigh |
| `CODEX_REVIEW_TIMEOUT` | `4500` | Timeout in seconds per call (75 min default — repo-aware reviews are thorough) |
| `CODEX_REVIEW_FOCUS` | `all` | Focus area: bugs, security, performance, all |
