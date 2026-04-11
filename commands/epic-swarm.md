---
description: Orchestrate sequential execution of epic sub-tickets using dependency-aware tier scheduling with worktree isolation and full per-ticket workflow pipelines
allowed-tools: Task, Agent, Read, Grep, Glob, Bash, Bash(git:*), Bash(gh:*), WebFetch, mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_comments, mcp__linear-server__create_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
argument-hint: <epic-id> [--dry-run] [--tier N] [--parallel]
workflow-phase: epic-swarm
closes-ticket: false
---

# Epic Swarm Orchestrator

Execute multiple tickets from an epic with full per-ticket workflow pipelines. The orchestrator (this command, running in the main Claude Code session) processes **one ticket at a time** through ALL 7 workflow phases — adaptation, implementation, testing, documentation, code review, codex review, and security scan — before advancing to the next ticket. Each ticket works in its own git worktree, and all work merges to an **epic-level branch** (not main).

**Architecture — fully sequential by default:**

```
Tier 1 (no deps):
  Ticket A: [adapt → implement → test → docs → code review → codex → security → merge]
  Ticket B: [adapt (sees A's code) → implement → test → ... → merge]
  Ticket C: [adapt (sees A+B code) → implement → test → ... → merge]

Tier 2 (depends on Tier 1):
  Worktrees branch from epic branch (now includes all Tier 1 code)
  Ticket D: [adapt (examines A+B+C code) → implement → test → ... → merge]
```

This architecture ensures:
- Every ticket gets the same quality as running `/execute-ticket` individually
- Adaptation for EVERY ticket can examine code built by ALL prior tickets in the epic
- No phases are skipped under cognitive load — the per-ticket loop prevents it
- A hard checkpoint before merge verifies all 7 phase reports exist
- The orchestrator manages one ticket's full pipeline at a time — simple, reliable, proven

---

## HARD CONSTRAINTS — read before executing ANY step

These constraints are non-negotiable. Violating any of them breaks the workflow.

### 1. NEVER merge to main or the default branch

All merges target the **epic branch** (`epic/[epic-id]`). The default branch (main/master) is NEVER modified by this workflow. Not during integration. Not after security review. Not at any point.

- Worktrees branch from the epic branch (Phase 3.0.1)
- Tier merges target the epic branch (Phase 4.1)
- Push targets the epic branch (Phase 4.1)
- A PR from epic branch → main is created at completion (Phase 6.2)
- The ONLY way code reaches main is through that PR, reviewed by a human

**Before ANY `git merge` or `git push`, verify the target branch:**
```bash
current=$(git branch --show-current)
if [ "$current" = "main" ] || [ "$current" = "master" ]; then
  echo "ABORT: On default branch. Switch to epic branch first."
  exit 1
fi
```

If you find yourself about to merge to or push to main/master: **STOP. You are violating this constraint.** Check out the epic branch and merge there instead.

### 2. No compound cd + git commands

Claude Code blocks compound commands combining `cd` with `git`. All git operations on worktrees MUST use `git -C <path>`. This applies to the orchestrator AND to agents.

### 3. Subagents cannot spawn subagents

The orchestrator dispatches all agents directly — it does NOT delegate to `/execute-ticket`. This is a Claude Code platform constraint: the Agent tool is not available to subagents.

### 4. Every phase MUST post a report to Linear AND every completed ticket MUST be closed

**(a) Phase reports.** After every phase completes for every ticket, post the full structured report as a Linear comment via `mcp__linear-server__create_comment`. A phase without a posted report is a phase that never happened. **Invoke the `swarm-phase-reporting` skill at every phase completion point** — it provides templates, validation, and anti-rationalization guidance.

**(b) Ticket closure.** After a ticket clears the hard checkpoint, merges to the epic branch, passes post-merge integration tests, and the epic branch is pushed, the orchestrator MUST mark the Linear ticket as **Done** via `mcp__linear-server__update_issue` (see §3.5.6 for the exact step). The orchestrator inherits this responsibility from `/security-review`, which is the only OTHER command in this workflow that closes tickets — and which is NOT invoked by the swarm. A ticket that completes all 7 phases and merges successfully but is left in "In Progress" is a workflow defect.

### 5. Codex findings MUST be resolved, not ignored

When Codex review returns P1-P3 findings, present them to the user, get decisions, and apply fixes. **Invoke the `codex-finding-resolution` skill before processing any Codex results** — it defines the full resolution process.

### 6. ALL tickets run ALL phases — no exceptions, no skipping

Every ticket that enters the swarm runs through the complete phase sequence: adaptation, implementation, testing, documentation, code review, codex review, security scan. The orchestrator MUST NOT skip any phase autonomously.

The ONLY ways a phase does not run for a ticket are:
- The ticket BLOCKS at a prior phase (agent returns BLOCKED/NEEDS_CONTEXT)
- The user explicitly approves a skip when prompted at a blocking condition
- Codex review server is unavailable (posts explicit skip report — the phase still "runs")

**If you find yourself reasoning that a phase is "unnecessary," "already handled," "redundant," or "covered by implementation" — STOP. You are violating this constraint.** Tests written during implementation do NOT substitute for the testing phase. Implementation-generated docs do NOT substitute for the documentation phase. Run every phase. Post every report.

**Evidence for why this exists:** PRO-310 and PRO-311 both had the orchestrator skip 5 of 7 phases, marking all tickets Done after implementation alone. The fix is not better prompting — it is this hard constraint plus the hard checkpoint in Phase 3.3 that enforces it.

### 7. Do NOT pause to re-confirm execution mode mid-flow

After Phase 1 scope confirmation, the orchestrator MUST proceed continuously through all selected tickets without asking the user "should I pause between tickets?" or "should I proceed continuously?" The execution model is **already established by this command**: dispatch all tickets sequentially, pausing ONLY for the explicit blocking conditions defined in §3.2.7 (BLOCKED, NEEDS_CONTEXT, security CRITICAL/HIGH, codex P1/P2 questions, hard checkpoint failure, AC-DEFERRED).

**Prohibited mid-flow questions:**
- "How should I proceed with the long-running execution?"
- "Should I pause after each ticket merges?"
- "Should I pause after each phase?"
- Any "are you sure you want me to continue?" check after setup is complete

These waste a round-trip and invite premature halts. A status update like "Setup complete, dispatching PRO-X adaptation — will run continuously, pausing only on blocking conditions" is fine. A question that requires user input is not.

The user already opted into the swarm by invoking the command. Trust the contract.

### 8. LSP/IDE diagnostics are non-authoritative during the swarm

When worktrees are created or removed, IDE/LSP diagnostics for the remaining worktrees become stale for 30–60 seconds (cached symbol tables, regenerated Prisma clients, deleted directories). Treat any LSP output you see during a swarm run as **advisory only**, never as ground truth.

**Ground truth for quality gates is always:**
- `npx tsc --noEmit` (or project equivalent) run by the subagent or orchestrator
- `pnpm lint` / `pnpm biome check` (or project equivalent)
- `pnpm test` / `pnpm vitest` (or project equivalent)

**Specifically: do NOT re-verify a subagent's reported passing gates based solely on stale LSP diagnostics.** If the subagent reported `tsc clean, lint clean, N/N tests passing`, trust that report unless you have a concrete reason to doubt it (the subagent's own bash output contradicted itself, the file diff doesn't match the report, etc.). Re-running gates "just to be sure" because LSP shows red squiggles wastes ~6–10 tool calls per ticket.

**Evidence for why this exists:** PRO-312 swarm session — orchestrator re-ran `tsc --noEmit` four times for PRO-427 chasing stale LSP diagnostics that were already invalidated by the worktree teardown. Every check came back clean.

### 9. Quote bracket paths in Bash (zsh glob hazard)

Next.js / React Router / file-based routing projects use bracket-named directories like `[id]`, `[slug]`, `[...slug]`. Zsh interprets `[...]` as a glob pattern and aborts the command with `(eval):1: no matches found` (exit code 1) when no file literally named `[id]` exists.

**Wrong (will fail in zsh):**
```bash
git -C .swarm/worktrees/PRO-X diff main...HEAD -- apps/app/app/api/runs/[id]/replay/route.ts
ls apps/app/app/api/runs/[id]/replay/
```

**Right (single-quote the path or use Read/Grep tools directly):**
```bash
git -C .swarm/worktrees/PRO-X diff main...HEAD -- 'apps/app/app/api/runs/[id]/replay/route.ts'
ls 'apps/app/app/api/runs/[id]/replay/'
```

Or skip Bash entirely and use the dedicated tools:
- File contents: `Read` tool
- Searching content: `Grep` tool
- Listing files: `Glob` tool

These tools do not invoke the shell and never trigger glob expansion.

**Cascade hazard:** When a Bash call with an unquoted bracket path is batched with parallel `Grep` calls, the failure cancels ALL parallel calls in the batch ("Cancelled: parallel tool call Bash errored"). This wastes the parallelization. If you must batch a bracket-path Bash call with other tool uses, **quote the path first**.

This rule applies to the orchestrator AND to every dispatched subagent. The agent prompt template in §3.2.1 enforces it for subagents.

---

## Input

- `$ARGUMENTS` — Linear epic ID (e.g., `EPIC-42`) and optional flags:
  - `--dry-run` — Show tier plan without executing
  - `--tier N` — Start from a specific tier (for manual tier-by-tier control)
  - `--parallel` — Enable parallel execution for independent tickets within a tier (user must confirm at tier planning). Default is fully sequential.

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
  echo "Current tier: N, Completed tickets: X/Y"
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

**Validation:**
- No circular dependencies (topological sort must succeed)
- No file overlap between tickets in the same parallel group

If circular dependencies detected: report and stop.
If file overlap in same group: move the overlapping ticket to the next tier and warn.

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

3. Present the heuristic analysis alongside the tier plan (Section 2.4):
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

### 1.6 Create Epic Branch (BLOCKING — must complete before Phase 2)

**This step is a hard prerequisite.** No tier planning, no worktree creation, no agent dispatch, and no merging may occur until the epic branch exists and is verified. See Hard Constraint #1.

All ticket work merges to an epic-level branch — never directly to the default branch.

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

**Verify the epic branch was created successfully:**
```bash
epic_branch="epic/[epic-id]"
current=$(git branch --show-current)
if [ "$current" != "$epic_branch" ]; then
  echo "FATAL: Epic branch creation failed. Current branch: $current"
  exit 1
fi
echo "Epic branch '$epic_branch' created and active."
```

**Do NOT proceed to Phase 2 until this verification passes.**

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
  "currentTier": 1,
  "tiers": [],
  "pendingCodexReviews": [],
  "contextBundlePath": ".swarm/context/[epic-id]/",
  "detectedBuildSystem": null,
  "detectedTestCommand": null,
  "config": {
    "maxParallel": 4,
    "autoMerge": false,
    "conflictStrategy": "stop"
  }
}
```

### 1.8 Initialize Orchestrator Notes

Create `.swarm/orchestrator-log.md` — a persistent file the orchestrator updates after each ticket completes the hard checkpoint. This provides cross-ticket context for adaptation phases in later tiers.

```bash
cat > .swarm/orchestrator-log.md << 'EOF'
# Orchestrator Notes — Epic [epic-id]
Generated: [timestamp]

## Completed Tickets
(none yet)

## Cross-Ticket Observations
(none yet)
EOF
```

**Purpose:** When ticket B's adaptation phase runs after ticket A is complete, the orchestrator includes the orchestrator notes in the adaptation prompt so the architect-agent can examine what was built and plan accordingly.

---

## Phase 2: Tier Planning

### 2.1 Topological Sort

Sort all tickets by dependency depth:
- Tier 1: tickets with no dependencies (Parallel Group A)
- Tier 2: tickets that depend only on Tier 1 tickets (Parallel Group B)
- Tier 3: tickets that depend on Tier 1 or Tier 2 tickets (Parallel Group C)
- Continue until all tickets are assigned

### 2.2 File Overlap Check Within Tiers

For each tier, check if any two tickets predict modifying the same file:
- If overlap detected: move the later ticket (by ID) to the next tier
- Log: "Ticket CON-46 moved to Tier 3 due to file overlap with CON-45 on src/services/auth.ts"

### 2.3 Cap Tier Size

If a tier has more tickets than `--max-parallel`:
- Keep the first N tickets (lowest IDs) in this tier
- Move remaining to a new tier at the same dependency level
- Preserve dependency ordering

### 2.4 Present Tier Plan

Display to the user and await approval:

```
## Epic Swarm: Tier Plan

Epic: [epic-id] — [epic title]
Total tickets: N | Tiers: M | Max parallel: K

### Tier 1 (3 tickets, no dependencies)
| Ticket | Title | Files |
|--------|-------|-------|
| CON-42 | Add user profile endpoint | src/routes/profile.ts, src/services/profile.ts |
| CON-43 | Add settings page | src/pages/settings.tsx, src/components/settings/ |
| CON-44 | Add email templates | src/templates/email/ |

### Tier 2 (2 tickets, depends on Tier 1)
| Ticket | Title | Depends On | Files |
|--------|-------|------------|-------|
| CON-45 | Profile settings page | CON-42 | src/pages/profile-settings.tsx |
| CON-46 | User avatar upload | CON-42 | src/services/avatar.ts |

### Shared Interface Contracts
- IProfileResponse: defined by CON-42, consumed by CON-45, CON-46

### Execution Model
Each ticket runs ALL 7 phases (adaptation → security scan) before merge.
Tickets are processed ONE AT A TIME — fully sequential by default.
Each ticket's adaptation examines all code from previously completed tickets.
```

**If `--dry-run`:** Show the plan and stop. Do not execute.

---

## Phase 3: Tier Execution (repeat per tier)

### Architecture

**The orchestrator processes ONE ticket at a time through the COMPLETE 7-phase pipeline.** After each ticket completes all phases and passes the hard checkpoint, it is merged to the epic branch. The next ticket's worktree is then created from the updated epic branch, so its adaptation phase can examine all previously built code.

```
PHASES = [
  "adaptation",       # architect-agent
  "implementation",   # backend/frontend-engineer-agent
  "testing",          # qa-engineer-agent
  "documentation",    # technical-writer-agent
  "codereview",       # code-reviewer-agent
  "codex-review",     # MCP tool, not agent
  "security-scan"     # security-engineer-agent
]

For each ticket in the tier (one at a time):

  # Create worktree from CURRENT epic branch (includes all prior ticket merges)
  Create worktree for this ticket (Section 3.0)

  For each phase in PHASES:
    1. Build context (Section 3.2.1)
    2. Dispatch agent (Section 3.2.2)
    3. Validate report (Section 3.2.3)
    4. Post-phase verifications (Section 3.2.4)
    5. Post report to Linear (Section 3.2.5)
    6. Commit changes if applicable (Section 3.2.6)
    7. Check blocking conditions (Section 3.2.7)
    8. Update swarm state (Section 3.2.8)

  Hard Checkpoint (Section 3.3) — verify all 7 reports exist
  Merge to epic branch (Section 3.5)
  Update Orchestrator Notes (Section 3.4)
  Close ticket via post-merge security (Section 3.6)
```

**Structural guarantee:** The orchestrator manages one ticket at a time. It cannot "forget" phases because the loop is simple: iterate PHASES, dispatch, validate, post. The hard checkpoint after the loop verifies all 7 reports exist before merge. This is the same proven model as `/execute-ticket`, applied sequentially across the epic.

**Why fully sequential:** Adaptation quality depends on examining code from prior tickets. Even tickets with no formal dependency benefit from seeing patterns, services, and interfaces built by earlier tickets. Running tickets in parallel would deny later tickets this context. The throughput cost is acceptable — a working sequential run is infinitely faster than a broken parallel run that requires manual remediation.

**Parallelism opt-in:** If the user explicitly requests parallel execution for a set of tickets they know to be truly independent (no shared files, no shared patterns, no integration points), the orchestrator can create worktrees for those tickets simultaneously and run their pipelines in parallel. But this is an explicit user decision, not an automatic optimization. Present it as an option during tier planning:

```
Tier 1 has 4 tickets with no formal dependencies.

Default: Process sequentially (A → B → C → D)
  - Each ticket's adaptation sees all prior code
  - Most reliable, highest quality

Parallel option: Process A, B, C, D simultaneously
  - Faster, but adaptation cannot see other tickets' code
  - Only recommended if tickets are truly isolated

Which approach? [Sequential (recommended) / Parallel / Let me review the tickets]
```

### 3.0 Per-Ticket Setup

**Run these steps for EACH ticket, immediately before starting that ticket's phase loop.** Because tickets are processed sequentially, each ticket's worktree is created from the latest epic branch — which includes all prior ticket merges. This is how later tickets see earlier tickets' code.

**3.0.1 Create worktree (from CURRENT epic branch — NEVER from main):**
```bash
git check-ignore .swarm/ || echo ".swarm/" >> .gitignore

epic_branch="epic/[epic-id]"

# VERIFY epic branch exists (Hard Constraint #1)
if ! git branch --list "$epic_branch" | grep -q "$epic_branch"; then
  echo "FATAL: Epic branch '$epic_branch' does not exist. Run Phase 1.6 first."
  exit 1
fi

# Pull latest epic branch — includes ALL prior ticket merges from this epic
git checkout "$epic_branch"
git pull origin "$epic_branch"

# Worktree branches from CURRENT epic branch, so it includes all prior work
git worktree add .swarm/worktrees/[ticket-id] -b feature/[ticket-id]-[slug] "$epic_branch"
```

**3.0.2 Generic worktree setup (detect build system and initialize):**

Detect the project's build system from the worktree and run appropriate setup commands. Do NOT hardcode any specific technology — detect from config files.

```bash
worktree=".swarm/worktrees/[ticket-id]"

# Step 1: Detect package manager from lockfiles
if [ -f "$worktree/pnpm-lock.yaml" ]; then
  PKG_MGR="pnpm"; INSTALL_CMD="pnpm install --frozen-lockfile"
elif [ -f "$worktree/yarn.lock" ]; then
  PKG_MGR="yarn"; INSTALL_CMD="yarn install --frozen-lockfile"
elif [ -f "$worktree/bun.lockb" ]; then
  PKG_MGR="bun"; INSTALL_CMD="bun install --frozen-lockfile"
elif [ -f "$worktree/package-lock.json" ]; then
  PKG_MGR="npm"; INSTALL_CMD="npm ci"
elif [ -f "$worktree/requirements.txt" ]; then
  PKG_MGR="pip"; INSTALL_CMD="pip install -r requirements.txt"
elif [ -f "$worktree/pyproject.toml" ]; then
  PKG_MGR="poetry/pip"; INSTALL_CMD="pip install -e ."
elif [ -f "$worktree/Cargo.toml" ]; then
  PKG_MGR="cargo"; INSTALL_CMD="cargo build"
elif [ -f "$worktree/go.mod" ]; then
  PKG_MGR="go"; INSTALL_CMD="go mod download"
elif [ -f "$worktree/Gemfile" ]; then
  PKG_MGR="bundler"; INSTALL_CMD="bundle install"
else
  PKG_MGR="unknown"; INSTALL_CMD=""
fi

# Step 2: Install dependencies
if [ -n "$INSTALL_CMD" ]; then
  (cd "$worktree" && $INSTALL_CMD)
fi

# Step 3: Detect and run code generation / build steps
if [ -f "$worktree/package.json" ]; then
  # Check for common generate scripts in package.json
  for script in generate codegen prisma:generate db:generate build:types postinstall; do
    if grep -q "\"$script\"" "$worktree/package.json" 2>/dev/null; then
      (cd "$worktree" && $PKG_MGR run "$script" 2>/dev/null || true)
    fi
  done
fi
if [ -f "$worktree/Makefile" ] && grep -q "^generate:" "$worktree/Makefile"; then
  (cd "$worktree" && make generate 2>/dev/null || true)
fi

# Step 4: Detect test command
if [ -f "$worktree/package.json" ]; then
  TEST_CMD="$PKG_MGR test"
elif [ -f "$worktree/pytest.ini" ] || [ -f "$worktree/pyproject.toml" ]; then
  TEST_CMD="pytest"
elif [ -f "$worktree/Cargo.toml" ]; then
  TEST_CMD="cargo test"
elif [ -f "$worktree/go.mod" ]; then
  TEST_CMD="go test ./..."
else
  TEST_CMD=""
fi
```

Store `PKG_MGR` and `TEST_CMD` in swarm state for this ticket.

**3.0.3 Run baseline tests (BLOCKING):**

For each worktree, run the detected test suite and WAIT for results. Do NOT proceed to Phase 3.1 until ALL worktrees have passing baseline tests.

```bash
cd .swarm/worktrees/[ticket-id]
$TEST_CMD  # Use detected test command from 3.0.2
```

If any worktree's baseline tests fail:
  - Report the failure with test output to the user
  - Present options:
    1. Fix the issue and re-run baseline tests
    2. Proceed anyway (baseline was already failing — not caused by this work)
    3. Abort the swarm
  - WAIT for user decision

**3.0.4 Copy context bundles into worktrees:**
```bash
cp .swarm/context/[epic-id]/epic-context.md .swarm/worktrees/[ticket-id]/.epic-context.md
cp .swarm/context/[epic-id]/[ticket-id].md .swarm/worktrees/[ticket-id]/.ticket-context.md
```

Also copy interface contracts if shared interfaces exist.

**3.0.5 Update ticket status to In Progress:**

```
Use mcp__linear-server__update_issue:
  - issue_id: [ticket-id]
  - state: "In Progress"
```

Skip if the ticket is already "In Progress" or a later state.

### 3.1 Phase Skip Policy (HC6 Enforcement)

The orchestrator MUST NOT skip any phase autonomously. If the orchestrator determines a phase may be unnecessary:

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
3. If user approves skip: post a skip report to Linear with the header `## [Phase Name] Report` and body explaining the approved skip. This satisfies the hard checkpoint (Phase 3.3).
4. If in doubt: run the phase. A redundant pass costs minutes; a missing pass costs user trust and breaks the hard checkpoint.

### 3.2 Per-Phase Execution Steps

For each phase of the current ticket:

#### 3.2.1 Build the Agent Prompt

**Agent selection:**

| Phase | Agent |
|-------|-------|
| adaptation | `architect-agent` |
| implementation | `backend-engineer-agent` or `frontend-engineer-agent` (see selection logic below) |
| testing | `qa-engineer-agent` |
| documentation | `technical-writer-agent` |
| codereview | `code-reviewer-agent` |
| codex-review | *(MCP tool `codex_review_and_fix`, not an agent)* |
| security-scan | `security-engineer-agent` |

**Implementation phase agent selection** (same logic as `/execute-ticket` Step 3.2):

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

3. **If still unclear:** Default to `backend-engineer-agent`. Log the selection rationale in the swarm state.

**Prompt construction — the agent prompt MUST include ALL of the following:**

1. **Working directory enforcement (at TOP of prompt, before any other content):**
   ```
   WORKING DIRECTORY: /absolute/path/to/.swarm/worktrees/[ticket-id]

   You MUST operate exclusively within this directory:
   - Use ABSOLUTE paths for ALL file operations, prefixed with the path above
   - Before creating or modifying ANY file, verify the path starts with
     /absolute/path/to/.swarm/worktrees/[ticket-id]/
   - Do NOT use relative paths from the repo root
   - Do NOT write to any directory outside your assigned worktree
   - All git operations MUST use: git -C /absolute/path/to/.swarm/worktrees/[ticket-id]/

   SHELL HAZARD — Bracket paths (Next.js dynamic routes, etc.):
   This shell is zsh. Paths containing brackets like [id], [slug], [...slug]
   are glob patterns to zsh and will fail with "(eval):1: no matches found"
   (exit code 1) if no literal match exists. When a Bash command needs to
   reference such a path, single-quote it OR use the Read/Grep/Glob tools
   directly (they do not invoke the shell).

     WRONG:  git -C <wt> diff main...HEAD -- apps/app/api/runs/[id]/route.ts
     RIGHT:  git -C <wt> diff main...HEAD -- 'apps/app/api/runs/[id]/route.ts'
     RIGHT:  use the Read tool with the absolute path

   This failure also CANCELS parallel tool calls in the same batch
   ("Cancelled: parallel tool call Bash errored"). Quote first, batch second.
   ```

2. **Instruction to read context files:**
   ```
   BEFORE doing any work, you MUST read these context files:
   - .epic-context.md (epic-level research, requirements, and reference materials)
   - .ticket-context.md (this ticket's description, AC, technical notes, comments)

   These files contain the FULL verbatim research briefs, requirements documents,
   and reference materials for this work. Read them IN FULL. Do not skim.
   Do not summarize. The specific details in these documents ARE your requirements.
   ```

3. **Ticket identity:** ticket ID, title

4. **ALL prior phase reports for THIS ticket** — verbatim from Linear comments. Fetch fresh using `mcp__linear-server__list_comments` for this ticket. Copy the full text of each phase report comment. If the adaptation report says to use a specific pattern, the implementation agent needs to see that.

5. **Phase-specific instructions** from the relevant agent definition

6. **Interface contracts** that this ticket defines or consumes

7. **Deferred items** from all prior phases for this ticket (full tables, not summaries)

8. **Orchestrator notes** (ADAPTATION PHASE ONLY): Include the full content of `.swarm/orchestrator-log.md` under a header:
   ```
   ## Prior Ticket Work in This Epic
   The following tickets have already been completed in this epic. Their code
   is in your worktree (branched from the epic branch that includes their merges).
   Reference these when planning your implementation approach — look for existing
   patterns, services, and interfaces you can reuse or extend.

   [full orchestrator-log.md content]
   ```

9. **File scope for read-only phases** (codereview, security-scan):
   ```bash
   git -C .swarm/worktrees/[ticket-id] diff --name-only epic/[epic-id]...HEAD
   ```
   Include in the prompt:
   ```
   ## Review Scope
   Review ONLY the following files in /absolute/path/to/.swarm/worktrees/[ticket-id]/:
   [list of files from git diff]
   ```

**Context fidelity rules:**
- Pass ALL context verbatim and unabridged
- Never summarize or condense any context
- Never omit "long" documents to save tokens
- Never assume the agent "already knows" something — each agent is a fresh session
- Never skip the instruction to read context files

#### 3.2.2 Dispatch Agent

**For agent-based phases:**
```
Spawn Agent with:
  - The agent definition matching this phase (from 3.2.1 agent selection table)
  - The full prompt built in 3.2.1
  - description: "[ticket-id] [phase] phase"
    e.g., "PRO-425 adaptation phase", "PRO-425 implementation phase",
          "PRO-425 testing phase", "PRO-425 documentation phase",
          "PRO-425 code review phase", "PRO-425 security scan"
```

**Description naming rule (mandatory):**

The Agent dispatch `description` field MUST follow the canonical pattern `"<ticket-id> <phase> phase"` (or `"<ticket-id> security scan"` for the security phase, since "scan" reads better than "phase"). Do not vary the description based on scope ("audit", "focused review", "quick check") — those scope adjustments belong in the agent prompt body, not the description.

**Why:** The description is parsed by downstream tooling (state file scans, transcript analysis, hard checkpoint verification) to identify which phase ran for which ticket. Drift in the description ("PRO-429 testing audit" vs "PRO-429 testing phase") breaks parsing and obscures phase identity.

**Canonical descriptions:**
| Phase | Description |
|-------|-------------|
| adaptation | `<ticket-id> adaptation phase` |
| implementation | `<ticket-id> implementation phase` |
| testing | `<ticket-id> testing phase` |
| documentation | `<ticket-id> documentation phase` |
| code review | `<ticket-id> code review phase` |
| security scan | `<ticket-id> security scan` |

**For codex-review phase:**
Build the Codex context string (same pattern as `/codex-review` Step 2):
```
We just completed [ticket-id]. Read all ticket context, then conduct a
meticulous code review on the branch. Review for:

1. Compliance with the ticket requirements and acceptance criteria
2. Adherence to [project tech stack] best practices
3. SOLID/DRY violations
4. Bugs and edge cases
5. Code quality issues
6. Security vulnerabilities
7. Any other issues worth fixing before merge

Fix all P1-P3 issues that are unambiguous, then provide a report with the
remaining prioritized list of questions and issues to resolve.

## Ticket Context
[Full ticket description from .ticket-context.md — verbatim]

## Acceptance Criteria
[Full AC — verbatim]

## Implementation Summary
[From implementation phase report — files changed, key decisions]

## Prior Review Concerns
[From code review phase report — flagged issues, requirements checklist]
```

Detect the project tech stack from the worktree (package.json, tsconfig.json, etc.) and substitute for `[project tech stack]`.

```
Call mcp__codex-review-server__codex_review_and_fix with:
  - project_dir: [absolute path to ticket's worktree]
  - base_branch: [the worktree's base branch]
  - context: [the structured context string built above]
```

**Invoke the `codex-finding-resolution` skill** before processing results. Follow its full resolution process: parse findings, present to user, get decisions, apply fixes, commit.

**After every dispatch — Worktree Integrity Verification:**

After each agent returns, verify file changes landed in the correct worktree:

1. Check target worktree: `git -C .swarm/worktrees/[ticket-id] status --short`
2. Check OTHER worktrees for contamination:
   ```bash
   for dir in .swarm/worktrees/*/; do
     other_id=$(basename "$dir")
     if [ "$other_id" != "[ticket-id]" ]; then
       unexpected=$(git -C "$dir" status --short)
       if [ -n "$unexpected" ]; then
         echo "CONTAMINATION: $other_id has unexpected changes: $unexpected"
       fi
     fi
   done
   ```
3. Check project root: `git status --short`
4. If contamination detected: STOP, report to user, do NOT proceed.

#### 3.2.3 Validate Report Structure

**Invoke the `swarm-phase-reporting` skill.** Then validate:

**Required fields by phase:**

| Phase | Required Fields |
|-------|-----------------|
| Adaptation | `Status:`, `Summary:`, `Target Files` or `Implementation Plan` |
| Implementation | `Status:`, `Summary:`, `Files Changed:`, Quality Gates (lint/typecheck/test results) |
| Testing | `Status:`, `Gate #0` result, `Gate #1` result, `Gate #2` result, `Gate #3` result |
| Documentation | `Status:`, `Summary:`, `Documentation Updated` or `Docs Created` |
| Code Review | `Review Status:`, `Requirements Checklist`, `Files Reviewed:`. If `Pass 1 Result: PASS`, also require `Best Practices Assessment` and `SOLID/DRY Assessment`. |
| Codex Review | Summary with finding counts by priority, Auto-Fixed Items section, User-Reviewed Items section, Declined by Codex section |
| Security Scan | `Status:`, `Security Checklist` or findings list |

**If ANY required field is missing or empty:**
- DO NOT post to Linear
- Log: "Report validation failed for [ticket-id]: missing [field-name]"
- Auto-retry phase ONCE with enhanced prompt requesting the missing fields
- If retry also fails: PAUSE ticket for user decision
  Options: [Retry] [Review Raw Output] [Skip Phase] [Continue Anyway]

#### 3.2.4 Post-Phase Verifications

**Implementation phase only — Verify Artifacts Exist:**
```bash
changes=$(git -C .swarm/worktrees/[ticket-id] status --porcelain | wc -l)
```
If `changes == 0` and report says DONE: PAUSE ticket. Options: [Retry] [Review Manually] [Mark as No-Op].

**Implementation phase only — Verify Acceptance Criteria:**
Extract each AC from the ticket context. Classify as STRUCTURAL, BEHAVIORAL, or REMOVAL. Generate and run verification commands in the worktree. If any AC fails: PAUSE ticket with evidence table.

**Implementation phase only — Verify Referenced Document Conformance:**
For prescriptive documents, verify specific values/IDs/schemas appear in the code.

**All phases — Validate Deferred Items Against AC:**
Scan the agent's Deferred Items table. For each item, check if it matches an acceptance criterion (fuzzy match on key terms). If a match is found: reclassify as `AC-DEFERRED` and PAUSE ticket for user decision. Agents MUST NOT unilaterally defer acceptance criteria.

#### 3.2.5 Post Report to Linear + Quality Labels

Post the agent's full structured report as a comment on the ticket:

```
Use mcp__linear-server__create_comment:
  - issue_id: [ticket-id]
  - body: [formatted report — see format below]
```

**Comment format:**
```markdown
## [Phase Name] Report

[Agent's full structured report — verbatim, unmodified, no summarization]

---
*Automated by /epic-swarm — Tier [N]*
```

**Phase Name mapping (EXACT — do not vary):**

| Phase | Report Header |
|-------|---------------|
| Adaptation | `## Adaptation Report` |
| Implementation | `## Implementation Report` |
| Testing | `## Testing Report` |
| Documentation | `## Documentation Report` |
| Code Review | `## Code Review Report` |
| Codex Review | `## Cross-Model Review Report` |
| Security Scan (Pre-Merge) | `## Security Scan Report (Pre-Merge)` |

**CRITICAL:** These headers must match what `/execute-ticket` and `/close-epic` expect for resume detection and deferred item extraction.

**Add quality labels after posting:**

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

#### 3.2.6 Commit Changes (Write Phases Only)

After posting the report, commit all changes in the ticket's worktree. Only for phases that modify files.

**Implementation:**
```bash
git -C .swarm/worktrees/[ticket-id] add -A
git -C .swarm/worktrees/[ticket-id] commit -m "feat([ticket-id]): [ticket-title]

[First sentence of implementation summary from agent report]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Testing:**
```bash
git -C .swarm/worktrees/[ticket-id] add -A
git -C .swarm/worktrees/[ticket-id] commit -m "test([ticket-id]): add test suite

[Brief summary of test coverage from agent report]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Documentation:**
```bash
git -C .swarm/worktrees/[ticket-id] add -A
git -C .swarm/worktrees/[ticket-id] commit -m "docs([ticket-id]): add documentation

[Brief summary from agent report]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Code Review / Codex Review (if fixes were made):**
```bash
git -C .swarm/worktrees/[ticket-id] add -A
git -C .swarm/worktrees/[ticket-id] commit -m "refactor([ticket-id]): apply review fixes

[Summary of fixes applied]

Linear: [ticket-id]
Co-Authored-By: Claude <noreply@anthropic.com>"
```

Do NOT push or create PRs — the swarm handles merge during Phase 4 (Integration).

#### 3.2.7 Check Blocking Conditions

| Phase | Blocking Condition | Action |
|-------|-------------------|--------|
| adaptation | Status: BLOCKED or NEEDS_CONTEXT | Pause ticket, break from phase loop |
| implementation | BLOCKED, compile errors, or AC failure | Pause ticket, break |
| testing | Any Gate FAILS | Pause ticket, break |
| documentation | BLOCKED | Pause ticket, break |
| codereview | CHANGES_REQUESTED | Pause ticket, break |
| codex-review | Rate limit or server unavailable | Post skip report (satisfies checkpoint), CONTINUE |
| security-scan | CRITICAL/HIGH findings | Pause ticket, break |

**When a ticket is paused:**
- Other tickets in the tier continue through remaining phases
- The paused ticket's worktree is preserved for manual intervention
- Dependents in later tiers remain blocked
- Report the pause to the user with the blocking reason

**When codex-review is unavailable:** Post a skip report to Linear using the `## Cross-Model Review Report` header with status SKIPPED/DEFERRED/FAILED (see `codex-finding-resolution` skill for templates). The ticket continues to security-scan. The skip report satisfies the hard checkpoint.

#### 3.2.8 Update Swarm State

After every phase completion, update `.swarm/state/[epic-id].json`:

```json
{
  "tickets": {
    "[ticket-id]": {
      "tier": 1,
      "status": "in_progress",
      "currentPhase": "testing",
      "phases": {
        "adaptation": { "status": "DONE", "completedAt": "[timestamp]", "reportPosted": true },
        "implementation": { "status": "DONE", "completedAt": "[timestamp]", "reportPosted": true },
        "testing": { "status": "in_progress", "startedAt": "[timestamp]" }
      },
      "worktreePath": ".swarm/worktrees/[ticket-id]",
      "branchName": "feature/[ticket-id]-[slug]"
    }
  }
}
```

Write the state file IMMEDIATELY after each phase event. This enables resume if the session is interrupted.

### 3.3 Hard Checkpoint Before Merge (MANDATORY)

After all 7 phases complete for a ticket and before it enters the Phase 4 merge queue, verify that ALL required report headers exist as Linear comments on that ticket.

**Required headers:**
```
REQUIRED_HEADERS = [
  "## Adaptation Report",
  "## Implementation Report",
  "## Testing Report",
  "## Documentation Report",
  "## Code Review Report",
  "## Cross-Model Review Report",
  "## Security Scan Report (Pre-Merge)"
]
```

**Verification procedure:**
```
For each ticket that completed all phases:
  1. Fetch ALL comments from Linear: mcp__linear-server__list_comments(issue_id: [ticket-id])
  2. For each REQUIRED_HEADER:
     - Search all comment bodies for the header (case-insensitive substring match)
     - Record: found/missing
  3. Display checkpoint results:

     ## Hard Checkpoint: [ticket-id]

     | Phase | Report Header | Status |
     |-------|---------------|--------|
     | Adaptation | ## Adaptation Report | FOUND |
     | Implementation | ## Implementation Report | FOUND |
     | Testing | ## Testing Report | FOUND |
     | Documentation | ## Documentation Report | FOUND |
     | Code Review | ## Code Review Report | FOUND |
     | Codex Review | ## Cross-Model Review Report | FOUND |
     | Security Scan | ## Security Scan Report (Pre-Merge) | FOUND |

     Result: 7/7 — PASSED ✓

  4. If ANY header is MISSING:
     - HARD STOP. Do NOT merge this ticket.
     - Report exactly which reports are missing.
     - Present options:
       a. Re-run the missing phase(s)
       b. Post a manual report for the missing phase(s)
       c. Skip with user acknowledgment (NOT recommended)
     - WAIT for user decision.
     - If user chooses (a): re-dispatch the agent for the missing phase, re-run checkpoint.
     - If user chooses (c): post a skip report with the required header and note "Skipped by user at hard checkpoint."

  5. If ALL headers FOUND: proceed to merge (Section 3.5).
```

**This checkpoint is non-negotiable.** It is the enforcement mechanism that prevents the phase-skipping failure from PRO-310 and PRO-311. A ticket cannot merge without all 7 reports.

### 3.4 Update Orchestrator Notes

After a ticket passes the hard checkpoint, append a summary to `.swarm/orchestrator-log.md`:

```markdown
### [TICKET-ID] — [title]
**Tier:** [N] | **Completed:** [timestamp]

**Files Created/Modified:**
- [path] ([new/modified]) — [brief purpose]

**Key Interfaces Defined:**
- [interface name]: [key fields or type signature]

**Patterns Used:**
- [pattern description]

**Cross-Ticket Observations:**
- [anything relevant to subsequent tickets — shared services discovered, integration points, etc.]
```

**Content sources:**
- Files Changed: from the implementation report
- Interfaces: from the adaptation report and `git -C [worktree] diff --stat`
- Patterns: from the code review report
- Cross-ticket observations: from the orchestrator's own analysis of the ticket's work

This log is read during the adaptation phase for subsequent tickets (Step 3.2.1 item 8), giving the architect-agent awareness of what was built and what patterns to reuse.

### 3.5 Per-Ticket Merge to Epic Branch

After a ticket passes the hard checkpoint, merge it immediately to the epic branch. This ensures the next ticket's worktree includes this ticket's code.

**3.5.1 Pre-merge safety check:**
```bash
epic_branch="epic/[epic-id]"
current=$(git branch --show-current)
if [ "$current" = "main" ] || [ "$current" = "master" ]; then
  echo "SAFETY CHECK FAILED: On '$current'. Switching to epic branch."
  git checkout "$epic_branch"
fi
git checkout "$epic_branch"
git pull origin "$epic_branch"
```

**3.5.2 Merge:**
```bash
git merge feature/[ticket-id]-[slug] --no-ff -m "merge: [ticket-id] — [ticket title]"
```

**If merge conflict:**
- STOP, show conflict files, ask user
- User resolves manually, then continue

**3.5.3 Run integration tests:**
```bash
$TEST_CMD  # Use detected test command
```
If tests fail: report to user, do NOT auto-revert.

**3.5.4 Push epic branch:**
```bash
git push origin "$epic_branch"
```

**3.5.5 Update swarm state:** Mark ticket as `merged`, record merge commit SHA.

**3.5.6 Mark ticket as Done in Linear (MANDATORY):**

After the merge succeeds, the integration test passes, and the epic branch is pushed, the ticket has completed the full quality pipeline (all 7 phases passed, hard checkpoint passed, security scan returned PASS, code is integrated). **The orchestrator MUST now close the ticket in Linear.**

```
Use mcp__linear-server__update_issue with:
  - id: [ticket-id]
  - state: "Done"
```

**Preconditions (all must be true before closing):**
- Hard checkpoint (Section 3.3) returned all 7 reports FOUND
- Security scan report posted with `Status: PASS` (no CRITICAL/HIGH findings)
- Per-ticket merge to epic branch succeeded
- Post-merge integration tests passed
- Epic branch pushed successfully

If ANY precondition is not met, the ticket should NOT be closed — it should remain `In Progress` (or transition to a blocked state per §3.2.7) until the issue is resolved.

**Why this exists:** In the standalone workflow, `/security-review` is the only command that closes tickets. Inside the swarm, the orchestrator runs the security-engineer-agent inline rather than invoking `/security-review` as a subcommand, so the orchestrator inherits the responsibility for closing the ticket. **Without this step, every swarm-completed ticket remains stuck in "In Progress" forever**, requiring manual cleanup.

**Evidence for why this exists:** PRO-312 swarm session — all 4 tickets (PRO-425/426/427/429) merged cleanly with full phase reports posted, but none were marked Done. The user had to close them manually.

**3.5.7 Clean up worktree:**
```bash
git worktree remove .swarm/worktrees/[ticket-id] --force 2>/dev/null || true
```

### 3.6 Tier Completion

After all tickets in the tier have been processed (merged or blocked):

**3.6.1 Post tier update to Linear:**
```
Use mcp__linear-server__create_comment on the EPIC:
  body: "## Swarm Update: Tier [N] Complete\n\n
  | Ticket | Phases | Checkpoint | Status |\n
  | CON-42 | 7/7 | PASSED | Merged |\n
  | CON-43 | 7/7 | PASSED | Merged |\n
  | CON-44 | 4/7 | BLOCKED | AC verification failed at implementation |"
```

**3.6.2 Report to user:**
Count tickets merged, blocked, pending. Present summary.

---

## Phase 4: Tier Transition

Integration now happens per-ticket in Phase 3.5 (immediately after each ticket passes the hard checkpoint). Phase 4 handles the transition between tiers.

### 4.1 Evaluate Tier Results

Count: tickets merged, blocked, pending. Report to user.

### 4.2 Update Dependency Graph

- Merged tickets → unblock dependents in later tiers
- Blocked tickets → dependents remain blocked

### 4.3 Plan Next Tier

Apply tier planning logic (Phase 2) to remaining tickets. Present new plan for approval.

### 4.4 Update Swarm State

- Update `currentTier` to N+1
- Record tier completion timestamp

---

## Phase 5: Security Gate (per tier)

### 5.1 Post-Merge Security Review (Comprehensive)

This is the COMPREHENSIVE security review on the integrated epic branch. It runs AFTER all tier merges succeed. Unlike the per-ticket security scan in Phase 3 (which reviews isolated ticket changes in worktrees), this review:

- Sees ALL merged code from the tier together on the epic branch
- Checks cross-ticket auth and trust boundary interactions
- Validates that combined data flows don't introduce new vulnerabilities
- Reviews integration test results for security implications

Include ALL prior security scan reports (from Phase 3) in the agent prompt so it can focus on integration-level concerns.

For each merged ticket, run security review on the integrated epic branch (PARALLEL — read-only):

```
For each merged ticket (parallel):
  Spawn Agent:
    - agent: security-engineer-agent
    - prompt: [ticket context + full codebase access on epic branch (epic/[epic-id])]
    - Include: the epic context bundle, ticket context, all prior phase reports
```

### 5.2 Handle Security Results and Close Tickets

**Present results for approval:**
```
Security review passed for [N] tickets. Ready to close:

| Ticket | Pre-Merge Scan | Post-Merge Review | Codex Review |
|--------|---------------|-------------------|--------------|
| CON-42 | PASS | PASS | Completed |
| CON-43 | PASS | PASS | Skipped (rate limit) |

Close these tickets in Linear? [Yes / No / Review individually]
```
WAIT for user approval.

**For each ticket that PASSES (and user approves):**

1. Post the security review report:
   ```
   Use mcp__linear-server__create_comment:
     - issue_id: [ticket-id]
     - body: "## Security Review Report\n\n[Full security agent report]\n\n---\n*Automated by /epic-swarm — Post-Merge Security Review*"
   ```

2. Add security-approved label:
   ```
   Use mcp__linear-server__update_issue:
     - issue_id: [ticket-id]
     - labelNames: [add "security-approved"]
   ```

3. Close the ticket — update status to Done:
   ```
   Use mcp__linear-server__update_issue:
     - issue_id: [ticket-id]
     - state: "Done"
   ```
   This is the **final gate**. Only the post-merge security review closes tickets.

4. Update swarm state: Mark ticket as `closed` with timestamp

**For each ticket that FAILS:**

1. Post the security findings to the ticket
2. Add `security-blocked` label
3. Keep status as "In Progress" — do NOT close
4. Notify user with specific CRITICAL/HIGH findings
5. Update swarm state: Mark ticket as `security-blocked`

---

## Phase 6: Epic Completion

### 6.1 Final Status Report

Post to the epic in Linear:

```markdown
## Swarm Complete

**Epic**: [epic-id] — [title]
**Epic Branch**: epic/[epic-id]
**Duration**: [total time]
**Tiers**: N
**Tickets**: X completed, Y blocked, Z deferred

### Tier Summary
| Tier | Tickets | Status |
|------|---------|--------|
| 1 | CON-42, CON-43, CON-44 | All closed |
| 2 | CON-45, CON-46 | CON-45 closed, CON-46 security fix pending |

### Phase Completion Matrix
| Ticket | Adapt | Impl | Test | Docs | Review | Codex | Security | Checkpoint |
|--------|-------|------|------|------|--------|-------|----------|------------|
| CON-42 | DONE  | DONE | DONE | DONE | DONE   | DONE  | DONE     | PASSED     |
| CON-43 | DONE  | DONE | DONE | DONE | DONE   | SKIP  | DONE     | PASSED     |

### Cross-Model Review Status
| Ticket | Codex Review | Reason |
|--------|-------------|--------|
| CON-42 | Completed | 3 findings auto-fixed |
| CON-43 | Skipped | Codex MCP server not configured |

### Deferred Items
[List any blocked tickets and their blocking reasons]

### Next Steps
- **Review and merge the epic PR** — all work is on branch `epic/[epic-id]`
- Run `/close-epic [epic-id]` for retrofit analysis and follow-up ticket creation
- [If Codex reviews were skipped] Run `/codex-review [ticket-id]` for tickets missing cross-model review
```

### 6.2 Create Epic PR

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

## Quality Assurance
- All tickets passed hard checkpoint (7/7 phase reports verified)
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

### 6.3 Clean Up Remaining Worktrees

Most worktrees are cleaned up per-ticket in Phase 3.5.6. This step handles any remaining worktrees (blocked tickets, interrupted runs):

```bash
for dir in .swarm/worktrees/*/; do
  ticket_id=$(basename "$dir")
  git worktree remove "$dir" --force 2>/dev/null || true
done
```

Worktrees for blocked/pending tickets are preserved for manual intervention unless the user confirms cleanup.

### 6.4 Transition to /close-epic

"All tiers complete. Run `/close-epic [epic-id]` for retrofit analysis, follow-up tickets, and to clean up swarm state."

`/close-epic` deletes `.swarm/state/[epic-id].json` as its final step.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SWARM_AUTO_MERGE` | `false` | Auto-merge without user approval at each ticket checkpoint |
| `SWARM_BASELINE_TESTS` | `true` | Run baseline tests in each worktree before starting |
| `SWARM_CONFLICT_STRATEGY` | `stop` | Merge conflict handling: `stop` or `auto-trivial` |

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

The swarm orchestrator validates deferred items as part of Step 3.2.4 (before posting to Linear). For each agent report:

1. Extract all acceptance criteria from the ticket context file
2. Check each deferred item against the AC list (fuzzy match on key terms)
3. If ANY deferred item matches an AC → reclassify as `AC-DEFERRED`
4. If ANY `AC-DEFERRED` items exist → **PAUSE ticket for user decision**

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

The `/close-epic` workflow extracts deferred and declined items from ticket comments to generate follow-up tickets. If phase reports are not posted as Linear comments (Gap #1) or if deferred items are not classified (this section), `/close-epic` cannot function correctly.

---

## Error Recovery

### Interrupted Swarm
- Swarm state persisted after every phase event
- Re-run `/epic-swarm [epic-id]` to detect and offer resume
- Completed phases/tickets are not re-executed (checked via swarm state + Linear comments)
- In-progress phases restart for the current ticket

### Failed Merge
- Recorded in swarm state
- User resolves manually
- Re-run swarm to continue

### Rate-Limited Codex Review
- Skip report posted to Linear with `## Cross-Model Review Report` header
- Ticket proceeds to security scan (codex review is not a hard gate)
- Run `/codex-review [ticket-id]` independently later

### Blocked Ticket
- Dependents automatically held
- User intervention required
- After resolution, re-run swarm to continue

### Hard Checkpoint Failure
- Missing reports identified with specific phase names
- User can re-run individual phases or post manual reports
- Ticket cannot merge until checkpoint passes
