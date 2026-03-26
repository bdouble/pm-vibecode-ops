---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_issue, mcp__linear-server__create_comment, mcp__linear-server__list_comments, mcp__linear-server__list_issues, mcp__linear-server__list_projects
description: Close completed epic with retrofit analysis, downstream impact propagation, retrofit ticket creation, and CLAUDE.md updates
argument-hint: <epic-id> [--skip-deferred-review] [--skip-retrofit] [--skip-downstream] (e.g., /close-epic EPIC-123)
workflow-phase: epic-closure
closes-epic: true
workflow-sequence: "/security-review (closes tickets) -> **/close-epic** (FINAL EPIC GATE)"
---

## MANDATORY: Agent Invocation Required

**You MUST use the Task tool to invoke the `epic-closure-agent` for this phase.**

---

## ⚠️ CONTEXT BUDGET ALLOCATION (Tiered by Context Window)

**Context window auto-detection determines budget mode:**

| Context Window | Mode | Policy |
|---------------|------|--------|
| **500K+ tokens** (default) | Full context | Include all data verbatim — no budget caps |
| **Under 500K tokens** | Budget mode | Apply extraction caps from `commands/references/close-epic-budget-legacy.md` |

**Detection:** At the start of epic closure, assess your available context window and select context mode:
```
Context mode: [Full context (1M window) | Budget mode (Xk window — see close-epic-budget-legacy.md)]
```

### Full Context Mode (500K+ tokens)

No caps. Include complete epic description, all ticket summaries with full deferred items tables, all comments, and all phase reports verbatim. Typical epic closure workflows use a small fraction of a 1M window — over-providing context has near-zero cost.

### Budget Mode (under 500K tokens)

Read and apply the budget rules in `commands/references/close-epic-budget-legacy.md`. These rules cap total context using an extraction algorithm that preserves essential data (ticket status, late findings, deferred items, key decisions) while condensing verbose content first.

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
--skip-deferred-review: [true/false based on user input]
--skip-retrofit: [true/false based on user input]
--skip-downstream: [true/false based on user input]

## Context Budget Note
Context mode: [Full context (1M window) | Budget mode (Xk window — see close-epic-budget-legacy.md)]
If budget mode: truncation applied per legacy budget rules.

## Your Task
Perform epic closure analysis following the seven-phase workflow:
1. Late Findings scan (REQUIRED - check for workarounds, disabled tests, TODOs)
2. Deferred work recovery (unless --skip-deferred-review)
3. Retrofit analysis (unless --skip-retrofit)
4. Downstream impact (unless --skip-downstream)
5. Documentation audit
6. CLAUDE.md updates
7. Closure summary

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
| **Deferred Recovery** | Raw table OR "No deferred items found" | Cannot be empty |
| **Per Deferred Group** | Classification, Recommendation, Reasoning | All required if groups exist |
| **If CREATE TICKET** | Priority, Effort, Acceptance Criteria | All required for ticket creation |
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

3. **CREATE DEFERRED RECOVERY TICKETS** (After user approval):
   - Present the agent's deferred recovery analysis to the user (see Phase 2 format above)
   - Wait for user decision on which items become tickets
   - For EACH approved item, create a new Linear ticket using `mcp__linear-server__create_issue`
   - Deferred recovery tickets MUST include:
     - **Title**: `[Deferred] [Theme Name] - [Brief Description]`
     - **Description**: Full details from the agent's grouped recommendation:
       - Original deferred items with source tickets
       - Why this work was originally deferred
       - Implementation guidance and acceptance criteria
       - Estimated effort
     - **Labels**: `deferred-recovery`, priority label (P0-P3), classification label (`ac-deferred`, `discovered`, or `out-of-scope`)
   - Collect all created ticket IDs for the closure report
   - Any items that overlap with retrofit: create single ticket under `[Deferred]`, note in retrofit section

   **Example deferred recovery ticket creation:**
   ```
   mcp__linear-server__create_issue:
     title: "[Deferred] Rate Limiting Coverage — API Endpoints"
     description: |
       ## Context
       During EPIC-123, multiple agents independently flagged missing rate
       limiting but deferred it as low-risk per individual ticket scope.

       ## Original Deferrals
       | Source | Phase | Location | Issue | Reason |
       |--------|-------|----------|-------|--------|
       | PROJ-101 | Implementation | api.ts:45 | Missing rate limiting | Admin-only |
       | PROJ-103 | Code Review | api.ts:45 | Missing rate limiting | Low-risk |

       ## Implementation Guidance
       [From agent's consolidated recommendation]

       ## Acceptance Criteria
       - [ ] Rate limiting applied to all API endpoints
       - [ ] Tests verify rate limit behavior

       ## Source
       Originated from: EPIC-123 deferred work recovery
       Original tickets: PROJ-101, PROJ-103
       Classification: DISCOVERED
       Priority: P2
       Estimated Effort: 3h

     labels: ["deferred-recovery", "P2", "discovered"]
   ```

4. **Write the closure comment** - Use `mcp__linear-server__create_comment` with the structured closure report
   - Include the list of created retrofit ticket IDs
   - Include the list of created deferred recovery ticket IDs
   - Reference all tickets so work is traceable

5. **Update related epics** (if downstream analysis was performed):
   - Use `mcp__linear-server__create_comment` to add guidance to dependent epics

6. **Close the epic**:
   - Use `mcp__linear-server__update_issue` to mark epic as "Done"
   - Add appropriate labels (e.g., "epic-completed", "retrofit-complete")

7. **Apply CLAUDE.md updates** - Use Edit tool to update project CLAUDE.md

8. **Verify success** - Confirm the comment was added, retrofit tickets created, deferred recovery tickets created, and epic is closed

9. **Report to user** - Summarize closure actions, retrofit tickets created, deferred recovery tickets created, downstream propagation

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

# Skip deferred work recovery (faster closure)
/close-epic EPIC-123 --skip-deferred-review

# Skip retrofit analysis (faster closure)
/close-epic EPIC-123 --skip-retrofit

# Skip downstream impact propagation
/close-epic EPIC-123 --skip-downstream

# Skip both deferred review and retrofit
/close-epic EPIC-123 --skip-deferred-review --skip-retrofit

# Full minimal closure
/close-epic EPIC-123 --skip-deferred-review --skip-retrofit --skip-downstream
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

## Seven-Phase Epic Closure Workflow

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

### Phase 2: Deferred Work Recovery (Skippable with --skip-deferred-review)

**Agent aggregates and analyzes ALL deferred items from sub-ticket phase reports.**

During ticket execution, agents defer work items and record them in structured Deferred Items tables (Classification: AC-DEFERRED, DISCOVERED, OUT-OF-SCOPE). These tables are posted to Linear comments by the execute-ticket orchestrator. This phase recovers that data and surfaces it for user decision.

**Orchestrator context gathering must include:**
- Extract ALL Deferred Items tables from sub-ticket Linear comments/phase reports
- Include them verbatim in the agent prompt (full context mode) or per budget rules (budget mode)

**Agent performs three steps:**

1. **Aggregate & Deduplicate**: Collect all deferred items into a single raw table. Remove exact duplicates (same file, same issue flagged across phases). Preserve source ticket ID for traceability.

2. **Group by Pattern/Theme**: Cluster related deferrals into logical groups. Each group becomes a potential ticket candidate. Uses issue description, location, and reasoning to identify themes.

3. **Flag Retrofit Overlaps**: Check whether any deferred recovery group overlaps with a Phase 3 (Retrofit) candidate. Flag overlaps so the orchestrator avoids duplicate tickets.

**Agent output includes:**
- Raw per-ticket deferred items table (audit trail)
- Consolidated grouped recommendations (actionable)
- Per-group recommendation: CREATE TICKET | ACCEPT DEFERRAL | MERGE WITH RETROFIT
- Reasoning for each recommendation
- Overlap table with retrofit candidates

**Orchestrator presents results to user as interactive decision point:**

```
## Deferred Work Recovery — Your Decision Required

### Recommended: Create Ticket
| # | Group | Sources | Classification | Priority | Effort | Recommendation |
|---|-------|---------|---------------|----------|--------|----------------|
| 1 | Rate Limiting Coverage | PROJ-101, PROJ-103 | DISCOVERED | P2 | 3h | Create ticket |
| 2 | Form Validation Migration | PROJ-102 | AC-DEFERRED | P1 | 6h | Create ticket |

### Recommended: Accept Deferral (No Action)
| # | Group | Sources | Classification | Recommendation |
|---|-------|---------|---------------|----------------|
| 3 | Login Audit Trail | PROJ-103 | OUT-OF-SCOPE | Belongs to security epic |

### Overlaps with Retrofit
| # | Deferred Group | Retrofit Item | Agent Suggestion |
|---|---------------|---------------|-----------------|
| 1 | Rate Limiting Coverage | API Hardening | Single ticket under [Deferred] |

Which items should become tickets? (e.g., "1,2", "all", "none", "1 only")
```

**User response handling:**

| User Says | Orchestrator Action |
|-----------|-------------------|
| `all` | Create tickets for all "Create Ticket" recommendations |
| `none` | Skip ticket creation, note in closure report |
| `1,2` | Create tickets for selected items only |
| `1 at P3` | Create ticket 1 but override priority to P3 |
| Reclassifies an "Accept Deferral" item | Create ticket for it too |

**When `--skip-deferred-review` is used:**
- Full analysis is skipped
- But if AC-DEFERRED items exist, the orchestrator still includes a minimal reminder in the closure report:

```
### Deferred Work Recovery
**Status**: SKIPPED (user request)

**AC-DEFERRED items for awareness** (approved during execution):
| Source | Issue | Original Decision |
|--------|-------|-------------------|
| PROJ-102 | Old form validation | Adaptation chose new path only |

These were approved scope cuts. Consider reviewing in a future cycle.
```

### Phase 3: Retrofit Analysis (Skippable with --skip-retrofit)

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

### Phase 4: Downstream Impact (Skippable with --skip-downstream)

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

### Phase 5: Documentation Audit

**Agent maps implemented features against documentation needs.**

The agent checks:
- Do implemented features have adequate CLAUDE.md coverage?
- Are new services/patterns documented for future AI sessions?
- Are architectural decisions captured?
- Are integration points documented?

**Output:** Documentation gaps requiring CLAUDE.md updates.

### Phase 6: CLAUDE.md Updates

**Agent proposes specific CLAUDE.md changes based on audit.**

Update categories:
- **New Services**: Add to service inventory section
- **New Patterns**: Add to architectural patterns section
- **New APIs**: Add to integration points section
- **Lessons Learned**: Add to best practices/guidelines section

**Output:** Specific edit instructions for CLAUDE.md.

### Phase 7: Epic Closure

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

### Deferred Work Recovery
**Items Surfaced**: X deferred items across Y tickets
**Groups Formed**: Z consolidated groups
**User Decisions**:
| # | Group | Decision | Ticket Created |
|---|-------|----------|---------------|
| 1 | Rate Limiting Coverage | Approved | PROJ-XXX |
| 2 | Form Validation Migration | Approved | PROJ-YYY |
| 3 | Login Audit Trail | Accepted deferral | — |

### Deferred Recovery Tickets Created
| Ticket ID | Title | Priority | Sources | Est. Effort |
|-----------|-------|----------|---------|-------------|
| PROJ-XXX | [Deferred] Rate Limiting — API Endpoints | P2 | PROJ-101, PROJ-103 | 3h |
| PROJ-YYY | [Deferred] Form Validation Migration | P1 | PROJ-102 | 6h |

**Total Deferred Recovery Tickets**: X
**Total Estimated Effort**: ~Y hours
**Items accepted as deferred (no ticket)**: Z

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
- Skip Phase 6

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
