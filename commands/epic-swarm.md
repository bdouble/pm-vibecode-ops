---
description: Orchestrate parallel execution of epic sub-tickets using dependency-aware wave scheduling with worktree isolation
allowed-tools: Task, Agent, Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), WebFetch, mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
argument-hint: <epic-id> [--max-parallel N] [--dry-run] [--wave N]
workflow-phase: epic-swarm
closes-ticket: false
---

# Epic Swarm Orchestrator

Execute multiple tickets from an epic concurrently. The orchestrator (this command, running in the main Claude Code session) drives all phases directly, dispatching specialized agents in parallel across tickets within each phase. Each ticket works in its own git worktree, and all work merges to an **epic-level branch** (not main) to prevent partial deployments and enable human review before code reaches the default branch.

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
state_file=".swarm/state/[epic-id].json"
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

**If parallelization metadata is missing from any ticket:**

1. Warn the user:
   ```
   [N] tickets lack parallelization metadata from /planning.
   The swarm will analyze dependencies heuristically.
   ```

2. For each ticket without metadata, scan the description for:
   - File paths mentioned → predicted "Files Touched"
   - Other ticket IDs mentioned → potential "Depends On" / "Blocks"
   - Shared module/service names → potential file overlap indicators
   - Keywords like "after", "requires", "depends on" → dependency signals

3. Present the heuristic analysis alongside the wave plan (Section 2.4):
   ```
   Heuristic Dependency Analysis (tickets lacked /planning metadata)

   | Ticket | Predicted Files | Predicted Dependencies | Confidence |
   |--------|----------------|----------------------|------------|
   | CON-42 | src/routes/profile.ts, ... | None | Medium |
   | CON-43 | src/pages/settings.tsx, ... | None | Medium |

   Are these groupings correct? [Yes / Adjust / Run /planning first]
   ```

4. WAIT for user confirmation before proceeding with the heuristic plan.

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

Write ALL gathered context to `.swarm/context/{epic-id}/epic-context.md`:

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

**Also write per-ticket context files** to `.swarm/context/{epic-id}/{ticket-id}.md`:

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

**Token Budget Strategy (when full verbatim inclusion is impractical):**

If the total context bundle for a ticket exceeds practical limits:

1. **Always include in full (non-negotiable):**
   - Ticket descriptions and acceptance criteria
   - Prescriptive documents (requirements, specs, schemas, interface definitions)
   - Interface contracts
   - Prior phase reports for this ticket

2. **Truncate with pointers (contextual documents only):**
   - Include a `TRUNCATED` notice with the full file path
   - Include the first 5000 tokens + the last 2000 tokens
   - Include the instruction: "Read the full document at [path] before implementing"

3. **Report to user:**
   ```
   Context bundle for [ticket-id] is [size] tokens.
   [N] contextual documents were truncated. Prescriptive documents included in full.
   Review .swarm/context/[epic-id]/[ticket-id].md to verify critical content.
   ```

The distinction: prescriptive documents contain specific implementable items (IDs, schemas, field names). Contextual documents provide background. When budget is tight, prescriptive content is never sacrificed.

Ensure `.swarm/` is gitignored:
```bash
git check-ignore .swarm/ || echo ".swarm/" >> .gitignore
```

### 1.6 Create Epic Branch

All ticket work merges to an epic-level branch — never directly to the default branch. This prevents partially completed epics from triggering staging deployments and gives the team a single PR to review when the epic is complete.

```bash
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}

epic_branch="epic/[epic-id]"

git fetch origin
git checkout -b "$epic_branch" "origin/$default_branch"
git push -u origin "$epic_branch"
```

If the epic branch already exists (e.g., resuming a swarm):
```bash
if git branch -a | grep -q "remotes/origin/$epic_branch"; then
  git checkout "$epic_branch"
  git pull origin "$epic_branch"
fi
```

Return to the project root after branch setup — worktrees are created from this branch in Phase 3.

### 1.7 Create Swarm State File

```bash
mkdir -p .swarm/state
git check-ignore .swarm/ || echo ".swarm/" >> .gitignore
```

Initialize state:
```json
{
  "epicId": "[epic-id]",
  "epicBranch": "epic/[epic-id]",
  "startedAt": "[timestamp]",
  "currentWave": 1,
  "currentPhase": "adaptation",
  "waves": [],
  "pendingCodexReviews": [],
  "contextBundlePath": ".swarm/context/[epic-id]/",
  "config": {
    "maxParallel": 4,
    "autoMerge": false,
    "parallelWrites": false,
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
  └─ Integration: merge all worktrees to epic branch (NOT main)
```

This preserves ticket-level parallelism (N tickets run concurrently) while using the same specialized agents as `/execute-ticket`. Phases are synchronized across the wave — all tickets complete adaptation before any starts implementation. This ensures interface contracts and shared decisions propagate correctly. All merges target the **epic branch** (`epic/[epic-id]`), not the default branch — preventing partial deployments to staging and enabling a single human-reviewed PR when the epic is complete.

### 3.1 Pre-Wave Setup

For each ticket in the current wave:

**3.1.1 Create worktree:**
```bash
git check-ignore .swarm/ || echo ".swarm/" >> .gitignore

epic_branch="epic/[epic-id]"

# Worktrees branch from the epic branch, not from main
git worktree add .swarm/worktrees/[ticket-id] -b feature/[ticket-id]-[slug] "$epic_branch"
```

**3.1.2 Install dependencies:**
```bash
cd .swarm/worktrees/[ticket-id]
[ -f package.json ] && npm ci
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f Cargo.toml ] && cargo build
[ -f go.mod ] && go mod download
```

**3.1.3 Run baseline tests (BLOCKING):**

For each worktree, run the project's test suite and WAIT for results. Do NOT proceed to Phase 3.2 until ALL worktrees have passing baseline tests.

```bash
cd .swarm/worktrees/[ticket-id]
npm test  # or appropriate test command detected from package.json / Makefile
```

If any worktree's baseline tests fail:
  - Report the failure with test output to the user
  - Present options:
    1. Fix the issue and re-run baseline tests
    2. Proceed anyway (baseline was already failing — not caused by this work)
    3. Abort the swarm
  - WAIT for user decision

Do NOT start baseline tests in the background and "check later." Baseline verification is a blocking prerequisite for wave execution.

**3.1.4 Copy context bundles into worktrees:**
```bash
# Copy epic context bundle and ticket-specific context into each worktree
cp .swarm/context/[epic-id]/epic-context.md .swarm/worktrees/[ticket-id]/.epic-context.md
cp .swarm/context/[epic-id]/[ticket-id].md .swarm/worktrees/[ticket-id]/.ticket-context.md
```

Also copy interface contracts if shared interfaces exist.

### 3.2.0 Update Ticket Status to In Progress

Before dispatching any agents, update each ticket's Linear status to "In Progress":

```
For each ticket in the current wave:
  Use mcp__linear-server__update_issue:
    - issue_id: [ticket-id]
    - state: "In Progress"
```

Skip if the ticket is already "In Progress" or a later state. This ensures ticket status accurately reflects that work has begun, matching the behavior of `/execute-ticket` Step 1.4.

### 3.2 Phase-by-Phase Parallel Dispatch

For each workflow phase, dispatch agents in parallel across all tickets in the wave. The orchestrator builds each agent's prompt with full context.

**The phase sequence:**

| Phase | Agent | Dispatch | Blocking |
|-------|-------|----------|----------|
| Adaptation | `architect-agent` | PARALLEL (read-only) | BLOCKED → pause ticket |
| Implementation | `backend-engineer-agent` or `frontend-engineer-agent` | SEQUENTIAL | BLOCKED or AC failure → pause ticket |
| Testing | `qa-engineer-agent` | SEQUENTIAL | BLOCKED or gate failure → pause ticket |
| Documentation | `technical-writer-agent` | SEQUENTIAL | BLOCKED → pause ticket |
| Code Review | `code-reviewer-agent` | PARALLEL (read-only) | CHANGES_REQUESTED → pause ticket |
| Codex Review | *(MCP tool, not agent)* | SEQUENTIAL (explicit project_dir) | Rate limit → queue, continue |
| Security Scan (Pre-Merge) | `security-engineer-agent` | PARALLEL (read-only) | CRITICAL/HIGH findings → pause ticket |

**Dispatch modes:**
- **SEQUENTIAL**: The orchestrator processes one ticket at a time — `cd` to the ticket's worktree, dispatch agent, wait for completion, verify integrity, then move to the next ticket. Default for all write phases.
- **PARALLEL**: All agents for the wave are dispatched simultaneously. Used only for read-only phases where agents do not modify files.
- If `SWARM_PARALLEL_WRITES=true` in config, all phases use PARALLEL dispatch. This is an opt-in escape hatch for experienced users who have verified parallel writes work in their environment. Default is `false`.

**Phase Skip Policy:**

The orchestrator MUST NOT skip any phase autonomously. If the orchestrator determines a phase may be unnecessary (e.g., implementation agent already created documentation artifacts), it MUST:

1. Present the skip rationale to the user:
   ```
   Phase: Documentation
   Rationale: Implementation agent created docs at [paths].
   Recommend: Skip documentation phase (technical-writer-agent verification).

   Options:
   1. Skip this phase (accept implementation-generated docs)
   2. Run the phase anyway (recommended — verifies completeness)
   ```
2. WAIT for user approval before skipping.
3. If user approves skip, log it in swarm state as `skipped_by_user`.

When in doubt, run the phase — a redundant pass costs minutes; a missing pass costs user trust.

**Pre-Merge vs Post-Merge Security:**

| Aspect | Phase 3: Security Scan | Phase 5: Security Review |
|--------|----------------------|------------------------|
| Timing | Per-ticket, in worktree | Post-merge, on epic branch |
| Scope | Only this ticket's changed files | Full integrated epic branch |
| Purpose | Catch per-ticket vulnerabilities | Catch cross-ticket security issues |
| Dispatch | PARALLEL (read-only) | PARALLEL (read-only) |
| Blocking | CRITICAL/HIGH → pause ticket | CRITICAL/HIGH → pause, do not close |

Both reviews are required. The pre-merge scan catches obvious issues early. The post-merge review catches integration-level problems (cross-ticket auth weakening, combined data flow vulnerabilities, trust boundary violations that only manifest when multiple tickets are merged).

**For each phase, for each ticket in the wave:**

#### 3.2.1 Build the agent prompt

**IMPLEMENTATION PHASE: Agent Selection Logic**

For the Implementation phase, select the correct engineer agent for each ticket. The swarm must use the same selection logic as `/execute-ticket` Step 3.2:

1. **Primary (from ticket metadata):**
   - Check ticket labels for: `backend`, `frontend`, `fullstack`, or `agent-type:*`
   - If `backend` or `agent-type:backend` → `backend-engineer-agent`
   - If `frontend` or `agent-type:frontend` → `frontend-engineer-agent`
   - If `fullstack` → both agents sequentially (backend first, then frontend)

2. **Fallback (if no label found):**
   - Scan ticket description for keywords:
     - `API`, `REST`, `database`, `server`, `endpoint`, `backend`, `migration` → `backend-engineer-agent`
     - `UI`, `React`, `Vue`, `component`, `page`, `frontend`, `CSS`, `layout` → `frontend-engineer-agent`
   - If both categories present → default to `backend-engineer-agent`

3. **If still unclear:** Default to `backend-engineer-agent`. Unlike single-ticket mode, the swarm does not pause for user input on agent selection — it defaults silently to avoid blocking the wave. Log the selection rationale in the swarm state for user review.

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

7. **Working directory enforcement (CRITICAL):**
   Include these exact instructions at the TOP of the agent prompt, before any other content:

   ```
   WORKING DIRECTORY: /absolute/path/to/.swarm/worktrees/[ticket-id]

   You MUST operate exclusively within this directory:
   - Use ABSOLUTE paths for ALL file operations, prefixed with the path above
   - Before creating or modifying ANY file, verify the path starts with
     /absolute/path/to/.swarm/worktrees/[ticket-id]/
   - Do NOT use relative paths from the repo root
   - Do NOT write to any directory outside your assigned worktree
   - If you find yourself writing to a path that does not start with your
     assigned worktree, STOP and correct immediately
   ```

   Replace `/absolute/path/to/.swarm/worktrees/[ticket-id]` with the actual resolved absolute path for each ticket.

8. **Explicit file scope (for read-only phases: Code Review, Security Scan):**
   Include an explicit file manifest generated from git diff so the agent knows exactly which files to review:

   ```bash
   cd .swarm/worktrees/[ticket-id]
   git diff --name-only epic/[epic-id]...HEAD
   ```

   Include in the agent prompt:
   ```
   ## Review Scope

   Review ONLY the following files in /absolute/path/to/.swarm/worktrees/[ticket-id]/:

   [list of files from git diff]

   These are the files changed by ticket [ticket-id]. Do NOT review files
   from other worktrees or the main repository.
   ```

**DO NOT:**
- Summarize or condense any context — pass it verbatim
- Omit "long" documents to save tokens — missing context produces wrong implementations
- Assume the agent "already knows" something — each agent is a fresh session with no memory
- Skip the instruction to read context files — agents will not read them unprompted

#### 3.2.2 Dispatch agents

Dispatch mode depends on the phase (see Dispatch column in the phase table above). The orchestrator MUST check the Dispatch column before every phase and use the correct mode.

**Mode A — SEQUENTIAL (Implementation, Testing, Documentation):**

```
For each ticket in the wave (one at a time):
  1. cd to /absolute/path/to/.swarm/worktrees/[ticket-id]
  2. Spawn Agent with:
     - The agent definition matching this phase
     - model: [ticket's Model Override, or session default]
     - The full prompt built in 3.2.1 (including working directory enforcement)
  3. Wait for agent to complete
  4. Run worktree integrity verification (Section 3.2.3)
  5. Process results (Section 3.2.4)
  6. cd back to project root
  7. Proceed to next ticket
```

Sequential dispatch guarantees worktree isolation by ensuring only one write-phase agent runs at a time, with the orchestrator's cwd set to the correct worktree.

**Mode B — PARALLEL (Adaptation, Code Review, Security Scan):**

```
For all tickets in the wave (simultaneously):
  1. Spawn all agents with:
     - The agent definition matching this phase
     - model: [ticket's Model Override, or session default]
     - The full prompt built in 3.2.1 (including working directory enforcement)
  2. Wait for ALL agents to return
  3. Run worktree integrity verification for EACH ticket (Section 3.2.3)
  4. Process results for each ticket (Section 3.2.4)
```

Parallel dispatch is safe for read-only phases because agents only read files and produce reports — they do not create or modify files in the worktree.

**If `SWARM_PARALLEL_WRITES=true`:** All phases use Mode B. The orchestrator still runs worktree integrity verification after every dispatch. If verification detects contamination, the orchestrator falls back to Mode A for the remainder of the wave and reports the incident.

#### 3.2.3 Worktree Integrity Verification (MANDATORY after every agent dispatch)

After each agent returns (whether sequential or parallel), verify that file changes landed in the correct worktree BEFORE processing results or advancing to the next phase.

For each ticket that just had an agent dispatched:

1. **Check target worktree:**
   ```bash
   cd .swarm/worktrees/[ticket-id]
   git status --short
   ```
   Verify that changed files are relevant to THIS ticket (match against the ticket's predicted files from the adaptation report or description).

2. **Check OTHER worktrees for contamination:**
   ```bash
   for dir in .swarm/worktrees/*/; do
     other_id=$(basename "$dir")
     if [ "$other_id" != "[ticket-id]" ]; then
       cd "$dir"
       unexpected=$(git status --short)
       if [ -n "$unexpected" ]; then
         echo "CONTAMINATION: $other_id has unexpected changes: $unexpected"
       fi
     fi
   done
   ```

3. **Check project root for stray files:**
   ```bash
   cd [project-root]
   git status --short
   ```
   If ANY files were modified in the project root that belong to a ticket's scope, contamination has occurred.

4. **If contamination detected:**
   - STOP the wave immediately
   - Report the cross-contamination with specific file lists per worktree
   - Do NOT proceed to the next phase or the next ticket
   - Present options to the user:
     1. Manually separate the files and continue
     2. Re-run the phase for affected tickets in sequential mode
     3. Abort the wave

5. **If no contamination:** Proceed to scope relevance verification (step 6)

6. **Scope relevance verification (write phases only):**

   After confirming no cross-worktree contamination, verify that file changes are relevant to the ticket's scope. This mirrors `/execute-ticket` Step 3.3.1:

   ```bash
   cd .swarm/worktrees/[ticket-id]
   changed_files=$(git status --short | awk '{print $2}')
   ```

   Compare the list of changed files against the ticket's predicted files (from the adaptation report's "Target Files" section or from the ticket description's "Files Touched" metadata).

   If files outside the predicted scope were modified:
   - This is not necessarily wrong (agents may discover needed changes during implementation)
   - Flag for awareness but do NOT block:
     ```
     Agent modified files outside predicted scope for [ticket-id]:
     Predicted: [list from adaptation]
     Actual: [list from git status]
     Additional: [files not in predicted list]
     ```
   - Continue unless files look clearly wrong (e.g., test files in an implementation phase, config files unrelated to the ticket)

7. **If all checks pass:** Proceed to results processing (3.2.4)

**Note:** For read-only phases (Adaptation, Code Review, Security Scan), the contamination check is a lightweight verification — read-only agents should not produce file changes. If file changes ARE detected after a read-only phase dispatch, this is itself a bug and should be reported. Skip scope relevance verification for read-only phases.

#### 3.2.4 Process Results — Full Post-Phase Pipeline

For each returned agent, execute the following steps IN ORDER. This pipeline mirrors `/execute-ticket` Steps 3.4 through 3.6 to ensure every ticket receives the same post-processing regardless of whether it runs standalone or within a swarm.

##### 3.2.4.1 Parse Status Code

Parse the agent's structured report for:

- **Status:** DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED (accept legacy COMPLETE / ISSUES_FOUND)
- **Summary:** Brief description of work done
- **Files Changed** / **Files Reviewed:** List of affected files

**Handle BLOCKED or NEEDS_CONTEXT:**
- Pause ONLY the blocked ticket (other tickets continue through remaining phases)
- Notify user with the agent's escalation diagnostic
- Blocked ticket can be resumed in a later wave or manually
- **Do NOT post the report to Linear** — the blocking status must be resolved first

**Handle DONE_WITH_CONCERNS:**
- Include concerns in subsequent phase prompts for this ticket
- Continue through remaining pipeline steps

##### 3.2.4.2 Validate Report Structure

Before posting to Linear, validate the agent report contains required fields. This mirrors `/execute-ticket` Step 3.4.1.

**Required fields by phase:**

| Phase | Required Fields |
|-------|-----------------|
| Adaptation | `Status:`, `Summary:`, `Target Files` or `Files to Modify` |
| Implementation | `Status:`, `Summary:`, `Files Changed:` |
| Testing | `Status:`, `Gate #0`, `Gate #1`, `Gate #2`, `Gate #3` results |
| Documentation | `Status:`, `Summary:`, `Documentation Updated` or `Docs Created` |
| Code Review | Always: `Review Status:`, `Requirements Checklist`, `Files Reviewed:`. If `Pass 1 Result: PASS`, also require `Best Practices Assessment` and `SOLID/DRY Assessment`. |
| Security Scan | `Status:`, `Security Checklist` or findings list |

**Validation algorithm:**
```
For each required field for current phase:
  1. Check field header exists in report (case-insensitive)
  2. Check field has non-empty content after the header

If ANY required field is missing or empty:
  - DO NOT post to Linear
  - Log: "Report validation failed for [ticket-id]: missing [field-name]"
  - Auto-retry phase ONCE with enhanced prompt requesting the missing fields
  - If retry also fails validation: PAUSE ticket for user decision
    Options: [Retry] [Review Raw Output] [Skip Phase] [Continue Anyway]
```

**Codereview conditional validation:**
- If report contains `Pass 1 Result: FAIL`, treat "Pass 2 skipped" as valid — do NOT require Pass 2 sections.
- If report contains `Pass 1 Result: PASS` (or does not specify), require both `Best Practices Assessment` and `SOLID/DRY Assessment`.

##### 3.2.4.3 Verify Implementation Artifacts (Implementation Phase Only)

After the implementation agent reports DONE, verify that file changes actually exist. This mirrors `/execute-ticket` Step 3.6.0.

```bash
cd .swarm/worktrees/[ticket-id]
changes=$(git status --porcelain | wc -l)
```

```
IF changes == 0 AND report.Status is one of ["DONE", "DONE_WITH_CONCERNS", "COMPLETE"]:
  - Log warning: "Implementation reported completion but no file changes detected for [ticket-id]"
  - Check for unstaged changes: git diff --name-only
  - If still no changes: PAUSE ticket for user decision
    Options: [Retry Implementation] [Review Manually] [Mark as No-Op and Continue]
```

If changes exist, proceed to AC verification.

##### 3.2.4.4 Verify Acceptance Criteria (Implementation Phase Only)

After confirming file changes exist, verify that acceptance criteria are actually met. This mirrors `/execute-ticket` Step 3.4.2.

**Step 1: Parse AC into verification targets**

Extract each acceptance criterion from the ticket context file and classify:
- **STRUCTURAL AC** (imports, exports, file creation, pattern removal) → verify with grep/glob
- **BEHAVIORAL AC** (data flows, error handling, parameter forwarding) → verify by tracing source code
- **REMOVAL AC** (no legacy code, no banned patterns) → verify with grep expecting zero matches

**Step 2: Generate and run verification commands**

For each STRUCTURAL and REMOVAL AC, generate a verification command and run it in the ticket's worktree:

```bash
cd .swarm/worktrees/[ticket-id]
# Example: AC "All renderers import from schema files"
grep -rn "import.*from.*schema" [renderer-dir] | wc -l
# Expect: count >= [number of renderers]
```

For each BEHAVIORAL AC, trace the data flow through source code in the worktree.

**Step 3: Compare results against agent claims**

```
IF any AC fails verification:
  - DO NOT post the report to Linear
  - DO NOT advance to the next phase
  - PAUSE ticket with specific evidence:

    AC VERIFICATION FAILED — [ticket-id]

    The implementation agent reported COMPLETE, but the following
    acceptance criteria could not be verified:

    | AC | Agent Claim | Verification Result |
    |----|-------------|---------------------|
    | [AC text] | [what agent reported] | [actual check output] |

    Options:
    1. Send verification failures back to implementation agent for correction
    2. Continue anyway (manual verification later)
    3. Pause ticket for manual intervention

IF all AC pass verification:
  - Proceed to next pipeline step
  - Include verification results in the Linear comment
```

##### 3.2.4.5 Verify Referenced Document Conformance (Implementation Phase Only)

If the epic context bundle or ticket context file classified any referenced documents as **prescriptive** (contains specific IDs, schemas, field names, interface definitions), verify that the implementation matches those specifications. This mirrors `/execute-ticket` Step 3.4.3.

For each prescriptive document's conformance checklist:

1. **Extract verifiable specifications:** Named items, specific values, enumerated lists, interface fields
2. **Generate verification queries** in the ticket's worktree:
   ```bash
   cd .swarm/worktrees/[ticket-id]
   grep -rn '"[item-name]"\|[item-name]' [target-file-or-directory]
   ```
3. **Report results:**
   - If all specifications match: include brief confirmation in Linear comment
   - If divergences exist: PAUSE ticket with detailed comparison table

##### 3.2.4.6 Validate Deferred Items Against AC (All Phases)

Before posting the report, scan the agent's Deferred Items table for items that match acceptance criteria. This mirrors `/execute-ticket` Step 3.6.1a and is the critical mechanism that prevents agents from silently dropping AC requirements.

1. **Extract** all items from the agent's Deferred Items table (if present)
2. **For each item**, check if it matches an acceptance criterion:
   - Fuzzy match on key terms: file names, function names, component names, patterns mentioned in AC
   - Check if the deferred item's description overlaps with any AC text
3. **If a match is found:**
   - Reclassify the item as `AC-DEFERRED`
   - DO NOT advance to the next phase
   - PAUSE ticket:
     ```
     ACCEPTANCE CRITERION DEFERRED — [ticket-id]

     The agent deferred an item that matches an acceptance criterion:

     AC: "[acceptance criterion text]"
     Deferred Item: "[item description]"
     Agent Reason: "[agent's stated reason for deferral]"

     Options:
     1. Accept deferral and continue (AC will not be fulfilled)
     2. Send back to agent for implementation
     3. Modify AC to reflect reduced scope
     ```
   - Wait for user decision
4. **If no matches found:** Proceed to posting

**This validation runs for ALL phases**, not just implementation. Code review and testing agents can also improperly defer items that match AC.

##### 3.2.4.7 Post Phase Report to Linear

After all validations pass, post the agent's full structured report as a comment on the ticket. This is the **critical step** that was previously missing — it creates the per-phase audit trail that `/close-epic` depends on for extracting deferred and declined items.

```
Use mcp__linear-server__create_comment:
  - issue_id: [ticket-id]
  - body: [formatted report — see format below]
```

**Comment format (must match `/execute-ticket` format for `/close-epic` compatibility):**

```markdown
## [Phase Name] Report

[Agent's full structured report — verbatim, unmodified]

---
*Automated by /epic-swarm — Wave [N]*
```

**Phase Name mapping:**

| Phase | Report Header |
|-------|---------------|
| Adaptation | `## Adaptation Report` |
| Implementation | `## Implementation Report` |
| Testing | `## Testing Report` |
| Documentation | `## Documentation Report` |
| Code Review | `## Code Review Report` |
| Codex Review | `## Cross-Model Review Report` |
| Security Scan (Pre-Merge) | `## Security Scan Report (Pre-Merge)` |

**CRITICAL:** The report headers MUST match the patterns that `/execute-ticket` Step 2 uses for resume detection and that `/close-epic` uses for extracting deferred items. Using different headers will break downstream workflows.

##### 3.2.4.8 Add Quality Labels (Phase-Specific)

After posting the report, add the appropriate quality label to the ticket in Linear. These labels match what the individual workflow commands add:

| Phase | Condition | Label |
|-------|-----------|-------|
| Testing | All gates (0-3) PASS | `tests-complete` |
| Documentation | Report posted successfully | `docs-complete` |
| Code Review | Review Status: APPROVED | `code-reviewed` |

```
Use mcp__linear-server__update_issue:
  - issue_id: [ticket-id]
  - labelNames: [add the appropriate label]
```

Labels for security phases are handled in Phase 5.2 (post-merge security review), not here.

##### 3.2.4.9 Commit Changes (Implementation Phase Only)

After posting the implementation report to Linear, commit all changes in the ticket's worktree. This mirrors `/execute-ticket` Step 3.6.1 (worktree-mode steps 1-2 only — no push, no PR).

```bash
cd .swarm/worktrees/[ticket-id]
git add -A
git commit -m "feat([ticket-id]): [ticket-title]

[First sentence of implementation summary from agent report]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

Do NOT push or create PRs — the swarm handles merge during Phase 4 (Integration).

Subsequent phases (testing, documentation, code review) will make additional file changes in the worktree. These accumulate as uncommitted changes and are committed as part of Phase 3.2.5 post-processing or during Phase 4 integration.

##### 3.2.4.10 Update Swarm State

Update `.swarm/state/[epic-id].json` with:
- Phase completion status for this ticket
- Whether the report was posted to Linear (true/false)
- Any quality labels added
- Any deferred items found (with classification)

See State Persistence Protocol below for the full state schema.

#### 3.2.5 Phase-specific post-processing

The following post-processing runs AFTER the Section 3.2.4 pipeline completes for each phase. These are additional phase-specific steps beyond the standard pipeline.

**After Adaptation phase:**
- Update the ticket-specific context file (`.swarm/context/[epic-id]/[ticket-id].md`) with:
  - Adaptation decisions (target files, approach, trade-offs)
  - Service reuse mandates identified
  - Deferred/descoped items from adaptation
- These updates ensure subsequent phases have full context

**After Implementation phase:**
- The 3.2.4 pipeline already handles: artifact verification (3.2.4.3), AC verification (3.2.4.4), document conformance (3.2.4.5), commit (3.2.4.9)
- Additionally:
  - Update the ticket-specific context file with implementation details (files changed, patterns used, integration points)
  - Commit any remaining uncommitted changes after tests/docs/review phases add their artifacts

**After Testing phase:**
- If any Gate FAILS (especially Gate #0 — existing test remediation): ticket is PAUSED by the 3.2.4 pipeline
- After testing completes successfully, commit test files:
  ```bash
  cd .swarm/worktrees/[ticket-id]
  git add -A
  git commit -m "test([ticket-id]): add test suite

  [Brief summary of test coverage from agent report]

  Linear: [ticket-id]
  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

**After Documentation phase:**
- Commit documentation changes:
  ```bash
  cd .swarm/worktrees/[ticket-id]
  git add -A
  git commit -m "docs([ticket-id]): add documentation

  [Brief summary from agent report]

  Linear: [ticket-id]
  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

**After Code Review phase:**
- If CHANGES_REQUESTED: pause ticket, present requested changes to user
- If DONE with over-building/under-building flags: pause for user decision
- If code review agent made fixes (e.g., linting, formatting), commit them:
  ```bash
  cd .swarm/worktrees/[ticket-id]
  git add -A
  git commit -m "refactor([ticket-id]): apply code review fixes

  Linear: [ticket-id]
  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

**After Security Scan (Pre-Merge) phase:**
- If CRITICAL/HIGH findings: pause ticket (handled by 3.2.4 pipeline)
- If PASS: ticket proceeds to Codex Review (3.3) and then Integration (Phase 4)

**After all phases complete for a ticket:**
- Ensure all changes are committed in the ticket's worktree
- Push the feature branch:
  ```bash
  cd .swarm/worktrees/[ticket-id]
  git push origin feature/[ticket-id]-[slug]
  ```

#### State Persistence Protocol

After EVERY significant event, update `.swarm/state/[epic-id].json`:

**Events that trigger state update:**
- Phase starts for a ticket
- Phase completes for a ticket (any status)
- Ticket pauses (BLOCKED/NEEDS_CONTEXT)
- Wave completes
- Merge succeeds or fails
- Error occurs

**State schema (per-ticket tracking):**
```json
{
  "epicId": "[epic-id]",
  "epicBranch": "epic/[epic-id]",
  "startedAt": "[timestamp]",
  "lastUpdated": "[timestamp]",
  "currentWave": 1,
  "currentPhase": "implementation",
  "tickets": {
    "[ticket-id]": {
      "wave": 1,
      "status": "in_progress",
      "currentPhase": "implementation",
      "phases": {
        "adaptation": {
          "status": "DONE",
          "completedAt": "[timestamp]",
          "dispatch": "parallel"
        },
        "implementation": {
          "status": "in_progress",
          "startedAt": "[timestamp]"
        }
      },
      "worktreePath": ".swarm/worktrees/[ticket-id]",
      "branchName": "feature/[ticket-id]-[slug]",
      "mergeCommit": null,
      "codexReview": null
    }
  },
  "config": {
    "maxParallel": 4,
    "autoMerge": false,
    "parallelWrites": false,
    "conflictStrategy": "stop"
  }
}
```

Write the state file IMMEDIATELY after each event. This is the persistence mechanism that enables resume — if it is not current, resume will re-execute completed work or miss blocked tickets.

### 3.3 Codex Review Phase

The Codex review runs differently from agent phases — it uses MCP tools, not agent dispatch.

For each ticket that completed code review:

```
Call mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [absolute path to ticket's worktree]
  - base_branch: [the worktree's base branch]
  - context: [ticket description + AC summary]
```

**Track the outcome for each ticket:**
- **Success:** Post Codex review report to Linear. Commit any fixes.
- **MCP server not available:** Mark ticket as `codex-review-skipped` with reason `server_unavailable`. Post to Linear: "Cross-model review skipped — Codex MCP server not configured."
- **Rate limited:** Retry once (60s). If still limited, mark as `codex-review-skipped` with reason `rate_limit`. Post to Linear: "Cross-model review deferred — rate limit reached."
- **Error (auth, timeout, other):** Mark as `codex-review-skipped` with reason from error. Post to Linear: "Cross-model review failed — [error message]."

In ALL skip/failure cases, the ticket continues to security review. Codex review is valuable but never a hard gate.

### 3.4 Wave Completion Gate

All tickets in the wave must reach one of:
- **All phases complete** (including Codex review)
- **All phases complete except Codex** (codex-review-skipped — ticket still proceeds)
- **BLOCKED** (held for manual intervention)

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

### 4.0 Integration Approval Gate

Before merging ANY branches, present the integration plan to the user and WAIT for explicit approval:

```
## Ready to Merge

Merging [N] branches to epic branch (epic/[epic-id]):

| Order | Branch | Ticket | Files Changed | Test Status |
|-------|--------|--------|---------------|-------------|
| 1 | feature/PRO-304-... | PRO-304 | 12 files | Passing |
| 2 | feature/PRO-305-... | PRO-305 | 8 files | Passing |

Target: epic/[epic-id] (NOT main — main is untouched until epic PR)
Merge strategy: --no-ff (sequential, one at a time)
Integration tests will run after each merge.
Push epic branch to remote after all merges succeed.

Proceed? [Yes / No / Review branches first]
```

**WAIT for user approval before proceeding.**

- If `SWARM_AUTO_MERGE=true`: skip this gate and merge automatically.
- If `SWARM_AUTO_MERGE=false` (default): this gate is MANDATORY.
- Do NOT interpret the absence of `--dry-run` as approval to merge.

### 4.1 Sequential Merge

Merge tickets to the **epic branch** one at a time (fewest dependencies first, then fewest files):

```bash
epic_branch="epic/[epic-id]"
git checkout "$epic_branch"
git pull origin "$epic_branch"

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

**Push epic branch after all wave merges succeed:**

**Before pushing (if `SWARM_AUTO_MERGE=false`):**
```
All [N] merges succeeded. Integration tests passing.

Push to origin/epic/[epic-id]? [Yes / No]
```
WAIT for user approval.

```bash
git push origin "$epic_branch"
```

### 4.2 Update Swarm State

- Mark merged tickets as `merged`
- Record merge commit SHAs
- Update `currentWave` to N+1

---

## Phase 5: Security Gate (per wave)

### 5.1 Post-Merge Security Review (Comprehensive)

This is the COMPREHENSIVE security review on the integrated epic branch. It runs AFTER all wave merges to the epic branch succeed. Unlike the per-ticket security scan in Phase 3 (which reviews isolated ticket changes in worktrees), this review:

- Sees ALL merged code from the wave together on the epic branch
- Checks cross-ticket auth and trust boundary interactions
- Validates that combined data flows don't introduce new vulnerabilities
- Reviews integration test results for security implications

Include ALL prior security scan reports (from Phase 3) in the agent prompt so it can focus on integration-level concerns rather than re-checking per-ticket issues.

For each merged ticket, run security review on the integrated epic branch. Security reviews CAN run in parallel (they are read-only assessments on the same branch).

```
For each merged ticket (parallel):
  Spawn Agent:
    - agent: security-engineer-agent
    - prompt: [ticket context + full codebase access on epic branch (epic/[epic-id])]
    - Include: the epic context bundle, ticket context, all prior phase reports
```

The security agent reviews against the epic branch — it sees all integrated code from this epic, not just the ticket's isolated changes.

### 5.2 Handle Security Results and Close Tickets

**Before closing any tickets (if `SWARM_AUTO_MERGE=false`):**
Present the list of tickets to close and await approval:
```
Security review passed for [N] tickets. Ready to close:

| Ticket | Pre-Merge Scan | Post-Merge Review | Codex Review |
|--------|---------------|-------------------|--------------|
| CON-42 | PASS | PASS | Completed |
| CON-43 | PASS | PASS | Skipped (rate limit) |

Close these tickets in Linear? [Yes / No / Review individually]
```
WAIT for user approval. If `SWARM_AUTO_MERGE=true`, skip this gate.

**For each ticket that PASSES (and user approves):**

1. **Post the security review report to the ticket:**
   ```
   Use mcp__linear-server__create_comment:
     - issue_id: [ticket-id]
     - body: "## Security Review Report\n\n[Full security agent report]\n\n---\n*Automated by /epic-swarm — Post-Merge Security Review*"
   ```

2. **Add security-approved label:**
   ```
   Use mcp__linear-server__update_issue:
     - issue_id: [ticket-id]
     - labelNames: [add "security-approved"]
   ```

3. **Close the ticket — update status to Done:**
   ```
   Use mcp__linear-server__update_issue:
     - issue_id: [ticket-id]
     - state: "Done"
   ```
   This is the **final gate**. Only the post-merge security review closes tickets, matching the behavior of `/security-review` (the only individual command with `closes-ticket: true`).

4. **Update swarm state:** Mark ticket as `closed` with timestamp

**For each ticket that FAILS:**

1. **Post the security findings to the ticket:**
   ```
   Use mcp__linear-server__create_comment:
     - issue_id: [ticket-id]
     - body: "## Security Review Report\n\nStatus: BLOCKED\n\n[Full security findings]\n\n---\n*Automated by /epic-swarm — Post-Merge Security Review*"
   ```

2. **Add security-blocked label:**
   ```
   Use mcp__linear-server__update_issue:
     - issue_id: [ticket-id]
     - labelNames: [add "security-blocked"]
   ```

3. **Keep status as "In Progress"** — do NOT close the ticket
4. **Notify user** with the specific CRITICAL/HIGH findings
5. **Update swarm state:** Mark ticket as `security-blocked`

Ticket remains open for remediation. User can fix issues and re-run security review independently.

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
**Epic Branch**: epic/[epic-id]
**Duration**: [total time]
**Waves**: N
**Tickets**: X completed, Y blocked, Z deferred

### Wave Summary
| Wave | Tickets | Status |
|------|---------|--------|
| 1 | CON-42, CON-43, CON-44 | All closed |
| 2 | CON-45, CON-46 | CON-45 closed, CON-46 security fix pending |

### Cross-Model Review Status
| Ticket | Codex Review | Reason |
|--------|-------------|--------|
| CON-42 | Completed | 3 findings auto-fixed |
| CON-43 | Skipped | Codex MCP server not configured |
| CON-44 | Skipped | Rate limit reached |
| CON-45 | Completed | No findings |
| CON-46 | Failed | Authentication expired |

[If ALL tickets completed Codex review successfully, replace this table with: "All tickets received cross-model Codex review."]
[If ANY tickets were skipped/failed, include this table so the user knows which tickets lack cross-model review coverage and can run `/codex-review [ticket-id]` independently.]

### Deferred Items
[List any blocked tickets and their blocking reasons]

### Next Steps
- **Review and merge the epic PR** — all work is on branch `epic/[epic-id]`, ready for human review
- Run `/close-epic [epic-id]` for retrofit analysis and follow-up ticket creation
- [If Codex reviews were skipped] Run `/codex-review [ticket-id]` for tickets missing cross-model review
```

### 7.2 Create Epic PR

Create a pull request from the epic branch to the default branch. This is the **single point of human review** for all work in the epic — no code reaches the default branch until this PR is approved and merged.

```bash
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}
epic_branch="epic/[epic-id]"

gh pr create \
  --base "$default_branch" \
  --head "$epic_branch" \
  --title "Epic: [epic-id] — [epic title]" \
  --body "## Epic Summary

[epic description summary]

## Tickets Included
| Ticket | Title | Status |
|--------|-------|--------|
[table of all tickets with completion status]

## Review Notes
- All tickets passed per-ticket security scan and post-merge security review
- [N] tickets received cross-model Codex review
- Integration tests passing on epic branch

---
*Created by /epic-swarm*"
```

Present the PR URL to the user:
```
Epic PR created: [PR URL]

All epic work is on branch epic/[epic-id].
The default branch (main) has NOT been modified.
Merge this PR when ready to deploy.
```

### 7.3 Clean Up Worktrees

```bash
for dir in .swarm/worktrees/*/; do
  ticket_id=$(basename "$dir")
  # Only remove worktrees for closed tickets
  git worktree remove "$dir" --force 2>/dev/null || true
done
```

Worktrees for blocked/pending tickets are preserved for manual intervention.

### 7.4 Transition to /close-epic

"All waves complete. Run `/close-epic [epic-id]` for retrofit analysis, follow-up tickets, and to clean up swarm state."

`/close-epic` deletes `.swarm/state/[epic-id].json` as its final step.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SWARM_MAX_PARALLEL` | `4` | Max concurrent tickets per wave |
| `SWARM_AUTO_MERGE` | `false` | Auto-merge without user approval |
| `SWARM_BASELINE_TESTS` | `true` | Run baseline tests in each worktree before starting |
| `SWARM_CONFLICT_STRATEGY` | `stop` | Merge conflict handling: `stop` or `auto-trivial` |
| `SWARM_PARALLEL_WRITES` | `false` | Allow parallel dispatch for write phases. When false (default), write phases dispatch sequentially with cd between agents. |

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

## Deferred Items Handling

When agents bypass issues (correct behavior for low-priority items), they MUST document them in a Deferred Items table for user traceability. This system matches `/execute-ticket` exactly to ensure `/close-epic` can extract deferred and declined items from ticket comments.

**Deferred Items table format (included in every agent report):**

| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| [AC-DEFERRED/DISCOVERED/OUT-OF-SCOPE] | [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [file:line] | [Brief description] | [Why deferred] |

### Deferred Item Classifications

| Classification | Description | Requires User Approval? |
|---------------|-------------|------------------------|
| AC-DEFERRED | An explicit acceptance criterion the agent chose not to implement | **YES — ALWAYS** |
| DISCOVERED | A new issue found during the phase, not in the original AC | NO — agent discretion |
| OUT-OF-SCOPE | Work that belongs to a different ticket | NO — agent discretion |

### Orchestrator Validation Rule

The swarm orchestrator validates deferred items as part of the Section 3.2.4.6 pipeline (before posting to Linear). For each agent report:

1. Extract all acceptance criteria from the ticket context file
2. Check each deferred item against the AC list (fuzzy match on key terms)
3. If ANY deferred item matches an AC → reclassify as `AC-DEFERRED`
4. If ANY `AC-DEFERRED` items exist → **PAUSE ticket for user decision** (see Section 3.2.4.6)

**Agents MUST NOT unilaterally defer acceptance criteria.** Deferring discovered issues is expected and encouraged. Deferring AC requires explicit user approval.

### Rules for Deferred Items

1. ANY issue found but not addressed MUST appear in this table
2. Classification must be set (agents should classify; orchestrator validates and reclassifies if needed)
3. Location must include file:line for traceability
4. Reason must explain the bypass decision
5. Table is always included in full when passing context to downstream phases
6. Orchestrator posts full table to Linear (not summarized)
7. Deferred Items tables propagate forward — every subsequent phase agent receives all prior deferred items

### Why This Matters for /close-epic

The `/close-epic` workflow extracts deferred and declined items from ticket comments to generate follow-up tickets. If phase reports are not posted as Linear comments (Gap #1) or if deferred items are not classified (this section), `/close-epic` cannot function correctly. This is the primary reason these items are P0 priority.

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
