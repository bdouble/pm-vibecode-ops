---
description: Orchestrate all ticket workflow phases (adaptation → implementation → testing → documentation → codereview → codex-review → security-review) automatically
allowed-tools: Task, Agent, Read, Write, Edit, MultiEdit, Grep, Glob, LS, WebFetch, Bash, Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(cd:*), Bash(mkdir:*), Bash(chmod:*), Bash(mv:*), Bash(cp:*), Bash(ln:*), Bash(touch:*), Bash(rm:*), Bash(test:*), Bash(cat:*), Bash(ls:*), Bash(find:*), Bash(rg:*), Bash(head:*), Bash(tail:*), Bash(pwd:*), Bash(echo:*), Bash(printf:*), Bash(which:*), Bash(jq:*), Bash(sed:*), Bash(awk:*), Bash(tr:*), Bash(sort:*), Bash(uniq:*), Bash(wc:*), Bash(xargs:*), Bash(docker:*), Bash(docker compose:*), Bash(tsc:*), Bash(vitest:*), Bash(jest:*), Bash(biome:*), Bash(eslint:*), Bash(prettier:*), mcp__linear-server__get_issue, mcp__linear-server__list_comments, mcp__linear-server__save_comment, mcp__linear-server__update_issue, mcp__linear-server__search_issues, mcp__codex-review-server__codex_review_and_fix, mcp__codex-review-server__codex_review, mcp__codex-review-server__codex_fix
argument-hint: <ticket-id>
---

# Agentic Ticket Execution Orchestrator

Execute all 6 ticket-level workflow phases automatically for the specified ticket. Pauses only for blocking issues that require user decision.

**Shell command constraint — NO compound commands, use tool-native working-dir flags:** Never chain shell commands with `&&`, `||`, or `;`. Compound commands bypass pre-approved Bash allowlists and trigger permission prompts that interrupt automation. Use tool-native flags instead of `cd`:
- `git -C <abs-path> <command>` (not `cd <path> && git <command>`)
- `pnpm -C <abs-path> <script>` (not `cd <path> && pnpm <script>`)
- `npx --prefix <abs-path> <bin>` (not `cd <path> && npx <bin>`)
- `docker compose --project-directory <abs-path> <command>`

If a tool has no working-dir flag, run two serial Bash calls instead of chaining. This applies to the orchestrator AND to every agent dispatched by this workflow. Agent prompts include this rule verbatim via the agent's own "Operating Constraints (Current Frontier Models)" section.

## Orchestrator Operating Constraints (Current Frontier Models)

These counter-measures target failure modes still documented for current frontier models — fabricated completion claims, intent-without-action stalls, output verbosity (evidence and per-countermeasure retirement conditions: `docs/MODEL_CALIBRATION.md`). The artifact-evidence checks below are the best-supported guardrail class in the toolkit: fabricated status reports are the one agentic failure that has *worsened* with model capability.

1. **Sufficiency-stall detection.** After receiving a phase agent's report, validate its Status block against the reported tool-call counts:
   - If phase is `implementation`, `testing`, or `documentation` AND `Status: DONE` AND `write_calls + edit_calls == 0`: re-dispatch the same phase with `PRIOR DISPATCH PRODUCED NO ARTIFACTS. Your next tool call must be Write or Edit. Do not explore further.` appended. If the second dispatch also reports zero artifacts, HALT and surface to user with options: (a) retry with a stricter "write code now" directive, (b) review manually, (c) reduce scope.
   - If an agent transcript contains ≥30 tool calls but <3 Write/Edit in the last 10 tool uses: pause and surface the transcript to the user.

2. **Reject report-without-artifacts for write phases.** Implementation, testing, and documentation phases MUST produce file changes. A report with zero `Write`/`Edit` calls and `Status: DONE` is a workflow defect — re-dispatch per rule #1 above.

3. **No re-fetch loop.** Once an agent returns a phase report, you already have it in context AND post it to Linear. Do NOT call `mcp__linear-server__list_comments` to re-ingest prior reports for the next phase's prompt. Instead, persist each report to `$REPORTS_DIR/<phase>.md` (the path resolved in Step 1) and pass the FILE PATH to the next-phase agent. The agent Reads it on demand. Epic context resolves to `.swarm/context/<epic-id>/reports/<ticket-id>/<phase>.md`; solo context resolves to `.swarm/context/_solo/<ticket-id>/reports/<phase>.md`.

4. **Observability logging (v5.0 expanded schema — 17 event types).** Emit JSONL events to `.swarm/observability/<epic-id>/<ticket-id>.jsonl` (or `.swarm/observability/_solo/<ticket-id>.jsonl` if no epic context). Every event uses the common envelope `{ts, epic_id, ticket_id, phase, event, data}`. The catalog and emission points are defined in `commands/references/observability-schema.md` — the canonical reference. The pre-v4.7 single-line `phase_completed`-shaped record is now one of seventeen event types; see Step 3 phase loop, Step 3.6 deferral branches, Step 3.8 codex branches, and Step 4 closure for the specific emission points.

5. **Keep your orchestrator narration terse.** Under 4.7's verbosity regression, every extra paragraph you write multiplies across phase transitions. One-sentence status updates between phases: "Phase N complete. Dispatching Phase N+1." No recap, no re-summarization.

## Input

- `$ARGUMENTS` - Linear ticket ID (e.g., `PRJ-123`)

## Phase Sequence

The active phase list depends on the ticket's assigned workflow profile (set in Step 1.5):

| Phase | Agent | MINIMAL | STANDARD | STRICT | Blocking Conditions |
|-------|-------|:-------:|:--------:|:------:|---------------------|
| 1. adaptation | architect-agent | ✓ | ✓ | ✓ | Status: BLOCKED |
| 2. implementation | backend-engineer-agent OR frontend-engineer-agent | ✓ | ✓ | ✓ | Compile errors, duplication detected |
| 3. testing | qa-engineer-agent | — (N/A) | ✓ | ✓ | Gate #0 fail (existing tests broken) OR Gates #1-3 fail (new test issues) |
| 4. documentation | technical-writer-agent | — (N/A) | ✓ | ✓ | Status: BLOCKED |
| 5. codereview | code-reviewer-agent | ✓ | ✓ | ✓ | Status: CHANGES_REQUESTED |
| 5.5 codex-review | *(MCP tool, no agent)* | — (N/A) | ✓ | ✓ | JSON `"error": "rate_limit"` (deferred, not blocking) — "rate limit" in review *findings* is NOT an error |
| 6. security-review | security-engineer-agent | — (N/A) | ✓ | ✓ | CRITICAL/HIGH severity findings |

**Phases marked `— (N/A)` for MINIMAL** post an N/A report (see Step 3.6.0b) with the exact header the resume-detection logic expects, preserving the audit trail.

**Note:** Only `security-review` closes the ticket when no critical/high issues are found in STANDARD/STRICT profiles. In MINIMAL profile, the orchestrator closes the ticket after codereview passes — see Step 3.7.

**Profile selection happens in Step 1.5** based on objective ticket signals. Default is STANDARD. The user can force a profile with `--profile <name>` or `--strict` flags. See `skills/using-pm-workflow/references/workflow-profiles.md` for the full profile definitions and selection criteria.

---

## Step 0: Anchor to the Structured Phase Pipeline (MANDATORY)

**Before ANY investigation, file read, commit, push, or PR work, confirm you are inside a named phase of the pipeline below.** Drift out of the phase pipeline — investigating "for a moment", committing exploratory edits, or pushing branches without a current phase context — produces the regression B6 fingerprint: code ships, Linear is never told, no audit trail exists.

**The pipeline:** Step 1 (Validate) → Step 1.x setup → Step 2 (Resume detect) → Step 3 (Phase loop: adaptation → implementation → testing → documentation → codereview → codex-review → security-review) → Step 4 (Closure) → Step 5 (Summary).

**Drift-recovery rule:** If you find yourself doing exploratory file reads, running git commands against the worktree, or considering a commit WITHOUT a current Step number governing your action, STOP. Either:

a. **Re-enter the pipeline at Adaptation phase** — start a fresh Step 3.x cycle so the work produces a phase report and Linear comment.
b. **Halt and surface to the user** with the question: "I'm about to do exploratory work that doesn't fit the current phase. Should I (a) advance to the next phase, (b) re-enter from Adaptation, or (c) hand back to you?"

There is no third option that ships code. Every Write/Edit/git-commit action MUST trace to a named Step. Every Linear-visible artifact MUST originate from a phase report. If neither is true for what you're about to do, you are drifting out of the pipeline and producing the silent-shipping failure mode B6 was filed against.

**Why this exists:** Session `b224fca9` (2026-05-27) shipped 5 tickets of work where the orchestrator did investigation → commits → push → PR without ever entering a phase. Linear got zero updates. The orch-log got zero updates. State.json shows the work happened; nothing else does. The pipeline IS the audit trail — leaving it silently loses everything.

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

**Extract `TICKET_ID` from `$ARGUMENTS`** (sanitize away flag tokens like `--strict` / `--profile <name>` that Step 1.5 accepts):

```bash
# Pick the first non-flag, non-flag-value token. Linear ticket IDs look like PRJ-123.
TICKET_ID=""
skip_next=0
for tok in $ARGUMENTS; do
  if [ "$skip_next" = "1" ]; then skip_next=0; continue; fi
  case "$tok" in
    --strict)            ;;
    --profile)           skip_next=1 ;;
    --profile=*)         ;;
    --*)                 ;;
    *)                   TICKET_ID="$tok"; break ;;
  esac
done
[ -z "$TICKET_ID" ] && { echo "ERROR: no ticket ID found in arguments: $ARGUMENTS" >&2; exit 1; }
```

This avoids paths and grep patterns being contaminated by flag tokens (e.g. an unsanitized `$ARGUMENTS="PRO-123 --strict"` would create `orchestrator-log-tickets/PRO-123 --strict.md`).

**Extract `epic_id` — and verify the parent is actually an epic.** Linear's `parentId` points at any parent issue, not specifically epics. A sub-task of a Story carries a `parentId` but should NOT route into epic bookkeeping. Probe the parent before treating it as an epic.

```
Read the parentId from the ticket fetched above. If null/absent, leave epic_id UNSET (in bash: do not assign; or assign empty string with epic_id=""). DO NOT write the literal string "null" — bash treats "null" as non-empty and the path-resolution branch below will produce orchestrator-log-null.md / observability/null/ / null.lock paths shared across every parent-less ticket.

If parentId is present:
  1. Fetch the parent via mcp__linear-server__get_issue(parentId)
  2. Treat parentId as an epic ONLY IF ALL of the following hold:
     - parent.parentId is null (epics are top-level — a sub-sub-ticket's grandparent is the epic, not its direct parent)
     - parent has children other than this ticket (a real epic has multiple sub-tickets; if the only child is this ticket, prefer solo and revisit when peer tickets appear)
     - OR the parent has a label matching ^(epic|type:epic|epic:.*)$ (explicit signal overrides the heuristic)
  3. If those checks fail: leave epic_id unset/empty and treat as a solo run. Log to terminal:
     "Parent <parentId> is not an epic (no epic label, or has its own parent, or has fewer than 2 children). Routing to solo bookkeeping."
  4. If they pass: set epic_id=parentId.
```

`epic_id` is used downstream for: all JSONL observability paths (Step 1.5+), the orch-log append path (Step 3.7.x and Step 4), the phase report persistence path (Step 3.3), and the state.json upsert path (Step 4). When `epic_id` is empty/unset, bookkeeping routes to `_solo/` (observability/reports) or `orchestrator-log-tickets/` (orch-log) instead.

**Resolve canonical local-artifact paths from `epic_id`:** Stash these four paths once at the top so every subsequent Step references them consistently. **Use absolute paths derived from the main repo's git-common-dir** — `git rev-parse --show-toplevel` returns the worktree root when called from inside a worktree, which would put locks/orch-logs/state in the worktree (different inode from the main checkout) and break the shared-lock contract with `/epic-swarm`. Using `git-common-dir` keeps all bookkeeping in the main checkout regardless of cwd.

```bash
# git-common-dir returns the main repo's .git (even from a worktree it points at the
# shared .git, not the worktree's .git directory). Resolve to absolute and strip /.git
# to get the main-checkout root.
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)"
git_common_dir="$(cd "$git_common_dir" 2>/dev/null && pwd)"
REPO_ROOT="${git_common_dir%/.git}"
[ -z "$REPO_ROOT" ] && REPO_ROOT="$(git rev-parse --show-toplevel)"  # fallback for non-git contexts

# Defensive: treat the literal string "null" (which Linear's JSON returns for missing
# parents and a literal-minded reader might assign) as absent. Without this, every
# parent-less ticket collides on orchestrator-log-null.md / observability/null/ / null.lock.
[ "$epic_id" = "null" ] && epic_id=""

if [ -n "$epic_id" ]; then
  ORCH_LOG="$REPO_ROOT/.swarm/orchestrator-log-${epic_id}.md"
  REPORTS_DIR="$REPO_ROOT/.swarm/context/${epic_id}/reports/${TICKET_ID}"
  JSONL_PATH="$REPO_ROOT/.swarm/observability/${epic_id}/${TICKET_ID}.jsonl"
  STATE_PATH="$REPO_ROOT/.swarm/state/${epic_id}.json"
  LOCK_KEY="${epic_id}"
else
  ORCH_LOG="$REPO_ROOT/.swarm/orchestrator-log-tickets/${TICKET_ID}.md"
  REPORTS_DIR="$REPO_ROOT/.swarm/context/_solo/${TICKET_ID}/reports"
  JSONL_PATH="$REPO_ROOT/.swarm/observability/_solo/${TICKET_ID}.jsonl"
  STATE_PATH=""   # Solo runs do not maintain a state.json — only epic-context runs do.
  LOCK_KEY="solo-${TICKET_ID}"
fi
LOCK_DIR="$REPO_ROOT/.swarm/.locks"
LOCK_FILE="$LOCK_DIR/${LOCK_KEY}.lock"

# Create parent directories NOW (before Step 1.5 emits its first JSONL event) so
# the very first `>> "$JSONL_PATH"` doesn't fail with "no such file or directory"
# on a brand-new epic. Step 1.6 re-runs these mkdir calls idempotently for the
# orch-log seed + helper definitions that come later — `mkdir -p` is safe to repeat.
mkdir -p "$REPORTS_DIR" "$(dirname "$JSONL_PATH")" "$(dirname "$ORCH_LOG")" "$LOCK_DIR"
[ -n "$STATE_PATH" ] && mkdir -p "$(dirname "$STATE_PATH")"
```

These four (or three, for solo) paths are the **canonical bookkeeping surface** for the whole execution. They replace ad-hoc paths previously scattered through Steps 3.3, 3.6, 4.1, 4.2. `/epic-swarm` resolves `REPO_ROOT` the same way (see `commands/epic-swarm.md` §1.8) so both commands land on the same absolute paths and share the same kernel lock even when one runs inside a worktree.

If validation fails, report the error and stop.

### Step 1.2.5: Detect Worktree Mode

Check if this session is running inside a git worktree (e.g., spawned by `/epic-swarm`):

```bash
# Detect worktree mode
git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
git_dir=$(git rev-parse --git-dir 2>/dev/null)
if [ "$git_common_dir" != "$git_dir" ]; then
  WORKTREE_MODE=true
else
  WORKTREE_MODE=false
fi
```

**When `WORKTREE_MODE=true`:**
- The swarm orchestrator has already created the worktree and branch
- **SKIP** Step 1.3 (branch creation) — the branch already exists
- **SKIP** PR creation in post-implementation steps — the swarm handles merge to the epic branch and creates a single epic PR
- **SKIP** `git push` after each phase — the swarm handles pushing the epic branch during integration
- **DO** post all phase reports to Linear (the ticket's comment thread is the coordination record)
- **DO** return structured status codes to the orchestrator (DONE / BLOCKED / etc.)
- **NOTE:** The swarm merges ticket branches to an epic branch (`epic/[epic-id]`), not to main. The default branch is only updated when the epic PR is reviewed and merged by a human.

### Step 1.3: Create Feature Branch

**Skip this step if `WORKTREE_MODE=true`.**

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

### Step 1.5: Profile Selection (one-shot decision)

Assign exactly one workflow profile to this ticket. The assignment governs which phases will run live vs. post N/A reports. Reference: `skills/using-pm-workflow/references/workflow-profiles.md`.

**Algorithm (run in order):**

1. **ALWAYS fetch existing Linear comments first** — store as `$prior_comments`. This is the resume-check fetch and it MUST run before any flag-driven branch so the idempotency gate at the end has comments to search regardless of how the profile was selected. (Prior versions skipped this fetch on `--strict` / `--profile` and posted duplicate Profile Assignment comments on resume — confirmed-latent bug A3.)
2. **Determine the assigned profile** — first match wins:
   - **Resumed:** if `$prior_comments` contains a `## Profile Assignment` header, parse the profile from it and use that value. `selection_source = "resumed-from-prior-comment"`. Do NOT re-evaluate criteria, do NOT honor flags (the prior assignment is the source of truth on resume).
   - **`--strict` flag passed:** assign `STRICT`. `selection_source = "CLI flag --strict"`.
   - **`--profile <name>` flag passed:** assign that profile. `selection_source = "CLI flag --profile"`.
   - **Auto-detect against MINIMAL criteria (ALL must match):**
     - Ticket has at least one Linear label from: `docs-only`, `typo`, `config-only`, `comment-only`, `lockfile`, `lint-only`, `readme-only`, `error-message-wording`, `dep-bump-patch`
       - OR ticket title/description matches one of: `"fix typo"`, `"update README"`, `"doc fix"`, `"docs only"`, `"config tweak"`, `"comment only"`, `"rename variable"`, `"lockfile update"`, `"lint fix"`, `"error message wording"`
     - No acceptance criterion mentions: logic, behavior, API, endpoint, query, mutation, authentication, authorization, validation, test coverage, performance, security
     - Estimated change scope: <30 lines net, 1-3 files affected (default to STANDARD if not estimable)
     - No new dependencies introduced
     - No schema changes (DB, GraphQL, OpenAPI, JSON Schema, Zod)
     - If ALL match → assign `MINIMAL` (`selection_source = "auto-detected"`). Else → assign `STANDARD`.

**Record the assignment:**

**Idempotency gate (BEFORE posting) — uniform regardless of selection_source.** Search `$prior_comments` (fetched in algorithm step 1) for a `## Profile Assignment` comment header. If one is found:
- DO NOT post a new Profile Assignment comment (would create a duplicate).
- Log to terminal: `Profile already assigned: <profile> (re-using from prior session)`.
- Skip directly to the JSONL append in step 2 below, marking `selection_source` as `resumed-from-prior-comment` if not already.

This prevents duplicate Profile Assignment comments on resume across EVERY selection path — auto-detect, `--strict`, `--profile`, and prior-comment-driven resume — closing bug A3 for all algorithm branches.

1. Post a Linear comment on the ticket with title `## Profile Assignment`. Body:
   ```
   ## Profile Assignment

   Profile: [MINIMAL | STANDARD | STRICT]
   Source: [CLI flag --strict | CLI flag --profile | auto-detected | resumed-from-prior-comment]
   Active phases: [list]
   N/A phases: [list, or "None"]
   Matched criteria: [verbatim list]
   Reasoning: [one paragraph if MINIMAL — explain why; otherwise "Default profile for this ticket shape."]

   ---
   *Automated by /execute-ticket — Profile Selection*
   ```

2. Append to `$JSONL_PATH` (resolved in Step 1 — epic context → `.swarm/observability/<epic-id>/<ticket-id>.jsonl`; solo → `.swarm/observability/_solo/<ticket-id>.jsonl`; canonical schema at `commands/references/observability-schema.md`):
   ```json
   {"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":null,"event":"profile_assigned","data":{"profile":"MINIMAL|STANDARD|STRICT","selection_source":"<source>","matched_criteria":["<list>"]}}
   ```

3. If the selection_source is `CLI flag --strict` or `CLI flag --profile`, ALSO emit a `profile_overridden` event recording what auto-detection would have chosen:
   ```json
   {"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":null,"event":"profile_overridden","data":{"auto_would_have_chosen":"<MINIMAL|STANDARD>","operator_chose":"<STANDARD|STRICT>","flag":"--profile=<X>|--strict"}}
   ```

4. For each phase posted as N/A in the next block, emit a `phase_skipped_na` event:
   ```json
   {"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"<phase-name>","event":"phase_skipped_na","data":{"profile":"<MINIMAL|STANDARD|STRICT>","reason":"phase not in active profile's phase list"}}
   ```

**Profile reclassification is one-shot.** Once recorded, the orchestrator MUST NOT change the profile mid-execution. STANDARD → MINIMAL downgrade is prohibited. STANDARD → STRICT upgrade requires explicit `AskUserQuestion` confirmation.

**The phase list for the rest of this execution comes from the assigned profile:**

```
PHASES_BY_PROFILE = {
  "MINIMAL":  ["adaptation", "implementation", "codereview"],
  "STANDARD": ["adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"],
  "STRICT":   ["adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"],
}
PHASES = PHASES_BY_PROFILE[ticket.profile]
SKIPPED_PHASES = ["adaptation", "implementation", "testing", "documentation", "codereview", "codex-review", "security-review"] - PHASES
```

**Post N/A reports for SKIPPED_PHASES NOW** (before Step 2 resume detection), so the resume logic sees the complete header set for this profile. See Step 3.6.0b for the N/A report format. (If a prior session already posted these N/A reports, do NOT duplicate them.)

---

## Step 1.6: Initialize Local Bookkeeping (Tier 4)

`/execute-ticket` writes to four local artifact surfaces alongside Linear. Initialize them now so every downstream Step (3.3 report persistence, 3.7.x phase-tail append, 4.x ticket closure) can append unconditionally without per-call mkdir/touch ceremony.

**Create directories (idempotent — `mkdir -p` is safe to re-run):**

```bash
mkdir -p "$REPORTS_DIR"
mkdir -p "$(dirname "$JSONL_PATH")"
mkdir -p "$(dirname "$ORCH_LOG")"
mkdir -p "$LOCK_DIR"
[ -n "$STATE_PATH" ] && mkdir -p "$(dirname "$STATE_PATH")"
```

### 1.6.1 Shared bookkeeping helpers (define once, call from every Step)

These helpers centralize idempotency checking, safe jq updates, and Format A/B entry writes so Step 3.7.0, Step 4.1, Step 4.2, and any non-security halt path (Step 3.5 merge conflicts, Step 3.6.1a redispatch exhaustion) all use the same code path. Define them now in the orchestrator's shell context before any phase work begins.

```bash
# --- entry_exists: multi-line aware idempotency check ----------------------
# Returns 0 (true) if an entry block with the given outcome (and optional
# halt_phase match) already exists in $ORCH_LOG. The block starts with
# "### <ticket-id> — " and ends at the next "### " heading or EOF.
# Outcome is read from the "**Outcome:** PASSED|FAILED" line inside the block.
# halt_phase, when provided, is matched against the "**Failure point:**" line.
# This replaces the buggy line-oriented grep that could never match the
# multi-line Format A/B entries (PASSED/FAILED live on line 2 of the block,
# not on the heading line).
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

# --- safe_jq_update: jq+mv with trap-cleanup and error surfacing -----------
# Runs jq against $STATE_PATH and atomically replaces it. On jq failure the
# temp file is removed and the error is surfaced to stderr rather than
# silently leaving a stale state file and a leaked /tmp file.
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

# --- phase_tail: one-line phase tail row written under flock ---------------
# All four positional args MUST be set by the caller from the agent's report
# (Step 3.4 parses the report and binds these). See "Variable bindings" below.
phase_tail_append() {
  local phase="$1" status="$2" writes="$3" report_path="$4"
  ( flock -x 200
    printf -- '- %s  %s/%s  [%s]  writes=%s  report=%s\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TICKET_ID" "$phase" "$status" "$writes" "$report_path" \
      >> "$ORCH_LOG"
  ) 200>"$LOCK_FILE"
}

# --- write_passed_entry: append Format A block under flock with idempotency ---
# Shape matches /epic-swarm §3.4 Format A (Tier + Files Created/Modified + Key
# Interfaces + Patterns + Cross-Ticket Observations) plus a Source/Profile
# header line so a /epic-swarm-resuming-from-/execute-ticket-work reads the
# same semantic sections its architect-agent expects in §3.2.1 item 8.
# Caller MUST have bound: $ticket_title, $ticket_profile, $phases_run_live,
# $phases_na, $implementation_files_block, $key_interfaces_block,
# $patterns_used_block, $cross_ticket_observations_block (use "— none —" for
# any block that has no entries; never leave a variable empty).
write_passed_entry() {
  # Double-checked locking: the existence check MUST run inside the flock too.
  # Otherwise two concurrent writers both pass the outer check, both acquire the
  # lock serially, and both append a duplicate Format A block (TOCTOU race).
  ( flock -x 200
    if entry_exists "$TICKET_ID" "PASSED"; then
      exit 0  # already recorded by a prior session — return from the subshell only
    fi
    {
      printf '\n### %s — %s\n' "$TICKET_ID" "$ticket_title"
      printf '**Tier:** %s | **Source:** /execute-ticket | **Completed:** %s | **Outcome:** PASSED\n\n' \
        "${ticket_tier:-N/A}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      printf '**Profile:** %s | **Phases run live:** %s | **Phases N/A:** %s\n\n' \
        "$ticket_profile" "$phases_run_live" "$phases_na"
      printf '**Files Created/Modified:**\n%s\n\n' "$implementation_files_block"
      printf '**Key Interfaces Defined:**\n%s\n\n' "$key_interfaces_block"
      printf '**Patterns Used:**\n%s\n\n' "$patterns_used_block"
      printf '**Cross-Ticket Observations:**\n%s\n\n' "$cross_ticket_observations_block"
      printf '**Reports:** %s/\n' "$REPORTS_DIR"
    } >> "$ORCH_LOG"
  ) 200>"$LOCK_FILE"
}

# --- write_failed_entry: append Format B block under flock with idempotency ---
# Used by Step 4.2 (security CRITICAL/HIGH) AND every non-security halt path:
# Step 3.5 merge-conflict halts, Step 3.6.1a deferral-redispatch exhaustion,
# hard-checkpoint failures. Caller MUST have bound: $ticket_title, $halt_phase,
# $halt_reason, $phases_done.
write_failed_entry() {
  # Double-checked locking — see write_passed_entry comment above. entry_exists
  # MUST run inside the flock; otherwise concurrent writers both see "no FAILED
  # block for this halt_phase yet" and both append.
  ( flock -x 200
    if entry_exists "$TICKET_ID" "FAILED" "$halt_phase"; then
      exit 0  # already recorded for this halt_phase — return from the subshell only
    fi
    {
      printf '\n### %s — %s\n' "$TICKET_ID" "$ticket_title"
      printf '**Tier:** %s | **Source:** /execute-ticket | **Halted:** %s | **Outcome:** FAILED\n\n' \
        "${ticket_tier:-N/A}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      printf '**Failure point:** %s\n' "$halt_phase"
      printf '**Reason:** %s\n\n' "$halt_reason"
      printf '**Phases completed before halt:** %s\n\n' "$phases_done"
      printf '**Reports:** %s/\n' "$REPORTS_DIR"
    } >> "$ORCH_LOG"
  ) 200>"$LOCK_FILE"
}
```

**Variable bindings — the orchestrator (you, Claude) is responsible for setting these shell variables before invoking the helpers above.** They are not auto-populated; the helpers will write empty fields if you forget.

| Variable | Bound at | Source |
|---|---|---|
| `TICKET_ID` | Step 1 | sanitized from `$ARGUMENTS` |
| `epic_id` | Step 1 | Linear `parentId` after epic verification |
| `ticket_title` | Step 1 | Linear `title` field |
| `ticket_profile` | Step 1.5 | profile chosen by the algorithm (MINIMAL / STANDARD / STRICT) |
| `ticket_tier` | Step 1.5 (epic context only) | read from `$STATE_PATH` `.tickets[id].tier` if `/epic-swarm` previously assigned one; otherwise `"N/A"` |
| `branch_name` | Step 1.3 | Linear `gitBranchName` |
| `pr_number` | Step 3.6.1 | captured after `gh pr create` |
| `current_phase` | Step 3.3 (top of phase loop) | name of the phase being dispatched |
| `report_status` | Step 3.4 | parsed from agent report `Status:` line |
| `write_count` | Step 3.4 | parsed from agent report Status block (`write_calls + edit_calls`) |
| `phases_run_live`, `phases_na` | Step 1.5 | comma-separated lists derived from `PHASES_BY_PROFILE` |
| `phases_done` | top of Step 3 phase loop, updated as each phase completes | running list of completed phases |
| `implementation_files_block` | end of implementation phase | bullet list from the implementation agent's `Files Changed:` section, or `"— none —"` |
| `key_interfaces_block`, `patterns_used_block`, `cross_ticket_observations_block` | end of implementation / adaptation phase | bullet lists from agent reports' corresponding sections (the adaptation report's Patterns/Interfaces, the implementation report's Cross-Ticket Observations); use `"— none —"` if absent |
| `halt_phase`, `halt_reason` | bound at any halt path before calling `write_failed_entry` | the phase that halted; one-line reason |

A consistent convention: **never leave a variable empty before calling a helper** — explicitly assign `"— none —"` if the upstream report had no content for that section. This keeps Format A/B entries visually consistent and prevents an empty header from being misread as missing data.

### 1.6.2 Seed orch-log if missing

The seed template uses a header + a "Generated" timestamp + an explanatory line. **No placeholder sections like `## Completed Tickets / (none yet)` — those were misleading because PASSED/FAILED entries are appended at file end, which would leave the `(none yet)` placeholder sitting above the actual entries forever.**

For **epic context** (file `orchestrator-log-<epic_id>.md`): the orch-log is potentially shared with `/epic-swarm` and other concurrent `/execute-ticket` instances against the same epic. Seed under flock so a concurrent `/epic-swarm` doesn't double-seed:

```bash
if [ ! -f "$ORCH_LOG" ]; then
  ( flock -x 200
    if [ ! -f "$ORCH_LOG" ]; then
      printf '# Orchestrator Notes — Epic %s\nGenerated: %s\n\nEntries below append in chronological order as tickets complete (Format A for PASSED, Format B for FAILED, one-line tails for per-phase events). Both `/epic-swarm` and `/execute-ticket` write here; both use `flock` on `.swarm/.locks/%s.lock`.\n' \
        "$epic_id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$epic_id" > "$ORCH_LOG"
    fi
  ) 200>"$LOCK_FILE"
fi
```

For **solo context** (file `orchestrator-log-tickets/<ticket_id>.md`): no concurrency concern (one ticket, one orch-log). Seed without locking:

```bash
if [ ! -f "$ORCH_LOG" ]; then
  printf '# Orchestrator Notes — Ticket %s\nGenerated: %s\n\nEntries below append in chronological order as phases run and the ticket completes.\n' \
    "$TICKET_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ORCH_LOG"
fi
```

### 1.6.3 Seed state.json if missing (epic context only)

When `/execute-ticket` runs against an epic sub-ticket but `/epic-swarm` has not yet run for that epic, the state file does not exist. Seed a minimal skeleton — `/epic-swarm` §1.7 has a complementary `[ ! -f ]` guard so it will read this skeleton rather than overwrite it the first time the swarm runs.

```bash
if [ -n "$STATE_PATH" ] && [ ! -f "$STATE_PATH" ]; then
  ( flock -x 200
    if [ ! -f "$STATE_PATH" ]; then
      jq -n --arg epic "$epic_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{epicId:$epic, created:$ts, source:"execute-ticket", tickets:{}, config:{seededBy:"execute-ticket"}}' > "$STATE_PATH"
    fi
  ) 200>"$LOCK_FILE"
fi
```

### 1.6.4 Upsert this ticket's row in state.json (epic context only)

The orchestrator must always have a row for the ticket it owns — even on first invocation. Use `safe_jq_update` so any jq failure surfaces to stderr rather than silently zeroing the temp file.

```bash
if [ -n "$STATE_PATH" ]; then
  ( flock -x 200
    safe_jq_update "$STATE_PATH" \
      --arg t "$TICKET_ID" --arg p "$ticket_profile" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg src "execute-ticket" \
      '.tickets[$t] = ((.tickets[$t] // {}) + {profile:$p, lastSeen:$ts, source:$src, status:(.tickets[$t].status // "in_progress")})'
  ) 200>"$LOCK_FILE"
fi
```

`$ticket_profile` MUST be bound (see Step 1.5 — it is the value chosen by the profile-selection algorithm).

**Why seed everything in Step 1.6, not lazily on first use:** Lazy initialization across four artifact paths creates four "does this directory exist yet" checks scattered through the code. Seeding once at Step 1.6 means every later Step can `>> "$ORCH_LOG"` or `safe_jq_update "$STATE_PATH" ...` without guard logic, and the failure mode for a missing path becomes obvious (Step 1.6 didn't run) rather than diffuse.

**Solo runs skip state.json.** The state file is the epic's coordination surface (tier graph, dependencies, cross-ticket interface contracts). A solo ticket has no peers, so no state file is created. The orch-log alone is sufficient for solo-run audit trail.

**Solo orch-logs are audit-only by design.** Solo `.swarm/orchestrator-log-tickets/<ticket_id>.md` files are written by `/execute-ticket` and read by operators (or by future tooling). No automated consumer currently scans them — that is intentional, not an oversight. If a solo ticket is later attached to a new epic, the operator can copy relevant Format A sections into the new epic's orch-log; no automatic ingestion path exists.

---

## Step 2: Detect Resume State

Fetch all comments on the ticket to determine which phases are already complete:

```
Use mcp__linear-server__list_comments for ticket: $ARGUMENTS
```

**Parse comments for these phase report headers:**

| Header Pattern | Phase Complete | Canonical artifact filename |
|----------------|----------------|----------------------------|
| `## Adaptation Report` | adaptation | `adaptation.md` |
| `## Implementation Report` | implementation | `implementation.md` |
| `## Testing Report` (containing `Gate #0`) | testing | `testing.md` |
| `## Documentation Report` | documentation | `documentation.md` |
| `## Code Review Report` | codereview | `codereview.md` |
| `## Cross-Model Review Report` | codex-review | `codex-review.md` |
| `## Security Review Report` OR `## Security Scan Report (Pre-Merge)` | security-review | `security-review.md` |

**Canonical filename convention (C6 standardization in v4.7):** Phase artifacts in `.swarm/context/<epic>/reports/<ticket>/<phase>.md` use the phase name from PHASES_BY_PROFILE as the filename. The security phase resolves to `security-review.md` everywhere on disk; the legacy `security-scan.md` filename is recognized for backward-compat reads but new writes ALWAYS use the canonical name. The Linear comment header text `## Security Scan Report (Pre-Merge)` is preserved verbatim — header text is the user-visible audit-trail anchor, the phase name is the internal config identifier; the gap is intentional.

**Resume Logic:**
- If no reports found → Start from adaptation
- If some reports found → Check status within each report:
  - Header present AND `Status: DONE`, `Status: DONE_WITH_CONCERNS`, `Status: COMPLETE`, or `Status: N/A` → Phase done, skip to next
  - Header present AND `Status: BLOCKED`, `Status: NEEDS_CONTEXT`, or `ISSUES_FOUND` → Phase needs re-run from this point
  - Header present but no clear status → Treat as incomplete, re-run phase
- If all reports found with completed statuses (`DONE`, `DONE_WITH_CONCERNS`, `COMPLETE`, or `N/A`) → Ticket already complete, report status and stop

**Note on `Status: N/A`:** N/A reports are posted by Step 3.6.0b for phases skipped per the active workflow profile (e.g., Documentation phase on a MINIMAL ticket). They are valid completion markers for profile-skipped phases only. **Profile-aware guard:** if a phase with `Status: N/A` IS in the active profile's phase list (i.e., it should have run live), treat it as incomplete and re-run — a crashed or confused agent may have erroneously posted N/A for a required phase. First determine the active profile from the `## Profile Assignment` comment, then apply this guard. This matches the epic-swarm hard checkpoint (§3.3), which fails explicitly if a live-profile phase has N/A status.

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

**Observability emission bracket (MANDATORY):** Every phase iteration emits at minimum `phase_started` (before agent dispatch) and `phase_completed` (after report parse). Schema:

```json
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"<phase-name>","event":"phase_started","data":{"agent":"<agent-name>","redispatch_count":0}}
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"<phase-name>","event":"phase_completed","data":{"agent":"<agent-name>","status":"<DONE|...>","tool_calls":<n>,"write_calls":<n>,"edit_calls":<n>,"report_bytes":<n>,"files_changed_count":<n>}}
```

Re-dispatches re-emit BOTH events with incremented `redispatch_count` — the audit trail preserves every attempt. See `commands/references/observability-schema.md` for the full event catalog and additional per-phase events (`impact_bar_rejected`, `boundary_question_answered`, `codex_finding_resolved`, `codex_scope_escape`).

#### 3.1 Gather Context

**From ticket (FULL — do not truncate):**
- Title and full description
- Full acceptance criteria (verbatim)
- Full Technical Notes section (verbatim)
- Labels (for agent type selection)
- Parent epic (if any)

**From ticket comments (ALL — do not filter to phase reports only):**

The `list_comments` call in Step 2 fetched all comments. In addition to using phase report comments for resume detection, include ALL non-phase-report comments in the agent prompt. These are human discussion, PM clarifications, requirement updates, and other context that may override or refine the ticket description.

Present them to the agent as:
```
## Ticket Comments (non-phase-report, chronological)

[comment author] — [timestamp]:
[full comment body]

[next comment...]
```

**Why this matters:** A PM might comment "actually, use the v2 API instead of v1" or "the acceptance criteria for X have changed — see updated description." If these comments are not passed to agents, they will implement against stale requirements.

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

#### 3.1.0 Gather Parent Epic Context

If the ticket has a parent issue (epic), fetch it to capture context that applies to all sub-tickets:

1. **Check for parent epic:** From the ticket fetched in Step 1, check for `parentId` or parent reference.

2. **If parent exists, fetch the parent epic** using `mcp__linear-server__get_issue` with the parent ID.

3. **Extract key sections** from the epic description:
   - **Key References:** File paths (local docs, research briefs, specs) and URLs referenced in the epic
   - **Architecture/design decisions** that apply broadly to all sub-tickets
   - **Scope boundaries and constraints** that inform implementation approach

4. **Include parent epic references in downstream steps:**
   - Local file paths from the epic description are added to Step 3.1.1's scanning scope (read alongside ticket-referenced files)
   - URLs from the epic description are included in Step A2's scanning scope
   - Architectural decisions and constraints are passed to the agent prompt

5. **Present parent epic context** to the agent with the label:
   ```
   ## Parent Epic Context
   **Epic:** [epic-id] - [epic-title]
   **Applies to:** All tickets in this epic

   ### Referenced Documents (from epic)
   [file paths and URLs extracted from epic description]

   ### Architectural Decisions
   [design decisions, constraints, scope boundaries from epic]
   ```

**Do NOT include** the full epic description verbatim (it may contain scope for other tickets). Extract only: referenced documents, architectural decisions, and constraints that apply broadly.

**Skip this step** if the ticket has no parent issue.

---

#### 3.1.1 Gather Referenced Resources

Before dispatching the agent, scan the ticket description, acceptance criteria, and Technical Notes for **local file paths** and **URLs** that point to resources the agent needs. Tickets often reference requirements documents, research briefs, design specs, and other detailed context — this material represents significant upfront work and MUST be included in the agent prompt when present.

This step has two tracks: **local files** (Step A1) and **external URLs** (Steps A2–E). Run both tracks, then combine results for the agent prompt.

**Important:** The scanning scope for both tracks includes content from Step 3.1.0 (parent epic) when available. File paths and URLs discovered in the parent epic description are included alongside those found in the ticket itself.

---

**Step A1: Detect and read local file references**

Scan the ticket body for local file paths. Common patterns:
- Explicit paths: `docs/requirements/inbox-migration.md`, `./research/auth-analysis.md`, `context/brief.md`
- Markdown links to local files: `[requirements doc](docs/requirements/inbox-migration.md)`
- References like "see `filename.md`", "per the brief in `path/to/file`", "requirements in `docs/...`"
- Relative paths from the project root (most common in tickets)

**For each detected file path:**

1. **Resolve the path** relative to the project root (working directory). If the path is ambiguous, use `Glob` to find likely matches.

2. **Verify the file exists** using `Read`. If the file does not exist:
   ```
   ⚠️ REFERENCED FILE NOT FOUND

   Path: [path as referenced in ticket]
   Searched: [resolved absolute path]

   This file was referenced in the ticket but does not exist.

   Options:
   1. Provide the correct path
   2. Continue without this file
   ```
   Wait for user response.

3. **If the file exists:** Read its full contents. Classify the file's role based on surrounding ticket text:

   | Role | Ticket phrasing signals | How to present to agent |
   |------|------------------------|------------------------|
   | **Requirements/spec** | "requirements in", "spec at", "acceptance criteria from", "per the PRD" | `Requirements document — implementation must satisfy these requirements` |
   | **Research/analysis (prescriptive)** | "research brief", "analysis in" + file contains tables with specific IDs, interface definitions, enumerated items, schema fields, or concrete values | `Research brief (prescriptive) — contains specific technical specifications (template IDs, schema definitions, layout types, interface fields, etc.) that MUST be implemented as specified, not merely used as background. Cross-check your implementation against the specific items in this brief.` |
   | **Research/analysis (contextual)** | "for context", "background research", "findings from", "investigation at" + file provides general analysis without concrete specification items | `Research context — provides background that informs approach but does not prescribe specific implementation details` |
   | **Design/architecture** | "design doc", "architecture in", "ADR at", "technical design" | `Design document — follow the architectural decisions described here` |
   | **Example/template** | "template at", "example in", "use the pattern from" | `Template/example — use as a starting point or structural reference` |
   | **Context/background** | "for background", "context in", "FYI see" | `Background context — informs approach but is not directly prescriptive` |

   **Prescriptive vs Contextual research:** When a referenced research document contains structured content — tables with specific IDs, interface definitions, enumerated requirement lists, schema fields, or concrete values — classify it as **prescriptive**. The stronger role label ensures agents treat the brief's specific items as binding, not advisory.

   If role is unclear, default to `Requirements document` — it's better to over-weight a referenced document than under-weight it.

4. **No file count limit** — include all referenced local files. These are authored project artifacts; they exist because they're relevant.

5. **Extract conformance checklist from prescriptive documents:** When a document is classified as **Requirements/spec** or **Research/analysis (prescriptive)**, scan its content for verifiable specification items:
   - Named items (template IDs, enum values, field names)
   - Interface or schema definitions (field names, types, required vs optional)
   - Enumerated lists of must-have features or required components
   - Specific values (dimensions, sizes, patterns, CSS properties)

   Generate a conformance checklist and include it after the document's content in the agent prompt:

   ```markdown
   ## Research Brief Conformance Checklist

   The following specific items from [file path] MUST be verified in your implementation:

   - [ ] [Category]: [item1, item2, item3, ...]
   - [ ] [Category]: [item1, item2, item3, ...]
   - [ ] [Category]: [specific requirement or value]
   ```

   This checklist will be used in Step 3.4.3 to verify implementation conformance.

---

**Step A2: Detect URLs**

Scan the combined text of:
1. The ticket body (title, description, acceptance criteria, Technical Notes)
2. The parent epic description (if gathered in Step 3.1.0)
3. ALL local file contents read in Step A1

This ensures URLs embedded in referenced research briefs, specs, and requirements documents are also discovered and fetched — not just URLs in the ticket itself. URLs found in local files should inherit the local file's role classification as a default intent (e.g., a URL inside a "Research brief" file defaults to "Technical reference — follow the approach described here" unless surrounding text suggests otherwise).

- Match URLs (`https://...`) across all sources listed above
- Ignore Linear internal links (`linear.app/...`) and GitHub PR/issue links already handled by `gh` CLI (e.g., `github.com/org/repo/pull/...`, `github.com/org/repo/issues/...`)
- Ignore image URLs (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`)

**Step B2: Classify and determine intent**

For each detected URL, read the surrounding text in the ticket to determine how the resource is referenced. Classify each URL:

| Intent | Ticket phrasing signals | How to present to agent |
|--------|------------------------|------------------------|
| **Copy/adapt code** | "copy from", "use as reference", "implement similar to", "port from", "based on" | `Reference code — copy and adapt as needed` |
| **Follow approach** | "follow this pattern", "see how they handle", "approach described in", "tutorial at" | `Technical reference — follow the approach described here` |
| **API/SDK docs** | "see docs at", "API reference", "documentation for", "refer to" | `API documentation — use for correct interface usage` |
| **Configuration/prompt** | "use this prompt", "copy this config", "template at" | `Direct source material — use verbatim or near-verbatim` |
| **General context** | No specific action language, or "for background", "FYI" | `Background context — informs approach but is not directly used` |

If intent is unclear, default to `Technical reference`.

**Step C2: Normalize GitHub URLs**

GitHub blob pages return heavy HTML when fetched directly. Normalize before fetching:

| GitHub URL pattern | Normalization |
|-------------------|---------------|
| `github.com/[owner]/[repo]/blob/[branch]/[path]` | Convert to `raw.githubusercontent.com/[owner]/[repo]/[branch]/[path]` |
| `gist.github.com/[user]/[id]` | Append `/raw` → `gist.github.com/[user]/[id]/raw` |
| `github.com/[owner]/[repo]/tree/[branch]/[path]` | Use `gh api repos/[owner]/[repo]/contents/[path]?ref=[branch]` to list files, then fetch each relevant file via raw URL |
| `github.com/[owner]/[repo]` (repo root) | Use `gh api repos/[owner]/[repo]/git/trees/[default-branch]?recursive=1` to get file tree, report to user, and ask which files to fetch |

For directory and repo-root URLs, after retrieving the file listing:
```
📂 GITHUB DIRECTORY REFERENCED

URL: [url]
Repository: [owner]/[repo]
Path: [path or root]

Files found:
[file tree listing, filtered to code files]

The ticket references this directory. Which files should I fetch for the agent?

Options:
1. Fetch all files (if ≤ 10 code files)
2. Select specific files: [list files by number]
3. Skip — agent doesn't need these files
```
Wait for user response before continuing.

**Step D2: Fetch content**

For each URL (normalized if GitHub):

1. **Fetch using `WebFetch`** (or `gh api` for GitHub directory listings per Step C2).

2. **Validate the response:**
   - **Usable content** — contains code blocks, technical prose, API specs, or configuration. Proceed.
   - **Login/paywall** — response contains login forms, "subscribe to read", or access denied messaging. Treat as fetch failure.
   - **Mostly navigation/boilerplate** — response is dominated by site chrome with little substantive content. Report to user:
     ```
     ⚠️ LOW-QUALITY FETCH

     URL: [url]
     The fetched content appears to be mostly site navigation/boilerplate
     with limited useful content.

     Preview (first 500 chars of substantive content):
     [preview]

     Options:
     1. Include anyway — agent may still find useful content
     2. Provide the content manually (paste it)
     3. Provide an alternative URL
     4. Skip this URL
     ```
     Wait for user response.

3. **If fetch fails** (403, timeout, DNS error, etc.):
   ```
   ⚠️ URL FETCH FAILED

   URL: [url]
   Error: [error message]

   This URL was referenced in the ticket but could not be fetched.

   Options:
   1. Continue without this content (agent will not have it)
   2. Provide the content manually (paste it)
   3. Provide an alternative URL
   ```
   Wait for user response before continuing.

**Step E: Include gathered resources in the agent prompt (Step 3.3)**

Structure all gathered resources — local files and external content — with role/intent labels so the agent knows how to use each resource. **Local files come first** (they are authored project artifacts and typically carry more authority than external references).

```markdown
## Referenced Project Documents

### [file path]
**Role:** [role label from Step A1 — e.g., "Requirements document — implementation must satisfy these requirements"]
**Ticket context:** "[surrounding sentence from ticket that references this file]"

[full file contents]

### [file path]
**Role:** [role label]
**Ticket context:** "[surrounding sentence]"

[full file contents]

## Referenced External Content

### [URL]
**Intent:** [intent label from Step B2 — e.g., "Reference code — copy and adapt as needed"]
**Ticket context:** "[surrounding sentence from ticket that references this URL]"

[fetched content]
```

Omit the `## Referenced Project Documents` section if no local files were detected. Omit `## Referenced External Content` if no URLs were detected.

**After all resources are gathered, add a Reference Material Availability summary** so the agent (and the user reviewing the report) understands what context the agent actually has access to:

```markdown
## Reference Material Availability

| Source | Type | Status |
|--------|------|--------|
| [local file path] | Local file ([role label]) | ✅ Included in full |
| [URL] | URL ([intent label]) | ✅ Included |
| [URL] | URL ([intent label]) | ❌ Fetch failed ([reason]) |
| [URL] | URL ([intent label]) | ⚠️ Low-quality fetch (included with caveats) |

**Note:** For references marked ❌, rely on training knowledge for this content. If a referenced URL was critical to the ticket's requirements, flag this in your Deferred Items table as `DISCOVERED: Referenced URL unavailable — [URL] — [what it was expected to provide]`.
```

This transparency lets the agent make informed decisions about what context it does and doesn't have, and surfaces gaps in the execution summary.

**Limits:**
- **Local files:** No limit — include all referenced project documents in full.
- **External URLs:** Fetch a maximum of 5 URLs per phase. If more are detected, report the list to user and ask which to prioritize.
- Skip URLs already fetched in a prior phase — reuse the cached content and intent classification.
- For GitHub directory fetches, count each individual file fetched toward the limit (not the directory URL itself).

#### 3.2 Select Agent

| Phase | Agent Selection |
|-------|-----------------|
| adaptation | `architect-agent` |
| implementation | See agent selection logic below |
| testing | `qa-engineer-agent` |
| documentation | `technical-writer-agent` |
| codereview | `code-reviewer-agent` |
| codex-review | *(no agent — direct MCP tool calls, see Phase 5.5 below)* |
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

#### 3.3 Invoke Agent via Agent Tool

Use the Agent tool to spawn the appropriate agent. **Do NOT use `isolation: "worktree"`** — agents must work on the current feature branch created in Step 1.3.

```
Agent tool parameters:
- subagent_type: [agent-name from selection above]
- description: "[Phase] for [ticket-id]"
- prompt: Include ALL of the following:
  0. SHELL COMMAND POLICY block (prescriptive, at TOP of prompt) — see below
  1. Ticket details (title, full description, all acceptance criteria, all Technical Notes — verbatim)
  2. Prior phase reports — pass as FILE PATHS to `$REPORTS_DIR/<phase>.md` (resolved in Step 1 — epic context → `.swarm/context/<epic-id>/reports/<ticket-id>/<phase>.md`; solo → `.swarm/context/_solo/<ticket-id>/reports/<phase>.md`), NOT verbatim inline. Exception: reports under 2,000 chars may be inlined verbatim to save a Read round-trip.
  3. Specific phase instructions. Three phases carry additional doctrine blocks:
     - **adaptation**: verify ticket/discovery claims about existing patterns/services against HEAD before building the guide (verification over recall); apply Vendor-Surface Discipline to any new external dependency; if the ticket establishes a convention, name its guard (rung + artifact) in a Convention Guards section (see `commands/adaptation.md`)
     - **testing**: the four anti-ballast rules — assert behavior/contracts not call shapes; few real-infra integration tests outrank thousands of mocks for the data layer; static guards count as tests; don't inflate the mock:integration ratio (see `commands/testing.md`)
     - **codereview**: Convention Guard Verification — if the change establishes a convention, its guard (enforcement-ladder rung 1–5) ships in this same change or carries an explicit `[prose-only]` tag; neither → CHANGES_REQUESTED, and a guard the adaptation guide mandated but is absent → SCOPE_GAP (see `commands/codereview.md`)
  4. Expected output format (structured report, under 6,000 characters; include tool-call counts in Status block)
  5. Current branch name (so agent can verify it is on the correct branch)
  6. Referenced project documents and external content from Step 3.1.1 (formatted per Step E)
  7. **Orchestrator notes (ADAPTATION PHASE ONLY, epic context only):** include the full content of `$ORCH_LOG` (`.swarm/orchestrator-log-<epic_id>.md`) under a header so the architect-agent can examine what prior tickets in this epic built. Mirrors `/epic-swarm` §3.2.1 item 8.

     ```
     ## Prior Ticket Work in This Epic
     The following tickets have already been completed (or attempted) in this
     epic. Their code already exists on the epic branch. Reference these when
     planning your implementation approach — look for existing patterns,
     services, and interfaces you can reuse or extend.

     [full $ORCH_LOG content]
     ```

     Skip this item entirely in solo context (no epic, no cross-ticket continuity to share) and for phases other than adaptation (later phases work from their own prior phase reports, not the cross-ticket log).
```

**SHELL COMMAND POLICY block (item 0 above) — include verbatim at top of every agent prompt:**

```
SHELL COMMAND POLICY — one action per Bash call, no compound shell:
Never chain commands with `&&`, `||`, or `;`. Compound commands bypass
the pre-approved Bash allowlist and trigger permission prompts that
interrupt automation. Use tool-native working-directory flags:

  WRONG:  cd <abs-path> && pnpm test
  RIGHT:  pnpm -C <abs-path> test

  WRONG:  cd <abs-path> && npx tsc --noEmit
  RIGHT:  npx --prefix <abs-path> tsc --noEmit

  WRONG:  cd <abs-path> && git status
  RIGHT:  git -C <abs-path> status

  WRONG:  cd <abs-path> && docker compose up
  RIGHT:  docker compose --project-directory <abs-path> up

If a tool has NO working-directory flag, issue two serial Bash calls —
do NOT chain them. This rule is non-negotiable.
```

**Critical:** Agents do NOT have Linear access. Include ALL necessary context in the prompt. Report persistence: after the agent returns its structured report, write the raw report text to `$REPORTS_DIR/<phase>.md` (resolved in Step 1 — epic context → `.swarm/context/<epic-id>/reports/<ticket-id>/<phase>.md`; solo → `.swarm/context/_solo/<ticket-id>/reports/<phase>.md`) BEFORE posting it to Linear. Both the Linear comment and the filesystem file get the same content. The Step 1.6 directory seed makes this a pure file write with no `mkdir -p` guard needed.

#### 3.3.1 Post-Dispatch Verification

After every agent returns, verify that file changes are as expected:

1. **Check for file changes:**
   ```bash
   git status --short
   ```

2. **Verify changed files match ticket scope:**
   Compare the list of changed files against the ticket's predicted files (from the adaptation report's "Target Files" section). If files outside the predicted scope were modified:
   - This is not necessarily wrong (agents may discover needed changes)
   - But flag it for awareness:
     ```
     Agent modified files outside predicted scope:
     Predicted: [list from adaptation]
     Actual: [list from git status]
     Additional: [files not in predicted list]
     ```
   - Continue unless files look clearly wrong (e.g., test files in an implementation phase, config files not mentioned in the ticket)

3. **In WORKTREE_MODE:** Also verify no files were modified in the parent repo or other worktrees:
   ```bash
   # Check parent repo for stray files (use git -C to avoid compound cd+git)
   parent_dir=$(git rev-parse --git-common-dir | sed 's|/\.git.*||')
   git -C "$parent_dir" status --short
   ```
   If unexpected changes found in the parent repo, report to the user before proceeding.

#### 3.3.2 Invoke Phase Reporting Skill (MANDATORY)

**Before processing any agent results, invoke the `swarm-phase-reporting` skill:**

```
Invoke Skill: swarm-phase-reporting
```

This skill enforces report posting discipline — every phase must post a full structured report to Linear. The skill provides report templates, validation rules, and gold-standard examples. Follow its instructions for all subsequent steps.

#### 3.4 Parse Agent Report

Agent must return a structured report. Parse for:

**Required fields:**
- `Status:` - DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED (accept legacy COMPLETE / ISSUES_FOUND for compatibility)
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
| codereview | Always: `Review Status:`, `Requirements Checklist`, `Files Reviewed:`, `Convention Guard Verification`. If `Pass 1 Result: PASS`, also require `Best Practices Assessment` and `SOLID/DRY Assessment`. |
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

**Codereview conditional validation:**
- If report contains `Pass 1 Result: FAIL`, treat "Pass 2 skipped" as valid and do NOT require Pass 2 sections (including Convention Guard Verification).
- If report contains `Pass 1 Result: PASS` (or does not specify Pass 1), require `Best Practices Assessment`, `SOLID/DRY Assessment`, and `Convention Guard Verification` ("None — no conventions established" is a valid entry).

**Codereview observability emission (v5.0):** after parsing a valid codereview report, emit one `convention_guard_check` event to the per-ticket stream:
```json
{"ts":"<iso8601>","epic_id":"<epic-id|null>","ticket_id":"<ticket-id>","phase":"codereview","event":"convention_guard_check","data":{"conventions_introduced":[...],"guards_shipped":[...],"prose_only_tagged":[...],"missing":[...]}}
```
Populate the arrays from the report's Convention Guard Verification section (empty arrays when "None"). A non-empty `missing` array always accompanies `Review Status: CHANGES_REQUESTED`.

**IMPORTANT:** Auto-retry happens automatically before pausing. This preserves full automation in most cases.

#### 3.4.2 Verify Acceptance Criteria Completion (Implementation Phase Only)

After the implementation agent reports `DONE`, `DONE_WITH_CONCERNS`, or legacy `COMPLETE`, verify key acceptance criteria with automated checks **before** posting the report to Linear or advancing to the next phase.

**Step 1: Parse AC into verification targets**

Extract each acceptance criterion from the ticket and classify it:
- **STRUCTURAL AC** (imports, exports, file creation, pattern removal) → can verify with grep/glob
- **BEHAVIORAL AC** (data flows, error handling, parameter forwarding) → verify by tracing source code
- **REMOVAL AC** (no legacy code, no banned patterns) → verify with grep expecting zero matches

**Step 2: Generate and run verification commands**

For each STRUCTURAL and REMOVAL AC, generate a verification command:

```
Example verification commands:

AC: "All renderers import from schema files"
  → grep -rn "import.*from.*schema" [renderer-dir] | wc -l
  → expect: count >= [number of renderers]

AC: "Zero legacy fallback keys remain"
  → grep -rn "rec\.legacyKey\|rec\.oldName" [renderer-dir]
  → expect: zero matches

AC: "QuotaIndicator extracted to shared location"
  → test -f [expected-shared-file-path] && echo "EXISTS" || echo "MISSING"
  → expect: EXISTS

AC: "checkpointDecision has a typed schema"
  → grep "z\.enum\|z\.literal\|z\.number" [schema-file]
  → expect: non-trivial type constraints (not all z.string().optional())
```

For each BEHAVIORAL AC, trace the data flow:
```
AC: "documentIds forwarded to pipeline trigger"
  → Read the route handler, find where documentIds is accepted
  → Trace to the function call that should receive it
  → Confirm the parameter appears in the function's arguments
```

**Step 3: Compare results against agent claims**

```
IF any AC fails verification:
  - DO NOT post the report to Linear
  - DO NOT advance to the next phase
  - Report to user with specific evidence:

    ⚠️ AC VERIFICATION FAILED

    The implementation agent reported COMPLETE, but the following
    acceptance criteria could not be verified:

    | AC | Agent Claim | Verification Result |
    |----|-------------|---------------------|
    | [AC text] | [what agent reported] | [actual grep/check output] |

    Options:
    1. Send verification failures back to implementation agent for correction
    2. Review manually and override
    3. Abort execution

  - Wait for user decision before continuing

IF all AC pass verification:
  - Proceed to posting report and next phase
  - Include verification results in the Linear comment (append to agent report)
```

**Note:** This step applies to the implementation phase only. Code review has its own AC verification via Step 0 with verification commands. Security review focuses on vulnerability assessment rather than AC completion.

#### 3.4.3 Verify Referenced Document Conformance (Implementation Phase, When Prescriptive Documents Exist)

If Step 3.1.1 gathered any documents classified as **Requirements/spec** or **Research/analysis (prescriptive)** and a conformance checklist was generated, verify that the implementation matches the specific items from those documents.

**Step 1: Extract verifiable specifications from the conformance checklist**

For each checklist item, identify the specification type:
- **Named items** (IDs, enum values, field names) → verify presence in target files
- **Specific values** (dimensions, patterns, properties) → verify correct values
- **Enumerated lists** (required features, fields, components) → verify completeness

**Step 2: Generate and run verification queries**

For each specification item, generate a targeted check:
```
Named item "[item-name]" expected in [target-file]
  → grep -rn '"[item-name]"\|[item-name]' [target-file-or-directory]
  → expect: at least one match

Interface field "[field-name]" expected
  → grep -rn '[field-name]' [target-file]
  → expect: field defined with correct type

Enumerated requirement "[requirement]"
  → verify via grep, file existence check, or source code inspection
  → expect: implemented as specified
```

**Step 3: Report results**

```
IF all specifications match:
  - Proceed silently to next step
  - Include brief confirmation in Linear comment:
    "✅ Referenced document conformance: [X/X] specifications verified"

IF divergences or missing items exist:
  - DO NOT advance to next phase
  - Report to user:

    ⚠️ REFERENCED DOCUMENT CONFORMANCE CHECK

    Document: [file path]
    Role: [role classification]

    | Specification | Expected | Found | Status |
    |---------------|----------|-------|--------|
    | [item] | [expected value] | [actual value] | ✅ / ⚠️ DIVERGED / ❌ MISSING |

    [X] items match, [Y] items diverged, [Z] items missing

    Options:
    1. Send back to implementation agent for correction
    2. Accept divergences (document reasons in Linear)
    3. Review manually

  - Wait for user decision before continuing
```

**Scope:** This step runs only when prescriptive referenced documents were provided in Step 3.1.1. It does NOT replace Step 3.4.2 (AC verification) — it supplements it by checking specifications that live in referenced documents rather than in the ticket's acceptance criteria.

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

**Phase skip requires user approval.** If a phase appears unnecessary (e.g., implementation agent already created docs), present the rationale and wait for user confirmation before skipping. Do NOT skip autonomously.

#### 3.6 Post Report to Linear

After successful phase completion (non-blocking), post the agent's report as a comment:

```
Use mcp__linear-server__save_comment:
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
   IF changes == 0 AND report.Status is one of ["DONE", "DONE_WITH_CONCERNS", "COMPLETE"]:
     - Log warning: "Implementation reported completion but no file changes detected"
     - Check for unstaged changes: git diff --name-only
     - If still no changes: PAUSE for user decision
       Options: [Retry Implementation] [Review Manually] [Mark as No-Op and Continue]
   ```

3. **If changes exist:** Proceed to posting report and PR creation

#### 3.6.0b N/A Phase Reports (profile-skipped phases)

For every phase in `SKIPPED_PHASES` (computed in Step 1.5 from the ticket's active profile), post a structured Linear comment with the EXACT header the resume-detection logic expects:

```
Use mcp__linear-server__save_comment:
- issue_id: [ticket-id]
- body: |
    ## [Phase Name] Report

    Status: N/A — Skipped per [PROFILE] profile

    This phase is not in the active profile's phase list for this ticket.
    Profile selection criteria and reasoning are documented in the ## Profile Assignment
    comment above.

    ---
    *Automated by /execute-ticket — Profile-aware phase skip*
```

**Phase name → header mapping:**

| Skipped phase | N/A header |
|---------------|-----------|
| testing | `## Testing Report` |
| documentation | `## Documentation Report` |
| codex-review | `## Cross-Model Review Report` |
| security-review | `## Security Scan Report (Pre-Merge)` |

**Idempotency:** Check existing comments first. Do NOT post duplicate N/A reports. (adaptation, implementation, and codereview run in every profile — they will never appear as N/A.)

#### 3.6.1a Validate No AC Deferrals (All Phases)

Before advancing to the next phase, scan the agent's Deferred Items table for any items that match acceptance criteria. **Invoke the `no-silent-deferrals` skill at this step** — it defines the four catastrophic conditions and the required Deferral Justification block.

**Pass 1 — AC fuzzy-match (existing):**

1. **Extract** all items from the agent's Deferred Items table
2. **For each item**, check if it matches an acceptance criterion:
   - Fuzzy match on key terms: file names, function names, component names, patterns mentioned in AC
   - Check if the deferred item's description overlaps with any AC text
3. **If a match is found:** Reclassify the item as `AC-DEFERRED` and continue to Pass 2.
4. **If no matches found:** This pass is clean — Pass 2 still applies to any pre-existing `AC-DEFERRED` items in the report.

**Pass 2 — Catastrophic-justification validation (new):**

For every `AC-DEFERRED` entry (whether classified by the agent or reclassified by Pass 1):

1. Search the report for a `### Deferral Justification (CATASTROPHIC — required)` block within ~30 lines of the Deferred Items table.
2. The block MUST contain these four fields populated with non-empty, non-placeholder values:
   - `Catastrophic condition:` value is `1`, `2`, `3`, or `4`
   - `Evidence:` contains a concrete external fact (not "complex," "tricky," "would take time," any time/effort language)
   - `Confidence the catastrophic condition applies:` is `HIGH`, `MEDIUM`, or `LOW`
   - `Specific blocker that prevents doing the work in this session:` contains a factual description
3. **If MISSING/MALFORMED/CONDITION-OUT-OF-RANGE** → `DEFERRAL_INVALID` → re-dispatch (Pass 3)
4. **If condition #4 cited but the deferred item fuzzy-matches an AC** → `DEFERRAL_OVERRIDDEN` → re-dispatch (Pass 3)

**Pass 3 — Re-dispatch protocol (max 1 re-dispatch per agent per phase):**

```
If DEFERRAL_INVALID or DEFERRAL_OVERRIDDEN and redispatch_count[phase] == 0:
  1. Increment redispatch_count[phase]
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
  4. Re-validate the new report from §3.4 onward (full validation cascade)

If redispatch_count[phase] == 1 and still DEFERRAL_INVALID/OVERRIDDEN:
  PAUSE the ticket. Surface to user with the two rejected reports side-by-side.
  Options:
    1. Accept the deferral and continue (records as user-approved deferral)
    2. Re-dispatch the agent with the user's own supplemental prompt
    3. Send back to agent for implementation
    4. Modify AC to reflect reduced scope
```

Record every re-dispatch by appending to `$JSONL_PATH` (epic context → `.swarm/observability/<epic-id>/<ticket-id>.jsonl`; solo → `.swarm/observability/_solo/<ticket-id>.jsonl`; canonical envelope per `commands/references/observability-schema.md`):
```json
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"<name>","event":"deferral_redispatch","data":{"pass":1,"rejection_reason":"DEFERRAL_INVALID|DEFERRAL_OVERRIDDEN","items":[{"title":"<x>","classification":"AC-DEFERRED|DISCOVERED|OUT-OF-SCOPE","severity":"<sev>"}]}}
```

If the deferral is accepted (catastrophic justification valid, or user explicitly approved at a pause prompt), emit `deferral_accepted` instead:
```json
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"<name>","event":"deferral_accepted","data":{"items":[{"title":"<x>","classification":"<class>","catastrophic_condition":<1|2|3|4>}],"approval_source":"agent-justified|user-override"}}
```

**Also post a Linear comment** so the orchestrator's intervention is visible to operators (not silent in JSONL only):

```
Use mcp__linear-server__save_comment for ticket: [ticket-id]

Body:
## Deferral Rejected — Re-dispatch [phase]

**Pass:** [1 or 2]
**Rejection reason:** DEFERRAL_INVALID | DEFERRAL_OVERRIDDEN
**Rejected items:**
- [item title 1] — [why it's invalid: AC-mapped without catastrophic justification, etc.]
- [item title 2] — [...]

**Supplemental directive added to re-dispatch:**
> [verbatim text appended to agent prompt]

The agent has been re-invoked with the same context plus the directive above. The next [phase] report supersedes the prior one.
```

This restores the audit trail: every orchestrator intervention is a Linear-visible artifact, not just a JSONL event. Without this comment, operators see only the final agent report and have no record of the rejected attempt.

**This validation runs for ALL phases**, not just implementation. Code review and testing agents can also improperly defer items that match AC.

**Pass 4 — Symmetric-additions check (v5.0):** the impact bar applies to *additions* too. Scan the report for **unrequested defensive runtime machinery** — a retry tier, reconciliation job, sweep, recovery cron, or new error-taxonomy layer that no AC asked for. For each: does the report name a **concrete observed failure** it answers (an incident, red test, logged error, vendor behavior that actually bit) plus an activation metric? If not, re-dispatch ONCE with "remove the machinery (or name its observed failure + activation metric); record the idea in the closure-log instead" — mirror of the deferral re-dispatch above, same one-retry-then-user escalation. "Could theoretically fail" does not clear the bar. See `no-silent-deferrals` → The Symmetric Bar.

**Why this exists:** The user has observed ~80-90% deferral rates with most deferrals being inappropriate. The AC fuzzy-match catches deferrals that map to acceptance criteria, but it does not enforce that the deferral has a valid catastrophic reason. Pass 2 + Pass 3 provide that enforcement at the orchestrator level; Pass 4 applies the same discipline symmetrically to speculative additions (with agents, unjustified machinery accumulates as fast as unjustified deferrals). See `no-silent-deferrals` skill for the policy rationale.

#### 3.6.1 Commit and Create Draft PR (Implementation Phase Only)

After posting implementation report to Linear:

**Worktree mode behavior:**
- `WORKTREE_MODE=false` (normal run): execute all steps below
- `WORKTREE_MODE=true` (spawned by `/epic-swarm`): execute steps 1-2 only (local commit), skip push/PR steps 3-5

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

**Skip when `WORKTREE_MODE=true` or no `pr_number` is available.**

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

**Skip when `WORKTREE_MODE=true` or no `pr_number` is available.**

After code review phase (if status is APPROVED):
```bash
gh pr edit [pr-number] --add-label "code-reviewed"
```

After security review phase (if no CRITICAL/HIGH findings):
```bash
gh pr edit [pr-number] --add-label "security-approved"
```

#### 3.7.0 Append Phase Outcome to Orchestrator Log (Tier 4)

After Linear posting (Step 3.6) and any PR-side commenting (Step 3.6.2), append a one-line phase-tail entry to `$ORCH_LOG`. This runs **in a finally-style block — even on blocking pause, deferral re-dispatch, or report-validation failure**, the orch-log must record what happened.

**The append is one line per phase per ticket.** Multiple `/execute-ticket` invocations against the same epic each append their own lines; the orch-log accumulates phase tails from all sessions. (The PASSED/FAILED Format A/B blocks in Step 4 use `entry_exists` to dedupe; phase tails do not — every dispatch is its own line in the audit trail, which is the intended behavior.)

**Before calling, bind the four variables** the helper reads (see Step 1.6.1's "Variable bindings" table):
- `current_phase` — the phase that just ran (`adaptation`, `implementation`, etc.)
- `report_status` — parsed from the agent's `Status:` line (`DONE`, `DONE_WITH_CONCERNS`, `N/A`, `BLOCKED`, `FAILED`)
- `write_count` — `write_calls + edit_calls` from the agent's Status block (use `0` for N/A or BLOCKED)
- and `$REPORTS_DIR` / `$TICKET_ID` / `$ORCH_LOG` / `$LOCK_FILE` (resolved in Step 1)

Then call:

```bash
phase_tail_append "$current_phase" "$report_status" "$write_count" "$REPORTS_DIR/$current_phase.md"
```

`phase_tail_append` (defined in Step 1.6.1) wraps the append in `( flock -x 200 ... ) 200>"$LOCK_FILE"` so concurrent `/execute-ticket` runs against the same epic serialize correctly.

**The flock idiom.** All orch-log appends (and state.json updates) use the same `( flock -x 200 ... ) 200>"$LOCK_FILE"` pattern defined once in Step 1.6.1's helpers. The subshell opens FD 200 against the lock file, `flock -x 200` acquires an exclusive lock on that descriptor, the body runs while the lock is held, and the subshell exit releases it. Two `/execute-ticket` invocations against the same epic serialize through `$LOCK_FILE = .swarm/.locks/<epic_id>.lock`; `/epic-swarm` resolves the same absolute lock file via its own worktree-safe `$REPO_ROOT` derivation (see `commands/epic-swarm.md` §1.8); solo runs serialize against `.swarm/.locks/solo-<ticket_id>.lock` (effectively never contended).

**Why a sidecar lock file (`.lock`) instead of locking the orch-log directly:** locking the orch-log itself would block any concurrent reads. The orch-log is read by `/epic-swarm`'s architect-agent prompt at §3.2.1 item 8 and (per Step 3.3 item 7 below) by `/execute-ticket`'s own adaptation-phase agent when an epic context is active. Sidecar locking lets readers proceed unblocked while writers serialize among themselves.

**Why a one-line tail per phase, not a full report dump.** The orch-log is the cross-ticket adaptation context. Bulk content belongs in `$REPORTS_DIR/<phase>.md` — the orch-log just records *that the phase happened, when, with what status*, and links to the file for full content. A 40-line phase-tail block per phase per ticket would balloon the orch-log past usable adaptation context for later tiers.

#### 3.7 Continue to Next Phase

If not blocked, proceed to the next phase in sequence.

---

## Step 3.8: Phase 5.5 — Cross-Model Review (Codex)

**This phase runs between codereview and security-review.** It is handled directly by the orchestrator using MCP tool calls, not via an agent.

**Before processing Codex results, invoke the `codex-finding-resolution` skill:**

```
Invoke Skill: codex-finding-resolution
```

This skill defines the complete process for handling Codex findings — presenting P1-P3 items to the user, getting decisions, applying fixes, and posting full reports to Linear. Follow the skill's instructions. Do NOT silently skip or auto-dismiss findings.

**Per-finding observability (v4.7):** After processing each finding, emit one `codex_finding_resolved` event (canonical envelope per `commands/references/observability-schema.md`):
```json
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"codex-review","event":"codex_finding_resolved","data":{"finding_id":"F<n>","severity":"P1|P2|P3","disposition":"auto_fixed|user_decision|closure_log|scope_escape_ticket","file":"<path>:<line>"}}
```

When SCOPE_EXPANSION_ESCAPE fires (rare), ALSO emit a `codex_scope_escape` event:
```json
{"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"codex-review","event":"codex_scope_escape","data":{"finding_id":"F<n>","severity":"P1|P2","filed_ticket_id":"PRO-XXXX"}}
```

### Prerequisites Check

Do NOT probe the Codex MCP server with a test call. Instead, proceed directly to the real review call. If the server is unavailable, the MCP tool call will fail with a connection error — handle that as a skip (post skip note to Linear). Probing wastes a full Codex invocation and can produce false errors.

### Execution

Follow the `/codex-review` command workflow (see `commands/codex-review.md`):

1. **Gather full context:** Collect ticket description, ALL acceptance criteria, implementation summary, and code review concerns from prior phase reports (full, verbatim — not summaries)

2. **Detect tech stack:** Scan project root for stack indicators (package.json → Node/TypeScript, next.config → Next.js, requirements.txt → Python, etc.)

3. **Build structured context string and call `codex_review_and_fix`:**
   ```
   We just completed [ticket-id]. Read all ticket context, then conduct a
   meticulous code review on the branch. Review for:

   1. Compliance with the ticket requirements and acceptance criteria
   2. Adherence to [detected tech stack] best practices
   3. SOLID/DRY violations
   4. Bugs and edge cases
   5. Code quality issues
   6. Security vulnerabilities
   7. Any other issues worth fixing before merge

   Fix all P1-P3 issues that are unambiguous, then provide a report with the
   remaining prioritized list of questions and issues to resolve.

   ## Ticket Context
   [Full ticket description — verbatim]

   ## Acceptance Criteria
   [Full AC — verbatim]

   ## Implementation Summary
   [From implementation report]

   ## Prior Review Concerns
   [From code review report]
   ```

4. **Present ALL results to user:** Show auto-fixed items, items needing decision, and P3 awareness items — follow the `codex-finding-resolution` skill process
5. **Second pass (if needed):** For approved "needs decision" items, call `codex_fix` with user guidance
6. **Commit fixes:** Single commit for all fixes. Push only when `WORKTREE_MODE=false`.
7. **Post report to Linear:** Cross-Model Review Report as ticket comment

### Interpreting Codex MCP Responses

The Codex MCP tool returns a JSON string. **You MUST parse the JSON and check the `"status"` field to determine the outcome** — do NOT pattern-match on the raw text for keywords like "rate limit."

**Success:** `"status": "complete"` — the review ran. The `"output"` field contains Codex's findings. Findings may mention "rate limit" as a *code quality issue* (e.g., "Missing rate limit on auth endpoint") — this is a **review finding, NOT a rate limit error.** Process normally.

**Rate limit error:** `"error": "rate_limit"` — the Codex CLI was rate-limited by OpenAI. This is the ONLY condition that constitutes a rate limit error.

**Other errors:** `"error": "codex_not_found"` or `"error": "codex_error"` — handle as server unavailable or general error.

**CRITICAL:** The word "rate limit" appearing ANYWHERE in the `"output"` field of a successful response (`"status": "complete"`) is Codex reporting a code finding, NOT an error. Do NOT treat it as a rate limit. Only `"error": "rate_limit"` at the top level of the JSON response is a rate limit error.

### Rate Limit Handling

If and ONLY if the parsed JSON contains `"error": "rate_limit"` (not `"status": "complete"`):
1. Retry once after 60 seconds
2. If still limited: mark as `codex-review-pending`, post note to Linear
3. **Continue to security-review** — Codex review is valuable but NOT a hard gate
4. User can run `/codex-review $ARGUMENTS` independently later

### Context for Security Review

The Cross-Model Review Report becomes part of the context passed to the security-review agent. Include it in the security review agent prompt alongside all other phase reports.

---

## Step 3.9: End-of-Ticket Deferral Review (single proactive user question)

After all phases in the active profile complete (including the per-phase deferral re-dispatch loop in §3.6.1a), aggregate any surviving deferred items and surface them to the user in a single Linear comment. This is the **one proactive question** at the end of the ticket workflow — never a mid-workflow interruption.

**This step runs regardless of profile.** In MINIMAL profile, it runs after codereview. In STANDARD/STRICT, it runs after security-review but BEFORE the auto-closure logic in Step 4.1.

**Step 1 — Collect surviving deferrals:**

1. Fetch all Linear comments via `mcp__linear-server__list_comments`
2. Search each phase report comment body for `Deferred Items` tables
3. For each row, extract: classification, severity, location, issue title, reason
4. If classification is `AC-DEFERRED`, extract the `### Deferral Justification (CATASTROPHIC — required)` block (if present)
5. Skip rows whose `Issue` text was previously dispositioned by the user (track via persisted state if available)

**Step 2 — Decide whether to post the review comment:**

```
total_deferrals = count of surviving deferred items
if total_deferrals == 0:
  Skip this step. Proceed to Step 4.
else:
  Post the structured review comment (Step 3 below) and PAUSE the workflow.
```

**Step 3 — Post the consolidated review comment on the ticket:**

```
Use mcp__linear-server__save_comment:
  - issue_id: [ticket-id]
  - body: |
      ## Deferred Items Review — User Decision Required

      The following items were deferred during this ticket. Per workflow policy
      (skill: no-silent-deferrals), deferrals are presumed undesirable. Please
      choose a disposition for each before the ticket is finalized.

      Total surviving deferrals: [N]

      ---

      ### Item 1: [Issue title]
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

      The ticket will not auto-close until dispositions are recorded.
```

**Recommended disposition heuristics:**

| Condition | Recommended |
|-----------|-------------|
| Classification is `AC-DEFERRED` and justification missing or fails catastrophic test | `DO_NOW` |
| Classification is `AC-DEFERRED` and justification cites condition 1, 2, or 3 with HIGH confidence | `ACCEPT_DEFERRAL` |
| Classification is `DISCOVERED`, severity LOW/INFO | `NEW_TICKET` |
| Classification is `DISCOVERED`, severity MEDIUM or higher | `DO_NOW` |
| Classification is `OUT-OF-SCOPE` | `NEW_TICKET` |
| User previously disposed this exact item | use the prior disposition |

**Step 4 — Pause and surface to user (terminal):**

```
Deferred items review posted to <linear-comment-url>.
[N] items pending your decision.
Ticket will not auto-close until you respond.
```

**Step 5 — On user response:**

- For `DO_NOW` items: identify the phase that produced the deferral, re-dispatch with explicit "do it now" instruction. Re-run that phase's validation cascade. If new deferrals arise from the re-dispatch, run Step 3.9 again for those.
- For `ACCEPT_DEFERRAL` items: record the disposition in persisted state with the user's acknowledgment.
- For `NEW_TICKET` items: do NOT create the ticket here (that is `/close-epic`'s job in epic flow; for standalone `/execute-ticket` runs, record the recommendation in the Execution Summary).

**Why this exists:** Across the last 100+ tickets, ~80-90% of deferrals should have been "do it now" decisions. This aggregated review at end-of-workflow gives the user one decision point with action-defaulting recommendations, complementing the per-phase deferral validation in §3.6.1a.

---

## Step 4: Handle Final-Phase Completion and Ticket Closure

**Profile-aware closure:**

- **STANDARD/STRICT profile**: The last phase is `security-review`. Steps 4.1/4.2 below apply directly.
- **MINIMAL profile**: The last phase is `codereview`. Closure logic mirrors Step 4.1 but is triggered when codereview reports `Status: APPROVED` (no `CHANGES_REQUESTED`). Security/codex/testing/docs phases have N/A reports from Step 3.6.0b — the ticket is closed without those phases running live.

In all profiles, **Step 3.9 (End-of-Ticket Deferral Review) MUST complete before this step runs.** If the deferral review surfaced items and the user has not dispositioned them, the orchestrator stays paused — do NOT auto-close.

**Worktree mode note:** When `WORKTREE_MODE=true`, this security review is the pre-merge per-ticket scan. The swarm orchestrator runs a separate comprehensive post-merge security review (epic-swarm Phase 5) after integration. Do NOT close the ticket here when in worktree mode — the swarm orchestrator handles ticket closure after post-merge security review passes.

When the active profile's final phase completes:

### 4.1 If No CRITICAL/HIGH Findings (PASS):

1. **Update ticket status to Done:**
   ```
   Use mcp__linear-server__update_issue:
   - issue_id: [ticket-id]
   - state: "Done"
   ```

2. **Emit `ticket_completed` JSONL event** (v4.7 — canonical schema at `commands/references/observability-schema.md`):
   ```json
   {"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":null,"event":"ticket_completed","data":{"profile":"<MINIMAL|STANDARD|STRICT>","phases_run_live":["<list>"],"phases_na":["<list>"],"wall_clock_seconds":<n>}}
   ```

3. **Append PASSED entry to `$ORCH_LOG`** (Tier 4 — epic-aware bookkeeping). Format A shape matches `/epic-swarm` §3.4 Format A so a swarm session resuming later sees a consistent log. Idempotency is enforced by `entry_exists` (defined in Step 1.6.1) which scans multi-line blocks rather than single lines — earlier line-oriented grep patterns could never match the multi-block format and produced duplicate entries on every resume.

   **Before calling, bind:** `ticket_title`, `ticket_profile`, `ticket_tier` (or leave unset to default to "N/A"), `phases_run_live`, `phases_na`, `implementation_files_block`, `key_interfaces_block`, `patterns_used_block`, `cross_ticket_observations_block`. Use `"— none —"` for any block with no entries (see Step 1.6.1 Variable bindings).

   ```bash
   write_passed_entry
   ```

   On resume: if a prior session already wrote a PASSED entry for this `TICKET_ID`, the helper returns early and does NOT append a duplicate. If a prior FAILED entry exists and this session is now passing, the helper DOES append the new PASSED entry as a new block — the audit trail preserves both attempts.

   Solo-context `$ORCH_LOG` (`.swarm/orchestrator-log-tickets/<ticket_id>.md`) uses the same helper, same idempotency behavior. The file is single-ticket, so duplicates are unlikely anyway, but the guard still applies on resume.

4. **Upsert this ticket's row in `$STATE_PATH`** (epic context only). Mark status `done`, record merge-relevant metadata, and stamp the completion timestamp. Skip for solo runs (no state file). Uses `safe_jq_update` (defined in Step 1.6.1) so any jq failure surfaces to stderr rather than silently leaving a stale file.

   ```bash
   if [ -n "$STATE_PATH" ]; then
     ( flock -x 200
       safe_jq_update "$STATE_PATH" \
         --arg t "$TICKET_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
         --arg pr "${pr_number:-}" --arg branch "${branch_name:-}" \
         '.tickets[$t] = ((.tickets[$t] // {}) + {status:"done", closedAt:$ts, pr:$pr, branch:$branch})'
     ) 200>"$LOCK_FILE"
   fi
   ```

5. **Finalize PR:**

   **Skip PR finalization when `WORKTREE_MODE=true` or no `pr_number` is available.**

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
- Add label to PR (skip when `WORKTREE_MODE=true` or no `pr_number`):
  ```bash
  gh pr edit [pr-number] --add-label "security-blocked"
  ```
- **Emit `ticket_failed` JSONL event** (v4.7):
  ```json
  {"ts":"<iso8601>","epic_id":"<id-or-null>","ticket_id":"<id>","phase":"security-review","event":"ticket_failed","data":{"halt_phase":"security-review","halt_reason":"<CRITICAL|HIGH finding summary>","recovery_options_offered_to_user":["retry phase","manual review","reduce scope"]}}
  ```
- **Append FAILED entry to `$ORCH_LOG`** (Tier 4 — finally-style). Format B shape matches `/epic-swarm` §3.4 Format B. Idempotency on resume is enforced by `entry_exists` (defined in Step 1.6.1) which now matches the `Outcome: FAILED` line and `Failure point: <halt_phase>` line across the multi-line block (the prior single-line grep could never match).

  **Before calling, bind:** `ticket_title`, `halt_phase`, `halt_reason`, `phases_done`, and (optionally) `ticket_tier`.

  ```bash
  write_failed_entry
  ```

  On resume: if a prior session already wrote a FAILED entry for this `TICKET_ID` with the same `halt_phase`, the helper returns early. If the prior failure was at a different phase, or a prior PASSED entry exists and this session is now failing (rare — usually a regression), the helper appends a new block so both attempts survive in the audit trail.

- **Upsert this ticket's row in `$STATE_PATH`** (epic context only). Mark status `failed`, stamp the halt phase and reason for the next session/operator to inspect.

  ```bash
  if [ -n "$STATE_PATH" ]; then
    ( flock -x 200
      safe_jq_update "$STATE_PATH" \
        --arg t "$TICKET_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg phase "$halt_phase" --arg reason "$halt_reason" \
        '.tickets[$t] = ((.tickets[$t] // {}) + {status:"failed", failedAt:$ts, haltPhase:$phase, haltReason:$reason})'
    ) 200>"$LOCK_FILE"
  fi
  ```

- PAUSE for user decision (standard blocking behavior)

**`ticket_failed` and its bookkeeping run from every halt path, not just security-review.** Use the same envelope with `halt_phase` set to the phase that triggered the halt. The four call sites that MUST invoke `write_failed_entry` + the state.json upsert above before pausing are:

| Halt source | Halt-phase value | Where in this command |
|---|---|---|
| Security-review CRITICAL/HIGH (the §4.2 case above) | `"security-review"` | this block |
| Codereview CHANGES_REQUESTED that the user does not resolve | `"codereview"` | Step 3.5 blocking-conditions table (the `PAUSE for user decision` branch) |
| Deferral re-dispatch loop exhausted at Pass 2 | `"<phase that exhausted retries>"` | Step 3.6.1a final `PAUSE the ticket` branch |
| Implementation/testing compile-or-gate failure that the user does not resolve | `"<phase>"` | Step 3.5 blocking-conditions table |
| Merge conflict the user cannot resolve | `"merge"` | Step 3.6.1 (when not in `WORKTREE_MODE`) |
| Hard-checkpoint failure on resume | `"hard-checkpoint"` | wherever the resume-detection logic decides the run cannot continue |

Each call site binds `halt_phase`, `halt_reason`, `phases_done`, `ticket_title` (if not already bound), then calls `write_failed_entry` followed by the `safe_jq_update` block above. This is the shared-function contract that prevents any halt path from silently skipping the audit-trail write — the original B6 silent-shipping fingerprint.

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
| codex-review | ✅ Complete / ⚠️ Skipped | [N findings, M auto-fixed] / [reason: server unavailable, rate limit, or error] |
| security-review | ✅ Complete | [No critical issues] |

**If codex-review was skipped or failed**, include a clear note:
```
⚠️ Cross-model Codex review was not completed for this ticket.
Reason: [server not configured / rate limit reached / authentication expired / error details]
Action: Run `/codex-review [ticket-id]` to perform cross-model review independently.
```

### Metrics
- Total phases completed: [X/7]
- Blocking issues encountered: [count]
- Time from start: [timestamp]

### Next Steps
[If complete: PR ready for merge]
[If blocked: Required actions to unblock]
```

**CRITICAL — Post-Completion Branch Rule:**
- **Do NOT switch branches after execution completes.** The working directory MUST remain on the feature branch so the user can review the completed work.
- **Do NOT merge the feature branch to main.** The PR is marked ready-for-review for human merge decisions.
- This workflow handles its own completion. Do not run any additional branch cleanup, merge, or finalization steps beyond what is specified above.

---

## Error Handling

### Linear API Errors
- Retry up to 3 times with 2-second delays between attempts
- If still failing after retries:
  - Save any pending report content locally (display to user)
  - Pause execution with message: "Linear API unavailable. Report content preserved above."
  - Options: (1) Retry now, (2) Continue without posting (not recommended), (3) Abort

### Agent Timeout
- If Agent tool doesn't return within 10 minutes, consider agent stuck
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
2. **All non-phase-report ticket comments** — human discussion, PM clarifications, requirement updates (chronological, verbatim)
3. **Complete prior phase reports** — copy each report in full from Linear comments, do not extract or condense
4. **Git context** — branch, PR number, files changed

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

## Deferred Items and Closure-Log Handling

The default disposition for every in-scope item is **complete the work now**. Agents may document a deferral ONLY when it meets one of the four catastrophic conditions defined in the `no-silent-deferrals` skill. The Deferred Items table exists for traceability of those genuinely catastrophic-justified deferrals plus the residue of out-of-scope discoveries — NOT as a place to park work the agent didn't feel like doing.

**For OUT-OF-SCOPE observations the agent considers as candidates for follow-up tickets**, agents apply the impact bar in `no-silent-deferrals` Part 2:
- If the would-be impact-bar sentence is fillable with specifics → file a ticket (or fix in-branch if cheap).
- If it isn't → record in a `### Considered but not pursued` section in the phase report. This is the closure-log. Do NOT add it to the Deferred Items table — that table is for AC-deferrals + tracked deferrals only.

The closure-log section is durable per-ticket audit-trail content. The epic-closure agent aggregates closure-log entries across sub-tickets into the epic's Considered-but-not-pursued section. The `ticket-context-agent` is required to surface closure-log presence to the closure orchestrator.

**Invoke the `no-silent-deferrals` skill before populating a Deferred Items table, a closure-log section, or before the orchestrator runs §3.6.1a validation.** The skill defines what counts as catastrophic, the required justification block, the impact bar for would-be tickets, the disqualifying phrasings, and the agent's red-flag phrases that trigger STOP.

| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| [AC-DEFERRED/DISCOVERED/OUT-OF-SCOPE] | [CRITICAL/HIGH/MEDIUM/LOW/INFO] | [file:line] | [Brief description] | [Why deferred] |

**For every AC-DEFERRED entry, the report MUST ALSO include the Deferral Justification block** (see §3.6.1a for the required fields). A table entry without the justification block is invalid and triggers re-dispatch.

### Deferred Item Classifications

| Classification | Description | Requires Catastrophic Justification? | Requires User Approval? |
|---------------|-------------|--------------------------------------|------------------------|
| AC-DEFERRED | An explicit acceptance criterion the agent did not implement | **YES — orchestrator re-dispatches if missing** | **YES — ALWAYS** |
| DISCOVERED | A new issue found during the phase, NOT in the original AC and NOT required to fulfill an AC | NO — but if the orchestrator's fuzzy match finds an AC match, it reclassifies to AC-DEFERRED | NO — agent discretion |
| OUT-OF-SCOPE | Work that genuinely belongs to a different ticket | NO | NO — agent discretion |

### Orchestrator Validation Rule

The orchestrator validates deferred items in three passes (see §3.6.1a for full detail):

**Pass 1 — AC fuzzy-match:**
1. Extract all acceptance criteria from the ticket
2. Check each deferred item against the AC list (fuzzy match on key terms)
3. If ANY deferred item matches an AC → reclassify as `AC-DEFERRED`

**Pass 2 — Catastrophic-justification validation:**
4. For every `AC-DEFERRED`, validate the `### Deferral Justification (CATASTROPHIC — required)` block
5. If missing, malformed, or condition outside 1-4 → `DEFERRAL_INVALID` → Pass 3

**Pass 3 — Re-dispatch (max 1 per agent per phase):**
6. Re-invoke the agent with "do it now" supplemental instruction
7. If still invalid after re-dispatch → PAUSE the ticket for user decision

**Agents MUST NOT unilaterally defer in-scope work.** Catastrophic conditions are narrow and enumerated; the default disposition is "do the work now."

**Rules for Deferred Items:**
1. ANY issue found but not addressed MUST appear in this table
2. Classification must be set (agents should classify; orchestrator validates and reclassifies if needed)
3. Location must include file:line for traceability
4. Reason must explain the bypass decision (e.g., "Defense-in-depth, not exploitable")
5. Table is always included in full when passing context to downstream phases
6. Orchestrator posts full table to Linear (not summarized)

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
| Classification | Severity | Location | Issue | Reason |
|---------------|----------|----------|-------|--------|
| DISCOVERED | LOW | auth.ts:45 | Missing rate limit on admin login | Defense-in-depth, admin-only endpoint |
| DISCOVERED | INFO | user.service.ts:120 | Could add input sanitization | Low risk, trusted internal call |
| OUT-OF-SCOPE | LOW | api.controller.ts:88 | Consider adding request logging | Enhancement, not security critical |
```

**Example of orchestrator catching an AC deferral:**
```
Agent deferred: "QuotaIndicator extraction to shared location" as DISCOVERED/LOW
Orchestrator matches against AC: "QuotaIndicator, SelectedFileList extracted to shared locations"
→ Reclassified as AC-DEFERRED → PAUSE for user decision
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
