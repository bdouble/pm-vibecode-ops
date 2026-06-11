---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(mkdir:*), Bash(cat:*), Bash(jq:*), Bash(flock:*), Bash(date:*), Bash(printf:*), Bash(echo:*), Bash(test:*), Bash(rev-parse:*), Bash(git:*), Read, Write, Glob, Grep, LS, Task, mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_issue, mcp__linear-server__save_comment, mcp__linear-server__list_comments, mcp__linear-server__list_issues, mcp__linear-server__list_projects
description: Close completed epic with a Convention Guard Audit (patterns ship guards or are tagged prose-only), impact-bar-disciplined follow-up tickets (capped at 3), guard-or-ratchet boundary fixes for cross-cutting concerns, Considered-but-not-pursued closure-log, downstream impact propagation, and CLAUDE.md updates with prose pruning
argument-hint: <epic-id> [--skip-deferred-review] [--skip-followups] [--skip-downstream] (e.g., /close-epic EPIC-123)
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

PHASE B: Follow-Up Discipline
         → Pass master summary to epic-closure-agent
         → Request ONLY follow-up recommendations (impact-bar-disciplined, ≤3) + closure-log
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
- **Closure-log aggregation** (NEW in v4.7): for every sub-ticket, grep its phase report comments for `Considered but not pursued` sections at h2/h3/h4 (canonical h3, legacy h2 from v4.6.0, h4 when nested inside follow-up-discipline blocks — see `agents/epic-closure-agent.md` template). Aggregate all entries — deduplicated — into the prompt under a `## Aggregated Closure-Log Across Sub-Tickets` section. The agent uses this to write the epic-level `### Considered but not pursued in this epic` section without losing items that lived only inside individual phase reports.

**Aggregation pseudocode** (canonical procedure — `skills/closure-log-aggregation/SKILL.md` operationalizes this):
```
aggregated = []
for ticket in sub_tickets:
    comments = mcp__linear-server__list_comments(ticket.id)
    for c in comments:
        # Match (##|###|####)\s+Considered but not pursued at line start.
        # h2 = v4.6.0 legacy. h3 = canonical phase-report section.
        # h4 = nested inside epic-closure-agent's Follow-Up Discipline block.
        for level in ["##", "###", "####"]:
            entries = extract_section(c.body, f"{level} Considered but not pursued")
            for e in entries:
                aggregated.append({"ticket": ticket.id, "phase": c.phase, "entry": e})
# Deduplicate ONLY when entry body is byte-identical across two source tickets.
# Different wording is different signal — do not collapse near-duplicates.
# (Rule lives in skills/closure-log-aggregation/SKILL.md — kept in sync here.)
# Pass aggregated list into prompt, preserving per-entry [from TICKET-ID/phase] attribution.
```

**Heading-level note:** `### Considered but not pursued` (h3) is canonical as of v4.7. The h2 fallback exists to catch v4.6-era artifacts that emitted h2 inconsistently. New phase reports and agent templates use h3 only.

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
| Ticket ID | Status | Key Outcome | Key Decision | Tests | Security | Def/Log | Files |
|-----------|--------|-------------|--------------|-------|----------|---------|-------|
| TICKET-1  | Done   | [10 words]  | [8 words]    | ✓ 85% | Approved | 2/3     | 4     |
| TICKET-2  | Done   | [10 words]  | [8 words]    | ✓ 78% | Approved | 0/1     | 3     |

*(Note: Each ticket summary is max 100 tokens per context budget. The `Def/Log` column shows `deferred_items_count / considered-but-not-pursued_count`. Fetch the full closure-log verbatim into the "Aggregated Closure-Log Across Sub-Tickets" section below whenever Def/Log's right-hand number is > 0.)*

## Aggregated Closure-Log Across Sub-Tickets
[Populate from the aggregation pseudocode above. One bullet per item, prefixed with originating ticket ID. Group near-duplicates. If empty across all sub-tickets, write "None — all sub-tickets reported empty closure-logs."]

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
--skip-followups: [true/false based on user input]
--skip-downstream: [true/false based on user input]

## Context Budget Note
Context mode: [Full context (1M window) | Budget mode (Xk window — see close-epic-budget-legacy.md)]
If budget mode: truncation applied per legacy budget rules.

## Your Task
Perform epic closure analysis following the phased closure workflow (seven phases plus the Convention Guard gate at 2.5):
1. Late Findings scan (REQUIRED - check for workarounds, disabled tests, TODOs)
2. Deferred work recovery (unless --skip-deferred-review)
2.5. Convention Guard Audit (BLOCKING) — enumerate conventions this epic established; each needs a guard artifact (enforcement-ladder rung 1–5) or an explicit [prose-only] tag with rationale
3. Follow-up discipline: boundary question (guard or ratchet first), impact bar, ≤3 follow-ups cap (unless --skip-followups)
4. Downstream impact (unless --skip-downstream)
5. Documentation audit
6. CLAUDE.md updates — including prose pruning: rules whose guards shipped retire to one-line [enforced:] pointers; surviving rules get [prose-only] tags; report the before/after count
7. Closure summary — MUST include the "Considered but not pursued" section AND the "Convention Guards" table

**Validation requirements**:
- Return Late Findings table even if empty.
- Return the Convention Guards table even if "None — no conventions established".
- Return the Considered-but-not-pursued section even if empty ("None" is valid).
- Every filed follow-up ticket MUST have a passing impact-bar sentence in its rationale.
- Total follow-up tickets generated by closure MUST NOT exceed 3 (rare audit-epic exception requires explicit justification).
- For cross-cutting concerns, answer the boundary question BEFORE filing any tickets — a guard or ratchet is always the preferred answer; a propagation ticket is the argued-fallback, never the default.

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
| **Convention Guards** | Table: convention, guard artifact + rung (or `[prose-only]` + rationale), verified — OR "None — no conventions established" | REQUIRED — any convention with neither a verified guard nor a prose-only tag BLOCKS closure |
| **Follow-Up Discipline** | Boundary-question answer + (recommendations OR "None") | Cannot be empty; if recommendations present, must include boundary-question answer |
| **Per Follow-Up Item** | Priority (P0-P3), Effort estimate, Acceptance criteria, **impact-bar sentence** | All required for ticket creation; impact-bar sentence must name a specific code path / user segment / operational property |
| **Considered but not pursued (closure-log)** | Bulleted list OR "None" | REQUIRED — section must exist; padding with non-candidates is rejected |
| **Deferred Recovery** | Raw table OR "No deferred items found" | Cannot be empty |
| **Per Deferred Group** | Classification, Recommendation, Reasoning | All required if groups exist |
| **If CREATE TICKET** | Priority, Effort, Acceptance Criteria, **impact-bar sentence** | All required for ticket creation |
| **Downstream Guidance** | Affected epics list, Propagation notes | Can be "None" if skipped |
| **CLAUDE.md Updates** | Specific sections, Proposed content | Can be "No updates needed" |
| **Late Findings** | Table with Severity, Location, Issue, Action | Can be empty |
| **Follow-Up Ticket Count** | Total ≤ 3 (rare audit-epic exception with explicit justification) | Block closure if exceeded |

**Validation Actions:**

```
IF missing required fields:
  → Retry ONCE with enhanced prompt:
    "Your report is missing required fields: [list].
     Please regenerate with complete:
     - Status section
     - Follow-up recommendations (or 'None identified') with impact-bar sentences
     - Considered-but-not-pursued closure-log (or 'None')
     - Boundary-question answer if cross-cutting concerns surfaced
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

1. **Parse the agent's report** - Extract follow-up recommendations, boundary-question answer, closure-log entries, downstream updates, CLAUDE.md changes

2. **APPLY THE FOLLOW-UP DISCIPLINE** (CRITICAL - this replaces the prior "create retrofit ticket per surface" behavior):

   This step decides what the closure phase actually files. The default outcome is **nothing filed, everything in the closure-log**. Apply the rules below in order.

   **Rule A — Validate the impact bar on every proposed ticket.**

   For every follow-up recommendation in the agent's report, verify a passing impact-bar sentence is present:

   > "Without this, **[specific production behavior / user experience / cost / security control / operational property]** changes for **[identified code path / user-operator segment / named operation-system]**."

   The "for" slot must name AT LEAST ONE OF: a code path (file:line, function, route, module), a user/operator segment (e.g., "admin role lookup", "checkout flow"), or a measurable operational property (latency budget, cost ceiling, named security control, named compliance requirement). Generic content ("users", "developers", "the codebase", "maintainability", "code quality", "consistency", "future-proofing") fails the bar — the item must be moved to the closure-log instead. See `no-silent-deferrals` Part 2 for the full disqualifying-phrasings list.

   If an item fails the bar, do NOT file it. Move it to the closure-log entries.

   **Rule B — Apply the boundary question to cross-cutting recommendations. The answer is always a boundary fix — a guard or a ratchet — when one is expressible.**

   For any recommendation that proposes propagating a pattern (security control, guard, check, constraint, process standard) across multiple existing surfaces, the agent's report must include an answer to:

   > "Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this epic installed it?"

   A propagation epic of per-surface tickets is an **anti-pattern** (field data: 14 propagation tickets opened, 0 closed — they rot; ratchets cost ~1-2 hours and never rot). Three outcomes:

   - **Enforcement exists or was installed by this epic** → file ZERO propagation tickets. The remaining un-migrated surfaces become closure-log entries or ratchet-allowlist entries that shrink opportunistically.
   - **No single chokepoint is expressible AND the impact bar clears for remaining surfaces** → install a **ratchet**: a shrink-only allowlist guard test seeded with the current offenders (see `skills/production-code-standards/references/enforcement-ladder.md`). The ratchet usually replaces the propagation ticket entirely. Only if neither a guard nor a ratchet is technically expressible — argued from the architecture — file ONE propagation ticket with all remaining surfaces enumerated as a checklist in its description. NEVER one ticket per surface.
   - **Enforcement is not viable AND no remaining surface clears the impact bar** → file ZERO tickets. All remaining surfaces become closure-log entries.

   The agent's report must contain one sentence stating what boundary mechanism (including a ratchet) was considered and why it isn't expressible (when the propagation-ticket fallback or outcome 3 applies). If this sentence is missing or generic, re-dispatch the agent with "answer the boundary question first — guard or ratchet before any ticket."

   **Rule C — Enforce the absolute cap of 3 follow-up tickets per epic closure.**

   | Tickets Generated | Status |
   |-------------------|--------|
   | 0–2 | Normal — expected outcome under impact-bar discipline |
   | 3 | At the cap — verify each one clears the bar; no exceptions |
   | 4+ | BLOCK closure — re-dispatch the agent with "the impact bar or boundary question was not properly applied; reduce to ≤3 or move remainder to closure-log". If after re-dispatch the count is still >3, surface to user with the full list and rationales for explicit approval. |

   Rare exception: epics whose AC explicitly scoped them as enumeration/audit work (cataloging surfaces is the deliverable) may exceed the cap. The agent must cite this exception explicitly and the original epic AC must support it. "This is a big epic" does NOT qualify.

   **Rule D — File the surviving tickets.**

   For each follow-up ticket that survives Rules A–C, use `mcp__linear-server__create_issue` with:
   - **Title**: `[Follow-up] [Concise Description]` (no longer `[Retrofit]` — the new naming reflects that follow-ups are a residual outcome, not a default)
   - **Description**: Full details including:
     - The passing impact-bar sentence verbatim
     - Context from the closed epic
     - Files/surfaces to address (or checklist if propagation epic)
     - Specific implementation guidance from the agent's report
     - Acceptance criteria
   - **Labels**: `follow-up`, priority label (P0-P3), and `propagation` if it's a single propagation epic batching multiple surfaces
   - **Parent**: standalone unless an epic-level parent is appropriate

   Collect all created ticket IDs for the closure report.

   **Worked example (the ratchet outcome — the usual case):**

   EPIC-123 added CSRF tokens to the new form pipeline at `src/routes/forms/*`; legacy routes at `src/routes/legacy-forms/*` lack the protection, and the impact bar clears ("Without this, CSRF protection is bypassable on authenticated POST handlers at `src/routes/legacy-forms/*` for any logged-in user").

   Old behavior: file a propagation ticket listing the 3 legacy routes. New behavior: **ship a ratchet inside the closure work** —

   ```
   tests/guards/csrf-form-routes.test.ts  (~1 hour, rung 4)
   - Scans src/routes/**/* for POST handlers lacking the csrfProtect() wrapper
   - ALLOWLIST seeded with the 3 legacy routes (each entry: path + reason)
   - Any NEW unprotected route → red test (adoption mandatory going forward)
   - The allowlist may only shrink — a migrated file must be removed in the same PR
   ```

   Zero tickets filed; the allowlist IS the migration backlog, enforced where it can't be ignored. Because the impact bar cleared on a current security exposure, prefer also migrating the 3 routes now (in-epic) and shrinking the allowlist to zero.

   **Propagation-ticket fallback (rare — only when neither guard nor ratchet is expressible):** if, argued from the architecture, no test can even detect the pattern (e.g., the invariant is only visible in a third-party dashboard), file ONE ticket titled `[Follow-up] <pattern> — <surfaces>` with all surfaces as a checklist, the impact-bar sentence, the boundary-question answer explaining why no guard/ratchet is expressible, and labels `["follow-up", "propagation", "P1"]`. Never one ticket per surface.

   **Items moved to closure-log (NOT filed as tickets):** capture each in the closure comment's Considered-but-not-pursued section with the rationale.

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
   - Any items that overlap with follow-ups: create single ticket under `[Deferred]`, note in follow-up section

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

4. **Write the closure comment** - Use `mcp__linear-server__save_comment` with the structured closure report
   - Include the list of created follow-up ticket IDs (max 3)
   - Include the Considered-but-not-pursued closure-log
   - Include the list of created deferred recovery ticket IDs
   - Reference all tickets so work is traceable

5. **Update related epics** (if downstream analysis was performed):
   - Use `mcp__linear-server__save_comment` to add guidance to dependent epics

6. **Close the epic**:
   - Use `mcp__linear-server__update_issue` to mark epic as "Done"
   - Add appropriate labels (e.g., "epic-completed", "followups-complete")
   - **Emit `epic_completed` JSONL event** (v4.7 universal — historically only emitted for PRO-1142):
     ```json
     {"ts":"<iso8601>","epic_id":"<epic-id>","ticket_id":null,"phase":null,"event":"epic_completed","data":{"subticket_count":<n>,"followups_filed":<n>,"closure_log_items":<n>,"boundary_question_invocations":<n>,"epic_wall_clock_seconds":<n>,"prose_only_count":<n|null>,"enforced_count":<n|null>}}
     ```
     The `prose_only_count` / `enforced_count` fields carry the Phase 6 tag census (the discipline-debt metric); `null` if the target repo has no tagged rules yet.
     Append to `.swarm/observability/<epic-id>/_epic.jsonl` (epic-level stream, distinct from per-ticket streams). Canonical schema: `commands/references/observability-schema.md`. If the candidate-count pre-cap exceeded 3 anywhere during follow-up discipline, ALSO emit `followup_cap_blocked`:
     ```json
     {"ts":"<iso8601>","epic_id":"<epic-id>","ticket_id":null,"phase":null,"event":"followup_cap_blocked","data":{"candidate_count_pre_cap":<n>,"candidate_count_post_cap":<n>,"escalated_to_user":<bool>}}
     ```

7. **Apply CLAUDE.md updates** - Use Edit tool to update project CLAUDE.md — both additions AND the Phase 6 prose retirements (guarded rules → one-line `[enforced:]` pointers; surviving rules tagged `[prose-only]`)

8. **Verify success** - Confirm the comment was added, the Convention Guards table is present (Phase 2.5 verified or explicitly "None"), follow-up tickets created (≤3), closure-log present, deferred recovery tickets created, and epic is closed

9. **Report to user** - Summarize closure actions, follow-up tickets created, closure-log entries, deferred recovery tickets created, downstream propagation

**YOU are responsible for the Linear comment, follow-up ticket creation, epic closure, and CLAUDE.md updates, not the agent.**

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

# Skip follow-up discipline analysis (faster closure)
/close-epic EPIC-123 --skip-followups

# Skip downstream impact propagation
/close-epic EPIC-123 --skip-downstream

# Skip both deferred review and follow-up discipline
/close-epic EPIC-123 --skip-deferred-review --skip-followups

# Full minimal closure
/close-epic EPIC-123 --skip-deferred-review --skip-followups --skip-downstream
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
- **Add comments**: `mcp__linear-server__save_comment` - YOU write after agent returns
- **Update status**: `mcp__linear-server__update_issue` - YOU update after agent returns (CLOSE EPIC!)

You are closing epic **$ARGUMENTS** (or **$1** if single argument provided).

## Epic Closure Workflow (Seven Phases + the Convention Guard Gate at 2.5)

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

3. **Flag Follow-Up Overlaps**: Check whether any deferred recovery group overlaps with a Phase 3 (Follow-Up Discipline) candidate. Flag overlaps so the orchestrator avoids duplicate tickets.

**Agent output includes:**
- Raw per-ticket deferred items table (audit trail)
- Consolidated grouped recommendations (actionable)
- Per-group recommendation: CREATE TICKET | ACCEPT DEFERRAL | MERGE WITH RETROFIT
- Reasoning for each recommendation
- Overlap table with follow-up candidates

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

### Overlaps with Follow-Up
| # | Deferred Group | Follow-Up Item | Agent Suggestion |
|---|---------------|----------------|------------------|
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

### Phase 2.5: Convention Guard Audit (BLOCKING — not skippable)

**An epic that introduced a canonical pattern cannot close until the pattern's guard exists.** Prose rules don't propagate across amnesiac agent sessions; guards do (field data: guarded conventions had zero post-merge regressions; the most-documented prose rule regressed four times). This gate sits beside the deferral-justification and follow-up-cap gates.

**Agent performs:**

1. **Enumerate conventions the epic established** — sources: the orchestrator log's "Patterns Used" / "Key Interfaces Defined" sections, adaptation reports, and any "always/never" rules added to CLAUDE.md or convention docs during the epic.
2. **For each convention, verify ONE of:**
   - A guard artifact exists (enforcement-ladder rung 1–5: type chokepoint, source-scanning guard test, drift test, ratchet, runtime assert) — confirm the artifact file exists and its test passes; do not take a phase report's word for it.
   - The rule carries an explicit `[prose-only]` tag plus a one-line rationale for why no guard can express it.
3. **Neither present → CRITICAL finding, closure BLOCKED.** Resolution paths: ship the guard now (typically a ~200-line rung-2 test, 1–2 hours — recipes in `skills/production-code-standards/references/enforcement-ladder.md`), or surface to the user for explicit prose-only approval.

**Agent output:** the `### Convention Guards` table (Convention | Guard artifact + rung, or `[prose-only]` + rationale | Verified), or "None — no conventions established by this epic."

**Orchestrator emission** — one `convention_guard_check` event summarizing the audit, appended to `.swarm/observability/<epic-id>/_epic.jsonl`:

```json
{"ts":"<iso8601>","epic_id":"<epic-id>","ticket_id":null,"phase":"close-epic","event":"convention_guard_check","data":{"conventions_introduced":["..."],"guards_shipped":["..."],"prose_only_tagged":["..."],"missing":[]}}
```

A non-empty `missing` array means closure is blocked until resolved.

### Phase 3: Follow-Up Discipline (Skippable with --skip-followups)

**Agent identifies candidate follow-ups, applies the impact bar and boundary question, and recommends at most 3 filed tickets — everything else moves to the Considered-but-not-pursued closure-log.**

This phase replaces the prior "list every pattern that could propagate" behavior. The agent now identifies candidates, then disciplines the output through three rules:

**Rule A — Impact bar.** For each candidate, the agent writes the impact-bar sentence:
> "Without this, **[specific production behavior / user experience / cost / security control / operational property]** changes for **[identified code path / user-operator segment / named operation-system]**."

Generic "for" content ("users", "developers", "the codebase", "maintainability", "consistency", "future-proofing") fails the bar → item moves to closure-log.

**Rule B — Boundary question for cross-cutting patterns: the answer is a guard or a ratchet whenever one is expressible.** When the candidate is "this pattern should propagate to other surfaces", the agent answers:
> "Is there a single point of enforcement that makes the unsafe version impossible to produce — and if so, has this epic installed it?"

- Enforcement installed → zero propagation tickets (remaining surfaces → closure-log or ratchet allowlist)
- No chokepoint expressible + bar clears → install a **ratchet** (shrink-only allowlist guard test) — it replaces the propagation ticket entirely. Only if neither guard nor ratchet is expressible: ONE propagation ticket with surfaces as checklist (NEVER one per surface)
- Enforcement not viable + bar fails → all surfaces → closure-log

The agent writes one sentence stating what boundary mechanism (including a ratchet) was considered and why it isn't expressible, argued from the architecture. A shipped ratchet maps to `outcome: "single-enforcement-installed"` in the `boundary_question_answered` event.

**Rule C — Absolute cap of 3 filed follow-ups per epic closure.** If the agent's recommendations exceed 3 after Rules A and B, the bar or boundary question was not properly applied. Re-dispatch the agent to trim or move items to closure-log.

**Output:**
- Boundary-question answer (one sentence)
- Up to 3 follow-up recommendations, each with: title, impact-bar sentence, files/surfaces, priority (P0-P3), estimated effort, acceptance criteria
- Considered-but-not-pursued list with rationales (this is the audit trail for everything that did NOT clear the bar)

**Observability emissions for Phase 3 (v4.7 — append to `.swarm/observability/<epic-id>/_epic.jsonl`):**

For **every candidate that fails the impact bar** (moved to closure-log instead of filed as a ticket), emit one `impact_bar_rejected` event:

```json
{"ts":"<iso8601>","epic_id":"<epic-id>","ticket_id":null,"phase":"close-epic","event":"impact_bar_rejected","data":{"candidate_title":"<title>","reason":"<one-line — generic-for, no-prod-behavior-change, etc.>","disposition":"closure-log"}}
```

For **every boundary-question answer** (Rule B was invoked because the candidate was a cross-cutting pattern), emit one `boundary_question_answered` event:

```json
{"ts":"<iso8601>","epic_id":"<epic-id>","ticket_id":null,"phase":"close-epic","event":"boundary_question_answered","data":{"candidate_title":"<title>","outcome":"single-enforcement-installed | propagation-ticket-filed | propagation-bar-failed","mechanism":"<one-line — what enforcement was considered>"}}
```

Both events feed the `IMPACT BAR & CLOSURE-LOG` dashboard section in `/swarm-stats`. Without them the v4.6 anti-sprawl discipline is invisible to operators — the metric structurally cannot exist.

**Naming note:** The output is no longer called "retrofit recommendations" — it's now "follow-up discipline." The change is semantic: under the new policy, follow-ups are a residual outcome (most items should land in the closure-log), not a default expectation. Ticket titles use `[Follow-up]` rather than `[Retrofit]`.

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

### Phase 6: CLAUDE.md Updates (Append AND Prune)

**Agent proposes specific CLAUDE.md changes based on audit — in both directions.** Project memory is append-only by default and decays: it accumulates stale claims that prime every future session with falsehoods, and 400-word paragraphs documenting conventions a 10-line guard already enforces.

Update categories (append):
- **New Services**: Add to service inventory section
- **New Patterns**: Add to architectural patterns section — tagged `[enforced: <guard artifact>]` (one-line pointer) or `[prose-only]` (with ceiling rationale)
- **New APIs**: Add to integration points section
- **Lessons Learned**: Add to best practices/guidelines section

Pruning (the reciprocal step — required whenever Phase 2.5 verified guards):
- **For every guard shipped during this epic**, retire the corresponding CLAUDE.md prose to a one-line pointer: "X is enforced by `<guard test path>` — see that file for details. `[enforced: <artifact>]`". The bug class is closed AND the rule's context-window cost drops to near zero for every future session.
- **Tag surviving convention rules** that lack guards with `[prose-only]`.
- **Count the tags**: report `prose-only` and `enforced` counts before → after. This is the project's discipline-debt metric — the dashboard a non-engineer operator can actually read.

**Output:** Specific edit instructions for CLAUDE.md (additions + retirements) and the tag counts.

### Phase 7: Epic Closure

**Orchestrator creates closure summary and marks epic Done.**

Closure comment includes:
- Summary of completed work
- Business value delivered
- Convention Guards table (from Phase 2.5)
- Follow-up recommendations (if generated, ≤3)
- Considered-but-not-pursued closure-log
- Downstream guidance propagated (if performed)
- CLAUDE.md updates applied, including prose pruning + tag counts
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

### Convention Guards

| Convention Established | Guard (artifact + rung) or [prose-only] + rationale | Verified |
|------------------------|------------------------------------------------------|----------|
| [e.g., all mutations validate via validateInput()] | `tests/guards/zod-mutations.test.ts` (rung 2) | ✅ exists, green |
| [e.g., never reset staging DB without consent] | [prose-only] — operational judgment, no code chokepoint | tagged |

*(If none: "None — no conventions established by this epic.")*

### Follow-Up Discipline

**Boundary-Question Answer:**
[One sentence describing what boundary mechanism was considered and the outcome — enforcement installed (incl. ratchet shipped) / neither guard nor ratchet expressible with single propagation ticket / not viable with closure-log only.]

**Follow-Up Tickets Filed (≤3):**
| Ticket ID | Title | Priority | Impact-Bar Sentence | Est. Effort |
|-----------|-------|----------|---------------------|-------------|
| PROJ-XXX | [Follow-up] Description | P1 | "Without this, X changes for Y" | 4h |

*(If none filed: "None — all considered items were resolved in-epic or moved to closure-log.")*

**Total Follow-Up Tickets**: X (cap: 3)
**Total Estimated Effort**: ~Y hours

### Considered but not pursued in this epic

- **[Item]** — Why considered: [observation]. Why below the bar: [disqualifying phrasing or unfillable slot]. What would change to re-evaluate: [named condition].
- **[Item]** — [same structure]

*(If none: "None — all considered items were either completed or filed as tickets.")*

**Note for reviewers:** Items here are explicit rejections, not unfinished work. To promote any item to a real ticket, create a regular Linear ticket referencing this comment line. No special promotion mechanism is required.

### Downstream Impact
**Guidance Added to Dependent Epics:**
- EPIC-456: Added integration guidance for [new service]
- EPIC-789: Added pattern guidance for [architectural decision]

### CLAUDE.md Updates Applied
- Added [new service] to service inventory
- Documented [pattern] in architectural patterns section, tagged `[enforced: <guard>]`
- Added [integration point] to API documentation
- **Pruned**: retired [N] guarded rules to one-line `[enforced:]` pointers
- **Discipline debt**: prose-only rules [X → Y]; enforced rules [A → B]

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
### [Pattern Name] [enforced: <guard artifact> | prose-only]
- **When to use**: [conditions]
- **Implementation**: [how to apply — for enforced rules, a one-line pointer to the guard suffices]
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
| HIGH | utils/format.ts:23 | Missing error handling in date parser | Fix in active branch or follow-up if clears impact bar |
| MEDIUM | components/Modal.tsx:89 | Console.log left in production | Fix in cleanup or closure-log |
| LOW | types/user.ts:12 | TODO comment about future enhancement | Closure-log |
```

### Severity Handling Rules

| Severity | Closure Action | Required Response |
|----------|----------------|-------------------|
| **CRITICAL** | ⛔ BLOCKED | Create blocking ticket(s), do NOT close epic |
| **HIGH** | ⚠️ REQUIRES DECISION | Ask user: close with findings OR create tickets first |
| **MEDIUM** | ✓ PROCEED | Add to closure-log; promote to follow-up ticket only if impact bar clears |
| **LOW** | ✓ PROCEED | Closure-log only |

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
  → Include findings in closure-log (or follow-up tickets if impact bar clears, subject to ≤3 cap)
```

**Late Findings are EXEMPT from truncation** - they form the audit trail for quality assurance.

---

## Handling Edge Cases

### Partial Completion
If some tickets are Done but others are Cancelled:
- Epic can still be closed if business value was delivered
- Document what was descoped in closure report
- Note any follow-up epics created for descoped work

### Follow-Up Discipline Skipped
If user skips with `--skip-followups`:
- Note in closure report that follow-up discipline analysis was skipped
- Document that existing code may benefit from patterns established
- Considered-but-not-pursued section is STILL required (covers only the agent's observations beyond the skipped follow-up analysis — may be "None")

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
- Up to 3 follow-up tickets have been filed, each with a passing impact-bar sentence
- The Considered-but-not-pursued closure-log is present in the closure comment for retrospective review
- Downstream epics have been updated with relevant guidance
- CLAUDE.md reflects new patterns/services from this epic
- Lessons learned are captured for future reference

**Do NOT close the epic if:**
- Any sub-ticket is still In Progress, Todo, or Blocked
- Critical security issues remain unresolved
- Business value was not delivered (descope to new epic instead)

Your final reply must contain the epic closure report, confirmation of Linear updates, and summary of any CLAUDE.md changes applied.
