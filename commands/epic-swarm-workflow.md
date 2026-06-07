---
description: Launch the epic-swarm-workflow dynamic workflow — a resilient, right-sized multi-agent swarm over a Linear epic (per-ticket adapt→implement→test→docs→review→codex→security→merge, reviews fail-closed)
allowed-tools: Bash(echo:*), Bash(test:*), Glob, Workflow
argument-hint: <epic-id> [--dry-run] [--push] [--max-tickets N]
workflow-phase: epic-swarm-workflow
closes-ticket: false
---

# Epic Swarm Workflow

Launch the **epic-swarm-workflow** dynamic workflow bundled with this plugin. It runs the core `/epic-swarm` pipeline over a Linear epic as a Claude Code **dynamic workflow** (the JavaScript `Workflow` runtime, which orchestrates many subagents from a script): each ticket flows through adaptation → implementation → testing → documentation → code review → Codex cross-model review → security → merge, **sized to the ticket's effort**, with a hard review floor for any code-changing ticket and full per-agent failure isolation (no single agent failure can abort the run).

This command is a thin launcher: it does not re-implement the workflow — it runs the bundled `workflows/epic-swarm-workflow.js` via the `Workflow` tool.

## Resolve the bundled workflow script

Absolute path to the bundled workflow script (resolved from this command's plugin install directory via `${CLAUDE_PLUGIN_ROOT}`), verified to exist with `test -f`:

!`test -f "${CLAUDE_PLUGIN_ROOT}/workflows/epic-swarm-workflow.js" && echo "${CLAUDE_PLUGIN_ROOT}/workflows/epic-swarm-workflow.js" || echo NOT_FOUND`

## Launch

1. Determine the workflow `scriptPath` from the line above:
   - If it is an absolute path ending in `epic-swarm-workflow.js` (the file was found), use it as `scriptPath`.
   - If it is `NOT_FOUND`, empty, or still contains a literal `${CLAUDE_PLUGIN_ROOT}` (the variable wasn't expanded — e.g. running from the source repo rather than an installed plugin), locate the script with Glob (`**/workflows/epic-swarm-workflow.js`) and use the first match. If Glob returns nothing, tell the user the bundled workflow script could not be found (the plugin may be installed outside the current working directory) and **stop** — do not pass a guessed path to `Workflow`.
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
- **Recommended session effort:** `high`. Per-agent effort is not configurable from a workflow; the script already routes models per phase — **Opus** for reasoning work (plan, adapt, implement, test, review, review-fix, codex, and both SMALL-tier agents — build & review), **Sonnet** for mechanical work (setup, docs, security, merge, the PR, and both NO-CODE-tier agents — build & review). Note that review-fix and the SMALL build/review run on Opus, so Opus spend is higher for SMALL-heavy epics than the short list above implies. Tune the `ROUTE` map at the top of the script.
- **Safety:** never merges to `main`/`master` — all work lands on the epic branch. Reviews and the security scan **fail closed** (a failed/empty review blocks the merge), and the merge gate uses a test-diff so pre-existing/flaky test failures never block a clean merge.

## Cost note

A full run spawns many subagents (roughly 4–8 per ticket, scaled to effort). For a first run, start with `--dry-run` to see the tier classification, then `--max-tickets 1` end-to-end to gauge spend before running a whole epic. The `/workflows` view shows live per-agent token usage and lets you stop the run at any time without losing completed work.

---
*Bundled dynamic workflow — source at `workflows/epic-swarm-workflow.js`. See [workflows/README.md](../workflows/README.md).*
