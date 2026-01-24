---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__list_issues, mcp__linear-server__list_projects
description: Close completed epic with retrofit analysis, downstream impact propagation, retrofit ticket creation, and CLAUDE.md updates
argument-hint: <epic-id> [--skip-retrofit] [--skip-downstream] (e.g., /close-epic EPIC-123)
workflow-phase: epic-closure
closes-epic: true
workflow-sequence: "/security-review (closes tickets) -> **/close-epic** (FINAL EPIC GATE)"
---

## MANDATORY: Agent Invocation Required

**You MUST use the Task tool to invoke the `epic-closure-agent` for this phase.**

---

## ⚠️ CONTEXT BUDGET ALLOCATION (CRITICAL)

**Explicit token limits prevent context window overflow:**

| Component | Budget | Notes |
|-----------|--------|-------|
| Epic description | 200 tokens | First 2 paragraphs only |
| Epic comments | 300 tokens | Key decisions only |
| Per-ticket summaries | 100 tokens each | Max 3000 tokens for 30 tickets |
| Retrofit recommendations | 400 tokens | Prioritized list |
| Downstream guidance | 400 tokens | Actionable guidance only |
| CLAUDE.md updates | 200 tokens | Specific edits only |
| **TOTAL BUDGET** | ~4500 tokens | For epic-closure-agent input |

### Truncation Priority Matrix

**When combined context exceeds budget, truncate in this order (preserve → trim):**

| Priority | Component | Action |
|----------|-----------|--------|
| 1 (PRESERVE) | Ticket status indicators | Never truncate |
| 2 (PRESERVE) | Blocking issues/Late Findings | Never truncate |
| 3 (PRESERVE) | Key decisions (1 sentence each) | Truncate to 1 sentence |
| 4 (TRIM) | Pattern explanations | Reduce to bullet points |
| 5 (TRIM) | Testing details | Coverage % only |
| 6 (TRIM) | Historical context | Remove entirely |
| 7 (ALWAYS PRESERVE) | Retrofit recommendations with priority | Never truncate |

---

### Step 1: Pre-Agent Context Gathering (YOU do this BEFORE invoking agent)

**As the orchestrator, YOU must gather ALL context before spawning the agent.**

#### 1.1 Initial Assessment

1. **Fetch epic details**: Use `mcp__linear-server__get_issue` with epic ID
2. **Fetch all sub-tickets**: Use `mcp__linear-server__list_issues` with parent filter to get all child tickets
3. **Count tickets**: Determine the number of sub-tickets to select gathering strategy

#### 1.2 Scalable Context Gathering (Tiered by Ticket Count)

**Select gathering strategy based on epic size:**

| Tier | Ticket Count | Strategy | Token Budget/Ticket |
|------|--------------|----------|---------------------|
| **Small** | 1-6 tickets | Direct gathering | ~150 tokens |
| **Medium** | 7-15 tickets | Parallel subagents (standard mode) | 100 tokens |
| **Large** | 16-30 tickets | Parallel subagents (ultra-condensed) | 50 tokens |
| **Very Large** | 31+ tickets | Phased execution | 50 tokens |

---

**TIER 1: Small Epic (1-6 tickets)**
- Gather context directly using Linear MCP tools
- Fetch each ticket's details and comments sequentially
- Apply truncation priority if individual tickets are verbose
- Proceed directly to agent invocation

---

**TIER 2: Medium Epic (7-15 tickets)**
- **MUST use subagents to prevent context exhaustion**
- Split tickets into batches of 5-6 tickets each
- Spawn parallel `ticket-context-agent` instances using Task tool
- Use **standard mode** (100 tokens/ticket)
- Aggregate summaries before invoking epic-closure-agent

**Parallel Context Gathering Pattern (Standard Mode):**
```
# For an epic with 15 tickets:
# - Batch 1 (tickets 1-5): Spawn ticket-context-agent (standard mode)
# - Batch 2 (tickets 6-10): Spawn ticket-context-agent (standard mode)
# - Batch 3 (tickets 11-15): Spawn ticket-context-agent (standard mode)
#
# All three agents run IN PARALLEL using a single message with multiple Task tool calls
# Wait for all to complete, then aggregate summaries
```

**Example Task tool invocation (Standard Mode):**
```
Task tool call:
- subagent_type: ticket-context-agent
- description: "Gather context for batch 1"
- prompt: |
    Epic: EPIC-123
    Mode: standard (100 tokens per ticket max)
    Tickets to process: PROJ-101, PROJ-102, PROJ-103, PROJ-104, PROJ-105

    Fetch and summarize each ticket using the TABLE FORMAT:
    | ID | Status | Key Outcome | Key Decision | Tests | Security | Files |

    Return structured table summaries for aggregation.
```

---

**TIER 3: Large Epic (16-30 tickets)**
- **MUST use subagents with ULTRA-CONDENSED mode**
- Split tickets into batches of 6 tickets each
- Spawn parallel `ticket-context-agent` instances
- Use **ultra-condensed mode** (50 tokens/ticket)
- Aggregate minimal summaries before invoking epic-closure-agent

**Example Task tool invocation (Ultra-Condensed Mode):**
```
Task tool call:
- subagent_type: ticket-context-agent
- description: "Gather context for batch 1 (ultra-condensed)"
- prompt: |
    Epic: EPIC-123
    Mode: ultra-condensed (50 tokens per ticket max)
    Tickets to process: PROJ-101, PROJ-102, PROJ-103, PROJ-104, PROJ-105, PROJ-106

    Fetch and summarize each ticket using the MINIMAL TABLE FORMAT:
    | ID | S | Outcome | P |
    (S=Status ✓/✗, Outcome=3-5 words, P=Pattern or -)

    Return ultra-condensed table for aggregation.
```

---

**TIER 4: Very Large Epic (31+ tickets)**
- **MUST use phased execution to avoid context exhaustion**
- Execute in 4 sequential phases, each with parallel batching:

```
PHASE A: Context Gathering (Batches 1-6, parallel)
         → Aggregate into master summary (max 1500 tokens)
         → Discard raw batch outputs

PHASE B: Retrofit Analysis
         → Pass master summary to epic-closure-agent
         → Request ONLY retrofit recommendations
         → Store recommendations (max 400 tokens)

PHASE C: Downstream Analysis
         → Pass master summary to epic-closure-agent
         → Request ONLY downstream guidance
         → Store guidance (max 400 tokens)

PHASE D: Final Closure
         → Pass stored recommendations + guidance
         → Generate closure report and CLAUDE.md updates
```

**Phased Execution reduces peak context by processing phases independently.**

#### 1.3 Complete Context Gathering Checklist

After gathering (directly or via subagents):

1. **Verify completion status**: Check that ALL sub-tickets are Done or Cancelled
2. **Aggregate context for agent prompt:**
   - Epic ID, title, and full description
   - List of all sub-tickets with their final status
   - Phase reports from sub-tickets (implementation summaries, testing results, security findings)
   - Original business goals and success criteria from epic description
3. **Identify related epics**: Use `mcp__linear-server__list_issues` to find dependent/related epics
4. **Fetch epic comments**: Use `mcp__linear-server__list_comments` to get epic-level history

**IMPORTANT**: The agent does NOT have access to Linear. You must include ALL relevant context in the prompt.

### Step 2: Completion Verification (BLOCKING)

**Before invoking the agent, verify ALL sub-tickets are complete:**

```bash
# The orchestrator MUST verify:
# 1. All sub-tickets are in Done or Cancelled state
# 2. No sub-tickets are In Progress, Todo, or Blocked

# If ANY sub-ticket is incomplete:
# - DO NOT proceed with epic closure
# - Report which tickets need completion
# - Exit with clear guidance on next steps
```

**BLOCKING GATE**: If any sub-ticket is not Done/Cancelled, the epic CANNOT be closed.

### Step 3: Agent Invocation (Provide Full Context)

Use the Task tool to invoke the `epic-closure-agent` with ALL context embedded:

**Your prompt to the agent MUST include:**
- The epic ID for reference
- The full epic title and description (copy the text)
- Complete list of sub-tickets with their final status
- Implementation summaries from each sub-ticket
- Testing and security findings
- Original success criteria
- List of related/dependent epics (for downstream analysis)

**Example prompt structure:**
```
## Epic Context
**ID**: [epic-id]
**Title**: [title from get_issue]
**Description** (truncated to 200 tokens):
[first 2 paragraphs of description]

## Original Success Criteria
[extract from epic description - max 100 tokens]

## Sub-Ticket Summary
| Ticket ID | Status | Key Outcome | Key Decision | Tests | Security | Files |
|-----------|--------|-------------|--------------|-------|----------|-------|
| TICKET-1  | Done   | [10 words]  | [8 words]    | ✓ 85% | Approved | 4     |
| TICKET-2  | Done   | [10 words]  | [8 words]    | ✓ 78% | Approved | 3     |

*(Note: Each ticket summary is max 100 tokens per context budget)*

## Implementation Highlights
[Key patterns and approaches - max 300 tokens aggregated]

## Testing Status
| Metric | Value |
|--------|-------|
| Avg Coverage | X% |
| Failing Tests | 0 |
| Skipped Tests | X |

## Security Status
| Metric | Value |
|--------|-------|
| Tickets Approved | X/Y |
| Open Findings | 0 |

## Related Epics (for Downstream Analysis)
- EPIC-456: [title] - depends on this epic
- EPIC-789: [title] - related capability

## User Options
--skip-retrofit: [true/false based on user input]
--skip-downstream: [true/false based on user input]

## Context Budget Note
This prompt has been constructed within the 4500 token budget.
Truncation applied per priority matrix if source data exceeded limits.

## Your Task
Perform epic closure analysis following the six-phase workflow:
1. Late Findings scan (REQUIRED - check for workarounds, disabled tests, TODOs)
2. Retrofit analysis (unless --skip-retrofit)
3. Downstream impact (unless --skip-downstream)
4. Documentation audit
5. CLAUDE.md updates
6. Closure summary

**CRITICAL**: Return Late Findings table even if empty.
Return a structured epic closure report when complete.
```

**CRITICAL**: Do NOT tell the agent to "fetch the epic" - the agent cannot access Linear.

### Step 4: Post-Agent Completion (YOU Write to Linear and Close Epic)

After the agent returns its report:

#### 4.0 VALIDATE AGENT REPORT (BLOCKING)

**Before proceeding, validate the agent's report has required fields:**

| Section | Required Fields | Validation |
|---------|-----------------|------------|
| **Status** | COMPLETE / COMPLETE_WITH_FINDINGS / BLOCKED | Must be one of three values |
| **Retrofit Analysis** | At least 1 recommendation OR "None identified" | Cannot be empty |
| **Per Retrofit Item** | Priority (P0-P3), Effort estimate, Acceptance criteria | All required for ticket creation |
| **Downstream Guidance** | Affected epics list, Propagation notes | Can be "None" if skipped |
| **CLAUDE.md Updates** | Specific sections, Proposed content | Can be "No updates needed" |
| **Late Findings** | Table with Severity, Location, Issue, Action | Can be empty |

**Validation Actions:**

```
IF missing required fields:
  → Retry ONCE with enhanced prompt:
    "Your report is missing required fields: [list].
     Please regenerate with complete:
     - Status section
     - Retrofit recommendations (or 'None identified')
     - [other missing sections]"

IF still missing after retry:
  → PAUSE for user decision
  → Do NOT post incomplete report to Linear
  → Ask: "The agent report is incomplete. Should I:
          a) Retry with different parameters
          b) Close epic with partial report
          c) Abort closure"
```

**NEVER post incomplete reports to Linear.** Partial reports create confusion and lose critical information.

---

1. **Parse the agent's report** - Extract retrofit actions, downstream updates, CLAUDE.md changes

2. **CREATE RETROFIT TICKETS** (CRITICAL - Do not skip):
   - For EACH retrofit recommendation in the agent's report, create a new Linear ticket
   - Use `mcp__linear-server__create_issue` with the full retrofit details
   - Retrofit tickets MUST include:
     - **Title**: `[Retrofit] [Pattern/Service Name] - [Brief Description]`
     - **Description**: Full details from the agent's retrofit recommendation:
       - What pattern/approach to propagate
       - Why this retrofit is needed (context from the closed epic)
       - Which existing files/components should adopt it
       - Specific implementation guidance
       - Acceptance criteria
     - **Labels**: `retrofit`, priority label (P0-P3 from agent)
     - **Parent**: Link to a "Retrofit Work" epic if one exists, or create standalone
   - Collect all created ticket IDs for the closure report

   **Example retrofit ticket creation:**
   ```
   mcp__linear-server__create_issue:
     title: "[Retrofit] Error Handling Pattern - Propagate to Legacy Services"
     description: |
       ## Context
       During EPIC-123 (User Authentication Overhaul), we established a new error handling
       pattern that provides better observability and user feedback.

       ## Retrofit Requirement
       Propagate this pattern to existing legacy services that still use the old approach.

       ## Pattern Details
       [Full pattern description from agent report]

       ## Files to Update
       - `src/services/legacy-payment.ts` - Current: try/catch with console.log
       - `src/services/legacy-notification.ts` - Current: silent failures
       - `src/services/legacy-reporting.ts` - Current: generic error messages

       ## Implementation Guidance
       [Specific steps from agent report]

       ## Acceptance Criteria
       - [ ] All listed files use new error handling pattern
       - [ ] Error logs include correlation IDs
       - [ ] User-facing errors follow new message format
       - [ ] Tests updated to verify error handling

       ## Source
       Originated from: EPIC-123 closure analysis
       Priority: P1 (High)
       Estimated Effort: 4 hours

     labels: ["retrofit", "P1", "tech-debt"]
   ```

3. **Write the closure comment** - Use `mcp__linear-server__create_comment` with the structured closure report
   - Include the list of created retrofit ticket IDs
   - Reference the retrofit tickets so work is traceable

4. **Update related epics** (if downstream analysis was performed):
   - Use `mcp__linear-server__create_comment` to add guidance to dependent epics

5. **Close the epic**:
   - Use `mcp__linear-server__update_issue` to mark epic as "Done"
   - Add appropriate labels (e.g., "epic-completed", "retrofit-complete")

6. **Apply CLAUDE.md updates** - Use Edit tool to update project CLAUDE.md

7. **Verify success** - Confirm the comment was added, retrofit tickets created, and epic is closed

8. **Report to user** - Summarize closure actions, retrofit tickets created, downstream propagation

**YOU are responsible for the Linear comment, retrofit ticket creation, epic closure, and CLAUDE.md updates, not the agent.**

DO NOT attempt to perform epic closure analysis directly. The specialized epic-closure-agent handles the analysis.

---

## Required Skills
- **epic-closure-validation** - Validates all tickets complete before closure
- **production-code-standards** - Ensures no temporary workarounds were accepted
- **verify-implementation** - Verify actual completion, not assumed

## Usage Examples

```bash
# Basic epic closure
/close-epic EPIC-123

# Skip retrofit analysis (faster closure)
/close-epic EPIC-123 --skip-retrofit

# Skip downstream impact propagation
/close-epic EPIC-123 --skip-downstream

# Minimal closure (skip both optional phases)
/close-epic EPIC-123 --skip-retrofit --skip-downstream
```

You are acting as an **Epic Closure Coordinator** responsible for formally closing completed epics, extracting lessons learned, and ensuring knowledge propagation across the project.

# Epic Closure: Final Gate for Epic Completion

**Epic closure is the final step after ALL sub-tickets have passed security review and been marked Done.**

- Prerequisites: Every sub-ticket under this epic is Done or Cancelled
- This command analyzes the completed work, propagates learnings, and formally closes the epic
- Unlike ticket closure (done by /security-review), epic closure requires cross-cutting analysis

**Workflow Position:** `All sub-tickets Done -> **Epic Closure** (YOU ARE HERE - FINAL EPIC GATE)`

---

## Pre-flight Checks
Before running:
- [ ] Linear MCP connected
- [ ] All sub-tickets are Done or Cancelled
- [ ] Epic is currently in "In Progress" state
- [ ] Project CLAUDE.md is accessible (if documentation updates needed)

## IMPORTANT: Linear MCP Integration (Orchestrator Responsibility)

**The orchestrator (YOU) handles ALL Linear MCP operations. The agent does NOT have access to Linear.**

**Tools you will use:**
- **Fetch epic**: `mcp__linear-server__get_issue` - YOU fetch before agent invocation
- **List sub-tickets**: `mcp__linear-server__list_issues` - YOU fetch before agent invocation
- **Fetch comments**: `mcp__linear-server__list_comments` - YOU fetch before agent invocation
- **Add comments**: `mcp__linear-server__create_comment` - YOU write after agent returns
- **Update status**: `mcp__linear-server__update_issue` - YOU update after agent returns (CLOSE EPIC!)

You are closing epic **$ARGUMENTS** (or **$1** if single argument provided).

## Six-Phase Epic Closure Workflow

### Phase 1: Completion Verification (BLOCKING)

**Orchestrator performs this BEFORE invoking the agent.**

```bash
# Verify all sub-tickets are complete
# Use mcp__linear-server__list_issues with parent filter

# Check criteria:
# - All sub-tickets in Done or Cancelled state
# - No tickets in Todo, In Progress, or Blocked
# - Security review passed on all implementation tickets
```

**If ANY ticket is incomplete:**
- DO NOT proceed
- List incomplete tickets
- Provide guidance on next steps

### Phase 2: Retrofit Analysis (Skippable with --skip-retrofit)

**Agent analyzes patterns that should propagate BACKWARD to existing code.**

The agent identifies:
- New patterns established during this epic that improve on existing code
- Architectural decisions that existing code should adopt
- Security patterns that existing related code should implement
- Test patterns that existing test suites should follow

**Output:** List of retrofit recommendations with:
- What pattern/approach to propagate
- Which existing files/components should adopt it
- Priority (P0-P3)
- Estimated effort

### Phase 3: Downstream Impact (Skippable with --skip-downstream)

**Agent identifies impacts on FUTURE work (dependent epics).**

The agent analyzes:
- Epics that depend on this epic's completion
- Epics that share architectural patterns
- Epics that will interact with newly created services/APIs

**Output:** Guidance comments to add to dependent epics:
- New services/APIs available for reuse
- Patterns established that should be followed
- Integration points and how to use them
- Lessons learned that apply to their scope

### Phase 4: Documentation Audit

**Agent maps implemented features against documentation needs.**

The agent checks:
- Do implemented features have adequate CLAUDE.md coverage?
- Are new services/patterns documented for future AI sessions?
- Are architectural decisions captured?
- Are integration points documented?

**Output:** Documentation gaps requiring CLAUDE.md updates.

### Phase 5: CLAUDE.md Updates

**Agent proposes specific CLAUDE.md changes based on audit.**

Update categories:
- **New Services**: Add to service inventory section
- **New Patterns**: Add to architectural patterns section
- **New APIs**: Add to integration points section
- **Lessons Learned**: Add to best practices/guidelines section

**Output:** Specific edit instructions for CLAUDE.md.

### Phase 6: Epic Closure

**Orchestrator creates closure summary and marks epic Done.**

Closure comment includes:
- Summary of completed work
- Business value delivered
- Retrofit recommendations (if generated)
- Downstream guidance propagated (if performed)
- CLAUDE.md updates applied
- Lessons learned

---

## Epic Closure Report Format

After completing the analysis, the orchestrator adds the following comment to the epic:

```markdown
## Epic Closure Report

### Status: COMPLETE | COMPLETE_WITH_FINDINGS | BLOCKED

### Business Value Delivered
[Summary of what was accomplished vs. original goals]

### Sub-Ticket Summary
| Ticket | Title | Status | Key Outcomes |
|--------|-------|--------|--------------|
| TICK-1 | ... | Done | ... |
| TICK-2 | ... | Done | ... |

### Late Findings
| Severity | Location | Issue | Action Taken |
|----------|----------|-------|--------------|
| MEDIUM | utils/format.ts:23 | Missing error handling | Created PROJ-XXX |
| LOW | types/user.ts:12 | TODO comment | Documented below |

*(If no findings: "None identified during closure analysis.")*

### Retrofit Analysis
**Patterns to Propagate Backward:**
1. **[Pattern Name]** - [Description]
   - Files to update: `path/to/existing/code`
   - Priority: P[0-3]
   - Estimated effort: [hours]

### Retrofit Tickets Created
| Ticket ID | Title | Priority | Est. Effort |
|-----------|-------|----------|-------------|
| PROJ-XXX | [Retrofit] Pattern Name - Description | P1 | 4h |
| PROJ-YYY | [Retrofit] Other Pattern - Description | P2 | 2h |

**Total Retrofit Tickets**: X
**Total Estimated Effort**: ~Y hours

### Downstream Impact
**Guidance Added to Dependent Epics:**
- EPIC-456: Added integration guidance for [new service]
- EPIC-789: Added pattern guidance for [architectural decision]

### CLAUDE.md Updates Applied
- Added [new service] to service inventory
- Documented [pattern] in architectural patterns section
- Added [integration point] to API documentation

### Lessons Learned
1. [Lesson with actionable guidance]
2. [Lesson with actionable guidance]

### Metrics
- Tickets Completed: X/Y
- Total Implementation Time: ~X hours
- Security Issues Found/Fixed: X/X
- Test Coverage Achieved: X%
- Late Findings: X (CRITICAL: 0, HIGH: 0, MEDIUM: X, LOW: X)

**Epic Closed**: [Date/Time]
**Closure Coordinator**: AI Epic Closure Agent
```

---

## CLAUDE.md Update Process

When the agent identifies CLAUDE.md updates:

1. **Read current CLAUDE.md**: Use Read tool to get current content
2. **Identify insertion points**: Find appropriate sections for each update
3. **Apply edits**: Use Edit tool to make targeted updates
4. **Verify changes**: Confirm edits were applied correctly

**CLAUDE.md Update Categories:**

```markdown
## Service Inventory
### [New Service Name]
- **Purpose**: [what it does]
- **Location**: `path/to/service`
- **API**: [key methods/endpoints]
- **Dependencies**: [what it requires]

## Architectural Patterns
### [Pattern Name]
- **When to use**: [conditions]
- **Implementation**: [how to apply]
- **Example**: [reference implementation]

## Integration Points
### [Integration Name]
- **Endpoint/Interface**: [how to connect]
- **Authentication**: [auth requirements]
- **Usage**: [typical use cases]
```

---

## Late Findings Handling (CRITICAL)

**Late Findings are issues discovered during closure analysis that weren't caught in earlier phases.**

### Late Findings Table Format

The agent may return a Late Findings table:

```markdown
### Late Findings
| Severity | Location | Issue | Action |
|----------|----------|-------|--------|
| CRITICAL | auth/login.ts:45 | Hardcoded API timeout (30s) bypasses circuit breaker | Create ticket before closure |
| HIGH | utils/format.ts:23 | Missing error handling in date parser | Add to retrofit backlog |
| MEDIUM | components/Modal.tsx:89 | Console.log left in production | Include in cleanup task |
| LOW | types/user.ts:12 | TODO comment about future enhancement | Document in lessons learned |
```

### Severity Handling Rules

| Severity | Closure Action | Required Response |
|----------|----------------|-------------------|
| **CRITICAL** | ⛔ BLOCKED | Create blocking ticket(s), do NOT close epic |
| **HIGH** | ⚠️ REQUIRES DECISION | Ask user: close with findings OR create tickets first |
| **MEDIUM** | ✓ PROCEED | Add to retrofit tickets, note in closure report |
| **LOW** | ✓ PROCEED | Document in lessons learned only |

### Blocking Logic

```
IF Late Findings contains CRITICAL items:
  → DO NOT close epic
  → Create Linear ticket(s) for each CRITICAL item
  → Report: "Epic closure blocked by X critical findings. Created tickets: [IDs]"
  → User must address and re-run /close-epic

IF Late Findings contains HIGH items (no CRITICAL):
  → PAUSE for user decision
  → Ask: "Found X high-severity issues. Options:
          a) Create tickets and close epic with findings
          b) Abort closure to address first
          c) Proceed anyway (not recommended)"

IF only MEDIUM/LOW:
  → Proceed with closure
  → Include findings in retrofit tickets and closure report
```

**Late Findings are EXEMPT from truncation** - they form the audit trail for quality assurance.

---

## Handling Edge Cases

### Partial Completion
If some tickets are Done but others are Cancelled:
- Epic can still be closed if business value was delivered
- Document what was descoped in closure report
- Note any follow-up epics created for descoped work

### Retrofit Declined
If user skips retrofit with `--skip-retrofit`:
- Note in closure report that retrofit analysis was skipped
- Document that existing code may benefit from patterns established

### Downstream Declined
If user skips downstream with `--skip-downstream`:
- Note in closure report that downstream propagation was skipped
- Dependent epics may need manual review for new integration points

### No CLAUDE.md Updates Needed
If documentation audit finds no gaps:
- Note "Documentation Complete" in closure report
- Skip Phase 5

---

## Critical: Epic Closure Finality

**After epic closure:**
- Epic status is "Done" and should not be reopened
- All retrofit recommendations are documented (not necessarily implemented)
- Downstream epics have been updated with relevant guidance
- CLAUDE.md reflects new patterns/services from this epic
- Lessons learned are captured for future reference

**Do NOT close the epic if:**
- Any sub-ticket is still In Progress, Todo, or Blocked
- Critical security issues remain unresolved
- Business value was not delivered (descope to new epic instead)

Your final reply must contain the epic closure report, confirmation of Linear updates, and summary of any CLAUDE.md changes applied.
