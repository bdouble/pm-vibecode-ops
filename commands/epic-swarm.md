---
description: Orchestrate parallel execution of epic sub-tickets using dependency-aware wave scheduling with worktree isolation
allowed-tools: Task, Agent, Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), WebFetch, mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
argument-hint: <epic-id> [--max-parallel N] [--dry-run] [--wave N]
workflow-phase: epic-swarm
closes-ticket: false
---

# Epic Swarm Orchestrator

Execute multiple tickets from an epic concurrently. The orchestrator (this command, running in the main Claude Code session) drives all phases directly, dispatching specialized agents in parallel across tickets within each phase. Each ticket works in its own git worktree.

**Architecture constraint:** Claude Code subagents cannot spawn other subagents. Therefore this command orchestrates every phase for every ticket directly — it does NOT delegate to `/execute-ticket`. Instead, it follows the same phase sequence but manages all tickets and all phases from the main session, dispatching the same specialized agents (architect-agent, backend-engineer-agent, etc.) that execute-ticket uses.

## Input

- `$ARGUMENTS` — Linear epic ID (e.g., `EPIC-42`) and optional flags:
  - `--max-parallel N` — Maximum concurrent tickets per wave (default: 4)
  - `--dry-run` — Show wave plan without executing
  - `--wave N` — Start from a specific wave (for manual wave-by-wave control)

---

## Phase 1: Analysis and Context Gathering

### 1.1 Fetch Epic and Sub-Tickets

```
Use mcp__linear-server__get_issue to fetch the epic
Use mcp__linear-server__list_issues with parentId filter to get all sub-tickets
```

**Validate:**
- Epic exists and is not Done/Cancelled
- Epic has sub-tickets
- Sub-tickets have dependency annotations (from `/planning` phase)
  - If annotations are missing, report: "Sub-tickets lack parallelization metadata. Run `/planning` with the updated planning command to add dependency annotations."

### 1.2 Check for Existing Swarm State

```bash
state_file=".claude/swarm-state/[epic-id].json"
if [ -f "$state_file" ]; then
  echo "Existing swarm state found for [epic-id]."
  echo "Current wave: N, Completed tickets: X/Y"
fi
```

If state exists, ask user: **Resume from where it left off?** or **Start fresh?**

### 1.3 Build Dependency DAG

For each sub-ticket, extract from description:
- `Parallel Group` — letter assignment
- `Files Touched` — predicted file paths
- `Depends On` — ticket IDs
- `Blocks` — ticket IDs
- `Shared Interfaces` — contract references
- `Model Override` — optional model preference

**Validation:**
- No circular dependencies (topological sort must succeed)
- No file overlap between tickets in the same parallel group

If circular dependencies detected: report and stop.
If file overlap in same group: move the overlapping ticket to the next wave and warn.

### 1.4 Filter Tickets

**Include in the swarm:**
- Tickets in Todo, Backlog, or Unstarted status — these are the work to be done
- Tickets marked as `codex-review-pending` in swarm state — re-queue for Codex review retry

**Exclude from the swarm:**
- Tickets in Done or Cancelled status — already complete
- Tickets in In Progress status — likely being worked on by another session or manually. Report these to the user: "Ticket CON-42 is In Progress — skipping. If this ticket should be included, reset it to Todo first."

**Present the filtered list to the user** before proceeding:
```
Swarm scope for EPIC-123:
  Include (5): CON-42, CON-43, CON-44, CON-45, CON-46 (all Todo)
  Skip (3): CON-40 (Done), CON-41 (Done), CON-47 (In Progress)
```

### 1.5 Epic Context Gathering

**THIS STEP IS CRITICAL TO IMPLEMENTATION QUALITY.**

Every ticket agent must have full, verbatim access to all research, requirements, and reference materials. The orchestrator gathers this context ONCE, writes it to disk, and every agent reads it directly. This eliminates context loss through summarization hops.

**1.5.1 Gather epic-level context from Linear:**
- Epic description (full, verbatim — do NOT summarize)
- ALL epic comments (full, verbatim, chronological)
- Extract every referenced document path and URL from the epic body and comments

**1.5.2 Read ALL local referenced documents:**
- Research briefs, requirements documents, design specs, ADRs, implementation references
- Read each file IN FULL using the Read tool — do NOT summarize or excerpt
- Classify each as prescriptive (contains specific implementable requirements, IDs, schemas, field names) or contextual (background information, analysis)
- If a document references OTHER documents or URLs, follow those references and read them too

**1.5.3 Fetch ALL external URLs:**
- API documentation, open source repos, blog posts, design references, example implementations
- Fetch each URL using WebFetch — capture the full content
- If a URL fails, log it and continue — note the failure in the context bundle
- Normalize GitHub URLs (blob→raw, gist→raw)

**1.5.4 Read ALL ticket descriptions and comments:**
- For EVERY ticket in the swarm scope, fetch full description and all comments from Linear
- Extract any ticket-level document references and URLs not already gathered at epic level
- Read/fetch those as well — follow every reference chain

**1.5.5 Write the epic context bundle:**

Write ALL gathered context to `.claude/swarm-context/{epic-id}/epic-context.md`:

```markdown
# Epic Context Bundle: [epic-id]
Generated: [timestamp]

## Epic Description (VERBATIM — do NOT summarize when passing to agents)
[full epic description, completely unmodified]

## Epic Comments (VERBATIM, chronological)
[all epic comments, completely unmodified]

## Referenced Documents

### [document-name] — PRESCRIPTIVE
Source: [file path or URL]
[FULL document content, completely unmodified]

### [next document...] — CONTEXTUAL
Source: [file path or URL]
[FULL document content, completely unmodified]

## Interface Contracts
[all shared interface contracts from planning]

## Fetch Failures
[any URLs or files that could not be read, with error details]
```

**Also write per-ticket context files** to `.claude/swarm-context/{epic-id}/{ticket-id}.md`:

```markdown
# Ticket Context: [ticket-id] — [title]

## Ticket Description (VERBATIM)
[full ticket description]

## Acceptance Criteria (VERBATIM)
[extracted from description, each criterion on its own line]

## Technical Notes (VERBATIM)
[extracted from description]

## Ticket Comments (VERBATIM, chronological)
[all comments]

## Ticket-Specific References
[any documents or URLs referenced only by this ticket, full content]

## Adaptation Scope Decisions
[if resuming and adaptation is complete, include any deferred items]
```

**ABSOLUTE RULES for context bundles:**
- Every document is included VERBATIM — no summarization, no excerpting, no paraphrasing
- If a research brief says "copy the implementation pattern from [source]", the source content MUST be in the bundle
- If a ticket says "follow the approach in [document]", the document MUST be in the bundle
- If a brief contains a table of IDs, field names, or schemas — include the ENTIRE table, not a summary
- Missing context produces wrong implementations. When in doubt, include MORE context, not less
- These bundles are the single source of truth that all agents read directly from disk

Ensure `.claude/swarm-context/` is gitignored:
```bash
git check-ignore .claude/swarm-context/ || echo ".claude/swarm-context/" >> .gitignore
```

### 1.6 Create Swarm State File

```bash
mkdir -p .claude/swarm-state
git check-ignore .claude/swarm-state || echo ".claude/" >> .gitignore
```

Initialize state:
```json
{
  "epicId": "[epic-id]",
  "startedAt": "[timestamp]",
  "currentWave": 1,
  "currentPhase": "adaptation",
  "waves": [],
  "pendingCodexReviews": [],
  "contextBundlePath": ".claude/swarm-context/[epic-id]/",
  "config": {
    "maxParallel": 4,
    "autoMerge": false,
    "conflictStrategy": "stop"
  }
}
```

---

## Phase 2: Wave Planning

### 2.1 Topological Sort

Sort all tickets by dependency depth:
- Wave 1: tickets with no dependencies (Parallel Group A)
- Wave 2: tickets that depend only on Wave 1 tickets (Parallel Group B)
- Wave 3: tickets that depend on Wave 1 or Wave 2 tickets (Parallel Group C)
- Continue until all tickets are assigned

### 2.2 File Overlap Check Within Waves

For each wave, check if any two tickets predict modifying the same file:
- If overlap detected: move the later ticket (by ID) to the next wave
- Log: "Ticket CON-46 moved to Wave 3 due to file overlap with CON-45 on src/services/auth.ts"

### 2.3 Cap Wave Size

If a wave has more tickets than `--max-parallel`:
- Keep the first N tickets (lowest IDs) in this wave
- Move remaining to a new wave at the same dependency level
- Preserve dependency ordering

### 2.4 Present Wave Plan

Display to the user and await approval:

```
## Epic Swarm: Wave Plan

Epic: [epic-id] — [epic title]
Total tickets: N | Waves: M | Max parallel: K

### Wave 1 (3 tickets, no dependencies)
| Ticket | Title | Files | Model |
|--------|-------|-------|-------|
| CON-42 | Add user profile endpoint | src/routes/profile.ts, src/services/profile.ts | opus |
| CON-43 | Add settings page | src/pages/settings.tsx, src/components/settings/ | sonnet |
| CON-44 | Add email templates | src/templates/email/ | sonnet |

### Wave 2 (2 tickets, depends on Wave 1)
| Ticket | Title | Depends On | Files | Model |
|--------|-------|------------|-------|-------|
| CON-45 | Profile settings page | CON-42 | src/pages/profile-settings.tsx | opus |
| CON-46 | User avatar upload | CON-42 | src/services/avatar.ts | opus |

### Shared Interface Contracts
- IProfileResponse: defined by CON-42, consumed by CON-45, CON-46
```

**If `--dry-run`:** Show the plan and stop. Do not execute.

---

## Phase 3: Wave Execution (repeat per wave)

### Architecture

**The main session orchestrates all phases directly.** For each workflow phase, it dispatches specialized agents in parallel across all tickets in the wave, one agent per ticket. Agents run in isolated worktrees.

```
Main Session (this command)
  │
  ├─ Phase: Adaptation ──────────────────────────────
  │   ├─ Agent: architect-agent → worktree CON-42
  │   ├─ Agent: architect-agent → worktree CON-43    (parallel)
  │   └─ Agent: architect-agent → worktree CON-44
  │   └─ [wait for all, post reports to Linear]
  │
  ├─ Phase: Implementation ──────────────────────────
  │   ├─ Agent: backend-engineer-agent → worktree CON-42
  │   ├─ Agent: frontend-engineer-agent → worktree CON-43  (parallel)
  │   └─ Agent: backend-engineer-agent → worktree CON-44
  │   └─ [wait for all, post reports, verify AC]
  │
  ├─ Phase: Testing ─────────────────────────────────
  │   ├─ Agent: qa-engineer-agent → worktree CON-42
  │   ├─ Agent: qa-engineer-agent → worktree CON-43  (parallel)
  │   └─ Agent: qa-engineer-agent → worktree CON-44
  │   └─ [wait for all, post reports]
  │
  │   ... (documentation, code review, codex review, security)
  │
  └─ Integration: merge all worktrees to main
```

This preserves ticket-level parallelism (N tickets run concurrently) while using the same specialized agents as `/execute-ticket`. Phases are synchronized across the wave — all tickets complete adaptation before any starts implementation. This ensures interface contracts and shared decisions propagate correctly.

### 3.1 Pre-Wave Setup

For each ticket in the current wave:

**3.1.1 Create worktree:**
```bash
git check-ignore .claude/worktrees/ || echo ".claude/worktrees/" >> .gitignore

default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}

git worktree add .claude/worktrees/[ticket-id] -b feature/[ticket-id]-[slug] "origin/$default_branch"
```

**3.1.2 Install dependencies:**
```bash
cd .claude/worktrees/[ticket-id]
[ -f package.json ] && npm ci
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f Cargo.toml ] && cargo build
[ -f go.mod ] && go mod download
```

**3.1.3 Run baseline tests:**
```bash
cd .claude/worktrees/[ticket-id]
npm test  # or appropriate test command
```
- If baseline tests fail: report to user, ask whether to proceed

**3.1.4 Copy context bundles into worktrees:**
```bash
# Copy epic context bundle and ticket-specific context into each worktree
cp .claude/swarm-context/[epic-id]/epic-context.md .claude/worktrees/[ticket-id]/.epic-context.md
cp .claude/swarm-context/[epic-id]/[ticket-id].md .claude/worktrees/[ticket-id]/.ticket-context.md
```

Also copy interface contracts if shared interfaces exist.

### 3.2 Phase-by-Phase Parallel Dispatch

For each workflow phase, dispatch agents in parallel across all tickets in the wave. The orchestrator builds each agent's prompt with full context.

**The phase sequence:**

| Phase | Agent | Sandbox | Blocking |
|-------|-------|---------|----------|
| Adaptation | `architect-agent` | read-only | BLOCKED → pause ticket |
| Implementation | `backend-engineer-agent` or `frontend-engineer-agent` | write | BLOCKED or AC failure → pause ticket |
| Testing | `qa-engineer-agent` | write | BLOCKED or gate failure → pause ticket |
| Documentation | `technical-writer-agent` | write | BLOCKED → pause ticket |
| Code Review | `code-reviewer-agent` | read-only | CHANGES_REQUESTED → pause ticket |
| Codex Review | *(MCP tool, not agent)* | write | Rate limit → queue, continue |
| Security Review | `security-engineer-agent` | read-only | CRITICAL/HIGH findings → pause ticket |

**For each phase, for each ticket in the wave:**

#### 3.2.1 Build the agent prompt

**CRITICAL: CONTEXT FIDELITY RULES**

The agent prompt MUST include ALL of the following, VERBATIM and UNABRIDGED:

1. **Instruct the agent to read the context files first:**
   ```
   BEFORE doing any work, you MUST read these context files:
   - .epic-context.md (epic-level research, requirements, and reference materials)
   - .ticket-context.md (this ticket's description, AC, technical notes, comments)

   These files contain the FULL verbatim research briefs, requirements documents,
   and reference materials for this work. Read them IN FULL. Do not skim.
   Do not summarize. The specific details in these documents ARE your requirements.
   ```

2. **Ticket identity:** ticket ID, title

3. **All prior phase reports for THIS ticket** (verbatim — copy the full text of each report from Linear comments). If the adaptation report says to use a specific pattern from a reference document, the agent needs the adaptation report to know that.

4. **Phase-specific instructions** from the relevant agent definition

5. **Interface contracts** that this ticket defines or consumes

6. **Deferred items** from prior phases for this ticket

**DO NOT:**
- Summarize or condense any context — pass it verbatim
- Omit "long" documents to save tokens — missing context produces wrong implementations
- Assume the agent "already knows" something — each agent is a fresh session with no memory
- Skip the instruction to read context files — agents will not read them unprompted

#### 3.2.2 Dispatch agents in parallel

```
For each ticket in the wave (parallel):
  Spawn Agent with:
    - The agent definition matching this phase (e.g., architect-agent for adaptation)
    - model: [ticket's Model Override, or session default]
    - Working directory set to the ticket's worktree
    - The full prompt built in 3.2.1
```

Launch all agents for the current phase simultaneously. Wait for all to return.

#### 3.2.3 Process results

For each returned agent:

1. **Parse the status code:** DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
2. **Post the phase report to Linear** as a comment on the ticket
3. **Update swarm state** with the phase completion status

**Handle BLOCKED or NEEDS_CONTEXT:**
- Pause ONLY the blocked ticket (other tickets continue through remaining phases)
- Notify user with the agent's escalation diagnostic
- Blocked ticket can be resumed in a later wave or manually

**Handle DONE_WITH_CONCERNS:**
- Include concerns in subsequent phase prompts for this ticket
- Continue to next phase

#### 3.2.4 Phase-specific post-processing

**After Implementation phase:**
- Verify acceptance criteria completion (same as execute-ticket Step 3.4.2)
- If AC verification fails: pause for user decision before advancing to Testing
- Update the ticket-specific context file with implementation details

**After Code Review phase:**
- If CHANGES_REQUESTED: pause ticket, present requested changes to user
- If DONE with over-building/under-building flags: pause for user decision

**After all phases complete for a ticket:**
- Commit all changes in the ticket's worktree
- Push the feature branch

### 3.3 Codex Review Phase

The Codex review runs differently from agent phases — it uses MCP tools, not agent dispatch.

For each ticket that completed code review:

```
Call mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [absolute path to ticket's worktree]
  - base_branch: [the worktree's base branch]
  - context: [ticket description + AC summary]
```

- If MCP server not available: skip with note to Linear
- If rate limited: retry once (60s), then mark as `codex-review-pending` and continue
- Post Codex review report to Linear
- Commit any Codex fixes in the worktree

### 3.4 Wave Completion Gate

All tickets in the wave must reach one of:
- **All phases complete** (through Codex review)
- **BLOCKED** (held for manual intervention)
- **codex-review-pending** (Codex rate limit; ticket otherwise complete)

### 3.5 Post Wave Update to Linear

```
Use mcp__linear-server__create_comment on the EPIC:
  body: "## Swarm Update: Wave [N] — [Phase] Complete\n\n
  | Ticket | Status | Notes |\n
  | CON-42 | Complete | All phases passed |\n
  | CON-43 | Complete | Codex review pending (rate limit) |\n
  | CON-44 | Blocked | AC verification failed at implementation |"
```

---

## Phase 4: Integration (per wave)

### 4.1 Sequential Merge

Merge tickets to the default branch one at a time (fewest dependencies first, then fewest files):

```bash
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}
git checkout "$default_branch"
git pull origin "$default_branch"

git merge feature/[ticket-id]-[slug] --no-ff -m "merge: [ticket-id] — [ticket title]"
```

**If merge conflict:**
- `SWARM_CONFLICT_STRATEGY=stop` (default): STOP, show conflict files, ask user
- `SWARM_CONFLICT_STRATEGY=auto-trivial`: Auto-resolve lockfiles and version files only. STOP for everything else.

**After each merge, run integration tests:**
```bash
npm test  # or appropriate test command
```
- If tests fail: identify which merge introduced the failure, report to user
- Do NOT auto-revert — the user decides

**Push after all wave merges succeed:**
```bash
git push origin "$default_branch"
```

### 4.2 Update Swarm State

- Mark merged tickets as `merged`
- Record merge commit SHAs
- Update `currentWave` to N+1

---

## Phase 5: Security Gate (per wave)

### 5.1 Post-Merge Security Review

For each merged ticket, run security review on the integrated codebase. Security reviews CAN run in parallel (they are read-only assessments on the same branch).

```
For each merged ticket (parallel):
  Spawn Agent:
    - agent: security-engineer-agent
    - prompt: [ticket context + full codebase access on merged main]
    - Include: the epic context bundle, ticket context, all prior phase reports
```

The security agent reviews against the MERGED codebase — it sees all integrated code, not just the ticket's isolated changes.

### 5.2 Handle Security Results

- **PASS:** Close ticket in Linear, add `security-approved` label, mark as `closed` in swarm state
- **FAIL:** Do NOT close. Post findings to ticket. Notify user. Ticket remains open for remediation.

---

## Phase 6: Wave Transition

### 6.1 Evaluate and Report

Count: tickets closed, blocked, pending. Report to user.

### 6.2 Update Dependency Graph

- Closed tickets → unblock dependents
- Failed tickets → dependents remain blocked

### 6.3 Plan Next Wave

Apply wave planning logic (Phase 2) to remaining tickets. Present new plan for approval.

### 6.4 Repeat

Loop back to Phase 3 for the next wave until all tickets are processed.

---

## Phase 7: Epic Completion

### 7.1 Final Status Report

Post to the epic in Linear:

```markdown
## Swarm Complete

**Epic**: [epic-id] — [title]
**Duration**: [total time]
**Waves**: N
**Tickets**: X completed, Y blocked, Z deferred

### Wave Summary
| Wave | Tickets | Status |
|------|---------|--------|
| 1 | CON-42, CON-43, CON-44 | All closed |
| 2 | CON-45, CON-46 | CON-45 closed, CON-46 security fix pending |

### Deferred Items
[List any codex-review-pending or blocked tickets]

### Next Steps
- Run `/close-epic [epic-id]` for retrofit analysis and follow-up ticket creation
```

### 7.2 Clean Up Worktrees

```bash
for dir in .claude/worktrees/*/; do
  ticket_id=$(basename "$dir")
  # Only remove worktrees for closed tickets
  git worktree remove "$dir" --force 2>/dev/null || true
done
```

Worktrees for blocked/pending tickets are preserved for manual intervention.

### 7.3 Transition to /close-epic

"All waves complete. Run `/close-epic [epic-id]` for retrofit analysis, follow-up tickets, and to clean up swarm state."

`/close-epic` deletes `.claude/swarm-state/[epic-id].json` as its final step.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SWARM_MAX_PARALLEL` | `4` | Max concurrent tickets per wave |
| `SWARM_AUTO_MERGE` | `false` | Auto-merge without user approval |
| `SWARM_BASELINE_TESTS` | `true` | Run baseline tests in each worktree before starting |
| `SWARM_CONFLICT_STRATEGY` | `stop` | Merge conflict handling: `stop` or `auto-trivial` |

---

## Parallel Dispatch Decision Criteria

**PARALLELIZE when:**
- Tickets touch completely different files/modules
- No shared state between implementations
- No data dependency (ticket B doesn't read ticket A's output)
- Independent test suites

**DO NOT PARALLELIZE when:**
- Tickets modify the same files
- One ticket's API is consumed by another
- Shared database migrations
- Shared configuration changes
- Tests depend on each other's fixtures

---

## Error Recovery

### Interrupted Swarm
- Swarm state persisted after every significant event
- Re-run `/epic-swarm [epic-id]` to detect and offer resume
- Completed phases/tickets are not re-executed
- In-progress phases restart for the current wave

### Failed Merge
- Recorded in swarm state
- User resolves manually
- Re-run swarm to continue

### Rate-Limited Codex Review
- Ticket marked `codex-review-pending`
- Proceeds to security without Codex review
- Run `/codex-review [ticket-id]` independently later

### Blocked Ticket
- Dependents automatically held
- User intervention required
- After resolution, re-run swarm to continue
