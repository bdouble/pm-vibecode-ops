---
description: Orchestrate all ticket workflow phases (adaptation → implementation → testing → documentation → codereview → security-review) automatically
allowed-tools: Task, Read, Grep, Glob, Bash, mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues
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

**Report to user:**
```
Ticket: [ticket-id] - [ticket-title]
Status: [current-status]
Completed phases: [list of complete phases]
Starting from: [next-phase]
```

---

## Step 3: Execute Phases Sequentially

For each remaining phase, execute the following loop:

### Phase Execution Pattern

For each phase that needs to run:

#### 3.1 Gather Context

**From ticket:**
- Title, description, acceptance criteria
- Labels (for agent type selection)
- Parent epic (if any)

**From prior phase reports (extract key sections):**
- Adaptation: Implementation approach, technical decisions, file targets
- Implementation: Files changed, patterns used, any noted concerns
- Testing: Test coverage summary, any skipped areas
- Documentation: Docs created, API changes documented
- Code Review: Issues found, recommendations

**Keep context condensed** - extract only:
- Status from each prior phase
- Key decisions/changes made
- Files affected
- Any warnings or concerns raised

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
  1. Ticket details (title, description, acceptance criteria)
  2. Condensed context from prior phases
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

#### 3.4.1 Validate Report Structure

Before posting to Linear, verify the agent report contains required fields:

| Phase | Required Fields |
|-------|-----------------|
| ALL phases | `Status:` (COMPLETE/BLOCKED/ISSUES_FOUND), `Summary:`, `Files Changed:` or `Files Reviewed:` |
| testing | Gate #0-3 results with explicit PASS/FAIL |
| codereview | `Review Status:` (APPROVED/CHANGES_REQUESTED) |
| security-review | Severity findings list OR explicit "No critical/high issues found" |

**If validation fails:**
- Do NOT post incomplete report to Linear
- Report to user: "Agent returned incomplete report. Missing: [list missing fields]"
- Options:
  1. Retry the phase
  2. Review agent output manually
  3. Abort execution

**Only proceed to 3.5 if validation passes.**

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

#### 3.7 Continue to Next Phase

If not blocked, proceed to the next phase in sequence.

---

## Step 4: Handle Security Review Completion

When security-review completes without CRITICAL/HIGH findings:

1. **Update ticket status to Done:**
```
Use mcp__linear-server__update_issue:
- issue_id: [ticket-id]
- state: "Done"
```

2. **Convert PR from draft to ready (if applicable):**
```bash
# Check if PR exists and is draft
gh pr list --head [branch-name] --json isDraft,number
# If draft, mark ready for review
gh pr ready [pr-number]
```

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

**Keep orchestrator context minimal:**
- Track only: ticket ID, current phase, blocking status
- Full details stay in Linear comments
- Each phase agent gets fresh context window
- Pass only relevant condensed context to each phase

**Context extraction from prior reports:**
```
From Adaptation Report → Implementation:
- Target files
- Technical approach
- Integration points

From Implementation Report → Testing:
- Files changed
- New endpoints/functions
- Edge cases noted

From Testing Report → Documentation:
- API coverage
- Test scenarios (inform docs examples)

From Documentation Report → Code Review:
- API docs location
- Any doc gaps noted

From Code Review Report → Security:
- Security concerns flagged
- Auth/authz patterns used
```

## Context Budget Guidelines

To prevent context overflow as phases accumulate, apply these summarization limits:

**Maximum context from prior phases: ~2000 tokens total**

| Prior Phase | Extract ONLY |
|-------------|--------------|
| Adaptation | Target files (list), Technical approach (1 paragraph max), Key integration points |
| Implementation | Files changed (list), Branch name, PR number (if exists) |
| Testing | Coverage % (single number), Gate results (PASS/FAIL per gate), Any security concerns noted |
| Documentation | Docs created (file list only) |
| Code Review | Status (APPROVED/CHANGES_REQUESTED), Security concerns flagged (if any) |

**Truncation rules:**
- If ticket has 4+ completed phases, omit Details sections entirely
- If extracted context exceeds budget, prioritize most recent 2 phases
- Always include: Files Changed lists (needed for all subsequent phases)

**Example condensed context for security-review phase:**
```
Prior Phase Summary:
- Adaptation: 5 target files identified, event-driven approach
- Implementation: 6 files changed (user.service.ts, auth.guard.ts, ...)
- Testing: 82% coverage, all gates PASS
- Documentation: API docs updated
- Code Review: APPROVED, flagged auth token expiry concern
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
