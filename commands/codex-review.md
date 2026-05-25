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

## Step 3: Agent Resolution (Hands-Off, No User Wait)

Codex review is a hands-off automated step. **Do not present findings to the user for mid-flow decisions.** The agent resolves all remaining items by applying the policy in `codex-finding-resolution` SKILL.md (Step 3). The user reviews the posted report retrospectively and can promote any rejection by filing a regular ticket that references the comment line.

Parse Codex's output and apply this resolution tree per item:

**Category A — Auto-Fixed by Codex (any priority, unambiguous):**
Verify each fix didn't introduce a regression. If an auto-fix is wrong, revert and treat the underlying finding as Category B.

**Category B — Needs Agent Resolution (P1-P2 with ambiguity, or P3 candidates):**

For each P1 or P2 item, apply the resolution tree in order:

1. **DEFAULT: fix it now in the originating branch.** Use `codex_fix` with explicit instructions, or fix manually. Bias strongly toward this default. "It's complex," "tricky," "needs more thought" are NOT reasons to skip — they are reasons to think harder. Use `systematic-debugging` if you genuinely need to work through the problem.

2. **SCOPE_EXPANSION_ESCAPE — single escape for P1/P2 only.** The agent may file a follow-up ticket for a P1/P2 finding ONLY when BOTH conditions hold:
   - The fix would touch files outside the ticket's AC-defined scope in a substantial way (a different module entirely, OR 3+ files outside the surfaces named in the ticket's AC). Touching 1–2 adjacent files is NOT scope expansion.
   - The agent can write a passing impact-bar sentence for the deferred fix:

   > "Without this, **[specific production behavior / user experience / cost / security control / operational property]** changes for **[identified code path / user-operator segment / named operation-system]**."

   Disqualifying rationales (the fix happens in branch, no escape): "complex", "tricky", "would take a while", "needs more thought", "might cause regressions", "user might disagree", "maintainability", "code quality", "consistency", "developer experience". See `no-silent-deferrals` Part 2.

   When the escape applies, file ONE ticket with title `[Follow-up] [Description]`, label `SCOPE_EXPANSION_ESCAPE` plus priority. The agent does not need to prompt the user.

3. **Dismiss with explicit reasoning** — if the finding is wrong (Codex misunderstood the intent, the pattern is intentional). Record the dismissal with reasoning the reviewer can evaluate.

For each P3 item:

- **Closure-log entry only. No ticket.** P3 findings document non-load-bearing concerns; they live in the report's closure-log section so reviewers can see them. No exceptions.

---

## Step 4: Apply Resolutions

For each P1/P2 the agent resolved as "fix now":

```
Use mcp__codex-review-server__codex_fix with:
  - project_dir: [absolute path to project root]
  - findings: [the findings with agent's guidance]
  - context: [agent's specific instructions for how to approach each fix]
```

Codex runs again with write access, applying only the specified fixes. Or fix manually if Codex fix is not suitable.

For each SCOPE_EXPANSION_ESCAPE: create the Linear ticket with `mcp__linear-server__create_issue` and capture the ID for the report.

For each closure-log entry: capture the item + rationale for the report.

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

The report captures the full audit trail: what Codex found, what it fixed, what the agent fixed, what the agent dismissed (with reasoning), what the agent filed as SCOPE_EXPANSION_ESCAPE (with rationale), and what the agent placed in the closure-log (with rationale). This enables retrospective user review and `/close-epic` aggregation.

```markdown
## Cross-Model Review Report

**Model**: gpt-5.4 | **Reasoning**: xhigh | **Date**: [date]

### Summary
- **Total findings**: N (P0: X, P1: Y, P2: Z, P3: W)
- **Auto-fixed by Codex**: N
- **Fixed by agent**: N
- **SCOPE_EXPANSION_ESCAPE tickets filed**: N
- **Dismissed by agent (with reasoning)**: N
- **Closure-log (P3 + below-bar items)**: N

### Auto-Fixed by Codex
| # | Priority | Category | File | What Changed | Codex Reasoning |
|---|----------|----------|------|-------------|-----------------|
| [n] | [P-level] | [category] | [file:line] | [change description] | [why fixed] |

### Fixed by Agent
Items Codex could not auto-fix; the agent applied the impact-bar policy and chose to fix in-branch.

| # | Priority | File | Finding | Fix Applied |
|---|----------|------|---------|-------------|
| [n] | [P-level] | [file:line] | [issue] | [fix description] |

### SCOPE_EXPANSION_ESCAPE Tickets
For each escape used — required for any P1/P2 not fixed in-branch.

| # | Priority | File | Finding | Linear Ticket | Impact-Bar Sentence | Scope-Expansion Rationale |
|---|----------|------|---------|---------------|---------------------|---------------------------|
| [n] | [P-level] | [file:line] | [issue] | [PROJ-XXX] | "Without this, X changes for Y" | [files outside AC scope, count, why fix-in-branch is inappropriate] |

### Dismissed
Items the agent concluded are wrong (Codex misunderstood intent, pattern is intentional).

| # | Priority | File | Finding | Agent's Reasoning |
|---|----------|------|---------|-------------------|
| [n] | [P-level] | [file:line] | [issue] | [why dismissed] |

### Considered but not pursued (closure-log)

All P3 findings + any below-bar items the agent considered. Reviewers may promote any entry by filing a regular ticket referencing this comment line.

- **[Item]** — Why considered: [Codex finding]. Why below the bar: [disqualifying phrasing or unfillable slot]. What would change to re-evaluate: [named condition].
- (or: "None — all P1/P2 findings were resolved, no P3 items observed.")
```

**If this is running as part of `/execute-ticket` or `/epic-swarm`:** the report becomes part of the context passed to the Security Review phase. The "SCOPE_EXPANSION_ESCAPE Tickets" and "Dismissed" sections are critical for security review — they may reveal issues the security agent should assess. The closure-log is aggregated by `/close-epic` into the epic-level Considered-but-not-pursued section.

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
