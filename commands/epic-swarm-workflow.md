---
description: Launch the epic-swarm-workflow dynamic workflow — a resilient, right-sized multi-agent swarm over a Linear epic (per-ticket adapt→implement→test→docs→review→codex→security→merge, reviews fail-closed)
allowed-tools: Bash(echo:*), Glob, Workflow
argument-hint: <epic-id> [--dry-run] [--push] [--max-tickets N]
workflow-phase: epic-swarm-workflow
closes-ticket: false
---

# Epic Swarm Workflow

Launch the **epic-swarm-workflow** dynamic workflow bundled with this plugin. It runs the core `/epic-swarm` pipeline over a Linear epic as a Claude Code **dynamic workflow** (the JavaScript `Workflow` runtime, which orchestrates many subagents from a script): each ticket flows through adaptation → implementation → testing → documentation → code review → Codex cross-model review → security → merge, **sized to the ticket's effort**, with a hard review floor for any code-changing ticket and full per-agent failure isolation (no single agent failure can abort the run).

This command is a thin launcher: it does not re-implement the workflow — it runs the bundled `workflows/epic-swarm-workflow.js` via the `Workflow` tool.

## Resolve the bundled workflow script

Absolute path to the bundled workflow script (resolved from this command's plugin directory):

!`echo "${CLAUDE_SKILL_DIR}/../workflows/epic-swarm-workflow.js"`

## Launch

1. Take the absolute path printed above as the workflow `scriptPath`. If that line is empty or still contains an unexpanded `${CLAUDE_SKILL_DIR}` (path resolution failed in this environment), locate the script instead with Glob (`**/workflows/epic-swarm-workflow.js`) and use the first match.
2. Call the **`Workflow`** tool with:
   - `scriptPath`: the absolute path to `epic-swarm-workflow.js` from step 1
   - `args`: `$ARGUMENTS` — passed verbatim as a single string (e.g. `PRO-42 --dry-run`). The script parses the epic ID and flags itself.
3. Do **not** author or inline the script or pass a `script` body — run the bundled file via `scriptPath` so users get the version-controlled, reviewed workflow.
4. When the workflow finishes, relay its final summary (done / blocked / unprocessed tickets, epic branch, PR URL) to the user.

## Usage and behavior

- **Argument (required):** a Linear epic ID — e.g. `/pm-vibecode-ops:epic-swarm-workflow PRO-42`.
- **Flags:**
  - `--dry-run` — classify each ticket into NO_CODE / SMALL / STANDARD and print the tier plan; make **no** code changes.
  - `--push` — push the epic branch and open the epic PR. Default is **local-only** (a local `epic/<id>` branch is created and tickets merge into it locally; nothing is pushed).
  - `--max-tickets N` — cap scope to the first N tickets (use for a cheap first run to gauge cost).
- **Requires dynamic workflows enabled** — a plan-gated research-preview feature. On Pro, turn on the "Dynamic workflows" row in `/config`. If it's disabled, the `Workflow` tool will not run.
- **Recommended session effort:** `high`. Per-agent effort is not configurable from a workflow; the script already routes models per phase — Opus for reasoning phases (plan, adapt, implement, test, review, codex), Sonnet for mechanical ones (setup, docs, security, merge).
- **Safety:** never merges to `main`/`master` — all work lands on the epic branch. Reviews and the security scan **fail closed** (a failed/empty review blocks the merge), and the merge gate uses a test-diff so pre-existing/flaky test failures never block a clean merge.

## Cost note

A full run spawns many subagents (roughly 4–8 per ticket, scaled to effort). For a first run, start with `--dry-run` to see the tier classification, then `--max-tickets 1` end-to-end to gauge spend before running a whole epic. The `/workflows` view shows live per-agent token usage and lets you stop the run at any time without losing completed work.

---
*Bundled dynamic workflow — source at `workflows/epic-swarm-workflow.js`. See [workflows/README.md](../workflows/README.md).*
