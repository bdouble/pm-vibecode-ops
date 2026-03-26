---
description: Orchestrate parallel execution of epic sub-tickets using dependency-aware wave scheduling with worktree isolation
allowed-tools: Task, Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues
argument-hint: <epic-id> [--max-parallel N] [--dry-run] [--wave N]
workflow-phase: epic-swarm
closes-ticket: false
---

# Epic Swarm Orchestrator

Execute multiple tickets from an epic concurrently using dependency-aware wave scheduling. Each ticket runs in its own git worktree with full `/execute-ticket` workflow isolation.

## Input

- `$ARGUMENTS` — Linear epic ID (e.g., `EPIC-42`) and optional flags:
  - `--max-parallel N` — Maximum concurrent tickets per wave (default: 4)
  - `--dry-run` — Show wave plan without executing
  - `--wave N` — Start from a specific wave (for manual wave-by-wave control)

---

## Phase 1: Analysis

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
  # Offer to resume
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

### 1.5 Create Swarm State File

```bash
mkdir -p .claude/swarm-state
# Ensure .claude/ is in .gitignore
git check-ignore .claude/swarm-state || echo ".claude/" >> .gitignore
```

Initialize state:
```json
{
  "epicId": "[epic-id]",
  "startedAt": "[timestamp]",
  "currentWave": 1,
  "maxParallel": 4,
  "waves": [],
  "pendingCodexReviews": [],
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

For each wave, check if any two tickets in the wave predict modifying the same file:
- If overlap detected: move the later ticket (by ID) to the next wave
- Log: "Ticket CON-46 moved to Wave 3 due to file overlap with CON-45 on src/services/auth.ts"

### 2.3 Cap Wave Size

If a wave has more tickets than `--max-parallel`:
- Keep the first N tickets (lowest IDs) in this wave
- Move remaining to a new wave at the same dependency level
- Preserve dependency ordering (don't move a ticket before its dependencies)

### 2.4 Present Wave Plan

Display the wave plan to the user:

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

**Otherwise:** Ask user to approve, adjust, or abort.

---

## Phase 3: Wave Execution (repeat per wave)

### 3.1 Pre-Wave Setup

For each ticket in the current wave:

**3.1.1 Create worktree:**
```bash
# Verify .claude/worktrees/ is gitignored
git check-ignore .claude/worktrees/ || echo ".claude/worktrees/" >> .gitignore

# Detect default branch from origin/HEAD (fallback to main)
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}

# Create worktree with ticket branch
git worktree add .claude/worktrees/[ticket-id] -b feature/[ticket-id]-[slug] "origin/$default_branch"
```

**3.1.2 Install dependencies in worktree:**
```bash
cd .claude/worktrees/[ticket-id]
# Auto-detect and install
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
- This establishes a clean baseline to distinguish new bugs from pre-existing ones

**3.1.4 Copy interface contracts** (if shared interfaces exist):
- Place contract files in each worktree that consumes them
- Contracts serve as reference during implementation

### 3.2 Parallel Dispatch

For each ticket in the wave, spawn an Agent with worktree isolation:

```
Spawn Agent with:
  - isolation: "worktree" (use the worktree created in 3.1)
  - model: [ticket's Model Override, or session default]
  - prompt: "/execute-ticket [ticket-id]"
```

Each agent:
- Runs the full execute-ticket workflow (phases 1-5.5) in its worktree
- Posts all phase reports to its own Linear ticket comments (unchanged behavior)
- Returns a structured status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)

### 3.3 Monitor Wave Progress

While agents are running:
- Check Linear ticket status periodically for phase report headers
- Watch for BLOCKED or NEEDS_CONTEXT status codes

**Handle BLOCKED:**
- Pause the blocked ticket
- Notify user with the agent's escalation diagnostic
- Other tickets in the wave continue independently

**Handle NEEDS_CONTEXT:**
- Pause the ticket
- Present the context request to user
- Resume after user provides context

### 3.4 Wave Completion Gate

All tickets in the wave must reach one of:
- **Completed through Phase 5.5** (code review + codex review done)
- **BLOCKED** (held for manual intervention or next wave)
- **codex-review-pending** (Codex rate limit hit; ticket is otherwise complete)

Once all tickets are settled, proceed to integration.

### 3.5 Post Wave Update to Linear

```
Use mcp__linear-server__create_comment on the EPIC (not individual tickets):
  body: "## Swarm Update: Wave [N] Complete\n\n
  | Ticket | Status | Notes |\n
  | CON-42 | Complete | All phases passed |\n
  | CON-43 | Complete | Codex review pending (rate limit) |\n
  | CON-44 | Blocked | Merge conflict with CON-42 on src/auth.ts |"
```

---

## Phase 4: Integration (per wave)

### 4.1 Sequential Merge

Merge tickets to the default branch one at a time, in order (fewest dependencies first, then fewest files):

For each completed ticket:

```bash
# Detect and update default branch (fallback to main)
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}
git checkout "$default_branch"
git pull origin "$default_branch"

# Merge the ticket branch
git merge feature/[ticket-id]-[slug] --no-ff -m "merge: [ticket-id] — [ticket title]"
```

**If merge conflict:**
- Check conflict strategy (`SWARM_CONFLICT_STRATEGY`):
  - `stop` (default): STOP, show the conflict files to user, ask for resolution
  - `auto-trivial`: Attempt auto-resolution for lockfiles (package-lock.json, yarn.lock) and version files. For anything else, STOP.
- Log the conflict in swarm state
- If user resolves: continue merging remaining tickets
- If user aborts: hold remaining tickets for next wave

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

After integration, update the state file:
- Mark merged tickets as `merged`
- Record merge commit SHAs
- Update `currentWave` to N+1
- Move any blocked tickets to the next wave's candidates

---

## Phase 5: Security Gate (per wave)

### 5.1 Post-Merge Security Review

For each merged ticket, run the security review on the integrated codebase:

```
Spawn Agent:
  - prompt: "/security-review [ticket-id]"
  - The agent reviews against the MERGED main branch (sees all integrated code)
```

Security reviews CAN run in parallel (they are read-only assessments on the same main branch).

### 5.2 Handle Security Results

- **PASS (no critical/high findings):**
  - Close the ticket in Linear (`state: "Done"`)
  - Add `security-approved` label
  - Mark as `closed` in swarm state

- **FAIL (critical/high findings):**
  - Do NOT close the ticket
  - Create a follow-up comment on the ticket with the findings
  - Notify user: "Ticket CON-42 failed security review. Findings: [summary]"
  - The ticket remains open for remediation (can be fixed in a later wave or manually)

---

## Phase 6: Wave Transition

### 6.1 Evaluate Wave Results

After security gate:
- Count: tickets closed, tickets blocked, tickets pending security fixes
- Report to user

### 6.2 Update Dependency Graph

- Tickets closed in this wave → unblock dependent tickets
- Tickets that failed security → their dependents remain blocked
- Refresh the remaining ticket pool

### 6.3 Plan Next Wave

If there are remaining tickets:
- Apply the same wave planning logic (Phase 2)
- Include any tickets moved from prior waves (blocked, overlap, rate-limited)
- Present new wave plan to user for approval

### 6.4 Repeat

Loop back to Phase 3 for the next wave. Continue until all tickets are processed.

---

## Phase 7: Epic Completion

When all waves are complete and all tickets are closed (or explicitly deferred):

### 7.1 Final Status Report

Post to the epic in Linear:

```
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
# Remove worktrees for completed tickets
for dir in .claude/worktrees/*/; do
  ticket_id=$(basename "$dir")
  if [[ ticket is closed ]]; then
    git worktree remove "$dir" --force
  fi
done
```

Worktrees for blocked/pending tickets are preserved for manual intervention.

### 7.3 Transition to /close-epic

Inform user: "All waves complete. Run `/close-epic [epic-id]` for retrofit analysis, follow-up tickets, and to clean up swarm state."

The `/close-epic` command will delete `.claude/swarm-state/[epic-id].json` as its final step.

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

Before placing tickets in the same wave:

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

### Interrupted Swarm (crash, compaction, user stop)
- Swarm state is persisted to disk after every significant event
- Re-run `/epic-swarm [epic-id]` to detect and offer resume
- Completed tickets are not re-executed
- In-progress tickets restart from their last completed phase (via execute-ticket's resume logic)

### Failed Merge
- The failed merge is recorded in swarm state
- User resolves the conflict manually
- Re-run the swarm to continue from the failed merge point

### Rate-Limited Codex Review
- Ticket marked as `codex-review-pending` in swarm state
- Ticket proceeds to security review without Codex review
- User can run `/codex-review [ticket-id]` independently later
- Pending reviews listed in swarm status reports

### Blocked Ticket
- Blocked ticket's dependents are automatically held
- User intervention required (escalation diagnostic provided)
- After resolution, re-run swarm to continue
