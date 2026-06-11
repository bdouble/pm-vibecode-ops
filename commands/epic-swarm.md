---
description: Orchestrate sequential execution of epic sub-tickets using dependency-aware tier scheduling with worktree isolation and full per-ticket workflow pipelines
allowed-tools: Task, Agent, Read, Write, Edit, MultiEdit, Grep, Glob, LS, WebFetch, Bash, Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(cd:*), Bash(mkdir:*), Bash(chmod:*), Bash(mv:*), Bash(cp:*), Bash(ln:*), Bash(touch:*), Bash(rm:*), Bash(test:*), Bash(cat:*), Bash(ls:*), Bash(find:*), Bash(rg:*), Bash(head:*), Bash(tail:*), Bash(pwd:*), Bash(echo:*), Bash(printf:*), Bash(which:*), Bash(jq:*), Bash(sed:*), Bash(awk:*), Bash(tr:*), Bash(sort:*), Bash(uniq:*), Bash(wc:*), Bash(xargs:*), Bash(docker:*), Bash(docker compose:*), Bash(tsc:*), Bash(vitest:*), Bash(jest:*), Bash(biome:*), Bash(eslint:*), Bash(prettier:*), mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__list_comments, mcp__linear-server__save_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
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

### 2. Absolute paths + tool-native working-dir flags — NO compound shell commands

All shell commands MUST use absolute paths and tool-native working-directory flags. Compound shell commands (chains with `&&`, `||`, or `;`) are PROHIBITED because they bypass pre-approved Bash allowlists and cause permission prompts that interrupt automation.

**Use these tool-native flags instead of `cd X && Y`:**
- `git -C <abs-path> <command>` (not `cd <path> && git <command>`)
- `pnpm -C <abs-path> <script>` or `pnpm --dir <abs-path> <script>` (not `cd <path> && pnpm <script>`)
- `npx --prefix <abs-path> <bin>` (not `cd <path> && npx <bin>`)
- `docker compose --project-directory <abs-path> <command>` (not `cd <path> && docker compose <command>`)
- For anything without a `-C`/`--dir`/`--prefix` flag: run two serial Bash calls, not a compound command.

**Background:** The Bash tool does NOT persist the working directory across calls. Each Bash invocation starts at the project root. Relative paths like `.swarm/worktrees/<ticket-id>` fail when the conceptual working directory is elsewhere. Absolute paths + tool-native flags sidestep both issues while avoiding compound-command permission penalties.

**Rules for the orchestrator AND agents:**
- Use absolute paths for ALL Bash commands. Example: `/path/to/project/.swarm/worktrees/<ticket-id>/...`, not `.swarm/worktrees/<ticket-id>/...`
- Never use `&&`, `||`, or `;` to chain shell commands in a single Bash tool call. If you need two actions, issue two Bash calls.
- Prefer tool-native paths (Read, Grep, Glob) which don't depend on the shell working directory at all.
- Agent prompts dispatched by the orchestrator MUST include this rule verbatim — it is embedded in the agent prompt template in §3.2.1.

### 3. Subagents cannot spawn subagents

The orchestrator dispatches all agents directly — it does NOT delegate to `/execute-ticket`. This is a Claude Code platform constraint: the Agent tool is not available to subagents.

### 4. Every phase MUST post a report to Linear AND every completed ticket MUST be closed

**(a) Phase reports.** After every phase completes for every ticket, post the full structured report as a Linear comment via `mcp__linear-server__save_comment`. A phase without a posted report is a phase that never happened. **Invoke the `swarm-phase-reporting` skill at every phase completion point** — it provides templates, validation, and anti-rationalization guidance.

**(b) Ticket closure.** After a ticket clears the hard checkpoint, merges to the epic branch, passes post-merge integration tests, and the epic branch is pushed, the orchestrator MUST mark the Linear ticket as **Done** via `mcp__linear-server__update_issue` (see §3.5.6 for the exact step). The orchestrator inherits this responsibility from `/security-review`, which is the only OTHER command in this workflow that closes tickets — and which is NOT invoked by the swarm. A ticket that completes all 7 phases and merges successfully but is left in "In Progress" is a workflow defect.

### 5. Codex findings MUST be resolved, not ignored

When Codex review returns P1-P3 findings, present them to the user, get decisions, and apply fixes. **Invoke the `codex-finding-resolution` skill before processing any Codex results** — it defines the full resolution process.

### 6. ALL phases applicable to the assigned profile must run — no autonomous skipping

Every ticket is assigned exactly one workflow profile (`MINIMAL`, `STANDARD`, or `STRICT`) by §1.5.7 Profile Selection. The orchestrator MUST run every phase in the assigned profile's phase list. Phases NOT in the active profile's list MUST still receive an N/A report on the ticket (see §3.2.5b) so the hard checkpoint can verify the complete header set.

The active profile's phase list:
- **MINIMAL** (3 phases): adaptation, implementation, codereview
- **STANDARD** (7 phases): adaptation, implementation, testing, documentation, codereview, codex-review, security-review
- **STRICT** (7 phases): identical to STANDARD with NO profile reclassification permitted mid-execution

The ONLY ways a phase in the active profile does not run for a ticket are:
- The ticket BLOCKS at a prior phase (agent returns BLOCKED/NEEDS_CONTEXT)
- The user explicitly approves a skip when prompted at a blocking condition
- Codex review server is unavailable (posts explicit skip report — the phase still "runs")

**Profile reclassification is a one-shot decision in §1.5.7.** Once a profile is assigned, the orchestrator MUST NOT downgrade it mid-execution (e.g., STANDARD → MINIMAL). Upgrading STANDARD → STRICT requires explicit user approval. STRICT tickets CANNOT be downgraded.

**If you find yourself reasoning that a phase in the active profile is "unnecessary," "already handled," "redundant," or "covered by implementation" — STOP. You are violating this constraint.** Tests written during implementation do NOT substitute for the testing phase. Implementation-generated docs do NOT substitute for the documentation phase. Run every phase in the active profile. Post every report. For phases not in the active profile, post the N/A report per §3.2.5b — never silently omit.

**Evidence for why this exists:** Prior production epic-swarm runs had the orchestrator skip 5 of 7 phases, marking all tickets Done after implementation alone. The original fix was Constraint #6 forcing all 7 phases. That overcorrected for small-scope tickets (typo fixes, doc-only, lockfile updates, etc.). The current design preserves the original failure-mode fix (hard checkpoint validates that all expected headers exist) while allowing objectively trivial work to skip phases that would add no value. The profile is selected by the orchestrator from objective signals, recorded in observability, and audit-trailed via N/A reports — there is no silent skipping. See `skills/using-pm-workflow/references/workflow-profiles.md` for the profile definitions and selection criteria.

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

**Evidence for why this exists:** A prior swarm session — orchestrator re-ran `tsc --noEmit` four times for a single ticket chasing stale LSP diagnostics that were already invalidated by the worktree teardown. Every check came back clean.

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

### 10. Context efficiency and quality gates (Current Frontier Models)

These counter-measures target failure modes still documented for current frontier models — fabricated completion claims, intent-without-action stalls, output verbosity (evidence and per-countermeasure retirement conditions: `docs/MODEL_CALIBRATION.md`). The artifact-evidence checks below are the best-supported guardrail class in the toolkit: fabricated status reports are the one agentic failure that has *worsened* with model capability.

**10a. Hard phase-completion checkpoint before marking any ticket Done.** Constraint #4 already requires all 7 phases and a Linear report per phase. Enforce it mechanically: BEFORE any `mcp__linear-server__update_issue(state='Done')` call for a ticket, verify that you have dispatched 7 phase agents for this ticket AND posted 7 structured reports to Linear for this ticket in this session. Count them. If the count is < 7, do NOT mark the ticket Done — post a `state='In Progress'` update with a `phase-incomplete` label, HALT the swarm, and report to the user which phases are missing. This rule supersedes any pressure you feel from context bloat to "just move on."

**10b. Scope context-bundle generation to in-scope tickets only.** When the user scopes the swarm to a specific phase or tier (e.g., "Phase 1 only", "--tier 2"), skip Phase 1.5 context-bundle writes for tickets outside the declared scope. Bundles for out-of-scope tickets waste disk and compute and leave stale context if the epic's scope changes before they are used.

**10c. Do NOT re-fetch posted reports via `list_comments`.** Once you have received a phase report from a subagent, you already hold it in your context AND posted it to Linear. Do not call `mcp__linear-server__list_comments` during subsequent phase dispatches to "re-ingest" prior reports for the next agent. Instead, persist each received report to `.swarm/context/<epic-id>/reports/<ticket-id>/<phase>.md` (write the raw report content, nothing else) and include the FILE PATH in the next phase agent's prompt. The agent will Read the file if it needs the content. Forensic analysis of a 6-ticket epic-swarm run showed this re-fetch loop accounted for ~300 KB of duplicated context.

**10d. Observability logging (v5.0 expanded schema — 17 event types).** Emit JSONL events to `.swarm/observability/<epic-id>/<ticket-id>.jsonl` using the common envelope `{ts, epic_id, ticket_id, phase, event, data}`. Canonical reference: `commands/references/observability-schema.md`. The pre-v4.7 single-line per-phase record is now the `phase_completed` event in the expanded catalog. Required emissions during a tier execution: `phase_started` before each agent dispatch, `phase_completed` after each report parse, `phase_skipped_na` for each N/A posted in §3.2.5b, `deferral_redispatch` / `deferral_accepted` at §3.6 branches, `convention_guard_check` after each Code Review report parse (arrays from the report's Convention Guard Verification section), `codex_finding_resolved` / `codex_scope_escape` at §3.8 per finding, `ticket_completed` at §3.5.6 after Linear set to Done, `ticket_failed` on any halt. The schema doc enumerates payloads and emission points exhaustively.

**10e. Re-dispatch on empty Write/Edit count.** If an implementation/testing/documentation agent returns `Status: DONE` but its reported `write_calls + edit_calls == 0`, the agent declared sufficiency without acting. Re-dispatch the same phase with the directive `PRIOR DISPATCH PRODUCED NO ARTIFACTS. Your next tool call must be Write or Edit. Do not explore further.` appended to the prompt. If the second dispatch also returns zero artifacts, HALT and surface to the user.

**10f. Report-size verification.** Agents are instructed to keep structured reports under 6,000 characters (10,000 for epic-closure). If a received report exceeds the cap by >50%, log a warning to observability and proceed — but do not attempt to re-invoke just for length.

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

**Mark epic as In Progress and sub-tickets as Todo:**
```
Use mcp__linear-server__update_issue:
  - issue_id: [epic-id]
  - state: "In Progress"
```
Skip if the epic is already "In Progress."

Then, for each sub-ticket that is in Backlog or Triage status:
```
Use mcp__linear-server__update_issue:
  - issue_id: [ticket-id]
  - state: "Todo"
```
Skip tickets already in Todo, In Progress, Done, or Cancelled.

### 1.2 Check for Existing Swarm State

**Resolve canonical paths (worktree-safe)** so the swarm and any concurrent `/execute-ticket` invocation share the same absolute lock file. `git rev-parse --show-toplevel` returns the worktree root when called from inside a worktree, which would put `.swarm/.locks/...` in the worktree and break the shared lock with `/execute-ticket` running from the main checkout. Using `git-common-dir` (which points at the shared `.git` for the main repo even from a worktree) keeps all swarm bookkeeping in the main checkout regardless of cwd.

```bash
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)"
git_common_dir="$(cd "$git_common_dir" 2>/dev/null && pwd)"
REPO_ROOT="${git_common_dir%/.git}"
REPO_ROOT="${REPO_ROOT%/.git/}"
[ -z "$REPO_ROOT" ] && REPO_ROOT="$(git rev-parse --show-toplevel)"

state_file="$REPO_ROOT/.swarm/state/[epic-id].json"
ORCH_LOG="$REPO_ROOT/.swarm/orchestrator-log-[epic-id].md"
LOCK_FILE="$REPO_ROOT/.swarm/.locks/[epic-id].lock"

if [ -f "$state_file" ]; then
  echo "Existing swarm state found for [epic-id]."
  echo "Current tier: N, Completed tickets: X/Y"
fi
```

If state exists, ask user: **Resume from where it left off?** or **Start fresh?**

**Note on `/execute-ticket`-seeded state.** When a user runs `/execute-ticket` against a sub-ticket of this epic before this swarm session ever runs, `/execute-ticket` Step 1.6.3 seeds `state_file` with a minimal skeleton (`{epicId, created, source:"execute-ticket", tickets:{...}, config:{seededBy:"execute-ticket"}}`). The `[ -f "$state_file" ]` check above will treat that skeleton as an existing session and prompt the user. Choose **Resume** — the swarm will read this state in §1.7 (guarded by `[ ! -f ]`) and merge tier-plan/dependency data without overwriting the `tickets` map that `/execute-ticket` already wrote.

**When resuming: auto-close prior-session tickets that completed but weren't closed.**

Some tickets may be in "In Progress" in Linear despite having completed all 7 phases in a prior session (e.g., because the session ended before ticket-closure logic was added). Do NOT ask the user what to do with these — close them automatically:

1. For each ticket marked as `merged` in the swarm state file but still "In Progress" in Linear:
   a. Fetch the ticket's Linear comments (`mcp__linear-server__list_comments`)
   b. Verify all 7 required report headers exist (same check as hard checkpoint §3.3)
   c. Verify the security scan report contains `Status: PASS`
   d. If all reports present + security PASS → mark Done: `mcp__linear-server__save_issue(id=ticket-id, state="Done")`
   e. Log: "Auto-closed [ticket-id] from prior session (all 7 reports verified)"
2. If any report is missing or security didn't PASS, leave the ticket as-is and log a warning.
3. Do NOT use `AskUserQuestion` for this — the hard checkpoint verification is sufficient.

**When resuming: Read existing state files before writing.**

The `.swarm/orchestrator-log-[epic-id].md` and `.swarm/state/[epic-id].json` files already exist from the prior session. Read them first before writing updates. The Write tool rejects writes to files that haven't been read.

**Path convention reminder (Tier 4 canonicalization, v4.7):** The orchestrator log is per-epic, named `.swarm/orchestrator-log-[epic-id].md`. The pre-v4.7 spec referenced an unsuffixed `.swarm/orchestrator-log.md`; on-disk evidence (PRO-1156) and the v4.7 epic-awareness work both use the per-epic suffixed form. Use the suffixed form everywhere in this command. Solo `/execute-ticket` runs write to `.swarm/orchestrator-log-tickets/[ticket-id].md`.

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

**Model requirement:** This step MUST be performed by the orchestrator session itself (Opus or Sonnet). Do NOT delegate context bundle generation to a sub-agent — weaker models are MORE likely to summarize content instead of copying it. If the epic has many tickets, batch the Linear API calls but keep the orchestrator as the writer of all context files. The context bundle is the single highest-leverage artifact in the workflow; a summarized bundle produces wrong implementations across every ticket in the epic.

**1.5.1 Gather epic-level context from Linear:**
- Epic description (full, verbatim — do NOT summarize)
- ALL epic comments (full, verbatim, chronological)
- Extract every referenced document path and URL from the epic body and comments
- Extract ALL acceptance scenarios (GIVEN/WHEN/THEN blocks), numbered acceptance criteria, and "Definition of Done" sections from the epic description — these are epic-level requirements that agents need
- Extract business context: product positioning, competitive analysis, user impact, risk assessments, and strategic rationale from the epic description and comments — these inform implementation judgment calls (e.g., performance targets, UX tone, scope boundaries)

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

Write ALL gathered context to `.swarm/context/{epic-id}/epic-context.md` using the following **procedural copy steps**. Each step is a discrete copy operation — paste the source text directly, do NOT rewrite or rephrase it.

**Epic context file — procedural copy steps:**

**Step E1: Header**
Write to `.swarm/context/{epic-id}/epic-context.md`:
```
# Epic Context Bundle: [epic-id]
Generated: [timestamp]
```

**Step E2: Copy epic description**
- Source: The FULL `description` field returned by `mcp__linear-server__get_issue` for the epic
- Target section header: `## Epic Description`
- Copy rule: Paste the ENTIRE description field as-is. Do NOT read it and rewrite it in your own words. Do NOT summarize. Copy the raw string character-for-character. If the description is 60 lines, this section must be 60 lines.

**Step E3: Copy epic comments**
- Source: ALL comments returned by `mcp__linear-server__list_comments` for the epic
- Target section header: `## Epic Comments (chronological)`
- Copy rule: For each comment, write the author, timestamp, and FULL body text. Do NOT condense multiple comments into a summary paragraph.

**Step E4: Copy epic acceptance scenarios**
- Source: Extract from the epic description — ALL GIVEN/WHEN/THEN blocks, ALL numbered acceptance criteria, ALL "Definition of Done" or "Success Criteria" sections
- Target section header: `## Epic Acceptance Scenarios`
- Copy rule: Copy every scenario block exactly as written in the description. These are epic-level requirements that agents use to verify end-to-end behavior. If no acceptance scenarios exist, write: "No epic-level acceptance scenarios found in description."

**Step E5: Copy business context**
- Source: Extract from epic description, comments, or referenced documents — product positioning, competitive analysis, user impact, risk assessments, strategic rationale, performance targets, UX constraints
- Target section header: `## Business Context`
- Copy rule: Copy relevant sections verbatim. If business context appears in a referenced document, copy the specific sections (not the whole document — that goes in Step E6). If no business context found, write: "No business context in epic description or references."

**Step E6: Copy referenced documents**
- Target section header: `## Referenced Documents`
- For EACH document path or URL found in the epic body and comments:
  ```
  ### [document-name] — [PRESCRIPTIVE|CONTEXTUAL]
  Source: [file path or URL]
  
  [FULL document content pasted here]
  ```
- Copy rule: Paste the ENTIRE file/page content. Do NOT excerpt or summarize. For files over 500 lines: include the FULL content (the Write tool has no practical limit). PRESCRIPTIVE documents (requirements, specs, schemas) are NEVER truncated under any circumstances.

**Step E7: Copy interface contracts**
- Target section header: `## Interface Contracts`
- Copy rule: Include full interface/type definitions from planning metadata, not prose descriptions of them.

**Step E8: Log fetch failures**
- Target section header: `## Fetch Failures`
- For each URL or file that could not be read: log path, error message, timestamp.

---

**Per-ticket context files — procedural copy steps:**

For EACH ticket in the swarm scope, create `.swarm/context/{epic-id}/{ticket-id}.md` using these steps:

**Step T1: Header**
```
# Ticket Context: [ticket-id] — [title]
```

**Step T2: Copy ticket description**
- Source: The `description` field from `mcp__linear-server__get_issue` for this ticket
- Target section: `## Ticket Description`
- Copy rule: Paste the ENTIRE description. Every line. Every table. Every code block. Every bullet point. Nothing omitted. If the source description is 60 lines, this section is 60 lines.
- ANTI-PATTERN: Writing "This ticket implements X by doing Y" is summarization. The section must contain the raw description text from Linear, not your interpretation of it.

**Step T3: Copy acceptance criteria**
- Source: Extract from the ticket description — look for sections labeled "Acceptance Criteria", "AC", "Definition of Done", "Requirements", or numbered/bulleted lists that define what "done" means
- Target section: `## Acceptance Criteria`
- Copy rule: Copy EVERY criterion on its own line, preserving original numbering or bullet format. Include ALL criteria — do not filter by perceived importance. If the source has 16 acceptance criteria, this section has 16 items.

**Step T4: Copy warnings and anti-patterns**
- Source: Extract from the ticket description — scan for sections or lines containing: "Do NOT", "DO NOT", "MUST NOT", "Never", "Warning", "Anti-pattern", "Anti-duplication", "Gotcha", "Pitfall", "Important:", "CRITICAL:", "NOTE:"
- Target section: `## Warnings & Anti-Patterns`
- Copy rule: Copy each warning/constraint VERBATIM with its surrounding context. These are the most important guardrails for agent behavior — they prevent the exact mistakes agents are most likely to make. Omitting them causes the errors they were written to prevent.
- If no explicit warnings found, write: "No explicit warnings or anti-patterns in ticket description."

**Step T5: Copy technical notes**
- Source: Extract from the ticket description — implementation notes, architecture decisions, technical constraints, suggested approaches, reuse strategy
- Target section: `## Technical Notes`
- Copy rule: Copy full text of technical sections including any reuse strategy, anti-duplication strategy, or architectural guidance.

**Step T6: Copy implementation steps**
- Source: Extract from the ticket description — numbered implementation steps, task lists, ordered work items
- Target section: `## Implementation Steps`
- Copy rule: Copy every step with its FULL description. Do NOT reduce "1. Create the service with methods X, Y, Z supporting parameters A, B, C" to "1. Create the service." Each step's detail is implementation guidance that prevents ambiguity.
- If no implementation steps found, write: "No explicit implementation steps in ticket description."

**Step T7: Copy ticket comments**
- Source: ALL comments from `mcp__linear-server__list_comments` for this ticket
- Target section: `## Ticket Comments (chronological)`
- Copy rule: Each comment with author, timestamp, full body. Include revision history comments — these explain WHY decisions changed.

**Step T8: Copy ticket-specific references**
- Source: Any documents or URLs referenced in this ticket's description or comments that were not already included in the epic-level context
- Target section: `## Ticket-Specific References`
- Copy rule: Full content, same rules as epic-level Step E6.

**Step T9: Copy referenced code patterns**
- Source: If the ticket description references existing code patterns, files, or implementations (e.g., "follow the pattern in src/services/auth.ts", "similar to the UserProfile component", "reuse X from Y"), read those files
- Target section: `## Referenced Code Patterns`
- For each referenced file:
  ```
  ### [file-path]
  Referenced as: "[quote from ticket describing how to use this pattern]"
  ```[language]
  [file content or relevant section]
  ```
  ```
- Copy rule: Include enough of the referenced file to understand the pattern — minimum: the function/class/component being referenced. If the reference is vague ("follow existing patterns"), include the closest matching file from the ticket's predicted Files Touched list.
- If no code patterns referenced, write: "No code patterns referenced in ticket description."

**Step T10: Adaptation scope**
- Target section: `## Adaptation Scope Decisions`
- If resuming and adaptation is complete, include deferred items from the adaptation report.
- Otherwise: "Pending — populated after adaptation phase."

---

**CONTEXT BUNDLE ANTI-SUMMARIZATION RULES:**

These rules exist because adversarial analysis of real context bundles proved that writing "VERBATIM" 12 times in the instructions did not prevent the orchestrator from summarizing. The procedural steps above are designed to make summarization structurally difficult, but these rules provide additional guardrails:

1. **NEVER** write a section that starts with "This ticket..." or "The epic..." followed by your interpretation. Those are summaries. Paste the source text directly.
2. **NEVER** reduce a multi-line list to a shorter list. If the source has 16 acceptance criteria, the target has 16 acceptance criteria.
3. **NEVER** replace a table with prose. If the source has a table of IDs, the target has the same table.
4. **NEVER** omit sections because they seem "obvious" or "standard." The agent reading this file has zero prior context.
5. **NEVER** write "see [document] for details" without ALSO including the document content. Pointers without content are context holes.
6. **Line count check**: After writing each per-ticket file, compare the line count of the ticket's Linear description against the `## Ticket Description` section in the file. If the target has fewer than 80% of the source lines, you have summarized — re-copy from source.
7. If a research brief says "copy the implementation pattern from [source]", the source content MUST be in the bundle.
8. If a ticket says "follow the approach in [document]", the document MUST be in the bundle.
9. These context bundles are read by FRESH agent instances that have never seen the epic, the tickets, or any prior conversation. Everything they need must be in the file. There is no "they'll figure it out" — there is only "it's in the file or it's lost."

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

**1.5.6 Context Bundle Fidelity Verification (MANDATORY)**

After writing all context files, verify that the bundles are faithful copies, not summaries. This step is the context equivalent of the Hard Checkpoint (§3.3) — it catches the most common orchestrator failure mode (summarization) before agents consume the bundles.

**Epic context verification:**
1. Re-fetch the epic description from Linear (fresh `mcp__linear-server__get_issue` call — do not reuse cached data)
2. Read the `## Epic Description` section from `epic-context.md`
3. Compare line counts:
   - Source lines (from Linear API): [N]
   - Bundle lines: [M]
   - Ratio: M/N
4. If ratio < 0.8: **FAIL** — the description was summarized. Re-copy from source using Step E2.
5. Spot-check: Read the LAST 5 lines of the source description. Verify they appear in the bundle. If missing: **FAIL** — content was truncated.

**Per-ticket context verification (for each ticket):**
1. Re-fetch the ticket description from Linear (fresh API call)
2. Read the `## Ticket Description` section from `{ticket-id}.md`
3. Line count comparison (same threshold: 0.8 ratio minimum)
4. Spot-check: Find any "Do NOT" or "MUST NOT" phrases in the source description. Verify each appears in the bundle's `## Warnings & Anti-Patterns` section.
5. If the ticket description contains numbered acceptance criteria: count them in the source vs. the `## Acceptance Criteria` section. All must be present.

**Referenced document verification:**
1. For each PRESCRIPTIVE document in the bundle:
   - Read the original file (re-read, fresh)
   - Compare line count of original vs. bundle copy
   - If ratio < 0.8: **FAIL** — document was summarized. Re-copy in full.
2. For any document over 200 lines where the bundle copy is under 50 lines: **AUTOMATIC FAIL** — a 200+ line document cannot be faithfully represented in 50 lines.

**Verification report (display to orchestrator log):**
```
Context Bundle Fidelity Check: [epic-id]

| Source | Source Lines | Bundle Lines | Ratio | Status |
|--------|-------------|-------------|-------|--------|
| Epic description | 45 | 44 | 0.98 | PASS |
| [ticket-id] description | 62 | 60 | 0.97 | PASS |
| [ticket-id] description | 38 | 35 | 0.92 | PASS |
| [spec-document.md] | 457 | 455 | 1.00 | PASS |
| Warnings extracted | 8 found | 8 in bundle | 1.00 | PASS |

Result: ALL PASS — context bundles verified
```

If ANY check fails: re-copy the failed source using the procedural steps above. Do not ask the user — this is automated self-correction. Only surface failures to the user if re-copying also fails (indicating a tool or API error).

Ensure `.swarm/` is gitignored:
```bash
git check-ignore .swarm/ || echo ".swarm/" >> .gitignore
```

### 1.5.7 Profile Selection (per ticket — one-shot decision)

For EVERY ticket entering the swarm, assign exactly one workflow profile that governs which phases run for this ticket. The assignment is recorded in observability and surfaced via a Linear comment for human audit. Reference: `skills/using-pm-workflow/references/workflow-profiles.md`.

**Profile assignment algorithm (run in order):**

1. **If `--strict` flag was passed to `/epic-swarm`** → assign `STRICT` to every ticket. Stop.
2. **If `--profile <name>` flag was passed** → assign that profile to every ticket. Stop.
3. **Else evaluate MINIMAL criteria for this ticket (ALL must match):**
   - Ticket has at least one of these Linear labels: `docs-only`, `typo`, `config-only`, `comment-only`, `lockfile`, `lint-only`, `readme-only`, `error-message-wording`, `dep-bump-patch`
     - OR ticket title/description matches one of these keyword patterns: `"fix typo"`, `"update README"`, `"doc fix"`, `"docs only"`, `"config tweak"`, `"comment only"`, `"rename variable"`, `"lockfile update"`, `"lint fix"`, `"error message wording"`
   - No acceptance criterion mentions: logic, behavior, API, endpoint, query, mutation, authentication, authorization, validation, test coverage, performance, security
   - Estimated change scope: <30 lines net, 1-3 files affected (use the ticket's stated scope or planning metadata; if not present, default to STANDARD)
   - No new dependencies introduced (label or description signals)
   - No schema changes (DB, GraphQL, OpenAPI, JSON Schema, Zod — label or description signals)
   - If ALL criteria match → assign `MINIMAL`. Else → assign `STANDARD`.

**Record the profile decision:**

1. Append to `.swarm/observability/[epic-id]/[ticket-id].jsonl`:
   ```json
   {"ts": "<iso8601>", "event": "profile_assigned", "profile": "MINIMAL|STANDARD|STRICT", "criteria_matched": ["<list>"], "selection_source": "flag|auto"}
   ```
2. Post a Linear comment on the ticket with title `## Profile Assignment` containing:
   - The assigned profile
   - The selection source (CLI flag vs. auto-detected from criteria)
   - The matched criteria (verbatim)
   - The expected phase list for this profile
   - A brief reasoning paragraph if MINIMAL (so the user can override before phase execution begins)

3. Persist to `.swarm/state/[epic-id].json` under `tickets.<ticket-id>.profile`:
   ```json
   { "tickets": { "<ticket-id>": { "profile": "STANDARD" } } }
   ```

**Profile reclassification is one-shot.** Once recorded above, the orchestrator MUST NOT change a ticket's profile mid-execution. A downgrade STANDARD → MINIMAL is prohibited under any condition. An upgrade STANDARD → STRICT requires explicit user approval surfaced via `AskUserQuestion` at the moment of escalation.

**Idempotency:** When resuming an existing swarm, read the persisted profile from state and DO NOT re-run the algorithm. Profile is set once per ticket per swarm lifecycle.

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
mkdir -p "$REPO_ROOT/.swarm/state"
git check-ignore "$REPO_ROOT/.swarm/" || echo ".swarm/" >> "$REPO_ROOT/.gitignore"
```

**Initialize state if absent; otherwise enrich the existing file.** A prior `/execute-ticket` invocation against a sub-ticket of this epic may have seeded `state_file` with a minimal skeleton (`{epicId, created, source:"execute-ticket", tickets:{...}}`). The unconditional write below would clobber that `tickets` map. Use a `[ ! -f ]` guard for fresh init, and `jq` for the enrichment path when the file already exists.

```bash
mkdir -p "$REPO_ROOT/.swarm/.locks"

if [ ! -f "$state_file" ]; then
  ( flock -x 200
    if [ ! -f "$state_file" ]; then
      cat > "$state_file" << 'EOF'
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
  "tickets": {},
  "config": {
    "maxParallel": 4,
    "autoMerge": false,
    "conflictStrategy": "stop",
    "seededBy": "epic-swarm"
  }
}
EOF
    fi
  ) 200>"$LOCK_FILE"
else
  # State already exists — likely seeded by /execute-ticket or a prior swarm session.
  # Enrich the file in place: add any fields the swarm needs (epicBranch, tiers, etc.)
  # WITHOUT touching .tickets or .config.seededBy that an earlier writer set.
  ( flock -x 200
    tmp=$(mktemp)
    trap "rm -f '$tmp'" EXIT
    if jq --arg branch "epic/[epic-id]" --arg ts "[timestamp]" '
         . + {
           epicBranch: (.epicBranch // $branch),
           startedAt:  (.startedAt  // $ts),
           currentTier: (.currentTier // 1),
           tiers:        (.tiers        // []),
           pendingCodexReviews: (.pendingCodexReviews // []),
           contextBundlePath:   (.contextBundlePath   // ".swarm/context/[epic-id]/"),
           detectedBuildSystem: (.detectedBuildSystem // null),
           detectedTestCommand: (.detectedTestCommand // null),
           tickets:      (.tickets      // {}),
           config:       ((.config // {}) + {
             maxParallel:      ((.config // {}).maxParallel      // 4),
             autoMerge:        ((.config // {}).autoMerge        // false),
             conflictStrategy: ((.config // {}).conflictStrategy // "stop")
           })
         }
       ' "$state_file" > "$tmp" && [ -s "$tmp" ]; then
      mv "$tmp" "$state_file"
    else
      echo "ERROR: jq enrichment of $state_file failed — leaving original untouched" >&2
    fi
  ) 200>"$LOCK_FILE"
fi
```

### 1.8 Initialize Orchestrator Notes

`$ORCH_LOG` (resolved in §1.2 to `$REPO_ROOT/.swarm/orchestrator-log-[epic-id].md`) is a persistent file the orchestrator updates after each ticket completes the hard checkpoint. This provides cross-ticket context for adaptation phases in later tiers.

**Concurrency note (Tier 4):** A `/execute-ticket` invocation against a sub-ticket of this epic ALSO writes to `$ORCH_LOG` (per `commands/execute-ticket.md` Step 1.6 + Step 3.7.0 + Step 4). Both surfaces use the shared lock file `$LOCK_FILE` (`.swarm/.locks/[epic-id].lock`, resolved via the same worktree-safe `$REPO_ROOT` derivation on both sides) via the `( flock -x 200 ... ) 200>"$LOCK_FILE"` idiom. Seed the file only if it does not exist — a prior `/execute-ticket` against this epic may have seeded it already.

**Seed template:** the header + a "Generated" timestamp + an explanatory line. No `## Completed Tickets / (none yet)` or `## Cross-Ticket Observations / (none yet)` placeholders: PASSED/FAILED entries are appended at file end (§3.4 Format A/B), which would leave the `(none yet)` placeholder sitting above the actual entries permanently.

```bash
if [ ! -f "$ORCH_LOG" ]; then
  ( flock -x 200
    if [ ! -f "$ORCH_LOG" ]; then
      printf '# Orchestrator Notes — Epic %s\nGenerated: %s\n\nEntries below append in chronological order as tickets complete (Format A for PASSED, Format B for FAILED, one-line tails for per-phase events). Both `/epic-swarm` and `/execute-ticket` write here; both use `flock` on `.swarm/.locks/%s.lock`.\n' \
        "[epic-id]" "[timestamp]" "[epic-id]" > "$ORCH_LOG"
    fi
  ) 200>"$LOCK_FILE"
fi
```

**Purpose:** When ticket B's adaptation phase runs after ticket A is complete, the orchestrator includes the orchestrator notes in the adaptation prompt (§3.2.1 item 8) so the architect-agent can examine what was built and plan accordingly. `/execute-ticket`'s adaptation phase reads the same `$ORCH_LOG` (per its Step 3.3 item 7) when running against an epic sub-ticket, so the cross-ticket continuity benefit is symmetric across both commands.

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
PHASES_BY_PROFILE = {
  "MINIMAL":  ["adaptation", "implementation", "codereview"],
  "STANDARD": ["adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"],
  "STRICT":   ["adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"],
}

# Determine active phase list at start of every ticket loop
PHASES = PHASES_BY_PROFILE[ticket.profile]  # profile set in §1.5.7

# Phases that exist in the full pipeline but are NOT in the active profile
SKIPPED_PHASES = [
  "adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"
] - PHASES

# Agent mapping (unchanged from prior versions — phase → agent)
# adaptation     → architect-agent
# implementation → backend/frontend-engineer-agent
# testing        → qa-engineer-agent
# documentation  → technical-writer-agent
# codereview     → code-reviewer-agent
# codex-review   → MCP tool, not agent
# security-review → security-engineer-agent

For each ticket in the tier (one at a time):

  # Create worktree from CURRENT epic branch (includes all prior ticket merges)
  Create worktree for this ticket (Section 3.0)

  # Profile is read from .swarm/state/[epic-id].json (set in §1.5.7)
  Determine PHASES and SKIPPED_PHASES for this ticket's profile

  # Post N/A reports for skipped phases BEFORE running active phases
  # — this keeps the audit trail intact and ensures the hard checkpoint will find all expected headers
  For each phase in SKIPPED_PHASES:
    Post N/A phase report (see §3.2.5b)

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

# Step 2: Install dependencies — use tool-native working-dir flags (no cd + &&)
if [ -n "$INSTALL_CMD" ]; then
  case "$PKG_MGR" in
    pnpm)   pnpm -C "$worktree" install --frozen-lockfile ;;
    yarn)   yarn --cwd "$worktree" install --frozen-lockfile ;;
    bun)    bun install --cwd "$worktree" --frozen-lockfile ;;
    npm)    npm --prefix "$worktree" ci ;;
    *)      # pip/cargo/go/bundler lack cwd flags — write a setup script and exec it in one Bash call
            printf '#!/usr/bin/env bash\ncd %q\n%s\n' "$worktree" "$INSTALL_CMD" > /tmp/swarm-install.sh
            bash /tmp/swarm-install.sh ;;
  esac
fi

# Step 3: Detect and run code generation / build steps (tool-native flags)
if [ -f "$worktree/package.json" ]; then
  for script in generate codegen prisma:generate db:generate build:types postinstall; do
    if grep -q "\"$script\"" "$worktree/package.json" 2>/dev/null; then
      case "$PKG_MGR" in
        pnpm) pnpm -C "$worktree" run "$script" 2>/dev/null || true ;;
        yarn) yarn --cwd "$worktree" run "$script" 2>/dev/null || true ;;
        bun)  bun run --cwd "$worktree" "$script" 2>/dev/null || true ;;
        npm)  npm --prefix "$worktree" run "$script" 2>/dev/null || true ;;
      esac
    fi
  done
fi
if [ -f "$worktree/Makefile" ] && grep -q "^generate:" "$worktree/Makefile"; then
  make -C "$worktree" generate 2>/dev/null || true
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
| security-review | `security-engineer-agent` |

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

   SHELL COMMAND POLICY — one action per Bash call, no compound shell:
   Never chain commands with `&&`, `||`, or `;`. Compound shell commands
   bypass the pre-approved Bash allowlist and trigger permission prompts
   that interrupt the swarm. Use tool-native working-directory flags:

     WRONG:  cd /absolute/path/to/.swarm/worktrees/[ticket-id] && pnpm test
     RIGHT:  pnpm -C /absolute/path/to/.swarm/worktrees/[ticket-id] test

     WRONG:  cd /absolute/path/to/.swarm/worktrees/[ticket-id] && npx tsc --noEmit
     RIGHT:  npx --prefix /absolute/path/to/.swarm/worktrees/[ticket-id] tsc --noEmit

     WRONG:  cd <wt> && git status
     RIGHT:  git -C /absolute/path/to/.swarm/worktrees/[ticket-id] status

     WRONG:  cd <wt> && docker compose up
     RIGHT:  docker compose --project-directory /absolute/path/to/.swarm/worktrees/[ticket-id] up

   If a tool has NO working-directory flag, issue two serial Bash calls —
   do NOT chain them. This rule is non-negotiable and applies to EVERY
   Bash call you make. The permission-interruption class observed in
   production swarm runs is almost entirely caused by compound commands.

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

   LARGE FILE HANDLING:
   The Read tool rejects files exceeding 10,000 tokens (~500-600 lines).
   Many component files, test suites, and service files exceed this limit.
   Before reading any file you haven't sized, check with: wc -l <path>
   If the file is >500 lines, read it in chunks using offset and limit:
     Read(file_path="...", offset=1, limit=400)
     Read(file_path="...", offset=400, limit=400)
   Or use Grep with output_mode="content" to find the specific section first.

   LINEAR MCP TOOLS — DO NOT USE:
   You do NOT have access to Linear. Do not call any mcp__linear-server__*
   or mcp__claude_ai_Linear__* tools, even if they appear available in your
   session. All Linear state changes (posting reports, closing tickets,
   updating statuses) are handled by the orchestrator that dispatched you.
   Calling these tools causes double-close and double-post bugs.
   ```

2. **Instruction to read context files:**
   ```
   BEFORE doing any work, you MUST read these context files:
   - .epic-context.md (epic-level research, requirements, and reference materials)
   - .ticket-context.md (this ticket's description, AC, technical notes, comments)

   These files contain the FULL verbatim research briefs, requirements documents,
   and reference materials for this work. Read them IN FULL. Do not skim.
   Do not summarize. The specific details in these documents ARE your requirements.

   PAY SPECIAL ATTENTION to these sections in .ticket-context.md:
   - "## Warnings & Anti-Patterns" — these are constraints that prevent wrong
     implementations. Violating any "Do NOT" instruction is a defect.
   - "## Acceptance Criteria" — every criterion must be met. If you defer any,
     classify as AC-DEFERRED in your Deferred Items table with justification.
   - "## Implementation Steps" — if present, follow the prescribed sequence
     unless your adaptation analysis identifies a better approach (document why).
   - "## Referenced Code Patterns" — if present, follow the referenced patterns.
     Import and extend existing code; do NOT duplicate it.
   ```

3. **Ticket identity:** ticket ID, title

4. **ALL prior phase reports for THIS ticket** — pass as file paths, NOT verbatim inline. Per Hard Constraint #10c, after every received phase report the orchestrator persists it to `.swarm/context/<epic-id>/reports/<ticket-id>/<phase>.md` (raw report content, no wrapper). When building the NEXT phase's agent prompt, include a section like:

   ```
   ## Prior Phase Reports (read as needed)
   - /absolute/path/.swarm/context/<epic-id>/reports/<ticket-id>/adaptation.md
   - /absolute/path/.swarm/context/<epic-id>/reports/<ticket-id>/implementation.md
   ```

   The agent will `Read` each file on demand. This avoids the ~300 KB per 6-ticket context bloat that came from inlining verbatim reports. EXCEPTION: if a prior phase report is under 2,000 chars, you MAY inline it verbatim to save the agent a Read round-trip. Reports over 2,000 chars MUST be passed as paths.

   Do NOT call `mcp__linear-server__list_comments` to re-ingest reports you already received from the subagent in this session — you have them. List_comments is for Phase 1 context gathering and resume-from-interruption only.

5. **Phase-specific instructions** from the relevant agent definition. Three phases carry additional doctrine blocks (canonical wording in `commands/execute-ticket.md` §3.3 item 3 — keep the two orchestrators in lockstep):
   - **adaptation**: verify claims against HEAD; Vendor-Surface Discipline for new external dependencies; name the guard (rung + artifact) for any convention the ticket establishes
   - **testing**: the four anti-ballast rules (behavior/contract assertions, real-infra over mock mass, static guards count, ratio discipline)
   - **codereview**: Convention Guard Verification — convention without guard or `[prose-only]` tag → CHANGES_REQUESTED; mandated-but-missing guard → SCOPE_GAP

6. **Interface contracts** that this ticket defines or consumes

7. **Deferred items** from all prior phases for this ticket (full tables, not summaries)

8. **Orchestrator notes** (ADAPTATION PHASE ONLY): Include the full content of `.swarm/orchestrator-log-[epic-id].md` under a header:
   ```
   ## Prior Ticket Work in This Epic
   The following tickets have already been completed in this epic. Their code
   is in your worktree (branched from the epic branch that includes their merges).
   Reference these when planning your implementation approach — look for existing
   patterns, services, and interfaces you can reuse or extend.

   [full orchestrator-log-[epic-id].md content]
   ```

9. **File scope for read-only phases** (codereview, security-review):
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
    e.g., "PROJ-123 adaptation phase", "PROJ-123 implementation phase",
          "PROJ-123 testing phase", "PROJ-123 documentation phase",
          "PROJ-123 code review phase", "PROJ-123 security scan"
```

**Description naming rule (mandatory):**

The Agent dispatch `description` field MUST follow the canonical pattern `"<ticket-id> <phase> phase"` (or `"<ticket-id> security scan"` for the security phase, since "scan" reads better than "phase"). Do not vary the description based on scope ("audit", "focused review", "quick check") — those scope adjustments belong in the agent prompt body, not the description.

**Why:** The description is parsed by downstream tooling (state file scans, transcript analysis, hard checkpoint verification) to identify which phase ran for which ticket. Drift in the description ("PROJ-123 testing audit" vs "PROJ-123 testing phase") breaks parsing and obscures phase identity.

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

**Interpreting the response — CRITICAL:** The MCP tool returns a JSON string. Parse it and check the `"status"` field:
- `"status": "complete"` → success. The `"output"` field contains Codex's findings. **Findings may mention "rate limit" as a code quality issue** (e.g., "Missing rate limit on auth endpoint") — this is a review finding, NOT a rate limit error.
- `"error": "rate_limit"` → actual rate limit from OpenAI. Handle per §3.2.7 (post skip report, continue).
- `"error": "codex_not_found"` or `"error": "codex_error"` → server/CLI issue.

**The word "rate limit" in the `"output"` field of a `"status": "complete"` response is NEVER a rate limit error.** Only `"error": "rate_limit"` at the JSON top level is a rate limit.

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
| Code Review | `Review Status:`, `Requirements Checklist`, `Files Reviewed:`, `Convention Guard Verification` ("None — no conventions established" is valid). If `Pass 1 Result: PASS`, also require `Best Practices Assessment` and `SOLID/DRY Assessment`. After a valid parse, emit the `convention_guard_check` event (per 10d). |
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
Scan the agent's Deferred Items table. For each item, check if it matches an acceptance criterion (fuzzy match on key terms). If a match is found: reclassify as `AC-DEFERRED`. Agents MUST NOT unilaterally defer acceptance criteria. Continue to §3.2.4.5 for the new deferral-justification validation; it determines whether to re-dispatch the agent or pause the ticket.

#### 3.2.4.5 Deferral Validation (catastrophic-justification gate)

After §3.2.4 reclassification, every `AC-DEFERRED` entry must carry a valid `### Deferral Justification (CATASTROPHIC — required)` block. This gate enforces the `no-silent-deferrals` skill at the orchestrator level. **Invoke the `no-silent-deferrals` skill before running this validation** — it defines what counts as catastrophic and which justifications are valid.

**For each Deferred Items table entry in the report:**

1. **If classification is `AC-DEFERRED`:**
   - Search the report for a `### Deferral Justification (CATASTROPHIC — required)` block immediately following the Deferred Items table (within ~30 lines).
   - The block MUST contain these four fields populated with non-empty, non-placeholder values:
     - `Catastrophic condition:` with a value of `1`, `2`, `3`, or `4`
     - `Evidence:` with a concrete external fact (not "complex", "tricky", "would take time", "is hard", "needs more thought")
     - `Confidence the catastrophic condition applies:` with `HIGH`, `MEDIUM`, or `LOW`
     - `Specific blocker that prevents doing the work in this session:` with a factual description (not effort/time language)
   - **If the block is MISSING, malformed, or cites a condition outside 1-4** → `DEFERRAL_INVALID` → re-dispatch (see below).
   - **If the block cites condition #4 (user authorization needed) but the Deferred Item fuzzy-matches an AC** → `DEFERRAL_OVERRIDDEN` → re-dispatch with "this is in scope per AC X" supplemental.

2. **If classification is `DISCOVERED` or `OUT-OF-SCOPE`:**
   - No justification block required, but apply the §3.2.4 AC fuzzy-match. If the item matches an AC, reclassify it to `AC-DEFERRED` and re-run this section.

**Re-dispatch protocol (max 1 re-dispatch per agent per phase):**

```
If DEFERRAL_INVALID or DEFERRAL_OVERRIDDEN and re-dispatch count for this phase == 0:
  1. Increment re-dispatch counter for this phase
  2. Append to the agent prompt:
     ---
     PRIOR DISPATCH DEFERRED IN-SCOPE WORK WITHOUT VALID CATASTROPHIC JUSTIFICATION.
     The following deferrals were rejected by the orchestrator:
     [list each rejected item with the rejection reason]
     Your default disposition is "do the work now". Re-attempt the phase and
     complete the work that was deferred. If a deferral genuinely meets a
     catastrophic condition (1-4 in the no-silent-deferrals skill), include
     the full Deferral Justification block with concrete external evidence.
     ---
  3. Re-invoke the same agent with the supplemented prompt
  4. Re-validate the new report from §3.2.3 onward (full validation cascade)

If re-dispatch count for this phase == 1 and still DEFERRAL_INVALID/OVERRIDDEN:
  PAUSE ticket. Surface to user with the two rejected reports side-by-side.
  Options: [Accept deferral and continue] [Re-dispatch manually with my prompt] [Mark ticket as BLOCKED]
```

Record every re-dispatch in `.swarm/observability/[epic-id]/[ticket-id].jsonl`:
```json
{"ts": "<iso8601>", "event": "deferral_redispatch", "phase": "<name>", "rejection_reason": "DEFERRAL_INVALID|DEFERRAL_OVERRIDDEN", "items": [<item_titles>]}
```

**Why this exists:** Across the last 100+ tickets in this workflow, ~80-90% of deferrals should never have happened. The AC fuzzy-match in §3.2.4 catches deferrals that match an AC, but it does not enforce that the deferral has a valid catastrophic reason. This section is that enforcement.

**Symmetric-additions check (v5.0):** the impact bar applies to *additions* too. Scan the report for **unrequested defensive runtime machinery** — a retry tier, reconciliation job, sweep, recovery cron, or new error-taxonomy layer no AC asked for. If the report doesn't name a concrete **observed** failure it answers plus an activation metric, re-dispatch ONCE with "remove the machinery (or name its observed failure + activation metric); record the idea in the closure-log instead" — same one-retry-then-user escalation as above. See `no-silent-deferrals` → The Symmetric Bar.

#### 3.2.5 Post Report to Linear + Quality Labels

Post the agent's full structured report as a comment on the ticket:

```
Use mcp__linear-server__save_comment:
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

#### 3.2.5b N/A Phase Reports (profile-skipped phases)

For every phase in `SKIPPED_PHASES` (computed in §3 from the ticket's active profile), post a structured Linear comment using the EXACT header the hard checkpoint expects. The comment body documents the skip with the profile reasoning.

**N/A Report template (post one per skipped phase, BEFORE running the first active phase for the ticket):**

```
Use mcp__linear-server__save_comment:
  - issue_id: [ticket-id]
  - body: |
      ## [Phase Name] Report

      Status: N/A — Skipped per [PROFILE] profile

      This phase is not in the active profile's phase list for this ticket.
      Profile selection criteria and reasoning are documented in the ## Profile Assignment
      comment above. The hard checkpoint (§3.3) accepts this N/A report as the
      required header for this phase.

      ---
      *Automated by /epic-swarm — Profile-aware phase skip*
```

**Phase name → header mapping (use the same EXACT headers as §3.2.5):**

| Phase | Required Header in N/A Report |
|-------|-------------------------------|
| testing | `## Testing Report` |
| documentation | `## Documentation Report` |
| codex-review | `## Cross-Model Review Report` |
| security-review | `## Security Scan Report (Pre-Merge)` |

(adaptation, implementation, and codereview run in every profile — they will never appear as N/A.)

**Idempotency:** When resuming a swarm, check Linear comments first. If an N/A report for a given phase already exists on the ticket, do NOT post a duplicate.

**Why this exists:** The hard checkpoint (§3.3) requires all 7 expected headers to exist on the ticket before merge. That requirement is the enforcement mechanism that prevents silent phase-skipping (see Constraint #6 Evidence). The N/A report satisfies that check while documenting the skip with the profile reasoning — preserving the original failure-mode fix.

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
| codex-review | JSON response contains `"error": "rate_limit"` or server unavailable (NOT "rate limit" appearing in successful review findings) | Post skip report (satisfies checkpoint), CONTINUE |
| security-review | CRITICAL/HIGH findings | Pause ticket, break |

**When a ticket is paused:**
- Other tickets in the tier continue through remaining phases
- The paused ticket's worktree is preserved for manual intervention
- Dependents in later tiers remain blocked
- Report the pause to the user with the blocking reason

**When codex-review is unavailable:** Post a skip report to Linear using the `## Cross-Model Review Report` header with status SKIPPED/DEFERRED/FAILED (see `codex-finding-resolution` skill for templates). The ticket continues to security-review. The skip report satisfies the hard checkpoint.

**Canonical phase name + filename (C6 standardization in v4.7):** The phase is named `security-review` in all configuration (PHASES_BY_PROFILE, agent mapping, decision tables) and produces the artifact filename `security-review.md` in `.swarm/context/<epic>/reports/<ticket>/security-review.md`. The Linear comment header `## Security Scan Report (Pre-Merge)` is intentionally NOT renamed — preserving header text protects pre-v4.7 audit-trail grep-ability. The plural-naming gap (phase = `security-review`, header text = `Security Scan Report`) is by design.

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
      "branchName": "feature/[ticket-id]-[slug]",
      "deferred_to": null
    }
  }
}
```

**Allowed `status` values (closed enum):**

| Value | Meaning | Set by |
|---|---|---|
| `pending` | Ticket has not yet started any phase | Initial state |
| `in_progress` | At least one phase has started; not yet at hard checkpoint | Phase dispatch (§3.2) |
| `merged` | Hard checkpoint passed; merged to epic branch | §3.5.5 |
| `closed` | Linear ticket transitioned to Done | §3.5.6 |
| `security-blocked` | Security phase returned CRITICAL/HIGH; ticket paused | §3.2.7 |
| `failed` | Hard checkpoint failed or phase loop halted permanently | §3.4 |
| `deferred` | Work consolidated into a separate ticket; this ticket is closed in favor of the target | §3.x lateral-deferral path (see below) |

**`deferred_to` field (C8 normalization in v4.7):** When a ticket's work is consolidated into another ticket — historically observed as the ad-hoc string `"closed-deferred-to-PRO-1170"` on PRO-1156's PRO-1161 entry — record it as a clean tuple:
```json
{
  "status": "deferred",
  "deferred_to": "PRO-1170"
}
```
NOT as a composite status string. Tooling and `/swarm-stats` queries should be able to filter on `status == "deferred"` without parsing string variants. The `deferred_to` field is `null` for any non-deferred status.

Write the state file IMMEDIATELY after each phase event. This enables resume if the session is interrupted.

### 3.3 Hard Checkpoint Before Merge (MANDATORY)

After all active-profile phases complete for a ticket and before it enters the Phase 4 merge queue, verify that ALL required report headers exist as Linear comments on that ticket. **The required header set is the same across all profiles — N/A reports posted in §3.2.5b count as FOUND.** This is intentional: the checkpoint's job is to verify the audit trail is complete, not to enforce that every phase ran live.

**Required headers (identical for MINIMAL, STANDARD, and STRICT):**
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

**Profile-aware audit:** During the checkpoint, ALSO verify that for every header in the active profile's PHASES list, the corresponding comment does NOT contain `Status: N/A`. A LIVE phase posting an N/A report is a defect — it means the agent silently skipped work. If a phase that should have run posts N/A, FAIL the checkpoint with a clear message: "Phase X is in the active profile but posted N/A. Re-dispatch live."

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

**This checkpoint is non-negotiable.** It is the enforcement mechanism that prevents the phase-skipping failure observed in prior production epic-swarm runs. A ticket cannot merge without all 7 reports.

### 3.4 Update Orchestrator Notes

**After each ticket's phase loop completes — regardless of hard-checkpoint outcome — append an entry to `.swarm/orchestrator-log-[epic-id].md`.** The append runs unconditionally in a finally-style block: a hard-checkpoint failure, a merge conflict, or an agent crash MUST still produce an audit-trail entry. Decoupling the log update from checkpoint success is what prevents the "ticket shipped, log shows '(none yet)'" regression observed in PRO-1156.

**Two entry formats — pick based on outcome:**

**Format A — ticket passed hard checkpoint (success):**
```markdown
### [TICKET-ID] — [title]
**Tier:** [N] | **Completed:** [timestamp] | **Outcome:** PASSED

**Files Created/Modified:**
- [path] ([new/modified]) — [brief purpose]

**Key Interfaces Defined:**
- [interface name]: [key fields or type signature]

**Patterns Used:**
- [pattern description]

**Cross-Ticket Observations:**
- [anything relevant to subsequent tickets — shared services discovered, integration points, etc.]
```

**Format B — ticket failed hard checkpoint, merge, or any phase (failure):**
```markdown
### [TICKET-ID] — [title]
**Tier:** [N] | **Halted:** [timestamp] | **Outcome:** FAILED

**Failure point:** [phase name | "hard checkpoint" | "merge" | "post-merge tests"]
**Reason:** [one-sentence explanation — e.g., "security-review returned CRITICAL finding", "checkpoint found Documentation Report missing", "merge conflict in src/x.ts blocked by user"]

**Phases completed before halt:** [list]
**Phase that halted:** [phase name + last report's Status field]

**Files touched (may be partial):**
- [path] ([new/modified]) — [brief purpose if known]

**Recovery options for the operator:** [text from the pause prompt, if applicable]
```

**Content sources:**
- Files Changed: from the implementation report (or `git -C [worktree] diff --stat` if implementation didn't complete)
- Interfaces: from the adaptation report and worktree diff
- Patterns: from the code review report (if completed)
- Cross-ticket observations: from the orchestrator's own analysis of the ticket's work

**Why both formats matter:** Subsequent tickets' adaptation phases read this log (Step 3.2.1 item 8). A failed ticket's partial work is just as relevant to the architect-agent as a passed ticket's complete work — it surfaces "this surface was attempted and blocked, here's what was built before the halt." Silent dropping of failed tickets from the log was the original bug.

**Append idiom — use flock to serialize with concurrent `/execute-ticket` invocations against the same epic (Tier 4):** `$ORCH_LOG` and `$LOCK_FILE` were resolved in §1.2 using the worktree-safe `$REPO_ROOT` derivation, so `/epic-swarm` (which may run from a worktree) and `/execute-ticket` (running from the main checkout, or from a different worktree) land on the same absolute lock file and the same kernel lock.

**Shared bookkeeping helpers** — these MUST be defined in this `/epic-swarm` shell context (slash commands have independent shells; helpers documented in `commands/execute-ticket.md` Step 1.6.1 are NOT auto-imported here). The orchestrator defines them once before the first §3.4 append and reuses them throughout. The shape is intentionally identical to execute-ticket.md's so a concurrent `/execute-ticket` writing the same `$ORCH_LOG` produces byte-identical Format A/B blocks:

```bash
# entry_exists — multi-line aware idempotency check. Scans $ORCH_LOG for a
# block starting with "### <ticket-id> — " and ending at the next "### " or EOF;
# matches the outcome (and, for FAILED, the halt_phase). A naive line-oriented
# grep would NEVER match — PASSED/FAILED live on line 2, not on the heading.
entry_exists() {
  local id="$1" outcome="$2" halt="${3:-}"
  [ -f "$ORCH_LOG" ] || return 1
  awk -v id="$id" -v out="$outcome" -v halt="$halt" '
    BEGIN { in_block=0; o_ok=0; h_ok=(halt=="") }
    {
      if ($0 ~ "^### "id" — ") { in_block=1; o_ok=0; h_ok=(halt==""); next }
      if (in_block && /^### /) { in_block=0 }
      if (in_block && index($0, "**Outcome:** " out))     { o_ok=1 }
      if (in_block && halt!="" && index($0, "**Failure point:** " halt)) { h_ok=1 }
      if (in_block && o_ok && h_ok) { found=1; exit }
    }
    END { exit !found }
  ' "$ORCH_LOG"
}

# safe_jq_update — atomic jq+mv for state.json with explicit failure surfacing.
safe_jq_update() {
  local target="$1"; shift
  local tmp
  tmp="$(mktemp)" || { echo "ERROR: mktemp failed" >&2; return 1; }
  # shellcheck disable=SC2064
  trap "rm -f '$tmp'" RETURN
  if ! jq "$@" "$target" > "$tmp"; then
    echo "ERROR: jq failed updating $target — leaving original untouched" >&2
    return 1
  fi
  if [ ! -s "$tmp" ]; then
    echo "ERROR: jq produced empty output for $target — refusing to overwrite" >&2
    return 1
  fi
  mv "$tmp" "$target"
}
```

**Append idiom — double-checked locking.** Run `entry_exists` INSIDE the flock subshell. Running it outside (as the prior spec showed) is a TOCTOU race: two concurrent writers both pass the check, both serially acquire the lock, both append, producing duplicate Format A blocks.

```bash
( flock -x 200
  # entry_exists MUST run inside the lock — otherwise concurrent writers race.
  if entry_exists "$TICKET_ID" "PASSED"; then
    exit 0   # subshell return; outer continues
  fi
  cat >> "$ORCH_LOG" << ENTRY
### $TICKET_ID — $ticket_title
**Tier:** $tier_num | **Source:** /epic-swarm | **Completed:** $(date -u +%Y-%m-%dT%H:%M:%SZ) | **Outcome:** PASSED
...
ENTRY
) 200>"$LOCK_FILE"
```

See `commands/execute-ticket.md` Step 1.6.1 for the parallel definitions of these helpers and Step 3.7.0 / Step 4 for their use sites on the `/execute-ticket` side. Both commands MUST define these helpers in their own shell scope and use the same double-checked-locking idiom so concurrent execution stays race-free.

If a previous session wrote a FAILED entry and the current session retried and PASSED, `entry_exists` returns false for PASSED (no prior PASSED block exists), so the new block is appended; the audit trail preserves both attempts.

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

**Emit `ticket_completed` JSONL event** (v4.7 — canonical schema at `commands/references/observability-schema.md`):
```json
{"ts":"<iso8601>","epic_id":"<epic>","ticket_id":"<id>","phase":null,"event":"ticket_completed","data":{"profile":"<MINIMAL|STANDARD|STRICT>","phases_run_live":["<list>"],"phases_na":["<list>"],"wall_clock_seconds":<n>}}
```

**Why this exists:** In the standalone workflow, `/security-review` is the only command that closes tickets. Inside the swarm, the orchestrator runs the security-engineer-agent inline rather than invoking `/security-review` as a subcommand, so the orchestrator inherits the responsibility for closing the ticket. **Without this step, every swarm-completed ticket remains stuck in "In Progress" forever**, requiring manual cleanup.

**Evidence for why this exists:** A prior swarm session — all tickets merged cleanly with full phase reports posted, but none were marked Done. The user had to close them manually.

**3.5.7 Clean up worktree:**
```bash
git worktree remove .swarm/worktrees/[ticket-id] --force 2>/dev/null || true
```

### 3.6 Tier Completion

After all tickets in the tier have been processed (merged or blocked):

**3.6.1 Post tier update to Linear:**
```
Use mcp__linear-server__save_comment on the EPIC:
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
   Use mcp__linear-server__save_comment:
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
- Run `/close-epic [epic-id]` for follow-up discipline (impact bar + boundary question + ≤3 cap) and Considered-but-not-pursued closure-log
- [If Codex reviews were skipped] Run `/codex-review [ticket-id]` for tickets missing cross-model review
```

### 6.1.5 End-of-Epic Deferral Review (proactive, single user question)

After all tiers have completed their merges and §6.1 has posted the Final Status Report, but BEFORE creating the Epic PR (§6.2), aggregate ALL surviving deferred items across every sub-ticket and surface them to the user in a single Linear comment. This is the **one proactive question** at the end of the workflow — never a mid-workflow interruption.

**Step 1 — Collect surviving deferrals across the epic:**

For every sub-ticket in the swarm scope:
1. Fetch all Linear comments via `mcp__linear-server__list_comments`
2. Search each comment body for `Deferred Items` tables
3. For each row, extract: classification, severity, location, issue title, reason
4. If classification is `AC-DEFERRED`, also extract the `### Deferral Justification (CATASTROPHIC — required)` block (if present)
5. Skip rows whose `Issue` text was previously dispositioned by the user (track via `.swarm/state/[epic-id].json` under `tickets.<id>.user_deferral_decisions`)

**Step 2 — Decide whether to post the review comment:**

```
total_deferrals = sum across all tickets
if total_deferrals == 0:
  Post a brief confirmation comment to the epic: "## Deferred Items Review — No surviving deferrals."
  Skip to §6.2.
else:
  Post the structured review comment (Step 3).
```

**Step 3 — Post the consolidated review comment on the EPIC:**

```
Use mcp__linear-server__save_comment:
  - issue_id: [epic-id]
  - body: |
      ## Deferred Items Review — User Decision Required

      The following items were deferred during this epic. Per workflow policy
      (skill: no-silent-deferrals), deferrals are presumed undesirable. Please
      choose a disposition for each before the Epic PR is finalized.

      Total surviving deferrals: [N]
      Tickets affected: [list]

      ---

      ### Item 1: [Issue title]
      - Ticket: [ticket-id] (link)
      - Phase: [phase that posted it]
      - Classification: [AC-DEFERRED | DISCOVERED | OUT-OF-SCOPE]
      - Severity: [CRITICAL/HIGH/MEDIUM/LOW/INFO]
      - Location: [file:line if available]
      - Reason cited by agent: [verbatim]
      - Catastrophic condition cited: [1-4 or "none — silent deferral caught by code review"]
      - Justification: [verbatim Deferral Justification block, or "missing"]
      - **Recommended disposition**: [DO_NOW | ACCEPT_DEFERRAL | NEW_TICKET]
      - Why recommended: [one-line orchestrator reasoning]

      ### Item 2: ...

      ---

      To respond, reply to this comment with a numbered list, e.g.:
        1. DO_NOW
        2. NEW_TICKET
        3. ACCEPT_DEFERRAL
      Or run `/close-epic [epic-id]` which will surface the same questions.
```

**Recommended disposition heuristics (for the "Recommended" field):**

| Condition | Recommended |
|-----------|-------------|
| Classification is `AC-DEFERRED` and justification missing or fails catastrophic test | `DO_NOW` |
| Classification is `AC-DEFERRED` and justification cites condition 1, 2, or 3 with HIGH confidence | `ACCEPT_DEFERRAL` |
| Classification is `DISCOVERED`, severity LOW/INFO | `NEW_TICKET` |
| Classification is `DISCOVERED`, severity MEDIUM or higher | `DO_NOW` |
| Classification is `OUT-OF-SCOPE` | `NEW_TICKET` |
| User has previously disposed this exact item | use the prior disposition |

**Step 4 — Pause and surface to user (terminal):**

```
Deferred items review posted to <linear-comment-url>.
[N] items pending your decision.
Reply with dispositions to continue, or run /close-epic for the same review during epic closure.
```

**Step 5 — Do not block PR creation indefinitely:**

If the user responds with dispositions, apply them: re-dispatch affected phases for `DO_NOW` items; record `ACCEPT_DEFERRAL` items in state; flag `NEW_TICKET` items for `/close-epic` to materialize.

If the user does not respond before the session ends, persist the pending review state and re-surface it on the next swarm session or at `/close-epic`. The Epic PR is still created (§6.2) so the work is reviewable — the deferral review just blocks the eventual transition to "Done" via `/close-epic`.

**Why this exists:** The user has stated that 80-90% of historical deferrals should have been "do it now" decisions. Aggregating and recommending dispositions at end-of-workflow surfaces every deferral to a single decision point, with a recommendation that defaults to action. This complements §3.2.4.5 (per-phase deferral validation) by catching residue that survived the per-phase gate.

### 6.2 Create or Update Epic PR

**First, check if a PR already exists** (common when resuming a swarm that ran across multiple sessions):

```bash
epic_branch="epic/[epic-id]"
existing_pr=$(gh pr list --head "$epic_branch" --json number --jq '.[0].number' 2>/dev/null)
```

**If a PR exists (`$existing_pr` is non-empty):** Update it instead of creating:

```bash
gh pr edit "$existing_pr" \
  --title "Epic: [epic-id] — [epic title]" \
  --body "[full PR body — see template below]"
```

**If no PR exists:** Create one:

```bash
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
default_branch=${default_branch:-main}

gh pr create \
  --base "$default_branch" \
  --head "$epic_branch" \
  --title "Epic: [epic-id] — [epic title]" \
  --body "[full PR body — see template below]"
```

**PR body template:**
```
## Epic Summary

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
*Created by /epic-swarm*
```

Present the PR URL to the user:
```
Epic PR created/updated: [PR URL]

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

"All tiers complete. Run `/close-epic [epic-id]` for follow-up discipline (≤3 tickets max, rest to closure-log) and to clean up swarm state."

`/close-epic` deletes `.swarm/state/[epic-id].json` as its final step.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SWARM_AUTO_MERGE` | `false` | Auto-merge without user approval at each ticket checkpoint |
| `SWARM_BASELINE_TESTS` | `true` | Run baseline tests in each worktree before starting |
| `SWARM_CONFLICT_STRATEGY` | `stop` | Merge conflict handling: `stop` or `auto-trivial` |

---

## Deferred Items and Closure-Log Handling

The default disposition for every in-scope item is **complete the work now**. Agents may document a deferral ONLY when it meets one of the four catastrophic conditions defined in the `no-silent-deferrals` skill. The Deferred Items table exists for traceability of those genuinely catastrophic-justified deferrals plus the residue of out-of-scope discoveries — NOT as a place to park work the agent didn't feel like doing.

**For OUT-OF-SCOPE observations the agent considers as candidates for follow-up tickets**, agents apply the impact bar in `no-silent-deferrals` Part 2:
- If the would-be impact-bar sentence is fillable with specifics → file a ticket (or fix in-branch if cheap).
- If it isn't → record in a `### Considered but not pursued` section in the phase report. This is the closure-log. Do NOT add it to the Deferred Items table.

The closure-log per-ticket entries are aggregated by `/close-epic` into the epic-level Considered-but-not-pursued section.

**Invoke the `no-silent-deferrals` skill before populating a Deferred Items table, a closure-log section, or before the orchestrator runs §3.2.4.5 validation.** The skill defines what counts as catastrophic, the required justification block, the impact bar for would-be tickets, the disqualifying phrasings, and the agent's red-flag phrases that trigger STOP.

**Deferred Items table format (included in every agent report — even when empty):**

| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| [AC-DEFERRED/DISCOVERED/OUT-OF-SCOPE] | [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [file:line] | [Brief description] | [Why deferred] |

**For every AC-DEFERRED entry, the report MUST ALSO include the Deferral Justification block** (see §3.2.4.5 for the required fields). A table entry without the justification block is invalid and triggers re-dispatch.

### Deferred Item Classifications

| Classification | Description | Requires Catastrophic Justification? | Requires User Approval? |
|---------------|-------------|--------------------------------------|------------------------|
| AC-DEFERRED | An explicit acceptance criterion the agent did not implement | **YES — orchestrator re-dispatches if missing** | **YES — ALWAYS** |
| DISCOVERED | A new issue found during the phase, NOT in the original AC and NOT required to fulfill an AC | NO — but if the orchestrator's fuzzy match finds an AC match, it reclassifies to AC-DEFERRED | NO — agent discretion |
| OUT-OF-SCOPE | Work that genuinely belongs to a different ticket (different feature, different domain, not implied by this ticket's AC) | NO | NO — agent discretion |

### Orchestrator Validation Rule

The swarm orchestrator validates deferred items in TWO passes:

**§3.2.4 AC fuzzy-match pass (existing):**
1. Extract all acceptance criteria from the ticket context file
2. Check each deferred item against the AC list (fuzzy match on key terms)
3. If ANY deferred item matches an AC → reclassify as `AC-DEFERRED`

**§3.2.4.5 catastrophic-justification pass (new — see that section for full detail):**
4. For every `AC-DEFERRED` entry, validate the presence and content of the Deferral Justification block
5. If the block is missing, malformed, cites a condition outside 1-4, or uses condition #4 for an item that fuzzy-matches an AC → orchestrator re-dispatches the agent with explicit "do it now" instructions (max 1 re-dispatch per agent per phase)
6. If still invalid after re-dispatch → PAUSE ticket for user decision

**Agents MUST NOT unilaterally defer in-scope work.** Catastrophic conditions are narrow and enumerated; the default disposition is "do the work now."

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
