---
description: Orchestrate all ticket workflow phases (adaptation → implementation → testing → documentation → codereview → security-review) automatically
allowed-tools: Task, Read, Grep, Glob, Bash, Bash(gh:*), Bash(git:*), mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues
argument-hint: <ticket-id>
---

# Agentic Ticket Execution Orchestrator

Execute all 6 ticket-level workflow phases automatically for the specified ticket. Pauses only for blocking issues that require user decision.

## Input

- `$ARGUMENTS` - Linear ticket ID (e.g., `PRJ-123`)

## Phase Sequence

| Phase | Agent | Blocking Conditions |
|-------|-------|---------------------|
| 1. adaptation | architect-agent | Status: BLOCKED |
| 2. implementation | backend-engineer-agent OR frontend-engineer-agent | Compile errors, duplication detected |
| 3. testing | qa-engineer-agent | Gate #0 fail (existing tests broken) OR Gates #1-3 fail (new test issues) |
| 4. documentation | technical-writer-agent | Status: BLOCKED |
| 5. codereview | code-reviewer-agent | Status: CHANGES_REQUESTED |
| 6. security-review | security-engineer-agent | CRITICAL/HIGH severity findings |

**Note:** Only `security-review` closes the ticket when no critical/high issues are found.

---

## Step 1: Validate Ticket

Fetch the ticket from Linear and validate it exists:

```
Use mcp__linear-server__get_issue to fetch ticket: $ARGUMENTS
```

**Validation checks:**
- Ticket exists
- Ticket is not already Done or Cancelled
- Ticket has an assigned agent type (check labels for `backend`, `frontend`, or description metadata)

If validation fails, report the error and stop.

### Step 1.3: Create Feature Branch

Before any phase execution, ensure we're on the correct feature branch:

1. **Get branch name from Linear ticket metadata:**
   - Linear's `gitBranchName` field provides the per-ticket branch name
   - Example: `brian/con-98-migrate-inbox-processor`

2. **Check current branch:**
   ```bash
   current=$(git branch --show-current)
   ```

3. **If on main/master, create or checkout feature branch:**
   ```bash
   git fetch origin

   # Check if branch exists
   if git branch -a | grep -q "remotes/origin/[branch-name]"; then
     # Branch exists remotely - checkout and pull
     git checkout [branch-name]
     git pull origin [branch-name]
   else
     # Create new branch from main
     git checkout -b [branch-name] origin/main
     git push -u origin [branch-name]
   fi
   ```

4. **Store branch name for later phases** (used for PR creation, PR comments)

**If branch operations fail:** Report error to user with options to fix manually or abort.

### Step 1.4: Update Ticket Status to In Progress

After branch setup, update Linear status:

```
Use mcp__linear-server__update_issue:
- issue_id: [ticket-id]
- state: "In Progress"
```

Skip if already "In Progress" or later state.

---

## Step 2: Detect Resume State

Fetch all comments on the ticket to determine which phases are already complete:

```
Use mcp__linear-server__list_comments for ticket: $ARGUMENTS
```

**Parse comments for these phase report headers:**

| Header Pattern | Phase Complete |
|----------------|----------------|
| `## Adaptation Report` | adaptation |
| `## Implementation Report` | implementation |
| `## Testing Report` (containing `Gate #0`) | testing |
| `## Documentation Report` | documentation |
| `## Code Review Report` | codereview |
| `## Security Review Report` | security-review |

**Resume Logic:**
- If no reports found → Start from adaptation
- If some reports found → Check status within each report:
  - Header present AND `Status: COMPLETE` → Phase done, skip to next
  - Header present AND `Status: BLOCKED` or `ISSUES_FOUND` → Phase needs re-run from this point
  - Header present but no clear status → Treat as incomplete, re-run phase
- If all reports found with `Status: COMPLETE` → Ticket already complete, report status and stop

**Important:** Do not rely solely on header presence. A phase report may exist from a previous blocked run that needs to be re-executed.

**Report to user (including context mode):**

Assess your available context window and select context mode:
- **500K+ tokens** → Full context mode (default — complete verbatim reports, no budget)
- **Under 500K tokens** → Budget mode (read and apply `commands/references/context-budget-legacy.md`)

```
Ticket: [ticket-id] - [ticket-title]
Status: [current-status]
Context mode: [Full context (1M window) | Budget mode (Xk window — see context-budget-legacy.md)]
Completed phases: [list of complete phases]
Starting from: [next-phase]
```

The context mode line tells the user whether agents will receive full verbatim reports or condensed extracts. This is important for diagnosing incomplete implementations — if budget mode is active and results are poor, the user may need to upgrade to a model with a larger context window.

### Step 2.1: Detect Existing Branch and PR

If resuming from a later phase, detect existing Git state:

1. **Check for existing branch:**
   ```bash
   # Look for branch matching ticket ID pattern
   git branch -a | grep -i "[ticket-id]"
   ```

2. **Check for existing PR:**
   ```bash
   gh pr list --head [branch-name] --json number,isDraft,state
   ```

3. **Store in workflow state:**
   - `branchName`: Detected or from Linear metadata
   - `prNumber`: If PR exists
   - `prDraft`: Whether PR is still draft

---

## Step 3: Execute Phases Sequentially

For each remaining phase, execute the following loop:

### Phase Execution Pattern

For each phase that needs to run:

#### 3.1 Gather Context

**From ticket (FULL — do not truncate):**
- Title and full description
- Full acceptance criteria (verbatim)
- Full Technical Notes section (verbatim)
- Labels (for agent type selection)
- Parent epic (if any)

**From prior phase reports (extract substantive sections):**
- Adaptation: Implementation approach, technical decisions, file targets, trade-off reasoning, constraints, deferred/descoped items
- Implementation: Files changed, patterns used, edge cases noted, concerns flagged, integration points
- Testing: Gate results, coverage summary, skipped areas, failure details
- Documentation: Docs created, API changes documented
- Code Review: Issues found, recommendations, requirements checklist results

**Keep context focused** - include:
- Status from each prior phase
- Key decisions/changes made and **why**
- Files affected
- Any warnings, concerns, or risks raised
- Deferred Items tables (full)

**RULE: Always include full, verbatim prior phase reports.** Do NOT summarize, condense, or extract. Agents perform better with complete context than with curated excerpts — curation risks dropping details that downstream phases need.

#### 3.2 Select Agent

| Phase | Agent Selection |
|-------|-----------------|
| adaptation | `architect-agent` |
| implementation | See agent selection logic below |
| testing | `qa-engineer-agent` |
| documentation | `technical-writer-agent` |
| codereview | `code-reviewer-agent` |
| security-review | `security-engineer-agent` |

**Implementation Phase Agent Selection (with fallback):**

1. **Primary (from ticket metadata):**
   - Check labels for: `backend`, `frontend`, `fullstack`, or `agent-type:*`
   - If found: Use corresponding agent

2. **Fallback (if no label found):**
   - Scan ticket description for keywords:
     - `API`, `REST`, `database`, `server`, `endpoint`, `backend` → `backend-engineer-agent`
     - `UI`, `React`, `Vue`, `component`, `page`, `frontend`, `CSS` → `frontend-engineer-agent`
   - If both categories present → default to `backend-engineer-agent`

3. **If still unclear:**
   ```
   ⚠️ AGENT SELECTION REQUIRED

   Ticket [ticket-id] lacks agent type metadata.
   Keywords found in description: [list keywords]

   Recommended agent: [agent-name]

   Options:
   1. Proceed with [agent-name] (recommended)
   2. Use backend-engineer-agent
   3. Use frontend-engineer-agent

   Which agent should handle implementation?
   ```
   Wait for user response before continuing.

#### 3.3 Invoke Agent via Task Tool

Use the Task tool to spawn the appropriate agent:

```
Task tool parameters:
- subagent_type: [agent-name from selection above]
- description: "[Phase] for [ticket-id]"
- prompt: Include ALL of the following:
  1. Ticket details (title, full description, all acceptance criteria, all Technical Notes — verbatim)
  2. Complete prior phase reports (full text, not summarized)
  3. Specific phase instructions
  4. Expected output format (structured report)
```

**Critical:** Agents do NOT have Linear access. Include ALL necessary context in the prompt.

#### 3.4 Parse Agent Report

Agent must return a structured report. Parse for:

**Required fields:**
- `Status:` - COMPLETE, BLOCKED, or ISSUES_FOUND
- `Summary:` - Brief description of work done
- `Files Changed:` or `Files Reviewed:` - List of affected files

**Phase-specific fields:**

| Phase | Additional Fields to Parse |
|-------|---------------------------|
| testing | Gate #0-3 results (PASS/FAIL) |
| codereview | Review Status: APPROVED/CHANGES_REQUESTED |
| security-review | Severity levels of findings |

#### 3.4.1 Validate Report Structure (Enhanced)

Before posting to Linear, validate the agent report contains required fields:

**Required fields by phase:**

| Phase | Required Fields |
|-------|-----------------|
| adaptation | `Status:`, `Summary:`, `Target Files` or `Files to Modify` |
| implementation | `Status:`, `Summary:`, `Files Changed:` |
| testing | `Status:`, `Gate #0`, `Gate #1`, `Gate #2`, `Gate #3` results |
| documentation | `Status:`, `Summary:`, `Documentation Updated` or `Docs Created` |
| codereview | `Review Status:`, `Requirements Checklist`, `Best Practices Assessment`, `SOLID/DRY Assessment`, `Files Reviewed:` |
| security-review | `Status:`, `Security Checklist` or findings list |

**Validation algorithm:**
```
For each required field for current phase:
  1. Check field header exists in report (case-insensitive)
  2. Check field has non-empty content after the header

If ANY required field is missing or empty:
  - DO NOT post to Linear
  - Log: "Report validation failed: missing [field-name]"
  - Auto-retry phase ONCE with enhanced prompt requesting the missing fields
  - If retry also fails validation: PAUSE for user decision
    Options: [Retry] [Review Raw Output] [Skip Phase] [Abort]
```

**IMPORTANT:** Auto-retry happens automatically before pausing. This preserves full automation in most cases.

#### 3.5 Check for Blocking Conditions

| Phase | Blocking Condition | Action |
|-------|-------------------|--------|
| adaptation | Status: BLOCKED | Pause, show blockers to user |
| implementation | Status: BLOCKED OR compile errors mentioned | Pause, show issues to user |
| testing | Any Gate FAIL (especially Gate #0) | Pause, show failed gates to user |
| documentation | Status: BLOCKED | Pause, show blockers to user |
| codereview | Review Status: CHANGES_REQUESTED | Pause, show requested changes to user |
| security-review | CRITICAL or HIGH severity findings | Pause, show security issues to user |

**When blocked:**
```
⚠️ BLOCKING ISSUE DETECTED

Phase: [phase-name]
Ticket: [ticket-id]

[Extracted blocking details from agent report]

Options:
1. Fix the issues and re-run this phase
2. Skip this phase and continue (not recommended for security)
3. Stop execution

What would you like to do?
```

Wait for user response before continuing.

**Phase Skip Safety Guide:**

| Phase | Skip Safety | Rationale |
|-------|-------------|-----------|
| adaptation | ⚠️ Risky | Implementation may lack proper planning, leading to rework |
| implementation | ❌ NEVER | Cannot proceed without code; skipping breaks entire workflow |
| testing | ❌ NEVER | Quality gate - untested code should not proceed to production |
| documentation | ✅ Safe | Can be added post-merge; lowest risk to skip |
| codereview | ⚠️ Risky | Technical debt accumulates; issues harder to fix later |
| security-review | ❌ NEVER | Final quality gate - security issues must be resolved |

**Recommendation:** Only skip `documentation` if blocked. For all other phases, fix the blocking issue and re-run.

#### 3.6 Post Report to Linear

After successful phase completion (non-blocking), post the agent's report as a comment:

```
Use mcp__linear-server__create_comment:
- issue_id: [ticket-id]
- body: [Full agent report with phase header]
```

**Comment format:**
```markdown
## [Phase] Report

[Agent's full structured report]

---
*Automated by /execute-ticket*
```

#### 3.6.0 Verify Implementation Artifacts (Implementation Phase Only)

After implementation agent returns, before posting report:

1. **Check for file changes:**
   ```bash
   changes=$(git status --porcelain | wc -l)
   ```

2. **Validate changes exist:**
   ```
   IF changes == 0 AND report.Status == "COMPLETE":
     - Log warning: "Implementation reported COMPLETE but no file changes detected"
     - Check for unstaged changes: git diff --name-only
     - If still no changes: PAUSE for user decision
       Options: [Retry Implementation] [Review Manually] [Mark as No-Op and Continue]
   ```

3. **If changes exist:** Proceed to posting report and PR creation

#### 3.6.1 Commit and Create Draft PR (Implementation Phase Only)

After posting implementation report to Linear:

1. **Stage all changes:**
   ```bash
   git add -A
   ```

2. **Create commit with conventional message:**
   ```bash
   git commit -m "feat([ticket-id]): [ticket-title]

   [First sentence of implementation summary]

   Linear: [ticket-id]
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. **Push to remote:**
   ```bash
   git push origin [branch-name]
   ```

4. **Create draft PR:**
   ```bash
   gh pr create --draft \
     --title "[ticket-id]: [ticket-title]" \
     --body "## Summary
   [Implementation summary from agent report]

   ## Changes
   [Files changed list from agent report]

   ## Linear Ticket
   https://linear.app/[workspace]/issue/[ticket-id]

   ## Workflow Phases
   - [x] Implementation
   - [ ] Testing
   - [ ] Documentation
   - [ ] Code Review
   - [ ] Security Review

   ---
   *Generated by /execute-ticket workflow*"
   ```

5. **Capture PR number for subsequent phases:**
   ```bash
   pr_number=$(gh pr view --json number -q '.number')
   ```
   Store `pr_number` for use in phases 3-6.

#### 3.6.2 Add PR Phase Comment (Testing, Documentation, CodeReview, Security Phases)

After posting phase report to Linear, add condensed summary to PR:

```bash
gh pr comment [pr-number] --body "## [emoji] [Phase Name] Complete

[2-3 bullet point summary from agent report]

Full report: Linear ticket [ticket-id]"
```

**Emoji mapping by phase:**
- Testing: 🧪
- Documentation: 📚
- Code Review: 📋
- Security Review: 🛡️

#### 3.6.3 Add PR Labels (CodeReview and Security Phases)

After code review phase (if status is APPROVED):
```bash
gh pr edit [pr-number] --add-label "code-reviewed"
```

After security review phase (if no CRITICAL/HIGH findings):
```bash
gh pr edit [pr-number] --add-label "security-approved"
```

#### 3.7 Continue to Next Phase

If not blocked, proceed to the next phase in sequence.

---

## Step 4: Handle Security Review Completion

When security-review phase completes:

### 4.1 If No CRITICAL/HIGH Findings (PASS):

1. **Update ticket status to Done:**
   ```
   Use mcp__linear-server__update_issue:
   - issue_id: [ticket-id]
   - state: "Done"
   ```

2. **Finalize PR:**

   a. Convert draft to ready for review:
   ```bash
   gh pr ready [pr-number]
   ```

   b. Add final label:
   ```bash
   gh pr edit [pr-number] --add-label "ready-for-merge"
   ```

   c. Update PR body to mark all phases complete:
   ```bash
   # Get current PR body, update checkboxes, write back
   gh pr edit [pr-number] --body "[updated body with all checkboxes checked]"
   ```

### 4.2 If CRITICAL/HIGH Findings (BLOCKED):

- Keep ticket status as "In Progress"
- Do NOT convert PR to ready
- Add label to PR:
  ```bash
  gh pr edit [pr-number] --add-label "security-blocked"
  ```
- PAUSE for user decision (standard blocking behavior)

---

## Step 5: Generate Execution Summary

After all phases complete (or on blocking halt), provide summary:

```markdown
## Execution Summary

**Ticket:** [ticket-id] - [title]
**Final Status:** [COMPLETE | BLOCKED at phase]

### Phase Results

| Phase | Status | Key Outcome |
|-------|--------|-------------|
| adaptation | ✅ Complete | [Brief summary] |
| implementation | ✅ Complete | [Files changed count] |
| testing | ✅ Complete | [Coverage %] |
| documentation | ✅ Complete | [Docs created] |
| codereview | ✅ Complete | [APPROVED] |
| security-review | ✅ Complete | [No critical issues] |

### Metrics
- Total phases completed: [X/6]
- Blocking issues encountered: [count]
- Time from start: [timestamp]

### Next Steps
[If complete: PR ready for merge]
[If blocked: Required actions to unblock]
```

---

## Error Handling

### Linear API Errors
- Retry up to 3 times with 2-second delays between attempts
- If still failing after retries:
  - Save any pending report content locally (display to user)
  - Pause execution with message: "Linear API unavailable. Report content preserved above."
  - Options: (1) Retry now, (2) Continue without posting (not recommended), (3) Abort

### Agent Timeout
- If Task tool doesn't return within 10 minutes, consider agent stuck
- Report to user: "Agent [name] appears unresponsive for phase [phase]"
- Options: (1) Wait longer, (2) Retry phase with fresh agent, (3) Abort

### Malformed Agent Response
- If agent returns but report fails validation (see 3.4.1):
  - Display raw agent output to user
  - Do NOT post to Linear
  - Options: (1) Retry phase, (2) Manually extract and post, (3) Skip phase (with warning)

### Invalid Ticket State
- If ticket is closed/cancelled mid-execution, stop immediately
- Report: "Ticket [id] state changed to [state] externally. Execution halted."
- Do not attempt to reopen or modify ticket state

### Re-running a Completed Phase
If user needs to re-run a phase that shows as complete:
1. Locate the existing phase report comment in Linear
2. Edit the comment to rename header (e.g., `## Adaptation Report` → `## Adaptation Report (superseded)`)
3. Re-run `/execute-ticket [ticket-id]` - it will now detect phase as incomplete
4. New report will be posted as a fresh comment

**Note:** Alternatively, manually delete the phase report comment, but renaming preserves history.

---

## Context Management Principles

**Include ALL context — never summarize or truncate:**
- Each phase agent gets a fresh 1M token context window — use it fully
- Include the **complete, verbatim** prior phase reports in every agent prompt
- The cost of under-providing context is high: wrong decisions, missed requirements, incomplete implementations, rework
- The cost of over-providing context is near zero — typical ticket workflows use ~25% of the 1M token context window
- Orchestrator tracks: ticket ID, current phase, blocking status, branch/PR info

**CRITICAL: Do NOT summarize, condense, or extract from prior reports:**
- Pass each prior phase report **in full** — do not cherry-pick sections
- Prior phase reasoning (the "why") is as important as outcomes (the "what")
- Edge cases, concerns, and risks noted by earlier agents must propagate forward verbatim
- Deferred Items tables must always propagate in full
- When in doubt, include more — the agent will filter what it needs

**What each phase needs from prior reports (included via full report, not extraction):**

Every phase receives the **full ticket description, acceptance criteria, and Technical Notes**, plus **complete prior phase reports**. The list below highlights what each phase relies on most — this is NOT an extraction guide; include the full reports and the agent will use what it needs:

```
From Adaptation Report → Implementation:
- Target files and rationale for each
- Technical approach with trade-off reasoning
- Integration points and dependencies
- Service reuse mandates (specific services to use, not just "reuse existing")
- Constraints and risks identified
- Deferred/descoped items with reasoning

From Implementation Report → Testing:
- Files changed with brief description of what each does
- New endpoints/functions and their behavior
- Edge cases the implementer noted or flagged as risky
- Integration points and external dependencies
- Any concerns or known limitations
- Patterns used (needed to test pattern compliance)

From Testing Report → Documentation:
- API coverage and tested scenarios
- Test scenarios (inform docs examples)
- Coverage gaps (inform docs about untested areas)

From Testing Report → Code Review:
- Gate results with failure details (not just PASS/FAIL)
- Coverage gaps and skipped areas

From Documentation Report → Code Review:
- API docs location
- Any doc gaps noted

From All Prior Reports → Code Review:
- Full verbatim Acceptance Criteria (from ticket)
- Full verbatim Technical Notes (from ticket)
- Adaptation scope decisions (deferred/descoped items with original AC)

From All Prior Reports → Security Review:
- Full verbatim ticket description, AC, and Technical Notes
- Adaptation decisions (architecture, trust boundaries, data flow)
- Implementation details (what was built, auth/authz patterns, data handling)
- Code review security concerns flagged
- Code review findings (especially error handling, validation gaps)
```

## Full Context Inclusion Policy

**Default (1M context): There is no context budget. Include everything.**

With 1M token context windows, typical ticket workflows use ~25% of available context. The primary risk is **under-providing context** — which leads to wrong decisions, missed requirements, and incomplete implementations. There is no meaningful risk of over-providing context.

**For each phase agent prompt, include:**

1. **Full ticket description, acceptance criteria, and Technical Notes** — verbatim, never summarized
2. **Complete prior phase reports** — copy each report in full from Linear comments, do not extract or condense
3. **Git context** — branch, PR number, files changed

**Do NOT:**
- Summarize or condense prior phase reports
- Extract "key points" from reports — include the full report
- Apply token budgets or caps to any context source
- Truncate any section for length

**Why this matters:** Agents that receive condensed summaries miss details that lead to incomplete implementations, skipped acceptance criteria, and wrong architectural decisions. Agents that receive full reports self-filter to what they need and produce more complete work.

### Context window auto-detection

At the start of execution, assess your available context window:

- **500K+ tokens (default):** Follow the full-context policy above. Include complete, verbatim prior phase reports in every agent prompt.
- **Under 500K tokens:** Read and apply the budget rules in `commands/references/context-budget-legacy.md`. These rules cap total prior-phase context at ~15,000 tokens using an extraction algorithm that preserves essential context (AC, Technical Notes, Deferred Items, Files Changed) while condensing older reports first.

The threshold is 500K because security review — the final phase — receives 5 prior reports plus full ticket context. On a 250K window, full verbatim inclusion of all reports could exhaust context before the agent finishes its analysis.

---

## Deferred Items Handling

When agents bypass issues (correct behavior for low-priority items), they MUST document them in a Deferred Items table for user traceability:

| Severity | Location | Issue | Reason |
|----------|----------|-------|--------|
| [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [file:line] | [Brief description] | [Why deferred] |

**Rules for Deferred Items:**
1. ANY issue found but not addressed MUST appear in this table
2. Location must include file:line for traceability
3. Reason must explain the bypass decision (e.g., "Defense-in-depth, not exploitable")
4. Table is always included in full when passing context to downstream phases
5. Orchestrator posts full table to Linear (not summarized)

**When to defer (examples by phase):**
- **Security**: LOW severity findings, confidence <7/10, defense-in-depth measures
- **Code Review**: Style nits, minor optimizations, non-blocking pattern deviations
- **Testing**: Coverage gaps in low-risk areas, trivial code not tested
- **Implementation**: Tech debt noted but out of scope, refactoring opportunities
- **Documentation**: Doc gaps noted but low priority
- **Adaptation**: Alternative approaches considered but rejected, accepted risks

**Example Deferred Items table:**
```markdown
### Deferred Items
| Severity | Location | Issue | Reason |
|----------|----------|-------|--------|
| LOW | auth.ts:45 | Missing rate limit on admin login | Defense-in-depth, admin-only endpoint |
| INFO | user.service.ts:120 | Could add input sanitization | Low risk, trusted internal call |
| LOW | api.controller.ts:88 | Consider adding request logging | Enhancement, not security critical |
```

---

## Example Execution

```
User: /execute-ticket PRJ-123

Orchestrator:
Fetching ticket PRJ-123...
✓ Ticket found: "Add user profile endpoint"
✓ Status: In Progress
✓ Agent type: backend (from labels)

Checking for prior progress...
✓ No existing phase reports found
Starting from: adaptation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1/6: Adaptation
Spawning architect-agent...
[Agent works autonomously]
✓ Adaptation complete - Report posted to Linear

Phase 2/6: Implementation
Spawning backend-engineer-agent...
[Agent works autonomously]
✓ Implementation complete - 4 files changed

Phase 3/6: Testing
Spawning qa-engineer-agent...
[Agent works autonomously]
✓ All gates passed - 87% coverage

Phase 4/6: Documentation
Spawning technical-writer-agent...
[Agent works autonomously]
✓ API docs updated

Phase 5/6: Code Review
Spawning code-reviewer-agent...
[Agent works autonomously]
✓ Review: APPROVED

Phase 6/6: Security Review
Spawning security-engineer-agent...
[Agent works autonomously]
✓ No critical/high severity issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ EXECUTION COMPLETE

Ticket PRJ-123 marked as Done
PR #45 marked ready for review

[Full summary displayed]
```

---

## Resume Example

```
User: /execute-ticket PRJ-123

Orchestrator:
Fetching ticket PRJ-123...
✓ Ticket found: "Add user profile endpoint"

Checking for prior progress...
Found completed phases:
  ✓ Adaptation Report (completed 2h ago)
  ✓ Implementation Report (completed 1h ago)

Resuming from: testing

Phase 3/6: Testing
Spawning qa-engineer-agent...
[Continues from testing phase]
```
